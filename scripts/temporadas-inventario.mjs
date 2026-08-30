#!/usr/bin/env node
/**
 * Inventario de temporadas: muestra qué valores tiene `operaciones.temporada`,
 * cuántas operaciones hay en cada uno y el estado del catálogo y los contadores.
 *
 * Sirve para verificar una normalización de temporadas antes y después de
 * aplicar las migraciones.
 *
 * Uso: node scripts/temporadas-inventario.mjs
 * Requiere PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local o .env.
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });
dotenv.config({ path: join(__dirname, "..", ".env") });

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const { data: operaciones, error } = await db
  .from("operaciones")
  .select("temporada, correlativo, ref_asli, deleted_at")
  .limit(50000);

if (error) {
  console.error("Error leyendo operaciones:", error.message);
  process.exit(1);
}

const grupos = new Map();
for (const op of operaciones) {
  const clave = op.temporada ?? "(sin temporada)";
  const g = grupos.get(clave) ?? { total: 0, activas: 0, min: Infinity, max: 0 };
  g.total += 1;
  if (!op.deleted_at) g.activas += 1;
  if (op.correlativo != null) {
    g.min = Math.min(g.min, op.correlativo);
    g.max = Math.max(g.max, op.correlativo);
  }
  grupos.set(clave, g);
}

console.log(`Operaciones totales: ${operaciones.length}\n`);
console.log("Temporada                | Total | Activas | Correlativos");
for (const [nombre, g] of [...grupos.entries()].sort((a, b) => b[1].total - a[1].total)) {
  const rango = g.max ? `${g.min}–${g.max}` : "—";
  console.log(`${nombre.padEnd(24)} | ${String(g.total).padStart(5)} | ${String(g.activas).padStart(7)} | ${rango}`);
}

const catalogo = await db.from("temporadas").select("nombre, activa, cerrada").order("nombre");
console.log("\nCatálogo:", catalogo.error ? catalogo.error.message : catalogo.data);

const contadores = await db.from("temporadas_correlativos").select("temporada, ultimo");
console.log("Contadores:", contadores.error ? contadores.error.message : contadores.data);

const huerfanas = [...grupos.keys()].filter(
  (nombre) => nombre !== "(sin temporada)" && !(catalogo.data ?? []).some((t) => t.nombre === nombre)
);
if (huerfanas.length > 0) {
  console.log("\nValores de temporada que NO están en el catálogo:", huerfanas.join(", "));
}
