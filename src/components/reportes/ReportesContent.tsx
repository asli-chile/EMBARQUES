import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { es as esLocale } from "date-fns/locale";
import { useNeonTheme } from "@/lib/ui/neonTheme";
import { FormSelect } from "@/components/ui/FormSelect";
import {
  ESTADO_META,
  estadosEnOrden,
  etiquetaEstado,
  normalizarEstado,
  type GrupoEstado,
} from "@/lib/operaciones/estados";
import { aplicarFiltroTemporada } from "@/lib/temporadas";
import { useTemporadaActiva } from "@/lib/useTemporadaActiva";

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

const ESTADOS_OPTS = estadosEnOrden();

const ESTADO_CONFIG: Record<GrupoEstado, { color: string; bg: string; dot: string }> = {
  COMERCIAL: { color: "text-dash-fg", bg: "bg-amber-400/15 border border-amber-400/35", dot: "bg-amber-400" },
  COORDINACION: { color: "text-dash-fg", bg: "bg-sky-400/15 border border-sky-400/35", dot: "bg-sky-400" },
  TRANSITO: { color: "text-dash-fg", bg: "bg-violet-400/15 border border-violet-400/35", dot: "bg-violet-400" },
  DOCUMENTAL: { color: "text-dash-fg", bg: "bg-emerald-400/15 border border-emerald-400/35", dot: "bg-emerald-400" },
  CIERRE: { color: "text-dash-muted", bg: "bg-dash-control border border-dash-border", dot: "bg-neutral-400" },
  EXCEPCION: { color: "text-dash-fg", bg: "bg-red-400/15 border border-red-400/35", dot: "bg-red-400" },
};

const ESTADO_BAR: Record<GrupoEstado, string> = {
  COMERCIAL: "bg-amber-400",
  COORDINACION: "bg-sky-400",
  TRANSITO: "bg-violet-400",
  DOCUMENTAL: "bg-emerald-400",
  CIERRE: "bg-neutral-400",
  EXCEPCION: "bg-red-400",
};

export function ReportesContent() {
  const { t, locale } = useLocale();
  const { isCliente, empresaNombres, isLoading: authLoading, isSuperadmin, isAdmin, isEjecutivo, profile } = useAuth();
  const { temporadaActiva, temporadaLoading } = useTemporadaActiva();
  const [theme] = useNeonTheme();

  const canViewReportes =
    isSuperadmin || isAdmin || isEjecutivo || profile?.rol === "operador";

  const tr = t.reportesPage;

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
    try { return createClient(); } catch { return null; }
  }, []);

  const loadData = useCallback(async () => {
    if (!supabase || authLoading || temporadaLoading) return;
    setLoading(true);
    setError(null);

    let baseQuery = supabase
      .from("operaciones")
      .select("id, ingreso, semana, estado_operacion, cliente, naviera, pallets, peso_neto, monto_facturado, margen_real")
      .is("deleted_at", null);
    if (empresaNombres.length > 0) baseQuery = baseQuery.in("cliente", empresaNombres);

    let clientesQ = supabase.from("operaciones").select("cliente").is("deleted_at", null).not("cliente", "is", null);
    let navierasQ = supabase.from("operaciones").select("naviera").is("deleted_at", null).not("naviera", "is", null);
    if (empresaNombres.length > 0) {
      clientesQ = clientesQ.in("cliente", empresaNombres);
      navierasQ = navierasQ.in("cliente", empresaNombres);
    }
    baseQuery = aplicarFiltroTemporada(baseQuery, temporadaActiva);
    clientesQ = aplicarFiltroTemporada(clientesQ, temporadaActiva);
    navierasQ = aplicarFiltroTemporada(navierasQ, temporadaActiva);

    const [opsRes, clientesRes, navierasRes] = await Promise.all([
      baseQuery.order("ingreso", { ascending: false }),
      clientesQ,
      navierasQ,
    ]);

    if (opsRes.error) { setError(opsRes.error.message); setLoading(false); return; }

    setRows((opsRes.data ?? []) as DbOperacion[]);

    const sortLocale = locale === "es" ? "es" : undefined;
    setClientesOpts([...new Set((clientesRes.data ?? []).map((r: { cliente: string | null }) => r.cliente).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, sortLocale, { sensitivity: "base" })));
    setNavierasOpts([...new Set((navierasRes.data ?? []).map((r: { naviera: string | null }) => r.naviera).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, sortLocale, { sensitivity: "base" })));
    setLoading(false);
  }, [supabase, authLoading, temporadaLoading, temporadaActiva, empresaNombres, locale]);

  useEffect(() => { void loadData(); }, [loadData]);

  const filteredRows = useMemo(() => {
    const { fechaDesde, fechaHasta, estado, cliente, naviera } = filters;
    return rows.filter((r) => {
      if (estado && r.estado_operacion !== estado) return false;
      if (cliente && r.cliente !== cliente) return false;
      if (naviera && (r.naviera ?? "") !== naviera) return false;
      if ((fechaDesde || fechaHasta) && r.ingreso) {
        try {
          const d = parseISO(r.ingreso);
          if (fechaDesde && isBefore(d, parseISO(fechaDesde))) return false;
          if (fechaHasta && isAfter(d, parseISO(fechaHasta))) return false;
        } catch { return false; }
      } else if ((fechaDesde || fechaHasta) && !r.ingreso) return false;
      return true;
    });
  }, [rows, filters]);

  const activeFilterCount = [filters.fechaDesde, filters.fechaHasta, filters.estado, filters.cliente, filters.naviera].filter(Boolean).length;

  const kpis = useMemo(() => filteredRows.reduce(
    (acc, r) => {
      acc.totalOps++;
      acc.totalPallets += r.pallets ?? 0;
      acc.totalPesoNeto += r.peso_neto ?? 0;
      acc.totalFacturado += r.monto_facturado ?? 0;
      acc.totalMargen += r.margen_real ?? 0;
      return acc;
    },
    { totalOps: 0, totalPallets: 0, totalPesoNeto: 0, totalFacturado: 0, totalMargen: 0 }
  ), [filteredRows]);

  const byClient = useMemo<AggregateByKey[]>(() => {
    const map = new Map<string, AggregateByKey>();
    for (const r of filteredRows) {
      const key = r.cliente || "—";
      const c = map.get(key) ?? { key, totalOperaciones: 0, totalPallets: 0, totalPesoNeto: 0, totalMontoFacturado: 0, totalMargenReal: 0 };
      c.totalOperaciones++; c.totalPallets += r.pallets ?? 0; c.totalPesoNeto += r.peso_neto ?? 0;
      c.totalMontoFacturado += r.monto_facturado ?? 0; c.totalMargenReal += r.margen_real ?? 0;
      map.set(key, c);
    }
    return [...map.values()].sort((a, b) => b.totalMontoFacturado - a.totalMontoFacturado).slice(0, 8);
  }, [filteredRows]);

  const byCarrier = useMemo<AggregateByKey[]>(() => {
    const map = new Map<string, AggregateByKey>();
    for (const r of filteredRows) {
      const key = (r.naviera ?? "").trim() || "—";
      const c = map.get(key) ?? { key, totalOperaciones: 0, totalPallets: 0, totalPesoNeto: 0, totalMontoFacturado: 0, totalMargenReal: 0 };
      c.totalOperaciones++; c.totalPallets += r.pallets ?? 0; c.totalPesoNeto += r.peso_neto ?? 0;
      c.totalMontoFacturado += r.monto_facturado ?? 0; c.totalMargenReal += r.margen_real ?? 0;
      map.set(key, c);
    }
    return [...map.values()].sort((a, b) => b.totalMontoFacturado - a.totalMontoFacturado).slice(0, 8);
  }, [filteredRows]);

  const byStatus = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filteredRows) {
      map.set(r.estado_operacion, (map.get(r.estado_operacion) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [filteredRows]);

  const byMonth = useMemo(() => {
    const map = new Map<string, { ops: number; facturado: number }>();
    for (const r of filteredRows) {
      if (!r.ingreso) continue;
      try {
        const key = format(parseISO(r.ingreso), locale === "es" ? "MMM yyyy" : "MMM yyyy", {
          locale: locale === "es" ? esLocale : undefined,
        });
        const c = map.get(key) ?? { ops: 0, facturado: 0 };
        c.ops++; c.facturado += r.monto_facturado ?? 0;
        map.set(key, c);
      } catch { /* ignore */ }
    }
    return [...map.entries()].slice(0, 12).reverse();
  }, [filteredRows, locale]);

  const fmt = (v: number, d = 0) => new Intl.NumberFormat(locale === "es" ? "es-CL" : "en-US", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
  const fmtCur = (v: number) => new Intl.NumberFormat(locale === "es" ? "es-CL" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  const handleExport = () => {
    if (!filteredRows.length) return;
    const headers = ["id", "ingreso", "semana", "estado_operacion", "cliente", "naviera", "pallets", "peso_neto", "monto_facturado", "margen_real"];
    const csv = [headers.join(";"), ...filteredRows.map((r) =>
      [r.id, r.ingreso ? format(parseISO(r.ingreso), "yyyy-MM-dd") : "", r.semana ?? "", r.estado_operacion, r.cliente, r.naviera ?? "", r.pallets ?? "", r.peso_neto ?? "", r.monto_facturado ?? "", r.margen_real ?? ""]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";")
    )].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = tr.exportFilename;
    a.click();
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

  if (isCliente || !canViewReportes) {
    return shell(
      <div className="relative z-10 flex flex-1 items-center justify-center p-4">
        <p className="px-4 text-center text-base text-dash-muted">
          No tienes acceso al módulo de Reportes. Solo personal interno puede ver estos datos.
        </p>
      </div>
    );
  }

  if (loading && !rows.length) {
    return shell(
      <div className="relative z-10 mx-auto w-full max-w-[1600px] space-y-4 p-3 sm:p-4 lg:p-5">
        <div className="motion-skeleton h-24 rounded-xl bg-dash-neon/20" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="motion-skeleton motion-skeleton-surface h-24 rounded-xl border border-dash-border bg-dash-control" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="motion-skeleton motion-skeleton-surface h-56 rounded-xl border border-dash-border bg-dash-control" />
          <div className="motion-skeleton motion-skeleton-surface h-56 rounded-xl border border-dash-border bg-dash-control" />
        </div>
      </div>
    );
  }

  const KpiCard = ({ icon, accent, bar, label, value }: {
    icon: string; accent: string; bar: string; label: string; value: string;
  }) => (
    <div className="dash-card relative overflow-hidden rounded-xl px-3.5 py-3.5">
      <span className={`absolute inset-x-0 top-0 h-0.5 ${bar}`} aria-hidden />
      <div className="flex items-center gap-1.5 text-dash-muted">
        <Icon icon={icon} width={13} height={13} className={accent} />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <p className={`mt-1 truncate text-xl font-bold tabular-nums ${accent}`}>{value}</p>
    </div>
  );

  const BarRow = ({ label, value, displayValue, subValue, maxValue, barColor }: {
    label: string; value: number; displayValue: string; subValue: string; maxValue: number; barColor: string;
  }) => {
    const pct = maxValue > 0 ? Math.max(2, (value / maxValue) * 100) : 0;
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="max-w-[55%] truncate text-base font-medium text-dash-fg">{label}</span>
          <span className="flex-shrink-0 text-base font-semibold text-dash-fg">{displayValue}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-dash-control">
          <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm text-dash-muted">{subValue}</p>
      </div>
    );
  };

  return shell(
    <>
      <div className="dash-toolbar relative z-10 shrink-0">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dash-neon/40 bg-dash-neon/15 shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--dash-neon)_55%,transparent)]">
              <Icon icon="lucide:bar-chart-3" width={22} height={22} className="text-dash-neon" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight text-dash-fg sm:text-xl">{tr.title}</h1>
              <p className="mt-0.5 line-clamp-1 text-xs text-dash-muted sm:text-sm">{tr.subtitle}</p>
            </div>
          </div>
          <div className="ml-auto">
            <button
              type="button"
              onClick={handleExport}
              disabled={!filteredRows.length}
              className="dash-cta inline-flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
            >
              <Icon icon="lucide:download" width={15} height={15} />
              {tr.export}
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1600px] space-y-4 p-3 sm:p-4 lg:p-5">
        <div className="dash-card rounded-xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon icon="typcn:filter" width={16} height={16} className="text-dash-neon" />
              <span className="text-base font-semibold text-dash-fg">{tr.filters}</span>
              {activeFilterCount > 0 && (
                <span className="rounded-lg border border-dash-neon/35 bg-dash-neon/15 px-2 py-0.5 text-sm font-semibold text-dash-fg">
                  {activeFilterCount}
                </span>
              )}
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => setFilters({ fechaDesde: "", fechaHasta: "", estado: "", cliente: "", naviera: "" })}
                className="flex items-center gap-1 text-base text-dash-muted transition-colors hover:text-red-400"
              >
                <Icon icon="lucide:x" width={12} height={12} />
                {tr.clearFilters}
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: tr.dateFrom, type: "date", key: "fechaDesde" as const },
              { label: tr.dateTo, type: "date", key: "fechaHasta" as const },
            ].map(({ label, type, key }) => (
              <div key={key}>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dash-muted">{label}</label>
                <input
                  type={type}
                  value={filters[key]}
                  onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
                  className="dash-control w-full rounded-lg px-3 py-2 text-sm text-dash-fg focus:outline-none focus:ring-2 focus:ring-dash-neon/40"
                />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dash-muted">{tr.state}</label>
              <FormSelect
                variant="neon"
                value={filters.estado}
                placeholder={tr.allStates}
                options={ESTADOS_OPTS.map((e) => ({ value: e, label: etiquetaEstado(e) }))}
                onChange={(v) => setFilters((f) => ({ ...f, estado: v }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dash-muted">{tr.client}</label>
              <FormSelect
                variant="neon"
                value={filters.cliente}
                placeholder={tr.allClients}
                options={clientesOpts.map((c) => ({ value: c, label: c }))}
                onChange={(v) => setFilters((f) => ({ ...f, cliente: v }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dash-muted">{tr.carrier}</label>
              <FormSelect
                variant="neon"
                value={filters.naviera}
                placeholder={tr.allCarriers}
                options={navierasOpts.map((n) => ({ value: n, label: n }))}
                onChange={(v) => setFilters((f) => ({ ...f, naviera: v }))}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-400/35 bg-red-400/15 p-3 text-base text-dash-fg">
            <Icon icon="lucide:alert-circle" width={16} height={16} className="text-red-400" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
          <KpiCard icon="typcn:document-text" accent="text-dash-muted" bar="bg-neutral-400"
            label={tr.totalOperations} value={fmt(kpis.totalOps)} />
          <KpiCard icon="typcn:th-large" accent="text-amber-300" bar="bg-amber-400"
            label={tr.totalPallets} value={fmt(kpis.totalPallets)} />
          <KpiCard icon="typcn:chart-bar" accent="text-sky-300" bar="bg-sky-400"
            label={tr.totalNetWeight} value={fmt(kpis.totalPesoNeto)} />
          <KpiCard icon="typcn:dollar" accent="text-emerald-300" bar="bg-emerald-400"
            label={tr.totalInvoiced} value={fmtCur(kpis.totalFacturado)} />
          <KpiCard icon="lucide:trending-up" accent="text-dash-neon" bar="bg-dash-neon"
            label={tr.totalMargin} value={fmtCur(kpis.totalMargen)} />
        </div>

        {!filteredRows.length ? (
          <div className="dash-card rounded-xl p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-dash-border bg-dash-control">
              <Icon icon="lucide:bar-chart-3" width={28} height={28} className="text-dash-muted" />
            </div>
            <p className="text-base text-dash-muted">{tr.noData}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
              <div className="dash-card overflow-hidden rounded-xl">
                <div className="dash-section-head flex items-center gap-2 px-4 py-3">
                  <span className="h-4 w-1 flex-shrink-0 rounded-full bg-dash-neon" />
                  <Icon icon="lucide:pie-chart" width={15} height={15} className="text-dash-neon" />
                  <h2 className="text-sm font-bold text-dash-fg">{tr.byStatus}</h2>
                  <span className="ml-auto text-sm text-dash-muted">{filteredRows.length} {tr.opsUnit}</span>
                </div>
                <div className="space-y-2.5 p-4">
                  {byStatus.map(([estado, count]) => {
                    const codigo = normalizarEstado(estado);
                    const grupo = codigo ? ESTADO_META[codigo].grupo : null;
                    const cfg = grupo ? ESTADO_CONFIG[grupo] : { color: "text-dash-muted", bg: "bg-dash-control border border-dash-border", dot: "bg-neutral-400" };
                    const bar = grupo ? ESTADO_BAR[grupo] : "bg-neutral-400";
                    const pct = filteredRows.length > 0 ? (count / filteredRows.length) * 100 : 0;
                    return (
                      <div key={estado} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className={`h-2 w-2 flex-shrink-0 rounded-full ${cfg.dot}`} />
                            <span className="truncate text-base font-medium text-dash-fg">{etiquetaEstado(estado) || estado}</span>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-2">
                            <span className={`rounded-lg px-2 py-0.5 text-sm font-semibold ${cfg.bg} ${cfg.color}`}>{count}</span>
                            <span className="w-9 text-right text-sm text-dash-muted">{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-dash-control">
                          <div className={`h-full rounded-full transition-all duration-700 ${bar}`} style={{ width: `${Math.max(2, pct)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {byMonth.length > 0 && (
                <div className="dash-card overflow-hidden rounded-xl">
                  <div className="dash-section-head flex items-center gap-2 px-4 py-3">
                    <span className="h-4 w-1 flex-shrink-0 rounded-full bg-dash-neon-hot" />
                    <Icon icon="lucide:calendar-days" width={15} height={15} className="text-dash-neon" />
                    <h2 className="text-sm font-bold text-dash-fg">{tr.byMonth}</h2>
                  </div>
                  <div className="space-y-2.5 p-4">
                    {(() => {
                      const maxFact = Math.max(...byMonth.map(([, v]) => v.facturado), 1);
                      return byMonth.map(([mes, val]) => (
                        <div key={mes} className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="w-24 flex-shrink-0 capitalize text-base font-medium text-dash-fg">{mes}</span>
                            <div className="flex flex-shrink-0 items-center gap-3">
                              <span className="text-sm text-dash-muted">{val.ops} {tr.opsUnit}</span>
                              <span className="text-base font-semibold text-dash-fg">{fmtCur(val.facturado)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-dash-control">
                            <div
                              className="h-full rounded-full bg-dash-neon/70 transition-all duration-700"
                              style={{ width: `${Math.max(2, (val.facturado / maxFact) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
              <div className="dash-card overflow-hidden rounded-xl">
                <div className="dash-section-head flex items-center gap-2 px-4 py-3">
                  <span className="h-4 w-1 flex-shrink-0 rounded-full bg-dash-neon" />
                  <Icon icon="lucide:building-2" width={15} height={15} className="text-dash-neon" />
                  <h2 className="text-sm font-bold text-dash-fg">{tr.byClient}</h2>
                </div>
                <div className="space-y-3.5 p-4">
                  {byClient.map((item) => (
                    <BarRow
                      key={item.key}
                      label={item.key}
                      value={item.totalMontoFacturado}
                      displayValue={fmtCur(item.totalMontoFacturado)}
                      subValue={`${item.totalOperaciones} ${tr.opsUnit} · ${fmt(item.totalPallets)} ${tr.palletsUnit} · ${tr.marginLabel} ${fmtCur(item.totalMargenReal)}`}
                      maxValue={byClient[0]?.totalMontoFacturado ?? 1}
                      barColor="bg-dash-neon/50"
                    />
                  ))}
                </div>
              </div>

              <div className="dash-card overflow-hidden rounded-xl">
                <div className="dash-section-head flex items-center gap-2 px-4 py-3">
                  <span className="h-4 w-1 flex-shrink-0 rounded-full bg-emerald-400" />
                  <Icon icon="typcn:anchor" width={17} height={17} className="text-emerald-300" />
                  <h2 className="text-sm font-bold text-dash-fg">{tr.byCarrier}</h2>
                </div>
                <div className="space-y-3.5 p-4">
                  {byCarrier.map((item) => (
                    <BarRow
                      key={item.key}
                      label={item.key}
                      value={item.totalMontoFacturado}
                      displayValue={fmtCur(item.totalMontoFacturado)}
                      subValue={`${item.totalOperaciones} ${tr.opsUnit} · ${fmt(item.totalPallets)} ${tr.palletsUnit} · ${tr.marginLabel} ${fmtCur(item.totalMargenReal)}`}
                      maxValue={byCarrier[0]?.totalMontoFacturado ?? 1}
                      barColor="bg-emerald-400/60"
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
