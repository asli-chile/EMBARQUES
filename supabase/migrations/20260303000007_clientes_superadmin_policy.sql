-- ============================================================================
-- Política explícita para que superadmin pueda ver/gestionar clientes (evita 403)
-- Comprueba directamente en usuarios (auth_id + rol) por si get_user_rol() falla
-- ============================================================================

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
