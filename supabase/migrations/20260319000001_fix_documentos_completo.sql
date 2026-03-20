-- FIX COMPLETO: tabla documentos + bucket storage + RLS
-- Ejecutar en Supabase SQL Editor

-- 1) Tabla documentos
CREATE TABLE IF NOT EXISTS documentos (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  operacion_id UUID        NOT NULL REFERENCES operaciones(id) ON DELETE CASCADE,
  tipo         TEXT        NOT NULL,
  nombre_archivo TEXT      NOT NULL,
  url          TEXT        NOT NULL,
  tamano       INTEGER,
  mime_type    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  created_by   UUID        REFERENCES auth.users(id),
  CONSTRAINT tipo_documento_valido CHECK (tipo IN (
    'BOOKING','INSTRUCTIVO_EMBARQUE','FACTURA_GATE_OUT','FACTURA_PROFORMA',
    'CERTIFICADO_FITOSANITARIO','CERTIFICADO_ORIGEN','BL_TELEX_SWB_AWB',
    'FACTURA_COMERCIAL','DUS','FULLSET'
  ))
);

CREATE INDEX IF NOT EXISTS idx_documentos_operacion ON documentos(operacion_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tipo      ON documentos(tipo);

GRANT ALL ON documentos TO authenticated;
GRANT ALL ON documentos TO service_role;

-- 2) RLS tabla documentos
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "docs_select_auth"  ON documentos;
DROP POLICY IF EXISTS "docs_insert_auth"  ON documentos;
DROP POLICY IF EXISTS "docs_update_auth"  ON documentos;
DROP POLICY IF EXISTS "docs_delete_auth"  ON documentos;
DROP POLICY IF EXISTS "docs_select_anon"  ON documentos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver documentos"       ON documentos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar documentos"  ON documentos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar documentos" ON documentos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar documentos"  ON documentos;
DROP POLICY IF EXISTS "Acceso anonimo lectura documentos"                 ON documentos;

CREATE POLICY "docs_select_auth" ON documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "docs_insert_auth" ON documentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "docs_update_auth" ON documentos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "docs_delete_auth" ON documentos FOR DELETE TO authenticated USING (true);
CREATE POLICY "docs_select_anon" ON documentos FOR SELECT TO anon          USING (true);

-- 3) Bucket storage documentos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos', 'documentos', true, 52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg','image/png','image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public             = true,
  file_size_limit    = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg','image/png','image/webp'
  ];

-- 4) Politicas storage bucket documentos
DROP POLICY IF EXISTS "docs_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "docs_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "docs_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "docs_storage_delete" ON storage.objects;
DROP POLICY IF EXISTS "docs_storage_public" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir documentos"      ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver documentos"        ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar documentos"   ON storage.objects;
DROP POLICY IF EXISTS "Acceso publico para descargar documentos"           ON storage.objects;

CREATE POLICY "docs_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos');
CREATE POLICY "docs_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos');
CREATE POLICY "docs_storage_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documentos') WITH CHECK (bucket_id = 'documentos');
CREATE POLICY "docs_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documentos');
CREATE POLICY "docs_storage_public" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'documentos');

-- 5) Verificacion
SELECT 'tabla documentos' AS objeto, COUNT(*)::text AS existe
  FROM information_schema.tables
  WHERE table_name = 'documentos' AND table_schema = 'public'
UNION ALL
SELECT 'bucket documentos', COUNT(*)::text
  FROM storage.buckets WHERE id = 'documentos'
UNION ALL
SELECT 'politicas RLS tabla', COUNT(*)::text
  FROM pg_policies WHERE tablename = 'documentos'
UNION ALL
SELECT 'politicas storage', COUNT(*)::text
  FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE 'docs_storage_%';
