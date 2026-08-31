/**
 * Utilidades compartidas para importar la hoja MASTER de public/DETALLE.xlsx
 * hacia la tabla `operaciones`.
 *
 * La hoja MASTER es la planilla operativa histórica de ASLI: una fila por
 * contenedor embarcado, identificada por la columna IE (ej. `2025M25`). Ese IE
 * no existe como llave en el ERP, por lo que el cruce se hace por número de
 * booking y, cuando un booking tiene varios contenedores, se refina con el
 * número de contenedor.
 */
import { readFileSync } from "fs";
import { join } from "path";
import XLSX from "xlsx-js-style";
import { conectar, RAIZ, traerOperaciones } from "../lib/supabase-admin.mjs";

export { conectar, RAIZ, traerOperaciones };

/** Normaliza para comparar: mayúsculas, sin espacios ni separadores. */
export const norm = (v) =>
  String(v ?? "")
    .toUpperCase()
    .replace(/[\s\-_.]/g, "")
    .trim();

export const estaVacio = (v) => v === null || v === undefined || String(v).trim() === "";

export const texto = (v) => {
  const s = String(v ?? "").trim();
  return s === "" || s === "-" || s.toUpperCase() === "FALSO" ? null : s;
};

/** Acepta "18,320.00" y "18.320,00": el separador decimal es el más a la derecha. */
export function aNumero(txt) {
  let s = String(txt ?? "").replace(/[$\s]/g, "");
  if (!s || s === "-") return null;
  const coma = s.lastIndexOf(",");
  const punto = s.lastIndexOf(".");
  if (coma > punto) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** "07-01-2026" (dd-mm-yyyy) -> "2026-01-07". */
export function aFechaIso(txt) {
  const m = String(txt ?? "")
    .trim()
    .match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const [, d, mes, a] = m;
  return `${a}-${mes.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/** RUT a formato canónico sin puntos y con guion: "15.784.911-5" -> "15784911-5". */
export function aRut(txt) {
  const s = texto(txt);
  if (!s) return null;
  const limpio = s.replace(/[.\s]/g, "").toUpperCase();
  if (/^\d+-[\dK]$/.test(limpio)) return limpio;
  if (/^\d{7,9}[\dK]$/.test(limpio)) return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
  return limpio;
}

/** La planilla escribe "ZU6724/JD4585" cuando la patente incluye el remolque. */
export function partirPatente(txt) {
  const s = texto(txt);
  if (!s) return { camion: null, remolque: null };
  const partes = s.split("/").map((p) => p.trim()).filter(Boolean);
  return { camion: partes[0] ?? null, remolque: partes[1] ?? null };
}

/**
 * Columnas de MASTER que se copian tal cual a `operaciones`.
 * Las que requieren transformación (patente, calibres) se manejan aparte.
 */
export const MAPEO = [
  ["IE", "referencia_externa", texto],
  ["NAVIERA", "naviera", texto],
  ["NAVE", "nave", texto],
  ["S.ZARPE", "semana", texto],
  ["POL", "pol", texto],
  ["ETD", "etd", aFechaIso],
  ["POD", "pod", texto],
  ["ETA", "eta", aFechaIso],
  ["TT", "tt", texto],
  ["CONTENEDOR", "contenedor", texto],
  ["SELLO", "sello", texto],
  ["TARA", "tara", aNumero],
  ["CONDUCTOR", "chofer", texto],
  ["RUT", "rut_chofer", aRut],
  ["CONTACTO", "telefono_chofer", texto],
  ["contrato", "contrato", texto],
  ["CONSIGNE", "consignatario", texto],
  ["KG NETO", "peso_neto", aNumero],
  ["KG BRUTO", "peso_bruto", aNumero],
  ["GUIA DESPACHO", "numero_guia_despacho", texto],
  ["DUS LEG", "dus", texto],
  ["SELLO PLANTA", "sello_planta", texto],
  ["FOB INVOICE", "fob_invoice", aNumero],
  ["SWB", "swb", texto],
];

/** Los calibres viven en dos bloques con cabeceras repetidas; se ubican por índice. */
export const CALIBRES = {
  formato25: { desde: 20, hasta: 25, etiquetas: ["XL", "J", "2J", "3J", "4J", "5J"], total: 26 },
  formato5: { desde: 27, hasta: 31, etiquetas: ["XL", "J", "2J", "3J", "4J"], total: 32 },
};

/**
 * Lee MASTER devolviendo, por fila, el objeto por cabecera y la matriz cruda
 * (necesaria para los calibres, cuyas cabeceras están duplicadas).
 */
export function leerMaster() {
  const wb = XLSX.read(readFileSync(join(RAIZ, "public", "DETALLE.xlsx")), { cellDates: false });
  const matriz = XLSX.utils.sheet_to_json(wb.Sheets.MASTER, { header: 1, raw: false, defval: "" });
  const cabecera = matriz[0].map((h) => String(h).trim());

  const filas = [];
  for (let i = 1; i < matriz.length; i++) {
    const cruda = matriz[i];
    const obj = {};
    let vacia = true;
    cabecera.forEach((col, c) => {
      const val = String(cruda[c] ?? "").trim();
      if (col !== "" && obj[col] === undefined) obj[col] = val;
      if (val !== "") vacia = false;
    });
    if (!vacia) filas.push({ ...obj, __cruda: cruda, __fila: i + 1 });
  }
  return filas;
}

/** Extrae el desglose de cajas por calibre de una fila de MASTER. */
export function extraerCalibres(cruda) {
  const salida = {};
  let hayDato = false;
  for (const [nombre, cfg] of Object.entries(CALIBRES)) {
    const bloque = {};
    cfg.etiquetas.forEach((etq, i) => {
      const n = aNumero(cruda[cfg.desde + i]);
      if (n !== null && n !== 0) {
        bloque[etq] = n;
        hayDato = true;
      }
    });
    if (Object.keys(bloque).length) salida[nombre === "formato25" ? "2.5KG" : "5KG"] = bloque;
  }
  return {
    calibres: hayDato ? salida : null,
    total25: aNumero(cruda[CALIBRES.formato25.total]),
    total5: aNumero(cruda[CALIBRES.formato5.total]),
  };
}

/**
 * Resuelve una fila de MASTER a una única operación.
 * Devuelve { op, via } o { op: null, candidatas } si no es concluyente.
 */
export function resolver(fila, porBooking, porContenedor) {
  const kb = norm(fila.BOOKING);
  const kc = norm(fila.CONTENEDOR);
  let candidatas = porBooking.get(kb) ?? [];
  let via = "booking";

  if (candidatas.length > 1) {
    const exactas = candidatas.filter((o) => norm(o.contenedor) === kc);
    if (exactas.length === 1) {
      candidatas = exactas;
      via = "booking+contenedor";
    } else {
      const libres = candidatas.filter((o) => estaVacio(o.contenedor));
      if (libres.length === 1) {
        candidatas = libres;
        via = "booking+contenedor vacío";
      }
    }
  }
  if (candidatas.length !== 1 && porContenedor.get(kc)?.length === 1) {
    candidatas = porContenedor.get(kc);
    via = "contenedor";
  }

  if (candidatas.length !== 1) return { op: null, candidatas };
  return { op: candidatas[0], via };
}

export function indexar(ops, columna) {
  const m = new Map();
  for (const op of ops) {
    const k = norm(op[columna]);
    if (!k) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(op);
  }
  return m;
}
