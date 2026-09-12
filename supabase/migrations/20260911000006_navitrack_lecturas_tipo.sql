-- ─── Tipo de consulta en el registro de créditos ─────────────────────────────
--
-- `navitrack_ais_lecturas` empezó guardando solo posiciones. Ahora el panel de
-- Rastreo también resuelve el IMO de una nave por su nombre, y esa búsqueda
-- gasta un crédito igual. Sin distinguirlas, el histórico de posiciones quedaría
-- contaminado con filas que no tienen coordenadas.
--
--   posicion   get-vessel-location       (dibuja el mapa)
--   busqueda   vessels-by-vessel-name    (resuelve IMO/MMSI)

ALTER TABLE public.navitrack_ais_lecturas
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'posicion';

ALTER TABLE public.navitrack_ais_lecturas
  DROP CONSTRAINT IF EXISTS navitrack_ais_lecturas_tipo_check;

ALTER TABLE public.navitrack_ais_lecturas
  ADD CONSTRAINT navitrack_ais_lecturas_tipo_check
  CHECK (tipo IN ('posicion', 'busqueda'));

COMMENT ON COLUMN public.navitrack_ais_lecturas.tipo IS
  'Qué consulta gastó el crédito: posicion (mapa) o busqueda (resolver IMO/MMSI).';

CREATE INDEX IF NOT EXISTS navitrack_ais_lecturas_tipo_idx
  ON public.navitrack_ais_lecturas (tipo, consultado_at DESC);

-- Créditos gastados por tipo:
-- SELECT tipo, count(*) FROM public.navitrack_ais_lecturas GROUP BY tipo;
