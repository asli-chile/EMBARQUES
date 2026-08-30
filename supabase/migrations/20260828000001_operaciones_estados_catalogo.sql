-- ─────────────────────────────────────────────────────────────────────────────
-- Catálogo de estados del flujo de exportación (15 estados + cancelada/roleada)
--
-- Reemplaza el uso de `catalogos` con categoria='estado_operacion' por un
-- catálogo con estructura: orden en el flujo, fase de negocio y agrupación.
-- Ver FLUJO-DE-TRABAJO.md §4.10 y §13.2.
--
-- Este archivo solo crea catálogo, transiciones y visibilidad. La conversión de
-- los valores existentes en `operaciones.estado_operacion` va en la migración
-- siguiente (20260828000002).
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Catálogo maestro ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.operaciones_estados (
  codigo text PRIMARY KEY,
  orden integer NOT NULL,
  fase integer,
  etiqueta text NOT NULL,
  grupo text NOT NULL,
  es_final boolean NOT NULL DEFAULT false,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.operaciones_estados IS
  'Estados del flujo de exportación. `orden` define la secuencia, `fase` remite a las 7 fases del flujo y `grupo` permite vistas resumidas.';
COMMENT ON COLUMN public.operaciones_estados.grupo IS
  'Agrupación para vistas resumidas: COMERCIAL, COORDINACION, TRANSITO, DOCUMENTAL, CIERRE, EXCEPCION.';

INSERT INTO public.operaciones_estados (codigo, orden, fase, etiqueta, grupo, es_final) VALUES
  ('SOLICITADA',                    1,  1, 'Solicitada',                    'COMERCIAL',    false),
  ('EN_COTIZACION',                 2,  1, 'En cotización',                 'COMERCIAL',    false),
  ('RESERVA_SOLICITADA',            3,  1, 'Reserva solicitada',            'COMERCIAL',    false),
  ('RESERVA_CONFIRMADA',            4,  1, 'Reserva confirmada',            'COMERCIAL',    false),
  ('EMBARQUE_EN_COORDINACION',      5,  2, 'Embarque en coordinación',      'COORDINACION', false),
  ('CARGA_COORDINADA',              6,  3, 'Carga coordinada',              'COORDINACION', false),
  ('CARGADA',                       7,  4, 'Cargada',                       'COORDINACION', false),
  ('ZARPADA',                       8,  4, 'Zarpada',                       'TRANSITO',     false),
  ('DOCUMENTACION_PENDIENTE',       9,  5, 'Documentación pendiente',       'DOCUMENTAL',   false),
  ('DOCUMENTACION_EN_REVISION',    10,  6, 'Documentación en revisión',     'DOCUMENTAL',   false),
  ('VB_DOCUMENTAL',                11,  6, 'VB documental',                 'DOCUMENTAL',   false),
  ('DUS_LEGALIZADO',               12,  6, 'DUS legalizado',                'DOCUMENTAL',   false),
  ('FULLSET_ENVIADO',              13,  7, 'Fullset enviado',               'CIERRE',       false),
  ('DOCUMENTACION_FISICA_ENVIADA', 14,  7, 'Documentación física enviada',  'CIERRE',       false),
  ('OPERACION_CERRADA',            15,  7, 'Operación cerrada',             'CIERRE',       true),
  ('ROLEADA',                      90, NULL, 'Roleada',                     'EXCEPCION',    false),
  ('CANCELADA',                    91, NULL, 'Cancelada',                   'EXCEPCION',    true)
ON CONFLICT (codigo) DO UPDATE SET
  orden    = EXCLUDED.orden,
  fase     = EXCLUDED.fase,
  etiqueta = EXCLUDED.etiqueta,
  grupo    = EXCLUDED.grupo,
  es_final = EXCLUDED.es_final;

-- ─── Transiciones permitidas ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.operaciones_estados_transiciones (
  desde text NOT NULL REFERENCES public.operaciones_estados(codigo) ON DELETE CASCADE,
  hacia text NOT NULL REFERENCES public.operaciones_estados(codigo) ON DELETE CASCADE,
  PRIMARY KEY (desde, hacia)
);

COMMENT ON TABLE public.operaciones_estados_transiciones IS
  'Pares (desde, hacia) permitidos. La cancelación desde cualquier estado no final se resuelve en la función de validación, no aquí.';

-- Avance secuencial 1→2→…→15
INSERT INTO public.operaciones_estados_transiciones (desde, hacia)
SELECT a.codigo, b.codigo
FROM public.operaciones_estados a
JOIN public.operaciones_estados b ON b.orden = a.orden + 1
WHERE a.orden < 15
ON CONFLICT DO NOTHING;

INSERT INTO public.operaciones_estados_transiciones (desde, hacia) VALUES
  -- Único retroceso previsto: correcciones pendientes tras la revisión
  ('DOCUMENTACION_EN_REVISION', 'DOCUMENTACION_PENDIENTE'),
  -- Sin cotización previa cuando el cliente ya trae la reserva definida
  ('SOLICITADA', 'RESERVA_SOLICITADA'),
  ('SOLICITADA', 'RESERVA_CONFIRMADA'),
  -- Roleo: la operación cambia de nave y vuelve a coordinarse
  ('RESERVA_CONFIRMADA', 'ROLEADA'),
  ('EMBARQUE_EN_COORDINACION', 'ROLEADA'),
  ('CARGA_COORDINADA', 'ROLEADA'),
  ('CARGADA', 'ROLEADA'),
  ('ROLEADA', 'RESERVA_SOLICITADA'),
  ('ROLEADA', 'RESERVA_CONFIRMADA')
ON CONFLICT DO NOTHING;

-- ─── Visibilidad por rol y contexto ──────────────────────────────────────────
-- La tabla guarda solo EXCEPCIONES: si no hay fila, el estado es visible.
-- Así se evita mantener el producto cartesiano rol × estado × contexto.

CREATE TABLE IF NOT EXISTS public.operaciones_estados_visibilidad (
  estado_codigo text NOT NULL REFERENCES public.operaciones_estados(codigo) ON DELETE CASCADE,
  rol text NOT NULL,
  contexto text NOT NULL,
  visible boolean NOT NULL DEFAULT true,
  PRIMARY KEY (estado_codigo, rol, contexto)
);

COMMENT ON TABLE public.operaciones_estados_visibilidad IS
  'Excepciones de visibilidad. Ausencia de fila = visible. Contextos: grilla, ficha, portal_cliente, dashboard.';

-- El cliente no ve la etapa comercial interna ni el detalle documental interno:
-- para él la operación pasa de confirmada a en revisión y de ahí al cierre.
INSERT INTO public.operaciones_estados_visibilidad (estado_codigo, rol, contexto, visible)
SELECT codigo, 'cliente', c.contexto, false
FROM public.operaciones_estados,
     (VALUES ('grilla'), ('ficha'), ('portal_cliente'), ('dashboard')) AS c(contexto)
WHERE codigo IN (
  'EN_COTIZACION',
  'RESERVA_SOLICITADA',
  'CARGA_COORDINADA',
  'DOCUMENTACION_PENDIENTE',
  'DUS_LEGALIZADO',
  'DOCUMENTACION_FISICA_ENVIADA'
)
ON CONFLICT DO NOTHING;

-- ─── Helpers ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.estado_visible(
  p_codigo text,
  p_rol text,
  p_contexto text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT COALESCE(
    (SELECT v.visible
       FROM public.operaciones_estados_visibilidad v
      WHERE v.estado_codigo = p_codigo
        AND v.rol = p_rol
        AND v.contexto = p_contexto),
    true
  );
$$;

CREATE OR REPLACE FUNCTION private.puede_transicionar(
  p_desde text,
  p_hacia text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  -- Sin cambio efectivo
  IF p_desde IS NOT DISTINCT FROM p_hacia THEN
    RETURN true;
  END IF;

  -- Alta de la operación
  IF p_desde IS NULL THEN
    RETURN true;
  END IF;

  -- Estado desconocido (datos históricos): no se bloquea
  IF NOT EXISTS (SELECT 1 FROM public.operaciones_estados WHERE codigo = p_desde) THEN
    RETURN true;
  END IF;

  -- Cancelar es posible desde cualquier estado no final
  IF p_hacia = 'CANCELADA' THEN
    RETURN NOT EXISTS (
      SELECT 1 FROM public.operaciones_estados
      WHERE codigo = p_desde AND es_final
    );
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.operaciones_estados_transiciones
    WHERE desde = p_desde AND hacia = p_hacia
  );
END;
$$;

COMMENT ON FUNCTION private.puede_transicionar IS
  'Valida un cambio de estado. Superadmin puede saltarse la validación; ver trigger operaciones_valida_estado.';

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.operaciones_estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operaciones_estados_transiciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operaciones_estados_visibilidad ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS estados_select_auth ON public.operaciones_estados;
CREATE POLICY estados_select_auth
  ON public.operaciones_estados FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS estados_write_superadmin ON public.operaciones_estados;
CREATE POLICY estados_write_superadmin
  ON public.operaciones_estados FOR ALL TO authenticated
  USING (private.is_superadmin())
  WITH CHECK (private.is_superadmin());

DROP POLICY IF EXISTS transiciones_select_auth ON public.operaciones_estados_transiciones;
CREATE POLICY transiciones_select_auth
  ON public.operaciones_estados_transiciones FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS transiciones_write_superadmin ON public.operaciones_estados_transiciones;
CREATE POLICY transiciones_write_superadmin
  ON public.operaciones_estados_transiciones FOR ALL TO authenticated
  USING (private.is_superadmin())
  WITH CHECK (private.is_superadmin());

DROP POLICY IF EXISTS visibilidad_select_auth ON public.operaciones_estados_visibilidad;
CREATE POLICY visibilidad_select_auth
  ON public.operaciones_estados_visibilidad FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS visibilidad_write_superadmin ON public.operaciones_estados_visibilidad;
CREATE POLICY visibilidad_write_superadmin
  ON public.operaciones_estados_visibilidad FOR ALL TO authenticated
  USING (private.is_superadmin())
  WITH CHECK (private.is_superadmin());

GRANT SELECT ON public.operaciones_estados TO authenticated;
GRANT SELECT ON public.operaciones_estados_transiciones TO authenticated;
GRANT SELECT ON public.operaciones_estados_visibilidad TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.operaciones_estados TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.operaciones_estados_transiciones TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.operaciones_estados_visibilidad TO authenticated;

GRANT EXECUTE ON FUNCTION private.estado_visible(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.puede_transicionar(text, text) TO authenticated;
