-- Ampliar lo que normaliza tratamiento_cuarentenario.
--
-- 20260928000004 reconocía SI/NO y el vacío. El 29-09-2026 volvió a fallar un
-- guardado de la ficha de Mis Reservas en A00053 con
-- "violates check constraint operaciones_tratamiento_cuarentenario_chk": la
-- ficha (todavía con texto libre en producción) mandó un valor que no era
-- ninguno de esos. Por las capturas, se escribe "-" para "sin dato".
--
-- La ficha pasa a un desplegable cerrado, pero la base no debe depender de
-- eso: la importación y cualquier otra vía también escriben aquí.
--   "-", "—", "N/A", "NA"                 → NULL (no informado)
--   "SIN TRATAMIENTO", "NO APLICA"        → NO (mismo vocabulario que ya usa
--                                           tratamiento_frio en la base)
-- Lo demás sigue igual: lo que no se reconoce lo rechaza el CHECK.

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
    WHEN v IN ('', '-', '—', '–', 'N/A', 'NA') THEN NULL
    WHEN v IN ('SI', 'S', 'YES', 'Y') THEN 'SI'
    WHEN v IN ('NO', 'N', 'SIN TRATAMIENTO', 'NO APLICA') THEN 'NO'
    ELSE NEW.tratamiento_cuarentenario  -- el CHECK lo rechaza
  END;
  RETURN NEW;
END;
$$;
