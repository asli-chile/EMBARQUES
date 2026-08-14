-- Cierra avisos del Database Linter de Supabase (search_path, RLS USING true,
-- listing de buckets públicos, RPCs SECURITY DEFINER expuestas a anon).

-- ─── 1. search_path fijo en funciones ────────────────────────────────────────

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
        'update_servicios_unicos_updated_at',
        'generate_ref_asli',
        'update_consorcios_updated_at',
        'marcar_consorcios_requiere_revision',
        'ver_toda_la_base',
        'set_formatos_updated_at',
        'set_consignatarios_updated_at',
        'set_updated_at'
      ])
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.f);
  END LOOP;
END $$;

-- ─── 2. Consorcios / servicios únicos: quitar escrituras USING (true) ────────
-- Las mutaciones van por /api/admin/* con service_role.

DO $$
DECLARE
  t text;
  p text;
  policies text[] := ARRAY[
    'consorcios_insert', 'consorcios_update', 'consorcios_delete',
    'consorcios_destinos_activos_insert', 'consorcios_destinos_activos_update', 'consorcios_destinos_activos_delete',
    'consorcios_servicios_insert', 'consorcios_servicios_update', 'consorcios_servicios_delete',
    'servicios_unicos_insert', 'servicios_unicos_update', 'servicios_unicos_delete',
    'servicios_unicos_destinos_insert', 'servicios_unicos_destinos_update', 'servicios_unicos_destinos_delete',
    'servicios_unicos_naves_insert', 'servicios_unicos_naves_update', 'servicios_unicos_naves_delete'
  ];
  tables text[] := ARRAY[
    'consorcios', 'consorcios_destinos_activos', 'consorcios_servicios',
    'servicios_unicos', 'servicios_unicos_destinos', 'servicios_unicos_naves'
  ];
BEGIN
  FOREACH p IN ARRAY policies LOOP
    FOREACH t IN ARRAY tables LOOP
      IF to_regclass('public.' || t) IS NOT NULL THEN
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p, t);
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- ─── 3. sesiones_activas: upsert por RPC, listado solo superadmin ────────────

DROP POLICY IF EXISTS "sesiones_insert_all" ON public.sesiones_activas;
DROP POLICY IF EXISTS "sesiones_update_all" ON public.sesiones_activas;
DROP POLICY IF EXISTS "sesiones_select_all" ON public.sesiones_activas;
DROP POLICY IF EXISTS "sesiones_select_superadmin" ON public.sesiones_activas;

CREATE POLICY "sesiones_select_superadmin"
  ON public.sesiones_activas FOR SELECT TO authenticated
  USING (public.is_superadmin());

REVOKE INSERT, UPDATE, DELETE ON public.sesiones_activas FROM anon, authenticated;
GRANT SELECT ON public.sesiones_activas TO authenticated;

CREATE OR REPLACE FUNCTION public.upsert_sesion_activa(p_session_id text)
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

REVOKE ALL ON FUNCTION public.upsert_sesion_activa(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_sesion_activa(text) TO anon, authenticated;

-- ─── 4. Storage: no listar archivos de buckets públicos ──────────────────────

DROP POLICY IF EXISTS "booking_docs_select" ON storage.objects;
DROP POLICY IF EXISTS "allow_all_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "docs_storage_public" ON storage.objects;
DROP POLICY IF EXISTS "docs_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "public_select_itinerarios_stacking" ON storage.objects;

-- Las URLs públicas (/object/public/...) siguen funcionando sin política SELECT.

-- ─── 5. RPCs SECURITY DEFINER: quitar EXECUTE a anon / PUBLIC ────────────────

DO $$
DECLARE
  r RECORD;
  trigger_only text[] := ARRAY[
    'handle_new_user',
    'prevent_usuarios_privilege_escalation',
    'generate_ref_asli',
    'set_updated_at',
    'set_formatos_updated_at',
    'set_consignatarios_updated_at',
    'update_servicios_unicos_updated_at',
    'update_consorcios_updated_at',
    'marcar_consorcios_requiere_revision'
  ];
  rls_helpers text[] := ARRAY[
    'get_user_rol',
    'get_cliente_nombres_for_user',
    'is_admin_or_staff',
    'is_ejecutivo',
    'is_superadmin',
    'is_staff_no_config'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS f, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (trigger_only || rls_helpers || ARRAY[
        'buscar_tracking',
        'sync_operaciones_tracking_manual',
        'ver_toda_la_base'
      ])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.f);

    IF r.proname = ANY (rls_helpers) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.f);
    END IF;
  END LOOP;
END $$;

-- Tracking público apagado: nadie llama buscar_tracking por REST.
-- Staff sincroniza coords vía RPC autenticada (la función ya valida el rol).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS f
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'sync_operaciones_tracking_manual'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.f);
  END LOOP;
END $$;

-- ─── 6. Quitar función de inspección si existe ───────────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS f
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'ver_toda_la_base'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', r.f);
  END LOOP;
END $$;
