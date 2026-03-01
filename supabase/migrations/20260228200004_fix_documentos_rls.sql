-- ============================================================================
-- Fix: Recrear políticas RLS para tabla documentos
-- ============================================================================

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver documentos" ON documentos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar documentos" ON documentos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar documentos" ON documentos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar documentos" ON documentos;

-- Asegurar que RLS está habilitado
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

-- Crear políticas
CREATE POLICY "Usuarios autenticados pueden ver documentos"
  ON documentos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar documentos"
  ON documentos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar documentos"
  ON documentos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar documentos"
  ON documentos FOR DELETE
  TO authenticated
  USING (true);

-- También permitir acceso anónimo para lectura (por si el usuario no está logueado)
CREATE POLICY "Acceso anonimo lectura documentos"
  ON documentos FOR SELECT
  TO anon
  USING (true);
