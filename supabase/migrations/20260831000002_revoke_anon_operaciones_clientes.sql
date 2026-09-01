-- Revoca los privilegios de tabla que las migraciones iniciales concedieron al rol `anon`
-- sobre `operaciones` y `clientes`:
--
--   20250226000002_grant_operaciones.sql  → GRANT ALL ON public.operaciones TO anon;
--   20250225000002_grant_clientes.sql     → GRANT ALL ON public.clientes    TO anon;
--
-- Hoy nada legítimo los usa: tras el endurecimiento de 20260719 y 20260814 no queda
-- ninguna política dirigida a `anon` en esas tablas, así que RLS ya bloquea el acceso.
-- El problema es que los GRANT siguen vigentes: si en el futuro alguien desactiva RLS
-- por error o crea una política sin `TO authenticated`, ambas tablas quedarían legibles
-- y escribibles con la anon key, que es pública por diseño. Este REVOKE elimina esa
-- segunda condición para que RLS no sea la única barrera.
--
-- `authenticated` y `service_role` conservan sus privilegios: el ERP sigue funcionando igual.

REVOKE ALL ON public.operaciones FROM anon;
REVOKE ALL ON public.clientes FROM anon;

-- Verificación: no debe devolver ninguna fila.
--   SELECT table_name, privilege_type
--   FROM information_schema.role_table_grants
--   WHERE grantee = 'anon' AND table_name IN ('operaciones', 'clientes');
