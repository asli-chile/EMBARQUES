import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { VisitorSidebarQuickAccess } from "@/components/layout/VisitorSidebarQuickAccess";
import { AuthFormTrigger } from "@/components/auth/AuthFormTrigger";

const SAMPLE_ROWS = [
  { ref: "A07015", cliente: "Exportadora Sur", transporte: "Transportes Norte", chofer: "Juan Pérez", contenedor: "OTPU683204", tramo: "Planta-Depósito", tipo: "ASLI", deleted: "05-02-2025 14:32" },
  { ref: "A07016", cliente: "Agrícola Valle", transporte: "Logística Centro", chofer: "Carlos Soto", contenedor: "SEGU982106", tramo: "Planta-Puerto", tipo: "ASLI", deleted: "28-01-2025 09:15" },
  { ref: "A07018", cliente: "Frutas Premium", transporte: "Cargo Express", chofer: "Luis Mora", contenedor: "TEMU975700", tramo: "Depósito-Puerto", tipo: "Externa", deleted: "15-01-2025 17:48" },
  { ref: "A07019", cliente: "Exportadora Sur", transporte: "Transportes Norte", chofer: "Pedro Ríos", contenedor: "ONEU930380", tramo: "Planta-Depósito", tipo: "ASLI", deleted: "02-01-2025 11:20" },
  { ref: "A07020", cliente: "Agrícola Valle", transporte: "Logística Centro", chofer: "Ana Silva", contenedor: "MNBU041606", tramo: "Planta-Puerto", tipo: "Externa", deleted: "28-12-2024 08:05" },
];

const FEATURES = [
  { icon: "lucide:rotate-ccw", text: "Restaura datos de transporte eliminados con un clic" },
  { icon: "lucide:truck", text: "Conserva chofer, unidad, tramo y contenedor asociados" },
  { icon: "lucide:trash-2", text: "Eliminación definitiva individual o vaciado total" },
  { icon: "lucide:clock", text: "Registro de fecha y hora de envío a papelera" },
];

export function PapeleraTransportesVisitorPreview() {
  const { t } = useLocale();
  const vr = t.visitor.papeleraTransportes;

  return (
    <main className="flex-1 min-h-0 overflow-auto flex flex-col bg-neutral-100" role="main">
      <div className="flex flex-col flex-1 min-h-0 p-3 sm:p-4 gap-3 max-w-[1400px] mx-auto w-full">
        <div className="flex-shrink-0">
          <VisitorSidebarQuickAccess currentHref="/transportes/papelera" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4 flex-1 min-h-0">
          <div
            className="relative rounded-2xl overflow-hidden shadow-xl flex flex-col min-h-[400px] xl:min-h-0"
            style={{ background: "linear-gradient(145deg, #3b0f0f 0%, #7f1d1d 50%, #991b1b 100%)" }}
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
                <Icon icon="lucide:truck" width={12} height={12} />
                {vr.moduleTag}
              </span>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight">{vr.title}</h1>
                <p className="text-white/65 mt-2 text-sm leading-relaxed">{vr.description}</p>
              </div>

              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white/10 border border-white/20">
                <Icon icon="lucide:info" width={16} height={16} className="text-white/70 flex-shrink-0 mt-0.5" />
                <p className="text-white/80 text-sm leading-relaxed">
                  Aquí se recuperan o eliminan de forma definitiva los datos de transporte enviados a papelera.
                </p>
              </div>

              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 border border-white/20">
                <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-500/30 border border-red-400/40">
                  <Icon icon="lucide:trash-2" width={16} height={16} className="text-white" />
                </span>
                <div>
                  <p className="text-white font-bold text-xl leading-none">{SAMPLE_ROWS.length}</p>
                  <p className="text-white/60 text-xs mt-0.5">transportes en papelera</p>
                </div>
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
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-red-800 bg-white rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-black/20"
                >
                  <Icon icon="lucide:log-in" width={16} height={16} />
                  {t.visitor.moduleCta}
                </AuthFormTrigger>
              </div>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-neutral-200 shadow-sm bg-white flex flex-col min-h-[400px] xl:min-h-0">
            <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-white border-b border-neutral-200 select-none pointer-events-none">
              <div className="relative flex-1 max-w-xs">
                <Icon icon="lucide:search" width={13} height={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <div className="w-full pl-8 pr-3 py-1.5 border border-neutral-200 rounded-lg bg-neutral-50 text-[11px] text-neutral-400">
                  Buscar en papelera de transportes…
                </div>
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-[11px] font-medium text-emerald-700">
                  <Icon icon="lucide:rotate-ccw" width={11} height={11} />
                  Restaurar
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-[11px] font-medium text-red-600">
                  <Icon icon="lucide:trash-2" width={11} height={11} />
                  Vaciar papelera
                </span>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 bg-red-50/60 border-b border-red-100 select-none pointer-events-none">
              <Icon icon="lucide:alert-circle" width={13} height={13} className="text-red-400 flex-shrink-0" />
              <span className="text-[11px] text-red-600 font-medium">
                {SAMPLE_ROWS.length} transportes eliminados · restaura o elimina definitivamente
              </span>
            </div>

            <div className="flex-1 min-h-0 relative overflow-hidden">
              <div
                className="absolute inset-0 overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden select-none pointer-events-none"
                style={{
                  maskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 80%)",
                  WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 80%)",
                }}
              >
                <table className="w-full min-w-[780px] text-sm border-collapse">
                  <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 w-8">
                        <span className="w-3.5 h-3.5 block border border-neutral-300 rounded bg-white" />
                      </th>
                      {["Ref. ASLI", "Cliente", "Transporte", "Chofer", "Contenedor", "Tramo", "Tipo", "Eliminado"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SAMPLE_ROWS.map((row, i) => (
                      <tr key={row.ref} className={`border-b border-neutral-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-red-50/20"}`}>
                        <td className="px-3 py-2">
                          <span className="w-3.5 h-3.5 block border border-neutral-300 rounded bg-white" />
                        </td>
                        <td className="px-3 py-2 font-semibold text-neutral-400 text-[11px] whitespace-nowrap line-through">{row.ref}</td>
                        <td className="px-3 py-2 text-[11px] text-neutral-400 whitespace-nowrap max-w-[120px] truncate">{row.cliente}</td>
                        <td className="px-3 py-2 text-[11px] text-neutral-400 whitespace-nowrap max-w-[120px] truncate">{row.transporte}</td>
                        <td className="px-3 py-2 text-[11px] text-neutral-400 whitespace-nowrap">{row.chofer}</td>
                        <td className="px-3 py-2 text-[11px] font-mono text-neutral-400 whitespace-nowrap">{row.contenedor}</td>
                        <td className="px-3 py-2 text-[11px] text-neutral-400 whitespace-nowrap">{row.tramo}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-neutral-100 text-neutral-500 border-neutral-200">
                            {row.tipo}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[10px] text-neutral-400 whitespace-nowrap">{row.deleted}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1 text-neutral-400">
                            <Icon icon="lucide:rotate-ccw" width={13} height={13} className="text-emerald-500" />
                            <Icon icon="lucide:trash-2" width={13} height={13} className="text-red-400" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                className="absolute bottom-0 inset-x-0 flex flex-col items-center justify-end pb-7 pt-16 z-10 pointer-events-auto"
                style={{ background: "linear-gradient(to top, #ffffff 58%, rgba(255,255,255,0) 100%)" }}
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-red-600 shadow-md">
                      <Icon icon="lucide:lock-keyhole" width={15} height={15} className="text-white" />
                    </span>
                    <p className="text-sm font-semibold text-neutral-700">{vr.highlight1}</p>
                  </div>
                  <AuthFormTrigger
                    mode="login"
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-red-600/30"
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
