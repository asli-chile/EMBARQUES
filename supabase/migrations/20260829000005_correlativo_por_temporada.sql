-- ─────────────────────────────────────────────────────────────────────────────
-- Correlativo y ref_asli por temporada: cada temporada parte en A00001
--
-- Antes: `correlativo` venía de una secuencia global y `ref_asli` (A + 5 dígitos)
-- era único en toda la tabla, así que la numeración nunca se reiniciaba.
--
-- Ahora:
--   • La numeración es por temporada: la primera operación de cada temporada es A00001.
--   • La unicidad pasa a ser (temporada, correlativo) y (temporada, ref_asli), por lo
--     que A00001 puede existir una vez en cada temporada.
--   • Las operaciones ya cargadas conservan su numeración actual.
--   • Los números no se reutilizan: el contador por temporada nunca retrocede,
--     aunque se borre una operación.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Contador por temporada ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.temporadas_correlativos (
  temporada  text PRIMARY KEY,
  ultimo     integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.temporadas_correlativos IS
  'Último correlativo entregado en cada temporada. Solo lo modifican los triggers de operaciones; nunca retrocede para no reutilizar referencias.';

-- Arranca cada contador donde va la numeración existente (incluye operaciones
-- borradas: sus números quedan consumidos).
INSERT INTO public.temporadas_correlativos (temporada, ultimo)
SELECT COALESCE(NULLIF(btrim(temporada), ''), 'SIN TEMPORADA'), MAX(correlativo)
  FROM public.operaciones
 WHERE correlativo IS NOT NULL
 GROUP BY 1
ON CONFLICT (temporada) DO UPDATE
  SET ultimo = GREATEST(temporadas_correlativos.ultimo, EXCLUDED.ultimo);

-- ─── La columna deja de autonumerarse: el correlativo lo asigna el trigger ────

DO $$
DECLARE
  v_identity char;
BEGIN
  SELECT attidentity INTO v_identity
    FROM pg_attribute
   WHERE attrelid = 'public.operaciones'::regclass
     AND attname = 'correlativo';

  IF v_identity IN ('a', 'd') THEN
    ALTER TABLE public.operaciones ALTER COLUMN correlativo DROP IDENTITY IF EXISTS;
  ELSE
    ALTER TABLE public.operaciones ALTER COLUMN correlativo DROP DEFAULT;
  END IF;
END $$;

-- ─── Unicidad por temporada en vez de global ─────────────────────────────────

ALTER TABLE public.operaciones DROP CONSTRAINT IF EXISTS operaciones_correlativo_key;
ALTER TABLE public.operaciones DROP CONSTRAINT IF EXISTS operaciones_ref_asli_key;

CREATE UNIQUE INDEX IF NOT EXISTS operaciones_temporada_correlativo_key
  ON public.operaciones (temporada, correlativo);
CREATE UNIQUE INDEX IF NOT EXISTS operaciones_temporada_ref_asli_key
  ON public.operaciones (temporada, ref_asli);

-- ─── Asignación del número ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.siguiente_correlativo(p_temporada text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_num integer;
BEGIN
  INSERT INTO public.temporadas_correlativos (temporada, ultimo)
  VALUES (p_temporada, 1)
  ON CONFLICT (temporada) DO UPDATE
    SET ultimo = temporadas_correlativos.ultimo + 1,
        updated_at = now()
  RETURNING ultimo INTO v_num;

  RETURN v_num;
END;
$$;

COMMENT ON FUNCTION private.siguiente_correlativo IS
  'Entrega el siguiente correlativo de una temporada de forma atómica. La primera operación de una temporada nueva recibe 1 (A00001).';

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
    -- Mover una operación de temporada implica renumerarla en la de destino.
    IF NEW.temporada IS NULL OR btrim(NEW.temporada) = '' THEN
      NEW.temporada := OLD.temporada;
    ELSE
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
  'Asigna temporada, correlativo y ref_asli. Reemplaza a generate_ref_asli(): la numeración ahora es por temporada.';

-- El trigger anterior numeraba con la secuencia global.
DROP FUNCTION IF EXISTS public.generate_ref_asli() CASCADE;

DROP TRIGGER IF EXISTS trg_operaciones_correlativo_temporada ON public.operaciones;
CREATE TRIGGER trg_operaciones_correlativo_temporada
  BEFORE INSERT OR UPDATE OF temporada, correlativo ON public.operaciones
  FOR EACH ROW EXECUTE FUNCTION private.operaciones_correlativo_temporada();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- Lectura para mostrar la próxima referencia en Configuración → Temporadas.
-- La escritura ocurre solo dentro de las funciones SECURITY DEFINER.

ALTER TABLE public.temporadas_correlativos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS temporadas_correlativos_select_auth ON public.temporadas_correlativos;
CREATE POLICY temporadas_correlativos_select_auth
  ON public.temporadas_correlativos FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.temporadas_correlativos TO authenticated;
GRANT EXECUTE ON FUNCTION private.siguiente_correlativo(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.operaciones_correlativo_temporada() TO authenticated;
