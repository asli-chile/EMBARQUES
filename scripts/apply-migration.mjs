#!/usr/bin/env node
/**
 * Aplica una migración de supabase/migrations contra la base de datos.
 *
 * Uso:
 *   node scripts/apply-migration.mjs 20260829000004_temporadas.sql
 *   npm run db:migrate -- 20260829000004_temporadas.sql
 *
 * Requiere DATABASE_URL (o SUPABASE_DB_URL) en .env.local o .env:
 * Supabase → Settings → Database → Connection string (URI).
 */
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: join(__dirname, "..", ".env.local") });
dotenv.config({ path: join(__dirname, "..", ".env") });

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!DATABASE_URL) {
  console.error(
    "Falta DATABASE_URL. Añádela a .env.local con la connection string de Supabase:\n" +
      "Settings → Database → Connection string (URI)"
  );
  process.exit(1);
}

const nombre = process.argv[2];
if (!nombre) {
  console.error("Indica el archivo de migración. Ej: node scripts/apply-migration.mjs 20260829000004_temporadas.sql");
  process.exit(1);
}

const sqlPath = join(__dirname, "..", "supabase", "migrations", nombre);
if (!existsSync(sqlPath)) {
  console.error(`No existe la migración: ${sqlPath}`);
  process.exit(1);
}

const sql = readFileSync(sqlPath, "utf8");

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    // Transacción: si algo falla, la base queda como estaba.
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log(`Migración aplicada: ${nombre}`);
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(`Error aplicando ${nombre}:`, e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
