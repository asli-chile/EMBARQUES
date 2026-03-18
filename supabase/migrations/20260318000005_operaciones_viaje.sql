-- Agrega columna viaje a operaciones
-- Almacena el número/nombre del viaje de la nave (ej: 241N)

ALTER TABLE public.operaciones
  ADD COLUMN IF NOT EXISTS viaje text;
