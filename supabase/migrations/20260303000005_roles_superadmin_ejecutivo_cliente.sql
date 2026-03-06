-- ============================================================================
-- Roles jerárquicos: superadmin, admin, ejecutivo, cliente
-- - superadmin: todo (incl. Configuración)
-- - admin/operador/usuario: acceso completo a datos, SIN Configuración
-- - ejecutivo: solo sus clientes asignados (usuarios_clientes)
-- - cliente: solo lectura + puede crear reservas (INSERT operaciones con origen_registro = reserva_web)
-- ============================================================================

-- ─── FUNCIONES HELPER ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT get_user_rol() = 'superadmin';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Staff sin config: admin, operador, usuario (acceso a datos, no a Configuración)
CREATE OR REPLACE FUNCTION public.is_staff_no_config()
RETURNS BOOLEAN AS $$
  SELECT get_user_rol() IN ('admin', 'operador', 'usuario');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Ejecutivo: acceso limitado a sus clientes asignados
CREATE OR REPLACE FUNCTION public.is_ejecutivo()
RETURNS BOOLEAN AS $$
  SELECT get_user_rol() = 'ejecutivo';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Actualizar: cliente nombres para usuario (cliente O ejecutivo) desde usuarios_clientes
-- clientes.empresa_id → empresas.nombre (operaciones.cliente guarda el nombre)
CREATE OR REPLACE FUNCTION public.get_cliente_nombres_for_user()
RETURNS TEXT[] AS $$
  SELECT COALESCE(
    array_agg(e.nombre) FILTER (WHERE e.nombre IS NOT NULL),
    ARRAY[]::TEXT[]
  )
  FROM usuarios_clientes uc
  JOIN clientes c ON c.id = uc.cliente_id
  LEFT JOIN empresas e ON e.id = c.empresa_id
  JOIN usuarios u ON u.id = uc.usuario_id
  WHERE u.auth_id = auth.uid() AND u.activo = true
    AND u.rol IN ('cliente', 'ejecutivo');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Reemplazar is_admin_or_staff: superadmin + staff (admin, operador, usuario) acceso total a datos
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN AS $$
  SELECT get_user_rol() IN ('superadmin', 'admin', 'operador', 'usuario');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─── usuarios_clientes: solo superadmin gestiona asignaciones ────────────────

DROP POLICY IF EXISTS "Admin gestiona usuarios_clientes" ON usuarios_clientes;
CREATE POLICY "Superadmin gestiona usuarios_clientes" ON usuarios_clientes
  FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- Cliente y ejecutivo leen sus asignaciones
DROP POLICY IF EXISTS "Cliente lee sus asignaciones" ON usuarios_clientes;
CREATE POLICY "Cliente y ejecutivo leen asignaciones" ON usuarios_clientes
  FOR SELECT
  TO authenticated
  USING (
    usuario_id = (SELECT id FROM usuarios WHERE auth_id = auth.uid())
  );

-- ─── OPERACIONES ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Staff ve todas las operaciones" ON operaciones;

-- Superadmin y staff (admin, operador, usuario): acceso total
CREATE POLICY "Superadmin y staff ven todas las operaciones" ON operaciones
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- Ejecutivo: solo operaciones de sus clientes asignados
CREATE POLICY "Ejecutivo ve sus operaciones" ON operaciones
  FOR ALL
  TO authenticated
  USING (
    public.is_ejecutivo()
    AND (
      operaciones.cliente IS NULL
      OR operaciones.cliente = ANY(public.get_cliente_nombres_for_user())
    )
  )
  WITH CHECK (
    public.is_ejecutivo()
    AND (
      operaciones.cliente IS NULL
      OR operaciones.cliente = ANY(public.get_cliente_nombres_for_user())
    )
  );

-- Cliente: SELECT + INSERT solo para reservas (origen_registro = reserva_web)
DROP POLICY IF EXISTS "Cliente ve sus operaciones" ON operaciones;

CREATE POLICY "Cliente ve sus operaciones" ON operaciones
  FOR SELECT
  TO authenticated
  USING (
    get_user_rol() = 'cliente'
    AND (
      operaciones.cliente IS NULL
      OR operaciones.cliente = ANY(public.get_cliente_nombres_for_user())
    )
  );

CREATE POLICY "Cliente crea reservas" ON operaciones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_rol() = 'cliente'
    AND (
      operaciones.cliente IS NULL
      OR operaciones.cliente = ANY(public.get_cliente_nombres_for_user())
    )
    AND (operaciones.origen_registro = 'reserva_web' OR operaciones.origen_registro IS NULL)
  );

-- ─── CLIENTES ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Staff ve todos los clientes" ON clientes;

CREATE POLICY "Superadmin y staff ven todos los clientes" ON clientes
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- Ejecutivo: solo clientes asignados
CREATE POLICY "Ejecutivo ve sus clientes" ON clientes
  FOR ALL
  TO authenticated
  USING (
    public.is_ejecutivo()
    AND id IN (
      SELECT cliente_id FROM usuarios_clientes uc
      JOIN usuarios u ON u.id = uc.usuario_id
      WHERE u.auth_id = auth.uid() AND u.activo = true
    )
  )
  WITH CHECK (
    public.is_ejecutivo()
    AND id IN (
      SELECT cliente_id FROM usuarios_clientes uc
      JOIN usuarios u ON u.id = uc.usuario_id
      WHERE u.auth_id = auth.uid() AND u.activo = true
    )
  );

-- Cliente: solo lectura de sus asignados (ya existe, verificar nombre)
DROP POLICY IF EXISTS "Cliente ve sus clientes asignados" ON clientes;
CREATE POLICY "Cliente ve sus clientes asignados" ON clientes
  FOR SELECT
  TO authenticated
  USING (
    get_user_rol() = 'cliente'
    AND id IN (
      SELECT cliente_id FROM usuarios_clientes uc
      JOIN usuarios u ON u.id = uc.usuario_id
      WHERE u.auth_id = auth.uid() AND u.activo = true
    )
  );

-- ─── DOCUMENTOS ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Staff ve todos los documentos" ON documentos;

CREATE POLICY "Superadmin y staff ven todos los documentos" ON documentos
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- Ejecutivo: documentos de operaciones que puede ver
CREATE POLICY "Ejecutivo ve documentos de sus operaciones" ON documentos
  FOR ALL
  TO authenticated
  USING (
    public.is_ejecutivo()
    AND EXISTS (
      SELECT 1 FROM operaciones o
      WHERE o.id = documentos.operacion_id
      AND (o.cliente IS NULL OR o.cliente = ANY(public.get_cliente_nombres_for_user()))
    )
  )
  WITH CHECK (
    public.is_ejecutivo()
    AND EXISTS (
      SELECT 1 FROM operaciones o
      WHERE o.id = documentos.operacion_id
      AND (o.cliente IS NULL OR o.cliente = ANY(public.get_cliente_nombres_for_user()))
    )
  );

-- Cliente: solo lectura (ya existente, solo renombrar si hace falta)
DROP POLICY IF EXISTS "Cliente ve documentos de sus operaciones" ON documentos;
CREATE POLICY "Cliente ve documentos de sus operaciones" ON documentos
  FOR SELECT
  TO authenticated
  USING (
    get_user_rol() = 'cliente'
    AND (
      operacion_id IS NULL
      OR EXISTS (
        SELECT 1 FROM operaciones o
        WHERE o.id = documentos.operacion_id
        AND (o.cliente IS NULL OR o.cliente = ANY(public.get_cliente_nombres_for_user()))
      )
    )
  );
