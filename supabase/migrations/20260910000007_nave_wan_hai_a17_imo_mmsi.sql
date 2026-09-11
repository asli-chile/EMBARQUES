-- Alta WAN HAI A17 (IMO/MMSI) vinculada a naviera WAN HAI.

INSERT INTO public.naves (nombre, activo, modo_transporte, imo, mmsi)
VALUES ('WAN HAI A17', true, 'maritimo', '9968528', '563234300')
ON CONFLICT (nombre) DO UPDATE
SET activo = true,
    modo_transporte = EXCLUDED.modo_transporte,
    imo = EXCLUDED.imo,
    mmsi = EXCLUDED.mmsi;

INSERT INTO public.navieras_naves (nave_id, naviera_id, activo)
SELECT n.id, nv.id, true
FROM public.naves n
CROSS JOIN public.navieras nv
WHERE n.nombre = 'WAN HAI A17'
  AND nv.nombre = 'WAN HAI'
ON CONFLICT (nave_id, naviera_id) DO UPDATE
SET activo = true;
