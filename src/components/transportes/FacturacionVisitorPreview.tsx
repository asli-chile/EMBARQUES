import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { VisitorSidebarQuickAccess } from "@/components/layout/VisitorSidebarQuickAccess";
import { AuthFormTrigger } from "@/components/auth/AuthFormTrigger";

const SAMPLE_OPS = [
  { ref: "A07015", cliente: "Exportadora Sur", booking: "MSCUN12345", etd: "08 Mar", facturada: true },
  { ref: "A07016", cliente: "Agrícola Valle", booking: "COSCO45678", etd: "15 Mar", facturada: false },
  { ref: "A07017", cliente: "Frutas del Sur", booking: "HLCU78901", etd: "22 Mar", facturada: false },
  { ref: "A07018", cliente: "Exportadora Norte", booking: "EVER23456", etd: "28 Mar", facturada: true },
] as const;

export function FacturacionVisitorPreview() {
  const { t } = useLocale();
  const v = t.visitor.facturacion;
  const tr = t.facturacion;
  const sampleLabel = t.visitor.registros.sampleLabel;

  const highlights = [
    {
      text: v.highlight1,
      icon: "typcn:document-text",
      color: "text-brand-blue",
      bg: "bg-brand-blue/10",
    },
    {
      text: v.highlight2,
      icon: "typcn:chart-bar",
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      text: v.highlight3!,
      icon: "lucide:shield-check",
      color: "text-brand-teal",
      bg: "bg-brand-teal/10",
    },
  ];

  return (
    <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto p-3 sm:p-4 lg:p-5" role="main">
      <div className="w-full max-w-[1400px] mx-auto space-y-4 animate-fade-in-up">
        <VisitorSidebarQuickAccess currentHref="/transportes/facturacion" />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* ── Info panel ── */}
          <div className="xl:col-span-4 flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-mac-modal p-5 sm:p-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-teal/10 text-brand-teal rounded-full text-xs font-semibold mb-3">
                <Icon icon="typcn:calculator" width={14} height={14} />
                {t.visitor.moduleTitle}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-brand-blue tracking-tight">{v.title}</h1>
              <p className="text-neutral-500 mt-2 text-sm leading-relaxed">{v.description}</p>

              <div className="mt-5 space-y-3">
                {highlights.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-8 h-8 ${item.bg} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon icon={item.icon} width={16} height={16} className={item.color} />
                    </div>
                    <p className="text-sm text-neutral-600 leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-100">
                <AuthFormTrigger
                  mode="login"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors"
                >
                  <Icon icon="typcn:key" width={18} height={18} />
                  {t.visitor.moduleCta}
                </AuthFormTrigger>
              </div>
            </div>

          </div>

          {/* ── Preview panel ── */}
          <div className="xl:col-span-8">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-mac-modal overflow-hidden">
              {/* Preview header */}
              <div className="px-4 py-2.5 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-4 bg-brand-teal rounded-full flex-shrink-0" />
                  <h2 className="font-semibold text-neutral-700 text-sm">{tr.title}</h2>
                  <span className="text-[11px] text-neutral-400 hidden sm:inline">— {sampleLabel}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium flex-shrink-0">
                  Demo
                </span>
              </div>

              {/* Two-panel layout mirroring the real module */}
              <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-neutral-100 pointer-events-none select-none">
                {/* Left: operation list */}
                <div className="w-full lg:w-64 lg:flex-shrink-0 p-3 space-y-1.5">
                  <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                    {tr.selectOperation}
                  </p>

                  {/* Search bar (static) */}
                  <div className="relative mb-2">
                    <Icon
                      icon="typcn:zoom"
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-300 w-3.5 h-3.5"
                    />
                    <div className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-neutral-200 rounded-md bg-neutral-50 text-neutral-300">
                      {tr.searchPlaceholder}
                    </div>
                  </div>

                  {SAMPLE_OPS.map((op, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-md border w-full text-left ${
                        i === 1
                          ? "border-brand-blue bg-brand-blue/5 ring-2 ring-brand-blue/20"
                          : "border-neutral-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-neutral-800 text-xs">{op.ref}</span>
                        {op.facturada ? (
                          <Icon icon="typcn:tick" className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        ) : (
                          <Icon icon="typcn:time" className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500 truncate">{op.cliente} · {op.booking}</p>
                      <p className="text-[11px] text-neutral-400">ETD: {op.etd}</p>
                    </div>
                  ))}
                </div>

                {/* Right: billing form */}
                <div className="flex-1 p-3 space-y-2.5">
                  {/* Selected operation banner */}
                  <div className="p-2 bg-brand-blue/5 rounded-md border border-brand-blue/20">
                    <p className="text-[10px] font-medium text-brand-blue">{tr.selectedOperation}</p>
                    <p className="text-sm font-semibold text-neutral-800">A07016 — Agrícola Valle</p>
                    <p className="text-xs text-neutral-500">MSC · MAERSK EVORA · COSCO45678</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Invoice info */}
                    <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
                      <div className="px-2.5 py-1.5 border-b border-neutral-100 bg-neutral-50 flex items-center gap-1.5">
                        <Icon icon="typcn:document-text" className="w-3.5 h-3.5 text-brand-blue" />
                        <span className="text-xs font-semibold text-neutral-700">{tr.invoiceInfo}</span>
                      </div>
                      <div className="p-2 grid grid-cols-2 gap-2">
                        {[
                          { label: tr.asliInvoice, value: "FAC-2025-0042" },
                          { label: tr.invoicedAmount, value: "$4.800" },
                          { label: tr.transportInvoice, value: "FT-2025-089" },
                          { label: tr.invoicedConcept, value: "Flete + servicios" },
                        ].map((f, i) => (
                          <div key={i}>
                            <p className="text-[10px] font-medium text-neutral-500 mb-0.5">{f.label}</p>
                            <div className="w-full px-2.5 py-1.5 text-xs border border-neutral-200 rounded-md bg-neutral-50 text-neutral-700 truncate">
                              {f.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Financial info */}
                    <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
                      <div className="px-2.5 py-1.5 border-b border-neutral-100 bg-neutral-50 flex items-center gap-1.5">
                        <Icon icon="typcn:chart-bar" className="w-3.5 h-3.5 text-brand-blue" />
                        <span className="text-xs font-semibold text-neutral-700">{tr.financial}</span>
                      </div>
                      <div className="p-2 grid grid-cols-2 gap-2">
                        {[
                          { label: tr.currency, value: "USD" },
                          { label: tr.exchangeRate, value: "900" },
                        ].map((f, i) => (
                          <div key={i}>
                            <p className="text-[10px] font-medium text-neutral-500 mb-0.5">{f.label}</p>
                            <div className="w-full px-2.5 py-1.5 text-xs border border-neutral-200 rounded-md bg-neutral-50 text-neutral-700">
                              {f.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Payment dates */}
                    <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden sm:col-span-2">
                      <div className="px-2.5 py-1.5 border-b border-neutral-100 bg-neutral-50 flex items-center gap-1.5">
                        <Icon icon="typcn:calendar" className="w-3.5 h-3.5 text-brand-blue" />
                        <span className="text-xs font-semibold text-neutral-700">{tr.paymentDates}</span>
                      </div>
                      <div className="p-2 grid grid-cols-3 gap-2">
                        {[
                          { label: tr.invoiceDelivery, value: "15/03/2025" },
                          { label: tr.clientPayment, value: "22/03/2025" },
                          { label: tr.transportPayment, value: "25/03/2025" },
                        ].map((f, i) => (
                          <div key={i}>
                            <p className="text-[10px] font-medium text-neutral-500 mb-0.5">{f.label}</p>
                            <div className="w-full px-2.5 py-1.5 text-xs border border-neutral-200 rounded-md bg-neutral-50 text-neutral-700">
                              {f.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Disabled save button */}
                  <div className="flex justify-end pt-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-blue/40 rounded-md cursor-not-allowed">
                      <Icon icon="typcn:lock-closed" className="w-3.5 h-3.5" />
                      {tr.save}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
