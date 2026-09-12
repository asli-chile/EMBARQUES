-- ─── NaviTrack: caché de posiciones AIS y control de gasto ───────────────────
--
-- Cada consulta al proveedor cuesta un crédito. Sin caché, tener un embarque
-- abierto con refresco automático agota un plan de pruebas en menos de una hora.
--
-- El modelo se invierte: la base es la fuente de la pantalla y el proveedor se
-- consulta solo cuando la última lectura envejeció. Además, solo se rastrean las
-- naves marcadas explícitamente.

-- ─── 1. Lista blanca de rastreo ──────────────────────────────────────────────
-- Sin esta marca ninguna nave se consulta. Es el freno de mano: da igual lo que
-- pida el frontend, si la nave no está activa el servidor no llama al proveedor.
ALTER TABLE public.naves
  ADD COLUMN IF NOT EXISTS tracking_activo boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.naves.tracking_activo IS
  'Habilita consultar el AIS de esta nave. Cada nave activa gasta créditos del proveedor.';

CREATE INDEX IF NOT EXISTS naves_tracking_activo_idx
  ON public.naves (tracking_activo)
  WHERE tracking_activo = true;

-- ─── 2. Lecturas AIS ─────────────────────────────────────────────────────────
-- Una fila por llamada real al proveedor: contar filas es contar créditos
-- gastados. Guardar el histórico además permite dibujar la derrota real del
-- buque en vez de una geodésica teórica.
CREATE TABLE IF NOT EXISTS public.navitrack_ais_lecturas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- IMO o MMSI tal como se envió al proveedor.
  identificador text NOT NULL,
  nave_id uuid REFERENCES public.naves(id) ON DELETE SET NULL,
  nave_nombre text,
  lat double precision,
  lng double precision,
  speed numeric,
  course numeric,
  destino text,
  nav_status text,
  -- ETA que declara el buque.
  eta timestamptz,
  -- Momento de la señal AIS (lo informa el proveedor).
  posicion_recibida_at timestamptz,
  -- Momento de nuestra llamada. Es lo que define si la caché está vieja.
  consultado_at timestamptz NOT NULL DEFAULT now(),
  crudo jsonb
);

COMMENT ON TABLE public.navitrack_ais_lecturas IS
  'Una fila por llamada al proveedor AIS. Sirve de caché, de histórico de derrota y de contador de créditos.';

CREATE INDEX IF NOT EXISTS navitrack_ais_lecturas_ident_idx
  ON public.navitrack_ais_lecturas (identificador, consultado_at DESC);

CREATE INDEX IF NOT EXISTS navitrack_ais_lecturas_consultado_idx
  ON public.navitrack_ais_lecturas (consultado_at DESC);

ALTER TABLE public.navitrack_ais_lecturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "navitrack_ais_lecturas_superadmin_all" ON public.navitrack_ais_lecturas;
CREATE POLICY "navitrack_ais_lecturas_superadmin_all" ON public.navitrack_ais_lecturas
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

DROP POLICY IF EXISTS "navitrack_ais_lecturas_staff_read" ON public.navitrack_ais_lecturas;
CREATE POLICY "navitrack_ais_lecturas_staff_read" ON public.navitrack_ais_lecturas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('admin', 'ejecutivo', 'operador')
        AND u.activo = true
    )
  );

GRANT SELECT, INSERT ON public.navitrack_ais_lecturas TO authenticated;
GRANT ALL ON public.navitrack_ais_lecturas TO service_role;

-- Verificación del gasto acumulado:
-- SELECT identificador, count(*) AS creditos, max(consultado_at) AS ultima
--   FROM public.navitrack_ais_lecturas GROUP BY identificador;
