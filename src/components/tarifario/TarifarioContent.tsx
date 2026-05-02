"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { sileo } from "sileo";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { Combobox } from "@/components/ui/Combobox";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tarifario = {
  id: string;
  titulo: string | null;
  cliente: string;
  servicio: string | null;
  pol: string | null;
  pod: string | null;
  producto: string | null;
  notas: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

type Fila = {
  id: string;
  tarifario_id: string;
  naviera: string;
  pol: string;
  pod: string;
  publica: number | null;
  neta: number | null;
  vd: number | null;
  gate_out: string;
  recargos: string;
  tt: number | null;
  t1: string;
  t2: string;
  servicio: string;
  dias_libres_origen: string;
  demurrage: string;
  detention: string;
  moneda: string;
  desde: string;
  hasta: string;
  observaciones: string;
  orden: number;
};

const emptyFila = (): Omit<Fila, "id" | "tarifario_id" | "orden"> => ({
  naviera: "",
  pol: "",
  pod: "",
  publica: null,
  neta: null,
  vd: null,
  gate_out: "",
  recargos: "",
  tt: null,
  t1: "",
  t2: "",
  servicio: "",
  dias_libres_origen: "",
  demurrage: "",
  detention: "",
  moneda: "USD",
  desde: "",
  hasta: "",
  observaciones: "",
});

const emptyHeader = (): Omit<Tarifario, "id" | "created_at" | "updated_at" | "activo"> => ({
  titulo: "",
  cliente: "",
  servicio: "Marítimo",
  pol: "",
  pod: "",
  producto: "",
  notas: "",
});

const TARIFARIO_SERVICIOS_DEFAULT = ["Marítimo", "Aéreo", "Terrestre"] as const;
const MONEDAS_FALLBACK = ["USD", "EUR", "CLP"] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const uniqSorted = (names: (string | null | undefined)[]) =>
  [...new Set(names.map((n) => (n ?? "").trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" }),
  );

/** Incluye el valor actual si no está en catálogo (tarifarios antiguos / texto libre previo). */
const mergeCurrent = (opts: string[], current: string | null | undefined) => {
  const c = (current ?? "").trim();
  if (!c || opts.includes(c)) return opts;
  return [...opts, c].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
};

const toComboOpts = (strs: string[]) => strs.map((s) => ({ value: s, label: s }));

/** PostgREST 404 / PGRST205: la relación no está en el proyecto (migración pendiente). */
function isMissingDbRelation(err: unknown): boolean {
  const e = err as { code?: string; message?: string; details?: string; hint?: string };
  const code = String(e?.code ?? "");
  const blob = `${e?.message ?? ""} ${e?.details ?? ""} ${e?.hint ?? ""}`.toLowerCase();
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    blob.includes("could not find the table") ||
    blob.includes("schema cache") ||
    blob.includes("does not exist") ||
    blob.includes("relation") && blob.includes("does not exist")
  );
}

// ─── Datos de prueba ─────────────────────────────────────────────────────────

const DEMO_HEADER: Omit<Tarifario, "id" | "created_at" | "updated_at" | "activo"> = {
  titulo:   "Temporada 2026",
  cliente:  "Exportadora del Sur",
  servicio: "Marítimo",
  pol:      "San Antonio / Valparaíso",
  pod:      "Nhava Sheva / Rotterdam / Livorno / Fos Sur Mer / Buenaventura",
  producto: "Kiwi",
  notas:    "*VALORES GATE OUT = N/A\n*FLETE + GASTOS LOCALES SON PAGADOS POR EXPORTADOR DIRECTO A LA NAVIERA\n**SITRANS $193725 (PAGO DIRECTO A DEPOSITO) // $184500 (PAGO PORTAL UMAR) // DYC $171000 // AGUNSA $172000 // MEDLOG $154000\n**DYC $ 166400 // AGUNSA $ 16000 // SITRANS $ 172400 (ONE)\n*Tarifa por contenedor (Fee ASLI): $200.000",
};

const DEMO_FILAS: Omit<Fila, "id" | "tarifario_id" | "orden">[] = [
  {
    naviera: "Yang Ming", pol: "San Antonio", pod: "Nhava Sheva",
    publica: 5500, neta: 3300, vd: 2200, moneda: "USD",
    gate_out: "USD 190",
    recargos: "DTHC+DDF+IS+PF+MH+EQ+EC+BC+BKGASTOS LOCALES ORIGEN Y DESTINO",
    tt: 44, t1: "Ningbo", t2: "", servicio: "SA8",
    dias_libres_origen: "10 Días Libres", demurrage: "", detention: "10 Días Libres",
    desde: "2026-04-13", hasta: "2026-06-30",
    observaciones: "Más gastos locales en origen y destino",
  },
  {
    naviera: "Evergreen", pol: "Valparaíso", pod: "Nhava Sheva",
    publica: 6800, neta: 4100, vd: 2700, moneda: "USD",
    gate_out: "VER NOTA **",
    recargos: "DTHC + GASTOS LOCALES ORIGEN Y DESTINO",
    tt: 48, t1: "Kaohsiung", t2: "", servicio: "WSA1",
    dias_libres_origen: "10 Días Libres", demurrage: "", detention: "15 DíasLibres",
    desde: "2026-04-13", hasta: "2026-05-31",
    observaciones: "Emisión, Release o Emisión Destino $47000xbl",
  },
  {
    naviera: "One", pol: "Valparaíso", pod: "Nhava Sheva",
    publica: 6642, neta: 3742, vd: 2900, moneda: "USD",
    gate_out: "VER NOTA **",
    recargos: "DTHC + GASTOS LOCALES ORIGEN Y DESTINO",
    tt: 32, t1: "Hong Kong", t2: "Singapore", servicio: "AX1",
    dias_libres_origen: "21 Días Libres", demurrage: "", detention: "15 DíasLibres",
    desde: "2026-04-13", hasta: "2026-06-30",
    observaciones: "1a corrección sin costo posterior a 48 hrs del zarpe",
  },
  {
    naviera: "Cma Cgm", pol: "San Antonio", pod: "Rotterdam",
    publica: 7819, neta: 5819, vd: 2000, moneda: "USD",
    gate_out: "USD 110",
    recargos: "DTHC + BAF 798 usd + ENVG6 316 usd + AMS FEE 27 usd/bl + local charges both ends + EFS 360 USD + PSS 800 USD",
    tt: 24, t1: "", t2: "", servicio: "EUROSAL XL WCC",
    dias_libres_origen: "3 DÍAS LIBRES (1 DÍA LIBRE SI NO ES CARGADO)", demurrage: "3 días libres", detention: "3 días libres",
    desde: "2026-04-13", hasta: "2026-04-30",
    observaciones: "Más gastos locales en origen y destino",
  },
  {
    naviera: "Cma Cgm", pol: "San Antonio", pod: "Livorno",
    publica: 7432, neta: 5862, vd: 1570, moneda: "CLP",
    gate_out: "CLP 154000",
    recargos: "DTHC 325 EUR+GPS 22 EUR",
    tt: 29, t1: "", t2: "", servicio: "NNC",
    dias_libres_origen: "5 DÍAS LIBRES", demurrage: "TBC", detention: "TBC",
    desde: "2026-04-13", hasta: "2026-06-30",
    observaciones: "Más gastos locales en origen y destino",
  },
];

const DEMO_FILA_SINGLE: Omit<Fila, "id" | "tarifario_id" | "orden"> = DEMO_FILAS[0];

const TARIFARIOS_SETUP_MSG =
  "En Supabase: SQL Editor → pega y ejecuta el contenido de supabase/migrations/20260413000002_tarifarios.sql (tablas public.tarifarios y public.tarifarios_filas). Después recarga la página.";

const fmtNum = (n: number | null | undefined) =>
  n != null ? n.toLocaleString("es-CL") : "";

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "";
  try { return format(new Date(d), "dd-MM-yyyy", { locale: es }); } catch { return d; }
};

// ─── Helpers de exportación ──────────────────────────────────────────────────

const LOGO_PATH = "/img/ANIMACIONLOGO.png";

/** Descarga logo → ArrayBuffer (ExcelJS acepta ArrayBuffer directamente). */
async function getLogoBuffer(): Promise<ArrayBuffer | null> {
  try {
    const r = await fetch(LOGO_PATH);
    return r.ok ? r.arrayBuffer() : null;
  } catch { return null; }
}

/** Descarga logo → Blob URL (para incrustar en HTML de PDF via <img src>). */
async function getLogoBlobUrl(): Promise<string> {
  try {
    const r = await fetch(LOGO_PATH);
    if (!r.ok) return "";
    return URL.createObjectURL(await r.blob());
  } catch { return ""; }
}

// ─── Excel Export ────────────────────────────────────────────────────────────

type ExcelJsCtor = typeof import("exceljs");

function resolveExcelJs(mod: ExcelJsCtor & { default?: ExcelJsCtor }): ExcelJsCtor {
  const d = mod.default;
  if (d && typeof (d as { Workbook?: unknown }).Workbook === "function") return d as ExcelJsCtor;
  if (typeof (mod as { Workbook?: unknown }).Workbook === "function") return mod;
  throw new Error("exceljs: Workbook no disponible.");
}

function downloadBlob(buffer: ArrayBuffer, fileName: string) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fileName; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

async function exportarExcel(tar: Tarifario, filas: Fila[]) {
  const raw = (await import("exceljs")) as ExcelJsCtor & { default?: ExcelJsCtor };
  const ExcelJS = resolveExcelJs(raw);

  const DARK_BLUE  = "FF11224E";
  const MID_BLUE   = "FF1D3A6E";
  const GROUP_BLUE = "FF2C4A8A";
  const LBLUE      = "FFE8EDF8";
  const WHITE      = "FFFFFFFF";
  const ZEBRA      = "FFF4F7FF";
  const BORDER     = "FFD1D9F0";
  const GREY_TXT   = "FF64748B";
  const GREEN      = "FF065F46";
  const TEXT_DARK  = "FF1E293B";

  const wb = new ExcelJS.Workbook();
  wb.creator = "ASLI";
  const ws = wb.addWorksheet("Tarifario", { views: [{ showGridLines: false }] });

  const clienteSlug = tar.cliente.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
  const fileName = `TARIFARIO_${clienteSlug}_${format(new Date(), "yyyy-MM-dd")}.xlsx`;

  // Columns: 18 (no separate Moneda column — currency encoded in gate_out / shown in group)
  const TOTAL_COLS = 18;

  const cols: { header: string; key: string; width: number }[] = [
    { header: "Naviera",                      key: "naviera",            width: 13 },
    { header: "POL",                          key: "pol",                width: 16 },
    { header: "POD",                          key: "pod",                width: 16 },
    { header: "Pública",                      key: "publica",            width: 10 },
    { header: "Neta",                         key: "neta",               width: 10 },
    { header: "VD",                           key: "vd",                 width: 9  },
    { header: "Gate Out",                     key: "gate_out",           width: 14 },
    { header: "Recargos en destino (collect)", key: "recargos",          width: 44 },
    { header: "TT",                           key: "tt",                 width: 5  },
    { header: "T1",                           key: "t1",                 width: 14 }, // 10 — Puertos de Transbordo
    { header: "T2",                           key: "t2",                 width: 14 }, // 11
    { header: "Servicio",                     key: "servicio",           width: 10 }, // 12
    { header: "Origen",                       key: "dias_libres_origen", width: 18 }, // 13 — Días libres
    { header: "Demurrage",                    key: "demurrage",          width: 14 }, // 14
    { header: "Detention",                    key: "detention",          width: 14 }, // 15
    { header: "Desde",                        key: "desde",              width: 12 }, // 16 — Vigencia
    { header: "Hasta",                        key: "hasta",              width: 12 }, // 17
    { header: "Observaciones",                key: "observaciones",      width: 30 }, // 18
  ];

  ws.columns = cols.map((c) => ({ key: c.key, width: c.width }));

  // ── Fila 1: banner ASLI ──────────────────────────────────────────────────
  ws.mergeCells(1, 1, 1, TOTAL_COLS);
  const bannerCell = ws.getCell(1, 1);
  bannerCell.value = "ASLI — Asesorías y Servicios Logísticos Integrales";
  bannerCell.font = { bold: true, size: 13, color: { argb: WHITE }, name: "Arial" };
  bannerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK_BLUE } };
  bannerCell.alignment = { vertical: "middle", horizontal: "center" };
  ws.getRow(1).height = 28;

  // Logo — se incrusta junto al bloque de info (ver más abajo)

  // ── Filas 2-N: bloque de información ────────────────────────────────────
  const infoRows: [string, string][] = [
    ["Cliente", tar.cliente],
    ...(tar.servicio ? [["Servicio", tar.servicio] as [string, string]] : []),
    ...(tar.pol      ? [["Puerto de Carga (POL)", tar.pol] as [string, string]] : []),
    ...(tar.pod      ? [["Puerto destino (POD)", tar.pod] as [string, string]] : []),
    ...(tar.producto ? [["Producto", tar.producto] as [string, string]] : []),
  ];

  infoRows.forEach(([lbl, val], i) => {
    const rowNum = 2 + i;
    const r = ws.getRow(rowNum);
    r.height = 14;

    ws.mergeCells(rowNum, 1, rowNum, 3);
    const lblCell = r.getCell(1);
    lblCell.value = lbl;
    lblCell.font = { bold: true, size: 9, color: { argb: DARK_BLUE }, name: "Arial" };
    lblCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LBLUE } };
    lblCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    lblCell.border = { bottom: { style: "thin", color: { argb: BORDER } }, right: { style: "thin", color: { argb: BORDER } } };

    ws.mergeCells(rowNum, 4, rowNum, 12);
    const valCell = r.getCell(4);
    valCell.value = val;
    valCell.font = { size: 9, color: { argb: TEXT_DARK }, name: "Arial" };
    valCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
    valCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    valCell.border = { bottom: { style: "thin", color: { argb: BORDER } } };
  });

  // ── Logo ──────────────────────────────────────────────────────────────────
  const logoBuf = await getLogoBuffer();
  if (logoBuf) {
    const logoId = wb.addImage({ buffer: logoBuf, extension: "png" });
    const endRow = 1 + infoRows.length; // 1-based
    ws.addImage(logoId, `M2:R${endRow}`);
  }

  // Fila separadora
  const SEP_ROW = 2 + infoRows.length;
  ws.getRow(SEP_ROW).height = 6;

  // ── Fila de grupos ───────────────────────────────────────────────────────
  const GROUP_ROW = SEP_ROW + 1;
  const COL_ROW   = GROUP_ROW + 1;

  ws.getRow(GROUP_ROW).height = 13;

  // Fondo oscuro en toda la fila de grupos
  for (let ci = 1; ci <= TOTAL_COLS; ci++) {
    const cell = ws.getRow(GROUP_ROW).getCell(ci);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK_BLUE } };
  }

  // "Puertos de Transbordo" — cols 10-11
  ws.mergeCells(GROUP_ROW, 10, GROUP_ROW, 11);
  const gTransb = ws.getRow(GROUP_ROW).getCell(10);
  gTransb.value = "Puertos de Transbordo";
  gTransb.font = { bold: true, size: 8, color: { argb: WHITE }, name: "Arial" };
  gTransb.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GROUP_BLUE } };
  gTransb.alignment = { vertical: "middle", horizontal: "center" };
  gTransb.border = {
    left:  { style: "medium", color: { argb: DARK_BLUE } },
    right: { style: "medium", color: { argb: DARK_BLUE } },
  };

  // "Días libres" — cols 13-15
  ws.mergeCells(GROUP_ROW, 13, GROUP_ROW, 15);
  const gDias = ws.getRow(GROUP_ROW).getCell(13);
  gDias.value = "Días libres";
  gDias.font = { bold: true, size: 8, color: { argb: WHITE }, name: "Arial" };
  gDias.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GROUP_BLUE } };
  gDias.alignment = { vertical: "middle", horizontal: "center" };
  gDias.border = {
    left:  { style: "medium", color: { argb: DARK_BLUE } },
    right: { style: "medium", color: { argb: DARK_BLUE } },
  };

  // "Vigencia" — cols 16-17
  ws.mergeCells(GROUP_ROW, 16, GROUP_ROW, 17);
  const gVig = ws.getRow(GROUP_ROW).getCell(16);
  gVig.value = "Vigencia";
  gVig.font = { bold: true, size: 8, color: { argb: WHITE }, name: "Arial" };
  gVig.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GROUP_BLUE } };
  gVig.alignment = { vertical: "middle", horizontal: "center" };
  gVig.border = {
    left:  { style: "medium", color: { argb: DARK_BLUE } },
    right: { style: "medium", color: { argb: DARK_BLUE } },
  };

  // ── Fila de encabezados de columnas ──────────────────────────────────────
  ws.getRow(COL_ROW).height = 16;
  cols.forEach((c, i) => {
    const cell = ws.getRow(COL_ROW).getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, size: 8, color: { argb: WHITE }, name: "Arial" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK_BLUE } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
    cell.border = {
      top:    { style: "thin",   color: { argb: MID_BLUE } },
      bottom: { style: "medium", color: { argb: "FF0d1b3e" } },
      right:  { style: "thin",   color: { argb: MID_BLUE } },
    };
    // Borde izquierdo destacado en primera col de cada grupo
    if (i + 1 === 10 || i + 1 === 13 || i + 1 === 16) {
      cell.border = { ...cell.border, left: { style: "medium", color: { argb: DARK_BLUE } } };
    }
  });

  // ── Filas de datos ───────────────────────────────────────────────────────
  const activas = filas.filter((f) => f.naviera || f.pol || f.pod);

  activas.forEach((f, ri) => {
    const r = ws.getRow(COL_ROW + 1 + ri);
    r.height = 14;
    const zebra = ri % 2 !== 0;
    const bg = zebra ? ZEBRA : WHITE;

    const values: (string | number | null)[] = [
      f.naviera || null,
      f.pol     || null,
      f.pod     || null,
      f.publica ?? null,
      f.neta    ?? null,
      f.vd      ?? null,
      f.gate_out || null,
      f.recargos || null,
      f.tt      ?? null,
      f.t1      || null,
      f.t2      || null,
      f.servicio || null,
      f.dias_libres_origen || null,
      f.demurrage || null,
      f.detention || null,
      f.desde ? format(new Date(f.desde), "dd-MM-yyyy") : null,
      f.hasta ? format(new Date(f.hasta), "dd-MM-yyyy") : null,
      f.observaciones || null,
    ];

    values.forEach((val, ci) => {
      const cell = r.getCell(ci + 1);
      cell.value = val;
      cell.font = { size: 9, color: { argb: ci === 4 ? GREEN : TEXT_DARK }, name: "Arial" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.alignment = {
        vertical: "middle",
        horizontal: typeof val === "number" ? "right" : "left",
        wrapText: ci === 7,
      };
      cell.border = {
        bottom: { style: "hair", color: { argb: BORDER } },
        right:  { style: "hair", color: { argb: BORDER } },
      };
      if ((ci === 3 || ci === 4 || ci === 5) && typeof val === "number") cell.numFmt = "#,##0";
      // Borde izquierdo para primera col de grupo
      if (ci + 1 === 10 || ci + 1 === 13 || ci + 1 === 16) {
        cell.border = { ...cell.border, left: { style: "thin", color: { argb: BORDER } } };
      }
    });
  });

  // ── Notas al pie ─────────────────────────────────────────────────────────
  if (tar.notas?.trim()) {
    const notaRow = COL_ROW + activas.length + 2;
    ws.mergeCells(notaRow, 1, notaRow, TOTAL_COLS);
    const nc = ws.getCell(notaRow, 1);
    nc.value = tar.notas.trim();
    nc.font = { size: 8, italic: true, color: { argb: GREY_TXT }, name: "Arial" };
    nc.alignment = { wrapText: true, vertical: "top", indent: 1 };
    nc.border = { top: { style: "medium", color: { argb: DARK_BLUE } } };
    ws.getRow(notaRow).height = 42;
  }

  // ── Pie de página ────────────────────────────────────────────────────────
  ws.headerFooter.oddFooter = `&L&8ASLI — Asesorías y Servicios Logísticos Integrales&R&8Generado el ${format(new Date(), "dd/MM/yyyy HH:mm")}`;
  ws.pageSetup = { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(buffer as ArrayBuffer, fileName);
}

// ─── PDF Export ──────────────────────────────────────────────────────────────

async function exportarPDF(tar: Tarifario, filas: Fila[]) {
  const activas = filas.filter((f) => f.naviera || f.pol || f.pod);

  const logoBlobUrl = await getLogoBlobUrl();

  const infoFields: [string, string | null][] = [
    ["Cliente", tar.cliente],
    ["Servicio", tar.servicio ?? null],
    ["Puerto de Carga (POL)", tar.pol ?? null],
    ["Puerto destino (POD)", tar.pod ?? null],
    ["Producto", tar.producto ?? null],
  ].filter(([, v]) => !!v) as [string, string][];

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Tarifario — ${tar.cliente}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 8.5px; color: #1a1a1a; padding: 10px 14px; }

  /* ── Cabecera ── */
  .top-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 16px; }
  .info-table { border-collapse: collapse; }
  .info-table td { padding: 2.5px 6px; font-size: 8.5px; border: 1px solid #d1d9f0; }
  .info-table .lbl { font-weight: 700; color: #11224E; background: #e8edf8; white-space: nowrap; }
  .info-table .val { color: #1e293b; min-width: 200px; }
  .logo-wrap { text-align: right; flex-shrink: 0; }
  .logo-wrap img { height: 44px; width: auto; display: block; }
  .asli-fallback { font-size: 20px; font-weight: 900; color: #11224E; letter-spacing: -0.5px; font-style: italic; }

  /* ── Tabla ── */
  table.main { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 7.5px; }

  /* fila de grupos */
  table.main thead tr.grp th {
    background: #11224E; color: #fff;
    padding: 3px 3px; font-size: 7px; font-weight: 700;
    text-align: center; border: 1px solid #0d1b3e;
  }
  table.main thead tr.grp th.g {
    background: #2c4a8a;
    border-left:  2px solid #11224E;
    border-right: 2px solid #11224E;
  }

  /* fila de encabezados de columna */
  table.main thead tr.hdrs th {
    background: #11224E; color: #fff;
    padding: 3.5px 3px; font-size: 7px; font-weight: 600;
    text-align: center; white-space: nowrap;
    border: 1px solid #0d1b3e;
  }
  table.main thead tr.hdrs th.gl { border-left: 2px solid #1d3a6e; }
  table.main thead th.num { text-align: right; }

  /* celdas de datos */
  table.main tbody tr:nth-child(even) { background: #f4f7ff; }
  table.main tbody tr:nth-child(odd)  { background: #fff; }
  table.main tbody td {
    padding: 2.5px 3px; border: 1px solid #dde3f0; vertical-align: top;
  }
  table.main tbody td.num  { text-align: right; }
  table.main tbody td.neta { color: #065f46; font-weight: 600; text-align: right; }
  table.main tbody td.gl   { border-left: 2px solid #c7d2e8; }

  /* ── Notas y pie ── */
  .notes  { margin-top: 8px; font-size: 7.5px; color: #444; white-space: pre-wrap; line-height: 1.5; border-top: 2px solid #11224E; padding-top: 5px; }
  .footer { margin-top: 12px; font-size: 7px; color: #888; display: flex; justify-content: space-between; border-top: 1px solid #ddd; padding-top: 4px; }

  @page { size: A4 landscape; margin: 8mm; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>

<div class="top-header">
  <table class="info-table">
    ${infoFields.map(([lbl, val]) =>
      `<tr><td class="lbl">${lbl}</td><td class="val">${val}</td></tr>`
    ).join("")}
  </table>
  <div class="logo-wrap">
    ${logoBlobUrl
      ? `<img src="${logoBlobUrl}" alt="ASLI" style="height:44px;width:auto"/>`
      : `<span class="asli-fallback">ASLI</span>`}
  </div>
</div>

<table class="main">
  <thead>
    <tr class="grp">
      <th colspan="9"></th>
      <th colspan="2" class="g">Puertos de Transbordo</th>
      <th colspan="1"></th>
      <th colspan="3" class="g">Días libres</th>
      <th colspan="2" class="g">Vigencia</th>
      <th colspan="1"></th>
    </tr>
    <tr class="hdrs">
      <th>Naviera</th>
      <th>POL</th>
      <th>POD</th>
      <th class="num">Pública</th>
      <th class="num">Neta</th>
      <th class="num">VD</th>
      <th>Gate Out</th>
      <th style="min-width:110px">Recargos en destino (collect)</th>
      <th class="num">TT</th>
      <th class="gl">T1</th>
      <th>T2</th>
      <th>Servicio</th>
      <th class="gl">Origen</th>
      <th>Demurrage</th>
      <th>Detention</th>
      <th class="gl">Desde</th>
      <th>Hasta</th>
      <th>Observaciones</th>
    </tr>
  </thead>
  <tbody>
    ${activas.map((f) => `
    <tr>
      <td>${f.naviera || ""}</td>
      <td>${f.pol || ""}</td>
      <td>${f.pod || ""}</td>
      <td class="num">${f.publica != null ? fmtNum(f.publica) : ""}</td>
      <td class="neta">${f.neta != null ? fmtNum(f.neta) : ""}</td>
      <td class="num">${f.vd != null ? fmtNum(f.vd) : ""}</td>
      <td>${f.gate_out || ""}</td>
      <td style="min-width:110px;word-break:break-word">${f.recargos || ""}</td>
      <td class="num">${f.tt != null ? f.tt : ""}</td>
      <td class="gl">${f.t1 || ""}</td>
      <td>${f.t2 || ""}</td>
      <td>${f.servicio || ""}</td>
      <td class="gl">${f.dias_libres_origen || ""}</td>
      <td>${f.demurrage || ""}</td>
      <td>${f.detention || ""}</td>
      <td class="gl">${fmtDate(f.desde)}</td>
      <td>${fmtDate(f.hasta)}</td>
      <td style="word-break:break-word">${f.observaciones || ""}</td>
    </tr>`).join("")}
  </tbody>
</table>

${tar.notas ? `<div class="notes">${tar.notas}</div>` : ""}

<div class="footer">
  <span>ASLI — Asesorías y Servicios Logísticos Integrales</span>
  <span>Generado el ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</span>
</div>

<script>window.onload = () => { window.print(); }<\/script>
</body></html>`;

  // Abrimos el HTML como Blob URL — resuelve CSP, about:blank y blob src issues
  const htmlBlob = new Blob([html], { type: "text/html;charset=utf-8" });
  const htmlUrl  = URL.createObjectURL(htmlBlob);
  window.open(htmlUrl, "_blank", "width=1200,height=750");
  // Limpiamos ambos blob URLs después de que el navegador los cargue
  setTimeout(() => {
    URL.revokeObjectURL(htmlUrl);
    if (logoBlobUrl) URL.revokeObjectURL(logoBlobUrl);
  }, 60_000);
}

// ─── Fila Edit Modal ──────────────────────────────────────────────────────────

type FilaModalCatalog = {
  navieras: string[];
  pol: string[];
  pod: string[];
  transbordo: string[];
  monedas: string[];
};

type FilaModalProps = {
  fila: Omit<Fila, "id" | "tarifario_id" | "orden"> & { id?: string };
  catalog: FilaModalCatalog;
  disabled: boolean;
  onSave: (f: Omit<Fila, "id" | "tarifario_id" | "orden"> & { id?: string }) => void;
  onClose: () => void;
};

function FilaModal({ fila: initial, catalog, disabled, onSave, onClose }: FilaModalProps) {
  const [f, setF] = useState(initial);
  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    setF(initial);
  }, [initial]);

  const comboCls =
    "w-full pl-2.5 pr-8 py-1.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 bg-white";

  const navieraOpts = useMemo(() => toComboOpts(mergeCurrent(catalog.navieras, f.naviera)), [catalog.navieras, f.naviera]);
  const polOpts = useMemo(() => toComboOpts(mergeCurrent(catalog.pol, f.pol)), [catalog.pol, f.pol]);
  const podOpts = useMemo(() => toComboOpts(mergeCurrent(catalog.pod, f.pod)), [catalog.pod, f.pod]);
  const t1Opts = useMemo(() => toComboOpts(mergeCurrent(catalog.transbordo, f.t1)), [catalog.transbordo, f.t1]);
  const t2Opts = useMemo(() => toComboOpts(mergeCurrent(catalog.transbordo, f.t2)), [catalog.transbordo, f.t2]);
  const monedaOpts = useMemo(() => mergeCurrent(catalog.monedas.length > 0 ? catalog.monedas : [...MONEDAS_FALLBACK], f.moneda), [catalog.monedas, f.moneda]);

  const fieldCls = "w-full px-2 py-1.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30";
  const labelCls = "block text-xs font-medium text-neutral-600 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h3 className="font-semibold text-neutral-800">{f.id ? "Editar fila" : "Nueva fila"}</h3>
          <div className="flex items-center gap-2">
            {!disabled && (
              <button
                type="button"
                onClick={() => setF({ ...f, ...DEMO_FILA_SINGLE })}
                className="flex items-center gap-1 px-2 py-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                title="Rellenar con datos de prueba"
              >
                <Icon icon="lucide:flask-conical" className="w-3 h-3" />
                Datos de prueba
              </button>
            )}
            <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-neutral-100">
              <Icon icon="lucide:x" className="w-4 h-4 text-neutral-500" />
            </button>
          </div>
        </div>

        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Naviera + puertos */}
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>Naviera</label>
            <Combobox
              value={f.naviera}
              onChange={(v) => set("naviera", v)}
              options={navieraOpts}
              placeholder="Buscar naviera…"
              disabled={disabled}
              className={comboCls}
            />
          </div>
          <div>
            <label className={labelCls}>POL</label>
            <Combobox
              value={f.pol}
              onChange={(v) => set("pol", v)}
              options={polOpts}
              placeholder="Puerto de carga…"
              disabled={disabled}
              className={comboCls}
            />
          </div>
          <div>
            <label className={labelCls}>POD</label>
            <Combobox
              value={f.pod}
              onChange={(v) => set("pod", v)}
              options={podOpts}
              placeholder="Puerto de destino…"
              disabled={disabled}
              className={comboCls}
            />
          </div>

          {/* Tarifas */}
          <div>
            <label className={labelCls}>Moneda</label>
            <select className={fieldCls} value={f.moneda} onChange={(e) => set("moneda", e.target.value)} disabled={disabled}>
              {monedaOpts.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Tarifa Pública</label>
            <input type="number" className={fieldCls} value={f.publica ?? ""} onChange={(e) => set("publica", e.target.value ? parseFloat(e.target.value) : null)} disabled={disabled} />
          </div>
          <div>
            <label className={labelCls}>Tarifa Neta</label>
            <input type="number" className={fieldCls} value={f.neta ?? ""} onChange={(e) => set("neta", e.target.value ? parseFloat(e.target.value) : null)} disabled={disabled} />
          </div>
          <div>
            <label className={labelCls}>VD</label>
            <input type="number" className={fieldCls} value={f.vd ?? ""} onChange={(e) => set("vd", e.target.value ? parseFloat(e.target.value) : null)} disabled={disabled} />
          </div>
          <div>
            <label className={labelCls}>Gate Out</label>
            <input className={fieldCls} value={f.gate_out} onChange={(e) => set("gate_out", e.target.value)} placeholder="VER NOTA **" disabled={disabled} />
          </div>
          <div>
            <label className={labelCls}>TT (días)</label>
            <input type="number" className={fieldCls} value={f.tt ?? ""} onChange={(e) => set("tt", e.target.value ? parseInt(e.target.value) : null)} disabled={disabled} />
          </div>

          {/* Recargos — ancho completo */}
          <div className="col-span-2 sm:col-span-3">
            <label className={labelCls}>Recargos en destino (collect)</label>
            <textarea className={`${fieldCls} min-h-[60px] resize-y`} value={f.recargos} onChange={(e) => set("recargos", e.target.value)} placeholder="DTHC + BAF 798 usd + ENVG6 316 usd + ..." disabled={disabled} />
          </div>

          {/* Transbordo + servicio */}
          <div>
            <label className={labelCls}>T1 (transbordo)</label>
            <Combobox
              value={f.t1}
              onChange={(v) => set("t1", v)}
              options={t1Opts}
              placeholder="Puerto transbordo…"
              disabled={disabled}
              className={comboCls}
            />
          </div>
          <div>
            <label className={labelCls}>T2 (transbordo)</label>
            <Combobox
              value={f.t2}
              onChange={(v) => set("t2", v)}
              options={t2Opts}
              placeholder="Puerto transbordo…"
              disabled={disabled}
              className={comboCls}
            />
          </div>
          <div>
            <label className={labelCls}>Servicio naviero</label>
            <input className={fieldCls} value={f.servicio} onChange={(e) => set("servicio", e.target.value)} placeholder="SA8, WSA1…" disabled={disabled} />
          </div>

          {/* Días libres */}
          <div>
            <label className={labelCls}>Días libres origen</label>
            <input className={fieldCls} value={f.dias_libres_origen} onChange={(e) => set("dias_libres_origen", e.target.value)} placeholder="10 Días Libres" disabled={disabled} />
          </div>
          <div>
            <label className={labelCls}>Demurrage</label>
            <input className={fieldCls} value={f.demurrage} onChange={(e) => set("demurrage", e.target.value)} placeholder="3 días libres" disabled={disabled} />
          </div>
          <div>
            <label className={labelCls}>Detention</label>
            <input className={fieldCls} value={f.detention} onChange={(e) => set("detention", e.target.value)} placeholder="5 Días Libres" disabled={disabled} />
          </div>

          {/* Vigencia */}
          <div>
            <label className={labelCls}>Vigencia desde</label>
            <input type="date" className={fieldCls} value={f.desde} onChange={(e) => set("desde", e.target.value)} disabled={disabled} />
          </div>
          <div>
            <label className={labelCls}>Vigencia hasta</label>
            <input type="date" className={fieldCls} value={f.hasta} onChange={(e) => set("hasta", e.target.value)} disabled={disabled} />
          </div>

          {/* Observaciones */}
          <div className="col-span-2 sm:col-span-3">
            <label className={labelCls}>Observaciones</label>
            <input className={fieldCls} value={f.observaciones} onChange={(e) => set("observaciones", e.target.value)} placeholder="Notas adicionales para esta fila" disabled={disabled} />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-neutral-100 bg-neutral-50 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-neutral-600 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSave(f)}
            disabled={disabled}
            className="px-4 py-2 text-sm text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 disabled:opacity-50 disabled:pointer-events-none"
          >
            {f.id ? "Guardar cambios" : "Agregar fila"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TarifarioContent() {
  const { user, profile, isLoading, empresaNombres } = useAuth();
  const canEdit = !!profile?.rol && ["superadmin", "admin", "ejecutivo"].includes(profile.rol);
  
  const hasAccess = !isLoading && user && canEdit;

  const supabase = useMemo(() => { try { return createClient(); } catch { return null; } }, []);

  // ── State ──────────────────────────────────────────────────────────────────
  const [tarifarios, setTarifarios] = useState<Tarifario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCliente, setFilterCliente] = useState("todos");

  /** Listas para desplegables (empresas, puertos, catálogos, etc.) */
  const [dbOpts, setDbOpts] = useState({
    clientes: [] as string[],
    pol: [] as string[],
    pod: [] as string[],
    productos: [] as string[],
    navieras: [] as string[],
    monedas: [] as string[],
    serviciosTipo: [] as string[],
  });

  // Editor
  const [selected, setSelected] = useState<Tarifario | null>(null);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [headerForm, setHeaderForm] = useState(emptyHeader());
  const [editMode, setEditMode] = useState(false); // false = new, true = editing selected
  const [showEditor, setShowEditor] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal fila
  const [filaModal, setFilaModal] = useState<{
    fila: Omit<Fila, "id" | "tarifario_id" | "orden"> & { id?: string };
    index: number | null; // null = nueva
  } | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<{ id: string; cliente: string } | null>(null);

  const fetchTarifarioCatalogos = useCallback(async () => {
    if (!supabase) return;
    let qEmpresas = supabase.from("empresas").select("nombre").order("nombre");
    if (profile?.rol === "ejecutivo" && empresaNombres.length > 0) {
      qEmpresas = qEmpresas.in("nombre", empresaNombres);
    }

    const [
      empresasRes,
      polRes,
      podRes,
      especiesRes,
      navierasRes,
      monedasRes,
      servicioTipoRes,
    ] = await Promise.all([
      qEmpresas,
      supabase.from("puertos_origen").select("nombre").eq("activo", true).order("nombre"),
      supabase.from("destinos").select("nombre").eq("activo", true).order("nombre"),
      supabase.from("especies").select("nombre").order("nombre"),
      supabase.from("navieras").select("nombre").order("nombre"),
      supabase.from("catalogos").select("valor").eq("categoria", "moneda").eq("activo", true).order("orden"),
      supabase.from("catalogos").select("valor").eq("categoria", "tarifario_tipo_servicio").eq("activo", true).order("orden"),
    ]);

    setDbOpts({
      clientes: uniqSorted((empresasRes.data ?? []).map((r: { nombre: string }) => r.nombre)),
      pol: uniqSorted((polRes.data ?? []).map((r: { nombre: string }) => r.nombre)),
      pod: uniqSorted((podRes.data ?? []).map((r: { nombre: string }) => r.nombre)),
      productos: uniqSorted((especiesRes.data ?? []).map((r: { nombre: string }) => r.nombre)),
      navieras: uniqSorted((navierasRes.data ?? []).map((r: { nombre: string }) => r.nombre)),
      monedas: uniqSorted((monedasRes.data ?? []).map((r: { valor: string }) => r.valor)),
      serviciosTipo: uniqSorted((servicioTipoRes.data ?? []).map((r: { valor: string }) => r.valor)),
    });
  }, [supabase, profile?.rol, empresaNombres]);

  useEffect(() => {
    void fetchTarifarioCatalogos();
  }, [fetchTarifarioCatalogos]);

  // ── Load tarifarios ────────────────────────────────────────────────────────
  const fetchTarifarios = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("tarifarios")
      .select("*")
      .eq("activo", true)
      .order("created_at", { ascending: false });
    if (error) {
      setTarifarios([]);
      if (isMissingDbRelation(error) || (error as { status?: number }).status === 404) {
        sileo.error({
          title: "Faltan tablas de tarifario en Supabase",
          description: TARIFARIOS_SETUP_MSG,
        });
      } else {
        sileo.error({ title: "No se pudieron cargar los tarifarios", description: error.message });
      }
      setLoading(false);
      return;
    }
    setTarifarios(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void fetchTarifarios(); }, [fetchTarifarios]);

  // ── Load filas del tarifario seleccionado ──────────────────────────────────
  const fetchFilas = useCallback(async (tarifarioId: string, syncState = true) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("tarifarios_filas")
      .select("*")
      .eq("tarifario_id", tarifarioId)
      .order("orden");
    if (error) {
      if (syncState) setFilas([]);
      if (isMissingDbRelation(error) || (error as { status?: number }).status === 404) {
        sileo.error({ title: "Faltan tablas de tarifario en Supabase", description: TARIFARIOS_SETUP_MSG });
      }
      return [] as Fila[];
    }
    const filasData = (data ?? []) as Fila[];
    if (syncState) setFilas(filasData);
    return filasData;
  }, [supabase]);

  // ── Abrir editor ───────────────────────────────────────────────────────────
  const abrirNuevo = () => {
    setSelected(null);
    setHeaderForm(emptyHeader());
    setFilas([]);
    setEditMode(false);
    setShowEditor(true);
  };

  const abrirEditar = async (tar: Tarifario) => {
    setSelected(tar);
    setHeaderForm({
      titulo: tar.titulo ?? "",
      cliente: tar.cliente,
      servicio: tar.servicio ?? "Marítimo",
      pol: tar.pol ?? "",
      pod: tar.pod ?? "",
      producto: tar.producto ?? "",
      notas: tar.notas ?? "",
    });
    await fetchFilas(tar.id, true);
    setEditMode(true);
    setShowEditor(true);
  };

  // ── Guardar tarifario ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!supabase || !user) return;
    if (!headerForm.cliente.trim()) { sileo.warning({ title: "El cliente es obligatorio" }); return; }

    setSaving(true);
    try {
      let tarId: string;

      if (editMode && selected) {
        // Update header
        const { error } = await supabase
          .from("tarifarios")
          .update({ ...headerForm, updated_at: new Date().toISOString() })
          .eq("id", selected.id);
        if (error) throw error;
        tarId = selected.id;

        // Borrar y reinsertar filas
        await supabase.from("tarifarios_filas").delete().eq("tarifario_id", tarId);
      } else {
        // Insert header
        const { data, error } = await supabase
          .from("tarifarios")
          .insert({ ...headerForm, created_by: user.id })
          .select("id")
          .single();
        if (error) throw error;
        tarId = data.id;
      }

      // Insertar filas
      if (filas.length > 0) {
        const filasPayload = filas.map((f, i) => ({
          tarifario_id: tarId,
          naviera: f.naviera || null,
          pol: f.pol || null,
          pod: f.pod || null,
          publica: f.publica,
          neta: f.neta,
          vd: f.vd,
          gate_out: f.gate_out || null,
          recargos: f.recargos || null,
          tt: f.tt,
          t1: f.t1 || null,
          t2: f.t2 || null,
          servicio: f.servicio || null,
          dias_libres_origen: f.dias_libres_origen || null,
          demurrage: f.demurrage || null,
          detention: f.detention || null,
          moneda: f.moneda || "USD",
          desde: f.desde || null,
          hasta: f.hasta || null,
          observaciones: f.observaciones || null,
          orden: i,
        }));
        const { error } = await supabase.from("tarifarios_filas").insert(filasPayload);
        if (error) throw error;
      }

      sileo.success({ title: editMode ? "Tarifario actualizado" : "Tarifario creado" });
      setShowEditor(false);
      void fetchTarifarios();
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string; status?: number };
      if (isMissingDbRelation(e) || err.status === 404) {
        sileo.error({ title: "Faltan tablas de tarifario en Supabase", description: TARIFARIOS_SETUP_MSG });
      } else {
        sileo.error({ title: "Error al guardar", description: err.message ?? String(e) });
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminar tarifario ─────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from("tarifarios").update({ activo: false }).eq("id", id);
    if (error) { sileo.error({ title: "Error al eliminar" }); return; }
    sileo.success({ title: "Tarifario eliminado" });
    setConfirmDelete(null);
    if (selected?.id === id) setShowEditor(false);
    void fetchTarifarios();
  };

  // ── Gestión de filas ───────────────────────────────────────────────────────
  const handleFilaSave = (fila: typeof filaModal extends null ? never : NonNullable<typeof filaModal>["fila"]) => {
    if (!filaModal) return;
    if (filaModal.index !== null) {
      // Editar existente
      setFilas((prev) => prev.map((f, i) => (i === filaModal.index ? { ...f, ...fila } : f)));
    } else {
      // Nueva fila
      setFilas((prev) => [...prev, { ...fila, id: crypto.randomUUID(), tarifario_id: selected?.id ?? "", orden: prev.length } as Fila]);
    }
    setFilaModal(null);
  };

  const moverFila = (index: number, dir: -1 | 1) => {
    setFilas((prev) => {
      const arr = [...prev];
      const swap = index + dir;
      if (swap < 0 || swap >= arr.length) return prev;
      [arr[index], arr[swap]] = [arr[swap], arr[index]];
      return arr;
    });
  };

  // ── Filter ─────────────────────────────────────────────────────────────────
  const clientes = useMemo(() => [...new Set(tarifarios.map((t) => t.cliente).filter(Boolean))].sort(), [tarifarios]);

  const filtered = useMemo(() =>
    tarifarios.filter((t) => {
      if (filterCliente !== "todos" && t.cliente !== filterCliente) return false;
      if (search) {
        const q = search.toLowerCase();
        return [t.cliente, t.titulo, t.pol, t.pod, t.producto].some((v) => v?.toLowerCase().includes(q));
      }
      return true;
    }),
  [tarifarios, filterCliente, search]);

  const serviciosCabeceraOpts = useMemo(() => {
    const merged = [...new Set([...dbOpts.serviciosTipo, ...TARIFARIO_SERVICIOS_DEFAULT])];
    return merged.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [dbOpts.serviciosTipo]);

  const filaCatalogForModal = useMemo<FilaModalCatalog>(
    () => ({
      navieras: dbOpts.navieras,
      pol: dbOpts.pol,
      pod: dbOpts.pod,
      transbordo: uniqSorted([...dbOpts.pol, ...dbOpts.pod]),
      monedas: dbOpts.monedas.length > 0 ? dbOpts.monedas : [...MONEDAS_FALLBACK],
    }),
    [dbOpts.navieras, dbOpts.pol, dbOpts.pod, dbOpts.monedas],
  );

  const headerClienteOpts = useMemo(
    () => toComboOpts(mergeCurrent(dbOpts.clientes, headerForm.cliente)),
    [dbOpts.clientes, headerForm.cliente],
  );
  const headerPolOpts = useMemo(
    () => toComboOpts(mergeCurrent(dbOpts.pol, headerForm.pol)),
    [dbOpts.pol, headerForm.pol],
  );
  const headerPodOpts = useMemo(
    () => toComboOpts(mergeCurrent(dbOpts.pod, headerForm.pod)),
    [dbOpts.pod, headerForm.pod],
  );
  const headerProductoOpts = useMemo(
    () => toComboOpts(mergeCurrent(dbOpts.productos, headerForm.producto)),
    [dbOpts.productos, headerForm.producto],
  );

  // ── Shared styles ──────────────────────────────────────────────────────────
  const inputCls = "w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 bg-white";
  const comboClsEditor =
    "w-full pl-2.5 pr-8 py-1.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 bg-white";
  const labelCls = "block text-xs font-medium text-neutral-500 mb-1";

  // ─── Access Check ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Icon icon="lucide:lock" className="w-16 h-16 text-neutral-300 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-700 mb-2">Acceso Restringido</h2>
        <p className="text-neutral-500 max-w-md">
          Esta sección está disponible solo para usuarios con rol Ejecutivo, Admin o Superadmin.
        </p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden bg-neutral-50">
      {/* ── Topbar ── */}
      <div className="flex-shrink-0 bg-white border-b border-neutral-200 px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon icon="lucide:file-spreadsheet" className="w-5 h-5 text-brand-blue flex-shrink-0" />
          <div>
            <h1 className="text-base font-semibold text-neutral-800 leading-none">Tarifario</h1>
            <p className="text-xs text-neutral-500 mt-0.5">Gestiona tarifas de flete por cliente</p>
          </div>
        </div>
        {/* Filtros */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Icon icon="lucide:search" className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="pl-7 pr-3 py-1.5 text-sm border border-neutral-300 rounded-lg w-44 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterCliente}
            onChange={(e) => setFilterCliente(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-neutral-300 rounded-lg focus:outline-none bg-white"
          >
            <option value="todos">Todos los clientes</option>
            {clientes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={abrirNuevo}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors"
          >
            <Icon icon="lucide:plus" className="w-4 h-4" />
            Nuevo tarifario
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-neutral-400">
            <Icon icon="lucide:loader-circle" className="w-5 h-5 animate-spin" />
            <span className="text-sm">Cargando tarifarios...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 gap-3 text-neutral-400">
            <Icon icon="lucide:file-spreadsheet" className="w-12 h-12 opacity-30" />
            <p className="text-sm">No hay tarifarios{search ? " que coincidan" : " creados"}</p>
            {canEdit && !search && (
              <button onClick={abrirNuevo} className="mt-1 px-4 py-2 text-sm text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90">
                Crear primer tarifario
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((tar) => (
              <div
                key={tar.id}
                className="bg-white border border-neutral-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => void abrirEditar(tar)}
              >
                {/* Cabecera card */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="p-1.5 rounded-lg bg-blue-50 flex-shrink-0">
                      <Icon icon="lucide:file-spreadsheet" className="w-4 h-4 text-brand-blue" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-800 truncate">{tar.cliente}</p>
                      {tar.titulo && <p className="text-xs text-neutral-500 truncate">{tar.titulo}</p>}
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: tar.id, cliente: tar.cliente }); }}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                      <Icon icon="lucide:trash-2" className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-1 text-xs text-neutral-600">
                  {tar.servicio && (
                    <div className="flex items-center gap-1.5">
                      <Icon icon="lucide:ship" className="w-3 h-3 text-neutral-400" />
                      <span>{tar.servicio}</span>
                    </div>
                  )}
                  {tar.pol && (
                    <div className="flex items-center gap-1.5">
                      <Icon icon="lucide:anchor" className="w-3 h-3 text-neutral-400" />
                      <span className="truncate">{tar.pol}</span>
                    </div>
                  )}
                  {tar.pod && (
                    <div className="flex items-center gap-1.5">
                      <Icon icon="lucide:map-pin" className="w-3 h-3 text-neutral-400" />
                      <span className="truncate">{tar.pod}</span>
                    </div>
                  )}
                  {tar.producto && (
                    <div className="flex items-center gap-1.5">
                      <Icon icon="lucide:package" className="w-3 h-3 text-neutral-400" />
                      <span>{tar.producto}</span>
                    </div>
                  )}
                </div>

                {/* Footer card */}
                <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-neutral-400 flex-shrink-0">
                    {format(new Date(tar.updated_at), "dd MMM yyyy", { locale: es })}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const filasTarifario = await fetchFilas(tar.id, false);
                        void exportarExcel(tar, filasTarifario ?? []);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    >
                      <Icon icon="lucide:file-spreadsheet" className="w-3.5 h-3.5" />
                      Excel
                    </button>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const filasTarifario = await fetchFilas(tar.id, false);
                        void exportarPDF(tar, filasTarifario ?? []);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border border-neutral-200 transition-colors"
                    >
                      <Icon icon="lucide:printer" className="w-3.5 h-3.5" />
                      PDF
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Editor modal ── */}
      {showEditor && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-stretch justify-end" onClick={() => !saving && setShowEditor(false)}>
          <div
            className="w-full max-w-5xl bg-white h-full flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header editor */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-neutral-200 bg-brand-blue">
              <div>
                <h2 className="text-base font-semibold text-white">
                  {editMode ? "Editar tarifario" : "Nuevo tarifario"}
                </h2>
                {editMode && selected && (
                  <p className="text-xs text-white/70">{selected.cliente}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {editMode && selected && (
                  <>
                    <button
                      type="button"
                      onClick={() => void exportarExcel(selected, filas)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white border border-white/30 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Icon icon="lucide:file-spreadsheet" className="w-3.5 h-3.5" />
                      Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => void exportarPDF(selected, filas)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white border border-white/30 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Icon icon="lucide:printer" className="w-3.5 h-3.5" />
                      PDF
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setShowEditor(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
                >
                  <Icon icon="lucide:x" className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* ── Sección 1: Info general ── */}
              <div className="px-5 py-4 border-b border-neutral-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Información general
                  </h3>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setHeaderForm({ ...DEMO_HEADER });
                        setFilas(DEMO_FILAS.map((f, i) => ({
                          ...f,
                          id: `demo-${i}`,
                          tarifario_id: "",
                          orden: i,
                        })));
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      <Icon icon="lucide:flask-conical" className="w-3 h-3" />
                      Datos de prueba
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Cliente *</label>
                    <Combobox
                      value={headerForm.cliente}
                      onChange={(v) => setHeaderForm((p) => ({ ...p, cliente: v }))}
                      options={headerClienteOpts}
                      placeholder="Buscar cliente…"
                      disabled={!canEdit}
                      className={comboClsEditor}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Título / referencia</label>
                    <input className={inputCls} value={headerForm.titulo ?? ""} onChange={(e) => setHeaderForm((p) => ({ ...p, titulo: e.target.value }))} placeholder="Kiwi Temporada 2026" disabled={!canEdit} />
                  </div>
                  <div>
                    <label className={labelCls}>Tipo de servicio</label>
                    <select
                      className={inputCls}
                      value={headerForm.servicio ?? ""}
                      onChange={(e) => setHeaderForm((p) => ({ ...p, servicio: e.target.value }))}
                      disabled={!canEdit}
                    >
                      {mergeCurrent(serviciosCabeceraOpts, headerForm.servicio).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Puerto de carga (POL)</label>
                    <Combobox
                      value={headerForm.pol ?? ""}
                      onChange={(v) => setHeaderForm((p) => ({ ...p, pol: v }))}
                      options={headerPolOpts}
                      placeholder="Puerto de carga…"
                      disabled={!canEdit}
                      className={comboClsEditor}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Puerto destino (POD)</label>
                    <Combobox
                      value={headerForm.pod ?? ""}
                      onChange={(v) => setHeaderForm((p) => ({ ...p, pod: v }))}
                      options={headerPodOpts}
                      placeholder="Puerto de destino…"
                      disabled={!canEdit}
                      className={comboClsEditor}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Producto</label>
                    <Combobox
                      value={headerForm.producto ?? ""}
                      onChange={(v) => setHeaderForm((p) => ({ ...p, producto: v }))}
                      options={headerProductoOpts}
                      placeholder="Especie / producto…"
                      disabled={!canEdit}
                      className={comboClsEditor}
                    />
                  </div>
                </div>
              </div>

              {/* ── Sección 2: Filas de tarifas ── */}
              <div className="px-5 py-4 border-b border-neutral-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Tarifas ({filas.length} fila{filas.length !== 1 ? "s" : ""})
                  </h3>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setFilaModal({ fila: emptyFila(), index: null })}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-brand-blue border border-brand-blue/30 rounded-lg hover:bg-brand-blue/5"
                    >
                      <Icon icon="lucide:plus" className="w-3.5 h-3.5" />
                      Agregar fila
                    </button>
                  )}
                </div>

                {filas.length === 0 ? (
                  <div className="border-2 border-dashed border-neutral-200 rounded-xl py-8 flex flex-col items-center gap-2 text-neutral-400">
                    <Icon icon="lucide:table-2" className="w-8 h-8 opacity-40" />
                    <p className="text-sm">Sin filas de tarifas</p>
                    <button
                      type="button"
                      onClick={() => setFilaModal({ fila: emptyFila(), index: null })}
                      className="px-3 py-1.5 text-xs text-brand-blue border border-brand-blue/30 rounded-lg hover:bg-brand-blue/5"
                    >
                      Agregar primera fila
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-neutral-200">
                    <table className="w-full text-xs min-w-[900px]">
                      <thead>
                        <tr className="bg-brand-blue text-white">
                          <th className="px-2 py-2 text-center font-medium w-6">#</th>
                          <th className="px-2 py-2 text-center font-medium">Naviera</th>
                          <th className="px-2 py-2 text-center font-medium">POL</th>
                          <th className="px-2 py-2 text-center font-medium">POD</th>
                          <th className="px-2 py-2 text-center font-medium">Pública</th>
                          <th className="px-2 py-2 text-center font-medium">Neta</th>
                          <th className="px-2 py-2 text-center font-medium">VD</th>
                          <th className="px-2 py-2 text-center font-medium">TT</th>
                          <th className="px-2 py-2 text-center font-medium">Servicio</th>
                          <th className="px-2 py-2 text-center font-medium">Desde</th>
                          <th className="px-2 py-2 text-center font-medium">Hasta</th>
                          {canEdit && <th className="px-2 py-2 text-center font-medium w-20">Acc.</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {filas.map((f, i) => (
                          <tr key={f.id ?? i} className={`border-t border-neutral-100 ${i % 2 === 0 ? "bg-white" : "bg-neutral-50/60"} hover:bg-blue-50/40 transition-colors`}>
                            <td className="px-2 py-2 text-center text-neutral-400">{i + 1}</td>
                            <td className="px-2 py-2 text-center font-medium text-neutral-800">{f.naviera || <span className="text-neutral-300">—</span>}</td>
                            <td className="px-2 py-2 text-center text-neutral-600">{f.pol || <span className="text-neutral-300">—</span>}</td>
                            <td className="px-2 py-2 text-center text-neutral-600">{f.pod || <span className="text-neutral-300">—</span>}</td>
                            <td className="px-2 py-2 text-center font-medium text-neutral-800">
                              {f.publica != null ? <>{f.moneda} {fmtNum(f.publica)}</> : <span className="text-neutral-300">—</span>}
                            </td>
                            <td className="px-2 py-2 text-center text-emerald-700 font-medium">
                              {f.neta != null ? fmtNum(f.neta) : <span className="text-neutral-300">—</span>}
                            </td>
                            <td className="px-2 py-2 text-center text-neutral-600">
                              {f.vd != null ? fmtNum(f.vd) : <span className="text-neutral-300">—</span>}
                            </td>
                            <td className="px-2 py-2 text-center text-neutral-600">
                              {f.tt != null ? `${f.tt}d` : <span className="text-neutral-300">—</span>}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {f.servicio ? (
                                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">{f.servicio}</span>
                              ) : <span className="text-neutral-300">—</span>}
                            </td>
                            <td className="px-2 py-2 text-center text-neutral-500">{fmtDate(f.desde) || <span className="text-neutral-300">—</span>}</td>
                            <td className="px-2 py-2 text-center text-neutral-500">{fmtDate(f.hasta) || <span className="text-neutral-300">—</span>}</td>
                            {canEdit && (
                              <td className="px-2 py-2">
                                <div className="flex items-center justify-center gap-0.5">
                                  <button type="button" onClick={() => moverFila(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-neutral-200 disabled:opacity-30">
                                    <Icon icon="lucide:chevron-up" className="w-3 h-3" />
                                  </button>
                                  <button type="button" onClick={() => moverFila(i, 1)} disabled={i === filas.length - 1} className="p-1 rounded hover:bg-neutral-200 disabled:opacity-30">
                                    <Icon icon="lucide:chevron-down" className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setFilaModal({ fila: { ...f }, index: i })}
                                    className="p-1 rounded hover:bg-blue-100 text-blue-600"
                                  >
                                    <Icon icon="lucide:pencil" className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setFilas((prev) => prev.filter((_, fi) => fi !== i))}
                                    className="p-1 rounded hover:bg-red-100 text-red-500"
                                  >
                                    <Icon icon="lucide:trash-2" className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── Sección 3: Notas al pie ── */}
              <div className="px-5 py-4">
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                  Notas / Leyenda al pie
                </h3>
                <textarea
                  value={headerForm.notas ?? ""}
                  onChange={(e) => setHeaderForm((p) => ({ ...p, notas: e.target.value }))}
                  placeholder={`*FLETE + GASTOS LOCALES SON PAGADOS POR EXPORTADOR DIRECTO A LA NAVIERA\n**SITRANS $193725 // ...\n*Tarifa por contenedor (Fee ASLI) $200.000`}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-xl min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-brand-blue/30 font-mono text-xs disabled:bg-neutral-50 disabled:text-neutral-500"
                />
              </div>
            </div>

            {/* Footer editor */}
            <div className="flex-shrink-0 px-5 py-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowEditor(false)}
                className="px-4 py-2 text-sm text-neutral-600 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50"
              >
                Cancelar
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 disabled:opacity-60"
                >
                  {saving ? (
                    <><Icon icon="lucide:loader-circle" className="w-4 h-4 animate-spin" /> Guardando...</>
                  ) : (
                    <><Icon icon="lucide:save" className="w-4 h-4" /> {editMode ? "Actualizar" : "Guardar tarifario"}</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal fila ── */}
      {filaModal && (
        <FilaModal
          fila={filaModal.fila}
          catalog={filaCatalogForModal}
          disabled={!canEdit}
          onSave={handleFilaSave}
          onClose={() => setFilaModal(null)}
        />
      )}

      {/* ── Confirm delete ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3">
              <span className="p-2 rounded-full bg-red-100">
                <Icon icon="lucide:trash-2" className="w-5 h-5 text-red-500" />
              </span>
              <h3 className="font-semibold text-neutral-800">Eliminar tarifario</h3>
            </div>
            <p className="text-sm text-neutral-600 mb-5">
              ¿Eliminar el tarifario de <strong>{confirmDelete.cliente}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-neutral-600 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50">
                Cancelar
              </button>
              <button onClick={() => void handleDelete(confirmDelete.id)} className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
