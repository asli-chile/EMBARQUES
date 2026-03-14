-- ============================================================================
-- Permitir INSERT en usuarios para la API create-user (service_role)
-- Necesario cuando el trigger on auth.users está desactivado
-- ============================================================================

CREATE POLICY "Service role puede insertar en usuarios"
  ON public.usuarios
  FOR INSERT
  TO service_role
  WITH CHECK (true);
