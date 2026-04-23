const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const input = path.join(root, "EXPORT.json");
const output = path.join(root, "supabase/migrations/20260422110000_seed_export_json_operaciones.sql");

const rows = JSON.parse(fs.readFileSync(input, "utf8"));

function q(value) {
  if (value === null || value === undefined) return "NULL";
  const text = String(value).trim();
  if (!text) return "NULL";
  return `'${text.replace(/'/g, "''")}'`;
}

function normDate(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function normTs(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function normInt(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  const numeric = Number(text.replace(",", "."));
  if (!Number.isFinite(numeric)) return null;
  return Math.trunc(numeric);
}

const lines = [];
lines.push("-- Seed desde EXPORT.json (raiz del proyecto)");
lines.push(`-- Regenerado automaticamente: ${new Date().toISOString()}`);
lines.push(`-- Registros fuente: ${rows.length}`);
lines.push("");
lines.push("INSERT INTO public.operaciones (");
lines.push("  ref_asli, temporada, ingreso, semana, ejecutivo, estado_operacion, tipo_operacion,");
lines.push("  cliente, consignatario, especie, temperatura, ventilacion, naviera, nave,");
lines.push("  pol, pod, etd, eta, tt, booking, deposito, contenedor, forma_pago, ingreso_stacking, observaciones, origen_registro");
lines.push(") VALUES");

const values = [];

for (const row of rows) {
  const refAsli = (row["N°REF ASLI"] ?? "").toString().trim();
  if (!refAsli) continue;

  const temporada = (row["TEMPORADA"] ?? "").toString().trim() || null;
  const tipoIngreso = (row["TIPO INGRESO"] ?? "NORMAL").toString().trim() || "NORMAL";

  const observaciones = [];
  if (row["TEMPORADA"]) observaciones.push(`Temporada: ${String(row["TEMPORADA"]).trim()}`);
  if (row["WK ETD"] !== undefined && row["WK ETD"] !== null && String(row["WK ETD"]).trim() !== "") {
    observaciones.push(`WK ETD: ${String(row["WK ETD"]).trim()}`);
  }
  if (row["CT"]) observaciones.push(`CT: ${String(row["CT"]).trim()}`);
  if (row["COMENTARIO"]) observaciones.push(String(row["COMENTARIO"]).trim());
  if (row["OBSERVACION"]) observaciones.push(String(row["OBSERVACION"]).trim());
  if (row["ESTADO BL/SWB"]) observaciones.push(`BL/SWB: ${String(row["ESTADO BL/SWB"]).trim()}`);
  if (row["FACTURACION"]) observaciones.push(`Facturacion: ${String(row["FACTURACION"]).trim()}`);
  if (row["CANT CONT."] !== undefined && row["CANT CONT."] !== null && String(row["CANT CONT."]).trim() !== "") {
    observaciones.push(`Cant. Cont: ${String(row["CANT CONT."]).trim()}`);
  }

  values.push(
    `  (${[
      q(refAsli),
      q(temporada),
      q(normTs(row["INGRESADO"])),
      normInt(row["WK IN"]) ?? "NULL",
      q(row["EJECUTIVO"]),
      q(row["ESTADO"]),
      q(tipoIngreso),
      q(row["SHIPPER"]),
      q(row["CONTRATO"]),
      q(row["ESPECIE"]),
      q(row["T°"]),
      normInt(row["CBM"]) ?? "NULL",
      q(row["NAVIERA"]),
      q(row["NAVE INICIAL"]),
      q(row["POL"]),
      q(row["POD"]),
      q(normDate(row["ETD"])),
      q(normDate(row["ETA"])),
      normInt(row["TT"]) ?? "NULL",
      q(row["BOOKING"]),
      q(row["DEPÓSITO"]),
      q(row["CONTENEDOR"]),
      q(row["FLETE"]),
      q(normTs(row["INGRESO STACKING"])),
      q(observaciones.join(" | ")),
      q("importacion_export_json"),
    ].join(", ")})`
  );
}

lines.push(values.join(",\n"));
lines.push("ON CONFLICT (ref_asli) DO UPDATE SET");
lines.push("  temporada = EXCLUDED.temporada,");
lines.push("  ingreso = EXCLUDED.ingreso,");
lines.push("  semana = EXCLUDED.semana,");
lines.push("  ejecutivo = EXCLUDED.ejecutivo,");
lines.push("  estado_operacion = EXCLUDED.estado_operacion,");
lines.push("  tipo_operacion = EXCLUDED.tipo_operacion,");
lines.push("  cliente = EXCLUDED.cliente,");
lines.push("  consignatario = EXCLUDED.consignatario,");
lines.push("  especie = EXCLUDED.especie,");
lines.push("  temperatura = EXCLUDED.temperatura,");
lines.push("  ventilacion = EXCLUDED.ventilacion,");
lines.push("  naviera = EXCLUDED.naviera,");
lines.push("  nave = EXCLUDED.nave,");
lines.push("  pol = EXCLUDED.pol,");
lines.push("  pod = EXCLUDED.pod,");
lines.push("  etd = EXCLUDED.etd,");
lines.push("  eta = EXCLUDED.eta,");
lines.push("  tt = EXCLUDED.tt,");
lines.push("  booking = EXCLUDED.booking,");
lines.push("  deposito = EXCLUDED.deposito,");
lines.push("  contenedor = EXCLUDED.contenedor,");
lines.push("  forma_pago = EXCLUDED.forma_pago,");
lines.push("  ingreso_stacking = EXCLUDED.ingreso_stacking,");
lines.push("  observaciones = EXCLUDED.observaciones,");
lines.push("  origen_registro = EXCLUDED.origen_registro;");

fs.writeFileSync(output, lines.join("\n"), "utf8");
console.log(`Migracion regenerada: ${output}`);
console.log(`Filas incluidas: ${values.length}`);
