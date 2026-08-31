#!/usr/bin/env node
/**
 * Importa la hoja MASTER de public/DETALLE.xlsx hacia la tabla `operaciones`.
 *
 * Por defecto solo rellena campos que están vacíos en la base: nunca sobrescribe
 * un dato existente. Los valores en conflicto (con dato distinto en ambos lados)
 * se listan como advertencia y quedan intactos, salvo `referencia_externa` y
 * `sello` si se pasa --corregir, porque en esas dos columnas la planilla es la
 * fuente autorizada y la base arrastra un desfase de una fila.
 *
 * Uso:
 *   node tools/detalle-master/importar.mjs             # simulación
 *   node tools/detalle-master/importar.mjs --aplicar   # escribe en la base
 *   node tools/detalle-master/importar.mjs --aplicar --corregir
 */
import {
  conectar,
  norm,
  estaVacio,
  MAPEO,
  leerMaster,
  extraerCalibres,
  traerOperaciones,
  resolver,
  indexar,
  partirPatente,
} from "./lib.mjs";

const APLICAR = process.argv.includes("--aplicar");
const CORREGIR = process.argv.includes("--corregir");

/** Columnas que se sobrescriben cuando se pasa --corregir. */
const CORREGIBLES = ["referencia_externa", "sello"];

async function main() {
  const supabase = conectar();
  const filas = leerMaster();

  const muestra = await supabase.from("operaciones").select("*").limit(1);
  if (muestra.error) throw new Error(muestra.error.message);
  const columnasBd = new Set(Object.keys(muestra.data?.[0] ?? {}));

  const omitidas = MAPEO.filter(([, col]) => !columnasBd.has(col)).map(([, col]) => col);
  const mapeoActivo = MAPEO.filter(([, col]) => columnasBd.has(col));

  const ops = await traerOperaciones(supabase);
  const porBooking = indexar(ops, "booking");
  const porContenedor = indexar(ops, "contenedor");

  const actualizaciones = [];
  const conflictos = [];
  const sinResolver = [];
  const resumen = new Map();

  for (const fila of filas) {
    const { op, via, candidatas } = resolver(fila, porBooking, porContenedor);
    if (!op) {
      sinResolver.push({ ie: fila.IE, booking: fila.BOOKING, candidatas });
      continue;
    }

    const cambios = {};
    const registrar = (col, valor) => {
      if (valor === null || valor === undefined || !columnasBd.has(col)) return;
      const actual = op[col];
      if (estaVacio(actual)) {
        cambios[col] = valor;
        resumen.set(col, (resumen.get(col) ?? 0) + 1);
        return;
      }
      if (norm(actual) === norm(valor)) return;
      if (CORREGIR && CORREGIBLES.includes(col)) {
        cambios[col] = valor;
        resumen.set(`${col} (corregido)`, (resumen.get(`${col} (corregido)`) ?? 0) + 1);
        return;
      }
      conflictos.push(`${op.ref_asli} ${col}: BD="${actual}" vs XLSX="${valor}"`);
    };

    for (const [colExcel, colBd, conv] of mapeoActivo) registrar(colBd, conv(fila[colExcel]));

    const { camion, remolque } = partirPatente(fila.PATENTE);
    registrar("patente_camion", camion);
    registrar("patente_remolque", remolque);

    const { calibres, total25, total5 } = extraerCalibres(fila.__cruda);
    if (calibres) registrar("cajas_calibres", calibres);
    registrar("total_cajas_25kg", total25);
    registrar("total_cajas_5kg", total5);

    if (Object.keys(cambios).length) actualizaciones.push({ op, via, cambios, ie: fila.IE });
  }

  console.log(`Modo: ${APLICAR ? "APLICAR (escribe en la base)" : "simulación"}${CORREGIR ? " + corrección de desfase" : ""}`);
  console.log(`Filas MASTER: ${filas.length} | resueltas: ${filas.length - sinResolver.length} | sin resolver: ${sinResolver.length}`);
  if (omitidas.length) console.log(`Columnas aún inexistentes en la base (se omiten): ${[...new Set(omitidas)].join(", ")}`);

  console.log(`\nOperaciones con cambios: ${actualizaciones.length}`);
  for (const a of actualizaciones) {
    const detalle = Object.entries(a.cambios)
      .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`)
      .join(", ");
    console.log(`  ${a.ie} -> ${a.op.ref_asli}: ${detalle}`);
  }

  console.log(`\nCampos por columna:`);
  for (const [c, n] of [...resumen].sort((a, b) => b[1] - a[1])) console.log(`  ${c}: ${n}`);

  if (conflictos.length) {
    console.log(`\nConflictos NO tocados (${conflictos.length}):`);
    for (const c of conflictos) console.log(`  ${c}`);
  }
  if (sinResolver.length) {
    console.log(`\nSin resolver:`);
    for (const s of sinResolver) console.log(`  ${s.ie} booking=${s.booking}`);
  }

  if (!APLICAR) {
    console.log(`\nNada fue escrito. Repetí con --aplicar para persistir.`);
    return;
  }

  // Las referencias externas se están reasignando entre operaciones del mismo
  // bloque, así que se liberan antes de reescribirlas para no chocar con un
  // eventual índice único.
  const reasignadas = actualizaciones.filter((a) => "referencia_externa" in a.cambios && !estaVacio(a.op.referencia_externa));
  if (reasignadas.length) {
    for (const a of reasignadas) {
      const { error } = await supabase.from("operaciones").update({ referencia_externa: null }).eq("id", a.op.id);
      if (error) throw new Error(`Liberando referencia_externa de ${a.op.ref_asli}: ${error.message}`);
    }
    console.log(`\nLiberadas ${reasignadas.length} referencias externas antes de reasignar.`);
  }

  let ok = 0;
  for (const a of actualizaciones) {
    const { error } = await supabase.from("operaciones").update(a.cambios).eq("id", a.op.id);
    if (error) {
      console.error(`  ERROR ${a.op.ref_asli}: ${error.message}`);
      continue;
    }
    ok++;
  }
  console.log(`\nActualizadas ${ok}/${actualizaciones.length} operaciones.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
