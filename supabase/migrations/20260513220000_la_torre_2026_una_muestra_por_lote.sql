-- ============================================================================
-- LA TORRE 2026 — Una muestra por lote
--
-- Regla operativa: se toma una sola muestra por lote, por lo que las columnas
-- `caja` (identificador de caja) y `muestra` (número de muestra) ya no aplican.
--
-- Aplicar en Supabase SQL Editor (idempotente).
-- ============================================================================

ALTER TABLE public.fruitstone2026_muestras
  DROP COLUMN IF EXISTS caja;

ALTER TABLE public.fruitstone2026_muestras
  DROP COLUMN IF EXISTS muestra;
