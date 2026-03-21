"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { format } from "date-fns";
import * as XLSX from "xlsx";

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

function getEstadoLabel(
  estado: string,
  tr: {
    stateAbierta: string;
    stateCerrada: string;
    statePendiente: string;
    stateCancelada: string;
    stateEnProceso: string;
    stateEnTransito: string;
    stateArribado: string;
    stateCompletado: string;
    stateRoleado: string;
  },
) {
  const normalized = (estado || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (normalized === "abierta") return tr.stateAbierta;
  if (normalized === "cerrada") return tr.stateCerrada;
  if (normalized === "pendiente") return tr.statePendiente;
  if (normalized === "cancelada") return tr.stateCancelada;
  if (normalized === "en proceso") return tr.stateEnProceso;
  if (normalized === "en transito") return tr.stateEnTransito;
  if (normalized === "arribado") return tr.stateArribado;
  if (normalized === "completado") return tr.stateCompletado;
  if (normalized === "roleado") return tr.stateRoleado;
  return estado;
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
  const tr = t.facturasTransporte;
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

    const { data } = await query;
    setFacturas(data ?? []);
    setLoading(false);
  }, [supabase, showAll, isCliente, empresasKey]);

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

  const estadoColor: Record<string, string> = {
    abierta: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cerrada: "bg-neutral-100 text-neutral-500 border-neutral-200",
    pendiente: "bg-amber-50 text-amber-700 border-amber-200",
    cancelada: "bg-red-50 text-red-600 border-red-200",
    "en proceso": "bg-blue-50 text-blue-700 border-blue-200",
    "en transito": "bg-violet-50 text-violet-700 border-violet-200",
    arribado: "bg-emerald-50 text-emerald-700 border-emerald-200",
    completado: "bg-neutral-100 text-neutral-600 border-neutral-200",
    roleado: "bg-orange-50 text-orange-700 border-orange-200",
  };

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-blue via-brand-blue/90 to-emerald-700 text-white overflow-hidden shadow-sm">
          <div className="px-5 py-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Icon icon="lucide:receipt" width={22} height={22} className="text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight">{tr.title}</h1>
                <p className="text-xs text-white/70 mt-0.5">{tr.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {Array.from(totalesPorMoneda.entries()).map(([moneda, total]) => (
                <div key={moneda} className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
                  <Icon icon="lucide:dollar-sign" width={13} height={13} className="text-white/80" />
                  <span className="text-xs font-bold">{moneda} {total.toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
                <Icon icon="lucide:file-text" width={13} height={13} className="text-white/80" />
                <span className="text-xs font-bold">{filtered.length} {filtered.length !== 1 ? tr.facturas : tr.factura}</span>
              </div>
              <button
                onClick={exportExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-brand-blue hover:bg-white/90 transition-colors shadow-sm"
              >
                <Icon icon="lucide:table-2" width={14} height={14} />
                <span className="hidden sm:inline">{tr.exportExcel}</span>
                <span className="sm:hidden">{tr.exportExcelShort}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-3 sm:p-4 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder={tr.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-neutral-200 bg-neutral-50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all"
            />
          </div>
          {!isCliente && (
            <select
              value={filterCliente}
              onChange={(e) => setFilterCliente(e.target.value)}
              className="px-3 py-2 border border-neutral-200 bg-neutral-50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue min-w-[140px]"
            >
              <option value="all">{tr.allClients}</option>
              {clientes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="px-3 py-2 border border-neutral-200 bg-neutral-50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue min-w-[130px]"
          >
            <option value="all">{tr.allStates}</option>
            <option value="abierta">{tr.stateAbierta}</option>
            <option value="cerrada">{tr.stateCerrada}</option>
            <option value="pendiente">{tr.statePendiente}</option>
            <option value="cancelada">{tr.stateCancelada}</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-neutral-200 bg-neutral-50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
            title={tr.dateFromTitle}
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-neutral-200 bg-neutral-50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
            title={tr.dateToTitle}
          />
          <label className="flex items-center gap-2 text-xs text-neutral-600 cursor-pointer px-2 py-1.5 rounded-lg hover:bg-neutral-50">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="w-3.5 h-3.5 accent-brand-blue" />
            {tr.showAll}
          </label>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
          {loading ? (
            <div className="py-20 flex items-center justify-center">
              <Icon icon="typcn:refresh" className="w-6 h-6 text-brand-blue animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-3">
                <Icon icon="lucide:receipt" width={24} height={24} className="text-neutral-300" />
              </div>
              <p className="text-neutral-500 font-semibold text-sm">{tr.noFacturas}</p>
              <p className="text-neutral-400 text-xs mt-1">{tr.noFacturasHint}</p>
            </div>
          ) : (
            <>
              {/* ── Cards móvil (< md) ── */}
              <div className="md:hidden divide-y divide-neutral-100">
                {filtered.map((f) => (
                  <div key={f.id} className="p-4 hover:bg-neutral-50 transition-colors">
                    {/* Fila 1: Ref + estado + acciones */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-brand-blue">{fmtRef(f)}</span>
                        {f.numero_factura_asli && (
                          <span className="px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue text-[11px] font-bold">
                            {f.numero_factura_asli}
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${estadoColor[(f.estado_operacion || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()] ?? "bg-neutral-100 text-neutral-500 border-neutral-200"}`}>
                          {getEstadoLabel(f.estado_operacion, tr)}
                        </span>
                      </div>
                      {!isCliente && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(f)}
                          className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title={tr.deleteTitle}
                        >
                          <Icon icon="lucide:trash-2" width={14} height={14} />
                        </button>
                      )}
                    </div>

                    {/* Fila 2: cliente + monto */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div>
                        <p className="text-sm font-semibold text-neutral-800">{f.cliente}</p>
                        {f.naviera && <p className="text-[11px] text-neutral-400">{f.naviera}{f.booking ? ` · ${f.booking}` : ""}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {f.monto_facturado != null ? (
                          <p className="font-bold text-sm text-neutral-900">{fmtMonto(f.monto_facturado, f.moneda)}</p>
                        ) : <p className="text-neutral-300 text-xs">{tr.noAmount}</p>}
                      </div>
                    </div>

                    {/* Fila 3: detalles secundarios */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 pt-2 border-t border-neutral-100">
                      {f.factura_transporte && (
                        <span className="text-[11px] text-neutral-500">
                          <span className="font-medium text-neutral-600">{tr.cardFactTransp}</span> {f.factura_transporte}
                        </span>
                      )}
                      {f.transporte && (
                        <span className="text-[11px] text-neutral-500">
                          <span className="font-medium text-neutral-600">{tr.cardTransporte}</span> {f.transporte}
                        </span>
                      )}
                      {f.fecha_entrega_factura && (
                        <span className="text-[11px] text-neutral-500">
                          <span className="font-medium text-neutral-600">{tr.cardEntrega}</span> {fmtDate(f.fecha_entrega_factura)}
                        </span>
                      )}
                      <span className={`text-[11px] flex items-center gap-1 ${f.fecha_pago_cliente ? "text-emerald-600" : "text-amber-500"}`}>
                        <Icon icon={f.fecha_pago_cliente ? "lucide:check-circle" : "lucide:clock"} width={10} />
                        {f.fecha_pago_cliente ? `${tr.cardPagoCliente} ${fmtDate(f.fecha_pago_cliente)}` : tr.cardPagoClientePending}
                      </span>
                      <span className={`text-[11px] flex items-center gap-1 ${f.fecha_pago_transporte ? "text-emerald-600" : "text-amber-500"}`}>
                        <Icon icon={f.fecha_pago_transporte ? "lucide:check-circle" : "lucide:clock"} width={10} />
                        {f.fecha_pago_transporte ? `${tr.cardPagoTransp} ${fmtDate(f.fecha_pago_transporte)}` : tr.cardPagoTranspPending}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Tabla desktop (≥ md) ── */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50">
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">{tr.colRef}</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">{tr.colCliente}</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">{tr.colFacturaAsli}</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">{tr.colFactTransporte}</th>
                      <th className="text-right px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">{tr.colMonto}</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider hidden lg:table-cell">{tr.colTransporte}</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider hidden lg:table-cell">{tr.colEntrega}</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider hidden xl:table-cell">{tr.colPagoCliente}</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider hidden xl:table-cell">{tr.colPagoTransporte}</th>
                      <th className="text-center px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">{tr.colEstado}</th>
                      {!isCliente && <th className="px-3 py-3 w-12" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {filtered.map((f) => (
                      <tr key={f.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-xs text-brand-blue">{fmtRef(f)}</p>
                          {f.booking && <p className="text-[11px] text-neutral-400 mt-0.5">{f.booking}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold text-neutral-800">{f.cliente}</p>
                          {f.naviera && <p className="text-[11px] text-neutral-400">{f.naviera}</p>}
                        </td>
                        <td className="px-4 py-3">
                          {f.numero_factura_asli ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue text-[11px] font-bold">
                              {f.numero_factura_asli}
                            </span>
                          ) : <span className="text-neutral-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-600">{f.factura_transporte || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          {f.monto_facturado != null ? (
                            <span className="font-bold text-xs text-neutral-800">{fmtMonto(f.monto_facturado, f.moneda)}</span>
                          ) : <span className="text-neutral-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-600 hidden lg:table-cell">{f.transporte || "—"}</td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {f.fecha_entrega_factura ? <span className="text-xs">{fmtDate(f.fecha_entrega_factura)}</span> : <span className="text-neutral-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          {f.fecha_pago_cliente ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><Icon icon="lucide:check" width={11} />{fmtDate(f.fecha_pago_cliente)}</span>
                          ) : <span className="text-amber-500 text-xs flex items-center gap-1"><Icon icon="lucide:clock" width={11} />{tr.pendiente}</span>}
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          {f.fecha_pago_transporte ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><Icon icon="lucide:check" width={11} />{fmtDate(f.fecha_pago_transporte)}</span>
                          ) : <span className="text-amber-500 text-xs flex items-center gap-1"><Icon icon="lucide:clock" width={11} />{tr.pendiente}</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${estadoColor[(f.estado_operacion || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()] ?? "bg-neutral-100 text-neutral-500 border-neutral-200"}`}>
                            {getEstadoLabel(f.estado_operacion, tr)}
                          </span>
                        </td>
                        {!isCliente && (
                          <td className="px-3 py-3 text-center">
                            <button type="button" onClick={() => setDeleteTarget(f)} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all" title={tr.deleteTitle}>
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

      {/* Modal de confirmación de borrado */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl shadow-mac-modal border border-neutral-200 p-6 w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0">
                <Icon icon="lucide:alert-triangle" width={20} height={20} className="text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-neutral-900">{tr.deleteTitle}</h3>
                <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                  {tr.deleteConfirmMsg}{" "}
                  <span className="font-bold text-brand-blue">{fmtRef(deleteTarget)}</span>
                  {deleteTarget.numero_factura_asli && (
                    <> ({tr.deleteConfirmFact} <span className="font-bold">{deleteTarget.numero_factura_asli}</span>)</>
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
                className="px-4 py-2 text-xs font-semibold text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-xl hover:bg-neutral-200 transition-colors"
              >
                {tr.cancel}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 border border-red-700 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
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
    </main>
  );
}
