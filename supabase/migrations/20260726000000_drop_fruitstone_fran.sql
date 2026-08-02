-- Elimina módulos La Torre / Fruitstone y formulario FRAN (holafraaaaan).
-- Bucket storage `fruitstone2026`: vaciar y borrar desde Storage API / Dashboard
-- (Supabase no permite DELETE directo sobre storage.buckets/objects vía SQL).

DROP TABLE IF EXISTS public.fruitstone2026_muestras CASCADE;
DROP FUNCTION IF EXISTS public.fruitstone2026_set_updated_at() CASCADE;

DROP TABLE IF EXISTS public.fran_respuestas CASCADE;

DROP POLICY IF EXISTS "fruitstone2026_storage_select_public" ON storage.objects;
DROP POLICY IF EXISTS "fruitstone2026_storage_insert_public" ON storage.objects;
DROP POLICY IF EXISTS "fruitstone2026_storage_update_public" ON storage.objects;
DROP POLICY IF EXISTS "fruitstone2026_storage_delete_public" ON storage.objects;
