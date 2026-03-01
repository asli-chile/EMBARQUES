-- ============================================================================
-- Storage: Bucket para documentos
-- Almacena archivos PDF y Excel asociados a operaciones
-- ============================================================================

-- Crear el bucket de documentos (público para permitir descargas)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  true,
  10485760, -- 10MB límite
  ARRAY['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

-- ============================================================================
-- Políticas de acceso al storage
-- ============================================================================

-- Política: Usuarios autenticados pueden subir archivos
CREATE POLICY "Usuarios autenticados pueden subir documentos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documentos');

-- Política: Usuarios autenticados pueden ver archivos
CREATE POLICY "Usuarios autenticados pueden ver documentos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documentos');

-- Política: Usuarios autenticados pueden actualizar archivos
CREATE POLICY "Usuarios autenticados pueden actualizar documentos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documentos')
WITH CHECK (bucket_id = 'documentos');

-- Política: Usuarios autenticados pueden eliminar archivos
CREATE POLICY "Usuarios autenticados pueden eliminar documentos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documentos');

-- Política: Acceso público para lectura (descargas)
CREATE POLICY "Acceso publico para descargar documentos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documentos');
