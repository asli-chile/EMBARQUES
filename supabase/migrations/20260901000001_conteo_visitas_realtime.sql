-- Habilita Realtime en conteo_visitas para que el badge del superadmin
-- refleje incrementos sin esperar al polling de 30 s.
-- (La tabla existía desde 20260318000004 pero nunca se añadió a la publicación.)

ALTER TABLE public.conteo_visitas REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'conteo_visitas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conteo_visitas;
  END IF;
END $$;
