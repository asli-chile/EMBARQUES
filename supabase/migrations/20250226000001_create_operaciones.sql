-- Tabla operaciones para EMBARQUES
-- Campos basados en el CSV de registros de embarques

CREATE TABLE IF NOT EXISTS public.operaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingresado text,
  wk_in text,
  nref_asli text,
  ejecutivo text,
  shipper text,
  booking text,
  cant_cont text,
  contenedor text,
  wk_etd text,
  naviera text,
  nave_inicial text,
  especie text,
  t text,
  cbm text,
  ct text,
  co2 text,
  o2 text,
  pol text,
  pod text,
  deposito text,
  etd text,
  eta text,
  tt text,
  flete text,
  estado text,
  roleada_desde text,
  ingreso_stacking text,
  tipo_ingreso text,
  n_bl text,
  estado_blswb text,
  contrato text,
  mes_de_ingreso text,
  mes_de_zarpe text,
  semana_de_arribo text,
  mes_de_arribo text,
  facturacion text,
  booking_pdf text,
  comentario text,
  observacion text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operaciones_nref ON public.operaciones (nref_asli);
CREATE INDEX IF NOT EXISTS idx_operaciones_shipper ON public.operaciones (shipper);
CREATE INDEX IF NOT EXISTS idx_operaciones_estado ON public.operaciones (estado);
CREATE INDEX IF NOT EXISTS idx_operaciones_naviera ON public.operaciones (naviera);
CREATE INDEX IF NOT EXISTS idx_operaciones_booking ON public.operaciones (booking);

ALTER TABLE public.operaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operaciones" ON public.operaciones
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS operaciones_updated_at ON public.operaciones;
CREATE TRIGGER operaciones_updated_at
  BEFORE UPDATE ON public.operaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
