/**
 * Convierte CSV a JSON y genera SQL de migración para poblar tabla operaciones.
 *
 * Uso: node scripts/csv-to-operaciones-sql.mjs <ruta-al-csv>
 *
 * Opcionalmente, crea data/operaciones.csv para probar.
 * El script genera:
 *   - data/operaciones.json
 *   - supabase/migrations/<timestamp>_seed_operaciones.sql
 */

import { parse } from "csv-parse/sync";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const CSV_PATH = process.argv[2] || resolve(ROOT, "data", "operaciones.csv");

/**
 * Mapeo opcional: nombre columna CSV → nombre columna DB.
 * Solo añade entradas cuando el nombre en CSV difiere del nombre en la tabla.
 * Las columnas no mapeadas se usan tal cual (normalizadas a snake_case).
 */
const COLUMN_MAP = {
  // Ejemplo: "Cliente ID": "cliente_id", "Fecha Operación": "fecha",
};

/** Columnas del CSV a omitir en el INSERT (ej. id, created_at) */
const EXCLUDE_COLUMNS = ["id", "created_at", "updated_at"];

function toSnakeCase(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function escapeSqlString(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  const str = String(value).replace(/'/g, "''");
  return `'${str}'`;
}

function parseCsv(path) {
  const content = readFileSync(path, "utf-8");
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });
}

function recordsToSql(records, tableName = "operaciones") {
  if (records.length === 0) return "";

  const allHeaders = Object.keys(records[0]);
  const csvHeaders = allHeaders.filter(
    (h) => !EXCLUDE_COLUMNS.includes(COLUMN_MAP[h] ?? toSnakeCase(h))
  );
  const dbCols = csvHeaders.map((h) => COLUMN_MAP[h] ?? toSnakeCase(h));

  const lines = records.map((row) => {
    const values = csvHeaders.map((h) => escapeSqlString(row[h]));
    return `  (${values.join(", ")})`;
  });

  return `-- Datos de operaciones desde CSV\nINSERT INTO public.${tableName} (${dbCols.join(", ")})\nVALUES\n${lines.join(",\n")};\n`;
}

function main() {
  if (!existsSync(CSV_PATH)) {
    console.error(`No se encontró el archivo: ${CSV_PATH}`);
    console.error("Uso: node scripts/csv-to-operaciones-sql.mjs <ruta-al-csv>");
    process.exit(1);
  }

  const records = parseCsv(CSV_PATH);
  const dataDir = resolve(ROOT, "data");
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const jsonPath = resolve(dataDir, "operaciones.json");
  const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const sqlPath = resolve(ROOT, "supabase", "migrations", `${timestamp}_seed_operaciones.sql`);

  writeFileSync(jsonPath, JSON.stringify(records, null, 2), "utf-8");
  const sql = recordsToSql(records);
  writeFileSync(sqlPath, sql, "utf-8");

  console.log(`✓ JSON generado: ${jsonPath} (${records.length} registros)`);
  console.log(`✓ SQL generado: ${sqlPath}`);
}

main();
