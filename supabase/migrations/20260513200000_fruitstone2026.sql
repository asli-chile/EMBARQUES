-- ============================================================================
-- Fruitstone 2026: muestras de cereza públicas (sin autenticación)
--
-- Crea:
--   1. Tabla public.fruitstone2026_muestras
--   2. Bucket de Storage 'fruitstone2026' para etiquetas de pallet y fotos de
--      defectos
--   3. Políticas RLS abiertas (lectura/escritura pública) para que cualquier
--      persona con el link pueda colaborar sin login
--
-- Aplicar en Supabase SQL Editor.
-- ============================================================================

-- ── Tabla de muestras ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fruitstone2026_muestras (
  id              BIGSERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha           DATE        NOT NULL DEFAULT CURRENT_DATE,
  lote            TEXT        NOT NULL,
  productor       TEXT,
  variedad        TEXT,
  cantidad_cajas  INTEGER,
  kilos_bruto_lote NUMERIC(10,2),
  total           INTEGER     NOT NULL DEFAULT 0,
  c_pre           INTEGER     NOT NULL DEFAULT 0,
  c22             INTEGER     NOT NULL DEFAULT 0,
  c24             INTEGER     NOT NULL DEFAULT 0,
  c26             INTEGER     NOT NULL DEFAULT 0,
  c28             INTEGER     NOT NULL DEFAULT 0,
  c30             INTEGER     NOT NULL DEFAULT 0,
  c32             INTEGER     NOT NULL DEFAULT 0,
  blanda          INTEGER     NOT NULL DEFAULT 0,
  pitting         INTEGER     NOT NULL DEFAULT 0,
  doble           INTEGER     NOT NULL DEFAULT 0,
  deshidratada    INTEGER     NOT NULL DEFAULT 0,
  partida         INTEGER     NOT NULL DEFAULT 0,
  pudricion       INTEGER     NOT NULL DEFAULT 0,
  color_bajo      INTEGER     NOT NULL DEFAULT 0,
  media_luna      INTEGER     NOT NULL DEFAULT 0,
  sin_pedicelo    INTEGER     NOT NULL DEFAULT 0,
  negro           INTEGER     NOT NULL DEFAULT 0,
  zumo            INTEGER     NOT NULL DEFAULT 0,
  segunda         INTEGER     NOT NULL DEFAULT 0,
  observaciones   TEXT,
  etiqueta_pallet TEXT,
  fotos_defectos  TEXT[]      NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS fruitstone2026_muestras_lote_idx
  ON public.fruitstone2026_muestras (lote);

CREATE INDEX IF NOT EXISTS fruitstone2026_muestras_created_idx
  ON public.fruitstone2026_muestras (created_at DESC);

-- Trigger para mantener updated_at
CREATE OR REPLACE FUNCTION public.fruitstone2026_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fruitstone2026_muestras_updated_at ON public.fruitstone2026_muestras;
CREATE TRIGGER fruitstone2026_muestras_updated_at
  BEFORE UPDATE ON public.fruitstone2026_muestras
  FOR EACH ROW
  EXECUTE FUNCTION public.fruitstone2026_set_updated_at();

-- ── Políticas RLS de la tabla (acceso público completo) ────────────────────
ALTER TABLE public.fruitstone2026_muestras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fruitstone2026_muestras_select_public" ON public.fruitstone2026_muestras;
CREATE POLICY "fruitstone2026_muestras_select_public"
  ON public.fruitstone2026_muestras
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "fruitstone2026_muestras_insert_public" ON public.fruitstone2026_muestras;
CREATE POLICY "fruitstone2026_muestras_insert_public"
  ON public.fruitstone2026_muestras
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "fruitstone2026_muestras_update_public" ON public.fruitstone2026_muestras;
CREATE POLICY "fruitstone2026_muestras_update_public"
  ON public.fruitstone2026_muestras
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "fruitstone2026_muestras_delete_public" ON public.fruitstone2026_muestras;
CREATE POLICY "fruitstone2026_muestras_delete_public"
  ON public.fruitstone2026_muestras
  FOR DELETE
  TO public
  USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fruitstone2026_muestras TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.fruitstone2026_muestras_id_seq TO anon, authenticated;

-- ── Bucket de Storage para imágenes ────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fruitstone2026',
  'fruitstone2026',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

-- ── Políticas de Storage (acceso público completo) ─────────────────────────
DROP POLICY IF EXISTS "fruitstone2026_storage_select_public" ON storage.objects;
CREATE POLICY "fruitstone2026_storage_select_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'fruitstone2026');

DROP POLICY IF EXISTS "fruitstone2026_storage_insert_public" ON storage.objects;
CREATE POLICY "fruitstone2026_storage_insert_public"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'fruitstone2026');

DROP POLICY IF EXISTS "fruitstone2026_storage_update_public" ON storage.objects;
CREATE POLICY "fruitstone2026_storage_update_public"
  ON storage.objects FOR UPDATE
  TO public
  USING (bucket_id = 'fruitstone2026')
  WITH CHECK (bucket_id = 'fruitstone2026');

DROP POLICY IF EXISTS "fruitstone2026_storage_delete_public" ON storage.objects;
CREATE POLICY "fruitstone2026_storage_delete_public"
  ON storage.objects FOR DELETE
  TO public
  USING (bucket_id = 'fruitstone2026');
