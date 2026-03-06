-- ============================================================================
-- usuarios_empresas: vincula usuarios (cliente/ejecutivo) directamente con empresas
-- Permite múltiples usuarios por empresa para que varias personas accedan a los mismos datos
-- ============================================================================

-- ─── CREAR TABLA usuarios_empresas ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.usuarios_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(usuario_id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_usuario ON usuarios_empresas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_empresa ON usuarios_empresas(empresa_id);

ALTER TABLE usuarios_empresas ENABLE ROW LEVEL SECURITY;

-- ─── MIGRAR DATOS desde usuarios_clientes ────────────────────────────────────

INSERT INTO public.usuarios_empresas (usuario_id, empresa_id)
SELECT uc.usuario_id, c.empresa_id
  FROM usuarios_clientes uc
  JOIN clientes c ON c.id = uc.cliente_id
  WHERE c.empresa_id IS NOT NULL
ON CONFLICT (usuario_id, empresa_id) DO NOTHING;

-- ─── RLS usuarios_empresas ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "Superadmin gestiona usuarios_empresas" ON usuarios_empresas;
CREATE POLICY "Superadmin gestiona usuarios_empresas" ON usuarios_empresas
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "Cliente y ejecutivo leen asignaciones empresas" ON usuarios_empresas;
CREATE POLICY "Cliente y ejecutivo leen asignaciones empresas" ON usuarios_empresas
  FOR SELECT TO authenticated
  USING (
    usuario_id = (SELECT id FROM usuarios WHERE auth_id = auth.uid())
  );

GRANT ALL ON usuarios_empresas TO service_role;
GRANT SELECT, INSERT, DELETE ON usuarios_empresas TO authenticated;

-- ─── ACTUALIZAR get_cliente_nombres_for_user ─────────────────────────────────

-- Usa usuarios_empresas: devuelve nombres de empresas a las que el usuario tiene acceso
CREATE OR REPLACE FUNCTION public.get_cliente_nombres_for_user()
RETURNS TEXT[] AS $$
  SELECT COALESCE(
    array_agg(e.nombre) FILTER (WHERE e.nombre IS NOT NULL),
    ARRAY[]::TEXT[]
  )
  FROM usuarios_empresas ue
  JOIN empresas e ON e.id = ue.empresa_id
  JOIN usuarios u ON u.id = ue.usuario_id
  WHERE u.auth_id = auth.uid() AND u.activo = true
    AND u.rol IN ('cliente', 'ejecutivo');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─── ACTUALIZAR RLS clientes (ejecutivo/cliente ven por empresa) ─────────────

DROP POLICY IF EXISTS "Ejecutivo ve sus clientes" ON clientes;
CREATE POLICY "Ejecutivo ve sus clientes" ON clientes
  FOR ALL TO authenticated
  USING (
    public.is_ejecutivo()
    AND (
      empresa_id IS NULL
      OR empresa_id IN (
        SELECT ue.empresa_id FROM usuarios_empresas ue
        JOIN usuarios u ON u.id = ue.usuario_id
        WHERE u.auth_id = auth.uid() AND u.activo = true
      )
    )
  )
  WITH CHECK (
    public.is_ejecutivo()
    AND (
      empresa_id IS NULL
      OR empresa_id IN (
        SELECT ue.empresa_id FROM usuarios_empresas ue
        JOIN usuarios u ON u.id = ue.usuario_id
        WHERE u.auth_id = auth.uid() AND u.activo = true
      )
    )
  );

DROP POLICY IF EXISTS "Cliente ve sus clientes asignados" ON clientes;
CREATE POLICY "Cliente ve sus clientes asignados" ON clientes
  FOR SELECT TO authenticated
  USING (
    get_user_rol() = 'cliente'
    AND (
      empresa_id IS NULL
      OR empresa_id IN (
        SELECT ue.empresa_id FROM usuarios_empresas ue
        JOIN usuarios u ON u.id = ue.usuario_id
        WHERE u.auth_id = auth.uid() AND u.activo = true
      )
    )
  );
