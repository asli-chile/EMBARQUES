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
  booking_doc_url: string | null;
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
  const [docCounts, setDocCounts] = useState<Map<string, number>>(new Map());
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
      .select("id, ref_asli, correlativo, cliente, naviera, booking, pod, etd, booking_doc_url")
      .is("deleted_at", null);
    if (empresaNombres.length > 0) q = q.in("cliente", empresaNombres);
    const { data } = await q.order("created_at", { ascending: false });
    const ops: Operacion[] = data ?? [];
    setOperaciones(ops);

    // Conteo de documentos por operación (batch)
    if (ops.length > 0) {
      const ids = ops.map((o) => o.id);
      const { data: docsData } = await supabase
        .from("documentos")
        .select("operacion_id")
        .in("operacion_id", ids);
      const counts = new Map<string, number>();
      (docsData ?? []).forEach((d: { operacion_id: string }) => {
        counts.set(d.operacion_id, (counts.get(d.operacion_id) ?? 0) + 1);
      });
      // Sumar 1 por booking_doc_url si no hay doc BOOKING en tabla
      ops.forEach((op) => {
        if (op.booking_doc_url) {
          // Solo sumar si no hay ya un doc de tipo BOOKING contado
          // (simplificación: sumamos siempre, fetchDocumentos lo corrige al seleccionar)
          if ((counts.get(op.id) ?? 0) === 0) {
            counts.set(op.id, 1);
          }
        }
      });
      setDocCounts(counts);
    } else {
      setDocCounts(new Map());
    }

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
    const docs = data ?? [];
    setDocumentos(docs);
    // Actualizar el conteo para la operación seleccionada
    setDocCounts((prev) => {
      const next = new Map(prev);
      const op = operaciones.find((o) => o.id === selectedOperacion);
      const hasBookingUrl = !!op?.booking_doc_url;
      const hasBookingDoc = docs.some((d) => d.tipo === "BOOKING");
      const syntheticExtra = hasBookingUrl && !hasBookingDoc ? 1 : 0;
      next.set(selectedOperacion, docs.length + syntheticExtra);
      return next;
    });
  }, [supabase, selectedOperacion, operaciones]);

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
    TIPOS_DOCUMENTO.forEach((tipo) => {
      let doc = documentos.find((d) => d.tipo === tipo) || null;
      // Si es BOOKING y no hay doc en tabla, usar booking_doc_url de la operación
      if (!doc && tipo === "BOOKING" && operacionActual && operacionActual.booking_doc_url) {
        const ref = operacionActual.ref_asli || `A${String(operacionActual.correlativo).padStart(5, "0")}`;
        const bookingUrl: string = operacionActual.booking_doc_url;
        doc = {
          id: `__booking_url__${operacionActual.id}`,
          operacion_id: operacionActual.id,
          tipo: "BOOKING",
          nombre_archivo: `Booking_${operacionActual.booking || ref}.pdf`,
          url: bookingUrl,
          tamano: null,
          mime_type: "application/pdf",
          created_at: "",
        };
      }
      map.set(tipo, doc);
    });
    return map;
  }, [documentos, operacionActual]);

  const docsCompletados = useMemo(() => {
    const hasBookingUrl = !!operacionActual?.booking_doc_url;
    const hasBookingDoc = documentos.some((d) => d.tipo === "BOOKING");
    return documentos.length + (hasBookingUrl && !hasBookingDoc ? 1 : 0);
  }, [documentos, operacionActual]);

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
    <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-neutral-100">

      {/* Toolbar */}
      <div className="bg-white border-b border-neutral-200 flex-shrink-0">
        <div className="flex items-center gap-2 px-3 py-2">
          <Icon icon="lucide:folder-open" className="text-brand-blue flex-shrink-0" width={16} height={16} />
          <span className="font-bold text-sm text-neutral-800">{tr.title}</span>
          {selectedOperacion && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              progressPct === 100 ? "bg-emerald-100 text-emerald-700" : "bg-brand-blue/10 text-brand-blue"
            }`}>
              {docsCompletados}/{TIPOS_DOCUMENTO.length}
            </span>
          )}
          <div className="flex-1" />
          {/* Tabs mobile inline */}
          <div className="lg:hidden flex gap-1">
            <button type="button" onClick={() => setMobilePanel("select")}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${mobilePanel === "select" ? "bg-brand-blue text-white" : "text-neutral-500 hover:bg-neutral-100"}`}>
              Operaciones
            </button>
            <button type="button" onClick={() => setMobilePanel("docs")} disabled={!selectedOperacion}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-40 ${mobilePanel === "docs" ? "bg-brand-blue text-white" : "text-neutral-500 hover:bg-neutral-100"}`}>
              Documentos
            </button>
          </div>
          <button type="button" onClick={() => void fetchOperaciones()}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
            title="Actualizar">
            <Icon icon="typcn:refresh" width={15} height={15} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto p-2 sm:p-3">
        <div className="flex flex-col lg:flex-row gap-3 h-full">

          {/* Panel izquierdo — lista de operaciones */}
          <div className={`w-full lg:w-64 xl:w-72 lg:flex-shrink-0 ${mobilePanel !== "select" ? "hidden lg:block" : ""}`}>
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden lg:sticky lg:top-0">
              <div className="px-3 py-2 border-b border-neutral-100 flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{tr.selectOperation}</span>
                {operaciones.length > 0 && (
                  <span className="text-[10px] font-semibold text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded-full">
                    {filteredOperaciones.length}
                  </span>
                )}
              </div>
              <div className="p-2">
                <div className="relative mb-2">
                  <Icon icon="lucide:search" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 w-3 h-3 pointer-events-none" />
                  <input type="text" placeholder={tr.searchPlaceholder} value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 border border-neutral-200 bg-neutral-50 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all" />
                </div>
                {filteredOperaciones.length === 0 ? (
                  <div className="py-8 text-center">
                    <Icon icon="lucide:folder" width={20} height={20} className="text-neutral-300 mx-auto mb-1" />
                    <p className="text-neutral-400 text-xs">{tr.noOperations}</p>
                  </div>
                ) : (
                  <div className="max-h-[calc(100vh-200px)] overflow-y-auto space-y-1 pr-0.5">
                    {filteredOperaciones.map((op) => {
                      const isActive = selectedOperacion === op.id;
                      const ref = op.ref_asli || `A${String(op.correlativo).padStart(5, "0")}`;
                      const count = docCounts.get(op.id) ?? 0;
                      const total = TIPOS_DOCUMENTO.length;
                      const completo = count >= total;
                      return (
                        <button key={op.id} type="button" onClick={() => handleSelectOperacion(op.id)}
                          className={`w-full text-left px-2.5 py-2 rounded-lg border transition-all ${
                            isActive ? "border-brand-blue bg-brand-blue/5 ring-1 ring-brand-blue/20"
                              : "border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50"
                          }`}>
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <p className={`font-bold text-[11px] ${isActive ? "text-brand-blue" : "text-neutral-700"}`}>{ref}</p>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                              completo ? "text-emerald-700 bg-emerald-100"
                                : count > 0 ? "text-brand-blue bg-brand-blue/10"
                                : "text-neutral-400 bg-neutral-100"
                            }`}>{count}/{total}</span>
                          </div>
                          <p className="text-[10px] text-neutral-500 truncate">{op.cliente}</p>
                          <p className="text-[10px] text-neutral-400 truncate">{op.naviera}{op.booking ? ` · ${op.booking}` : ""}</p>
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
              <div className="space-y-3">

                {/* Banner operación seleccionada + progreso */}
                {operacionActual && (
                  <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="h-[2px] bg-gradient-to-r from-brand-blue to-brand-teal" />
                    <div className="px-3 py-2.5 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-neutral-800">
                            {operacionActual.ref_asli || `A${String(operacionActual.correlativo).padStart(5, "0")}`}
                            {" "}—{" "}{operacionActual.cliente}
                          </p>
                          <p className="text-[11px] text-neutral-500">
                            {operacionActual.naviera}{operacionActual.booking ? ` · ${operacionActual.booking}` : ""}{operacionActual.pod ? ` · ${operacionActual.pod}` : ""}
                          </p>
                        </div>
                        {/* Barra de progreso */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${progressPct}%`, background: progressPct === 100 ? "linear-gradient(to right,#10b981,#059669)" : "linear-gradient(to right,#3b82f6,#06b6d4)" }} />
                          </div>
                          <span className={`text-[10px] font-bold shrink-0 ${progressPct === 100 ? "text-emerald-600" : "text-brand-blue"}`}>
                            {docsCompletados}/{TIPOS_DOCUMENTO.length}
                            {progressPct === 100 && " ✓"}
                          </span>
                        </div>
                      </div>
                      <button type="button" onClick={() => setMobilePanel("select")}
                        className="lg:hidden shrink-0 flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-brand-blue bg-white border border-brand-blue/30 rounded-lg hover:bg-brand-blue/5 transition-colors">
                        <Icon icon="lucide:list" width={11} height={11} />
                        Cambiar
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium flex items-center gap-2">
                    <Icon icon="lucide:alert-circle" className="w-3.5 h-3.5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Grid de documentos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TIPOS_DOCUMENTO.map((tipo) => {
                    const doc = documentosPorTipo.get(tipo);
                    const isUploading = uploading === tipo;
                    const meta = TIPO_META[tipo];
                    const isSyntheticBooking = !!doc && doc.id.startsWith("__booking_url__");

                    return (
                      <div key={tipo} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
                        doc ? "border-emerald-200" : "border-neutral-200"
                      }`}>
                        <div className={`h-[2px] ${doc ? "bg-gradient-to-r from-emerald-400 to-teal-400" : "bg-gradient-to-r from-neutral-200 to-neutral-100"}`} />
                        {/* Card header */}
                        <div className="px-3 py-2 flex items-center gap-2 border-b border-neutral-50">
                          <span className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${doc ? "bg-emerald-100" : meta.color.split(" ")[1]}`}>
                            <Icon icon={doc ? "lucide:check" : meta.icon} className={`w-3 h-3 ${doc ? "text-emerald-600" : meta.color.split(" ")[0]}`} />
                          </span>
                          <h3 className="text-[11px] font-bold text-neutral-700 leading-tight flex-1 min-w-0 truncate">{meta.label}</h3>
                        </div>
                        {/* Card body */}
                        <div className="p-2">
                          {doc ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-neutral-50 border border-neutral-100">
                                <Icon icon={doc.mime_type?.includes("pdf") ? "lucide:file-text" : "lucide:file-spreadsheet"}
                                  className={`w-3.5 h-3.5 flex-shrink-0 ${doc.mime_type?.includes("pdf") ? "text-red-500" : "text-green-600"}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-semibold text-neutral-800 truncate leading-tight">{doc.nombre_archivo}</p>
                                  <p className="text-[10px] text-neutral-400">{isSyntheticBooking ? "Desde la operación" : `${formatFileSize(doc.tamano)} · ${formatDate(doc.created_at)}`}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button type="button" onClick={() => handlePreview(doc)}
                                  className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-semibold text-brand-blue bg-brand-blue/8 rounded-md hover:bg-brand-blue/15 transition-colors">
                                  <Icon icon="lucide:eye" className="w-3 h-3" />{tr.preview}
                                </button>
                                <button type="button" onClick={() => handleDownload(doc)}
                                  className="inline-flex items-center justify-center w-6 h-6 text-emerald-700 bg-emerald-50 rounded-md hover:bg-emerald-100 transition-colors border border-emerald-200" title={tr.download}>
                                  <Icon icon="lucide:download" className="w-3 h-3" />
                                </button>
                                {!isCliente && !isSyntheticBooking && (
                                  <label className="inline-flex items-center justify-center w-6 h-6 text-neutral-500 bg-neutral-100 rounded-md hover:bg-neutral-200 transition-colors cursor-pointer border border-neutral-200" title={tr.replace}>
                                    <Icon icon="lucide:refresh-cw" className="w-3 h-3" />
                                    <input type="file" accept=".pdf,.xls,.xlsx" className="hidden"
                                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(tipo, f); e.target.value = ""; }} />
                                  </label>
                                )}
                                {!isCliente && !isSyntheticBooking && (
                                  <button type="button" onClick={() => handleDelete(doc)}
                                    className="inline-flex items-center justify-center w-6 h-6 text-red-500 bg-red-50 rounded-md hover:bg-red-100 transition-colors border border-red-200" title="Eliminar">
                                    <Icon icon="lucide:trash-2" className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : isCliente ? (
                            <div className="flex items-center gap-2 px-2 py-2 rounded-lg border border-dashed border-neutral-200">
                              <Icon icon="lucide:file-x" className="w-3.5 h-3.5 text-neutral-300" />
                              <p className="text-[10px] text-neutral-400">Sin documento</p>
                            </div>
                          ) : (
                            <label className={`flex items-center gap-2 px-2 py-2 rounded-lg border border-dashed cursor-pointer transition-all ${
                              isUploading ? "border-brand-blue bg-brand-blue/5" : "border-neutral-200 hover:border-brand-blue/50 hover:bg-brand-blue/3"
                            }`}>
                              {isUploading ? (
                                <><Icon icon="typcn:refresh" className="w-3.5 h-3.5 text-brand-blue animate-spin flex-shrink-0" />
                                <span className="text-[10px] font-semibold text-brand-blue">{tr.uploading}</span></>
                              ) : (
                                <><Icon icon="lucide:upload" className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                                <div>
                                  <p className="text-[10px] font-semibold text-neutral-500">{tr.uploadFile}</p>
                                  <p className="text-[9px] text-neutral-400">PDF · Excel · máx 10 MB</p>
                                </div></>
                              )}
                              <input type="file" accept=".pdf,.xls,.xlsx" className="hidden" disabled={isUploading}
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(tipo, f); e.target.value = ""; }} />
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
                <div className="py-12 px-6 text-center">
                  <Icon icon="lucide:folder-open" width={32} height={32} className="text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-700 font-semibold text-sm mb-1">{tr.selectOperation}</p>
                  <p className="text-neutral-400 text-xs">Selecciona una operación para ver sus documentos</p>
                  <button type="button" onClick={() => setMobilePanel("select")}
                    className="lg:hidden mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors">
                    <Icon icon="lucide:list" width={12} height={12} />Ver operaciones
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
