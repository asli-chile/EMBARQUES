/**
 * Importa rino 2526.xlsx → public.operaciones (cliente RINOFRUIT).
 *
 * Uso:
 *   node --env-file=.env.local scripts/import-rino-xlsx.mjs --dry-run
 *   node --env-file=.env.local scripts/import-rino-xlsx.mjs
 *
 * Otro archivo: --file="ruta.xlsx"
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import XLSX from "xlsx-js-style";

const root = process.cwd();
if (existsSync(resolve(root, ".env.local"))) config({ path: resolve(root, ".env.local") });
if (existsSync(resolve(root, ".env"))) config({ path: resolve(root, ".env") });

const DEFAULT_FILE = "rino 2526.xlsx";
const ORIGEN = "migracion_rino_xlsx";
const TEMPORADA = "25-26";
const CLIENTE = "RINOFRUIT";

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

function texto(v) {
  const s = str(v);
  return s === "" || s === "-" ? null : s;
}

/** Excel serial (días desde 1899-12-30) o dd-mm-yyyy / ISO → yyyy-mm-dd. */
function aFechaIso(v) {
  const s = str(v);
  if (!s) return null;

  if (/^\d{4,5}(\.\d+)?$/.test(s)) {
    const n = Math.round(Number(s));
    if (Number.isFinite(n) && n > 20000) {
      const utc = Date.UTC(1899, 11, 30) + n * 86400000;
      return new Date(utc).toISOString().slice(0, 10);
    }
  }

  let m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parseRefAsli(v) {
  const s = str(v).toUpperCase();
  const m = s.match(/^A0*(\d+)$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizarContenedor(v) {
  const s = texto(v);
  if (!s) return null;
  return s.replace(/\s+/g, "").toUpperCase();
}

function fixNaviera(v) {
  const s = str(v).toUpperCase();
  if (!s) return null;
  if (s.includes("HAPAG")) return "HAPAG-LLOYD";
  if (s.includes("WAN HAI") || s === "WAH HAI") return "WAN HAI";
  if (s.includes("YANG")) return "YANG MING";
  if (s.includes("CMA")) return "CMA-CGM";
  if (s === "MSC") return "MSC";
  if (s === "OOCL") return "OOCL";
  if (s === "ONE") return "ONE";
  return texto(v);
}

function fixPol(v) {
  const s = str(v).toUpperCase();
  if (s === "VAP" || s === "VALPARAISO" || s === "VALPARAÍSO") return "VALPARAISO";
  if (s === "SAI" || s === "SAN ANTONIO") return "SAN ANTONIO";
  return texto(v);
}

function fixEjecutivo(v) {
  const s = texto(v);
  if (!s) return "MARIO BASAEZ";
  return s.toUpperCase();
}

function semanaDesdeEtd(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  // ISO week
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
}

function readRinoRows(path) {
  const wb = XLSX.read(readFileSync(path), { cellDates: false, raw: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("El Excel no tiene hojas");

  const matriz = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
    header: 1,
    raw: false,
    defval: "",
  });
  if (matriz.length < 2) throw new Error("La hoja no tiene datos");

  const cabecera = matriz[0].map((h) => String(h ?? "").trim());
  const rows = [];

  for (let i = 1; i < matriz.length; i++) {
    const cruda = matriz[i];
    const obj = {};
    let vacia = true;
    cabecera.forEach((col, c) => {
      const val = String(cruda[c] ?? "").trim();
      if (col !== "" && obj[col] === undefined) obj[col] = val;
      if (val !== "") vacia = false;
    });
    if (vacia) continue;
    if (!texto(obj.BOOKING) && !texto(obj["N°REF ASLI"])) continue;
    rows.push(obj);
  }

  return { sheetName, rows };
}

function rowToOperacion(row) {
  const correlativo = parseRefAsli(row["N°REF ASLI"]);
  const etd = aFechaIso(row.ETD);
  const eta = aFechaIso(row.ETA);
  const blSwb = texto(row["ESTADO BL/SWB"]);
  const tt =
    etd && eta
      ? Math.round((new Date(`${eta}T12:00:00Z`) - new Date(`${etd}T12:00:00Z`)) / 86400000)
      : null;

  return {
    ingreso: new Date().toISOString(),
    correlativo,
    semana: semanaDesdeEtd(etd),
    ejecutivo: fixEjecutivo(row.Ejecutivo),
    estado_operacion: "OPERACION_CERRADA",
    tipo_operacion: "EXPORTACIÓN MARITIMO",
    cliente: CLIENTE,
    especie: texto(row.ESPECIE) || "CEREZA",
    temperatura: "-1",
    ventilacion: "15",
    naviera: fixNaviera(row.NAVIERA),
    nave: texto(row["NAVE INICIAL"]),
    pol: fixPol(row.POL),
    pod: texto(row.POD),
    etd,
    eta,
    tt: tt && tt > 0 ? tt : null,
    booking: texto(row.BOOKING),
    contenedor: normalizarContenedor(row["N° CTDR"]),
    dueno_reserva: "ASLI",
    contrato: texto(row.CONTRATO) || "ASLI",
    temporada: TEMPORADA,
    origen_registro: ORIGEN,
    enviado_transporte: Boolean(normalizarContenedor(row["N° CTDR"])),
    observaciones: blSwb ? `BL/SWB: ${blSwb}` : null,
    swb: blSwb && /swb/i.test(blSwb) ? blSwb : null,
    incoterm: "FOB",
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

  const { sheetName, rows } = readRinoRows(xlsxPath);
  const payloads = rows.map(rowToOperacion);

  const sinCorrelativo = payloads.filter((p) => !p.correlativo);
  const sinBooking = payloads.filter((p) => !p.booking);
  const sinEtd = payloads.filter((p) => !p.etd);

  console.log("Archivo:", xlsxPath);
  console.log("Hoja:", sheetName);
  console.log("Filas:", payloads.length, dryRun ? "(dry-run)" : "");
  console.log("Temporada destino:", TEMPORADA);
  console.log("Cliente:", CLIENTE);
  console.log("Sin correlativo:", sinCorrelativo.length);
  console.log("Sin booking:", sinBooking.length);
  console.log("Sin ETD:", sinEtd.length);

  if (sinCorrelativo.length || sinBooking.length) {
    console.error("Hay filas incompletas; aborto.");
    process.exit(1);
  }

  if (dryRun) {
    console.log("\nMuestra (3 primeras):");
    console.log(JSON.stringify(payloads.slice(0, 3), null, 2));
    console.log("OK dry-run.");
    return;
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const bookings = payloads.map((p) => p.booking);
  const correlativos = payloads.map((p) => p.correlativo);

  const { data: existingByBooking, error: e1 } = await supabase
    .from("operaciones")
    .select("id, booking, correlativo, ref_asli")
    .in("booking", bookings)
    .eq("cliente", CLIENTE)
    .eq("temporada", TEMPORADA)
    .is("deleted_at", null);

  if (e1) {
    console.error("Error buscando por booking:", e1.message);
    process.exit(1);
  }

  const { data: existingByCorr, error: e2 } = await supabase
    .from("operaciones")
    .select("id, booking, correlativo, ref_asli, cliente")
    .in("correlativo", correlativos)
    .eq("temporada", TEMPORADA)
    .is("deleted_at", null);

  if (e2) {
    console.error("Error buscando por correlativo:", e2.message);
    process.exit(1);
  }

  const bookingSet = new Set((existingByBooking ?? []).map((e) => String(e.booking).trim()));
  const corrMap = new Map((existingByCorr ?? []).map((e) => [e.correlativo, e]));

  const toInsert = [];
  let skipped = 0;

  for (const payload of payloads) {
    if (bookingSet.has(payload.booking)) {
      skipped++;
      console.log(`↷ omitida booking ${payload.booking} (ya existe)`);
      continue;
    }
    const clash = corrMap.get(payload.correlativo);
    if (clash) {
      console.error(
        `✗ A${String(payload.correlativo).padStart(5, "0")} ya usado por ${clash.cliente} (${clash.booking})`,
      );
      process.exit(1);
    }
    toInsert.push(payload);
  }

  toInsert.sort((a, b) => a.correlativo - b.correlativo);

  let ok = 0;
  let fail = 0;
  for (const payload of toInsert) {
    const { data, error } = await supabase
      .from("operaciones")
      .insert(payload)
      .select("id, ref_asli, correlativo, booking, contenedor")
      .single();

    if (error) {
      fail++;
      console.error(`✗ A${String(payload.correlativo).padStart(5, "0")}: ${error.message}`);
    } else {
      ok++;
      console.log(`✓ ${data.ref_asli} → ${data.booking} [${data.contenedor || "sin ctn"}]`);
    }
  }

  console.log(`\nResumen: ${ok} insertadas, ${fail} fallidas, ${skipped} omitidas`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
