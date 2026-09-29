-- Días de tránsito (tt) calculados desde ETD y ETA en la base.
--
-- `tt` solo se calculaba en Crear Reserva, al dar de alta. Editar ETD o ETA
-- después (ficha de Mis Reservas, Registros) no lo tocaba: el 29-09-2026 la
-- A00053 pasó a ETD 05-10 / ETA 10-11 y siguió mostrando 38 días en vez de 36.
--
-- Mismo criterio que el país desde el POD: el dato se deriva, no se escribe.
--   tt = eta - etd (días), si están las dos y la ETA no es anterior al ETD.
--   Si falta una fecha o la ETA es anterior, tt queda NULL: no se inventa.
-- Solo corre al crear o al cambiar ETD/ETA, así que un tt escrito a mano sin
-- tocar las fechas se respeta.

CREATE OR REPLACE FUNCTION public.operaciones_tt_desde_fechas()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.etd IS NOT NULL AND NEW.eta IS NOT NULL AND NEW.eta >= NEW.etd THEN
    NEW.tt := NEW.eta - NEW.etd;
  ELSE
    NEW.tt := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS operaciones_tt_desde_fechas ON public.operaciones;
CREATE TRIGGER operaciones_tt_desde_fechas
  BEFORE INSERT OR UPDATE OF etd, eta ON public.operaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.operaciones_tt_desde_fechas();

-- Histórico: las que quedaron desalineadas por ediciones anteriores.
UPDATE public.operaciones
   SET tt = eta - etd
 WHERE etd IS NOT NULL AND eta IS NOT NULL AND eta >= etd
   AND tt IS DISTINCT FROM (eta - etd);

-- Verificación: no debe devolver filas.
-- SELECT ref_asli, etd, eta, tt FROM operaciones
--  WHERE etd IS NOT NULL AND eta IS NOT NULL AND eta >= etd AND tt IS DISTINCT FROM (eta - etd);
