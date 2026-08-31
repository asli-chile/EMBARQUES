#!/usr/bin/env node
/**
 * Verifica la función `dashboard_resumen` contra la base real.
 *
 * Compara los agregados que devuelve el RPC con los mismos cálculos hechos
 * sobre las filas crudas, para detectar diferencias antes de que el dashboard
 * deje de calcularlos en el navegador.
 *
 * Uso: node tools/dashboard-resumen-verificar.mjs
 */
import { conectar, traerOperaciones } from "./lib/supabase-admin.mjs";

const supabase = conectar();

const { data: temporadas, error: errTemporada } = await supabase
  .from("temporadas")
  .select("nombre")
  .eq("activa", true)
  .limit(1);
if (errTemporada) throw new Error(`temporadas: ${errTemporada.message}`);
const temporada = temporadas?.[0]?.nombre ?? null;
console.log(`Temporada activa: ${temporada ?? "(ninguna)"}`);

const { data: resumen, error } = await supabase.rpc("dashboard_resumen", {
  p_temporada: temporada,
  p_empresas: null,
});
if (error) {
  console.error(`RPC dashboard_resumen falló: ${error.message}`);
  process.exit(1);
}

const ops = (await traerOperaciones(supabase, "id, cliente, naviera, especie, pod, etd, temporada")).filter(
  (o) => (temporada === null || o.temporada === temporada) && !/copefrut/i.test(o.cliente ?? "")
);

const kpis = resumen.kpis ?? {};
const vias = resumen.vias ?? {};
const sumaVias = (vias.maritima ?? 0) + (vias.aerea ?? 0) + (vias.sin_clasificar ?? 0);

const checks = [
  ["total coincide con las filas crudas", kpis.total === ops.length, `${kpis.total} vs ${ops.length}`],
  ["vías suman el total", sumaVias === kpis.total, `${sumaVias} vs ${kpis.total}`],
  ["zarpes_por_semana trae 6 semanas", resumen.zarpes_por_semana?.length === 6, String(resumen.zarpes_por_semana?.length)],
  ["por_estado suma el total",
    (resumen.por_estado ?? []).reduce((a, s) => a + Number(s.cantidad), 0) === kpis.total,
    `${(resumen.por_estado ?? []).reduce((a, s) => a + Number(s.cantidad), 0)} vs ${kpis.total}`],
  ["clientes_distintos coincide",
    kpis.clientes_distintos === new Set(ops.map((o) => o.cliente).filter(Boolean)).size,
    `${kpis.clientes_distintos} vs ${new Set(ops.map((o) => o.cliente).filter(Boolean)).size}`],
];

let fallo = false;
for (const [nombre, ok, detalle] of checks) {
  console.log(`${ok ? "OK  " : "FALLA"} ${nombre} (${detalle})`);
  if (!ok) fallo = true;
}

console.log("\nVías:", vias);
console.log("Top especies:", resumen.top_especies);
console.log("Puertos (primeros 5):", (resumen.puertos ?? []).slice(0, 5));
console.log("Zarpes por semana:", resumen.zarpes_por_semana);

process.exit(fallo ? 1 : 0);
