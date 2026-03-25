import { useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { VisitorSidebarQuickAccess } from "@/components/layout/VisitorSidebarQuickAccess";
import { AuthFormTrigger } from "@/components/auth/AuthFormTrigger";

const SAMPLE_ROWS = [
  { ref: "A07015", cliente: "Exportadora Sur",   transporte: "Transportes Norte", chofer: "Juan Pérez",      patente: "RST-123", contenedor: "OTPU683204", tramo: "Planta-Depósito", valor: "$85.000",  estado: "Asignado"  },
  { ref: "A07016", cliente: "Agrícola Valle",     transporte: "Logística Centro",  chofer: "Carlos Soto",     patente: "ABC-789", contenedor: "SEGU982106", tramo: "Planta-Puerto",   valor: "$120.000", estado: "Asignado"  },
  { ref: "A07017", cliente: "Frutas Premium",     transporte: "—",                 chofer: "—",               patente: "—",       contenedor: "—",          tramo: "—",               valor: "—",        estado: "Pendiente" },
  { ref: "A07018", cliente: "Exportadora Sur",   transporte: "Cargo Express",     chofer: "Luis Mora",       patente: "GHI-345", contenedor: "TEMU975700", tramo: "Depósito-Puerto", valor: "$95.000",  estado: "Asignado"  },
  { ref: "A07019", cliente: "Agrícola Valle",     transporte: "Transportes Norte", chofer: "Pedro Ríos",      patente: "MNO-901", contenedor: "ONEU930380", tramo: "Planta-Depósito", valor: "$88.000",  estado: "Asignado"  },
  { ref: "A07020", cliente: "Frutas Premium",     transporte: "Logística Centro",  chofer: "Ana Silva",       patente: "STU-567", contenedor: "MNBU041606", tramo: "Planta-Puerto",   valor: "$125.000", estado: "Asignado"  },
  { ref: "A07021", cliente: "Exportadora Sur",   transporte: "—",                 chofer: "—",               patente: "—",       contenedor: "—",          tramo: "—",               valor: "—",        estado: "Pendiente" },
  { ref: "A07022", cliente: "Agrícola Valle",     transporte: "Cargo Express",     chofer: "Roberto Díaz",    patente: "YZA-123", contenedor: "FSCU592501", tramo: "Planta-Depósito", valor: "$82.000",  estado: "Asignado"  },
];

const ESTADO_STYLE: Record<string, string> = {
  "Asignado":  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Pendiente": "bg-amber-50 text-amber-700 border-amber-200",
};

const FEATURES = [
  { icon: "lucide:truck",         text: "Asignación de empresa transportista, chofer y unidad por operación" },
  { icon: "lucide:container",     text: "Registro de contenedor, sello, tara y tramo completo" },
  { icon: "lucide:calendar-clock",text: "Control de citación, llegada/salida de planta y stacking" },
  { icon: "lucide:dollar-sign",   text: "Valor de tramo y moneda asociada a cada servicio" },
];

const STATS = [
  { label: "Asignados",  value: 6, dot: "bg-emerald-400" },
  { label: "Pendientes", value: 2, dot: "bg-amber-400"   },
];

export function ReservaAsliVisitorPreview() {
  const { t } = useLocale();
  const v  = t.visitor.reservaAsli;

  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef    = useRef<number | undefined>(undefined);
  const posRef    = useRef(0);
  const dirRef    = useRef(1);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const animate = () => {
      const max  = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const step = max * (1 / 30000) * (1000 / 60) * dirRef.current;
      posRef.current = Math.max(0, Math.min(max, posRef.current + step));
      el.scrollLeft  = posRef.current;
      if (posRef.current >= max) dirRef.current = -1;
      if (posRef.current <= 0)   dirRef.current =  1;
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <main className="flex-1 min-h-0 overflow-auto flex flex-col bg-neutral-100" role="main">
      <div className="flex flex-col flex-1 min-h-0 p-3 sm:p-4 gap-3 max-w-[1400px] mx-auto w-full">
        <div className="flex-shrink-0">
          <VisitorSidebarQuickAccess currentHref="/transportes/reserva-asli" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4 flex-1 min-h-0">

          {/* ── Left: Hero ── */}
          <div className="relative rounded-2xl overflow-hidden shadow-xl flex flex-col min-h-[400px] xl:min-h-0"
            style={{ background: "linear-gradient(145deg, #0f2d5e 0%, #0e5a6e 55%, #0e7490 100%)" }}
          >
            <div className="absolute -top-8 -right-8 w-44 h-44 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />
            <div className="absolute -bottom-12 -left-6 w-56 h-56 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />

            <div className="relative flex flex-col flex-1 p-6 sm:p-8 gap-5">
              <span className="self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white/90 border border-white/20">
                <Icon icon="lucide:truck" width={12} height={12} />
                {t.visitor.transportModule}
              </span>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight">{v.title}</h1>
                <p className="text-white/65 mt-2 text-sm leading-relaxed">{v.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {STATS.map((s) => (
                  <div key={s.label} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 border border-white/15">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                    <span className="text-white/75 text-xs">{s.label}</span>
                    <span className="ml-auto text-white font-bold">{s.value}</span>
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
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-brand-blue bg-white rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-black/20"
                >
                  <Icon icon="lucide:log-in" width={16} height={16} />
                  {t.visitor.moduleCta}
                </AuthFormTrigger>
              </div>
            </div>
          </div>

          {/* ── Right: Table Preview ── */}
          <div className="relative rounded-2xl overflow-hidden border border-neutral-200 shadow-sm bg-white flex flex-col min-h-[400px] xl:min-h-0">

            {/* Toolbar */}
            <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-white border-b border-neutral-200 select-none pointer-events-none">
              <div className="relative flex-1 max-w-xs">
                <Icon icon="lucide:search" width={13} height={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <div className="w-full pl-8 pr-3 py-1.5 border border-neutral-200 rounded-lg bg-neutral-50 text-[11px] text-neutral-400">Buscar operación, ref, chofer…</div>
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-[11px] text-neutral-500">
                  <Icon icon="lucide:sliders-horizontal" width={11} height={11} />
                  Filtros
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-[11px] text-neutral-500">
                  <Icon icon="lucide:download" width={11} height={11} />
                  Excel
                </span>
              </div>
            </div>

            {/* Summary bar */}
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 bg-neutral-50 border-b border-neutral-100 select-none pointer-events-none">
              <span className="text-[11px] text-neutral-500">{SAMPLE_ROWS.length} operaciones</span>
              <div className="flex items-center gap-3 ml-auto">
                {STATS.map((s) => (
                  <span key={s.label} className="flex items-center gap-1 text-[10px] text-neutral-500">
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {s.value} {s.label.toLowerCase()}
                  </span>
                ))}
              </div>
            </div>

            {/* Table + fade */}
            <div className="flex-1 min-h-0 relative overflow-hidden">
              <div
                ref={scrollRef}
                className="absolute inset-0 overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden select-none pointer-events-none"
                style={{ maskImage: "linear-gradient(to bottom, black 0%, black 52%, transparent 80%)", WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 52%, transparent 80%)" }}
              >
                <table className="w-full min-w-[900px] text-sm border-collapse">
                  <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 w-8"><span className="w-3.5 h-3.5 block border border-neutral-300 rounded bg-white" /></th>
                      {["Ref.","Cliente","Transporte","Chofer","Patente","Contenedor","Tramo","Valor","Estado"].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SAMPLE_ROWS.map((row, i) => (
                      <tr key={i} className={`border-b border-neutral-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-neutral-50/50"}`}>
                        <td className="px-3 py-2"><span className="w-3.5 h-3.5 block border border-neutral-300 rounded bg-white" /></td>
                        <td className="px-3 py-2 font-semibold text-brand-blue text-[11px] whitespace-nowrap">{row.ref}</td>
                        <td className="px-3 py-2 text-[11px] text-neutral-700 whitespace-nowrap">{row.cliente}</td>
                        <td className="px-3 py-2 text-[11px] text-neutral-700 whitespace-nowrap">{row.transporte}</td>
                        <td className="px-3 py-2 text-[11px] text-neutral-600 whitespace-nowrap">{row.chofer}</td>
                        <td className="px-3 py-2 text-[11px] font-mono text-neutral-500">{row.patente}</td>
                        <td className="px-3 py-2 text-[11px] font-mono text-neutral-600 whitespace-nowrap">{row.contenedor}</td>
                        <td className="px-3 py-2 text-[11px] text-neutral-600 whitespace-nowrap">{row.tramo}</td>
                        <td className="px-3 py-2 text-[11px] font-medium text-neutral-700">{row.valor}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${ESTADO_STYLE[row.estado] ?? "bg-neutral-100 text-neutral-600 border-neutral-200"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${row.estado === "Asignado" ? "bg-emerald-400" : "bg-amber-400"}`} />
                            {row.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Lock CTA */}
              <div className="absolute bottom-0 inset-x-0 flex flex-col items-center justify-end pb-7 pt-16 z-10 pointer-events-auto"
                style={{ background: "linear-gradient(to top, #ffffff 58%, rgba(255,255,255,0) 100%)" }}
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-brand-blue shadow-md">
                      <Icon icon="lucide:lock-keyhole" width={15} height={15} className="text-white" />
                    </span>
                    <p className="text-sm font-semibold text-neutral-700">{v.highlight1}</p>
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
