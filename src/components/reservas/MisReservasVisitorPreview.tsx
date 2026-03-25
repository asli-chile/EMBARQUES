import { useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { VisitorSidebarQuickAccess } from "@/components/layout/VisitorSidebarQuickAccess";
import { AuthFormTrigger } from "@/components/auth/AuthFormTrigger";

const SAMPLE_ROWS = [
  { ref: "ASLI-2025-001", cliente: "Exportadora Frutícola Sur", especie: "Uvas",      naviera: "MSC",        nave: "MSC GULSUN",  pol: "San Antonio", pod: "Filadelfia",   etd: "10-02-2025", eta: "15-03-2025", tt: 33, booking: "MSCUSN1234567",  estado: "EN PROCESO"  },
  { ref: "ASLI-2025-002", cliente: "Agrícola del Valle",        especie: "Cerezas",   naviera: "Hapag-Lloyd",nave: "AL MHASSABI", pol: "Valparaíso",  pod: "Rotterdam",    etd: "05-02-2025", eta: "12-03-2025", tt: 35, booking: "HLAGDE7890123",  estado: "EN TRÁNSITO" },
  { ref: "ASLI-2025-003", cliente: "Frutas Premium Ltda",       especie: "Arándanos", naviera: "ONE",        nave: "ONE STORK",   pol: "San Antonio", pod: "Shanghai",     etd: "15-02-2025", eta: "28-03-2025", tt: 41, booking: "ONEYJP4567890",  estado: "PENDIENTE"   },
  { ref: "ASLI-2025-004", cliente: "Exportadora Frutícola Sur", especie: "Ciruelas",  naviera: "MSC",        nave: "MSC INES",    pol: "Valparaíso",  pod: "Los Angeles",  etd: "25-01-2025", eta: "20-02-2025", tt: 26, booking: "MSCUSN9876543",  estado: "ARRIBADO"    },
  { ref: "ASLI-2025-005", cliente: "Agroexport del Norte",      especie: "Paltas",    naviera: "CMA CGM",    nave: "CMA LIBRA",   pol: "San Antonio", pod: "Le Havre",     etd: "20-02-2025", eta: "30-03-2025", tt: 38, booking: "CMAMRS2345678",  estado: "EN PROCESO"  },
  { ref: "ASLI-2025-006", cliente: "Frutícola Atacama",         especie: "Mandarinas",naviera: "Evergreen",  nave: "EVER GOLDEN", pol: "Valparaíso",  pod: "Hong Kong",    etd: "28-02-2025", eta: "05-04-2025", tt: 36, booking: "EVGTPE3456789",  estado: "PENDIENTE"   },
];

const ESTADO_STYLE: Record<string, { dot: string; badge: string }> = {
  "PENDIENTE":   { dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-200"   },
  "EN PROCESO":  { dot: "bg-blue-400",    badge: "bg-blue-50 text-blue-700 border-blue-200"       },
  "EN TRÁNSITO": { dot: "bg-violet-400",  badge: "bg-violet-50 text-violet-700 border-violet-200" },
  "ARRIBADO":    { dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  "COMPLETADO":  { dot: "bg-neutral-400", badge: "bg-neutral-100 text-neutral-600 border-neutral-200" },
  "CANCELADO":   { dot: "bg-red-400",     badge: "bg-red-50 text-red-700 border-red-200"           },
};

const FEATURES = [
  { icon: "lucide:list",          text: "Todas tus operaciones de exportación en un solo lugar" },
  { icon: "lucide:filter",        text: "Filtros avanzados por cliente, naviera, estado y fechas" },
  { icon: "lucide:activity",      text: "Estado en tiempo real: desde apertura hasta arribo" },
  { icon: "lucide:download",      text: "Exportación a Excel con todos los datos de la operación" },
];

const STATS = [
  { label: "En proceso",  value: 2, dot: "bg-blue-400"    },
  { label: "En tránsito", value: 1, dot: "bg-violet-400"  },
  { label: "Pendiente",   value: 2, dot: "bg-amber-400"   },
  { label: "Arribado",    value: 1, dot: "bg-emerald-400" },
];

const COLS = [
  { key: "ref",     label: "Ref. ASLI"  },
  { key: "cliente", label: "Cliente"    },
  { key: "especie", label: "Especie"    },
  { key: "naviera", label: "Naviera"    },
  { key: "nave",    label: "Nave"       },
  { key: "pol",     label: "POL"        },
  { key: "pod",     label: "POD"        },
  { key: "etd",     label: "ETD"        },
  { key: "eta",     label: "ETA"        },
  { key: "tt",      label: "T/T"        },
  { key: "booking", label: "Booking"    },
  { key: "estado",  label: "Estado"     },
];

export function MisReservasVisitorPreview() {
  const { t } = useLocale();
  const vr = t.visitor.misReservas;

  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef    = useRef<number | undefined>(undefined);
  const posRef    = useRef(0);
  const dirRef    = useRef(1);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const DURATION_MS = 32000;
    const stepPerMs   = 1 / DURATION_MS;
    const animate = () => {
      const max  = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const step = max * stepPerMs * (1000 / 60) * dirRef.current;
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

        {/* Quick access */}
        <div className="flex-shrink-0">
          <VisitorSidebarQuickAccess currentHref="/reservas/mis-reservas" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4 flex-1 min-h-0">

          {/* ── Left: Hero ── */}
          <div className="relative rounded-2xl overflow-hidden shadow-xl flex flex-col min-h-[400px] xl:min-h-0"
            style={{ background: "linear-gradient(145deg, #0f2d5e 0%, #1a4a8a 55%, #1e3a5f 100%)" }}
          >
            <div className="absolute -top-8 -right-8 w-44 h-44 rounded-full opacity-10"
              style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />
            <div className="absolute -bottom-12 -left-6 w-56 h-56 rounded-full opacity-[0.06]"
              style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />

            <div className="relative flex flex-col flex-1 p-6 sm:p-8 gap-5">
              {/* Badge */}
              <span className="self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white/90 border border-white/20">
                <Icon icon="lucide:list" width={12} height={12} />
                {vr.moduleTag}
              </span>

              {/* Title */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight">{vr.title}</h1>
                <p className="text-white/65 mt-2 text-sm leading-relaxed">{vr.description}</p>
              </div>

              {/* Stats chips */}
              <div className="grid grid-cols-2 gap-2">
                {STATS.map((s) => (
                  <div key={s.label} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/15">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                    <span className="text-white/80 text-xs">{s.label}</span>
                    <span className="ml-auto text-white font-bold text-sm">{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Features */}
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

              {/* CTA */}
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
                <div className="w-full pl-8 pr-3 py-1.5 border border-neutral-200 rounded-lg bg-neutral-50 text-[11px] text-neutral-400">
                  Buscar operación, cliente, ref…
                </div>
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
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-brand-blue">
                  <Icon icon="lucide:plus" width={11} height={11} />
                  Nueva reserva
                </span>
              </div>
            </div>

            {/* Summary bar */}
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 bg-neutral-50 border-b border-neutral-100 select-none pointer-events-none">
              <span className="text-[11px] text-neutral-500">{SAMPLE_ROWS.length} operaciones</span>
              <div className="flex items-center gap-2 ml-auto">
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
                style={{ maskImage: "linear-gradient(to bottom, black 0%, black 55%, transparent 82%)", WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 55%, transparent 82%)" }}
              >
                <table className="w-full min-w-[1000px] text-sm border-collapse">
                  <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 w-8">
                        <span className="w-3.5 h-3.5 block border border-neutral-300 rounded bg-white" />
                      </th>
                      {COLS.map((c) => (
                        <th key={c.key} className="px-3 py-2 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                          {c.label}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SAMPLE_ROWS.map((row, i) => {
                      const style = ESTADO_STYLE[row.estado] ?? { dot: "bg-neutral-400", badge: "bg-neutral-100 text-neutral-600 border-neutral-200" };
                      return (
                        <tr key={i} className={`border-b border-neutral-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-neutral-50/50"}`}>
                          <td className="px-3 py-2">
                            <span className="w-3.5 h-3.5 block border border-neutral-300 rounded bg-white" />
                          </td>
                          <td className="px-3 py-2 font-semibold text-brand-blue text-[11px] whitespace-nowrap">{row.ref}</td>
                          <td className="px-3 py-2 text-[11px] text-neutral-700 whitespace-nowrap max-w-[130px] truncate">{row.cliente}</td>
                          <td className="px-3 py-2 text-[11px] text-neutral-700">{row.especie}</td>
                          <td className="px-3 py-2 text-[11px] text-neutral-700">{row.naviera}</td>
                          <td className="px-3 py-2 text-[11px] text-neutral-600 whitespace-nowrap">{row.nave}</td>
                          <td className="px-3 py-2 text-[11px] text-neutral-700">{row.pol}</td>
                          <td className="px-3 py-2 text-[11px] text-neutral-700">{row.pod}</td>
                          <td className="px-3 py-2 text-[11px] text-neutral-600 whitespace-nowrap">{row.etd}</td>
                          <td className="px-3 py-2 text-[11px] text-neutral-600 whitespace-nowrap">{row.eta}</td>
                          <td className="px-3 py-2 text-[11px] text-neutral-500">{row.tt}d</td>
                          <td className="px-3 py-2 text-[11px] font-mono text-neutral-600 whitespace-nowrap">{row.booking}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${style.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
                              {row.estado}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center gap-1 text-neutral-400">
                              <Icon icon="lucide:eye" width={13} height={13} />
                              <Icon icon="lucide:pencil" width={13} height={13} />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
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
