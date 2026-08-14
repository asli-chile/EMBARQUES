-- Roles: «usuario» deja de ser staff. Nadie puede auto-promoverse.
-- Cliente solo ve datos de sus empresas. Catálogos internos solo staff/ejecutivo.

-- ─── Helpers ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_user_rol()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM public.usuarios WHERE auth_id = auth.uid() AND activo = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_rol() = 'superadmin';
$$;

CREATE OR REPLACE FUNCTION public.is_ejecutivo()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_rol() = 'ejecutivo';
$$;

CREATE OR REPLACE FUNCTION public.is_staff_no_config()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_rol() IN ('admin', 'operador');
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_rol() IN ('superadmin', 'admin', 'operador');
$$;

CREATE OR REPLACE FUNCTION public.get_cliente_nombres_for_user()
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

-- ─── Alta: nunca leer rol del metadata del cliente ───────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nombre TEXT;
BEGIN
  v_nombre := COALESCE(
    NEW.raw_user_meta_data->>'nombre',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.usuarios (auth_id, email, nombre, rol, activo)
  VALUES (NEW.id, NEW.email, v_nombre, 'usuario', true)
  ON CONFLICT (email) DO UPDATE SET
    auth_id    = EXCLUDED.auth_id,
    nombre     = COALESCE(EXCLUDED.nombre, public.usuarios.nombre),
    updated_at = now();

  RETURN NEW;
END;
$$;

-- ─── usuarios: no auto-escalada, no listado público ─────────────────────────

CREATE OR REPLACE FUNCTION public.prevent_usuarios_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  NEW.rol := OLD.rol;
  NEW.activo := OLD.activo;
  NEW.auth_id := OLD.auth_id;
  NEW.email := OLD.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_usuarios_privilege_escalation ON public.usuarios;
CREATE TRIGGER prevent_usuarios_privilege_escalation
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_usuarios_privilege_escalation();

DROP POLICY IF EXISTS "Lectura pública usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su perfil" ON public.usuarios;
DROP POLICY IF EXISTS "Usuario lee su perfil" ON public.usuarios;
DROP POLICY IF EXISTS "Staff lee usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios actualizan su nombre" ON public.usuarios;

CREATE POLICY "Usuario lee su perfil"
  ON public.usuarios FOR SELECT TO authenticated
  USING (auth.uid() = auth_id);

CREATE POLICY "Staff lee usuarios"
  ON public.usuarios FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() OR public.is_ejecutivo());

CREATE POLICY "Usuarios actualizan su nombre"
  ON public.usuarios FOR UPDATE TO authenticated
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

REVOKE SELECT ON public.usuarios FROM anon;
REVOKE UPDATE ON public.usuarios FROM authenticated;
GRANT SELECT ON public.usuarios TO authenticated;
GRANT UPDATE (nombre) ON public.usuarios TO authenticated;

-- ─── Operaciones: ejecutivo sin rama NULL; cliente sin borrados ─────────────

DROP POLICY IF EXISTS "Ejecutivo ve sus operaciones" ON public.operaciones;
CREATE POLICY "Ejecutivo ve sus operaciones"
  ON public.operaciones FOR ALL TO authenticated
  USING (
    public.is_ejecutivo()
    AND operaciones.cliente IS NOT NULL
    AND operaciones.cliente = ANY (public.get_cliente_nombres_for_user())
  )
  WITH CHECK (
    public.is_ejecutivo()
    AND operaciones.cliente IS NOT NULL
    AND operaciones.cliente = ANY (public.get_cliente_nombres_for_user())
  );

DROP POLICY IF EXISTS "Cliente ve sus operaciones" ON public.operaciones;
CREATE POLICY "Cliente ve sus operaciones"
  ON public.operaciones FOR SELECT TO authenticated
  USING (
    public.get_user_rol() = 'cliente'
    AND operaciones.deleted_at IS NULL
    AND operaciones.cliente IS NOT NULL
    AND operaciones.cliente = ANY (public.get_cliente_nombres_for_user())
  );

DROP POLICY IF EXISTS "Cliente ve documentos de sus operaciones" ON public.documentos;
CREATE POLICY "Cliente ve documentos de sus operaciones"
  ON public.documentos FOR SELECT TO authenticated
  USING (
    public.get_user_rol() = 'cliente'
    AND EXISTS (
      SELECT 1 FROM public.operaciones o
      WHERE o.id = documentos.operacion_id
        AND o.deleted_at IS NULL
        AND o.cliente IS NOT NULL
        AND o.cliente = ANY (public.get_cliente_nombres_for_user())
    )
  );

DROP POLICY IF EXISTS "Ejecutivo ve documentos de sus operaciones" ON public.documentos;
CREATE POLICY "Ejecutivo ve documentos de sus operaciones"
  ON public.documentos FOR ALL TO authenticated
  USING (
    public.is_ejecutivo()
    AND EXISTS (
      SELECT 1 FROM public.operaciones o
      WHERE o.id = documentos.operacion_id
        AND o.cliente IS NOT NULL
        AND o.cliente = ANY (public.get_cliente_nombres_for_user())
    )
  )
  WITH CHECK (
    public.is_ejecutivo()
    AND EXISTS (
      SELECT 1 FROM public.operaciones o
      WHERE o.id = documentos.operacion_id
        AND o.cliente IS NOT NULL
        AND o.cliente = ANY (public.get_cliente_nombres_for_user())
    )
  );

-- ─── Tracking sync: «usuario» ya no es staff ────────────────────────────────

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
        AND o.cliente = ANY (public.get_cliente_nombres_for_user());
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
        AND o.cliente = ANY (public.get_cliente_nombres_for_user());
    END IF;
  END IF;

  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END;
$$;

-- ─── Catálogos internos: no para cliente ────────────────────────────────────

DROP POLICY IF EXISTS "Permitir lectura pública de consignatarios" ON public.consignatarios;

DROP POLICY IF EXISTS "Permitir insertar empresas" ON public.empresas;
REVOKE INSERT ON public.empresas FROM anon;
DROP POLICY IF EXISTS "Staff inserta empresas" ON public.empresas;
CREATE POLICY "Staff inserta empresas"
  ON public.empresas FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() OR public.is_ejecutivo());

DROP POLICY IF EXISTS "Auth lee transportes_empresas" ON public.transportes_empresas;
DROP POLICY IF EXISTS "Staff lee transportes_empresas" ON public.transportes_empresas;
CREATE POLICY "Staff lee transportes_empresas"
  ON public.transportes_empresas FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() OR public.is_ejecutivo());

DROP POLICY IF EXISTS "Auth lee transportes_choferes" ON public.transportes_choferes;
DROP POLICY IF EXISTS "Staff lee transportes_choferes" ON public.transportes_choferes;
CREATE POLICY "Staff lee transportes_choferes"
  ON public.transportes_choferes FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() OR public.is_ejecutivo());

DROP POLICY IF EXISTS "Auth lee transportes_equipos" ON public.transportes_equipos;
DROP POLICY IF EXISTS "Staff lee transportes_equipos" ON public.transportes_equipos;
CREATE POLICY "Staff lee transportes_equipos"
  ON public.transportes_equipos FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() OR public.is_ejecutivo());

DROP POLICY IF EXISTS "Auth lee transportes_tramos" ON public.transportes_tramos;
DROP POLICY IF EXISTS "Staff lee transportes_tramos" ON public.transportes_tramos;
CREATE POLICY "Staff lee transportes_tramos"
  ON public.transportes_tramos FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() OR public.is_ejecutivo());

DROP POLICY IF EXISTS "Auth lee transportes_costos_extra" ON public.transportes_costos_extra;
DROP POLICY IF EXISTS "Staff lee transportes_costos_extra" ON public.transportes_costos_extra;
CREATE POLICY "Staff lee transportes_costos_extra"
  ON public.transportes_costos_extra FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() OR public.is_ejecutivo());

DROP POLICY IF EXISTS "tarifarios_select_auth" ON public.tarifarios;
DROP POLICY IF EXISTS "tarifarios_select_staff" ON public.tarifarios;
CREATE POLICY "tarifarios_select_staff"
  ON public.tarifarios FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() OR public.is_ejecutivo());

DROP POLICY IF EXISTS "tarifarios_filas_select_auth" ON public.tarifarios_filas;
DROP POLICY IF EXISTS "tarifarios_filas_select_staff" ON public.tarifarios_filas;
CREATE POLICY "tarifarios_filas_select_staff"
  ON public.tarifarios_filas FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() OR public.is_ejecutivo());

DROP POLICY IF EXISTS "notificaciones_select_auth" ON public.notificaciones;
DROP POLICY IF EXISTS "notificaciones_select_staff" ON public.notificaciones;
CREATE POLICY "notificaciones_select_staff"
  ON public.notificaciones FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() OR public.is_ejecutivo());

DROP POLICY IF EXISTS "notificaciones_insert_auth" ON public.notificaciones;
DROP POLICY IF EXISTS "notificaciones_insert_staff" ON public.notificaciones;
CREATE POLICY "notificaciones_insert_staff"
  ON public.notificaciones FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_or_staff()
    OR public.is_ejecutivo()
    OR public.get_user_rol() = 'cliente'
  );
