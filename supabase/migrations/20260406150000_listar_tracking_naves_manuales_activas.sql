-- Naves con posición manual en operaciones activas (para mapa de tracking). SECURITY INVOKER = RLS por usuario.
CREATE OR REPLACE FUNCTION public.listar_tracking_naves_manuales_activas()
RETURNS TABLE (
  nave TEXT,
  viaje TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  ref_asli TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT DISTINCT ON (
    lower(trim(coalesce(o.nave, ''))),
    lower(trim(coalesce(o.viaje, '')))
  )
    trim(o.nave) AS nave,
    NULLIF(trim(coalesce(o.viaje, '')), '') AS viaje,
    o.tracking_manual_lat AS lat,
    o.tracking_manual_lng AS lng,
    o.ref_asli AS ref_asli
  FROM public.operaciones o
  WHERE o.deleted_at IS NULL
    AND o.tracking_manual_lat IS NOT NULL
    AND o.tracking_manual_lng IS NOT NULL
    AND NOT (o.tracking_manual_lat = 0 AND o.tracking_manual_lng = 0)
    AND trim(coalesce(o.nave, '')) <> ''
    AND upper(replace(trim(coalesce(o.estado_operacion, '')), ' ', '_')) NOT IN ('COMPLETADO', 'CANCELADO', 'ARRIBADO')
  ORDER BY
    lower(trim(coalesce(o.nave, ''))),
    lower(trim(coalesce(o.viaje, ''))),
    o.tracking_manual_updated_at DESC NULLS LAST
  LIMIT 200;
$$;

GRANT EXECUTE ON FUNCTION public.listar_tracking_naves_manuales_activas() TO authenticated;

COMMENT ON FUNCTION public.listar_tracking_naves_manuales_activas() IS
  'Una fila por nave+viaje (coords manuales más recientes). Solo operaciones no finalizadas; respeta RLS.';
