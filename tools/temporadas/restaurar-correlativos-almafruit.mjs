#!/usr/bin/env node
/**
 * Restaura la numeración original (A00001–A00025) de las 25 operaciones de
 * ALMAFRUIT, que quedaron en A00051–A00075 porque cada renombre de temporada
 * disparaba la renumeración del trigger de correlativos.
 *
 * La llave de restauración es `referencia_externa` (el IE histórico, 2025M01 a
 * 2025M25), que es única por operación y no fue afectada por la renumeración.
 * El mapeo IE -> correlativo original se reconstruyó del cruce por booking
 * hecho al importar la planilla MASTER.
 *
 * `ref_asli` no se escribe: lo deriva el trigger a partir del correlativo.
 *
 * Uso:
 *   node tools/temporadas/restaurar-correlativos-almafruit.mjs
 *   node tools/temporadas/restaurar-correlativos-almafruit.mjs --aplicar
 */
import { conectar, traerOperaciones } from "../lib/supabase-admin.mjs";

const APLICAR = process.argv.includes("--aplicar");
const TEMPORADA = "TEST";

/** referencia_externa (IE) -> correlativo original */
const ORIGINALES = {
  "2025M01": 2,
  "2025M02": 3,
  "2025M03": 4,
  "2025M04": 25,
  "2025M05": 6,
  "2025M06": 5,
  "2025M07": 7,
  "2025M08": 8,
  "2025M09": 1,
  "2025M10": 9,
  "2025M11": 10,
  "2025M12": 11,
  "2025M13": 12,
  "2025M14": 14,
  "2025M15": 15,
  "2025M16": 13,
  "2025M17": 17,
  "2025M18": 16,
  "2025M19": 20,
  "2025M20": 18,
  "2025M21": 19,
  "2025M22": 21,
  "2025M23": 22,
  "2025M24": 23,
  "2025M25": 24,
};

async function main() {
  const supabase = conectar();
  const ops = (
    await traerOperaciones(supabase, "id, ref_asli, correlativo, temporada, referencia_externa, cliente")
  ).filter((o) => o.temporada === TEMPORADA);

  console.log(`Operaciones en "${TEMPORADA}": ${ops.length}`);

  const plan = [];
  const problemas = [];
  for (const op of ops) {
    const destino = ORIGINALES[String(op.referencia_externa ?? "").trim()];
    if (destino === undefined) {
      problemas.push(`${op.ref_asli}: referencia_externa "${op.referencia_externa}" no está en el mapeo`);
      continue;
    }
    plan.push({ op, destino });
  }

  // El mapeo debe ser una biyección: cada número original usado exactamente una vez.
  const usados = new Map();
  for (const p of plan) usados.set(p.destino, (usados.get(p.destino) ?? 0) + 1);
  for (const [num, veces] of usados) if (veces > 1) problemas.push(`El correlativo ${num} quedaría asignado ${veces} veces`);

  if (problemas.length) {
    console.error(`\nAbortado, el mapeo no es consistente:`);
    for (const p of problemas) console.error(`  ${p}`);
    return 1;
  }

  console.log(`\n=== Restauración ===`);
  for (const { op, destino } of [...plan].sort((a, b) => a.destino - b.destino)) {
    console.log(`  ${op.referencia_externa}: ${op.ref_asli} -> A${String(destino).padStart(5, "0")}`);
  }

  const maximo = Math.max(...plan.map((p) => p.destino));
  console.log(`\nContador de "${TEMPORADA}" quedará en ${maximo} (próxima ref A${String(maximo + 1).padStart(5, "0")}).`);

  if (!APLICAR) {
    console.log(`\nNada fue escrito. Repetí con --aplicar para persistir.`);
    return 0;
  }

  for (const { op, destino } of plan) {
    const { error } = await supabase.from("operaciones").update({ correlativo: destino }).eq("id", op.id);
    if (error) {
      console.error(`${op.ref_asli}: ${error.message}`);
      return 1;
    }
  }

  const { error: errCont } = await supabase
    .from("temporadas_correlativos")
    .update({ ultimo: maximo, updated_at: new Date().toISOString() })
    .eq("temporada", TEMPORADA);
  if (errCont) {
    console.error(`\nOperaciones restauradas, pero no se pudo ajustar el contador: ${errCont.message}`);
    console.error(`Corré esto en el SQL Editor:`);
    console.error(`  UPDATE public.temporadas_correlativos SET ultimo = ${maximo} WHERE temporada = '${TEMPORADA}';`);
    return 1;
  }

  console.log(`\nRestauradas ${plan.length} operaciones. Contador en ${maximo}.`);
  return 0;
}

process.exitCode = await main();
