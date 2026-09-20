/**
 * Importa rodrigo caceres.xlsx → public.operaciones.
 *
 * El archivo mezcla dos carteras del ejecutivo Rodrigo Cáceres:
 *   - 2025M*  → ALMAFRUIT (ya migradas vía import-alma-xlsx; se omiten)
 *   - FAS*    → FRUIT ANDES SUR (FAS = Fruit Andes Sur)
 *
 * Deduplicación agresiva (no inserta si ya hay match por):
 *   1) referencia_externa (IE)
 *   2) booking + cliente destino
 *   3) booking + contenedor (cualquier cliente)
 *
 * Uso:
 *   node --env-file=.env.local scripts/import-rodrigo-caceres-xlsx.mjs --dry-run
 *   node --env-file=.env.local scripts/import-rodrigo-caceres-xlsx.mjs
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
  partirPatente,
  texto,
} from "../tools/detalle-master/lib.mjs";

const root = process.cwd();
if (existsSync(resolve(root, ".env.local"))) config({ path: resolve(root, ".env.local") });
if (existsSync(resolve(root, ".env"))) config({ path: resolve(root, ".env") });

const DEFAULT_FILE = "rodrigo caceres.xlsx";
const ORIGEN = "migracion_rodrigo_caceres_xlsx";
const TEMPORADA = "25-26";
const CLIENTE_FAS = "FRUIT ANDES SUR";
const CLIENTE_ALMA = "ALMAFRUIT";

/** Índices de calibre en esta planilla (fila 1 = cabeceras; col 0 = IE). */
const CAL_25 = { desde: 22, etiquetas: ["XL", "J", "2J", "3J", "4J", "5J"], total: 28 };
const CAL_5 = { desde: 29, etiquetas: ["XL", "J", "2J", "3J", "4J"], total: 34 };

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
  if (s.includes("IBERIA")) return "IBERIA AIRLINES";
  if (s === "MSC") return "MSC";
  if (s === "ONE") return "ONE";
  if (s === "OOCL") return "OOCL";
  return texto(v);
}

function fixPol(v) {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "VAP" || s === "VALPARAISO" || s === "VALPARAÍSO") return "VALPARAISO";
  if (s === "SAI" || s === "SAN ANTONIO") return "SAN ANTONIO";
  if (s === "SCL" || s === "SANTIAGO") return "SANTIAGO";
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

function normalizarContenedor(v) {
  const s = texto(v);
  if (!s || s === "-") return null;
  return s.replace(/\s+/g, "").toUpperCase();
}

function normKey(v) {
  return String(v ?? "")
    .toUpperCase()
    .replace(/[\s\-_.]/g, "")
    .trim();
}

function clienteDestino(ie) {
  const s = String(ie ?? "").trim().toUpperCase();
  if (s.startsWith("FAS")) return CLIENTE_FAS;
  if (/^2025M\d+/i.test(s)) return CLIENTE_ALMA;
  return null;
}

function especieDesdeIe(ie, operacion) {
  const s = String(ie ?? "").trim().toUpperCase();
  if (s.includes("CER")) return "CEREZA";
  if (s.includes("AR")) return "ARANDANO";
  if (String(operacion ?? "").toUpperCase().includes("AER")) return "ARANDANO";
  return "CEREZA";
}

function tipoDesdeOperacion(operacion) {
  const s = String(operacion ?? "").toUpperCase();
  if (s.includes("AER")) return "EXPORTACIÓN AEREO";
  return "EXPORTACIÓN MARITIMO";
}

function extraerCalibresRc(cruda) {
  const salida = {};
  let hay = false;

  const bloque25 = {};
  CAL_25.etiquetas.forEach((etq, i) => {
    const n = aNumero(cruda[CAL_25.desde + i]);
    if (n != null && n !== 0) {
      bloque25[etq] = n;
      hay = true;
    }
  });
  if (Object.keys(bloque25).length) salida["2.5KG"] = bloque25;

  const bloque5 = {};
  CAL_5.etiquetas.forEach((etq, i) => {
    const n = aNumero(cruda[CAL_5.desde + i]);
    if (n != null && n !== 0) {
      bloque5[etq] = n;
      hay = true;
    }
  });
  if (Object.keys(bloque5).length) salida["5KG"] = bloque5;

  return {
    calibres: hay ? salida : null,
    total25: aNumero(cruda[CAL_25.total]),
    total5: aNumero(cruda[CAL_5.total]),
  };
}

function readRows(path) {
  const wb = XLSX.read(readFileSync(path), { cellDates: false, raw: false });
  const sheetName = wb.SheetNames[0];
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
  const ie = texto(row.IE);
  const cliente = clienteDestino(ie);
  if (!cliente) {
    throw new Error(`IE no reconocido (ni FAS ni 2025M): ${ie}`);
  }

  const { camion, remolque } = partirPatente(row.PATENTE);
  const { calibres, total25, total5 } = extraerCalibresRc(row.__cruda);
  const dueno = fixDueno(row["BOOKED BY"]);
  const semana = parseIntOrNull(row["S.ZARPE"]);
  const tt = parseIntOrNull(row.TT);
  const especie = especieDesdeIe(ie, row.operacion);
  const aerea = tipoDesdeOperacion(row.operacion).includes("AEREO");

  return {
    ingreso: new Date().toISOString(),
    semana: semana && semana > 0 ? semana : null,
    ejecutivo: "RODRIGO CACERES",
    estado_operacion: "OPERACION_CERRADA",
    tipo_operacion: tipoDesdeOperacion(row.operacion),
    cliente,
    referencia_externa: ie,
    consignatario: texto(row.CONSIGNE),
    especie,
    temperatura: aerea ? null : especie === "ARANDANO" ? "-0.5" : "-1",
    ventilacion: aerea ? null : especie === "ARANDANO" ? "0" : "15",
    peso_neto: aNumero(row["KG NETO"]),
    peso_bruto: aNumero(row["KG BRUTO"]),
    naviera: fixNaviera(row.NAVIERA),
    nave: texto(row.NAVE),
    pol: fixPol(row.POL),
    pod: texto(row.POD) ? String(texto(row.POD)).toUpperCase() : null,
    etd: aFechaIso(row.ETD),
    eta: aFechaIso(row.ETA),
    tt: tt && tt > 0 ? tt : null,
    booking: texto(row.BOOKING),
    deposito: texto(row.DEPOSITO),
    contenedor: normalizarContenedor(row.CONTENEDOR),
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

async function fetchExisting(supabase, payloads) {
  const refs = [...new Set(payloads.map((p) => p.referencia_externa).filter(Boolean))];
  const bookings = [...new Set(payloads.map((p) => p.booking).filter(Boolean))];

  const { data: byRef, error: e1 } = await supabase
    .from("operaciones")
    .select("id, ref_asli, referencia_externa, booking, contenedor, cliente, origen_registro")
    .in("referencia_externa", refs)
    .is("deleted_at", null);
  if (e1) throw new Error(`Buscando por IE: ${e1.message}`);

  const { data: byBook, error: e2 } = await supabase
    .from("operaciones")
    .select("id, ref_asli, referencia_externa, booking, contenedor, cliente, origen_registro")
    .in("booking", bookings)
    .is("deleted_at", null);
  if (e2) throw new Error(`Buscando por booking: ${e2.message}`);

  return { byRef: byRef ?? [], byBook: byBook ?? [] };
}

function classifyRow(payload, existing) {
  const refKey = normKey(payload.referencia_externa);
  const bookKey = normKey(payload.booking);
  const contKey = normKey(payload.contenedor);

  const hitRef = existing.byRef.find((o) => normKey(o.referencia_externa) === refKey);
  if (hitRef) {
    return {
      action: "skip",
      reason: `IE ya existe → ${hitRef.ref_asli} (${hitRef.cliente}, ${hitRef.origen_registro})`,
    };
  }

  const sameClientBook = existing.byBook.find(
    (o) =>
      normKey(o.booking) === bookKey &&
      String(o.cliente).trim().toUpperCase() === payload.cliente.toUpperCase(),
  );
  if (sameClientBook) {
    return {
      action: "skip",
      reason: `booking+cliente ya existe → ${sameClientBook.ref_asli}`,
    };
  }

  if (contKey) {
    const sameBookCont = existing.byBook.find(
      (o) => normKey(o.booking) === bookKey && normKey(o.contenedor) === contKey,
    );
    if (sameBookCont) {
      return {
        action: "skip",
        reason: `booking+contenedor ya existe → ${sameBookCont.ref_asli} (${sameBookCont.cliente})`,
      };
    }
  }

  // ALMAFRUIT 2025M* ya migradas: aunque no matcheara por bug, no reinsertar
  if (payload.cliente === CLIENTE_ALMA) {
    return { action: "skip", reason: "cartera ALMAFRUIT (usar import-alma; no reimportar aquí)" };
  }

  return { action: "insert" };
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

  const { sheetName, rows } = readRows(xlsxPath);
  const payloads = rows.map(rowToOperacion);

  console.log("Archivo:", xlsxPath);
  console.log("Hoja:", sheetName);
  console.log("Filas leídas:", payloads.length, dryRun ? "(dry-run)" : "");
  console.log(
    "Por cliente (Excel):",
    Object.fromEntries(
      [...payloads.reduce((m, p) => m.set(p.cliente, (m.get(p.cliente) ?? 0) + 1), new Map())],
    ),
  );

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const existing = await fetchExisting(supabase, payloads);

  const toInsert = [];
  const skipped = [];
  for (const payload of payloads) {
    const decision = classifyRow(payload, existing);
    if (decision.action === "skip") {
      skipped.push({ ie: payload.referencia_externa, booking: payload.booking, reason: decision.reason });
    } else {
      toInsert.push(payload);
    }
  }

  console.log("\nOmitidas:", skipped.length);
  for (const s of skipped) {
    console.log(`  ↷ ${s.ie} (${s.booking}): ${s.reason}`);
  }
  console.log("A insertar:", toInsert.length);
  console.log(
    "Clientes a insertar:",
    Object.fromEntries(
      [...toInsert.reduce((m, p) => m.set(p.cliente, (m.get(p.cliente) ?? 0) + 1), new Map())],
    ),
  );

  if (dryRun) {
    console.log("\nMuestra a insertar (hasta 3):");
    console.log(JSON.stringify(toInsert.slice(0, 3), null, 2));
    console.log("Sin ETD entre insertables:", toInsert.filter((p) => !p.etd).length);
    console.log("OK dry-run.");
    return;
  }

  toInsert.sort((a, b) => String(a.referencia_externa).localeCompare(String(b.referencia_externa)));

  let ok = 0;
  let fail = 0;
  for (const payload of toInsert) {
    const { data, error } = await supabase
      .from("operaciones")
      .insert(payload)
      .select("id, ref_asli, referencia_externa, booking, cliente, contenedor")
      .single();

    if (error) {
      fail++;
      console.error(`✗ ${payload.referencia_externa}: ${error.message}`);
    } else {
      ok++;
      console.log(
        `✓ ${data.referencia_externa} → ${data.ref_asli} · ${data.cliente} · ${data.booking} [${data.contenedor || "sin ctn"}]`,
      );
    }
  }

  console.log(`\nResumen: ${ok} insertadas, ${fail} fallidas, ${skipped.length} omitidas`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
