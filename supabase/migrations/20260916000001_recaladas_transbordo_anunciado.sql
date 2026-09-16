-- Transbordo que se sabe antes de que ocurra.
--
-- El operador se entera del cambio de nave en la web de la naviera días antes
-- de que el buque lo declare por AIS: ahí figura el puerto, la fecha y el barco
-- al que sube la carga. Hasta ahora la única forma de registrarlo era
-- "Hubo transbordo", que da el hecho por consumado: pasa el seguimiento a la
-- nave nueva **ese mismo día**, cuando la carga todavía viaja en la anterior.
--
-- El resultado era elegir entre dos datos falsos: registrar el transbordo y
-- perder de vista el buque que de verdad lleva la carga, o no registrarlo y
-- mostrar un viaje directo que ya se sabe que no lo es.
--
-- `transbordo_anunciado` es el estado intermedio: la decisión está tomada —la
-- pregunta no vuelve a hacerse— pero el cambio de nave está fechado a futuro.
-- El tramo se crea con `confirmado = false` y el traspaso de seguimiento lo
-- hace solo el chequeo diario, el día en que ese tramo pasa a ser el vigente
-- (ver `sincronizarSeguimiento`, que elige el primer tramo cuya ETA no venció).

ALTER TABLE public.navitrack_recaladas
  DROP CONSTRAINT IF EXISTS navitrack_recaladas_estado_check;

ALTER TABLE public.navitrack_recaladas
  ADD CONSTRAINT navitrack_recaladas_estado_check
  CHECK (estado = ANY (ARRAY[
    'anunciada'::text,
    'por_verificar'::text,
    'parada_programada'::text,
    'transbordo'::text,
    'transbordo_anunciado'::text,
    'recalada'::text
  ]));

-- Verificación: debe listar las seis opciones.
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
--  WHERE conname = 'navitrack_recaladas_estado_check';
