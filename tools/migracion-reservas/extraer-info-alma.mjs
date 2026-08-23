/**
 * Extrae datos de ERP/docs/info alma → Excel de migración
 * node tools/migracion-reservas/extraer-info-alma.mjs
 */
import ExcelJS from "exceljs";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INFO_ALMA = join(__dirname, "../../docs/info alma");
const OUT = join(__dirname, "../../docs/plantillas/migracion-reservas-alma-extraido.xlsx");

const REF_RE = /^2025M(\d{2})$/i;

const CONTRATO_ASLI_REFS = new Set(["2025M05", "2025M06", "2025M10", "2025M14", "2025M15"]);

function normUpper(s) {
  if (s == null) return "";
  const t = String(s).trim();
  if (!t) return "";
  return t.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
}

function contratoForRef(ref) {
  return CONTRATO_ASLI_REFS.has(ref.toUpperCase()) ? "ASLI" : "CHILL FRESH";
}

function duenoForRef(ref) {
  return CONTRATO_ASLI_REFS.has(ref.toUpperCase()) ? "ASLI" : "CHILFRESH";
}

const COLUMNAS = [
  "referencia_externa", "cliente", "ejecutivo", "estado_operacion", "tipo_operacion", "dueno_reserva", "temporada",
  "booking", "naviera", "nave", "viaje", "pol", "pod", "etd", "eta", "tt",
  "especie", "temperatura", "ventilacion", "tipo_unidad", "pallets", "peso_neto", "peso_bruto",
  "consignatario", "contrato", "incoterm", "forma_pago", "pais", "planta_presentacion", "deposito",
  "citacion", "inicio_stacking", "fin_stacking", "corte_documental",
  "contenedor", "sello", "transporte", "observaciones", "ingreso",
  "tipo_reserva_transporte", "enviado_transporte", "origen_registro",
  "dus", "sps", "aga", "numero_guia_despacho",
];

function listDirs(base) {
  return readdirSync(base)
    .filter((n) => REF_RE.test(n))
    .sort((a, b) => parseInt(a.slice(5), 10) - parseInt(b.slice(5), 10));
}

function walkFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkFiles(p, acc);
    else acc.push(p);
  }
  return acc;
}

function cellStr(v) {
  if (v == null) return "";
  if (typeof v === "object" && v.text) return String(v.text).trim();
  if (typeof v === "object" && v.result != null) return String(v.result).trim();
  if (v instanceof Date) {
    const d = v.getUTCDate().toString().padStart(2, "0");
    const m = (v.getUTCMonth() + 1).toString().padStart(2, "0");
    const y = v.getUTCFullYear();
    return `${d}/${m}/${y}`;
  }
  const s = String(v).trim();
  if (/GMT|hora estándar/i.test(s)) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      const dd = d.getUTCDate().toString().padStart(2, "0");
      const mm = (d.getUTCMonth() + 1).toString().padStart(2, "0");
      const yy = d.getUTCFullYear();
      return `${dd}/${mm}/${yy}`;
    }
  }
  return s;
}

function normPort(s) {
  const t = cellStr(s);
  if (!t) return "";
  return normUpper(t);
}

function normNaviera(s) {
  const t = cellStr(s).toUpperCase();
  if (!t) return "";
  if (t.includes("HAPAG")) return "HAPAG-LLOYD";
  if (t.includes("WAN HAI")) return "WAN HAI";
  if (t === "MSC") return "MSC";
  if (t.includes("ONE") || t.includes("ONEY")) return "ONE";
  if (t.includes("YANG MING") || t.includes("YANGMING")) return "YANG MING";
  if (t.includes("CMA")) return "CMA CGM";
  return normUpper(s);
}

function mapFormaPago(s) {
  const t = cellStr(s).toUpperCase();
  if (t.includes("PREPAID")) return "PREPAID";
  if (t.includes("COLLECT") || t.includes("COBRANZA")) return "COLLECT";
  return cellStr(s);
}

function mapDueno(s) {
  const t = cellStr(s).toUpperCase();
  if (t.includes("CHILFRESH")) return "CHILFRESH";
  if (t.includes("ASLI")) return "ASLI";
  if (t.includes("SURLOGISTICA") || t.includes("SUR LOGISTICA")) return "SURLOGISTICA";
  return cellStr(s) || "ASLI";
}

function mapEspecie(s) {
  const t = cellStr(s);
  if (!t) return "CEREZAS";
  if (/cherr/i.test(t)) return "CEREZAS";
  return normUpper(t);
}

async function readWorkbook(path) {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.readFile(path);
    return wb;
  } catch {
    return null;
  }
}

/** IE Alma: etiqueta col 3 → valor col 5; etiqueta col 9 → valor col 11 */
function parseIEAlmaSheet(sheet) {
  const left = {};
  const right = {};
  const maxRow = Math.min(sheet.rowCount || 0, 80) || 80;

  for (let r = 1; r <= maxRow; r++) {
    const l3 = cellStr(sheet.getCell(r, 3).value).replace(/:$/, "").trim();
    const l9 = cellStr(sheet.getCell(r, 9).value).replace(/:$/, "").trim();
    const v5 = cellStr(sheet.getCell(r, 5).value);
    const v11 = cellStr(sheet.getCell(r, 11).value);

    if (l3 && v5) left[l3.toUpperCase()] = v5;
    if (l9 && v11) right[l9.toUpperCase()] = v11;
  }

  const get = (...keys) => {
    for (const k of keys) {
      const ku = k.toUpperCase();
      if (left[ku]) return left[ku];
      if (right[ku]) return right[ku];
      for (const [lk, lv] of Object.entries(left)) {
        if (lk.includes(ku)) return lv;
      }
      for (const [rk, rv] of Object.entries(right)) {
        if (rk.includes(ku)) return rv;
      }
    }
    return "";
  };

  const especieRaw = cellStr(sheet.getCell(44, 3).value) || get("ESPECIE");
  const temp = cellStr(sheet.getCell(52, 8).value) || cellStr(sheet.getCell(53, 8).value);
  const vent = cellStr(sheet.getCell(52, 9).value) || cellStr(sheet.getCell(53, 9).value);
  const pallets = cellStr(sheet.getCell(53, 4).value) || cellStr(sheet.getCell(44, 5).value);

  let contenedor = get("CONTENEDOR");
  if (contenedor && !/^[A-Z]{4}\d/.test(contenedor)) contenedor = "";

  return {
    naviera: normNaviera(get("NAVIERA")),
    nave: get("NAVE"),
    booking: get("BOOKING").replace(/\s+/g, ""),
    contenedor,
    etd: get("FECHA EMBARQUE"),
    citacion: get("FECHA/HORA PRESENT.", "FECHA/HORA PRESENT"),
    pol: normPort(get("PTO. EMBARQUE")),
    pod: normPort(get("PTO. DESCARGA", "PTO. ENTREGA/DEST.", "DESTINO FINAL")),
    pais: get("PAIS DESTINO"),
    consignatario: get("CONSIGNEE") || cellStr(sheet.getCell(25, 5).value),
    incoterm: get("CLAUSULA DE VENTA").replace(/\s+/g, ""),
    forma_pago: mapFormaPago(get("FORMA DE PAGO", "TIPO  FLETE")),
    dueno_reserva: mapDueno(get("RESERVA")),
    planta_presentacion: get("PLANTA DESPACHO"),
    transporte: get("TRANSPORTE TERRESTRE"),
    deposito: get("RETIRO CONTENEDOR"),
    dus: get("DUS"),
    sps: get("SPS"),
    aga: get("AGENTE ADUANA"),
    especie: mapEspecie(especieRaw),
    temperatura: temp ? `${temp}°C`.replace("°C°C", "°C") : "",
    ventilacion: vent,
    pallets,
    ingreso: get("FECHA") || cellStr(sheet.getCell(7, 12).value),
  };
}

function parseProformaAlma(sheet) {
  const consignatario = cellStr(sheet.getCell(12, 3).value);
  const pais = cellStr(sheet.getCell(17, 3).value);
  return {
    consignatario: consignatario.startsWith("CONSIGNEE") ? "" : consignatario,
    pais,
    etd: cellStr(sheet.getCell(25, 1).value),
    nave: cellStr(sheet.getCell(25, 5).value),
    viaje: cellStr(sheet.getCell(25, 9).value),
    cliente: "ALMAFRUIT",
  };
}

function fromFilenames(files) {
  const blob = files.map((f) => basename(f)).join("\n");
  const data = {};

  const bk =
    blob.match(/EBKG(\d+)/i)?.[0] ||
    blob.match(/BOOK\s*CONF[_\s-]*([A-Z0-9]+)/i)?.[1] ||
    blob.match(/BKGCONF[_\s-]*([A-Z0-9]+)/i)?.[1] ||
    blob.match(/BK\s+[A-Z]?(\d{7,12})/i)?.[1] ||
    blob.match(/VAP(\d{7})/i)?.[0] ||
    blob.match(/(\d{8})\s*BK/i)?.[1] ||
    "";
  if (bk && !/^ONEYSCL/i.test(bk) && !/^HL-/i.test(bk)) {
    data.booking = bk.toUpperCase().startsWith("EBKG") ? bk.toUpperCase() : bk.toUpperCase().startsWith("VAP") ? bk.toUpperCase() : bk;
  }

  const cont = blob.match(/\b([A-Z]{4}\d{7})\b/g) || blob.match(/\b([A-Z]{4}\d{6}-\d)\b/g);
  if (cont) {
    const filtered = cont.filter((c) => !c.startsWith("EBKG") && !/^2025M/i.test(c));
    if (filtered.length) data.contenedor = filtered[0];
  }

  const dus = blob.match(/DUS\s+LEG[_\s-]*([\d-]+)/i)?.[1];
  if (dus) data.dus = dus;

  const guia = blob.match(/GUIA(?:[_\s-]*DESPACHO)?[_\s-]*(\d{4,5})/i)?.[1];
  if (guia) data.numero_guia_despacho = guia;

  return data;
}

function pickFile(files, patterns) {
  for (const pat of patterns) {
    const hit = files.find((f) => pat.test(f.replace(/\\/g, "/")));
    if (hit) return hit;
  }
  return null;
}

function mergePrefer(...objs) {
  const out = {};
  for (const o of objs) {
    for (const [k, v] of Object.entries(o)) {
      const s = cellStr(v);
      if (s && !out[k]) out[k] = s;
    }
  }
  return out;
}

async function extractEmbarque(ref) {
  const dir = join(INFO_ALMA, ref);
  const files = walkFiles(dir);
  const fromNames = fromFilenames(files);

  const ie = pickFile(files, [
    new RegExp(`${ref}.*IE.*ALMA.*\\.xlsx$`, "i"),
    new RegExp(`IE\\s*-\\s*${ref}.*\\.xlsx$`, "i"),
    new RegExp(`${ref}.*JUMBO\\.xlsx$`, "i"),
    /IE.*ALMA.*\.xlsx$/i,
  ]);
  const proforma = pickFile(files, [
    new RegExp(`${ref}.*proforma\\.xlsx$`, "i"),
    /proforma\.xlsx$/i,
  ]);

  let ieData = {};
  if (ie) {
    const wb = await readWorkbook(ie);
    if (wb?.worksheets[0]) ieData = parseIEAlmaSheet(wb.worksheets[0]);
  }

  let pro = {};
  if (proforma) {
    const wb = await readWorkbook(proforma);
    if (wb?.worksheets[0]) pro = parseProformaAlma(wb.worksheets[0]);
  }

  const m = mergePrefer(ieData, pro, fromNames);

  if (!m.naviera) {
    const blob = files.join(" ").toUpperCase();
    if (blob.includes("ONEY") || blob.includes("ONEU") || blob.includes("VAP")) m.naviera = "ONE";
    else if (blob.includes("HL-") || blob.includes("HLBU")) m.naviera = "HAPAG-LLOYD";
    else if (blob.includes("EBKG") || blob.includes("CMA")) m.naviera = "CMA CGM";
    else if (blob.includes("MSC")) m.naviera = "MSC";
    else if (blob.includes("YMJAC")) m.naviera = "YANG MING";
    else if (blob.includes("SEGU") || blob.includes("OTPU")) m.naviera = "ONE";
  }

  const obs = [`Fuente: docs/info alma/${ref}`];
  if (ie) obs.push(`IE: ${basename(ie)}`);
  if (proforma) obs.push(`Proforma: ${basename(proforma)}`);

  return {
    referencia_externa: ref.toUpperCase(),
    cliente: normUpper(m.cliente || "ALMAFRUIT"),
    ejecutivo: "RODRIGO CACERES",
    estado_operacion: "COMPLETADO",
    tipo_operacion: "EXPORTACION",
    dueno_reserva: duenoForRef(ref),
    temporada: "TEMP 25-26",
    booking: normUpper(m.booking || ""),
    naviera: normUpper(m.naviera || ""),
    nave: normUpper(m.nave || ""),
    viaje: normUpper(m.viaje || ""),
    pol: normUpper(m.pol || ""),
    pod: normUpper(m.pod || ""),
    etd: m.etd || "",
    eta: "",
    tt: "",
    especie: normUpper(m.especie || "CEREZAS"),
    temperatura: m.temperatura ? normUpper(m.temperatura) : "",
    ventilacion: m.ventilacion || "",
    tipo_unidad: "40RF",
    pallets: m.pallets || "",
    peso_neto: "",
    peso_bruto: "",
    consignatario: normUpper(m.consignatario || ""),
    contrato: contratoForRef(ref),
    incoterm: normUpper(m.incoterm || "FOB"),
    forma_pago: normUpper(m.forma_pago || "COLLECT"),
    pais: normUpper(m.pais || ""),
    planta_presentacion: normUpper(m.planta_presentacion || ""),
    deposito: normUpper(m.deposito || ""),
    citacion: m.citacion || "",
    inicio_stacking: "",
    fin_stacking: "",
    corte_documental: "",
    contenedor: normUpper(m.contenedor || ""),
    sello: "",
    transporte: normUpper(m.transporte || ""),
    observaciones: normUpper(obs.join(" | ")),
    ingreso: m.ingreso || "",
    tipo_reserva_transporte: "",
    enviado_transporte: "no",
    origen_registro: "MIGRACION_EXCEL",
    dus: normUpper(m.dus || ""),
    sps: normUpper(m.sps || ""),
    aga: normUpper(m.aga || ""),
    numero_guia_despacho: normUpper(m.numero_guia_despacho || ""),
    _meta: { ie: ie ? basename(ie) : null, proforma: proforma ? basename(proforma) : null },
  };
}

const refs = listDirs(INFO_ALMA);
console.log(`Procesando ${refs.length} embarques Alma Fruit...\n`);

const rows = [];
const log = [];

for (const ref of refs) {
  const row = await extractEmbarque(ref);
  const { _meta, ...data } = row;
  rows.push(data);
  log.push({
    ref,
    ie: _meta.ie,
    proforma: _meta.proforma,
    booking: data.booking,
    contenedor: data.contenedor,
    naviera: data.naviera,
    nave: data.nave,
    pol: data.pol,
    pod: data.pod,
    consignatario: data.consignatario,
    etd: data.etd,
    dus: data.dus,
  });
  console.log(
    `${ref}  bk=${data.booking || "-"}  nav=${data.naviera || "-"}  ${data.nave || "-"}  ` +
      `POL=${data.pol || "-"}  POD=${data.pod || "-"}  cnt=${data.contenedor || "-"}`
  );
}

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet("Reservas");
const hdr = ws.addRow(COLUMNAS);
hdr.font = { bold: true, color: { argb: "FFFFFFFF" } };
hdr.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF11224E" } };
rows.forEach((r) => ws.addRow(COLUMNAS.map((k) => r[k] ?? "")));
COLUMNAS.forEach((_, i) => { ws.getColumn(i + 1).width = 16; });

const wsLog = wb.addWorksheet("Extraccion_log");
wsLog.addRow(["ref", "ie", "proforma", "booking", "contenedor", "naviera", "nave", "pol", "pod", "consignatario", "etd", "dus"]);
log.forEach((l) =>
  wsLog.addRow([l.ref, l.ie, l.proforma, l.booking, l.contenedor, l.naviera, l.nave, l.pol, l.pod, l.consignatario, l.etd, l.dus])
);

await wb.xlsx.writeFile(OUT);
console.log(`\n✓ Generado: ${OUT}`);
console.log(`  ${rows.length} filas listas para revisar e importar.`);
