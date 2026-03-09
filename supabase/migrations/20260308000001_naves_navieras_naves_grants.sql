-- Permisos para que la API (service_role) pueda insertar naves y asignarlas a navieras.
-- Sin esto, POST /api/admin/naves devuelve 400 por permisos insuficientes.

-- Políticas RLS: permitir todo a service_role (por si no hace bypass)
DROP POLICY IF EXISTS "naves ALL service_role" ON public.naves;
CREATE POLICY "naves ALL service_role" ON public.naves
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "navieras_naves ALL service_role" ON public.navieras_naves;
CREATE POLICY "navieras_naves ALL service_role" ON public.navieras_naves
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Permisos a nivel de tabla
GRANT SELECT, INSERT, UPDATE, DELETE ON public.naves TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.navieras_naves TO service_role;
