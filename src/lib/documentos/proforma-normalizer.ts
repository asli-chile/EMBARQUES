/**
 * proforma-normalizer.ts
 *
 * Normaliza documentos de Proforma Invoice de múltiples formatos hacia
 * la estructura estándar alineada con la tabla `operaciones` + `proforma_items`.
 *
 * Reglas:
 *  - Fuente de verdad: nombres exactos de la BD.
 *  - Mapping centralizado: agregar alias sin tocar la lógica principal.
 *  - Normalización de texto antes de comparar (mayúsculas, sin acentos ni símbolos).
 *  - Items como array, nunca como campos individuales.
 */

// ── Tipos de salida ────────────────────────────────────────────────────────────

export interface ProformaItem {
  especie: string;
  variedad: string;
  calibre: string;
  envase: string;
  cantidad: string;
  peso_neto: string;
  precio_unitario: string;
  total: string;
}

export interface ProformaNormalizada {
  cliente: string;
  consignatario: string;
  nave: string;
  naviera: string;
  booking: string;
  pol: string;
  pod: string;
  etd: string;
  eta: string;
  contenedor: string;
  sello: string;
  peso_neto: string;
  peso_bruto: string;
  monto_facturado: string;
  incoterm: string;
  forma_pago: string;
  moneda: string;
  pais: string;
  items: ProformaItem[];
  /** Campos del documento que no pudieron mapearse */
  _sin_mapear: Record<string, string>;
}

// ── Mapping centralizado ───────────────────────────────────────────────────────

type CampoEstandar = keyof Omit<ProformaNormalizada, "items" | "_sin_mapear">;
type CampoItem = keyof ProformaItem;

const CAMPO_ALIASES: Record<CampoEstandar, string[]> = {
  cliente: [
    "EXPORTADOR", "EXPORTADORA", "SHIPPER", "EMPRESA", "EXPORTER",
    "SELLER", "PROVEEDOR", "SUPPLIER", "NAME OF EXPORTER",
  ],
  consignatario: [
    "CONSIGNEE", "CONSIGNATARIO", "BUYER", "IMPORTADOR",
    "IMPORTER", "CLIENTE DESTINO",
  ],
  nave: [
    "VESSEL", "MOTONAVE", "NAVE", "VSL", "VESSEL NAME",
    "NAME OF VESSEL", "SHIP",
  ],
  naviera: [
    "NAVIERA", "SHIPPING LINE", "LINE", "LINEA NAVIERA",
    "OCEAN CARRIER", "CARRIER",
  ],
  booking: [
    "BOOKING", "BOOKING NUMBER", "BOOKING NO", "RESERVA",
    "RESERVATION", "BOOK REF", "BOOKING REF",
  ],
  pol: [
    "LOADING PORT", "PORT OF LOADING", "PUERTO EMBARQUE",
    "PTO EMBARQUE", "PORT LOAD", "POL", "ORIGIN PORT", "PORT OF ORIGIN",
  ],
  pod: [
    "DISCHARGE PORT", "PORT OF DISCHARGE", "PUERTO DESTINO",
    "PORT DESTINATION", "PORT FINAL DESTINATION", "FINAL DESTINATION",
    "PTO DESCARGA", "POD", "DESTINATION PORT",
  ],
  etd: [
    "ETD", "ESTIMATED TIME OF DEPARTURE", "FECHA EMBARQUE",
    "FECHA DE EMBARQUE", "SAILING DATE", "DEPARTURE DATE",
  ],
  eta: [
    "ETA", "ESTIMATED TIME OF ARRIVAL", "ARRIVAL DATE",
    "FECHA ARRIBO", "FECHA DE LLEGADA",
  ],
  contenedor: [
    "CONTAINER", "CONTAINER NUMBER", "CONTAINER NO", "CONTENEDOR",
    "N CONTENEDOR", "CONTAINER ID", "CNTR", "EQUIPMENT NUMBER",
  ],
  sello: ["SEAL", "SEAL NUMBER", "SELLO", "N SELLO"],
  peso_neto: [
    "NET WEIGHT", "NETO", "PESO NETO", "NET WEIGHT TOTAL",
    "NET KG", "TOTAL NET WEIGHT", "NET MASS",
  ],
  peso_bruto: [
    "GROSS WEIGHT", "BRUTO", "PESO BRUTO", "GROSS WEIGHT TOTAL",
    "GROSS KG", "TOTAL GROSS WEIGHT", "GROSS MASS",
  ],
  monto_facturado: [
    "TOTAL USD", "TOTAL VALUE", "FOB TOTAL", "VALOR TOTAL",
    "TOTAL A PAGAR", "GRAND TOTAL", "INVOICE TOTAL",
    "TOTAL AMOUNT", "AMOUNT DUE", "TOTAL FOB VALUE",
  ],
  incoterm: [
    "INCOTERM", "CLAUSULA DE VENTA", "TERMS OF SALE",
    "TRADE TERMS", "DELIVERY TERMS", "SALE TERMS",
  ],
  forma_pago: [
    "FORMA DE PAGO", "PAYMENT TERMS", "PAYMENT METHOD",
    "TERMS OF PAYMENT", "PAGO", "PAYMENT",
  ],
  moneda: ["CURRENCY", "MONEDA", "USD", "US"],
  pais: [
    "COUNTRY", "PAIS", "COUNTRY OF ORIGIN",
    "PAIS ORIGEN", "ORIGIN COUNTRY",
  ],
};

const ITEM_ALIASES: Record<CampoItem, string[]> = {
  especie: [
    "ESPECIE", "SPECIE", "PRODUCT", "PRODUCT TYPE",
    "COMMODITY", "GOODS", "ITEM", "DESCRIPTION",
  ],
  variedad: ["VARIEDAD", "VARIETY", "CULTIVAR", "TYPE"],
  calibre: ["CALIBRE", "CALIBER", "SIZE", "GRADE"],
  envase: ["ENVASE", "PACKAGING", "PACKAGE", "PACKING", "FORMAT"],
  cantidad: [
    "QUANTITY", "CANTIDAD", "QTY", "UNITS",
    "CASES", "BOXES", "CAJAS",
  ],
  peso_neto: [
    "NET WEIGHT", "NETO", "PESO NETO", "NET KG",
    "NET WEIGHT KG", "KG NETO", "NET MASS",
  ],
  precio_unitario: [
    "UNIT PRICE", "PRECIO UNITARIO", "PRICE PER UNIT",
    "PRICE", "USD/CAJA", "PRICE PER BOX",
  ],
  total: [
    "TOTAL", "LINE TOTAL", "VALOR", "AMOUNT",
    "SUBTOTAL", "FOB VALUE",
  ],
};

// ── Normalización de texto ─────────────────────────────────────────────────────

/**
 * Convierte a mayúsculas, elimina acentos, símbolos especiales y
 * espacios redundantes para comparación robusta de etiquetas.
 */
export function normalizeText(text: string): string {
  return text
    .toUpperCase()
    .normalize("NFD")                       // descomponer acentos
    .replace(/[\u0300-\u036f]/g, "")        // quitar marcas diacríticas
    .replace(/[°#%$€£¥@!¡?¿"'`,;:./\\|^~*+=<>(){}\[\]]/g, " ") // símbols → espacio
    .replace(/\s+/g, " ")                   // colapsar espacios
    .trim();
}

// ── Construcción de índice inverso ─────────────────────────────────────────────

/** Índice: alias normalizado → campo estándar (header) */
const HEADER_INDEX = new Map<string, CampoEstandar>();
for (const [campo, aliases] of Object.entries(CAMPO_ALIASES) as [CampoEstandar, string[]][]) {
  for (const alias of aliases) {
    HEADER_INDEX.set(normalizeText(alias), campo);
  }
  // También el propio nombre de campo como alias
  HEADER_INDEX.set(normalizeText(campo), campo);
}

/** Índice: alias normalizado → campo de ítem */
const ITEM_INDEX = new Map<string, CampoItem>();
for (const [campo, aliases] of Object.entries(ITEM_ALIASES) as [CampoItem, string[]][]) {
  for (const alias of aliases) {
    ITEM_INDEX.set(normalizeText(alias), campo);
  }
  ITEM_INDEX.set(normalizeText(campo), campo);
}

// ── Resolución de campo ────────────────────────────────────────────────────────

/** Resuelve un label de documento al campo estándar de cabecera, o null. */
export function resolveHeaderField(label: string): CampoEstandar | null {
  return HEADER_INDEX.get(normalizeText(label)) ?? null;
}

/** Resuelve un label de documento al campo estándar de ítem, o null. */
export function resolveItemField(label: string): CampoItem | null {
  return ITEM_INDEX.get(normalizeText(label)) ?? null;
}

// ── Parser de documento genérico ──────────────────────────────────────────────

/**
 * Entrada: lista de filas donde cada fila es un array de celdas (string|number).
 * Salida: ProformaNormalizada.
 *
 * Detecta automáticamente si una fila es de cabecera (key-value en columnas A-B)
 * o es parte de una tabla de ítems (encabezados de columna + filas de datos).
 */
export function parseProformaRows(
  rows: (string | number | null | undefined)[][]
): ProformaNormalizada {
  const result: ProformaNormalizada = {
    cliente: "", consignatario: "", nave: "", naviera: "", booking: "",
    pol: "", pod: "", etd: "", eta: "", contenedor: "", sello: "",
    peso_neto: "", peso_bruto: "", monto_facturado: "", incoterm: "",
    forma_pago: "", moneda: "", pais: "",
    items: [],
    _sin_mapear: {},
  };

  // Detectar bloque de tabla de ítems
  // Se identifica cuando una fila tiene ≥3 celdas y alguna mapea a campo de ítem
  let itemHeaderRow = -1;
  let itemHeaderMap: Map<number, CampoItem> = new Map();

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r].map((c) => String(c ?? "").trim());
    const nonEmpty = row.filter(Boolean);
    if (nonEmpty.length < 3) continue;

    const tentativeMap = new Map<number, CampoItem>();
    for (let c = 0; c < row.length; c++) {
      const campo = resolveItemField(row[c]);
      if (campo) tentativeMap.set(c, campo);
    }
    // Si al menos 3 columnas mapean a campos de ítem → es encabezado de tabla
    if (tentativeMap.size >= 3) {
      itemHeaderRow = r;
      itemHeaderMap = tentativeMap;
      break;
    }
  }

  // Procesar filas de cabecera (antes del bloque de ítems)
  const headerLimit = itemHeaderRow === -1 ? rows.length : itemHeaderRow;
  for (let r = 0; r < headerLimit; r++) {
    const row = rows[r].map((c) => String(c ?? "").trim());

    // Patrón key-value: columna A = label, columna B = valor
    if (row.length >= 2 && row[0]) {
      const campo = resolveHeaderField(row[0]);
      const valor = row.slice(1).find(Boolean) ?? "";
      if (campo) {
        if (!result[campo]) result[campo] = valor; // no sobreescribir si ya está
      } else if (row[0] && valor) {
        result._sin_mapear[row[0]] = valor;
      }
      continue;
    }

    // Patrón inline: múltiples pares key-value en la misma fila
    for (let c = 0; c + 1 < row.length; c += 2) {
      if (!row[c]) continue;
      const campo = resolveHeaderField(row[c]);
      const valor = row[c + 1] ?? "";
      if (campo && !result[campo]) {
        result[campo] = valor;
      } else if (!campo && valor) {
        result._sin_mapear[row[c]] = valor;
      }
    }
  }

  // Procesar filas de ítems (después del encabezado detectado)
  if (itemHeaderRow !== -1) {
    for (let r = itemHeaderRow + 1; r < rows.length; r++) {
      const row = rows[r].map((c) => String(c ?? "").trim());
      if (row.every((c) => !c)) continue; // fila vacía → fin de tabla

      const item: ProformaItem = {
        especie: "", variedad: "", calibre: "", envase: "",
        cantidad: "", peso_neto: "", precio_unitario: "", total: "",
      };
      let hasData = false;
      for (const [colIdx, campo] of itemHeaderMap) {
        const valor = row[colIdx] ?? "";
        if (valor) {
          item[campo] = valor;
          hasData = true;
        }
      }
      if (hasData) result.items.push(item);

      // Si esta fila contiene un total global, también capturarlo en cabecera
      for (let c = 0; c < row.length; c++) {
        if (!itemHeaderMap.has(c) && row[c]) {
          const campo = resolveHeaderField(row[c]);
          const valor = row[c + 1] ?? "";
          if (campo && !result[campo] && valor) result[campo] = valor;
        }
      }
    }
  }

  return result;
}

// ── Helper para Excel (SheetJS) ────────────────────────────────────────────────

/**
 * Convierte una hoja de SheetJS (WorkSheet) en filas para `parseProformaRows`.
 * Importar xlsx sólo donde se use para no cargar en el bundle principal.
 */
export function sheetToRows(
  sheet: Record<string, { v?: string | number | boolean | Date }>
): (string | number | null)[][] {
  // Determinar rango
  const ref = (sheet["!ref"] as string | undefined) ?? "";
  if (!ref) return [];

  // Parsear rango manualmente sin depender de utils.decode_range
  const [startCell, endCell] = ref.split(":");
  const colToNum = (col: string) =>
    col.split("").reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  const startCol = colToNum(startCell.replace(/\d/g, ""));
  const startRow = parseInt(startCell.replace(/\D/g, ""), 10) - 1;
  const endCol   = endCell ? colToNum(endCell.replace(/\d/g, "")) : startCol;
  const endRow   = endCell ? parseInt(endCell.replace(/\D/g, ""), 10) - 1 : startRow;

  const rows: (string | number | null)[][] = [];
  for (let r = startRow; r <= endRow; r++) {
    const row: (string | number | null)[] = [];
    for (let c = startCol; c <= endCol; c++) {
      const colLetter = colLetterFromIndex(c);
      const cellKey   = `${colLetter}${r + 1}`;
      const cell      = sheet[cellKey];
      row.push(cell?.v != null ? (cell.v instanceof Date ? cell.v.toISOString() : cell.v as string | number) : null);
    }
    rows.push(row);
  }
  return rows;
}

function colLetterFromIndex(n: number): string {
  let letter = "";
  n = n + 1; // 1-based
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}
