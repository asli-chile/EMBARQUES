-- ============================================================================
-- LA TORRE 2026 — Reemplazar `embalaje` por `cantidad_cajas` y `kilos_bruto_lote`
--
-- Las muestras se realizan ANTES del embalaje, por lo que ya no se registra
-- el formato de embalaje. En su lugar guardamos:
--   • cantidad_cajas   → cuántas cajas componen el lote
--   • kilos_bruto_lote → kilos brutos totales del lote
--
-- Aplicar en Supabase SQL Editor (idempotente).
-- ============================================================================

ALTER TABLE public.fruitstone2026_muestras
  DROP COLUMN IF EXISTS embalaje;

ALTER TABLE public.fruitstone2026_muestras
  ADD COLUMN IF NOT EXISTS cantidad_cajas INTEGER;

ALTER TABLE public.fruitstone2026_muestras
  ADD COLUMN IF NOT EXISTS kilos_bruto_lote NUMERIC(10,2);
