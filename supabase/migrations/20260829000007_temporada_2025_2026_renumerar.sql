-- ─────────────────────────────────────────────────────────────────────────────
-- Unifica los valores heredados de temporada y renumera la temporada 2025-2026
--
-- La importación dejó cuatro textos distintos para lo que en realidad es una
-- sola temporada, y sus correlativos se solapan (no eran únicos globalmente,
-- solo dentro de cada grupo):
--   CHERRY 25-26 → 622 operaciones, correlativos 1–645
--   2026         → 324 operaciones, correlativos 646–973
--   TEMP 25-26   →  27 operaciones, correlativos 991–1017
--   2025-2026    →   8 operaciones, correlativos 1–8
--
-- Por ese solape hay que renumerar ANTES de unificar: si primero se cambia la
-- temporada, dos operaciones distintas caen en (2025-2026, 1) y el índice único
-- `operaciones_temporada_correlativo_key` rechaza el cambio.
--
-- Orden seguro:
--   1. Numerar todo con valores negativos únicos (no chocan con nada).
--   2. Unificar la temporada, ya sin riesgo de colisión.
--   3. Pasar los números a positivo y construir ref_asli.
--
-- Nota: la referencia solo se usa para mostrar y para nombrar documentos
-- generados; los archivos en storage se guardan por `operaciones.id`, así que
-- renumerar no rompe enlaces.
-- ─────────────────────────────────────────────────────────────────────────────

-- El trigger renumeraría por su cuenta al cambiar la temporada fila por fila.
ALTER TABLE public.operaciones DISABLE TRIGGER trg_operaciones_correlativo_temporada;

-- ─── 1. Numeración provisoria en negativo, en orden de ingreso ───────────────
-- Se incluyen las operaciones borradas: sus números quedan consumidos.
-- ref_asli pasa a un valor temporal único para no chocar con el índice
-- (temporada, ref_asli) mientras se renumera.

WITH orden AS (
  SELECT id,
         ROW_NUMBER() OVER (
           ORDER BY ingreso ASC NULLS LAST, created_at ASC NULLS LAST, id ASC
         ) AS n
    FROM public.operaciones
)
UPDATE public.operaciones o
   SET correlativo = -orden.n,
       ref_asli    = 'TMP-' || o.id::text
  FROM orden
 WHERE orden.id = o.id;

-- ─── 2. Todo pasa a la temporada 2025-2026 ───────────────────────────────────

UPDATE public.operaciones
   SET temporada = '2025-2026'
 WHERE temporada IS DISTINCT FROM '2025-2026';

-- ─── 3. Números definitivos: A00001, A00002, … ───────────────────────────────

UPDATE public.operaciones
   SET correlativo = -correlativo,
       ref_asli    = 'A' || LPAD((-correlativo)::text, 5, '0')
 WHERE correlativo < 0;

-- ─── 4. Contador de la temporada ─────────────────────────────────────────────

DELETE FROM public.temporadas_correlativos WHERE temporada <> '2025-2026';

INSERT INTO public.temporadas_correlativos (temporada, ultimo)
SELECT '2025-2026', COALESCE(MAX(correlativo), 0)
  FROM public.operaciones
 WHERE temporada = '2025-2026'
ON CONFLICT (temporada) DO UPDATE
  SET ultimo = EXCLUDED.ultimo,
      updated_at = now();

ALTER TABLE public.operaciones ENABLE TRIGGER trg_operaciones_correlativo_temporada;
