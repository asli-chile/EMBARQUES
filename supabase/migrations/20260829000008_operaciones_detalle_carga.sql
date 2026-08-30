-- Campos de detalle de carga y documentales que existían en la planilla
-- histórica MASTER (public/DETALLE.xlsx) y no tenían equivalente en el ERP.
--
-- `cajas_calibres` guarda el desglose de cajas por calibre en JSONB porque el
-- set de calibres varía por especie y formato; fijarlo en columnas obligaría a
-- una migración cada vez que aparece un calibre nuevo. Estructura esperada:
--   {"2.5KG": {"XL": 384, "2J": 1536}, "5KG": {"J": 352, "3J": 528}}

ALTER TABLE public.operaciones
  ADD COLUMN IF NOT EXISTS sello_planta text,
  ADD COLUMN IF NOT EXISTS swb text,
  ADD COLUMN IF NOT EXISTS fob_invoice numeric,
  ADD COLUMN IF NOT EXISTS cajas_calibres jsonb,
  ADD COLUMN IF NOT EXISTS total_cajas_25kg numeric,
  ADD COLUMN IF NOT EXISTS total_cajas_5kg numeric;

COMMENT ON COLUMN public.operaciones.sello_planta IS 'Sello puesto en planta, distinto del sello de la naviera';
COMMENT ON COLUMN public.operaciones.swb IS 'Sea Waybill / número de documento de embarque';
COMMENT ON COLUMN public.operaciones.fob_invoice IS 'Valor FOB de la factura de exportación';
COMMENT ON COLUMN public.operaciones.cajas_calibres IS 'Desglose de cajas por formato y calibre. Ej: {"2.5KG":{"XL":384},"5KG":{"J":352}}';
COMMENT ON COLUMN public.operaciones.total_cajas_25kg IS 'Total de cajas formato 2.5 kg';
COMMENT ON COLUMN public.operaciones.total_cajas_5kg IS 'Total de cajas formato 5 kg';

-- Búsqueda por SWB: es el dato con el que consultan navieras y clientes.
CREATE INDEX IF NOT EXISTS operaciones_swb_idx ON public.operaciones (swb) WHERE swb IS NOT NULL;
