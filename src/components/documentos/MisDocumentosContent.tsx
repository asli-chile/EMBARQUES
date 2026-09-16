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
  eta: string | null;
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
    /* Sin color propio: en el ERP el color significa estado, no categoría. El
       grupo se identifica por su nombre y su contador. */
    tipos: ["BOOKING", "FACTURA_PROFORMA", "FACTURA_COMERCIAL", "PACKING_LIST"],
  },
  {
    id: "origen",
    label: "Origen",
    icon: "lucide:stamp",
    tipos: ["CERTIFICADO_ORIGEN", "CERTIFICADO_FITOSANITARIO", "DUS"],
  },
  {
    id: "transporte",
    label: "Transporte y Nave",
    icon: "lucide:ship",
    tipos: ["INSTRUCTIVO_EMBARQUE", "BL_TELEX_SWB_AWB", "FACTURA_GATE_OUT"],
  },
  {
    id: "cierre",
    label: "Cierre",
    icon: "lucide:flag",
    tipos: ["FULLSET"],
  },
] as const;

/**
 * Tipos retirados de la pantalla.
 *
 * Se filtran en vez de borrarlos del catálogo: la columna y el histórico siguen
 * en la base, así que reponerlos es quitar una línea de acá.
 */
const TIPOS_FUERA: readonly string[] = ["SOLICITUD_RESERVA"];

/** Etapa a la que pertenece un documento, para etiquetarlo fuera de su grupo. */
function grupoDeTipo(tipo: string) {
  return GRUPOS_DOCUMENTO.find((g) => (g.tipos as readonly string[]).includes(tipo)) ?? null;
}

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
   * Los tipos visibles, memorizados.
   *
   * No es una optimización: de esta lista cuelgan un Set, las funciones de
   * carga y los efectos que llaman a setState. Si se recalcula en cada render
   * —y `.filter()` devuelve un array nuevo siempre— esa cadena se dispara sola
   * y React corta con "Maximum update depth exceeded". Antes funcionaba porque
   * era la constante tal cual, que no cambia de referencia.
   */
  const visibleTipos = useMemo(
    () => (isCliente ? TIPOS_DOCUMENTO_CLIENTE : TIPOS_DOCUMENTO).filter(
      (t) => !TIPOS_FUERA.includes(t),
    ),
    [isCliente],
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

  /** Etapa que se está mirando en la ficha del embarque. */
  const [etapaActiva, setEtapaActiva] = useState<string>("todos");

  /**
   * Lista lateral plegada.
   *
   * Es para revisar un embarque con toda la pantalla; la operación abierta no
   * se toca. Al cerrar la operación se despliega sola: plegada y sin ficha al
   * lado, la pantalla quedaría vacía.
   */
  const [listaColapsada, setListaColapsada] = useState(false);
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
      "id, ref_asli, referencia_externa, correlativo, cliente, naviera, booking, contenedor, pol, pod, etd, eta, estado_operacion, booking_doc_url, created_at";
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
        eta: (r.eta as string | null) ?? null,
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

  /**
   * Cuántas operaciones hay en cada estado de papeleo.
   *
   * Es la fila de indicadores de escritorio. Se calcula sobre TODAS las
   * operaciones, no sobre las filtradas: un indicador que cambia al filtrar
   * deja de ser un total y se vuelve un eco de lo que ya se ve en la tabla.
   */
  const resumenDocs = useMemo(() => {
    let completas = 0;
    let curso = 0;
    let pendientes = 0;
    for (const op of operaciones) {
      const e = estadoDocsDe(op.id);
      if (e === "completo") completas += 1;
      else if (e === "curso") curso += 1;
      else pendientes += 1;
    }
    const pct = (n: number) =>
      operaciones.length === 0 ? 0 : Math.round((n / operaciones.length) * 100);
    return {
      total: operaciones.length,
      completas,
      curso,
      pendientes,
      pctCompletas: pct(completas),
      pctCurso: pct(curso),
      pctPendientes: pct(pendientes),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operaciones, docCounts, visibleTipos]);

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
    if (!id) setListaColapsada(false);
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
        {(
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
        {/*
          * Páginas numeradas.
          *
          * "Página 3 de 5" obliga a pulsar Siguiente dos veces para llegar a la
          * cinco. Con pocas caben todas; con muchas se muestra una ventana
          * alrededor de la actual, que es lo que hace falta para moverse sin
          * perder de vista dónde se está.
          *
          * Con el panel de una operación abierto la columna es angosta y vuelve
          * la fracción, que ocupa lo que hay.
          */}
        {(
          <span className="flex items-center gap-1">
            {(() => {
              const ventana = 5;
              const hasta = Math.min(totalPages, Math.max(ventana, safePage + Math.floor(ventana / 2)));
              const desde = Math.max(1, Math.min(safePage - Math.floor(ventana / 2), hasta - ventana + 1));
              const paginas: number[] = [];
              for (let n = Math.max(1, desde); n <= hasta; n += 1) paginas.push(n);
              return paginas.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  aria-current={n === safePage ? "page" : undefined}
                  className={`min-h-9 min-w-9 rounded-lg px-2 text-[13px] font-bold tabular-nums transition-colors ${
                    n === safePage
                      ? "bg-dash-neon/25 text-dash-fg ring-1 ring-dash-neon/40"
                      : "text-dash-muted hover:bg-dash-neon/10 hover:text-dash-fg"
                  }`}
                >
                  {n}
                </button>
              ));
            })()}
          </span>
        )}
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
        <div className="flex items-center gap-3 px-3.5 py-2.5 sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_9rem] lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_9rem]">
          <span className="flex min-w-0 flex-1 items-center gap-2.5 sm:flex-none">
            {/*
              * Un solo icono para todos.
              *
              * Cada tipo tenía el suyo —barco, hoja, globo— y a tamaño de fila
              * no se distinguen: parecían ruido de colores distintos delante de
              * un nombre que ya dice qué es. Lo que sí hay que distinguir de un
              * vistazo es el estado, y ese tiene su chip.
              */}
            <Icon
              icon="lucide:file-text"
              width={16}
              height={16}
              className="shrink-0 text-dash-muted/70"
              aria-hidden
            />
            <span className="min-w-0 truncate text-[14px] font-semibold text-dash-fg">
              {tipoLabel}
            </span>
          </span>

          {/*
            * Etapa del documento.
            *
            * En la lista plana hace falta: sin el grupo alrededor, nada diría a
            * qué momento del embarque pertenece cada papel. En pantalla angosta
            * se calla, porque ahí la pestaña activa ya lo dice.
            */}
          <span className="estado-chip inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold">
            <Icon icon={estadoFila.icono} width={12} height={12} aria-hidden />
            {estadoFila.label}
          </span>

          {/*
            * Chip neutro, no un color por etapa.
            *
            * En el ERP el color significa **estado**: los tokens `--estado-*` y
            * el acento, y nada más. La etapa es una categoría, no un estado, y
            * pintarla con un tono propio metía una cuarta familia de colores
            * que no existe en ninguna otra pantalla. Además compite con el chip
            * de estado que va justo al lado, en la misma fila.
            *
            * El nombre de la etapa ya la identifica; el color sobraba.
            */}
          {grupoDeTipo(tipo) ? (
            <span className="hidden w-fit items-center gap-1.5 rounded-full border border-dash-border bg-dash-control/60 px-2 py-0.5 text-[11.5px] font-bold text-dash-muted lg:inline-flex">
              {grupoDeTipo(tipo)!.label}
            </span>
          ) : (
            <span className="hidden lg:block" aria-hidden />
          )}

          {/*
            * Fecha de recepción.
            *
            * El booking que llega con la operación no tiene fila propia en
            * documentos, así que se mostraba con un guion aunque el archivo
            * esté: su fecha conocida es la del embarque, y es la que vale como
            * "cuándo llegó este papel".
            */}
          <span className="truncate text-[12px] tabular-nums text-dash-muted max-sm:hidden">
            {doc
              ? formatDate(isSyntheticBooking ? operacionActual?.created_at ?? null : doc.created_at)
              : "—"}
          </span>

          {/*
            * Acciones a la vista, no dentro de un menú.
            *
            * En escritorio sobra ancho y lo que se hace con un documento es
            * siempre lo mismo: verlo, bajarlo o subirlo. Tenerlas escondidas
            * tras tres puntos cobraba dos toques por cada archivo. El menú se
            * queda con lo que no es de todos los días —reemplazar, eliminar,
            * marcar no aplica— y con el teléfono, donde no cabe una barra.
            */}
          <span className="flex shrink-0 items-center justify-end gap-1">
            {doc ? (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handlePreview(doc); }}
                  title={tr.preview}
                  className="hidden h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-dash-neon/50 bg-dash-neon/25 px-3 text-[12.5px] font-bold text-dash-fg transition-colors hover:bg-dash-neon/40 sm:inline-flex"
                >
                  <Icon icon="lucide:eye" width={15} height={15} aria-hidden />
                  {tr.accionVer}
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                  title={tr.download}
                  className="estado--transito hidden h-9 w-9 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--estado)_55%,transparent)] bg-[color-mix(in_srgb,var(--estado)_22%,transparent)] text-[var(--estado)] transition-colors hover:bg-[color-mix(in_srgb,var(--estado)_35%,transparent)] sm:inline-flex"
                >
                  <Icon icon="lucide:download" width={15} height={15} aria-hidden />
                </button>
              </>
            ) : !isCliente && !marcadoNoAplica ? (
              <label
                title={tr.uploadFile}
                className="hidden h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-dash-neon/40 bg-dash-neon/12 px-3 text-[12.5px] font-bold text-dash-fg transition-colors hover:bg-dash-neon/25 sm:inline-flex"
              >
                <Icon
                  icon={isUploading ? "lucide:loader-2" : "lucide:upload"}
                  width={14}
                  height={14}
                  className={isUploading ? "animate-spin" : ""}
                  aria-hidden
                />
                {isUploading ? tr.uploading : tr.accionSubir}
                <input
                  type="file"
                  accept=".pdf,.xls,.xlsx"
                  className="hidden"
                  disabled={isUploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(tipo, f);
                    e.target.value = "";
                  }}
                />
              </label>
            ) : null}

            <button
              type="button"
              aria-label={tr.acciones}
              aria-expanded={menuAbierto}
              onClick={() => setMenuTipo(menuAbierto ? null : tipo)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-dash-border bg-dash-control text-dash-muted transition-colors hover:bg-dash-neon/15 hover:text-dash-fg"
            >
              <Icon
                icon={isUploading ? "lucide:loader-2" : "lucide:more-horizontal"}
                width={16}
                height={16}
                className={isUploading ? "animate-spin" : ""}
                aria-hidden
              />
            </button>
          </span>
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
        {/*
          * Banner del embarque.
          *
          * Dos zonas: quién es a la izquierda, cómo va su papeleo a la derecha.
          * En pantalla ancha conviven en una línea; bajo lg el avance baja,
          * porque partir seis datos y un anillo en 380 px no deja leer ninguno.
          */}
        <div className="flex flex-col gap-3 px-3 py-3 sm:px-4 sm:py-3.5 lg:flex-row lg:items-center lg:gap-6">
          <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:gap-3">
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
                <p className="mt-1 truncate text-sm font-bold text-dash-neon">
                  {operacionActual.cliente}
                </p>
              ) : null}

              {/* Los seis datos del embarque, en una sola fila cuando cabe. */}
              <div className="mt-2.5 grid grid-cols-3 gap-x-3 gap-y-2.5 border-t border-dash-border pt-2.5 sm:grid-cols-6">
                {(
                  [
                    [tr.colBooking, operacionActual.booking],
                    [tr.colContenedor, operacionActual.contenedor],
                    [tr.colNaviera, operacionActual.naviera],
                    [
                      tr.colRuta,
                      [operacionActual.pol, operacionActual.pod].filter(Boolean).join(" → "),
                    ],
                    [tr.colEtd, operacionActual.etd ? formatDate(operacionActual.etd) : null],
                    [tr.colEta, operacionActual.eta ? formatDate(operacionActual.eta) : null],
                  ] as [string, string | null][]
                ).map(([etiqueta, valor]) => (
                  <div key={etiqueta} className="min-w-0">
                    <p className="truncate text-[9.5px] font-semibold text-dash-muted/70">{etiqueta}</p>
                    <p className="truncate text-[11.5px] font-bold text-dash-fg sm:text-[12px]" title={valor ?? undefined}>
                      {valor || "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Avance del papeleo. */}
          <div
            className={`flex shrink-0 items-center gap-3 lg:w-[22rem] ${
              docsCompletados > 0 ? "estado--transito" : "estado--espera"
            }`}
          >
            <span className="relative flex h-16 w-16 shrink-0 items-center justify-center" aria-hidden>
              <svg viewBox="0 0 44 44" className="h-16 w-16 -rotate-90">
                <circle cx="22" cy="22" r="19" fill="none" strokeWidth="5" className="stroke-dash-border" />
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
              <span className="absolute text-[14px] font-extrabold tabular-nums text-dash-fg">
                {docsCompletados}/{tiposAplicables}
              </span>
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-bold text-dash-fg">{tr.docsRecibidosTitulo}</span>
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

              {/*
                * Leyenda: solo los estados que el sistema distingue de verdad.
                *
                * La referencia incluye "En revisión" y "Observados"; no existen
                * como dato, así que aparecerían clavados en cero para siempre y
                * prometerían un seguimiento que nadie puede llevar.
                */}
              <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold">
                <span className="estado--transito inline-flex items-center gap-1.5 text-dash-muted">
                  <span className="estado-barra h-2 w-2 rounded-full" />
                  {docsCompletados} {tr.estadoRecibido}
                </span>
                <span className="estado--atencion inline-flex items-center gap-1.5 text-dash-muted">
                  <span className="estado-barra h-2 w-2 rounded-full" />
                  {Math.max(tiposAplicables - docsCompletados, 0)} {tr.estadoPendienteDoc}
                </span>
                {visibleTipos.length - tiposAplicables > 0 && (
                  <span className="estado--espera inline-flex items-center gap-1.5 text-dash-muted">
                    <span className="estado-barra h-2 w-2 rounded-full" />
                    {visibleTipos.length - tiposAplicables} {tr.noAplica}
                  </span>
                )}
              </span>
            </span>
          </div>

          <div className="flex shrink-0 items-start gap-0.5 max-lg:absolute max-lg:right-3 max-lg:top-3">
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
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-500/15 border border-red-400/35 rounded-xl text-red-300 text-base font-medium flex items-center gap-2">
          <Icon icon="lucide:alert-circle" className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/*
        * Pestañas por etapa y lista plana.
        *
        * Los grupos plegables obligaban a abrir y cerrar para comparar; con
        * pestañas se ve una etapa completa de una vez y "Todos" sigue dando la
        * vista entera, que es como se revisa antes de cerrar un embarque.
        *
        * El contador de cada pestaña es lo que antes decía la cabecera del
        * grupo: cuántos hay y cuántos faltan sin entrar.
        */}
      <div className="flex flex-wrap items-center gap-1.5">
        {([
          { id: "todos", label: tr.filtroTodos, tipos: null },
          ...GRUPOS_DOCUMENTO.map((g) => ({
            id: g.id as string,
            label: g.label as string,
            tipos: g.tipos as readonly string[] | null,
          })),
        ] as { id: string; label: string; tipos: readonly string[] | null }[])
          .map((tab) => {
            const tipos = (tab.tipos ?? visibleTipos).filter((t) =>
              (visibleTipos as readonly string[]).includes(t),
            );
            if (tipos.length === 0) return null;
            const activa = etapaActiva === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={activa}
                onClick={() => setEtapaActiva(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-bold transition-colors ${
                  activa
                    ? "border-dash-neon/50 bg-dash-neon/20 text-dash-fg"
                    : "border-dash-border bg-dash-control/50 text-dash-muted hover:text-dash-fg"
                }`}
              >
                {/*
                  * El punto toma el acento cuando la pestaña está activa y se
                  * apaga cuando no, igual que las pestañas del resto del ERP
                  * (`nt-tab`). Antes llevaba el color de la etapa: cuatro
                  * colores fijos que no cambiaban nada al seleccionar, así que
                  * no decían qué estaba activo y sí desentonaban.
                  */}
                <span
                  className={`h-2 w-2 rounded-full ${activa ? "bg-dash-neon" : "bg-dash-muted/45"}`}
                  aria-hidden
                />
                {tab.label}
                <span className="text-[12px] font-semibold tabular-nums opacity-70">
                  ({tipos.length})
                </span>
              </button>
            );
          })}
      </div>

      <div className="overflow-hidden rounded-xl border border-dash-border bg-dash-surface/40">
        {/* Cabecera de columnas: solo donde hay ancho para que signifiquen algo. */}
        {/*
          * Rejilla, no flex.
          *
          * Con `flex-1` el nombre del documento se quedaba con todo el espacio
          * sobrante y empujaba etapa, fecha y estado contra el borde derecho,
          * dejando un vacío en medio. En una rejilla de proporciones el sobrante
          * se reparte entre las columnas y cada dato cae donde su cabecera dice.
          */}
        <div className="hidden items-center gap-3 border-b border-dash-border px-3.5 py-2.5 text-[11.5px] font-bold uppercase tracking-wide text-dash-muted/70 sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_9rem] lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_9rem]">
          <span className="min-w-0">{tr.colDocumento}</span>
          <span className="min-w-0">{tr.colEstado}</span>
          <span className="hidden min-w-0 lg:block">{tr.colEtapa}</span>
          <span className="min-w-0">{tr.colFechaRecepcion}</span>
          <span className="sr-only">{tr.acciones}</span>
        </div>

        {/*
          * En "Todos", las filas se agrupan por etapa con su encabezado.
          *
          * Once documentos seguidos se leen como una lista sin forma: la
          * etiqueta de cada fila dice a qué etapa pertenece, pero hay que
          * leerlas una por una para reconstruir el conjunto. Con el encabezado
          * y su cuenta, el reparto se ve sin leer ninguna.
          *
          * Dentro de una pestaña concreta no hace falta: ahí todas son de la
          * misma etapa y el encabezado sería repetir el nombre de la pestaña.
          */}
        {etapaActiva === "todos" ? (
          GRUPOS_DOCUMENTO.map((grupo) => {
            const tipos = (grupo.tipos as readonly string[]).filter((t) =>
              (visibleTipos as readonly string[]).includes(t),
            );
            if (tipos.length === 0) return null;
            const recibidos = tipos.filter(
              (t) => documentosPorTipo.has(t as TipoDocumento) && !isTipoMarcadoNoAplica(operacionActual, t),
            ).length;
            const exigibles = tipos.filter((t) => !isTipoMarcadoNoAplica(operacionActual, t)).length;

            return (
              /*
               * Los grupos se separan con una línea, sin encabezado.
               *
               * La etiqueta de etapa va en cada fila, así que un título encima
               * repetía la misma palabra cuatro veces seguidas y sumaba una
               * línea por grupo. La línea basta para que el bloque se lea como
               * bloque, y la lista queda del alto que cabe en pantalla.
               *
               * El contador de cada etapa no se pierde: vive en su pestaña.
               */
              <div
                key={grupo.id}
                /*
                 * El separador se distingue por grosor, no por color.
                 *
                 * Una línea fina y neutra se perdía entre las divisiones de
                 * fila, que son del mismo gris, y había que contar para saber
                 * dónde termina un grupo. Se resolvía con el color de la etapa,
                 * pero eso traía a la tabla una familia de colores que el ERP
                 * no usa para categorías. Tres píxeles del borde de siempre
                 * separan igual de bien y no inventan un código de color.
                 */
                className="divide-y divide-dash-border/60 border-t-[3px] border-t-dash-border first:border-t-0"
                aria-label={`${grupo.label}: ${recibidos}/${exigibles}`}
              >
                {tipos.map((tipo) => renderTipoDocumento(tipo as TipoDocumento))}
              </div>
            );
          })
        ) : (
          <div className="divide-y divide-dash-border/60">
            {((GRUPOS_DOCUMENTO.find((g) => g.id === etapaActiva)?.tipos ?? []) as readonly string[])
              .filter((t) => (visibleTipos as readonly string[]).includes(t))
              .map((tipo) => renderTipoDocumento(tipo as TipoDocumento))}
          </div>
        )}
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
                  ? listaColapsada
                    ? "hidden lg:flex lg:w-[3.25rem] lg:shrink-0"
                    : "hidden lg:flex lg:w-[330px] xl:w-[350px] lg:shrink-0"
                  : "w-full flex-1"
              }`}
            >
              {hasSelection && listaColapsada ? (
                <div className="dash-card-static flex h-full w-full flex-col items-center gap-2 rounded-xl border border-dash-border py-2.5">
                  <button
                    type="button"
                    onClick={() => setListaColapsada(false)}
                    title={tr.expandOperations}
                    aria-label={tr.expandOperations}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-dash-muted transition-colors hover:bg-dash-neon/15 hover:text-dash-fg"
                  >
                    <Icon icon="lucide:panel-left-open" width={18} height={18} aria-hidden />
                  </button>
                  {/* Cuántas operaciones esperan al otro lado, sin abrir la lista. */}
                  <span className="rounded-md bg-dash-control px-1.5 py-1 text-[11px] font-bold tabular-nums text-dash-muted">
                    {filteredOperaciones.length}
                  </span>
                </div>
              ) : (
              <div className="dash-card-static flex flex-col min-h-0 h-full w-full rounded-xl border border-dash-border overflow-hidden">
                {/*
                  * Indicadores de escritorio.
                  *
                  * En una pantalla ancha sobra sitio arriba y la pregunta que
                  * se hace primero es cuánto falta en total, no de un embarque.
                  * Cada uno filtra la tabla: son el mismo criterio que los chips
                  * del teléfono, con otra forma.
                  *
                  * No están en móvil: ahí ese alto es la lista.
                  */}
                {!hasSelection && (
                  <div className="hidden shrink-0 gap-2.5 border-b border-dash-border p-2.5 md:grid md:grid-cols-4 xl:gap-3">
                    {(
                      [
                        { clave: "todos" as const, label: tr.kpiTotal, valor: resumenDocs.total, pct: null, tono: "estado--curso", icon: "lucide:files" },
                        { clave: "completos" as const, label: tr.filtroCompletados, valor: resumenDocs.completas, pct: resumenDocs.pctCompletas, tono: "estado--transito", icon: "lucide:check-circle" },
                        { clave: "curso" as const, label: tr.filtroEnCurso, valor: resumenDocs.curso, pct: resumenDocs.pctCurso, tono: "estado--curso", icon: "lucide:clock" },
                        { clave: "pendientes" as const, label: tr.filtroPendientes, valor: resumenDocs.pendientes, pct: resumenDocs.pctPendientes, tono: "estado--atencion", icon: "lucide:alert-circle" },
                      ]
                    ).map((k) => {
                      const activo = filtroDocs === k.clave;
                      return (
                        <button
                          key={k.clave}
                          type="button"
                          aria-pressed={activo}
                          onClick={() => setFiltroDocs(k.clave)}
                          className={`${k.tono} flex items-center gap-3 rounded-xl border bg-dash-control/40 px-3.5 py-3 text-left transition-colors hover:bg-dash-neon/10 ${
                            activo
                              ? "border-[color-mix(in_srgb,var(--estado)_55%,transparent)] bg-[color-mix(in_srgb,var(--estado)_10%,transparent)]"
                              : "border-dash-border"
                          }`}
                        >
                          <span className="estado-icono flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                            <Icon icon={k.icon} width={20} height={20} aria-hidden />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[12.5px] font-semibold text-dash-muted">
                              {k.label}
                            </span>
                            <span className="flex items-baseline gap-1.5">
                              <span className="text-[22px] font-extrabold leading-none tabular-nums text-dash-fg">
                                {k.valor}
                              </span>
                              {k.pct !== null && (
                                <span className="text-[12px] font-semibold tabular-nums text-dash-muted">
                                  {k.pct}%
                                </span>
                              )}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/*
                  * Cabecera de la lista en dos líneas.
                  *
                  * Antes el título, el buscador, los filtros y el botón de
                  * plegar compartían una fila que se desbordaba, así que el
                  * botón terminaba solo debajo de los filtros, lejos de lo que
                  * controla. Arriba va lo que identifica la lista y su control;
                  * abajo, con qué se acota.
                  */}
                <div className={`shrink-0 border-b border-dash-border ${hasSelection ? "px-2.5 py-2.5" : "px-3 py-2.5"}`}>
                  <div className="flex items-center gap-2">
                    <Icon
                      icon="lucide:history"
                      width={hasSelection ? 16 : 18}
                      height={hasSelection ? 16 : 18}
                      className="shrink-0 text-dash-neon"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`font-bold text-dash-fg ${hasSelection ? "text-[13.5px]" : "text-base"}`}>
                        {tr.recentMovements}
                      </p>
                      {!hasSelection && (
                        <p className="hidden truncate text-base text-dash-muted sm:block">
                          {tr.selectOperationPrompt}
                        </p>
                      )}
                    </div>

                    {hasSelection && (
                      /*
                       * Plegar la lista, no cerrar la operación.
                       *
                       * Este botón decía "Ampliar operaciones" y ejecutaba
                       * setSelectedOperacion(""): devolvía a la lista y perdía
                       * el embarque abierto. Lo que promete —y ahora hace— es
                       * darle toda la pantalla a los documentos.
                       */
                      <button
                        type="button"
                        onClick={() => setListaColapsada(true)}
                        className="shrink-0 rounded-lg p-1.5 text-dash-muted transition-colors hover:bg-dash-neon/15 hover:text-dash-fg"
                        title={tr.colapsarLista}
                        aria-label={tr.colapsarLista}
                      >
                        <Icon icon="lucide:panel-left-close" width={16} height={16} aria-hidden />
                      </button>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                  {!hasSelection && (
                    <div className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[12rem] sm:max-w-md lg:max-w-xl">
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
                  {(
                    /*
                     * Filtros por avance del papeleo: es la pregunta que trae a
                     * esta pantalla ("¿a cuáles les falta algo?"), y responderla
                     * hoy exige recorrer la lista mirando contadores.
                     *
                     * Se desplazan en horizontal en el teléfono en vez de
                     * apilarse: cuatro chips en dos filas empujan la lista, que
                     * es lo que se vino a ver.
                     */
                    /*
                      * El relleno vertical no es estético: un contenedor con
                      * overflow recorta lo que sobresale, y el borde y el anillo
                      * del chip activo sobresalen. Sin este aire se veían
                      * cortados por arriba y por abajo.
                      */
                    <div className="-mx-1 flex w-full shrink-0 items-center gap-1.5 overflow-x-auto px-1 py-1 md:w-auto md:overflow-visible">
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
                            {/* La cuenta de cada filtro: sin ella hay que
                                probarlos uno por uno para saber si traen algo. */}
                            <span className="rounded-md bg-dash-control px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-dash-muted">
                              {clave === "todos"
                                ? resumenDocs.total
                                : clave === "completos"
                                  ? resumenDocs.completas
                                  : clave === "curso"
                                    ? resumenDocs.curso
                                    : resumenDocs.pendientes}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-auto w-full">
                  {/* Lista compacta (selección activa): Ref ASLI, Ref Externa, Booking, Contenedor */}
                  {hasSelection ? (
                    /*
                     * Lista de al lado, con una operación abierta.
                     *
                     * Antes repetía los mismos campos que la tabla —referencia
                     * externa, contenedor— en una columna de 300 px, así que
                     * todo se partía en dos líneas. Acá solo va lo que sirve
                     * para saltar de un embarque a otro: cuál es, de quién, su
                     * booking y cuánto le falta.
                     */
                    <div className="space-y-2 p-2">
                      {pagedOperaciones.length === 0 ? (
                        <div className="py-8 px-3 text-center text-dash-muted text-base">{tr.noOperations}</div>
                      ) : (
                        pagedOperaciones.map((op) => {
                          const isActive = selectedOperacion === op.id;
                          const viaje = estadoViajeDe(op);
                          const total = docsExigiblesDe(op.id);
                          const hechos = Math.min(docsRecibidosDe(op.id), total);
                          const pct = total === 0 ? 0 : Math.round((hechos / total) * 100);
                          return (
                            <button
                              key={op.id}
                              type="button"
                              onClick={() => handleSelectOperacion(op.id)}
                              className={`relative w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                                isActive
                                  ? "border-dash-neon/50 bg-dash-neon/12 ring-1 ring-inset ring-dash-neon/30"
                                  : "border-dash-border bg-dash-control/30 hover:bg-dash-neon/10"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[15px] font-extrabold leading-tight text-dash-fg">
                                    {opRef(op)}
                                  </p>
                                  <p className="mt-0.5 truncate text-[12.5px] font-semibold text-dash-muted">
                                    {op.cliente || "-"}
                                  </p>
                                  <p className="mt-0.5 truncate text-[12px] text-dash-muted/80">
                                    <span className="text-dash-muted/60">{tr.colBooking}:</span>{" "}
                                    <span className="tabular-nums">{op.booking || "—"}</span>
                                  </p>
                                </div>

                                <div className={`flex shrink-0 flex-col items-end gap-1.5 ${viaje.clase}`}>
                                  <span className="estado-chip inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold">
                                    <Icon icon={viaje.icono} width={10} height={10} aria-hidden />
                                    {viaje.label}
                                  </span>
                                  <Icon
                                    icon="lucide:chevron-right"
                                    width={16}
                                    height={16}
                                    className="text-dash-muted/60"
                                    aria-hidden
                                  />
                                </div>
                              </div>

                              {/* Avance: la fracción y la barra, que es lo que
                                  deja comparar embarques sin abrirlos. */}
                              <div
                                className={`mt-1.5 ${
                                  pct === 100 ? "estado--transito" : hechos > 0 ? "estado--curso" : "estado--espera"
                                }`}
                              >
                                <p className="text-[12px] font-bold tabular-nums text-dash-fg">
                                  {hechos}/{total}
                                </p>
                                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-dash-control">
                                  <span
                                    className="estado-barra block h-full rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </span>
                              </div>
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
                            <col className="w-[7%]" />
                            <col className="w-[9%]" />
                            <col className="w-[8%]" />
                            <col className="w-[10%]" />
                            <col className="w-[10%]" />
                            <col className="w-[9%]" />
                            <col className="w-[8%]" />
                            <col className="w-[17%]" />
                            <col className="w-[9%]" />
                            <col className="w-[9%]" />
                            <col className="w-[4%]" />
                          </colgroup>
                          <thead>
                            <tr className="bg-[color-mix(in_srgb,var(--dash-control)_92%,transparent)] border-b border-dash-border">
                              <th className="px-3 py-2.5 text-sm font-bold text-dash-muted">{tr.colRef}</th>
                              <th className="px-3 py-2.5 text-sm font-bold text-dash-muted">{tr.colCliente}</th>
                              <th className="px-3 py-2.5 text-sm font-bold text-dash-muted">{tr.colNaviera}</th>
                              <th className="px-3 py-2.5 text-sm font-bold text-dash-muted">{tr.colBooking}</th>
                              <th className="px-3 py-2.5 text-sm font-bold text-dash-muted">{tr.colContenedor}</th>
                              <th className="px-3 py-2.5 text-sm font-bold text-dash-muted">{tr.colPod}</th>
                              <th className="px-3 py-2.5 text-sm font-bold text-dash-muted">{tr.colEtd}</th>
                              <th className="px-3 py-2.5 text-sm font-bold text-dash-muted">{tr.colDocs}</th>
                              <th className="px-3 py-2.5 text-sm font-bold text-dash-muted">{tr.colDate}</th>
                              <th className="px-3 py-2.5 text-sm font-bold text-dash-muted">{tr.colEstado}</th>
                              <th className="px-3 py-2.5 text-right text-sm font-bold text-dash-muted">{tr.acciones}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-dash-border">
                            {pagedOperaciones.length === 0 ? (
                              <tr>
                                <td colSpan={11} className="px-4 py-12 text-center text-dash-muted text-base">
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
                                  <td className="truncate px-3 py-2.5 text-[15px] font-bold text-dash-fg">{opRef(op)}</td>
                                  <td className="truncate px-3 py-2.5 text-[14px] text-dash-fg/80">{op.cliente || "-"}</td>
                                  <td className="truncate px-3 py-2.5 text-[14px] text-dash-muted">{op.naviera || "-"}</td>
                                  <td className="truncate px-3 py-2.5 text-[14px] tabular-nums text-dash-muted">{op.booking || "-"}</td>
                                  <td className="truncate px-3 py-2.5 text-[14px] tabular-nums text-dash-muted">{op.contenedor || "—"}</td>
                                  <td className="truncate px-3 py-2.5 text-[14px] text-dash-muted">{op.pod || "-"}</td>
                                  <td className="truncate px-3 py-2.5 text-[14px] text-dash-muted">{formatDate(op.etd)}</td>
                                  {/*
                                    * Documentos: fracción, barra y porcentaje.
                                    *
                                    * La fracción dice cuántos faltan y la barra
                                    * deja comparar filas de un vistazo, que es
                                    * lo que una tabla larga necesita.
                                    */}
                                  <td className="px-3 py-2.5">
                                    {(() => {
                                      const total = docsExigiblesDe(op.id);
                                      const hechos = Math.min(docsRecibidosDe(op.id), total);
                                      const pct = total === 0 ? 0 : Math.round((hechos / total) * 100);
                                      const tono =
                                        pct === 100 ? "estado--transito" : hechos > 0 ? "estado--curso" : "estado--espera";
                                      return (
                                        <span className={`flex items-center gap-2 ${tono}`}>
                                          <span className="shrink-0 text-[13px] font-bold tabular-nums text-dash-fg">
                                            {hechos}/{total}
                                          </span>
                                          <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-dash-control">
                                            <span
                                              className="estado-barra block h-full rounded-full"
                                              style={{ width: `${pct}%` }}
                                            />
                                          </span>
                                          <span className="shrink-0 text-[12px] font-semibold tabular-nums text-dash-muted">
                                            {pct}%
                                          </span>
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td className="truncate px-3 py-2.5 text-[13.5px] text-dash-muted">{formatDate(op.created_at)}</td>
                                  <td className="px-3 py-2.5">
                                    {(() => {
                                      const e = estadoDocsDe(op.id);
                                      const meta =
                                        e === "completo"
                                          ? { clase: "estado--transito", label: tr.estadoCompleto, icon: "lucide:check-circle" }
                                          : e === "curso"
                                            ? { clase: "estado--curso", label: tr.estadoEnCurso, icon: "lucide:clock" }
                                            : { clase: "estado--atencion", label: tr.estadoPendiente, icon: "lucide:clock" };
                                      return (
                                        <span
                                          className={`estado-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-bold ${meta.clase}`}
                                        >
                                          <Icon icon={meta.icon} width={13} height={13} aria-hidden />
                                          {meta.label}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td className="px-3 py-2.5 text-right">
                                    <span
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-dash-muted transition-colors hover:bg-dash-neon/15 hover:text-dash-fg"
                                      title={tr.acciones}
                                    >
                                      <Icon icon="lucide:more-vertical" width={16} height={16} aria-hidden />
                                    </span>
                                  </td>
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
              )}
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
