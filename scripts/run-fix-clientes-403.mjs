#!/usr/bin/env node
/**
 * Aplica el fix de RLS para clientes (403) ejecutando el SQL de la migración 008.
 * Necesita DATABASE_URL en .env.local (Supabase → Settings → Database → Connection string URI).
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cargar .env.local o .env
dotenv.config({ path: join(__dirname, "..", ".env.local") });
dotenv.config({ path: join(__dirname, "..", ".env") });

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!DATABASE_URL) {
  console.error(
    "Falta DATABASE_URL. Añádela a .env.local con la connection string de Supabase:",
    "Settings → Database → Connection string (URI) — p. ej. postgresql://postgres.[ref]:[PASSWORD]@aws-0-....pooler.supabase.com:6543/postgres"
  );
  process.exit(1);
}

const sqlPath = join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260303000008_fix_clientes_403.sql"
);
const sql = readFileSync(sqlPath, "utf8")
  .replace(/^--.*$/gm, "")
  .replace(/^\s*$/gm, "")
  .trim();

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    await client.query(sql);
    console.log("Fix 403 clientes aplicado correctamente.");
  } catch (e) {
    console.error("Error aplicando la migración:", e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
