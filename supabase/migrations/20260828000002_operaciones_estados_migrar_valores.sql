-- ─────────────────────────────────────────────────────────────────────────────
-- Conversión de `operaciones.estado_operacion` al catálogo de 15 estados
--
-- Los 7 estados anteriores (más variantes en femenino y en minúsculas que
-- convivían por falta de CHECK) se mapean al nuevo catálogo. Las operaciones
-- históricas quedan en el estado equivalente: no se reconstruye su fase
-- documental, que nunca se registró.
--
-- Ver FLUJO-DE-TRABAJO.md §13.2. Requiere 20260828000001.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Marca de arribo ─────────────────────────────────────────────────────────
-- El arribo a destino no es un estado del flujo (la operación se cierra con el
-- fullset), pero sí un hecho a conservar y el disparador del aviso al cliente.

ALTER TABLE public.operaciones
  ADD COLUMN IF NOT EXISTS arribo_confirmado boolean NOT NULL DEFAULT false;

ALTER TABLE public.operaciones
  ADD COLUMN IF NOT EXISTS arribo_avisado_at timestamptz;

COMMENT ON COLUMN public.operaciones.arribo_confirmado IS
  'La nave arribó a destino. No es un estado del flujo; ver FLUJO-DE-TRABAJO.md §4.11.';
COMMENT ON COLUMN public.operaciones.arribo_avisado_at IS
  'Momento en que se avisó al cliente del arribo. NULL = aviso pendiente. Lo escribe el job diario de alertas.';

-- Las operaciones que ya estaban en ARRIBADO conservan el hecho del arribo
UPDATE public.operaciones
SET arribo_confirmado = true
WHERE upper(btrim(coalesce(estado_operacion, ''))) IN ('ARRIBADO', 'ARRIBADA')
  AND arribo_confirmado = false;

-- ─── Mapeo de valores ────────────────────────────────────────────────────────

UPDATE public.operaciones o
SET estado_operacion = m.nuevo
FROM (VALUES
  ('PENDIENTE',   'SOLICITADA'),
  ('SOLICITADO',  'SOLICITADA'),
  ('SOLICITUD',   'SOLICITADA'),
  ('EN_PROCESO',  'EMBARQUE_EN_COORDINACION'),
  ('EN PROCESO',  'EMBARQUE_EN_COORDINACION'),
  ('ABIERTA',     'EMBARQUE_EN_COORDINACION'),
  ('ABIERTO',     'EMBARQUE_EN_COORDINACION'),
  ('CONFIRMADA',  'RESERVA_CONFIRMADA'),
  ('CONFIRMADO',  'RESERVA_CONFIRMADA'),
  ('EN_TRANSITO', 'ZARPADA'),
  ('EN TRANSITO', 'ZARPADA'),
  ('EN TRÁNSITO', 'ZARPADA'),
  ('ARRIBADO',    'ZARPADA'),
  ('ARRIBADA',    'ZARPADA'),
  ('COMPLETADO',  'OPERACION_CERRADA'),
  ('COMPLETADA',  'OPERACION_CERRADA'),
  ('CERRADA',     'OPERACION_CERRADA'),
  ('CERRADO',     'OPERACION_CERRADA'),
  ('CANCELADO',   'CANCELADA'),
  ('CANCELADA',   'CANCELADA'),
  ('ROLEADO',     'ROLEADA'),
  ('ROLEADA',     'ROLEADA')
) AS m(antiguo, nuevo)
WHERE upper(btrim(coalesce(o.estado_operacion, ''))) = m.antiguo
  AND o.estado_operacion <> m.nuevo;

-- Operaciones sin estado: quedan al inicio del flujo
UPDATE public.operaciones
SET estado_operacion = 'SOLICITADA'
WHERE estado_operacion IS NULL OR btrim(estado_operacion) = '';

-- ─── Integridad referencial ──────────────────────────────────────────────────
-- La FK solo se agrega si no quedaron valores fuera del catálogo. Si quedan, la
-- migración no falla: informa cuáles son para revisarlos a mano.

DO $$
DECLARE
  v_huerfanos text;
BEGIN
  SELECT string_agg(DISTINCT o.estado_operacion, ', ')
  INTO v_huerfanos
  FROM public.operaciones o
  WHERE o.estado_operacion IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.operaciones_estados e
      WHERE e.codigo = o.estado_operacion
    );

  IF v_huerfanos IS NOT NULL THEN
    RAISE NOTICE 'FK no aplicada. Estados fuera del catálogo: %', v_huerfanos;
    RETURN;
  END IF;

  ALTER TABLE public.operaciones
    DROP CONSTRAINT IF EXISTS operaciones_estado_operacion_fkey;

  ALTER TABLE public.operaciones
    ADD CONSTRAINT operaciones_estado_operacion_fkey
    FOREIGN KEY (estado_operacion)
    REFERENCES public.operaciones_estados(codigo)
    ON UPDATE CASCADE;

  RAISE NOTICE 'FK operaciones.estado_operacion → operaciones_estados aplicada.';
END;
$$;

ALTER TABLE public.operaciones
  ALTER COLUMN estado_operacion SET DEFAULT 'SOLICITADA';

-- ─── Validación de transiciones ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.operaciones_valida_estado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.estado_operacion IS NOT DISTINCT FROM OLD.estado_operacion THEN
    RETURN NEW;
  END IF;

  -- Procesos sin sesión (service_role, cargas masivas, jobs) no se validan
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- El superadmin puede corregir a mano cualquier estado
  IF private.is_superadmin() THEN
    RETURN NEW;
  END IF;

  IF NOT private.puede_transicionar(OLD.estado_operacion, NEW.estado_operacion) THEN
    RAISE EXCEPTION
      'Transición de estado no permitida: % → %',
      OLD.estado_operacion, NEW.estado_operacion
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS operaciones_valida_estado ON public.operaciones;
CREATE TRIGGER operaciones_valida_estado
  BEFORE UPDATE OF estado_operacion ON public.operaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.operaciones_valida_estado();

COMMENT ON FUNCTION public.operaciones_valida_estado IS
  'Bloquea cambios de estado que no estén en operaciones_estados_transiciones. Excepciones: superadmin y procesos sin sesión.';

-- ─── Catálogo antiguo ────────────────────────────────────────────────────────
-- Se desactiva en lugar de borrarse, para no romper pantallas que aún lo lean.

UPDATE public.catalogos
SET activo = false
WHERE categoria = 'estado_operacion'
  AND activo = true;
