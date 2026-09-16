-- Cerrar la lectura anónima de `consignatarios`.
--
-- La tabla se leía entera sin iniciar sesión. Comprobado contra producción con
-- la anon key —que es pública por diseño, va en el navegador de cualquiera—:
--
--   GET /rest/v1/consignatarios  ->  200, 2 de 2 filas
--
-- Guarda los datos de las contrapartes comerciales de los clientes de ASLI:
-- consignee y notify con empresa, dirección, contacto, correo, teléfono y USCC.
--
-- La causa era una política heredada:
--
--   "Lectura pública consignatarios"  SELECT  roles={public}  USING (true)
--
-- `public` incluye a `anon`, y las políticas se **suman**: daba lo mismo que
-- existieran las otras tres bien hechas, esta abría la puerta sola. Es el caso
-- exacto que el advisor de Supabase no habría marcado, porque RLS figura
-- activo: lo que fallaba no era que faltara RLS, sino lo que una política decía.
--
-- Se cierran las dos capas, como el resto del ERP:
--
--   1. GRANT  — PostgREST corta acá, antes de mirar RLS.
--   2. RLS    — decide quién, una vez pasado el GRANT.
--
-- Cerrar solo una deja la tabla dependiendo de que nadie toque la otra.

-- ── Capa 2: la política que abría ───────────────────────────────────────────
DROP POLICY IF EXISTS "Lectura pública consignatarios" ON public.consignatarios;

-- ── Capa 1: el permiso que la hacía alcanzable ──────────────────────────────
REVOKE ALL ON public.consignatarios FROM anon;

-- El personal interno no pierde nada: entra por `consignatarios_admin_all`,
-- `consignatarios_ejecutivo_read` y `consignatarios_staff_write`, todas
-- dirigidas a usuarios autenticados con rol. `service_role` no pasa por RLS ni
-- por GRANTs, así que los endpoints del servidor siguen igual.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consignatarios TO authenticated;

-- Verificación. La primera no debe devolver filas; la segunda tampoco.
-- SELECT policyname FROM pg_policies
--  WHERE schemaname = 'public' AND tablename = 'consignatarios'
--    AND 'public' = ANY (roles) AND qual = 'true';
-- SELECT grantee FROM information_schema.role_table_grants
--  WHERE table_schema = 'public' AND table_name = 'consignatarios'
--    AND grantee = 'anon';
