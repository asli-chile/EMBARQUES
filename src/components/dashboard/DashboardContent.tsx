import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { DashboardVisitorContent } from "./DashboardVisitorContent";
import { format, differenceInDays, addDays, subDays, formatDistanceToNow, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { withBase } from "@/lib/basePath";

type OperacionResumen = {
  id: string;
  ref_asli: string | null;
  cliente: string | null;
  naviera: string | null;
  nave: string | null;
  pod: string | null;
  etd: string | null;
  eta: string | null;
  estado_operacion: string | null;
  booking: string | null;
  created_at?: string;
};

type EstadoCount = {
  estado: string;
  count: number;
};

type NavieraCount = {
  naviera: string;
  count: number;
};

type DashboardFilters = {
  etdDesde: string;
  etdHasta: string;
  estado: string;
  cliente: string;
  naviera: string;
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

const estadoColors: Record<string, { bg: string; text: string; icon: string }> = {
  PENDIENTE: { bg: "bg-amber-100", text: "text-amber-700", icon: "typcn:time" },
  "EN PROCESO": { bg: "bg-blue-100", text: "text-blue-700", icon: "typcn:cog" },
  "EN TRÁNSITO": { bg: "bg-purple-100", text: "text-purple-700", icon: "typcn:plane" },
  ARRIBADO: { bg: "bg-green-100", text: "text-green-700", icon: "typcn:location" },
  COMPLETADO: { bg: "bg-neutral-100", text: "text-neutral-700", icon: "typcn:tick" },
  CANCELADO: { bg: "bg-red-100", text: "text-red-700", icon: "typcn:times" },
  ROLEADO: { bg: "bg-orange-100", text: "text-orange-700", icon: "typcn:arrow-repeat" },
};

export function DashboardContent() {
  const { t, locale } = useLocale();
  const { isExternalUser, isLoading: authLoading, isCliente, empresaNombres } = useAuth();
  const tr = t.dashboard;

  if (!authLoading && isExternalUser) {
    return <DashboardVisitorContent />;
  }
  const [loading, setLoading] = useState(true);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({
    etdDesde: "",
    etdHasta: "",
    estado: "",
    cliente: "",
    naviera: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [totalOperaciones, setTotalOperaciones] = useState(0);
  const [estadosCounts, setEstadosCounts] = useState<EstadoCount[]>([]);
  const [navierasCounts, setNavierasCounts] = useState<NavieraCount[]>([]);
  const [proximosZarpes, setProximosZarpes] = useState<OperacionResumen[]>([]);
  const [recientes, setRecientes] = useState<OperacionResumen[]>([]);
  const [clientesOpts, setClientesOpts] = useState<string[]>([]);
  const [navierasOpts, setNavierasOpts] = useState<string[]>([]);
  const [thisWeekCount, setThisWeekCount] = useState(0);
  const [thisMonthCount, setThisMonthCount] = useState(0);
  const [activeClientsCount, setActiveClientsCount] = useState(0);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const buildFilteredQuery = useCallback(
    (selectCols: string) => {
      if (!supabase) throw new Error("Supabase not ready");
      let q = supabase.from("operaciones").select(selectCols).is("deleted_at", null);
      if (empresaNombres.length > 0) {
        q = q.in("cliente", empresaNombres);
      }
      if (filters.etdDesde) q = q.gte("etd", filters.etdDesde);
      if (filters.etdHasta) q = q.lte("etd", filters.etdHasta);
      if (filters.estado) q = q.eq("estado_operacion", filters.estado);
      if (filters.cliente) q = q.eq("cliente", filters.cliente);
      if (filters.naviera) q = q.eq("naviera", filters.naviera);
      return q;
    },
    [supabase, filters, empresaNombres]
  );

  const fetchCatalogs = useCallback(async () => {
    if (!supabase || authLoading) return;
    if (isCliente && empresaNombres.length === 0) {
      setClientesOpts([]);
      setNavierasOpts([]);
      return;
    }
    let qClientes = supabase.from("operaciones").select("cliente").is("deleted_at", null).not("cliente", "is", null);
    let qNavieras = supabase.from("operaciones").select("naviera").is("deleted_at", null).not("naviera", "is", null);
    if (empresaNombres.length > 0) {
      qClientes = qClientes.in("cliente", empresaNombres);
      qNavieras = qNavieras.in("cliente", empresaNombres);
    }
    const [clientesRes, navierasRes] = await Promise.all([qClientes, qNavieras]);
    const clientes = [...new Set((clientesRes.data ?? []).map((r) => r.cliente).filter(Boolean) as string[])].sort();
    const navieras = [...new Set((navierasRes.data ?? []).map((r) => r.naviera).filter(Boolean) as string[])].sort();
    setClientesOpts(clientes);
    setNavierasOpts(navieras);
  }, [supabase, authLoading, isCliente, empresaNombres]);

  const fetchDashboardData = useCallback(async () => {
    if (!supabase || authLoading) return;
    if (isCliente && empresaNombres.length === 0) {
      setTotalOperaciones(0);
      setEstadosCounts([]);
      setNavierasCounts([]);
      setProximosZarpes([]);
      setRecientes([]);
      setThisWeekCount(0);
      setThisMonthCount(0);
      setActiveClientsCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);

    const today = new Date();
    const nextWeek = addDays(today, 7);
    const todayStr = today.toISOString().split("T")[0];
    const nextWeekStr = nextWeek.toISOString().split("T")[0];

    const [allRes, zarpesRes, recientesRes] = await Promise.all([
      buildFilteredQuery("id, ref_asli, cliente, naviera, nave, pod, etd, eta, estado_operacion, booking, created_at").limit(2000),
      buildFilteredQuery("id, ref_asli, cliente, naviera, nave, pod, etd, eta, estado_operacion, booking")
        .gte("etd", todayStr)
        .lte("etd", nextWeekStr)
        .order("etd", { ascending: true })
        .limit(10),
      buildFilteredQuery("id, ref_asli, cliente, naviera, nave, pod, etd, eta, estado_operacion, booking, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const allData = (allRes.data ?? []) as OperacionResumen[];

    const weekStart = subDays(today, 7);
    const monthStart = subDays(today, 30);
    let weekCount = 0;
    let monthCount = 0;
    const clientsSet = new Set<string>();

    allData.forEach((op) => {
      if (op.etd) {
        const etdDate = new Date(op.etd);
        if (isWithinInterval(etdDate, { start: weekStart, end: today })) weekCount++;
        if (isWithinInterval(etdDate, { start: monthStart, end: today })) monthCount++;
      }
      if (op.cliente) clientsSet.add(op.cliente);
    });

    setTotalOperaciones(allData.length);
    setThisWeekCount(weekCount);
    setThisMonthCount(monthCount);
    setActiveClientsCount(clientsSet.size);

    const estadosMap = new Map<string, number>();
    const navierasMap = new Map<string, number>();
    allData.forEach((op) => {
      const estado = op.estado_operacion || "SIN ESTADO";
      estadosMap.set(estado, (estadosMap.get(estado) ?? 0) + 1);
      if (op.naviera) navierasMap.set(op.naviera, (navierasMap.get(op.naviera) ?? 0) + 1);
    });
    setEstadosCounts(
      Array.from(estadosMap.entries())
        .map(([estado, count]) => ({ estado, count }))
        .sort((a, b) => b.count - a.count)
    );
    setNavierasCounts(
      Array.from(navierasMap.entries())
        .map(([naviera, count]) => ({ naviera, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
    );

    setProximosZarpes((zarpesRes.data ?? []) as OperacionResumen[]);
    setRecientes((recientesRes.data ?? []) as OperacionResumen[]);

    setLastFetchedAt(new Date());
    setLoading(false);
  }, [supabase, authLoading, isCliente, empresaNombres, buildFilteredQuery]);

  useEffect(() => {
    if (!authLoading) void fetchCatalogs();
  }, [authLoading, fetchCatalogs]);

  useEffect(() => {
    if (!authLoading) void fetchDashboardData();
  }, [authLoading, fetchDashboardData]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd MMM", { locale: locale === "es" ? es : undefined });
    } catch {
      return dateStr;
    }
  };

  const getDaysUntil = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const days = differenceInDays(new Date(dateStr), new Date());
      return days;
    } catch {
      return null;
    }
  };

  const getEstadoStyle = (estado: string) => {
    return estadoColors[estado] ?? { bg: "bg-neutral-100", text: "text-neutral-700", icon: "typcn:info" };
  };

  const pendientes = estadosCounts.find((e) => e.estado === "PENDIENTE")?.count ?? 0;
  const enProceso = estadosCounts.find((e) => e.estado === "EN PROCESO")?.count ?? 0;
  const enTransito = estadosCounts.find((e) => e.estado === "EN TRÁNSITO")?.count ?? 0;
  const arribados = estadosCounts.find((e) => e.estado === "ARRIBADO")?.count ?? 0;
  const completadas = estadosCounts.find((e) => e.estado === "COMPLETADO")?.count ?? 0;
  const cancelados = estadosCounts.find((e) => e.estado === "CANCELADO")?.count ?? 0;
  const roleados = estadosCounts.find((e) => e.estado === "ROLEADO")?.count ?? 0;

  const hasActiveFilters = filters.etdDesde || filters.etdHasta || filters.estado || filters.cliente || filters.naviera;

  const handleClearFilters = () => {
    setFilters({ etdDesde: "", etdHasta: "", estado: "", cliente: "", naviera: "" });
  };

  const handleApplyFilters = () => {
    void fetchDashboardData();
  };

  const getLastUpdatedText = () => {
    if (!lastFetchedAt) return null;
    try {
      return formatDistanceToNow(lastFetchedAt, {
        addSuffix: false,
        locale: locale === "es" ? es : undefined,
      });
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto">
        <div className="bg-white border-b border-neutral-200 h-14" />
        <div className="p-4 sm:p-5 w-full max-w-[1600px] mx-auto space-y-4 animate-pulse">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`bg-white rounded-2xl border border-neutral-200 h-24 ${i === 0 ? "col-span-2 sm:col-span-1" : ""}`} />
            ))}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-neutral-200 h-20" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-neutral-200 h-72" />
            <div className="bg-white rounded-2xl border border-neutral-200 h-72" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-neutral-200 h-60" />
            <div className="bg-white rounded-2xl border border-neutral-200 h-60" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-base font-bold text-neutral-900 tracking-tight leading-tight">{tr.title}</h1>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {format(new Date(), "EEEE d MMM yyyy", { locale: locale === "es" ? es : undefined })}
              {lastFetchedAt && getLastUpdatedText() && (
                <> · <span className="text-neutral-300">actualizado {getLastUpdatedText()}</span></>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a href={withBase("/reservas/crear")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors shadow-sm">
              <Icon icon="lucide:plus" className="w-3.5 h-3.5" />
              {t.sidebar.crearReserva}
            </a>
            <a href={withBase("/registros")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
              <Icon icon="lucide:list" className="w-3.5 h-3.5" />
              {t.sidebar.registros}
            </a>
            <button onClick={() => void fetchDashboardData()}
              className="p-1.5 text-neutral-400 hover:text-brand-blue bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              title={tr.refresh}>
              <Icon icon="lucide:refresh-cw" className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 lg:p-5 w-full max-w-[1600px] mx-auto space-y-4">

        {/* ── Filtros ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <button type="button" onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-between w-full text-left px-4 py-3 text-sm font-medium text-neutral-700 hover:text-brand-blue transition-colors"
            aria-expanded={showFilters}>
            <span className="flex items-center gap-2">
              <Icon icon="lucide:sliders-horizontal" className="w-4 h-4 text-neutral-400" />
              <span>{tr.filters}</span>
              {hasActiveFilters && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-brand-blue text-white rounded-full">
                  {[filters.etdDesde, filters.etdHasta, filters.estado, filters.cliente, filters.naviera].filter(Boolean).length}
                </span>
              )}
            </span>
            <Icon icon={showFilters ? "lucide:chevron-up" : "lucide:chevron-down"} className="w-4 h-4 text-neutral-300" />
          </button>
          {showFilters && (
            <div className="px-4 pb-4 border-t border-neutral-100 pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1">{tr.dateFrom}</label>
                <input type="date" value={filters.etdDesde}
                  onChange={(e) => setFilters((f) => ({ ...f, etdDesde: e.target.value }))}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-neutral-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue bg-neutral-50" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1">{tr.dateTo}</label>
                <input type="date" value={filters.etdHasta}
                  onChange={(e) => setFilters((f) => ({ ...f, etdHasta: e.target.value }))}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-neutral-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue bg-neutral-50" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1">{tr.state}</label>
                <select value={filters.estado} onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-neutral-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue bg-neutral-50">
                  <option value="">{tr.allStates}</option>
                  {ESTADOS_OPTS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1">{tr.client}</label>
                <select value={filters.cliente} onChange={(e) => setFilters((f) => ({ ...f, cliente: e.target.value }))}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-neutral-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue bg-neutral-50">
                  <option value="">{tr.allClients}</option>
                  {clientesOpts.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1">{tr.carrier}</label>
                <select value={filters.naviera} onChange={(e) => setFilters((f) => ({ ...f, naviera: e.target.value }))}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-neutral-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue bg-neutral-50">
                  <option value="">{tr.allCarriers}</option>
                  {navierasOpts.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button type="button" onClick={handleApplyFilters}
                  className="flex-1 px-3 py-1.5 text-sm font-semibold text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors">
                  {tr.applyFilters}
                </button>
                {hasActiveFilters && (
                  <button type="button" onClick={handleClearFilters}
                    className="px-3 py-1.5 text-sm text-neutral-400 hover:text-red-500 transition-colors">
                    {tr.clearFilters}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── KPIs fila 1: card destacada + estados activos ────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Total — card destacada */}
          <div className="col-span-2 sm:col-span-1 bg-brand-blue rounded-2xl p-4 text-white shadow-sm flex flex-col justify-between min-h-[96px]">
            <p className="text-[11px] font-semibold text-white/60 uppercase tracking-widest">{tr.totalOperations}</p>
            <p className="text-4xl font-bold leading-none mt-1">{totalOperaciones}</p>
            <p className="text-[11px] text-white/50 mt-2">{tr.activeClients}: <span className="text-white/80 font-semibold">{activeClientsCount}</span></p>
          </div>

          {/* Pendiente */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-start justify-between gap-1">
              <div>
                <p className="text-[11px] text-neutral-400 font-medium truncate">{tr.pending}</p>
                <p className="text-2xl font-bold text-amber-500 mt-1">{pendientes}</p>
              </div>
              <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="lucide:clock" className="w-4 h-4 text-amber-500" />
              </div>
            </div>
          </div>

          {/* En proceso */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-start justify-between gap-1">
              <div>
                <p className="text-[11px] text-neutral-400 font-medium truncate">{tr.inProcess}</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{enProceso}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="lucide:settings-2" className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </div>

          {/* En tránsito */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-start justify-between gap-1">
              <div>
                <p className="text-[11px] text-neutral-400 font-medium truncate">{tr.inTransit}</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{enTransito}</p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="lucide:ship" className="w-4 h-4 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Arribado */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-start justify-between gap-1">
              <div>
                <p className="text-[11px] text-neutral-400 font-medium truncate">{tr.arrived}</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{arribados}</p>
              </div>
              <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="lucide:map-pin" className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* ── KPIs fila 2: métricas secundarias ───────────────────────────── */}
        <div className="grid grid-cols-3 sm:grid-cols-5 xl:grid-cols-7 gap-3">
          {[
            { label: tr.completed,   value: completadas,   icon: "lucide:check-circle-2", cls: "text-green-600",  bg: "bg-green-50"  },
            { label: tr.cancelled,   value: cancelados,    icon: "lucide:x-circle",        cls: "text-red-500",   bg: "bg-red-50"    },
            { label: tr.rolled,      value: roleados,      icon: "lucide:refresh-cw",      cls: "text-orange-500",bg: "bg-orange-50" },
            { label: tr.thisWeek,    value: thisWeekCount, icon: "lucide:calendar",        cls: "text-brand-teal",bg: "bg-teal-50"   },
            { label: tr.thisMonth,   value: thisMonthCount,icon: "lucide:calendar-days",   cls: "text-brand-blue",bg: "bg-blue-50"   },
          ].map(({ label, value, icon, cls, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-neutral-200 p-3 shadow-sm">
              <div className={`w-7 h-7 ${bg} rounded-lg flex items-center justify-center mb-2`}>
                <Icon icon={icon} className={`w-3.5 h-3.5 ${cls}`} />
              </div>
              <p className={`text-xl font-bold ${cls}`}>{value}</p>
              <p className="text-[11px] text-neutral-400 mt-0.5 truncate leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Listas ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Próximos zarpes */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-brand-blue/10 rounded-lg flex items-center justify-center">
                  <Icon icon="lucide:anchor" className="w-3.5 h-3.5 text-brand-blue" />
                </div>
                <h2 className="font-semibold text-neutral-800 text-sm">{tr.upcomingDepartures}</h2>
                {proximosZarpes.length > 0 && (
                  <span className="text-[10px] font-bold bg-brand-blue/10 text-brand-blue px-1.5 py-0.5 rounded-full">{proximosZarpes.length}</span>
                )}
              </div>
              <a href={withBase("/reservas/mis-reservas")} className="text-xs font-medium text-brand-blue hover:underline">{tr.viewAll}</a>
            </div>
            <div className="divide-y divide-neutral-50 overflow-auto max-h-[300px] flex-1">
              {proximosZarpes.length === 0 ? (
                <p className="text-neutral-400 text-sm text-center py-10">{tr.noUpcoming}</p>
              ) : (
                proximosZarpes.map((op) => {
                  const daysUntil = getDaysUntil(op.etd);
                  const urgent = daysUntil !== null && daysUntil <= 2;
                  return (
                    <div key={op.id}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors ${urgent ? "bg-red-50/50" : ""}`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${urgent ? "bg-red-100" : "bg-brand-blue/10"}`}>
                        <Icon icon="lucide:ship" className={`w-4 h-4 ${urgent ? "text-red-500" : "text-brand-blue"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-800 truncate">{op.ref_asli || op.booking || "-"}</p>
                        <p className="text-[11px] text-neutral-400 truncate">{op.cliente || "-"} · {op.naviera || "-"} → {op.pod || "-"}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-neutral-700">{formatDate(op.etd)}</p>
                        {daysUntil !== null && (
                          <p className={`text-[10px] font-semibold ${urgent ? "text-red-500" : "text-neutral-400"}`}>
                            {daysUntil === 0 ? tr.today : daysUntil === 1 ? tr.tomorrow : `${daysUntil}d`}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Operaciones recientes */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-neutral-100 rounded-lg flex items-center justify-center">
                  <Icon icon="lucide:clock" className="w-3.5 h-3.5 text-neutral-500" />
                </div>
                <h2 className="font-semibold text-neutral-800 text-sm">{tr.recentOperations}</h2>
              </div>
              <a href={withBase("/registros")} className="text-xs font-medium text-brand-blue hover:underline">{tr.viewAll}</a>
            </div>
            <div className="divide-y divide-neutral-50 overflow-auto max-h-[300px] flex-1">
              {recientes.length === 0 ? (
                <p className="text-neutral-400 text-sm text-center py-10">{tr.noRecent}</p>
              ) : (
                recientes.map((op) => {
                  const style = getEstadoStyle(op.estado_operacion || "");
                  return (
                    <div key={op.id} className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors">
                      <div className={`w-9 h-9 ${style.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon icon={style.icon} className={`w-4 h-4 ${style.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-800 truncate">{op.ref_asli || op.booking || "-"}</p>
                        <p className="text-[11px] text-neutral-400 truncate">{op.cliente || "-"} · ETD {formatDate(op.etd)}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${style.bg} ${style.text}`}>
                        {op.estado_operacion || "-"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Analytics ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Por estado */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
              <div className="w-7 h-7 bg-brand-teal/10 rounded-lg flex items-center justify-center">
                <Icon icon="lucide:pie-chart" className="w-3.5 h-3.5 text-brand-teal" />
              </div>
              <h2 className="font-semibold text-neutral-800 text-sm">{tr.byStatus}</h2>
            </div>
            <div className="p-4 space-y-3">
              {estadosCounts.map((item) => {
                const style = getEstadoStyle(item.estado);
                const pct = totalOperaciones > 0 ? Math.round((item.count / totalOperaciones) * 100) : 0;
                return (
                  <div key={item.estado}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-neutral-600 font-medium">{item.estado}</span>
                      <span className="text-neutral-500 tabular-nums">{item.count} <span className="text-neutral-300">({pct}%)</span></span>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div className={`h-full ${style.bg} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top navieras */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
              <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center">
                <Icon icon="lucide:anchor" className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <h2 className="font-semibold text-neutral-800 text-sm">{tr.topCarriers}</h2>
            </div>
            <div className="p-4">
              {navierasCounts.length === 0 ? (
                <p className="text-neutral-400 text-sm text-center py-6">{tr.noCarriers}</p>
              ) : (
                <div className="space-y-3">
                  {navierasCounts.map((item, index) => {
                    const maxCount = navierasCounts[0]?.count ?? 1;
                    const pct = Math.round((item.count / maxCount) * 100);
                    return (
                      <div key={item.naviera}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="w-4 h-4 bg-brand-blue/10 text-brand-blue rounded text-[10px] flex items-center justify-center font-bold flex-shrink-0">
                              {index + 1}
                            </span>
                            <span className="text-neutral-600 font-medium truncate">{item.naviera}</span>
                          </span>
                          <span className="text-neutral-500 ml-2 flex-shrink-0 tabular-nums">{item.count}</span>
                        </div>
                        <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-blue/40 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
