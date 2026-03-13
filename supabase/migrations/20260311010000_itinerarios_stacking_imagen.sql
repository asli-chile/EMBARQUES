-- Columna para guardar la URL pública de la imagen oficial de stacking por itinerario

ALTER TABLE public.itinerarios
ADD COLUMN IF NOT EXISTS stacking_imagen_url text;

