-- Normalizar tratamiento_cuarentenario antes del CHECK.
--
-- 20260928000003 agregó la columna con CHECK ('SI','NO'). La ficha de Mis
-- Reservas la editaba como texto libre y el primer guardado real falló:
-- "violates check constraint operaciones_tratamiento_cuarentenario_chk".
-- Bastaba escribir "si", "Sí" o dejarla vacía (''), y como la ficha guarda
-- todos los cambios en un solo UPDATE, el rechazo se llevó también los demás.
--
-- La ficha ahora ofrece la lista SI / NO, pero la regla no puede depender de
-- que cada pantalla escriba exacto. Un trigger BEFORE corre antes que el
-- CHECK: mayúsculas, sin espacios ni tilde, y vacío → NULL (no informado).
-- Lo que no se reconoce se sigue rechazando: no se adivina.

CREATE OR REPLACE FUNCTION public.normalizar_tratamiento_cuarentenario()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v text;
BEGIN
  v := upper(btrim(coalesce(NEW.tratamiento_cuarentenario, '')));
  v := replace(v, 'Í', 'I');
  NEW.tratamiento_cuarentenario := CASE
    WHEN v = '' THEN NULL
    WHEN v IN ('SI', 'S', 'YES', 'Y') THEN 'SI'
    WHEN v IN ('NO', 'N') THEN 'NO'
    ELSE NEW.tratamiento_cuarentenario  -- el CHECK lo rechaza
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS operaciones_normalizar_tratamiento_cuarentenario ON public.operaciones;
CREATE TRIGGER operaciones_normalizar_tratamiento_cuarentenario
  BEFORE INSERT OR UPDATE OF tratamiento_cuarentenario ON public.operaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.normalizar_tratamiento_cuarentenario();

-- Verificación (dentro de una transacción que se deshace):
-- BEGIN;
--   UPDATE operaciones SET tratamiento_cuarentenario = ' sí ' WHERE id = '<id>' RETURNING tratamiento_cuarentenario;  -- SI
--   UPDATE operaciones SET tratamiento_cuarentenario = ''     WHERE id = '<id>' RETURNING tratamiento_cuarentenario;  -- NULL
-- ROLLBACK;
