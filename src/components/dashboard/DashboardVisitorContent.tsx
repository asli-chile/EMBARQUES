import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { VisitorSidebarQuickAccess } from "@/components/layout/VisitorSidebarQuickAccess";
import { AuthFormTrigger } from "@/components/auth/AuthFormTrigger";

const FEATURES = [
  { icon: "lucide:layers",          text: "KPIs en tiempo real: operaciones activas, zarpes y documentos" },
  { icon: "lucide:calendar-clock",  text: "Próximos zarpes con ETD, naviera y estado" },
  { icon: "lucide:pie-chart",       text: "Distribución de operaciones por estado" },
  { icon: "lucide:bell",            text: "Alertas de corte documental y stacking próximos" },
];

const KPI_CARDS = [
  { icon: "lucide:ship",           label: "Operaciones activas", value: "12", color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200"   },
  { icon: "lucide:calendar",       label: "Zarpes próx. 7 días", value: "4",  color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200" },
  { icon: "lucide:file-text",      label: "Documentos subidos",  value: "48", color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200" },
  { icon: "lucide:container",      label: "Contenedores",        value: "8",  color: "text-teal-700",   bg: "bg-teal-50",   border: "border-teal-200"   },
];

const UPCOMING = [
  { ref: "A07012", cliente: "Agrícola Valle",   naviera: "MSC",    etd: "25 Mar", estado: "En proceso",  pod: "Philadelphia" },
  { ref: "A07013", cliente: "Frutas del Sur",   naviera: "Hapag",  etd: "27 Mar", estado: "En tránsito", pod: "Rotterdam"    },
  { ref: "A07014", cliente: "Export. Norte",    naviera: "ONE",    etd: "28 Mar", estado: "Pendiente",   pod: "Miami"        },
  { ref: "A07015", cliente: "Exportadora Sur",  naviera: "MSC",    etd: "02 Abr", estado: "En proceso",  pod: "Amberes"      },
];

const ESTADO_BARS = [
  { label: "En proceso",  pct: 42, color: "bg-blue-500"    },
  { label: "En tránsito", pct: 25, color: "bg-violet-500"  },
  { label: "Pendiente",   pct: 17, color: "bg-amber-500"   },
  { label: "Arribado",    pct: 16, color: "bg-emerald-500" },
];

const ESTADO_COLOR: Record<string, string> = {
  "En proceso":  "bg-blue-100 text-blue-700",
  "En tránsito": "bg-violet-100 text-violet-700",
  "Pendiente":   "bg-amber-100 text-amber-700",
  "Arribado":    "bg-emerald-100 text-emerald-700",
};

export function DashboardVisitorContent() {
  const { t } = useLocale();
  const v = t.visitor.dashboard;

  return (
    <main className="flex-1 min-h-0 overflow-auto flex flex-col bg-neutral-100" role="main">
      <div className="flex flex-col flex-1 min-h-0 p-3 sm:p-4 gap-3 max-w-[1400px] mx-auto w-full">
        <div className="flex-shrink-0">
          <VisitorSidebarQuickAccess currentHref="/dashboard" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4 flex-1 min-h-0">

          {/* ── Left: Hero ── */}
          <div className="relative rounded-2xl overflow-hidden shadow-xl flex flex-col min-h-[400px] xl:min-h-0"
            style={{ background: "linear-gradient(145deg, #0f172a 0%, #1e3a5f 55%, #1d4ed8 100%)" }}
          >
            <div className="absolute -top-8 -right-8 w-44 h-44 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />
            <div className="absolute -bottom-12 -left-6 w-56 h-56 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />

            <div className="relative flex flex-col flex-1 p-6 sm:p-8 gap-5">
              <span className="self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white/90 border border-white/20">
                <Icon icon="lucide:layout-dashboard" width={12} height={12} />
                Módulo · Dashboard
              </span>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight">{v.title}</h1>
                <p className="text-white/65 mt-2 text-sm leading-relaxed">{v.subtitle}</p>
              </div>

              {/* Mini KPI chips */}
              <div className="grid grid-cols-2 gap-2">
                {KPI_CARDS.map((k) => (
                  <div key={k.label} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/10 border border-white/20">
                    <Icon icon={k.icon} width={14} height={14} className="text-white/70 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-white font-bold text-sm leading-none">{k.value}</div>
                      <div className="text-white/50 text-[9px] leading-tight mt-0.5 truncate">{k.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 flex-1">
                {FEATURES.map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center mt-0.5">
                      <Icon icon={f.icon} width={13} height={13} className="text-white/90" />
                    </span>
                    <p className="text-white/75 text-sm leading-relaxed">{f.text}</p>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-white/15 flex flex-col gap-2">
                <AuthFormTrigger
                  mode="login"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-blue-900 bg-white rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-black/20"
                >
                  <Icon icon="lucide:log-in" width={16} height={16} />
                  {v.cta}
                </AuthFormTrigger>
                <AuthFormTrigger
                  mode="registro"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white/80 bg-white/10 border border-white/20 rounded-xl hover:bg-white/15 active:scale-[0.98] transition-all duration-150"
                >
                  {v.ctaSubtext}
                </AuthFormTrigger>
              </div>
            </div>
          </div>

          {/* ── Right: Dashboard Preview ── */}
          <div className="relative rounded-2xl overflow-hidden border border-neutral-200 shadow-sm bg-white flex flex-col min-h-[400px] xl:min-h-0">

            {/* Top bar */}
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-white border-b border-neutral-200 select-none pointer-events-none">
              <Icon icon="lucide:layout-dashboard" width={15} height={15} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-neutral-800">Dashboard</span>
              <span className="text-[11px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">Semana 12 · Mar 2025</span>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />En vivo
                </span>
              </div>
            </div>

            <div className="flex-1 min-h-0 relative overflow-hidden">
              <div
                className="absolute inset-0 overflow-y-auto overflow-x-hidden select-none pointer-events-none px-4 pt-3 pb-0 flex flex-col gap-3"
                style={{ maskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 78%)", WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 78%)" }}
              >
                {/* KPI row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-shrink-0">
                  {KPI_CARDS.map((k) => (
                    <div key={k.label} className={`rounded-xl border ${k.border} ${k.bg} px-3 py-3 flex flex-col gap-1`}>
                      <div className="flex items-center gap-1.5">
                        <Icon icon={k.icon} width={11} height={11} className={k.color} />
                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest truncate">{k.label}</span>
                      </div>
                      <span className={`text-xl font-bold leading-none ${k.color}`}>{k.value}</span>
                    </div>
                  ))}
                </div>

                {/* Upcoming departures */}
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm flex-shrink-0">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-white border-b border-neutral-100">
                    <span className="w-[3px] h-4 rounded-full bg-blue-500 flex-shrink-0" />
                    <Icon icon="lucide:calendar-clock" width={12} height={12} className="text-blue-600" />
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Próximos zarpes</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-sm border-collapse">
                      <thead className="bg-neutral-50 border-b border-neutral-100">
                        <tr>
                          {["Operación", "Cliente", "Naviera", "ETD", "Destino", "Estado"].map((h) => (
                            <th key={h} className="px-3 py-2 text-left text-[9px] font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {UPCOMING.map((row, i) => (
                          <tr key={i} className={`border-b border-neutral-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-neutral-50/40"}`}>
                            <td className="px-3 py-1.5 text-[11px] font-bold text-neutral-800">{row.ref}</td>
                            <td className="px-3 py-1.5 text-[11px] text-neutral-600 max-w-[120px] truncate">{row.cliente}</td>
                            <td className="px-3 py-1.5 text-[11px] text-neutral-500">{row.naviera}</td>
                            <td className="px-3 py-1.5 text-[11px] font-semibold text-blue-700">{row.etd}</td>
                            <td className="px-3 py-1.5 text-[11px] text-neutral-500">{row.pod}</td>
                            <td className="px-3 py-1.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold ${ESTADO_COLOR[row.estado]}`}>{row.estado}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Status distribution */}
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm flex-shrink-0">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-50 to-white border-b border-neutral-100">
                    <span className="w-[3px] h-4 rounded-full bg-violet-500 flex-shrink-0" />
                    <Icon icon="lucide:pie-chart" width={12} height={12} className="text-violet-600" />
                    <span className="text-[10px] font-bold text-violet-700 uppercase tracking-widest">Distribución por estado</span>
                  </div>
                  <div className="p-3 flex flex-col gap-2">
                    {ESTADO_BARS.map((b) => (
                      <div key={b.label} className="flex items-center gap-2">
                        <span className="text-[10px] text-neutral-500 w-24 flex-shrink-0">{b.label}</span>
                        <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                          <div className={`h-full rounded-full ${b.color}`} style={{ width: `${b.pct}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-neutral-600 w-8 text-right">{b.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lock CTA */}
              <div className="absolute bottom-0 inset-x-0 flex flex-col items-center justify-end pb-7 pt-16 z-10 pointer-events-auto"
                style={{ background: "linear-gradient(to top, #ffffff 58%, rgba(255,255,255,0) 100%)" }}
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-blue-700 shadow-md">
                      <Icon icon="lucide:lock-keyhole" width={15} height={15} className="text-white" />
                    </span>
                    <p className="text-sm font-semibold text-neutral-700">{v.whatYouCanDo}</p>
                  </div>
                  <AuthFormTrigger
                    mode="login"
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-800 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-blue-500/30"
                  >
                    <Icon icon="lucide:log-in" width={15} height={15} />
                    {t.visitor.moduleCta}
                  </AuthFormTrigger>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
