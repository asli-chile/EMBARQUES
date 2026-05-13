-- ============================================================================
-- LA TORRE 2026 — Clasificación de la muestra: Zumo y Segunda
--
-- Agrega dos campos para registrar el destino de la fruta detectado en la
-- muestra (independiente de los defectos individuales):
--   • zumo    → unidades clasificadas como desecho (van a zumo)
--   • segunda → unidades clasificadas como comercial (segunda calidad)
--
-- Aplicar en Supabase SQL Editor (idempotente).
-- ============================================================================

ALTER TABLE public.fruitstone2026_muestras
  ADD COLUMN IF NOT EXISTS zumo INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.fruitstone2026_muestras
  ADD COLUMN IF NOT EXISTS segunda INTEGER NOT NULL DEFAULT 0;
