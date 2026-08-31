#!/usr/bin/env node
/**
 * Simulación (dry run) del cruce entre la hoja MASTER de public/DETALLE.xlsx
 * y la tabla `operaciones`.
 *
 * Resuelve cada fila del Excel contra la base usando booking + contenedor y
 * lista, campo por campo, qué se llenaría (vacío en la base, con valor en el
 * Excel) y qué entraría en conflicto (valor distinto en ambos lados).
 *
 * No escribe nada. Uso:
 *   node tools/detalle-master/plan.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import XLSX from "xlsx-js-style";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(__dirname, "..", "..");

dotenv.config({ path: join(RAIZ, ".env.local"), quiet: true });
dotenv.config({ path: join(RAIZ, ".env"), quiet: true });

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const norm = (v) =>
  String(v ?? "")
    .toUpperCase()
    .replace(/[\s\-_.]/g, "")
    .trim();

/** "18,320.00" y "18.320,00" -> 18320. Devuelve null si no hay número. */
function aNumero(txt) {
  let s = String(txt ?? "").replace(/[$\s]/g, "");
  if (!s || s === "-") return null;
  const coma = s.lastIndexOf(",");
  const punto = s.lastIndexOf(".");
  // El separador decimal es el que aparece más a la derecha.
  if (coma > punto) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** "07-01-2026" (dd-mm-yyyy) -> "2026-01-07". */
function aFechaIso(txt) {
  const s = String(txt ?? "").trim();
  const m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const [, d, mes, a] = m;
  return `${a}-${mes.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

const texto = (v) => {
  const s = String(v ?? "").trim();
  return s === "" || s === "-" ? null : s;
};

/**
 * Mapeo columna del Excel -> columna de `operaciones` + conversión.
 * Las columnas del Excel sin equivalente en la base quedan fuera a propósito
 * (calibres XL/J/2J..., SELLO PLANTA, FOB INVOICE, SWB).
 */
const MAPEO = [
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
  ["RUT", "rut_chofer", texto],
  ["CONTACTO", "telefono_chofer", texto],
  ["PATENTE", "patente_camion", texto],
  ["contrato", "contrato", texto],
  ["CONSIGNE", "consignatario", texto],
  ["KG NETO", "peso_neto", aNumero],
  ["KG BRUTO", "peso_bruto", aNumero],
  ["GUIA DESPACHO", "numero_guia_despacho", texto],
  ["DUS LEG", "dus", texto],
];

function leerMaster() {
  const wb = XLSX.read(readFileSync(join(RAIZ, "public", "DETALLE.xlsx")), { cellDates: false });
  const matriz = XLSX.utils.sheet_to_json(wb.Sheets.MASTER, { header: 1, raw: false, defval: "" });
  const cabecera = matriz[0].map((h, i) => (String(h).trim() === "" ? `COL_${i}` : String(h).trim()));
  const filas = [];
  for (let i = 1; i < matriz.length; i++) {
    const obj = {};
    let vacia = true;
    cabecera.forEach((col, c) => {
      const val = String(matriz[i][c] ?? "").trim();
      if (obj[col] === undefined) obj[col] = val;
      if (val !== "") vacia = false;
    });
    if (!vacia) filas.push({ ...obj, __fila: i + 1 });
  }
  return filas;
}

async function traerOperaciones() {
  const cols = ["id", "ref_asli", "cliente", "deleted_at", ...new Set(MAPEO.map(([, c]) => c)), "booking"];
  const todas = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase
      .from("operaciones")
      .select(cols.join(","))
      .is("deleted_at", null)
      .range(desde, desde + 999);
    if (error) throw new Error(error.message);
    todas.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return todas;
}

const estaVacio = (v) => v === null || v === undefined || String(v).trim() === "";

async function main() {
  const filas = leerMaster();
  const ops = await traerOperaciones();

  const porBooking = new Map();
  for (const op of ops) {
    const k = norm(op.booking);
    if (!k) continue;
    if (!porBooking.has(k)) porBooking.set(k, []);
    porBooking.get(k).push(op);
  }
  const porContenedor = new Map();
  for (const op of ops) {
    const k = norm(op.contenedor);
    if (!k) continue;
    if (!porContenedor.has(k)) porContenedor.set(k, []);
    porContenedor.get(k).push(op);
  }

  let totalLlenar = 0;
  let totalConflicto = 0;
  const sinResolver = [];
  const resumenCampos = new Map();

  for (const f of filas) {
    const kb = norm(f.BOOKING);
    const kc = norm(f.CONTENEDOR);
    let candidatas = porBooking.get(kb) ?? [];
    let via = "booking";

    if (candidatas.length > 1) {
      const refinadas = candidatas.filter((o) => norm(o.contenedor) === kc);
      if (refinadas.length === 1) {
        candidatas = refinadas;
        via = "booking+contenedor";
      } else {
        const libres = candidatas.filter((o) => estaVacio(o.contenedor));
        if (libres.length === 1) {
          candidatas = libres;
          via = "booking + contenedor vacío en BD";
        }
      }
    }
    if (candidatas.length !== 1 && porContenedor.get(kc)?.length === 1) {
      candidatas = porContenedor.get(kc);
      via = "contenedor";
    }

    if (candidatas.length !== 1) {
      sinResolver.push({
        ie: f.IE,
        booking: f.BOOKING,
        contenedor: f.CONTENEDOR,
        candidatas: candidatas.map((o) => `${o.ref_asli}/${o.contenedor ?? "sin contenedor"}`),
      });
      continue;
    }

    const op = candidatas[0];
    const llenar = [];
    const conflicto = [];
    for (const [colExcel, colBd, conv] of MAPEO) {
      const valor = conv(f[colExcel]);
      if (valor === null) continue;
      const actual = op[colBd];
      if (estaVacio(actual)) {
        llenar.push(`${colBd}=${valor}`);
        resumenCampos.set(colBd, (resumenCampos.get(colBd) ?? 0) + 1);
      } else if (norm(actual) !== norm(valor)) {
        conflicto.push(`${colBd}: BD="${actual}" vs XLSX="${valor}"`);
      }
    }
    totalLlenar += llenar.length;
    totalConflicto += conflicto.length;

    console.log(`\n[${f.IE}] -> ${op.ref_asli} (${op.cliente}) vía ${via}`);
    console.log(`  llenar (${llenar.length}): ${llenar.join(", ") || "nada"}`);
    if (conflicto.length) console.log(`  CONFLICTO (${conflicto.length}): ${conflicto.join(" | ")}`);
  }

  console.log(`\n\n=== RESUMEN ===`);
  console.log(`Filas del Excel: ${filas.length}`);
  console.log(`Resueltas: ${filas.length - sinResolver.length} | Sin resolver: ${sinResolver.length}`);
  console.log(`Campos a llenar: ${totalLlenar} | Conflictos: ${totalConflicto}`);
  console.log(`\nCampos a llenar por columna:`);
  for (const [c, n] of [...resumenCampos].sort((a, b) => b[1] - a[1])) console.log(`  ${c}: ${n}`);
  if (sinResolver.length) {
    console.log(`\nSin resolver:`);
    for (const s of sinResolver)
      console.log(`  ${s.ie} booking=${s.booking} cont=${s.contenedor} candidatas=[${s.candidatas.join(", ")}]`);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
