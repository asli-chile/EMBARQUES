ALTER TABLE public.operaciones
  ADD COLUMN IF NOT EXISTS transporte_deleted_at timestamptz;

COMMENT ON COLUMN public.operaciones.transporte_deleted_at IS 'Soft delete para transportes: si tiene valor, la operación fue quitada de transportes y está en papelera';
