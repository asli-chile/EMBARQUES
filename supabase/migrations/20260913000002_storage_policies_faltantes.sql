-- ─── Políticas de storage que faltaban ───────────────────────────────────────
--
-- `storage.objects` tiene RLS activo, y solo el bucket `documentos` tenía
-- políticas. Los otros cuatro quedaban sin ninguna, y sin política que permita
-- la operación, RLS la deniega: subir a `booking-docs` devolvía 400 incluso
-- siendo superadmin.
--
-- El error engañaba porque un 400 se lee como "el archivo está mal" y aquí el
-- archivo estaba bien; lo que faltaba era el permiso. Y como el bucket es
-- público, leer funcionaba: fallaba solo al escribir, que es justo lo que se
-- prueba menos.
--
-- Quién puede escribir:
--
--   booking-docs          personal interno. Es documentación de la reserva y la
--                         carga un ejecutivo, no el cliente.
--   itinerarios-stacking  superadmin y admin: el itinerario es del consorcio y
--                         una imagen mal subida confunde a toda la operación.
--   stacking-navieras     igual que el anterior.
--   formatos-templates    solo superadmin: son las plantillas con las que se
--                         emiten los documentos de todos.
--
-- Leer lo puede hacer cualquier usuario autenticado: tres de los buckets son
-- públicos y negar la lectura por API sería teatro.

-- Helper: rol del usuario actual, sin repetir el subconsulta en cada política.
CREATE OR REPLACE FUNCTION public.navitrack_rol_actual()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.rol::text
    FROM public.usuarios u
   WHERE u.auth_id = auth.uid() AND u.activo = true
   LIMIT 1;
$$;

COMMENT ON FUNCTION public.navitrack_rol_actual() IS
  'Rol del usuario autenticado. Usada por las políticas de storage para no repetir la subconsulta.';

GRANT EXECUTE ON FUNCTION public.navitrack_rol_actual() TO authenticated;

-- ─── booking-docs ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "booking_docs_select" ON storage.objects;
CREATE POLICY "booking_docs_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'booking-docs');

DROP POLICY IF EXISTS "booking_docs_insert" ON storage.objects;
CREATE POLICY "booking_docs_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'booking-docs'
    AND public.navitrack_rol_actual() IN ('superadmin', 'admin', 'ejecutivo', 'operador')
  );

DROP POLICY IF EXISTS "booking_docs_update" ON storage.objects;
CREATE POLICY "booking_docs_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'booking-docs'
    AND public.navitrack_rol_actual() IN ('superadmin', 'admin', 'ejecutivo', 'operador')
  )
  WITH CHECK (
    bucket_id = 'booking-docs'
    AND public.navitrack_rol_actual() IN ('superadmin', 'admin', 'ejecutivo', 'operador')
  );

DROP POLICY IF EXISTS "booking_docs_delete" ON storage.objects;
CREATE POLICY "booking_docs_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'booking-docs'
    AND public.navitrack_rol_actual() IN ('superadmin', 'admin', 'ejecutivo')
  );

-- ─── itinerarios-stacking y stacking-navieras ────────────────────────────────
DROP POLICY IF EXISTS "stacking_buckets_select" ON storage.objects;
CREATE POLICY "stacking_buckets_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('itinerarios-stacking', 'stacking-navieras'));

DROP POLICY IF EXISTS "stacking_buckets_write" ON storage.objects;
CREATE POLICY "stacking_buckets_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('itinerarios-stacking', 'stacking-navieras')
    AND public.navitrack_rol_actual() IN ('superadmin', 'admin')
  );

DROP POLICY IF EXISTS "stacking_buckets_update" ON storage.objects;
CREATE POLICY "stacking_buckets_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('itinerarios-stacking', 'stacking-navieras')
    AND public.navitrack_rol_actual() IN ('superadmin', 'admin')
  )
  WITH CHECK (
    bucket_id IN ('itinerarios-stacking', 'stacking-navieras')
    AND public.navitrack_rol_actual() IN ('superadmin', 'admin')
  );

DROP POLICY IF EXISTS "stacking_buckets_delete" ON storage.objects;
CREATE POLICY "stacking_buckets_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('itinerarios-stacking', 'stacking-navieras')
    AND public.navitrack_rol_actual() IN ('superadmin', 'admin')
  );

-- ─── formatos-templates ──────────────────────────────────────────────────────
-- Bucket privado: las plantillas con las que se emiten los documentos.
DROP POLICY IF EXISTS "formatos_select" ON storage.objects;
CREATE POLICY "formatos_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'formatos-templates'
    AND public.navitrack_rol_actual() IN ('superadmin', 'admin', 'ejecutivo', 'operador')
  );

DROP POLICY IF EXISTS "formatos_write" ON storage.objects;
CREATE POLICY "formatos_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'formatos-templates' AND public.navitrack_rol_actual() = 'superadmin'
  );

DROP POLICY IF EXISTS "formatos_update" ON storage.objects;
CREATE POLICY "formatos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'formatos-templates' AND public.navitrack_rol_actual() = 'superadmin')
  WITH CHECK (bucket_id = 'formatos-templates' AND public.navitrack_rol_actual() = 'superadmin');

DROP POLICY IF EXISTS "formatos_delete" ON storage.objects;
CREATE POLICY "formatos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'formatos-templates' AND public.navitrack_rol_actual() = 'superadmin');

-- Verificación: no debe quedar ningún bucket sin políticas.
-- SELECT b.id FROM storage.buckets b
--  WHERE NOT EXISTS (
--    SELECT 1 FROM pg_policies p
--     WHERE p.schemaname = 'storage' AND p.tablename = 'objects'
--       AND (p.qual::text LIKE '%'||b.id||'%' OR p.with_check::text LIKE '%'||b.id||'%'));
