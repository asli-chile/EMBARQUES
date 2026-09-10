-- Tracking: clientes/ejecutivos solo ven sus operaciones y naves con coords manuales.
-- buscar_tracking era SECURITY DEFINER y bypasseaba RLS (veían ops de otros).

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
SECURITY INVOKER
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
  FROM public.operaciones o
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

REVOKE ALL ON FUNCTION public.buscar_tracking(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.buscar_tracking(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.buscar_tracking(text) TO authenticated;

COMMENT ON FUNCTION public.buscar_tracking(text) IS
  'Búsqueda de tracking. SECURITY INVOKER: aplica RLS (cliente/ejecutivo solo sus empresas).';

-- Flota manual: INVOKER + filtro explícito por rol (defensa en profundidad).
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
    AND upper(replace(trim(coalesce(o.estado_operacion, '')), ' ', '_')) NOT IN (
      'COMPLETADO', 'CANCELADO', 'ARRIBADO', 'CANCELADA'
    )
    AND (
      private.is_admin_or_staff()
      OR (
        private.is_ejecutivo()
        AND o.cliente IS NOT NULL
        AND o.cliente = ANY (private.get_cliente_nombres_for_user())
      )
      OR (
        private.get_user_rol() = 'cliente'
        AND o.cliente IS NOT NULL
        AND o.cliente = ANY (private.get_cliente_nombres_for_user())
      )
    )
  ORDER BY
    lower(trim(coalesce(o.nave, ''))),
    lower(trim(coalesce(o.viaje, ''))),
    o.tracking_manual_updated_at DESC NULLS LAST
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.listar_tracking_naves_manuales_activas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_tracking_naves_manuales_activas() TO authenticated;

COMMENT ON FUNCTION public.listar_tracking_naves_manuales_activas() IS
  'Naves con coords manuales activas. Staff: todas. Cliente/ejecutivo: solo sus empresas.';
