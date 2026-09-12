-- ─── NaviTrack: decisiones sobre alertas de transbordo ───────────────────────
--
-- El módulo detecta un posible transbordo cuando el destino que declara el AIS
-- no coincide con el POD comprometido. Esa detección es una sospecha, no un
-- hecho: el destino AIS lo escribe la tripulación a mano y abundan las
-- abreviaturas. Por eso la resuelve una persona, y acá queda su decisión.
--
-- Una fila por operación: confirmar o descartar reemplaza la decisión anterior.
-- Sin esta tabla NaviTrack funciona igual, pero la alerta reaparece en cada
-- carga porque no hay dónde recordar que ya fue resuelta.

CREATE TABLE IF NOT EXISTS public.navitrack_transbordos (
  operacion_id uuid PRIMARY KEY REFERENCES public.operaciones(id) ON DELETE CASCADE,
  estado text NOT NULL CHECK (estado IN ('confirmado', 'descartado')),
  -- Puerto donde se detectó el quiebre (destino declarado por el AIS al decidir).
  puerto text,
  -- Buque al que sigue la carga. Se llena cuando el equipo lo averigua.
  nave_siguiente text,
  decidido_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  decidido_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.navitrack_transbordos IS
  'Decisión humana sobre cada alerta de transbordo de NaviTrack: confirmado o descartado.';

CREATE INDEX IF NOT EXISTS navitrack_transbordos_estado_idx
  ON public.navitrack_transbordos (estado);

ALTER TABLE public.navitrack_transbordos ENABLE ROW LEVEL SECURITY;

-- NaviTrack es superadmin-only, así que la escritura también lo es. La lectura
-- se abre al personal interno para que el día que el módulo se comparta con
-- ejecutivos y operadores la alerta ya no reaparezca resuelta a medias.
DROP POLICY IF EXISTS "navitrack_transbordos_superadmin_all" ON public.navitrack_transbordos;
CREATE POLICY "navitrack_transbordos_superadmin_all" ON public.navitrack_transbordos
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

DROP POLICY IF EXISTS "navitrack_transbordos_staff_read" ON public.navitrack_transbordos;
CREATE POLICY "navitrack_transbordos_staff_read" ON public.navitrack_transbordos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('admin', 'ejecutivo', 'operador')
        AND u.activo = true
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.navitrack_transbordos TO authenticated;
GRANT ALL ON public.navitrack_transbordos TO service_role;

-- Verificación: debe devolver las dos políticas.
-- SELECT policyname FROM pg_policies WHERE tablename = 'navitrack_transbordos';
