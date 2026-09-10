-- Restaura políticas del bucket `documentos` y escritura en la tabla `documentos`.
-- Sin INSERT en storage.objects la subida responde 400 con:
--   "new row violates row-level security policy"

-- ─── 1) Storage: bucket documentos ───────────────────────────────────────────

DROP POLICY IF EXISTS "docs_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "docs_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "docs_storage_delete" ON storage.objects;
DROP POLICY IF EXISTS "docs_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "docs_storage_select_auth" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver documentos" ON storage.objects;

CREATE POLICY "docs_storage_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos');

CREATE POLICY "docs_storage_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documentos')
  WITH CHECK (bucket_id = 'documentos');

CREATE POLICY "docs_storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documentos');

CREATE POLICY "docs_storage_select_auth"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos');

UPDATE storage.buckets
SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/x-pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
WHERE id = 'documentos';

-- ─── 2) Tabla public.documentos: staff + ejecutivo ───────────────────────────
-- Tras endurecer RLS quedaron solo políticas por rol; aseguran escritura.

DROP POLICY IF EXISTS "Superadmin y staff ven todos los documentos" ON public.documentos;
CREATE POLICY "Superadmin y staff ven todos los documentos"
  ON public.documentos FOR ALL TO authenticated
  USING (private.is_admin_or_staff())
  WITH CHECK (private.is_admin_or_staff());

DROP POLICY IF EXISTS "Ejecutivo ve documentos de sus operaciones" ON public.documentos;
CREATE POLICY "Ejecutivo ve documentos de sus operaciones"
  ON public.documentos FOR ALL TO authenticated
  USING (
    private.is_ejecutivo()
    AND EXISTS (
      SELECT 1 FROM public.operaciones o
      WHERE o.id = documentos.operacion_id
        AND o.cliente IS NOT NULL
        AND o.cliente = ANY (private.get_cliente_nombres_for_user())
    )
  )
  WITH CHECK (
    private.is_ejecutivo()
    AND EXISTS (
      SELECT 1 FROM public.operaciones o
      WHERE o.id = documentos.operacion_id
        AND o.cliente IS NOT NULL
        AND o.cliente = ANY (private.get_cliente_nombres_for_user())
    )
  );

DROP POLICY IF EXISTS "Cliente ve documentos de sus operaciones" ON public.documentos;
CREATE POLICY "Cliente ve documentos de sus operaciones"
  ON public.documentos FOR SELECT TO authenticated
  USING (
    private.get_user_rol() = 'cliente'
    AND EXISTS (
      SELECT 1 FROM public.operaciones o
      WHERE o.id = documentos.operacion_id
        AND o.deleted_at IS NULL
        AND o.cliente IS NOT NULL
        AND o.cliente = ANY (private.get_cliente_nombres_for_user())
    )
  );

-- Verificación rápida (debe devolver 4 filas de storage + 3 de tabla):
-- SELECT policyname, cmd FROM pg_policies
-- WHERE (schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'docs_storage%')
--    OR (schemaname = 'public' AND tablename = 'documentos');
