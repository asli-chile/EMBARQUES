/** Clave sessionStorage: una visita por pestaña de navegador. */
export const VISIT_COUNTED_KEY = "_visit_counted";

/** PostgREST devuelve bigint como string; normaliza a número finito. */
export function parseVisitCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
