-- ============================================================================
-- Storage: Bucket para imágenes de stacking de itinerarios
-- Capturas oficiales del terminal que el superadmin puede subir por itinerario
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'itinerarios-stacking',
  'itinerarios-stacking',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

-- ============================================================================
-- Políticas de acceso al storage
-- ============================================================================

-- Política: Usuarios autenticados pueden subir imágenes de stacking
CREATE POLICY "authenticated_insert_itinerarios_stacking"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'itinerarios-stacking');

-- Política: Usuarios autenticados pueden actualizar
CREATE POLICY "authenticated_update_itinerarios_stacking"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'itinerarios-stacking')
WITH CHECK (bucket_id = 'itinerarios-stacking');

-- Política: Usuarios autenticados pueden eliminar
CREATE POLICY "authenticated_delete_itinerarios_stacking"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'itinerarios-stacking');

-- Política: Lectura pública (para mostrar la imagen en el iframe del modal)
CREATE POLICY "public_select_itinerarios_stacking"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'itinerarios-stacking');
