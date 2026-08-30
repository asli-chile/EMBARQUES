#!/usr/bin/env node
/**
 * Mueve las operaciones de un cliente a otra temporada.
 *
 * Las operaciones se actualizan una por una y en orden de ingreso, así el
 * trigger `trg_operaciones_correlativo_temporada` les asigna correlativos
 * consecutivos en la temporada de destino: A00001, A00002, …
 *
 * Uso:
 *   node scripts/temporadas-mover-operaciones.mjs --cliente=ALMAFRUIT --temporada=ALMA --dry-run
 *   node scripts/temporadas-mover-operaciones.mjs --cliente=ALMAFRUIT --temporada=ALMA
 *
 * Opciones:
 *   --cliente=TEXTO     Coincidencia parcial, sin distinguir mayúsculas (obligatorio).
 *   --temporada=NOMBRE  Temporada de destino, debe existir en el catálogo (obligatorio).
 *   --solo-activas      Excluye las operaciones en papelera (por defecto se incluyen).
 *   --dry-run           Muestra qué se movería, sin escribir.
 *
 * Requiere PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local o .env.
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });
dotenv.config({ path: join(__dirname, "..", ".env") });

const args = process.argv.slice(2);
const valor = (nombre) => args.find((a) => a.startsWith(`--${nombre}=`))?.split("=").slice(1).join("=");
const flag = (nombre) => args.includes(`--${nombre}`);

const cliente = valor("cliente");
const temporadaDestino = valor("temporada");
const soloActivas = flag("solo-activas");
const dryRun = flag("dry-run");

if (!cliente || !temporadaDestino) {
  console.error("Uso: node scripts/temporadas-mover-operaciones.mjs --cliente=NOMBRE --temporada=NOMBRE [--solo-activas] [--dry-run]");
  process.exit(1);
}

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const { data: temporadas, error: errTemp } = await db
  .from("temporadas")
  .select("nombre")
  .ilike("nombre", temporadaDestino);
if (errTemp) {
  console.error("Error leyendo el catálogo de temporadas:", errTemp.message);
  process.exit(1);
}
if (!temporadas?.length) {
  console.error(`La temporada "${temporadaDestino}" no existe en el catálogo. Créala antes de mover operaciones.`);
  process.exit(1);
}
const destino = temporadas[0].nombre;

let query = db
  .from("operaciones")
  .select("id, cliente, temporada, correlativo, ref_asli, ingreso, created_at, deleted_at")
  .ilike("cliente", `%${cliente}%`);
if (soloActivas) query = query.is("deleted_at", null);

const { data: operaciones, error } = await query;
if (error) {
  console.error("Error leyendo operaciones:", error.message);
  process.exit(1);
}

const pendientes = operaciones
  .filter((op) => op.temporada !== destino)
  .sort((a, b) => {
    const ka = a.ingreso ?? a.created_at ?? "";
    const kb = b.ingreso ?? b.created_at ?? "";
    if (ka !== kb) return ka < kb ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });

const clientesEncontrados = [...new Set(operaciones.map((op) => op.cliente))];
console.log(`Clientes coincidentes: ${clientesEncontrados.join(", ") || "ninguno"}`);
console.log(`Operaciones encontradas: ${operaciones.length} (a mover: ${pendientes.length}) → temporada "${destino}"`);

if (pendientes.length === 0) {
  console.log("Nada por hacer.");
  process.exit(0);
}

if (dryRun) {
  for (const op of pendientes) {
    console.log(`  ${op.ref_asli} (${op.temporada}) ${op.deleted_at ? "[papelera]" : ""} ingreso=${op.ingreso ?? "—"}`);
  }
  console.log("\n--dry-run: no se escribió nada.");
  process.exit(0);
}

let movidas = 0;
for (const op of pendientes) {
  const { data, error: errUpd } = await db
    .from("operaciones")
    .update({ temporada: destino })
    .eq("id", op.id)
    .select("ref_asli, correlativo")
    .single();
  if (errUpd) {
    console.error(`Error moviendo ${op.ref_asli}:`, errUpd.message);
    process.exit(1);
  }
  movidas += 1;
  console.log(`${op.ref_asli} → ${data.ref_asli}${op.deleted_at ? " [papelera]" : ""}`);
}

console.log(`\nListo: ${movidas} operaciones movidas a "${destino}".`);
