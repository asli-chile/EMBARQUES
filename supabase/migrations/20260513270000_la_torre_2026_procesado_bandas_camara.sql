-- ============================================================================
-- LA TORRE 2026 — Procesado, bandas en cámara
--
--   • procesado      → casilla “ya procesado” en la tabla
--   • bandas_camara  → posición en cámara, formato banda(posición):
--                      ej. 1(1) = banda 1, posición 1 contando desde el fondo
--                      hacia afuera. Varios tramos: 1(1)+2(3)
--
-- Aplicar en Supabase SQL Editor (idempotente).
-- ============================================================================

ALTER TABLE public.fruitstone2026_muestras
  ADD COLUMN IF NOT EXISTS procesado BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.fruitstone2026_muestras
  ADD COLUMN IF NOT EXISTS bandas_camara TEXT;
