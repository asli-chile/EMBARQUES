export type XlsxLib = typeof import("xlsx-js-style");

function hasUtilsApi(x: unknown): x is XlsxLib {
  if (!x || typeof x !== "object") return false;
  const u = (x as { utils?: { aoa_to_sheet?: unknown } }).utils;
  return Boolean(u && typeof u.aoa_to_sheet === "function");
}

/**
 * Busca el objeto con `utils.aoa_to_sheet` dentro del interop CJS → ESM.
 * Revisa la raíz, `default`, `module.exports`, y todas las claves de primer nivel.
 */
function findXlsxApi(x: unknown, depth = 0, seen = new Set<unknown>()): XlsxLib | null {
  if (depth > 4 || x == null || (typeof x !== "object" && typeof x !== "function")) return null;
  if (seen.has(x)) return null;
  seen.add(x);

  if (hasUtilsApi(x)) return x;

  const o = x as Record<string, unknown>;

  // Revisar primero las claves conocidas del interop
  for (const k of ["default", "module.exports"]) {
    if (k in o) {
      const r = findXlsxApi(o[k], depth + 1, seen);
      if (r) return r;
    }
  }

  // Revisar todas las claves enumerables del primer nivel
  if (depth === 0) {
    for (const k of Object.keys(o)) {
      if (k === "default" || k === "module.exports") continue;
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

  // Intentar importación dinámica directa
  const mod = await import("xlsx-js-style");

  const found = findXlsxApi(mod);
  if (found) {
    cached = found;
    return cached;
  }

  // Último recurso: si el módulo tiene `write` y `utils` a nivel raíz aunque
  // `aoa_to_sheet` no sea enumerable (algunos builds de xlsx lo hacen así)
  const root = mod as unknown as Record<string, unknown>;
  if (typeof root.write === "function" && root.utils) {
    cached = mod as unknown as XlsxLib;
    return cached;
  }

  throw new Error("xlsx-js-style: no se pudo cargar (utils no disponible).");
}
