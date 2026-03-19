-- Agrega columna booking_doc_url a operaciones
-- Almacena la URL del documento de confirmación de booking (PDF o imagen)
-- subido al bucket "booking-docs" de Supabase Storage

ALTER TABLE public.operaciones
  ADD COLUMN IF NOT EXISTS booking_doc_url text;

-- ─── Storage bucket ────────────────────────────────────────────────────────────
-- Crear manualmente en Supabase Dashboard > Storage:
--   Nombre: booking-docs
--   Public: true (para que la URL pública funcione directamente)
--
-- O via SQL (requiere extensión storage habilitada):
-- INSERT INTO storage.buckets (id, name, public)
--   VALUES ('booking-docs', 'booking-docs', true)
--   ON CONFLICT (id) DO NOTHING;

-- Política: cualquier usuario autenticado puede subir a su propia carpeta
-- (En Supabase Dashboard > Storage > booking-docs > Policies)
