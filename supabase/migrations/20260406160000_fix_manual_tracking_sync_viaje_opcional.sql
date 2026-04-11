-- Sincronización manual: misma NAVE siempre; VIAJE opcional.
-- - Origen con viaje informado: replica a filas con el mismo viaje O con viaje vacío (operaciones sin viaje cargado).
-- - Origen sin viaje: solo filas con la misma nave y viaje vacío (no toca viajes distintos).
CREATE OR REPLACE FUNCTION public.operaciones_propagate_manual_tracking_peers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  n TEXT;
  v TEXT;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  n := lower(trim(COALESCE(NEW.nave, '')));
  v := lower(trim(COALESCE(NEW.viaje, '')));
  IF length(n) = 0 THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.tracking_manual_lat IS NULL AND NEW.tracking_manual_lng IS NULL THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.tracking_manual_lat IS NOT DISTINCT FROM OLD.tracking_manual_lat
       AND NEW.tracking_manual_lng IS NOT DISTINCT FROM OLD.tracking_manual_lng
       AND NEW.tracking_manual_updated_at IS NOT DISTINCT FROM OLD.tracking_manual_updated_at THEN
      RETURN NEW;
    END IF;
  END IF;

  UPDATE public.operaciones o
  SET
    tracking_manual_lat = NEW.tracking_manual_lat,
    tracking_manual_lng = NEW.tracking_manual_lng,
    tracking_manual_updated_at = NEW.tracking_manual_updated_at
  WHERE o.deleted_at IS NULL
    AND o.id <> NEW.id
    AND lower(trim(COALESCE(o.nave, ''))) = n
    AND (
      (length(v) > 0 AND lower(trim(COALESCE(o.viaje, ''))) = v)
      OR (length(v) > 0 AND trim(COALESCE(o.viaje, '')) = '')
      OR (length(v) = 0 AND trim(COALESCE(o.viaje, '')) = '')
    );

  RETURN NEW;
END;
$$;

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
  IF length(n) = 0 THEN
    RAISE EXCEPTION 'nave_requerida_para_sincronizar' USING ERRCODE = 'P0001';
  END IF;

  IF p_clear THEN
    UPDATE public.operaciones o
    SET
      tracking_manual_lat = NULL,
      tracking_manual_lng = NULL,
      tracking_manual_updated_at = NULL
    WHERE o.deleted_at IS NULL
      AND lower(trim(COALESCE(o.nave, ''))) = n
      AND (
        (length(v) > 0 AND lower(trim(COALESCE(o.viaje, ''))) = v)
        OR (length(v) > 0 AND trim(COALESCE(o.viaje, '')) = '')
        OR (length(v) = 0 AND trim(COALESCE(o.viaje, '')) = '')
      );
  ELSE
    UPDATE public.operaciones o
    SET
      tracking_manual_lat = p_lat,
      tracking_manual_lng = p_lng,
      tracking_manual_updated_at = now()
    WHERE o.deleted_at IS NULL
      AND lower(trim(COALESCE(o.nave, ''))) = n
      AND (
        (length(v) > 0 AND lower(trim(COALESCE(o.viaje, ''))) = v)
        OR (length(v) > 0 AND trim(COALESCE(o.viaje, '')) = '')
        OR (length(v) = 0 AND trim(COALESCE(o.viaje, '')) = '')
      );
  END IF;

  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END;
$$;

COMMENT ON FUNCTION public.operaciones_propagate_manual_tracking_peers() IS
  'Replica tracking_manual_* por misma nave; viaje opcional (misma regla que sync_operaciones_tracking_manual).';
