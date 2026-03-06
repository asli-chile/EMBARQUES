-- ============================================================================
-- Vincular public.usuarios con auth.users por email (donde auth_id sea NULL)
-- Ejecutar después de crear usuarios en Supabase Auth (Authentication → Users)
-- o si ya existen en Auth y no están vinculados
-- ============================================================================

UPDATE public.usuarios u
SET auth_id = au.id
FROM auth.users au
WHERE u.email = au.email
  AND u.auth_id IS NULL;
