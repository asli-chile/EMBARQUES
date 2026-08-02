-- ============================================================================
-- DESTINOS: grants de escritura + política RLS para personal autorizado
-- Sin esto, POST /api/admin/destinos falla con "permission denied for table destinos"
-- ============================================================================

GRANT ALL ON public.destinos TO postgres;
GRANT ALL ON public.destinos TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.destinos TO authenticated;

DROP POLICY IF EXISTS "destinos_staff_write" ON public.destinos;
CREATE POLICY "destinos_staff_write" ON public.destinos
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
