-- ============================================================================
-- Reservas de transporte externas: vínculo real con la operación
-- ============================================================================
--
-- `transportes_reservas_ext` no tenía ninguna referencia a `operaciones`: el
-- cruce se hacía comparando el TEXTO del booking con `.limit(1)`, así que dos
-- operaciones con el mismo booking podían intercambiar instructivo y PDF de
-- booking, y cualquier corrección hecha en la operación no llegaba nunca a la
-- reserva externa (los datos del embarque estaban copiados a mano).
--
-- Ver FLUJO-DE-TRABAJO.md §11 (tablas sin relación).

ALTER TABLE public.transportes_reservas_ext
  ADD COLUMN IF NOT EXISTS operacion_id uuid REFERENCES public.operaciones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transportes_reservas_ext_operacion_id
  ON public.transportes_reservas_ext(operacion_id);

-- ─── Backfill del histórico ──────────────────────────────────────────────────
-- Solo se vinculan las reservas cuyo booking identifica UNA sola operación
-- viva. Si hay ambigüedad (mismo booking en varias operaciones) se deja en
-- NULL a propósito: es mejor que la reserva quede marcada como no vinculada
-- que apuntar a la operación equivocada.

UPDATE public.transportes_reservas_ext r
SET operacion_id = candidata.id
FROM (
  SELECT btrim(o.booking) AS booking, min(o.id) AS id
  FROM public.operaciones o
  WHERE o.deleted_at IS NULL
    AND o.booking IS NOT NULL
    AND btrim(o.booking) <> ''
  GROUP BY btrim(o.booking)
  HAVING count(*) = 1
) AS candidata
WHERE r.operacion_id IS NULL
  AND r.booking IS NOT NULL
  AND btrim(r.booking) = candidata.booking;
