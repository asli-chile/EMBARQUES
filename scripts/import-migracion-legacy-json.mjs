/**
 * Importa operaciones desde el JSON legado (cabeceras tipo Excel: INGRESADO, SHIPPER, etc.)
 * hacia public.operaciones vía Supabase service role.
 *
 * Uso:
 *   node --env-file=.env scripts/import-migracion-legacy-json.mjs --dry-run
 *   node --env-file=.env scripts/import-migracion-legacy-json.mjs
 *
 * Por defecto lee: migracion 12-04-2026.json en la raíz del proyecto.
 * Otro archivo: --file="otro.json"
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
if (existsSync(resolve(root, ".env.local"))) config({ path: resolve(root, ".env.local") });
if (existsSync(resolve(root, ".env"))) config({ path: resolve(root, ".env") });

const DEFAULT_FILE = "migracion 12-04-2026.json";

/**
 * La clave anon provoca "permission denied for table operaciones" (RLS).
 * La importación debe usar la secret "service_role" del proyecto.
 */
function assertJwtEsServiceRole(key) {
  if (!key || typeof key !== "string") return;
  const parts = key.split(".");
  if (parts.length !== 3) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY no parece un JWT.");
    return;
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    try {
      const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
      payload = JSON.parse(Buffer.from(b64 + pad, "base64").toString("utf8"));
    } catch {
      return;
    }
  }
  if (payload.role !== "service_role") {
    console.error(
      "SUPABASE_SERVICE_ROLE_KEY no es la clave service_role (JWT role: " +
        String(payload.role) +
        ").\n" +
        "Supabase → Project Settings → API → copia «service_role» (secret), no «anon».\n" +
        "Sin service_role, Postgres/RLS responde: permission denied for table operaciones.",
    );
    process.exit(1);
  }
}

function arg(name) {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  return process.argv[i + 1] ?? true;
}

const dryRun = process.argv.includes("--dry-run");
const fileArg = typeof arg("--file") === "string" ? arg("--file") : null;
const jsonPath = resolve(root, fileArg || DEFAULT_FILE);

function pick(row, ...keys) {
  for (const k of keys) {
    if (k in row && row[k] !== "" && row[k] !== null && row[k] !== undefined) return row[k];
  }
  return undefined;
}

function isoDateOnly(v) {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  return null;
}

function isoDateTime(v) {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v);
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toISOString();
}

function normalizarContenedores(v) {
  if (v === undefined || v === null || v === "") return null;
  const raw = String(v).trim();
  if (!raw) return null;

  // Permite celdas con múltiples contenedores en líneas separadas y/o separadores comunes.
  const parts = raw
    .split(/\r?\n|[,;|]+/g)
    .map((x) => x.trim())
    .filter(Boolean);

  if (!parts.length) return null;
  return [...new Set(parts)].join(" | ");
}

/**
 * Fila del export legado → payload insert operaciones (sin id/correlativo/ref_asli).
 */
function legacyRowToOperacion(row, index) {
  const refLegacy = pick(row, "N°REF ASLI", "NºREF ASLI", "N° REF ASLI") ?? "";
  const wkEtd = pick(row, "WK ETD");
  const ct = pick(row, "CT");
  const tipoIngreso = pick(row, "TIPO INGRESO");
  const fact = pick(row, "FACTURACION");
  const cantCont = pick(row, "CANT CONT.", "CANT CONT");

  const parts = [
    refLegacy && `Ref histórica: ${refLegacy}`,
    wkEtd !== undefined && `WK ETD: ${wkEtd}`,
    ct !== undefined && `CT: ${ct}`,
    tipoIngreso && `Tipo ingreso origen: ${tipoIngreso}`,
    cantCont !== undefined && `Cant. cont.: ${cantCont}`,
    fact && `Facturación origen: ${fact}`,
  ].filter(Boolean);

  const cbm = pick(row, "CBM");
  let ventilacion = null;
  if (cbm !== undefined && cbm !== "") {
    const n = parseInt(String(cbm).replace(/\s/g, ""), 10);
    ventilacion = Number.isFinite(n) ? n : null;
  }

  const tVal = pick(row, "T°", "Tº", "T");
  const temperatura = tVal !== undefined && tVal !== "" ? String(tVal) : null;

  const ingresoStacking = pick(row, "INGRESO STACKING", "INGRESO_STACKING");
  const bookingRaw = pick(row, "BOOKING");
  const booking = bookingRaw !== undefined && bookingRaw !== null && String(bookingRaw).trim() !== ""
    ? String(bookingRaw).trim()
    : `SIN-BOOKING-${String(refLegacy || index + 1).replace(/\s+/g, "-")}`;

  return {
    ingreso: isoDateTime(pick(row, "INGRESADO")) ?? new Date().toISOString(),
    semana: (() => {
      const w = pick(row, "WK IN");
      if (w === undefined || w === "") return null;
      const n = parseInt(String(w), 10);
      return Number.isFinite(n) ? n : null;
    })(),
    ejecutivo: String(pick(row, "EJECUTIVO") ?? "").trim() || "",
    estado_operacion: String(pick(row, "ESTADO") ?? "PENDIENTE").trim() || "PENDIENTE",
    tipo_operacion: "EXPORTACIÓN",
    cliente: String(pick(row, "SHIPPER") ?? "NUEVO").trim() || "NUEVO",
    consignatario: pick(row, "CONTRATO") != null ? String(pick(row, "CONTRATO")).trim() : null,
    especie: pick(row, "ESPECIE") != null ? String(pick(row, "ESPECIE")).trim() : null,
    temperatura,
    ventilacion,
    naviera: pick(row, "NAVIERA") != null ? String(pick(row, "NAVIERA")).trim() : null,
    nave: pick(row, "NAVE INICIAL", "NAVE_INICIAL") != null ? String(pick(row, "NAVE INICIAL", "NAVE_INICIAL")).trim() : null,
    pol: pick(row, "POL") != null ? String(pick(row, "POL")).trim() : null,
    pod: pick(row, "POD") != null ? String(pick(row, "POD")).trim() : null,
    etd: isoDateOnly(pick(row, "ETD")),
    eta: isoDateOnly(pick(row, "ETA")),
    tt: (() => {
      const t = pick(row, "TT");
      if (t === undefined || t === "") return null;
      const n = parseInt(String(t), 10);
      return Number.isFinite(n) ? n : null;
    })(),
    booking,
    deposito: (() => {
      const d = pick(row, "DEPÓSITO", "DEPOSITO");
      return d != null ? String(d).trim() : null;
    })(),
    contenedor: normalizarContenedores(pick(row, "CONTENEDOR")),
    forma_pago: pick(row, "FLETE") != null ? String(pick(row, "FLETE")).trim() : null,
    ingreso_stacking: ingresoStacking != null ? isoDateTime(ingresoStacking) : null,
    observaciones: parts.length ? parts.join(" | ") : null,
    origen_registro: "migracion_legacy_json_12_04_2026",
  };
}

async function main() {
  const url = process.env.PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Faltan PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
    process.exit(1);
  }

  assertJwtEsServiceRole(key);

  if (!existsSync(jsonPath)) {
    console.error("No existe el archivo:", jsonPath);
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(jsonPath, "utf8"));
  const rows = Array.isArray(raw) ? raw : raw?.rows;
  if (!Array.isArray(rows) || !rows.length) {
    console.error("El JSON debe ser un array de filas o { rows: [...] }");
    process.exit(1);
  }

  console.log("Archivo:", jsonPath);
  console.log("Filas en JSON:", rows.length, dryRun ? "(dry-run, no inserta)" : "");

  const payloads = [];
  const omitidas = [];
  for (let i = 0; i < rows.length; i++) {
    try {
      payloads.push(legacyRowToOperacion(rows[i], i));
    } catch (e) {
      omitidas.push({ index: i, error: e instanceof Error ? e.message : String(e) });
    }
  }

  if (omitidas.length) {
    console.log("Filas omitidas (no se insertarán):", omitidas.length);
    console.log(omitidas.length <= 20 ? omitidas : [...omitidas.slice(0, 20), { nota: `…y ${omitidas.length - 20} más` }]);
  }
  if (!payloads.length) {
    console.error("Ninguna fila válida para importar.");
    process.exit(1);
  }

  if (dryRun) {
    console.log("Muestra (2 primeras filas mapeadas):");
    console.log(JSON.stringify(payloads.slice(0, 2), null, 2));
    console.log("OK dry-run. Válidas para insert:", payloads.length, "/", rows.length);
    return;
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const probe = await supabase.from("operaciones").select("id").limit(1);
  if (probe.error?.message?.includes("permission denied")) {
    console.error(
      "La clave service_role no tiene permiso sobre public.operaciones.\n" +
        "En Supabase → SQL Editor pega y ejecuta:\n\n" +
        "  GRANT ALL ON TABLE public.operaciones TO service_role;\n" +
        "  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;\n\n" +
        "Archivo en el repo: supabase/migrations/20260412120000_operaciones_grant_service_role.sql\n",
    );
    process.exit(1);
  }

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < payloads.length; i++) {
    const { error } = await supabase.from("operaciones").insert(payloads[i]);
    if (error) {
      fail++;
      console.error(`[${i}]`, error.message);
    } else {
      ok++;
      if (ok % 50 === 0) console.log("Insertadas", ok, "/", payloads.length);
    }
  }

  console.log("Listo. OK:", ok, "Fallidas:", fail);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
