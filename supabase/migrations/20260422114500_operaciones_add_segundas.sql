-- Columna para registrar segundas en la operación.
ALTER TABLE public.operaciones
ADD COLUMN IF NOT EXISTS segundas text;

CREATE INDEX IF NOT EXISTS idx_operaciones_segundas
  ON public.operaciones (segundas);
