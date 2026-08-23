-- Tipo de solicitud de ventana de carga: NORMAL | LATE | EXTRA_LATE
ALTER TABLE public.operaciones
  ADD COLUMN IF NOT EXISTS solicitud_ventana text;

UPDATE public.operaciones
SET solicitud_ventana = 'NORMAL'
WHERE solicitud_ventana IS NULL;

ALTER TABLE public.operaciones
  ALTER COLUMN solicitud_ventana SET DEFAULT 'NORMAL';

ALTER TABLE public.operaciones DROP CONSTRAINT IF EXISTS operaciones_solicitud_ventana_check;
ALTER TABLE public.operaciones
  ADD CONSTRAINT operaciones_solicitud_ventana_check
  CHECK (solicitud_ventana IS NULL OR solicitud_ventana IN ('NORMAL', 'LATE', 'EXTRA_LATE'));

COMMENT ON COLUMN public.operaciones.solicitud_ventana IS
  'Indica si la reserva se pide en stacking normal, late o extra late';
