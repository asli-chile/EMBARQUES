-- Permisos para que la API admin pueda crear/editar itinerarios (service_role).
CREATE POLICY "Itinerarios ALL service_role" ON public.itinerarios
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Itinerario escalas ALL service_role" ON public.itinerario_escalas
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT ALL ON public.itinerarios TO service_role;
GRANT ALL ON public.itinerario_escalas TO service_role;
