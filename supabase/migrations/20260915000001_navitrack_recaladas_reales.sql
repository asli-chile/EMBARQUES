-- NaviTrack — el recorrido real del buque, no solo lo que anunció.
--
-- `navitrack_recaladas` guardaba los puertos que el buque **declara** como
-- próximo destino, y su columna `estado` responde una pregunta de negocio: ¿la
-- carga cambió de barco aquí? Eso dejaba fuera el otro dato, que es el que el
-- cliente pregunta: por dónde pasó de verdad su embarque.
--
-- El AIS informa el último puerto en cada lectura (`lastPort`). Hasta ahora se
-- descartaba: solo vivía dentro del JSON crudo de la lectura, así que el
-- historial mostraba el futuro anunciado y ningún puerto realmente tocado.
--
-- Son dos ejes distintos y se separan a propósito:
--
--   estado       → qué se decidió sobre la CARGA (anunciada, por_verificar,
--                  parada_programada, transbordo, recalada)
--   recalado_at  → qué hizo el BUQUE: consta que paró aquí
--
-- Mezclarlos tendría un costo concreto: al confirmarse una recalada se cerraría
-- sola una verificación pendiente, y que el buque haya parado en un puerto no
-- dice nada sobre si la carga se bajó ahí.

ALTER TABLE public.navitrack_recaladas
  DROP CONSTRAINT IF EXISTS navitrack_recaladas_estado_check;

-- 'recalada': consta que el buque paró aquí y nadie afirmó nada sobre la carga.
-- Es un hecho del recorrido, no una pregunta abierta: no entra en la cola de
-- verificación, que sigue alimentándose solo de 'anunciada'.
ALTER TABLE public.navitrack_recaladas
  ADD CONSTRAINT navitrack_recaladas_estado_check
  CHECK (estado = ANY (ARRAY[
    'anunciada'::text,
    'por_verificar'::text,
    'parada_programada'::text,
    'transbordo'::text,
    'recalada'::text
  ]));

-- Cuándo se supo que el buque estaba ahí. NULL = solo fue anunciado.
ALTER TABLE public.navitrack_recaladas
  ADD COLUMN IF NOT EXISTS recalado_at timestamptz;

-- `atdUtc` del proveedor. Se guarda porque viene en la lectura ya pagada, pero
-- NO se muestra como zarpe de este puerto y no debe usarse para fechar la
-- escala: en la serie guardada, 6 de 7 naves cambiaron de `lastPort` más veces
-- de las que cambió su `atdUtc` (el CMA CGM CARL ANTOINE declaró Posorja y
-- luego Caucedo con el mismo 06-SEP). Queda para cuando se sepa a qué se
-- refiere; hasta entonces el historial muestra la escala sin fecha.
ALTER TABLE public.navitrack_recaladas
  ADD COLUMN IF NOT EXISTS zarpe_at timestamptz;

-- El historial se lee por embarque y en orden de recorrido.
CREATE INDEX IF NOT EXISTS navitrack_recaladas_op_recalado_idx
  ON public.navitrack_recaladas (operacion_id, recalado_at);

-- Verificación: debe listar las cinco opciones y las dos columnas nuevas.
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
--  WHERE conname = 'navitrack_recaladas_estado_check';
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'navitrack_recaladas'
--    AND column_name IN ('recalado_at', 'zarpe_at');
