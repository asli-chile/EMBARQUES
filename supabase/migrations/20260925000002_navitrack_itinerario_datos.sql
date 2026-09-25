-- NaviTrack: datos existentes al pasar al itinerario por embarque.
--
-- Desde el 25-09-2026 no se pregunta puerto por puerto si la carga cambió de
-- nave: se indica una vez por embarque si el viaje es directo o con transbordo
-- (`navitrack_viajes` + la cadena de `navitrack_tramos`), y cualquier otro
-- puerto que anuncie el AIS es parada programada. Los estados `por_verificar`
-- y `transbordo_anunciado` dejan de producirse.
--
-- Esta migración no cambia el esquema. Ordena las filas que el flujo anterior
-- dejó a medias, embarque por embarque, revisadas a mano el 25-09-2026:
--
--   A00042  Tiene tres tramos (transbordo en Cristóbal y Gioia Tauro) y ningún
--           modo. Se marca con transbordo.
--   A00051  Rodman es el transbordo (MSC SERENA -> MSC BOSTON). Cristóbal y
--           Thames los anunció MSC SERENA **después** de dejar la carga en
--           Rodman: son de otro viaje y se retiran. Callao queda como parada.
--           El tramo de MSC BOSTON pasa a confirmado: consta que MSC SERENA
--           estuvo en Rodman.
--   A00052  San Antonio es su propio puerto de carga y Callao es de la ruta de
--           entrada del buque, antes de cargar (ETD 25-09). Ninguna es escala
--           de esta carga.
--   Resto   Lo que quedó `por_verificar` (A00045, A00048, A00049) vuelve a
--           estado neutro: `recalada` si el buque ya pasó, `anunciada` si no.
--           Esos embarques aparecen como "falta indicar si es directo o con
--           transbordo" hasta que alguien lo diga; al hacerlo, sus puertos se
--           reclasifican solos.
--
-- Los ids de recalada van junto a la referencia del embarque: si una fila no
-- coincide con lo revisado, simplemente no se toca.

BEGIN;

-- A00042: con transbordo.
INSERT INTO public.navitrack_viajes (operacion_id, modo, notas)
SELECT o.id, 'con_transbordo', 'Cadena de tramos cargada antes del itinerario.'
  FROM public.operaciones o
 WHERE o.ref_asli = 'A00042' AND o.deleted_at IS NULL
ON CONFLICT (operacion_id) DO NOTHING;

-- A00051: Rodman es transbordo; Callao, parada; Cristóbal y Thames, fuera.
UPDATE public.navitrack_recaladas r
   SET estado = 'transbordo'
  FROM public.operaciones o
 WHERE r.operacion_id = o.id AND o.ref_asli = 'A00051' AND r.id = 10;

UPDATE public.navitrack_recaladas r
   SET estado = 'parada_programada', decidido_at = COALESCE(r.decidido_at, now())
  FROM public.operaciones o
 WHERE r.operacion_id = o.id AND o.ref_asli = 'A00051' AND r.id = 16;

DELETE FROM public.navitrack_recaladas r
 USING public.operaciones o
 WHERE r.operacion_id = o.id AND o.ref_asli = 'A00051' AND r.id IN (23, 27);

UPDATE public.navitrack_tramos t
   SET confirmado = true
  FROM public.operaciones o
 WHERE t.operacion_id = o.id AND o.ref_asli = 'A00051' AND t.orden = 2 AND t.nave IS NOT NULL;

-- A00052: ni San Antonio ni Callao son escalas de esta carga.
DELETE FROM public.navitrack_recaladas r
 USING public.operaciones o
 WHERE r.operacion_id = o.id AND o.ref_asli = 'A00052' AND r.id IN (22, 31);

-- Lo demás que esperaba verificación vuelve a estado neutro.
UPDATE public.navitrack_recaladas
   SET estado = CASE WHEN recalado_at IS NOT NULL THEN 'recalada' ELSE 'anunciada' END
 WHERE estado = 'por_verificar';

UPDATE public.navitrack_recaladas
   SET estado = 'transbordo'
 WHERE estado = 'transbordo_anunciado';

COMMIT;

-- Verificación: no debe quedar ninguna fila en los estados retirados.
-- SELECT estado, count(*) FROM public.navitrack_recaladas
--  WHERE estado IN ('por_verificar', 'transbordo_anunciado') GROUP BY estado;
