/**
 * Clave única por nombre de nave para sincronizar stacking entre itinerarios
 * que comparten la misma nave (sin importar viaje).
 */
export const STACKING_DRAFTS_STORAGE_KEY = "itinerarios-stacking-drafts-v1";

export type StackingDraft = {
  dryInicio: string;
  dryFin: string;
  reeferInicio: string;
  reeferFin: string;
  lateInicio: string;
  lateFin: string;
  cutoffDry: string;
  cutoffReefer: string;
  cutoffAnticipado: string;
  cutoffAnticipadoDescripcion: string;
};

/** Normaliza el nombre de nave para comparaciones (trim + mayúsculas para que coincida en todos los itinerarios). */
export function normalizeNave(nave: string | null | undefined): string {
  return String(nave ?? "").trim().toUpperCase();
}

/** Clave canónica para guardar/recuperar el draft solo por nombre de nave (trim + mayúsculas). */
export function getStackingDraftKey(nave: string | null | undefined): string {
  const n = String(nave ?? "").trim().toUpperCase();
  return n || "__sin_nave";
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Normaliza las claves de un objeto de drafts para que todas usen la forma canónica (misma nave = misma clave). */
export function normalizeDraftsKeys(drafts: Record<string, StackingDraft>): Record<string, StackingDraft> {
  const out: Record<string, StackingDraft> = {};
  for (const [k, v] of Object.entries(drafts)) {
    if (!v || typeof v !== "object") continue;
    if (UUID_REGEX.test(k)) {
      out[k] = v;
    } else if (k.includes("|")) {
      const parts = k.split("|");
      const canon = getStackingDraftKey(parts[0]) + "|" + String(parts[1] ?? "").trim();
      out[canon] = v;
    } else {
      out[getStackingDraftKey(k)] = v;
    }
  }
  return out;
}

const EMPTY_DRAFT: StackingDraft = {
  dryInicio: "",
  dryFin: "",
  reeferInicio: "",
  reeferFin: "",
  lateInicio: "",
  lateFin: "",
  cutoffDry: "",
  cutoffReefer: "",
  cutoffAnticipado: "",
  cutoffAnticipadoDescripcion: "",
};

/** Devuelve un draft vacío (para merge al editar). */
export function getEmptyStackingDraft(): StackingDraft {
  return { ...EMPTY_DRAFT };
}

/** Actualiza y persiste un draft por clave de nave. */
export function saveDraftToStorage(
  nave: string | null | undefined,
  partial: Partial<StackingDraft>
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STACKING_DRAFTS_STORAGE_KEY);
    const drafts: Record<string, StackingDraft> = raw ? JSON.parse(raw) : {};
    const key = getStackingDraftKey(nave);
    const current = drafts[key] ?? getEmptyStackingDraft();
    const next: StackingDraft = { ...current, ...partial };
    drafts[key] = next;
    window.localStorage.setItem(STACKING_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // Ignorar errores de persistencia
  }
}

/** Obtiene el draft de stacking: primero por clave canónica de nave, luego nave|viaje, id; fallback por clave normalizada. */
export function getDraftForItinerary(
  drafts: Record<string, StackingDraft>,
  it: { id: string; nave?: string | null; viaje?: string | null }
): StackingDraft | null {
  const keyNave = getStackingDraftKey(it.nave);
  const keyNaveViaje = `${String(it.nave ?? "").trim().toUpperCase()}|${String(it.viaje ?? "").trim()}`;
  const direct =
    drafts[keyNave] ?? drafts[keyNaveViaje] ?? drafts[it.id] ?? null;
  if (direct) return direct;
  // Fallback: claves guardadas con otro formato (espacios, mayúsculas)
  for (const k of Object.keys(drafts)) {
    if (getStackingDraftKey(k) === keyNave && keyNave !== "__sin_nave") return drafts[k];
  }
  return null;
}
