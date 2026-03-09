-- Permisos para que la API pueda leer la tabla navieras al listar servicios.
DROP POLICY IF EXISTS "navieras SELECT service_role" ON public.navieras;
CREATE POLICY "navieras SELECT service_role" ON public.navieras
  FOR SELECT TO service_role USING (true);

GRANT SELECT ON public.navieras TO service_role;
GRANT SELECT ON public.navieras TO authenticated;
