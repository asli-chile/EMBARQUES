-- ============================================================================
-- LA TORRE 2026 — Clasificación: agregar "Primera" (premium)
--
-- Nueva clasificación completa (calculada en cliente):
--   primera = total − zumo − segunda  (mínimo 0)
--   segunda = blanda + pitting + doble
--   zumo    = pudricion + color_bajo + partida + negro
--   exportable = primera + segunda = total − zumo
--
-- Aplicar en Supabase SQL Editor (idempotente).
-- ============================================================================

ALTER TABLE public.fruitstone2026_muestras
  ADD COLUMN IF NOT EXISTS primera INTEGER NOT NULL DEFAULT 0;
