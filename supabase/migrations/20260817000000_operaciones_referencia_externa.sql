-- Referencia externa opcional, independiente del código ASLI (ref_asli / correlativo)
ALTER TABLE public.operaciones
  ADD COLUMN IF NOT EXISTS referencia_externa TEXT;

COMMENT ON COLUMN public.operaciones.referencia_externa IS
  'Referencia del cliente u operador externo; no reemplaza ref_asli generada por el sistema.';
