import { useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { VisitorSidebarQuickAccess } from "@/components/layout/VisitorSidebarQuickAccess";

const SAMPLE_ROWS = [
  {
    ref: "ASLI-2025-001",
    cliente: "Exportadora Frutícola Sur",
    especie: "Uvas",
    naviera: "MSC",
    nave: "MSC GULSUN",
    pol: "San Antonio",
    pod: "Filadelfia",
    etd: "10-02-2025",
    eta: "15-03-2025",
    tt: 33,
    booking: "MSCUSN1234567",
    estado: "EN PROCESO",
  },
  {
    ref: "ASLI-2025-002",
    cliente: "Agrícola del Valle",
    especie: "Cerezas",
    naviera: "Hapag-Lloyd",
    nave: "AL MHASSABI",
    pol: "Valparaíso",
    pod: "Rotterdam",
    etd: "05-02-2025",
    eta: "12-03-2025",
    tt: 35,
    booking: "HLAGDE7890123",
    estado: "EN TRÁNSITO",
  },
  {
    ref: "ASLI-2025-003",
    cliente: "Frutas Premium Ltda",
    especie: "Arándanos",
    naviera: "ONE",
    nave: "ONE STORK",
    pol: "San Antonio",
    pod: "Shanghai",
    etd: "15-02-2025",
    eta: "28-03-2025",
    tt: 41,
    booking: "ONEYJP4567890",
    estado: "PENDIENTE",
  },
  {
    ref: "ASLI-2025-004",
    cliente: "Exportadora Frutícola Sur",
    especie: "Ciruelas",
    naviera: "MSC",
    nave: "MSC INES",
    pol: "Valparaíso",
    pod: "Los Angeles",
    etd: "25-01-2025",
    eta: "20-02-2025",
    tt: 26,
    booking: "MSCUSN9876543",
    estado: "ARRIBADO",
  },
];

const estadoColors: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800",
  "EN PROCESO": "bg-blue-100 text-blue-800",
  "EN TRÁNSITO": "bg-purple-100 text-purple-800",
  ARRIBADO: "bg-green-100 text-green-800",
  COMPLETADO: "bg-neutral-100 text-neutral-800",
  CANCELADO: "bg-red-100 text-red-800",
  ROLEADO: "bg-orange-100 text-orange-800",
};

export function MisReservasVisitorPreview() {
  const { t } = useLocale();
  const tr = t.misReservas;
  const vr = t.visitor.misReservas;
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
    { key: "ref", label: tr.colRef },
    { key: "cliente", label: tr.colClient },
    { key: "especie", label: tr.colSpecies },
    { key: "naviera", label: tr.colCarrier },
    { key: "nave", label: tr.colVessel },
    { key: "pol", label: tr.colPOL },
    { key: "pod", label: tr.colPOD },
    { key: "etd", label: tr.colETD },
    { key: "eta", label: tr.colETA },
    { key: "tt", label: tr.colTT },
    { key: "booking", label: tr.colBooking },
    { key: "estado", label: tr.colStatus },
  ];

  return (
    <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-neutral-50" role="main">
      <div className="flex flex-col flex-1 min-h-0 p-3 sm:p-4 gap-3 max-w-[1400px] mx-auto w-full min-w-0 overflow-hidden">
        <div className="flex-shrink-0">
          <VisitorSidebarQuickAccess currentHref="/reservas/mis-reservas" />
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

          <div className="flex flex-col min-h-0 min-w-0 overflow-hidden">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 flex-shrink-0">
              {vr.highlight1}
            </p>
            <div className="flex flex-wrap gap-3 items-center mb-3 flex-shrink-0">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Icon
                    icon="typcn:zoom"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5"
                  />
                  <input
                    type="text"
                    placeholder={tr.searchPlaceholder}
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-500 cursor-not-allowed text-base"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <span className="inline-flex items-center gap-2 px-4 py-2.5 border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-500 text-base">
                  <Icon icon="typcn:filter" width={18} height={18} />
                  {tr.filters}
                </span>
                <span className="px-4 py-2.5 border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-500">
                  <Icon icon="typcn:refresh" width={20} height={20} />
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <p className="text-base text-neutral-500">
                {SAMPLE_ROWS.length} {tr.records}
              </p>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue/10 text-brand-blue rounded-lg border border-brand-blue/20 text-base font-medium">
                <Icon icon="typcn:plus" width={18} height={18} />
                {tr.newBooking}
              </span>
            </div>
            <div
              ref={scrollRef}
              className="flex-1 min-h-0 bg-white rounded-xl border border-neutral-200 shadow-sm overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              <table className="w-full min-w-[1100px] text-sm border-collapse">
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
                      <td className="px-2 py-1.5 font-medium text-brand-blue">{row.ref}</td>
                      <td className="px-2 py-1.5 text-neutral-700">{row.cliente}</td>
                      <td className="px-2 py-1.5 text-neutral-700">{row.especie}</td>
                      <td className="px-2 py-1.5 text-neutral-700">{row.naviera}</td>
                      <td className="px-2 py-1.5 text-neutral-700">{row.nave}</td>
                      <td className="px-2 py-1.5 text-neutral-700">{row.pol}</td>
                      <td className="px-2 py-1.5 text-neutral-700">{row.pod}</td>
                      <td className="px-2 py-1.5 text-neutral-700">{row.etd}</td>
                      <td className="px-2 py-1.5 text-neutral-700">{row.eta}</td>
                      <td className="px-2 py-1.5 text-neutral-700">{row.tt}</td>
                      <td className="px-2 py-1.5 text-neutral-700">{row.booking}</td>
                      <td className="px-2 py-1.5">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            estadoColors[row.estado] ?? "bg-neutral-100 text-neutral-800"
                          }`}
                        >
                          {row.estado}
                        </span>
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="inline-flex p-1.5 text-neutral-400">
                          <Icon icon="typcn:trash" width={18} height={18} />
                        </span>
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
