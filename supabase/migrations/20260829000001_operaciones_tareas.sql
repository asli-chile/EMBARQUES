-- ─────────────────────────────────────────────────────────────────────────────
-- Tareas por operación
--
-- Pieza base del flujo: convierte en tareas con responsable y plazo lo que hoy
-- solo existe como documento esperado o como recordatorio en la cabeza del
-- ejecutivo (gate out, DUS, SPS, rescate del BL, revisión documental, fullset,
-- aviso de arribo).
--
-- Las tareas se generan automáticamente al entrar a un estado, según la
-- plantilla `operaciones_tareas_plantilla`. Así los plazos son dato, no código:
-- la meta de 5 días para el BL se cambia editando una fila.
--
-- Ver FLUJO-DE-TRABAJO.md §13.3. Requiere 20260828000001 y 20260828000002.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Tabla de tareas ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.operaciones_tareas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operacion_id uuid NOT NULL REFERENCES public.operaciones(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  titulo text NOT NULL,
  estado text NOT NULL DEFAULT 'PENDIENTE',
  responsable_usuario_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  responsable_externo text,
  fecha_limite timestamptz,
  origen text NOT NULL DEFAULT 'manual',
  estado_origen text REFERENCES public.operaciones_estados(codigo),
  notas text,
  completada_at timestamptz,
  completada_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

COMMENT ON TABLE public.operaciones_tareas IS
  'Tareas de una operación, con responsable y plazo. Base de las alertas y del ciclo de revisión documental.';
COMMENT ON COLUMN public.operaciones_tareas.responsable_externo IS
  'Responsable que no es usuario del sistema: agencia de aduana, planta, forwarder, Transportes ASLI.';
COMMENT ON COLUMN public.operaciones_tareas.estado_origen IS
  'Estado de la operación que generó la tarea. Null en tareas creadas a mano.';

ALTER TABLE public.operaciones_tareas
  DROP CONSTRAINT IF EXISTS operaciones_tareas_estado_check;
ALTER TABLE public.operaciones_tareas
  ADD CONSTRAINT operaciones_tareas_estado_check
  CHECK (estado IN ('PENDIENTE', 'EN_CURSO', 'COMPLETADA', 'CANCELADA', 'VENCIDA'));

ALTER TABLE public.operaciones_tareas
  DROP CONSTRAINT IF EXISTS operaciones_tareas_origen_check;
ALTER TABLE public.operaciones_tareas
  ADD CONSTRAINT operaciones_tareas_origen_check
  CHECK (origen IN ('automatica', 'manual'));

CREATE INDEX IF NOT EXISTS operaciones_tareas_operacion_id_idx
  ON public.operaciones_tareas (operacion_id, created_at DESC);

CREATE INDEX IF NOT EXISTS operaciones_tareas_pendientes_idx
  ON public.operaciones_tareas (fecha_limite)
  WHERE estado IN ('PENDIENTE', 'EN_CURSO');

CREATE INDEX IF NOT EXISTS operaciones_tareas_responsable_idx
  ON public.operaciones_tareas (responsable_usuario_id, estado);

-- Una tarea automática por tipo y operación: evita duplicados si la operación
-- vuelve a pasar por el mismo estado.
CREATE UNIQUE INDEX IF NOT EXISTS operaciones_tareas_automatica_unica_idx
  ON public.operaciones_tareas (operacion_id, tipo)
  WHERE origen = 'automatica';

-- ─── Plantilla de generación ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.operaciones_tareas_plantilla (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estado_codigo text NOT NULL REFERENCES public.operaciones_estados(codigo) ON DELETE CASCADE,
  tipo text NOT NULL,
  titulo text NOT NULL,
  responsable_rol text,
  responsable_externo text,
  dias_plazo integer,
  base_plazo text NOT NULL DEFAULT 'entrada_estado',
  activo boolean NOT NULL DEFAULT true,
  UNIQUE (estado_codigo, tipo)
);

COMMENT ON TABLE public.operaciones_tareas_plantilla IS
  'Qué tareas se crean al entrar a cada estado, con su responsable y plazo en días.';
COMMENT ON COLUMN public.operaciones_tareas_plantilla.responsable_rol IS
  'ejecutivo = el ejecutivo a cargo de la operación. Null cuando el responsable es externo.';
COMMENT ON COLUMN public.operaciones_tareas_plantilla.base_plazo IS
  'Desde qué fecha se cuenta dias_plazo: entrada_estado, etd o eta.';

ALTER TABLE public.operaciones_tareas_plantilla
  DROP CONSTRAINT IF EXISTS operaciones_tareas_plantilla_base_check;
ALTER TABLE public.operaciones_tareas_plantilla
  ADD CONSTRAINT operaciones_tareas_plantilla_base_check
  CHECK (base_plazo IN ('entrada_estado', 'etd', 'eta'));

INSERT INTO public.operaciones_tareas_plantilla
  (estado_codigo, tipo, titulo, responsable_rol, responsable_externo, dias_plazo, base_plazo) VALUES
  -- Fase 2: distribución del instructivo y solicitudes a la agencia
  ('EMBARQUE_EN_COORDINACION', 'ENVIAR_INSTRUCTIVO_PLANTA', 'Enviar instructivo y condiciones a la planta', 'ejecutivo', NULL, 1, 'entrada_estado'),
  ('EMBARQUE_EN_COORDINACION', 'SOLICITAR_GATE_OUT', 'Solicitar pago de gate out a la agencia', NULL, 'Agente de aduana', 2, 'entrada_estado'),
  ('EMBARQUE_EN_COORDINACION', 'SOLICITAR_DUS', 'Solicitar DUS a la agencia', NULL, 'Agente de aduana', 3, 'entrada_estado'),
  ('EMBARQUE_EN_COORDINACION', 'SOLICITAR_SPS', 'Solicitar SPS a la agencia (si corresponde)', NULL, 'Agente de aduana', 3, 'entrada_estado'),
  -- Fase 4: documentación de la carga
  ('CARGADA', 'RECIBIR_GUIA_PACKING', 'Recibir guía de despacho y packing list de la planta', NULL, 'Planta', 1, 'entrada_estado'),
  ('CARGADA', 'EMITIR_PROFORMA', 'Confeccionar factura proforma y enviarla a Finanzas', 'ejecutivo', NULL, 2, 'entrada_estado'),
  -- Fase 5: meta de servicio de 5 días para el BL
  ('ZARPADA', 'RESCATAR_BL', 'Rescatar el BL desde la agencia', 'ejecutivo', NULL, 5, 'entrada_estado'),
  ('ZARPADA', 'SOLICITAR_FACTURA_COMERCIAL', 'Solicitar factura comercial a Finanzas', 'ejecutivo', NULL, 5, 'entrada_estado'),
  ('ZARPADA', 'AVISAR_ARRIBO', 'Informar al cliente el arribo de la nave a destino', 'ejecutivo', NULL, 0, 'eta'),
  -- Fase 6: revisión documental
  ('DOCUMENTACION_EN_REVISION', 'REVISAR_DOCUMENTOS', 'Revisar BL, certificados y demás documentos', 'ejecutivo', NULL, 2, 'entrada_estado'),
  ('VB_DOCUMENTAL', 'LEGALIZAR_DUS', 'Solicitar a la agencia la legalización del DUS', NULL, 'Agente de aduana', 3, 'entrada_estado'),
  -- Fase 7: cierre
  ('DUS_LEGALIZADO', 'ENVIAR_FULLSET', 'Confeccionar y enviar el fullset al cliente y consignatario', 'ejecutivo', NULL, 2, 'entrada_estado'),
  ('FULLSET_ENVIADO', 'ENVIAR_DOCS_FISICOS', 'Solicitar a la agencia el envío de documentos físicos', NULL, 'Agente de aduana', 3, 'entrada_estado')
ON CONFLICT (estado_codigo, tipo) DO UPDATE SET
  titulo              = EXCLUDED.titulo,
  responsable_rol     = EXCLUDED.responsable_rol,
  responsable_externo = EXCLUDED.responsable_externo,
  dias_plazo          = EXCLUDED.dias_plazo,
  base_plazo          = EXCLUDED.base_plazo;

-- ─── Generación automática al cambiar de estado ──────────────────────────────

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
  IF NEW.estado_operacion IS NOT DISTINCT FROM OLD.estado_operacion THEN
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
  'Crea las tareas de la plantilla al entrar a un estado. No duplica si la tarea automática ya existe.';

DROP TRIGGER IF EXISTS operaciones_generar_tareas ON public.operaciones;
CREATE TRIGGER operaciones_generar_tareas
  AFTER UPDATE OF estado_operacion ON public.operaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.operaciones_generar_tareas();

-- ─── Cierre de tarea ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.operaciones_tareas_marcar_completada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.estado = 'COMPLETADA' AND OLD.estado <> 'COMPLETADA' THEN
    NEW.completada_at := now();
    NEW.completada_por := auth.uid();
  ELSIF NEW.estado <> 'COMPLETADA' THEN
    NEW.completada_at := NULL;
    NEW.completada_por := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS operaciones_tareas_completada ON public.operaciones_tareas;
CREATE TRIGGER operaciones_tareas_completada
  BEFORE UPDATE OF estado ON public.operaciones_tareas
  FOR EACH ROW
  EXECUTE FUNCTION public.operaciones_tareas_marcar_completada();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.operaciones_tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operaciones_tareas_plantilla ENABLE ROW LEVEL SECURITY;

-- Staff ve y gestiona todo; ejecutivo y cliente quedan acotados a las empresas
-- que tienen asignadas, igual que en operaciones_cambios.
DROP POLICY IF EXISTS tareas_select ON public.operaciones_tareas;
CREATE POLICY tareas_select
  ON public.operaciones_tareas FOR SELECT TO authenticated
  USING (
    private.is_admin_or_staff()
    OR EXISTS (
      SELECT 1 FROM public.operaciones o
      WHERE o.id = operaciones_tareas.operacion_id
        AND o.cliente IS NOT NULL
        AND o.cliente = ANY (private.get_cliente_nombres_for_user())
    )
  );

DROP POLICY IF EXISTS tareas_insert ON public.operaciones_tareas;
CREATE POLICY tareas_insert
  ON public.operaciones_tareas FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin_or_staff()
    OR (
      private.is_ejecutivo()
      AND EXISTS (
        SELECT 1 FROM public.operaciones o
        WHERE o.id = operaciones_tareas.operacion_id
          AND o.cliente IS NOT NULL
          AND o.cliente = ANY (private.get_cliente_nombres_for_user())
      )
    )
  );

DROP POLICY IF EXISTS tareas_update ON public.operaciones_tareas;
CREATE POLICY tareas_update
  ON public.operaciones_tareas FOR UPDATE TO authenticated
  USING (
    private.is_admin_or_staff()
    OR (
      private.is_ejecutivo()
      AND EXISTS (
        SELECT 1 FROM public.operaciones o
        WHERE o.id = operaciones_tareas.operacion_id
          AND o.cliente IS NOT NULL
          AND o.cliente = ANY (private.get_cliente_nombres_for_user())
      )
    )
  )
  WITH CHECK (
    private.is_admin_or_staff()
    OR (
      private.is_ejecutivo()
      AND EXISTS (
        SELECT 1 FROM public.operaciones o
        WHERE o.id = operaciones_tareas.operacion_id
          AND o.cliente IS NOT NULL
          AND o.cliente = ANY (private.get_cliente_nombres_for_user())
      )
    )
  );

DROP POLICY IF EXISTS tareas_delete_staff ON public.operaciones_tareas;
CREATE POLICY tareas_delete_staff
  ON public.operaciones_tareas FOR DELETE TO authenticated
  USING (private.is_admin_or_staff());

DROP POLICY IF EXISTS plantilla_select_auth ON public.operaciones_tareas_plantilla;
CREATE POLICY plantilla_select_auth
  ON public.operaciones_tareas_plantilla FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS plantilla_write_superadmin ON public.operaciones_tareas_plantilla;
CREATE POLICY plantilla_write_superadmin
  ON public.operaciones_tareas_plantilla FOR ALL TO authenticated
  USING (private.is_superadmin())
  WITH CHECK (private.is_superadmin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operaciones_tareas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operaciones_tareas_plantilla TO authenticated;
