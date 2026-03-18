-- ──────────────────────────────────────────────────────────────────────────────
-- Agrega soporte para plantillas Excel a formatos_documentos
-- ──────────────────────────────────────────────────────────────────────────────

-- Nuevas columnas (si la tabla ya fue creada sin ellas)
ALTER TABLE public.formatos_documentos
  ADD COLUMN IF NOT EXISTS template_type TEXT NOT NULL DEFAULT 'html'
    CHECK (template_type IN ('html', 'excel')),
  ADD COLUMN IF NOT EXISTS excel_path   TEXT,
  ADD COLUMN IF NOT EXISTS excel_nombre TEXT;

-- ── Storage bucket: formatos-templates ────────────────────────────────────────
-- Ejecutar en el SQL Editor del dashboard de Supabase.
-- El bucket almacena los archivos .xlsx subidos como plantillas.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'formatos-templates',
  'formatos-templates',
  false,   -- acceso privado (solo autenticados via signed URL o download)
  10485760, -- 10 MB máximo por archivo
  ARRAY[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ── Políticas de Storage ──────────────────────────────────────────────────────

-- Subir archivos: solo superadmin/admin
CREATE POLICY "formatos_templates_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'formatos-templates'
    AND EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('superadmin', 'admin')
        AND u.activo = true
    )
  );

-- Leer / descargar: autenticados activos
CREATE POLICY "formatos_templates_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'formatos-templates'
    AND EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.activo = true
    )
  );

-- Eliminar: solo superadmin/admin
CREATE POLICY "formatos_templates_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'formatos-templates'
    AND EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('superadmin', 'admin')
        AND u.activo = true
    )
  );
