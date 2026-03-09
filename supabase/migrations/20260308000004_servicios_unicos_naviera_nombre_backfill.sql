-- Rellenar naviera_nombre en servicios existentes desde la tabla navieras.
UPDATE public.servicios_unicos su
SET naviera_nombre = n.nombre
FROM public.navieras n
WHERE su.naviera_id = n.id
  AND (su.naviera_nombre IS NULL OR su.naviera_nombre = '');
