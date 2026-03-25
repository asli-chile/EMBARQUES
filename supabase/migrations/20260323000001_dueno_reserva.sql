-- Agrega campo "dueño de reserva" a operaciones
-- Indica qué empresa coordina la reserva (ASLI, CHILFRESH, SURLOGISTICA, etc.)

ALTER TABLE public.operaciones
  ADD COLUMN IF NOT EXISTS dueno_reserva text DEFAULT 'ASLI';
