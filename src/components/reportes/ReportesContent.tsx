import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { format, parseISO, isAfter, isBefore } from "date-fns";

type DbOperacion = {
  id: string;
  ingreso: string | null;
  semana: number | null;
  estado_operacion: string;
  cliente: string;
  naviera: string | null;
  pallets: number | null;
  peso_neto: number | null;
  monto_facturado: number | null;
  margen_real: number | null;
};

type ReportesFilters = {
  fechaDesde: string;
  fechaHasta: string;
  estado: string;
  cliente: string;
  naviera: string;
};

type AggregateByKey = {
  key: string;
  totalOperaciones: number;
  totalPallets: number;
  totalPesoNeto: number;
  totalMontoFacturado: number;
  totalMargenReal: number;
};

const ESTADOS_OPTS = [
  "PENDIENTE",
  "EN PROCESO",
  "EN TRÁNSITO",
  "ARRIBADO",
  "COMPLETADO",
  "CANCELADO",
  "ROLEADO",
] as const;

export function ReportesContent() {
  const { t, locale } = useLocale();
  const { isCliente, empresaNombres, isLoading: authLoading } = useAuth();

  const tr =
    (t as any).reportesPage ??
    {
      title: "Reportes operacionales",
      subtitle: "Analiza tus operaciones por cliente, naviera, período y estado.",
      filters: "Filtros",
      dateFrom: "Fecha desde",
      dateTo: "Fecha hasta",
      state: "Estado",
      client: "Cliente",
      carrier: "Naviera",
      allStates: "Todos los estados",
      allClients: "Todos los clientes",
      allCarriers: "Todas las navieras",
      applyFilters: "Aplicar filtros",
      clearFilters: "Limpiar",
      totalOperations: "Operaciones",
      totalPallets: "Pallets",
      totalNetWeight: "Peso neto (kg)",
      totalInvoiced: "Monto facturado",
      totalMargin: "Margen real",
      byClient: "Top clientes por facturación",
      byCarrier: "Top navieras por facturación",
      noData: "No hay datos para los filtros seleccionados.",
      export: "Exportar a Excel",
      exportFilename: "reportes_operaciones.csv",
      tableClient: "Cliente",
      tableCarrier: "Naviera",
      tableOperations: "Ops",
      tableInvoiced: "Facturado",
      tableMargin: "Margen",
      loading: "Cargando reportes…",
    };

  const [filters, setFilters] = useState<ReportesFilters>({
    fechaDesde: "",
    fechaHasta: "",
    estado: "",
    cliente: "",
    naviera: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DbOperacion[]>([]);
  const [clientesOpts, setClientesOpts] = useState<string[]>([]);
  const [navierasOpts, setNavierasOpts] = useState<string[]>([]);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const loadCatalogsAndData = useCallback(async () => {
    if (!supabase || authLoading) return;
    setLoading(true);
    setError(null);

    let baseQuery = supabase
      .from("operaciones")
      .select(
        "id, ingreso, semana, estado_operacion, cliente, naviera, pallets, peso_neto, monto_facturado, margen_real"
      )
      .is("deleted_at", null);

    if (empresaNombres.length > 0) {
      baseQuery = baseQuery.in("cliente", empresaNombres);
    }

    let clientesQuery = supabase
      .from("operaciones")
      .select("cliente")
      .is("deleted_at", null)
      .not("cliente", "is", null);
    let navierasQuery = supabase
      .from("operaciones")
      .select("naviera")
      .is("deleted_at", null)
      .not("naviera", "is", null);
    if (empresaNombres.length > 0) {
      clientesQuery = clientesQuery.in("cliente", empresaNombres);
      navierasQuery = navierasQuery.in("cliente", empresaNombres);
    }
    const [opsRes, clientesRes, navierasRes] = await Promise.all([
      baseQuery.order("ingreso", { ascending: false }),
      clientesQuery,
      navierasQuery,
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

    const navieras = [
      ...new Set(
        (navierasRes.data ?? [])
          .map((r: { naviera: string | null }) => r.naviera)
          .filter((n): n is string => Boolean(n))
      ),
    ].sort((a, b) => a.localeCompare(b, locale === "es" ? "es" : undefined, { sensitivity: "base" }));

    setClientesOpts(clientes);
    setNavierasOpts(navieras);
    setLoading(false);
  }, [supabase, authLoading, empresaNombres, locale]);

  useEffect(() => {
    void loadCatalogsAndData();
  }, [loadCatalogsAndData]);

  const filteredRows = useMemo(() => {
    if (!rows.length) return [];
    const { fechaDesde, fechaHasta, estado, cliente, naviera } = filters;
    return rows.filter((r) => {
      if (estado && r.estado_operacion !== estado) return false;
      if (cliente && r.cliente !== cliente) return false;
      if (naviera && (r.naviera ?? "") !== naviera) return false;

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
    filters.fechaDesde || filters.fechaHasta || filters.estado || filters.cliente || filters.naviera;

  const kpis = useMemo(() => {
    if (!filteredRows.length) {
      return {
        totalOps: 0,
        totalPallets: 0,
        totalPesoNeto: 0,
        totalMontoFacturado: 0,
        totalMargenReal: 0,
      };
    }

    return filteredRows.reduce(
      (acc, r) => {
        acc.totalOps += 1;
        acc.totalPallets += r.pallets ?? 0;
        acc.totalPesoNeto += r.peso_neto ?? 0;
        acc.totalMontoFacturado += r.monto_facturado ?? 0;
        acc.totalMargenReal += r.margen_real ?? 0;
        return acc;
      },
      {
        totalOps: 0,
        totalPallets: 0,
        totalPesoNeto: 0,
        totalMontoFacturado: 0,
        totalMargenReal: 0,
      }
    );
  }, [filteredRows]);

  const byClient: AggregateByKey[] = useMemo(() => {
    const map = new Map<string, AggregateByKey>();
    for (const r of filteredRows) {
      const key = r.cliente || "—";
      const current = map.get(key) ?? {
        key,
        totalOperaciones: 0,
        totalPallets: 0,
        totalPesoNeto: 0,
        totalMontoFacturado: 0,
        totalMargenReal: 0,
      };
      current.totalOperaciones += 1;
      current.totalPallets += r.pallets ?? 0;
      current.totalPesoNeto += r.peso_neto ?? 0;
      current.totalMontoFacturado += r.monto_facturado ?? 0;
      current.totalMargenReal += r.margen_real ?? 0;
      map.set(key, current);
    }
    return [...map.values()].sort((a, b) => b.totalMontoFacturado - a.totalMontoFacturado).slice(0, 10);
  }, [filteredRows]);

  const byCarrier: AggregateByKey[] = useMemo(() => {
    const map = new Map<string, AggregateByKey>();
    for (const r of filteredRows) {
      const key = (r.naviera ?? "").trim() || "—";
      const current = map.get(key) ?? {
        key,
        totalOperaciones: 0,
        totalPallets: 0,
        totalPesoNeto: 0,
        totalMontoFacturado: 0,
        totalMargenReal: 0,
      };
      current.totalOperaciones += 1;
      current.totalPallets += r.pallets ?? 0;
      current.totalPesoNeto += r.peso_neto ?? 0;
      current.totalMontoFacturado += r.monto_facturado ?? 0;
      current.totalMargenReal += r.margen_real ?? 0;
      map.set(key, current);
    }
    return [...map.values()].sort((a, b) => b.totalMontoFacturado - a.totalMontoFacturado).slice(0, 10);
  }, [filteredRows]);

  const formatNumber = (value: number, digits = 0) =>
    new Intl.NumberFormat(locale === "es" ? "es-CL" : "en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(locale === "es" ? "es-CL" : "en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const handleClearFilters = () => {
    setFilters({ fechaDesde: "", fechaHasta: "", estado: "", cliente: "", naviera: "" });
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
      "pallets",
      "peso_neto",
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
          r.pallets ?? "",
          r.peso_neto ?? "",
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                className="bg-white rounded-xl border border-neutral-200 p-3 h-20"
              />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-neutral-200 h-64" />
            <div className="bg-white rounded-xl border border-neutral-200 h-64" />
          </div>
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
            <p className="text-neutral-500 text-xs sm:text-sm mt-1">
              {tr.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={!filteredRows.length}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors disabled:opacity-60"
            >
              <Icon icon="lucide:download" width={16} height={16} />
              {tr.export}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-3 sm:p-4 shadow-mac-modal">
          <button
            type="button"
            className="flex items-center justify-between w-full text-left text-sm font-medium text-neutral-700 hover:text-brand-blue transition-colors"
            aria-expanded="true"
          >
            <span className="flex items-center gap-2">
              <Icon icon="typcn:filter" width={18} height={18} />
              {tr.filters}
              {hasActiveFilters && (
                <span className="px-1.5 py-0.5 text-xs bg-brand-blue/10 text-brand-blue rounded">
                  {[
                    filters.fechaDesde,
                    filters.fechaHasta,
                    filters.estado,
                    filters.cliente,
                    filters.naviera,
                  ].filter(Boolean).length}
                </span>
              )}
            </span>
          </button>
          <div className="mt-3 pt-3 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                {tr.dateFrom}
              </label>
              <input
                type="date"
                value={filters.fechaDesde}
                onChange={(e) => setFilters((f) => ({ ...f, fechaDesde: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-neutral-200 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
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
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-neutral-200 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                {tr.state}
              </label>
              <select
                value={filters.estado}
                onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-neutral-200 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
              >
                <option value="">{tr.allStates}</option>
                {ESTADOS_OPTS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                {tr.client}
              </label>
              <select
                value={filters.cliente}
                onChange={(e) => setFilters((f) => ({ ...f, cliente: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-neutral-200 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
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
                {tr.carrier}
              </label>
              <select
                value={filters.naviera}
                onChange={(e) => setFilters((f) => ({ ...f, naviera: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-neutral-200 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
              >
                <option value="">{tr.allCarriers}</option>
                {navierasOpts.map((n) => (
                  <option key={n} value={n}>
                    {n}
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
                className="px-3 py-1.5 text-xs sm:text-sm font-medium text-neutral-600 hover:text-brand-blue transition-colors"
              >
                {tr.clearFilters}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          <div className="bg-white rounded-xl border border-neutral-200 p-3 sm:p-4 shadow-mac-modal">
            <p className="text-xs sm:text-sm text-neutral-500">{tr.totalOperations}</p>
            <p className="text-2xl sm:text-3xl font-bold text-neutral-800 mt-1">
              {formatNumber(kpis.totalOps)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-3 sm:p-4 shadow-mac-modal">
            <p className="text-xs sm:text-sm text-neutral-500">{tr.totalPallets}</p>
            <p className="text-2xl sm:text-3xl font-bold text-neutral-800 mt-1">
              {formatNumber(kpis.totalPallets)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-3 sm:p-4 shadow-mac-modal">
            <p className="text-xs sm:text-sm text-neutral-500">{tr.totalNetWeight}</p>
            <p className="text-2xl sm:text-3xl font-bold text-neutral-800 mt-1">
              {formatNumber(kpis.totalPesoNeto)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-3 sm:p-4 shadow-mac-modal">
            <p className="text-xs sm:text-sm text-neutral-500">{tr.totalInvoiced}</p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">
              {formatCurrency(kpis.totalMontoFacturado)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-3 sm:p-4 shadow-mac-modal">
            <p className="text-xs sm:text-sm text-neutral-500">{tr.totalMargin}</p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-700 mt-1">
              {formatCurrency(kpis.totalMargenReal)}
            </p>
          </div>
        </div>

        {!filteredRows.length ? (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-mac-modal p-8 text-center">
            <Icon icon="lucide:bar-chart-3" width={40} height={40} className="mx-auto mb-4 text-neutral-300" />
            <p className="text-neutral-600 text-sm">{tr.noData}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-white rounded-xl border border-neutral-200 shadow-mac-modal overflow-hidden">
              <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-neutral-100">
                <h2 className="font-semibold text-neutral-800 flex items-center gap-2 text-sm sm:text-base">
                  <Icon icon="lucide:building" width={16} height={16} className="text-brand-blue" />
                  {tr.byClient}
                </h2>
              </div>
              <div className="p-3 sm:p-4">
                <div className="space-y-1.5 sm:space-y-2">
                  {byClient.map((item) => {
                    const max = byClient[0]?.totalMontoFacturado || 1;
                    const percentage = max > 0 ? (item.totalMontoFacturado / max) * 100 : 0;
                    return (
                      <div key={item.key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-neutral-700 truncate max-w-[60%]">
                            {item.key}
                          </span>
                          <span className="font-medium text-neutral-800">
                            {formatCurrency(item.totalMontoFacturado)}
                          </span>
                        </div>
                        <div className="h-1.5 sm:h-2 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-blue/60 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] sm:text-xs text-neutral-500">
                          <span>
                            {tr.tableOperations}: {formatNumber(item.totalOperaciones)}
                          </span>
                          <span>
                            {tr.tableMargin}: {formatCurrency(item.totalMargenReal)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 shadow-mac-modal overflow-hidden">
              <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-neutral-100">
                <h2 className="font-semibold text-neutral-800 flex items-center gap-2 text-sm sm:text-base">
                  <Icon icon="typcn:anchor" width={18} height={18} className="text-brand-blue" />
                  {tr.byCarrier}
                </h2>
              </div>
              <div className="p-3 sm:p-4">
                <div className="space-y-1.5 sm:space-y-2">
                  {byCarrier.map((item) => {
                    const max = byCarrier[0]?.totalMontoFacturado || 1;
                    const percentage = max > 0 ? (item.totalMontoFacturado / max) * 100 : 0;
                    return (
                      <div key={item.key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-neutral-700 truncate max-w-[60%]">
                            {item.key}
                          </span>
                          <span className="font-medium text-neutral-800">
                            {formatCurrency(item.totalMontoFacturado)}
                          </span>
                        </div>
                        <div className="h-1.5 sm:h-2 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-blue/60 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] sm:text-xs text-neutral-500">
                          <span>
                            {tr.tableOperations}: {formatNumber(item.totalOperaciones)}
                          </span>
                          <span>
                            {tr.tableMargin}: {formatCurrency(item.totalMargenReal)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

