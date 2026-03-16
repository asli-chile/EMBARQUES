import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { es } from "date-fns/locale";

type DbOperacion = {
  id: string;
  ingreso: string | null;
  semana: number | null;
  estado_operacion: string;
  cliente: string;
  naviera: string | null;
  monto_facturado: number | null;
  margen_real: number | null;
};

type FinanzasFilters = {
  fechaDesde: string;
  fechaHasta: string;
  cliente: string;
  estado: string;
};

type ResumenCliente = {
  cliente: string;
  totalFacturado: number;
  totalMargen: number;
  operaciones: number;
};

export function FinanzasContent() {
  const { t, locale } = useLocale();
  const { isCliente, empresaNombres, isLoading: authLoading } = useAuth();

  const tr =
    (t as { finanzasPage?: Record<string, string> }).finanzasPage ??
    {
      title: "Finanzas",
      subtitle: "Resumen financiero por operación: facturación, márgenes y estado de cobranza.",
      filters: "Filtros",
      dateFrom: "Fecha desde",
      dateTo: "Fecha hasta",
      client: "Cliente",
      state: "Estado",
      allClients: "Todos los clientes",
      allStates: "Todos los estados",
      applyFilters: "Aplicar filtros",
      clearFilters: "Limpiar",
      totalInvoiced: "Total facturado",
      totalMargin: "Total margen",
      avgMarginPerOp: "Margen promedio / op.",
      operationsWithBilling: "Ops. con facturación",
      byClient: "Resumen por cliente",
      tableClient: "Cliente",
      tableInvoiced: "Facturado",
      tableMargin: "Margen",
      tableState: "Estado",
      tableDate: "Fecha ingreso",
      noData: "No hay datos financieros para los filtros seleccionados.",
      export: "Exportar a Excel",
      exportFilename: "finanzas_operaciones.csv",
      loading: "Cargando finanzas…",
    };

  const [filters, setFilters] = useState<FinanzasFilters>({
    fechaDesde: "",
    fechaHasta: "",
    cliente: "",
    estado: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DbOperacion[]>([]);
  const [clientesOpts, setClientesOpts] = useState<string[]>([]);

  const ESTADOS_OPTS = [
    "PENDIENTE",
    "EN PROCESO",
    "EN TRÁNSITO",
    "ARRIBADO",
    "COMPLETADO",
    "CANCELADO",
    "ROLEADO",
  ] as const;

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!supabase || authLoading) return;
    setLoading(true);
    setError(null);

    let baseQuery = supabase
      .from("operaciones")
      .select("id, ingreso, semana, estado_operacion, cliente, naviera, monto_facturado, margen_real")
      .is("deleted_at", null);

    if (empresaNombres.length > 0) {
      baseQuery = baseQuery.in("cliente", empresaNombres);
    }

    const [opsRes, clientesRes] = await Promise.all([
      baseQuery.order("ingreso", { ascending: false }),
      supabase
        .from("operaciones")
        .select("cliente")
        .is("deleted_at", null)
        .not("cliente", "is", null),
    ]);

    if (opsRes.error) {
      setError(opsRes.error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const opsData = (opsRes.data ?? []) as DbOperacion[];
    setRows(opsData);

    const clientes = [
      ...new Set(
        (clientesRes.data ?? [])
          .map((r: { cliente: string | null }) => r.cliente)
          .filter((c): c is string => Boolean(c))
      ),
    ].sort((a, b) => a.localeCompare(b, locale === "es" ? "es" : undefined, { sensitivity: "base" }));

    setClientesOpts(clientes);
    setLoading(false);
  }, [supabase, authLoading, isCliente, empresaNombres, locale]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredRows = useMemo(() => {
    if (!rows.length) return [];
    const { fechaDesde, fechaHasta, cliente, estado } = filters;
    return rows.filter((r) => {
      if (estado && r.estado_operacion !== estado) return false;
      if (cliente && r.cliente !== cliente) return false;
      if (fechaDesde || fechaHasta) {
        if (!r.ingreso) return false;
        let date: Date;
        try {
          date = parseISO(r.ingreso);
        } catch {
          return false;
        }
        if (fechaDesde && isBefore(date, parseISO(fechaDesde))) return false;
        if (fechaHasta && isAfter(date, parseISO(fechaHasta))) return false;
      }
      return true;
    });
  }, [rows, filters]);

  const hasActiveFilters =
    filters.fechaDesde || filters.fechaHasta || filters.cliente || filters.estado;

  const kpis = useMemo(() => {
    if (!filteredRows.length) {
      return {
        totalFacturado: 0,
        totalMargen: 0,
        opsConFacturacion: 0,
        avgMargen: 0,
      };
    }
    const opsConFacturacion = filteredRows.filter(
      (r) => r.monto_facturado != null && r.monto_facturado > 0
    ).length;
    const totalFacturado = filteredRows.reduce((s, r) => s + (r.monto_facturado ?? 0), 0);
    const totalMargen = filteredRows.reduce((s, r) => s + (r.margen_real ?? 0), 0);
    const avgMargen = opsConFacturacion > 0 ? totalMargen / opsConFacturacion : 0;
    return {
      totalFacturado,
      totalMargen,
      opsConFacturacion,
      avgMargen,
    };
  }, [filteredRows]);

  const byClient: ResumenCliente[] = useMemo(() => {
    const map = new Map<string, ResumenCliente>();
    for (const r of filteredRows) {
      const key = r.cliente || "—";
      const current = map.get(key) ?? {
        cliente: key,
        totalFacturado: 0,
        totalMargen: 0,
        operaciones: 0,
      };
      current.operaciones += 1;
      current.totalFacturado += r.monto_facturado ?? 0;
      current.totalMargen += r.margen_real ?? 0;
      map.set(key, current);
    }
    return [...map.values()].sort((a, b) => b.totalFacturado - a.totalFacturado).slice(0, 10);
  }, [filteredRows]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(locale === "es" ? "es-CL" : "en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const handleClearFilters = () => {
    setFilters({ fechaDesde: "", fechaHasta: "", cliente: "", estado: "" });
  };

  const handleExport = () => {
    if (!filteredRows.length) return;
    const headers = [
      "id",
      "ingreso",
      "semana",
      "estado_operacion",
      "cliente",
      "naviera",
      "monto_facturado",
      "margen_real",
    ];
    const csvLines = [
      headers.join(";"),
      ...filteredRows.map((r) =>
        [
          r.id,
          r.ingreso ? format(parseISO(r.ingreso), "yyyy-MM-dd") : "",
          r.semana ?? "",
          r.estado_operacion,
          r.cliente,
          r.naviera ?? "",
          r.monto_facturado ?? "",
          r.margen_real ?? "",
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(";")
      ),
    ].join("\r\n");
    const blob = new Blob([csvLines], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = tr.exportFilename;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !rows.length) {
    return (
      <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto w-full py-3 sm:py-4 lg:py-5 px-0">
        <div className="w-full min-w-0 space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-neutral-200 rounded-lg" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-neutral-200 p-3 h-20"
              />
            ))}
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 h-64" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto w-full py-3 sm:py-4 lg:py-5 px-0" role="main">
      <div className="w-full min-w-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-brand-blue tracking-tight">
              {tr.title}
            </h1>
            <p className="text-neutral-500 text-xs sm:text-sm mt-1">{tr.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={!filteredRows.length}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:ring-offset-2"
            >
              <Icon icon="lucide:download" width={16} height={16} />
              {tr.export}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-3 sm:p-4 shadow-mac-modal">
          <div className="flex items-center justify-between w-full text-left text-sm font-medium text-neutral-700">
            <span className="flex items-center gap-2">
              <Icon icon="typcn:filter" width={18} height={18} />
              {tr.filters}
              {hasActiveFilters && (
                <span className="px-1.5 py-0.5 text-xs bg-brand-blue/10 text-brand-blue rounded">
                  {[filters.fechaDesde, filters.fechaHasta, filters.cliente, filters.estado].filter(
                    Boolean
                  ).length}
                </span>
              )}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                {tr.dateFrom}
              </label>
              <input
                type="date"
                value={filters.fechaDesde}
                onChange={(e) => setFilters((f) => ({ ...f, fechaDesde: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-neutral-200 bg-white text-brand-blue placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                {tr.dateTo}
              </label>
              <input
                type="date"
                value={filters.fechaHasta}
                onChange={(e) => setFilters((f) => ({ ...f, fechaHasta: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-neutral-200 bg-white text-brand-blue placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                {tr.client}
              </label>
              <select
                value={filters.cliente}
                onChange={(e) => setFilters((f) => ({ ...f, cliente: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-neutral-200 bg-white focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
              >
                <option value="">{tr.allClients}</option>
                {clientesOpts.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                {tr.state}
              </label>
              <select
                value={filters.estado}
                onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-neutral-200 bg-white focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
              >
                <option value="">{tr.allStates}</option>
                {ESTADOS_OPTS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3 py-1.5 text-xs sm:text-sm font-medium text-neutral-600 hover:text-brand-blue transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30 rounded-lg"
              >
                {tr.clearFilters}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-white rounded-xl border border-neutral-200 border-t-2 border-t-emerald-400 p-3 sm:p-4 shadow-mac-modal transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
            <p className="text-xs sm:text-sm text-neutral-500">{tr.totalInvoiced}</p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">
              {formatCurrency(kpis.totalFacturado)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 border-t-2 border-t-teal-400 p-3 sm:p-4 shadow-mac-modal transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
            <p className="text-xs sm:text-sm text-neutral-500">{tr.totalMargin}</p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-700 mt-1">
              {formatCurrency(kpis.totalMargen)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 border-t-2 border-t-blue-400 p-3 sm:p-4 shadow-mac-modal transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
            <p className="text-xs sm:text-sm text-neutral-500">{tr.avgMarginPerOp}</p>
            <p className="text-2xl sm:text-3xl font-bold text-neutral-800 mt-1">
              {formatCurrency(kpis.avgMargen)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 border-t-2 border-t-slate-400 p-3 sm:p-4 shadow-mac-modal transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
            <p className="text-xs sm:text-sm text-neutral-500">{tr.operationsWithBilling}</p>
            <p className="text-2xl sm:text-3xl font-bold text-neutral-800 mt-1">
              {kpis.opsConFacturacion}
            </p>
          </div>
        </div>

        {!filteredRows.length ? (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-mac-modal p-8 text-center">
            <Icon
              icon="typcn:calculator"
              width={40}
              height={40}
              className="mx-auto mb-4 text-neutral-300"
            />
            <p className="text-neutral-600 text-sm">{tr.noData}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 shadow-mac-modal overflow-hidden">
              <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-neutral-100 bg-neutral-50/50 overflow-x-auto rounded-t-xl">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      <th className="pb-2 pr-2">{tr.tableClient}</th>
                      <th className="pb-2 pr-2">{tr.tableDate}</th>
                      <th className="pb-2 pr-2">{tr.tableState}</th>
                      <th className="pb-2 pr-2 text-right">{tr.tableInvoiced}</th>
                      <th className="pb-2 text-right">{tr.tableMargin}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredRows.slice(0, 15).map((r) => (
                      <tr
                        key={r.id}
                        className="text-neutral-700 hover:bg-neutral-50/80 transition-colors"
                      >
                        <td className="py-2 pr-2 truncate max-w-[120px]">{r.cliente || "—"}</td>
                        <td className="py-2 pr-2 whitespace-nowrap">
                          {r.ingreso
                            ? format(parseISO(r.ingreso), "dd/MM/yyyy", {
                                locale: locale === "es" ? es : undefined,
                              })
                            : "—"}
                        </td>
                        <td className="py-2 pr-2">{r.estado_operacion || "—"}</td>
                        <td className="py-2 pr-2 text-right font-medium text-emerald-600">
                          {formatCurrency(r.monto_facturado ?? 0)}
                        </td>
                        <td className="py-2 text-right font-medium text-neutral-800">
                          {formatCurrency(r.margen_real ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 shadow-mac-modal overflow-hidden">
              <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-neutral-100 bg-neutral-50/50 rounded-t-xl">
                <h2 className="font-semibold text-neutral-800 flex items-center gap-2 text-sm sm:text-base">
                  <span className="w-1 h-4 bg-emerald-500 rounded-full flex-shrink-0" />
                  <Icon icon="lucide:building" width={16} height={16} className="text-brand-blue" />
                  {tr.byClient}
                </h2>
              </div>
              <div className="p-3 sm:p-4">
                <div className="space-y-1.5 sm:space-y-2">
                  {byClient.map((item) => {
                    const max = byClient[0]?.totalFacturado || 1;
                    const percentage = max > 0 ? (item.totalFacturado / max) * 100 : 0;
                    return (
                      <div key={item.cliente} className="space-y-1">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-neutral-700 truncate max-w-[60%]">
                            {item.cliente}
                          </span>
                          <span className="font-medium text-neutral-800">
                            {formatCurrency(item.totalFacturado)}
                          </span>
                        </div>
                        <div className="h-1.5 sm:h-2 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-blue/60 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="text-[10px] sm:text-xs text-neutral-500">
                          {item.operaciones} ops · Margen {formatCurrency(item.totalMargen)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}
      </div>
    </main>
  );
}
