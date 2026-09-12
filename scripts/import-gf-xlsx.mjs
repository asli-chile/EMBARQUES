/**
 * Importa DETALLE GF EXPORT 25_26-1.xlsx → public.operaciones.
 *
 * Hoja "GF EXPORT ASLI": cabecera en 2 filas (sección + columnas).
 * Cliente por fila (Lang Hao / Fruit Seeker / Happy Farm).
 *
 * Uso:
 *   node --env-file=.env.local scripts/import-gf-xlsx.mjs --dry-run
 *   node --env-file=.env.local scripts/import-gf-xlsx.mjs
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
  aRut,
  partirPatente,
  texto,
} from "../tools/detalle-master/lib.mjs";

const root = process.cwd();
if (existsSync(resolve(root, ".env.local"))) config({ path: resolve(root, ".env.local") });
if (existsSync(resolve(root, ".env"))) config({ path: resolve(root, ".env") });

const DEFAULT_FILE = "DETALLE GF EXPORT 25_26-1.xlsx";
const ORIGEN = "migracion_gf_xlsx";
const TEMPORADA = "25-26";

/** Índices de calibre en la fila de datos (fila 1 = cabeceras). */
const CAL_25 = { desde: 20, etiquetas: ["J", "2J", "3J", "4J", "5J"], total: 25 };
const CAL_5 = { desde: 26, etiquetas: ["XL", "J", "2J", "3J", "4J"], total: 31 };

/**
 * El Excel GF usa miles con coma estilo US: "1,065" = 1065, "17,600.00" = 17600.
 * No usar aNumero() de detalle-master (asume coma decimal europea).
 */
function aNumeroUs(txt) {
  let s = String(txt ?? "")
    .replace(/USD/gi, "")
    .replace(/[$\s]/g, "")
    .trim();
  if (!s || s === "-") return null;
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    s = s.replace(/,/g, "");
  } else if (/^\d{1,3}(\.\d{3})+(,\d+)$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

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
  const n = aNumeroUs(v);
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

function fixPod(v) {
  const s = texto(v);
  if (!s) return null;
  const u = s.toUpperCase();
  if (u === "HONG KONG" || u === "HONGKONG") return "HONG KONG";
  if (u === "SHANGHAI") return "SHANGHAI";
  return s.toUpperCase();
}

function limpiarGuia(v) {
  const s = texto(v);
  if (!s) return null;
  return s.replace(/^[Nn][º°oO.]?\s*/u, "").trim() || null;
}

/** "USD 70,400.00" → número */
function parseFob(v) {
  return aNumeroUs(v);
}

function extraerCalibresGf(cruda) {
  const salida = {};
  let hay = false;

  const bloque25 = {};
  CAL_25.etiquetas.forEach((etq, i) => {
    const n = aNumeroUs(cruda[CAL_25.desde + i]);
    if (n != null && n !== 0) {
      bloque25[etq] = n;
      hay = true;
    }
  });
  if (Object.keys(bloque25).length) salida["2.5KG"] = bloque25;

  const bloque5 = {};
  CAL_5.etiquetas.forEach((etq, i) => {
    const n = aNumeroUs(cruda[CAL_5.desde + i]);
    if (n != null && n !== 0) {
      bloque5[etq] = n;
      hay = true;
    }
  });
  if (Object.keys(bloque5).length) salida["5KG"] = bloque5;

  return {
    calibres: hay ? salida : null,
    total25: aNumeroUs(cruda[CAL_25.total]),
    total5: aNumeroUs(cruda[CAL_5.total]),
  };
}

function readGfRows(path) {
  const wb = XLSX.read(readFileSync(path), { cellDates: false, raw: false });
  const sheetName =
    wb.SheetNames.find((n) => /GF\s*EXPORT/i.test(n)) ?? wb.SheetNames[0];
  if (!sheetName) throw new Error("El Excel no tiene hojas");

  const matriz = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
    header: 1,
    raw: false,
    defval: "",
  });
  if (matriz.length < 3) throw new Error("La hoja no tiene datos");

  // Fila 0 = secciones, fila 1 = nombres de columna
  const cabecera = matriz[1].map((h) => String(h ?? "").trim());
  const rows = [];

  for (let i = 2; i < matriz.length; i++) {
    const cruda = matriz[i];
    const obj = {};
    let vacia = true;
    cabecera.forEach((col, c) => {
      const val = String(cruda[c] ?? "").trim();
      // Cabeceras repetidas (J, 2J…): conservar la primera
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
  const { calibres, total25, total5 } = extraerCalibresGf(row.__cruda);
  const semana = parseIntOrNull(row["S.ZARPE"]);
  const tt = parseIntOrNull(row.TT);
  const okCliente = String(row["Ok cliente"] ?? row[""] ?? "")
    .trim()
    .toLowerCase();
  // La columna "Ok cliente" a veces queda sin nombre en cabecera; leer por índice 39
  const okRaw = String(row.__cruda?.[39] ?? okCliente).trim().toLowerCase();
  const cerrada = okRaw === "ok";

  return {
    ingreso: new Date().toISOString(),
    semana: semana && semana > 0 ? semana : null,
    ejecutivo: "RODRIGO CACERES",
    estado_operacion: cerrada ? "OPERACION_CERRADA" : "RESERVA_CONFIRMADA",
    tipo_operacion: "EXPORTACIÓN MARITIMO",
    cliente: texto(row.CLIENTE) ?? "GF EXPORT",
    referencia_externa: texto(row.IE),
    consignatario: texto(row.CONSIGNEE),
    especie: "CEREZA",
    temperatura: "-1",
    ventilacion: "15",
    peso_neto: aNumeroUs(row["KG NETO"]),
    peso_bruto: aNumeroUs(row["KG BRUTO"]),
    naviera: fixNaviera(row.NAVIERA),
    nave: texto(row.NAVE),
    pol: fixPol(row.POL),
    pod: fixPod(row.POD),
    etd: aFechaIso(row.ETD),
    eta: aFechaIso(row.ETA),
    tt: tt && tt > 0 ? tt : null,
    booking: texto(row.BOOKING),
    contenedor: texto(row.CONTENEDOR),
    sello: texto(row.SELLO),
    sello_planta: texto(row["SELLO PLANTA"]),
    tara: aNumeroUs(row.TARA),
    chofer: texto(row.CONDUCTOR),
    rut_chofer: aRut(row.RUT),
    telefono_chofer: texto(row.CONTACTO),
    patente_camion: camion,
    patente_remolque: remolque,
    dueno_reserva: "ASLI",
    contrato: "ASLI",
    numero_guia_despacho: limpiarGuia(row["GUIA DESPACHO"]),
    fob_invoice: parseFob(row["FOB INVOICE"]),
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

  const { sheetName, rows } = readGfRows(xlsxPath);
  const payloads = rows.map(rowToOperacion);

  console.log("Archivo:", xlsxPath);
  console.log("Hoja:", sheetName);
  console.log("Filas:", payloads.length, dryRun ? "(dry-run)" : "");
  console.log("Temporada:", TEMPORADA);
  console.log(
    "Clientes:",
    Object.fromEntries(
      [
        ...payloads.reduce(
          (m, p) => m.set(p.cliente ?? "(null)", (m.get(p.cliente ?? "(null)") ?? 0) + 1),
          new Map(),
        ),
      ],
    ),
  );
  console.log(
    "Estados:",
    Object.fromEntries(
      [
        ...payloads.reduce(
          (m, p) => m.set(p.estado_operacion, (m.get(p.estado_operacion) ?? 0) + 1),
          new Map(),
        ),
      ],
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

  const refs = payloads.map((p) => p.referencia_externa).filter(Boolean);
  const { data: existing, error: existErr } = await supabase
    .from("operaciones")
    .select("id, referencia_externa, cliente, origen_registro")
    .in("referencia_externa", refs)
    .eq("origen_registro", ORIGEN)
    .is("deleted_at", null);

  if (existErr) {
    console.error("Error buscando existentes:", existErr.message);
    process.exit(1);
  }

  const existingSet = new Set(
    (existing ?? []).map((e) => `${String(e.cliente).trim().toUpperCase()}|${String(e.referencia_externa).trim().toUpperCase()}`),
  );
  const toInsert = payloads.filter(
    (p) =>
      !existingSet.has(
        `${String(p.cliente).trim().toUpperCase()}|${String(p.referencia_externa).trim().toUpperCase()}`,
      ),
  );
  const skipped = payloads.length - toInsert.length;
  if (skipped) console.log("Omitidas (ya migradas GF):", skipped);

  toInsert.sort((a, b) => String(a.referencia_externa).localeCompare(String(b.referencia_externa)));

  let ok = 0;
  let fail = 0;
  for (const payload of toInsert) {
    const { data, error } = await supabase
      .from("operaciones")
      .insert(payload)
      .select("id, ref_asli, referencia_externa, booking, cliente")
      .single();

    if (error) {
      fail++;
      console.error(`✗ ${payload.referencia_externa} (${payload.cliente}): ${error.message}`);
    } else {
      ok++;
      console.log(`✓ ${data.referencia_externa} → ${data.ref_asli} · ${data.cliente} · ${data.booking}`);
    }
  }

  console.log(`\nResumen: ${ok} insertadas, ${fail} fallidas, ${skipped} omitidas`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
