-- ============================================================================
-- LA TORRE 2026 — Procesado, bandas en cámara
--
--   • procesado      → casilla “ya procesado” en la tabla
--   • bandas_camara  → posición(es) del lote en cámara (texto libre, ej. "1+3")
--
-- Aplicar en Supabase SQL Editor (idempotente).
-- ============================================================================

ALTER TABLE public.fruitstone2026_muestras
  ADD COLUMN IF NOT EXISTS procesado BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.fruitstone2026_muestras
  ADD COLUMN IF NOT EXISTS bandas_camara TEXT;
