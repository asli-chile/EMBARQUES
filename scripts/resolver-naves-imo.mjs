#!/usr/bin/env node
/**
 * Resuelve el IMO y el MMSI de las naves del catálogo.
 *
 * Dos fuentes, de barata a cara:
 *
 *   wikidata    gratis e ilimitada. Buena cobertura en portacontenedores
 *               grandes, nula en los chicos. Se usa siempre primero.
 *   datadocked  1 crédito por nave. Autoritativa y es el mismo proveedor que
 *               después entrega las posiciones, así que el identificador calza.
 *
 * Uso:
 *   node scripts/resolver-naves-imo.mjs --fuente wikidata               (simula)
 *   node scripts/resolver-naves-imo.mjs --fuente wikidata --aplicar     (guarda)
 *   node scripts/resolver-naves-imo.mjs --fuente datadocked --limite 20 --aplicar
 *
 * Sin --aplicar no escribe nada: muestra lo que haría.
 *
 * El nombre se limpia del viaje pegado ("MSC BRUNELLA 635R" -> "MSC BRUNELLA")
 * y las naves que comparten nombre base se resuelven de una sola vez.
 */
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });
dotenv.config({ path: join(__dirname, "..", ".env") });

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATADOCKED_KEY = process.env.DATADOCKED_API_KEY;
const UA = "ASLI-ERP/1.0 (https://www.asli.cl; contacto rodrigo.caceres@asli.cl)";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Faltan PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local o .env");
  process.exit(1);
}

/* ─── Argumentos ──────────────────────────────────────────────────────────── */

const args = process.argv.slice(2);
const opcion = (nombre, def = null) => {
  const i = args.indexOf(nombre);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const fuente = opcion("--fuente", "wikidata");
const limite = Number(opcion("--limite", "0")) || 0;
const aplicar = args.includes("--aplicar");

if (!["wikidata", "datadocked"].includes(fuente)) {
  console.error('--fuente debe ser "wikidata" o "datadocked"');
  process.exit(1);
}
if (fuente === "datadocked" && !DATADOCKED_KEY) {
  console.error("Falta DATADOCKED_API_KEY para usar esa fuente.");
  process.exit(1);
}
// Sin tope explícito esta fuente consultaría las ~120 naves pendientes de una
// sentada: 120 créditos. El límite se exige a mano para que el gasto sea una
// decisión consciente y no el valor por defecto.
if (fuente === "datadocked" && aplicar && limite <= 0) {
  console.error(
    [
      "Con --fuente datadocked hay que indicar --limite N: cada nave cuesta 1 crédito.",
      "Sin tope, esta pasada consultaría las ~120 naves pendientes de una sola vez.",
      "Ej: --fuente datadocked --limite 10 --aplicar",
    ].join("\n"),
  );
  process.exit(1);
}

/* ─── Utilidades ──────────────────────────────────────────────────────────── */

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Nombres que son de naviera, no de barco.
 *
 * Si la limpieza deja solo esto, el grupo se descarta: asignarle el IMO de "un"
 * barco de esa naviera a varios distintos es exactamente el error que se busca
 * evitar.
 */
const NOMBRES_DE_NAVIERA = new Set([
  "WAN HAI", "MSC", "CMA CGM", "MAERSK", "COSCO", "EVERGREEN", "HAPAG LLOYD",
  "HAPAG-LLOYD", "ONE", "OOCL", "ZIM", "PIL", "YANG MING", "SEABOARD", "APL",
  "HMM", "SEASPAN", "TBN",
]);

/**
 * Quita el viaje pegado: "HMM BLESSING [2538W]" -> "HMM BLESSING".
 *
 * Solo se quita un sufijo que mezcle letras y dígitos (635R, W012, 2538W), que
 * es la forma de un código de viaje. Un número puro NO se toca: en "WAN HAI 512"
 * el 512 es parte del nombre del barco, y quitarlo fusionaría siete buques
 * distintos en uno.
 */
function nombreBase(raw) {
  let s = String(raw ?? "").toUpperCase().replace(/\s+/g, " ").trim();
  s = s.replace(/\s*\[[^\]]*\]\s*$/, "").trim();
  const ultimo = s.split(" ").pop() ?? "";
  const mezcla = /\d/.test(ultimo) && /[A-Z]/.test(ultimo) && ultimo.length <= 5;
  if (mezcla && s.split(" ").length > 1) {
    s = s.slice(0, s.length - ultimo.length).trim();
  }
  return s;
}

function esImo(v) {
  return /^\d{7}$/.test(String(v ?? "").trim());
}
function esMmsi(v) {
  return /^\d{9}$/.test(String(v ?? "").trim());
}

async function rest(path, init) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 ? null : r.json();
}

/* ─── Fuente 1: Wikidata (gratis) ─────────────────────────────────────────── */

/** Busca el ítem del buque y devuelve sus identificadores, o null. */
async function wikidata(nombre) {
  const buscar = new URL("https://www.wikidata.org/w/api.php");
  buscar.search = new URLSearchParams({
    action: "wbsearchentities",
    search: nombre,
    language: "en",
    uselang: "en",
    type: "item",
    limit: "5",
    format: "json",
    origin: "*",
  }).toString();

  const rb = await fetch(buscar, { headers: { "User-Agent": UA } });
  if (!rb.ok) return null;
  const cand = (await rb.json())?.search ?? [];
  if (cand.length === 0) return null;

  const ids = cand.map((c) => c.id).join("|");
  const traer = new URL("https://www.wikidata.org/w/api.php");
  traer.search = new URLSearchParams({
    action: "wbgetentities",
    ids,
    props: "claims|labels",
    languages: "en",
    format: "json",
    origin: "*",
  }).toString();

  const re = await fetch(traer, { headers: { "User-Agent": UA } });
  if (!re.ok) return null;
  const entidades = (await re.json())?.entities ?? {};

  for (const c of cand) {
    const e = entidades[c.id];
    if (!e) continue;
    // P458 = IMO, P587 = MMSI. Sin IMO no sirve: sería otro tipo de entidad.
    const imo = e.claims?.P458?.[0]?.mainsnak?.datavalue?.value;
    if (!imo) continue;
    const mmsi = e.claims?.P587?.[0]?.mainsnak?.datavalue?.value;
    const etiqueta = e.labels?.en?.value ?? c.label ?? "";
    // El nombre tiene que calzar de verdad: Wikidata devuelve parecidos.
    if (nombreBase(etiqueta) !== nombreBase(nombre)) continue;
    const imoLimpio = String(imo).replace(/\D/g, "");
    return {
      imo: esImo(imoLimpio) ? imoLimpio : null,
      mmsi: esMmsi(String(mmsi ?? "")) ? String(mmsi) : null,
      via: `wikidata ${c.id}`,
    };
  }
  return null;
}

/* ─── Fuente 2: Data Docked (1 crédito por nave) ──────────────────────────── */

async function datadocked(nombre) {
  const url = `https://datadocked.com/api/vessels_operations/vessels-by-vessel-name?name=${encodeURIComponent(nombre)}`;
  const r = await fetch(url, { headers: { "x-api-key": DATADOCKED_KEY, Accept: "application/json" } });
  if (!r.ok) return { error: `HTTP ${r.status}` };
  const body = await r.json();
  // La respuesta puede venir como lista o envuelta; se aceptan ambas formas.
  const lista = Array.isArray(body) ? body : (body?.detail ?? body?.data ?? body?.vessels ?? []);
  const items = Array.isArray(lista) ? lista : [lista];
  for (const v of items) {
    if (!v || typeof v !== "object") continue;
    const nom = String(v.name ?? v.vessel_name ?? "");
    if (nombreBase(nom) !== nombreBase(nombre)) continue;
    const imo = String(v.imo ?? "").replace(/\D/g, "");
    const mmsi = String(v.mmsi ?? "").replace(/\D/g, "");
    return { imo: esImo(imo) ? imo : null, mmsi: esMmsi(mmsi) ? mmsi : null, via: "datadocked" };
  }
  return null;
}

/* ─── Proceso ─────────────────────────────────────────────────────────────── */

console.log(`Fuente: ${fuente}${aplicar ? "" : "   (SIMULACIÓN — sin --aplicar no se guarda nada)"}\n`);

const naves = await rest(
  "naves?select=id,nombre,imo,mmsi&activo=eq.true&imo=is.null&mmsi=is.null&order=nombre&limit=1000",
);

// Un barco puede estar varias veces con distinto viaje: se resuelve una vez.
const grupos = new Map();
for (const n of naves) {
  const base = nombreBase(n.nombre);
  if (!base || base.length < 3) continue;
  if (NOMBRES_DE_NAVIERA.has(base)) continue;
  if (!grupos.has(base)) grupos.set(base, []);
  grupos.get(base).push(n);
}

let pendientes = [...grupos.entries()];
if (limite > 0) pendientes = pendientes.slice(0, limite);

console.log(
  `${naves.length} naves sin identificador · ${grupos.size} nombres distintos · se procesarán ${pendientes.length}\n`,
);

let hallados = 0;
let sinDatos = 0;
let errores = 0;
let consultas = 0;

for (const [base, filas] of pendientes) {
  consultas += 1;
  let res = null;
  try {
    res = fuente === "wikidata" ? await wikidata(base) : await datadocked(base);
  } catch (e) {
    res = { error: String(e).slice(0, 80) };
  }

  if (res?.error) {
    errores += 1;
    console.log(`  ✗  ${base.padEnd(28)} ${res.error}`);
  } else if (res?.imo || res?.mmsi) {
    hallados += 1;
    console.log(
      `  ✓  ${base.padEnd(28)} IMO ${res.imo ?? "—"}  MMSI ${res.mmsi ?? "—"}   (${res.via})` +
        (filas.length > 1 ? `  [${filas.length} filas]` : ""),
    );
    if (aplicar) {
      for (const f of filas) {
        const cambios = {};
        if (res.imo) cambios.imo = res.imo;
        if (res.mmsi) cambios.mmsi = res.mmsi;
        await rest(`naves?id=eq.${f.id}`, {
          method: "PATCH",
          body: JSON.stringify(cambios),
          headers: { Prefer: "return=minimal" },
        });
      }
    }
  } else {
    sinDatos += 1;
    console.log(`  ·  ${base.padEnd(28)} sin resultado`);
  }

  // Cortesía con Wikidata; Data Docked además limita a 50 por minuto.
  await dormir(fuente === "wikidata" ? 220 : 1300);
}

console.log(
  `\nResumen: ${hallados} resueltas · ${sinDatos} sin resultado · ${errores} con error` +
    (fuente === "datadocked" ? `\nCréditos gastados: ${consultas}` : "") +
    (aplicar ? "" : "\n\nNada se guardó. Repite con --aplicar para escribir en el catálogo."),
);
