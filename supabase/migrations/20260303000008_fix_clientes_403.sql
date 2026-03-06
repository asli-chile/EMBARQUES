-- ============================================================================
-- Fix 403 en clientes: asegurar que superadmin y staff puedan leer/gestionar
-- Ejecutar en Supabase SQL Editor si el 403 persiste
-- ============================================================================

-- 1) Asegurar que is_admin_or_staff() incluya 'superadmin' (por si 005 no se aplicó)
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN AS $$
  SELECT get_user_rol() IN ('superadmin', 'admin', 'operador', 'usuario');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2) Política explícita clientes por auth_id + rol (no depende de get_user_rol)
DROP POLICY IF EXISTS "Superadmin acceso total a clientes" ON clientes;
CREATE POLICY "Superadmin acceso total a clientes"
  ON clientes
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.activo = true
        AND trim(both from coalesce(u.rol::text, '')) = 'superadmin'
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.activo = true
        AND trim(both from coalesce(u.rol::text, '')) = 'superadmin'
    )
  );
