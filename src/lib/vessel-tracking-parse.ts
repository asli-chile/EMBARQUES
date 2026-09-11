/**
 * Parsea texto OCR de fichas VesselFinder.
 * Formato fijo siempre:
 *   1. Nombre de nave
 *   2. Bandera
 *   3. IMO (7 dígitos)
 *   4. MMSI (9 dígitos)
 */

export type VesselTrackingOcrFields = {
  nombre: string | null;
  imo: string | null;
  mmsi: string | null;
  lat: number | null;
  lng: number | null;
};

function normalizeOcrText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/(?<=\d)[Oo]/g, "0")
    .replace(/[Oo](?=\d)/g, "0")
    .replace(/\bIM[O0]\b/gi, "IMO")
    .replace(/\b[Il1]MO\b/gi, "IMO")
    .replace(/\b[Il1]M[O0]\b/gi, "IMO")
    .replace(/\bMM[S5][Il1]\b/gi, "MMSI")
    .replace(/\bMMS[Il1]\b/gi, "MMSI")
    .replace(/\bNane\b/gi, "Name")
    .replace(/\bNarne\b/gi, "Name")
    .replace(/\bFiag\b/gi, "Flag");
}

function cleanLines(text: string): string[] {
  return normalizeOcrText(text)
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function digitsOfLength(raw: string | null | undefined, len: number): string | null {
  if (!raw) return null;
  const only = raw.replace(/\D/g, "");
  if (only.length === len) return only;
  if (len === 7 && only.length === 8 && only.startsWith("0")) return only.slice(1);
  const m = raw.match(new RegExp(`(?:^|\\D)(\\d{${len}})(?:\\D|$)`));
  return m?.[1] ?? null;
}

function stripLabelPrefix(line: string): string {
  return line
    .replace(/^(Name|Nombre|Vessel|Ship|Nave|Nane|Narne)\s*[:#.\-]?\s*/i, "")
    .replace(/^(Flag|Bandera|Fiag)\s*[:#.\-]?\s*/i, "")
    .replace(/^(IMO|IM0|[Il1]MO)\s*[:#.\-]?\s*/i, "")
    .replace(/^(MMSI|MMS1|MM5I)\s*[:#.\-]?\s*/i, "")
    .trim();
}

function isLabelOnly(line: string): boolean {
  return /^(Name|Nombre|Vessel|Ship|Nave|Nane|Narne|Flag|Bandera|Fiag|IMO|IM0|[Il1]MO|MMSI|MMS1|MM5I)\s*[:#.\-]?\s*$/i.test(
    line,
  );
}

function isFlagValue(line: string): boolean {
  return /^(portugal|panama|liberia|malta|china|bahamas|singapore|marshall|hong\s*kong|cyprus|greece|denmark|norway|germany|italy|spain|france|belgium|netherlands|japan|korea|taiwan|vietnam|india|turkey|antigua|barbados|cayman|isle\s*of\s*man|united\s*kingdom|united\s*states|usa|uk)\b/i.test(
    line.trim(),
  );
}

function cleanNombre(raw: string): string {
  return raw
    .replace(/\s+Flag\b.*$/i, "")
    .replace(/\s*\[[^\]]*\]\s*$/, "")
    .replace(/\s+\d{2,5}[A-Za-z]?\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Caso A — etiquetas y valores en la misma línea:
 *   Name   MSC SENEGAL
 *   Flag   PORTUGAL
 *   IMO    9961234
 *   MMSI   636025657
 *
 * Caso B — columnas apiladas (OCR lee etiquetas y luego valores):
 *   Name / Flag / IMO / MMSI
 *   MSC SENEGAL / PORTUGAL / 9961234 / 636025657
 */
function parseFixedVesselCard(lines: string[]): VesselTrackingOcrFields {
  let nombre: string | null = null;
  let imo: string | null = null;
  let mmsi: string | null = null;

  // --- Caso A: valor en la misma línea que la etiqueta ---
  for (const line of lines) {
    if (/^(Name|Nombre|Vessel|Ship|Nave|Nane|Narne)\b/i.test(line) && !isLabelOnly(line)) {
      const v = cleanNombre(stripLabelPrefix(line));
      if (v && !isFlagValue(v) && !digitsOfLength(v, 7) && !digitsOfLength(v, 9)) nombre = v;
    }
    if (/^(IMO|IM0|[Il1]MO)\b/i.test(line)) {
      imo = digitsOfLength(stripLabelPrefix(line), 7) ?? imo;
    }
    if (/^(MMSI|MMS1|MM5I)\b/i.test(line)) {
      mmsi = digitsOfLength(stripLabelPrefix(line), 9) ?? mmsi;
    }
  }

  // --- Caso B: bloque de 4 etiquetas + bloque de 4 valores en orden fijo ---
  const labelIdx: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (isLabelOnly(lines[i]!)) labelIdx.push(i);
  }

  if (labelIdx.length >= 4) {
    // Busca una secuencia Name → Flag → IMO → MMSI
    for (let s = 0; s <= labelIdx.length - 4; s++) {
      const i0 = labelIdx[s]!;
      const i1 = labelIdx[s + 1]!;
      const i2 = labelIdx[s + 2]!;
      const i3 = labelIdx[s + 3]!;
      // Deben ser consecutivas o casi (sin otras líneas de valor entremedio)
      if (i1 !== i0 + 1 || i2 !== i0 + 2 || i3 !== i0 + 3) continue;

      const l0 = lines[i0]!;
      const l1 = lines[i1]!;
      const l2 = lines[i2]!;
      const l3 = lines[i3]!;
      const isName = /^(Name|Nombre|Vessel|Ship|Nave|Nane|Narne)\b/i.test(l0);
      const isFlag = /^(Flag|Bandera|Fiag)\b/i.test(l1);
      const isImo = /^(IMO|IM0|[Il1]MO)\b/i.test(l2);
      const isMmsi = /^(MMSI|MMS1|MM5I)\b/i.test(l3);
      if (!isName || !isFlag || !isImo || !isMmsi) continue;

      const values = lines.slice(i3 + 1).filter((l) => !isLabelOnly(l));
      // Orden fijo: [0]=nombre, [1]=bandera, [2]=imo, [3]=mmsi
      if (!nombre && values[0]) {
        const v = cleanNombre(values[0]);
        if (v && !isFlagValue(v)) nombre = v;
      }
      if (!imo && values[2]) imo = digitsOfLength(values[2], 7) ?? imo;
      if (!mmsi && values[3]) mmsi = digitsOfLength(values[3], 9) ?? mmsi;

      // Si el desfase movió dígitos, busca en el bloque de valores por posición relativa
      if (!imo || !mmsi) {
        const digitLines = values.filter((v) => digitsOfLength(v, 7) || digitsOfLength(v, 9));
        if (!imo) {
          for (const v of digitLines) {
            const d = digitsOfLength(v, 7);
            if (d) {
              imo = d;
              break;
            }
          }
        }
        if (!mmsi) {
          for (const v of digitLines) {
            const d = digitsOfLength(v, 9);
            if (d) {
              mmsi = d;
              break;
            }
          }
        }
      }
      break;
    }
  }

  // Fallback de orden fijo sin etiquetas claras: primera línea nombre, luego bandera, luego 7 y 9 dígitos
  if (!nombre || !imo || !mmsi) {
    const content = lines.map(stripLabelPrefix).filter((l) => l && !isLabelOnly(l));
    if (!nombre) {
      for (const line of content) {
        if (isFlagValue(line)) continue;
        if (digitsOfLength(line, 7) || digitsOfLength(line, 9)) continue;
        const v = cleanNombre(line);
        if (v.length >= 3) {
          nombre = v;
          break;
        }
      }
    }
    if (!imo) {
      for (const line of content) {
        const d = digitsOfLength(line, 7);
        if (d) {
          imo = d;
          break;
        }
      }
    }
    if (!mmsi) {
      for (const line of content) {
        const d = digitsOfLength(line, 9);
        if (d) {
          mmsi = d;
          break;
        }
      }
    }
  }

  return { nombre, imo, mmsi, lat: null, lng: null };
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
  return null;
}

export function parseVesselTrackingFromText(text: string): VesselTrackingOcrFields {
  const normalized = normalizeOcrText(text);
  const lines = cleanLines(normalized);
  const card = parseFixedVesselCard(lines);
  const coords = extractCoords(normalized);
  return {
    nombre: card.nombre,
    imo: card.imo,
    mmsi: card.mmsi,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
  };
}

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
