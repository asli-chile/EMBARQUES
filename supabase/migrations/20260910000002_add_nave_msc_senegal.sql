-- Alta de MSC SENEGAL en catálogo de naves, vinculada a naviera MSC.

INSERT INTO public.naves (nombre, activo, modo_transporte)
VALUES ('MSC SENEGAL', true, 'maritimo')
ON CONFLICT (nombre) DO UPDATE
SET activo = true,
    modo_transporte = EXCLUDED.modo_transporte;

INSERT INTO public.navieras_naves (nave_id, naviera_id, activo)
SELECT n.id, nv.id, true
FROM public.naves n
CROSS JOIN public.navieras nv
WHERE n.nombre = 'MSC SENEGAL'
  AND nv.nombre = 'MSC'
ON CONFLICT (nave_id, naviera_id) DO UPDATE
SET activo = true;
