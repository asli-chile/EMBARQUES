#!/usr/bin/env node
/**
 * Inspección de solo lectura de los campos de transporte, para entender qué
 * valores usa el sistema antes de marcar operaciones como transporte ASLI.
 */
import { conectar, traerOperaciones } from "./lib.mjs";

const CAMPOS = ["transporte", "tipo_reserva_transporte", "enviado_transporte", "tramo", "valor_tramo", "moneda"];

const supabase = conectar();
const ops = await traerOperaciones(supabase, ["id", "ref_asli", "cliente", ...CAMPOS].join(","));

console.log(`Operaciones vivas: ${ops.length}\n`);

for (const campo of CAMPOS) {
  const conteo = new Map();
  for (const op of ops) {
    const v = op[campo] === null || op[campo] === "" ? "(vacío)" : String(op[campo]);
    conteo.set(v, (conteo.get(v) ?? 0) + 1);
  }
  console.log(`--- ${campo} ---`);
  for (const [v, n] of [...conteo].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${v}: ${n}`);
  console.log();
}

const alma = ops.filter((o) => String(o.cliente ?? "").toUpperCase().includes("ALMA"));
console.log(`=== Operaciones de ALMA*: ${alma.length} ===`);
const clientes = new Set(alma.map((o) => o.cliente));
console.log(`Nombres de cliente encontrados: ${[...clientes].join(" | ")}`);
for (const campo of CAMPOS) {
  const conteo = new Map();
  for (const op of alma) {
    const v = op[campo] === null || op[campo] === "" ? "(vacío)" : String(op[campo]);
    conteo.set(v, (conteo.get(v) ?? 0) + 1);
  }
  console.log(`  ${campo}: ${[...conteo].map(([v, n]) => `${v}=${n}`).join(", ")}`);
}

// Catálogo de empresas de transporte: para saber si "ASLI" existe como empresa.
const { data: empresas } = await supabase.from("transportes_empresas").select("nombre, rut").order("nombre");
console.log(`\n=== transportes_empresas (${empresas?.length ?? 0}) ===`);
for (const e of empresas ?? []) console.log(`  ${e.nombre} (${e.rut ?? "sin rut"})`);

const { data: cat } = await supabase.from("catalogos").select("categoria, valor").ilike("categoria", "%transport%");
console.log(`\n=== catálogos relacionados a transporte ===`);
for (const c of cat ?? []) console.log(`  ${c.categoria}: ${c.valor}`);
