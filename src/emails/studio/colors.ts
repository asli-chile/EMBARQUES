/** Paleta de acentos del studio de informativos (seguros para email). */

export type StudioColorOption = {
  id: string;
  label: string;
  value: string;
};

export const STUDIO_COLOR_OPTIONS: StudioColorOption[] = [
  { id: "navy", label: "Navy", value: "#11224E" },
  { id: "brand", label: "Azul marca", value: "#002d69" },
  { id: "red", label: "Rojo", value: "#C8102E" },
  { id: "teal", label: "Teal", value: "#007A7B" },
  { id: "amber", label: "Ámbar", value: "#D97706" },
  { id: "slate", label: "Pizarra", value: "#475569" },
  { id: "ink", label: "Tinta", value: "#18181b" },
];

const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

function expandHex(hex: string): string {
  const h = hex.replace(/^#/, "").toUpperCase();
  if (h.length === 3) {
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  return `#${h}`;
}

export function resolveStudioColor(
  raw: string | undefined,
  fallback = "#11224E",
): string {
  const v = (raw || "").trim();
  if (!v) return fallback.toUpperCase();
  const byId = STUDIO_COLOR_OPTIONS.find(
    (c) => c.id === v.toLowerCase() || c.value.toLowerCase() === v.toLowerCase(),
  );
  if (byId) return byId.value.toUpperCase();
  const withHash = v.startsWith("#") ? v : `#${v}`;
  if (HEX_RE.test(withHash)) return expandHex(withHash);
  return fallback.toUpperCase();
}

/** Normaliza cualquier input del picker a hex #RRGGBB. */
export function normalizeStudioColorInput(
  raw: string,
  fallback = "#11224E",
): string {
  return resolveStudioColor(raw, fallback);
}

/** Fondo suave derivado del acento (callouts). */
export function softTintFromColor(hex: string): string {
  const map: Record<string, string> = {
    "#11224E": "#EEF3FA",
    "#002D69": "#E8EEF8",
    "#C8102E": "#FCECEE",
    "#007A7B": "#E8F6F2",
    "#D97706": "#FFF8E8",
    "#475569": "#F1F5F9",
    "#18181B": "#F4F4F5",
  };
  return map[hex.toUpperCase()] ?? "#F8FAFC";
}
