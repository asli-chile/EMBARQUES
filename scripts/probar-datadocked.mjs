#!/usr/bin/env node
/**
 * Prueba y control de gasto de Data Docked, sin pasar por el navegador.
 *
 * Uso:
 *   npm run ais:probar -- --gasto                  créditos ya gastados (NO gasta)
 *   npm run ais:probar -- --activas                naves habilitadas    (NO gasta)
 *   npm run ais:probar -- --buscar "CALLAO EXPRESS"  busca por nombre   (1 crédito)
 *   npm run ais:probar 9777606                     posición por IMO/MMSI (1 crédito)
 *
 * Requiere DATADOCKED_API_KEY en .env.local o .env.
 *
 * Los modos que consultan al proveedor avisan antes de hacerlo: con un plan de
 * pruebas de 10 créditos, cada llamada cuenta.
 */
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });
dotenv.config({ path: join(__dirname, "..", ".env") });

const API_KEY = process.env.DATADOCKED_API_KEY;
const BASE = "https://datadocked.com/api/vessels_operations";
const MAX_CATALOGO = 3;

// Los modos de solo lectura funcionan sin clave: sirven justamente para revisar
// el gasto antes de tenerla o cuando ya no quedan créditos.
const SOLO_LECTURA = ["--gasto", "--activas"].includes(process.argv[2]);
if (!API_KEY && !SOLO_LECTURA) {
  console.error(
    "Falta DATADOCKED_API_KEY.\n" +
      "Agrégala a .env.local:  DATADOCKED_API_KEY=tu_clave\n" +
      "Se obtiene en datadocked.com, en el panel de perfil.",
  );
  process.exit(1);
}

/** "Jan 04, 2026 04:15 UTC" y otros formatos del proveedor. */
function parseInstant(v) {
  if (!v || typeof v !== "string") return null;
  const d = new Date(v.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

async function consultar(id) {
  const url = `${BASE}/get-vessel-location?imo_or_mmsi=${encodeURIComponent(id)}`;
  const t0 = Date.now();
  const r = await fetch(url, { headers: { "x-api-key": API_KEY, Accept: "application/json" } });
  const ms = Date.now() - t0;

  if (!r.ok) {
    const motivo =
      { 401: "clave inválida", 403: "sin créditos", 404: "buque no encontrado", 429: "límite de tasa" }[
        r.status
      ] ?? "error del proveedor";
    console.log(`  ${id}  ->  HTTP ${r.status} (${motivo})  ${ms}ms`);
    return false;
  }

  const body = await r.json();
  const d = body?.detail;
  if (!d) {
    console.log(`  ${id}  ->  respuesta sin "detail":`, JSON.stringify(body).slice(0, 200));
    return false;
  }

  const recibido = parseInstant(d.positionReceived);
  const eta = parseInstant(d.etaUtc);
  const antiguedadMin = recibido ? Math.round((Date.now() - recibido.getTime()) / 60000) : null;

  console.log(`  ${id}  ->  OK ${ms}ms`);
  console.log(`     nave        ${d.name ?? "—"}  (IMO ${d.imo ?? "—"} / MMSI ${d.mmsi ?? "—"})`);
  console.log(`     posicion    ${d.latitude ?? "—"}, ${d.longitude ?? "—"}`);
  console.log(`     velocidad   ${d.speed ?? "—"} kn   rumbo ${d.course ?? "—"}°`);
  console.log(`     destino     ${d.destination ?? "—"}`);
  console.log(`     estado      ${d.navigationalStatus ?? "—"}`);
  console.log(
    `     recibido    ${d.positionReceived ?? "—"}` +
      (antiguedadMin != null ? `   (hace ${antiguedadMin} min)` : "   (NO SE PUDO PARSEAR)"),
  );
  console.log(
    `     eta         ${d.etaUtc ?? "—"}` + (d.etaUtc && !eta ? "   (NO SE PUDO PARSEAR)" : ""),
  );
  return true;
}

async function desdeCatalogo() {
  const url = process.env.PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("Faltan PUBLIC_SUPABASE_URL y una clave de Supabase en el entorno.");
    process.exit(1);
  }
  const r = await fetch(
    `${url}/rest/v1/naves?select=nombre,imo,mmsi&activo=eq.true&or=(imo.not.is.null,mmsi.not.is.null)&limit=${MAX_CATALOGO}`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  const naves = await r.json();
  if (!Array.isArray(naves) || naves.length === 0) {
    console.log("El catálogo `naves` no tiene ninguna nave con IMO o MMSI cargado.");
    console.log("Cárgalos en /configuracion/naves-tracking y vuelve a probar.");
    return;
  }
  console.log(`Probando ${naves.length} naves del catálogo:\n`);
  for (const n of naves) {
    const id = String(n.mmsi || n.imo || "").trim();
    console.log(` ${n.nombre}`);
    await consultar(id);
    console.log("");
  }
}

/* ─── Modos que NO gastan créditos: leen la base ──────────────────────────── */

function supabaseRest() {
  const url = process.env.PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("Faltan PUBLIC_SUPABASE_URL y una clave de Supabase en el entorno.");
    process.exit(1);
  }
  return async (path) => {
    const r = await fetch(`${url}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    return r.json();
  };
}

async function verGasto() {
  const rest = supabaseRest();
  const filas = await rest("navitrack_ais_lecturas?select=identificador,nave_nombre,consultado_at&order=consultado_at.desc&limit=200");
  if (!Array.isArray(filas)) {
    console.log("No se pudo leer navitrack_ais_lecturas:", JSON.stringify(filas).slice(0, 200));
    return;
  }
  console.log(`Créditos gastados (1 fila = 1 llamada): ${filas.length}\n`);
  if (filas.length === 0) {
    console.log("Todavía no se ha consultado al proveedor.");
    return;
  }
  const porNave = new Map();
  for (const f of filas) {
    const k = `${f.nave_nombre ?? "?"} (${f.identificador})`;
    porNave.set(k, (porNave.get(k) ?? 0) + 1);
  }
  for (const [k, n] of porNave) console.log(`  ${String(n).padStart(3)}  ${k}`);
  console.log(`\n  última llamada: ${filas[0].consultado_at}`);
}

async function verActivas() {
  const rest = supabaseRest();
  const filas = await rest("naves?select=nombre,imo,mmsi&tracking_activo=eq.true&order=nombre");
  if (!Array.isArray(filas) || filas.length === 0) {
    console.log("Ninguna nave tiene el rastreo habilitado: no se gastará ningún crédito.");
    return;
  }
  console.log(`Naves con rastreo habilitado (${filas.length}):\n`);
  for (const n of filas) console.log(`  ${n.nombre}  IMO ${n.imo ?? "—"}  MMSI ${n.mmsi ?? "—"}`);
  console.log("\nCada una consulta al proveedor como mucho una vez por TTL (por defecto 6 h).");
}

/* ─── Modo que gasta 1 crédito: resolver identificadores por nombre ───────── */

async function buscarPorNombre(nombre) {
  console.log(`Buscando "${nombre}" en el proveedor. Esto gasta 1 crédito.\n`);
  const url = `${BASE}/vessels-by-vessel-name?vessel_name=${encodeURIComponent(nombre)}`;
  const r = await fetch(url, { headers: { "x-api-key": API_KEY, Accept: "application/json" } });
  if (!r.ok) {
    console.log(`  HTTP ${r.status}`);
    const texto = await r.text();
    console.log(`  ${texto.slice(0, 300)}`);
    return;
  }
  const body = await r.json();
  console.log(JSON.stringify(body, null, 2).slice(0, 2000));
}

const arg = process.argv[2];

if (arg === "--gasto") {
  await verGasto();
} else if (arg === "--activas") {
  await verActivas();
} else {
  console.log(`Data Docked · clave ...${API_KEY.slice(-4)}\n`);
  if (arg === "--buscar") {
    const nombre = process.argv.slice(3).join(" ").trim();
    if (!nombre) {
      console.error('Indica el nombre: --buscar "CALLAO EXPRESS"');
      process.exit(1);
    }
    await buscarPorNombre(nombre);
  } else if (arg === "--catalogo") {
    await desdeCatalogo();
  } else if (arg) {
    await consultar(arg.trim());
  } else {
    console.error(
      "Modos:\n" +
        "  --gasto                    créditos gastados (no gasta)\n" +
        '  --activas                  naves habilitadas (no gasta)\n' +
        '  --buscar "NOMBRE"          resolver IMO/MMSI (1 crédito)\n' +
        "  <imo|mmsi>                 posición (1 crédito)",
    );
    process.exit(1);
  }
}
