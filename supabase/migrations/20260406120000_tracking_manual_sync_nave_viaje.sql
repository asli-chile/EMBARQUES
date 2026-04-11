-- Incluye viaje en resultados de tracking y sincroniza coordenadas manuales por misma nave + viaje.
-- Postgres no permite cambiar RETURNS TABLE con CREATE OR REPLACE: hay que eliminar la firma anterior.
DROP FUNCTION IF EXISTS public.buscar_tracking(text);

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
  viaje TEXT,
  pol TEXT,
  etd DATE,
  pod TEXT,
  eta DATE,
  tt INTEGER,
  tracking_manual_lat double precision,
  tracking_manual_lng double precision,
  tracking_manual_updated_at timestamptz
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
    o.viaje,
    o.pol,
    o.etd,
    o.pod,
    o.eta,
    o.tt,
    o.tracking_manual_lat,
    o.tracking_manual_lng,
    o.tracking_manual_updated_at
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

GRANT EXECUTE ON FUNCTION public.buscar_tracking(text) TO anon;
GRANT EXECUTE ON FUNCTION public.buscar_tracking(text) TO authenticated;

-- Actualiza todas las operaciones visibles por RLS con la misma nave y viaje (normalizados).
CREATE OR REPLACE FUNCTION public.sync_operaciones_tracking_manual(
  p_nave TEXT,
  p_viaje TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_clear BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  n TEXT := lower(trim(COALESCE(p_nave, '')));
  v TEXT := lower(trim(COALESCE(p_viaje, '')));
  cnt INTEGER;
BEGIN
  IF length(n) = 0 OR length(v) = 0 THEN
    RAISE EXCEPTION 'nave_y_viaje_requeridos_para_sincronizar'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_clear THEN
    UPDATE public.operaciones o
    SET
      tracking_manual_lat = NULL,
      tracking_manual_lng = NULL,
      tracking_manual_updated_at = NULL
    WHERE o.deleted_at IS NULL
      AND lower(trim(COALESCE(o.nave, ''))) = n
      AND lower(trim(COALESCE(o.viaje, ''))) = v;
  ELSE
    UPDATE public.operaciones o
    SET
      tracking_manual_lat = p_lat,
      tracking_manual_lng = p_lng,
      tracking_manual_updated_at = now()
    WHERE o.deleted_at IS NULL
      AND lower(trim(COALESCE(o.nave, ''))) = n
      AND lower(trim(COALESCE(o.viaje, ''))) = v;
  END IF;

  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_operaciones_tracking_manual(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN)
  TO authenticated;
