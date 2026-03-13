/**
 * OCR y parsing de fechas/horarios desde imágenes de stacking.
 * Usa Tesseract.js en el cliente para extraer texto y rellenar el formulario.
 */

export type StackingFormFromOcr = {
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

const EMPTY_FORM: StackingFormFromOcr = {
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

/** Patrones de fecha/hora: DD/MM/YYYY HH:MM, DD-MM-YYYY, DD/MM HH:MM, etc. */
const DATE_TIME_REGEX =
  /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.]?(\d{2,4})?\s*(\d{1,2})?:?(\d{2})?/g;

/** Convierte día/mes/año y opcional hora a formato DD/MM/YYYY HH:MM */
function normalizeDateMatch(
  day: string,
  month: string,
  year: string | undefined,
  hour: string | undefined,
  minute: string | undefined
): string {
  const d = day.padStart(2, "0");
  const m = month.padStart(2, "0");
  const y = year
    ? year.length === 2
      ? `20${year}`
      : year
    : new Date().getFullYear().toString();
  const h = hour ? hour.padStart(2, "0") : "00";
  const min = minute ? minute.padStart(2, "0") : "00";
  return `${d}/${m}/${y} ${h}:${min}`;
}

/** Extrae todas las fechas del texto en orden de aparición */
function extractDateStrings(text: string): string[] {
  const results: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(DATE_TIME_REGEX.source, "gi");
  while ((m = re.exec(text)) !== null) {
    const day = m[1];
    const month = m[2];
    const year = m[3];
    const hour = m[4];
    const minute = m[5];
    results.push(normalizeDateMatch(day, month, year, hour, minute));
  }
  return results;
}

/** Busca bloques por palabras clave y asigna fechas cercanas (misma línea o siguiente) */
function parseByKeywords(text: string): Partial<StackingFormFromOcr> {
  const out = { ...EMPTY_FORM };
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const allDates = extractDateStrings(text);
  let dateIndex = 0;

  const keywords: Record<string, (keyof StackingFormFromOcr)[]> = {
    dry: ["dryInicio", "dryFin"],
    reefer: ["reeferInicio", "reeferFin"],
    late: ["lateInicio", "lateFin"],
    "cut off": ["cutoffDry", "cutoffReefer"],
    cutoff: ["cutoffDry", "cutoffReefer"],
    anticipado: ["cutoffAnticipado"],
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    const nextLine = lines[i + 1] ?? "";
    const lineWithNext = `${line} ${nextLine}`;
    const datesInLine = extractDateStrings(lineWithNext);

    if (datesInLine.length === 0) continue;

    for (const [kw, fields] of Object.entries(keywords)) {
      if (!lower.includes(kw)) continue;
      for (let f = 0; f < fields.length && dateIndex < allDates.length; f++) {
        const field = fields[f];
        const value = datesInLine[f] ?? allDates[dateIndex];
        if (value && !out[field]) {
          (out as Record<string, string>)[field] = value;
          dateIndex++;
        }
      }
      break;
    }
  }

  return out;
}

/** Asignación por orden: si hay 2 fechas se asumen Dry inicio/fin, luego Reefer, etc. */
function parseByOrder(text: string): Partial<StackingFormFromOcr> {
  const dates = extractDateStrings(text);
  const out = { ...EMPTY_FORM };
  const order: (keyof StackingFormFromOcr)[] = [
    "dryInicio",
    "dryFin",
    "reeferInicio",
    "reeferFin",
    "lateInicio",
    "lateFin",
    "cutoffDry",
    "cutoffReefer",
    "cutoffAnticipado",
  ];
  order.forEach((key, i) => {
    if (dates[i]) (out as Record<string, string>)[key] = dates[i];
  });
  return out;
}

/**
 * Parsea el texto extraído por OCR y devuelve los campos del formulario de stacking.
 * Combina asignación por palabras clave (Dry, Reefer, Late, Cut off) con orden secuencial.
 */
export function parseStackingDatesFromText(text: string): StackingFormFromOcr {
  const byKeywords = parseByKeywords(text);
  const byOrder = parseByOrder(text);
  const result = { ...EMPTY_FORM };
  const keys = Object.keys(EMPTY_FORM) as (keyof StackingFormFromOcr)[];
  for (const key of keys) {
    const v = byKeywords[key] || byOrder[key];
    if (v) (result as Record<string, string>)[key] = v;
  }
  return result;
}

/**
 * Extrae texto de una imagen (URL) usando Tesseract.js.
 * La URL debe ser accesible (CORS permitido) para el origen de la app.
 */
export async function extractTextFromStackingImage(imageUrl: string): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("spa+eng");
  try {
    const {
      data: { text },
    } = await worker.recognize(imageUrl);
    return text ?? "";
  } finally {
    await worker.terminate();
  }
}

/**
 * Analiza la imagen de stacking en la URL, extrae texto por OCR y parsea fechas/horarios
 * para rellenar el formulario de stacking.
 */
export async function analyzeStackingImage(imageUrl: string): Promise<StackingFormFromOcr> {
  const text = await extractTextFromStackingImage(imageUrl);
  return parseStackingDatesFromText(text);
}
