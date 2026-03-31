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
  // Entrada: "DD/MM/YYYY" o serial numérico de Excel → "DD-MM-AAAA"
  if (!raw) return "";
  const s = String(raw).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split("/");
    return `${d}-${m}-${y}`;
  }
  // Serial Excel (número de días desde 1900-01-01)
  if (/^\d+$/.test(s)) {
    const date = XLSX.SSF.parse_date_code(Number(s));
    if (date) {
      const dd = String(date.d).padStart(2, "0");
      const mm = String(date.m).padStart(2, "0");
      return `${dd}-${mm}-${date.y}`;
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
    // Detectar banco desde primera celda no vacía que diga algo útil
    // (en la cartola del Banco de Chile no aparece el nombre del banco explícito,
    //  se infiere del título de la hoja o se deja vacío para que el usuario lo complete)
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

    movimientos.push({
      fecha,
      descripcion: desc,
      referencia: nDoc === "0" || nDoc === "" ? "" : nDoc,
      abono: cargoAbono === "A" ? montoNum : "",
      cargo: cargoAbono === "C" ? montoNum : "",
    });
  }

  if (movimientos.length === 0) {
    return { movimientos: [], header, error: "empty" };
  }

  return { movimientos, header };
}

// ── Generador del Excel Nubox ─────────────────────────────────────────────────

function generateNuboxXlsx(
  movimientos: MovimientoNubox[],
  header: HeaderBanco,
): Uint8Array {
  const wb = XLSX.utils.book_new();
  const wsData: unknown[][] = [];

  // Filas de encabezado Nubox
  wsData.push(["", "Banco", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
  wsData.push(["", header.banco, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
  wsData.push(["", "Tipo Cuenta", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
  wsData.push(["", header.tipoCuenta, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
  wsData.push(["", "Numero Cuenta", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
  wsData.push(["", header.numeroCuenta, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
  wsData.push([]); // fila vacía (fila 4 del original está vacía)

  // Cabecera de columnas de datos (fila 5 del formato Nubox)
  wsData.push(["Fecha", "Descripcion", "Referencia", "Monto Abono", "Monto Cargo"]);

  // Filas de datos
  for (const m of movimientos) {
    wsData.push([m.fecha, m.descripcion, m.referencia, m.abono, m.cargo]);
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Estilos cabecera de columnas (fila 8 en base 1)
  const headerRowIdx = 7; // 0-based
  const cols = ["A", "B", "C", "D", "E"];
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "1D4ED8" } },
    alignment: { horizontal: "center" as const },
  };
  cols.forEach((col) => {
    const cell = ws[`${col}${headerRowIdx + 1}`];
    if (cell) cell.s = headerStyle;
  });

  // Formato numérico para montos
  for (let i = 0; i < movimientos.length; i++) {
    const rowNum = headerRowIdx + 2 + i; // 1-based
    (["D", "E"] as const).forEach((col) => {
      const cell = ws[`${col}${rowNum}`];
      if (cell && cell.v !== "") {
        cell.t = "n";
        cell.z = "#,##0";
      }
    });
  }

  // Ancho de columnas
  ws["!cols"] = [
    { wch: 14 }, // Fecha
    { wch: 45 }, // Descripcion
    { wch: 16 }, // Referencia
    { wch: 16 }, // Monto Abono
    { wch: 16 }, // Monto Cargo
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
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
          setHeader(h);
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
    const bytes = generateNuboxXlsx(movimientos!, header);
    const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const base = fileName.replace(/\.(xlsx|xls)$/i, "");
    a.download = `${base}_Nubox.xlsx`;
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
    n === "" ? "" : n.toLocaleString("es-CL");

  // ── Estado: tiene movimientos parseados ────────────────────────────────────
  if (movimientos) {
    return (
      <main className="flex-1 min-h-0 overflow-auto bg-neutral-50" role="main">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center shrink-0">
              <Icon icon="lucide:file-spreadsheet" className="text-brand-blue" width={22} height={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">{tr.title}</h1>
              <p className="text-xs text-neutral-500">{fileName}</p>
            </div>
          </div>

          {/* Campos editables de banco */}
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-5">
            <h2 className="text-sm font-semibold text-neutral-700 mb-4 flex items-center gap-2">
              <Icon icon="lucide:building-2" width={15} className="text-brand-blue" />
              Datos del banco
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(
                [
                  { key: "banco" as const, label: tr.fieldBanco, placeholder: tr.fieldBancoPlaceholder },
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
    <main className="flex-1 min-h-0 overflow-auto bg-neutral-50" role="main">
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
