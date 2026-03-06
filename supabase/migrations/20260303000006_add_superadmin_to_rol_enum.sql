-- ============================================================================
-- Añadir superadmin, operador y usuario al ENUM rol_usuario_enum
-- Ejecuta en Supabase SQL Editor si tu columna rol usa el tipo rol_usuario_enum
-- (Si rol es TEXT, ignora esta migración)
-- ============================================================================

-- Añadir los nuevos valores al enum (falla si el tipo no existe o el valor ya existe)
ALTER TYPE rol_usuario_enum ADD VALUE IF NOT EXISTS 'superadmin';
ALTER TYPE rol_usuario_enum ADD VALUE IF NOT EXISTS 'operador';
ALTER TYPE rol_usuario_enum ADD VALUE IF NOT EXISTS 'usuario';
