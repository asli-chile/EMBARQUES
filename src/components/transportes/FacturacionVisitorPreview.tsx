import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { VisitorSidebarQuickAccess } from "@/components/layout/VisitorSidebarQuickAccess";
import { AuthFormTrigger } from "@/components/auth/AuthFormTrigger";

const SAMPLE_OPS = [
  { ref: "A07015", cliente: "Exportadora Sur",   booking: "MSCUN12345",  etd: "08 Mar", estado: "Facturado"  },
  { ref: "A07016", cliente: "Agrícola Valle",     booking: "COSCO45678",  etd: "15 Mar", estado: "Pendiente"  },
  { ref: "A07017", cliente: "Frutas del Sur",     booking: "HLCU78901",   etd: "22 Mar", estado: "Pendiente"  },
  { ref: "A07018", cliente: "Exportadora Norte",  booking: "EVER23456",   etd: "28 Mar", estado: "Pagado"     },
];

const ESTADO_OP: Record<string, { icon: string; cls: string }> = {
  "Facturado": { icon: "lucide:file-check",  cls: "text-blue-500"    },
  "Pendiente": { icon: "lucide:clock",        cls: "text-amber-500"   },
  "Pagado":    { icon: "lucide:check-circle", cls: "text-emerald-500" },
};

const FEATURES = [
  { icon: "lucide:file-text",     text: "Numeración automática TRA0001, TRA0002… sin duplicados" },
  { icon: "lucide:receipt",       text: "Proforma con ítems: tramo, porteo, falso flete y más" },
  { icon: "lucide:file-down",     text: "Exportación a PDF y Excel con estilos profesionales" },
  { icon: "lucide:calendar-check",text: "Registro de fechas de entrega, pago cliente y transporte" },
];

export function FacturacionVisitorPreview() {
  const { t } = useLocale();
  const v  = t.visitor.facturacion;
  const tr = t.facturacion;

  return (
    <main className="flex-1 min-h-0 overflow-auto flex flex-col bg-neutral-100" role="main">
      <div className="flex flex-col flex-1 min-h-0 p-3 sm:p-4 gap-3 max-w-[1400px] mx-auto w-full">
        <div className="flex-shrink-0">
          <VisitorSidebarQuickAccess currentHref="/transportes/facturacion" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4 flex-1 min-h-0">

          {/* ── Left: Hero ── */}
          <div className="relative rounded-2xl overflow-hidden shadow-xl flex flex-col min-h-[400px] xl:min-h-0"
            style={{ background: "linear-gradient(145deg, #064e3b 0%, #047857 55%, #059669 100%)" }}
          >
            <div className="absolute -top-8 -right-8 w-44 h-44 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />
            <div className="absolute -bottom-12 -left-6 w-56 h-56 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />

            <div className="relative flex flex-col flex-1 p-6 sm:p-8 gap-5">
              <span className="self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white/90 border border-white/20">
                <Icon icon="lucide:receipt" width={12} height={12} />
                {t.visitor.moduleTitle}
              </span>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight">{v.title}</h1>
                <p className="text-white/65 mt-2 text-sm leading-relaxed">{v.description}</p>
              </div>

              {/* Proforma chip */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 border border-white/20">
                <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/20 border border-white/25 flex-shrink-0">
                  <Icon icon="lucide:file-text" width={16} height={16} className="text-white" />
                </span>
                <div>
                  <p className="text-white font-semibold text-sm">Proforma TRA0042</p>
                  <p className="text-white/60 text-xs">A07016 · Agrícola Valle · $4.800 USD</p>
                </div>
                <span className="ml-auto text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">PENDIENTE</span>
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
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-emerald-900 bg-white rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-black/20"
                >
                  <Icon icon="lucide:log-in" width={16} height={16} />
                  {t.visitor.moduleCta}
                </AuthFormTrigger>
              </div>
            </div>
          </div>

          {/* ── Right: Form Preview ── */}
          <div className="relative rounded-2xl overflow-hidden border border-neutral-200 shadow-sm bg-white flex flex-col min-h-[400px] xl:min-h-0">

            {/* Top bar */}
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-white border-b border-neutral-200 select-none pointer-events-none">
              <Icon icon="lucide:receipt" width={15} height={15} className="text-emerald-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-neutral-800">{tr.title}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold ml-1">Demo</span>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-[11px] text-neutral-500">
                  <Icon icon="lucide:file-down" width={11} height={11} />PDF
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-[11px] text-neutral-500">
                  <Icon icon="lucide:download" width={11} height={11} />Excel
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-emerald-600">
                  <Icon icon="lucide:save" width={11} height={11} />Guardar
                </span>
              </div>
            </div>

            {/* Two-panel layout */}
            <div className="flex-1 min-h-0 relative overflow-hidden">
              <div
                className="absolute inset-0 flex overflow-hidden select-none pointer-events-none"
                style={{ maskImage: "linear-gradient(to bottom, black 0%, black 52%, transparent 82%)", WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 52%, transparent 82%)" }}
              >
                {/* Op list */}
                <div className="w-56 flex-shrink-0 border-r border-neutral-100 p-3 flex flex-col gap-1.5 overflow-hidden bg-neutral-50/40">
                  <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{tr.selectOperation}</p>
                  <div className="relative mb-1">
                    <Icon icon="lucide:search" width={11} height={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-300" />
                    <div className="w-full pl-6 pr-2 py-1.5 text-[10px] border border-neutral-200 rounded-lg bg-white text-neutral-300">{tr.searchPlaceholder}</div>
                  </div>
                  {SAMPLE_OPS.map((op, i) => {
                    const s = ESTADO_OP[op.estado];
                    return (
                      <div key={i} className={`p-2 rounded-xl border ${i === 1 ? "border-emerald-300 bg-emerald-50/60 ring-2 ring-emerald-200/50" : "border-neutral-200 bg-white"}`}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-bold text-neutral-800 text-[11px]">{op.ref}</span>
                          {s && <Icon icon={s.icon} width={11} height={11} className={`ml-auto flex-shrink-0 ${s.cls}`} />}
                        </div>
                        <p className="text-[10px] text-neutral-500 truncate">{op.cliente}</p>
                        <p className="text-[10px] text-neutral-400">ETD: {op.etd}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Form */}
                <div className="flex-1 overflow-hidden p-3 flex flex-col gap-2.5">
                  {/* Selected op banner */}
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200/80">
                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">{tr.selectedOperation}</p>
                    <p className="text-sm font-semibold text-neutral-800 mt-0.5">A07016 — Agrícola Valle</p>
                    <p className="text-[11px] text-neutral-500">MSC · MAERSK EVORA · COSCO45678</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 flex-1">
                    {/* Invoice info */}
                    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                      <div className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-50 to-white border-b border-neutral-100">
                        <span className="w-[3px] h-3.5 rounded-full bg-blue-500 flex-shrink-0" />
                        <Icon icon="lucide:file-text" width={11} height={11} className="text-blue-600" />
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">{tr.invoiceInfo}</span>
                      </div>
                      <div className="p-2.5 grid grid-cols-2 gap-2">
                        {[
                          { label: tr.asliInvoice,     value: "TRA0042"          },
                          { label: tr.invoicedAmount,   value: "$4.800 USD"       },
                          { label: tr.transportInvoice, value: "FT-2025-089"      },
                          { label: tr.invoicedConcept,  value: "Flete + servicios"},
                        ].map((f) => (
                          <div key={f.label}>
                            <p className="text-[9px] font-semibold text-neutral-400 uppercase tracking-widest mb-1">{f.label}</p>
                            <div className="w-full px-2 py-1.5 text-[11px] border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-700 truncate">{f.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {/* Financial */}
                      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-50 to-white border-b border-neutral-100">
                          <span className="w-[3px] h-3.5 rounded-full bg-emerald-500 flex-shrink-0" />
                          <Icon icon="lucide:trending-up" width={11} height={11} className="text-emerald-600" />
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">{tr.financial}</span>
                        </div>
                        <div className="p-2.5 grid grid-cols-2 gap-2">
                          {[
                            { label: tr.currency,     value: "USD" },
                            { label: tr.exchangeRate, value: "900" },
                          ].map((f) => (
                            <div key={f.label}>
                              <p className="text-[9px] font-semibold text-neutral-400 uppercase tracking-widest mb-1">{f.label}</p>
                              <div className="w-full px-2 py-1.5 text-[11px] border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-700">{f.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-50 to-white border-b border-neutral-100">
                          <span className="w-[3px] h-3.5 rounded-full bg-amber-400 flex-shrink-0" />
                          <Icon icon="lucide:calendar" width={11} height={11} className="text-amber-600" />
                          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">{tr.paymentDates}</span>
                        </div>
                        <div className="p-2.5 grid grid-cols-1 gap-2">
                          {[
                            { label: tr.invoiceDelivery,  value: "15/03/2025" },
                            { label: tr.clientPayment,    value: "22/03/2025" },
                            { label: tr.transportPayment, value: "25/03/2025" },
                          ].map((f) => (
                            <div key={f.label} className="flex items-center justify-between gap-2">
                              <p className="text-[9px] font-semibold text-neutral-400 uppercase tracking-widest">{f.label}</p>
                              <div className="flex items-center gap-1 px-2 py-1 text-[10px] border border-neutral-200 rounded-lg bg-white text-neutral-600">
                                <Icon icon="lucide:calendar" width={9} height={9} className="text-neutral-400" />
                                {f.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
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
                    <p className="text-sm font-semibold text-neutral-700">{v.highlight1}</p>
                  </div>
                  <AuthFormTrigger
                    mode="login"
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-emerald-600/30"
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
