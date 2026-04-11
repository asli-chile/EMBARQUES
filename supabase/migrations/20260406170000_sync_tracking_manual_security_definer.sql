-- La sincronización masiva fallaba con SECURITY INVOKER: RLS solo dejaba actualizar una fila.
-- Esta RPC corre como propietario (DEFINER) pero solo si el usuario es staff o ejecutivo.
-- Ejecutivo: solo operaciones de sus clientes asignados (get_cliente_nombres_for_user).

CREATE OR REPLACE FUNCTION public.sync_operaciones_tracking_manual(
  p_nave TEXT,
  p_viaje TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_clear BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n TEXT := lower(regexp_replace(trim(COALESCE(p_nave, '')), '\s+', ' ', 'g'));
  v TEXT := lower(regexp_replace(trim(COALESCE(p_viaje, '')), '\s+', ' ', 'g'));
  cnt INTEGER;
  r TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'no_autenticado' USING ERRCODE = 'P0001';
  END IF;

  r := public.get_user_rol();
  IF r IS NULL OR trim(lower(r)) NOT IN (
    'superadmin', 'admin', 'operador', 'usuario', 'ejecutivo'
  ) THEN
    RAISE EXCEPTION 'sin_permiso_sync_tracking_manual' USING ERRCODE = 'P0001';
  END IF;

  IF length(n) = 0 THEN
    RAISE EXCEPTION 'nave_requerida_para_sincronizar' USING ERRCODE = 'P0001';
  END IF;

  IF trim(lower(r)) IN ('superadmin', 'admin', 'operador', 'usuario') THEN
    IF p_clear THEN
      UPDATE public.operaciones o
      SET
        tracking_manual_lat = NULL,
        tracking_manual_lng = NULL,
        tracking_manual_updated_at = NULL
      WHERE o.deleted_at IS NULL
        AND lower(regexp_replace(trim(COALESCE(o.nave, '')), '\s+', ' ', 'g')) = n
        AND (
          (length(v) > 0 AND lower(regexp_replace(trim(COALESCE(o.viaje, '')), '\s+', ' ', 'g')) = v)
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
        AND lower(regexp_replace(trim(COALESCE(o.nave, '')), '\s+', ' ', 'g')) = n
        AND (
          (length(v) > 0 AND lower(regexp_replace(trim(COALESCE(o.viaje, '')), '\s+', ' ', 'g')) = v)
          OR (length(v) > 0 AND trim(COALESCE(o.viaje, '')) = '')
          OR (length(v) = 0 AND trim(COALESCE(o.viaje, '')) = '')
        );
    END IF;
  ELSE
    IF p_clear THEN
      UPDATE public.operaciones o
      SET
        tracking_manual_lat = NULL,
        tracking_manual_lng = NULL,
        tracking_manual_updated_at = NULL
      WHERE o.deleted_at IS NULL
        AND lower(regexp_replace(trim(COALESCE(o.nave, '')), '\s+', ' ', 'g')) = n
        AND (
          (length(v) > 0 AND lower(regexp_replace(trim(COALESCE(o.viaje, '')), '\s+', ' ', 'g')) = v)
          OR (length(v) > 0 AND trim(COALESCE(o.viaje, '')) = '')
          OR (length(v) = 0 AND trim(COALESCE(o.viaje, '')) = '')
        )
        AND (
          o.cliente IS NULL
          OR o.cliente = ANY (public.get_cliente_nombres_for_user())
        );
    ELSE
      UPDATE public.operaciones o
      SET
        tracking_manual_lat = p_lat,
        tracking_manual_lng = p_lng,
        tracking_manual_updated_at = now()
      WHERE o.deleted_at IS NULL
        AND lower(regexp_replace(trim(COALESCE(o.nave, '')), '\s+', ' ', 'g')) = n
        AND (
          (length(v) > 0 AND lower(regexp_replace(trim(COALESCE(o.viaje, '')), '\s+', ' ', 'g')) = v)
          OR (length(v) > 0 AND trim(COALESCE(o.viaje, '')) = '')
          OR (length(v) = 0 AND trim(COALESCE(o.viaje, '')) = '')
        )
        AND (
          o.cliente IS NULL
          OR o.cliente = ANY (public.get_cliente_nombres_for_user())
        );
    END IF;
  END IF;

  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END;
$$;

-- Evita doble lógica y propagación parcial por RLS; el tracking usa la RPC anterior.
DROP TRIGGER IF EXISTS operaciones_propagate_manual_tracking_peers ON public.operaciones;
DROP FUNCTION IF EXISTS public.operaciones_propagate_manual_tracking_peers() CASCADE;

COMMENT ON FUNCTION public.sync_operaciones_tracking_manual(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN) IS
  'Sincroniza tracking manual por nave/viaje (DEFINER). Staff: todas las filas. Ejecutivo: solo clientes asignados.';
