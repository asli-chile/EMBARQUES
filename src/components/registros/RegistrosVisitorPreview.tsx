import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { VisitorSidebarQuickAccess } from "@/components/layout/VisitorSidebarQuickAccess";
import { REGISTROS_FIELD_GROUPS } from "@/lib/registros-field-info";

type SampleRow = {
  ref_asli: string;
  ingreso: string;
  ejecutivo: string;
  estado_operacion: string;
  cliente: string;
  especie: string;
  naviera: string;
  etd: string;
  pod: string;
  eta: string;
  booking: string;
};

const SAMPLE_ROWS: SampleRow[] = [
  {
    ref_asli: "ASLI-2025-001",
    ingreso: "2025-01-15",
    ejecutivo: "María González",
    estado_operacion: "EN PROCESO",
    cliente: "Exportadora Frutícola Sur",
    especie: "Uvas",
    naviera: "MSC",
    etd: "2025-02-10",
    pod: "Filadelfia",
    eta: "2025-03-08",
    booking: "MSCUSN1234567",
  },
  {
    ref_asli: "ASLI-2025-002",
    ingreso: "2025-01-18",
    ejecutivo: "Carlos López",
    estado_operacion: "EN TRÁNSITO",
    cliente: "Agrícola del Valle",
    especie: "Cerezas",
    naviera: "Hapag-Lloyd",
    etd: "2025-02-05",
    pod: "Rotterdam",
    eta: "2025-03-12",
    booking: "HLAGDE7890123",
  },
  {
    ref_asli: "ASLI-2025-003",
    ingreso: "2025-01-20",
    ejecutivo: "María González",
    estado_operacion: "PENDIENTE",
    cliente: "Frutas Premium Ltda",
    especie: "Arándanos",
    naviera: "ONE",
    etd: "2025-02-15",
    pod: "Shanghai",
    eta: "2025-03-28",
    booking: "ONEYJP4567890",
  },
  {
    ref_asli: "ASLI-2025-004",
    ingreso: "2025-01-12",
    ejecutivo: "Carlos López",
    estado_operacion: "ARRIBADO",
    cliente: "Exportadora Frutícola Sur",
    especie: "Ciruelas",
    naviera: "MSC",
    etd: "2025-01-25",
    pod: "Los Angeles",
    eta: "2025-02-20",
    booking: "MSCUSN9876543",
  },
];

export function RegistrosVisitorPreview() {
  const { t } = useLocale();
  const tr = t.registros;
  const vr = t.visitor.registros;
  const [showFields, setShowFields] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const posRef = useRef(0);
  const dirRef = useRef(1);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const DURATION_ONE_WAY_MS = 35000;
    const FPS = 90;
    const stepPerMs = 1 / DURATION_ONE_WAY_MS;

    const animate = () => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;

      const step = maxScroll * stepPerMs * (1000 / FPS) * dirRef.current;
      posRef.current = Math.max(0, Math.min(maxScroll, posRef.current + step));
      el.scrollLeft = posRef.current;

      if (posRef.current >= maxScroll) dirRef.current = -1;
      if (posRef.current <= 0) dirRef.current = 1;

      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const cols = [
    { field: "ref_asli", label: tr.colRefAsli },
    { field: "ingreso", label: tr.colEntryDate },
    { field: "ejecutivo", label: tr.colExecutive },
    { field: "estado_operacion", label: tr.colOperationStatus },
    { field: "cliente", label: tr.colClient },
    { field: "especie", label: tr.colSpecies },
    { field: "naviera", label: tr.colCarrier },
    { field: "etd", label: tr.colETD },
    { field: "pod", label: tr.colPOD },
    { field: "eta", label: tr.colETA },
    { field: "booking", label: tr.colBooking },
  ] as const;

  return (
    <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-neutral-50" role="main">
      <div className="flex flex-col flex-1 min-h-0 p-3 sm:p-4 gap-3 max-w-[1400px] mx-auto w-full min-w-0 overflow-hidden">
        <div className="flex-shrink-0">
          <VisitorSidebarQuickAccess currentHref="/registros" />
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
                <a
                  href="/auth/login"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-base font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors"
                >
                  <Icon icon="typcn:key" width={16} height={16} />
                  {t.visitor.moduleCta}
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-col min-h-0 min-w-0">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 flex-shrink-0">
              {vr.sampleLabel}
            </p>
            <div
              ref={scrollRef}
              className="flex-1 min-h-0 bg-white rounded-xl border border-neutral-200 shadow-sm overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              <table className="w-full min-w-[1100px] text-sm border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    {cols.map((c) => (
                      <th
                        key={c.field}
                        className="px-2 py-1.5 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap"
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_ROWS.map((row, i) => (
                    <tr key={i} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/80 transition-colors">
                      {cols.map((c) => (
                        <td key={c.field} className="px-2 py-1.5 text-neutral-700 whitespace-nowrap">
                          {row[c.field]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 pt-2 border-t border-neutral-100 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowFields(!showFields)}
                className="flex items-center gap-2 text-base font-semibold text-brand-blue hover:text-brand-blue/80 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:ring-offset-2 rounded px-1"
                aria-expanded={showFields}
              >
                <Icon icon={showFields ? "typcn:arrow-sorted-up" : "typcn:arrow-sorted-down"} width={18} height={18} />
                {vr.fieldsTitle}
              </button>
              {showFields && (
                <div className="mt-4 space-y-4 animate-fade-in-up overflow-y-auto max-h-48">
                  {REGISTROS_FIELD_GROUPS.map((group) => (
                    <div key={group.groupLabelKey} className="bg-white rounded-lg border border-neutral-200 p-3">
                      <h3 className="text-base font-semibold text-brand-blue mb-2">
                        {(vr as Record<string, unknown>)[group.groupLabelKey] as string}
                      </h3>
                      <dl className="space-y-1.5">
                        {group.fields.map((f) => (
                          <div key={f.key} className="flex flex-col sm:flex-row sm:gap-3">
                            <dt className="text-sm font-medium text-neutral-600 sm:w-40 flex-shrink-0">
                              {(tr as Record<string, string>)[f.labelKey]}
                            </dt>
                            <dd className="text-sm text-neutral-500 flex-1">
                              {vr.fieldsDesc?.[f.key] ?? "—"}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
