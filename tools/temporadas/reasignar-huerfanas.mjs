#!/usr/bin/env node
/**
 * Repara operaciones cuya `temporada` apunta a un nombre que ya no existe en el
 * catálogo `temporadas`, situación que ocurría al renombrar una temporada antes
 * del trigger de la migración 20260829000009.
 *
 * Sin argumentos lista las huérfanas. Con dos argumentos reasigna un nombre
 * huérfano a una temporada existente.
 *
 * Uso:
 *   node tools/temporadas/reasignar-huerfanas.mjs
 *   node tools/temporadas/reasignar-huerfanas.mjs "ALMA" "TEST"
 *   node tools/temporadas/reasignar-huerfanas.mjs "ALMA" "TEST" --aplicar
 */
import { conectar, traerOperaciones } from "../lib/supabase-admin.mjs";

const [origen, destino] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const APLICAR = process.argv.includes("--aplicar");

const supabase = conectar();

const { data: temporadas, error: errTemp } = await supabase.from("temporadas").select("nombre, activa, cerrada").order("nombre");
if (errTemp) throw new Error(errTemp.message);

const nombres = new Set(temporadas.map((t) => t.nombre.trim().toLowerCase()));
const ops = await traerOperaciones(supabase, "id, ref_asli, cliente, temporada");

const porTemporada = new Map();
for (const o of ops) {
  const k = o.temporada === null || String(o.temporada).trim() === "" ? "(sin temporada)" : o.temporada;
  if (!porTemporada.has(k)) porTemporada.set(k, []);
  porTemporada.get(k).push(o);
}

console.log(`=== Catálogo de temporadas (${temporadas.length}) ===`);
for (const t of temporadas) {
  const etiquetas = [t.activa ? "activa" : null, t.cerrada ? "cerrada" : null].filter(Boolean).join(", ");
  console.log(`  ${t.nombre}${etiquetas ? ` (${etiquetas})` : ""}`);
}

console.log(`\n=== Operaciones por temporada ===`);
const huerfanas = [];
for (const [nombre, lista] of [...porTemporada].sort((a, b) => b[1].length - a[1].length)) {
  const esHuerfana = nombre !== "(sin temporada)" && !nombres.has(nombre.trim().toLowerCase());
  console.log(`  ${nombre}: ${lista.length}${esHuerfana ? "   <-- HUÉRFANA" : ""}`);
  if (esHuerfana) huerfanas.push({ nombre, lista });
}

if (!origen) {
  if (!huerfanas.length) {
    console.log(`\nNo hay temporadas huérfanas.`);
  } else {
    console.log(`\nPara reparar, indicá el nombre huérfano y la temporada destino:`);
    for (const h of huerfanas) console.log(`  node tools/temporadas/reasignar-huerfanas.mjs "${h.nombre}" "<destino>"`);
  }
  process.exit(0);
}

if (!destino) {
  console.error(`\nFalta la temporada destino.`);
  process.exit(1);
}
if (!nombres.has(destino.trim().toLowerCase())) {
  console.error(`\nLa temporada destino "${destino}" no existe en el catálogo. Creala primero.`);
  process.exit(1);
}

const objetivo = porTemporada.get(origen);
if (!objetivo?.length) {
  console.error(`\nNo hay operaciones con temporada "${origen}".`);
  process.exit(1);
}

// Se usa el nombre exacto del catálogo, no el que escribió el usuario.
const nombreDestino = temporadas.find((t) => t.nombre.trim().toLowerCase() === destino.trim().toLowerCase()).nombre;

console.log(`\n=== Reasignación ===`);
console.log(`  "${origen}" -> "${nombreDestino}": ${objetivo.length} operaciones`);
console.log(`  refs: ${objetivo.map((o) => o.ref_asli).sort().join(", ")}`);
console.log(`  clientes: ${[...new Set(objetivo.map((o) => o.cliente))].join(", ")}`);

if (!APLICAR) {
  console.log(`\nNada fue escrito. Repetí con --aplicar para persistir.`);
  process.exit(0);
}

const { error } = await supabase
  .from("operaciones")
  .update({ temporada: nombreDestino })
  .in("id", objetivo.map((o) => o.id));
if (error) throw new Error(error.message);

console.log(`\nReasignadas ${objetivo.length} operaciones a "${nombreDestino}".`);
