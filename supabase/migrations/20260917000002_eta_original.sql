-- El ETA prometido el día de la reserva, congelado.
--
-- `operaciones.eta` es una sola columna mutable y no había historial de sus
-- cambios: `operaciones_cambios` existe desde 20260820000003 pero solo registra
-- lo que se edita a mano en la grilla, y hasta hoy no tenía **ninguna** fila de
-- `eta` — las 45 que hay son todas de `estado_operacion`.
--
-- Eso hacía imposible la única comparación que interesa. Cuando la naviera
-- reprograma, alguien actualiza `eta` y la promesa anterior desaparece: medir
-- el arribo real contra ese valor da siempre una desviación cercana a cero.
-- Mide si avisaron, no si cumplieron.
--
-- `eta_original` es la primera fecha de llegada que se supo de ese embarque, y
-- no se vuelve a tocar por el camino normal: el trigger la escribe una vez y
-- las actualizaciones de `eta` no la miran. Es el cero contra el que se cuenta
-- el desvío en días —negativo si llegó antes, positivo si llegó después—.

ALTER TABLE public.operaciones
  ADD COLUMN IF NOT EXISTS eta_original date,
  ADD COLUMN IF NOT EXISTS eta_original_heredada boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.operaciones.eta_original IS
  'Primera fecha de llegada conocida del embarque: la promesa de la reserva. La escribe un trigger y no la pisan las actualizaciones de eta.';
COMMENT ON COLUMN public.operaciones.eta_original_heredada IS
  'true = se rellenó con el eta vigente al crear la columna, no es la promesa original. Ver 20260917000002.';

-- ─── Congelar y auditar ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.operaciones_eta_original()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_nombre text;
  v_email  text;
BEGIN
  /*
   * La promesa es la primera fecha que se supo, no necesariamente la del alta.
   *
   * Muchas reservas se crean sin ETA y se completan al día siguiente, cuando la
   * naviera confirma. Tomar solo el INSERT dejaría esas en null para siempre.
   */
  IF NEW.eta_original IS NULL AND NEW.eta IS NOT NULL THEN
    NEW.eta_original := NEW.eta;
    NEW.eta_original_heredada := false;
  END IF;

  /*
   * Cada reprogramación queda registrada.
   *
   * Va en el trigger y no en la pantalla a propósito: `eta` se escribe desde la
   * grilla, desde Mis Reservas, desde las importaciones y desde endpoints con
   * `service_role`. Auditarlo en el cliente solo habría cubierto el primero, que
   * es justo lo que pasó con `operaciones_cambios` hasta ahora.
   */
  IF TG_OP = 'UPDATE' AND NEW.eta IS DISTINCT FROM OLD.eta THEN
    SELECT u.nombre, u.email INTO v_nombre, v_email
      FROM public.usuarios u
     WHERE u.auth_id = auth.uid()
     LIMIT 1;

    INSERT INTO public.operaciones_cambios
      (operacion_id, campo, valor_anterior, valor_nuevo, usuario_auth_id, usuario_nombre, usuario_email)
    VALUES
      (NEW.id, 'eta', OLD.eta::text, NEW.eta::text, auth.uid(), v_nombre, v_email);
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.operaciones_eta_original() IS
  'Congela eta_original la primera vez que se conoce un eta, y registra cada cambio de eta en operaciones_cambios.';

DROP TRIGGER IF EXISTS operaciones_eta_original_trg ON public.operaciones;
CREATE TRIGGER operaciones_eta_original_trg
  BEFORE INSERT OR UPDATE OF eta, eta_original ON public.operaciones
  FOR EACH ROW EXECUTE FUNCTION public.operaciones_eta_original();

-- ─── Lo que ya existe ────────────────────────────────────────────────────────
--
-- No se puede recuperar lo que nunca se guardó: a las operaciones actuales se
-- les pone el eta vigente y se las marca como heredadas. Las pantallas tienen
-- que decirlo, porque un desvío calculado sobre una fecha ya revisada parece un
-- cumplimiento y no lo es.

UPDATE public.operaciones
   SET eta_original = eta,
       eta_original_heredada = true
 WHERE eta_original IS NULL
   AND eta IS NOT NULL;

CREATE INDEX IF NOT EXISTS operaciones_eta_original_idx
  ON public.operaciones (eta_original)
  WHERE deleted_at IS NULL;

-- Verificación: heredadas = las que ya existían; propias = las creadas después.
-- SELECT count(*) FILTER (WHERE eta_original_heredada) AS heredadas,
--        count(*) FILTER (WHERE eta_original IS NOT NULL AND NOT eta_original_heredada) AS propias,
--        count(*) FILTER (WHERE eta_original IS NULL) AS sin_eta
--   FROM public.operaciones WHERE deleted_at IS NULL;
