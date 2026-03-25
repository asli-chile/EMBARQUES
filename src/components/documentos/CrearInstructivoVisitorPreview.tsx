import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { VisitorSidebarQuickAccess } from "@/components/layout/VisitorSidebarQuickAccess";
import { AuthFormTrigger } from "@/components/auth/AuthFormTrigger";

const FEATURES = [
  { icon: "lucide:zap",          text: "Pre-llenado automático desde la operación vinculada" },
  { icon: "lucide:ship",         text: "Cubre todos los campos del BL: consignee, notify, carga y términos" },
  { icon: "lucide:thermometer",  text: "Condiciones reefer: temperatura, ventilación y humedad" },
  { icon: "lucide:file-down",    text: "Exportación a PDF y Excel con formato profesional" },
];

const TABS = [
  { icon: "lucide:ship",         label: "Embarque"   },
  { icon: "lucide:users",        label: "Partes"     },
  { icon: "lucide:package",      label: "Carga"      },
  { icon: "lucide:thermometer",  label: "Reefer"     },
  { icon: "lucide:file-text",    label: "Documentos" },
];

const EMBARQUE_FIELDS = [
  { label: "Naviera",     value: "MSC",              type: "select" },
  { label: "Nave",        value: "MSC GULSUN",       type: "select" },
  { label: "Viaje",       value: "025W",             type: "text"   },
  { label: "POL",         value: "San Antonio, CL",  type: "select" },
  { label: "POD",         value: "Philadelphia, US", type: "select" },
  { label: "ETD",         value: "15-02-2025",       type: "date"   },
  { label: "Booking",     value: "MSCUSN1234567",    type: "text"   },
  { label: "Incoterm",    value: "FOB",              type: "select" },
  { label: "Forma pago",  value: "PREPAID",          type: "select" },
];

const CONSIGNEE_FIELDS = [
  { label: "Company",   value: "Fresh Fruits Import Co.",   span: 2 },
  { label: "Address",   value: "1234 Market St, Philadelphia PA 19103", span: 2 },
  { label: "Attn",      value: "John Smith",               span: 1 },
  { label: "USCC",      value: "US12345678",               span: 1 },
  { label: "Email",     value: "john@freshfruits.com",     span: 1 },
  { label: "Mobile",    value: "+1 215 555 0100",          span: 1 },
];

const CARGA_FIELDS = [
  { label: "Especie",       value: "Uvas de mesa",     type: "select" },
  { label: "Variedad",      value: "Red Globe",        type: "select" },
  { label: "Tipo unidad",   value: "40RF",             type: "select" },
  { label: "Pallets",       value: "22",               type: "text"   },
  { label: "Cajas",         value: "1.760",            type: "text"   },
  { label: "Peso bruto",    value: "18.500 kg",        type: "text"   },
  { label: "Peso neto",     value: "17.600 kg",        type: "text"   },
  { label: "Temperatura",   value: "-1°C",             type: "text"   },
];

export function CrearInstructivoVisitorPreview() {
  const { t } = useLocale();
  const vr = t.visitor.crearInstructivo;

  return (
    <main className="flex-1 min-h-0 overflow-auto flex flex-col bg-neutral-100" role="main">
      <div className="flex flex-col flex-1 min-h-0 p-3 sm:p-4 gap-3 max-w-[1400px] mx-auto w-full">

        <div className="flex-shrink-0">
          <VisitorSidebarQuickAccess currentHref="/documentos/crear-instructivo" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4 flex-1 min-h-0">

          {/* ── Left: Hero ── */}
          <div className="relative rounded-2xl overflow-hidden shadow-xl flex flex-col min-h-[400px] xl:min-h-0"
            style={{ background: "linear-gradient(145deg, #0c4a6e 0%, #0369a1 55%, #0891b2 100%)" }}
          >
            <div className="absolute -top-8 -right-8 w-44 h-44 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />
            <div className="absolute -bottom-12 -left-6 w-56 h-56 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />

            <div className="relative flex flex-col flex-1 p-6 sm:p-8 gap-5">
              <span className="self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white/90 border border-white/20">
                <Icon icon="lucide:file-text" width={12} height={12} />
                Módulo · Documentos
              </span>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight">{vr.title}</h1>
                <p className="text-white/65 mt-2 text-sm leading-relaxed">{vr.description}</p>
              </div>

              {/* BL fields chip */}
              <div className="px-4 py-3 rounded-xl bg-white/10 border border-white/20">
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-2">Campos del BL cubiertos</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Shipper","Consignee","Notify","POL","POD","Vessel","Voyage","Cargo","Reefer","Incoterm","Pago","Marks"].map((f) => (
                    <span key={f} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/15 text-white/80 border border-white/20">{f}</span>
                  ))}
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
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-sky-900 bg-white rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-black/20"
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
              <Icon icon="lucide:file-text" width={15} height={15} className="text-sky-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-neutral-800">Instructivo de Embarque</span>
              <span className="text-[11px] font-mono text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">ASLI-2025-012</span>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-[11px] text-neutral-500">
                  <Icon icon="lucide:file-down" width={11} height={11} />PDF
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-[11px] text-neutral-500">
                  <Icon icon="lucide:download" width={11} height={11} />Excel
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-sky-600">
                  <Icon icon="lucide:save" width={11} height={11} />Guardar
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex-shrink-0 flex items-end px-3 bg-white border-b border-neutral-200 select-none pointer-events-none">
              {TABS.map((tab, i) => (
                <span key={tab.label} className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-b-2 whitespace-nowrap ${
                  i === 0 ? "border-sky-500 text-sky-600" : "border-transparent text-neutral-400"
                }`}>
                  <Icon icon={tab.icon} width={11} height={11} />
                  {tab.label}
                </span>
              ))}
            </div>

            {/* Form body + fade */}
            <div className="flex-1 min-h-0 relative overflow-hidden">
              <div
                className="absolute inset-0 overflow-y-auto overflow-x-hidden select-none pointer-events-none px-4 pt-4 pb-0 flex flex-col gap-3"
                style={{ maskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 78%)", WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 78%)" }}
              >

                {/* Embarque */}
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm flex-shrink-0">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-50 to-white border-b border-neutral-100">
                    <span className="w-[3px] h-4 rounded-full bg-sky-500 flex-shrink-0" />
                    <Icon icon="lucide:ship" width={12} height={12} className="text-sky-600" />
                    <span className="text-[10px] font-bold text-sky-700 uppercase tracking-widest">Datos de Embarque</span>
                  </div>
                  <div className="p-3 grid grid-cols-3 gap-3">
                    {EMBARQUE_FIELDS.map((f) => (
                      <div key={f.label}>
                        <div className="text-[9px] font-semibold text-neutral-400 uppercase tracking-widest mb-1">{f.label}</div>
                        <div className={`flex items-center w-full px-2.5 py-1.5 rounded-lg border bg-white text-[11px] text-neutral-700 ${
                          f.type === "date" ? "border-sky-200 bg-sky-50/30" : "border-neutral-200"
                        }`}>
                          <span className="flex-1 truncate">{f.value}</span>
                          {f.type === "select" && <Icon icon="lucide:chevron-down" width={10} height={10} className="text-neutral-300 flex-shrink-0 ml-1" />}
                          {f.type === "date"   && <Icon icon="lucide:calendar"     width={10} height={10} className="text-sky-400/70 flex-shrink-0 ml-1" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Consignee */}
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm flex-shrink-0">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-50 to-white border-b border-neutral-100">
                    <span className="w-[3px] h-4 rounded-full bg-violet-500 flex-shrink-0" />
                    <Icon icon="lucide:users" width={12} height={12} className="text-violet-600" />
                    <span className="text-[10px] font-bold text-violet-700 uppercase tracking-widest">Consignee / Notify</span>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-3">
                    {CONSIGNEE_FIELDS.map((f) => (
                      <div key={f.label} className={f.span === 2 ? "col-span-2" : ""}>
                        <div className="text-[9px] font-semibold text-neutral-400 uppercase tracking-widest mb-1">{f.label}</div>
                        <div className="flex items-center w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white text-[11px] text-neutral-700">
                          <span className="flex-1 truncate">{f.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Carga */}
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm flex-shrink-0">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-white border-b border-neutral-100">
                    <span className="w-[3px] h-4 rounded-full bg-emerald-500 flex-shrink-0" />
                    <Icon icon="lucide:package" width={12} height={12} className="text-emerald-600" />
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Descripción de Carga</span>
                  </div>
                  <div className="p-3 grid grid-cols-4 gap-3">
                    {CARGA_FIELDS.map((f) => (
                      <div key={f.label}>
                        <div className="text-[9px] font-semibold text-neutral-400 uppercase tracking-widest mb-1">{f.label}</div>
                        <div className="flex items-center w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white text-[11px] text-neutral-700">
                          <span className="flex-1 truncate">{f.value}</span>
                          {f.type === "select" && <Icon icon="lucide:chevron-down" width={10} height={10} className="text-neutral-300 flex-shrink-0 ml-1" />}
                        </div>
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
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-sky-600 shadow-md">
                      <Icon icon="lucide:lock-keyhole" width={15} height={15} className="text-white" />
                    </span>
                    <p className="text-sm font-semibold text-neutral-700">{vr.highlight1}</p>
                  </div>
                  <AuthFormTrigger
                    mode="login"
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-sky-600 rounded-xl hover:bg-sky-700 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-sky-500/30"
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
