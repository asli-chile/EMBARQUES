-- Elimina constraints únicos de nombre en servicios_unicos y consorcios.
-- La validación de unicidad por región se realiza en la capa de aplicación:
-- se permite el mismo nombre siempre que pertenezca a regiones distintas.
ALTER TABLE public.servicios_unicos
  DROP CONSTRAINT IF EXISTS unique_servicio_unico_naviera;

ALTER TABLE public.consorcios
  DROP CONSTRAINT IF EXISTS consorcios_nombre_key;
