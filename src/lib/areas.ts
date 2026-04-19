/**
 * Áreas canónicas para destinos/servicios.
 * Normaliza variantes como "INDIA MEDIO ORIENTE" → "INDIA-MEDIOORIENTE" para evitar errores al guardar.
 */
export const AREAS_CANONICAL = ["AMERICA", "ASIA", "EUROPA", "MEDIO-ORIENTE", "OCEANIA"] as const;

export function normalizeArea(area: unknown): string {
  if (area == null || String(area).trim() === "") return "ASIA";
  const t = String(area)
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
  if (AREAS_CANONICAL.includes(t as (typeof AREAS_CANONICAL)[number])) return t;
  // Alias legacy
  if (t === "INDIA-MEDIOORIENTE" || t === "INDIA-MEDIO-ORIENTE" || t === "INDIA-MEDIO ORIENTE") return "MEDIO-ORIENTE";
  // Nombres de hoja Excel / importaciones antiguas → regiones canónicas
  if (t === "FAR-EAST" || t === "FAREAST") return "ASIA";
  if (t === "NORTE-DE-EUROPA" || t === "NORTEDE-EUROPA") return "EUROPA";
  if (t === "AMÉRICA") return "AMERICA";
  if (t === "MEDIOORIENTE") return "MEDIO-ORIENTE";
  return t;
}
