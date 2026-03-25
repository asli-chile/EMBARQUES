import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { VisitorSidebarQuickAccess } from "@/components/layout/VisitorSidebarQuickAccess";
import { AuthFormTrigger } from "@/components/auth/AuthFormTrigger";

const FEATURES = [
  { icon: "lucide:table-2",       text: "Tabla de ítems por especie, variedad, calibre y kg" },
  { icon: "lucide:calculator",    text: "Cálculo automático de totales: kg neto, cajas y valor" },
  { icon: "lucide:file-down",     text: "Exportación a PDF y Excel con formato comercial" },
  { icon: "lucide:upload-cloud",  text: "Importación desde Excel con normalización automática" },
];

const SAMPLE_ITEMS = [
  { especie: "Uvas",      variedad: "Red Globe",  calibre: "XL",  cajas: 480,  kg_neto: 9.072,  v_caja: 12.50, total: 6000   },
  { especie: "Uvas",      variedad: "Crimson",    calibre: "L",   cajas: 360,  kg_neto: 6.804,  v_caja: 11.80, total: 4248   },
  { especie: "Uvas",      variedad: "Thompson",   calibre: "XL",  cajas: 240,  kg_neto: 4.536,  v_caja: 10.50, total: 2520   },
  { especie: "Cerezas",   variedad: "Lapins",     calibre: "J",   cajas: 480,  kg_neto: 4.800,  v_caja: 28.00, total: 13440  },
  { especie: "Cerezas",   variedad: "Bing",       calibre: "JJ",  cajas: 200,  kg_neto: 2.000,  v_caja: 32.00, total: 6400   },
];

const HEADER_FIELDS = [
  { label: "Cliente",      value: "Exportadora Frutícola Sur", type: "select" },
  { label: "Operación",   value: "ASLI-2025-012",             type: "select" },
  { label: "Fecha",        value: "15-02-2025",               type: "date"   },
  { label: "Ref. Proforma",value: "PRO-2025-042",             type: "text"   },
  { label: "Naviera",      value: "MSC",                       type: "select" },
  { label: "Destino",      value: "Philadelphia, US",          type: "text"   },
];

export function CrearProformaVisitorPreview() {
  const { t } = useLocale();
  const vr = t.visitor.crearProforma;

  const totalCajas = SAMPLE_ITEMS.reduce((s, r) => s + r.cajas, 0);
  const totalKg    = SAMPLE_ITEMS.reduce((s, r) => s + r.kg_neto, 0);
  const totalUSD   = SAMPLE_ITEMS.reduce((s, r) => s + r.total, 0);

  return (
    <main className="flex-1 min-h-0 overflow-auto flex flex-col bg-neutral-100" role="main">
      <div className="flex flex-col flex-1 min-h-0 p-3 sm:p-4 gap-3 max-w-[1400px] mx-auto w-full">
        <div className="flex-shrink-0">
          <VisitorSidebarQuickAccess currentHref="/documentos/crear-proforma" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4 flex-1 min-h-0">

          {/* ── Left: Hero ── */}
          <div className="relative rounded-2xl overflow-hidden shadow-xl flex flex-col min-h-[400px] xl:min-h-0"
            style={{ background: "linear-gradient(145deg, #78350f 0%, #b45309 55%, #d97706 100%)" }}
          >
            <div className="absolute -top-8 -right-8 w-44 h-44 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />
            <div className="absolute -bottom-12 -left-6 w-56 h-56 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />

            <div className="relative flex flex-col flex-1 p-6 sm:p-8 gap-5">
              <span className="self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white/90 border border-white/20">
                <Icon icon="lucide:receipt" width={12} height={12} />
                Módulo · Documentos
              </span>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight">{vr.title}</h1>
                <p className="text-white/65 mt-2 text-sm leading-relaxed">{vr.description}</p>
              </div>

              {/* Totals chip */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Total cajas", value: totalCajas.toLocaleString("es-CL") },
                  { label: "Kg neto",     value: `${totalKg.toLocaleString("es-CL")} kg` },
                  { label: "Total USD",   value: `$${totalUSD.toLocaleString("en-US")}` },
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
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-amber-900 bg-white rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-black/20"
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
              <Icon icon="lucide:receipt" width={15} height={15} className="text-amber-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-neutral-800">Nueva Proforma</span>
              <span className="text-[11px] font-mono text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">PRO-2025-042</span>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-[11px] text-neutral-500">
                  <Icon icon="lucide:upload" width={11} height={11} />Import Excel
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-[11px] text-neutral-500">
                  <Icon icon="lucide:file-down" width={11} height={11} />PDF
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-amber-600">
                  <Icon icon="lucide:save" width={11} height={11} />Guardar
                </span>
              </div>
            </div>

            <div className="flex-1 min-h-0 relative overflow-hidden">
              <div
                className="absolute inset-0 overflow-y-auto overflow-x-hidden select-none pointer-events-none px-4 pt-3 pb-0 flex flex-col gap-3"
                style={{ maskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 78%)", WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 78%)" }}
              >
                {/* Header fields */}
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm flex-shrink-0">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-50 to-white border-b border-neutral-100">
                    <span className="w-[3px] h-4 rounded-full bg-amber-500 flex-shrink-0" />
                    <Icon icon="lucide:clipboard-list" width={12} height={12} className="text-amber-600" />
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Encabezado</span>
                  </div>
                  <div className="p-3 grid grid-cols-3 gap-3">
                    {HEADER_FIELDS.map((f) => (
                      <div key={f.label}>
                        <div className="text-[9px] font-semibold text-neutral-400 uppercase tracking-widest mb-1">{f.label}</div>
                        <div className={`flex items-center w-full px-2.5 py-1.5 rounded-lg border bg-white text-[11px] text-neutral-700 ${f.type === "date" ? "border-amber-200 bg-amber-50/20" : "border-neutral-200"}`}>
                          <span className="flex-1 truncate">{f.value}</span>
                          {f.type === "select" && <Icon icon="lucide:chevron-down" width={10} height={10} className="text-neutral-300 flex-shrink-0 ml-1" />}
                          {f.type === "date"   && <Icon icon="lucide:calendar"     width={10} height={10} className="text-amber-400/70 flex-shrink-0 ml-1" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Items table */}
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm flex-shrink-0">
                  <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-orange-50 to-white border-b border-neutral-100">
                    <div className="flex items-center gap-2">
                      <span className="w-[3px] h-4 rounded-full bg-orange-500 flex-shrink-0" />
                      <Icon icon="lucide:table-2" width={12} height={12} className="text-orange-600" />
                      <span className="text-[10px] font-bold text-orange-700 uppercase tracking-widest">Ítems de Proforma</span>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-medium text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                      <Icon icon="lucide:plus" width={9} height={9} />
                      Agregar ítem
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm border-collapse">
                      <thead className="bg-neutral-50 border-b border-neutral-100">
                        <tr>
                          {["Especie","Variedad","Calibre","Cajas","Kg Neto","Val/Caja","Total USD"].map((h) => (
                            <th key={h} className="px-3 py-2 text-left text-[9px] font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {SAMPLE_ITEMS.map((row, i) => (
                          <tr key={i} className={`border-b border-neutral-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-neutral-50/40"}`}>
                            <td className="px-3 py-1.5 text-[11px] font-medium text-neutral-800">{row.especie}</td>
                            <td className="px-3 py-1.5 text-[11px] text-neutral-600">{row.variedad}</td>
                            <td className="px-3 py-1.5 text-[11px] text-neutral-500">{row.calibre}</td>
                            <td className="px-3 py-1.5 text-[11px] text-neutral-700 font-medium">{row.cajas.toLocaleString("es-CL")}</td>
                            <td className="px-3 py-1.5 text-[11px] text-neutral-700">{row.kg_neto.toLocaleString("es-CL")} kg</td>
                            <td className="px-3 py-1.5 text-[11px] text-neutral-700">${row.v_caja.toFixed(2)}</td>
                            <td className="px-3 py-1.5 text-[11px] font-semibold text-amber-700">${row.total.toLocaleString("en-US")}</td>
                          </tr>
                        ))}
                        <tr className="bg-amber-50 border-t-2 border-amber-200">
                          <td colSpan={3} className="px-3 py-2 text-[10px] font-bold text-amber-700 uppercase tracking-wider">Totales</td>
                          <td className="px-3 py-2 text-[11px] font-bold text-amber-800">{totalCajas.toLocaleString("es-CL")}</td>
                          <td className="px-3 py-2 text-[11px] font-bold text-amber-800">{totalKg.toLocaleString("es-CL")} kg</td>
                          <td />
                          <td className="px-3 py-2 text-[11px] font-bold text-amber-800">${totalUSD.toLocaleString("en-US")}</td>
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
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-600 shadow-md">
                      <Icon icon="lucide:lock-keyhole" width={15} height={15} className="text-white" />
                    </span>
                    <p className="text-sm font-semibold text-neutral-700">{vr.highlight1}</p>
                  </div>
                  <AuthFormTrigger
                    mode="login"
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-amber-600 rounded-xl hover:bg-amber-700 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-amber-500/30"
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
