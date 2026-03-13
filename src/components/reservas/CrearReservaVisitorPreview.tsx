import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { VisitorSidebarQuickAccess } from "@/components/layout/VisitorSidebarQuickAccess";
import { AuthFormTrigger } from "@/components/auth/AuthFormTrigger";

const sectionIcons: Record<string, string> = {
  general: "typcn:clipboard",
  comercial: "typcn:briefcase",
  carga: "typcn:archive",
  naviera: "typcn:plane",
  planta: "typcn:home",
  deposito: "typcn:location",
};

export function CrearReservaVisitorPreview() {
  const { t } = useLocale();
  const tr = t.crearReserva;
  const vr = t.visitor.crearReserva;

  const sections = [
    {
      key: "general",
      label: tr.sectionGeneral,
      fields: [
        { label: tr.tipoOperacion, value: "EXPORTACIÓN" },
        { label: tr.estadoOperacion, value: "PENDIENTE" },
        { label: tr.ejecutivo, value: "María González" },
        { label: tr.cliente, value: "Exportadora Frutícola Sur" },
      ],
    },
    {
      key: "comercial",
      label: tr.sectionComercial,
      fields: [
        { label: tr.consignatario, value: "Import Co. USA" },
        { label: tr.incoterm, value: "FOB" },
        { label: tr.formaPago, value: "PREPAID" },
      ],
    },
    {
      key: "carga",
      label: tr.sectionCarga,
      fields: [
        { label: tr.especie, value: "Uvas" },
        { label: tr.paisDestino, value: "Filadelfia" },
        { label: tr.temperatura, value: "-1°C" },
        { label: tr.pallets, value: "22" },
        { label: tr.pesoBruto, value: "18.500 kg" },
        { label: tr.tipoUnidad, value: "40RF" },
      ],
    },
    {
      key: "naviera",
      label: tr.sectionNaviera,
      fields: [
        { label: tr.naviera, value: "MSC" },
        { label: tr.nave, value: "MSC GULSUN" },
        { label: tr.pol, value: "San Antonio" },
        { label: tr.pod, value: "Filadelfia" },
        { label: tr.etd, value: "15-02-2025" },
        { label: tr.booking, value: "MSCUSN1234567" },
      ],
    },
    {
      key: "planta",
      label: tr.sectionPlanta,
      fields: [
        { label: tr.planta, value: "Planta Curicó" },
        { label: tr.citacion, value: "10-02-2025 08:00" },
      ],
    },
    {
      key: "deposito",
      label: tr.sectionDeposito,
      fields: [
        { label: tr.deposito, value: "Depósito Central" },
        { label: tr.inicioStacking, value: "12-02-2025" },
        { label: tr.finStacking, value: "14-02-2025" },
        { label: tr.corteDocumental, value: "13-02-2025" },
      ],
    },
  ];

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-600 text-base pointer-events-none";

  return (
    <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-neutral-50" role="main">
      <div className="flex flex-col flex-1 min-h-0 p-3 sm:p-4 gap-3 max-w-[1400px] mx-auto w-full min-w-0 overflow-hidden">
        <div className="flex-shrink-0">
          <VisitorSidebarQuickAccess currentHref="/reservas/crear" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4 flex-1 min-h-0 min-w-0 overflow-hidden">
          <div className="min-h-0 min-w-0 flex">
            <div className="bg-white rounded-xl border border-neutral-200 shadow-mac-modal p-4 sm:p-5 flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
              <p className="text-sm font-semibold text-brand-teal uppercase tracking-wider mb-1 flex-shrink-0">
                {vr.moduleTag}
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-brand-blue tracking-tight leading-tight flex-shrink-0">{vr.title}</h1>
              <p className="text-neutral-500 mt-1 text-base leading-snug flex-shrink-0">{vr.description}</p>
              <h2 className="text-base font-semibold text-brand-blue mt-4 mb-2 flex-shrink-0">{vr.whatIncludes}</h2>
              <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                <div className="flex items-start gap-2 text-base text-neutral-600">
                  <Icon icon="typcn:media-record" className="text-brand-teal flex-shrink-0 mt-0.5" width={8} height={8} />
                  {vr.highlight1}
                </div>
                <div className="flex items-start gap-2 text-base text-neutral-600">
                  <Icon icon="typcn:media-record" className="text-brand-teal flex-shrink-0 mt-0.5" width={8} height={8} />
                  {vr.highlight2}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-neutral-100 flex-shrink-0">
                <AuthFormTrigger
                  mode="login"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-base font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors"
                >
                  <Icon icon="typcn:key" width={16} height={16} />
                  {t.visitor.moduleCta}
                </AuthFormTrigger>
              </div>
            </div>
          </div>

          <div className="flex flex-col min-h-0 min-w-0 overflow-hidden">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 flex-shrink-0">
              {vr.highlight1}
            </p>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sections.map((section) => (
                  <div
                    key={section.key}
                    className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden flex-shrink-0"
                  >
                    <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200 flex items-center gap-2">
                      <Icon
                        icon={sectionIcons[section.key] ?? "typcn:document"}
                        width={18}
                        height={18}
                        className="text-brand-blue"
                      />
                      <h2 className="text-base font-semibold text-brand-blue">{section.label}</h2>
                    </div>
                    <div className="p-4 grid grid-cols-1 gap-3">
                      {section.fields.map((f) => (
                        <div key={f.label}>
                          <label className="block text-sm font-medium text-neutral-500 uppercase tracking-wider mb-1">
                            {f.label}
                          </label>
                          <div className={inputClass}>{f.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 items-center mt-4 pb-4">
                <span className="text-base text-neutral-500">{vr.highlight2}</span>
                <div className="flex gap-2">
                  <span className="px-4 py-2 bg-neutral-100 text-neutral-500 rounded-lg text-base font-medium">
                    {tr.limpiar}
                  </span>
                  <span className="px-4 py-2 bg-brand-blue/10 text-brand-blue rounded-lg text-base font-medium border border-brand-blue/20">
                    {tr.guardar}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
