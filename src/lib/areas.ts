/**
 * Áreas canónicas para destinos/servicios.
 * Normaliza variantes como "INDIA MEDIO ORIENTE" → "INDIA-MEDIOORIENTE" para evitar errores al guardar.
 */
export const AREAS_CANONICAL = ["ASIA", "EUROPA", "AMERICA", "INDIA-MEDIOORIENTE"] as const;

export function normalizeArea(area: unknown): string {
  if (area == null || String(area).trim() === "") return "ASIA";
  const t = String(area).trim().toUpperCase().replace(/\s+/g, "-");
  if (AREAS_CANONICAL.includes(t as (typeof AREAS_CANONICAL)[number])) return t;
  if (t === "INDIA-MEDIO-ORIENTE") return "INDIA-MEDIOORIENTE";
  return t;
}
