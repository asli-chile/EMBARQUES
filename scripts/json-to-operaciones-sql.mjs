/**
 * Convierte JSON histórico de Excel a SQL de migración para tabla operaciones.
 * 
 * Uso: node scripts/json-to-operaciones-sql.mjs
 * 
 * Genera: supabase/migrations/<timestamp>_seed_operaciones_historico.sql
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const JSON_PATH = resolve(__dirname, "HOJA DE REGISTROS.json.txt");

/**
 * Mapeo de campos JSON (Excel) → campos tabla operaciones
 * null = ignorar campo
 */
const FIELD_MAP = {
  "INGRESADO": "ingreso",
  "WK IN": "semana",
  "N°REF ASLI": null, // Se incluirá en observaciones
  "EJECUTIVO": "ejecutivo",
  "SHIPPER": "cliente",
  "BOOKING": "booking",
  "CANT CONT.": null, // Se incluirá en observaciones
  "CONTENEDOR": "contenedor",
  "WK ETD": null, // Semana de ETD, info derivada
  "NAVIERA": "naviera",
  "NAVE INICIAL": "nave",
  "ESPECIE": "especie",
  "T°": "temperatura",
  "CBM": "ventilacion", // Metros cúbicos, usamos ventilación como texto
  "CT": null, // Controlled temperature, se incluirá en observaciones
  "CO2": null,
  "O2": null,
  "POL": "pol",
  "POD": "pod",
  "DEPÓSITO ": "deposito", // Nota: tiene espacio al final en el JSON
  "ETD": "etd",
  "ETA": "eta",
  "TT": "tt",
  "FLETE": "forma_pago",
  "ESTADO": "estado_operacion",
  "ROLEADA DESDE": null, // Se incluirá en observaciones
  "INGRESO STACKING": "ingreso_stacking",
  "TIPO INGRESO": "tipo_operacion",
  "N° BL ": null, // Se incluirá en observaciones
  "ESTADO BL/SWB": null,
  "CONTRATO": "consignatario", // Usar contrato como consignatario
  "MES DE INGRESO": null,
  "MES DE ZARPE": null,
  "SEMANA DE ARRIBO": null,
  "MES DE ARRIBO": null,
  "FACTURACION": null, // Se incluirá en observaciones
  "BOOKING PDF": null,
  "COMENTARIO": null, // Se combina en observaciones
  "OBSERVACION": null, // Se combina en observaciones
};

function escapeSql(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  const str = String(value).replace(/'/g, "''");
  return `'${str}'`;
}

function formatDateForPostgres(value) {
  if (!value || value === "") return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
}

function formatDateOnlyForPostgres(value) {
  if (!value || value === "") return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().split("T")[0];
}

function cleanExcelValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const str = String(value).trim();
  if (str.startsWith("#") || str === "N/A" || str === "NaN" || str === "undefined") return null;
  return value;
}

function cleanNumericValue(value) {
  const cleaned = cleanExcelValue(value);
  if (cleaned === null) return null;
  const num = Number(cleaned);
  if (isNaN(num)) return null;
  return num;
}

/**
 * Mapeo de estados del Excel a estados válidos en la BD
 */
const ESTADO_MAP = {
  "CONFIRMADA": "confirmado",
  "confirmada": "confirmado",
  "CANCELADO": "cancelado",
  "cancelado": "cancelado",
  "PENDIENTE": "pendiente",
  "pendiente": "pendiente",
};

function mapEstado(value) {
  const cleaned = cleanExcelValue(value);
  if (!cleaned) return "pendiente";
  return ESTADO_MAP[cleaned] || cleaned.toLowerCase();
}

function buildObservaciones(row) {
  const parts = [];
  
  if (row["N°REF ASLI"]) parts.push(`Ref ASLI: ${row["N°REF ASLI"]}`);
  if (row["CANT CONT."] && row["CANT CONT."] > 1) parts.push(`Cant. Cont: ${row["CANT CONT."]}`);
  if (row["CT"] && row["CT"] !== "NO") parts.push(`CT: ${row["CT"]}`);
  if (row["CO2"]) parts.push(`CO2: ${row["CO2"]}`);
  if (row["O2"]) parts.push(`O2: ${row["O2"]}`);
  if (row["ROLEADA DESDE"]) parts.push(`Roleada desde: ${row["ROLEADA DESDE"]}`);
  if (row["N° BL "]) parts.push(`BL: ${row["N° BL "]}`);
  if (row["ESTADO BL/SWB"]) parts.push(`Estado BL: ${row["ESTADO BL/SWB"]}`);
  if (row["WK ETD"]) parts.push(`WK ETD: ${row["WK ETD"]}`);
  if (row["FACTURACION"] && row["FACTURACION"] !== "OK") parts.push(`Facturación: ${row["FACTURACION"]}`);
  if (row["COMENTARIO"]) parts.push(row["COMENTARIO"]);
  if (row["OBSERVACION"]) parts.push(row["OBSERVACION"]);
  
  return parts.join(" | ");
}

function rowToSqlValues(row) {
  const values = {
    ingreso: formatDateForPostgres(cleanExcelValue(row["INGRESADO"])),
    semana: cleanNumericValue(row["WK IN"]),
    ejecutivo: cleanExcelValue(row["EJECUTIVO"]) || "",
    estado_operacion: cleanExcelValue(row["ESTADO"]) || "PENDIENTE",
    tipo_operacion: cleanExcelValue(row["TIPO INGRESO"]) || "EXPORTACIÓN",
    cliente: cleanExcelValue(row["SHIPPER"]) || "",
    consignatario: cleanExcelValue(row["CONTRATO"]) || null,
    especie: cleanExcelValue(row["ESPECIE"]) || null,
    temperatura: cleanExcelValue(row["T°"]) != null ? String(cleanExcelValue(row["T°"])) : null,
    ventilacion: cleanExcelValue(row["CBM"]) != null ? String(cleanExcelValue(row["CBM"])) : null,
    naviera: cleanExcelValue(row["NAVIERA"]) || null,
    nave: cleanExcelValue(row["NAVE INICIAL"]) || null,
    pol: cleanExcelValue(row["POL"]) || null,
    pod: cleanExcelValue(row["POD"]) || null,
    etd: formatDateOnlyForPostgres(cleanExcelValue(row["ETD"])),
    eta: formatDateOnlyForPostgres(cleanExcelValue(row["ETA"])),
    tt: cleanNumericValue(row["TT"]),
    booking: cleanExcelValue(row["BOOKING"]) ? String(cleanExcelValue(row["BOOKING"])) : null,
    deposito: cleanExcelValue(row["DEPÓSITO "]) || null,
    contenedor: cleanExcelValue(row["CONTENEDOR"]) || null,
    forma_pago: cleanExcelValue(row["FLETE"]) || null,
    ingreso_stacking: formatDateForPostgres(cleanExcelValue(row["INGRESO STACKING"])),
    observaciones: buildObservaciones(row) || null,
    origen_registro: "importacion_excel",
  };

  const cols = Object.keys(values);
  const vals = cols.map(col => {
    const v = values[col];
    if (v === null) return "NULL";
    if (typeof v === "number") return v;
    return escapeSql(v);
  });

  return { cols, vals };
}

function main() {
  console.log("Leyendo JSON...");
  const content = readFileSync(JSON_PATH, "utf-8");
  const records = JSON.parse(content);
  console.log(`${records.length} registros encontrados.`);

  const allCols = new Set();
  const sqlRows = [];

  for (const row of records) {
    const { cols, vals } = rowToSqlValues(row);
    cols.forEach(c => allCols.add(c));
    sqlRows.push(`  (${vals.join(", ")})`);
  }

  const colList = Array.from(allCols);
  
  // Obtener valores únicos de estado y tipo para los nuevos constraints
  const estadosUnicos = [...new Set(records.map(r => cleanExcelValue(r["ESTADO"])).filter(Boolean))];
  const tiposUnicos = [...new Set(records.map(r => cleanExcelValue(r["TIPO INGRESO"])).filter(Boolean))];
  
  console.log("Estados encontrados:", estadosUnicos);
  console.log("Tipos encontrados:", tiposUnicos);
  
  const sql = `-- Importación histórico Excel a tabla operaciones
-- Generado: ${new Date().toISOString()}
-- Total registros: ${records.length}

-- 1. Eliminar constraints existentes que bloquean la inserción
ALTER TABLE public.operaciones DROP CONSTRAINT IF EXISTS operaciones_estado_operacion_check;
ALTER TABLE public.operaciones DROP CONSTRAINT IF EXISTS operaciones_tipo_operacion_check;

-- 2. Insertar datos del histórico
INSERT INTO public.operaciones (${colList.join(", ")})
VALUES
${sqlRows.join(",\n")};

-- 3. (Opcional) Recrear constraints con los valores del Excel + valores originales
-- Descomentar si se desea restringir los valores nuevamente:
-- ALTER TABLE public.operaciones ADD CONSTRAINT operaciones_estado_operacion_check 
--   CHECK (estado_operacion IN ('pendiente', 'confirmado', 'cancelado', 'en_proceso', ${estadosUnicos.map(e => `'${e}'`).join(", ")}));
-- ALTER TABLE public.operaciones ADD CONSTRAINT operaciones_tipo_operacion_check 
--   CHECK (tipo_operacion IN ('exportacion', 'importacion', ${tiposUnicos.map(t => `'${t}'`).join(", ")}));
`;

  const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const sqlPath = resolve(ROOT, "supabase", "migrations", `${timestamp}_seed_operaciones_historico.sql`);
  
  writeFileSync(sqlPath, sql, "utf-8");
  console.log(`✓ SQL generado: ${sqlPath}`);
}

main();
