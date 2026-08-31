#!/usr/bin/env node
/**
 * Diagnóstico de solo lectura del archivo public/DETALLE.xlsx (hoja MASTER)
 * contra la tabla `operaciones` de Supabase.
 *
 * No escribe nada en la base. Su objetivo es responder tres preguntas:
 *   1. ¿Qué columnas tiene realmente `operaciones`?
 *   2. ¿Cuál es la llave que cruza la columna IE del Excel con la base
 *      (ref_asli, booking o contenedor) y qué cobertura da cada una?
 *   3. Para las operaciones cruzadas, ¿qué campos están vacíos en la base
 *      y sí tienen valor en el Excel?
 *
 * Uso:
 *   node tools/detalle-master/diagnostico.mjs
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

const URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE_KEY) {
  console.error("Faltan PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });

/** Normaliza un texto para comparar llaves: sin espacios, sin guiones, mayúsculas. */
const norm = (v) =>
  String(v ?? "")
    .toUpperCase()
    .replace(/[\s\-_.]/g, "")
    .trim();

/** Lee la hoja MASTER como array de objetos usando la fila 0 como cabecera. */
function leerMaster() {
  const wb = XLSX.read(readFileSync(join(RAIZ, "public", "DETALLE.xlsx")), { cellDates: false });
  const ws = wb.Sheets.MASTER;
  const matriz = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });
  const cabecera = matriz[0].map((h, i) => (String(h).trim() === "" ? `COL_${i}` : String(h).trim()));

  const filas = [];
  for (let i = 1; i < matriz.length; i++) {
    const fila = matriz[i];
    const obj = {};
    let vacia = true;
    cabecera.forEach((col, c) => {
      const val = String(fila[c] ?? "").trim();
      // Cabeceras duplicadas (XL, J, 2J... aparecen en 2.5KG y 5KG): sufijo por posición.
      const clave = obj[col] === undefined ? col : `${col}#${c}`;
      obj[clave] = val;
      if (val !== "") vacia = false;
    });
    if (!vacia) filas.push(obj);
  }
  return { cabecera, filas };
}

async function columnasOperaciones() {
  const { data, error } = await supabase.from("operaciones").select("*").limit(1);
  if (error) throw new Error(`No se pudo leer operaciones: ${error.message}`);
  return data?.length ? Object.keys(data[0]) : [];
}

/** Trae todas las operaciones vivas paginando, porque Supabase limita a 1000 filas. */
async function traerOperaciones(columnas) {
  const sel = columnas.join(",");
  const todas = [];
  const PASO = 1000;
  for (let desde = 0; ; desde += PASO) {
    const { data, error } = await supabase
      .from("operaciones")
      .select(sel)
      .is("deleted_at", null)
      .range(desde, desde + PASO - 1);
    if (error) throw new Error(`Error paginando operaciones: ${error.message}`);
    todas.push(...(data ?? []));
    if (!data || data.length < PASO) break;
  }
  return todas;
}

function evaluarLlave(filas, ops, colExcel, colBd) {
  const indice = new Map();
  for (const op of ops) {
    const k = norm(op[colBd]);
    if (!k) continue;
    if (!indice.has(k)) indice.set(k, []);
    indice.get(k).push(op);
  }
  let cruzadas = 0;
  let ambiguas = 0;
  const sinCruce = [];
  for (const f of filas) {
    const k = norm(f[colExcel]);
    if (!k) continue;
    const hit = indice.get(k);
    if (!hit) {
      sinCruce.push(f[colExcel]);
      continue;
    }
    cruzadas++;
    if (hit.length > 1) ambiguas++;
  }
  return { colExcel, colBd, cruzadas, ambiguas, sinCruce };
}

async function main() {
  const { cabecera, filas } = leerMaster();
  console.log(`\n=== HOJA MASTER ===`);
  console.log(`Filas con datos: ${filas.length}`);
  console.log(`Columnas (${cabecera.length}): ${cabecera.join(" | ")}`);

  const columnas = await columnasOperaciones();
  console.log(`\n=== TABLA operaciones ===`);
  console.log(`Columnas (${columnas.length}):`);
  console.log(columnas.join(", "));

  const ops = await traerOperaciones(columnas);
  console.log(`\nOperaciones vivas en la base: ${ops.length}`);

  console.log(`\n=== EVALUACIÓN DE LLAVES DE CRUCE (columna IE del Excel) ===`);
  const candidatas = [
    ["IE", "ref_asli"],
    ["IE", "correlativo"],
    ["BOOKING", "booking"],
    ["CONTENEDOR", "contenedor"],
  ].filter(([, colBd]) => columnas.includes(colBd));

  for (const [colExcel, colBd] of candidatas) {
    const r = evaluarLlave(filas, ops, colExcel, colBd);
    const pct = ((r.cruzadas / filas.length) * 100).toFixed(1);
    console.log(
      `${colExcel} -> ${colBd}: ${r.cruzadas}/${filas.length} cruzan (${pct}%), ` +
        `${r.ambiguas} ambiguas, ${r.sinCruce.length} sin cruce`
    );
    if (r.sinCruce.length) console.log(`   ejemplos sin cruce: ${r.sinCruce.slice(0, 6).join(", ")}`);
  }

  console.log(`\n=== MUESTRA DE ref_asli EN LA BASE ===`);
  console.log(ops.slice(0, 15).map((o) => o.ref_asli).join(", "));

  console.log(`\n=== COBERTURA DE DATOS EN LA BASE (campos vacíos) ===`);
  const interes = columnas.filter((c) => !["id", "created_at", "updated_at", "deleted_at"].includes(c));
  const vacios = interes
    .map((c) => {
      const n = ops.filter((o) => o[c] === null || o[c] === "" || o[c] === undefined).length;
      return { col: c, vacios: n, pct: ((n / (ops.length || 1)) * 100).toFixed(0) };
    })
    .sort((a, b) => b.vacios - a.vacios);
  for (const v of vacios) console.log(`${v.col}: ${v.vacios} vacíos (${v.pct}%)`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
