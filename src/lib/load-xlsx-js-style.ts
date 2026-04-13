import * as XLSXNamespace from "xlsx-js-style";

export type XlsxLib = typeof import("xlsx-js-style");

function hasUtilsApi(x: unknown): x is XlsxLib {
  if (!x || typeof x !== "object") return false;
  const u = (x as { utils?: { aoa_to_sheet?: unknown } }).utils;
  return Boolean(u && typeof u.aoa_to_sheet === "function");
}

/**
 * Busca el objeto con `utils.aoa_to_sheet` dentro del interop CJS → ESM
 * (`default` anidado, `module.exports`, etc.).
 */
function findXlsxApi(x: unknown, depth = 0, seen = new Set<unknown>()): XlsxLib | null {
  if (depth > 8 || x == null || (typeof x !== "object" && typeof x !== "function")) return null;
  if (seen.has(x)) return null;
  seen.add(x);
  if (hasUtilsApi(x)) return x;

  const o = x as Record<string, unknown>;
  for (const k of ["default", "module.exports"] as const) {
    if (Object.prototype.hasOwnProperty.call(o, k)) {
      const r = findXlsxApi(o[k], depth + 1, seen);
      if (r) return r;
    }
  }
  return null;
}

let cached: XlsxLib | null = null;

/**
 * Carga la API de `xlsx-js-style` (Facturación, Crear reserva, etc.).
 * Registros usa ExcelJS en `registros-export-simple-excel.ts`.
 */
export async function loadXlsxJsStyle(): Promise<XlsxLib> {
  if (cached) return cached;

  const fromStatic = findXlsxApi(XLSXNamespace);
  if (fromStatic) {
    cached = fromStatic;
    return cached;
  }

  const mod = await import("xlsx-js-style");
  const fromDyn = findXlsxApi(mod);
  if (fromDyn) {
    cached = fromDyn;
    return cached;
  }

  throw new Error("xlsx-js-style: no se pudo cargar (utils no disponible).");
}
