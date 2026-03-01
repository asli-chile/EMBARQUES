-- ============================================================================
-- Tabla de perfiles de usuario con roles
-- Se sincroniza con auth.users de Supabase
-- ============================================================================

-- ─── CREAR TABLA ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'usuario',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_id ON usuarios(auth_id);

-- ─── ROLES DISPONIBLES ─────────────────────────────────────────────────────────
-- Los roles se almacenan como texto para flexibilidad:
-- - 'admin': Administrador del sistema
-- - 'ejecutivo': Ejecutivo de operaciones
-- - 'operador': Operador de transporte
-- - 'cliente': Cliente externo
-- - 'usuario': Usuario básico (por defecto)

-- ─── TRIGGER PARA CREAR PERFIL AUTOMÁTICAMENTE ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (auth_id, email, nombre, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'usuario')
  )
  ON CONFLICT (email) DO UPDATE SET auth_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── POLÍTICAS DE SEGURIDAD ────────────────────────────────────────────────────

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Lectura pública para listar ejecutivos
DROP POLICY IF EXISTS "Lectura pública usuarios" ON usuarios;
CREATE POLICY "Lectura pública usuarios" ON usuarios
  FOR SELECT USING (true);

-- Solo el propio usuario puede actualizar su perfil
DROP POLICY IF EXISTS "Usuarios pueden actualizar su perfil" ON usuarios;
CREATE POLICY "Usuarios pueden actualizar su perfil" ON usuarios
  FOR UPDATE USING (auth.uid() = auth_id);

-- ─── PERMISOS ──────────────────────────────────────────────────────────────────

GRANT SELECT ON usuarios TO anon;
GRANT SELECT ON usuarios TO authenticated;
GRANT UPDATE ON usuarios TO authenticated;

-- ─── DATOS INICIALES ───────────────────────────────────────────────────────────

-- Administradores
INSERT INTO usuarios (email, nombre, rol) VALUES
  ('admin@asli.cl', 'Administrador ASLI', 'admin'),
  ('rodrigo@asli.cl', 'Rodrigo Admin', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Ejecutivos
INSERT INTO usuarios (email, nombre, rol) VALUES
  ('juan.perez@asli.cl', 'Juan Pérez', 'ejecutivo'),
  ('maria.garcia@asli.cl', 'María García', 'ejecutivo'),
  ('carlos.gonzalez@asli.cl', 'Carlos González', 'ejecutivo'),
  ('ana.martinez@asli.cl', 'Ana Martínez', 'ejecutivo'),
  ('pedro.silva@asli.cl', 'Pedro Silva', 'ejecutivo'),
  ('claudia.rojas@asli.cl', 'Claudia Rojas', 'ejecutivo'),
  ('francisco.diaz@asli.cl', 'Francisco Díaz', 'ejecutivo'),
  ('valentina.lopez@asli.cl', 'Valentina López', 'ejecutivo')
ON CONFLICT (email) DO NOTHING;
