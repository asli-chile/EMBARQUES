-- Permisos de lectura de los catálogos de estados para `service_role`.
--
-- La migración 20260828000001 solo otorgó permisos a `authenticated`, así que
-- los scripts de tools/ (que usan la service role key) fallan con
-- "permission denied for table operaciones_estados" al leer estos catálogos,
-- de forma directa o a través de `dashboard_resumen`.
--
-- Mismo criterio que 20260829000006 para las tablas de temporadas.

GRANT SELECT ON public.operaciones_estados TO service_role;
GRANT SELECT ON public.operaciones_estados_transiciones TO service_role;
GRANT SELECT ON public.operaciones_estados_visibilidad TO service_role;
