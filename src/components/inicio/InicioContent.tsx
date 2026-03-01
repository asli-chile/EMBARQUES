import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { brand, icons } from "@/lib/brand";
import { useState, useEffect, useRef, useMemo } from "react";
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
] as const;

const stats = [
  { valueKey: "stat1Value" as const, labelKey: "stat1Label" as const, icon: "lucide:package-check" },
  { valueKey: "stat2Value" as const, labelKey: "stat2Label" as const, icon: "lucide:clock" },
  { valueKey: "stat3Value" as const, labelKey: "stat3Label" as const, icon: "lucide:shield-check" },
  { valueKey: "stat4Value" as const, labelKey: "stat4Label" as const, icon: "lucide:zap" },
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
  const mainRef = useRef<HTMLElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [kpiData, setKpiData] = useState<KpiData>({
    operacionesActivas: 0,
    contenedores: 0,
    proximosEtd: 0,
    documentosPendientes: 0,
  });
  const [loadingKpis, setLoadingKpis] = useState(true);

  useEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;
    const handleScroll = () => setShowScrollTop(mainElement.scrollTop > 400);
    mainElement.addEventListener("scroll", handleScroll);
    return () => mainElement.removeEventListener("scroll", handleScroll);
  }, []);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchKpiData = async () => {
      try {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        const todayStr = today.toISOString().split("T")[0];
        const nextWeekStr = nextWeek.toISOString().split("T")[0];

        const { data: operaciones, error: opError } = await supabase
          .from("operaciones")
          .select("id, contenedor, etd, estado_operacion")
          .in("estado_operacion", ["reserva", "en_proceso", "transito"]);

        if (opError) {
          console.warn("Error fetching operaciones:", opError.message);
        }

        const { count: docCount, error: docError } = await supabase
          .from("documentos")
          .select("id", { count: "exact", head: true });

        if (docError) {
          console.warn("Error fetching documentos:", docError.message);
        }

        const ops = operaciones || [];
        const operacionesActivas = ops.length;
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
      } catch (err) {
        console.warn("Error loading KPI data:", err);
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
    <main ref={mainRef} className="flex-1 min-h-0 overflow-auto relative scroll-smooth" role="main">
      {/* Video de fondo */}
      <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover -z-10 contrast-[1.1] saturate-[1.2] brightness-[1.05]">
        <source src="/BACKGOUND CONECCIONES.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 bg-[#0a1628]/50 -z-10" />

      {/* Hero */}
      <header className="relative text-white min-h-screen flex items-center justify-center py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:-translate-y-[50px]">
          <div className="flex flex-col items-center text-center">
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
              <a href="/auth/login" className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded bg-white text-brand-blue font-semibold hover:bg-white/95 transition-colors text-sm sm:text-base">
                <Icon icon={icons.auth} width={18} height={18} />
                {t.inicio.ctaLogin}
              </a>
              <a href="#pilares" className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded border-2 border-white/80 text-white font-medium hover:bg-white/10 transition-colors text-sm sm:text-base">
                <Icon icon="lucide:layers" width={18} height={18} />
                {t.inicio.ctaModules}
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Pilares */}
      <section id="pilares" className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <span className="inline-block px-3 sm:px-4 py-1.5 bg-brand-blue/30 border border-brand-blue/50 text-xs font-semibold text-white uppercase tracking-wider mb-3 sm:mb-4">{t.inicio.pillarsTag}</span>
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-2 sm:mb-3">{t.inicio.pillarsTitle}</h2>
            <p className="text-white/60 max-w-xl mx-auto text-sm sm:text-base">{t.inicio.pillarsSubtitle}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {pillars.map(({ key, descKey, icon, color, features }) => {
              const colors = {
                blue: { border: "border-blue-500/40 hover:border-blue-400/70", icon: "text-blue-400", bg: "bg-blue-500/15", line: "bg-blue-500" },
                amber: { border: "border-amber-500/40 hover:border-amber-400/70", icon: "text-amber-400", bg: "bg-amber-500/15", line: "bg-amber-500" },
                violet: { border: "border-violet-500/40 hover:border-violet-400/70", icon: "text-violet-400", bg: "bg-violet-500/15", line: "bg-violet-500" },
              };
              const c = colors[color];

              return (
                <div key={key} className={`group relative bg-black/40 backdrop-blur-md border ${c.border} p-4 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-black/50 shadow-lg shadow-black/20`}>
                  <div className={`absolute top-0 left-0 w-full h-[2px] ${c.line} opacity-60`} />
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 ${c.bg} flex items-center justify-center mb-4 sm:mb-5`}>
                    <Icon icon={icon} className={c.icon} width={24} height={24} />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{t.inicio[key]}</h3>
                  <p className="text-white/50 text-xs sm:text-sm mb-4 sm:mb-5">{t.inicio[descKey]}</p>
                  <ul className="space-y-2">
                    {features.map((fKey) => (
                      <li key={fKey} className="flex items-start gap-2 text-xs sm:text-sm text-white/70">
                        <Icon icon="lucide:check" className={`${c.icon} flex-shrink-0 mt-0.5`} width={14} height={14} />
                        <span>{t.inicio[fKey]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 sm:py-16 bg-black/60 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-10">
            <span className="inline-block px-3 sm:px-4 py-1.5 bg-emerald-500/30 border border-emerald-500/50 text-xs font-semibold text-white uppercase tracking-wider mb-3 sm:mb-4">{t.inicio.statsTag}</span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">{t.inicio.statsTitle}</h2>
            <p className="text-white/50 text-xs sm:text-sm">{t.inicio.statsSubtitle}</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {stats.map(({ valueKey, labelKey, icon }) => (
              <div key={valueKey} className="text-center p-4 sm:p-6 bg-black/50 backdrop-blur-md border border-white/20 shadow-lg shadow-black/20">
                <Icon icon={icon} className="text-emerald-400 mx-auto mb-2 sm:mb-3" width={20} height={20} />
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">{t.inicio[valueKey]}</p>
                <p className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wide leading-tight">{t.inicio[labelKey]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparación Antes/Después */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <span className="inline-block px-3 sm:px-4 py-1.5 bg-rose-500/30 border border-rose-500/50 text-xs font-semibold text-white uppercase tracking-wider mb-3 sm:mb-4">{t.inicio.comparisonTag}</span>
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-2 sm:mb-3">{t.inicio.comparisonTitle}</h2>
            <p className="text-white/60 text-sm sm:text-base">{t.inicio.comparisonSubtitle}</p>
          </div>

          {/* Desktop: tabla de 2 columnas */}
          <div className="hidden sm:block bg-black/50 backdrop-blur-md border border-white/20 overflow-hidden shadow-xl shadow-black/30">
            <div className="grid grid-cols-2">
              <div className="bg-rose-500/20 border-b border-white/10 px-4 sm:px-6 py-3 sm:py-4">
                <p className="text-rose-400 font-semibold text-xs sm:text-sm uppercase tracking-wide flex items-center gap-2">
                  <Icon icon="lucide:x" width={16} height={16} />
                  {t.inicio.comparisonBefore}
                </p>
              </div>
              <div className="bg-emerald-500/20 border-b border-white/10 px-4 sm:px-6 py-3 sm:py-4">
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
              <div key={beforeKey} className="bg-black/50 backdrop-blur-md border border-white/20 overflow-hidden shadow-lg">
                <div className="bg-rose-500/20 px-4 py-2 flex items-center gap-2">
                  <Icon icon="lucide:x" className="text-rose-400" width={14} height={14} />
                  <p className="text-white/60 text-xs">{t.inicio[beforeKey]}</p>
                </div>
                <div className="bg-emerald-500/10 px-4 py-2 flex items-center gap-2">
                  <Icon icon="lucide:check" className="text-emerald-400" width={14} height={14} />
                  <p className="text-white text-xs">{t.inicio[afterKey]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="py-16 sm:py-24 bg-black/60 backdrop-blur-md overflow-hidden">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10 sm:mb-16">
            <span className="inline-block px-3 sm:px-4 py-1.5 bg-cyan-500/30 border border-cyan-500/50 text-xs font-semibold text-white uppercase tracking-wider mb-3 sm:mb-4">{t.inicio.workflowTag}</span>
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-2 sm:mb-3">{t.inicio.workflowTitle}</h2>
            <p className="text-white/60 text-sm sm:text-base">{t.inicio.workflowSubtitle}</p>
          </div>

          {/* Desktop: línea horizontal con steps */}
          <div className="hidden lg:block relative">
            {/* Línea de conexión */}
            <div className="absolute top-[60px] left-[10%] right-[10%] h-1 bg-gradient-to-r from-cyan-500/20 via-cyan-500/60 to-cyan-500/20 rounded-full" />
            <div className="absolute top-[60px] left-[10%] right-[10%] h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-400/40 to-cyan-500/0 rounded-full blur-sm" />
            
            <div className="grid grid-cols-5 gap-6">
              {workflowSteps.map(({ key, descKey, icon, num }, index) => (
                <div key={key} className="relative group">
                  {/* Flecha entre steps */}
                  {index < workflowSteps.length - 1 && (
                    <div className="absolute top-[52px] -right-3 z-10">
                      <Icon icon="lucide:chevron-right" className="text-cyan-500/60" width={24} height={24} />
                    </div>
                  )}
                  
                  {/* Card del step */}
                  <div className="relative bg-black/50 backdrop-blur-md border border-white/10 p-6 hover:border-cyan-500/50 hover:bg-black/60 transition-all duration-300 group-hover:-translate-y-1 shadow-lg shadow-black/20">
                    {/* Número */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-gradient-to-br from-cyan-400 to-cyan-600 text-white text-sm font-bold flex items-center justify-center shadow-lg shadow-cyan-500/30">
                      {num}
                    </div>
                    
                    {/* Icono */}
                    <div className="w-20 h-20 mx-auto mt-4 mb-5 bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/30 flex items-center justify-center group-hover:from-cyan-500/30 group-hover:to-cyan-500/10 transition-all">
                      <Icon icon={icon} className="text-cyan-400 group-hover:scale-110 transition-transform" width={36} height={36} />
                    </div>
                    
                    {/* Texto */}
                    <h3 className="text-white font-bold text-lg mb-2 text-center">{t.inicio[key]}</h3>
                    <p className="text-white/50 text-sm text-center leading-relaxed">{t.inicio[descKey]}</p>
                    
                    {/* Línea decorativa inferior */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tablet: 3+2 grid */}
          <div className="hidden sm:block lg:hidden">
            <div className="grid grid-cols-3 gap-4 mb-4">
              {workflowSteps.slice(0, 3).map(({ key, descKey, icon, num }) => (
                <div key={key} className="relative bg-black/50 backdrop-blur-md border border-white/10 p-5 hover:border-cyan-500/50 transition-all shadow-lg">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 bg-gradient-to-br from-cyan-400 to-cyan-600 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                    {num}
                  </div>
                  <div className="w-14 h-14 mx-auto mt-2 mb-4 bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                    <Icon icon={icon} className="text-cyan-400" width={28} height={28} />
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-1 text-center">{t.inicio[key]}</h3>
                  <p className="text-white/50 text-xs text-center">{t.inicio[descKey]}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              {workflowSteps.slice(3).map(({ key, descKey, icon, num }) => (
                <div key={key} className="relative bg-black/50 backdrop-blur-md border border-white/10 p-5 hover:border-cyan-500/50 transition-all shadow-lg">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 bg-gradient-to-br from-cyan-400 to-cyan-600 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                    {num}
                  </div>
                  <div className="w-14 h-14 mx-auto mt-2 mb-4 bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                    <Icon icon={icon} className="text-cyan-400" width={28} height={28} />
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
                  <div className="relative z-10 w-9 h-9 bg-gradient-to-br from-cyan-400 to-cyan-600 text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-cyan-500/30 flex-shrink-0">
                    {num}
                  </div>
                  
                  {/* Card */}
                  <div className="flex-1 bg-black/50 backdrop-blur-md border border-white/10 p-4 shadow-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                        <Icon icon={icon} className="text-cyan-400" width={20} height={20} />
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
      <section className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <span className="inline-block px-3 sm:px-4 py-1.5 bg-violet-500/30 border border-violet-500/50 text-xs font-semibold text-white uppercase tracking-wider mb-3 sm:mb-4">{t.inicio.quickLinksTag}</span>
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-2 sm:mb-3">{t.inicio.quickLinksTitle}</h2>
            <p className="text-white/60 text-sm sm:text-base">{t.inicio.quickLinksSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {quickLinks.map(({ key, descKey, href, icon }) => (
              <a key={key} href={href} className="group flex items-center gap-3 sm:gap-4 p-4 sm:p-5 bg-black/40 backdrop-blur-md border border-white/20 hover:border-violet-400/50 hover:bg-black/50 transition-all shadow-lg shadow-black/20">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-violet-500/15 border border-violet-500/40 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/25 transition-colors">
                  <Icon icon={icon} className="text-violet-400" width={20} height={20} />
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
      <section className="py-16 sm:py-24 bg-black/60 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <span className="inline-block px-3 sm:px-4 py-1.5 bg-blue-500/30 border border-blue-500/50 text-xs font-semibold text-white uppercase tracking-wider mb-3 sm:mb-4">{t.inicio.kpiTag}</span>
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-2 sm:mb-3">{t.inicio.kpiTitle}</h2>
            <p className="text-white/60 text-sm sm:text-base">{t.inicio.kpiSubtitle}</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {kpiConfig.map(({ key, descKey, dataKey, icon }) => {
              const value = kpiData[dataKey];
              return (
                <div key={key} className="p-4 sm:p-5 bg-black/50 backdrop-blur-md border border-white/20 shadow-lg shadow-black/20 hover:border-blue-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/15 border border-blue-500/40 flex items-center justify-center">
                      <Icon icon={icon} className="text-blue-400" width={16} height={16} />
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
            <a href="/dashboard" className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-black/50 backdrop-blur-md border border-white/30 text-white font-medium hover:bg-black/60 hover:border-blue-400/50 transition-all shadow-lg shadow-black/20 text-sm sm:text-base">
              <Icon icon="lucide:layout-dashboard" width={18} height={18} />
              {t.inicio.kpiCta}
              <Icon icon="lucide:arrow-right" width={16} height={16} />
            </a>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-black/50 backdrop-blur-md border border-white/20 p-6 sm:p-10 lg:p-14 text-center shadow-xl shadow-black/30">
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">{t.inicio.ctaFinalTitle}</h2>
            <p className="text-white/60 text-sm sm:text-base mb-6 sm:mb-8 max-w-xl mx-auto">{t.inicio.ctaFinalSubtitle}</p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6 sm:mb-8">
              <a href="/auth/registro" className="inline-flex items-center justify-center gap-2 py-2.5 sm:py-3 px-6 sm:px-8 bg-brand-blue text-white font-semibold hover:bg-brand-blue/90 transition-colors shadow-lg shadow-brand-blue/30 text-sm sm:text-base">
                <Icon icon="lucide:user-plus" width={18} height={18} />
                {t.inicio.ctaFinalButton1}
              </a>
              <a href="mailto:informaciones@asli.cl?subject=Solicitud de demo EMBARQUES" className="inline-flex items-center justify-center gap-2 py-2.5 sm:py-3 px-6 sm:px-8 bg-white/10 border border-white/30 text-white font-medium hover:bg-white/20 transition-colors text-sm sm:text-base">
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
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 bg-black/80 backdrop-blur-lg text-white border-t border-white/10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col items-center mb-6 sm:mb-8">
            <img src={brand.logo} alt={brand.companyTitle} width={160} height={80} className="h-10 sm:h-12 w-auto object-contain brightness-0 invert mb-4 sm:mb-6" />
            
            <div className="flex gap-2 sm:gap-3 mb-4 sm:mb-6">
              <a href="https://www.linkedin.com/company/aslichile/posts/?feedView=all" target="_blank" rel="noopener noreferrer" className="w-9 h-9 sm:w-10 sm:h-10 bg-white/15 border border-white/20 flex items-center justify-center hover:bg-white/25 hover:border-white/40 transition-colors" aria-label="LinkedIn">
                <Icon icon="mdi:linkedin" width={18} height={18} />
              </a>
              <a href="https://www.instagram.com/asli_chile/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 sm:w-10 sm:h-10 bg-white/15 border border-white/20 flex items-center justify-center hover:bg-white/25 hover:border-white/40 transition-colors" aria-label="Instagram">
                <Icon icon="mdi:instagram" width={18} height={18} />
              </a>
              <a href="https://wa.me/56968394225" target="_blank" rel="noopener noreferrer" className="w-9 h-9 sm:w-10 sm:h-10 bg-white/15 border border-white/20 flex items-center justify-center hover:bg-white/25 hover:border-white/40 transition-colors" aria-label="WhatsApp">
                <Icon icon="mdi:whatsapp" width={18} height={18} />
              </a>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-x-6 sm:gap-y-2 text-[11px] sm:text-xs text-white/50">
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

          <div className="border-t border-white/10 pt-4 sm:pt-6 text-center">
            <p className="text-[10px] sm:text-xs text-white/30">
              © {new Date().getFullYear()} {brand.companyTitle} · {t.inicio.footerCopyright}
            </p>
          </div>
        </div>
      </footer>

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
