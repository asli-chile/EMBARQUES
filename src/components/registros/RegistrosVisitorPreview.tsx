import { useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { VisitorSidebarQuickAccess } from "@/components/layout/VisitorSidebarQuickAccess";
import { AuthFormTrigger } from "@/components/auth/AuthFormTrigger";
import { getEstadoOperacionStyle } from "@/lib/ui/estadoOperacion";
import { etiquetaEstado } from "@/lib/operaciones/estados";

const SAMPLE_ROWS = [
  { ref: "A00001", ingreso: "15-01-2025", ejecutivo: "María González", estado: "EN PROCESO", cliente: "Exportadora Frutícola Sur", especie: "Uvas", naviera: "MSC", etd: "10-02-2025", pod: "Filadelfia", eta: "08-03-2025", booking: "MSCUSN1234567" },
  { ref: "A00002", ingreso: "18-01-2025", ejecutivo: "Carlos López", estado: "EN TRÁNSITO", cliente: "Agrícola del Valle", especie: "Cerezas", naviera: "Hapag-Lloyd", etd: "05-02-2025", pod: "Rotterdam", eta: "12-03-2025", booking: "HLAGDE7890123" },
  { ref: "A00003", ingreso: "20-01-2025", ejecutivo: "María González", estado: "PENDIENTE", cliente: "Frutas Premium Ltda", especie: "Arándanos", naviera: "ONE", etd: "15-02-2025", pod: "Shanghai", eta: "28-03-2025", booking: "ONEYJP4567890" },
  { ref: "A00004", ingreso: "12-01-2025", ejecutivo: "Carlos López", estado: "ARRIBADO", cliente: "Exportadora Frutícola Sur", especie: "Ciruelas", naviera: "MSC", etd: "25-01-2025", pod: "Los Angeles", eta: "20-02-2025", booking: "MSCUSN9876543" },
  { ref: "A00005", ingreso: "22-01-2025", ejecutivo: "María González", estado: "EN PROCESO", cliente: "Agroexport del Norte", especie: "Paltas", naviera: "CMA CGM", etd: "20-02-2025", pod: "Le Havre", eta: "30-03-2025", booking: "CMAMRS2345678" },
  { ref: "A00006", ingreso: "25-01-2025", ejecutivo: "Carlos López", estado: "PENDIENTE", cliente: "Frutícola Atacama", especie: "Mandarinas", naviera: "Evergreen", etd: "28-02-2025", pod: "Hong Kong", eta: "05-04-2025", booking: "EVGTPE3456789" },
];

const FEATURES = [
  { icon: "lucide:table-2", text: "Tabla maestra con más de 80 campos operativos editables" },
  { icon: "lucide:search", text: "Búsqueda global por nave, booking, contenedor y cliente" },
  { icon: "lucide:columns", text: "Columnas personalizables y exportación a Excel / PDF" },
  { icon: "lucide:truck", text: "Envío directo de selección a transportes" },
];

const STATS = [
  { label: "En proceso", value: 2, dot: "bg-blue-400" },
  { label: "En tránsito", value: 1, dot: "bg-violet-400" },
  { label: "Pendiente", value: 2, dot: "bg-amber-400" },
  { label: "Arribado", value: 1, dot: "bg-emerald-400" },
];

const COLS = [
  { key: "ref", label: "Ref. ASLI" },
  { key: "ingreso", label: "Ingreso" },
  { key: "ejecutivo", label: "Ejecutivo" },
  { key: "estado", label: "Estado" },
  { key: "cliente", label: "Cliente" },
  { key: "especie", label: "Especie" },
  { key: "naviera", label: "Naviera" },
  { key: "etd", label: "ETD" },
  { key: "pod", label: "POD" },
  { key: "eta", label: "ETA" },
  { key: "booking", label: "Booking" },
] as const;

function EstadoBadge({ estado }: { estado: string }) {
  const cfg = getEstadoOperacionStyle(estado);
  const label = etiquetaEstado(estado);
  if (!cfg) return <span className="text-[11px] text-neutral-600">{label}</span>;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden />
      {label}
    </span>
  );
}

export function RegistrosVisitorPreview() {
  const { t } = useLocale();
  const vr = t.visitor.registros;

  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const posRef = useRef(0);
  const dirRef = useRef(1);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const DURATION_MS = 32000;
    const stepPerMs = 1 / DURATION_MS;
    const animate = () => {
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const step = max * stepPerMs * (1000 / 60) * dirRef.current;
      posRef.current = Math.max(0, Math.min(max, posRef.current + step));
      el.scrollLeft = posRef.current;
      if (posRef.current >= max) dirRef.current = -1;
      if (posRef.current <= 0) dirRef.current = 1;
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className="flex-1 min-h-0 overflow-auto flex flex-col bg-neutral-100" role="main">
      <div className="flex flex-col flex-1 min-h-0 p-3 sm:p-4 gap-3 max-w-[1400px] mx-auto w-full">
        <div className="flex-shrink-0">
          <VisitorSidebarQuickAccess currentHref="/registros" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4 flex-1 min-h-0">
          {/* Left: Hero — mismo patrón que Mis documentos / Papelera */}
          <div
            className="relative rounded-2xl overflow-hidden shadow-xl flex flex-col min-h-[400px] xl:min-h-0"
            style={{ background: "linear-gradient(145deg, #0f2d5e 0%, #1a4a8a 55%, #0d7377 100%)" }}
          >
            <div
              className="absolute -top-8 -right-8 w-44 h-44 rounded-full opacity-10"
              style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }}
            />
            <div
              className="absolute -bottom-12 -left-6 w-56 h-56 rounded-full opacity-[0.06]"
              style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }}
            />

            <div className="relative flex flex-col flex-1 p-6 sm:p-8 gap-5">
              <span className="self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white/90 border border-white/20">
                <Icon icon="lucide:clipboard-list" width={12} height={12} />
                {vr.moduleTag}
              </span>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight">{vr.title}</h1>
                <p className="text-white/65 mt-2 text-sm leading-relaxed">{vr.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {STATS.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/15"
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                    <span className="text-white/80 text-xs">{s.label}</span>
                    <span className="ml-auto text-white font-bold text-sm">{s.value}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 flex-1">
                {FEATURES.map((f) => (
                  <div key={f.text} className="flex items-start gap-3">
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
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-brand-blue bg-white rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-black/20"
                >
                  <Icon icon="lucide:log-in" width={16} height={16} />
                  {t.visitor.moduleCta}
                </AuthFormTrigger>
              </div>
            </div>
          </div>

          {/* Right: Table preview */}
          <div className="relative rounded-2xl overflow-hidden border border-neutral-200 shadow-sm bg-white flex flex-col min-h-[400px] xl:min-h-0">
            <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-white border-b border-neutral-200 select-none pointer-events-none">
              <div className="relative flex-1 max-w-xs">
                <Icon
                  icon="lucide:search"
                  width={13}
                  height={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <div className="w-full pl-8 pr-3 py-1.5 border border-neutral-200 rounded-lg bg-neutral-50 text-[11px] text-neutral-400">
                  Buscar: nave, booking, contenedor…
                </div>
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-[11px] text-neutral-500">
                  <Icon icon="lucide:columns" width={11} height={11} />
                  Columnas
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-[11px] text-neutral-500">
                  <Icon icon="lucide:table-2" width={11} height={11} />
                  Excel
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-brand-blue">
                  <Icon icon="lucide:plus" width={11} height={11} />
                  Nueva reserva
                </span>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 bg-brand-blue/5 border-b border-brand-blue/10 select-none pointer-events-none">
              <span className="text-[11px] text-brand-blue/70 font-medium">
                {SAMPLE_ROWS.length} registros · vista de muestra
              </span>
              <div className="flex items-center gap-2 ml-auto">
                {STATS.map((s) => (
                  <span key={s.label} className="flex items-center gap-1 text-[10px] text-neutral-500">
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {s.value} {s.label.toLowerCase()}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-0 relative overflow-hidden">
              <div
                ref={scrollRef}
                className="absolute inset-0 overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden select-none pointer-events-none"
                style={{
                  maskImage: "linear-gradient(to bottom, black 0%, black 55%, transparent 82%)",
                  WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 55%, transparent 82%)",
                }}
              >
                <table className="w-full min-w-[1100px] text-sm border-collapse">
                  <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0 z-10">
                    <tr>
                      {COLS.map((c) => (
                        <th
                          key={c.key}
                          className="px-3 py-2 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap"
                        >
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SAMPLE_ROWS.map((row, i) => (
                      <tr
                        key={row.ref}
                        className={`border-b border-neutral-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-brand-blue/[0.03]"}`}
                      >
                        <td className="px-3 py-2 font-semibold text-brand-blue text-[11px] whitespace-nowrap">{row.ref}</td>
                        <td className="px-3 py-2 text-[11px] text-neutral-600 whitespace-nowrap">{row.ingreso}</td>
                        <td className="px-3 py-2 text-[11px] text-neutral-600 whitespace-nowrap">{row.ejecutivo}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EstadoBadge estado={row.estado} />
                        </td>
                        <td className="px-3 py-2 text-[11px] text-neutral-600 whitespace-nowrap max-w-[140px] truncate">{row.cliente}</td>
                        <td className="px-3 py-2 text-[11px] text-neutral-600 whitespace-nowrap">{row.especie}</td>
                        <td className="px-3 py-2 text-[11px] text-neutral-600 whitespace-nowrap">{row.naviera}</td>
                        <td className="px-3 py-2 text-[11px] text-neutral-600 whitespace-nowrap">{row.etd}</td>
                        <td className="px-3 py-2 text-[11px] text-neutral-600 whitespace-nowrap">{row.pod}</td>
                        <td className="px-3 py-2 text-[11px] text-neutral-600 whitespace-nowrap">{row.eta}</td>
                        <td className="px-3 py-2 text-[11px] font-mono text-neutral-500 whitespace-nowrap">{row.booking}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                className="absolute bottom-0 inset-x-0 flex flex-col items-center justify-end pb-7 pt-16 z-10 pointer-events-auto"
                style={{ background: "linear-gradient(to top, #ffffff 58%, rgba(255,255,255,0) 100%)" }}
              >
                <div className="flex flex-col items-center gap-3 text-center px-4">
                  <span className="w-10 h-10 rounded-full bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center">
                    <Icon icon="lucide:lock" width={18} height={18} className="text-brand-blue" />
                  </span>
                  <p className="text-sm font-semibold text-neutral-800 max-w-xs">{vr.whatIncludes}</p>
                  <AuthFormTrigger
                    mode="login"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-brand-blue rounded-xl hover:bg-brand-blue/90 transition-colors shadow-sm"
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
