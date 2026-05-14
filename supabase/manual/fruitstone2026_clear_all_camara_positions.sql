-- ============================================================================
-- LA TORRE 2026 — Borrar TODAS las posiciones en cámara (solo coordenadas)
--
-- Tabla: public.fruitstone2026_muestras
-- Campos que se anulan: camara_banda, camara_posicion, bandas_camara
-- camara_altura → 1 (convención “sin celda en mapa”; muchas BD tienen NOT NULL ahí)
--
-- NO modifica: lote, productor, variedad, clasificación, fotos, procesado,
--               cajas, kilos, etc.
--
-- Cómo aplicar: Supabase → SQL Editor → pegar todo → Run.
-- Irreversible sin backup. Revise el conteo antes/después si lo desea.
-- ==========================================================================

BEGIN;

-- Vista previa (opcional: comente BEGIN/COMMIT y ejecute solo este SELECT)
-- SELECT
--   COUNT(*) FILTER (WHERE camara_banda IS NOT NULL) AS con_banda,
--   COUNT(*) FILTER (WHERE camara_posicion IS NOT NULL) AS con_posicion,
--   COUNT(*) FILTER (WHERE camara_altura IS NOT NULL) AS con_altura,
--   COUNT(*) FILTER (WHERE NULLIF(TRIM(bandas_camara), '') IS NOT NULL) AS con_texto_bandas
-- FROM public.fruitstone2026_muestras;

UPDATE public.fruitstone2026_muestras
SET
  camara_banda = NULL,
  camara_posicion = NULL,
  camara_altura = 1,
  bandas_camara = NULL
WHERE
  camara_banda IS NOT NULL
  OR camara_posicion IS NOT NULL
  OR NULLIF(TRIM(bandas_camara), '') IS NOT NULL;

COMMIT;
