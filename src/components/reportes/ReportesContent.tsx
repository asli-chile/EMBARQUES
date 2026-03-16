import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { es as esLocale } from "date-fns/locale";

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

const ESTADO_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  PENDIENTE:     { color: "text-amber-700",   bg: "bg-amber-50",   dot: "bg-amber-400" },
  "EN PROCESO":  { color: "text-blue-700",    bg: "bg-blue-50",    dot: "bg-blue-400" },
  "EN TRÁNSITO": { color: "text-indigo-700",  bg: "bg-indigo-50",  dot: "bg-indigo-400" },
  ARRIBADO:      { color: "text-cyan-700",    bg: "bg-cyan-50",    dot: "bg-cyan-400" },
  COMPLETADO:    { color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" },
  CANCELADO:     { color: "text-red-700",     bg: "bg-red-50",     dot: "bg-red-400" },
  ROLEADO:       { color: "text-orange-700",  bg: "bg-orange-50",  dot: "bg-orange-400" },
};

const ESTADO_BAR: Record<string, string> = {
  PENDIENTE:     "bg-amber-400",
  "EN PROCESO":  "bg-blue-400",
  "EN TRÁNSITO": "bg-indigo-400",
  ARRIBADO:      "bg-cyan-400",
  COMPLETADO:    "bg-emerald-500",
  CANCELADO:     "bg-red-400",
  ROLEADO:       "bg-orange-400",
};

export function ReportesContent() {
  const { t, locale } = useLocale();
  const { isCliente, empresaNombres, isLoading: authLoading } = useAuth();

  const tr = (t as any).reportesPage ?? {
    title: "Reportes",
    subtitle: "Analiza operaciones por cliente, naviera, período y estado.",
    filters: "Filtros",
    dateFrom: "Desde",
    dateTo: "Hasta",
    state: "Estado",
    client: "Cliente",
    carrier: "Naviera",
    allStates: "Todos",
    allClients: "Todos",
    allCarriers: "Todas",
    applyFilters: "Aplicar",
    clearFilters: "Limpiar filtros",
    totalOperations: "Operaciones",
    totalPallets: "Pallets",
    totalNetWeight: "Peso neto (kg)",
    totalInvoiced: "Facturado",
    totalMargin: "Margen real",
    byClient: "Por cliente",
    byCarrier: "Por naviera",
    byStatus: "Por estado",
    byMonth: "Tendencia mensual",
    noData: "No hay datos para los filtros seleccionados.",
    export: "Exportar CSV",
    exportFilename: "reportes_operaciones.csv",
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
    try { return createClient(); } catch { return null; }
  }, []);

  const loadData = useCallback(async () => {
    if (!supabase || authLoading) return;
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

    const [opsRes, clientesRes, navierasRes] = await Promise.all([
      baseQuery.order("ingreso", { ascending: false }),
      clientesQ,
      navierasQ,
    ]);

    if (opsRes.error) { setError(opsRes.error.message); setLoading(false); return; }

    setRows((opsRes.data ?? []) as DbOperacion[]);

    const sortLocale = locale === "es" ? "es" : undefined;
    setClientesOpts([...new Set((clientesRes.data ?? []).map((r: any) => r.cliente).filter(Boolean))].sort((a, b) => a.localeCompare(b, sortLocale, { sensitivity: "base" })));
    setNavierasOpts([...new Set((navierasRes.data ?? []).map((r: any) => r.naviera).filter(Boolean))].sort((a, b) => a.localeCompare(b, sortLocale, { sensitivity: "base" })));
    setLoading(false);
  }, [supabase, authLoading, empresaNombres, locale]);

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
    // Keep insertion order (already chronological desc, reverse for chart)
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

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading && !rows.length) {
    return (
      <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto p-3 sm:p-4 lg:p-5">
        <div className="max-w-[1400px] mx-auto space-y-4 animate-pulse">
          <div className="h-7 w-40 bg-neutral-200 rounded-lg" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 bg-white rounded-xl border border-neutral-200" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-56 bg-white rounded-xl border border-neutral-200" />
            <div className="h-56 bg-white rounded-xl border border-neutral-200" />
          </div>
        </div>
      </main>
    );
  }

  // ── KPI card helper ─────────────────────────────────────────────────────────
  const KpiCard = ({ icon, iconBg, iconColor, label, value, valueColor = "text-neutral-800", borderColor }: {
    icon: string; iconBg: string; iconColor: string; label: string; value: string;
    valueColor?: string; borderColor: string;
  }) => (
    <div className={`bg-white rounded-xl border border-neutral-200 border-t-2 ${borderColor} p-4 flex items-start gap-3`}>
      <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon icon={icon} width={18} height={18} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-neutral-500 font-medium">{label}</p>
        <p className={`text-xl font-bold mt-0.5 truncate ${valueColor}`}>{value}</p>
      </div>
    </div>
  );

  // ── Bar row helper ──────────────────────────────────────────────────────────
  const BarRow = ({ label, value, displayValue, subValue, maxValue, barColor }: {
    label: string; value: number; displayValue: string; subValue: string; maxValue: number; barColor: string;
  }) => {
    const pct = maxValue > 0 ? Math.max(2, (value / maxValue) * 100) : 0;
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-neutral-700 truncate max-w-[55%] font-medium">{label}</span>
          <span className="text-sm font-semibold text-neutral-800 flex-shrink-0">{displayValue}</span>
        </div>
        <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
          <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-neutral-400">{subValue}</p>
      </div>
    );
  };

  return (
    <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto p-3 sm:p-4 lg:p-5" role="main">
      <div className="max-w-[1400px] mx-auto space-y-4 animate-fade-in-up">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-brand-blue tracking-tight">{tr.title}</h1>
            <p className="text-neutral-500 text-xs sm:text-sm mt-0.5">{tr.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={!filteredRows.length}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors disabled:opacity-50 flex-shrink-0"
          >
            <Icon icon="lucide:download" width={15} height={15} />
            {tr.export}
          </button>
        </div>

        {/* ── Filtros ── */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Icon icon="typcn:filter" width={16} height={16} className="text-brand-blue" />
              <span className="text-sm font-semibold text-neutral-700">{tr.filters}</span>
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-brand-blue text-white rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => setFilters({ fechaDesde: "", fechaHasta: "", estado: "", cliente: "", naviera: "" })}
                className="text-xs text-neutral-500 hover:text-red-600 transition-colors flex items-center gap-1"
              >
                <Icon icon="lucide:x" width={12} height={12} />
                {tr.clearFilters}
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {[
              { label: tr.dateFrom, type: "date", key: "fechaDesde" as const },
              { label: tr.dateTo, type: "date", key: "fechaHasta" as const },
            ].map(({ label, type, key }) => (
              <div key={key}>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">{label}</label>
                <input
                  type={type}
                  value={filters[key]}
                  onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-neutral-200 focus:ring-2 focus:ring-brand-blue/25 focus:border-brand-blue transition-all bg-neutral-50 focus:bg-white"
                />
              </div>
            ))}
            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">{tr.state}</label>
              <select value={filters.estado} onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-neutral-200 focus:ring-2 focus:ring-brand-blue/25 focus:border-brand-blue transition-all bg-neutral-50 focus:bg-white">
                <option value="">{tr.allStates}</option>
                {ESTADOS_OPTS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">{tr.client}</label>
              <select value={filters.cliente} onChange={(e) => setFilters((f) => ({ ...f, cliente: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-neutral-200 focus:ring-2 focus:ring-brand-blue/25 focus:border-brand-blue transition-all bg-neutral-50 focus:bg-white">
                <option value="">{tr.allClients}</option>
                {clientesOpts.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">{tr.carrier}</label>
              <select value={filters.naviera} onChange={(e) => setFilters((f) => ({ ...f, naviera: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-neutral-200 focus:ring-2 focus:ring-brand-blue/25 focus:border-brand-blue transition-all bg-neutral-50 focus:bg-white">
                <option value="">{tr.allCarriers}</option>
                {navierasOpts.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <Icon icon="lucide:alert-circle" width={16} height={16} />
            {error}
          </div>
        )}

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          <KpiCard icon="typcn:document-text" iconBg="bg-slate-100" iconColor="text-slate-600"
            label={tr.totalOperations} value={fmt(kpis.totalOps)} borderColor="border-t-slate-400" />
          <KpiCard icon="typcn:th-large" iconBg="bg-amber-50" iconColor="text-amber-600"
            label={tr.totalPallets} value={fmt(kpis.totalPallets)} borderColor="border-t-amber-400" />
          <KpiCard icon="typcn:chart-bar" iconBg="bg-blue-50" iconColor="text-blue-600"
            label={tr.totalNetWeight} value={fmt(kpis.totalPesoNeto)} borderColor="border-t-blue-400" />
          <KpiCard icon="typcn:dollar" iconBg="bg-emerald-50" iconColor="text-emerald-600"
            label={tr.totalInvoiced} value={fmtCur(kpis.totalFacturado)} valueColor="text-emerald-700" borderColor="border-t-emerald-400" />
          <KpiCard icon="lucide:trending-up" iconBg="bg-teal-50" iconColor="text-teal-600"
            label={tr.totalMargin} value={fmtCur(kpis.totalMargen)} valueColor="text-teal-700" borderColor="border-t-teal-400" />
        </div>

        {!filteredRows.length ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
            <div className="w-14 h-14 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Icon icon="lucide:bar-chart-3" width={28} height={28} className="text-neutral-400" />
            </div>
            <p className="text-neutral-500 text-sm">{tr.noData}</p>
          </div>
        ) : (
          <>
            {/* ── Estado + Meses ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">

              {/* Por Estado */}
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50 flex items-center gap-2">
                  <span className="w-1 h-4 bg-brand-blue rounded-full flex-shrink-0" />
                  <Icon icon="lucide:pie-chart" width={15} height={15} className="text-brand-blue" />
                  <h2 className="font-semibold text-neutral-800 text-sm">{tr.byStatus}</h2>
                  <span className="ml-auto text-xs text-neutral-400">{filteredRows.length} ops</span>
                </div>
                <div className="p-4 space-y-2.5">
                  {byStatus.map(([estado, count]) => {
                    const cfg = ESTADO_CONFIG[estado] ?? { color: "text-neutral-600", bg: "bg-neutral-50", dot: "bg-neutral-400" };
                    const bar = ESTADO_BAR[estado] ?? "bg-neutral-400";
                    const pct = filteredRows.length > 0 ? (count / filteredRows.length) * 100 : 0;
                    return (
                      <div key={estado} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                            <span className="text-sm text-neutral-700 truncate font-medium">{estado}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{count}</span>
                            <span className="text-xs text-neutral-400 w-9 text-right">{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div className={`h-full ${bar} rounded-full transition-all duration-700`} style={{ width: `${Math.max(2, pct)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Por Mes */}
              {byMonth.length > 0 && (
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50 flex items-center gap-2">
                    <span className="w-1 h-4 bg-brand-teal rounded-full flex-shrink-0" />
                    <Icon icon="lucide:calendar-days" width={15} height={15} className="text-brand-teal" />
                    <h2 className="font-semibold text-neutral-800 text-sm">{tr.byMonth}</h2>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {(() => {
                      const maxFact = Math.max(...byMonth.map(([, v]) => v.facturado), 1);
                      return byMonth.map(([mes, val]) => (
                        <div key={mes} className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm text-neutral-700 font-medium capitalize w-24 flex-shrink-0">{mes}</span>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-xs text-neutral-400">{val.ops} ops</span>
                              <span className="text-sm font-semibold text-neutral-800">{fmtCur(val.facturado)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-teal/70 rounded-full transition-all duration-700"
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

            {/* ── Por Cliente + Por Naviera ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {/* Por Cliente */}
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50 flex items-center gap-2">
                  <span className="w-1 h-4 bg-brand-blue rounded-full flex-shrink-0" />
                  <Icon icon="lucide:building-2" width={15} height={15} className="text-brand-blue" />
                  <h2 className="font-semibold text-neutral-800 text-sm">{tr.byClient}</h2>
                </div>
                <div className="p-4 space-y-3.5">
                  {byClient.map((item) => (
                    <BarRow
                      key={item.key}
                      label={item.key}
                      value={item.totalMontoFacturado}
                      displayValue={fmtCur(item.totalMontoFacturado)}
                      subValue={`${item.totalOperaciones} ops · ${fmt(item.totalPallets)} pallets · Margen ${fmtCur(item.totalMargenReal)}`}
                      maxValue={byClient[0]?.totalMontoFacturado ?? 1}
                      barColor="bg-brand-blue/50"
                    />
                  ))}
                </div>
              </div>

              {/* Por Naviera */}
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50 flex items-center gap-2">
                  <span className="w-1 h-4 bg-brand-olive rounded-full flex-shrink-0" />
                  <Icon icon="typcn:anchor" width={17} height={17} className="text-brand-olive" />
                  <h2 className="font-semibold text-neutral-800 text-sm">{tr.byCarrier}</h2>
                </div>
                <div className="p-4 space-y-3.5">
                  {byCarrier.map((item) => (
                    <BarRow
                      key={item.key}
                      label={item.key}
                      value={item.totalMontoFacturado}
                      displayValue={fmtCur(item.totalMontoFacturado)}
                      subValue={`${item.totalOperaciones} ops · ${fmt(item.totalPallets)} pallets · Margen ${fmtCur(item.totalMargenReal)}`}
                      maxValue={byCarrier[0]?.totalMontoFacturado ?? 1}
                      barColor="bg-brand-olive/60"
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
