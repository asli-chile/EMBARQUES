import type { StackingDraft } from "@/lib/stacking-drafts";

/** Fila de itinerario mínima para emparejar nave + viaje y leer borrador de stacking. */
export type ItinerarioStackingMatchRow = {
  id: string;
  viaje: string | null;
  stacking_imagen_url?: string | null;
};

/**
 * Convierte texto de borrador de stacking (p. ej. "04/04/2026 14:30" o "04/04/2026")
 * al formato de input HTML datetime-local (YYYY-MM-DDTHH:mm), hora local.
 */
export function stackingDraftTextToDatetimeLocal(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (!m) return "";
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  const yyyy = m[3];
  const hh = (m[4] ?? "00").padStart(2, "0");
  const min = (m[5] ?? "00").padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

/** Elige un itinerario cuando hay varias filas con el mismo viaje (prioriza imagen de stacking). */
export function pickItinerarioForStackingSync(
  rows: ItinerarioStackingMatchRow[],
  viajeForm: string
): ItinerarioStackingMatchRow | null {
  const v = viajeForm.trim();
  if (!rows.length || !v) return null;
  const vUp = v.toUpperCase();
  const matched = rows.filter((r) => (r.viaje || "").trim().toUpperCase() === vUp);
  if (!matched.length) return null;
  const withImg = matched.find((r) => r.stacking_imagen_url?.trim());
  return withImg ?? matched[0];
}

/** Mapea borrador de stacking a campos datetime-local del formulario de reserva. */
export function draftToReservaStackingDatetimeFields(draft: StackingDraft): {
  inicio_stacking: string;
  fin_stacking: string;
  corte_documental: string;
} {
  return {
    inicio_stacking: stackingDraftTextToDatetimeLocal(draft.dryInicio),
    fin_stacking: stackingDraftTextToDatetimeLocal(draft.dryFin),
    corte_documental: stackingDraftTextToDatetimeLocal(draft.cutoffDry),
  };
}
