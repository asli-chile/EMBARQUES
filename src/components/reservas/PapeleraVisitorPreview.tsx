import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { VisitorSidebarQuickAccess } from "@/components/layout/VisitorSidebarQuickAccess";
import { AuthFormTrigger } from "@/components/auth/AuthFormTrigger";

const SAMPLE_ROWS = [
  {
    ref: "ASLI-2025-001",
    cliente: "Exportadora Frutícola Sur",
    especie: "Uvas",
    naviera: "MSC",
    nave: "MSC GULSUN",
    booking: "MSCUSN1234567",
    estado: "CANCELADO",
    deleted: "05-02-2025 14:32",
  },
  {
    ref: "ASLI-2024-089",
    cliente: "Agrícola del Valle",
    especie: "Cerezas",
    naviera: "Hapag-Lloyd",
    nave: "AL MHASSABI",
    booking: "HLAGDE6543210",
    estado: "PENDIENTE",
    deleted: "28-01-2025 09:15",
  },
];

export function PapeleraVisitorPreview() {
  const { t } = useLocale();
  const tr = t.papelera;
  const vr = t.visitor.papelera;

  const cols = [
    { key: "ref", label: tr.colRef },
    { key: "cliente", label: tr.colClient },
    { key: "especie", label: tr.colSpecies },
    { key: "naviera", label: tr.colCarrier },
    { key: "nave", label: tr.colVessel },
    { key: "booking", label: tr.colBooking },
    { key: "estado", label: tr.colStatus },
    { key: "deleted", label: tr.colDeleted },
  ];

  return (
    <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-neutral-50" role="main">
      <div className="flex flex-col flex-1 min-h-0 p-3 sm:p-4 gap-3 max-w-[1400px] mx-auto w-full min-w-0 overflow-hidden">
        <div className="flex-shrink-0">
          <VisitorSidebarQuickAccess currentHref="/reservas/papelera" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4 flex-1 min-h-0 min-w-0 overflow-hidden">
          <div className="min-h-0 min-w-0 flex">
            <div className="bg-white rounded-xl border border-neutral-200 shadow-mac-modal p-4 sm:p-5 flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
              <p className="text-sm font-semibold text-brand-teal uppercase tracking-wider mb-1 flex-shrink-0">
                {vr.moduleTag}
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-brand-blue tracking-tight leading-tight flex-shrink-0 flex items-center gap-2">
                <Icon icon="typcn:trash" width={24} height={24} />
                {vr.title}
              </h1>
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
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 flex-shrink-0">
              <p className="text-base text-neutral-500">
                {SAMPLE_ROWS.length} {tr.itemsInTrash}
              </p>
              <div className="flex gap-2 flex-wrap">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-600/10 text-green-700 rounded-lg border border-green-200 text-base font-medium">
                  <Icon icon="typcn:arrow-back" width={18} height={18} />
                  {tr.restore}
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-600/10 text-red-700 rounded-lg border border-red-200 text-base font-medium">
                  <Icon icon="typcn:delete" width={18} height={18} />
                  {tr.delete}
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg bg-white text-base font-medium">
                  <Icon icon="typcn:trash" width={18} height={18} />
                  {tr.emptyTrash}
                </span>
                <span className="px-4 py-2 border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-500">
                  <Icon icon="typcn:refresh" width={20} height={20} />
                </span>
              </div>
            </div>
            <div className="flex-1 min-h-0 bg-white rounded-xl border border-neutral-200 shadow-sm overflow-auto">
              <table className="w-full min-w-[700px] text-sm border-collapse">
                <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-1.5 text-center w-10">
                      <span className="w-4 h-4 block mx-auto border border-neutral-300 rounded bg-white" />
                    </th>
                    {cols.map((c) => (
                      <th
                        key={c.key}
                        className="px-2 py-1.5 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider"
                      >
                        {c.label}
                      </th>
                    ))}
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">{tr.colActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_ROWS.map((row, i) => (
                    <tr key={i} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/80 transition-colors">
                      <td className="px-2 py-1.5 text-center">
                        <span className="w-4 h-4 block mx-auto border border-neutral-300 rounded bg-white" />
                      </td>
                      <td className="px-2 py-1.5 font-medium text-neutral-400">{row.ref}</td>
                      <td className="px-2 py-1.5 text-neutral-500">{row.cliente}</td>
                      <td className="px-2 py-1.5 text-neutral-500">{row.especie}</td>
                      <td className="px-2 py-1.5 text-neutral-500">{row.naviera}</td>
                      <td className="px-2 py-1.5 text-neutral-500">{row.nave}</td>
                      <td className="px-2 py-1.5 text-neutral-500">{row.booking}</td>
                      <td className="px-2 py-1.5">
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-neutral-100 text-neutral-500">
                          {row.estado}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-neutral-400 text-xs">{row.deleted}</td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1">
                          <span className="inline-flex p-1.5 text-green-600/70">
                            <Icon icon="typcn:arrow-back" width={18} height={18} />
                          </span>
                          <span className="inline-flex p-1.5 text-red-600/70">
                            <Icon icon="typcn:delete" width={18} height={18} />
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-base text-neutral-500 flex items-center gap-2 mt-2 flex-shrink-0">
              <Icon icon="typcn:info" width={16} height={16} />
              {vr.highlight2}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
