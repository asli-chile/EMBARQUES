import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { DashboardVisitorContent } from "./DashboardVisitorContent";
import { format, differenceInDays, addDays, subDays, formatDistanceToNow, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";

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
  }, [supabase, authLoading, empresaNombres]);

  const fetchDashboardData = useCallback(async () => {
    if (!supabase || authLoading) return;
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
  }, [supabase, authLoading, buildFilteredQuery]);

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
      <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto p-3 sm:p-4 lg:p-5">
        <div className="w-full max-w-[1600px] mx-auto space-y-3 sm:space-y-4 animate-pulse">
          <div className="h-10 w-48 bg-neutral-200 rounded-lg" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-neutral-200 p-3 sm:p-4 h-20 sm:h-24" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm h-64 sm:h-72" />
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm h-64 sm:h-72" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm h-56 sm:h-60" />
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm h-56 sm:h-60" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto p-3 sm:p-4 lg:p-5">
      <div className="w-full max-w-[1600px] mx-auto space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-brand-blue tracking-tight">{tr.title}</h1>
            <p className="text-neutral-500 text-xs mt-0.5 truncate">
              {tr.subtitle} · {format(new Date(), "EEEE d MMM", { locale: locale === "es" ? es : undefined })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/reservas/crear"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors shadow-sm"
            >
              <Icon icon="typcn:plus" width={16} height={16} />
              {t.sidebar.crearReserva}
            </a>
            <a
              href="/registros"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-brand-blue bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <Icon icon="typcn:th-list" width={16} height={16} />
              {t.sidebar.registros}
            </a>
            {lastFetchedAt && getLastUpdatedText() && (
              <span className="text-[11px] text-neutral-500 hidden md:inline">
                {tr.lastUpdated} {getLastUpdatedText()}
              </span>
            )}
            <button
              onClick={() => void fetchDashboardData()}
              className="inline-flex items-center justify-center p-2 text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              aria-label={tr.refresh}
            >
              <Icon icon="typcn:refresh" width={18} height={18} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-3 sm:p-4 shadow-mac-modal">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-neutral-700 hover:text-brand-blue transition-colors"
            aria-expanded={showFilters}
          >
            <span className="flex items-center gap-2">
              <Icon icon="typcn:filter" width={18} height={18} />
              {tr.filters}
              {hasActiveFilters && (
                <span className="px-1.5 py-0.5 text-xs bg-brand-blue/10 text-brand-blue rounded">
                  {[filters.etdDesde, filters.etdHasta, filters.estado, filters.cliente, filters.naviera].filter(Boolean).length}
                </span>
              )}
            </span>
            <Icon icon={showFilters ? "typcn:arrow-sorted-up" : "typcn:arrow-sorted-down"} width={14} height={14} />
          </button>
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">{tr.dateFrom}</label>
                <input
                  type="date"
                  value={filters.etdDesde}
                  onChange={(e) => setFilters((f) => ({ ...f, etdDesde: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-neutral-200 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">{tr.dateTo}</label>
                <input
                  type="date"
                  value={filters.etdHasta}
                  onChange={(e) => setFilters((f) => ({ ...f, etdHasta: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-neutral-200 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">{tr.state}</label>
                <select
                  value={filters.estado}
                  onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-neutral-200 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
                >
                  <option value="">{tr.allStates}</option>
                  {ESTADOS_OPTS.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">{tr.client}</label>
                <select
                  value={filters.cliente}
                  onChange={(e) => setFilters((f) => ({ ...f, cliente: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-neutral-200 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
                >
                  <option value="">{tr.allClients}</option>
                  {clientesOpts.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">{tr.carrier}</label>
                <select
                  value={filters.naviera}
                  onChange={(e) => setFilters((f) => ({ ...f, naviera: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-neutral-200 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
                >
                  <option value="">{tr.allCarriers}</option>
                  {navierasOpts.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors"
                >
                  {tr.applyFilters}
                </button>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="px-3 py-1.5 text-sm font-medium text-neutral-600 hover:text-brand-blue transition-colors"
                  >
                    {tr.clearFilters}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
          <div className="bg-white rounded-xl border border-neutral-200 border-t-2 border-t-slate-400 p-3 sm:p-4 shadow-mac-modal transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-neutral-500 truncate">{tr.totalOperations}</p>
                <p className="text-2xl sm:text-3xl font-bold text-neutral-800 mt-0.5 sm:mt-1">{totalOperaciones}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-blue/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="typcn:chart-bar" className="w-5 h-5 sm:w-6 sm:h-6 text-brand-blue" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 border-t-2 border-t-amber-400 p-3 sm:p-4 shadow-mac-modal transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-neutral-500 truncate">{tr.pending}</p>
                <p className="text-2xl sm:text-3xl font-bold text-amber-600 mt-0.5 sm:mt-1">{pendientes}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="typcn:time" className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 border-t-2 border-t-blue-400 p-3 sm:p-4 shadow-mac-modal transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-neutral-500 truncate">{tr.inProcess}</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-0.5 sm:mt-1">{enProceso}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="typcn:cog" className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 border-t-2 border-t-purple-400 p-3 sm:p-4 shadow-mac-modal transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-neutral-500 truncate">{tr.inTransit}</p>
                <p className="text-2xl sm:text-3xl font-bold text-purple-600 mt-0.5 sm:mt-1">{enTransito}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="typcn:plane" className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 border-t-2 border-t-emerald-400 p-3 sm:p-4 shadow-mac-modal transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-neutral-500 truncate">{tr.arrived}</p>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-0.5 sm:mt-1">{arribados}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="typcn:location" className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 border-t-2 border-t-green-400 p-3 sm:p-4 shadow-mac-modal transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-neutral-500 truncate">{tr.completed}</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-0.5 sm:mt-1">{completadas}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="typcn:tick" className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 border-t-2 border-t-red-400 p-3 sm:p-4 shadow-mac-modal transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-neutral-500 truncate">{tr.cancelled}</p>
                <p className="text-2xl sm:text-3xl font-bold text-red-600 mt-0.5 sm:mt-1">{cancelados}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="typcn:times" className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 border-t-2 border-t-orange-400 p-3 sm:p-4 shadow-mac-modal transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-neutral-500 truncate">{tr.rolled}</p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-600 mt-0.5 sm:mt-1">{roleados}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="typcn:arrow-repeat" className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 border-t-2 border-t-teal-400 p-3 sm:p-4 shadow-mac-modal transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-neutral-500 truncate">{tr.thisWeek}</p>
                <p className="text-2xl sm:text-3xl font-bold text-brand-teal mt-0.5 sm:mt-1">{thisWeekCount}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-teal/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="typcn:calendar" className="w-5 h-5 sm:w-6 sm:h-6 text-brand-teal" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 border-t-2 border-t-blue-500 p-3 sm:p-4 shadow-mac-modal transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-neutral-500 truncate">{tr.thisMonth}</p>
                <p className="text-2xl sm:text-3xl font-bold text-brand-blue mt-0.5 sm:mt-1">{thisMonthCount}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-blue/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="lucide:calendar-days" className="w-5 h-5 sm:w-6 sm:h-6 text-brand-blue" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 border-t-2 border-t-neutral-400 p-3 sm:p-4 shadow-mac-modal transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-neutral-500 truncate">{tr.activeClients}</p>
                <p className="text-2xl sm:text-3xl font-bold text-neutral-700 mt-0.5 sm:mt-1">{activeClientsCount}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-neutral-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="lucide:users" className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-mac-modal min-h-0 flex flex-col">
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between flex-shrink-0 rounded-t-xl">
              <h2 className="font-semibold text-neutral-800 flex items-center gap-2 text-sm sm:text-base">
                <span className="w-1 h-4 bg-brand-blue rounded-full flex-shrink-0" />
                <Icon icon="typcn:calendar" className="w-4 h-4 sm:w-5 sm:h-5 text-brand-blue" />
                {tr.upcomingDepartures}
              </h2>
              <a
                href="/reservas/mis-reservas"
                className="text-xs font-medium text-brand-blue hover:underline focus:outline-none focus:ring-2 focus:ring-brand-blue/30 rounded"
              >
                {tr.viewAll}
              </a>
            </div>
            <div className="p-2.5 sm:p-3 flex-1 min-h-0 overflow-auto max-h-[280px] sm:max-h-[320px]">
              {proximosZarpes.length === 0 ? (
                <p className="text-neutral-500 text-xs sm:text-sm text-center py-4 sm:py-6">{tr.noUpcoming}</p>
              ) : (
                <div className="space-y-1.5 sm:space-y-2">
                  {proximosZarpes.map((op) => {
                    const daysUntil = getDaysUntil(op.etd);
                    return (
                      <div
                        key={op.id}
                        className="flex items-center justify-between p-2 sm:p-2.5 bg-neutral-50 rounded-lg hover:bg-neutral-100/80 transition-colors gap-2"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-brand-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Icon icon="typcn:export" className="w-4 h-4 sm:w-5 sm:h-5 text-brand-blue" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-neutral-800 text-sm truncate">{op.ref_asli || op.booking || "-"}</p>
                            <p className="text-[10px] sm:text-xs text-neutral-500 truncate">{op.cliente || "-"} → {op.pod || "-"}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs sm:text-sm font-medium text-neutral-700">{formatDate(op.etd)}</p>
                          {daysUntil !== null && (
                            <p className={`text-[10px] sm:text-xs ${daysUntil <= 2 ? "text-red-500 font-medium" : "text-neutral-500"}`}>
                              {daysUntil === 0 ? tr.today : daysUntil === 1 ? tr.tomorrow : `${daysUntil} ${tr.days}`}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 shadow-mac-modal min-h-0 flex flex-col">
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between flex-shrink-0 rounded-t-xl">
              <h2 className="font-semibold text-neutral-800 flex items-center gap-2 text-sm sm:text-base">
                <span className="w-1 h-4 bg-brand-blue rounded-full flex-shrink-0" />
                <Icon icon="typcn:th-list" className="w-4 h-4 sm:w-5 sm:h-5 text-brand-blue" />
                {tr.recentOperations}
              </h2>
              <a
                href="/registros"
                className="text-xs font-medium text-brand-blue hover:underline focus:outline-none focus:ring-2 focus:ring-brand-blue/30 rounded"
              >
                {tr.viewAll}
              </a>
            </div>
            <div className="p-2.5 sm:p-3 flex-1 min-h-0 overflow-auto max-h-[280px] sm:max-h-[320px]">
              {recientes.length === 0 ? (
                <p className="text-neutral-500 text-xs sm:text-sm text-center py-4 sm:py-6">{tr.noRecent}</p>
              ) : (
                <div className="space-y-1.5 sm:space-y-2">
                  {recientes.map((op) => {
                    const style = getEstadoStyle(op.estado_operacion);
                    return (
                      <div
                        key={op.id}
                        className="flex items-center justify-between p-2 sm:p-2.5 bg-neutral-50 rounded-lg hover:bg-neutral-100/80 transition-colors gap-2"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 ${style.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <Icon icon={style.icon} className={`w-4 h-4 sm:w-5 sm:h-5 ${style.text}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-neutral-800 text-sm truncate">{op.ref_asli || op.booking || "-"}</p>
                            <p className="text-[10px] sm:text-xs text-neutral-500 truncate">{op.cliente || "-"}</p>
                          </div>
                        </div>
                        <span className={`px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full ${style.bg} ${style.text} flex-shrink-0 truncate max-w-[80px] sm:max-w-none`}>
                          {op.estado_operacion || "-"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-mac-modal">
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-neutral-100 bg-neutral-50/50 rounded-t-xl">
              <h2 className="font-semibold text-neutral-800 flex items-center gap-2 text-sm sm:text-base">
                <span className="w-1 h-4 bg-brand-teal rounded-full flex-shrink-0" />
                <Icon icon="typcn:chart-pie" className="w-4 h-4 sm:w-5 sm:h-5 text-brand-blue" />
                {tr.byStatus}
              </h2>
            </div>
            <div className="p-2.5 sm:p-3">
              <div className="space-y-1.5 sm:space-y-2">
                {estadosCounts.map((item) => {
                  const style = getEstadoStyle(item.estado);
                  const percentage = totalOperaciones > 0 ? (item.count / totalOperaciones) * 100 : 0;
                  return (
                    <div key={item.estado} className="space-y-1">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-neutral-700 truncate">{item.estado}</span>
                        <span className="font-medium text-neutral-800 ml-2">{item.count}</span>
                      </div>
                      <div className="h-1.5 sm:h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${style.bg} rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 shadow-mac-modal">
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-neutral-100 bg-neutral-50/50 rounded-t-xl">
              <h2 className="font-semibold text-neutral-800 flex items-center gap-2 text-sm sm:text-base">
                <span className="w-1 h-4 bg-brand-olive rounded-full flex-shrink-0" />
                <Icon icon="typcn:anchor" className="w-4 h-4 sm:w-5 sm:h-5 text-brand-blue" />
                {tr.topCarriers}
              </h2>
            </div>
            <div className="p-2.5 sm:p-3">
              {navierasCounts.length === 0 ? (
                <p className="text-neutral-500 text-xs sm:text-sm text-center py-4 sm:py-6">{tr.noCarriers}</p>
              ) : (
                <div className="space-y-1.5 sm:space-y-2">
                  {navierasCounts.map((item, index) => {
                    const maxCount = navierasCounts[0]?.count ?? 1;
                    const percentage = (item.count / maxCount) * 100;
                    return (
                      <div key={item.naviera} className="space-y-1">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-neutral-700 flex items-center gap-1.5 sm:gap-2 min-w-0">
                            <span className="w-4 h-4 sm:w-5 sm:h-5 bg-brand-blue/10 text-brand-blue rounded text-[10px] sm:text-xs flex items-center justify-center font-medium flex-shrink-0">
                              {index + 1}
                            </span>
                            <span className="truncate">{item.naviera}</span>
                          </span>
                          <span className="font-medium text-neutral-800 ml-2 flex-shrink-0">{item.count}</span>
                        </div>
                        <div className="h-1.5 sm:h-2 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-blue/60 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
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
