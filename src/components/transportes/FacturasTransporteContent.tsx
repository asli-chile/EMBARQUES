"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import {
  ESTADO_META,
  estadosEnOrden,
  etiquetaEstado,
  normalizarEstado,
  type GrupoEstado,
} from "@/lib/operaciones/estados";
import { aplicarFiltroTemporada } from "@/lib/temporadas";
import { useTemporadaActiva } from "@/lib/useTemporadaActiva";
import { useNeonTheme } from "@/lib/ui/neonTheme";

type Factura = {
  id: string;
  ref_asli: string | null;
  correlativo: number;
  cliente: string;
  naviera: string | null;
  nave: string | null;
  booking: string | null;
  pod: string | null;
  etd: string | null;
  contenedor: string | null;
  transporte: string | null;
  numero_factura_asli: string | null;
  factura_transporte: string | null;
  monto_facturado: number | null;
  moneda: string | null;
  tipo_cambio: number | null;
  margen_estimado: number | null;
  margen_real: number | null;
  concepto_facturado: string | null;
  fecha_entrega_factura: string | null;
  fecha_pago_cliente: string | null;
  fecha_pago_transporte: string | null;
  estado_operacion: string;
};

function fmtRef(f: Factura) {
  return f.ref_asli || `A${String(f.correlativo).padStart(5, "0")}`;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yyyy");
}

function fmtMonto(m: number | null, moneda: string | null) {
  if (m == null) return "—";
  return `${moneda || ""} ${m.toLocaleString("es-CL", { minimumFractionDigits: 2 })}`.trim();
}

const FACTURA_FIELDS_TO_CLEAR = {
  numero_factura_asli: null,
  factura_transporte: null,
  monto_facturado: null,
  concepto_facturado: null,
  moneda: null,
  tipo_cambio: null,
  margen_estimado: null,
  margen_real: null,
  fecha_entrega_factura: null,
  fecha_pago_cliente: null,
  fecha_pago_transporte: null,
};

export function FacturasTransporteContent() {
  const { isCliente, empresaNombres } = useAuth();
  const { t } = useLocale();
  const [theme] = useNeonTheme();
  const tr = t.facturasTransporte;
  const { temporadaActiva, temporadaLoading } = useTemporadaActiva();
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterCliente, setFilterCliente] = useState("all");
  const [filterEstado, setFilterEstado] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Factura | null>(null);
  const [deleting, setDeleting] = useState(false);

  const supabase = useMemo(() => createClient(), []);
  const empresasKey = useMemo(() => empresaNombres.join(","), [empresaNombres]);

  const fetchData = useCallback(async () => {
    if (temporadaLoading) return;
    setLoading(true);
    let query = supabase
      .from("operaciones")
      .select(
        "id, ref_asli, correlativo, cliente, naviera, nave, booking, pod, etd, contenedor, transporte, numero_factura_asli, factura_transporte, monto_facturado, moneda, tipo_cambio, margen_estimado, margen_real, concepto_facturado, fecha_entrega_factura, fecha_pago_cliente, fecha_pago_transporte, estado_operacion"
      )
      .order("correlativo", { ascending: false });

    if (!showAll) {
      query = query.not("numero_factura_asli", "is", null).neq("numero_factura_asli", "");
    }

    if (isCliente && empresaNombres?.length) {
      query = query.in("cliente", empresaNombres);
    }
    query = aplicarFiltroTemporada(query, temporadaActiva);

    const { data } = await query;
    setFacturas(data ?? []);
    setLoading(false);
  }, [supabase, showAll, isCliente, empresasKey, temporadaLoading, temporadaActiva]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const clientes = useMemo(() => {
    const set = new Set(facturas.map((f) => f.cliente).filter(Boolean));
    return Array.from(set).sort();
  }, [facturas]);

  const filtered = useMemo(() => {
    return facturas.filter((f) => {
      if (filterCliente !== "all" && f.cliente !== filterCliente) return false;
      if (filterEstado !== "all" && f.estado_operacion !== filterEstado) return false;
      if (dateFrom && f.fecha_entrega_factura && f.fecha_entrega_factura < dateFrom) return false;
      if (dateTo && f.fecha_entrega_factura && f.fecha_entrega_factura > dateTo) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          fmtRef(f).toLowerCase().includes(q) ||
          f.cliente.toLowerCase().includes(q) ||
          (f.numero_factura_asli ?? "").toLowerCase().includes(q) ||
          (f.booking ?? "").toLowerCase().includes(q) ||
          (f.transporte ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [facturas, filterCliente, filterEstado, dateFrom, dateTo, search]);

  const totalesPorMoneda = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((f) => {
      if (f.monto_facturado == null) return;
      const key = f.moneda || "—";
      map.set(key, (map.get(key) ?? 0) + f.monto_facturado);
    });
    return map;
  }, [filtered]);

  function exportExcel() {
    const rows = [
      [
        tr.excelColRefAsli,
        tr.excelColCliente,
        tr.excelColFacturaAsli,
        tr.excelColFacturaTransporte,
        tr.excelColMonto,
        tr.excelColMoneda,
        tr.excelColTipoCambio,
        tr.excelColMargenEstimado,
        tr.excelColMargenReal,
        tr.excelColNaviera,
        tr.excelColBooking,
        tr.excelColContenedor,
        tr.excelColTransporte,
        tr.excelColEntregaFactura,
        tr.excelColPagoCliente,
        tr.excelColPagoTransporte,
        tr.excelColConcepto,
      ],
      ...filtered.map((f) => [
        fmtRef(f), f.cliente, f.numero_factura_asli ?? "", f.factura_transporte ?? "",
        f.monto_facturado ?? "", f.moneda ?? "", f.tipo_cambio ?? "",
        f.margen_estimado ?? "", f.margen_real ?? "",
        f.naviera ?? "", f.booking ?? "", f.contenedor ?? "", f.transporte ?? "",
        fmtDate(f.fecha_entrega_factura), fmtDate(f.fecha_pago_cliente), fmtDate(f.fecha_pago_transporte),
        f.concepto_facturado ?? "",
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [16, 20, 18, 18, 14, 8, 8, 14, 14, 14, 14, 14, 20, 14, 14, 14, 30].map((wch) => ({ wch }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tr.excelSheetName);
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tr.excelFilePrefix}_${format(new Date(), "yyyyMMdd")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("operaciones")
      .update(FACTURA_FIELDS_TO_CLEAR)
      .eq("id", deleteTarget.id);
    setDeleting(false);
    if (!error) {
      setDeleteTarget(null);
      void fetchData();
    }
  }, [deleteTarget, supabase, fetchData]);

  const inputClass =
    "dash-control min-h-[2.6rem] px-3.5 py-2.5 text-base font-semibold text-dash-fg placeholder:text-dash-muted focus:outline-none focus:ring-2 focus:ring-dash-neon/40";
  const cardAccent = <div className="h-[3px] bg-gradient-to-r from-dash-neon to-dash-neon-hot" />;

  const estadoColor: Record<GrupoEstado, string> = {
    COMERCIAL: "bg-amber-500/15 text-dash-fg border-amber-400/35",
    COORDINACION: "bg-blue-500/15 text-dash-fg border-blue-400/35",
    TRANSITO: "bg-violet-500/15 text-dash-fg border-violet-400/35",
    DOCUMENTAL: "bg-emerald-500/15 text-dash-fg border-emerald-400/35",
    CIERRE: "bg-dash-control text-dash-muted border-dash-border",
    EXCEPCION: "bg-red-500/15 text-dash-fg border-red-400/35",
  };

  const estadoBadgeClass = (estado: string | null) => {
    const codigo = normalizarEstado(estado);
    return codigo
      ? estadoColor[ESTADO_META[codigo].grupo]
      : "bg-dash-control text-dash-muted border-dash-border";
  };

  return (
    <>
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
                  <Icon icon="lucide:receipt" width={22} height={22} className="text-dash-neon" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-bold tracking-tight text-dash-fg sm:text-xl">{tr.title}</h1>
                  <p className="mt-0.5 line-clamp-1 text-xs text-dash-muted sm:text-sm">{tr.subtitle}</p>
                </div>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {Array.from(totalesPorMoneda.entries()).map(([moneda, total]) => (
                  <div key={moneda} className="inline-flex items-center gap-1.5 rounded-lg border border-dash-neon/35 bg-dash-neon/15 px-3 py-1.5 text-sm font-bold text-dash-fg">
                    <Icon icon="lucide:dollar-sign" width={13} height={13} className="text-dash-neon" />
                    <span>{moneda} {total.toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                ))}
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-dash-control px-3 py-1.5 text-sm font-bold text-dash-fg">
                  <Icon icon="lucide:file-text" width={13} height={13} className="text-dash-muted" />
                  <span>{filtered.length} {filtered.length !== 1 ? tr.facturas : tr.factura}</span>
                </div>
                <button
                  type="button"
                  onClick={exportExcel}
                  className="dash-cta inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold"
                >
                  <Icon icon="lucide:table-2" width={14} height={14} />
                  <span className="hidden sm:inline">{tr.exportExcel}</span>
                  <span className="sm:hidden">{tr.exportExcelShort}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="relative z-10 mx-auto w-full max-w-[1600px] space-y-4 p-3 sm:p-4 lg:p-5">
            {/* Filtros */}
            <div className="dash-card overflow-hidden rounded-xl p-3 sm:p-4 flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[180px]">
                <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dash-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder={tr.searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`${inputClass} w-full pl-9`}
                />
              </div>
              {!isCliente && (
                <select
                  value={filterCliente}
                  onChange={(e) => setFilterCliente(e.target.value)}
                  className={`${inputClass} min-w-[140px]`}
                >
                  <option value="all">{tr.allClients}</option>
                  {clientes.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className={`${inputClass} min-w-[130px]`}
              >
                <option value="all">{tr.allStates}</option>
                {estadosEnOrden().map((e) => (
                  <option key={e} value={e}>{etiquetaEstado(e)}</option>
                ))}
              </select>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={inputClass}
                title={tr.dateFromTitle}
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={inputClass}
                title={tr.dateToTitle}
              />
              <label className="flex items-center gap-2 text-base text-dash-muted cursor-pointer px-2 py-1.5 rounded-lg hover:bg-dash-neon/10">
                <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="w-3.5 h-3.5 accent-[var(--dash-neon)]" />
                {tr.showAll}
              </label>
            </div>

            {/* Tabla */}
            <div className="dash-card overflow-hidden rounded-xl">
              {cardAccent}
              {loading ? (
                <div className="py-20 flex items-center justify-center">
                  <Icon icon="typcn:refresh" className="w-6 h-6 text-dash-neon animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-14 h-14 rounded-xl border border-dash-border bg-dash-control flex items-center justify-center mx-auto mb-3">
                    <Icon icon="lucide:receipt" width={24} height={24} className="text-dash-muted" />
                  </div>
                  <p className="text-dash-fg font-semibold text-base">{tr.noFacturas}</p>
                  <p className="text-dash-muted text-base mt-1">{tr.noFacturasHint}</p>
                </div>
              ) : (
                <>
                  {/* ── Cards móvil (< md) ── */}
                  <div className="md:hidden divide-y divide-dash-border">
                    {filtered.map((f) => (
                      <div key={f.id} className="p-4 hover:bg-dash-neon/10 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base text-dash-neon">{fmtRef(f)}</span>
                            {f.numero_factura_asli && (
                              <span className="px-2 py-0.5 rounded-lg bg-dash-neon/15 border border-dash-neon/35 text-dash-fg text-sm font-bold">
                                {f.numero_factura_asli}
                              </span>
                            )}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-sm font-semibold border ${estadoBadgeClass(f.estado_operacion)}`}>
                              {etiquetaEstado(f.estado_operacion)}
                            </span>
                          </div>
                          {!isCliente && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(f)}
                              className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg text-dash-muted hover:text-red-300 hover:bg-red-500/15 transition-colors"
                              title={tr.deleteTitle}
                            >
                              <Icon icon="lucide:trash-2" width={14} height={14} />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div>
                            <p className="text-base font-semibold text-dash-fg">{f.cliente}</p>
                            {f.naviera && <p className="text-sm text-dash-muted">{f.naviera}{f.booking ? ` · ${f.booking}` : ""}</p>}
                          </div>
                          <div className="text-right flex-shrink-0">
                            {f.monto_facturado != null ? (
                              <p className="font-bold text-base text-dash-fg">{fmtMonto(f.monto_facturado, f.moneda)}</p>
                            ) : <p className="text-dash-muted text-sm">{tr.noAmount}</p>}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 pt-2 border-t border-dash-border">
                          {f.factura_transporte && (
                            <span className="text-sm text-dash-muted">
                              <span className="font-medium text-dash-fg">{tr.cardFactTransp}</span> {f.factura_transporte}
                            </span>
                          )}
                          {f.transporte && (
                            <span className="text-sm text-dash-muted">
                              <span className="font-medium text-dash-fg">{tr.cardTransporte}</span> {f.transporte}
                            </span>
                          )}
                          {f.fecha_entrega_factura && (
                            <span className="text-sm text-dash-muted">
                              <span className="font-medium text-dash-fg">{tr.cardEntrega}</span> {fmtDate(f.fecha_entrega_factura)}
                            </span>
                          )}
                          <span className={`text-sm flex items-center gap-1 ${f.fecha_pago_cliente ? "text-emerald-400" : "text-amber-400"}`}>
                            <Icon icon={f.fecha_pago_cliente ? "lucide:check-circle" : "lucide:clock"} width={10} />
                            {f.fecha_pago_cliente ? `${tr.cardPagoCliente} ${fmtDate(f.fecha_pago_cliente)}` : tr.cardPagoClientePending}
                          </span>
                          <span className={`text-sm flex items-center gap-1 ${f.fecha_pago_transporte ? "text-emerald-400" : "text-amber-400"}`}>
                            <Icon icon={f.fecha_pago_transporte ? "lucide:check-circle" : "lucide:clock"} width={10} />
                            {f.fecha_pago_transporte ? `${tr.cardPagoTransp} ${fmtDate(f.fecha_pago_transporte)}` : tr.cardPagoTranspPending}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── Tabla desktop (≥ md) ── */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-base">
                      <thead>
                        <tr className="border-b border-dash-border bg-[color-mix(in_srgb,var(--dash-control)_92%,transparent)]">
                          <th className="text-left px-4 py-3 text-sm font-bold text-dash-neon">{tr.colRef}</th>
                          <th className="text-left px-4 py-3 text-sm font-bold text-dash-neon">{tr.colCliente}</th>
                          <th className="text-left px-4 py-3 text-sm font-bold text-dash-neon">{tr.colFacturaAsli}</th>
                          <th className="text-left px-4 py-3 text-sm font-bold text-dash-neon">{tr.colFactTransporte}</th>
                          <th className="text-right px-4 py-3 text-sm font-bold text-dash-neon">{tr.colMonto}</th>
                          <th className="text-left px-4 py-3 text-sm font-bold text-dash-neon hidden lg:table-cell">{tr.colTransporte}</th>
                          <th className="text-left px-4 py-3 text-sm font-bold text-dash-neon hidden lg:table-cell">{tr.colEntrega}</th>
                          <th className="text-left px-4 py-3 text-sm font-bold text-dash-neon hidden xl:table-cell">{tr.colPagoCliente}</th>
                          <th className="text-left px-4 py-3 text-sm font-bold text-dash-neon hidden xl:table-cell">{tr.colPagoTransporte}</th>
                          <th className="text-center px-4 py-3 text-sm font-bold text-dash-neon">{tr.colEstado}</th>
                          {!isCliente && <th className="px-3 py-3 w-12" />}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dash-border">
                        {filtered.map((f) => (
                          <tr key={f.id} className="hover:bg-dash-neon/10 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-bold text-base text-dash-neon">{fmtRef(f)}</p>
                              {f.booking && <p className="text-sm text-dash-muted mt-0.5">{f.booking}</p>}
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-base font-semibold text-dash-fg">{f.cliente}</p>
                              {f.naviera && <p className="text-sm text-dash-muted">{f.naviera}</p>}
                            </td>
                            <td className="px-4 py-3">
                              {f.numero_factura_asli ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-dash-neon/15 border border-dash-neon/35 text-dash-fg text-sm font-bold">
                                  {f.numero_factura_asli}
                                </span>
                              ) : <span className="text-dash-muted text-sm">—</span>}
                            </td>
                            <td className="px-4 py-3 text-base text-dash-muted">{f.factura_transporte || "—"}</td>
                            <td className="px-4 py-3 text-right">
                              {f.monto_facturado != null ? (
                                <span className="font-bold text-base text-dash-fg">{fmtMonto(f.monto_facturado, f.moneda)}</span>
                              ) : <span className="text-dash-muted text-sm">—</span>}
                            </td>
                            <td className="px-4 py-3 text-base text-dash-muted hidden lg:table-cell">{f.transporte || "—"}</td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                              {f.fecha_entrega_factura ? <span className="text-base text-dash-fg">{fmtDate(f.fecha_entrega_factura)}</span> : <span className="text-dash-muted text-sm">—</span>}
                            </td>
                            <td className="px-4 py-3 hidden xl:table-cell">
                              {f.fecha_pago_cliente ? (
                                <span className="inline-flex items-center gap-1 text-base text-emerald-400"><Icon icon="lucide:check" width={11} />{fmtDate(f.fecha_pago_cliente)}</span>
                              ) : <span className="text-amber-400 text-base flex items-center gap-1"><Icon icon="lucide:clock" width={11} />{tr.pendiente}</span>}
                            </td>
                            <td className="px-4 py-3 hidden xl:table-cell">
                              {f.fecha_pago_transporte ? (
                                <span className="inline-flex items-center gap-1 text-base text-emerald-400"><Icon icon="lucide:check" width={11} />{fmtDate(f.fecha_pago_transporte)}</span>
                              ) : <span className="text-amber-400 text-base flex items-center gap-1"><Icon icon="lucide:clock" width={11} />{tr.pendiente}</span>}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-sm font-semibold border ${estadoBadgeClass(f.estado_operacion)}`}>
                                {etiquetaEstado(f.estado_operacion)}
                              </span>
                            </td>
                            {!isCliente && (
                              <td className="px-3 py-3 text-center">
                                <button type="button" onClick={() => setDeleteTarget(f)} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-dash-muted hover:text-red-300 hover:bg-red-500/15 border border-transparent hover:border-red-400/35 transition-all" title={tr.deleteTitle}>
                                  <Icon icon="lucide:trash-2" width={14} height={14} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Modal de confirmación de borrado */}
      {deleteTarget && (
        <div className="dash-neon fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-theme={theme}>
          <div className="dash-card w-full max-w-md rounded-xl p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-400/35 flex items-center justify-center flex-shrink-0">
                <Icon icon="lucide:alert-triangle" width={20} height={20} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-dash-fg">{tr.deleteTitle}</h3>
                <p className="text-base text-dash-muted mt-1.5 leading-relaxed">
                  {tr.deleteConfirmMsg}{" "}
                  <span className="font-bold text-dash-neon">{fmtRef(deleteTarget)}</span>
                  {deleteTarget.numero_factura_asli && (
                    <> ({tr.deleteConfirmFact} <span className="font-bold text-dash-fg">{deleteTarget.numero_factura_asli}</span>)</>
                  )}
                  {tr.deleteConfirmEnd}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="dash-control px-4 py-2.5 text-base font-semibold text-dash-fg"
              >
                {tr.cancel}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-base font-semibold text-red-300 bg-red-500/15 border border-red-400/35 rounded-lg hover:bg-red-500/25 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <Icon icon="typcn:refresh" width={14} height={14} className="animate-spin" />
                ) : (
                  <Icon icon="lucide:trash-2" width={14} height={14} />
                )}
                {deleting ? tr.deleting : tr.deleteTitle}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
