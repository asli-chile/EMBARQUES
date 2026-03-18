"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
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

export function FacturasTransporteContent() {
  const { isCliente, empresaNombres } = useAuth();
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterCliente, setFilterCliente] = useState("all");
  const [filterEstado, setFilterEstado] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showAll, setShowAll] = useState(false);

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
      ["Ref ASLI", "Cliente", "N° Factura ASLI", "Factura Transporte", "Monto", "Moneda", "T/C", "Margen Est.", "Margen Real", "Naviera", "Booking", "Contenedor", "Transporte", "Entrega Factura", "Pago Cliente", "Pago Transporte", "Concepto"],
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
    XLSX.utils.book_append_sheet(wb, ws, "Facturas Transporte");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Facturas_Transporte_${format(new Date(), "yyyyMMdd")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const estadoColor: Record<string, string> = {
    abierta: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cerrada: "bg-neutral-100 text-neutral-500 border-neutral-200",
    pendiente: "bg-amber-50 text-amber-700 border-amber-200",
    cancelada: "bg-red-50 text-red-600 border-red-200",
  };

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Facturas de Transporte</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Registro y seguimiento de facturación por operación</p>
          </div>
          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors"
          >
            <Icon icon="lucide:table-2" width={16} height={16} />
            Exportar Excel
          </button>
        </div>

        {/* Resumen totales */}
        {totalesPorMoneda.size > 0 && (
          <div className="flex flex-wrap gap-3">
            {Array.from(totalesPorMoneda.entries()).map(([moneda, total]) => (
              <div key={moneda} className="bg-white border border-brand-blue/20 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-sm">
                <div className="w-8 h-8 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                  <Icon icon="lucide:dollar-sign" className="w-4 h-4 text-brand-blue" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Total {moneda}</p>
                  <p className="text-base font-bold text-brand-blue">
                    {total.toLocaleString("es-CL", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))}
            <div className="bg-white border border-neutral-200 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center">
                <Icon icon="lucide:receipt" className="w-4 h-4 text-neutral-500" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Facturas</p>
                <p className="text-base font-bold text-neutral-800">{filtered.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar ref, cliente, factura, booking..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-neutral-200 bg-neutral-50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all"
            />
          </div>
          {!isCliente && (
            <select
              value={filterCliente}
              onChange={(e) => setFilterCliente(e.target.value)}
              className="px-3 py-2 border border-neutral-200 bg-neutral-50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
            >
              <option value="all">Todos los clientes</option>
              {clientes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="px-3 py-2 border border-neutral-200 bg-neutral-50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
          >
            <option value="all">Todos los estados</option>
            <option value="abierta">Abierta</option>
            <option value="cerrada">Cerrada</option>
            <option value="pendiente">Pendiente</option>
            <option value="cancelada">Cancelada</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-neutral-200 bg-neutral-50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
            title="Desde (entrega factura)"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-neutral-200 bg-neutral-50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
            title="Hasta (entrega factura)"
          />
          <label className="flex items-center gap-2 text-xs text-neutral-600 cursor-pointer px-2 py-1 rounded-lg hover:bg-neutral-50">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="w-3.5 h-3.5 accent-brand-blue" />
            Ver todas (sin filtrar por factura)
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
              <p className="text-neutral-500 font-semibold text-sm">Sin facturas registradas</p>
              <p className="text-neutral-400 text-xs mt-1">Registra facturas en la sección de Facturación de Transporte.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50">
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Ref</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Cliente</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">N° Factura ASLI</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Fact. Transporte</th>
                    <th className="text-right px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Monto</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider hidden md:table-cell">Transporte</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider hidden lg:table-cell">Entrega</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider hidden lg:table-cell">Pago cliente</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider hidden xl:table-cell">Pago transporte</th>
                    <th className="text-center px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Estado</th>
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
                      <td className="px-4 py-3 text-xs text-neutral-600 hidden md:table-cell">{f.transporte || "—"}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {f.fecha_entrega_factura ? (
                          <span className="text-xs text-neutral-700">{fmtDate(f.fecha_entrega_factura)}</span>
                        ) : <span className="text-neutral-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {f.fecha_pago_cliente ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                            <Icon icon="lucide:check" width={11} />{fmtDate(f.fecha_pago_cliente)}
                          </span>
                        ) : <span className="text-amber-500 text-xs flex items-center gap-1"><Icon icon="lucide:clock" width={11} />Pendiente</span>}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        {f.fecha_pago_transporte ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                            <Icon icon="lucide:check" width={11} />{fmtDate(f.fecha_pago_transporte)}
                          </span>
                        ) : <span className="text-amber-500 text-xs flex items-center gap-1"><Icon icon="lucide:clock" width={11} />Pendiente</span>}
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${estadoColor[f.estado_operacion] ?? "bg-neutral-100 text-neutral-500 border-neutral-200"}`}>
                          {f.estado_operacion}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
