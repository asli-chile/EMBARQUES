-- ============================================================================
-- LA TORRE 2026 — Mapa de cámara: coordenadas B{band}-P{pos}-H{height}
--
--   • camara_banda, camara_posicion, camara_altura → ubicación en grilla
--   • bandas_camara puede seguir usándose como texto (p. ej. sincronizado con
--     B1-P2-H1). Filas sin coordenadas siguen siendo válidas (solo no aparecen
--     en el mapa hasta que se asignen desde “Nuevo lote” o futuras ediciones).
--
-- Aplicar en Supabase SQL Editor (idempotente).
-- ============================================================================

ALTER TABLE public.fruitstone2026_muestras
  ADD COLUMN IF NOT EXISTS camara_banda SMALLINT;

ALTER TABLE public.fruitstone2026_muestras
  ADD COLUMN IF NOT EXISTS camara_posicion SMALLINT;

ALTER TABLE public.fruitstone2026_muestras
  ADD COLUMN IF NOT EXISTS camara_altura SMALLINT NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.fruitstone2026_muestras.camara_banda IS
  'Banda horizontal (1 = fondo de cámara hacia la puerta). NULL = sin posición en mapa.';
COMMENT ON COLUMN public.fruitstone2026_muestras.camara_posicion IS
  'Posición lateral dentro de la banda (1…N). NULL = sin posición en mapa.';
COMMENT ON COLUMN public.fruitstone2026_muestras.camara_altura IS
  'Nivel de apilado (1 = base, 2 = sobre H1).';

-- Un solo pallet activo (no procesado) por celda exacta.
CREATE UNIQUE INDEX IF NOT EXISTS fruitstone2026_muestras_camara_slot_active_ux
  ON public.fruitstone2026_muestras (camara_banda, camara_posicion, camara_altura)
  WHERE
    procesado = false
    AND camara_banda IS NOT NULL
    AND camara_posicion IS NOT NULL
    AND camara_altura IS NOT NULL;
