/** Formato canónico de referencia ASLI: A + 5 dígitos (ej. A00928). */
const REF_DIGITS = 5;

function fromCorrelativo(correlativo: number): string {
  return `A${String(correlativo).padStart(REF_DIGITS, "0")}`;
}

function fromRefString(refAsli: string): string | null {
  const match = /^A(\d+)$/i.exec(refAsli.trim());
  if (!match) return null;
  const num = parseInt(match[1], 10);
  if (Number.isNaN(num)) return null;
  return fromCorrelativo(num);
}

/** Devuelve la ref normalizada o null si no hay datos. Prioriza correlativo. */
export function formatRefAsli(
  refAsli?: string | null,
  correlativo?: number | null,
): string | null {
  if (correlativo != null && correlativo > 0) {
    return fromCorrelativo(correlativo);
  }
  if (refAsli?.trim()) {
    return fromRefString(refAsli) ?? refAsli.trim();
  }
  return null;
}

/** Para UI: siempre devuelve texto (por defecto "—"). */
export function displayRefAsli(
  refAsli?: string | null,
  correlativo?: number | null,
  empty = "—",
): string {
  return formatRefAsli(refAsli, correlativo) ?? empty;
}
