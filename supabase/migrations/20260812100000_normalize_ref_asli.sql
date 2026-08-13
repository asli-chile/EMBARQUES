-- Normalizar ref_asli existentes y forzar formato A + 5 dígitos en nuevos registros

UPDATE public.operaciones
SET ref_asli = 'A' || LPAD(correlativo::TEXT, 5, '0')
WHERE correlativo IS NOT NULL
  AND (
    ref_asli IS NULL
    OR ref_asli <> ('A' || LPAD(correlativo::TEXT, 5, '0'))
  );

CREATE OR REPLACE FUNCTION generate_ref_asli()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.correlativo IS NOT NULL THEN
    NEW.ref_asli := 'A' || LPAD(NEW.correlativo::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_ref_asli ON public.operaciones;
CREATE TRIGGER trg_generate_ref_asli
  BEFORE INSERT ON public.operaciones
  FOR EACH ROW
  EXECUTE FUNCTION generate_ref_asli();
