-- ============================================================
-- Reset correlativos: renumerar registros activos desde 1
-- y resetear la secuencia PostgreSQL
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Quitar constraints únicos temporalmente para poder renumerar
ALTER TABLE public.operaciones DROP CONSTRAINT IF EXISTS operaciones_correlativo_key;
ALTER TABLE public.operaciones DROP CONSTRAINT IF EXISTS operaciones_ref_asli_key;

-- 2. Renumerar solo los registros activos (deleted_at IS NULL), ordenados por fecha de ingreso
DO $$
DECLARE
  rec RECORD;
  counter INTEGER := 1;
BEGIN
  FOR rec IN
    SELECT id FROM public.operaciones
    WHERE deleted_at IS NULL
    ORDER BY ingreso ASC NULLS LAST, id ASC
  LOOP
    UPDATE public.operaciones
    SET correlativo = counter,
        ref_asli    = 'A' || LPAD(counter::TEXT, 5, '0')
    WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- 3. Restaurar constraints únicos
ALTER TABLE public.operaciones ADD CONSTRAINT operaciones_correlativo_key UNIQUE (correlativo);
ALTER TABLE public.operaciones ADD CONSTRAINT operaciones_ref_asli_key UNIQUE (ref_asli);

-- 4. Resetear secuencia al siguiente valor tras el máximo actual
SELECT setval(
  pg_get_serial_sequence('public.operaciones', 'correlativo'),
  COALESCE((SELECT MAX(correlativo) FROM public.operaciones WHERE deleted_at IS NULL), 0) + 1,
  false
);
