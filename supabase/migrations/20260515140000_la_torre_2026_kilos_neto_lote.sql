-- LA TORRE 2026 — Kilos neto del lote (junto a kilos bruto en detalle)
ALTER TABLE public.fruitstone2026_muestras
  ADD COLUMN IF NOT EXISTS kilos_neto_lote NUMERIC(10, 2);

COMMENT ON COLUMN public.fruitstone2026_muestras.kilos_neto_lote IS
  'Kilos netos totales del lote (opcional).';
