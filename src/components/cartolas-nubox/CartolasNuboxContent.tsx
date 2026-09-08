import { useCallback, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import * as XLSX from "xlsx";
import { FormSelect } from "@/components/ui/FormSelect";
import { useLocale } from "@/lib/i18n";
import { useNeonTheme } from "@/lib/ui/neonTheme";

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface MovimientoNubox {
  fecha: string;       // DD-MM-AAAA
  descripcion: string;
  referencia: string;
  abono: number | "";
  cargo: number | "";
}

interface HeaderBanco {
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
}

type FormatoBanco = "auto" | "santander" | "chile" | "itau";

const FORMATOS_BANCO: Array<{ value: FormatoBanco; label: string }> = [
  { value: "auto", label: "Detectar automaticamente" },
  { value: "santander", label: "Santander / formato actual" },
  { value: "chile", label: "Banco de Chile" },
  { value: "itau", label: "Banco Itau" },
];

// ── Parser de cartola bancaria ────────────────────────────────────────────────

function parseFecha(raw: string): string {
  // Normaliza cualquier formato de fecha a "DD-MM-AAAA" requerido por Nubox
  if (!raw) return "";
  const s = String(raw).trim();

  // D/M/YYYY o DD/MM/YYYY (con o sin ceros)
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return m[1].padStart(2, "0") + "-" + m[2].padStart(2, "0") + "-" + m[3];

  // D-M-YYYY o DD-MM-YYYY (ya en el formato correcto o sin ceros)
  m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) return m[1].padStart(2, "0") + "-" + m[2].padStart(2, "0") + "-" + m[3];

  // DD.MM.YYYY o D.M.YYYY
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return m[1].padStart(2, "0") + "-" + m[2].padStart(2, "0") + "-" + m[3];

  // YYYY-MM-DD (ISO)
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return m[3] + "-" + m[2] + "-" + m[1];

  // YYYY/MM/DD
  m = s.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (m) return m[3] + "-" + m[2] + "-" + m[1];

  // Serial numérico de Excel (días desde 1900-01-01)
  if (/^\d+$/.test(s)) {
    const date = XLSX.SSF.parse_date_code(Number(s));
    if (date) {
      return String(date.d).padStart(2, "0") + "-" + String(date.m).padStart(2, "0") + "-" + date.y;
    }
  }

  return s;
}

function extractHeaderBanco(rows: unknown[][]): HeaderBanco {
  // Fila 7 (índice 6): "Cuenta Corriente N°: XXXX", "Moneda: ...", "Sucursal: ..."
  // Fila 3 (índice 2): "Sr. (a):", nombre
  let banco = "";
  let tipoCuenta = "";
  let numeroCuenta = "";

  for (const row of rows) {
    const cells = row.map((c) => String(c ?? "").trim());
    // Detectar tipo cuenta y número desde celda que dice "Cuenta Corriente N°: ..."
    for (const cell of cells) {
      const m = cell.match(/^(Cuenta\s+\w+)\s+N[°º]?[:\s]+(.+)$/i);
      if (m) {
        tipoCuenta = m[1].trim();
        numeroCuenta = m[2].trim();
      }
    }
    // Detectar banco por código de sucursal o texto en cualquier celda
    for (const cell of cells) {
      if (/BANCO\s*ESTADO/i.test(cell)) {
        banco = "Banco Estado";
      } else if (/0285\s*CURICO|CURICO\s*PLAZA|BANCO\s*SANTANDER/i.test(cell)) {
        banco = "Banco Santander";
      } else if (/BANCO\s*DE\s*CHILE/i.test(cell)) {
        banco = "Banco de Chile";
      } else if (/BANCO\s*SANTANDER/i.test(cell)) {
        banco = "Banco Santander";
      } else if (/BCI|BANCO\s*DE\s*CR[EÉ]DITO/i.test(cell)) {
        banco = "BCI";
      } else if (/SCOTIABANK/i.test(cell)) {
        banco = "Scotiabank";
      } else if (/ITAU/i.test(cell)) {
        banco = "Banco Itaú";
      } else if (/BICE/i.test(cell)) {
        banco = "Banco BICE";
      }
    }
  }

  return { banco, tipoCuenta, numeroCuenta };
}

function parseAmount(raw: unknown): number | null {
  if (raw === "" || raw === null || typeof raw === "undefined") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.abs(raw);
  const normalized = String(raw)
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return Math.abs(parsed);
}

function extractPeriodoYear(rows: unknown[][]): number | null {
  for (const row of rows) {
    for (const cellRaw of row) {
      const cell = String(cellRaw ?? "").trim();
      const match = cell.match(/(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2})\/(\d{2})\/(\d{4})/);
      if (match) {
        return Number(match[3]);
      }
    }
  }
  return null;
}

function parseCartolaSantander(rows: unknown[][], header: HeaderBanco): {
  movimientos: MovimientoNubox[];
  header: HeaderBanco;
  error?: string;
} {
  // Buscar fila de cabecera de movimientos: contiene "MONTO" y "DESCRIPCIÓN MOVIMIENTO" y "CARGO/ABONO"
  let dataStart = -1;
  for (let i = 0; i < rows.length; i++) {
    const cells = (rows[i] ?? []).map((c) => String(c ?? "").toUpperCase().trim());
    if (cells.includes("MONTO") && cells.some((c) => c.includes("CARGO")) && cells.some((c) => c.includes("DESCRIPCIÓN") || c.includes("DESCRIPCION"))) {
      dataStart = i + 1; // La fila siguiente a la cabecera es la primera de datos
      break;
    }
  }

  if (dataStart === -1) {
    return { movimientos: [], header, error: "format" };
  }

  // Detectar índices de columnas desde la cabecera
  const headerRow = (rows[dataStart - 1] ?? []).map((c) => String(c ?? "").toUpperCase().trim());
  const iMonto = headerRow.findIndex((c) => c === "MONTO");
  const iDesc = headerRow.findIndex((c) => c.includes("DESCRIPCIÓN") || c.includes("DESCRIPCION"));
  const iFecha = headerRow.findIndex((c) => c === "FECHA");
  const iDoc = headerRow.findIndex((c) => c.includes("DOCUMENTO") || c.includes("N°") || c === "N° DOCUMENTO");
  const iCargoAbono = headerRow.findIndex((c) => c === "CARGO/ABONO");

  const movimientos: MovimientoNubox[] = [];

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const monto = row[iMonto];
    const desc = String(row[iDesc] ?? "").trim();
    const fechaRaw = String(row[iFecha] ?? "").trim();
    const nDoc = String(row[iDoc] ?? "").trim();
    const cargoAbono = String(row[iCargoAbono] ?? "").trim().toUpperCase();

    const montoNum = parseAmount(monto);
    // Parar si llegamos a sección de resumen (la fila de monto no es número)
    if (montoNum === null) break;
    // Ignorar si no tiene fecha (fila vacía o de totales)
    if (!fechaRaw) continue;

    const fecha = parseFecha(fechaRaw);
    const esAbono = cargoAbono.startsWith("A");
    const esCargo = cargoAbono.startsWith("C");

    movimientos.push({
      fecha,
      descripcion: desc,
      referencia: nDoc === "0" || nDoc === "" ? "" : nDoc,
      abono: esAbono ? montoNum : "",
      cargo: esCargo ? montoNum : "",
    });
  }

  if (movimientos.length === 0) {
    return { movimientos: [], header, error: "empty" };
  }

  return { movimientos, header };
}

function parseCartolaChile(rows: unknown[][], header: HeaderBanco): {
  movimientos: MovimientoNubox[];
  header: HeaderBanco;
  error?: string;
} {
  let dataStart = -1;
  for (let i = 0; i < rows.length; i++) {
    const cells = (rows[i] ?? []).map((c) => String(c ?? "").toUpperCase().trim());
    const hasFecha = cells.some((c) => c === "FECHA");
    const hasDesc = cells.some((c) => c.includes("DESCRIP") || c.includes("DETALLE") || c.includes("GLOSA"));
    const hasCargo = cells.some((c) => c === "CARGO" || c === "CARGOS");
    const hasAbono = cells.some((c) => c === "ABONO" || c === "ABONOS");
    if (hasFecha && hasDesc && hasCargo && hasAbono) {
      dataStart = i + 1;
      break;
    }
  }

  if (dataStart === -1) {
    return { movimientos: [], header, error: "format" };
  }

  const headerRow = (rows[dataStart - 1] ?? []).map((c) => String(c ?? "").toUpperCase().trim());
  const iFecha = headerRow.findIndex((c) => c === "FECHA");
  const iDesc = headerRow.findIndex((c) => c.includes("DESCRIP") || c.includes("DETALLE") || c.includes("GLOSA"));
  const iDoc = headerRow.findIndex((c) => c.includes("DOCUMENTO") || c.includes("N°") || c.includes("NUMERO"));
  const iCargo = headerRow.findIndex((c) => c === "CARGO" || c === "CARGOS");
  const iAbono = headerRow.findIndex((c) => c === "ABONO" || c === "ABONOS");

  if (iFecha < 0 || iDesc < 0 || iCargo < 0 || iAbono < 0) {
    return { movimientos: [], header, error: "format" };
  }

  const movimientos: MovimientoNubox[] = [];
  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const fechaRaw = String(row[iFecha] ?? "").trim();
    const desc = String(row[iDesc] ?? "").trim();
    if (!fechaRaw && !desc) continue;

    const cargo = parseAmount(row[iCargo]);
    const abono = parseAmount(row[iAbono]);
    if (!fechaRaw || (cargo === null && abono === null)) continue;

    const nDoc = iDoc >= 0 ? String(row[iDoc] ?? "").trim() : "";
    movimientos.push({
      fecha: parseFecha(fechaRaw),
      descripcion: desc,
      referencia: nDoc === "0" ? "" : nDoc,
      abono: abono ?? "",
      cargo: cargo ?? "",
    });
  }

  if (movimientos.length === 0) {
    return { movimientos: [], header, error: "empty" };
  }

  return { movimientos, header };
}

function parseCartolaItau(rows: unknown[][], header: HeaderBanco): {
  movimientos: MovimientoNubox[];
  header: HeaderBanco;
  error?: string;
} {
  let headerIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    const cells = (rows[i] ?? []).map((c) => String(c ?? "").toUpperCase().trim());
    const hasFecha = cells.some((c) => c === "FECHA");
    const hasDesc = cells.some((c) => c.includes("DESCRIP"));
    const hasAbono = cells.some((c) => c.includes("DEPÓSITOS") || c.includes("DEPOSITOS") || c.includes("ABONOS"));
    const hasCargo = cells.some((c) => c.includes("GIROS") || c.includes("CARGOS"));
    if (hasFecha && hasDesc && hasAbono && hasCargo) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    return { movimientos: [], header, error: "format" };
  }

  const baseHeader = rows[headerIndex].map((c) => String(c ?? "").toUpperCase().trim());
  const subHeader = (rows[headerIndex + 1] ?? []).map((c) => String(c ?? "").toUpperCase().trim());
  const mergedHeader = baseHeader.map((cell, idx) => `${cell} ${subHeader[idx] ?? ""}`.trim());

  const iFecha = mergedHeader.findIndex((c) => c.includes("FECHA"));
  const iDoc = mergedHeader.findIndex((c) => c.includes("NÚMERO") || c.includes("NUMERO") || c.includes("OPERACIÓN") || c.includes("OPERACION"));
  const iDesc = mergedHeader.findIndex((c) => c.includes("DESCRIP"));
  const iAbono = mergedHeader.findIndex((c) => c.includes("DEPÓSITOS") || c.includes("DEPOSITOS") || c.includes("ABONOS"));
  const iCargo = mergedHeader.findIndex((c) => c.includes("GIROS") || c.includes("CARGOS"));

  if (iFecha < 0 || iDesc < 0 || iAbono < 0 || iCargo < 0) {
    return { movimientos: [], header, error: "format" };
  }

  const year = extractPeriodoYear(rows);
  const dataStart = headerIndex + 2;
  const movimientos: MovimientoNubox[] = [];

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const fechaRaw = String(row[iFecha] ?? "").trim();
    const desc = String(row[iDesc] ?? "").trim();
    if (!fechaRaw && !desc) continue;

    const abono = parseAmount(row[iAbono]);
    const cargo = parseAmount(row[iCargo]);
    if (!fechaRaw || (abono === null && cargo === null)) continue;

    const fechaConAnio =
      /^\d{1,2}\/\d{1,2}$/.test(fechaRaw) && year
        ? `${fechaRaw}/${year}`
        : fechaRaw;

    const referenciaRaw = iDoc >= 0 ? String(row[iDoc] ?? "").trim() : "";
    const referenciaNormalizada = /^0+$/.test(referenciaRaw) ? "" : referenciaRaw;

    movimientos.push({
      fecha: parseFecha(fechaConAnio),
      descripcion: desc,
      referencia: referenciaNormalizada,
      abono: abono ?? "",
      cargo: cargo ?? "",
    });
  }

  if (movimientos.length === 0) {
    return { movimientos: [], header, error: "empty" };
  }
  return { movimientos, header };
}

function parseCartola(workbook: XLSX.WorkBook, formato: FormatoBanco): {
  movimientos: MovimientoNubox[];
  header: HeaderBanco;
  error?: string;
} {
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { movimientos: [], header: { banco: "", tipoCuenta: "", numeroCuenta: "" }, error: "Sin hojas" };

  const ws = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" }) as unknown[][];

  const header = extractHeaderBanco(rows);
  const safeRun = (
    parser: (rows: unknown[][], header: HeaderBanco) => {
      movimientos: MovimientoNubox[];
      header: HeaderBanco;
      error?: string;
    },
  ) => {
    try {
      return parser(rows, header);
    } catch {
      return { movimientos: [], header, error: "format" as const };
    }
  };

  if (formato === "santander") return safeRun(parseCartolaSantander);
  if (formato === "chile") return safeRun(parseCartolaChile);
  if (formato === "itau") return safeRun(parseCartolaItau);

  const hasItauSignature = rows
    .slice(0, 12)
    .some((row) => row.some((cell) => /ITA[ÚU]/i.test(String(cell ?? ""))));

  const parserChain: Array<(rows: unknown[][], header: HeaderBanco) => { movimientos: MovimientoNubox[]; header: HeaderBanco; error?: string }> =
    hasItauSignature || header.banco.toUpperCase().includes("ITAU")
      ? [parseCartolaItau, parseCartolaSantander, parseCartolaChile]
      : header.banco.toUpperCase().includes("CHILE")
      ? [parseCartolaChile, parseCartolaSantander, parseCartolaItau]
      : [parseCartolaSantander, parseCartolaChile, parseCartolaItau];

  const results = parserChain.map((parser) => safeRun(parser));
  const success = results.find((result) => !result.error);
  if (success) return success;

  if (results.some((result) => result.error === "empty")) {
    return { movimientos: [], header, error: "empty" };
  }
  return { movimientos: [], header, error: "format" };
}

// ── Códigos de banco Nubox ────────────────────────────────────────────────────
const BANCOS_NUBOX = [
  "1101-02 BANCO SANTANDER",
  "1101-03 BANCO SANTANDER USD",
  "1101-04 BANCO SANTANDER EURO",
  "1101-05 BANCO ITAU",
  "1101-06 BANCO ITAU OPERMAN",
  "1101-07 BANCO SCOTIABANK",
  "1101-08 BANCO SCOTIABANK USD",
  "1101-09 BANCO SANTANDER OPERMAN",
  "1101-10 BANCO SANTANDER USD OPERMAN",
  "1101-11 BANCO SANTANDER EURO OPERMAN",
  "1101-12 BANCO CHILE",
  "1101-13 BANCO CHILE USD",
  "1101-14 BANCO ESTADO",
  "1101-15 BANCO SANTANDER PESOS VIF",
  "1101-16 BANCO ITAU USD",
] as const;

// Mapea el nombre detectado en la cartola al código Nubox más probable
function detectarCodigoBanco(nombreDetectado: string): string {
  const n = nombreDetectado.toUpperCase();
  if (n.includes("ESTADO"))                          return "1101-14 BANCO ESTADO";
  if (n.includes("CHILE") && !n.includes("USD"))     return "1101-12 BANCO CHILE";
  if (n.includes("CHILE") && n.includes("USD"))      return "1101-13 BANCO CHILE USD";
  if (n.includes("SANTANDER") && !n.includes("USD") && !n.includes("EURO")) return "1101-02 BANCO SANTANDER";
  if (n.includes("SANTANDER") && n.includes("USD"))  return "1101-03 BANCO SANTANDER USD";
  if (n.includes("SANTANDER") && n.includes("EURO")) return "1101-04 BANCO SANTANDER EURO";
  if (n.includes("ITAU") && n.includes("USD"))       return "1101-16 BANCO ITAU USD";
  if (n.includes("ITAU"))                            return "1101-05 BANCO ITAU";
  if (n.includes("SCOTIABANK") && n.includes("USD")) return "1101-08 BANCO SCOTIABANK USD";
  if (n.includes("SCOTIABANK"))                      return "1101-07 BANCO SCOTIABANK";
  return "";
}

// ── Conversión DD-MM-YYYY → serial numérico de Excel ─────────────────────────
function toExcelSerial(ddmmyyyy: string): number {
  const [dd, mm, yyyy] = ddmmyyyy.split("-").map(Number);
  // Época de Excel: 30-dic-1899 (compensa el bug de año bisiesto 1900)
  const excelEpoch = new Date(1899, 11, 30).getTime();
  const jsDate     = new Date(yyyy, mm - 1, dd).getTime();
  return Math.round((jsDate - excelEpoch) / 86400000);
}

// ── Generador del Excel Nubox ─────────────────────────────────────────────────

function generateNuboxXls(
  movimientos: MovimientoNubox[],
  header: HeaderBanco,
): Uint8Array {
  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = {};

  // Celda texto
  const txt = (v: string) => ({ t: "s" as const, v });
  // Celda fecha: serial numérico con formato DD-MM-YYYY (igual al template)
  const fecha = (ddmmyyyy: string) => ({
    t: "n" as const,
    v: toExcelSerial(ddmmyyyy),
    z: "DD-MM-YYYY",
  });
  // Celda número entero
  const num = (v: number) => ({ t: "n" as const, v });

  // ── Encabezado banco (filas 2-4, columnas B-C) ────────────────────────────
  ws["B2"] = txt("Banco");          ws["C2"] = txt(header.banco);
  ws["B3"] = txt("Tipo Cuenta");    ws["C3"] = txt(header.tipoCuenta);
  ws["B4"] = txt("Numero Cuenta");  ws["C4"] = txt(header.numeroCuenta);

  // ── Cabecera de datos (fila 6) ────────────────────────────────────────────
  ws["A6"] = txt("Fecha");
  ws["B6"] = txt("Descripcion");
  ws["C6"] = txt("Referencia");
  ws["D6"] = txt("Monto Abono");
  ws["E6"] = txt("Monto Cargo");

  // ── Movimientos desde fila 7 ──────────────────────────────────────────────
  movimientos.forEach((mov, i) => {
    const r = 7 + i;
    ws[`A${r}`] = fecha(mov.fecha);
    ws[`B${r}`] = txt(mov.descripcion);
    ws[`C${r}`] = txt(mov.referencia);
    if (mov.abono !== "") ws[`D${r}`] = num(mov.abono as number);
    if (mov.cargo !== "") ws[`E${r}`] = num(mov.cargo as number);
  });

  // ── Rango, anchos de columna y sin protección ─────────────────────────────
  const lastRow = 6 + movimientos.length;
  ws["!ref"] = `A2:E${lastRow}`;
  ws["!cols"] = [
    { wch: 11 }, // A Fecha
    { wch: 13 }, // B Descripcion
    { wch: 14 }, // C Referencia
    { wch: 14 }, // D Monto Abono
    { wch: 11 }, // E Monto Cargo
  ];
  // Sin protección de hoja
  delete (ws as Record<string, unknown>)["!protect"];

  XLSX.utils.book_append_sheet(wb, ws, "Movimientos");

  // Sin protección de libro
  if (wb.Workbook) delete wb.Workbook.WBProps;

  return XLSX.write(wb, { type: "array", bookType: "biff8", bookSST: true }) as Uint8Array;
}

// ── Componente principal ──────────────────────────────────────────────────────

type ParseError = "format" | "empty" | "read" | null;

export function CartolasNuboxContent() {
  const { t } = useLocale();
  const tr = t.cartolasNuboxPage;
  const [theme] = useNeonTheme();

  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [parseError, setParseError] = useState<ParseError>(null);
  const [parseErrorDetail, setParseErrorDetail] = useState("");
  const [movimientos, setMovimientos] = useState<MovimientoNubox[] | null>(null);
  const [header, setHeader] = useState<HeaderBanco>({ banco: "", tipoCuenta: "", numeroCuenta: "" });
  const [fileName, setFileName] = useState("");
  const [formatoBanco, setFormatoBanco] = useState<FormatoBanco>("auto");

  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setParseError("format");
      setParseErrorDetail("Extensión no soportada. Solo se aceptan .xls y .xlsx.");
      return;
    }
    setProcessing(true);
    setParseError(null);
    setParseErrorDetail("");
    setMovimientos(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(new Uint8Array(data), { type: "array" });
        const { movimientos: movs, header: h, error } = parseCartola(wb, formatoBanco);

        if (error === "format") {
          setParseError("format");
          setParseErrorDetail(`No se pudo reconocer el layout del archivo para el formato "${formatoBanco}".`);
        } else if (error === "empty") {
          setParseError("empty");
          setParseErrorDetail("El archivo se leyó correctamente, pero no se encontraron movimientos válidos.");
        } else if (error) {
          setParseError("read");
          setParseErrorDetail(String(error));
        } else {
          setMovimientos(movs);
          setHeader({ ...h, banco: detectarCodigoBanco(h.banco) });
          setFileName(file.name);
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error("[CartolasNubox] Error leyendo archivo", err);
        }
        setParseError("read");
        setParseErrorDetail(err instanceof Error ? err.message : "Error inesperado al procesar el archivo.");
      } finally {
        setProcessing(false);
      }
    };
    reader.onerror = () => {
      setParseError("read");
      setParseErrorDetail("FileReader no pudo cargar el archivo.");
      setProcessing(false);
    };
    reader.readAsArrayBuffer(file);
  }, [formatoBanco]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile],
  );

  const handleDownload = useCallback(() => {
    const bytes = generateNuboxXls(movimientos!, header);
    const blob = new Blob([bytes], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const base = fileName.replace(/\.(xlsx|xls)$/i, "");
    a.download = `${base}_Nubox.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }, [movimientos, header, fileName]);

  const reset = useCallback(() => {
    setMovimientos(null);
    setParseError(null);
    setParseErrorDetail("");
    setFileName("");
    setHeader({ banco: "", tipoCuenta: "", numeroCuenta: "" });
  }, []);

  const fmtMonto = (n: number | "") =>
    n === "" ? "" : "$ " + Math.round(n as number).toLocaleString("es-CL");

  // ── Estado: tiene movimientos parseados ────────────────────────────────────
  if (movimientos) {
    return (
      <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
        <main className="dash-page relative flex min-h-0 flex-1 flex-col overflow-y-auto" role="main">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div className="absolute -right-16 top-10 h-72 w-72 rounded-full bg-dash-neon/20 blur-3xl" />
            <div className="absolute bottom-20 left-1/4 h-64 w-64 rounded-full bg-dash-neon-hot/15 blur-3xl" />
          </div>

          <div className="dash-toolbar relative z-10 shrink-0">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dash-neon/40 bg-dash-neon/15 shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--dash-neon)_55%,transparent)]">
                  <Icon icon="lucide:file-spreadsheet" width={22} height={22} className="text-dash-neon" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-bold tracking-tight text-dash-fg sm:text-xl">{tr.title}</h1>
                  <p className="mt-0.5 line-clamp-1 text-xs text-dash-muted sm:text-sm">{fileName}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 mx-auto w-full max-w-5xl space-y-4 p-3 sm:p-4 lg:p-5">
            <div className="dash-card rounded-xl p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-dash-fg">
                <Icon icon="lucide:building-2" width={15} className="text-dash-neon" />
                Datos del banco
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dash-muted">
                    {tr.fieldBanco}
                  </label>
                  <FormSelect
                    variant="neon"
                    value={header.banco}
                    placeholder="Seleccionar banco..."
                    options={BANCOS_NUBOX.map((cod) => ({ value: cod, label: cod }))}
                    onChange={(v) => setHeader((h) => ({ ...h, banco: v }))}
                  />
                </div>
                {(
                  [
                    { key: "tipoCuenta" as const, label: tr.fieldTipoCuenta, placeholder: tr.fieldTipoCuentaPlaceholder },
                    { key: "numeroCuenta" as const, label: tr.fieldNumeroCuenta, placeholder: "0-000-0000000-0" },
                  ] as const
                ).map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dash-muted">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={header[key]}
                      onChange={(e) => setHeader((h) => ({ ...h, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="dash-control w-full rounded-lg px-3 py-2 text-sm text-dash-fg placeholder:text-dash-muted focus:outline-none focus:ring-2 focus:ring-dash-neon/40"
                    />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-dash-muted">
                Formato usado al parsear:{" "}
                <span className="font-semibold text-dash-fg">
                  {FORMATOS_BANCO.find((f) => f.value === formatoBanco)?.label ?? "Detectar automaticamente"}
                </span>
              </p>
            </div>

            <div className="dash-card overflow-hidden rounded-xl">
              <div className="dash-section-head flex items-center justify-between px-5 py-4">
                <span className="text-sm font-semibold text-dash-fg">
                  {tr.previewTitle} — <span className="font-bold text-dash-neon">{movimientos.length}</span> {tr.previewRows}
                </span>
              </div>
              <div className="max-h-[420px] overflow-x-auto overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 border-b border-dash-border bg-[color-mix(in_srgb,var(--dash-control)_92%,transparent)]">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-semibold text-dash-muted">{tr.colFecha}</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-dash-muted">{tr.colDescripcion}</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-dash-muted">{tr.colReferencia}</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-emerald-300">{tr.colAbono}</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-red-300">{tr.colCargo}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dash-border">
                    {movimientos.map((m, i) => (
                      <tr key={i} className="transition-colors hover:bg-dash-neon/10">
                        <td className="whitespace-nowrap px-4 py-2 font-mono text-dash-fg">{m.fecha}</td>
                        <td className="max-w-[280px] truncate px-4 py-2 text-dash-fg">{m.descripcion}</td>
                        <td className="px-4 py-2 font-mono text-dash-muted">{m.referencia}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-right font-medium text-emerald-300">
                          {m.abono !== "" ? fmtMonto(m.abono) : ""}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right font-medium text-red-300">
                          {m.cargo !== "" ? fmtMonto(m.cargo) : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleDownload}
                className="dash-cta flex flex-1 items-center justify-center gap-2 px-5 py-3 text-sm"
              >
                <Icon icon="lucide:download" width={16} />
                {tr.downloadBtn}
              </button>
              <button
                type="button"
                onClick={reset}
                className="dash-control inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-dash-fg hover:bg-dash-neon/15"
              >
                <Icon icon="lucide:refresh-cw" width={15} />
                {tr.resetBtn}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Estado: dropzone ───────────────────────────────────────────────────────
  return (
    <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
      <main className="dash-page relative flex min-h-0 flex-1 flex-col overflow-y-auto" role="main">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -right-16 top-10 h-72 w-72 rounded-full bg-dash-neon/20 blur-3xl" />
          <div className="absolute bottom-20 left-1/4 h-64 w-64 rounded-full bg-dash-neon-hot/15 blur-3xl" />
        </div>

        <div className="dash-toolbar relative z-10 shrink-0">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dash-neon/40 bg-dash-neon/15 shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--dash-neon)_55%,transparent)]">
                <Icon icon="lucide:file-spreadsheet" width={22} height={22} className="text-dash-neon" aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold tracking-tight text-dash-fg sm:text-xl">{tr.title}</h1>
                <p className="mt-0.5 line-clamp-2 text-xs text-dash-muted sm:text-sm">{tr.subtitle}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-3xl space-y-4 p-3 sm:p-4 lg:p-5">
          <div className="dash-card rounded-xl p-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-dash-muted">
              Formato del banco
            </label>
            <FormSelect
              variant="neon"
              value={formatoBanco}
              placeholder="Detectar automaticamente"
              options={FORMATOS_BANCO.map((format) => ({ value: format.value, label: format.label }))}
              onChange={(v) => setFormatoBanco((v || "auto") as FormatoBanco)}
            />
            <p className="mt-2 text-xs text-dash-muted">
              Usa &quot;Detectar automaticamente&quot; para intentar distintos formatos, o elige uno especifico para forzar ese layout.
            </p>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !processing && inputRef.current?.click()}
            className={`dash-card flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-all ${
              dragging
                ? "scale-[1.01] border-dash-neon/60 bg-dash-neon/10"
                : "border-dash-border hover:border-dash-neon/45 hover:bg-dash-neon/5"
            } ${processing ? "pointer-events-none opacity-70" : ""}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileInput}
              onClick={(e) => e.stopPropagation()}
            />
            {processing ? (
              <>
                <Icon icon="lucide:loader-circle" className="animate-spin text-dash-neon" width={40} height={40} />
                <p className="text-sm font-medium text-dash-muted">{tr.processing}</p>
              </>
            ) : (
              <>
                <div className={`flex h-16 w-16 items-center justify-center rounded-xl border transition-colors ${dragging ? "border-dash-neon/40 bg-dash-neon/15" : "border-dash-border bg-dash-control"}`}>
                  <Icon icon="lucide:upload-cloud" className={dragging ? "text-dash-neon" : "text-dash-muted"} width={32} height={32} />
                </div>
                <div>
                  <p className="font-semibold text-dash-fg">{tr.dropzone}</p>
                  <p className="text-sm text-dash-muted">{tr.dropzoneOr}</p>
                </div>
                <span className="rounded-lg border border-dash-border bg-dash-control px-3 py-1 text-xs text-dash-muted">{tr.dropzoneHint}</span>
              </>
            )}
          </div>

          {parseError && (
            <div className="flex items-start gap-3 rounded-xl border border-red-400/35 bg-red-400/10 px-4 py-3">
              <Icon icon="lucide:alert-circle" className="mt-0.5 shrink-0 text-red-300" width={18} />
              <div>
                <p className="text-sm text-dash-fg">
                  {parseError === "format"
                    ? tr.errorInvalidFormat
                    : parseError === "empty"
                    ? tr.errorNoMovements
                    : tr.errorRead}
                </p>
                {parseErrorDetail ? (
                  <p className="mt-1 text-xs text-dash-muted">{parseErrorDetail}</p>
                ) : null}
              </div>
            </div>
          )}

          <div className="dash-card rounded-xl p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-dash-fg">
              <Icon icon="lucide:info" width={15} className="text-dash-neon" />
              {tr.infoTitle}
            </h2>
            <ol className="space-y-3">
              {([tr.infoStep1, tr.infoStep2, tr.infoStep3, tr.infoStep4] as string[]).map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-dash-muted">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-dash-neon/35 bg-dash-neon/15 text-xs font-bold text-dash-neon">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}
