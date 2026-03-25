import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { VisitorSidebarQuickAccess } from "@/components/layout/VisitorSidebarQuickAccess";
import { AuthFormTrigger } from "@/components/auth/AuthFormTrigger";

const FEATURES = [
  { icon: "lucide:bar-chart-2",   text: "Reportes por cliente, naviera, especie y período" },
  { icon: "lucide:filter",        text: "Filtros combinables: estado, fecha ETD, tipo de operación" },
  { icon: "lucide:download",      text: "Exportación a Excel con formato profesional" },
  { icon: "lucide:trending-up",   text: "Evolución de volúmenes y márgenes mes a mes" },
];

const FILTER_CHIPS = [
  { label: "Período",   value: "Ene – Mar 2025", icon: "lucide:calendar" },
  { label: "Cliente",   value: "Todos",           icon: "lucide:building-2" },
  { label: "Naviera",   value: "Todas",           icon: "lucide:ship" },
  { label: "Estado",    value: "Todos",           icon: "lucide:layers" },
];

const BAR_DATA = [
  { mes: "Oct", cajas: 3200, usd: 42000 },
  { mes: "Nov", cajas: 4800, usd: 63500 },
  { mes: "Dic", cajas: 5200, usd: 71000 },
  { mes: "Ene", cajas: 4100, usd: 54200 },
  { mes: "Feb", cajas: 6300, usd: 84500 },
  { mes: "Mar", cajas: 5800, usd: 76000 },
];

const MAX_CAJAS = Math.max(...BAR_DATA.map((d) => d.cajas));

const SUMMARY_ROWS = [
  { cliente: "Exportadora Frutícola Sur", ops: 8, cajas: 6200, usd: 81400, estado: "Activo" },
  { cliente: "Agrícola Valle Verde",      ops: 5, cajas: 4100, usd: 53800, estado: "Activo" },
  { cliente: "Frutas del Sur",            ops: 3, cajas: 2800, usd: 36200, estado: "Parcial" },
  { cliente: "Exportadora Norte",         ops: 6, cajas: 5100, usd: 68500, estado: "Activo" },
];

export function ReportesVisitorPreview() {
  const { t } = useLocale();
  const vr = t.visitor.reportes;

  const totalOps   = SUMMARY_ROWS.reduce((s, r) => s + r.ops, 0);
  const totalCajas = SUMMARY_ROWS.reduce((s, r) => s + r.cajas, 0);
  const totalUSD   = SUMMARY_ROWS.reduce((s, r) => s + r.usd, 0);

  return (
    <main className="flex-1 min-h-0 overflow-auto flex flex-col bg-neutral-100" role="main">
      <div className="flex flex-col flex-1 min-h-0 p-3 sm:p-4 gap-3 max-w-[1400px] mx-auto w-full">
        <div className="flex-shrink-0">
          <VisitorSidebarQuickAccess currentHref="/reportes" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4 flex-1 min-h-0">

          {/* ── Left: Hero ── */}
          <div className="relative rounded-2xl overflow-hidden shadow-xl flex flex-col min-h-[400px] xl:min-h-0"
            style={{ background: "linear-gradient(145deg, #0f4c5c 0%, #0e7490 55%, #06b6d4 100%)" }}
          >
            <div className="absolute -top-8 -right-8 w-44 h-44 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />
            <div className="absolute -bottom-12 -left-6 w-56 h-56 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />

            <div className="relative flex flex-col flex-1 p-6 sm:p-8 gap-5">
              <span className="self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white/90 border border-white/20">
                <Icon icon="lucide:bar-chart-2" width={12} height={12} />
                Módulo · Reportes
              </span>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight">{vr.title}</h1>
                <p className="text-white/65 mt-2 text-sm leading-relaxed">{vr.description}</p>
              </div>

              {/* Totals chip */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Operaciones", value: totalOps.toString() },
                  { label: "Total cajas",  value: totalCajas.toLocaleString("es-CL") },
                  { label: "Total USD",    value: `$${(totalUSD / 1000).toFixed(0)}K` },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl bg-white/10 border border-white/20">
                    <span className="text-white font-bold text-base leading-none">{s.value}</span>
                    <span className="text-white/55 text-[10px]">{s.label}</span>
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

              <div className="pt-2 border-t border-white/15">
                <AuthFormTrigger
                  mode="login"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-cyan-900 bg-white rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-black/20"
                >
                  <Icon icon="lucide:log-in" width={16} height={16} />
                  {t.visitor.moduleCta}
                </AuthFormTrigger>
              </div>
            </div>
          </div>

          {/* ── Right: Report Preview ── */}
          <div className="relative rounded-2xl overflow-hidden border border-neutral-200 shadow-sm bg-white flex flex-col min-h-[400px] xl:min-h-0">

            {/* Top bar */}
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-white border-b border-neutral-200 select-none pointer-events-none">
              <Icon icon="lucide:bar-chart-2" width={15} height={15} className="text-cyan-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-neutral-800">Reportes</span>
              <span className="text-[11px] font-mono text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">Ene – Mar 2025</span>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-[11px] text-neutral-500">
                  <Icon icon="lucide:sliders-horizontal" width={11} height={11} />Filtros
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-cyan-600">
                  <Icon icon="lucide:download" width={11} height={11} />Excel
                </span>
              </div>
            </div>

            <div className="flex-1 min-h-0 relative overflow-hidden">
              <div
                className="absolute inset-0 overflow-y-auto overflow-x-hidden select-none pointer-events-none px-4 pt-3 pb-0 flex flex-col gap-3"
                style={{ maskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 78%)", WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 78%)" }}
              >
                {/* Filter chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  {FILTER_CHIPS.map((f) => (
                    <div key={f.label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white text-[11px] text-neutral-600">
                      <Icon icon={f.icon} width={10} height={10} className="text-neutral-400" />
                      <span className="text-neutral-400 font-medium">{f.label}:</span>
                      <span className="font-semibold text-neutral-700">{f.value}</span>
                      <Icon icon="lucide:chevron-down" width={9} height={9} className="text-neutral-300 ml-0.5" />
                    </div>
                  ))}
                </div>

                {/* Bar chart */}
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm flex-shrink-0">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-50 to-white border-b border-neutral-100">
                    <span className="w-[3px] h-4 rounded-full bg-cyan-500 flex-shrink-0" />
                    <Icon icon="lucide:bar-chart-2" width={12} height={12} className="text-cyan-600" />
                    <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-widest">Volumen por mes — Cajas</span>
                    <div className="ml-auto flex items-center gap-3">
                      <span className="flex items-center gap-1 text-[10px] text-neutral-500"><span className="w-2.5 h-2.5 rounded-sm bg-cyan-500 inline-block" />Cajas</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-end gap-3 h-24">
                      {BAR_DATA.map((d) => (
                        <div key={d.mes} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[9px] font-bold text-cyan-700">{(d.cajas / 1000).toFixed(1)}K</span>
                          <div
                            className="w-full rounded-t-md bg-gradient-to-t from-cyan-600 to-cyan-400"
                            style={{ height: `${(d.cajas / MAX_CAJAS) * 72}px` }}
                          />
                          <span className="text-[9px] text-neutral-400">{d.mes}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Summary table */}
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm flex-shrink-0">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-50 to-white border-b border-neutral-100">
                    <span className="w-[3px] h-4 rounded-full bg-teal-500 flex-shrink-0" />
                    <Icon icon="lucide:table-2" width={12} height={12} className="text-teal-600" />
                    <span className="text-[10px] font-bold text-teal-700 uppercase tracking-widest">Resumen por cliente</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-neutral-50 border-b border-neutral-100">
                        <tr>
                          {["Cliente", "Operaciones", "Cajas", "Total USD", "Estado"].map((h) => (
                            <th key={h} className="px-3 py-2 text-left text-[9px] font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {SUMMARY_ROWS.map((row, i) => (
                          <tr key={i} className={`border-b border-neutral-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-neutral-50/40"}`}>
                            <td className="px-3 py-1.5 text-[11px] font-medium text-neutral-800">{row.cliente}</td>
                            <td className="px-3 py-1.5 text-[11px] text-neutral-600">{row.ops}</td>
                            <td className="px-3 py-1.5 text-[11px] text-neutral-700">{row.cajas.toLocaleString("es-CL")}</td>
                            <td className="px-3 py-1.5 text-[11px] font-semibold text-cyan-700">${row.usd.toLocaleString("en-US")}</td>
                            <td className="px-3 py-1.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                                row.estado === "Activo" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                              }`}>{row.estado}</span>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-cyan-50 border-t-2 border-cyan-200">
                          <td className="px-3 py-2 text-[10px] font-bold text-cyan-700 uppercase tracking-wider">Totales</td>
                          <td className="px-3 py-2 text-[11px] font-bold text-cyan-800">{totalOps}</td>
                          <td className="px-3 py-2 text-[11px] font-bold text-cyan-800">{totalCajas.toLocaleString("es-CL")}</td>
                          <td className="px-3 py-2 text-[11px] font-bold text-cyan-800">${totalUSD.toLocaleString("en-US")}</td>
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Lock CTA */}
              <div className="absolute bottom-0 inset-x-0 flex flex-col items-center justify-end pb-7 pt-16 z-10 pointer-events-auto"
                style={{ background: "linear-gradient(to top, #ffffff 58%, rgba(255,255,255,0) 100%)" }}
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-600 shadow-md">
                      <Icon icon="lucide:lock-keyhole" width={15} height={15} className="text-white" />
                    </span>
                    <p className="text-sm font-semibold text-neutral-700">{vr.highlight1}</p>
                  </div>
                  <AuthFormTrigger
                    mode="login"
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-cyan-600 rounded-xl hover:bg-cyan-700 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-cyan-500/30"
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
