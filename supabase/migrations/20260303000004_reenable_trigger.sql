-- ============================================================================
-- Vincular admin@asli.cl (creado en Supabase) con la tabla usuarios
-- Ejecuta DESPUÉS de crear el usuario con "Add user" y de correr 20260303000003
-- ============================================================================

UPDATE public.usuarios
SET auth_id = (SELECT id FROM auth.users WHERE email = usuarios.email)
WHERE email IN (SELECT email FROM auth.users);

-- Opcional: reactivar el trigger para futuros registros (si 20260303000002 se ejecutó)
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
