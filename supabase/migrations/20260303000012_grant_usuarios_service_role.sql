-- ============================================================================
-- Permisos para service_role en usuarios
-- La API /api/usuarios-empresas usa el cliente admin (service_role) y necesita leer usuarios
-- ============================================================================

GRANT ALL ON public.usuarios TO service_role;
