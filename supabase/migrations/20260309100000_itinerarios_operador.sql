-- Añade columna operador a itinerarios (naviera seleccionada del consorcio/servicio)
ALTER TABLE public.itinerarios
  ADD COLUMN IF NOT EXISTS operador text;

COMMENT ON COLUMN public.itinerarios.operador IS 'Naviera/operador seleccionada del consorcio o servicio para este itinerario';
