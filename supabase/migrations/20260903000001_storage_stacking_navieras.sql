-- ============================================================================
-- Storage: PDFs de stacking de navieras (web pública /stacking/pil)
-- El bucket es privado; la web pide URLs firmadas con service_role.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stacking-navieras',
  'stacking-navieras',
  false,
  20971520,
  ARRAY['application/pdf', 'application/json']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['application/pdf', 'application/json'];

DROP POLICY IF EXISTS "stacking_navieras_service_insert" ON storage.objects;
DROP POLICY IF EXISTS "stacking_navieras_service_update" ON storage.objects;
DROP POLICY IF EXISTS "stacking_navieras_service_select" ON storage.objects;
DROP POLICY IF EXISTS "stacking_navieras_service_delete" ON storage.objects;

-- service_role bypassea RLS; estas políticas cubren lecturas internas autenticadas.
CREATE POLICY "stacking_navieras_service_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'stacking-navieras');
