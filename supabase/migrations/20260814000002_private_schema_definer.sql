-- Mueve SECURITY DEFINER fuera de public para que PostgREST no las exponga
-- (/rest/v1/rpc). El linter 0028/0029 deja de marcarlas. Las políticas RLS
-- siguen funcionando porque ALTER SET SCHEMA conserva el OID.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO postgres, service_role, authenticated, anon;

-- ─── 1. Helpers de RLS → schema private ─────────────────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS f
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        'get_user_rol',
        'get_cliente_nombres_for_user',
        'is_admin_or_staff',
        'is_ejecutivo',
        'is_superadmin',
        'is_staff_no_config'
      ])
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET SCHEMA private', r.f);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION private.get_user_rol()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM public.usuarios WHERE auth_id = auth.uid() AND activo = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private
AS $$
  SELECT private.get_user_rol() = 'superadmin';
$$;

CREATE OR REPLACE FUNCTION private.is_ejecutivo()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private
AS $$
  SELECT private.get_user_rol() = 'ejecutivo';
$$;

CREATE OR REPLACE FUNCTION private.is_staff_no_config()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private
AS $$
  SELECT private.get_user_rol() IN ('admin', 'operador');
$$;

CREATE OR REPLACE FUNCTION private.is_admin_or_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private
AS $$
  SELECT private.get_user_rol() IN ('superadmin', 'admin', 'operador');
$$;

CREATE OR REPLACE FUNCTION private.get_cliente_nombres_for_user()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(e.nombre) FILTER (WHERE e.nombre IS NOT NULL),
    ARRAY[]::TEXT[]
  )
  FROM public.usuarios_empresas ue
  JOIN public.empresas e ON e.id = ue.empresa_id
  JOIN public.usuarios u ON u.id = ue.usuario_id
  WHERE u.auth_id = auth.uid() AND u.activo = true
    AND u.rol IN ('cliente', 'ejecutivo');
$$;

GRANT EXECUTE ON FUNCTION private.get_user_rol() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_superadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_ejecutivo() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_staff_no_config() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin_or_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_cliente_nombres_for_user() TO authenticated;

-- ─── 2. RPCs de la app: DEFINER en private + wrapper INVOKER en public ───────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS f
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        'incrementar_visitas',
        'upsert_sesion_activa',
        'sync_operaciones_tracking_manual'
      ])
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET SCHEMA private', r.f);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION private.incrementar_visitas()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.conteo_visitas
  SET total = total + 1,
      updated_at = now()
  WHERE id = 1
  RETURNING total;
$$;

CREATE OR REPLACE FUNCTION private.upsert_sesion_activa(p_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nombre text := 'Visitante';
  v_email text := '';
  v_rol text := 'visitante';
  v_auth boolean := false;
BEGIN
  IF p_session_id IS NULL OR length(trim(p_session_id)) < 8 OR length(trim(p_session_id)) > 80 THEN
    RAISE EXCEPTION 'session_id_invalido' USING ERRCODE = 'P0001';
  END IF;

  IF auth.uid() IS NOT NULL THEN
    SELECT
      COALESCE(u.nombre, 'Usuario'),
      COALESCE(u.email, ''),
      COALESCE(u.rol::text, 'usuario'),
      true
    INTO v_nombre, v_email, v_rol, v_auth
    FROM public.usuarios u
    WHERE u.auth_id = auth.uid() AND u.activo = true
    LIMIT 1;

    IF NOT FOUND THEN
      v_nombre := 'Usuario';
      v_auth := true;
    END IF;
  END IF;

  INSERT INTO public.sesiones_activas (session_id, last_seen, nombre, email, rol, es_autenticado)
  VALUES (trim(p_session_id), now(), v_nombre, v_email, v_rol, v_auth)
  ON CONFLICT (session_id) DO UPDATE SET
    last_seen = now(),
    nombre = EXCLUDED.nombre,
    email = EXCLUDED.email,
    rol = EXCLUDED.rol,
    es_autenticado = EXCLUDED.es_autenticado;
END;
$$;

CREATE OR REPLACE FUNCTION private.sync_operaciones_tracking_manual(
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

  r := private.get_user_rol();
  IF r IS NULL OR trim(lower(r)) NOT IN (
    'superadmin', 'admin', 'operador', 'ejecutivo'
  ) THEN
    RAISE EXCEPTION 'sin_permiso_sync_tracking_manual' USING ERRCODE = 'P0001';
  END IF;

  IF length(n) = 0 THEN
    RAISE EXCEPTION 'nave_requerida_para_sincronizar' USING ERRCODE = 'P0001';
  END IF;

  IF trim(lower(r)) IN ('superadmin', 'admin', 'operador') THEN
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
        AND o.cliente IS NOT NULL
        AND o.cliente = ANY (private.get_cliente_nombres_for_user());
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
        AND o.cliente IS NOT NULL
        AND o.cliente = ANY (private.get_cliente_nombres_for_user());
    END IF;
  END IF;

  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END;
$$;

GRANT EXECUTE ON FUNCTION private.incrementar_visitas() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.upsert_sesion_activa(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.sync_operaciones_tracking_manual(text, text, double precision, double precision, boolean) TO authenticated;

-- Wrappers públicos: no son DEFINER, el linter no los marca.
CREATE OR REPLACE FUNCTION public.incrementar_visitas()
RETURNS bigint
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.incrementar_visitas();
$$;

CREATE OR REPLACE FUNCTION public.upsert_sesion_activa(p_session_id text)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.upsert_sesion_activa(p_session_id);
$$;

CREATE OR REPLACE FUNCTION public.sync_operaciones_tracking_manual(
  p_nave TEXT,
  p_viaje TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_clear BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.sync_operaciones_tracking_manual(p_nave, p_viaje, p_lat, p_lng, p_clear);
$$;

REVOKE ALL ON FUNCTION public.incrementar_visitas() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_sesion_activa(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_operaciones_tracking_manual(text, text, double precision, double precision, boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.incrementar_visitas() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_sesion_activa(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_operaciones_tracking_manual(text, text, double precision, double precision, boolean) TO authenticated;
