-- ─── Quién pidió cada lectura ────────────────────────────────────────────────
--
-- `navitrack_ais_lecturas` ya guarda *cuándo* se consultó al proveedor, y con
-- eso basta para saber cuál fue la última actualización. Lo que no guarda es
-- *quién la pidió*, y ahí una consulta del chequeo diario y una que alguien
-- disparó a mano se ven exactamente iguales.
--
-- Esa diferencia importa: el gasto automático es presupuesto y el manual es una
-- decisión. Sin distinguirlos, el registro de consumo no se puede auditar.
--
--   cron      el chequeo diario de las 07:00
--   manual    alguien apretó "Actualizar posiciones" en el panel
--   pantalla  se abrió un embarque y el dato guardado estaba vencido
--
-- Las filas anteriores quedan como 'pantalla', que es como se generaron todas
-- hasta ahora: nadie había disparado el cron ni existía el botón manual.

ALTER TABLE public.navitrack_ais_lecturas
  ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'pantalla';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'navitrack_ais_lecturas_origen_check'
  ) THEN
    ALTER TABLE public.navitrack_ais_lecturas
      ADD CONSTRAINT navitrack_ais_lecturas_origen_check
      CHECK (origen IN ('cron', 'manual', 'pantalla'));
  END IF;
END $$;

COMMENT ON COLUMN public.navitrack_ais_lecturas.origen IS
  'Qué disparó la consulta: cron (chequeo diario), manual (botón del panel) o pantalla (TTL vencido al abrir un embarque).';

-- Se consulta siempre por lo más reciente, y a menudo filtrando por origen.
CREATE INDEX IF NOT EXISTS navitrack_ais_lecturas_origen_idx
  ON public.navitrack_ais_lecturas (origen, consultado_at DESC);

-- Verificación:
-- SELECT origen, count(*), max(consultado_at) AS ultima
--   FROM public.navitrack_ais_lecturas GROUP BY origen ORDER BY ultima DESC;
