/**
 * Importa la hoja "COPRAMAR ASLI" de DETALLE COPRAMAR AUT.xlsx → public.operaciones.
 *
 * Uso:
 *   node --env-file=.env.local scripts/import-copramar-xlsx.mjs --dry-run
 *   node --env-file=.env.local scripts/import-copramar-xlsx.mjs
 *
 * Otro archivo: --file="ruta.xlsx"
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import XLSX from "xlsx-js-style";

const root = process.cwd();
if (existsSync(resolve(root, ".env.local"))) config({ path: resolve(root, ".env.local") });
if (existsSync(resolve(root, ".env"))) config({ path: resolve(root, ".env") });

const DEFAULT_FILE = "DETALLE COPRAMAR AUT.xlsx";
const SHEET_MATCH = /COPRAMAR\s*ASLI/i;
const ORIGEN = "migracion_copramar_xlsx";
const TEMPORADA = "26-27";

function arg(name) {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  return process.argv[i + 1] ?? true;
}

const dryRun = process.argv.includes("--dry-run");
const fileArg = typeof arg("--file") === "string" ? arg("--file") : null;
const xlsxPath = resolve(root, fileArg || DEFAULT_FILE);

function assertJwtEsServiceRole(key) {
  if (!key || typeof key !== "string") return;
  const parts = key.split(".");
  if (parts.length !== 3) return;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (payload.role !== "service_role") {
      console.error("SUPABASE_SERVICE_ROLE_KEY no es service_role. Usa la secret del Dashboard.");
      process.exit(1);
    }
  } catch {
    /* ignore */
  }
}

function str(v) {
  if (v == null) return "";
  return String(v).trim().replace(/\u00a0/g, " ");
}

function parseDate(v) {
  const s = str(v);
  if (!s) return null;

  // dd-mm-yyyy | dd/mm/yyyy
  let m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (m) {
    return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }

  // m/d/yy o m/d/yyyy (formato US visto en el Excel)
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    const month = m[1].padStart(2, "0");
    const day = m[2].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parseIntOrNull(v) {
  const s = str(v);
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function fixNaviera(v) {
  const s = str(v).toUpperCase();
  if (s === "WAH HAI") return "WAN HAI";
  return str(v) || null;
}

function buildObservaciones(row) {
  const parts = [];
  const bl = str(row.BL);
  if (bl) parts.push(`BL: ${bl}`);
  if (str(row["SEG CARGA"]).toUpperCase() === "TRUE") parts.push("Seg. carga");
  if (str(row["IREEF PRO"]).toUpperCase() === "TRUE") parts.push("IReefer Pro");
  if (str(row["ASLI FEE"]).toUpperCase() === "TRUE") parts.push("ASLI fee OK");
  if (str(row.PAGO).toUpperCase() === "TRUE") parts.push("Pago flete OK");
  return parts.length ? parts.join(" | ") : null;
}

function readCopramarRows(path) {
  const wb = XLSX.readFile(path, { cellDates: true, raw: false });
  const sheetName = wb.SheetNames.find((n) => SHEET_MATCH.test(n));
  if (!sheetName) {
    throw new Error(`No se encontró hoja COPRAMAR ASLI. Hojas: ${wb.SheetNames.join(", ")}`);
  }

  const ws = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });
  if (aoa.length < 3) throw new Error("La hoja no tiene datos");

  const headers = aoa[1];
  const uniq = [];
  const seen = {};
  headers.forEach((h, i) => {
    let key = h == null ? `COL_${i}` : String(h).trim();
    if (!key) key = `COL_${i}`;
    if (seen[key]) {
      seen[key] += 1;
      key = `${key}_${seen[key]}`;
    } else {
      seen[key] = 1;
    }
    uniq.push(key);
  });

  const rows = [];
  for (let r = 2; r < aoa.length; r++) {
    const line = aoa[r];
    if (!line || !line.some((c) => c != null && String(c).trim() !== "")) continue;
    const obj = {};
    uniq.forEach((k, i) => {
      obj[k] = line[i] ?? null;
    });
    if (!str(obj.BOOKING)) continue;
    rows.push(obj);
  }

  return { sheetName, rows };
}

function rowToOperacion(row) {
  const refCliente = str(row["REF CLIENTE"]);
  const cancelada = refCliente.toUpperCase() === "CANCELADO";
  const semanaRaw = parseIntOrNull(row["S.ZARPE"]);

  return {
    ingreso: new Date().toISOString(),
    semana: semanaRaw && semanaRaw > 0 ? semanaRaw : null,
    ejecutivo: "Hans Vasquez",
    estado_operacion: cancelada ? "CANCELADA" : "RESERVA_CONFIRMADA",
    tipo_operacion: "EXPORTACIÓN MARITIMO",
    cliente: "COPRAMAR",
    referencia_externa: cancelada || !refCliente ? null : refCliente,
    forma_pago: str(row.FLETE) || null,
    especie: str(row.COMMODITY) || null,
    temperatura: str(row.TEMP) || null,
    naviera: fixNaviera(row.NAVIERA),
    nave: str(row.NAVE) || null,
    pol: str(row.POL) || null,
    pod: str(row.POD) || null,
    etd: parseDate(row.ETD),
    eta: parseDate(row.ETA),
    tt: (() => {
      const n = parseIntOrNull(row.TT);
      return n && n > 0 ? n : null;
    })(),
    booking: str(row.BOOKING),
    deposito: str(row.DEPOSITO) || null,
    contenedor: str(row.CONTENEDOR) || null,
    sello: str(row.SELLO) || null,
    dueno_reserva: "ASLI",
    temporada: TEMPORADA,
    origen_registro: ORIGEN,
    observaciones: buildObservaciones(row),
    enviado_transporte: false,
  };
}

async function main() {
  const url = process.env.PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Faltan PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  assertJwtEsServiceRole(key);

  if (!existsSync(xlsxPath)) {
    console.error("No existe el archivo:", xlsxPath);
    process.exit(1);
  }

  const { sheetName, rows } = readCopramarRows(xlsxPath);
  const payloads = rows.map(rowToOperacion);

  console.log("Archivo:", xlsxPath);
  console.log("Hoja:", sheetName);
  console.log("Filas con booking:", payloads.length, dryRun ? "(dry-run)" : "");
  console.log(
    "Canceladas:",
    payloads.filter((p) => p.estado_operacion === "CANCELADA").length,
  );

  const bookings = payloads.map((p) => p.booking);

  if (dryRun) {
    console.log("\nMuestra (3 primeras):");
    console.log(JSON.stringify(payloads.slice(0, 3), null, 2));
    const sinFecha = payloads.filter((p) => !p.etd).length;
    console.log("Sin ETD:", sinFecha);
    console.log("OK dry-run.");
    return;
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing, error: existErr } = await supabase
    .from("operaciones")
    .select("id, booking")
    .in("booking", bookings)
    .eq("cliente", "COPRAMAR")
    .is("deleted_at", null);

  if (existErr) {
    console.error("Error buscando existentes:", existErr.message);
    process.exit(1);
  }

  const existingSet = new Set((existing ?? []).map((e) => str(e.booking)));
  const toInsert = payloads.filter((p) => !existingSet.has(p.booking));
  const skipped = payloads.length - toInsert.length;
  if (skipped) console.log("Omitidas (booking ya existe):", skipped);

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < toInsert.length; i++) {
    const payload = toInsert[i];
    const { data, error } = await supabase
      .from("operaciones")
      .insert(payload)
      .select("id, ref_asli, booking, estado_operacion")
      .single();

    if (error) {
      fail++;
      console.error(`✗ ${payload.booking}: ${error.message}`);
    } else {
      ok++;
      console.log(`✓ ${data.booking} → ${data.ref_asli} [${data.estado_operacion}]`);
    }
  }

  console.log(`\nResumen: ${ok} insertadas, ${fail} fallidas, ${skipped} omitidas`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
