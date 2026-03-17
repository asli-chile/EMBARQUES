-- ============================================================================
-- Fix: handle_new_user trigger ON CONFLICT debe actualizar el rol
-- Problema: cuando un auth user se crea para un email ya existente con rol
-- diferente (ej. 'usuario'), el trigger preservaba el rol viejo en lugar de
-- actualizar al rol indicado en user_metadata. Esto causaba que usuarios
-- 'cliente' heredaran rol 'usuario' y vieran todos los registros.
-- ============================================================================

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
  -- Respeta el rol explícito del metadata; si no hay rol o es 'usuario' (default),
  -- preserva el rol existente en la tabla para no degradar roles ya asignados.
  v_rol := COALESCE(NULLIF(NEW.raw_user_meta_data->>'rol', ''), 'usuario');

  INSERT INTO public.usuarios (auth_id, email, nombre, rol, activo)
  VALUES (NEW.id, NEW.email, v_nombre, v_rol, true)
  ON CONFLICT (email) DO UPDATE SET
    auth_id     = EXCLUDED.auth_id,
    nombre      = COALESCE(EXCLUDED.nombre, usuarios.nombre),
    -- Si el nuevo rol es distinto a 'usuario' (es decir, fue explícitamente
    -- especificado), actualizarlo. Si es 'usuario' (default), conservar el
    -- rol existente para no degradar un cliente/ejecutivo a usuario.
    rol         = CASE
                    WHEN EXCLUDED.rol <> 'usuario' THEN EXCLUDED.rol
                    ELSE usuarios.rol
                  END,
    activo      = COALESCE(usuarios.activo, true),
    updated_at  = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
