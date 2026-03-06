import { useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { VisitorSidebarQuickAccess } from "@/components/layout/VisitorSidebarQuickAccess";

type SampleRow = Record<string, string>;

const COLS: { key: string; labelKey: string }[] = [
  { key: "ref", labelKey: "colRefAsli" },
  { key: "cliente", labelKey: "colClient" },
  { key: "empresa", labelKey: "transportCompany" },
  { key: "factura", labelKey: "transportInvoice" },
  { key: "porteo", labelKey: "portageValue" },
  { key: "falso_flete", labelKey: "deadFreightValue" },
  { key: "tramo", labelKey: "section" },
  { key: "valor_tramo", labelKey: "sectionValue" },
  { key: "estado", labelKey: "colStatus" },
];

const SAMPLE_ROWS: SampleRow[] = [
  { ref: "E01234", cliente: "Importadora Norte", empresa: "Transportes del Sur", factura: "FAC-2025-001", porteo: "45.000", falso_flete: "12.000", tramo: "Planta-Puerto", valor_tramo: "95.000", estado: "Facturado" },
  { ref: "E01235", cliente: "Comercial Este", empresa: "Logística Norte", factura: "—", porteo: "—", falso_flete: "—", tramo: "—", valor_tramo: "—", estado: "Pendiente" },
  { ref: "E01236", cliente: "Distribuidora Sur", empresa: "Cargo Express", factura: "FAC-2025-002", porteo: "38.000", falso_flete: "8.500", tramo: "Depósito-Puerto", valor_tramo: "88.000", estado: "Pagado" },
  { ref: "E01237", cliente: "Importadora Norte", empresa: "Transportes Centro", factura: "FAC-2025-003", porteo: "52.000", falso_flete: "15.000", tramo: "Planta-Depósito", valor_tramo: "102.000", estado: "Facturado" },
  { ref: "E01238", cliente: "Comercial Oeste", empresa: "Flota Nacional", factura: "—", porteo: "—", falso_flete: "—", tramo: "—", valor_tramo: "—", estado: "Pendiente" },
  { ref: "E01239", cliente: "Distribuidora Sur", empresa: "Transportes del Sur", factura: "FAC-2025-004", porteo: "41.000", falso_flete: "10.000", tramo: "Planta-Puerto", valor_tramo: "92.000", estado: "Pagado" },
  { ref: "E01240", cliente: "Importadora Norte", empresa: "Cargo Express", factura: "FAC-2025-005", porteo: "48.000", falso_flete: "11.500", tramo: "Planta-Puerto", valor_tramo: "99.000", estado: "Facturado" },
  { ref: "E01241", cliente: "Comercial Este", empresa: "Transportes Centro", factura: "—", porteo: "—", falso_flete: "—", tramo: "—", valor_tramo: "—", estado: "Pendiente" },
  { ref: "E01242", cliente: "Distribuidora Sur", empresa: "Logística Norte", factura: "FAC-2025-006", porteo: "35.000", falso_flete: "9.000", tramo: "Depósito-Puerto", valor_tramo: "85.000", estado: "Pagado" },
  { ref: "E01243", cliente: "Comercial Oeste", empresa: "Transportes del Sur", factura: "FAC-2025-007", porteo: "55.000", falso_flete: "14.000", tramo: "Planta-Depósito", valor_tramo: "108.000", estado: "Facturado" },
  { ref: "E01244", cliente: "Importadora Norte", empresa: "Flota Nacional", factura: "—", porteo: "—", falso_flete: "—", tramo: "—", valor_tramo: "—", estado: "Pendiente" },
  { ref: "E01245", cliente: "Distribuidora Sur", empresa: "Cargo Express", factura: "FAC-2025-008", porteo: "42.000", falso_flete: "10.500", tramo: "Planta-Puerto", valor_tramo: "94.000", estado: "Pagado" },
  { ref: "E01246", cliente: "Comercial Este", empresa: "Transportes Centro", factura: "FAC-2025-009", porteo: "50.000", falso_flete: "13.000", tramo: "Depósito-Puerto", valor_tramo: "101.000", estado: "Facturado" },
  { ref: "E01247", cliente: "Importadora Norte", empresa: "Logística Norte", factura: "—", porteo: "—", falso_flete: "—", tramo: "—", valor_tramo: "—", estado: "Pendiente" },
  { ref: "E01248", cliente: "Comercial Oeste", empresa: "Transportes del Sur", factura: "FAC-2025-010", porteo: "39.000", falso_flete: "9.500", tramo: "Planta-Depósito", valor_tramo: "89.000", estado: "Pagado" },
  { ref: "E01249", cliente: "Importadora Norte", empresa: "Cargo Express", factura: "—", porteo: "—", falso_flete: "—", tramo: "—", valor_tramo: "—", estado: "Pendiente" },
  { ref: "E01250", cliente: "Distribuidora Sur", empresa: "Transportes Centro", factura: "FAC-2025-011", porteo: "46.000", falso_flete: "11.000", tramo: "Planta-Puerto", valor_tramo: "96.000", estado: "Facturado" },
  { ref: "E01251", cliente: "Comercial Este", empresa: "Logística Norte", factura: "FAC-2025-012", porteo: "43.000", falso_flete: "10.200", tramo: "Depósito-Puerto", valor_tramo: "87.000", estado: "Pagado" },
  { ref: "E01252", cliente: "Comercial Oeste", empresa: "Flota Nacional", factura: "—", porteo: "—", falso_flete: "—", tramo: "—", valor_tramo: "—", estado: "Pendiente" },
  { ref: "E01253", cliente: "Importadora Norte", empresa: "Transportes del Sur", factura: "FAC-2025-013", porteo: "54.000", falso_flete: "13.500", tramo: "Planta-Depósito", valor_tramo: "104.000", estado: "Facturado" },
  { ref: "E01254", cliente: "Distribuidora Sur", empresa: "Cargo Express", factura: "FAC-2025-014", porteo: "37.000", falso_flete: "9.200", tramo: "Planta-Puerto", valor_tramo: "93.000", estado: "Pagado" },
  { ref: "E01255", cliente: "Comercial Este", empresa: "Transportes Centro", factura: "—", porteo: "—", falso_flete: "—", tramo: "—", valor_tramo: "—", estado: "Pendiente" },
  { ref: "E01256", cliente: "Comercial Oeste", empresa: "Logística Norte", factura: "FAC-2025-015", porteo: "49.000", falso_flete: "12.000", tramo: "Depósito-Puerto", valor_tramo: "100.000", estado: "Facturado" },
  { ref: "E01257", cliente: "Importadora Norte", empresa: "Flota Nacional", factura: "FAC-2025-016", porteo: "44.000", falso_flete: "10.800", tramo: "Planta-Depósito", valor_tramo: "90.000", estado: "Pagado" },
];

export function ReservaExtVisitorPreview() {
  const { t } = useLocale();
  const v = t.visitor.reservaExt;
  const tr = t.transporteExt;
  const treg = t.registros;
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();
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

  return (
    <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-neutral-50" role="main">
      <div className="flex flex-col flex-1 min-h-0 p-3 sm:p-4 gap-3 max-w-[1400px] mx-auto w-full min-w-0 overflow-hidden">
        <div className="flex-shrink-0">
          <VisitorSidebarQuickAccess currentHref="/transportes/reserva-ext" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4 flex-1 min-h-0 min-w-0 overflow-hidden">
          <div className="min-h-0 min-w-0 flex">
            <div className="bg-white rounded-xl border border-neutral-200 shadow-mac-modal p-4 sm:p-5 flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
              <p className="text-sm font-semibold text-brand-teal uppercase tracking-wider mb-1 flex-shrink-0">
                {t.visitor.transportModule}
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-brand-blue tracking-tight leading-tight flex-shrink-0">{v.title}</h1>
              <p className="text-neutral-500 mt-1 text-base leading-snug flex-shrink-0">{v.description}</p>
              <h2 className="text-base font-semibold text-brand-blue mt-4 mb-2 flex-shrink-0">{v.whatSolutionsOffers}</h2>
              <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                <div className="flex items-start gap-2 text-base text-neutral-600">
                  <Icon icon="typcn:media-record" className="text-brand-teal flex-shrink-0 mt-0.5" width={8} height={8} />
                  {v.highlight1}
                </div>
                <div className="flex items-start gap-2 text-base text-neutral-600">
                  <Icon icon="typcn:media-record" className="text-brand-teal flex-shrink-0 mt-0.5" width={8} height={8} />
                  {v.highlight2}
                </div>
                <div className="flex items-start gap-2 text-base text-neutral-600">
                  <Icon icon="typcn:media-record" className="text-brand-teal flex-shrink-0 mt-0.5" width={8} height={8} />
                  {v.highlight3}
                </div>
                <div className="flex items-start gap-2 text-base text-neutral-600">
                  <Icon icon="typcn:media-record" className="text-brand-teal flex-shrink-0 mt-0.5" width={8} height={8} />
                  {v.highlight4}
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
              Vista de muestra — Transportes de reservas externas
            </p>
            <div
              ref={scrollRef}
              className="flex-1 min-h-0 bg-white rounded-xl border border-neutral-200 shadow-sm overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              <table className="w-full min-w-[2600px] text-sm border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    {COLS.map((c) => {
                      const label =
                        c.labelKey === "colRefAsli"
                          ? "REF"
                          : c.labelKey === "colClient"
                            ? treg.colClient
                            : c.labelKey === "colStatus"
                              ? treg.colStatus
                              : (tr as Record<string, string>)[c.labelKey] ?? c.key;
                      return (
                        <th
                          key={c.key}
                          className="px-2 py-1.5 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap"
                        >
                          {label}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_ROWS.map((row, i) => (
                    <tr key={i} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/80 transition-colors">
                      {COLS.map((c) => (
                        <td key={c.key} className="px-2 py-1.5 text-neutral-700 whitespace-nowrap">
                          {row[c.key] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
