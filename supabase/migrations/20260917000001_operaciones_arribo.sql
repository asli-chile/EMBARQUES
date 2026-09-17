-- Registrar el arribo a destino desde la pantalla de seguimiento.
--
-- `arribo_confirmado` existe desde 20260828000002 y media docena de lugares lo
-- leen: la etapa ARRIBADO de NaviTrack, el progreso al 100 %, el corte del
-- chequeo diario que deja de gastar créditos en una carga que ya llegó. Pero
-- **ninguna pantalla lo escribía**: la columna quedó huérfana y el arribo solo
-- podía anotarse a mano en la base.
--
-- Estas tres columnas son lo que falta para que la ventana de NaviTrack pueda
-- contar las dos cosas que ocurren en destino, que no son la misma:
--
--   arribo_anunciado_at  la naviera dijo para cuándo llega. Todavía no pasó:
--                        no apaga el seguimiento ni da la carga por llegada.
--   arribo_at            llegó de verdad, y en qué fecha. Va junto con
--                        arribo_confirmado = true.
--
-- El arribo **no es un estado del flujo** y esto no lo cambia (ver
-- FLUJO-DE-TRABAJO.md §4.11): la operación se cierra con el fullset y los
-- documentos físicos, y una carga puede llegar a destino estando ya en
-- DOCUMENTACION_EN_REVISION. Por eso es un eje aparte de `estado_operacion`, y
-- en Mis Reservas y Registros se muestra al lado del estado, no en su lugar.

ALTER TABLE public.operaciones
  ADD COLUMN IF NOT EXISTS arribo_at timestamptz,
  ADD COLUMN IF NOT EXISTS arribo_anunciado_at timestamptz,
  ADD COLUMN IF NOT EXISTS arribo_registrado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.operaciones.arribo_at IS
  'Fecha en que la carga llegó a destino. Acompaña a arribo_confirmado = true. NULL = no ha llegado.';
COMMENT ON COLUMN public.operaciones.arribo_anunciado_at IS
  'Llegada a destino anunciada por la naviera, todavía no ocurrida. No apaga el seguimiento.';
COMMENT ON COLUMN public.operaciones.arribo_registrado_por IS
  'Quién registró el arribo. Se conserva por el mismo motivo que decidido_por en las recaladas: silencia preguntas y conviene saber quién lo dijo.';

-- Las que ya estaban confirmadas sin fecha (las que venían del estado ARRIBADO
-- legado) se dejan como están: no hay dato que inventarles, y un arribo sin
-- fecha es más honesto que una fecha falsa.

-- Verificación: debe devolver las tres columnas.
-- SELECT column_name, data_type FROM information_schema.columns
--  WHERE table_schema = 'public' AND table_name = 'operaciones'
--    AND column_name IN ('arribo_at', 'arribo_anunciado_at', 'arribo_registrado_por');
