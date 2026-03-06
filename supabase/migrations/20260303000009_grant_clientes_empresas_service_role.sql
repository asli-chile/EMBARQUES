-- ============================================================================
-- Permisos para service_role en clientes y empresas
-- La API /api/clientes usa el cliente admin (service_role) y necesita estos permisos
-- ============================================================================

GRANT ALL ON public.clientes TO service_role;
GRANT ALL ON public.empresas TO service_role;
