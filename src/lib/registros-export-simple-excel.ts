/**
 * Exportación Excel (.xlsx) desde Registros: mismas columnas y orden que la grilla visible.
 * Usa **ExcelJS** (campo `browser` en package.json) para evitar problemas de interop en Vite.
 * Celdas en una sola línea (sin ajustar texto / sin saltos); anchos según contenido.
 */

export type RegistroSimpleExportColumn = { field: string; header: string };

type ExportMeta = {
  sheetTitle: string;
  sheetSubtitle: string;
  fileName: string;
  sheetTabName: string;
  yesLabel: string;
  noLabel: string;
};

/** Una sola línea: quita saltos y colapsa espacios (Excel sin “ajustar texto”). */
function singleLine(s: string): string {
  return s.replace(/\r\n|\n|\r/g, " ").replace(/\s+/g, " ").trim();
}

function cellText(value: unknown, yesLabel: string, noLabel: string): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? yesLabel : noLabel;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return String(value).trim();
}

/** Ancho de columna Excel (~unidades de carácter); tope para celdas enormes. */
function widthFromMaxChars(maxChars: number, cap = 100): number {
  if (maxChars <= 0) return 10;
  return Math.min(cap, Math.max(10, Math.round(maxChars * 1.12 + 2.5)));
}

type ExcelJsCtor = typeof import("exceljs");

function resolveExcelJs(mod: ExcelJsCtor & { default?: ExcelJsCtor }): ExcelJsCtor {
  const d = mod.default;
  if (d && typeof (d as { Workbook?: unknown }).Workbook === "function") return d as ExcelJsCtor;
  if (typeof (mod as { Workbook?: unknown }).Workbook === "function") return mod;
  throw new Error("exceljs: no se pudo cargar el módulo (Workbook no disponible).");
}

function downloadBlob(buffer: ArrayBuffer, fileName: string): void {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const ALIGN = {
  vertical: "middle" as const,
  horizontal: "center" as const,
  wrapText: false,
  shrinkToFit: false,
};

export async function exportRegistrosSimpleExcel(
  rows: Record<string, unknown>[],
  columns: RegistroSimpleExportColumn[],
  meta: ExportMeta
): Promise<void> {
  if (rows.length === 0 || columns.length === 0) return;

  const raw = (await import("exceljs")) as ExcelJsCtor & { default?: ExcelJsCtor };
  const ExcelJS = resolveExcelJs(raw);

  const BLUE = "FF1D4ED8";
  const WHITE = "FFFFFFFF";
  const BORDER = "FFE2E8F0";
  const ZEBRA = "FFF8FAFC";
  const SUBTITLE = "FF64748B";
  const BODY = "FF1E293B";

  const headers = columns.map((c) => singleLine(c.header));
  const dataMatrix = rows.map((row) =>
    columns.map((c) => singleLine(cellText(row[c.field], meta.yesLabel, meta.noLabel)))
  );

  const colMaxChars = columns.map((_, i) => {
    let m = headers[i]?.length ?? 0;
    for (const dataRow of dataMatrix) {
      m = Math.max(m, dataRow[i]?.length ?? 0);
    }
    return m;
  });

  const wb = new ExcelJS.Workbook();
  const tab = meta.sheetTabName.slice(0, 31).replace(/[[\]*?:/\\]/g, "-") || "Registros";
  const ws = wb.addWorksheet(tab, {
    views: [{ showGridLines: true }],
  });

  const nCols = columns.length;

  ws.mergeCells(1, 1, 1, nCols);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = singleLine(meta.sheetTitle);
  titleCell.font = { bold: true, size: 14, color: { argb: BLUE } };
  titleCell.alignment = ALIGN;
  ws.getRow(1).height = 22;

  ws.mergeCells(2, 1, 2, nCols);
  const subCell = ws.getCell(2, 1);
  subCell.value = singleLine(meta.sheetSubtitle);
  subCell.font = { size: 10, color: { argb: SUBTITLE } };
  subCell.alignment = ALIGN;
  ws.getRow(2).height = 18;

  const headerRowIndex = 4;
  const headerRow = ws.getRow(headerRowIndex);
  headerRow.height = 18;
  columns.forEach((_, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = headers[i];
    cell.font = { bold: true, size: 10, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    cell.alignment = ALIGN;
    cell.border = {
      top: { style: "thin", color: { argb: BLUE } },
      bottom: { style: "thin", color: { argb: BLUE } },
      left: { style: "thin", color: { argb: BLUE } },
      right: { style: "thin", color: { argb: BLUE } },
    };
  });

  dataMatrix.forEach((dataRow, ri) => {
    const r = ws.getRow(headerRowIndex + 1 + ri);
    r.height = 16;
    const zebra = ri % 2 === 0;
    dataRow.forEach((val, ci) => {
      const cell = r.getCell(ci + 1);
      cell.value = val;
      cell.font = { size: 10, color: { argb: BODY } };
      cell.alignment = ALIGN;
      if (zebra) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
      }
      cell.border = {
        top: { style: "thin", color: { argb: BORDER } },
        bottom: { style: "thin", color: { argb: BORDER } },
        left: { style: "thin", color: { argb: BORDER } },
        right: { style: "thin", color: { argb: BORDER } },
      };
    });
  });

  columns.forEach((_, i) => {
    ws.getColumn(i + 1).width = widthFromMaxChars(colMaxChars[i] ?? 0);
  });

  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(buf, meta.fileName);
}
