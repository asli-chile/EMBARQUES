-- Permisos de lectura para usuarios autenticados (evita "permission denied for table servicios_unicos")
-- Ejecutar en Supabase SQL Editor si ya aplicó 20260307100001

GRANT SELECT ON public.servicios_unicos TO authenticated;
GRANT SELECT ON public.servicios_unicos_naves TO authenticated;
GRANT SELECT ON public.servicios_unicos_destinos TO authenticated;
GRANT SELECT ON public.consorcios TO authenticated;
GRANT SELECT ON public.consorcios_servicios TO authenticated;

-- service_role suele tener todos los permisos; por si acaso:
GRANT ALL ON public.servicios_unicos TO service_role;
GRANT ALL ON public.servicios_unicos_naves TO service_role;
GRANT ALL ON public.servicios_unicos_destinos TO service_role;
GRANT ALL ON public.consorcios TO service_role;
GRANT ALL ON public.consorcios_servicios TO service_role;
