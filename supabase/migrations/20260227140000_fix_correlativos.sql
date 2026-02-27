-- ============================================
-- Agregar campo ref_asli y corregir correlativos
-- Ref ASLI comienza desde A00001
-- ============================================

-- 1. Agregar columna ref_asli si no existe
ALTER TABLE public.operaciones 
ADD COLUMN IF NOT EXISTS ref_asli TEXT;

-- 2. Quitar constraints temporalmente
ALTER TABLE public.operaciones DROP CONSTRAINT IF EXISTS operaciones_correlativo_key;
ALTER TABLE public.operaciones DROP CONSTRAINT IF EXISTS operaciones_ref_asli_key;

-- 3. Renumerar correlativos desde 1 (ordenados por fecha de ingreso)
DO $$
DECLARE
  rec RECORD;
  counter INTEGER := 1;
BEGIN
  FOR rec IN 
    SELECT id FROM public.operaciones 
    WHERE deleted_at IS NULL 
    ORDER BY ingreso ASC, id ASC
  LOOP
    UPDATE public.operaciones 
    SET correlativo = counter,
        ref_asli = 'A' || LPAD(counter::TEXT, 5, '0')
    WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- 4. Restaurar constraints
ALTER TABLE public.operaciones ADD CONSTRAINT operaciones_correlativo_key UNIQUE (correlativo);
ALTER TABLE public.operaciones ADD CONSTRAINT operaciones_ref_asli_key UNIQUE (ref_asli);

-- 5. Resetear secuencia
SELECT setval(
  pg_get_serial_sequence('public.operaciones', 'correlativo'),
  COALESCE((SELECT MAX(correlativo) FROM public.operaciones), 0) + 1,
  false
);

-- 6. Crear función para auto-generar ref_asli en nuevos registros
CREATE OR REPLACE FUNCTION generate_ref_asli()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ref_asli IS NULL THEN
    NEW.ref_asli := 'A' || LPAD(NEW.correlativo::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Crear trigger
DROP TRIGGER IF EXISTS trg_generate_ref_asli ON public.operaciones;
CREATE TRIGGER trg_generate_ref_asli
  BEFORE INSERT ON public.operaciones
  FOR EACH ROW
  EXECUTE FUNCTION generate_ref_asli();

-- 8. Crear índice
CREATE INDEX IF NOT EXISTS idx_operaciones_ref_asli ON public.operaciones(ref_asli);
