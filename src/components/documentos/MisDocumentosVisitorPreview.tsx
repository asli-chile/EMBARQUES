import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { VisitorSidebarQuickAccess } from "@/components/layout/VisitorSidebarQuickAccess";
import { AuthFormTrigger } from "@/components/auth/AuthFormTrigger";

const SAMPLE_OPS = [
  { ref: "A07015", cliente: "Exportadora Sur",  booking: "MSCUN12345", etd: "08 Mar", docs: 6  },
  { ref: "A07016", cliente: "Agrícola Valle",   booking: "COSCO45678", etd: "15 Mar", docs: 4  },
  { ref: "A07017", cliente: "Frutas del Sur",   booking: "HLCU78901",  etd: "22 Mar", docs: 2  },
  { ref: "A07018", cliente: "Exportadora Norte",booking: "EVER23456",  etd: "28 Mar", docs: 8  },
];

const SAMPLE_DOCS = [
  { name: "Booking",                      file: "booking_A07016.pdf",  size: "245 KB", icon: "lucide:anchor"       },
  { name: "Instructivo de Embarque",      file: "IE_A07016.pdf",       size: "189 KB", icon: "lucide:file-text"    },
  { name: "Factura Proforma",             file: "FP_A07016.pdf",       size: "312 KB", icon: "lucide:receipt"      },
  { name: "Certificado Fitosanitario",    file: "cert_fitosan.pdf",    size: "520 KB", icon: "lucide:shield-check" },
  { name: "BL / Telex / SWB",            file: "BL_A07016.pdf",       size: "890 KB", icon: "lucide:file-badge"   },
  { name: "DUS",                          file: "DUS_234567.pdf",      size: "156 KB", icon: "lucide:scroll-text"  },
  { name: "Factura Gate Out",             file: null,                  size: null,     icon: "lucide:file-plus"    },
  { name: "Certificado de Origen",        file: null,                  size: null,     icon: "lucide:file-plus"    },
  { name: "Factura Comercial",            file: null,                  size: null,     icon: "lucide:file-plus"    },
  { name: "Fullset",                      file: null,                  size: null,     icon: "lucide:file-plus"    },
];

const FEATURES = [
  { icon: "lucide:folder-open",   text: "Todos los documentos de cada operación en un solo lugar" },
  { icon: "lucide:upload-cloud",  text: "Carga y reemplaza archivos PDF por tipo de documento" },
  { icon: "lucide:eye",           text: "Vista previa y descarga segura desde el navegador" },
  { icon: "lucide:check-circle",  text: "Control visual de documentos pendientes por subir" },
];

export function MisDocumentosVisitorPreview() {
  const { t } = useLocale();
  const v  = t.visitor.misDocumentos;
  const tr = t.misDocumentos;

  const uploaded = SAMPLE_DOCS.filter((d) => d.file).length;

  return (
    <main className="flex-1 min-h-0 overflow-auto flex flex-col bg-neutral-100" role="main">
      <div className="flex flex-col flex-1 min-h-0 p-3 sm:p-4 gap-3 max-w-[1400px] mx-auto w-full">
        <div className="flex-shrink-0">
          <VisitorSidebarQuickAccess currentHref="/documentos/mis-documentos" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4 flex-1 min-h-0">

          {/* ── Left: Hero ── */}
          <div className="relative rounded-2xl overflow-hidden shadow-xl flex flex-col min-h-[400px] xl:min-h-0"
            style={{ background: "linear-gradient(145deg, #1e1b4b 0%, #3730a3 55%, #4f46e5 100%)" }}
          >
            <div className="absolute -top-8 -right-8 w-44 h-44 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />
            <div className="absolute -bottom-12 -left-6 w-56 h-56 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />

            <div className="relative flex flex-col flex-1 p-6 sm:p-8 gap-5">
              <span className="self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white/90 border border-white/20">
                <Icon icon="lucide:folder-open" width={12} height={12} />
                {t.visitor.moduleTitle}
              </span>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight">{v.title}</h1>
                <p className="text-white/65 mt-2 text-sm leading-relaxed">{v.description}</p>
              </div>

              {/* Progress chip */}
              <div className="px-4 py-3 rounded-xl bg-white/10 border border-white/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/80 text-xs font-medium">A07016 — Agrícola Valle</span>
                  <span className="text-white font-bold text-sm">{uploaded}/{SAMPLE_DOCS.length}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white/80"
                    style={{ width: `${(uploaded / SAMPLE_DOCS.length) * 100}%` }}
                  />
                </div>
                <p className="text-white/50 text-[10px] mt-1.5">{uploaded} documentos subidos · {SAMPLE_DOCS.length - uploaded} pendientes</p>
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
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-indigo-900 bg-white rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-black/20"
                >
                  <Icon icon="lucide:log-in" width={16} height={16} />
                  {t.visitor.moduleCta}
                </AuthFormTrigger>
              </div>
            </div>
          </div>

          {/* ── Right: Document Preview ── */}
          <div className="relative rounded-2xl overflow-hidden border border-neutral-200 shadow-sm bg-white flex flex-col min-h-[400px] xl:min-h-0">

            {/* Top bar */}
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-white border-b border-neutral-200 select-none pointer-events-none">
              <Icon icon="lucide:folder-open" width={15} height={15} className="text-indigo-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-neutral-800">{tr.title}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold ml-1">Demo</span>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-[11px] text-neutral-500">
                  <Icon icon="lucide:download" width={11} height={11} />
                  Descargar todo
                </span>
              </div>
            </div>

            {/* Two-panel layout */}
            <div className="flex-1 min-h-0 relative overflow-hidden">
              <div
                className="absolute inset-0 flex overflow-hidden select-none pointer-events-none"
                style={{ maskImage: "linear-gradient(to bottom, black 0%, black 52%, transparent 80%)", WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 52%, transparent 80%)" }}
              >
                {/* Op list */}
                <div className="w-52 flex-shrink-0 border-r border-neutral-100 p-3 flex flex-col gap-1.5 overflow-hidden bg-neutral-50/40">
                  <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{tr.selectOperation}</p>
                  <div className="relative mb-1">
                    <Icon icon="lucide:search" width={11} height={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-300" />
                    <div className="w-full pl-6 pr-2 py-1.5 text-[10px] border border-neutral-200 rounded-lg bg-white text-neutral-300">{tr.searchPlaceholder}</div>
                  </div>
                  {SAMPLE_OPS.map((op, i) => (
                    <div key={i} className={`p-2 rounded-xl border ${i === 1 ? "border-indigo-300 bg-indigo-50/60 ring-2 ring-indigo-200/50" : "border-neutral-200 bg-white"}`}>
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-neutral-800 text-[11px]">{op.ref}</span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-500">{op.docs} docs</span>
                      </div>
                      <p className="text-[10px] text-neutral-500 truncate">{op.cliente}</p>
                      <p className="text-[10px] text-neutral-400">ETD: {op.etd}</p>
                    </div>
                  ))}
                </div>

                {/* Document grid */}
                <div className="flex-1 overflow-hidden p-3 flex flex-col gap-2.5">
                  {/* Banner */}
                  <div className="flex items-center justify-between p-2.5 bg-indigo-50 rounded-xl border border-indigo-200/80">
                    <div>
                      <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">{tr.documentsFor}</p>
                      <p className="text-sm font-semibold text-neutral-800 mt-0.5">A07016 — Agrícola Valle</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-indigo-200 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(uploaded / SAMPLE_DOCS.length) * 100}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-indigo-700">{uploaded}/{SAMPLE_DOCS.length}</span>
                    </div>
                  </div>

                  {/* Docs grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {SAMPLE_DOCS.map((doc, i) => (
                      <div key={i} className={`rounded-xl border p-2.5 flex items-center gap-2.5 ${
                        doc.file ? "border-neutral-200 bg-white shadow-sm" : "border-dashed border-neutral-200 bg-neutral-50/60"
                      }`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          doc.file ? "bg-indigo-50 border border-indigo-100" : "bg-neutral-100"
                        }`}>
                          <Icon icon={doc.file ? doc.icon : "lucide:file-plus"} width={15} height={15}
                            className={doc.file ? "text-indigo-500" : "text-neutral-350"} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-neutral-700 truncate">{doc.name}</p>
                          {doc.file ? (
                            <p className="text-[9px] text-neutral-400 truncate">{doc.size}</p>
                          ) : (
                            <p className="text-[9px] text-neutral-400">{tr.uploadFile}</p>
                          )}
                        </div>
                        {doc.file && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="w-5 h-5 rounded bg-neutral-100 flex items-center justify-center">
                              <Icon icon="lucide:eye" width={10} height={10} className="text-neutral-400" />
                            </span>
                            <span className="w-5 h-5 rounded bg-neutral-100 flex items-center justify-center">
                              <Icon icon="lucide:download" width={10} height={10} className="text-neutral-400" />
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lock CTA */}
              <div className="absolute bottom-0 inset-x-0 flex flex-col items-center justify-end pb-7 pt-16 z-10 pointer-events-auto"
                style={{ background: "linear-gradient(to top, #ffffff 58%, rgba(255,255,255,0) 100%)" }}
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600 shadow-md">
                      <Icon icon="lucide:lock-keyhole" width={15} height={15} className="text-white" />
                    </span>
                    <p className="text-sm font-semibold text-neutral-700">{v.highlight1}</p>
                  </div>
                  <AuthFormTrigger
                    mode="login"
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-indigo-500/30"
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
