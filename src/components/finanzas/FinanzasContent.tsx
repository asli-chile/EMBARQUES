import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { es } from "date-fns/locale";
import {
  moduleCard,
  moduleHeroRounded,
  moduleInput,
  moduleLabel,
  modulePageBg,
  moduleSectionTitle,
} from "@/lib/ui/moduleStyles";

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
  const { isCliente, isLoading: authLoading, isSuperadmin, isAdmin, isEjecutivo, profile, empresaNombres } = useAuth();

  const canViewFinanzas =
    isSuperadmin || isAdmin || isEjecutivo || profile?.rol === "operador";

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

  if (authLoading) {
    return (
      <main className={`flex-1 ${modulePageBg} min-h-0 overflow-auto w-full p-4`}>
        <p className="text-brand-blue/60 text-base px-4">Cargando…</p>
      </main>
    );
  }

  if (isCliente || !canViewFinanzas) {
    return (
      <main className={`flex-1 ${modulePageBg} min-h-0 overflow-auto w-full p-4 flex items-center justify-center`} role="main">
        <p className="text-brand-blue/80 text-base px-4 text-center">
          No tienes acceso al módulo de Finanzas. Solo personal interno puede ver facturación y márgenes.
        </p>
      </main>
    );
  }

  if (loading && !rows.length) {
    return (
      <main className={`flex-1 ${modulePageBg} min-h-0 overflow-auto w-full p-3 sm:p-4 lg:p-5`}>
        <div className="w-full max-w-[1600px] mx-auto space-y-4 animate-pulse">
          <div className="h-24 bg-brand-blue/20 rounded-2xl" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-brand-blue/15 p-3 h-20"
              />
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-brand-blue/15 h-64" />
        </div>
      </main>
    );
  }

  return (
    <main className={`flex-1 ${modulePageBg} min-h-0 overflow-auto w-full`} role="main">
      <div className={`${moduleHeroRounded} rounded-none`}>
        <div className="px-4 sm:px-6 py-5 sm:py-6 max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-white/15 border border-white/25 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Icon icon="typcn:calculator" width={24} height={24} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight">
                {tr.title}
              </h1>
              <p className="text-base text-white/75 mt-1">{tr.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={!filteredRows.length}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-base font-semibold text-brand-blue bg-white rounded-lg hover:bg-white/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            <Icon icon="lucide:download" width={16} height={16} />
            {tr.export}
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-4 lg:p-5">
      <div className="w-full max-w-[1600px] mx-auto space-y-4">
        <div className={`${moduleCard} p-3 sm:p-4`}>
          <div className="flex items-center justify-between w-full text-left text-base font-semibold text-brand-blue">
            <span className="flex items-center gap-2">
              <Icon icon="typcn:filter" width={18} height={18} />
              {tr.filters}
              {hasActiveFilters && (
                <span className="px-1.5 py-0.5 text-sm bg-brand-blue/10 text-brand-blue rounded-lg font-bold">
                  {[filters.fechaDesde, filters.fechaHasta, filters.cliente, filters.estado].filter(
                    Boolean
                  ).length}
                </span>
              )}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-brand-blue/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className={moduleLabel}>
                {tr.dateFrom}
              </label>
              <input
                type="date"
                value={filters.fechaDesde}
                onChange={(e) => setFilters((f) => ({ ...f, fechaDesde: e.target.value }))}
                className={moduleInput}
              />
            </div>
            <div>
              <label className={moduleLabel}>
                {tr.dateTo}
              </label>
              <input
                type="date"
                value={filters.fechaHasta}
                onChange={(e) => setFilters((f) => ({ ...f, fechaHasta: e.target.value }))}
                className={moduleInput}
              />
            </div>
            <div>
              <label className={moduleLabel}>
                {tr.client}
              </label>
              <select
                value={filters.cliente}
                onChange={(e) => setFilters((f) => ({ ...f, cliente: e.target.value }))}
                className={moduleInput}
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
              <label className={moduleLabel}>
                {tr.state}
              </label>
              <select
                value={filters.estado}
                onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}
                className={moduleInput}
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
                className="px-3 py-2 text-base font-semibold text-brand-blue/80 hover:text-brand-blue transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30 rounded-lg"
              >
                {tr.clearFilters}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className={`${moduleCard} border-t-[3px] border-t-emerald-400 p-3 sm:p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5`}>
            <p className="text-base text-neutral-500">{tr.totalInvoiced}</p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">
              {formatCurrency(kpis.totalFacturado)}
            </p>
          </div>
          <div className={`${moduleCard} border-t-[3px] border-t-teal-400 p-3 sm:p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5`}>
            <p className="text-base text-neutral-500">{tr.totalMargin}</p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-700 mt-1">
              {formatCurrency(kpis.totalMargen)}
            </p>
          </div>
          <div className={`${moduleCard} border-t-[3px] border-t-blue-400 p-3 sm:p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5`}>
            <p className="text-base text-neutral-500">{tr.avgMarginPerOp}</p>
            <p className="text-2xl sm:text-3xl font-bold text-neutral-800 mt-1">
              {formatCurrency(kpis.avgMargen)}
            </p>
          </div>
          <div className={`${moduleCard} border-t-[3px] border-t-slate-400 p-3 sm:p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5`}>
            <p className="text-base text-neutral-500">{tr.operationsWithBilling}</p>
            <p className="text-2xl sm:text-3xl font-bold text-neutral-800 mt-1">
              {kpis.opsConFacturacion}
            </p>
          </div>
        </div>

        {!filteredRows.length ? (
          <div className={`${moduleCard} p-8 text-center`}>
            <Icon
              icon="typcn:calculator"
              width={40}
              height={40}
              className="mx-auto mb-4 text-brand-blue/30"
            />
            <p className="text-brand-blue/70 text-base">{tr.noData}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className={`lg:col-span-2 ${moduleCard}`}>
              <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-brand-blue/10 bg-[#F4F8FC] overflow-x-auto">
                <table className="w-full text-left text-base">
                  <thead>
                    <tr className="text-sm font-bold text-brand-blue">
                      <th className="pb-2 pr-2">{tr.tableClient}</th>
                      <th className="pb-2 pr-2">{tr.tableDate}</th>
                      <th className="pb-2 pr-2">{tr.tableState}</th>
                      <th className="pb-2 pr-2 text-right">{tr.tableInvoiced}</th>
                      <th className="pb-2 text-right">{tr.tableMargin}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-blue/10">
                    {filteredRows.slice(0, 15).map((r) => (
                      <tr
                        key={r.id}
                        className="text-neutral-700 hover:bg-[#F4F8FC]/80 transition-colors"
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

            <div className={moduleCard}>
              <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-brand-blue/10 bg-[#F4F8FC]">
                <h2 className={`${moduleSectionTitle} flex items-center gap-2`}>
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
                        <div className="flex items-center justify-between text-base">
                          <span className="text-neutral-700 truncate max-w-[60%]">
                            {item.cliente}
                          </span>
                          <span className="font-medium text-neutral-800">
                            {formatCurrency(item.totalFacturado)}
                          </span>
                        </div>
                        <div className="h-1.5 sm:h-2 bg-[#F4F8FC] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-blue/60 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="text-sm text-neutral-500">
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
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-base">{error}</div>
        )}
      </div>
      </div>
    </main>
  );
}
