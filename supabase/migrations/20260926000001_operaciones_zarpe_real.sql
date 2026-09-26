-- El zarpe real desde el puerto de origen, además de la fecha planificada.
--
-- `operaciones.etd` es la fecha que se carga con la reserva: la promesa, sujeta
-- a que haya sitio en el puerto y a que el clima acompañe. El historial del
-- viaje ("Historia del viaje") solo mostraba esa fecha planificada, nunca la
-- confirmaba con lo que ve el AIS -- exactamente el mismo problema que ya se
-- resolvió para los transbordos (anunciado vs. real) y para el arribo, pero
-- que faltaba resolver para el zarpe de origen.
--
-- Se detecta por posición, no por `atdUtc`: ese campo del proveedor quedó
-- documentado como no confiable para emparejarlo con un puerto en particular
-- (ver el comentario de `AisSnapshot.departedAt` en navitrack-model.ts). La
-- primera lectura que ve al buque fuera del radio de su puerto de origen
-- (`MISMO_PUERTO_KM`) es la evidencia: si ya no está ahí, zarpó.
--
-- Se guarda aparte de `navitrack_recaladas` porque esa tabla es el historial
-- de puertos intermedios (transbordos y paradas programadas); el zarpe de
-- origen no es una escala, es el propio inicio del viaje.

ALTER TABLE public.operaciones
  ADD COLUMN IF NOT EXISTS zarpe_real_at timestamptz;

COMMENT ON COLUMN public.operaciones.zarpe_real_at IS
  'Cuándo consta, por posición del AIS, que el buque ya no está en el POL. '
  'Null hasta que se detecte. No se pisa una vez capturado: la primera lectura '
  'que lo vio zarpado es la que vale.';

-- No hace falta GRANT ni política nueva: es una columna más de una tabla que
-- ya tiene RLS y GRANT amplios para `operaciones`, y la escribe únicamente el
-- chequeo diario con `service_role` (bypasa RLS).
