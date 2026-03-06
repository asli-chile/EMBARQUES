-- ============================================================================
-- Auth con roles y control de acceso por cliente
-- - Tabla usuarios_clientes: vincula usuarios (rol cliente) con clientes
-- - Funciones helper para RLS
-- - Políticas: admin/ejecutivo ven todo; cliente solo sus datos
-- ============================================================================

-- ─── ASEGURAR auth_id EN usuarios ────────────────────────────────────────────
-- Por si la tabla usuarios tiene estructura distinta (p.ej. solo empresa_id)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_id ON usuarios(auth_id);

-- ─── TABLA usuarios_clientes ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS usuarios_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(usuario_id, cliente_id)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_clientes_usuario ON usuarios_clientes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_clientes_cliente ON usuarios_clientes(cliente_id);

ALTER TABLE usuarios_clientes ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden gestionar asignaciones
CREATE POLICY "Admin gestiona usuarios_clientes" ON usuarios_clientes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol = 'admin' AND u.activo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol = 'admin' AND u.activo = true
    )
  );

-- Usuarios con rol cliente pueden leer sus propias asignaciones
CREATE POLICY "Cliente lee sus asignaciones" ON usuarios_clientes
  FOR SELECT
  TO authenticated
  USING (
    usuario_id = (SELECT id FROM usuarios WHERE auth_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON usuarios_clientes TO authenticated;

-- ─── FUNCIONES HELPER ────────────────────────────────────────────────────────

-- Devuelve el rol del usuario actual (NULL si no autenticado)
CREATE OR REPLACE FUNCTION public.get_user_rol()
RETURNS TEXT AS $$
  SELECT rol FROM usuarios WHERE auth_id = auth.uid() AND activo = true LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Devuelve true si el usuario es admin o ejecutivo (acceso total)
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN AS $$
  SELECT get_user_rol() IN ('admin', 'ejecutivo', 'operador', 'usuario');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Devuelve los nombres de cliente que el usuario (rol cliente) puede ver
-- clientes.empresa_id → empresas.nombre (según DATABASE-SCHEMA)
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
  WHERE u.auth_id = auth.uid() AND u.rol = 'cliente' AND u.activo = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─── RLS OPERACIONES ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow all operaciones" ON operaciones;

-- Admin/ejecutivo/operador/usuario: ven todo
CREATE POLICY "Staff ve todas las operaciones" ON operaciones
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- Cliente: solo operaciones cuyo cliente está en sus asignaciones
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

-- ─── RLS CLIENTES ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow all clientes" ON clientes;

-- Staff: acceso total
CREATE POLICY "Staff ve todos los clientes" ON clientes
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- Cliente: solo los clientes asignados a su usuario
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

-- ─── RLS DOCUMENTOS (heredar visibilidad por operación) ───────────────────────

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver documentos" ON documentos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar documentos" ON documentos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar documentos" ON documentos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar documentos" ON documentos;
DROP POLICY IF EXISTS "Acceso anonimo lectura documentos" ON documentos;

-- Staff: ve y gestiona todos los documentos
CREATE POLICY "Staff ve todos los documentos" ON documentos
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- Cliente: solo documentos de operaciones que puede ver
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
