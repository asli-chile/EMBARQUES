-- ─── Puertos anunciados por el buque, y qué se decidió sobre cada uno ────────
--
-- El AIS declara el **próximo puerto**, no el destino final. Un buque que va de
-- San Antonio a Tokio va anunciando Callao, después Balboa, después otro, y
-- cada uno de esos anuncios es una pregunta abierta: ¿es solo una parada del
-- itinerario, o ahí la carga cambia de barco?
--
-- Esa pregunta no se puede responder sola —el destino lo escribe la tripulación
-- a mano— y tampoco se responde una vez por embarque: se responde **una vez por
-- puerto anunciado**. Por eso no alcanzaba `navitrack_transbordos`, que guarda
-- una sola decisión por operación.
--
-- El ciclo de vida de una fila:
--
--   anunciada          el buque declaró ese puerto; todavía no llega
--   por_verificar      llegó la fecha anunciada: alguien tiene que mirarlo
--   parada_programada  se verificó y la carga sigue en el mismo buque
--   transbordo         se verificó y la carga cambió de nave (ver tramo_id)
--
-- Solo `por_verificar` genera correo y cambia el estado en pantalla. Las otras
-- dos son historia del viaje, que es justamente lo que hay que mostrar.

CREATE TABLE IF NOT EXISTS public.navitrack_recaladas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  operacion_id uuid NOT NULL REFERENCES public.operaciones(id) ON DELETE CASCADE,

  -- Puerto tal como lo declaró el buque, sin normalizar: es el dato crudo y
  -- sirve para entender después por qué se dedujo lo que se dedujo.
  puerto text NOT NULL,
  -- Nave que lo declaró. Con transbordo, los anuncios vienen de naves distintas.
  nave text,

  -- Cuándo se vio ese anuncio por primera vez y qué llegada prometía.
  anunciado_at timestamptz NOT NULL DEFAULT now(),
  eta_anunciada timestamptz,
  -- Última vez que el buque seguía declarando este puerto.
  visto_at timestamptz NOT NULL DEFAULT now(),

  estado text NOT NULL DEFAULT 'anunciada'
    CHECK (estado IN ('anunciada', 'por_verificar', 'parada_programada', 'transbordo')),

  -- Quién resolvió y cuándo. Una decisión sin autor no se puede discutir después.
  decidido_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  decidido_at timestamptz,
  notas text,

  -- Tramo creado si la decisión fue transbordo.
  tramo_id bigint REFERENCES public.navitrack_tramos(id) ON DELETE SET NULL,

  creado_at timestamptz NOT NULL DEFAULT now(),

  -- Un puerto anunciado una sola vez por operación: si el buque lo repite, se
  -- actualiza `visto_at` en vez de acumular filas iguales.
  UNIQUE (operacion_id, puerto)
);

COMMENT ON TABLE public.navitrack_recaladas IS
  'Puertos que el buque fue anunciando para cada embarque, y la decisión humana sobre cada uno: parada programada o transbordo.';

COMMENT ON COLUMN public.navitrack_recaladas.estado IS
  'anunciada (declarado, aún no llega) · por_verificar (llegó la fecha, requiere revisión) · parada_programada · transbordo';

CREATE INDEX IF NOT EXISTS navitrack_recaladas_operacion_idx
  ON public.navitrack_recaladas (operacion_id, anunciado_at);

-- El cron busca justamente esto: lo que hay que avisar.
CREATE INDEX IF NOT EXISTS navitrack_recaladas_pendientes_idx
  ON public.navitrack_recaladas (estado, eta_anunciada)
  WHERE estado IN ('anunciada', 'por_verificar');

ALTER TABLE public.navitrack_recaladas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "navitrack_recaladas_superadmin_all" ON public.navitrack_recaladas;
CREATE POLICY "navitrack_recaladas_superadmin_all" ON public.navitrack_recaladas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol = 'superadmin' AND u.activo = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol = 'superadmin' AND u.activo = true
    )
  );

-- El resto del personal lo lee: el historial del viaje es información de todos.
DROP POLICY IF EXISTS "navitrack_recaladas_staff_read" ON public.navitrack_recaladas;
CREATE POLICY "navitrack_recaladas_staff_read" ON public.navitrack_recaladas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('admin', 'ejecutivo', 'operador')
        AND u.activo = true
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.navitrack_recaladas TO authenticated;
GRANT ALL ON public.navitrack_recaladas TO service_role;

-- Verificación:
-- SELECT o.contenedor, r.puerto, r.nave, r.estado, r.eta_anunciada, r.decidido_at
--   FROM public.navitrack_recaladas r
--   JOIN public.operaciones o ON o.id = r.operacion_id
--  ORDER BY o.contenedor, r.anunciado_at;
