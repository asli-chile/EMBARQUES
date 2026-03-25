-- Agrega columnas tipo_envase, categoria, etiqueta a proforma_items
ALTER TABLE public.proforma_items
  ADD COLUMN IF NOT EXISTS tipo_envase text,
  ADD COLUMN IF NOT EXISTS categoria   text,
  ADD COLUMN IF NOT EXISTS etiqueta    text;
