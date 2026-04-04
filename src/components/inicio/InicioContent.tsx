import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { brand, icons } from "@/lib/brand";
import { withBase } from "@/lib/basePath";
import { AuthFormTrigger } from "@/components/auth/AuthFormTrigger";
import { useAuth } from "@/lib/auth/AuthContext";
import { useState, useEffect, useRef } from "react";
import { AnimatedNetworkBackground } from "@/components/ui/AnimatedNetworkBackground";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface KpiData {
  operacionesActivas: number;
  contenedores: number;
  proximosEtd: number;
  documentosPendientes: number;
}

const pillars = [
  {
    key: "pillarOperations" as const,
    descKey: "pillarOperationsDesc" as const,
    icon: "lucide:ship",
    color: "blue",
    features: ["pillarOperationsF1", "pillarOperationsF2", "pillarOperationsF3", "pillarOperationsF4"] as const,
  },
  {
    key: "pillarTransport" as const,
    descKey: "pillarTransportDesc" as const,
    icon: "lucide:truck",
    color: "amber",
    features: ["pillarTransportF1", "pillarTransportF2", "pillarTransportF3", "pillarTransportF4"] as const,
  },
  {
    key: "pillarDocuments" as const,
    descKey: "pillarDocumentsDesc" as const,
    icon: "lucide:file-check",
    color: "violet",
    features: ["pillarDocumentsF1", "pillarDocumentsF2", "pillarDocumentsF3", "pillarDocumentsF4"] as const,
  },
  {
    key: "pillarFinance" as const,
    descKey: "pillarFinanceDesc" as const,
    icon: "lucide:bar-chart-3",
    color: "teal",
    features: ["pillarFinanceF1", "pillarFinanceF2", "pillarFinanceF3", "pillarFinanceF4"] as const,
  },
] as const;

const stats = [
  { valueKey: "stat1Value" as const, labelKey: "stat1Label" as const, icon: "lucide:package-check" },
  { valueKey: "stat2Value" as const, labelKey: "stat2Label" as const, icon: "lucide:clock" },
  { valueKey: "stat3Value" as const, labelKey: "stat3Label" as const, icon: "lucide:shield-check" },
  { valueKey: "stat4Value" as const, labelKey: "stat4Label" as const, icon: "lucide:file-check" },
] as const;

const comparisons = [
  { beforeKey: "comparison1Before" as const, afterKey: "comparison1After" as const },
  { beforeKey: "comparison2Before" as const, afterKey: "comparison2After" as const },
  { beforeKey: "comparison3Before" as const, afterKey: "comparison3After" as const },
  { beforeKey: "comparison4Before" as const, afterKey: "comparison4After" as const },
  { beforeKey: "comparison5Before" as const, afterKey: "comparison5After" as const },
] as const;

const workflowSteps = [
  { key: "workflowStep1" as const, descKey: "workflowStep1Desc" as const, icon: "lucide:calendar-plus", num: "01" },
  { key: "workflowStep2" as const, descKey: "workflowStep2Desc" as const, icon: "lucide:truck", num: "02" },
  { key: "workflowStep3" as const, descKey: "workflowStep3Desc" as const, icon: "lucide:boxes", num: "03" },
  { key: "workflowStep4" as const, descKey: "workflowStep4Desc" as const, icon: "lucide:ship", num: "04" },
  { key: "workflowStep5" as const, descKey: "workflowStep5Desc" as const, icon: "lucide:file-check", num: "05" },
] as const;

const quickLinks = [
  { key: "quickDashboard" as const, descKey: "quickDashboardDesc" as const, href: "/dashboard", icon: "lucide:layout-dashboard" },
  { key: "quickCreate" as const, descKey: "quickCreateDesc" as const, href: "/reservas/crear", icon: "lucide:plus-circle" },
  { key: "quickRecords" as const, descKey: "quickRecordsDesc" as const, href: "/registros", icon: "lucide:table-2" },
  { key: "quickDocument" as const, descKey: "quickDocumentDesc" as const, href: "/documentos/mis-documentos", icon: "lucide:file-text" },
  { key: "quickTransport" as const, descKey: "quickTransportDesc" as const, href: "/transportes/reserva-asli", icon: "lucide:truck" },
  { key: "quickReports" as const, descKey: "quickReportsDesc" as const, href: "/reportes", icon: "lucide:bar-chart-3" },
] as const;

const kpiConfig = [
  { key: "kpiOperations" as const, descKey: "kpiOperationsDesc" as const, dataKey: "operacionesActivas" as const, icon: "lucide:ship" },
  { key: "kpiContainers" as const, descKey: "kpiContainersDesc" as const, dataKey: "contenedores" as const, icon: "lucide:container" },
  { key: "kpiEtd" as const, descKey: "kpiEtdDesc" as const, dataKey: "proximosEtd" as const, icon: "lucide:calendar-clock" },
  { key: "kpiDocuments" as const, descKey: "kpiDocumentsDesc" as const, dataKey: "documentosPendientes" as const, icon: "lucide:file-text" },
] as const;

export function InicioContent() {
  const { t } = useLocale();
  const { profile, isExternalUser, isLoading: authLoading } = useAuth();
  const isLoggedIn = !authLoading && !isExternalUser && profile !== null;
  const mainRef = useRef<HTMLElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [kpiData, setKpiData] = useState<KpiData>({
    operacionesActivas: 0,
    contenedores: 0,
    proximosEtd: 0,
    documentosPendientes: 0,
  });
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    try {
      setSupabase(createClient());
    } catch {
      setSupabase(null);
      setLoadingKpis(false);
    }
  }, []);

  useEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;
    const handleScroll = () => setShowScrollTop(mainElement.scrollTop > 400);
    mainElement.addEventListener("scroll", handleScroll);
    return () => mainElement.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const fetchKpiData = async () => {
      try {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        const todayStr = today.toISOString().split("T")[0];
        const nextWeekStr = nextWeek.toISOString().split("T")[0];

        const estadosFinalizados = ["COMPLETADO", "CANCELADO", "ARRIBADO"];

        const { data: operaciones, error: opError } = await supabase
          .from("operaciones")
          .select("id, contenedor, etd, estado_operacion")
          .is("deleted_at", null);

        const { count: docCount, error: docError } = await supabase
          .from("documentos")
          .select("id", { count: "exact", head: true });

        const ops = operaciones || [];
        const operacionesActivas = ops.filter(
          (o) => !estadosFinalizados.includes(o.estado_operacion?.toUpperCase() || "")
        ).length;
        const contenedoresUnicos = new Set(ops.map((o) => o.contenedor).filter(Boolean)).size;
        const proximosEtd = ops.filter((o) => {
          if (!o.etd) return false;
          const etdDate = o.etd.split("T")[0];
          return etdDate >= todayStr && etdDate <= nextWeekStr;
        }).length;

        setKpiData({
          operacionesActivas,
          contenedores: contenedoresUnicos,
          proximosEtd,
          documentosPendientes: docCount || 0,
        });
      } catch {
        // error cargando KPIs, se mantienen valores por defecto
      } finally {
        setLoadingKpis(false);
      }
    };

    fetchKpiData();
  }, [supabase]);

  const handleScrollToTop = () => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main ref={mainRef} className="flex-1 min-h-0 overflow-auto relative isolate scroll-smooth snap-y snap-mandatory" role="main">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden min-h-[100dvh] w-full">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900" />
        <AnimatedNetworkBackground />
      </div>
      <div className="pointer-events-none fixed inset-0 z-0 bg-[#0f3d5c]/20" />

      {/* Hero */}
      <header className="relative z-10 text-white min-h-[calc(100vh-90px)] flex items-center justify-center py-12 sm:py-16 snap-start snap-always">
        <div className="max-w-5xl mx-auto px-4 sm:-translate-y-[50px]">
          <div className="flex flex-col items-center text-center">
            {isLoggedIn && profile && (
              <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-full backdrop-blur-sm">
                <Icon icon="lucide:user-check" className="text-emerald-400 flex-shrink-0" width={16} height={16} />
                <span className="text-white/90 text-sm font-medium">Bienvenido, <span className="text-white font-semibold">{profile.nombre}</span></span>
              </div>
            )}
            <img src={brand.logo} alt={brand.companyTitle} width={800} height={400} className="h-28 sm:h-36 lg:h-48 w-auto object-contain mb-4 sm:mb-6 brightness-0 invert" loading="eager" />
            <div className="relative inline-block mb-3">
              <div className="absolute bg-gradient-to-r from-brand-red/90 via-brand-red to-brand-red/90 shadow-[0_8px_32px_rgba(185,28,28,0.5),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.2)]" style={{ top: "4px", bottom: "4px", left: "12px", right: "12px", transform: "skewX(-40deg)" }} />
              <div className="absolute border border-white/20" style={{ top: "4px", bottom: "4px", left: "12px", right: "12px", transform: "skewX(-40deg)" }} />
              <h1 className="relative text-lg sm:text-2xl lg:text-4xl font-bold tracking-tight text-white px-4 sm:px-6 py-2 [text-shadow:2px_2px_0_#000,3px_3px_0_#000]">{t.inicio.heroTitle}</h1>
            </div>
            <div className="flex flex-col items-center gap-2 mb-6 sm:mb-8">
              <div className="relative inline-block">
                <div className="absolute bg-gradient-to-r from-brand-olive/90 via-brand-olive to-brand-olive/90 shadow-[0_6px_24px_rgba(102,153,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.2)]" style={{ top: "4px", bottom: "4px", left: "12px", right: "12px", transform: "skewX(-40deg)" }} />
                <div className="absolute border border-white/20" style={{ top: "4px", bottom: "4px", left: "12px", right: "12px", transform: "skewX(-40deg)" }} />
                <p className="relative text-sm sm:text-base lg:text-lg text-white px-4 sm:px-6 py-1.5 [text-shadow:2px_2px_0_#000,3px_3px_0_#000]">{t.inicio.heroDescriptionLine1}</p>
              </div>
              <div className="relative inline-block">
                <div className="absolute bg-gradient-to-r from-brand-olive/90 via-brand-olive to-brand-olive/90 shadow-[0_6px_24px_rgba(102,153,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.2)]" style={{ top: "4px", bottom: "4px", left: "12px", right: "12px", transform: "skewX(-40deg)" }} />
                <div className="absolute border border-white/20" style={{ top: "4px", bottom: "4px", left: "12px", right: "12px", transform: "skewX(-40deg)" }} />
                <p className="relative text-sm sm:text-base lg:text-lg text-white px-4 sm:px-6 py-1.5 [text-shadow:2px_2px_0_#000,3px_3px_0_#000]">{t.inicio.heroDescriptionLine2}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto justify-center">
              {isLoggedIn ? (
                <a href={withBase("/dashboard")} className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded bg-white text-brand-blue font-semibold hover:bg-white/95 transition-colors text-sm sm:text-base">
                  <Icon icon="lucide:layout-dashboard" width={18} height={18} />
                  Ir al Dashboard
                </a>
              ) : (
                <AuthFormTrigger mode="login" className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded bg-white text-brand-blue font-semibold hover:bg-white/95 transition-colors text-sm sm:text-base">
                  <Icon icon={icons.auth} width={18} height={18} />
                  {t.inicio.ctaLogin}
                </AuthFormTrigger>
              )}
              {isLoggedIn ? (
                <a href={withBase("/registros")} className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded border-2 border-white/80 text-white font-medium hover:bg-white/10 transition-colors text-sm sm:text-base">
                  <Icon icon="lucide:table-2" width={18} height={18} />
                  Ir a Registros
                </a>
              ) : (
                <a href="#pilares" className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded border-2 border-white/80 text-white font-medium hover:bg-white/10 transition-colors text-sm sm:text-base">
                  <Icon icon="lucide:layers" width={18} height={18} />
                  {t.inicio.ctaModules}
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Pilares */}
      <section id="pilares" className="relative z-10 py-8 min-h-[calc(100vh-90px)] flex flex-col justify-center snap-start snap-always">
        <div className="max-w-6xl mx-auto px-4 w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <span className="inline-block px-4 py-1.5 bg-brand-blue/30 border border-brand-blue/50 text-xs font-semibold text-white uppercase tracking-wider mb-3 rounded-full">{t.inicio.pillarsTag}</span>
            <h2 className="text-2xl lg:text-4xl font-bold text-white mb-2">{t.inicio.pillarsTitle}</h2>
            <p className="text-white/50 max-w-lg mx-auto text-sm">{t.inicio.pillarsSubtitle}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {pillars.map(({ key, descKey, icon, color, features }, index) => {
              const nums = ["01", "02", "03", "04"];
              const colors = {
                blue: {
                  border: "border-blue-500/25 hover:border-blue-400/60",
                  iconGradient: "from-blue-500/30 to-blue-900/20",
                  iconBorder: "border-blue-500/40",
                  iconColor: "text-blue-300",
                  accent: "bg-blue-500",
                  chip: "bg-blue-500/15 text-blue-300 border-blue-500/25",
                  numColor: "text-blue-500/20",
                  glow: "group-hover:shadow-blue-500/10",
                },
                amber: {
                  border: "border-amber-500/25 hover:border-amber-400/60",
                  iconGradient: "from-amber-500/30 to-amber-900/20",
                  iconBorder: "border-amber-500/40",
                  iconColor: "text-amber-300",
                  accent: "bg-amber-500",
                  chip: "bg-amber-500/15 text-amber-300 border-amber-500/25",
                  numColor: "text-amber-500/20",
                  glow: "group-hover:shadow-amber-500/10",
                },
                violet: {
                  border: "border-violet-500/25 hover:border-violet-400/60",
                  iconGradient: "from-violet-500/30 to-violet-900/20",
                  iconBorder: "border-violet-500/40",
                  iconColor: "text-violet-300",
                  accent: "bg-violet-500",
                  chip: "bg-violet-500/15 text-violet-300 border-violet-500/25",
                  numColor: "text-violet-500/20",
                  glow: "group-hover:shadow-violet-500/10",
                },
                teal: {
                  border: "border-teal-500/25 hover:border-teal-400/60",
                  iconGradient: "from-teal-500/30 to-teal-900/20",
                  iconBorder: "border-teal-500/40",
                  iconColor: "text-teal-300",
                  accent: "bg-teal-500",
                  chip: "bg-teal-500/15 text-teal-300 border-teal-500/25",
                  numColor: "text-teal-500/20",
                  glow: "group-hover:shadow-teal-500/10",
                },
              };
              const c = colors[color];

              return (
                <div key={key} className={`group relative bg-black/40 backdrop-blur-md border ${c.border} rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:bg-black/55 shadow-xl shadow-black/30 ${c.glow}`}>
                  {/* Línea de acento superior */}
                  <div className={`absolute top-0 left-0 right-0 h-[2px] ${c.accent} opacity-70`} />

                  {/* Ícono decorativo de fondo */}
                  <div className="absolute -bottom-4 -right-4 opacity-[0.04] pointer-events-none">
                    <Icon icon={icon} width={130} height={130} />
                  </div>

                  <div className="relative p-5 sm:p-6">
                    {/* Número + ícono */}
                    <div className="flex items-center gap-4 mb-5">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${c.iconGradient} border ${c.iconBorder} flex items-center justify-center shadow-lg flex-shrink-0`}>
                        <Icon icon={icon} className={`${c.iconColor} drop-shadow-[0_0_8px_currentColor]`} width={28} height={28} />
                      </div>
                      <span className={`text-5xl font-black ${c.numColor} leading-none select-none`}>{nums[index]}</span>
                    </div>

                    {/* Título y descripción */}
                    <h3 className="text-lg font-bold text-white mb-1.5">{t.inicio[key]}</h3>
                    <p className="text-white/50 text-xs sm:text-sm mb-4 leading-relaxed">{t.inicio[descKey]}</p>

                    {/* Feature chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {features.map((fKey) => (
                        <span key={fKey} className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] border rounded-full ${c.chip}`}>
                          <Icon icon="lucide:check" width={9} height={9} />
                          {t.inicio[fKey]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 py-8 bg-black/35 backdrop-blur-md min-h-[calc(100vh-90px)] flex flex-col justify-center snap-start snap-always">
        <div className="max-w-5xl mx-auto px-4 w-full">
          <div className="text-center mb-8">
            <span className="inline-block px-4 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-3 rounded-full">{t.inicio.statsTag}</span>
            <h2 className="text-2xl lg:text-4xl font-bold text-white mb-2">{t.inicio.statsTitle}</h2>
            <p className="text-white/50 text-sm max-w-md mx-auto">{t.inicio.statsSubtitle}</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(({ valueKey, labelKey, icon }) => (
              <div key={valueKey} className="group relative text-center p-5 sm:p-6 bg-black/40 backdrop-blur-md border border-white/15 hover:border-emerald-500/40 rounded-2xl shadow-xl shadow-black/20 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500 opacity-50 rounded-t-2xl" />
                <div className="absolute -bottom-4 -right-4 opacity-[0.04] pointer-events-none">
                  <Icon icon={icon} width={80} height={80} />
                </div>
                <div className="relative z-10 w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-emerald-500/30 to-emerald-900/20 border border-emerald-500/40 rounded-xl flex items-center justify-center">
                  <Icon icon={icon} className="text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" width={22} height={22} />
                </div>
                <p className="text-3xl lg:text-4xl font-black text-white mb-1">{t.inicio[valueKey]}</p>
                <p className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wide leading-tight">{t.inicio[labelKey]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparación Antes/Después */}
      <section className="relative z-10 py-8 min-h-[calc(100vh-90px)] flex flex-col justify-center snap-start snap-always">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <span className="inline-block px-4 py-1.5 bg-rose-500/20 border border-rose-500/40 text-xs font-semibold text-rose-300 uppercase tracking-wider mb-3 sm:mb-4 rounded-full">{t.inicio.comparisonTag}</span>
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-2 sm:mb-3">{t.inicio.comparisonTitle}</h2>
            <p className="text-white/60 text-sm sm:text-base">{t.inicio.comparisonSubtitle}</p>
          </div>

          {/* Desktop: tabla de 2 columnas */}
          <div className="hidden sm:block bg-black/50 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden shadow-xl shadow-black/30">
            <div className="grid grid-cols-2">
              <div className="bg-rose-500/15 border-b border-white/10 px-4 sm:px-6 py-3 sm:py-4">
                <p className="text-rose-400 font-semibold text-xs sm:text-sm uppercase tracking-wide flex items-center gap-2">
                  <Icon icon="lucide:x" width={16} height={16} />
                  {t.inicio.comparisonBefore}
                </p>
              </div>
              <div className="bg-emerald-500/15 border-b border-white/10 px-4 sm:px-6 py-3 sm:py-4">
                <p className="text-emerald-400 font-semibold text-xs sm:text-sm uppercase tracking-wide flex items-center gap-2">
                  <Icon icon="lucide:check" width={16} height={16} />
                  {t.inicio.comparisonAfter}
                </p>
              </div>
            </div>
            {comparisons.map(({ beforeKey, afterKey }, i) => (
              <div key={beforeKey} className={`grid grid-cols-2 ${i < comparisons.length - 1 ? "border-b border-white/10" : ""}`}>
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-r border-white/10 bg-black/20">
                  <p className="text-white/60 text-xs sm:text-sm">{t.inicio[beforeKey]}</p>
                </div>
                <div className="px-4 sm:px-6 py-3 sm:py-4 bg-black/10">
                  <p className="text-white text-xs sm:text-sm">{t.inicio[afterKey]}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile: lista vertical */}
          <div className="sm:hidden space-y-3">
            {comparisons.map(({ beforeKey, afterKey }) => (
              <div key={beforeKey} className="bg-black/50 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden shadow-lg shadow-black/20">
                <div className="bg-rose-500/15 px-4 py-2.5 flex items-center gap-2">
                  <Icon icon="lucide:x" className="text-rose-400" width={14} height={14} />
                  <p className="text-white/60 text-xs">{t.inicio[beforeKey]}</p>
                </div>
                <div className="bg-emerald-500/10 px-4 py-2.5 flex items-center gap-2">
                  <Icon icon="lucide:check" className="text-emerald-400" width={14} height={14} />
                  <p className="text-white text-xs">{t.inicio[afterKey]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="relative z-10 py-8 bg-black/35 backdrop-blur-md overflow-hidden min-h-[calc(100vh-90px)] flex flex-col justify-center snap-start snap-always">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10 sm:mb-16">
            <span className="inline-block px-4 py-1.5 bg-cyan-500/20 border border-cyan-500/40 text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-3 sm:mb-4 rounded-full">{t.inicio.workflowTag}</span>
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-2 sm:mb-3">{t.inicio.workflowTitle}</h2>
            <p className="text-white/60 text-sm sm:text-base">{t.inicio.workflowSubtitle}</p>
          </div>

          {/* Desktop: timeline horizontal */}
          <div className="hidden lg:block">
            <div className="relative grid grid-cols-5 gap-4">
              {/* Línea de conexión — top-10 = 40px = centro exacto del círculo h-20 (80px) */}
              <div className="absolute top-10 left-[10%] right-[10%] h-px bg-gradient-to-r from-cyan-500/20 via-cyan-500/60 to-cyan-500/20" />
              <div className="absolute top-10 left-[10%] right-[10%] h-px bg-gradient-to-r from-cyan-500/0 via-cyan-400/40 to-cyan-500/0 blur-sm" />

              {workflowSteps.map(({ key, descKey, icon, num }, index) => (
                <div key={key} className="relative flex flex-col items-center group">
                  {/* Nodo circular — centro en top-10 (40px) */}
                  <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/25 to-cyan-900/40 border-2 border-cyan-500/50 flex items-center justify-center shadow-lg shadow-cyan-500/15 group-hover:border-cyan-400/80 group-hover:shadow-cyan-500/35 group-hover:from-cyan-500/40 transition-all duration-300">
                    {/* Badge número */}
                    <div className="absolute -top-2 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 text-white text-xs font-bold flex items-center justify-center shadow-md shadow-cyan-500/40 z-20">
                      {num}
                    </div>
                    <Icon icon={icon} className="text-cyan-300 group-hover:text-cyan-200 group-hover:scale-110 transition-all duration-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]" width={36} height={36} />
                  </div>

                  {/* Flecha centrada en la línea (top 40px = centro del círculo h-20) */}
                  {index < workflowSteps.length - 1 && (
                    <div className="absolute z-20" style={{ top: '40px', right: 0, transform: 'translate(50%, -50%)' }}>
                      <Icon icon="lucide:chevron-right" className="text-cyan-400/80" width={18} height={18} />
                    </div>
                  )}

                  {/* Card de contenido debajo del nodo */}
                  <div className="w-full mt-5 relative bg-black/50 backdrop-blur-md border border-white/10 rounded-xl p-4 group-hover:border-cyan-500/50 group-hover:bg-black/60 transition-all duration-300 shadow-lg shadow-black/20 group-hover:-translate-y-1">
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <h3 className="text-white font-bold text-base mb-1.5 text-center">{t.inicio[key]}</h3>
                    <p className="text-white/50 text-sm text-center leading-relaxed">{t.inicio[descKey]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tablet: 3+2 grid */}
          <div className="hidden sm:block lg:hidden">
            <div className="grid grid-cols-3 gap-4 mb-4">
              {workflowSteps.slice(0, 3).map(({ key, descKey, icon, num }) => (
                <div key={key} className="relative bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:border-cyan-500/50 hover:bg-black/60 transition-all shadow-lg shadow-black/20 group">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 bg-gradient-to-br from-cyan-400 to-cyan-600 text-white text-xs font-bold flex items-center justify-center shadow-lg rounded-full">
                    {num}
                  </div>
                  <div className="mx-auto mt-2 mb-4 bg-gradient-to-br from-cyan-500/25 to-cyan-900/30 border border-cyan-500/40 rounded-2xl flex items-center justify-center group-hover:from-cyan-500/40 group-hover:border-cyan-400/70 transition-all shadow-md shadow-cyan-500/10 group-hover:shadow-cyan-500/25" style={{width: '72px', height: '72px'}}>
                    <Icon icon={icon} className="text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] group-hover:scale-110 group-hover:text-cyan-200 transition-all duration-300" width={36} height={36} />
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-1 text-center">{t.inicio[key]}</h3>
                  <p className="text-white/50 text-xs text-center">{t.inicio[descKey]}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              {workflowSteps.slice(3).map(({ key, descKey, icon, num }) => (
                <div key={key} className="relative bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:border-cyan-500/50 hover:bg-black/60 transition-all shadow-lg shadow-black/20 group">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 bg-gradient-to-br from-cyan-400 to-cyan-600 text-white text-xs font-bold flex items-center justify-center shadow-lg rounded-full">
                    {num}
                  </div>
                  <div className="mx-auto mt-2 mb-4 bg-gradient-to-br from-cyan-500/25 to-cyan-900/30 border border-cyan-500/40 rounded-2xl flex items-center justify-center group-hover:from-cyan-500/40 group-hover:border-cyan-400/70 transition-all shadow-md shadow-cyan-500/10 group-hover:shadow-cyan-500/25" style={{width: '72px', height: '72px'}}>
                    <Icon icon={icon} className="text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] group-hover:scale-110 group-hover:text-cyan-200 transition-all duration-300" width={36} height={36} />
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-1 text-center">{t.inicio[key]}</h3>
                  <p className="text-white/50 text-xs text-center">{t.inicio[descKey]}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: lista vertical con línea de conexión */}
          <div className="sm:hidden relative">
            {/* Línea vertical de conexión */}
            <div className="absolute top-8 bottom-8 left-6 w-0.5 bg-gradient-to-b from-cyan-500/60 via-cyan-500/40 to-cyan-500/60" />
            
            <div className="space-y-4">
              {workflowSteps.map(({ key, descKey, icon, num }) => (
                <div key={key} className="relative flex items-start gap-4 pl-2">
                  {/* Número circular */}
                  <div className="relative z-10 w-9 h-9 bg-gradient-to-br from-cyan-400 to-cyan-600 text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-cyan-500/30 flex-shrink-0 rounded-full">
                    {num}
                  </div>
                  
                  {/* Card */}
                  <div className="flex-1 bg-black/50 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-lg shadow-black/20">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/25 to-cyan-900/30 border border-cyan-500/40 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-cyan-500/10">
                        <Icon icon={icon} className="text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]" width={24} height={24} />
                      </div>
                      <h3 className="text-white font-semibold text-sm">{t.inicio[key]}</h3>
                    </div>
                    <p className="text-white/50 text-xs pl-[52px]">{t.inicio[descKey]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="relative z-10 py-8 min-h-[calc(100vh-90px)] flex flex-col justify-center snap-start snap-always">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <span className="inline-block px-4 py-1.5 bg-violet-500/20 border border-violet-500/40 text-xs font-semibold text-violet-300 uppercase tracking-wider mb-3 sm:mb-4 rounded-full">{t.inicio.quickLinksTag}</span>
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-2 sm:mb-3">{t.inicio.quickLinksTitle}</h2>
            <p className="text-white/60 text-sm sm:text-base">{t.inicio.quickLinksSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {quickLinks.map(({ key, descKey, href, icon }) => (
              <a key={key} href={withBase(href)} className="group flex items-center gap-3 sm:gap-4 p-4 sm:p-5 bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl hover:border-violet-400/50 hover:bg-black/50 transition-all duration-300 hover:-translate-y-0.5 shadow-lg shadow-black/20">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-violet-500/25 to-violet-900/20 border border-violet-500/40 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:from-violet-500/40 group-hover:border-violet-400/60 transition-all">
                  <Icon icon={icon} className="text-violet-300 drop-shadow-[0_0_8px_rgba(167,139,250,0.6)]" width={20} height={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-white font-semibold text-sm mb-0.5">{t.inicio[key]}</h3>
                  <p className="text-white/50 text-xs line-clamp-1">{t.inicio[descKey]}</p>
                </div>
                <Icon icon="lucide:chevron-right" className="text-white/30 group-hover:text-violet-400 flex-shrink-0 transition-colors" width={18} height={18} />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* KPIs Preview */}
      <section className="relative z-10 py-8 bg-black/35 backdrop-blur-md min-h-[calc(100vh-90px)] flex flex-col justify-center snap-start snap-always">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <span className="inline-block px-4 py-1.5 bg-blue-500/20 border border-blue-500/40 text-xs font-semibold text-blue-300 uppercase tracking-wider mb-3 sm:mb-4 rounded-full">{t.inicio.kpiTag}</span>
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-2 sm:mb-3">{t.inicio.kpiTitle}</h2>
            <p className="text-white/60 text-sm sm:text-base">{t.inicio.kpiSubtitle}</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {kpiConfig.map(({ key, descKey, dataKey, icon }) => {
              const value = kpiData[dataKey];
              return (
                <div key={key} className="p-4 sm:p-5 bg-black/50 backdrop-blur-md border border-white/20 rounded-2xl shadow-lg shadow-black/20 hover:border-blue-500/40 hover:-translate-y-0.5 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500/25 to-blue-900/20 border border-blue-500/40 rounded-xl flex items-center justify-center">
                      <Icon icon={icon} className="text-blue-300 drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]" width={16} height={16} />
                    </div>
                    {value > 0 && (
                      <span className="text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 bg-emerald-500/30 text-emerald-400">
                        Activo
                      </span>
                    )}
                  </div>
                  {loadingKpis ? (
                    <div className="h-8 sm:h-9 w-16 bg-white/10 animate-pulse rounded mb-1" />
                  ) : (
                    <p className="text-2xl sm:text-3xl font-bold text-blue-400 mb-1">{value}</p>
                  )}
                  <p className="text-white font-medium text-xs sm:text-sm">{t.inicio[key]}</p>
                  <p className="text-white/50 text-[10px] sm:text-xs">{t.inicio[descKey]}</p>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <a href={withBase("/dashboard")} className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-black/50 backdrop-blur-md border border-white/30 rounded-xl text-white font-medium hover:bg-black/60 hover:border-blue-400/50 transition-all shadow-lg shadow-black/20 text-sm sm:text-base">
              <Icon icon="lucide:layout-dashboard" width={18} height={18} />
              {t.inicio.kpiCta}
              <Icon icon="lucide:arrow-right" width={16} height={16} />
            </a>
          </div>
        </div>
      </section>

      {/* CTA Final + Footer */}
      <section className="relative z-10 min-h-[calc(100vh-90px)] flex flex-col snap-start snap-always">
        {/* CTA centrado */}
        <div className="flex-1 flex flex-col justify-center py-8">
          <div className="max-w-3xl mx-auto px-4 w-full">
            <div className="bg-black/35 backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-10 lg:p-14 text-center shadow-xl shadow-black/30">
              <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">{t.inicio.ctaFinalTitle}</h2>
              <p className="text-white/60 text-sm sm:text-base mb-6 sm:mb-8 max-w-xl mx-auto">{t.inicio.ctaFinalSubtitle}</p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6 sm:mb-8">
                <AuthFormTrigger mode="registro" className="inline-flex items-center justify-center gap-2 py-2.5 sm:py-3 px-6 sm:px-8 bg-brand-blue text-white font-semibold rounded-xl hover:bg-brand-blue/90 transition-colors shadow-lg shadow-brand-blue/30 text-sm sm:text-base">
                  <Icon icon="lucide:user-plus" width={18} height={18} />
                  {t.inicio.ctaFinalButton1}
                </AuthFormTrigger>
                <a href="mailto:informaciones@asli.cl?subject=Solicitud de demo EMBARQUES" className="inline-flex items-center justify-center gap-2 py-2.5 sm:py-3 px-6 sm:px-8 bg-white/10 border border-white/30 rounded-xl text-white font-medium hover:bg-white/20 transition-colors text-sm sm:text-base">
                  <Icon icon="lucide:play-circle" width={18} height={18} />
                  {t.inicio.ctaFinalButton2}
                </a>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center text-xs sm:text-sm text-white/60">
                <span className="flex items-center justify-center gap-2">
                  <Icon icon="lucide:check" className="text-emerald-400" width={14} height={14} />
                  {t.inicio.ctaFinalFeature1}
                </span>
                <span className="flex items-center justify-center gap-2">
                  <Icon icon="lucide:check" className="text-emerald-400" width={14} height={14} />
                  {t.inicio.ctaFinalFeature2}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer anclado al fondo */}
        <footer className="py-6 bg-black/80 backdrop-blur-lg text-white border-t border-white/10 flex-shrink-0">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex flex-col items-center mb-4">
              <img src={brand.logo} alt={brand.companyTitle} width={160} height={80} className="h-8 sm:h-10 w-auto object-contain brightness-0 invert mb-3" />

              <div className="flex gap-2 sm:gap-3 mb-3">
                <a href="https://www.linkedin.com/company/aslichile/posts/?feedView=all" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-white/15 border border-white/20 flex items-center justify-center hover:bg-white/25 hover:border-white/40 transition-colors" aria-label="LinkedIn">
                  <Icon icon="mdi:linkedin" width={16} height={16} />
                </a>
                <a href="https://www.instagram.com/asli_chile/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-white/15 border border-white/20 flex items-center justify-center hover:bg-white/25 hover:border-white/40 transition-colors" aria-label="Instagram">
                  <Icon icon="mdi:instagram" width={16} height={16} />
                </a>
                <a href="https://wa.me/56968394225" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-white/15 border border-white/20 flex items-center justify-center hover:bg-white/25 hover:border-white/40 transition-colors" aria-label="WhatsApp">
                  <Icon icon="mdi:whatsapp" width={16} height={16} />
                </a>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-x-6 text-[11px] sm:text-xs text-white/50">
                <span className="flex items-center gap-1.5">
                  <Icon icon="lucide:map-pin" width={12} height={12} className="text-brand-teal flex-shrink-0" />
                  <span className="text-center sm:text-left">{t.inicio.footerLocation}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon icon="lucide:mail" width={12} height={12} className="text-brand-teal flex-shrink-0" />
                  {t.inicio.footerEmail}
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon icon="lucide:phone" width={12} height={12} className="text-brand-teal flex-shrink-0" />
                  {t.inicio.footerPhone}
                </span>
              </div>
            </div>

            <div className="border-t border-white/10 pt-3 text-center">
              <p className="text-[10px] sm:text-xs text-white/30">
                © {new Date().getFullYear()} {brand.companyTitle} · {t.inicio.footerCopyright}
              </p>
            </div>
          </div>
        </footer>
      </section>

      {/* Scroll to top */}
      <button
        type="button"
        onClick={handleScrollToTop}
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-10 h-10 sm:w-12 sm:h-12 bg-brand-blue/90 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center shadow-lg hover:bg-brand-blue transition-all duration-300 ${showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
        aria-label="Volver arriba"
      >
        <Icon icon="lucide:chevron-up" width={20} height={20} />
      </button>
    </main>
  );
}
