-- Marcar Solicitud de Reserva y Factura Gate Out como "No aplica"
-- para excluirlos del porcentaje de documentos por operación.

ALTER TABLE public.operaciones
  ADD COLUMN IF NOT EXISTS solicitud_reserva_no_aplica boolean NOT NULL DEFAULT false;

ALTER TABLE public.operaciones
  ADD COLUMN IF NOT EXISTS factura_gate_out_no_aplica boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.operaciones.solicitud_reserva_no_aplica IS
  'Si true, Solicitud de Reserva no aplica y no cuenta en el % de documentos.';

COMMENT ON COLUMN public.operaciones.factura_gate_out_no_aplica IS
  'Si true, Factura Gate Out no aplica y no cuenta en el % de documentos.';
