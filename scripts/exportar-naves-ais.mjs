#!/usr/bin/env node
/**
 * Exporta a Excel el estado de identificación AIS del catálogo de naves.
 *
 * Tres hojas: un resumen, las naves con IMO/MMSI y las que faltan. En las que
 * faltan se incluyen las operaciones vigentes y la próxima ETA, para resolver
 * primero las que de verdad están navegando y no gastar créditos en las demás.
 *
 * Uso:  npm run ais:excel  [ruta-de-salida.xlsx]
 */
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { writeFileSync } from "fs";
import dotenv from "dotenv";
import XLSX from "xlsx-js-style";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });
dotenv.config({ path: join(__dirname, "..", ".env") });

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Faltan PUBLIC_SUPABASE_URL y una clave de Supabase en .env.local o .env");
  process.exit(1);
}

async function rest(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

/** Mismo criterio que el resolutor: un número puro es parte del nombre del barco. */
function nombreBase(raw) {
  let s = String(raw ?? "").toUpperCase().replace(/\s+/g, " ").trim();
  s = s.replace(/\s*\[[^\]]*\]\s*$/, "").trim();
  const ultimo = s.split(" ").pop() ?? "";
  if (/\d/.test(ultimo) && /[A-Z]/.test(ultimo) && ultimo.length <= 5 && s.split(" ").length > 1) {
    s = s.slice(0, s.length - ultimo.length).trim();
  }
  return s;
}

/* ─── Paleta corporativa ──────────────────────────────────────────────────── */

const NAVY = "11224E";
const TEAL = "007A7B";
const CREMA = "F6EEE8";
const OLIVA = "669900";
const AMBAR = "B45309";

const borde = {
  top: { style: "thin", color: { rgb: "D9D9D9" } },
  bottom: { style: "thin", color: { rgb: "D9D9D9" } },
  left: { style: "thin", color: { rgb: "D9D9D9" } },
  right: { style: "thin", color: { rgb: "D9D9D9" } },
};

const th = (v) => ({
  v,
  t: "s",
  s: {
    font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: NAVY } },
    alignment: { horizontal: "left", vertical: "center" },
    border: borde,
  },
});

const td = (v, extra = {}) => ({
  v: v ?? "",
  t: typeof v === "number" ? "n" : "s",
  s: { font: { sz: 10 }, alignment: { vertical: "center" }, border: borde, ...extra },
});

const tdMono = (v) => td(v, { font: { sz: 10, name: "Consolas" } });

const titulo = (v) => ({
  v,
  t: "s",
  s: { font: { bold: true, sz: 14, color: { rgb: NAVY } } },
});

/* ─── Datos ───────────────────────────────────────────────────────────────── */

const naves = await rest("naves?select=nombre,imo,mmsi,tracking_activo&activo=eq.true&order=nombre&limit=2000");

const hoy = new Date();
const desde = new Date(hoy.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
const ops = await rest(
  `operaciones?select=nave,etd,eta,estado_operacion&deleted_at=is.null&nave=not.is.null&eta=gte.${desde}&limit=5000`,
);

// Operaciones vigentes por nave, para saber cuáles urgen.
const vigentes = new Map();
for (const o of ops) {
  if (String(o.estado_operacion ?? "").toUpperCase() === "CANCELADA") continue;
  const k = nombreBase(o.nave);
  const actual = vigentes.get(k) ?? { ops: 0, proximaEta: null };
  actual.ops += 1;
  if (o.eta && (!actual.proximaEta || o.eta < actual.proximaEta)) actual.proximaEta = o.eta;
  vigentes.set(k, actual);
}

const conId = [];
const sinId = [];
const enCatalogo = new Set(naves.map((n) => nombreBase(n.nombre)));
for (const n of naves) {
  const v = vigentes.get(nombreBase(n.nombre)) ?? { ops: 0, proximaEta: null };
  const fila = { ...n, ops: v.ops, proximaEta: v.proximaEta, enCatalogo: true };
  if (n.imo || n.mmsi) conId.push(fila);
  else sinId.push(fila);
}

// Naves que aparecen en operaciones vigentes pero no existen en el catálogo:
// no tienen dónde guardar el IMO, así que el tracking nunca las va a resolver.
for (const [nombre, v] of vigentes) {
  if (enCatalogo.has(nombre)) continue;
  sinId.push({ nombre, imo: null, mmsi: null, tracking_activo: false, ...v, enCatalogo: false });
}

// Las que faltan se ordenan por urgencia: primero las que están navegando.
sinId.sort((a, b) => b.ops - a.ops || String(a.nombre).localeCompare(String(b.nombre)));

/* ─── Hojas ───────────────────────────────────────────────────────────────── */

const libro = XLSX.utils.book_new();
const fecha = new Date().toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" });

// Resumen
const conOps = sinId.filter((n) => n.ops > 0).length;
const resumen = [
  [titulo("Identificación AIS del catálogo de naves")],
  [{ v: `Generado el ${fecha}`, t: "s", s: { font: { sz: 9, color: { rgb: "666666" } } } }],
  [],
  [th("Concepto"), th("Naves")],
  [td("Total de naves activas"), td(naves.length)],
  [td("Con IMO o MMSI"), td(conId.length, { font: { sz: 10, bold: true, color: { rgb: OLIVA } } })],
  [td("Sin identificador"), td(sinId.length, { font: { sz: 10, bold: true, color: { rgb: AMBAR } } })],
  [td("Sin identificador y con viaje vigente"), td(conOps, { font: { sz: 10, bold: true, color: { rgb: "B91C1C" } } })],
  [td("Con rastreo habilitado"), td(naves.filter((n) => n.tracking_activo).length)],
  [
    td("Navegando pero fuera del catálogo"),
    td(sinId.filter((n) => !n.enCatalogo).length, { font: { sz: 10, bold: true, color: { rgb: "B91C1C" } } }),
  ],
  [],
  [
    {
      v: "Cada consulta al proveedor cuesta 1 crédito. Resolver primero las naves con viaje vigente.",
      t: "s",
      s: { font: { sz: 9, italic: true, color: { rgb: "666666" } } },
    },
  ],
];
const hResumen = XLSX.utils.aoa_to_sheet(resumen);
hResumen["!cols"] = [{ wch: 40 }, { wch: 12 }];
hResumen["!merges"] = [
  { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
  { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
  { s: { r: 11, c: 0 }, e: { r: 11, c: 1 } },
];
XLSX.utils.book_append_sheet(libro, hResumen, "Resumen");

// Con identificador
const filasCon = [
  [th("Nave"), th("IMO"), th("MMSI"), th("Rastreo"), th("Ops. vigentes"), th("Próxima ETA")],
  ...conId.map((n) => [
    td(n.nombre),
    tdMono(n.imo ?? ""),
    tdMono(n.mmsi ?? ""),
    td(n.tracking_activo ? "SÍ" : "", {
      font: { sz: 10, bold: true, color: { rgb: n.tracking_activo ? TEAL : "999999" } },
    }),
    td(n.ops || ""),
    td(n.proximaEta ?? ""),
  ]),
];
const hCon = XLSX.utils.aoa_to_sheet(filasCon);
hCon["!cols"] = [{ wch: 34 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 14 }];
hCon["!freeze"] = { xSplit: 0, ySplit: 1 };
hCon["!autofilter"] = { ref: `A1:F${filasCon.length}` };
XLSX.utils.book_append_sheet(libro, hCon, `Con IMO-MMSI (${conId.length})`);

// Faltantes
const filasSin = [
  [
    th("Nave"),
    th("Ops. vigentes"),
    th("Próxima ETA"),
    th("Prioridad"),
    th("En catálogo"),
    th("IMO (completar)"),
    th("MMSI (completar)"),
  ],
  ...sinId.map((n) => [
    td(n.nombre),
    td(n.ops || ""),
    td(n.proximaEta ?? ""),
    td(n.ops > 0 ? "ALTA" : "", {
      font: { sz: 10, bold: true, color: { rgb: n.ops > 0 ? "B91C1C" : "999999" } },
      fill: n.ops > 0 ? { fgColor: { rgb: "FDE8E8" } } : undefined,
    }),
    td(n.enCatalogo ? "" : "NO", {
      font: { sz: 10, bold: !n.enCatalogo, color: { rgb: n.enCatalogo ? "999999" : "B91C1C" } },
    }),
    td("", { fill: { fgColor: { rgb: CREMA } } }),
    td("", { fill: { fgColor: { rgb: CREMA } } }),
  ]),
];
const hSin = XLSX.utils.aoa_to_sheet(filasSin);
hSin["!cols"] = [{ wch: 34 }, { wch: 14 }, { wch: 14 }, { wch: 11 }, { wch: 12 }, { wch: 16 }, { wch: 16 }];
hSin["!freeze"] = { xSplit: 0, ySplit: 1 };
hSin["!autofilter"] = { ref: `A1:G${filasSin.length}` };
XLSX.utils.book_append_sheet(libro, hSin, `Faltantes (${sinId.length})`);

/* ─── Salida ──────────────────────────────────────────────────────────────── */

const salida = resolve(process.argv[2] || join(__dirname, "..", "naves-ais.xlsx"));
writeFileSync(salida, XLSX.write(libro, { bookType: "xlsx", type: "buffer" }));

console.log(`Excel generado: ${salida}`);
console.log(`  ${conId.length} con IMO/MMSI · ${sinId.length} faltantes (${conOps} con viaje vigente)`);
