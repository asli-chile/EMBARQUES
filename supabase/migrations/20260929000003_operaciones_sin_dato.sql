-- Campos marcados "-" (sin dato / no aplica) en operaciones.
--
-- El equipo cierra las fichas completando con "-" lo que no se tiene o no
-- aplica. En texto eso ya funciona ("-" se guarda tal cual), pero las columnas
-- de número y de fecha no admiten "-": en pallets había que poner 0, y un 0
-- afirma "cero pallets" en vez de "no tenemos el dato".
--
-- `sin_dato` lista las columnas marcadas así. La columna marcada queda NULL,
-- así que nada se suma ni se filtra como si fuera un valor, y las pantallas
-- muestran "-" y la cuentan como completa.
--
-- Pedido explícito del usuario el 29-09-2026 (ficha y tabla de Mis Reservas,
-- Registros).

ALTER TABLE public.operaciones
  ADD COLUMN IF NOT EXISTS sin_dato text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.operaciones.sin_dato IS
  'Columnas marcadas "-" (sin dato o no aplica). La columna marcada queda NULL. Se limpia sola al escribir el dato real.';

-- La marca se quita sola cuando la columna recibe un valor, venga de la
-- pantalla que venga (ficha, Registros, importación): así nunca conviven un
-- dato real y un "-" para el mismo campo. También descarta nombres que no son
-- columnas y duplicados.
CREATE OR REPLACE FUNCTION public.operaciones_limpiar_sin_dato()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  fila jsonb := to_jsonb(NEW);
BEGIN
  IF NEW.sin_dato IS NULL OR cardinality(NEW.sin_dato) = 0 THEN
    NEW.sin_dato := '{}';
    RETURN NEW;
  END IF;
  NEW.sin_dato := COALESCE((
    SELECT array_agg(DISTINCT k ORDER BY k)
      FROM unnest(NEW.sin_dato) AS k
     WHERE fila ? k
       AND k <> 'sin_dato'
       AND (
         fila -> k = 'null'::jsonb
         OR btrim(fila ->> k) IN ('', '-', '—', '–')
       )
  ), '{}');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS operaciones_limpiar_sin_dato ON public.operaciones;
CREATE TRIGGER operaciones_limpiar_sin_dato
  BEFORE INSERT OR UPDATE ON public.operaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.operaciones_limpiar_sin_dato();

-- Verificación (transacción deshecha):
-- BEGIN;
--   UPDATE operaciones SET sin_dato = '{pallets,no_existe}', pallets = NULL WHERE id = '<id>' RETURNING sin_dato;  -- {pallets}
--   UPDATE operaciones SET pallets = 20 WHERE id = '<id>' RETURNING sin_dato;                                     -- {}
-- ROLLBACK;
