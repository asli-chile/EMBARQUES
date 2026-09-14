import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { applyOperacionesClienteFilter } from "@/lib/auth/operacionesClienteScope";
import { aplicarFiltroTemporada } from "@/lib/temporadas";
import { useTemporadaActiva } from "@/lib/useTemporadaActiva";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useNeonTheme } from "@/lib/ui/neonTheme";
import { withBase } from "@/lib/basePath";

type Operacion = {
  id: string;
  ref_asli: string;
  referencia_externa: string | null;
  correlativo: number;
  cliente: string;
  naviera: string;
  booking: string;
  contenedor: string | null;
  pol: string | null;
  pod: string;
  etd: string | null;
  /** Estado del viaje. Convive con el del papeleo: son preguntas distintas. */
  estado_operacion: string | null;
  booking_doc_url: string | null;
  created_at: string | null;
  solicitud_reserva_no_aplica: boolean;
  factura_gate_out_no_aplica: boolean;
};

/** Tipos que pueden marcarse como "No aplica" y salir del %. */
const TIPOS_NO_APLICA = ["SOLICITUD_RESERVA", "FACTURA_GATE_OUT"] as const;
type TipoNoAplica = (typeof TIPOS_NO_APLICA)[number];

function isTipoNoAplicaEligible(tipo: string): tipo is TipoNoAplica {
  return (TIPOS_NO_APLICA as readonly string[]).includes(tipo);
}

function isTipoMarcadoNoAplica(op: Operacion | undefined, tipo: string): boolean {
  if (!op || !isTipoNoAplicaEligible(tipo)) return false;
  if (tipo === "SOLICITUD_RESERVA") return !!op.solicitud_reserva_no_aplica;
  return !!op.factura_gate_out_no_aplica;
}

function countTiposNoAplica(op: Operacion | undefined, visibleTipos: readonly string[]): number {
  if (!op) return 0;
  return visibleTipos.reduce((acc, tipo) => acc + (isTipoMarcadoNoAplica(op, tipo) ? 1 : 0), 0);
}

function colNoAplica(tipo: TipoNoAplica): "solicitud_reserva_no_aplica" | "factura_gate_out_no_aplica" {
  return tipo === "SOLICITUD_RESERVA" ? "solicitud_reserva_no_aplica" : "factura_gate_out_no_aplica";
}

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
  "PACKING_LIST",
  "FACTURA_PROFORMA",
  "CERTIFICADO_FITOSANITARIO",
  "CERTIFICADO_ORIGEN",
  "BL_TELEX_SWB_AWB",
  "FULLSET",
  "FACTURA_COMERCIAL",
  "SOLICITUD_RESERVA",
  "FACTURA_GATE_OUT",
  "DUS",
] as const;

type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

/** Tipos visibles para rol cliente, en el orden de la UI. */
const TIPOS_DOCUMENTO_CLIENTE: readonly TipoDocumento[] = [
  "BOOKING",
  "INSTRUCTIVO_EMBARQUE",
  "PACKING_LIST",
  "FACTURA_PROFORMA",
  "CERTIFICADO_FITOSANITARIO",
  "CERTIFICADO_ORIGEN",
  "BL_TELEX_SWB_AWB",
  "FULLSET",
];

/**
 * Los documentos, agrupados por el momento del embarque en que aparecen.
 *
 * Doce tarjetas seguidas obligan a leerlas todas para saber qué falta. Por
 * grupos, la pregunta se responde de un vistazo: el papeleo comercial está, el
 * de origen no.
 *
 * El orden es el del viaje —se reserva, se embarca, se certifica el origen, se
 * emite el B/L, se cierra— y por eso es también el orden en que se buscan.
 */
const GRUPOS_DOCUMENTO = [
  {
    id: "comerciales",
    label: "Comerciales",
    icon: "lucide:receipt",
    /* Color de la etapa, fijo. Identifica el grupo de un vistazo aunque esté
       plegado; cuánto le falta lo dice el contador de al lado. */
    tono: "#a78bfa",
    tipos: ["BOOKING", "FACTURA_PROFORMA", "FACTURA_COMERCIAL", "PACKING_LIST"],
  },
  {
    id: "origen",
    label: "Origen",
    icon: "lucide:stamp",
    tono: "#60a5fa",
    tipos: ["CERTIFICADO_ORIGEN", "CERTIFICADO_FITOSANITARIO", "DUS"],
  },
  {
    id: "transporte",
    label: "Transporte y Nave",
    icon: "lucide:ship",
    tono: "#38bdf8",
    tipos: ["INSTRUCTIVO_EMBARQUE", "BL_TELEX_SWB_AWB", "FACTURA_GATE_OUT"],
  },
  {
    id: "cierre",
    label: "Cierre",
    icon: "lucide:flag",
    tono: "#34d399",
    tipos: ["FULLSET"],
  },
] as const;

const PAGE_SIZE_OPTIONS = [10, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const TIPO_META: Record<TipoDocumento, { label: string; icon: string; color: string }> = {
  BOOKING:                 { label: "Booking",                        icon: "lucide:clipboard-list", color: "text-sky-300 bg-sky-500/15" },
  INSTRUCTIVO_EMBARQUE:    { label: "Instructivo de Embarque (IE)",   icon: "lucide:file-text",      color: "text-violet-300 bg-violet-500/15" },
  PACKING_LIST:            { label: "Packing List",                   icon: "lucide:package",       color: "text-orange-300 bg-orange-500/15" },
  FACTURA_PROFORMA:        { label: "Factura Proforma",               icon: "lucide:file-check",     color: "text-amber-300 bg-amber-500/15" },
  CERTIFICADO_FITOSANITARIO: { label: "Certificado Fitosanitario",   icon: "lucide:leaf",           color: "text-emerald-300 bg-emerald-500/15" },
  CERTIFICADO_ORIGEN:      { label: "Certificado de Origen",         icon: "lucide:globe",          color: "text-teal-300 bg-teal-500/15" },
  BL_TELEX_SWB_AWB:        { label: "BL / Telex / SWB / AWB",       icon: "lucide:ship",           color: "text-cyan-300 bg-cyan-500/15" },
  FULLSET:                 { label: "Fullset",                       icon: "lucide:layers",         color: "text-dash-muted bg-dash-control" },
  FACTURA_COMERCIAL:       { label: "Factura Comercial",             icon: "lucide:shopping-bag",   color: "text-pink-300 bg-pink-500/15" },
  SOLICITUD_RESERVA:       { label: "Solicitud de Reserva",           icon: "lucide:send",           color: "text-lime-300 bg-lime-500/15" },
  FACTURA_GATE_OUT:        { label: "Factura Gate Out",               icon: "lucide:receipt",        color: "text-orange-300 bg-orange-500/15" },
  DUS:                     { label: "DUS",                           icon: "lucide:landmark",       color: "text-indigo-300 bg-indigo-500/15" },
};

function opRef(op: Operacion) {
  return op.ref_asli || `A${String(op.correlativo).padStart(5, "0")}`;
}

export function MisDocumentosContent() {
  const { t, locale } = useLocale();
  const { isCliente, empresaNombres, isLoading: authLoading } = useAuth();
  const [theme] = useNeonTheme();
  const tr = t.misDocumentos;
  const { temporadaActiva, temporadaLoading } = useTemporadaActiva();
  /*
   * Tipos retirados de la pantalla.
   *
   * Se filtran en vez de borrarlos del catálogo: la columna y el histórico
   * siguen existiendo en la base, así que volver a mostrarlos es quitar una
   * línea. Hoy no hay ningún archivo cargado de estos tipos.
   */
  const TIPOS_FUERA: readonly string[] = ["SOLICITUD_RESERVA"];
  const visibleTipos = (isCliente ? TIPOS_DOCUMENTO_CLIENTE : TIPOS_DOCUMENTO).filter(
    (t) => !TIPOS_FUERA.includes(t),
  );
  const visibleTiposSet = useMemo(() => new Set<string>(visibleTipos), [visibleTipos]);
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [docCounts, setDocCounts] = useState<Map<string, number>>(new Map());
  const [selectedOperacion, setSelectedOperacion] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<TipoDocumento | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  /**
   * Filtro por avance del papeleo, que es de lo que trata esta pantalla: saber
   * a qué embarque le falta documentación. No habla del viaje del barco.
   */
  const [filtroDocs, setFiltroDocs] = useState<"todos" | "pendientes" | "curso" | "completos">("todos");
  /** Tarjeta con los datos del embarque desplegados, en la vista de teléfono. */
  const [detalleAbierto, setDetalleAbierto] = useState<string | null>(null);
  /**
   * Grupos que el usuario abrió o cerró a mano.
   *
   * Sin entrada, manda el estado del grupo: los completos nacen plegados y los
   * que tienen algo pendiente, abiertos. Una decisión manual pesa más que esa
   * regla, que para eso se tomó.
   */
  const [gruposCerrados, setGruposCerrados] = useState<Record<string, boolean>>({});
  /** Fila con su menú de acciones desplegado. Solo uno a la vez. */
  const [menuTipo, setMenuTipo] = useState<string | null>(null);
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
    const opsById = new Map(ops.map((o) => [o.id, o]));
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
      if (!visibleTiposSet.has(d.tipo)) return;
      const op = opsById.get(d.operacion_id);
      if (isTipoMarcadoNoAplica(op, d.tipo)) return;
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
  }, [supabase, visibleTiposSet]);

  useEffect(() => { reloadCountsRef.current = reloadCounts; }, [reloadCounts]);

  const fetchOperaciones = useCallback(async () => {
    if (!supabase || authLoading || temporadaLoading) return;
    setLoading(true);
    const baseCols =
      "id, ref_asli, referencia_externa, correlativo, cliente, naviera, booking, contenedor, pol, pod, etd, estado_operacion, booking_doc_url, created_at";
    const withNaCols = `${baseCols}, solicitud_reserva_no_aplica, factura_gate_out_no_aplica`;

    let q = supabase.from("operaciones").select(withNaCols).is("deleted_at", null);
    q = applyOperacionesClienteFilter(q, { isCliente, empresaNombres });
    q = aplicarFiltroTemporada(q, temporadaActiva);
    let { data, error: fetchError } = await q.order("created_at", { ascending: false });

    // Fallback si la migración de no_aplica aún no está aplicada
    if (fetchError) {
      let q2 = supabase.from("operaciones").select(baseCols).is("deleted_at", null);
      q2 = applyOperacionesClienteFilter(q2, { isCliente, empresaNombres });
      q2 = aplicarFiltroTemporada(q2, temporadaActiva);
      const fallback = await q2.order("created_at", { ascending: false });
      data = fallback.data;
      fetchError = fallback.error;
    }

    if (fetchError) {
      setError(fetchError.message);
      setOperaciones([]);
      setLoading(false);
      return;
    }

    const ops: Operacion[] = (data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id),
        ref_asli: String(r.ref_asli ?? ""),
        referencia_externa: (r.referencia_externa as string | null) ?? null,
        correlativo: Number(r.correlativo ?? 0),
        cliente: String(r.cliente ?? ""),
        naviera: String(r.naviera ?? ""),
        booking: String(r.booking ?? ""),
        contenedor: (r.contenedor as string | null) ?? null,
        pol: (r.pol as string | null) ?? null,
        pod: String(r.pod ?? ""),
        etd: (r.etd as string | null) ?? null,
        estado_operacion: (r.estado_operacion as string | null) ?? null,
        booking_doc_url: (r.booking_doc_url as string | null) ?? null,
        created_at: (r.created_at as string | null) ?? null,
        solicitud_reserva_no_aplica: !!r.solicitud_reserva_no_aplica,
        factura_gate_out_no_aplica: !!r.factura_gate_out_no_aplica,
      };
    });
    setOperaciones(ops);
    setLoading(false);
    await reloadCounts(ops);
  }, [supabase, authLoading, temporadaLoading, temporadaActiva, isCliente, empresaNombres, reloadCounts]);

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
      const visibleDocs = docs.filter(
        (d) => visibleTiposSet.has(d.tipo) && !isTipoMarcadoNoAplica(op, d.tipo),
      );
      const hasBookingUrl = !!op?.booking_doc_url;
      const hasBookingDoc = docs.some((d) => d.tipo === "BOOKING");
      const syntheticExtra = hasBookingUrl && !hasBookingDoc ? 1 : 0;
      next.set(selectedOperacion, visibleDocs.length + syntheticExtra);
      return next;
    });
  }, [supabase, selectedOperacion, operaciones, visibleTiposSet]);

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

  type EstadoDocs = "pendiente" | "curso" | "completo";

  /**
   * Avance documental de una operación.
   *
   * Vive en un solo sitio porque lo leen tres cosas —el chip, el color de la
   * tarjeta y el filtro— y si cada una lo calculara por su cuenta, tarde o
   * temprano dirían cosas distintas del mismo embarque.
   */
  const estadoDocsDe = (opId: string): EstadoDocs => {
    const op = operaciones.find((o) => o.id === opId);
    const naCount = countTiposNoAplica(op, visibleTipos);
    const exigibles = visibleTipos.length - naCount;
    const count = docCounts.get(opId) ?? 0;
    if (exigibles === 0 || count >= exigibles) return "completo";
    return count > 0 ? "curso" : "pendiente";
  };

  const filteredOperaciones = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const porEstado = (op: { id: string }) => {
      if (filtroDocs === "todos") return true;
      const e = estadoDocsDe(op.id);
      return filtroDocs === "pendientes"
        ? e === "pendiente"
        : filtroDocs === "curso"
          ? e === "curso"
          : e === "completo";
    };
    if (!search) return operaciones.filter(porEstado);
    return operaciones.filter(porEstado).filter((op) => {
      const ref = opRef(op);
      return (
        ref.toLowerCase().includes(search) ||
        (op.referencia_externa ?? "").toLowerCase().includes(search) ||
        (op.cliente ?? "").toLowerCase().includes(search) ||
        (op.booking ?? "").toLowerCase().includes(search) ||
        (op.contenedor ?? "").toLowerCase().includes(search) ||
        (op.naviera ?? "").toLowerCase().includes(search) ||
        (op.pod ?? "").toLowerCase().includes(search)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operaciones, searchTerm, filtroDocs, docCounts, visibleTipos]);

  useEffect(() => {
    // Cambiar de filtro o de búsqueda devuelve a la primera página: quedarse en
    // la cuarta de un listado que ahora tiene dos es mirar una página vacía.
    setPage(1);
  }, [searchTerm, pageSize, filtroDocs]);

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
    if (!operacionActual) {
      return [...documentosPorTipo.values()].filter(Boolean).length;
    }
    return visibleTipos.reduce((acc, tipo) => {
      if (isTipoMarcadoNoAplica(operacionActual, tipo)) return acc;
      return acc + (documentosPorTipo.get(tipo) ? 1 : 0);
    }, 0);
  }, [documentosPorTipo, operacionActual, visibleTipos]);

  const tiposAplicables = useMemo(() => {
    if (!operacionActual) return visibleTipos.length;
    return visibleTipos.length - countTiposNoAplica(operacionActual, visibleTipos);
  }, [operacionActual, visibleTipos]);

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
    const ext = (file.name.split(".").pop() ?? "pdf").toLowerCase();
    const contentType =
      file.type === "application/pdf" || file.type === "application/x-pdf"
        ? "application/pdf"
        : file.type === "application/vnd.ms-excel"
        ? "application/vnd.ms-excel"
        : file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : ext === "pdf"
        ? "application/pdf"
        : ext === "xls"
        ? "application/vnd.ms-excel"
        : ext === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "";
    const allowedTypes = [
      "application/pdf",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (!contentType || !allowedTypes.includes(contentType)) {
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
    const ref = operacion ? opRef(operacion) : "DOC";
    const fileName = `${ref}_${tipo}_${Date.now()}.${ext === "pdf" || ext === "xls" || ext === "xlsx" ? ext : "pdf"}`;
    const filePath = `${selectedOperacion}/${fileName}`;

    // Nombre único → INSERT puro (upsert exige SELECT/UPDATE y en prod fallaba con 400).
    const { error: uploadError } = await supabase.storage
      .from("documentos")
      .upload(filePath, file, { upsert: false, contentType, cacheControl: "3600" });
    if (uploadError) {
      setError(uploadError.message || "Error al subir el archivo");
      setUploading(null);
      return;
    }

    const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(filePath);
    const existingDoc = documentosPorTipo.get(tipo);
    if (existingDoc && !existingDoc.id.startsWith("__booking_url__")) {
      const marker = "/object/public/documentos/";
      const idx = existingDoc.url.indexOf(marker);
      const oldPath = idx >= 0 ? decodeURIComponent(existingDoc.url.slice(idx + marker.length)) : null;
      if (oldPath) await supabase.storage.from("documentos").remove([oldPath]);
      await supabase.from("documentos").delete().eq("id", existingDoc.id);
    }

    const { error: dbError } = await supabase.from("documentos").insert({
      operacion_id: selectedOperacion,
      tipo,
      nombre_archivo: file.name,
      url: urlData.publicUrl,
      tamano: file.size,
      mime_type: contentType,
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

  const handleToggleNoAplica = async (tipo: TipoNoAplica, value: boolean) => {
    if (!supabase || !selectedOperacion || isCliente) return;
    const col = colNoAplica(tipo);
    setError(null);
    const { error: updateError } = await supabase
      .from("operaciones")
      .update({ [col]: value })
      .eq("id", selectedOperacion);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    const nextOps = operaciones.map((op) =>
      op.id === selectedOperacion ? { ...op, [col]: value } : op,
    );
    setOperaciones(nextOps);
    void reloadCounts(nextOps);
  };

  const handleSelectOperacion = (id: string) => {
    setSelectedOperacion(id);
  };

  const handlePageSizeChange = (value: PageSize) => {
    setPageSize(value);
    setPage(1);
  };

  if (loading) {
    return (
      <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
        <main className="dash-page relative flex min-h-0 flex-1 items-center justify-center p-4" role="main">
          <div className="dash-card flex items-center gap-3 rounded-xl px-5 py-4 text-sm font-medium text-dash-muted">
            <Icon icon="typcn:refresh" className="h-4 w-4 animate-spin text-dash-neon" />
            <span>{tr.loading}</span>
          </div>
        </main>
      </div>
    );
  }

  const hasSelection = !!selectedOperacion && !!operacionActual;
  const progressDenom = Math.max(tiposAplicables, 1);
  const progressPct = tiposAplicables === 0
    ? 100
    : Math.round((docsCompletados / progressDenom) * 100);
  const totalTipos = visibleTipos.length;

  const docsBadge = (opId: string, compacto = false) => {
    const op = operaciones.find((o) => o.id === opId);
    const naCount = countTiposNoAplica(op, visibleTipos);
    const denom = Math.max(totalTipos - naCount, 1);
    const count = docCounts.get(opId) ?? 0;
    const completo = totalTipos - naCount === 0 || count >= denom;
    const pct = totalTipos - naCount === 0
      ? 100
      : Math.min(100, Math.round((count / denom) * 100));
    return (
      <span
        className={`estado-chip inline-flex items-center gap-1 text-base font-extrabold px-2 py-0.5 rounded-sm tabular-nums ${
          completo ? "estado--ok" : count > 0 ? "estado--curso" : "estado--espera"
        }`}
      >
        {count}/{totalTipos - naCount}
        {/* "1/12 (8%)" dice dos veces lo mismo, y en una tarjeta angosta el
            porcentaje le quita sitio a los datos del embarque. */}
        {!compacto && <span className="opacity-70 font-semibold">({pct}%)</span>}
      </span>
    );
  };

  const paginationBar = (
    <div className={`border-t border-dash-border flex flex-col gap-2 bg-dash-control/40 ${hasSelection ? "px-2 py-2" : "px-3 sm:px-4 py-3 sm:flex-row sm:items-center sm:justify-between"}`}>
      <div className={`flex flex-wrap items-center gap-2 text-[13px] sm:text-base text-dash-muted ${hasSelection ? "justify-center" : ""}`}>
        {/* "Ver de a" es una etiqueta de escritorio: en el teléfono los tres
            números al lado del rango ya se explican solos. */}
        {!hasSelection && <span className="hidden font-semibold text-dash-muted sm:inline">{tr.rowsPerPage}</span>}
        <div className="inline-flex rounded-lg border border-dash-border overflow-hidden bg-dash-control">
          {PAGE_SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => handlePageSizeChange(size)}
              className={`font-bold transition-colors ${
                hasSelection ? "px-2 py-1 text-sm" : "px-3 py-1.5 text-[13px] sm:text-base"
              } ${
                pageSize === size
                  ? "bg-dash-neon/25 text-dash-fg border-dash-neon/40"
                  : "text-dash-muted hover:bg-dash-neon/10 hover:text-dash-fg"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
        {!hasSelection && (
          <span className="text-dash-muted tabular-nums text-[12.5px] sm:text-base">
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
          className="inline-flex min-h-10 items-center justify-center gap-1 px-3 py-2 text-[13px] sm:text-base font-semibold rounded-lg border border-dash-border bg-dash-control text-dash-muted hover:bg-dash-neon/15 hover:text-dash-fg disabled:opacity-40 disabled:pointer-events-none transition-colors"
          title={tr.prevPage}
        >
          <Icon icon="lucide:chevron-left" width={16} height={16} />
          {!hasSelection && <span className="max-sm:sr-only">{tr.prevPage}</span>}
        </button>
        <span className="text-[13px] sm:text-base font-bold text-dash-fg tabular-nums px-1.5">
          {hasSelection
            ? `${safePage}/${totalPages}`
            : tr.pageOf.replace("{page}", String(safePage)).replace("{pages}", String(totalPages))}
        </span>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="inline-flex min-h-10 items-center justify-center gap-1 px-3 py-2 text-[13px] sm:text-base font-semibold rounded-lg border border-dash-border bg-dash-control text-dash-muted hover:bg-dash-neon/15 hover:text-dash-fg disabled:opacity-40 disabled:pointer-events-none transition-colors"
          title={tr.nextPage}
        >
          {!hasSelection && <span className="max-sm:sr-only">{tr.nextPage}</span>}
          <Icon icon="lucide:chevron-right" width={16} height={16} />
        </button>
      </div>
    </div>
  );

  /**
   * Tarjeta de un tipo de documento.
   *
   * Era el cuerpo del map que recorría los doce tipos. Se le puso nombre para
   * poder dibujarla dentro de cada grupo: la tarjeta no cambió, cambió quién
   * decide en qué orden y bajo qué título aparece.
   */
  /**
   * Una fila por documento.
   *
   * Antes cada tipo era una tarjeta con su zona de carga desplegada; doce de
   * ellas convertían la pantalla en un formulario largo donde no se veía el
   * conjunto. La fila dice lo único que se consulta de un vistazo —si el
   * documento está y de cuándo es— y guarda las acciones en su menú.
   *
   * Subir sigue a un toque para quien puede: en una fila pendiente, el menú se
   * abre directamente sobre la acción de cargar.
   */
  const renderTipoDocumento = (tipo: TipoDocumento) => {
    const doc = documentosPorTipo.get(tipo);
    const isUploading = uploading === tipo;
    const meta = TIPO_META[tipo];
    const isSyntheticBooking = !!doc && doc.id.startsWith("__booking_url__");
    const tipoLabel = tr.tipoLabels[tipo as keyof typeof tr.tipoLabels] ?? meta.label;
    const marcadoNoAplica = isTipoMarcadoNoAplica(operacionActual, tipo);
    const puedeMarcarNoAplica = !isCliente && isTipoNoAplicaEligible(tipo);
    const menuAbierto = menuTipo === tipo;

    const estadoFila = marcadoNoAplica
      ? { clase: "estado--espera", label: tr.noAplica, icono: "lucide:minus-circle" }
      : doc
        ? { clase: "estado--transito", label: tr.estadoRecibido, icono: "lucide:check-circle" }
        : { clase: "estado--atencion", label: tr.estadoPendienteDoc, icono: "lucide:clock" };

    return (
      <div key={tipo} className={`relative ${estadoFila.clase}`}>
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <Icon
            icon={meta.icon}
            width={17}
            height={17}
            className="shrink-0 text-dash-muted"
            aria-hidden
          />

          <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-dash-fg">
            {tipoLabel}
          </span>

          {/* La fecha del documento, o un guion: la columna no se mueve. */}
          <span className="shrink-0 text-[12px] tabular-nums text-dash-muted max-sm:hidden">
            {doc && !isSyntheticBooking ? formatDate(doc.created_at) : "—"}
          </span>

          <span className="estado-chip inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11.5px] font-bold">
            <Icon icon={estadoFila.icono} width={11} height={11} aria-hidden />
            {estadoFila.label}
          </span>

          <button
            type="button"
            aria-label={tr.acciones}
            aria-expanded={menuAbierto}
            onClick={() => setMenuTipo(menuAbierto ? null : tipo)}
            className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-dash-muted transition-colors hover:bg-dash-neon/15 hover:text-dash-fg"
          >
            <Icon icon={isUploading ? "lucide:loader-2" : "lucide:more-vertical"} width={16} height={16} className={isUploading ? "animate-spin" : ""} aria-hidden />
          </button>
        </div>

        {menuAbierto && (
          <>
            {/* Tocar fuera cierra: en un teléfono no hay dónde “hacer clic al lado”. */}
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              onClick={() => setMenuTipo(null)}
              className="fixed inset-0 z-[60] cursor-default"
            />
            <div className="absolute right-2 top-11 z-[61] w-56 overflow-hidden rounded-xl border border-dash-border bg-dash-surface shadow-xl">
              {doc ? (
                <>
                  <button
                    type="button"
                    onClick={() => { setMenuTipo(null); handlePreview(doc); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-semibold text-dash-fg hover:bg-dash-neon/15"
                  >
                    <Icon icon="lucide:eye" width={15} height={15} aria-hidden />
                    {tr.preview}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMenuTipo(null); handleDownload(doc); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-semibold text-dash-fg hover:bg-dash-neon/15"
                  >
                    <Icon icon="lucide:download" width={15} height={15} aria-hidden />
                    {tr.download}
                  </button>
                  {!isCliente && !isSyntheticBooking && (
                    <label className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-[13px] font-semibold text-dash-fg hover:bg-dash-neon/15">
                      <Icon icon="lucide:refresh-cw" width={15} height={15} aria-hidden />
                      {tr.replace}
                      <input
                        type="file"
                        accept=".pdf,.xls,.xlsx"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUpload(tipo, f);
                          e.target.value = "";
                          setMenuTipo(null);
                        }}
                      />
                    </label>
                  )}
                  {!isCliente && !isSyntheticBooking && (
                    <button
                      type="button"
                      onClick={() => { setMenuTipo(null); handleDelete(doc); }}
                      className="estado--error flex w-full items-center gap-2.5 border-t border-dash-border px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--estado)] hover:bg-[color-mix(in_srgb,var(--estado)_12%,transparent)]"
                    >
                      <Icon icon="lucide:trash-2" width={15} height={15} aria-hidden />
                      {tr.deleteDocument}
                    </button>
                  )}
                </>
              ) : isCliente ? (
                <p className="px-3 py-3 text-[12.5px] text-dash-muted">{tr.noDocument}</p>
              ) : (
                <label className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-[13px] font-semibold text-dash-fg hover:bg-dash-neon/15">
                  <Icon icon="lucide:upload" width={15} height={15} aria-hidden />
                  {tr.uploadFile}
                  <input
                    type="file"
                    accept=".pdf,.xls,.xlsx"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(tipo, f);
                      e.target.value = "";
                      setMenuTipo(null);
                    }}
                  />
                </label>
              )}

              {puedeMarcarNoAplica && (
                <label
                  className="flex w-full cursor-pointer items-center gap-2.5 border-t border-dash-border px-3 py-2.5 text-[13px] font-semibold text-dash-muted hover:bg-dash-neon/15"
                  title={tr.noAplicaHint}
                >
                  <input
                    type="checkbox"
                    checked={marcadoNoAplica}
                    onChange={(e) => { void handleToggleNoAplica(tipo, e.target.checked); setMenuTipo(null); }}
                    className="h-4 w-4 rounded-sm accent-[var(--dash-neon)]"
                  />
                  {tr.noAplica}
                </label>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  /**
   * Estado del viaje de una operación cualquiera.
   *
   * Verde cuando la carga ya navega o llegó, ámbar mientras no zarpa, rojo si
   * se canceló. Son los tres desenlaces que le importan a quien mira la lista;
   * el detalle del estado exacto lo dice la etiqueta.
   */
  const estadoViajeDe = (op: Operacion) => {
    const bruto = (op.estado_operacion ?? "").trim();
    const norm = bruto.toUpperCase();
    const label = bruto ? bruto.charAt(0).toUpperCase() + bruto.slice(1).toLowerCase() : tr.sinEstado;
    if (norm.includes("CANCEL")) return { clase: "estado--error", label, icono: "lucide:x-circle" };
    if (
      norm.includes("ZARP") ||
      norm.includes("TRANS") ||
      norm.includes("NAVEG") ||
      norm.includes("ARRIB") ||
      norm.includes("CERR") ||
      norm.includes("ENTREG")
    ) {
      return { clase: "estado--transito", label, icono: "lucide:ship" };
    }
    return { clase: "estado--atencion", label, icono: "lucide:clock" };
  };

  /** Documentos exigibles de una operación: los visibles menos los "no aplica". */
  const docsExigiblesDe = (opId: string) => {
    const op = operaciones.find((o) => o.id === opId);
    return Math.max(visibleTipos.length - countTiposNoAplica(op, visibleTipos), 0);
  };

  const docsRecibidosDe = (opId: string) => docCounts.get(opId) ?? 0;

  const estadoViaje = (() => {
    const bruto = (operacionActual?.estado_operacion ?? "").trim();
    if (!bruto) return { label: tr.sinEstado, clase: "estado--espera" };
    const norm = bruto.toUpperCase();
    const clase =
      norm.includes("CANCEL")
        ? "estado--error"
        : norm.includes("CERR") || norm.includes("ARRIB") || norm.includes("ENTREG")
          ? "estado--ok"
          : "estado--curso";
    // Se muestra como llega, solo con la primera en mayúscula: inventarle
    // etiquetas propias haría que esta pantalla nombre los estados distinto
    // que el resto del ERP.
    return { label: bruto.charAt(0).toUpperCase() + bruto.slice(1).toLowerCase(), clase };
  })();

  const docsPanel = hasSelection && operacionActual ? (
    <div className="space-y-3">
      <div className={`dash-card rounded-xl overflow-hidden border-2 ${
        progressPct === 100
          ? "border-emerald-400/50 bg-emerald-500/10"
          : "border-dash-neon/40"
      }`}>
        <div className="flex items-start gap-2.5 px-3 py-3 sm:gap-3 sm:px-4 sm:py-3.5">
          {/*
            * Contenedor, no un icono de progreso.
            *
            * Es la cabecera del embarque: lo que identifica es la carga. El
            * avance tiene su propio bloque justo debajo y no necesita decirlo
            * dos veces. El tono sale del estado del viaje.
            */}
          <div
            className={`estado-icono flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${estadoViaje.clase}`}
          >
            <Icon icon="lucide:container" width={24} height={24} aria-hidden />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-2xl font-extrabold leading-none tracking-tight text-dash-fg sm:text-[1.65rem]">
                {opRef(operacionActual)}
              </p>
              <span
                className={`estado-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ${estadoViaje.clase}`}
              >
                <span className="estado-barra h-1.5 w-1.5 rounded-full" />
                {estadoViaje.label}
              </span>
            </div>

            {operacionActual.cliente ? (
              <p className="mt-1 truncate text-sm font-semibold text-dash-muted">
                {operacionActual.cliente}
              </p>
            ) : null}

            {/*
              * Los cuatro datos con los que se reconoce el embarque, sin caja
              * propia: la tarjeta ya es una superficie, y meter otra dentro
              * añade un borde que no separa nada nuevo.
              */}
            <div className="mt-2.5 grid grid-cols-4 gap-x-2 border-t border-dash-border pt-2.5">
              <div className="min-w-0">
                <p className="truncate text-[9.5px] font-semibold text-dash-muted/70">{tr.colBooking}</p>
                <p className="truncate text-[11.5px] font-bold tabular-nums text-dash-fg sm:text-[12px]">{operacionActual.booking || "—"}</p>
              </div>
              <div className="min-w-0 border-l border-dash-border pl-2">
                <p className="truncate text-[9.5px] font-semibold text-dash-muted/70">{tr.colContenedor}</p>
                <p className="truncate text-[11.5px] font-bold tabular-nums text-dash-fg sm:text-[12px]">{operacionActual.contenedor || "—"}</p>
              </div>
              <div className="min-w-0 border-l border-dash-border pl-2">
                <p className="truncate text-[9.5px] font-semibold text-dash-muted/70">{tr.colNaviera}</p>
                <p className="truncate text-[11.5px] font-bold text-dash-fg sm:text-[12px]">{operacionActual.naviera || "—"}</p>
              </div>
              <div className="min-w-0 border-l border-dash-border pl-2">
                <p className="truncate text-[9.5px] font-semibold text-dash-muted/70">{tr.colRuta}</p>
                <p
                  className="truncate text-[11.5px] font-bold text-dash-fg sm:text-[12px]"
                  title={`${operacionActual.pol || "—"} → ${operacionActual.pod || "—"}`}
                >
                  {operacionActual.pol || "—"} → {operacionActual.pod || "—"}
                </p>
              </div>
            </div>
          </div>

          {/*
            * La flecha del mockup, con destino: la ficha del embarque en
            * Seguimiento. Un chevron que no lleva a ninguna parte promete algo
            * que no ocurre.
            */}
          <div className="flex shrink-0 items-center gap-0.5">
            <a
              href={`${withBase("/navitrack")}?op=${encodeURIComponent(opRef(operacionActual))}`}
              title={tr.accionTracking}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-dash-muted transition-colors hover:bg-dash-neon/15 hover:text-dash-fg"
            >
              <Icon icon="lucide:chevron-right" width={20} height={20} aria-hidden />
            </a>
            <button
              type="button"
              onClick={() => setSelectedOperacion("")}
              className="-mr-1 flex h-9 w-9 items-center justify-center rounded-lg text-dash-muted transition-colors hover:bg-dash-neon/15 hover:text-dash-fg"
              title={tr.closeSelection}
            >
              <Icon icon="lucide:x" width={18} height={18} aria-hidden />
            </button>
          </div>
        </div>

        <div className="px-3 pb-3 sm:px-4 sm:pb-3.5">
            <div
              className={`flex items-center gap-3 rounded-xl border border-dash-border bg-dash-control/60 p-3 ${
                docsCompletados > 0 ? "estado--transito" : "estado--espera"
              }`}
            >
              <span className="relative flex h-14 w-14 shrink-0 items-center justify-center" aria-hidden>
                <svg viewBox="0 0 44 44" className="h-14 w-14 -rotate-90">
                  <circle
                    cx="22"
                    cy="22"
                    r="19"
                    fill="none"
                    strokeWidth="5"
                    className="stroke-dash-border"
                  />
                  <circle
                    cx="22"
                    cy="22"
                    r="19"
                    fill="none"
                    strokeWidth="5"
                    strokeLinecap="round"
                    stroke="var(--estado)"
                    strokeDasharray={`${(progressPct / 100) * 2 * Math.PI * 19} ${2 * Math.PI * 19}`}
                    style={{ transition: "stroke-dasharray 500ms var(--dash-ease)" }}
                  />
                </svg>
                <span className="absolute text-[13px] font-extrabold tabular-nums text-dash-fg">
                  {docsCompletados}/{tiposAplicables}
                </span>
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold text-dash-fg">
                  {tr.docsRecibidosTitulo}
                </span>
                <span className="mt-0.5 block text-[12.5px] text-dash-muted">
                  {tr.docsRecibidosDetalle
                    .replace("{recibidos}", String(docsCompletados))
                    .replace("{pendientes}", String(Math.max(tiposAplicables - docsCompletados, 0)))}
                </span>
                <span className="mt-2 block h-2 overflow-hidden rounded-full bg-dash-control">
                  <span
                    className="estado-barra block h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </span>
              </span>
            </div>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-500/15 border border-red-400/35 rounded-xl text-red-300 text-base font-medium flex items-center gap-2">
          <Icon icon="lucide:alert-circle" className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/*
        * Los documentos, por grupos plegables.
        *
        * Doce tarjetas seguidas obligan a recorrerlas todas para saber qué
        * falta; con el contador de cada grupo eso se ve sin abrir nada. Los
        * grupos completos se pliegan solos: lo que ya está no necesita sitio.
        */}
      <div className="space-y-2">
        {GRUPOS_DOCUMENTO.map((grupo) => {
          const tipos = grupo.tipos.filter((t) =>
            (visibleTipos as readonly string[]).includes(t),
          ) as unknown as TipoDocumento[];
          if (tipos.length === 0) return null;

          const exigibles = tipos.filter((t) => !isTipoMarcadoNoAplica(operacionActual, t));
          const recibidos = exigibles.filter((t) => documentosPorTipo.has(t)).length;
          const completo = exigibles.length > 0 && recibidos === exigibles.length;
          const abierto = gruposCerrados[grupo.id] ?? !completo;

          return (
            <section
              key={grupo.id}
              style={{ "--grupo": grupo.tono } as React.CSSProperties}
              className="relative overflow-hidden rounded-xl border border-dash-border bg-dash-surface/60"
            >
              {/* Franja del color de la etapa: identifica el grupo aun plegado. */}
              <span
                className="absolute inset-y-0 left-0 w-1"
                style={{ background: "var(--grupo)" }}
                aria-hidden
              />
              <button
                type="button"
                aria-expanded={abierto}
                onClick={() =>
                  setGruposCerrados((prev) => ({ ...prev, [grupo.id]: !abierto }))
                }
                className="flex w-full items-center gap-2.5 py-2.5 pl-4 pr-3 text-left transition-colors hover:bg-dash-neon/10"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: "color-mix(in srgb, var(--grupo) 16%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--grupo) 40%, transparent)",
                    color: "var(--grupo)",
                  }}
                >
                  <Icon icon={grupo.icon} width={16} height={16} aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-dash-fg">
                  {grupo.label}
                </span>
                {/* Contador en texto: el color ya lo gastó la etapa. */}
                <span className="shrink-0 text-[13px] font-bold tabular-nums text-dash-muted">
                  {recibidos}/{exigibles.length}
                </span>
                <Icon
                  icon="lucide:chevron-down"
                  width={16}
                  height={16}
                  className={`shrink-0 text-dash-muted transition-transform ${abierto ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>

              {abierto && (
                <div className="divide-y divide-dash-border/60 border-t border-dash-border/70">
                  {tipos.map((tipo) => renderTipoDocumento(tipo))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <>
    <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
      <main className="dash-page relative flex min-h-0 flex-1 flex-col overflow-y-auto" role="main">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -right-16 top-10 h-72 w-72 rounded-full bg-dash-neon/20 blur-3xl" />
          <div className="absolute bottom-20 left-1/4 h-64 w-64 rounded-full bg-dash-neon-hot/15 blur-3xl" />
        </div>

        <div className="dash-toolbar relative z-10 shrink-0">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              {/*
                * Volver.
                *
                * Con una operación abierta devuelve a la lista, que es de donde
                * se vino; sin selección, al inicio. Un mismo control con dos
                * destinos según dónde estás, en lugar de una flecha que a veces
                * no lleva a ninguna parte.
                */}
              {hasSelection ? (
                <button
                  type="button"
                  onClick={() => setSelectedOperacion("")}
                  aria-label={tr.backToList}
                  title={tr.backToList}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-dash-muted transition-colors hover:bg-dash-neon/15 hover:text-dash-fg"
                >
                  <Icon icon="lucide:arrow-left" width={20} height={20} aria-hidden />
                </button>
              ) : (
                <a
                  href={withBase("/inicio")}
                  aria-label={tr.backHome}
                  title={tr.backHome}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-dash-muted transition-colors hover:bg-dash-neon/15 hover:text-dash-fg"
                >
                  <Icon icon="lucide:arrow-left" width={20} height={20} aria-hidden />
                </a>
              )}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dash-neon/40 bg-dash-neon/15 shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--dash-neon)_55%,transparent)] max-sm:hidden">
                <Icon icon="lucide:folder-open" width={22} height={22} className="text-dash-neon" aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold tracking-tight text-dash-fg sm:text-xl">{tr.title}</h1>
                <p className="mt-0.5 line-clamp-1 text-xs text-dash-muted sm:text-sm">{tr.subtitle}</p>
              </div>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void fetchOperaciones()}
                className="dash-cta inline-flex items-center gap-1.5 px-4 py-2 text-sm"
                title={tr.updateTooltip}
              >
                <Icon icon="lucide:refresh-cw" width={14} height={14} />
                {tr.updateTooltip}
              </button>
            </div>
          </div>
        </div>

        <div className="relative z-10 min-h-0 w-full flex-1 overflow-hidden p-1.5 sm:p-2.5">
          <div className="flex flex-col lg:flex-row gap-2 h-full min-h-0 w-full">

            {/* Columna operaciones */}
            <div
              className={`flex flex-col min-h-0 min-w-0 transition-all duration-300 ease-out ${
                hasSelection
                  ? "hidden lg:flex lg:w-[280px] xl:w-[300px] lg:shrink-0"
                  : "w-full flex-1"
              }`}
            >
              <div className="dash-card-static flex flex-col min-h-0 h-full w-full rounded-xl border border-dash-border overflow-hidden">
                <div className={`border-b border-dash-border flex flex-wrap items-center gap-2 shrink-0 ${hasSelection ? "px-2 py-2" : "px-3 py-2.5"}`}>
                  <Icon icon="lucide:history" width={hasSelection ? 16 : 18} height={hasSelection ? 16 : 18} className="text-dash-neon shrink-0" />
                  <div className="min-w-0 flex-1 basis-[8rem]">
                    <p className={`font-bold text-dash-fg ${hasSelection ? "text-sm" : "text-base"}`}>{tr.recentMovements}</p>
                    {!hasSelection && (
                      <p className="text-base text-dash-muted truncate hidden sm:block">{tr.selectOperationPrompt}</p>
                    )}
                  </div>
                  {!hasSelection && (
                    <div className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[12rem] sm:max-w-md lg:max-w-xl order-last sm:order-none">
                      <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 text-dash-muted w-4 h-4 pointer-events-none" />
                      <input
                        type="text"
                        placeholder={tr.searchPlaceholderCorto}
                        title={tr.searchPlaceholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="dash-control w-full pl-9 pr-3 py-2 text-sm text-dash-fg border border-dash-border rounded-lg placeholder:text-dash-muted focus:outline-none focus:ring-2 focus:ring-dash-neon/40 focus:border-dash-neon/50"
                      />
                    </div>
                  )}
                  {!hasSelection && (
                    /*
                     * Filtros por avance del papeleo: es la pregunta que trae a
                     * esta pantalla ("¿a cuáles les falta algo?"), y responderla
                     * hoy exige recorrer la lista mirando contadores.
                     *
                     * Se desplazan en horizontal en el teléfono en vez de
                     * apilarse: cuatro chips en dos filas empujan la lista, que
                     * es lo que se vino a ver.
                     */
                    <div className="-mx-1 flex w-full shrink-0 items-center gap-1.5 overflow-x-auto px-1 pb-0.5 md:w-auto md:overflow-visible">
                      {(
                        [
                          ["todos", tr.filtroTodos, ""],
                          ["pendientes", tr.filtroPendientes, "estado--espera"],
                          ["curso", tr.filtroEnCurso, "estado--curso"],
                          ["completos", tr.filtroCompletados, "estado--ok"],
                        ] as const
                      ).map(([clave, etiqueta, punto]) => {
                        const activo = filtroDocs === clave;
                        return (
                          <button
                            key={clave}
                            type="button"
                            aria-pressed={activo}
                            onClick={() => setFiltroDocs(clave)}
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                              activo
                                ? "border-dash-neon/50 bg-dash-neon/20 text-dash-fg"
                                : "border-dash-border bg-dash-control text-dash-muted hover:text-dash-fg"
                            }`}
                          >
                            {punto ? (
                              <span className={`estado-barra h-1.5 w-1.5 rounded-full ${punto}`} aria-hidden />
                            ) : null}
                            {etiqueta}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {hasSelection && (
                    <button
                      type="button"
                      onClick={() => setSelectedOperacion("")}
                      className="shrink-0 p-1.5 text-dash-muted hover:text-dash-fg hover:bg-dash-neon/15 rounded-lg transition-colors"
                      title={tr.expandOperations}
                    >
                      <Icon icon="lucide:panel-left-open" width={16} height={16} />
                    </button>
                  )}
                </div>

                <div className="flex-1 min-h-0 overflow-auto w-full">
                  {/* Lista compacta (selección activa): Ref ASLI, Ref Externa, Booking, Contenedor */}
                  {hasSelection ? (
                    <div className="divide-y divide-dash-border">
                      {pagedOperaciones.length === 0 ? (
                        <div className="py-8 px-3 text-center text-dash-muted text-base">{tr.noOperations}</div>
                      ) : (
                        pagedOperaciones.map((op) => {
                          const isActive = selectedOperacion === op.id;
                          return (
                            <button
                              key={op.id}
                              type="button"
                              onClick={() => handleSelectOperacion(op.id)}
                              className={`w-full text-left px-2.5 py-2.5 transition-all relative ${
                                isActive
                                  ? "bg-dash-neon/15 text-dash-fg ring-1 ring-inset ring-dash-neon/40"
                                  : "hover:bg-dash-neon/10 border-l-[3px] border-l-transparent text-dash-fg"
                              }`}
                            >
                              {isActive && (
                                <span className="absolute inset-y-0 left-0 w-[3px] bg-dash-neon" aria-hidden />
                              )}
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[1.1rem] font-extrabold break-all text-dash-fg">
                                  {opRef(op)}
                                </p>
                                {isActive && (
                                  <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-extrabold uppercase tracking-wide bg-dash-neon/25 text-dash-fg border border-dash-neon/40">
                                    <span className="w-1.5 h-1.5 rounded-full bg-dash-neon animate-pulse" />
                                    {tr.activeOp}
                                  </span>
                                )}
                              </div>
                              <p className="text-[15.4px] font-bold break-all mt-0.5 text-dash-fg/90">
                                {op.referencia_externa || "—"}
                              </p>
                              <p className="text-[15.4px] break-all mt-0.5 text-dash-muted">
                                <span className="text-dash-muted/70">{tr.colBooking}:</span>{" "}
                                {op.booking || "—"}
                              </p>
                              <p className="text-[15.4px] break-all mt-0.5 text-dash-muted">
                                <span className="text-dash-muted/70">{tr.colContenedor}:</span>{" "}
                                {op.contenedor || "—"}
                              </p>
                            </button>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Cards móvil sin selección */}
                      {/*
                        * Tarjetas de la lista, según el mockup aprobado.
                        *
                        * Color por estado del VIAJE, no del papeleo: verde si
                        * la carga va navegando, ámbar si todavía no. Es la
                        * lectura que pidió el negocio para esta lista; el
                        * contador de documentos acompaña con el mismo tono para
                        * que la tarjeta hable de una sola cosa a la vez.
                        *
                        * El borde va completo en vez de una barra al canto: así
                        * cada embarque se lee como una ficha cerrada y no como
                        * filas de una tabla.
                        */}
                      <div className="space-y-2.5 p-2 md:hidden">
                        {pagedOperaciones.length === 0 ? (
                          <div className="py-12 px-4 text-center">
                            <Icon icon="lucide:folder" width={28} height={28} className="text-dash-neon/40 mx-auto mb-2" />
                            <p className="text-dash-muted text-base">{tr.noOperations}</p>
                          </div>
                        ) : (
                          pagedOperaciones.map((op) => {
                            const viaje = estadoViajeDe(op);
                            const abierto = detalleAbierto === op.id;

                            return (
                              <article
                                key={op.id}
                                className={`overflow-hidden rounded-2xl border bg-dash-surface/80 ${viaje.clase} border-[color-mix(in_srgb,var(--estado)_45%,transparent)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--estado)_12%,transparent),0_10px_30px_-18px_color-mix(in_srgb,var(--estado)_60%,transparent)]`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleSelectOperacion(op.id)}
                                  className="flex w-full items-start gap-3 px-3.5 pb-3 pt-3.5 text-left"
                                >
                                  <span className="estado-icono flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
                                    <Icon icon="lucide:container" width={24} height={24} aria-hidden />
                                  </span>

                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[17px] font-extrabold leading-tight text-dash-fg">
                                      {opRef(op)}
                                    </span>
                                    <span className="mt-0.5 block truncate text-[13px] font-semibold text-dash-muted">
                                      {op.cliente || "-"}
                                    </span>

                                    <span className="mt-2 block truncate text-[13.5px] font-bold tabular-nums text-dash-fg">
                                      {[op.contenedor, op.booking].filter(Boolean).join(" · ") || "—"}
                                    </span>
                                    <span className="mt-1 block truncate text-[12.5px] font-semibold text-dash-muted">
                                      {[op.naviera, op.pod].filter(Boolean).join(" · ") || "-"}
                                    </span>
                                    <span className="mt-1.5 flex items-center gap-1.5 text-[12px] text-dash-muted/80">
                                      <Icon icon="lucide:calendar" width={12} height={12} aria-hidden />
                                      {formatDate(op.created_at)}
                                    </span>
                                  </span>

                                  {/* Columna derecha: cuánto papeleo hay, cómo va el viaje, y entrar. */}
                                  <span className="flex shrink-0 flex-col items-end justify-between gap-3 self-stretch">
                                    <span className="estado-chip rounded-lg px-2 py-0.5 text-[12.5px] font-extrabold tabular-nums">
                                      {docsRecibidosDe(op.id)}/{docsExigiblesDe(op.id)}
                                    </span>
                                    <Icon
                                      icon="lucide:chevron-right"
                                      width={18}
                                      height={18}
                                      className="text-dash-muted/60"
                                      aria-hidden
                                    />
                                    <span className="estado-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold">
                                      <Icon icon={viaje.icono} width={12} height={12} aria-hidden />
                                      {viaje.label}
                                    </span>
                                  </span>
                                </button>

                                {abierto && (
                                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-dash-border/70 bg-dash-control/30 px-4 py-3 text-[12px]">
                                    {[
                                      [tr.colRefExterna, op.referencia_externa],
                                      [tr.colNaviera, op.naviera],
                                      [tr.colBooking, op.booking],
                                      [tr.colContenedor, op.contenedor],
                                      [tr.colRuta, [op.pol, op.pod].filter(Boolean).join(" → ")],
                                      [tr.colEtd, op.etd ? formatDate(op.etd) : null],
                                    ].map(([etiqueta, valor]) => (
                                      <div key={String(etiqueta)} className="min-w-0">
                                        <dt className="text-[10.5px] font-semibold text-dash-muted/70">{etiqueta}</dt>
                                        <dd className="truncate font-semibold text-dash-fg/90">{valor || "—"}</dd>
                                      </div>
                                    ))}
                                  </dl>
                                )}

                                <div className="flex items-stretch border-t border-dash-border/70 text-[12px] font-semibold">
                                  <button
                                    type="button"
                                    onClick={() => handleSelectOperacion(op.id)}
                                    className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-dash-fg/85 transition-colors active:bg-dash-neon/15"
                                  >
                                    <Icon icon="lucide:file-text" width={14} height={14} aria-hidden />
                                    {tr.accionDocumentos}
                                    <span className="rounded-md bg-dash-control px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-dash-muted">
                                      {docsExigiblesDe(op.id)}
                                    </span>
                                  </button>
                                  <span className="my-2 w-px bg-dash-border" aria-hidden />
                                  <a
                                    href={`${withBase("/navitrack")}?op=${encodeURIComponent(opRef(op))}`}
                                    className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-dash-fg/85 transition-colors active:bg-dash-neon/15"
                                  >
                                    <Icon icon="lucide:line-chart" width={14} height={14} aria-hidden />
                                    {tr.accionTracking}
                                  </a>
                                  <span className="my-2 w-px bg-dash-border" aria-hidden />
                                  <button
                                    type="button"
                                    aria-expanded={abierto}
                                    onClick={() => setDetalleAbierto(abierto ? null : op.id)}
                                    className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-dash-fg/85 transition-colors active:bg-dash-neon/15"
                                  >
                                    <Icon
                                      icon={abierto ? "lucide:chevron-up" : "lucide:info"}
                                      width={14}
                                      height={14}
                                      aria-hidden
                                    />
                                    {tr.accionDetalles}
                                  </button>
                                </div>
                              </article>
                            );
                          })
                        )}
                      </div>

                      {/* Tabla completa desktop — ancho completo */}
                      <div className="hidden md:block w-full overflow-x-auto">
                        <table className="w-full table-fixed text-left text-base">
                          <colgroup>
                            <col className="w-[8%]" />
                            <col className="w-[11%]" />
                            <col className="w-[13%]" />
                            <col className="w-[11%]" />
                            <col className="w-[12%]" />
                            <col className="w-[12%]" />
                            <col className="w-[10%]" />
                            <col className="w-[9%]" />
                            <col className="w-[7%]" />
                            <col className="w-[7%]" />
                          </colgroup>
                          <thead>
                            <tr className="bg-[color-mix(in_srgb,var(--dash-control)_92%,transparent)] border-b border-dash-border">
                              <th className="px-3 py-2.5 text-sm font-bold text-dash-muted">{tr.colRef}</th>
                              <th className="px-3 py-2.5 text-sm font-bold text-dash-muted">{tr.colRefExterna}</th>
                              <th className="px-3 py-2.5 text-sm font-bold text-dash-muted">{tr.colCliente}</th>
                              <th className="px-3 py-2.5 text-sm font-bold text-dash-muted">{tr.colNaviera}</th>
                              <th className="px-3 py-2.5 text-sm font-bold text-dash-muted">{tr.colBooking}</th>
                              <th className="px-3 py-2.5 text-sm font-bold text-dash-muted">{tr.colContenedor}</th>
                              <th className="px-3 py-2.5 text-sm font-bold text-dash-muted">{tr.colPod}</th>
                              <th className="px-3 py-2.5 text-sm font-bold text-dash-muted">{tr.colEtd}</th>
                              <th className="px-3 py-2.5 text-sm font-bold text-dash-muted">{tr.colDocs}</th>
                              <th className="px-3 py-2.5 text-sm font-bold text-dash-muted">{tr.colDate}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-dash-border">
                            {pagedOperaciones.length === 0 ? (
                              <tr>
                                <td colSpan={10} className="px-4 py-12 text-center text-dash-muted text-base">
                                  {tr.noOperations}
                                </td>
                              </tr>
                            ) : (
                              pagedOperaciones.map((op, idx) => (
                                <tr
                                  key={op.id}
                                  onClick={() => handleSelectOperacion(op.id)}
                                  className={`cursor-pointer transition-colors ${
                                    idx % 2 === 0
                                      ? "bg-transparent hover:bg-dash-neon/10"
                                      : "bg-dash-control/30 hover:bg-dash-neon/10"
                                  }`}
                                >
                                  <td className="px-3 py-2.5 text-[1.1rem] font-bold truncate text-dash-fg">{opRef(op)}</td>
                                  <td className="px-3 py-2.5 text-[1.1rem] font-bold truncate text-dash-fg">{op.referencia_externa || "—"}</td>
                                  <td className="px-3 py-2.5 text-dash-fg/80 truncate">{op.cliente || "-"}</td>
                                  <td className="px-3 py-2.5 text-dash-muted truncate">{op.naviera || "-"}</td>
                                  <td className="px-3 py-2.5 text-dash-muted truncate">{op.booking || "-"}</td>
                                  <td className="px-3 py-2.5 text-dash-muted truncate font-mono">{op.contenedor || "-"}</td>
                                  <td className="px-3 py-2.5 text-dash-muted truncate">{op.pod || "-"}</td>
                                  <td className="px-3 py-2.5 text-dash-muted truncate">{formatDate(op.etd)}</td>
                                  <td className="px-3 py-2.5">{docsBadge(op.id)}</td>
                                  <td className="px-3 py-2.5 text-dash-muted truncate">{formatDate(op.created_at)}</td>
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
            className="dash-neon fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            data-theme={theme}
            onClick={closePreview}
          >
            <div
              className="dash-card motion-enter-lift rounded-2xl w-full h-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-[3px] bg-gradient-to-r from-dash-neon to-dash-neon-hot flex-shrink-0" />
              <div className="flex items-center justify-between px-5 py-3 border-b border-dash-border flex-shrink-0 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-lg bg-dash-neon/15 border border-dash-neon/35 flex items-center justify-center flex-shrink-0">
                    <Icon
                      icon={isPdf(previewDoc.mime_type) ? "lucide:file-text" : "lucide:file-spreadsheet"}
                      className={`w-4 h-4 ${isPdf(previewDoc.mime_type) ? "text-red-400" : "text-emerald-300"}`}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-dash-fg text-base truncate">{previewDoc.nombre_archivo}</p>
                    <p className="text-base text-dash-muted">
                      {formatFileSize(previewDoc.tamano)} · {formatDate(previewDoc.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownload(previewDoc)}
                    className="dash-cta inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm"
                  >
                    <Icon icon="lucide:download" className="w-3.5 h-3.5" />
                    {tr.download}
                  </button>
                  <button
                    type="button"
                    onClick={closePreview}
                    className="p-2 text-dash-muted hover:text-dash-fg hover:bg-dash-neon/15 rounded-lg transition-colors"
                  >
                    <Icon icon="lucide:x" className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden bg-dash-control/50">
                {isPdf(previewDoc.mime_type) ? (
                  <iframe
                    src={`${previewDoc.url}#toolbar=1&navpanes=0`}
                    className="w-full h-full border-0"
                    title={previewDoc.nombre_archivo}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <span className="w-16 h-16 rounded-lg bg-dash-control border border-dash-border flex items-center justify-center">
                      <Icon icon="lucide:file-spreadsheet" className="w-8 h-8 text-dash-muted" />
                    </span>
                    <p className="text-dash-fg font-medium text-base">{tr.excelPreviewNotAvailable}</p>
                    <p className="text-dash-muted text-base">{tr.downloadToView}</p>
                    <button
                      type="button"
                      onClick={() => handleDownload(previewDoc)}
                      className="dash-cta inline-flex items-center gap-2 px-5 py-2.5 text-sm"
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
    </div>
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
