import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { format, differenceInDays, addDays } from "date-fns";
import { es } from "date-fns/locale";

type OperacionResumen = {
  id: string;
  ref_asli: string;
  cliente: string;
  naviera: string;
  nave: string;
  pod: string;
  etd: string | null;
  eta: string | null;
  estado_operacion: string;
  booking: string;
};

type EstadoCount = {
  estado: string;
  count: number;
};

type NavieraCount = {
  naviera: string;
  count: number;
};

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
  const tr = t.dashboard;
  const [loading, setLoading] = useState(true);
  const [totalOperaciones, setTotalOperaciones] = useState(0);
  const [estadosCounts, setEstadosCounts] = useState<EstadoCount[]>([]);
  const [navierasCounts, setNavierasCounts] = useState<NavieraCount[]>([]);
  const [proximosZarpes, setProximosZarpes] = useState<OperacionResumen[]>([]);
  const [recientes, setRecientes] = useState<OperacionResumen[]>([]);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);

    const today = new Date();
    const nextWeek = addDays(today, 7);

    const [
      totalRes,
      estadosRes,
      navierasRes,
      zarpesRes,
      recientesRes,
    ] = await Promise.all([
      supabase.from("operaciones").select("id", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("operaciones").select("estado_operacion").is("deleted_at", null),
      supabase.from("operaciones").select("naviera").is("deleted_at", null).not("naviera", "is", null),
      supabase
        .from("operaciones")
        .select("id, ref_asli, cliente, naviera, nave, pod, etd, eta, estado_operacion, booking")
        .is("deleted_at", null)
        .gte("etd", today.toISOString().split("T")[0])
        .lte("etd", nextWeek.toISOString().split("T")[0])
        .order("etd", { ascending: true })
        .limit(5),
      supabase
        .from("operaciones")
        .select("id, ref_asli, cliente, naviera, nave, pod, etd, eta, estado_operacion, booking")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    setTotalOperaciones(totalRes.count ?? 0);

    const estadosData = estadosRes.data ?? [];
    const estadosMap = new Map<string, number>();
    estadosData.forEach((op) => {
      const estado = op.estado_operacion || "SIN ESTADO";
      estadosMap.set(estado, (estadosMap.get(estado) ?? 0) + 1);
    });
    setEstadosCounts(
      Array.from(estadosMap.entries())
        .map(([estado, count]) => ({ estado, count }))
        .sort((a, b) => b.count - a.count)
    );

    const navierasData = navierasRes.data ?? [];
    const navierasMap = new Map<string, number>();
    navierasData.forEach((op) => {
      if (op.naviera) {
        navierasMap.set(op.naviera, (navierasMap.get(op.naviera) ?? 0) + 1);
      }
    });
    setNavierasCounts(
      Array.from(navierasMap.entries())
        .map(([naviera, count]) => ({ naviera, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    );

    setProximosZarpes(zarpesRes.data ?? []);
    setRecientes(recientesRes.data ?? []);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

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
  const enTransito = estadosCounts.find((e) => e.estado === "EN TRÁNSITO")?.count ?? 0;
  const completadas = estadosCounts.find((e) => e.estado === "COMPLETADO")?.count ?? 0;

  if (loading) {
    return (
      <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto p-4 sm:p-6 flex items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-500">
          <Icon icon="typcn:refresh" className="w-6 h-6 animate-spin" />
          <span>{tr.loading}</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-brand-blue">{tr.title}</h1>
            <p className="text-neutral-500 text-xs sm:text-sm mt-0.5 sm:mt-1">{tr.subtitle}</p>
          </div>
          <button
            onClick={() => void fetchDashboardData()}
            className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors self-start sm:self-auto"
          >
            <Icon icon="typcn:refresh" width={18} height={18} />
            <span className="hidden sm:inline">{tr.refresh}</span>
            <span className="sm:hidden">Actualizar</span>
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg sm:rounded-xl border border-neutral-200 p-3 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-neutral-500 truncate">{tr.totalOperations}</p>
                <p className="text-2xl sm:text-3xl font-bold text-neutral-800 mt-0.5 sm:mt-1">{totalOperaciones}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-blue/10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="typcn:chart-bar" className="w-5 h-5 sm:w-6 sm:h-6 text-brand-blue" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl border border-neutral-200 p-3 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-neutral-500 truncate">{tr.pending}</p>
                <p className="text-2xl sm:text-3xl font-bold text-amber-600 mt-0.5 sm:mt-1">{pendientes}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="typcn:time" className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl border border-neutral-200 p-3 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-neutral-500 truncate">{tr.inTransit}</p>
                <p className="text-2xl sm:text-3xl font-bold text-purple-600 mt-0.5 sm:mt-1">{enTransito}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="typcn:plane" className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl border border-neutral-200 p-3 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-neutral-500 truncate">{tr.completed}</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-0.5 sm:mt-1">{completadas}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon icon="typcn:tick" className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg sm:rounded-xl border border-neutral-200 shadow-sm">
            <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-neutral-100">
              <h2 className="font-semibold text-neutral-800 flex items-center gap-2 text-sm sm:text-base">
                <Icon icon="typcn:calendar" className="w-4 h-4 sm:w-5 sm:h-5 text-brand-blue" />
                {tr.upcomingDepartures}
              </h2>
            </div>
            <div className="p-3 sm:p-4">
              {proximosZarpes.length === 0 ? (
                <p className="text-neutral-500 text-xs sm:text-sm text-center py-4 sm:py-6">{tr.noUpcoming}</p>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {proximosZarpes.map((op) => {
                    const daysUntil = getDaysUntil(op.etd);
                    return (
                      <div
                        key={op.id}
                        className="flex items-center justify-between p-2 sm:p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors gap-2"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-brand-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Icon icon="typcn:export" className="w-4 h-4 sm:w-5 sm:h-5 text-brand-blue" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-neutral-800 text-sm truncate">{op.ref_asli || op.booking}</p>
                            <p className="text-[10px] sm:text-xs text-neutral-500 truncate">{op.cliente} → {op.pod}</p>
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

          <div className="bg-white rounded-lg sm:rounded-xl border border-neutral-200 shadow-sm">
            <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-neutral-100">
              <h2 className="font-semibold text-neutral-800 flex items-center gap-2 text-sm sm:text-base">
                <Icon icon="typcn:th-list" className="w-4 h-4 sm:w-5 sm:h-5 text-brand-blue" />
                {tr.recentOperations}
              </h2>
            </div>
            <div className="p-3 sm:p-4">
              {recientes.length === 0 ? (
                <p className="text-neutral-500 text-xs sm:text-sm text-center py-4 sm:py-6">{tr.noRecent}</p>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {recientes.map((op) => {
                    const style = getEstadoStyle(op.estado_operacion);
                    return (
                      <div
                        key={op.id}
                        className="flex items-center justify-between p-2 sm:p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors gap-2"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 ${style.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <Icon icon={style.icon} className={`w-4 h-4 sm:w-5 sm:h-5 ${style.text}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-neutral-800 text-sm truncate">{op.ref_asli || op.booking}</p>
                            <p className="text-[10px] sm:text-xs text-neutral-500 truncate">{op.cliente}</p>
                          </div>
                        </div>
                        <span className={`px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full ${style.bg} ${style.text} flex-shrink-0 truncate max-w-[80px] sm:max-w-none`}>
                          {op.estado_operacion}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg sm:rounded-xl border border-neutral-200 shadow-sm">
            <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-neutral-100">
              <h2 className="font-semibold text-neutral-800 flex items-center gap-2 text-sm sm:text-base">
                <Icon icon="typcn:chart-pie" className="w-4 h-4 sm:w-5 sm:h-5 text-brand-blue" />
                {tr.byStatus}
              </h2>
            </div>
            <div className="p-3 sm:p-4">
              <div className="space-y-2 sm:space-y-3">
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

          <div className="bg-white rounded-lg sm:rounded-xl border border-neutral-200 shadow-sm">
            <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-neutral-100">
              <h2 className="font-semibold text-neutral-800 flex items-center gap-2 text-sm sm:text-base">
                <Icon icon="typcn:anchor" className="w-4 h-4 sm:w-5 sm:h-5 text-brand-blue" />
                {tr.topCarriers}
              </h2>
            </div>
            <div className="p-3 sm:p-4">
              {navierasCounts.length === 0 ? (
                <p className="text-neutral-500 text-xs sm:text-sm text-center py-4 sm:py-6">{tr.noCarriers}</p>
              ) : (
                <div className="space-y-2 sm:space-y-3">
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
