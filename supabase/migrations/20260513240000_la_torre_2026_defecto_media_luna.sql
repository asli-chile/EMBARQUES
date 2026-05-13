-- ============================================================================
-- LA TORRE 2026 — Nuevo defecto: media luna
--
-- Agrega columna `media_luna` para contar frutos con defecto "media luna"
-- (deformación característica de la cereza).
--
-- Aplicar en Supabase SQL Editor (idempotente).
-- ============================================================================

ALTER TABLE public.fruitstone2026_muestras
  ADD COLUMN IF NOT EXISTS media_luna INTEGER NOT NULL DEFAULT 0;
