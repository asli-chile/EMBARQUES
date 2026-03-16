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

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const fetchOperaciones = useCallback(async () => {
    if (!supabase || authLoading) return;
    setLoading(true);

    let q = supabase
      .from("operaciones")
      .select("id, ref_asli, correlativo, cliente, naviera, booking, pod, etd")
      .is("deleted_at", null);
    if (empresaNombres.length > 0) {
      q = q.in("cliente", empresaNombres);
    }
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

    if (fetchError) {
      setDocumentos([]);
      return;
    }

    setDocumentos(data ?? []);
  }, [supabase, selectedOperacion]);

  useEffect(() => {
    if (!authLoading) void fetchOperaciones();
    else setOperaciones([]);
  }, [authLoading, fetchOperaciones]);

  useEffect(() => {
    if (selectedOperacion) {
      void fetchDocumentos();
    } else {
      setDocumentos([]);
    }
  }, [selectedOperacion, fetchDocumentos]);

  const operacionActual = useMemo(() => {
    return operaciones.find((op) => op.id === selectedOperacion);
  }, [operaciones, selectedOperacion]);

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
    TIPOS_DOCUMENTO.forEach((tipo) => {
      const doc = documentos.find((d) => d.tipo === tipo);
      map.set(tipo, doc || null);
    });
    return map;
  }, [documentos]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd MMM yyyy", { locale: locale === "es" ? es : undefined });
    } catch {
      return dateStr;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getTipoLabel = (tipo: TipoDocumento) => {
    const labels: Record<TipoDocumento, string> = {
      BOOKING: "Booking",
      INSTRUCTIVO_EMBARQUE: "Instructivo de Embarque (IE)",
      FACTURA_GATE_OUT: "Factura Gate Out",
      FACTURA_PROFORMA: "Factura Proforma",
      CERTIFICADO_FITOSANITARIO: "Certificado Fitosanitario",
      CERTIFICADO_ORIGEN: "Certificado de Origen",
      BL_TELEX_SWB_AWB: "BL / Telex / SWB / AWB",
      FACTURA_COMERCIAL: "Factura Comercial",
      DUS: "DUS",
      FULLSET: "Fullset",
    };
    return labels[tipo];
  };

  const getFileIcon = (mimeType: string | null) => {
    if (mimeType?.includes("pdf")) return "typcn:document";
    if (mimeType?.includes("sheet") || mimeType?.includes("excel")) return "typcn:chart-bar";
    return "typcn:document";
  };

  const handleUpload = async (tipo: TipoDocumento, file: File) => {
    if (!supabase || !selectedOperacion) return;

    const allowedTypes = [
      "application/pdf",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(tr.invalidFileType);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(tr.fileTooLarge);
      return;
    }

    setUploading(tipo);
    setError(null);

    const operacion = operaciones.find((op) => op.id === selectedOperacion);
    const ref = operacion?.ref_asli || `A${String(operacion?.correlativo).padStart(5, "0")}`;
    const ext = file.name.split(".").pop();
    const fileName = `${ref}_${tipo}_${Date.now()}.${ext}`;
    const filePath = `documentos/${selectedOperacion}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("documentos")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(null);
      return;
    }

    const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(filePath);

    const existingDoc = documentosPorTipo.get(tipo);
    if (existingDoc) {
      await supabase.from("documentos").delete().eq("id", existingDoc.id);
    }

    const { error: dbError } = await supabase.from("documentos").insert({
      operacion_id: selectedOperacion,
      tipo,
      nombre_archivo: file.name,
      url: urlData.publicUrl,
      tamano: file.size,
      mime_type: file.type,
    });

    if (dbError) {
      setError(dbError.message);
    }

    setUploading(null);
    void fetchDocumentos();
  };

  const handleDelete = async (doc: Documento) => {
    if (!supabase) return;
    if (!confirm(tr.confirmDelete)) return;

    const filePath = doc.url.split("/documentos/")[1];
    if (filePath) {
      await supabase.storage.from("documentos").remove([`documentos/${filePath}`]);
    }

    await supabase.from("documentos").delete().eq("id", doc.id);
    void fetchDocumentos();
  };

  const handleDownload = (doc: Documento) => {
    window.open(doc.url, "_blank");
  };

  const handlePreview = (doc: Documento) => {
    setPreviewDoc(doc);
  };

  const closePreview = () => {
    setPreviewDoc(null);
  };

  const isPdf = (mimeType: string | null) => mimeType?.includes("pdf");

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

  return (
    <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto p-3 sm:p-4 lg:p-5">
      <div className="w-full max-w-[1600px] mx-auto space-y-4">

        {/* Header — mismo estilo que Mis Reservas / Facturación */}
        <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
          <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-blue flex items-center justify-center flex-shrink-0">
                <Icon icon="typcn:folder" width={20} height={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-neutral-900 leading-tight">
                  {tr.title}
                </h1>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {tr.subtitle}
                </p>
              </div>
            </div>
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

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Panel selección operación */}
          <div className="w-full lg:w-80 lg:flex-shrink-0">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden lg:sticky lg:top-0">
              <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
              <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                  <Icon icon="typcn:document" className="w-4 h-4 text-brand-blue" />
                </span>
                <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                  {tr.selectOperation}
                </h2>
              </div>
              <div className="p-4">
                <div className="mb-3">
                  <div className="relative">
                    <Icon
                      icon="typcn:zoom"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4 pointer-events-none"
                    />
                    <input
                      type="text"
                      placeholder={tr.searchPlaceholder}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-neutral-200 bg-neutral-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {filteredOperaciones.length === 0 ? (
                  <div className="py-8 text-center">
                    <span className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center mx-auto mb-2 inline-flex">
                      <Icon icon="typcn:document" width={20} height={20} className="text-neutral-400" />
                    </span>
                    <p className="text-neutral-500 text-sm font-medium">{tr.noOperations}</p>
                  </div>
                ) : (
                  <div className="max-h-[calc(100vh-320px)] overflow-y-auto space-y-2">
                    {filteredOperaciones.map((op) => (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setSelectedOperacion(op.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          selectedOperacion === op.id
                            ? "border-brand-blue bg-brand-blue/5 ring-2 ring-brand-blue/20"
                            : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                        }`}
                      >
                        <p className="font-semibold text-brand-blue text-sm">
                          {op.ref_asli || `A${String(op.correlativo).padStart(5, "0")}`}
                        </p>
                        <p className="text-xs text-neutral-600 truncate mt-0.5">
                          {op.cliente} • {op.booking}
                        </p>
                        <p className="text-xs text-neutral-400 mt-1">
                          {op.naviera} • ETD: {formatDate(op.etd)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {selectedOperacion ? (
              <div className="space-y-4">
                {operacionActual && (
                  <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="h-[2px] bg-gradient-to-r from-brand-blue to-brand-teal" />
                    <div className="p-4 bg-brand-blue/5 border-l-4 border-brand-blue">
                      <p className="text-xs font-semibold text-brand-blue uppercase tracking-wider">{tr.documentsFor}</p>
                      <p className="text-neutral-800 font-bold mt-1 text-sm">
                        {operacionActual.ref_asli || `A${String(operacionActual.correlativo).padStart(5, "0")}`} — {operacionActual.cliente}
                      </p>
                      <p className="text-sm text-neutral-600 mt-0.5">
                        {operacionActual.naviera} • {operacionActual.booking} • {operacionActual.pod}
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {TIPOS_DOCUMENTO.map((tipo) => {
                    const doc = documentosPorTipo.get(tipo);
                    const isUploading = uploading === tipo;

                    return (
                      <div
                        key={tipo}
                        className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                          doc ? "border-emerald-200" : "border-neutral-200"
                        }`}
                      >
                        <div className={`h-[2px] ${doc ? "bg-emerald-400/60" : "bg-gradient-to-r from-brand-blue/60 to-brand-teal/60"}`} />
                        <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${doc ? "bg-emerald-100" : "bg-neutral-100"}`}>
                            {doc ? (
                              <Icon icon="typcn:tick" className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Icon icon="typcn:document" className="w-4 h-4 text-neutral-400" />
                            )}
                          </span>
                          <h3 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                            {getTipoLabel(tipo)}
                          </h3>
                        </div>
                        <div className="p-4">
                          {doc ? (
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                <span className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                                  <Icon
                                    icon={getFileIcon(doc.mime_type)}
                                    className="w-5 h-5 text-brand-blue"
                                  />
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-neutral-800 truncate">
                                    {doc.nombre_archivo}
                                  </p>
                                  <p className="text-xs text-neutral-500">
                                    {formatFileSize(doc.tamano)} • {formatDate(doc.created_at)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handlePreview(doc)}
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-brand-blue bg-brand-blue/10 rounded-xl hover:bg-brand-blue/20 transition-colors"
                                >
                                  <Icon icon="typcn:eye" className="w-4 h-4" />
                                  {tr.preview}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownload(doc)}
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-200"
                                >
                                  <Icon icon="typcn:download" className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(doc)}
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 rounded-xl hover:bg-red-100 transition-colors border border-red-200"
                                >
                                  <Icon icon="typcn:trash" className="w-4 h-4" />
                                </button>
                                <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-600 bg-neutral-100 rounded-xl hover:bg-neutral-200 transition-colors cursor-pointer border border-neutral-200">
                                  <Icon icon="typcn:refresh" className="w-4 h-4" />
                                  {tr.replace}
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
                              </div>
                            </div>
                          ) : (
                            <label
                              className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                                isUploading
                                  ? "border-brand-blue bg-brand-blue/5"
                                  : "border-neutral-200 hover:border-brand-blue hover:bg-brand-blue/5"
                              }`}
                            >
                              {isUploading ? (
                                <div className="flex flex-col items-center gap-2">
                                  <Icon icon="typcn:refresh" className="w-8 h-8 text-brand-blue animate-spin" />
                                  <span className="text-sm font-medium text-brand-blue">{tr.uploading}</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-2">
                                  <span className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center mx-auto">
                                    <Icon icon="typcn:upload" className="w-5 h-5 text-neutral-400" />
                                  </span>
                                  <span className="text-sm font-medium text-neutral-600">{tr.uploadFile}</span>
                                  <span className="text-xs text-neutral-400">PDF, Excel (máx 10MB)</span>
                                </div>
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
              <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden flex items-center justify-center min-h-[280px]">
                <div className="text-center py-8 px-4">
                  <span className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-3 inline-flex">
                    <Icon icon="typcn:arrow-left" width={24} height={24} className="text-neutral-400" />
                  </span>
                  <p className="text-neutral-500 text-sm font-medium">{tr.selectOperation}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={closePreview}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-[90vw] h-[90vh] max-w-6xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal flex-shrink-0" />
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                  <Icon
                    icon={isPdf(previewDoc.mime_type) ? "typcn:document" : "typcn:chart-bar"}
                    className="w-5 h-5 text-brand-blue"
                  />
                </span>
                <div>
                  <h3 className="font-semibold text-neutral-800 text-sm">{previewDoc.nombre_archivo}</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {formatFileSize(previewDoc.tamano)} • {formatDate(previewDoc.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(previewDoc)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-brand-blue rounded-xl hover:bg-brand-blue/90 transition-colors shadow-sm shadow-brand-blue/20"
                >
                  <Icon icon="typcn:download" className="w-4 h-4" />
                  {tr.download}
                </button>
                <button
                  type="button"
                  onClick={closePreview}
                  className="p-2.5 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors"
                >
                  <Icon icon="typcn:times" className="w-5 h-5" />
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
                    <Icon icon="typcn:chart-bar" className="w-8 h-8 text-neutral-400" />
                  </span>
                  <p className="text-neutral-600 text-lg font-medium">{tr.excelPreviewNotAvailable}</p>
                  <p className="text-neutral-500 text-sm">{tr.downloadToView}</p>
                  <button
                    type="button"
                    onClick={() => handleDownload(previewDoc)}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-brand-blue rounded-xl hover:bg-brand-blue/90 transition-colors shadow-sm shadow-brand-blue/20"
                  >
                    <Icon icon="typcn:download" className="w-5 h-5" />
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
