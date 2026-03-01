import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
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
    if (!supabase) return;
    setLoading(true);

    const { data } = await supabase
      .from("operaciones")
      .select("id, ref_asli, correlativo, cliente, naviera, booking, pod, etd")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    setOperaciones(data ?? []);
    setLoading(false);
  }, [supabase]);

  const fetchDocumentos = useCallback(async () => {
    if (!supabase || !selectedOperacion) return;

    const { data, error: fetchError } = await supabase
      .from("documentos")
      .select("*")
      .eq("operacion_id", selectedOperacion)
      .order("tipo");

    if (fetchError) {
      console.warn("Tabla documentos no disponible:", fetchError.message);
      setDocumentos([]);
      return;
    }

    setDocumentos(data ?? []);
  }, [supabase, selectedOperacion]);

  useEffect(() => {
    void fetchOperaciones();
  }, [fetchOperaciones]);

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
      <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto p-6 flex items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-500">
          <Icon icon="typcn:refresh" className="w-6 h-6 animate-spin" />
          <span>{tr.loading}</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto p-4">
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-blue">{tr.title}</h1>
            <p className="text-neutral-500 text-sm mt-1">{tr.subtitle}</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden sticky top-0">
              <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50">
                <h2 className="font-semibold text-neutral-800 text-sm flex items-center gap-2">
                  <Icon icon="typcn:folder" className="w-4 h-4 text-brand-blue" />
                  {tr.selectOperation}
                </h2>
              </div>
              <div className="p-3">
                <div className="mb-3">
                  <div className="relative">
                    <Icon
                      icon="typcn:zoom"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4"
                    />
                    <input
                      type="text"
                      placeholder={tr.searchPlaceholder}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                    />
                  </div>
                </div>

                {filteredOperaciones.length === 0 ? (
                  <p className="text-center text-neutral-500 py-4 text-sm">{tr.noOperations}</p>
                ) : (
                  <div className="max-h-[calc(100vh-280px)] overflow-y-auto space-y-1.5">
                    {filteredOperaciones.map((op) => (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setSelectedOperacion(op.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedOperacion === op.id
                            ? "border-brand-blue bg-brand-blue/5 ring-2 ring-brand-blue/20"
                            : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                        }`}
                      >
                        <p className="font-medium text-neutral-800 text-sm">
                          {op.ref_asli || `A${String(op.correlativo).padStart(5, "0")}`}
                        </p>
                        <p className="text-xs text-neutral-500 truncate">
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
                  <div className="p-4 bg-brand-blue/5 rounded-lg border border-brand-blue/20">
                    <p className="text-sm font-medium text-brand-blue">{tr.documentsFor}</p>
                    <p className="text-neutral-800 font-semibold mt-1">
                      {operacionActual.ref_asli || `A${String(operacionActual.correlativo).padStart(5, "0")}`} - {operacionActual.cliente}
                    </p>
                    <p className="text-sm text-neutral-600">
                      {operacionActual.naviera} • {operacionActual.booking} • {operacionActual.pod}
                    </p>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {TIPOS_DOCUMENTO.map((tipo) => {
                    const doc = documentosPorTipo.get(tipo);
                    const isUploading = uploading === tipo;

                    return (
                      <div
                        key={tipo}
                        className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                          doc ? "border-green-200" : "border-neutral-200"
                        }`}
                      >
                        <div className={`px-4 py-3 border-b ${doc ? "bg-green-50 border-green-100" : "bg-neutral-50 border-neutral-100"}`}>
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-neutral-800 text-sm flex items-center gap-2">
                              {doc ? (
                                <Icon icon="typcn:tick" className="w-4 h-4 text-green-500" />
                              ) : (
                                <Icon icon="typcn:document" className="w-4 h-4 text-neutral-400" />
                              )}
                              {getTipoLabel(tipo)}
                            </h3>
                          </div>
                        </div>
                        <div className="p-4">
                          {doc ? (
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                <Icon
                                  icon={getFileIcon(doc.mime_type)}
                                  className="w-8 h-8 text-brand-blue flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-neutral-800 truncate">
                                    {doc.nombre_archivo}
                                  </p>
                                  <p className="text-xs text-neutral-500">
                                    {formatFileSize(doc.tamano)} • {formatDate(doc.created_at)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handlePreview(doc)}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-blue bg-brand-blue/10 rounded-lg hover:bg-brand-blue/20 transition-colors"
                                >
                                  <Icon icon="typcn:eye" className="w-4 h-4" />
                                  {tr.preview}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownload(doc)}
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                                >
                                  <Icon icon="typcn:download" className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(doc)}
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                                >
                                  <Icon icon="typcn:trash" className="w-4 h-4" />
                                </button>
                                <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors cursor-pointer">
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
                              className={`block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                                isUploading
                                  ? "border-brand-blue bg-brand-blue/5"
                                  : "border-neutral-200 hover:border-brand-blue hover:bg-brand-blue/5"
                              }`}
                            >
                              {isUploading ? (
                                <div className="flex flex-col items-center gap-2">
                                  <Icon icon="typcn:refresh" className="w-8 h-8 text-brand-blue animate-spin" />
                                  <span className="text-sm text-brand-blue">{tr.uploading}</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-2">
                                  <Icon icon="typcn:upload" className="w-8 h-8 text-neutral-400" />
                                  <span className="text-sm text-neutral-600">{tr.uploadFile}</span>
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
              <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-neutral-200">
                <div className="text-center text-neutral-500">
                  <Icon icon="typcn:arrow-left" className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{tr.selectOperation}</p>
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
              <div className="flex items-center gap-3">
                <Icon 
                  icon={isPdf(previewDoc.mime_type) ? "typcn:document" : "typcn:chart-bar"} 
                  className="w-6 h-6 text-brand-blue" 
                />
                <div>
                  <h3 className="font-semibold text-neutral-800">{previewDoc.nombre_archivo}</h3>
                  <p className="text-xs text-neutral-500">
                    {formatFileSize(previewDoc.tamano)} • {formatDate(previewDoc.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(previewDoc)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors"
                >
                  <Icon icon="typcn:download" className="w-4 h-4" />
                  {tr.download}
                </button>
                <button
                  type="button"
                  onClick={closePreview}
                  className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
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
                  <Icon icon="typcn:chart-bar" className="w-24 h-24 text-neutral-300" />
                  <p className="text-neutral-600 text-lg font-medium">{tr.excelPreviewNotAvailable}</p>
                  <p className="text-neutral-500 text-sm">{tr.downloadToView}</p>
                  <button
                    type="button"
                    onClick={() => handleDownload(previewDoc)}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors"
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
