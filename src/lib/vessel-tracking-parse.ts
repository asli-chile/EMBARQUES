/**
 * Parsea texto OCR de capturas VesselFinder / mapas AIS.
 * Formatos esperados:
 * - Ficha: Name / IMO / MMSI (a veces etiquetas en columna y valores abajo)
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
    // O/o confusos dentro de números sueltos: "O9702106" → "09702106" (luego se recorta)
    .replace(/(?<=\d)[Oo]/g, "0")
    .replace(/[Oo](?=\d)/g, "0")
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
const NAME_LABEL = String.raw`(?:Name|Nombre|Vessel|Ship|Nave)`;
const FLAG_LABEL = String.raw`(?:Flag|Bandera)`;
const ANY_LABEL = String.raw`(?:${NAME_LABEL}|${FLAG_LABEL}|${IMO_LABEL}|${MMSI_LABEL})`;

function isLabelOnlyLine(line: string): boolean {
  return new RegExp(`^${ANY_LABEL}\\s*[:#.\\-]?\\s*$`, "i").test(line);
}

function labelKind(line: string): "name" | "flag" | "imo" | "mmsi" | null {
  if (new RegExp(`^${NAME_LABEL}\\b`, "i").test(line)) return "name";
  if (new RegExp(`^${FLAG_LABEL}\\b`, "i").test(line)) return "flag";
  if (new RegExp(`^${IMO_LABEL}\\b`, "i").test(line)) return "imo";
  if (new RegExp(`^${MMSI_LABEL}\\b`, "i").test(line)) return "mmsi";
  return null;
}

/** Primer bloque de exactamente `len` dígitos (permite basura alrededor). */
function firstDigitsOfLength(raw: string | null | undefined, len: number): string | null {
  if (!raw) return null;
  const only = raw.replace(/\D/g, "");
  if (only.length === len) return only;
  // Si OCR antepuso un 0 por confusión O→0: "09702106" → "9702106"
  if (len === 7 && only.length === 8 && only.startsWith("0")) return only.slice(1);
  const m = raw.match(new RegExp(`(?:^|\\D)(\\d{${len}})(?:\\D|$)`));
  if (m?.[1]) return m[1];
  const spaced = raw.match(new RegExp(`(?:^|\\D)((?:\\d[\\s.\\-]*){${len}})(?:\\D|$)`));
  if (spaced?.[1]) {
    const d = spaced[1].replace(/\D/g, "");
    if (d.length === len) return d;
  }
  return null;
}

function allDigitBlocks(text: string, len: number): string[] {
  const out: string[] = [];
  const re = new RegExp(`(?:^|\\D)(\\d{${len}})(?:\\D|$)`, "g");
  let m: RegExpExecArray | null;
  const src = text.replace(/(\d)[\s.\-](?=\d)/g, "$1");
  while ((m = re.exec(src)) !== null) {
    out.push(m[1]!);
  }
  // También bloques pegados con espacios: "9702 106"
  const spacedRe = new RegExp(`(?:^|\\D)((?:\\d[\\s.\\-]*){${len}})(?:\\D|$)`, "g");
  while ((m = spacedRe.exec(text)) !== null) {
    const d = m[1]!.replace(/\D/g, "");
    if (d.length === len && !out.includes(d)) out.push(d);
  }
  return out;
}

function valueAfterLabel(text: string, labelRe: string): string | null {
  const re = new RegExp(`${labelRe}\\s*[:#.\\-]?\\s*([^\\n]{0,48})`, "i");
  const m = text.match(re);
  return m?.[1]?.trim() ?? null;
}

/**
 * Layout VesselFinder frecuente en OCR:
 *   Name
 *   Flag
 *   IMO
 *   MMSI
 *   MSC SENEGAL
 *   PORTUGAL
 *   9702106
 *   636025657
 * Las etiquetas vienen juntas y los valores después, en el mismo orden.
 */
function extractFromStackedColumns(lines: string[]): Partial<VesselTrackingOcrFields> {
  const kinds: Array<"name" | "flag" | "imo" | "mmsi"> = [];
  let lastLabelIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const kind = labelKind(lines[i]!);
    if (!kind) {
      // Solo aceptamos bloque inicial de etiquetas consecutivas
      if (kinds.length > 0) break;
      continue;
    }
    // Si la línea ya trae valor ("IMO 9702106"), no es layout apilado puro
    if (!isLabelOnlyLine(lines[i]!) && firstDigitsOfLength(lines[i], 7)) return {};
    if (!isLabelOnlyLine(lines[i]!) && firstDigitsOfLength(lines[i], 9)) return {};
    if (kind === "name" && !isLabelOnlyLine(lines[i]!)) {
      // "Name MSC SENEGAL" — no es columna apilada
      return {};
    }
    kinds.push(kind);
    lastLabelIdx = i;
  }

  if (kinds.length < 3 || lastLabelIdx < 0) return {};

  const values = lines
    .slice(lastLabelIdx + 1)
    .filter((l) => !labelKind(l));

  if (values.length < 2) return {};

  const out: Partial<VesselTrackingOcrFields> = {};
  for (let i = 0; i < kinds.length; i++) {
    const kind = kinds[i]!;
    const val = values[i];
    if (!val) continue;
    if (kind === "name") {
      const nombre = val
        .replace(/\s*\[[^\]]*\]\s*$/, "")
        .replace(/\s+\d{2,5}[A-Za-z]?\s*$/, "")
        .trim();
      if (nombre && !/^(portugal|panama|liberia|malta|china|bahamas)\b/i.test(nombre)) {
        out.nombre = nombre;
      }
    } else if (kind === "imo") {
      out.imo = firstDigitsOfLength(val, 7) ?? undefined;
    } else if (kind === "mmsi") {
      out.mmsi = firstDigitsOfLength(val, 9) ?? undefined;
    }
  }

  // Si el orden de valores se desalinea, busca 7 y 9 dígitos en el bloque de valores
  if (!out.imo || !out.mmsi) {
    const block = values.join("\n");
    const sevens = allDigitBlocks(block, 7);
    const nines = allDigitBlocks(block, 9);
    if (!out.imo && sevens[0]) out.imo = sevens[0];
    if (!out.mmsi && nines[0]) out.mmsi = nines[0];
  }

  return out;
}

function extractImo(text: string, lines: string[], mmsi: string | null): string | null {
  const joined = lines.join("\n");

  const after = valueAfterLabel(joined, IMO_LABEL);
  const fromAfter = firstDigitsOfLength(after, 7);
  if (fromAfter && fromAfter !== mmsi?.slice(0, 7)) return fromAfter;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (new RegExp(`^${IMO_LABEL}\\b`, "i").test(line)) {
      const same = firstDigitsOfLength(line, 7);
      if (same) return same;
      // Buscar más abajo: en layout apilado el valor puede estar varias líneas después
      for (let j = i + 1; j < lines.length; j++) {
        if (labelKind(lines[j]!)) continue;
        const next = firstDigitsOfLength(lines[j], 7);
        if (next && next !== mmsi?.slice(0, 7)) return next;
      }
    }
  }

  const pair = joined.match(/(?:^|\D)(\d{7})\s+(\d{9})(?:\D|$)/);
  if (pair?.[1]) return pair[1];

  const m = joined.match(new RegExp(`${IMO_LABEL}\\D{0,12}(\\d{7})`, "i"));
  if (m?.[1]) return m[1];

  // Fallback: único bloque de 7 dígitos que no sea prefijo del MMSI
  const sevens = allDigitBlocks(joined, 7).filter((d) => !mmsi || !mmsi.includes(d));
  if (sevens.length === 1) return sevens[0]!;
  // Si hay varios, preferir el que aparece antes del MMSI en el texto
  if (mmsi && sevens.length > 0) {
    const mmsiPos = joined.indexOf(mmsi);
    if (mmsiPos > 0) {
      const before = sevens.find((d) => {
        const p = joined.indexOf(d);
        return p >= 0 && p < mmsiPos;
      });
      if (before) return before;
    }
  }
  return sevens[0] ?? null;
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
      for (let j = i + 1; j < lines.length; j++) {
        if (labelKind(lines[j]!) && labelKind(lines[j]!) !== "mmsi") continue;
        const next = firstDigitsOfLength(lines[j], 9);
        if (next) return next;
      }
    }
  }

  const pair = joined.match(/(?:^|\D)(\d{7})\s+(\d{9})(?:\D|$)/);
  if (pair?.[2]) return pair[2];

  const m = joined.match(new RegExp(`${MMSI_LABEL}\\D{0,12}(\\d{9})`, "i"));
  if (m?.[1]) return m[1];

  const nines = allDigitBlocks(joined, 9);
  return nines[0] ?? null;
}

function extractNombre(lines: string[]): string | null {
  for (const line of lines) {
    const m = line.match(new RegExp(`^${NAME_LABEL}\\s*[:#.\\-]?\\s*(.+)$`, "i"));
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
    if (new RegExp(`^${NAME_LABEL}\\s*[:#.\\-]?\\s*$`, "i").test(lines[i]!)) {
      let nombre = lines[i + 1]!.trim();
      // En layout apilado, la siguiente línea puede ser "Flag" — no es el nombre
      if (labelKind(nombre)) continue;
      nombre = nombre
        .replace(/\s*\[[^\]]*\]\s*$/, "")
        .replace(/\s+\d{2,5}[A-Za-z]?\s*$/, "")
        .trim();
      if (nombre) return nombre;
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
  const stacked = extractFromStackedColumns(lines);
  const mmsi = stacked.mmsi ?? extractMmsi(normalized, lines);
  const imo = stacked.imo ?? extractImo(normalized, lines, mmsi);
  const nombre = stacked.nombre ?? extractNombre(lines);
  const coords = extractCoords(normalized);
  return {
    nombre: nombre ?? null,
    imo: imo ?? null,
    mmsi: mmsi ?? null,
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
