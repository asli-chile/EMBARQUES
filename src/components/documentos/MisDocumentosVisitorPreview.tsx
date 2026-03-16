import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { VisitorSidebarQuickAccess } from "@/components/layout/VisitorSidebarQuickAccess";
import { AuthFormTrigger } from "@/components/auth/AuthFormTrigger";

const SAMPLE_OPS = [
  { ref: "A07015", cliente: "Exportadora Sur", booking: "MSCUN12345", etd: "08 Mar" },
  { ref: "A07016", cliente: "Agrícola Valle", booking: "COSCO45678", etd: "15 Mar" },
  { ref: "A07017", cliente: "Frutas del Sur", booking: "HLCU78901", etd: "22 Mar" },
  { ref: "A07018", cliente: "Exportadora Norte", booking: "EVER23456", etd: "28 Mar" },
] as const;

type DocStatus = { name: string; file: string | null; size: string | null };

const SAMPLE_DOCS: DocStatus[] = [
  { name: "Booking",                       file: "booking_A07016.pdf",      size: "245 KB" },
  { name: "Instructivo de Embarque (IE)",  file: "IE_A07016.pdf",           size: "189 KB" },
  { name: "Factura Gate Out",              file: null,                      size: null },
  { name: "Factura Proforma",              file: "FP_A07016.pdf",           size: "312 KB" },
  { name: "Certificado Fitosanitario",     file: "cert_fitosan.pdf",        size: "520 KB" },
  { name: "Certificado de Origen",         file: null,                      size: null },
  { name: "BL / Telex / SWB / AWB",       file: "BL_A07016.pdf",           size: "890 KB" },
  { name: "Factura Comercial",             file: null,                      size: null },
  { name: "DUS",                           file: "DUS_234567.pdf",          size: "156 KB" },
  { name: "Fullset",                       file: null,                      size: null },
];

export function MisDocumentosVisitorPreview() {
  const { t } = useLocale();
  const v = t.visitor.misDocumentos;
  const tr = t.misDocumentos;
  const sampleLabel = t.visitor.registros.sampleLabel;

  const uploaded = SAMPLE_DOCS.filter((d) => d.file).length;

  return (
    <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto p-3 sm:p-4 lg:p-5" role="main">
      <div className="w-full max-w-[1400px] mx-auto space-y-4 animate-fade-in-up">
        <VisitorSidebarQuickAccess currentHref="/documentos/mis-documentos" />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* ── Info panel ── */}
          <div className="xl:col-span-4">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-mac-modal p-5 sm:p-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-blue/10 text-brand-blue rounded-full text-xs font-semibold mb-3">
                <Icon icon="typcn:folder" width={14} height={14} />
                {t.visitor.moduleTitle}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-brand-blue tracking-tight">{v.title}</h1>
              <p className="text-neutral-500 mt-2 text-sm leading-relaxed">{v.description}</p>

              <div className="mt-5 space-y-3">
                {[
                  { text: v.highlight1, icon: "typcn:document-add",   color: "text-brand-blue",   bg: "bg-brand-blue/10" },
                  { text: v.highlight2, icon: "typcn:th-list",         color: "text-brand-teal",   bg: "bg-brand-teal/10" },
                  { text: "Vista previa y descarga segura de PDF",      icon: "typcn:eye",          color: "text-violet-600",  bg: "bg-violet-100" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-8 h-8 ${item.bg} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon icon={item.icon} width={16} height={16} className={item.color} />
                    </div>
                    <p className="text-sm text-neutral-600 leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-100">
                <AuthFormTrigger
                  mode="login"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors"
                >
                  <Icon icon="typcn:key" width={18} height={18} />
                  {t.visitor.moduleCta}
                </AuthFormTrigger>
              </div>
            </div>
          </div>

          {/* ── Preview panel ── */}
          <div className="xl:col-span-8">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-mac-modal overflow-hidden">
              {/* Header */}
              <div className="px-4 py-2.5 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-4 bg-brand-blue rounded-full flex-shrink-0" />
                  <h2 className="font-semibold text-neutral-700 text-sm">{tr.title}</h2>
                  <span className="text-[11px] text-neutral-400 hidden sm:inline">— {sampleLabel}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium flex-shrink-0">
                  Demo
                </span>
              </div>

              <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-neutral-100 pointer-events-none select-none">
                {/* Left: operation list */}
                <div className="w-full lg:w-64 lg:flex-shrink-0 p-3 space-y-1.5">
                  <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                    {tr.selectOperation}
                  </p>

                  {/* Search bar (static) */}
                  <div className="relative mb-2">
                    <Icon icon="typcn:zoom" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-300 w-3.5 h-3.5" />
                    <div className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-neutral-200 rounded-md bg-neutral-50 text-neutral-300">
                      {tr.searchPlaceholder}
                    </div>
                  </div>

                  {SAMPLE_OPS.map((op, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-md border w-full text-left ${
                        i === 1
                          ? "border-brand-blue bg-brand-blue/5 ring-2 ring-brand-blue/20"
                          : "border-neutral-200 bg-white"
                      }`}
                    >
                      <p className="font-semibold text-neutral-800 text-xs">{op.ref}</p>
                      <p className="text-[11px] text-neutral-500 truncate">{op.cliente} · {op.booking}</p>
                      <p className="text-[11px] text-neutral-400">ETD: {op.etd}</p>
                    </div>
                  ))}
                </div>

                {/* Right: document grid */}
                <div className="flex-1 p-3">
                  {/* Selected op banner */}
                  <div className="mb-3 p-2 bg-brand-blue/5 rounded-md border border-brand-blue/20 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-medium text-brand-blue">{tr.documentsFor}</p>
                      <p className="text-sm font-semibold text-neutral-800">A07016 — Agrícola Valle</p>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium flex-shrink-0">
                      {uploaded}/{SAMPLE_DOCS.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SAMPLE_DOCS.map((doc, i) => (
                      <div
                        key={i}
                        className={`rounded-lg border p-2.5 flex items-center gap-2.5 ${
                          doc.file
                            ? "border-neutral-200 bg-white"
                            : "border-dashed border-neutral-200 bg-neutral-50/50"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          doc.file ? "bg-blue-100" : "bg-neutral-100"
                        }`}>
                          <Icon
                            icon={doc.file ? "typcn:document" : "typcn:document-add"}
                            width={16}
                            height={16}
                            className={doc.file ? "text-brand-blue" : "text-neutral-400"}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-neutral-700 truncate">{doc.name}</p>
                          {doc.file ? (
                            <p className="text-[10px] text-neutral-400 truncate">{doc.file} · {doc.size}</p>
                          ) : (
                            <p className="text-[10px] text-neutral-400">{tr.uploadFile}</p>
                          )}
                        </div>
                        {doc.file && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <div className="w-6 h-6 rounded bg-neutral-100 flex items-center justify-center">
                              <Icon icon="typcn:eye" width={12} height={12} className="text-neutral-400" />
                            </div>
                            <div className="w-6 h-6 rounded bg-neutral-100 flex items-center justify-center">
                              <Icon icon="typcn:download" width={12} height={12} className="text-neutral-400" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
