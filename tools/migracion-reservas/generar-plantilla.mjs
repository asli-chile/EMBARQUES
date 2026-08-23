/**
 * Genera docs/plantillas/migracion-reservas-plantilla.xlsx
 * Ejecutar: node tools/migracion-reservas/generar-plantilla.mjs
 */
import ExcelJS from "exceljs";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../../docs/plantillas");
const outPath = join(outDir, "migracion-reservas-plantilla.xlsx");

/** Orden pensado para completar a mano: lo esencial primero, resto opcional. */
const COLUMNAS_RESERVAS = [
  "referencia_externa",
  "cliente",
  "ejecutivo",
  "estado_operacion",
  "tipo_operacion",
  "dueno_reserva",
  "booking",
  "naviera",
  "nave",
  "viaje",
  "pol",
  "pod",
  "etd",
  "eta",
  "tt",
  "especie",
  "temperatura",
  "ventilacion",
  "tipo_unidad",
  "pallets",
  "peso_neto",
  "peso_bruto",
  "consignatario",
  "incoterm",
  "forma_pago",
  "pais",
  "planta_presentacion",
  "deposito",
  "citacion",
  "inicio_stacking",
  "fin_stacking",
  "corte_documental",
  "contenedor",
  "sello",
  "transporte",
  "observaciones",
  "ingreso",
  "tipo_reserva_transporte",
  "enviado_transporte",
  "origen_registro",
];

/** Valores alineados con catálogos del ERP (public.catalogos + formulario Crear Reserva). */
const LISTAS_DESPLEGABLES = {
  estado_operacion: [
    "PENDIENTE",
    "EN PROCESO",
    "EN TRÁNSITO",
    "ARRIBADO",
    "COMPLETADO",
    "CANCELADO",
    "ROLEADO",
  ],
  tipo_operacion: ["EXPORTACIÓN", "IMPORTACIÓN", "TRIANGULACIÓN", "CABOTAJE"],
  dueno_reserva: ["ASLI", "CHILFRESH", "SURLOGISTICA"],
  incoterm: ["FOB", "CIF", "CFR", "EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP"],
  forma_pago: ["PREPAID", "COLLECT", "PREPAID/COLLECT"],
  tipo_unidad: ["40RF", "40HC", "40DV", "20RF", "20DV", "45HC"],
  tipo_reserva_transporte: ["asli", "externa"],
  enviado_transporte: ["si", "no"],
  origen_registro: ["migracion_excel", "migracion_json", "migracion_google_sheets", "reserva_web", "manual"],
};

const EJEMPLO = {
  referencia_externa: "RES-ANTIGUA-001",
  cliente: "EXPORTADORA DEMO SPA",
  ejecutivo: "Nombre Ejecutivo",
  estado_operacion: "COMPLETADO",
  tipo_operacion: "EXPORTACIÓN",
  dueno_reserva: "ASLI",
  booking: "MSC1234567890",
  naviera: "MSC",
  nave: "MSC EXAMPLE",
  viaje: "VA123A",
  pol: "San Antonio",
  pod: "Rotterdam",
  etd: "15/03/2024",
  eta: "05/04/2024",
  tt: 21,
  especie: "Uvas",
  temperatura: "-1°C",
  ventilacion: 25,
  tipo_unidad: "40HC",
  pallets: 20,
  peso_neto: 18000,
  peso_bruto: 19500,
  consignatario: "CONSIGNEE BV",
  incoterm: "FOB",
  forma_pago: "PREPAID",
  pais: "Holanda",
  planta_presentacion: "Planta Demo",
  deposito: "Depósito Demo",
  citacion: "10/03/2024 08:00",
  inicio_stacking: "12/03/2024 08:00",
  fin_stacking: "14/03/2024 18:00",
  corte_documental: "11/03/2024 12:00",
  contenedor: "MSCU1234567",
  sello: "SELLO123",
  transporte: "Transportes Demo",
  observaciones: "Reserva histórica migrada desde Excel",
  ingreso: "01/03/2024",
  tipo_reserva_transporte: "asli",
  enviado_transporte: "no",
  origen_registro: "migracion_excel",
};

const INSTRUCCIONES = [
  ["Guía de la plantilla — Migración de reservas a Embarques ASLI", ""],
  ["", ""],
  ["Hoja «Reservas»", "Fila 1 = nombres de columna (no cambiar). Fila 2 = ejemplo. Desde fila 3, una reserva por fila."],
  ["Listas desplegables", "Varias columnas tienen menú ▼ con opciones válidas del sistema. Puedes dejar la celda vacía si no aplica."],
  ["Ref. ASLI automática", "No completes ref_asli ni correlativo: el sistema los genera al importar (A00001, A00002…)."],
  ["referencia_externa", "Tu código antigo / interno. Sirve para cruzar con planillas viejas."],
  ["cliente", "Obligatorio. Nombre exacto de la empresa (como en el ERP). Texto libre."],
  ["ejecutivo", "Nombre del ejecutivo ASLI responsable. Texto libre."],
  ["estado_operacion", "Lista desplegable con estados del ERP."],
  ["tipo_operacion", "Lista desplegable: EXPORTACIÓN, IMPORTACIÓN, etc."],
  ["dueno_reserva", "Lista desplegable: ASLI, CHILFRESH, SURLOGISTICA."],
  ["Fechas (etd, eta, ingreso)", "DD/MM/AAAA — ejemplo: 15/03/2024"],
  ["Fechas con hora", "DD/MM/AAAA HH:mm — ejemplo: 10/03/2024 08:00 (citacion, stacking, etc.)"],
  ["tt", "Días de tránsito (número entero)."],
  ["ventilacion", "Número entero en CBM/h; vacío si no aplica."],
  ["incoterm / forma_pago / tipo_unidad", "Listas desplegables según catálogos del ERP."],
  ["tipo_reserva_transporte", "Lista: asli | externa"],
  ["enviado_transporte", "Lista: si | no"],
  ["origen_registro", "Lista desplegable; usar migracion_excel para estas reservas históricas."],
  ["", ""],
  ["Importación", "Cuando completes el archivo, envíalo para migrar vía API /api/admin/import-operaciones-migracion"],
  ["Más columnas", "Si necesitas campos extra (facturación, chofer, DUS, etc.), se pueden agregar columnas con el mismo nombre que en Registros (snake_case)."],
];

const FIRST_DATA_ROW = 2;
const LAST_DATA_ROW = 1000;

function colLetter(n) {
  let s = "";
  let num = n;
  while (num > 0) {
    const m = (num - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
}

function buildListasSheet(wb) {
  const wsList = wb.addWorksheet("Listas", { state: "veryHidden" });
  const keys = Object.keys(LISTAS_DESPLEGABLES);
  keys.forEach((key, colIdx) => {
    const col = colIdx + 1;
    wsList.getCell(1, col).value = key;
    wsList.getCell(1, col).font = { bold: true };
    LISTAS_DESPLEGABLES[key].forEach((val, rowIdx) => {
      wsList.getCell(rowIdx + 2, col).value = val;
    });
  });
  return { wsList, keys };
}

function applyDropdown(ws, colIdx, listColIdx, listLen) {
  const col = colLetter(colIdx);
  const listCol = colLetter(listColIdx);
  const range = `${col}${FIRST_DATA_ROW}:${col}${LAST_DATA_ROW}`;
  const formula = `Listas!$${listCol}$2:$${listCol}$${listLen + 1}`;
  ws.dataValidations.add(range, {
    type: "list",
    allowBlank: true,
    formulae: [formula],
    showDropDown: true,
    showErrorMessage: true,
    errorTitle: "Valor no válido",
    error: "Elige una opción de la lista desplegable o deja la celda vacía.",
  });
}

const wb = new ExcelJS.Workbook();
wb.creator = "ASLI Embarques";
wb.created = new Date();

const { keys: listaKeys } = buildListasSheet(wb);
const listaColIndex = Object.fromEntries(listaKeys.map((k, i) => [k, i + 1]));

const ws = wb.addWorksheet("Reservas", {
  views: [{ state: "frozen", ySplit: 1 }],
});

const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF11224E" } };
const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
const exampleFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF7" } };
const requiredFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3CD" } };
const dropdownHeaderFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A6E" } };

ws.addRow(COLUMNAS_RESERVAS);
const headerRow = ws.getRow(1);
headerRow.height = 22;
COLUMNAS_RESERVAS.forEach((key, i) => {
  const cell = headerRow.getCell(i + 1);
  cell.font = headerFont;
  cell.fill = LISTAS_DESPLEGABLES[key] ? dropdownHeaderFill : headerFill;
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  if (key === "cliente") {
    cell.fill = requiredFill;
    cell.note = "Obligatorio — texto libre";
  } else if (LISTAS_DESPLEGABLES[key]) {
    cell.note = "Lista desplegable ▼";
  }
});

ws.addRow(COLUMNAS_RESERVAS.map((k) => EJEMPLO[k] ?? ""));
const exampleRow = ws.getRow(2);
exampleRow.height = 18;
exampleRow.eachCell((cell) => {
  cell.fill = exampleFill;
  cell.font = { italic: true, size: 10, color: { argb: "FF475569" } };
});

for (let r = 0; r < 50; r++) {
  ws.addRow(COLUMNAS_RESERVAS.map(() => ""));
}

COLUMNAS_RESERVAS.forEach((key, i) => {
  const widths = {
    referencia_externa: 18,
    cliente: 28,
    ejecutivo: 20,
    observaciones: 32,
    consignatario: 22,
    naviera: 14,
    nave: 18,
    booking: 16,
    contenedor: 16,
    estado_operacion: 16,
    tipo_operacion: 14,
    incoterm: 10,
    forma_pago: 16,
    origen_registro: 18,
  };
  ws.getColumn(i + 1).width = widths[key] ?? 14;

  if (LISTAS_DESPLEGABLES[key]) {
    const listColIdx = listaColIndex[key];
    const listLen = LISTAS_DESPLEGABLES[key].length;
    applyDropdown(ws, i + 1, listColIdx, listLen);
  }
});

const wsHelp = wb.addWorksheet("Instrucciones");
INSTRUCCIONES.forEach(([a, b]) => {
  const row = wsHelp.addRow([a, b]);
  if (a.startsWith("Guía")) {
    row.getCell(1).font = { bold: true, size: 14, color: { argb: "FF11224E" } };
    row.height = 24;
  } else if (a && !b && a !== "") {
    row.getCell(1).font = { bold: true, size: 11 };
  }
});
wsHelp.getColumn(1).width = 28;
wsHelp.getColumn(2).width = 72;

mkdirSync(outDir, { recursive: true });
try {
  await wb.xlsx.writeFile(outPath);
  console.log(`Plantilla generada: ${outPath}`);
} catch (err) {
  if (err?.code === "EBUSY") {
    const altPath = join(outDir, "migracion-reservas-plantilla-nueva.xlsx");
    await wb.xlsx.writeFile(altPath);
    console.log(`Archivo original en uso. Plantilla generada en: ${altPath}`);
    console.log("Cierra el Excel anterior y vuelve a ejecutar el script, o renombra este archivo.");
  } else {
    throw err;
  }
}
