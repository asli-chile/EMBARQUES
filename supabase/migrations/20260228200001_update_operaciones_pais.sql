-- ============================================================================
-- Actualizar campo 'pais' en operaciones basándose en el POD existente
-- ============================================================================

UPDATE operaciones o
SET pais = d.pais
FROM destinos d
WHERE o.pod = d.nombre
  AND d.pais IS NOT NULL
  AND (o.pais IS NULL OR o.pais = '');
