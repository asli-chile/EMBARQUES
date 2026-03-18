-- Agrega campo para marcar operaciones enviadas a transportes.
-- Solo las operaciones con enviado_transporte = true aparecerán en el módulo de Transportes.

ALTER TABLE public.operaciones
  ADD COLUMN IF NOT EXISTS enviado_transporte boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_operaciones_enviado_transporte
  ON public.operaciones (enviado_transporte)
  WHERE enviado_transporte = true AND deleted_at IS NULL;
