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

/** Normaliza confusiones típicas de OCR cerca de etiquetas. */
function normalizeOcrText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\bIM[O0]\b/gi, "IMO")
    .replace(/\b[Il1]MO\b/gi, "IMO")
    .replace(/\b[Il1]M[O0]\b/gi, "IMO")
    .replace(/\bMM[S5][Il1]\b/gi, "MMSI")
    .replace(/\bMMS[Il1]\b/gi, "MMSI");
}

function cleanLines(text: string): string[] {
  return normalizeOcrText(text)
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

const IMO_LABEL = String.raw`(?:IMO|IM0|[Il1]MO|[Il1]M0)`;
const MMSI_LABEL = String.raw`(?:MMSI|MMS1|MM5I|MMS[Il1]|MM5[Il1])`;

/** Primer bloque de exactamente `len` dígitos (permite basura alrededor). */
function firstDigitsOfLength(raw: string | null | undefined, len: number): string | null {
  if (!raw) return null;
  const only = raw.replace(/\D/g, "");
  if (only.length === len) return only;
  const m = raw.match(new RegExp(`(?:^|\\D)(\\d{${len}})(?:\\D|$)`));
  if (m?.[1]) return m[1];
  // Dígitos con espacios internos: "9 7 0 2 1 0 6" o "9702 106"
  const spaced = raw.match(new RegExp(`(?:^|\\D)((?:\\d[\\s.\\-]*){${len}})(?:\\D|$)`));
  if (spaced?.[1]) {
    const d = spaced[1].replace(/\D/g, "");
    if (d.length === len) return d;
  }
  return null;
}

function valueAfterLabel(text: string, labelRe: string): string | null {
  const re = new RegExp(`${labelRe}\\s*[:#.\\-]?\\s*([^\\n]{0,48})`, "i");
  const m = text.match(re);
  return m?.[1]?.trim() ?? null;
}

function extractImo(_text: string, lines: string[]): string | null {
  const joined = lines.join("\n");

  // "IMO 9702106" o "IMO 9702106 MMSI 255806491" → toma solo los 7 dígitos
  const after = valueAfterLabel(joined, IMO_LABEL);
  const fromAfter = firstDigitsOfLength(after, 7);
  if (fromAfter) return fromAfter;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (new RegExp(`^${IMO_LABEL}\\b`, "i").test(line)) {
      const same = firstDigitsOfLength(line, 7);
      if (same) return same;
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        const next = firstDigitsOfLength(lines[j], 7);
        if (next) return next;
      }
    }
  }

  // Pareja típica OCR de dos columnas: "9702106 255806491"
  const pair = joined.match(/(?:^|\D)(\d{7})\s+(\d{9})(?:\D|$)/);
  if (pair?.[1]) return pair[1];

  const m = joined.match(new RegExp(`${IMO_LABEL}\\D{0,12}(\\d{7})`, "i"));
  return m?.[1] ?? null;
}

function extractMmsi(_text: string, lines: string[]): string | null {
  const joined = lines.join("\n");

  const after = valueAfterLabel(joined, MMSI_LABEL);
  const fromAfter = firstDigitsOfLength(after, 9);
  if (fromAfter) return fromAfter;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (new RegExp(`^${MMSI_LABEL}\\b`, "i").test(line)) {
      const same = firstDigitsOfLength(line, 9);
      if (same) return same;
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        const next = firstDigitsOfLength(lines[j], 9);
        if (next) return next;
      }
    }
  }

  const pair = joined.match(/(?:^|\D)(\d{7})\s+(\d{9})(?:\D|$)/);
  if (pair?.[2]) return pair[2];

  const m = joined.match(new RegExp(`${MMSI_LABEL}\\D{0,12}(\\d{9})`, "i"));
  if (m?.[1]) return m[1];

  const nine = joined.match(/(?:^|\D)(\d{9})(?:\D|$)/);
  return nine?.[1] ?? null;
}

function extractNombre(lines: string[]): string | null {
  const nameLabel = String.raw`(?:Name|Nombre|Vessel|Ship|Nave)`;
  for (const line of lines) {
    const m = line.match(new RegExp(`^${nameLabel}\\s*[:#.\\-]?\\s*(.+)$`, "i"));
    if (m?.[1]) {
      let nombre = m[1].trim();
      nombre = nombre.replace(/\s+Flag\b.*$/i, "").trim();
      nombre = nombre
        .replace(/\s*\[[^\]]*\]\s*$/, "")
        .replace(/\s+\d{2,5}[A-Za-z]?\s*$/, "")
        .trim();
      if (nombre) return nombre;
    }
  }
  for (let i = 0; i < lines.length - 1; i++) {
    if (new RegExp(`^${nameLabel}\\s*[:#.\\-]?\\s*$`, "i").test(lines[i]!)) {
      let nombre = lines[i + 1]!.trim();
      nombre = nombre
        .replace(/\s*\[[^\]]*\]\s*$/, "")
        .replace(/\s+\d{2,5}[A-Za-z]?\s*$/, "")
        .trim();
      if (nombre && !/^(flag|imo|mmsi)\b/i.test(nombre)) return nombre;
    }
  }
  return null;
}

function extractCoords(text: string): { lat: number; lng: number } | null {
  const normalized = normalizeOcrText(text);
  const paren = normalized.match(/\(\s*(-?\d{1,3}(?:[.,]\d+)?)\s*,\s*(-?\d{1,3}(?:[.,]\d+)?)\s*\)/);
  if (paren) {
    const lat = Number(paren[1]!.replace(",", "."));
    const lng = Number(paren[2]!.replace(",", "."));
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }

  const latM = normalized.match(/\b(?:lat(?:itude)?|latitud)\b\s*[:=]?\s*(-?\d{1,3}(?:[.,]\d+)?)/i);
  const lngM = normalized.match(/\b(?:lng|lon(?:gitude)?|longitud)\b\s*[:=]?\s*(-?\d{1,3}(?:[.,]\d+)?)/i);
  if (latM && lngM) {
    const lat = Number(latM[1]!.replace(",", "."));
    const lng = Number(lngM[1]!.replace(",", "."));
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }

  return null;
}

export function parseVesselTrackingFromText(text: string): VesselTrackingOcrFields {
  const normalized = normalizeOcrText(text);
  const lines = cleanLines(normalized);
  const coords = extractCoords(normalized);
  return {
    nombre: extractNombre(lines),
    imo: extractImo(normalized, lines),
    mmsi: extractMmsi(normalized, lines),
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
