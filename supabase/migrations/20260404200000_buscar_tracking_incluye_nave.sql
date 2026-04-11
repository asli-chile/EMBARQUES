-- Incluye búsqueda por nombre de nave para enlazar seguimiento AIS con operaciones.
CREATE OR REPLACE FUNCTION public.buscar_tracking(termino TEXT)
RETURNS TABLE (
  id UUID,
  correlativo BIGINT,
  estado_operacion TEXT,
  cliente TEXT,
  contenedor TEXT,
  booking TEXT,
  ref_asli TEXT,
  tipo_unidad TEXT,
  especie TEXT,
  naviera TEXT,
  nave TEXT,
  pol TEXT,
  etd DATE,
  pod TEXT,
  eta DATE,
  tt INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.correlativo,
    o.estado_operacion,
    o.cliente,
    o.contenedor,
    o.booking,
    o.ref_asli,
    o.tipo_unidad,
    o.especie,
    o.naviera,
    o.nave,
    o.pol,
    o.etd,
    o.pod,
    o.eta,
    o.tt
  FROM operaciones o
  WHERE o.deleted_at IS NULL
    AND COALESCE(trim(termino), '') <> ''
    AND (
      (o.contenedor IS NOT NULL AND o.contenedor ILIKE '%' || trim(termino) || '%')
      OR (o.booking IS NOT NULL AND o.booking ILIKE '%' || trim(termino) || '%')
      OR (o.ref_asli IS NOT NULL AND o.ref_asli ILIKE '%' || trim(termino) || '%')
      OR (o.correlativo::TEXT = trim(termino))
      OR (o.nave IS NOT NULL AND o.nave ILIKE '%' || trim(termino) || '%')
    )
  ORDER BY o.etd DESC NULLS LAST, o.correlativo DESC
  LIMIT 20;
$$;
