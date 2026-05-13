-- ============================================================================
-- LA TORRE 2026 — Nuevos defectos: sin pedicelo y negro
--
-- Agrega dos columnas:
--   • sin_pedicelo → fruta sin pedicelo (sin "rabito")
--   • negro        → fruta ennegrecida (suma a la clasificación de zumo/desecho)
--
-- Notas sobre la clasificación (calculada en cliente):
--   zumo    = pudricion + color_bajo + partida + negro
--   segunda = blanda + pitting + doble
--
-- Aplicar en Supabase SQL Editor (idempotente).
-- ============================================================================

ALTER TABLE public.fruitstone2026_muestras
  ADD COLUMN IF NOT EXISTS sin_pedicelo INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.fruitstone2026_muestras
  ADD COLUMN IF NOT EXISTS negro INTEGER NOT NULL DEFAULT 0;
