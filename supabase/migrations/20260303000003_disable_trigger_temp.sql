-- ============================================================================
-- Desactivar temporalmente el trigger para permitir crear usuarios en Supabase
-- Ejecuta esto en Supabase SQL Editor, crea tu usuario con "Add user",
-- luego ejecuta 20260303000004 para reactivar.
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
