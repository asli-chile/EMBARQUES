import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { modulePageBg, moduleHero, moduleCard, moduleInput } from "@/lib/ui/moduleStyles";

type Operacion = {
  id: string;
  ref_asli: string;
  correlativo: number;
  cliente: string;
  naviera: string;
  booking: string;
  contenedor: string | null;
  pod: string;
  etd: string | null;
  booking_doc_url: string | null;
  created_at: string | null;
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
  "SOLICITUD_RESERVA",
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

const PAGE_SIZE_OPTIONS = [10, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const TIPO_META: Record<TipoDocumento, { label: string; icon: string; color: string }> = {
  SOLICITUD_RESERVA:       { label: "Solicitud de Reserva",           icon: "lucide:send",           color: "text-emerald-600 bg-emerald-50" },
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

function opRef(op: Operacion) {
  return op.ref_asli || `A${String(op.correlativo).padStart(5, "0")}`;
}

export function MisDocumentosContent() {
  const { t, locale } = useLocale();
  const { isCliente, empresaNombres, isLoading: authLoading } = useAuth();
  const tr = t.misDocumentos;
  const visibleTipos = TIPOS_DOCUMENTO;
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [docCounts, setDocCounts] = useState<Map<string, number>>(new Map());
  const [selectedOperacion, setSelectedOperacion] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<TipoDocumento | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewDoc, setPreviewDoc] = useState<Documento | null>(null);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [page, setPage] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; confirmLabel: string; onConfirm: () => void } | null>(null);

  const supabase = useMemo(() => {
    try { return createClient(); } catch { return null; }
  }, []);

  const selectedOperacionRef = useRef<string>("");
  useEffect(() => { selectedOperacionRef.current = selectedOperacion; }, [selectedOperacion]);

  const reloadCountsRef = useRef<((ops: Operacion[]) => Promise<void>) | null>(null);
  const reloadDocsRef = useRef<(() => Promise<void>) | null>(null);

  const reloadCounts = useCallback(async (ops: Operacion[]) => {
    if (!supabase || ops.length === 0) return;
    const ids = ops.map((o) => o.id);
    const docsData: { operacion_id: string; tipo: string }[] = [];
    const IN_CHUNK = 80;
    for (let i = 0; i < ids.length; i += IN_CHUNK) {
      const chunk = ids.slice(i, i + IN_CHUNK);
      const { data, error } = await supabase
        .from("documentos")
        .select("operacion_id, tipo")
        .in("operacion_id", chunk);
      if (error) continue;
      if (data) docsData.push(...data);
    }

    const docsByOperacion = new Map<string, { count: number; hasBookingDoc: boolean }>();
    docsData.forEach((d) => {
      const current = docsByOperacion.get(d.operacion_id) ?? { count: 0, hasBookingDoc: false };
      current.count += 1;
      if (d.tipo === "BOOKING") current.hasBookingDoc = true;
      docsByOperacion.set(d.operacion_id, current);
    });

    const counts = new Map<string, number>();
    ops.forEach((op) => {
      const current = docsByOperacion.get(op.id) ?? { count: 0, hasBookingDoc: false };
      const syntheticBookingExtra = op.booking_doc_url && !current.hasBookingDoc ? 1 : 0;
      counts.set(op.id, current.count + syntheticBookingExtra);
    });
    setDocCounts(counts);
  }, [supabase]);

  useEffect(() => { reloadCountsRef.current = reloadCounts; }, [reloadCounts]);

  const fetchOperaciones = useCallback(async () => {
    if (!supabase || authLoading) return;
    setLoading(true);
    let q = supabase
      .from("operaciones")
      .select("id, ref_asli, correlativo, cliente, naviera, booking, contenedor, pod, etd, booking_doc_url, created_at")
      .is("deleted_at", null);
    if (empresaNombres.length > 0) q = q.in("cliente", empresaNombres);
    const { data } = await q.order("created_at", { ascending: false });
    const ops: Operacion[] = data ?? [];
    setOperaciones(ops);
    setLoading(false);
    await reloadCounts(ops);
  }, [supabase, authLoading, empresaNombres, reloadCounts]);

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

  useEffect(() => { reloadDocsRef.current = fetchDocumentos; }, [fetchDocumentos]);

  useEffect(() => {
    if (!authLoading) void fetchOperaciones();
    else setOperaciones([]);
  }, [authLoading, fetchOperaciones]);

  useEffect(() => {
    if (selectedOperacion) void fetchDocumentos();
    else setDocumentos([]);
  }, [selectedOperacion, fetchDocumentos]);

  const operacionesRef = useRef<Operacion[]>([]);
  useEffect(() => { operacionesRef.current = operaciones; }, [operaciones]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("documentos-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documentos" },
        (payload) => {
          const changedOpId =
            (payload.new as { operacion_id?: string })?.operacion_id ??
            (payload.old as { operacion_id?: string })?.operacion_id;
          if (changedOpId && changedOpId === selectedOperacionRef.current) {
            void reloadDocsRef.current?.();
          }
          void reloadCountsRef.current?.(operacionesRef.current);
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void reloadCountsRef.current?.(operacionesRef.current);
        if (selectedOperacionRef.current) void reloadDocsRef.current?.();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const operacionActual = useMemo(
    () => operaciones.find((op) => op.id === selectedOperacion),
    [operaciones, selectedOperacion]
  );

  const filteredOperaciones = useMemo(() => {
    if (!searchTerm.trim()) return operaciones;
    const search = searchTerm.toLowerCase();
    return operaciones.filter((op) => {
      const ref = opRef(op);
      return (
        ref.toLowerCase().includes(search) ||
        (op.cliente ?? "").toLowerCase().includes(search) ||
        (op.booking ?? "").toLowerCase().includes(search) ||
        (op.contenedor ?? "").toLowerCase().includes(search) ||
        (op.naviera ?? "").toLowerCase().includes(search) ||
        (op.pod ?? "").toLowerCase().includes(search)
      );
    });
  }, [operaciones, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, pageSize]);

  // Deep-link desde Registros: /documentos/mis-documentos?op=<uuid>
  useEffect(() => {
    if (operaciones.length === 0 || typeof window === "undefined") return;
    const opId = new URLSearchParams(window.location.search).get("op");
    if (!opId) return;
    const idx = operaciones.findIndex((o) => o.id === opId);
    if (idx < 0) return;
    setSelectedOperacion(opId);
    setPage(Math.floor(idx / pageSize) + 1);
  }, [operaciones, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredOperaciones.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pagedOperaciones = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredOperaciones.slice(start, start + pageSize);
  }, [filteredOperaciones, safePage, pageSize]);

  const rangeFrom = filteredOperaciones.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeTo = Math.min(safePage * pageSize, filteredOperaciones.length);

  const documentosPorTipo = useMemo(() => {
    const map = new Map<TipoDocumento, Documento | null>();
    visibleTipos.forEach((tipo) => {
      let doc = documentos.find((d) => d.tipo === tipo) || null;
      if (!doc && tipo === "BOOKING" && operacionActual && operacionActual.booking_doc_url) {
        const ref = opRef(operacionActual);
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
  }, [documentos, operacionActual, visibleTipos]);

  const docsCompletados = useMemo(() => {
    const visibleDocs = documentos.filter((d) => visibleTipos.includes(d.tipo as TipoDocumento));
    const hasBookingUrl = !!operacionActual?.booking_doc_url;
    const hasBookingDoc = documentos.some((d) => d.tipo === "BOOKING");
    const syntheticExtra = hasBookingUrl && !hasBookingDoc ? 1 : 0;
    return visibleDocs.length + syntheticExtra;
  }, [documentos, operacionActual, visibleTipos]);

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
    const ref = operacion ? opRef(operacion) : "DOC";
    const ext = (file.name.split(".").pop() ?? "pdf").toLowerCase();
    const fileName = `${ref}_${tipo}_${Date.now()}.${ext}`;
    const filePath = `${selectedOperacion}/${fileName}`;
    const contentType =
      file.type ||
      (ext === "pdf"
        ? "application/pdf"
        : ext === "xls"
        ? "application/vnd.ms-excel"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    const { error: uploadError } = await supabase.storage
      .from("documentos")
      .upload(filePath, file, { upsert: true, contentType });
    if (uploadError) { setError(uploadError.message); setUploading(null); return; }

    const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(filePath);
    const existingDoc = documentosPorTipo.get(tipo);
    if (existingDoc && !existingDoc.id.startsWith("__booking_url__")) {
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
    if (dbError) setError(dbError.message);

    setUploading(null);
    void fetchDocumentos();
  };

  const handleDelete = (doc: Documento) => {
    if (!supabase) return;
    setConfirmDialog({
      title: "Eliminar documento",
      message: tr.confirmDelete,
      confirmLabel: "Eliminar",
      onConfirm: async () => {
        setConfirmDialog(null);
        const marker = "/object/public/documentos/";
        const idx = doc.url.indexOf(marker);
        const storagePath = idx >= 0 ? decodeURIComponent(doc.url.slice(idx + marker.length)) : null;
        if (storagePath) await supabase.storage.from("documentos").remove([storagePath]);
        await supabase.from("documentos").delete().eq("id", doc.id);
        void fetchDocumentos();
      },
    });
  };

  const handleDownload = (doc: Documento) => window.open(doc.url, "_blank");
  const handlePreview = (doc: Documento) => setPreviewDoc(doc);
  const closePreview = () => setPreviewDoc(null);
  const isPdf = (mimeType: string | null) => mimeType?.includes("pdf");

  const handleSelectOperacion = (id: string) => {
    setSelectedOperacion(id);
  };

  const handlePageSizeChange = (value: PageSize) => {
    setPageSize(value);
    setPage(1);
  };

  if (loading) {
    return (
      <main className={`flex-1 ${modulePageBg} min-h-0 overflow-auto p-4 flex items-center justify-center`}>
        <div className="flex items-center gap-3 px-5 py-4 bg-white rounded-2xl border border-brand-blue/15 shadow-sm text-brand-blue/70 text-base font-medium">
          <Icon icon="typcn:refresh" className="w-5 h-5 animate-spin text-brand-blue" />
          <span>{tr.loading}</span>
        </div>
      </main>
    );
  }

  const hasSelection = !!selectedOperacion && !!operacionActual;
  const progressPct = Math.round((docsCompletados / visibleTipos.length) * 100);
  const totalTipos = visibleTipos.length;

  const docsBadge = (opId: string) => {
    const count = docCounts.get(opId) ?? 0;
    const completo = count >= totalTipos;
    const pct = Math.min(100, Math.round((count / totalTipos) * 100));
    return (
      <span
        className={`inline-flex items-center gap-1 text-base font-extrabold px-2 py-0.5 rounded-sm border tabular-nums ${
          completo
            ? "text-emerald-700 bg-emerald-50 border-emerald-200"
            : count > 0
              ? "text-brand-blue bg-brand-blue/10 border-brand-blue/20"
              : "text-neutral-500 bg-neutral-100 border-neutral-200"
        }`}
      >
        {count}/{totalTipos}
        <span className="opacity-70 font-semibold">({pct}%)</span>
      </span>
    );
  };

  const paginationBar = (
    <div className={`border-t border-brand-blue/10 flex flex-col gap-2 bg-[#F4F8FC]/80 ${hasSelection ? "px-2 py-2" : "px-3 sm:px-4 py-3 sm:flex-row sm:items-center sm:justify-between"}`}>
      <div className={`flex flex-wrap items-center gap-2 text-base text-neutral-600 ${hasSelection ? "justify-center" : ""}`}>
        {!hasSelection && <span className="font-semibold text-brand-blue/70">{tr.rowsPerPage}</span>}
        <div className="inline-flex rounded-lg border border-brand-blue/20 overflow-hidden bg-white">
          {PAGE_SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => handlePageSizeChange(size)}
              className={`font-bold transition-colors ${
                hasSelection ? "px-2 py-1 text-sm" : "px-3 py-1.5 text-base"
              } ${
                pageSize === size
                  ? "bg-brand-blue text-white"
                  : "text-brand-blue/80 hover:bg-[#F4F8FC]"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
        {!hasSelection && (
          <span className="text-neutral-500 tabular-nums">
            {tr.showingRange
              .replace("{from}", String(rangeFrom))
              .replace("{to}", String(rangeTo))
              .replace("{total}", String(filteredOperaciones.length))}
          </span>
        )}
      </div>

      <div className={`flex items-center gap-1 ${hasSelection ? "justify-center" : "gap-2"}`}>
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="inline-flex items-center justify-center gap-1 px-2.5 py-2 text-base font-semibold rounded-lg border border-brand-blue/20 bg-white text-brand-blue/80 hover:bg-[#F4F8FC] disabled:opacity-40 disabled:pointer-events-none transition-colors"
          title={tr.prevPage}
        >
          <Icon icon="lucide:chevron-left" width={16} height={16} />
          {!hasSelection && tr.prevPage}
        </button>
        <span className="text-base font-bold text-brand-blue tabular-nums px-1.5">
          {hasSelection
            ? `${safePage}/${totalPages}`
            : tr.pageOf.replace("{page}", String(safePage)).replace("{pages}", String(totalPages))}
        </span>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="inline-flex items-center justify-center gap-1 px-2.5 py-2 text-base font-semibold rounded-lg border border-brand-blue/20 bg-white text-brand-blue/80 hover:bg-[#F4F8FC] disabled:opacity-40 disabled:pointer-events-none transition-colors"
          title={tr.nextPage}
        >
          {!hasSelection && tr.nextPage}
          <Icon icon="lucide:chevron-right" width={16} height={16} />
        </button>
      </div>
    </div>
  );

  const docsPanel = hasSelection && operacionActual ? (
    <div className="space-y-3">
      <div className={`rounded-2xl overflow-hidden shadow-sm border-2 ${progressPct === 100 ? "border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50" : "border-brand-blue/20 bg-gradient-to-r from-brand-blue/5 to-sky-50"}`}>
        <div className="px-4 py-3 flex items-center gap-3">
          <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${progressPct === 100 ? "bg-emerald-100" : "bg-brand-blue/10"}`}>
            <Icon icon={progressPct === 100 ? "lucide:check-circle" : "lucide:folder-open"} width={22} height={22} className={progressPct === 100 ? "text-emerald-600" : "text-brand-blue"} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-brand-blue truncate">
              {opRef(operacionActual)} — {operacionActual.cliente}
            </p>
            <p className="text-base text-neutral-500 truncate">
              {operacionActual.naviera}{operacionActual.booking ? ` · ${operacionActual.booking}` : ""}{operacionActual.pod ? ` · ${operacionActual.pod}` : ""}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-2 bg-white/70 rounded-sm overflow-hidden border border-brand-blue/15">
                <div className="h-full rounded-sm transition-all duration-500"
                  style={{ width: `${progressPct}%`, background: progressPct === 100 ? "linear-gradient(to right,#10b981,#059669)" : "linear-gradient(to right,#11224E,#007A7B)" }} />
              </div>
              <span className={`text-base font-extrabold shrink-0 ${progressPct === 100 ? "text-emerald-700" : "text-brand-blue"}`}>
                {docsCompletados}/{visibleTipos.length} {progressPct === 100 ? "✓" : `(${progressPct}%)`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedOperacion("")}
            className="shrink-0 p-2 text-neutral-400 hover:text-neutral-700 hover:bg-white/70 rounded-lg transition-colors"
            title={tr.closeSelection}
          >
            <Icon icon="lucide:x" width={18} height={18} />
          </button>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-base font-medium flex items-center gap-2">
          <Icon icon="lucide:alert-circle" className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className={`grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-2`}>
        {visibleTipos.map((tipo) => {
          const doc = documentosPorTipo.get(tipo);
          const isUploading = uploading === tipo;
          const meta = TIPO_META[tipo];
          const isSyntheticBooking = !!doc && doc.id.startsWith("__booking_url__");
          const tipoLabel = tr.tipoLabels[tipo as keyof typeof tr.tipoLabels] ?? meta.label;

          return (
            <div key={tipo} className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-all ${
              doc ? "border-emerald-300" : "border-brand-blue/15"
            }`}>
              <div className={`h-1.5 ${doc ? "bg-gradient-to-r from-emerald-400 to-teal-400" : "bg-gradient-to-r from-brand-blue/20 to-brand-blue/5"}`} />
              <div className="px-4 py-3 flex items-center gap-3 border-b border-brand-blue/10">
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${doc ? "bg-emerald-100" : meta.color.split(" ")[1]}`}>
                  <Icon icon={doc ? "lucide:check" : meta.icon} className={`w-4.5 h-4.5 ${doc ? "text-emerald-600" : meta.color.split(" ")[0]}`} width={18} height={18} />
                </span>
                <h3 className="text-base font-bold text-brand-blue leading-tight flex-1 min-w-0">{tipoLabel}</h3>
              </div>
              <div className="p-3">
                {doc ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#F4F8FC] border border-brand-blue/10">
                      <Icon icon={doc.mime_type?.includes("pdf") ? "lucide:file-text" : "lucide:file-spreadsheet"}
                        className={`w-5 h-5 flex-shrink-0 ${doc.mime_type?.includes("pdf") ? "text-red-500" : "text-green-600"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-neutral-800 truncate leading-tight">{doc.nombre_archivo}</p>
                        <p className="text-base text-neutral-500 mt-0.5">{isSyntheticBooking ? tr.fromOperation : `${formatFileSize(doc.tamano)} · ${formatDate(doc.created_at)}`}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => handlePreview(doc)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-base font-semibold text-brand-blue bg-brand-blue/8 rounded-lg hover:bg-brand-blue/15 transition-colors">
                        <Icon icon="lucide:eye" className="w-4 h-4" />{tr.preview}
                      </button>
                      <button type="button" onClick={() => handleDownload(doc)}
                        className="inline-flex items-center justify-center w-10 h-10 text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200" title={tr.download}>
                        <Icon icon="lucide:download" className="w-4 h-4" />
                      </button>
                      {!isCliente && !isSyntheticBooking && (
                        <label className="inline-flex items-center justify-center w-10 h-10 text-neutral-500 bg-[#F4F8FC] rounded-lg hover:bg-white transition-colors cursor-pointer border border-brand-blue/20" title={tr.replace}>
                          <Icon icon="lucide:refresh-cw" className="w-4 h-4" />
                          <input type="file" accept=".pdf,.xls,.xlsx" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(tipo, f); e.target.value = ""; }} />
                        </label>
                      )}
                      {!isCliente && !isSyntheticBooking && (
                        <button type="button" onClick={() => handleDelete(doc)}
                          className="inline-flex items-center justify-center w-10 h-10 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors border border-red-200" title={tr.deleteDocument}>
                          <Icon icon="lucide:trash-2" className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : isCliente ? (
                  <div className="flex items-center gap-3 px-3 py-3 rounded-lg border border-dashed border-brand-blue/20">
                    <Icon icon="lucide:file-x" className="w-5 h-5 text-neutral-300" />
                    <p className="text-base text-neutral-400">{tr.noDocument}</p>
                  </div>
                ) : (
                  <label className={`flex items-center gap-3 px-3 py-3 rounded-lg border border-dashed cursor-pointer transition-all ${
                    isUploading ? "border-brand-blue bg-brand-blue/5" : "border-brand-blue/20 hover:border-brand-blue/50 hover:bg-brand-blue/[0.03]"
                  }`}>
                    {isUploading ? (
                      <><Icon icon="lucide:loader-2" className="w-5 h-5 text-brand-blue animate-spin flex-shrink-0" />
                      <span className="text-base font-semibold text-brand-blue">{tr.uploading}</span></>
                    ) : (
                      <><Icon icon="lucide:upload" className="w-5 h-5 text-neutral-400 flex-shrink-0" />
                      <div>
                        <p className="text-base font-semibold text-neutral-600">{tr.uploadFile}</p>
                        <p className="text-base text-neutral-400">{tr.fileTypesHint}</p>
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
  ) : null;

  return (
    <>
    <main className={`flex-1 min-h-0 w-full overflow-hidden flex flex-col ${modulePageBg}`}>

      <div className={`${moduleHero} px-4 sm:px-6 pt-5 pb-4`}>
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-white/15 border border-white/25 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Icon icon="lucide:folder-open" width={24} height={24} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight">{tr.title}</h1>
              <p className="text-base text-white/75 mt-1 truncate">{tr.subtitle}</p>
            </div>
          </div>
          <button type="button" onClick={() => void fetchOperaciones()}
            className="p-2.5 bg-white/15 hover:bg-white/25 rounded-lg transition-colors text-white" title={tr.updateTooltip}>
            <Icon icon="lucide:refresh-cw" width={18} height={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 w-full overflow-hidden p-2 sm:p-2.5">
        <div className="flex flex-col lg:flex-row gap-2 h-full min-h-0 w-full">

          {/* Columna operaciones */}
          <div
            className={`flex flex-col min-h-0 min-w-0 transition-all duration-300 ease-out ${
              hasSelection
                ? "hidden lg:flex lg:w-[200px] xl:w-[220px] lg:shrink-0"
                : "w-full flex-1"
            }`}
          >
            <div className={`${moduleCard} flex flex-col min-h-0 h-full w-full`}>
              <div className={`border-b border-brand-blue/10 flex flex-wrap items-center gap-2 shrink-0 ${hasSelection ? "px-2 py-2" : "px-3 py-2.5"}`}>
                <Icon icon="lucide:history" width={hasSelection ? 16 : 18} height={hasSelection ? 16 : 18} className="text-brand-blue shrink-0" />
                <div className="min-w-0 flex-1 basis-[8rem]">
                  <p className={`font-bold text-brand-blue ${hasSelection ? "text-sm" : "text-base"}`}>{tr.recentMovements}</p>
                  {!hasSelection && (
                    <p className="text-base text-neutral-500 truncate hidden sm:block">{tr.selectOperationPrompt}</p>
                  )}
                </div>
                {!hasSelection && (
                  <div className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[12rem] sm:max-w-md lg:max-w-xl order-last sm:order-none">
                    <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-blue/40 w-4 h-4 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={tr.searchPlaceholder}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`${moduleInput} pl-9`}
                    />
                  </div>
                )}
                {hasSelection && (
                  <button
                    type="button"
                    onClick={() => setSelectedOperacion("")}
                    className="shrink-0 p-1.5 text-neutral-400 hover:text-brand-blue hover:bg-brand-blue/10 rounded-lg transition-colors"
                    title={tr.expandOperations}
                  >
                    <Icon icon="lucide:panel-left-open" width={16} height={16} />
                  </button>
                )}
              </div>

              <div className="flex-1 min-h-0 overflow-auto w-full">
                {/* Lista compacta (selección activa): solo Ref + Booking */}
                {hasSelection ? (
                  <div className="divide-y divide-brand-blue/10">
                    {pagedOperaciones.length === 0 ? (
                      <div className="py-8 px-3 text-center text-neutral-400 text-base">{tr.noOperations}</div>
                    ) : (
                      pagedOperaciones.map((op) => {
                        const isActive = selectedOperacion === op.id;
                        return (
                          <button
                            key={op.id}
                            type="button"
                            onClick={() => handleSelectOperacion(op.id)}
                            className={`w-full text-left px-2.5 py-2.5 transition-colors ${
                              isActive
                                ? "bg-brand-blue/8 border-l-2 border-l-brand-blue"
                                : "hover:bg-[#F4F8FC] border-l-2 border-l-transparent"
                            }`}
                          >
                            <p className={`text-base font-bold truncate ${isActive ? "text-brand-blue" : "text-neutral-800"}`}>
                              {opRef(op)}
                            </p>
                            <p className="text-base text-neutral-500 truncate mt-0.5">
                              {op.booking || "—"}
                            </p>
                          </button>
                        );
                      })
                    )}
                  </div>
                ) : (
                  <>
                    {/* Cards móvil sin selección */}
                    <div className="md:hidden divide-y divide-brand-blue/10">
                      {pagedOperaciones.length === 0 ? (
                        <div className="py-12 px-4 text-center">
                          <Icon icon="lucide:folder" width={28} height={28} className="text-brand-blue/30 mx-auto mb-2" />
                          <p className="text-neutral-500 text-base">{tr.noOperations}</p>
                        </div>
                      ) : (
                        pagedOperaciones.map((op) => (
                          <button
                            key={op.id}
                            type="button"
                            onClick={() => handleSelectOperacion(op.id)}
                            className="w-full text-left p-3.5 transition-colors bg-white hover:bg-[#F4F8FC]"
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-base font-bold text-brand-blue">{opRef(op)}</p>
                              {docsBadge(op.id)}
                            </div>
                            <p className="text-base text-neutral-600 truncate">{op.cliente || "-"}</p>
                            <p className="text-base text-neutral-500 mt-0.5 truncate">
                              {op.naviera || "-"}
                              {op.booking ? ` · ${op.booking}` : ""}
                              {op.contenedor ? ` · ${op.contenedor}` : ""}
                              {op.pod ? ` · ${op.pod}` : ""}
                            </p>
                            <p className="text-base text-neutral-500 mt-1">{tr.colDate}: {formatDate(op.created_at)}</p>
                          </button>
                        ))
                      )}
                    </div>

                    {/* Tabla completa desktop — ancho completo */}
                    <div className="hidden md:block w-full overflow-x-auto">
                      <table className="w-full table-fixed text-left text-base">
                        <colgroup>
                          <col className="w-[8%]" />
                          <col className="w-[15%]" />
                          <col className="w-[12%]" />
                          <col className="w-[14%]" />
                          <col className="w-[13%]" />
                          <col className="w-[11%]" />
                          <col className="w-[10%]" />
                          <col className="w-[9%]" />
                          <col className="w-[8%]" />
                        </colgroup>
                        <thead>
                          <tr className="bg-[#F4F8FC] border-b border-brand-blue/10">
                            <th className="px-3 py-2.5 text-sm font-bold text-brand-blue">{tr.colRef}</th>
                            <th className="px-3 py-2.5 text-sm font-bold text-brand-blue">{tr.colCliente}</th>
                            <th className="px-3 py-2.5 text-sm font-bold text-brand-blue">{tr.colNaviera}</th>
                            <th className="px-3 py-2.5 text-sm font-bold text-brand-blue">{tr.colBooking}</th>
                            <th className="px-3 py-2.5 text-sm font-bold text-brand-blue">{tr.colContenedor}</th>
                            <th className="px-3 py-2.5 text-sm font-bold text-brand-blue">{tr.colPod}</th>
                            <th className="px-3 py-2.5 text-sm font-bold text-brand-blue">{tr.colEtd}</th>
                            <th className="px-3 py-2.5 text-sm font-bold text-brand-blue">{tr.colDocs}</th>
                            <th className="px-3 py-2.5 text-sm font-bold text-brand-blue">{tr.colDate}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-blue/10">
                          {pagedOperaciones.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="px-4 py-12 text-center text-neutral-400 text-base">
                                {tr.noOperations}
                              </td>
                            </tr>
                          ) : (
                            pagedOperaciones.map((op) => (
                              <tr
                                key={op.id}
                                onClick={() => handleSelectOperacion(op.id)}
                                className="cursor-pointer transition-colors hover:bg-[#F4F8FC]"
                              >
                                <td className="px-3 py-2.5 font-bold truncate text-brand-blue">{opRef(op)}</td>
                                <td className="px-3 py-2.5 text-neutral-700 truncate">{op.cliente || "-"}</td>
                                <td className="px-3 py-2.5 text-neutral-600 truncate">{op.naviera || "-"}</td>
                                <td className="px-3 py-2.5 text-neutral-600 truncate">{op.booking || "-"}</td>
                                <td className="px-3 py-2.5 text-neutral-600 truncate font-mono">{op.contenedor || "-"}</td>
                                <td className="px-3 py-2.5 text-neutral-600 truncate">{op.pod || "-"}</td>
                                <td className="px-3 py-2.5 text-neutral-600 truncate">{formatDate(op.etd)}</td>
                                <td className="px-3 py-2.5">{docsBadge(op.id)}</td>
                                <td className="px-3 py-2.5 text-neutral-500 truncate">{formatDate(op.created_at)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              <div className="shrink-0">{paginationBar}</div>
            </div>
          </div>

          {/* Columna documentos — solo visible con selección */}
          {hasSelection && (
            <div className="flex-1 min-w-0 min-h-0 overflow-auto w-full">
              {docsPanel}
            </div>
          )}
        </div>
      </div>

      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={closePreview}
        >
          <div
            className="bg-white rounded-2xl shadow-mac-modal w-full h-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal flex-shrink-0" />
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 flex-shrink-0 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                  <Icon
                    icon={isPdf(previewDoc.mime_type) ? "lucide:file-text" : "lucide:file-spreadsheet"}
                    className={`w-4 h-4 ${isPdf(previewDoc.mime_type) ? "text-red-500" : "text-green-600"}`}
                  />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-800 text-base truncate">{previewDoc.nombre_archivo}</p>
                  <p className="text-base text-neutral-500">
                    {formatFileSize(previewDoc.tamano)} · {formatDate(previewDoc.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(previewDoc)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-base font-semibold text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors"
                >
                  <Icon icon="lucide:download" className="w-3.5 h-3.5" />
                  {tr.download}
                </button>
                <button
                  type="button"
                  onClick={closePreview}
                  className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
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
                  <span className="w-16 h-16 rounded-lg bg-neutral-200 flex items-center justify-center">
                    <Icon icon="lucide:file-spreadsheet" className="w-8 h-8 text-neutral-400" />
                  </span>
                  <p className="text-neutral-600 font-medium text-base">{tr.excelPreviewNotAvailable}</p>
                  <p className="text-neutral-400 text-base">{tr.downloadToView}</p>
                  <button
                    type="button"
                    onClick={() => handleDownload(previewDoc)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-base font-semibold text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors"
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
    {confirmDialog && (
      <ConfirmDialog
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant="danger"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(null)}
      />
    )}
    </>
  );
}
