import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { VisitorSidebarQuickAccess } from "@/components/layout/VisitorSidebarQuickAccess";
import { AuthFormTrigger } from "@/components/auth/AuthFormTrigger";

const FEATURES = [
  { icon: "lucide:trending-up",    text: "Margen real por operación: estimado vs. real" },
  { icon: "lucide:circle-dollar-sign", text: "Estado de cobranza: pendiente, parcial y cobrado" },
  { icon: "lucide:receipt",        text: "Facturas emitidas con número ASLI y fechas de pago" },
  { icon: "lucide:download",       text: "Exportación a Excel con resumen financiero" },
];

const KPI_CARDS = [
  { label: "Facturado",    value: "$284.600",  sub: "USD total período",    color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  { label: "Cobrado",      value: "$198.400",  sub: "USD cobrados",         color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200"   },
  { label: "Pendiente",    value: "$86.200",   sub: "USD por cobrar",       color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200"  },
  { label: "Margen prom.", value: "18,4%",     sub: "rentabilidad media",   color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200" },
];

const OPS_ROWS = [
  { ref: "A07011", cliente: "Exportadora Sur",  factura: "TRA0038", monto: "$18.400", estado: "Cobrado",   margen: "21%",  fecha: "12 Feb" },
  { ref: "A07012", cliente: "Agrícola Valle",   factura: "TRA0039", monto: "$12.600", estado: "Pendiente", margen: "16%",  fecha: "—"      },
  { ref: "A07013", cliente: "Frutas del Sur",   factura: "TRA0040", monto: "$9.800",  estado: "Parcial",   margen: "14%",  fecha: "28 Feb" },
  { ref: "A07014", cliente: "Export. Norte",    factura: "TRA0041", monto: "$22.100", estado: "Cobrado",   margen: "23%",  fecha: "05 Mar" },
  { ref: "A07015", cliente: "Exportadora Sur",  factura: "TRA0042", monto: "$15.700", estado: "Pendiente", margen: "19%",  fecha: "—"      },
];

const ESTADO_COLOR: Record<string, string> = {
  Cobrado:   "bg-emerald-100 text-emerald-700",
  Pendiente: "bg-amber-100 text-amber-700",
  Parcial:   "bg-blue-100 text-blue-700",
};

export function FinanzasVisitorPreview() {
  const { t } = useLocale();
  const vr = t.visitor.finanzas;

  return (
    <main className="flex-1 min-h-0 overflow-auto flex flex-col bg-neutral-100" role="main">
      <div className="flex flex-col flex-1 min-h-0 p-3 sm:p-4 gap-3 max-w-[1400px] mx-auto w-full">
        <div className="flex-shrink-0">
          <VisitorSidebarQuickAccess currentHref="/finanzas" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4 flex-1 min-h-0">

          {/* ── Left: Hero ── */}
          <div className="relative rounded-2xl overflow-hidden shadow-xl flex flex-col min-h-[400px] xl:min-h-0"
            style={{ background: "linear-gradient(145deg, #14532d 0%, #15803d 55%, #22c55e 100%)" }}
          >
            <div className="absolute -top-8 -right-8 w-44 h-44 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />
            <div className="absolute -bottom-12 -left-6 w-56 h-56 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />

            <div className="relative flex flex-col flex-1 p-6 sm:p-8 gap-5">
              <span className="self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white/90 border border-white/20">
                <Icon icon="lucide:circle-dollar-sign" width={12} height={12} />
                Módulo · Finanzas
              </span>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight">{vr.title}</h1>
                <p className="text-white/65 mt-2 text-sm leading-relaxed">{vr.description}</p>
              </div>

              {/* Status summary chip */}
              <div className="rounded-xl bg-white/10 border border-white/20 p-3 flex flex-col gap-2">
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Estado de cobranza</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden flex">
                    <div className="h-full bg-white/80 rounded-l-full" style={{ width: "70%" }} />
                    <div className="h-full bg-white/40" style={{ width: "10%" }} />
                  </div>
                  <span className="text-white text-xs font-bold">70% cobrado</span>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1 text-white/70"><span className="w-2 h-2 rounded-full bg-white/80 inline-block" />Cobrado</span>
                  <span className="flex items-center gap-1 text-white/70"><span className="w-2 h-2 rounded-full bg-white/40 inline-block" />Parcial</span>
                  <span className="flex items-center gap-1 text-white/70"><span className="w-2 h-2 rounded-full bg-white/20 inline-block" />Pendiente</span>
                </div>
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
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-green-900 bg-white rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-black/20"
                >
                  <Icon icon="lucide:log-in" width={16} height={16} />
                  {t.visitor.moduleCta}
                </AuthFormTrigger>
              </div>
            </div>
          </div>

          {/* ── Right: Finance Preview ── */}
          <div className="relative rounded-2xl overflow-hidden border border-neutral-200 shadow-sm bg-white flex flex-col min-h-[400px] xl:min-h-0">

            {/* Top bar */}
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-white border-b border-neutral-200 select-none pointer-events-none">
              <Icon icon="lucide:circle-dollar-sign" width={15} height={15} className="text-emerald-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-neutral-800">Finanzas</span>
              <span className="text-[11px] font-mono text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">Q1 2025</span>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-[11px] text-neutral-500">
                  <Icon icon="lucide:calendar" width={11} height={11} />Período
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-emerald-600">
                  <Icon icon="lucide:download" width={11} height={11} />Excel
                </span>
              </div>
            </div>

            <div className="flex-1 min-h-0 relative overflow-hidden">
              <div
                className="absolute inset-0 overflow-y-auto overflow-x-hidden select-none pointer-events-none px-4 pt-3 pb-0 flex flex-col gap-3"
                style={{ maskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 78%)", WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 78%)" }}
              >
                {/* KPI cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-shrink-0">
                  {KPI_CARDS.map((k) => (
                    <div key={k.label} className={`rounded-xl border ${k.border} ${k.bg} px-3 py-3 flex flex-col gap-1`}>
                      <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">{k.label}</span>
                      <span className={`text-base font-bold leading-none ${k.color}`}>{k.value}</span>
                      <span className="text-[9px] text-neutral-400">{k.sub}</span>
                    </div>
                  ))}
                </div>

                {/* Operations table */}
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm flex-shrink-0">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-white border-b border-neutral-100">
                    <span className="w-[3px] h-4 rounded-full bg-emerald-500 flex-shrink-0" />
                    <Icon icon="lucide:receipt" width={12} height={12} className="text-emerald-600" />
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Facturas emitidas</span>
                    <span className="ml-auto text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">5 facturas</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-sm border-collapse">
                      <thead className="bg-neutral-50 border-b border-neutral-100">
                        <tr>
                          {["Operación", "Cliente", "Factura", "Monto", "Estado", "Margen", "Fecha pago"].map((h) => (
                            <th key={h} className="px-3 py-2 text-left text-[9px] font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {OPS_ROWS.map((row, i) => (
                          <tr key={i} className={`border-b border-neutral-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-neutral-50/40"}`}>
                            <td className="px-3 py-1.5 text-[11px] font-bold text-neutral-800">{row.ref}</td>
                            <td className="px-3 py-1.5 text-[11px] text-neutral-600 max-w-[120px] truncate">{row.cliente}</td>
                            <td className="px-3 py-1.5 text-[11px] font-mono text-neutral-500">{row.factura}</td>
                            <td className="px-3 py-1.5 text-[11px] font-semibold text-emerald-700">{row.monto}</td>
                            <td className="px-3 py-1.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold ${ESTADO_COLOR[row.estado]}`}>{row.estado}</span>
                            </td>
                            <td className="px-3 py-1.5 text-[11px] font-semibold text-violet-700">{row.margen}</td>
                            <td className="px-3 py-1.5 text-[11px] text-neutral-500">{row.fecha}</td>
                          </tr>
                        ))}
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
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-600 shadow-md">
                      <Icon icon="lucide:lock-keyhole" width={15} height={15} className="text-white" />
                    </span>
                    <p className="text-sm font-semibold text-neutral-700">{vr.highlight1}</p>
                  </div>
                  <AuthFormTrigger
                    mode="login"
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-emerald-500/30"
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
