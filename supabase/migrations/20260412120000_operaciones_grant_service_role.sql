-- Permite que la API de Supabase con JWT service_role lea/inserte/actualice operaciones.
-- Sin esto, Node/scripts con SUPABASE_SERVICE_ROLE_KEY pueden recibir:
--   permission denied for table operaciones
-- (El rol service_role existe en proyectos Supabase; a veces falta GRANT explícito según historial del proyecto.)

GRANT ALL ON TABLE public.operaciones TO service_role;

-- nextval(correlativo) al insertar
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
