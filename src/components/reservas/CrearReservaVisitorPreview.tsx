import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { VisitorSidebarQuickAccess } from "@/components/layout/VisitorSidebarQuickAccess";
import { AuthFormTrigger } from "@/components/auth/AuthFormTrigger";

const PREVIEW_SECTIONS = [
  {
    icon: "lucide:clipboard-list",
    label: "General",
    fields: [
      { label: "Tipo de operación", value: "EXPORTACIÓN" },
      { label: "Estado", value: "PENDIENTE" },
      { label: "Ejecutivo", value: "María González" },
      { label: "Cliente", value: "Exportadora Frutícola Sur" },
    ],
  },
  {
    icon: "lucide:ship",
    label: "Naviera",
    fields: [
      { label: "Naviera", value: "MSC" },
      { label: "Nave", value: "MSC GULSUN" },
      { label: "POL", value: "San Antonio" },
      { label: "POD", value: "Filadelfia" },
      { label: "ETD", value: "15-02-2025" },
      { label: "Booking", value: "MSCUSN1234567" },
    ],
  },
  {
    icon: "lucide:package",
    label: "Carga",
    fields: [
      { label: "Especie", value: "Uvas" },
      { label: "Temperatura", value: "-1°C" },
      { label: "Pallets", value: "22" },
      { label: "Tipo unidad", value: "40RF" },
    ],
  },
  {
    icon: "lucide:map-pin",
    label: "Depósito",
    fields: [
      { label: "Depósito", value: "Depósito Central" },
      { label: "Inicio stacking", value: "12-02-2025" },
      { label: "Fin stacking", value: "14-02-2025" },
    ],
  },
];

const FEATURES = [
  { icon: "lucide:zap", text: "Registro completo de datos operativos, comerciales y de carga" },
  { icon: "lucide:link", text: "Vinculación automática con naviera, nave y booking" },
  { icon: "lucide:bell", text: "Notificaciones al equipo al crear o actualizar una reserva" },
  { icon: "lucide:file-text", text: "Generación de documentos e instructivos desde la operación" },
];

export function CrearReservaVisitorPreview() {
  const { t } = useLocale();
  const vr = t.visitor.crearReserva;

  return (
    <main className="flex-1 min-h-0 overflow-auto flex flex-col bg-neutral-100" role="main">
      <div className="flex flex-col flex-1 min-h-0 p-3 sm:p-4 gap-3 max-w-[1400px] mx-auto w-full">

        {/* Quick access */}
        <div className="flex-shrink-0">
          <VisitorSidebarQuickAccess currentHref="/reservas/crear" />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4 flex-1 min-h-0">

          {/* ── Left: Hero Panel ── */}
          <div className="relative rounded-2xl overflow-hidden shadow-xl flex flex-col min-h-[420px] xl:min-h-0"
            style={{ background: "linear-gradient(145deg, #0f2d5e 0%, #1a4a8a 50%, #0e7490 100%)" }}
          >
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10"
              style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />
            <div className="absolute -bottom-16 -left-8 w-64 h-64 rounded-full opacity-[0.06]"
              style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />

            <div className="relative flex flex-col flex-1 p-6 sm:p-8 gap-5">
              {/* Badge */}
              <div className="flex-shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white/90 border border-white/20 backdrop-blur-sm">
                  <Icon icon="lucide:package" width={12} height={12} />
                  {vr.moduleTag}
                </span>
              </div>

              {/* Title + description */}
              <div className="flex-shrink-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight">
                  {vr.title}
                </h1>
                <p className="text-white/70 mt-2 text-sm leading-relaxed">
                  {vr.description}
                </p>
              </div>

              {/* Features */}
              <div className="flex flex-col gap-3 flex-1">
                {FEATURES.map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center mt-0.5">
                      <Icon icon={f.icon} width={14} height={14} className="text-white/90" />
                    </span>
                    <p className="text-white/80 text-sm leading-relaxed">{f.text}</p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="flex-shrink-0 pt-2 border-t border-white/15">
                <p className="text-white/50 text-xs mb-3">{vr.highlight2}</p>
                <AuthFormTrigger
                  mode="login"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-brand-blue bg-white rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-black/20"
                >
                  <Icon icon="lucide:log-in" width={16} height={16} />
                  {t.visitor.moduleCta}
                </AuthFormTrigger>
              </div>
            </div>
          </div>

          {/* ── Right: Form Preview ── */}
          <div className="relative rounded-2xl overflow-hidden border border-neutral-200 shadow-sm bg-white flex flex-col min-h-[520px] xl:min-h-0">

            {/* ── App chrome: top bar ── */}
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-white border-b border-neutral-200 select-none pointer-events-none">
              <div className="flex items-center gap-2 min-w-0">
                <Icon icon="lucide:package" width={15} height={15} className="text-brand-blue flex-shrink-0" />
                <span className="text-sm font-semibold text-neutral-800">Nueva Reserva</span>
                <span className="text-[11px] font-mono text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">ASLI-2025-012</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  PENDIENTE
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-[11px] font-medium text-neutral-500">
                  <Icon icon="lucide:rotate-ccw" width={11} height={11} />
                  Limpiar
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #0f2d5e, #1a4a8a)" }}
                >
                  <Icon icon="lucide:save" width={11} height={11} />
                  Guardar
                </span>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex-shrink-0 flex items-end gap-0 px-3 bg-white border-b border-neutral-200 select-none pointer-events-none">
              {[
                { icon: "lucide:clipboard-list", label: "General",   color: "text-brand-blue border-brand-blue", active: true },
                { icon: "lucide:briefcase",       label: "Comercial", color: "text-neutral-400 border-transparent", active: false },
                { icon: "lucide:package",          label: "Carga",     color: "text-neutral-400 border-transparent", active: false },
                { icon: "lucide:ship",             label: "Naviera",   color: "text-neutral-400 border-transparent", active: false },
                { icon: "lucide:factory",          label: "Planta",    color: "text-neutral-400 border-transparent", active: false },
                { icon: "lucide:map-pin",          label: "Depósito",  color: "text-neutral-400 border-transparent", active: false },
              ].map((tab) => (
                <span key={tab.label}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-b-2 whitespace-nowrap ${tab.color}`}
                >
                  <Icon icon={tab.icon} width={11} height={11} />
                  {tab.label}
                </span>
              ))}
            </div>

            {/* ── Scrollable form area ── */}
            <div className="flex-1 min-h-0 overflow-hidden relative">

              {/* Form content — clear at top, fades at bottom */}
              <div className="absolute inset-0 overflow-y-auto overflow-x-hidden select-none pointer-events-none px-4 pt-4 pb-0 flex flex-col gap-3"
                style={{ maskImage: "linear-gradient(to bottom, black 0%, black 52%, transparent 78%)", WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 52%, transparent 78%)" }}
              >

                {/* General */}
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm flex-shrink-0">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-white border-b border-neutral-100">
                    <span className="w-[3px] h-4 rounded-full bg-brand-blue flex-shrink-0" />
                    <Icon icon="lucide:clipboard-list" width={12} height={12} className="text-brand-blue" />
                    <span className="text-[10px] font-bold text-brand-blue uppercase tracking-widest">General</span>
                  </div>
                  <div className="p-3 grid grid-cols-3 gap-3">
                    {[
                      { label: "Tipo operación",  value: "EXPORTACIÓN",              type: "select" },
                      { label: "Estado",           value: "PENDIENTE",                type: "badge"  },
                      { label: "Ejecutivo",        value: "María González",           type: "select" },
                      { label: "Cliente",          value: "Exportadora Frutícola Sur",type: "select", span: true },
                      { label: "Ref. ASLI",        value: "ASLI-2025-012",            type: "text"   },
                      { label: "Fecha apertura",   value: "10-02-2025",               type: "date"   },
                    ].map((f) => (
                      <div key={f.label} className={f.span ? "col-span-2" : ""}>
                        <div className="text-[9px] font-semibold text-neutral-400 uppercase tracking-widest mb-1">{f.label}</div>
                        {f.type === "badge" ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-[11px] font-semibold text-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            {f.value}
                          </div>
                        ) : (
                          <div className={`flex items-center w-full px-2.5 py-1.5 rounded-lg border bg-white text-[11px] text-neutral-700 ${
                            f.type === "date" ? "border-brand-blue/25 bg-blue-50/30" : "border-neutral-200"
                          }`}>
                            <span className="flex-1 truncate">{f.value}</span>
                            {f.type === "select" && <Icon icon="lucide:chevron-down" width={10} height={10} className="text-neutral-300 flex-shrink-0 ml-1" />}
                            {f.type === "date"   && <Icon icon="lucide:calendar"     width={10} height={10} className="text-brand-blue/50 flex-shrink-0 ml-1" />}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Naviera */}
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm flex-shrink-0">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-50 to-white border-b border-neutral-100">
                    <span className="w-[3px] h-4 rounded-full bg-cyan-500 flex-shrink-0" />
                    <Icon icon="lucide:ship" width={12} height={12} className="text-cyan-600" />
                    <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-widest">Naviera</span>
                  </div>
                  <div className="p-3 grid grid-cols-3 gap-3">
                    {[
                      { label: "Naviera",  value: "MSC",           type: "select" },
                      { label: "Nave",     value: "MSC GULSUN",    type: "select" },
                      { label: "Booking",  value: "MSCUSN1234567", type: "text"   },
                      { label: "POL",      value: "San Antonio",   type: "select" },
                      { label: "POD",      value: "Filadelfia",    type: "select" },
                      { label: "ETD",      value: "15-02-2025",    type: "date"   },
                    ].map((f) => (
                      <div key={f.label}>
                        <div className="text-[9px] font-semibold text-neutral-400 uppercase tracking-widest mb-1">{f.label}</div>
                        <div className={`flex items-center w-full px-2.5 py-1.5 rounded-lg border bg-white text-[11px] text-neutral-700 ${
                          f.type === "date" ? "border-cyan-200 bg-cyan-50/30" : "border-neutral-200"
                        }`}>
                          <span className="flex-1 truncate">{f.value}</span>
                          {f.type === "select" && <Icon icon="lucide:chevron-down" width={10} height={10} className="text-neutral-300 flex-shrink-0 ml-1" />}
                          {f.type === "date"   && <Icon icon="lucide:calendar"     width={10} height={10} className="text-cyan-400/70 flex-shrink-0 ml-1" />}
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
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Carga</span>
                  </div>
                  <div className="p-3 grid grid-cols-4 gap-3">
                    {[
                      { label: "Especie",      value: "Uvas" },
                      { label: "Temperatura",  value: "-1°C" },
                      { label: "Pallets",      value: "22" },
                      { label: "Tipo unidad",  value: "40RF" },
                      { label: "Peso bruto",   value: "18.500 kg" },
                      { label: "País destino", value: "Estados Unidos" },
                      { label: "Incoterm",     value: "FOB" },
                      { label: "Forma pago",   value: "PREPAID" },
                    ].map((f) => (
                      <div key={f.label}>
                        <div className="text-[9px] font-semibold text-neutral-400 uppercase tracking-widest mb-1">{f.label}</div>
                        <div className="flex items-center w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white text-[11px] text-neutral-700">
                          <span className="flex-1 truncate">{f.value}</span>
                          <Icon icon="lucide:chevron-down" width={10} height={10} className="text-neutral-300 flex-shrink-0 ml-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* ── Lock CTA — pinned at bottom ── */}
              <div className="absolute bottom-0 inset-x-0 flex flex-col items-center justify-end pb-8 pt-24 z-10 pointer-events-auto"
                style={{ background: "linear-gradient(to top, #ffffff 60%, rgba(255,255,255,0.95) 75%, transparent 100%)" }}
              >
                <div className="flex flex-col items-center gap-3 text-center px-6 max-w-xs">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl shadow-md bg-brand-blue">
                      <Icon icon="lucide:lock-keyhole" width={15} height={15} className="text-white" />
                    </span>
                    <p className="text-sm font-semibold text-neutral-700">{vr.highlight1}</p>
                  </div>
                  <AuthFormTrigger
                    mode="login"
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-brand-blue rounded-xl hover:bg-brand-blue/90 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-brand-blue/30"
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
