-- Permitir a ejecutivo/operador/admin/superadmin crear y actualizar consignatarios
-- (alimentar catálogo desde proforma / instructivo)

DROP POLICY IF EXISTS "consignatarios_staff_write" ON public.consignatarios;
CREATE POLICY "consignatarios_staff_write" ON public.consignatarios
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('superadmin', 'admin', 'ejecutivo', 'operador')
        AND u.activo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('superadmin', 'admin', 'ejecutivo', 'operador')
        AND u.activo = true
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.consignatarios TO authenticated;
