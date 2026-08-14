-- El linter quitó SELECT en storage.objects (evitar listar buckets públicos).
-- Sin SELECT autenticado, upsert/borrar archivos del bucket documentos falla.
-- Las URLs /object/public/... siguen públicas; esto solo permite a usuarios logueados
-- operar sobre objetos que ya suben.

DROP POLICY IF EXISTS "docs_storage_select_auth" ON storage.objects;

CREATE POLICY "docs_storage_select_auth"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos');
