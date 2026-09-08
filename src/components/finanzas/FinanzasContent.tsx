import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { es } from "date-fns/locale";
import { useNeonTheme } from "@/lib/ui/neonTheme";
import { FormSelect } from "@/components/ui/FormSelect";
import { estadosEnOrden, etiquetaEstado } from "@/lib/operaciones/estados";
import { aplicarFiltroTemporada } from "@/lib/temporadas";
import { useTemporadaActiva } from "@/lib/useTemporadaActiva";

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
  const { temporadaActiva, temporadaLoading } = useTemporadaActiva();
  const [theme] = useNeonTheme();

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

  const ESTADOS_OPTS = estadosEnOrden();

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!supabase || authLoading || temporadaLoading) return;
    setLoading(true);
    setError(null);

    let baseQuery = supabase
      .from("operaciones")
      .select("id, ingreso, semana, estado_operacion, cliente, naviera, monto_facturado, margen_real")
      .is("deleted_at", null);

    if (empresaNombres.length > 0) {
      baseQuery = baseQuery.in("cliente", empresaNombres);
    }
    baseQuery = aplicarFiltroTemporada(baseQuery, temporadaActiva);

    let clientesQuery = supabase
      .from("operaciones")
      .select("cliente")
      .is("deleted_at", null)
      .not("cliente", "is", null);
    clientesQuery = aplicarFiltroTemporada(clientesQuery, temporadaActiva);

    const [opsRes, clientesRes] = await Promise.all([
      baseQuery.order("ingreso", { ascending: false }),
      clientesQuery,
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
  }, [supabase, authLoading, temporadaLoading, temporadaActiva, isCliente, empresaNombres, locale]);

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

  const shell = (children: ReactNode) => (
    <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
      <main className="dash-page relative flex min-h-0 flex-1 flex-col overflow-y-auto" role="main">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -right-16 top-10 h-72 w-72 rounded-full bg-dash-neon/20 blur-3xl" />
          <div className="absolute bottom-20 left-1/4 h-64 w-64 rounded-full bg-dash-neon-hot/15 blur-3xl" />
        </div>
        {children}
      </main>
    </div>
  );

  if (authLoading) {
    return shell(
      <div className="relative z-10 p-4">
        <p className="px-4 text-base text-dash-muted">Cargando…</p>
      </div>
    );
  }

  if (isCliente || !canViewFinanzas) {
    return shell(
      <div className="relative z-10 flex flex-1 items-center justify-center p-4">
        <p className="px-4 text-center text-base text-dash-muted">
          No tienes acceso al módulo de Finanzas. Solo personal interno puede ver facturación y márgenes.
        </p>
      </div>
    );
  }

  if (loading && !rows.length) {
    return shell(
      <div className="relative z-10 mx-auto w-full max-w-[1600px] space-y-4 p-3 sm:p-4 lg:p-5">
        <div className="motion-skeleton h-24 rounded-xl bg-dash-neon/20" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="motion-skeleton motion-skeleton-surface h-20 rounded-xl border border-dash-border bg-dash-control p-3"
            />
          ))}
        </div>
        <div className="motion-skeleton motion-skeleton-surface h-64 rounded-xl border border-dash-border bg-dash-control" />
      </div>
    );
  }

  return shell(
    <>
      <div className="dash-toolbar relative z-10 shrink-0">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dash-neon/40 bg-dash-neon/15 shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--dash-neon)_55%,transparent)]">
              <Icon icon="typcn:calculator" width={22} height={22} className="text-dash-neon" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight text-dash-fg sm:text-xl">
                {tr.title}
              </h1>
              <p className="mt-0.5 line-clamp-1 text-xs text-dash-muted sm:text-sm">{tr.subtitle}</p>
            </div>
          </div>
          <div className="ml-auto">
            <button
              type="button"
              onClick={handleExport}
              disabled={!filteredRows.length}
              className="dash-cta inline-flex items-center gap-1.5 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon icon="lucide:download" width={16} height={16} />
              {tr.export}
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1600px] space-y-4 p-3 sm:p-4 lg:p-5">
        <div className="dash-card rounded-xl p-3 sm:p-4">
          <div className="flex w-full items-center justify-between text-left text-base font-semibold text-dash-fg">
            <span className="flex items-center gap-2">
              <Icon icon="typcn:filter" width={18} height={18} className="text-dash-neon" />
              {tr.filters}
              {hasActiveFilters && (
                <span className="rounded-lg border border-dash-neon/35 bg-dash-neon/15 px-1.5 py-0.5 text-sm font-bold text-dash-fg">
                  {[filters.fechaDesde, filters.fechaHasta, filters.cliente, filters.estado].filter(
                    Boolean
                  ).length}
                </span>
              )}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 border-t border-dash-border pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dash-muted">
                {tr.dateFrom}
              </label>
              <input
                type="date"
                value={filters.fechaDesde}
                onChange={(e) => setFilters((f) => ({ ...f, fechaDesde: e.target.value }))}
                className="dash-control w-full rounded-lg px-3 py-2 text-sm text-dash-fg focus:outline-none focus:ring-2 focus:ring-dash-neon/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dash-muted">
                {tr.dateTo}
              </label>
              <input
                type="date"
                value={filters.fechaHasta}
                onChange={(e) => setFilters((f) => ({ ...f, fechaHasta: e.target.value }))}
                className="dash-control w-full rounded-lg px-3 py-2 text-sm text-dash-fg focus:outline-none focus:ring-2 focus:ring-dash-neon/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dash-muted">
                {tr.client}
              </label>
              <FormSelect
                variant="neon"
                value={filters.cliente}
                placeholder={tr.allClients}
                options={clientesOpts.map((c) => ({ value: c, label: c }))}
                onChange={(v) => setFilters((f) => ({ ...f, cliente: v }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dash-muted">
                {tr.state}
              </label>
              <FormSelect
                variant="neon"
                value={filters.estado}
                placeholder={tr.allStates}
                options={ESTADOS_OPTS.map((e) => ({ value: e, label: etiquetaEstado(e) }))}
                onChange={(v) => setFilters((f) => ({ ...f, estado: v }))}
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-lg px-3 py-2 text-base font-semibold text-dash-muted transition-colors hover:text-dash-fg focus:outline-none focus:ring-2 focus:ring-dash-neon/30"
              >
                {tr.clearFilters}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <div className="dash-card relative overflow-hidden rounded-xl p-3 sm:p-4">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-emerald-400" aria-hidden />
            <p className="text-base text-dash-muted">{tr.totalInvoiced}</p>
            <p className="mt-1 text-2xl font-bold text-emerald-300 sm:text-3xl">
              {formatCurrency(kpis.totalFacturado)}
            </p>
          </div>
          <div className="dash-card relative overflow-hidden rounded-xl p-3 sm:p-4">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-dash-neon" aria-hidden />
            <p className="text-base text-dash-muted">{tr.totalMargin}</p>
            <p className="mt-1 text-2xl font-bold text-dash-neon sm:text-3xl">
              {formatCurrency(kpis.totalMargen)}
            </p>
          </div>
          <div className="dash-card relative overflow-hidden rounded-xl p-3 sm:p-4">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-sky-400" aria-hidden />
            <p className="text-base text-dash-muted">{tr.avgMarginPerOp}</p>
            <p className="mt-1 text-2xl font-bold text-dash-fg sm:text-3xl">
              {formatCurrency(kpis.avgMargen)}
            </p>
          </div>
          <div className="dash-card relative overflow-hidden rounded-xl p-3 sm:p-4">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-neutral-400" aria-hidden />
            <p className="text-base text-dash-muted">{tr.operationsWithBilling}</p>
            <p className="mt-1 text-2xl font-bold text-dash-fg sm:text-3xl">
              {kpis.opsConFacturacion}
            </p>
          </div>
        </div>

        {!filteredRows.length ? (
          <div className="dash-card rounded-xl p-8 text-center">
            <Icon
              icon="typcn:calculator"
              width={40}
              height={40}
              className="mx-auto mb-4 text-dash-muted"
            />
            <p className="text-base text-dash-muted">{tr.noData}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
            <div className="dash-card overflow-hidden rounded-xl lg:col-span-2">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-base">
                  <thead>
                    <tr className="dash-section-head text-sm font-bold text-dash-neon">
                      <th className="px-3 pb-2 pr-2 pt-3 sm:px-4">{tr.tableClient}</th>
                      <th className="pb-2 pr-2 pt-3">{tr.tableDate}</th>
                      <th className="pb-2 pr-2 pt-3">{tr.tableState}</th>
                      <th className="pb-2 pr-2 pt-3 text-right">{tr.tableInvoiced}</th>
                      <th className="px-3 pb-2 pt-3 text-right sm:px-4">{tr.tableMargin}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dash-border">
                    {filteredRows.slice(0, 15).map((r) => (
                      <tr
                        key={r.id}
                        className="text-dash-fg transition-colors hover:bg-dash-neon/10"
                      >
                        <td className="max-w-[120px] truncate px-3 py-2 pr-2 sm:px-4">{r.cliente || "—"}</td>
                        <td className="whitespace-nowrap py-2 pr-2">
                          {r.ingreso
                            ? format(parseISO(r.ingreso), "dd/MM/yyyy", {
                                locale: locale === "es" ? es : undefined,
                              })
                            : "—"}
                        </td>
                        <td className="py-2 pr-2">{etiquetaEstado(r.estado_operacion) || "—"}</td>
                        <td className="py-2 pr-2 text-right font-medium text-emerald-300">
                          {formatCurrency(r.monto_facturado ?? 0)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-dash-fg sm:px-4">
                          {formatCurrency(r.margen_real ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="dash-card overflow-hidden rounded-xl">
              <div className="dash-section-head px-3 py-2.5 sm:px-4 sm:py-3">
                <h2 className="flex items-center gap-2 text-sm font-bold text-dash-fg">
                  <span className="h-4 w-1 flex-shrink-0 rounded-full bg-emerald-400" />
                  <Icon icon="lucide:building" width={16} height={16} className="text-dash-neon" />
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
                          <span className="max-w-[60%] truncate text-dash-fg">
                            {item.cliente}
                          </span>
                          <span className="font-medium text-dash-fg">
                            {formatCurrency(item.totalFacturado)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-dash-control sm:h-2">
                          <div
                            className="h-full rounded-full bg-dash-neon/60 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="text-sm text-dash-muted">
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
          <div className="rounded-lg border border-red-400/35 bg-red-400/15 p-3 text-base text-dash-fg">{error}</div>
        )}
      </div>
    </>
  );
}
