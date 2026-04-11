-- Tras guardar coordenadas manuales en una operación, replicar a todas las demás
-- con la misma nave y viaje (normalizados). SECURITY INVOKER: respeta RLS en cada fila.
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
  IF length(n) = 0 OR length(v) = 0 THEN
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
    AND lower(trim(COALESCE(o.viaje, ''))) = v;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS operaciones_propagate_manual_tracking_peers ON public.operaciones;

CREATE TRIGGER operaciones_propagate_manual_tracking_peers
  AFTER INSERT OR UPDATE ON public.operaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.operaciones_propagate_manual_tracking_peers();

COMMENT ON FUNCTION public.operaciones_propagate_manual_tracking_peers() IS
  'Replica tracking_manual_* a operaciones con la misma nave+viaje (minúsculas/trim). Anidación ignorada con pg_trigger_depth.';
