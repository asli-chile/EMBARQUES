-- ─────────────────────────────────────────────────────────────────────────────
-- Propagar el renombre de una temporada a las operaciones
--
-- `operaciones.temporada` guarda el NOMBRE de la temporada como texto, no el id
-- (ver 20260422113000 y 20260829000004). Por eso, al renombrar una temporada,
-- las operaciones quedaban apuntando a un nombre que ya no existe en el
-- catálogo: huérfanas, sin temporada visible en la app.
--
-- Este trigger cierra el hueco: cuando cambia `temporadas.nombre`, todas las
-- operaciones que tenían el nombre anterior pasan al nuevo, en la misma
-- transacción. Es SECURITY DEFINER porque el renombre lo hace un superadmin
-- desde el cliente y RLS no debe bloquear la propagación.
--
-- Corre en AFTER UPDATE para no interferir con el trigger BEFORE que garantiza
-- una única temporada activa.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.temporadas_propagar_nombre()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.nombre IS DISTINCT FROM OLD.nombre THEN
    UPDATE public.operaciones
       SET temporada = NEW.nombre
     WHERE temporada = OLD.nombre
        OR lower(btrim(temporada)) = lower(btrim(OLD.nombre));
  END IF;
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION private.temporadas_propagar_nombre() IS
  'Al renombrar una temporada, actualiza operaciones.temporada para que no queden huérfanas.';

DROP TRIGGER IF EXISTS temporadas_propagar_nombre ON public.temporadas;
CREATE TRIGGER temporadas_propagar_nombre
  AFTER UPDATE OF nombre ON public.temporadas
  FOR EACH ROW EXECUTE FUNCTION private.temporadas_propagar_nombre();

GRANT EXECUTE ON FUNCTION private.temporadas_propagar_nombre() TO authenticated;

-- ─── Diagnóstico de huérfanas existentes ─────────────────────────────────────
-- No se reparan automáticamente: si un nombre quedó huérfano no hay forma de
-- deducir a qué temporada del catálogo corresponde. Esta consulta las lista
-- para repararlas a mano o con tools/temporadas/reasignar-huerfanas.mjs.

DO $$
DECLARE
  fila record;
BEGIN
  FOR fila IN
    SELECT o.temporada, count(*) AS total
      FROM public.operaciones o
     WHERE o.deleted_at IS NULL
       AND o.temporada IS NOT NULL
       AND btrim(o.temporada) <> ''
       AND NOT EXISTS (
             SELECT 1 FROM public.temporadas t
              WHERE lower(btrim(t.nombre)) = lower(btrim(o.temporada))
           )
     GROUP BY o.temporada
  LOOP
    RAISE NOTICE 'Temporada huérfana: "%" con % operaciones', fila.temporada, fila.total;
  END LOOP;
END $$;
