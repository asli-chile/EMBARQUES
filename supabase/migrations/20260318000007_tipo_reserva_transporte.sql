ALTER TABLE public.operaciones
  ADD COLUMN IF NOT EXISTS tipo_reserva_transporte text;

COMMENT ON COLUMN public.operaciones.tipo_reserva_transporte IS 'asli = Reserva ASLI, externa = Reserva Externa, null = no enviado';
