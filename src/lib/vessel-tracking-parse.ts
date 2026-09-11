/**
 * Parsea texto OCR de capturas VesselFinder / mapas AIS.
 * Formatos esperados:
 * - Ficha: Name / IMO / MMSI
 * - Mapa: (lat, lng) en grados decimales
 */

export type VesselTrackingOcrFields = {
  nombre: string | null;
  imo: string | null;
  mmsi: string | null;
  lat: number | null;
  lng: number | null;
};

function cleanLines(text: string): string[] {
  return text
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function pickLabeledValue(lines: string[], labels: string[]): string | null {
  const labelRe = new RegExp(`^(?:${labels.join("|")})\\s*[:#.\\-]?\\s*(.+)$`, "i");
  for (const line of lines) {
    const m = line.match(labelRe);
    if (m?.[1]) return m[1].trim();
  }
  // Misma línea partida: "IMO" en una, valor en la siguiente
  for (let i = 0; i < lines.length - 1; i++) {
    if (new RegExp(`^(?:${labels.join("|")})\\s*[:#.\\-]?\\s*$`, "i").test(lines[i]!)) {
      const next = lines[i + 1]!.trim();
      if (next) return next;
    }
  }
  return null;
}

function extractImo(text: string, lines: string[]): string | null {
  const labeled = pickLabeledValue(lines, ["IMO", "1MO", "lMO"]);
  const fromLabel = labeled?.replace(/\D/g, "") ?? "";
  if (/^\d{7}$/.test(fromLabel)) return fromLabel;

  const m = text.match(/\bIMO\b\D{0,8}(\d{7})\b/i);
  if (m?.[1]) return m[1];

  // Evitar confundir con MMSI: buscar 7 dígitos que no formen parte de 9
  const all = [...text.matchAll(/\b(\d{7})\b/g)].map((x) => x[1]!);
  const nine = new Set([...text.matchAll(/\b(\d{9})\b/g)].map((x) => x[1]!));
  for (const d of all) {
    if (![...nine].some((n) => n.includes(d))) return d;
  }
  return null;
}

function extractMmsi(text: string, lines: string[]): string | null {
  const labeled = pickLabeledValue(lines, ["MMSI", "MMS1", "MM5I"]);
  const fromLabel = labeled?.replace(/\D/g, "") ?? "";
  if (/^\d{9}$/.test(fromLabel)) return fromLabel;

  const m = text.match(/\bMMSI\b\D{0,8}(\d{9})\b/i);
  if (m?.[1]) return m[1];

  const nine = text.match(/\b(\d{9})\b/);
  return nine?.[1] ?? null;
}

function extractNombre(lines: string[]): string | null {
  const labeled = pickLabeledValue(lines, ["Name", "Nombre", "Vessel", "Ship", "Nave"]);
  if (!labeled) return null;
  // Quitar viaje embebido: "MSC BRUNELLA 635R"
  return labeled
    .replace(/\s*\[[^\]]*\]\s*$/, "")
    .replace(/\s+\d{2,5}[A-Za-z]?\s*$/, "")
    .trim() || null;
}

function extractCoords(text: string): { lat: number; lng: number } | null {
  // (9.623768, -79.948883)
  const paren = text.match(/\(\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*\)/);
  if (paren) {
    const lat = Number(paren[1]);
    const lng = Number(paren[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }

  // Lat: 9.623768  Lng: -79.948883
  const latM = text.match(/\b(?:lat(?:itude)?|latitud)\b\s*[:=]?\s*(-?\d{1,3}(?:\.\d+)?)/i);
  const lngM = text.match(/\b(?:lng|lon(?:gitude)?|longitud)\b\s*[:=]?\s*(-?\d{1,3}(?:\.\d+)?)/i);
  if (latM && lngM) {
    const lat = Number(latM[1]);
    const lng = Number(lngM[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }

  return null;
}

export function parseVesselTrackingFromText(text: string): VesselTrackingOcrFields {
  const lines = cleanLines(text);
  const coords = extractCoords(text);
  return {
    nombre: extractNombre(lines),
    imo: extractImo(text, lines),
    mmsi: extractMmsi(text, lines),
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
  };
}

/** Combina varias capturas (ficha + mapa) en un solo resultado. */
export function mergeVesselTrackingOcr(
  parts: VesselTrackingOcrFields[],
): VesselTrackingOcrFields {
  const out: VesselTrackingOcrFields = {
    nombre: null,
    imo: null,
    mmsi: null,
    lat: null,
    lng: null,
  };
  for (const p of parts) {
    if (!out.nombre && p.nombre) out.nombre = p.nombre;
    if (!out.imo && p.imo) out.imo = p.imo;
    if (!out.mmsi && p.mmsi) out.mmsi = p.mmsi;
    if (out.lat == null && p.lat != null) out.lat = p.lat;
    if (out.lng == null && p.lng != null) out.lng = p.lng;
  }
  return out;
}

export function normalizeVesselNameKey(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}
