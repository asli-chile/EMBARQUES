-- Asegura que service_role tenga permisos de escritura en itinerarios.
-- Si ya tienes "permission denied for table itinerarios", ejecuta esta migración
-- o corre en el SQL Editor de Supabase:
--   GRANT ALL ON public.itinerarios TO service_role;
--   GRANT ALL ON public.itinerario_escalas TO service_role;
GRANT ALL ON public.itinerarios TO service_role;
GRANT ALL ON public.itinerario_escalas TO service_role;
