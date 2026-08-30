-- ─────────────────────────────────────────────────────────────────────────────
-- Tareas también al crear la operación
--
-- Corrige una omisión de 20260829000001: el trigger se declaró como
-- AFTER UPDATE OF estado_operacion, así que solo reaccionaba cuando una
-- operación cambiaba de estado. Una reserva nueva no cambia de estado, nace
-- con uno, de modo que nunca generaba sus tareas iniciales.
--
-- La función pasa a servir INSERT y UPDATE. En INSERT no existe OLD, así que la
-- comparación con el estado anterior solo aplica en UPDATE.
--
-- Ver FLUJO-DE-TRABAJO.md §13.3. Requiere 20260829000001.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.operaciones_generar_tareas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_plantilla record;
  v_responsable uuid;
  v_base timestamptz;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.estado_operacion IS NOT DISTINCT FROM OLD.estado_operacion THEN
    RETURN NEW;
  END IF;

  IF NEW.estado_operacion IS NULL THEN
    RETURN NEW;
  END IF;

  FOR v_plantilla IN
    SELECT * FROM public.operaciones_tareas_plantilla
    WHERE estado_codigo = NEW.estado_operacion AND activo
  LOOP
    v_responsable := NULL;

    IF v_plantilla.responsable_rol = 'ejecutivo' AND NEW.ejecutivo IS NOT NULL THEN
      SELECT u.id INTO v_responsable
      FROM public.usuarios u
      WHERE u.activo = true
        AND lower(btrim(u.nombre)) = lower(btrim(NEW.ejecutivo))
      LIMIT 1;
    END IF;

    v_base := CASE v_plantilla.base_plazo
      WHEN 'etd' THEN NEW.etd::timestamptz
      WHEN 'eta' THEN NEW.eta::timestamptz
      ELSE now()
    END;

    INSERT INTO public.operaciones_tareas (
      operacion_id, tipo, titulo, responsable_usuario_id, responsable_externo,
      fecha_limite, origen, estado_origen
    ) VALUES (
      NEW.id,
      v_plantilla.tipo,
      v_plantilla.titulo,
      v_responsable,
      v_plantilla.responsable_externo,
      CASE
        WHEN v_base IS NULL OR v_plantilla.dias_plazo IS NULL THEN NULL
        ELSE v_base + make_interval(days => v_plantilla.dias_plazo)
      END,
      'automatica',
      NEW.estado_operacion
    )
    ON CONFLICT (operacion_id, tipo) WHERE origen = 'automatica' DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.operaciones_generar_tareas IS
  'Crea las tareas de la plantilla al crear la operación y al entrar a un estado nuevo. No duplica si la tarea automática ya existe.';

-- El trigger de UPDATE se mantiene; se agrega uno de INSERT. Se separan porque
-- `OF estado_operacion` no es válido en un trigger de INSERT.
DROP TRIGGER IF EXISTS operaciones_generar_tareas_alta ON public.operaciones;
CREATE TRIGGER operaciones_generar_tareas_alta
  AFTER INSERT ON public.operaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.operaciones_generar_tareas();
