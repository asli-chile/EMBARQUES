-- El número de viaje se guarda siempre en mayúsculas y sin espacios en los
-- extremos: "nx635r" pasa a "NX635R" y "v.613" a "V.613".
--
-- La naviera lo publica en mayúsculas y así se busca y se cruza: NaviTrack
-- compara el viaje de la operación con el del itinerario y con el del tramo, y
-- un "nx635r" contra un "NX635R" no calza aunque sea el mismo viaje. Al
-- 26-09-2026 había 1 operación y 3 itinerarios en minúscula.
--
-- Va en la base, como el formato del contenedor, porque el viaje se escribe
-- desde varias pantallas (Crear Reserva, Registros, la ficha de Mis Reservas,
-- Itinerarios, NaviTrack, Proformas) y desde la importación: el trigger lo
-- corrige sea cual sea el camino. Solo cambia mayúsculas y espacios de los
-- bordes; no toca puntos, guiones ni espacios intermedios, que son parte del
-- código que publica la naviera.

CREATE OR REPLACE FUNCTION private.viaje_mayusculas_trg()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.viaje := nullif(upper(btrim(NEW.viaje)), '');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS operaciones_viaje_mayusculas ON public.operaciones;
CREATE TRIGGER operaciones_viaje_mayusculas
  BEFORE INSERT OR UPDATE OF viaje ON public.operaciones
  FOR EACH ROW EXECUTE FUNCTION private.viaje_mayusculas_trg();

DROP TRIGGER IF EXISTS itinerarios_viaje_mayusculas ON public.itinerarios;
CREATE TRIGGER itinerarios_viaje_mayusculas
  BEFORE INSERT OR UPDATE OF viaje ON public.itinerarios
  FOR EACH ROW EXECUTE FUNCTION private.viaje_mayusculas_trg();

DROP TRIGGER IF EXISTS navitrack_tramos_viaje_mayusculas ON public.navitrack_tramos;
CREATE TRIGGER navitrack_tramos_viaje_mayusculas
  BEFORE INSERT OR UPDATE OF viaje ON public.navitrack_tramos
  FOR EACH ROW EXECUTE FUNCTION private.viaje_mayusculas_trg();

DROP TRIGGER IF EXISTS proformas_viaje_mayusculas ON public.proformas;
CREATE TRIGGER proformas_viaje_mayusculas
  BEFORE INSERT OR UPDATE OF viaje ON public.proformas
  FOR EACH ROW EXECUTE FUNCTION private.viaje_mayusculas_trg();

-- Histórico. Solo las filas que cambian. En itinerarios, el trigger de
-- updated_at marcará esas filas como modificadas hoy, que es lo que pasó.
UPDATE public.operaciones      SET viaje = viaje WHERE viaje IS DISTINCT FROM nullif(upper(btrim(viaje)), '');
UPDATE public.itinerarios      SET viaje = viaje WHERE viaje IS DISTINCT FROM nullif(upper(btrim(viaje)), '');
UPDATE public.navitrack_tramos SET viaje = viaje WHERE viaje IS DISTINCT FROM nullif(upper(btrim(viaje)), '');
UPDATE public.proformas        SET viaje = viaje WHERE viaje IS DISTINCT FROM nullif(upper(btrim(viaje)), '');

-- Verificación: debe devolver 0 en todas.
-- SELECT 'operaciones', count(*) FROM public.operaciones WHERE viaje <> upper(btrim(viaje))
-- UNION ALL SELECT 'itinerarios', count(*) FROM public.itinerarios WHERE viaje <> upper(btrim(viaje))
-- UNION ALL SELECT 'navitrack_tramos', count(*) FROM public.navitrack_tramos WHERE viaje <> upper(btrim(viaje))
-- UNION ALL SELECT 'proformas', count(*) FROM public.proformas WHERE viaje <> upper(btrim(viaje));
