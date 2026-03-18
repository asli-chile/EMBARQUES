import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Operacion = {
  id: string;
  ref_asli: string;
  correlativo: number;
  cliente: string;
  naviera: string;
  booking: string;
  pod: string;
  etd: string | null;
};

type Documento = {
  id: string;
  operacion_id: string;
  tipo: string;
  nombre_archivo: string;
  url: string;
  tamano: number | null;
  mime_type: string | null;
  created_at: string;
};

const TIPOS_DOCUMENTO = [
  "BOOKING",
  "INSTRUCTIVO_EMBARQUE",
  "FACTURA_GATE_OUT",
  "FACTURA_PROFORMA",
  "CERTIFICADO_FITOSANITARIO",
  "CERTIFICADO_ORIGEN",
  "BL_TELEX_SWB_AWB",
  "FACTURA_COMERCIAL",
  "DUS",
  "FULLSET",
] as const;

type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

const TIPO_META: Record<TipoDocumento, { label: string; icon: string; color: string }> = {
  BOOKING:                 { label: "Booking",                        icon: "lucide:clipboard-list", color: "text-blue-600 bg-blue-50" },
  INSTRUCTIVO_EMBARQUE:    { label: "Instructivo de Embarque (IE)",   icon: "lucide:file-text",      color: "text-violet-600 bg-violet-50" },
  FACTURA_GATE_OUT:        { label: "Factura Gate Out",               icon: "lucide:receipt",        color: "text-orange-600 bg-orange-50" },
  FACTURA_PROFORMA:        { label: "Factura Proforma",               icon: "lucide:file-check",     color: "text-amber-600 bg-amber-50" },
  CERTIFICADO_FITOSANITARIO: { label: "Certificado Fitosanitario",   icon: "lucide:leaf",           color: "text-green-600 bg-green-50" },
  CERTIFICADO_ORIGEN:      { label: "Certificado de Origen",         icon: "lucide:globe",          color: "text-teal-600 bg-teal-50" },
  BL_TELEX_SWB_AWB:        { label: "BL / Telex / SWB / AWB",       icon: "lucide:ship",           color: "text-sky-600 bg-sky-50" },
  FACTURA_COMERCIAL:       { label: "Factura Comercial",             icon: "lucide:shopping-bag",   color: "text-pink-600 bg-pink-50" },
  DUS:                     { label: "DUS",                           icon: "lucide:landmark",       color: "text-indigo-600 bg-indigo-50" },
  FULLSET:                 { label: "Fullset",                       icon: "lucide:layers",         color: "text-neutral-600 bg-neutral-100" },
};

export function MisDocumentosContent() {
  const { t, locale } = useLocale();
  const { isCliente, empresaNombres, isLoading: authLoading } = useAuth();
  const tr = t.misDocumentos;
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [selectedOperacion, setSelectedOperacion] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<TipoDocumento | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewDoc, setPreviewDoc] = useState<Documento | null>(null);
  // Panel activo en mobile
  const [mobilePanel, setMobilePanel] = useState<"select" | "docs">("select");

  const supabase = useMemo(() => {
    try { return createClient(); } catch { return null; }
  }, []);

  const fetchOperaciones = useCallback(async () => {
    if (!supabase || authLoading) return;
    setLoading(true);
    let q = supabase
      .from("operaciones")
      .select("id, ref_asli, correlativo, cliente, naviera, booking, pod, etd")
      .is("deleted_at", null);
    if (empresaNombres.length > 0) q = q.in("cliente", empresaNombres);
    const { data } = await q.order("created_at", { ascending: false });
    setOperaciones(data ?? []);
    setLoading(false);
  }, [supabase, authLoading, isCliente, empresaNombres]);

  const fetchDocumentos = useCallback(async () => {
    if (!supabase || !selectedOperacion) return;
    const { data, error: fetchError } = await supabase
      .from("documentos")
      .select("*")
      .eq("operacion_id", selectedOperacion)
      .order("tipo");
    if (fetchError) { setDocumentos([]); return; }
    setDocumentos(data ?? []);
  }, [supabase, selectedOperacion]);

  useEffect(() => {
    if (!authLoading) void fetchOperaciones();
    else setOperaciones([]);
  }, [authLoading, fetchOperaciones]);

  useEffect(() => {
    if (selectedOperacion) void fetchDocumentos();
    else setDocumentos([]);
  }, [selectedOperacion, fetchDocumentos]);

  const operacionActual = useMemo(
    () => operaciones.find((op) => op.id === selectedOperacion),
    [operaciones, selectedOperacion]
  );

  const filteredOperaciones = useMemo(() => {
    if (!searchTerm.trim()) return operaciones;
    const search = searchTerm.toLowerCase();
    return operaciones.filter((op) => {
      const ref = op.ref_asli || `A${String(op.correlativo).padStart(5, "0")}`;
      return (
        ref.toLowerCase().includes(search) ||
        (op.cliente ?? "").toLowerCase().includes(search) ||
        (op.booking ?? "").toLowerCase().includes(search) ||
        (op.naviera ?? "").toLowerCase().includes(search)
      );
    });
  }, [operaciones, searchTerm]);

  const documentosPorTipo = useMemo(() => {
    const map = new Map<TipoDocumento, Documento | null>();
    TIPOS_DOCUMENTO.forEach((tipo) => map.set(tipo, documentos.find((d) => d.tipo === tipo) || null));
    return map;
  }, [documentos]);

  const docsCompletados = useMemo(
    () => documentos.length,
    [documentos]
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try { return format(new Date(dateStr), "dd MMM yyyy", { locale: locale === "es" ? es : undefined }); }
    catch { return dateStr; }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async (tipo: TipoDocumento, file: File) => {
    if (!supabase || !selectedOperacion) return;
    const allowedTypes = [
      "application/pdf",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (!allowedTypes.includes(file.type)) { setError(tr.invalidFileType); return; }
    if (file.size > 10 * 1024 * 1024) { setError(tr.fileTooLarge); return; }

    setUploading(tipo);
    setError(null);

    const operacion = operaciones.find((op) => op.id === selectedOperacion);
    const ref = operacion?.ref_asli || `A${String(operacion?.correlativo).padStart(5, "0")}`;
    const ext = file.name.split(".").pop();
    const fileName = `${ref}_${tipo}_${Date.now()}.${ext}`;
    const filePath = `documentos/${selectedOperacion}/${fileName}`;

    const { error: uploadError } = await supabase.storage.from("documentos").upload(filePath, file, { upsert: true });
    if (uploadError) { setError(uploadError.message); setUploading(null); return; }

    const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(filePath);
    const existingDoc = documentosPorTipo.get(tipo);
    if (existingDoc) await supabase.from("documentos").delete().eq("id", existingDoc.id);

    const { error: dbError } = await supabase.from("documentos").insert({
      operacion_id: selectedOperacion,
      tipo,
      nombre_archivo: file.name,
      url: urlData.publicUrl,
      tamano: file.size,
      mime_type: file.type,
    });
    if (dbError) setError(dbError.message);

    setUploading(null);
    void fetchDocumentos();
  };

  const handleDelete = async (doc: Documento) => {
    if (!supabase) return;
    if (!confirm(tr.confirmDelete)) return;
    const filePath = doc.url.split("/documentos/")[1];
    if (filePath) await supabase.storage.from("documentos").remove([`documentos/${filePath}`]);
    await supabase.from("documentos").delete().eq("id", doc.id);
    void fetchDocumentos();
  };

  const handleDownload = (doc: Documento) => window.open(doc.url, "_blank");
  const handlePreview = (doc: Documento) => setPreviewDoc(doc);
  const closePreview = () => setPreviewDoc(null);
  const isPdf = (mimeType: string | null) => mimeType?.includes("pdf");

  const handleSelectOperacion = (id: string) => {
    setSelectedOperacion(id);
    setMobilePanel("docs");
  };

  if (loading) {
    return (
      <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto p-4 flex items-center justify-center">
        <div className="flex items-center gap-3 px-5 py-4 bg-white rounded-2xl border border-neutral-200 shadow-sm text-neutral-500 text-sm font-medium">
          <Icon icon="typcn:refresh" className="w-5 h-5 animate-spin text-brand-blue" />
          <span>{tr.loading}</span>
        </div>
      </main>
    );
  }

  const progressPct = Math.round((docsCompletados / TIPOS_DOCUMENTO.length) * 100);

  return (
    <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto p-3 sm:p-4 lg:p-5">
      <div className="w-full max-w-[1600px] mx-auto space-y-4">

        {/* Header */}
        <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
          <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-blue flex items-center justify-center flex-shrink-0">
                <Icon icon="lucide:folder-open" width={20} height={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-neutral-900 leading-tight">{tr.title}</h1>
                <p className="text-xs text-neutral-500 mt-0.5">{tr.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedOperacion && (
                <span className="text-xs font-semibold text-brand-blue bg-brand-blue/10 px-2.5 py-1 rounded-full">
                  {docsCompletados}/{TIPOS_DOCUMENTO.length} docs
                </span>
              )}
              <button
                type="button"
                onClick={() => void fetchOperaciones()}
                className="p-2 border border-neutral-200 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors text-neutral-500"
                title={t.misReservas?.refresh ?? "Actualizar"}
              >
                <Icon icon="typcn:refresh" width={18} height={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs mobile */}
        <div className="lg:hidden flex rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setMobilePanel("select")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${
              mobilePanel === "select" ? "bg-brand-blue text-white" : "text-neutral-500 hover:bg-neutral-50"
            }`}
          >
            <Icon icon="lucide:list" width={14} height={14} />
            Operaciones
          </button>
          <button
            type="button"
            onClick={() => setMobilePanel("docs")}
            disabled={!selectedOperacion}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              mobilePanel === "docs" ? "bg-brand-blue text-white" : "text-neutral-500 hover:bg-neutral-50"
            }`}
          >
            <Icon icon="lucide:folder-open" width={14} height={14} />
            Documentos
            {selectedOperacion && docsCompletados > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                mobilePanel === "docs" ? "bg-white/20 text-white" : "bg-brand-blue/10 text-brand-blue"
              }`}>
                {docsCompletados}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">

          {/* Panel izquierdo — lista de operaciones */}
          <div className={`w-full lg:w-72 xl:w-80 lg:flex-shrink-0 ${mobilePanel !== "select" ? "hidden lg:block" : ""}`}>
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden lg:sticky lg:top-0">
              <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
              <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                    <Icon icon="lucide:search" className="w-3.5 h-3.5 text-brand-blue" />
                  </span>
                  <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                    {tr.selectOperation}
                  </h2>
                </div>
                {operaciones.length > 0 && (
                  <span className="text-[10px] font-semibold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                    {filteredOperaciones.length}
                  </span>
                )}
              </div>
              <div className="p-3">
                <div className="relative mb-3">
                  <Icon
                    icon="lucide:search"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-3.5 h-3.5 pointer-events-none"
                  />
                  <input
                    type="text"
                    placeholder={tr.searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-neutral-200 bg-neutral-50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all"
                  />
                </div>

                {filteredOperaciones.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center mx-auto mb-2">
                      <Icon icon="lucide:folder" width={18} height={18} className="text-neutral-300" />
                    </div>
                    <p className="text-neutral-400 text-xs font-medium">{tr.noOperations}</p>
                  </div>
                ) : (
                  <div className="max-h-[calc(100vh-340px)] overflow-y-auto space-y-1.5 pr-0.5">
                    {filteredOperaciones.map((op) => {
                      const isActive = selectedOperacion === op.id;
                      const ref = op.ref_asli || `A${String(op.correlativo).padStart(5, "0")}`;
                      return (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => handleSelectOperacion(op.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
                            isActive
                              ? "border-brand-blue bg-brand-blue/5 ring-1 ring-brand-blue/20"
                              : "border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <p className={`font-bold text-xs ${isActive ? "text-brand-blue" : "text-neutral-700"}`}>
                              {ref}
                            </p>
                            {isActive && docsCompletados > 0 && (
                              <span className="text-[9px] font-bold text-brand-blue bg-brand-blue/10 px-1.5 py-0.5 rounded-full shrink-0">
                                {docsCompletados}/{TIPOS_DOCUMENTO.length}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-500 truncate">{op.cliente}</p>
                          <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                            {op.naviera}{op.booking ? ` · ${op.booking}` : ""}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Panel derecho — documentos */}
          <div className={`flex-1 min-w-0 ${mobilePanel !== "docs" ? "hidden lg:block" : ""}`}>
            {selectedOperacion ? (
              <div className="space-y-4">

                {/* Banner operación seleccionada + progreso */}
                {operacionActual && (
                  <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="h-[2px] bg-gradient-to-r from-brand-blue to-brand-teal" />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold text-brand-blue uppercase tracking-wider mb-0.5">
                            {tr.documentsFor}
                          </p>
                          <p className="text-neutral-900 font-bold text-sm leading-tight">
                            {operacionActual.ref_asli || `A${String(operacionActual.correlativo).padStart(5, "0")}`}
                            {" "}—{" "}{operacionActual.cliente}
                          </p>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            {operacionActual.naviera}
                            {operacionActual.booking ? ` · ${operacionActual.booking}` : ""}
                            {operacionActual.pod ? ` · ${operacionActual.pod}` : ""}
                          </p>
                        </div>
                        {/* Botón cambiar en mobile */}
                        <button
                          type="button"
                          onClick={() => setMobilePanel("select")}
                          className="lg:hidden flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-brand-blue bg-white border border-brand-blue/30 rounded-lg hover:bg-brand-blue/5 transition-colors"
                        >
                          <Icon icon="lucide:list" width={12} height={12} />
                          Cambiar
                        </button>
                      </div>
                      {/* Barra de progreso */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${progressPct}%`,
                              background: progressPct === 100
                                ? "linear-gradient(to right, #10b981, #059669)"
                                : "linear-gradient(to right, #3b82f6, #06b6d4)",
                            }}
                          />
                        </div>
                        <span className={`text-xs font-bold shrink-0 ${
                          progressPct === 100 ? "text-emerald-600" : "text-brand-blue"
                        }`}>
                          {docsCompletados}/{TIPOS_DOCUMENTO.length}
                        </span>
                        {progressPct === 100 && (
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 shrink-0">
                            Completo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium flex items-center gap-2">
                    <Icon icon="lucide:alert-circle" className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Grid de documentos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TIPOS_DOCUMENTO.map((tipo) => {
                    const doc = documentosPorTipo.get(tipo);
                    const isUploading = uploading === tipo;
                    const meta = TIPO_META[tipo];

                    return (
                      <div
                        key={tipo}
                        className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                          doc
                            ? "border-emerald-200 shadow-emerald-50"
                            : "border-neutral-200"
                        }`}
                      >
                        <div className={`h-[2px] ${doc ? "bg-gradient-to-r from-emerald-400 to-teal-400" : "bg-gradient-to-r from-neutral-200 to-neutral-100"}`} />

                        {/* Card header */}
                        <div className="px-4 py-2.5 flex items-center gap-2.5 border-b border-neutral-50">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            doc ? "bg-emerald-100" : meta.color.split(" ")[1]
                          }`}>
                            <Icon
                              icon={doc ? "lucide:check" : meta.icon}
                              className={`w-3.5 h-3.5 ${doc ? "text-emerald-600" : meta.color.split(" ")[0]}`}
                            />
                          </span>
                          <h3 className="text-xs font-bold text-neutral-700 leading-tight flex-1 min-w-0">
                            {meta.label}
                          </h3>
                          {doc && (
                            <span className="shrink-0 w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
                              <Icon icon="lucide:check" className="w-2.5 h-2.5 text-emerald-600" />
                            </span>
                          )}
                        </div>

                        {/* Card body */}
                        <div className="p-3">
                          {doc ? (
                            <div className="space-y-2.5">
                              {/* File info */}
                              <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-neutral-50 border border-neutral-100">
                                <span className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                                  <Icon
                                    icon={doc.mime_type?.includes("pdf") ? "lucide:file-text" : "lucide:file-spreadsheet"}
                                    className={`w-4 h-4 ${doc.mime_type?.includes("pdf") ? "text-red-500" : "text-green-600"}`}
                                  />
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-neutral-800 truncate leading-tight">
                                    {doc.nombre_archivo}
                                  </p>
                                  <p className="text-[10px] text-neutral-400 mt-0.5">
                                    {formatFileSize(doc.tamano)} · {formatDate(doc.created_at)}
                                  </p>
                                </div>
                              </div>
                              {/* Actions */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handlePreview(doc)}
                                  className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-brand-blue bg-brand-blue/8 rounded-lg hover:bg-brand-blue/15 transition-colors"
                                >
                                  <Icon icon="lucide:eye" className="w-3.5 h-3.5" />
                                  {tr.preview}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownload(doc)}
                                  className="inline-flex items-center justify-center w-7 h-7 text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
                                  title={tr.download}
                                >
                                  <Icon icon="lucide:download" className="w-3.5 h-3.5" />
                                </button>
                                <label
                                  className="inline-flex items-center justify-center w-7 h-7 text-neutral-500 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors cursor-pointer border border-neutral-200"
                                  title={tr.replace}
                                >
                                  <Icon icon="lucide:refresh-cw" className="w-3.5 h-3.5" />
                                  <input
                                    type="file"
                                    accept=".pdf,.xls,.xlsx"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleUpload(tipo, file);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(doc)}
                                  className="inline-flex items-center justify-center w-7 h-7 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                                  title="Eliminar"
                                >
                                  <Icon icon="lucide:trash-2" className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label
                              className={`flex items-center gap-3 px-3 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                                isUploading
                                  ? "border-brand-blue bg-brand-blue/5"
                                  : "border-neutral-200 hover:border-brand-blue/50 hover:bg-brand-blue/3"
                              }`}
                            >
                              {isUploading ? (
                                <>
                                  <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                                    <Icon icon="typcn:refresh" className="w-4 h-4 text-brand-blue animate-spin" />
                                  </span>
                                  <span className="text-xs font-semibold text-brand-blue">{tr.uploading}</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                                    <Icon icon="lucide:upload" className="w-4 h-4 text-neutral-400" />
                                  </span>
                                  <div>
                                    <p className="text-xs font-semibold text-neutral-500">{tr.uploadFile}</p>
                                    <p className="text-[10px] text-neutral-400 mt-0.5">PDF · Excel · máx 10 MB</p>
                                  </div>
                                </>
                              )}
                              <input
                                type="file"
                                accept=".pdf,.xls,.xlsx"
                                className="hidden"
                                disabled={isUploading}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUpload(tipo, file);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
                <div className="py-16 px-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                    <Icon icon="lucide:folder-open" width={28} height={28} className="text-neutral-300" />
                  </div>
                  <p className="text-neutral-700 font-semibold text-sm mb-1">{tr.selectOperation}</p>
                  <p className="text-neutral-400 text-xs">Selecciona una operación para ver y gestionar sus documentos</p>
                  <button
                    type="button"
                    onClick={() => setMobilePanel("select")}
                    className="lg:hidden mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-blue rounded-xl hover:bg-brand-blue/90 transition-colors"
                  >
                    <Icon icon="lucide:list" width={13} height={13} />
                    Ver operaciones
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal preview */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={closePreview}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal flex-shrink-0" />
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 flex-shrink-0 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                  <Icon
                    icon={isPdf(previewDoc.mime_type) ? "lucide:file-text" : "lucide:file-spreadsheet"}
                    className={`w-4 h-4 ${isPdf(previewDoc.mime_type) ? "text-red-500" : "text-green-600"}`}
                  />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-800 text-sm truncate">{previewDoc.nombre_archivo}</p>
                  <p className="text-xs text-neutral-400">
                    {formatFileSize(previewDoc.tamano)} · {formatDate(previewDoc.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(previewDoc)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-brand-blue rounded-xl hover:bg-brand-blue/90 transition-colors"
                >
                  <Icon icon="lucide:download" className="w-3.5 h-3.5" />
                  {tr.download}
                </button>
                <button
                  type="button"
                  onClick={closePreview}
                  className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors"
                >
                  <Icon icon="lucide:x" className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden bg-neutral-100">
              {isPdf(previewDoc.mime_type) ? (
                <iframe
                  src={`${previewDoc.url}#toolbar=1&navpanes=0`}
                  className="w-full h-full border-0"
                  title={previewDoc.nombre_archivo}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <span className="w-16 h-16 rounded-2xl bg-neutral-200 flex items-center justify-center">
                    <Icon icon="lucide:file-spreadsheet" className="w-8 h-8 text-neutral-400" />
                  </span>
                  <p className="text-neutral-600 font-medium">{tr.excelPreviewNotAvailable}</p>
                  <p className="text-neutral-400 text-sm">{tr.downloadToView}</p>
                  <button
                    type="button"
                    onClick={() => handleDownload(previewDoc)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-brand-blue rounded-xl hover:bg-brand-blue/90 transition-colors"
                  >
                    <Icon icon="lucide:download" className="w-4 h-4" />
                    {tr.downloadFile}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
