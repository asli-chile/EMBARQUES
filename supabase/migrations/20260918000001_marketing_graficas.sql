-- ─── Oficina de marketing: piezas gráficas para redes ────────────────────────
--
-- Tabla + bucket para /embarques/marketing: la galería interna de piezas
-- gráficas (Instagram/LinkedIn) generadas para ASLI. No es contenido de
-- cliente ni dato operativo — es material de marketing interno, así que sigue
-- el mismo patrón de dos capas (GRANT + política) que el resto del sistema.
--
-- Acceso: superadmin y admin gestionan (crear, editar, marcar revisado,
-- eliminar). Ejecutivo solo lee, como en el resto de los catálogos internos.
-- Ni cliente ni operador entran — esto no es algo que necesiten ver.

CREATE TABLE IF NOT EXISTS public.marketing_graficas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  pilar text NOT NULL,
  imagen_path text NOT NULL,
  caption_sugerido text,
  revisado boolean NOT NULL DEFAULT false,
  revisado_por uuid REFERENCES public.usuarios(id),
  revisado_at timestamptz,
  creado_por uuid REFERENCES public.usuarios(id),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_graficas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketing_graficas_admin_all" ON public.marketing_graficas;
CREATE POLICY "marketing_graficas_admin_all" ON public.marketing_graficas
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol IN ('superadmin','admin') AND u.activo = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol IN ('superadmin','admin') AND u.activo = true)
  );

DROP POLICY IF EXISTS "marketing_graficas_ejecutivo_read" ON public.marketing_graficas;
CREATE POLICY "marketing_graficas_ejecutivo_read" ON public.marketing_graficas
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol = 'ejecutivo' AND u.activo = true)
  );

-- El GRANT es la primera capa: sin esto, PostgREST responde 403 antes de que
-- RLS llegue a evaluarse. admin/superadmin lo necesitan para insert/update/delete;
-- ejecutivo solo lee, así que le basta el SELECT.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_graficas TO authenticated;

-- service_role no hereda privilegios por defecto sobre una tabla nueva creada
-- desde la CLI: sin este GRANT, hasta los scripts con la service key (como el
-- de carga inicial de piezas) reciben "permission denied for table".
GRANT ALL ON public.marketing_graficas TO service_role;

-- ─── Bucket de las imágenes ───────────────────────────────────────────────────
-- Privado: no es contenido público del sitio, es material de trabajo interno.
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-graficas', 'marketing-graficas', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "marketing_graficas_storage_read" ON storage.objects;
CREATE POLICY "marketing_graficas_storage_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'marketing-graficas' AND EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol IN ('superadmin','admin','ejecutivo') AND u.activo = true
    )
  );

DROP POLICY IF EXISTS "marketing_graficas_storage_write" ON storage.objects;
CREATE POLICY "marketing_graficas_storage_write" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'marketing-graficas' AND EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol IN ('superadmin','admin') AND u.activo = true
    )
  )
  WITH CHECK (
    bucket_id = 'marketing-graficas' AND EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol IN ('superadmin','admin') AND u.activo = true
    )
  );

-- Verificación: el bucket no debe quedar sin política de lectura o escritura.
-- SELECT id FROM storage.buckets b WHERE b.id = 'marketing-graficas' AND NOT EXISTS (
--   SELECT 1 FROM pg_policies p WHERE p.schemaname = 'storage' AND p.tablename = 'objects'
--     AND p.policyname LIKE 'marketing_graficas_storage_%');
