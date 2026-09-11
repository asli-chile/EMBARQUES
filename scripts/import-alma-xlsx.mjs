/**
 * Importa detalle alma.xlsx → public.operaciones (cliente ALMAFRUIT).
 *
 * Uso:
 *   node --env-file=.env.local scripts/import-alma-xlsx.mjs --dry-run
 *   node --env-file=.env.local scripts/import-alma-xlsx.mjs
 *
 * Otro archivo: --file="ruta.xlsx"
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import XLSX from "xlsx-js-style";
import {
  aFechaIso,
  aNumero,
  aRut,
  extraerCalibres,
  partirPatente,
  texto,
} from "../tools/detalle-master/lib.mjs";

const root = process.cwd();
if (existsSync(resolve(root, ".env.local"))) config({ path: resolve(root, ".env.local") });
if (existsSync(resolve(root, ".env"))) config({ path: resolve(root, ".env") });

const DEFAULT_FILE = "detalle alma.xlsx";
const ORIGEN = "migracion_alma_xlsx";
const TEMPORADA = "25-26";
const CLIENTE = "ALMAFRUIT";

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

function parseIntOrNull(v) {
  const n = aNumero(v);
  if (n == null) return null;
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function fixNaviera(v) {
  const s = String(v ?? "").trim().toUpperCase();
  if (!s) return null;
  if (s.includes("HAPAG")) return "HAPAG-LLOYD";
  if (s.includes("WAN HAI") || s === "WAH HAI") return "WAN HAI";
  if (s.includes("YANG")) return "YANG MING";
  if (s.includes("CMA")) return "CMA CGM";
  if (s === "MSC") return "MSC";
  if (s === "ONE") return "ONE";
  return texto(v);
}

function fixPol(v) {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "VAP" || s === "VALPARAISO" || s === "VALPARAÍSO") return "VALPARAISO";
  if (s === "SAI" || s === "SAN ANTONIO") return "SAN ANTONIO";
  return texto(v);
}

function fixDueno(v) {
  const s = String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (s === "ASLI") return "ASLI";
  if (s.includes("CHIL") || s.includes("CHILL")) return "CHILFRESH";
  return texto(v);
}

function limpiarGuia(v) {
  const s = texto(v);
  if (!s) return null;
  return s.replace(/^[Nn][º°oO.]?\s*/u, "").trim() || null;
}

function readAlmaRows(path) {
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
    if (!texto(obj.IE) || !texto(obj.BOOKING)) continue;
    rows.push({ ...obj, __cruda: cruda });
  }

  return { sheetName, rows };
}

function rowToOperacion(row) {
  const { camion, remolque } = partirPatente(row.PATENTE);
  const { calibres, total25, total5 } = extraerCalibres(row.__cruda);
  const dueno = fixDueno(row["BOOKED BY"]);
  const semana = parseIntOrNull(row["S.ZARPE"]);
  const tt = parseIntOrNull(row.TT);

  return {
    ingreso: new Date().toISOString(),
    semana: semana && semana > 0 ? semana : null,
    ejecutivo: "RODRIGO CACERES",
    estado_operacion: "OPERACION_CERRADA",
    tipo_operacion: "EXPORTACIÓN MARITIMO",
    cliente: CLIENTE,
    referencia_externa: texto(row.IE),
    consignatario: texto(row.CONSIGNE),
    especie: "CEREZA",
    temperatura: "-1",
    ventilacion: "15",
    peso_neto: aNumero(row["KG NETO"]),
    peso_bruto: aNumero(row["KG BRUTO"]),
    naviera: fixNaviera(row.NAVIERA),
    nave: texto(row.NAVE),
    pol: fixPol(row.POL),
    pod: texto(row.POD),
    etd: aFechaIso(row.ETD),
    eta: aFechaIso(row.ETA),
    tt: tt && tt > 0 ? tt : null,
    booking: texto(row.BOOKING),
    contenedor: texto(row.CONTENEDOR),
    sello: texto(row.SELLO),
    sello_planta: texto(row["SELLO PLANTA"]),
    tara: aNumero(row.TARA),
    chofer: texto(row.CONDUCTOR),
    rut_chofer: aRut(row.RUT),
    telefono_chofer: texto(row.CONTACTO),
    patente_camion: camion,
    patente_remolque: remolque,
    dueno_reserva: dueno,
    contrato: dueno === "ASLI" ? "ASLI" : dueno === "CHILFRESH" ? "CHILL FRESH" : null,
    numero_guia_despacho: limpiarGuia(row["GUIA DESPACHO"]),
    fob_invoice: aNumero(row["FOB INVOICE"]),
    swb: texto(row.SWB),
    dus: texto(row["DUS LEG"]),
    cajas_calibres: calibres,
    total_cajas_25kg: total25,
    total_cajas_5kg: total5,
    temporada: TEMPORADA,
    origen_registro: ORIGEN,
    enviado_transporte: Boolean(texto(row.CONDUCTOR) || camion),
    incoterm: "FOB",
  };
}

async function ensureTemporada(supabase) {
  const { data: existing, error } = await supabase
    .from("temporadas")
    .select("id, nombre, activa")
    .ilike("nombre", TEMPORADA)
    .maybeSingle();

  if (error) throw new Error(`Buscando temporada: ${error.message}`);
  if (existing) return existing;

  const { data: created, error: createErr } = await supabase
    .from("temporadas")
    .insert({
      nombre: TEMPORADA,
      descripcion: "Temporada cereza 2025-2026 (histórica Almafruit).",
      fecha_inicio: "2025-09-01",
      fecha_fin: "2026-03-30",
      activa: false,
      cerrada: true,
    })
    .select("id, nombre, activa")
    .single();

  if (createErr) throw new Error(`Creando temporada ${TEMPORADA}: ${createErr.message}`);
  console.log(`Temporada creada: ${TEMPORADA}`);
  return created;
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

  const { sheetName, rows } = readAlmaRows(xlsxPath);
  const payloads = rows.map(rowToOperacion);

  console.log("Archivo:", xlsxPath);
  console.log("Hoja:", sheetName);
  console.log("Filas:", payloads.length, dryRun ? "(dry-run)" : "");
  console.log("Temporada destino:", TEMPORADA);
  console.log(
    "Dueños:",
    Object.fromEntries(
      [...payloads.reduce((m, p) => m.set(p.dueno_reserva ?? "(null)", (m.get(p.dueno_reserva ?? "(null)") ?? 0) + 1), new Map())],
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

  await ensureTemporada(supabase);

  const refs = payloads.map((p) => p.referencia_externa).filter(Boolean);
  const { data: existing, error: existErr } = await supabase
    .from("operaciones")
    .select("id, referencia_externa")
    .in("referencia_externa", refs)
    .eq("cliente", CLIENTE)
    .is("deleted_at", null);

  if (existErr) {
    console.error("Error buscando existentes:", existErr.message);
    process.exit(1);
  }

  const existingSet = new Set((existing ?? []).map((e) => String(e.referencia_externa).trim().toUpperCase()));
  const toInsert = payloads.filter(
    (p) => !existingSet.has(String(p.referencia_externa).trim().toUpperCase()),
  );
  const skipped = payloads.length - toInsert.length;
  if (skipped) console.log("Omitidas (ref ya existe):", skipped);

  // Insertar de 2025M01 → 2025M25 para que el correlativo quede en orden cronológico.
  toInsert.sort((a, b) => String(a.referencia_externa).localeCompare(String(b.referencia_externa)));

  let ok = 0;
  let fail = 0;
  for (const payload of toInsert) {
    const { data, error } = await supabase
      .from("operaciones")
      .insert(payload)
      .select("id, ref_asli, referencia_externa, booking")
      .single();

    if (error) {
      fail++;
      console.error(`✗ ${payload.referencia_externa}: ${error.message}`);
    } else {
      ok++;
      console.log(`✓ ${data.referencia_externa} → ${data.ref_asli} (${data.booking})`);
    }
  }

  console.log(`\nResumen: ${ok} insertadas, ${fail} fallidas, ${skipped} omitidas`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
