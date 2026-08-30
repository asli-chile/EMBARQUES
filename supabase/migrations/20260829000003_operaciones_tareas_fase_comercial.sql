-- ─────────────────────────────────────────────────────────────────────────────
-- Tareas de la fase comercial
--
-- La plantilla de 20260829000001 arrancaba en EMBARQUE_EN_COORDINACION, porque
-- el levantamiento se centró en el trabajo de coordinación. Eso dejaba sin
-- tareas la fase 1 del flujo: una reserva recién creada no mostraba nada que
-- hacer, aun teniendo trabajo pendiente evidente.
--
-- No genera tareas para las operaciones históricas que ya están en
-- RESERVA_CONFIRMADA: el trigger solo actúa al crear la operación o al cambiar
-- de estado, y esas ya están quietas.
--
-- Ver FLUJO-DE-TRABAJO.md §4 fase 1 y §13.3. Requiere 20260829000001.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.operaciones_tareas_plantilla
  (estado_codigo, tipo, titulo, responsable_rol, responsable_externo, dias_plazo, base_plazo) VALUES
  -- Fase 1: cotización y reserva con la naviera
  ('SOLICITADA', 'COTIZAR_SOLICITUD', 'Cotizar y responder la solicitud al cliente', 'ejecutivo', NULL, 1, 'entrada_estado'),
  ('SOLICITADA', 'SOLICITAR_RESERVA_NAVIERA', 'Solicitar la reserva a la naviera', 'ejecutivo', NULL, 1, 'entrada_estado'),
  -- Fase 1 cerrada: confirmación al cliente y arranque del transporte terrestre
  ('RESERVA_CONFIRMADA', 'CONFIRMAR_AL_CLIENTE', 'Enviar la confirmación de reserva al cliente', 'ejecutivo', NULL, 1, 'entrada_estado'),
  ('RESERVA_CONFIRMADA', 'COORDINAR_TRANSPORTE', 'Coordinar el transporte terrestre', 'ejecutivo', NULL, 2, 'entrada_estado')
ON CONFLICT (estado_codigo, tipo) DO UPDATE SET
  titulo              = EXCLUDED.titulo,
  responsable_rol     = EXCLUDED.responsable_rol,
  responsable_externo = EXCLUDED.responsable_externo,
  dias_plazo          = EXCLUDED.dias_plazo,
  base_plazo          = EXCLUDED.base_plazo;
