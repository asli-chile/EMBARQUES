import { useCallback, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import * as XLSX from "xlsx-js-style";
import { useLocale } from "@/lib/i18n";

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
      if (/0285\s*CURICO|CURICO\s*PLAZA/i.test(cell) || /BANCO\s*ESTADO/i.test(cell)) {
        banco = "Banco Estado";
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

function parseCartola(workbook: XLSX.WorkBook): {
  movimientos: MovimientoNubox[];
  header: HeaderBanco;
  error?: string;
} {
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { movimientos: [], header: { banco: "", tipoCuenta: "", numeroCuenta: "" }, error: "Sin hojas" };

  const ws = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" }) as unknown[][];

  const header = extractHeaderBanco(rows);

  // Buscar fila de cabecera de movimientos: contiene "MONTO" y "DESCRIPCIÓN MOVIMIENTO" y "CARGO/ABONO"
  let dataStart = -1;
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].map((c) => String(c ?? "").toUpperCase().trim());
    if (cells.includes("MONTO") && cells.some((c) => c.includes("CARGO")) && cells.some((c) => c.includes("DESCRIPCIÓN") || c.includes("DESCRIPCION"))) {
      dataStart = i + 1; // La fila siguiente a la cabecera es la primera de datos
      break;
    }
  }

  if (dataStart === -1) {
    return { movimientos: [], header, error: "format" };
  }

  // Detectar índices de columnas desde la cabecera
  const headerRow = rows[dataStart - 1].map((c) => String(c ?? "").toUpperCase().trim());
  const iMonto       = headerRow.findIndex((c) => c === "MONTO");
  const iDesc        = headerRow.findIndex((c) => c.includes("DESCRIPCIÓN") || c.includes("DESCRIPCION"));
  const iFecha       = headerRow.findIndex((c) => c === "FECHA");
  const iDoc         = headerRow.findIndex((c) => c.includes("DOCUMENTO") || c.includes("N°") || c === "N° DOCUMENTO");
  const iCargoAbono  = headerRow.findIndex((c) => c === "CARGO/ABONO");

  const movimientos: MovimientoNubox[] = [];

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i];
    const monto      = row[iMonto];
    const desc       = String(row[iDesc] ?? "").trim();
    const fechaRaw   = String(row[iFecha] ?? "").trim();
    const nDoc       = String(row[iDoc] ?? "").trim();
    const cargoAbono = String(row[iCargoAbono] ?? "").trim().toUpperCase();

    // Parar si llegamos a sección de resumen (la fila de monto no es número)
    if (monto === "" || isNaN(Number(monto))) break;
    // Ignorar si no tiene fecha (fila vacía o de totales)
    if (!fechaRaw) continue;

    const montoNum = Math.abs(Number(monto));
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

  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [parseError, setParseError] = useState<ParseError>(null);
  const [movimientos, setMovimientos] = useState<MovimientoNubox[] | null>(null);
  const [header, setHeader] = useState<HeaderBanco>({ banco: "", tipoCuenta: "", numeroCuenta: "" });
  const [fileName, setFileName] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setParseError("format");
      return;
    }
    setProcessing(true);
    setParseError(null);
    setMovimientos(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(new Uint8Array(data), { type: "array" });
        const { movimientos: movs, header: h, error } = parseCartola(wb);

        if (error === "format") {
          setParseError("format");
        } else if (error === "empty") {
          setParseError("empty");
        } else {
          setMovimientos(movs);
          setHeader({ ...h, banco: detectarCodigoBanco(h.banco) });
          setFileName(file.name);
        }
      } catch {
        setParseError("read");
      } finally {
        setProcessing(false);
      }
    };
    reader.onerror = () => {
      setParseError("read");
      setProcessing(false);
    };
    reader.readAsArrayBuffer(file);
  }, []);

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
    setFileName("");
    setHeader({ banco: "", tipoCuenta: "", numeroCuenta: "" });
  }, []);

  const fmtMonto = (n: number | "") =>
    n === "" ? "" : "$ " + Math.round(n as number).toLocaleString("es-CL");

  // ── Estado: tiene movimientos parseados ────────────────────────────────────
  if (movimientos) {
    return (
      <main
        className="flex-1 min-h-0 overflow-auto"
        role="main"
        style={{
          backgroundImage: "url('/embarques/girasol.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-sm border border-white/60">
            <div className="w-10 h-10 rounded-xl bg-brand-blue/15 border border-brand-blue/30 flex items-center justify-center shrink-0">
              <Icon icon="lucide:file-spreadsheet" className="text-brand-blue" width={22} height={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">{tr.title}</h1>
              <p className="text-xs text-neutral-600 font-medium">{fileName}</p>
            </div>
          </div>

          {/* Campos editables de banco */}
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-5">
            <h2 className="text-sm font-semibold text-neutral-700 mb-4 flex items-center gap-2">
              <Icon icon="lucide:building-2" width={15} className="text-brand-blue" />
              Datos del banco
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Banco — select con códigos Nubox */}
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
                  {tr.fieldBanco}
                </label>
                <select
                  value={header.banco}
                  onChange={(e) => setHeader((h) => ({ ...h, banco: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 focus:border-brand-blue transition-all text-sm cursor-pointer"
                >
                  <option value="">Seleccionar banco...</option>
                  {BANCOS_NUBOX.map((cod) => (
                    <option key={cod} value={cod}>{cod}</option>
                  ))}
                </select>
              </div>

              {/* Tipo cuenta y número cuenta — texto libre */}
              {(
                [
                  { key: "tipoCuenta" as const, label: tr.fieldTipoCuenta, placeholder: tr.fieldTipoCuentaPlaceholder },
                  { key: "numeroCuenta" as const, label: tr.fieldNumeroCuenta, placeholder: "0-000-0000000-0" },
                ] as const
              ).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={header[key]}
                    onChange={(e) => setHeader((h) => ({ ...h, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-white text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 focus:border-brand-blue transition-all text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Preview tabla */}
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
              <span className="text-sm font-semibold text-neutral-700">
                {tr.previewTitle} — <span className="text-brand-blue font-bold">{movimientos.length}</span> {tr.previewRows}
              </span>
            </div>
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-neutral-600">{tr.colFecha}</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-neutral-600">{tr.colDescripcion}</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-neutral-600">{tr.colReferencia}</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-emerald-700">{tr.colAbono}</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-red-600">{tr.colCargo}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {movimientos.map((m, i) => (
                    <tr key={i} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-2 text-neutral-700 whitespace-nowrap font-mono">{m.fecha}</td>
                      <td className="px-4 py-2 text-neutral-700 max-w-[280px] truncate">{m.descripcion}</td>
                      <td className="px-4 py-2 text-neutral-500 font-mono">{m.referencia}</td>
                      <td className="px-4 py-2 text-right text-emerald-700 font-medium whitespace-nowrap">
                        {m.abono !== "" ? fmtMonto(m.abono) : ""}
                      </td>
                      <td className="px-4 py-2 text-right text-red-600 font-medium whitespace-nowrap">
                        {m.cargo !== "" ? fmtMonto(m.cargo) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-blue text-white font-semibold text-sm hover:bg-brand-blue/90 transition-colors shadow-sm"
            >
              <Icon icon="lucide:download" width={16} />
              {tr.downloadBtn}
            </button>
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-700 font-semibold text-sm hover:bg-neutral-50 transition-colors"
            >
              <Icon icon="lucide:refresh-cw" width={15} />
              {tr.resetBtn}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Estado: dropzone ───────────────────────────────────────────────────────
  return (
    <main
      className="flex-1 min-h-0 overflow-auto"
      role="main"
      style={{
        backgroundImage: "url('/embarques/girasol.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center shrink-0">
            <Icon icon="lucide:file-spreadsheet" className="text-brand-blue" width={26} height={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-brand-blue tracking-tight">{tr.title}</h1>
            <p className="text-neutral-600 mt-1 text-sm leading-relaxed">{tr.subtitle}</p>
          </div>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !processing && inputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed transition-all cursor-pointer p-10 flex flex-col items-center justify-center gap-3 text-center
            ${dragging
              ? "border-brand-blue bg-brand-blue/5 scale-[1.01]"
              : "border-neutral-300 bg-white hover:border-brand-blue/50 hover:bg-neutral-50"
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
              <Icon icon="lucide:loader-circle" className="text-brand-blue animate-spin" width={40} height={40} />
              <p className="text-sm font-medium text-neutral-600">{tr.processing}</p>
            </>
          ) : (
            <>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${dragging ? "bg-brand-blue/15" : "bg-neutral-100"}`}>
                <Icon icon="lucide:upload-cloud" className={dragging ? "text-brand-blue" : "text-neutral-400"} width={32} height={32} />
              </div>
              <div>
                <p className="font-semibold text-neutral-800">{tr.dropzone}</p>
                <p className="text-sm text-neutral-500">{tr.dropzoneOr}</p>
              </div>
              <span className="text-xs text-neutral-400 bg-neutral-100 px-3 py-1 rounded-full">{tr.dropzoneHint}</span>
            </>
          )}
        </div>

        {/* Error */}
        {parseError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
            <Icon icon="lucide:alert-circle" className="text-red-500 mt-0.5 shrink-0" width={18} />
            <p className="text-sm text-red-700">
              {parseError === "format"
                ? tr.errorInvalidFormat
                : parseError === "empty"
                ? tr.errorNoMovements
                : tr.errorRead}
            </p>
          </div>
        )}

        {/* Info pasos */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-neutral-700 mb-4 flex items-center gap-2">
            <Icon icon="lucide:info" width={15} className="text-brand-blue" />
            {tr.infoTitle}
          </h2>
          <ol className="space-y-3">
            {([tr.infoStep1, tr.infoStep2, tr.infoStep3, tr.infoStep4] as string[]).map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-neutral-600">
                <span className="w-5 h-5 rounded-full bg-brand-blue/10 text-brand-blue font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </main>
  );
}
