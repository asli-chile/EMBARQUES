#!/usr/bin/env node
/**
 * Revierte la corrección de desfase aplicada sobre `referencia_externa` y
 * `sello` en las cuatro operaciones del bloque A00018–A00021.
 *
 * Motivo: se asumió que la columna IE de la planilla MASTER era la fuente
 * autorizada, pero los documentos adjuntos de cada operación (factura, DUS,
 * proforma, fullset, packing list e instructivo) prueban lo contrario. Los
 * nombres de las facturas incluyen el número de contenedor, lo que ata cada IE
 * a su operación de forma independiente y confirma los valores originales.
 *
 * Se identifica por booking, no por ref_asli, porque hay ref_asli duplicados
 * entre temporadas.
 *
 * Uso:
 *   node tools/detalle-master/revertir-desfase.mjs
 *   node tools/detalle-master/revertir-desfase.mjs --aplicar
 */
import { conectar } from "./lib.mjs";

const APLICAR = process.argv.includes("--aplicar");

const ORIGINALES = [
  { booking: "VAP0009808", ref_asli: "A00018", referencia_externa: "2025M20", sello: "WHA1459758" },
  { booking: "VAP0009809", ref_asli: "A00019", referencia_externa: "2025M21", sello: "WHA1459759" },
  { booking: "VAP0009811", ref_asli: "A00020", referencia_externa: "2025M19", sello: "WHA1462992" },
  { booking: "VAP0009810", ref_asli: "A00021", referencia_externa: "2025M22", sello: "WHA1459757" },
];

const supabase = conectar();

const objetivos = [];
for (const o of ORIGINALES) {
  const { data, error } = await supabase
    .from("operaciones")
    .select("id, ref_asli, referencia_externa, sello, contenedor")
    .eq("booking", o.booking)
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
  if (data.length !== 1) {
    console.error(`El booking ${o.booking} devolvió ${data.length} operaciones. Abortado por seguridad.`);
    process.exit(1);
  }
  const op = data[0];
  if (op.ref_asli !== o.ref_asli) {
    console.error(`El booking ${o.booking} corresponde a ${op.ref_asli}, se esperaba ${o.ref_asli}. Abortado.`);
    process.exit(1);
  }
  objetivos.push({ ...o, id: op.id, actual: op });
  console.log(`${op.ref_asli} (cont ${op.contenedor})`);
  console.log(`  referencia_externa: ${op.referencia_externa} -> ${o.referencia_externa}`);
  console.log(`  sello:              ${op.sello} -> ${o.sello}`);
}

if (!APLICAR) {
  console.log(`\nNada fue escrito. Repetí con --aplicar para revertir.`);
  process.exit(0);
}

// Las referencias se intercambian entre operaciones del mismo bloque: se
// liberan primero para no chocar con un índice único.
for (const o of objetivos) {
  const { error } = await supabase.from("operaciones").update({ referencia_externa: null }).eq("id", o.id);
  if (error) throw new Error(`Liberando ${o.ref_asli}: ${error.message}`);
}

for (const o of objetivos) {
  const { error } = await supabase
    .from("operaciones")
    .update({ referencia_externa: o.referencia_externa, sello: o.sello })
    .eq("id", o.id);
  if (error) throw new Error(`Revirtiendo ${o.ref_asli}: ${error.message}`);
}

console.log(`\nRevertidas ${objetivos.length} operaciones a sus valores originales.`);
