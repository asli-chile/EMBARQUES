-- ============================================================================
-- Fix: Trigger handle_new_user para evitar "Database error creating new user"
-- - Asegura auth_id existe y empresa_id es opcional
-- - Trigger robusto que funcione con distintas estructuras de usuarios
-- ============================================================================

-- Permitir empresa_id NULL si existe (el trigger no lo provee)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE public.usuarios ALTER COLUMN empresa_id DROP NOT NULL;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL; -- Ignorar si ya es nullable o no aplica
END $$;

-- Asegurar auth_id existe
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_id ON public.usuarios(auth_id);

-- Recrear el trigger de forma robusta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_nombre TEXT;
  v_rol TEXT;
BEGIN
  v_nombre := COALESCE(
    NEW.raw_user_meta_data->>'nombre',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  v_rol := COALESCE(NEW.raw_user_meta_data->>'rol', 'usuario');

  INSERT INTO public.usuarios (auth_id, email, nombre, rol)
  VALUES (NEW.id, NEW.email, v_nombre, v_rol)
  ON CONFLICT (email) DO UPDATE SET
    auth_id = EXCLUDED.auth_id,
    nombre = COALESCE(EXCLUDED.nombre, usuarios.nombre),
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
