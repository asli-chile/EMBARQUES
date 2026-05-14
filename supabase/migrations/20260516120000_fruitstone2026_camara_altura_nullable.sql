-- ============================================================================
-- LA TORRE 2026 — camara_altura nullable (varias celdas en bandas_camara)
--
-- Con lote en varias posiciones (texto B-P+B-P) las columnas estructuradas
-- deben poder ser NULL todas a la vez. NOT NULL en camara_altura provocaba
-- PATCH/INSERT 400 al enviar camara_altura: null.
--
-- Idempotente.
-- ============================================================================

ALTER TABLE public.fruitstone2026_muestras
  ALTER COLUMN camara_altura DROP NOT NULL;

ALTER TABLE public.fruitstone2026_muestras
  ALTER COLUMN camara_altura SET DEFAULT 1;

COMMENT ON COLUMN public.fruitstone2026_muestras.camara_altura IS
  'Nivel de apilado (1 = base, 2 = sobre H1). NULL si solo se usa bandas_camara (p. ej. varias celdas con +).';
