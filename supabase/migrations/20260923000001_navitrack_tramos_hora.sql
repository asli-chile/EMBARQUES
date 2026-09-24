-- NaviTrack — la hora del transbordo, cuando la naviera la da.
--
-- `navitrack_tramos.etd` y `.eta` son `date`: guardan el día del transbordo y
-- nada más. La naviera suele anunciar día **y hora**, y en UTC, así que esa
-- hora se estaba perdiendo al guardar.
--
-- Importa porque el anuncio casi nunca se cumple: el atraque depende del clima
-- y de que haya sitio en el puerto, así que un buque anunciado en Italia el 20
-- a las 14:00 puede entrar el 19 o el 21. Es una estimación que después hay que
-- contrastar con lo que muestra el AIS, y sin la hora esa comparación solo
-- puede hacerse por día: un desvío de trece horas se ve como "llegó al día
-- siguiente" o no se ve en absoluto.
--
-- ─── Por qué dos columnas y no un timestamp ──────────────────────────────────
--
-- La hora es **opcional**: a veces la naviera da día y hora, y a veces solo el
-- día. Con una sola columna `timestamptz` no hay forma de distinguir "el 20 a
-- las 00:00" de "el 20, hora desconocida" — las dos se guardan igual.
--
-- Eso no es un detalle de forma. Si no se distinguen, el formulario obliga a
-- poner una hora para poder guardar, la gente escribe "12:00" para salir del
-- paso, y ese dato inventado después ensucia justo la comparación que estas
-- columnas existen para permitir.
--
-- Con la hora aparte, `NULL` dice lo que hay que decir: no la dieron. La
-- comparación con el AIS se hace por día en ese caso, y por hora cuando está.
--
-- Tampoco se convierten las columnas existentes, que es la otra ventaja: pasar
-- un `date` a `timestamptz` lo sitúa a medianoche UTC, y en Chile eso se lee
-- como el día anterior. Los cinco tramos ya cargados siguen intactos.

ALTER TABLE public.navitrack_tramos
  ADD COLUMN IF NOT EXISTS etd_hora time,
  ADD COLUMN IF NOT EXISTS eta_hora time;

COMMENT ON COLUMN public.navitrack_tramos.etd_hora IS
  'Hora UTC de zarpe anunciada por la naviera. NULL = solo se sabe el día. Va junto a etd.';
COMMENT ON COLUMN public.navitrack_tramos.eta_hora IS
  'Hora UTC de llegada anunciada por la naviera. NULL = solo se sabe el día. Va junto a eta.';

-- Lo anunciado no se pisa nunca con lo que pasó de verdad: es la promesa contra
-- la que se mide. La llegada real ya vive en navitrack_recaladas.recalado_at.
COMMENT ON COLUMN public.navitrack_tramos.eta IS
  'Día de llegada ANUNCIADO por la naviera (con eta_hora, en UTC). No se actualiza con la llegada real: esa la registra el AIS en navitrack_recaladas.recalado_at, y la diferencia entre ambas es el dato que interesa.';

-- Verificación: deben aparecer las dos columnas nuevas, tipo "time without time zone".
-- SELECT column_name, data_type FROM information_schema.columns
--  WHERE table_name = 'navitrack_tramos' AND column_name IN ('etd_hora','eta_hora');
