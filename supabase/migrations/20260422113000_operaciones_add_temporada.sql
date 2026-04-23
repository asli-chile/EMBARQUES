-- Agrega columna temporada para clasificar operaciones/documentos por ciclo.
ALTER TABLE public.operaciones
ADD COLUMN IF NOT EXISTS temporada text;

-- Backfill para datos ya importados desde EXPORT.json:
-- observaciones viene con prefijo "Temporada: <valor> | ..."
UPDATE public.operaciones
SET temporada = NULLIF(
  btrim(split_part(split_part(observaciones, 'Temporada:', 2), '|', 1)),
  ''
)
WHERE (temporada IS NULL OR btrim(temporada) = '')
  AND observaciones ILIKE '%Temporada:%';

-- Indice para filtros por temporada en vistas y reportes.
CREATE INDEX IF NOT EXISTS idx_operaciones_temporada
  ON public.operaciones (temporada);
