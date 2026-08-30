-- ─────────────────────────────────────────────────────────────────────────────
-- Renombrar una temporada no debe renumerar sus operaciones
--
-- Problema que corrige:
--   `trg_operaciones_correlativo_temporada` (migración 20260829000005) renumera
--   una operación cada vez que cambia `operaciones.temporada`, porque asume que
--   ese cambio significa MOVER la operación a otra temporada.
--
--   La propagación del renombre (migración 20260829000009) también cambia
--   `operaciones.temporada`, así que disparaba esa renumeración: cada renombre
--   consumía un bloque nuevo de correlativos y reescribía todos los ref_asli,
--   como si las operaciones se hubieran duplicado en otra temporada.
--
-- Solución:
--   La propagación marca la transacción con `app.temporada_renombrando` y el
--   trigger de correlativos, al verla, deja el número intacto. Renombrar pasa a
--   ser solo un cambio de etiqueta; mover una operación sigue renumerando.
--
-- El flag es local a la transacción (tercer argumento de set_config en true),
-- así que no puede filtrarse a otras operaciones de la misma sesión.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.temporadas_propagar_nombre()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.nombre IS DISTINCT FROM OLD.nombre THEN
    PERFORM set_config('app.temporada_renombrando', '1', true);

    UPDATE public.operaciones
       SET temporada = NEW.nombre
     WHERE temporada = OLD.nombre
        OR lower(btrim(temporada)) = lower(btrim(OLD.nombre));

    -- El contador viaja con el nombre: si no, la temporada renombrada volvería
    -- a numerar desde 1 y repetiría referencias ya entregadas.
    UPDATE public.temporadas_correlativos c
       SET ultimo = GREATEST(c.ultimo, viejo.ultimo),
           updated_at = now()
      FROM public.temporadas_correlativos viejo
     WHERE c.temporada = NEW.nombre
       AND viejo.temporada = OLD.nombre;

    INSERT INTO public.temporadas_correlativos (temporada, ultimo)
    SELECT NEW.nombre, ultimo
      FROM public.temporadas_correlativos
     WHERE temporada = OLD.nombre
    ON CONFLICT (temporada) DO NOTHING;

    DELETE FROM public.temporadas_correlativos WHERE temporada = OLD.nombre;

    PERFORM set_config('app.temporada_renombrando', '', true);
  END IF;
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION private.temporadas_propagar_nombre() IS
  'Al renombrar una temporada, mueve sus operaciones y su contador al nombre nuevo sin renumerarlas.';

CREATE OR REPLACE FUNCTION private.operaciones_correlativo_temporada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_activa text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Sin temporada explícita, la operación entra en la temporada activa.
    IF NEW.temporada IS NULL OR btrim(NEW.temporada) = '' THEN
      SELECT nombre INTO v_activa FROM public.temporadas WHERE activa LIMIT 1;
      NEW.temporada := COALESCE(v_activa, 'SIN TEMPORADA');
    END IF;

    IF NEW.correlativo IS NULL THEN
      NEW.correlativo := private.siguiente_correlativo(NEW.temporada);
    ELSE
      -- Correlativo explícito (importaciones): se respeta y el contador avanza.
      INSERT INTO public.temporadas_correlativos (temporada, ultimo)
      VALUES (NEW.temporada, NEW.correlativo)
      ON CONFLICT (temporada) DO UPDATE
        SET ultimo = GREATEST(temporadas_correlativos.ultimo, EXCLUDED.ultimo),
            updated_at = now();
    END IF;

  ELSIF NEW.temporada IS DISTINCT FROM OLD.temporada THEN
    IF COALESCE(current_setting('app.temporada_renombrando', true), '') = '1' THEN
      -- La temporada se renombró: la operación no se movió, conserva su número.
      NULL;
    ELSIF NEW.temporada IS NULL OR btrim(NEW.temporada) = '' THEN
      NEW.temporada := OLD.temporada;
    ELSE
      -- Mover una operación de temporada implica renumerarla en la de destino.
      NEW.correlativo := private.siguiente_correlativo(NEW.temporada);
    END IF;
  END IF;

  IF NEW.correlativo IS NOT NULL THEN
    NEW.ref_asli := 'A' || LPAD(NEW.correlativo::text, 5, '0');
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION private.operaciones_correlativo_temporada IS
  'Asigna temporada, correlativo y ref_asli por temporada. No renumera cuando el cambio de temporada viene de un renombre.';
