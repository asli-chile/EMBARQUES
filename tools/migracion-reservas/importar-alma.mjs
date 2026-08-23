/**
 * Importa migracion-reservas-alma-extraido.xlsx → Supabase operaciones
 * node tools/migracion-reservas/importar-alma.mjs
 */
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const XLSX = join(ROOT, "docs/plantillas/migracion-reservas-alma-extraido.xlsx");

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    const p = join(ROOT, f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
    }
  }
}

loadEnv();

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

function str(v) {
  if (v == null) return "";
  return String(v).trim();
}

function parseSoloFecha(val) {
  if (!val) return null;
  const m1 = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2, "0")}-${m1[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.substring(0, 10);
  return null;
}

function parseFechaHora(val) {
  if (!val) return null;
  const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}T${m[4].padStart(2, "0")}:${m[5]}:00`;
  const d = parseSoloFecha(val);
  return d ? `${d}T00:00:00` : null;
}

function parseEntero(v) {
  if (v === "" || v == null) return null;
  const n = parseInt(String(v).trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function parseBoolean(v) {
  const s = str(v).toLowerCase();
  if (s === "si" || s === "sí" || s === "true" || s === "1") return true;
  if (s === "no" || s === "false" || s === "0") return false;
  return null;
}

const DATE_FIELDS = new Set(["etd", "eta", "ingreso"]);
const DATETIME_FIELDS = new Set(["citacion", "inicio_stacking", "fin_stacking", "corte_documental"]);
const INT_FIELDS = new Set(["ventilacion", "pallets", "tt"]);
const BOOL_FIELDS = new Set(["enviado_transporte"]);
const CONTRATO_ASLI_REFS = new Set(["2025M05", "2025M06", "2025M10", "2025M14", "2025M15"]);

function normUpper(s) {
  if (s == null) return "";
  const t = String(s).trim();
  if (!t) return "";
  return t.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
}

function contratoForRef(ref) {
  return CONTRATO_ASLI_REFS.has(normUpper(ref)) ? "ASLI" : "CHILL FRESH";
}

function duenoForRef(ref) {
  return CONTRATO_ASLI_REFS.has(normUpper(ref)) ? "ASLI" : "CHILFRESH";
}

function buildPayload(raw) {
  const ref = normUpper(raw.referencia_externa);
  const out = {};
  for (const [key, val] of Object.entries(raw)) {
    const s = str(val);
    if (!s) continue;
    if (DATE_FIELDS.has(key)) {
      const d = parseSoloFecha(s);
      if (d) out[key] = d;
    } else if (DATETIME_FIELDS.has(key)) {
      const dt = parseFechaHora(s) ?? (parseSoloFecha(s) ? `${parseSoloFecha(s)}T00:00:00` : null);
      if (dt) out[key] = dt;
    } else if (INT_FIELDS.has(key)) {
      const n = parseEntero(s);
      if (n != null) out[key] = n;
    } else if (BOOL_FIELDS.has(key)) {
      const b = parseBoolean(s);
      if (b != null) out[key] = b;
    } else {
      out[key] = normUpper(s);
    }
  }
  return {
    ...out,
    referencia_externa: ref,
    ejecutivo: out.ejecutivo || "RODRIGO CACERES",
    estado_operacion: out.estado_operacion || "COMPLETADO",
    tipo_operacion: out.tipo_operacion || "EXPORTACION",
    cliente: out.cliente || "ALMAFRUIT",
    contrato: ref ? contratoForRef(ref) : out.contrato,
    dueno_reserva: ref ? duenoForRef(ref) : out.dueno_reserva,
    origen_registro: out.origen_registro || "MIGRACION_EXCEL",
  };
}

async function readRows() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX);
  const ws = wb.getWorksheet("Reservas");
  if (!ws) throw new Error("Hoja Reservas no encontrada");
  const headers = [];
  ws.getRow(1).eachCell((cell, col) => { headers[col] = str(cell.value); });
  const rows = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj = {};
    let hasData = false;
    row.eachCell((cell, col) => {
      const h = headers[col];
      if (!h) return;
      const v = str(cell.value);
      if (v) hasData = true;
      obj[h] = v;
    });
    if (hasData && obj.referencia_externa) rows.push(obj);
  });
  return rows;
}

const rawRows = await readRows();
console.log(`Filas en Excel: ${rawRows.length}`);

const refs = rawRows.map((r) => r.referencia_externa);
const { data: existing } = await admin
  .from("operaciones")
  .select("referencia_externa")
  .in("referencia_externa", refs)
  .is("deleted_at", null);

const existingSet = new Set((existing ?? []).map((e) => e.referencia_externa));
const toInsert = rawRows.filter((r) => !existingSet.has(r.referencia_externa));
const skipped = rawRows.length - toInsert.length;

if (skipped) console.log(`Omitidas (ya existen): ${skipped}`);

let ok = 0;
let fail = 0;
const results = [];

for (let i = 0; i < toInsert.length; i++) {
  const payload = buildPayload(toInsert[i]);
  const { data, error } = await admin.from("operaciones").insert(payload).select("id, ref_asli, referencia_externa").single();
  if (error) {
    fail++;
    results.push({ ref: toInsert[i].referencia_externa, ok: false, error: error.message });
    console.error(`✗ ${toInsert[i].referencia_externa}: ${error.message}`);
  } else {
    ok++;
    results.push({ ref: data.referencia_externa, ok: true, ref_asli: data.ref_asli, id: data.id });
    console.log(`✓ ${data.referencia_externa} → ${data.ref_asli}`);
  }
}

console.log(`\nResumen: ${ok} insertadas, ${fail} fallidas, ${skipped} omitidas (duplicadas)`);
if (fail > 0) process.exit(1);
