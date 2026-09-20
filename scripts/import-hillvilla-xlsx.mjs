/**
 * Importa hillvilla.xlsx → public.operaciones (cliente HILLVILLA).
 *
 * Uso:
 *   node --env-file=.env.local scripts/import-hillvilla-xlsx.mjs --dry-run
 *   node --env-file=.env.local scripts/import-hillvilla-xlsx.mjs
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

const DEFAULT_FILE = "hillvilla.xlsx";
const ORIGEN = "migracion_hillvilla_xlsx";
const TEMPORADA = "25-26";
const CLIENTE = "HILLVILLA";

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

/** dd-mm-yyyy | dd/mm/yyyy | yyyy-mm-dd | serial Excel → yyyy-mm-dd. */
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

function aFechaIsoHora(v) {
  const day = aFechaIso(v);
  if (!day) return null;
  return `${day}T12:00:00.000Z`;
}

function parseIntOrNull(v) {
  const s = str(v);
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
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
  if (s.includes("CMA")) return "CMA CGM";
  if (s.includes("MSC")) return "MSC";
  if (s.includes("ONE")) return "ONE";
  return texto(v);
}

function fixPol(v) {
  const s = str(v).toUpperCase();
  if (s === "VAP" || s === "VALPARAISO" || s === "VALPARAÍSO") return "VALPARAISO";
  if (s === "SAI" || s === "SAN ANTONIO") return "SAN ANTONIO";
  return texto(v);
}

function fixPod(v) {
  const s = texto(v);
  if (!s) return null;
  const u = s.toUpperCase();
  if (u === "HONG KONG" || u === "HONGKONG") return "HONG KONG";
  if (u === "SHANGHAI") return "SHANGHAI";
  return u;
}

function semanaDesdeEtd(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
}

function buildObservaciones(row) {
  const parts = [];
  const ct = texto(row.CT);
  if (ct) parts.push(`CT: ${ct}`);
  const tipo = texto(row["TIPO INGRESO"]);
  if (tipo) parts.push(`Tipo ingreso: ${tipo}`);
  const navRaw = texto(row.NAVIERA);
  if (navRaw && navRaw.includes("/")) parts.push(`Naviera origen: ${navRaw}`);
  return parts.length ? parts.join(" | ") : null;
}

function readHillvillaRows(path) {
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
    if (!texto(obj.BOOKING)) continue;
    rows.push(obj);
  }

  return { sheetName, rows };
}

function rowToOperacion(row) {
  const etd = aFechaIso(row.ETD);
  const eta = aFechaIso(row.ETA);
  const tt = parseIntOrNull(row.TT);
  const cbm = parseIntOrNull(row.CBM);
  const ingresoDia = aFechaIso(row.INGRESADO);

  return {
    ingreso: ingresoDia ? `${ingresoDia}T12:00:00.000Z` : new Date().toISOString(),
    semana: semanaDesdeEtd(etd),
    ejecutivo: (texto(row.EJECUTIVO) || "NINA SCOTTI").toUpperCase(),
    estado_operacion: "OPERACION_CERRADA",
    tipo_operacion: "EXPORTACIÓN MARITIMO",
    cliente: CLIENTE,
    especie: texto(row.ESPECIE) || "CEREZA",
    temperatura: texto(row["T°"]) || "-1",
    ventilacion: cbm != null ? String(cbm) : "15",
    naviera: fixNaviera(row.NAVIERA),
    nave: texto(row["NAVE INICIAL"]),
    pol: fixPol(row.POL),
    pod: fixPod(row.POD),
    etd,
    eta,
    tt: tt && tt > 0 ? tt : null,
    booking: texto(row.BOOKING),
    contenedor: normalizarContenedor(row.CONTENEDOR),
    deposito: texto(row["DEPÓSITO"]) || texto(row.DEPOSITO),
    forma_pago: texto(row.FLETE),
    ingreso_stacking: aFechaIsoHora(row["INGRESO STACKING"]),
    dueno_reserva: "ASLI",
    contrato: texto(row.CONTRATO) || "ASLI",
    temporada: TEMPORADA,
    origen_registro: ORIGEN,
    enviado_transporte: Boolean(normalizarContenedor(row.CONTENEDOR)),
    observaciones: buildObservaciones(row),
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

  const { sheetName, rows } = readHillvillaRows(xlsxPath);
  const payloads = rows.map(rowToOperacion);

  console.log("Archivo:", xlsxPath);
  console.log("Hoja:", sheetName);
  console.log("Filas:", payloads.length, dryRun ? "(dry-run)" : "");
  console.log("Temporada:", TEMPORADA);
  console.log("Cliente:", CLIENTE);
  console.log(
    "Navieras:",
    Object.fromEntries(
      [...payloads.reduce((m, p) => m.set(p.naviera ?? "(null)", (m.get(p.naviera ?? "(null)") ?? 0) + 1), new Map())],
    ),
  );
  console.log(
    "Pods:",
    Object.fromEntries(
      [...payloads.reduce((m, p) => m.set(p.pod ?? "(null)", (m.get(p.pod ?? "(null)") ?? 0) + 1), new Map())],
    ),
  );

  if (dryRun) {
    console.log("\nMuestra (2 primeras):");
    console.log(JSON.stringify(payloads.slice(0, 2), null, 2));
    console.log("Sin ETD:", payloads.filter((p) => !p.etd).length);
    console.log("Sin contenedor:", payloads.filter((p) => !p.contenedor).length);
    console.log("OK dry-run.");
    return;
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const bookings = payloads.map((p) => p.booking).filter(Boolean);
  const { data: existing, error: existErr } = await supabase
    .from("operaciones")
    .select("id, booking")
    .in("booking", bookings)
    .eq("cliente", CLIENTE)
    .eq("origen_registro", ORIGEN)
    .is("deleted_at", null);

  if (existErr) {
    console.error("Error buscando existentes:", existErr.message);
    process.exit(1);
  }

  const existingSet = new Set((existing ?? []).map((e) => String(e.booking).trim().toUpperCase()));
  const toInsert = payloads.filter(
    (p) => !existingSet.has(String(p.booking).trim().toUpperCase()),
  );
  const skipped = payloads.length - toInsert.length;
  if (skipped) console.log("Omitidas (ya migradas):", skipped);

  toInsert.sort((a, b) => {
    const etdCmp = String(a.etd ?? "").localeCompare(String(b.etd ?? ""));
    if (etdCmp !== 0) return etdCmp;
    return String(a.booking).localeCompare(String(b.booking));
  });

  let ok = 0;
  let fail = 0;
  for (const payload of toInsert) {
    const { data, error } = await supabase
      .from("operaciones")
      .insert(payload)
      .select("id, ref_asli, booking, contenedor, cliente")
      .single();

    if (error) {
      fail++;
      console.error(`✗ ${payload.booking}: ${error.message}`);
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
