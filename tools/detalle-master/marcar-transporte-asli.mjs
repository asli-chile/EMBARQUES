#!/usr/bin/env node
/**
 * Marca las operaciones de un cliente como transporte propio ASLI.
 *
 * Replica exactamente lo que hace el botón "Enviar a Reserva ASLI" de
 * Mis Reservas: `enviado_transporte = true` y `tipo_reserva_transporte = 'asli'`.
 * Sin esos dos campos la operación no aparece en Reserva ASLI ni en Facturación,
 * porque ambos módulos filtran por ellos.
 *
 * Uso:
 *   node tools/detalle-master/marcar-transporte-asli.mjs ALMAFRUIT
 *   node tools/detalle-master/marcar-transporte-asli.mjs ALMAFRUIT --aplicar
 */
import { conectar, traerOperaciones } from "./lib.mjs";

const cliente = process.argv[2];
const APLICAR = process.argv.includes("--aplicar");
if (!cliente) {
  console.error("Indica el cliente. Ej: node tools/detalle-master/marcar-transporte-asli.mjs ALMAFRUIT");
  process.exit(1);
}

const supabase = conectar();
const ops = await traerOperaciones(
  supabase,
  "id, ref_asli, cliente, transporte, enviado_transporte, tipo_reserva_transporte, transporte_deleted_at"
);

const delCliente = ops.filter((o) => String(o.cliente ?? "").toUpperCase() === cliente.toUpperCase());
if (!delCliente.length) {
  console.error(`No hay operaciones vivas del cliente "${cliente}".`);
  process.exit(1);
}

// Ya marcadas como externa: no se tocan, cambiarlas borraría una decisión operativa.
const externas = delCliente.filter((o) => o.tipo_reserva_transporte === "externa");
const pendientes = delCliente.filter(
  (o) => o.tipo_reserva_transporte !== "externa" && (o.enviado_transporte !== true || o.tipo_reserva_transporte !== "asli")
);
const yaOk = delCliente.filter((o) => o.enviado_transporte === true && o.tipo_reserva_transporte === "asli");

console.log(`Cliente: ${cliente}`);
console.log(`Operaciones vivas: ${delCliente.length}`);
console.log(`  ya marcadas como ASLI: ${yaOk.length}`);
console.log(`  marcadas como externa (se omiten): ${externas.length}`);
console.log(`  a marcar: ${pendientes.length}`);
if (externas.length) console.log(`  externas: ${externas.map((o) => o.ref_asli).join(", ")}`);
console.log(`\nRefs a marcar: ${pendientes.map((o) => o.ref_asli).sort().join(", ") || "ninguna"}`);

const conTransporteVacio = pendientes.filter((o) => !o.transporte);
if (conTransporteVacio.length) {
  console.log(`\nAdemás se pondrá transporte="ASLI" en ${conTransporteVacio.length} operaciones que lo tienen vacío.`);
}

if (!APLICAR) {
  console.log(`\nNada fue escrito. Repetí con --aplicar para persistir.`);
  process.exit(0);
}

if (!pendientes.length) {
  console.log(`\nNada por hacer.`);
  process.exit(0);
}

const { error } = await supabase
  .from("operaciones")
  .update({ enviado_transporte: true, tipo_reserva_transporte: "asli", transporte: "ASLI" })
  .in("id", pendientes.map((o) => o.id));

if (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
console.log(`\nMarcadas ${pendientes.length} operaciones como transporte ASLI.`);
