-- Guardar el nombre de la naviera en el servicio para mostrarlo sin depender del lookup.
ALTER TABLE public.servicios_unicos
  ADD COLUMN IF NOT EXISTS naviera_nombre text DEFAULT '';

COMMENT ON COLUMN public.servicios_unicos.naviera_nombre IS 'Nombre de la naviera al momento de crear/editar (para mostrar en listados).';
