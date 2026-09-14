-- "CMA CGM" → "CMA-CGM": el mismo transportista escrito de dos formas.
--
-- Dos embarques traían el nombre con espacio en vez de guion, que es como lo
-- tiene el catálogo `navieras`. No es una naviera distinta: es un tipeo heredado
-- de cuando el campo se llenaba a mano. Hoy se elige de la lista, así que no
-- debería reaparecer por la pantalla.
--
-- Mientras la diferencia existía, esos dos embarques no cruzaban con el
-- catálogo: salían con monograma en vez del logo de CMA, y cualquier filtro o
-- agrupación por naviera los contaba aparte.

UPDATE public.operaciones
   SET naviera = 'CMA-CGM'
 WHERE upper(trim(naviera)) = 'CMA CGM';

-- Verificación: no debe devolver filas.
-- SELECT naviera, count(*) FROM public.operaciones o
--  WHERE coalesce(trim(naviera),'') <> ''
--    AND NOT EXISTS (SELECT 1 FROM public.navieras n WHERE upper(trim(n.nombre)) = upper(trim(o.naviera)))
--  GROUP BY 1;
