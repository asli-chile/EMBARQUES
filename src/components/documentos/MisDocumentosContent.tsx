import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
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
import { etiquetaEstado } from "@/lib/operaciones/estados";
import { getEstadoOperacionStyle } from "@/lib/ui/estadoOperacion";
import { staggerStyle } from "@/lib/ui/motion";
import { motivoFueraDeNavitrack } from "@/lib/navitrack/alcance";
import { NavieraLogo } from "@/components/navitrack/NavieraLogo";
import { Bandera, SeccionesOperacion, fmtFecha, gruposOperacion, useOperacionCompleta } from "@/components/reservas/ReservaDetalle";
import { PanelBajoFila, propsFilaDesplegable, useFilaDesplegable } from "@/components/ui/FilaDesplegable";

/** Evita pintar filas fuera de viewport, como en Mis Reservas. */
const ROW_CV: CSSProperties = { contentVisibility: "auto", containIntrinsicSize: "auto 44px" };

/** Encabezado de columna: el mismo de Mis Reservas, sin orden. */
const TH =
  "sticky top-0 z-20 bg-[color-mix(in_srgb,var(--dash-control)_92%,transparent)] px-3 py-2.5 whitespace-nowrap border-b border-dash-border text-center text-[11px] font-bold uppercase tracking-wider text-dash-muted backdrop-blur-sm";

type Operacion = {
  id: string;
  ref_asli: string;
  referencia_externa: string | null;
  correlativo: number;
  cliente: string;
  naviera: string;
  /** Para saber si NaviTrack puede mostrarla (ver `alcance.ts`). */
  nave: string | null;
  viaje: string | null;
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
    icon: "lucide:receipt",
    /* Sin color propio: en el ERP el color significa estado, no categoría. El
       grupo se identifica por su nombre y su contador. */
    tipos: ["BOOKING", "FACTURA_PROFORMA", "FACTURA_COMERCIAL", "PACKING_LIST"],
  },
  {
    id: "origen",
    icon: "lucide:stamp",
    tipos: ["CERTIFICADO_ORIGEN", "CERTIFICADO_FITOSANITARIO", "DUS"],
  },
  {
    id: "transporte",
    icon: "lucide:ship",
    tipos: ["INSTRUCTIVO_EMBARQUE", "BL_TELEX_SWB_AWB", "FACTURA_GATE_OUT"],
  },
  {
    id: "cierre",
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

const TIPO_META: Record<TipoDocumento, { label: string; icon: string }> = {
  BOOKING:                 { label: "Booking",                        icon: "lucide:clipboard-list" },
  INSTRUCTIVO_EMBARQUE:    { label: "Instructivo de Embarque (IE)",   icon: "lucide:file-text" },
  PACKING_LIST:            { label: "Packing List",                   icon: "lucide:package" },
  FACTURA_PROFORMA:        { label: "Factura Proforma",               icon: "lucide:file-check" },
  CERTIFICADO_FITOSANITARIO: { label: "Certificado Fitosanitario",   icon: "lucide:leaf" },
  CERTIFICADO_ORIGEN:      { label: "Certificado de Origen",         icon: "lucide:globe" },
  BL_TELEX_SWB_AWB:        { label: "BL / Telex / SWB / AWB",       icon: "lucide:ship" },
  FULLSET:                 { label: "Fullset",                       icon: "lucide:layers" },
  FACTURA_COMERCIAL:       { label: "Factura Comercial",             icon: "lucide:shopping-bag" },
  SOLICITUD_RESERVA:       { label: "Solicitud de Reserva",           icon: "lucide:send" },
  FACTURA_GATE_OUT:        { label: "Factura Gate Out",               icon: "lucide:receipt" },
  DUS:                     { label: "DUS",                           icon: "lucide:landmark" },
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
  /** Tipo sobre el que se está arrastrando un archivo, para iluminar su espacio. */
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  /** Pestaña de la ficha desplegada. */
  const [tabFicha, setTabFicha] = useState<"docs" | "datos" | "hitos" | "notas">("docs");
  /** Menú ⋮ abierto: de una tarjeta de documento o de una fila. Uno a la vez. */
  const [menuDoc, setMenuDoc] = useState<string | null>(null);
  const [menuFila, setMenuFila] = useState<string | null>(null);
  /** Archivos elegidos en "Subir múltiples", cada uno con el tipo que se le asigna. */
  const [subida, setSubida] = useState<{ file: File; tipo: string }[] | null>(null);
  const [subiendoVarios, setSubiendoVarios] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [logosNaviera, setLogosNaviera] = useState<Map<string, string>>(new Map());
  const [previewDoc, setPreviewDoc] = useState<Documento | null>(null);
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
    /* Tipadas como `string` a propósito: con el literal, el parser de tipos de
       supabase-js se ahoga ("excessively deep") y el fallback no calza. */
    const baseCols: string =
      "id, ref_asli, referencia_externa, correlativo, cliente, naviera, nave, viaje, booking, contenedor, pol, pod, etd, eta, estado_operacion, booking_doc_url, created_at";
    const withNaCols: string = `${baseCols}, solicitud_reserva_no_aplica, factura_gate_out_no_aplica`;

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
      const r = row as unknown as Record<string, unknown>;
      return {
        id: String(r.id),
        ref_asli: String(r.ref_asli ?? ""),
        referencia_externa: (r.referencia_externa as string | null) ?? null,
        correlativo: Number(r.correlativo ?? 0),
        cliente: String(r.cliente ?? ""),
        naviera: String(r.naviera ?? ""),
        nave: (r.nave as string | null) ?? null,
        viaje: (r.viaje as string | null) ?? null,
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

  /*
   * Una operación desplegada a la vez, con la misma mecánica de Mis Reservas
   * (ver FilaDesplegable). La operación abierta es la "seleccionada": de ella
   * cuelgan la carga de documentos y el canal en vivo.
   */
  const visiblesIds = useMemo(() => filteredOperaciones.map((o) => o.id), [filteredOperaciones]);
  const fila = useFilaDesplegable({
    visibles: visiblesIds,
    habilitado: !loading,
    bloqueoEscape: !!previewDoc || !!confirmDialog || !!subida,
  });
  const { completa: opCompleta } = useOperacionCompleta(supabase, fila.abiertaId);
  useEffect(() => {
    setTabFicha("docs");
    setMenuDoc(null);
  }, [fila.abiertaId]);
  useEffect(() => {
    setSelectedOperacion(fila.abiertaId ?? "");
  }, [fila.abiertaId]);

  // Enlace profundo: /documentos/mis-documentos?op=<uuid> (Registros, Mis Reservas).
  const deepLinkHecho = useRef(false);
  const abrirFila = fila.abrir;
  useEffect(() => {
    if (deepLinkHecho.current || loading || visiblesIds.length === 0 || typeof window === "undefined") return;
    deepLinkHecho.current = true;
    const opId = new URLSearchParams(window.location.search).get("op");
    if (opId && visiblesIds.includes(opId)) abrirFila(opId);
  }, [loading, visiblesIds, abrirFila]);

  useEffect(() => {
    if (!supabase) return;
    void supabase
      .from("navieras")
      .select("nombre, logo_url")
      .then(({ data }) => {
        const mapa = new Map<string, string>();
        for (const n of (data ?? []) as { nombre: string | null; logo_url: string | null }[]) {
          const nombre = (n.nombre ?? "").trim().toUpperCase();
          if (nombre && n.logo_url) mapa.set(nombre, n.logo_url);
        }
        setLogosNaviera(mapa);
      });
  }, [supabase]);

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

  if (loading) {
    return (
      <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
        <main className="dash-page relative flex min-h-0 flex-1 items-center justify-center p-4" role="main">
          <div className="dash-card flex items-center gap-3 rounded-xl px-5 py-4 text-sm font-medium text-dash-muted">
            <Icon icon="lucide:loader-2" className="h-4 w-4 animate-spin text-[var(--estado-curso)]" />
            <span>{tr.loading}</span>
          </div>
        </main>
      </div>
    );
  }

  const trR = t.misReservas as unknown as Record<string, string>;
  const opsPorId = new Map(operaciones.map((o) => [o.id, o]));

  /** Documentos exigibles de una operación: los visibles menos los "no aplica". */
  const docsExigiblesDe = (opId: string) =>
    Math.max(visibleTipos.length - countTiposNoAplica(opsPorId.get(opId), visibleTipos), 0);
  const docsRecibidosDe = (opId: string) => docCounts.get(opId) ?? 0;

  /**
   * El papeleo con los estados de marca: completo en oliva, a medias en teal,
   * sin nada en ámbar —hay que mirarlo—. El mismo criterio en la fila, en los
   * indicadores y en la ficha, para que no digan cosas distintas.
   */
  const metaPapeleo = (e: EstadoDocs) =>
    e === "completo"
      ? { clase: "estado--ok", label: tr.estadoCompleto, icon: "lucide:check-circle" }
      : e === "curso"
        ? { clase: "estado--curso", label: tr.estadoEnCurso, icon: "lucide:loader" }
        : { clase: "estado--atencion", label: tr.estadoPendiente, icon: "lucide:alert-circle" };

  const COLUMNAS = 11;
  const trReg = t.registros as unknown as Record<string, string>;

  /** Los tipos en el orden del viaje: es el número que lleva cada tarjeta. */
  const tiposOrdenados = GRUPOS_DOCUMENTO.flatMap((g) => g.tipos as readonly string[]).filter((t) =>
    visibleTiposSet.has(t),
  ) as TipoDocumento[];

  const alSoltar = (tipo: TipoDocumento) => (e: DragEvent) => {
    e.preventDefault();
    setArrastrando(null);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleUpload(tipo, f);
  };

  const inputArchivo = (tipo: TipoDocumento, disabled = false, alElegir?: () => void) => (
    <input
      type="file"
      accept=".pdf,.xls,.xlsx"
      className="sr-only"
      disabled={disabled}
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) void handleUpload(tipo, f);
        e.target.value = "";
        alElegir?.();
      }}
    />
  );

  /**
   * Adivina el tipo de un archivo por su nombre, para "Subir múltiples". Es
   * solo una sugerencia: el usuario la ve y la corrige antes de subir.
   */
  const adivinarTipo = (nombre: string, usados: Set<string>): string => {
    const n = ` ${nombre.toUpperCase().replace(/[_\-.]+/g, " ")} `;
    const reglas: [RegExp, TipoDocumento][] = [
      [/PACKING/, "PACKING_LIST"],
      [/PROFORMA/, "FACTURA_PROFORMA"],
      [/GATE/, "FACTURA_GATE_OUT"],
      [/FACTURA|INVOICE/, "FACTURA_COMERCIAL"],
      [/FITO|PHYTO/, "CERTIFICADO_FITOSANITARIO"],
      [/ORIGEN|ORIGIN/, "CERTIFICADO_ORIGEN"],
      [/FULL ?SET/, "FULLSET"],
      [/INSTRUCTIVO/, "INSTRUCTIVO_EMBARQUE"],
      [/ DUS /, "DUS"],
      [/ BL | TELEX | SWB | AWB |LADING/, "BL_TELEX_SWB_AWB"],
      [/BOOKING|RESERVA/, "BOOKING"],
    ];
    for (const [re, tipo] of reglas) {
      if (re.test(n) && visibleTiposSet.has(tipo) && !usados.has(tipo)) return tipo;
    }
    return "";
  };

  const prepararSubida = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const usados = new Set<string>();
    const lista = Array.from(files).map((file) => {
      const tipo = adivinarTipo(file.name, usados);
      if (tipo) usados.add(tipo);
      return { file, tipo };
    });
    setSubida(lista);
  };

  const confirmarSubida = async () => {
    if (!subida) return;
    setSubiendoVarios(true);
    for (const item of subida) {
      if (item.tipo) await handleUpload(item.tipo as TipoDocumento, item.file);
    }
    setSubiendoVarios(false);
    setSubida(null);
  };

  /** Todos los documentos recibidos en un .zip, con el orden de las tarjetas. */
  const descargarTodo = async (op: Operacion) => {
    const docs = tiposOrdenados
      .map((t) => documentosPorTipo.get(t))
      .filter((d): d is Documento => !!d);
    if (docs.length === 0) return;
    setDescargando(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      await Promise.all(
        docs.map(async (d) => {
          const res = await fetch(d.url);
          if (!res.ok) throw new Error(String(res.status));
          const n = tiposOrdenados.indexOf(d.tipo as TipoDocumento) + 1;
          zip.file(`${String(n).padStart(2, "0")}_${d.nombre_archivo}`, await res.blob());
        }),
      );
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${opRef(op)}_documentos.zip`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch {
      setError(tr.descargaError);
    } finally {
      setDescargando(false);
    }
  };

  const btnIcono =
    "motion-interactive inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-dash-muted hover:bg-dash-control hover:text-dash-fg";
  const itemMenu =
    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12.5px] font-semibold text-dash-fg hover:bg-[color-mix(in_srgb,var(--estado-curso)_12%,transparent)]";

  /**
   * La tarjeta de un documento, numerada en el orden del viaje.
   *
   * Si el documento está, adentro va el archivo con su menú; si falta, la zona
   * para soltarlo o hacer clic. Así la grilla se lee como un formulario con
   * sus casilleros, y los vacíos saltan a la vista.
   */
  const renderTarjeta = (tipo: TipoDocumento, n: number, i: number) => {
    const doc = documentosPorTipo.get(tipo);
    const meta = TIPO_META[tipo];
    const tipoLabel = tr.tipoLabels[tipo as keyof typeof tr.tipoLabels] ?? meta.label;
    const isUploading = uploading === tipo;
    const isSyntheticBooking = !!doc && doc.id.startsWith("__booking_url__");
    const marcadoNoAplica = isTipoMarcadoNoAplica(operacionActual, tipo);
    const puedeMarcarNoAplica = !isCliente && isTipoNoAplicaEligible(tipo);
    const menuAbierto = menuDoc === tipo;
    const encima = arrastrando === tipo;

    let cuerpo: ReactNode;
    if (marcadoNoAplica) {
      cuerpo = (
        <div className="estado--espera flex flex-1 flex-col items-center justify-center gap-1.5 rounded-lg border border-dash-border bg-dash-control/40 px-3 py-4 text-center">
          <span className="estado-chip rounded-full px-2.5 py-0.5 text-[11px] font-bold">{tr.noAplica}</span>
          <span className="text-[11px] text-dash-muted">{tr.noAplicaHint}</span>
          {puedeMarcarNoAplica && (
            <button
              type="button"
              onClick={() => void handleToggleNoAplica(tipo, false)}
              className="text-[11px] font-semibold text-[var(--estado-curso)] hover:underline"
            >
              {tr.reactivar}
            </button>
          )}
        </div>
      );
    } else if (doc) {
      const pdf = isPdf(doc.mime_type);
      cuerpo = (
        <div className="relative flex items-center gap-2.5 rounded-lg border border-dash-border bg-dash-control/50 px-3 py-2.5">
          <span className={`${pdf ? "estado--error" : "estado--ok"} shrink-0 text-[var(--estado)]`}>
            <Icon icon={pdf ? "mdi:file-pdf-box" : "mdi:file-excel-box"} width={30} height={30} aria-hidden />
          </span>
          <button type="button" onClick={() => handlePreview(doc)} className="min-w-0 flex-1 text-left" title={doc.nombre_archivo}>
            <span className="block truncate text-[12.5px] font-bold text-dash-fg hover:underline">{doc.nombre_archivo}</span>
            <span className="block truncate text-[11px] tabular-nums text-dash-muted">
              {fmtFecha((isSyntheticBooking ? operacionActual?.created_at : doc.created_at)?.slice(0, 10) ?? "") || "—"}
              {doc.tamano ? `  ·  ${formatFileSize(doc.tamano)}` : ""}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMenuDoc(menuAbierto ? null : tipo)}
            className={btnIcono}
            aria-label={tr.acciones}
            aria-expanded={menuAbierto}
          >
            <Icon icon={isUploading ? "lucide:loader-2" : "lucide:more-vertical"} width={16} height={16} className={isUploading ? "animate-spin" : ""} />
          </button>
          {menuAbierto && (
            <>
              <button type="button" aria-hidden tabIndex={-1} onClick={() => setMenuDoc(null)} className="fixed inset-0 z-[60] cursor-default" />
              <div className="absolute right-1 top-full z-[61] mt-1 w-48 overflow-hidden rounded-xl border border-dash-border bg-dash-surface py-1 shadow-xl">
                <button type="button" className={itemMenu} onClick={() => { setMenuDoc(null); handlePreview(doc); }}>
                  <Icon icon="lucide:eye" width={14} height={14} /> {tr.preview}
                </button>
                <button type="button" className={itemMenu} onClick={() => { setMenuDoc(null); handleDownload(doc); }}>
                  <Icon icon="lucide:download" width={14} height={14} /> {tr.download}
                </button>
                {!isCliente && !isSyntheticBooking && (
                  <>
                    <label className={`${itemMenu} cursor-pointer`}>
                      <Icon icon="lucide:refresh-cw" width={14} height={14} /> {tr.replace}
                      {inputArchivo(tipo, isUploading, () => setMenuDoc(null))}
                    </label>
                    <button
                      type="button"
                      className={`${itemMenu} estado--error border-t border-dash-border !text-[var(--estado)]`}
                      onClick={() => { setMenuDoc(null); handleDelete(doc); }}
                    >
                      <Icon icon="lucide:trash-2" width={14} height={14} /> {tr.deleteDocument}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      );
    } else if (isCliente) {
      cuerpo = (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-dash-border px-3 py-4 text-center">
          <Icon icon="lucide:file-clock" width={20} height={20} className="text-dash-muted" aria-hidden />
          <span className="estado--atencion estado-chip rounded-full px-2.5 py-0.5 text-[11px] font-bold">{tr.estadoPendienteDoc}</span>
        </div>
      );
    } else {
      cuerpo = (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            if (arrastrando !== tipo) setArrastrando(tipo);
          }}
          onDragLeave={() => setArrastrando((v) => (v === tipo ? null : v))}
          onDrop={alSoltar(tipo)}
          className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-3 py-3.5 text-center transition-colors ${
            encima
              ? "border-[var(--estado-curso)] bg-[color-mix(in_srgb,var(--estado-curso)_12%,transparent)]"
              : "border-dash-border hover:border-[color-mix(in_srgb,var(--estado-curso)_55%,transparent)] hover:bg-[color-mix(in_srgb,var(--estado-curso)_5%,transparent)]"
          }`}
        >
          <span className="flex items-center gap-2.5">
            <Icon
              icon={isUploading ? "lucide:loader-2" : encima ? "lucide:arrow-down-to-line" : "lucide:cloud-upload"}
              width={20}
              height={20}
              className={`shrink-0 ${isUploading ? "animate-spin" : ""} ${encima ? "text-[var(--estado-curso)]" : "text-dash-muted"}`}
              aria-hidden
            />
            <span className="text-left text-[11.5px] leading-snug text-dash-fg/80">
              {isUploading ? tr.uploading : encima ? tr.soltarAqui : tr.arrastraOClic}
            </span>
          </span>
          <span className="text-[10px] text-dash-muted/80">{tr.fileTypesHint}</span>
          {inputArchivo(tipo, isUploading)}
        </label>
      );
    }

    return (
      <article
        key={tipo}
        style={staggerStyle(i)}
        className="motion-enter motion-stagger motion-stagger-tight flex min-w-0 flex-col gap-2.5 rounded-xl border border-dash-border bg-dash-surface p-3 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
      >
        <header className="flex min-w-0 items-center gap-2">
          <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md border border-dash-border bg-dash-control px-1 text-[11px] font-bold tabular-nums text-dash-muted">
            {n}
          </span>
          <Icon icon={meta.icon} width={17} height={17} className="shrink-0 text-dash-fg" aria-hidden />
          <p className="min-w-0 flex-1 truncate text-[13px] font-bold text-dash-fg" title={tipoLabel}>{tipoLabel}</p>
          {doc && !marcadoNoAplica ? (
            <span className="estado--ok shrink-0 text-[var(--estado)]" title={tr.estadoRecibido}>
              <Icon icon="mdi:check-circle" width={19} height={19} aria-label={tr.estadoRecibido} />
            </span>
          ) : !doc && !marcadoNoAplica && puedeMarcarNoAplica ? (
            <button
              type="button"
              onClick={() => void handleToggleNoAplica(tipo, true)}
              className="shrink-0 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold text-dash-muted hover:bg-dash-control hover:text-dash-fg"
              title={tr.noAplicaHint}
            >
              {tr.noAplica}
            </button>
          ) : null}
        </header>
        {cuerpo}
      </article>
    );
  };

  /** Fechas de la operación en orden: la historia del embarque hasta hoy. */
  const HITOS: { key: string; label: string; icono: string }[] = [
    { key: "ingreso", label: trReg.colEntryDate, icono: "lucide:file-plus" },
    { key: "fecha_confirmacion_booking", label: trReg.colBookingConfirmation, icono: "lucide:bookmark-check" },
    { key: "citacion", label: trReg.colCitation, icono: "lucide:calendar-clock" },
    { key: "llegada_planta", label: trReg.colPlantArrival, icono: "lucide:factory" },
    { key: "salida_planta", label: trReg.colPlantDeparture, icono: "lucide:truck" },
    { key: "inicio_stacking", label: trReg.colStackingStart, icono: "lucide:door-open" },
    { key: "ingreso_stacking", label: trReg.colStackingEntry, icono: "lucide:container" },
    { key: "fin_stacking", label: trReg.colStackingEnd, icono: "lucide:door-closed" },
    { key: "corte_documental", label: trReg.colDocCutoff, icono: "lucide:file-lock" },
    { key: "etd", label: trReg.colETD, icono: "lucide:ship" },
    { key: "fecha_envio_documentacion", label: trReg.colDocSent, icono: "lucide:send" },
    { key: "eta", label: trReg.colETA, icono: "lucide:anchor" },
    { key: "fecha_entrega_bl", label: trReg.colBLDelivery, icono: "lucide:file-check" },
  ];

  /** La ficha desplegada bajo la fila, como la referencia: tira de datos, pestañas y contenido. */
  const renderFicha = (op: Operacion) => {
    const cfg = getEstadoOperacionStyle(op.estado_operacion);
    const estadoTxt = etiquetaEstado(op.estado_operacion);
    const fuera = motivoFueraDeNavitrack(op);
    const datos: Record<string, unknown> = { ...(opCompleta ?? {}), ...op };
    const hoy = new Date().toISOString().slice(0, 10);
    const hitos = HITOS.map((h) => ({ ...h, valor: datos[h.key] }))
      .filter((h) => typeof h.valor === "string" && h.valor.trim() !== "")
      .map((h) => ({ ...h, valor: String(h.valor) }))
      .sort((a, b) => a.valor.localeCompare(b.valor));
    const notas = typeof datos.observaciones === "string" ? datos.observaciones.trim() : "";
    const hayDocs = tiposOrdenados.some((t) => documentosPorTipo.get(t));

    const celda = "min-w-0 shrink-0 border-l border-dash-border px-5 first:border-l-0 first:pl-0";
    const etiquetaCelda = "text-[10px] font-bold uppercase tracking-wider text-dash-muted";
    const tabClase = (activa: boolean) =>
      `-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-[13px] font-semibold transition-colors ${
        activa
          ? "border-[var(--estado-curso)] text-[var(--estado-curso)]"
          : "border-transparent text-dash-muted hover:text-dash-fg"
      }`;

    return (
      <PanelBajoFila cerrando={fila.cerrando} className="bg-dash-surface">
        {/* ── Tira del embarque: cada dato en su celda, separados por una línea ── */}
        <div className="flex shrink-0 items-center gap-4 border-b border-dash-border px-4 py-3.5">
          <button
            type="button"
            onClick={fila.cerrar}
            className="motion-interactive flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-dash-border bg-dash-control text-dash-muted hover:text-dash-fg"
            title={`${trR.detalleReplegar} (Esc)`}
            aria-label={trR.detalleReplegar}
          >
            <Icon icon="lucide:chevrons-up" width={15} height={15} />
          </button>
          <div className="flex min-w-0 flex-1 items-center overflow-x-auto py-0.5">
            <div className={celda}>
              <p className={etiquetaCelda}>{tr.colOperacion}</p>
              <p className="text-[19px] font-extrabold tabular-nums leading-tight text-dash-fg">{opRef(op)}</p>
              {op.referencia_externa ? (
                <p className="truncate text-[11px] text-dash-muted">{op.referencia_externa}</p>
              ) : null}
            </div>
            <div className={celda}>
              <p className={etiquetaCelda}>{tr.colBooking}</p>
              <p className="font-mono text-[15px] font-bold tracking-tight text-dash-fg">{op.booking || "—"}</p>
              {op.contenedor ? <p className="font-mono text-[11px] text-dash-muted">{op.contenedor}</p> : null}
            </div>
            <div className={celda}>
              <p className={etiquetaCelda}>{tr.colNaviera}</p>
              <div className="mt-0.5 flex items-center gap-2">
                {op.naviera ? (
                  <NavieraLogo nombre={op.naviera} logoUrl={logosNaviera.get(op.naviera.trim().toUpperCase()) ?? null} size={30} />
                ) : null}
                <span className="truncate text-[13px] font-semibold text-dash-fg">{op.naviera || "—"}</span>
              </div>
            </div>
            <div className={celda}>
              <p className={etiquetaCelda}>{tr.colNaveViaje}</p>
              <p className="truncate text-[13.5px] font-bold text-dash-fg">{op.nave || "—"}</p>
              <p className="truncate text-[11.5px] text-dash-muted">{op.viaje || "—"}</p>
            </div>
            <div className={celda}>
              <p className={etiquetaCelda}>{tr.colOrigen}</p>
              <p className="flex items-center gap-1.5 text-[13.5px] font-bold text-dash-fg">
                <Bandera puerto={op.pol} />
                <span className="truncate">{op.pol || "—"}</span>
              </p>
              <p className="text-[11px] tabular-nums text-dash-muted">ETD {op.etd ? fmtFecha(op.etd) : "—"}</p>
            </div>
            <div className={celda}>
              <p className={etiquetaCelda}>{tr.colDestino}</p>
              <p className="flex items-center gap-1.5 text-[13.5px] font-bold text-dash-fg">
                <Bandera puerto={op.pod} />
                <span className="truncate">{op.pod || "—"}</span>
              </p>
              <p className="text-[11px] tabular-nums text-dash-muted">ETA {op.eta ? fmtFecha(op.eta) : "—"}</p>
            </div>
            <div className={celda}>
              <p className={etiquetaCelda}>{tr.colEstado}</p>
              {estadoTxt ? (
                <span
                  className={`mt-1 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-[12px] font-bold ${
                    cfg ? `${cfg.bg} ${cfg.text} ${cfg.border}` : "border-dash-border text-dash-muted"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${cfg?.dot ?? "bg-dash-muted"}`} aria-hidden />
                  {estadoTxt}
                </span>
              ) : (
                <p className="text-[13px] text-dash-muted">—</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Pestañas ── */}
        <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-dash-border px-4" role="tablist">
          <button type="button" role="tab" aria-selected={tabFicha === "docs"} onClick={() => setTabFicha("docs")} className={tabClase(tabFicha === "docs")}>
            <Icon icon="lucide:file-text" width={16} height={16} aria-hidden />
            {tr.tabDocumentos} ({docsCompletados}/{tiposAplicables})
          </button>
          {fuera ? (
            <span className={`${tabClase(false)} cursor-not-allowed opacity-50`} title={trR[`detalleNavitrack_${fuera}`]} aria-disabled="true">
              <Icon icon="lucide:radar" width={16} height={16} aria-hidden />
              {tr.tabSeguimiento}
            </span>
          ) : (
            <a
              href={`${withBase("/navitrack")}?op=${encodeURIComponent(op.id)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={tabClase(false)}
            >
              <Icon icon="lucide:radar" width={16} height={16} aria-hidden />
              {tr.tabSeguimiento}
              <Icon icon="lucide:arrow-up-right" width={12} height={12} className="opacity-60" aria-hidden />
            </a>
          )}
          <button type="button" role="tab" aria-selected={tabFicha === "datos"} onClick={() => setTabFicha("datos")} className={tabClase(tabFicha === "datos")}>
            <Icon icon="lucide:package" width={16} height={16} aria-hidden />
            {tr.tabDatos}
          </button>
          <button type="button" role="tab" aria-selected={tabFicha === "hitos"} onClick={() => setTabFicha("hitos")} className={tabClase(tabFicha === "hitos")}>
            <Icon icon="lucide:milestone" width={16} height={16} aria-hidden />
            {tr.tabHitos}
          </button>
          <button type="button" role="tab" aria-selected={tabFicha === "notas"} onClick={() => setTabFicha("notas")} className={tabClase(tabFicha === "notas")}>
            <Icon icon="lucide:notebook-pen" width={16} height={16} aria-hidden />
            {tr.tabNotas}
          </button>
        </div>

        {/* ── Contenido de la pestaña, con scroll propio ── */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[color-mix(in_srgb,var(--dash-control)_35%,var(--dash-surface))] p-4">
          {tabFicha === "docs" && (
            <section className="rounded-2xl border border-dash-border bg-[color-mix(in_srgb,var(--dash-control)_25%,var(--dash-surface))] p-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Icon icon="lucide:file-text" width={26} height={26} className="mt-0.5 shrink-0 text-[var(--estado-curso)]" aria-hidden />
                  <div className="min-w-0">
                    <h3 className="text-[16px] font-bold text-dash-fg">{tr.docsTitulo}</h3>
                    <p className="text-[12.5px] text-dash-muted">{tr.docsSubtitulo}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void descargarTodo(op)}
                    disabled={!hayDocs || descargando}
                    className="motion-interactive inline-flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--estado-curso)_55%,transparent)] bg-dash-surface px-3.5 py-2 text-[12.5px] font-semibold text-[var(--estado-curso)] hover:bg-[color-mix(in_srgb,var(--estado-curso)_8%,var(--dash-surface))] disabled:pointer-events-none disabled:opacity-40"
                  >
                    <Icon icon={descargando ? "lucide:loader-2" : "lucide:download"} width={15} height={15} className={descargando ? "animate-spin" : ""} aria-hidden />
                    {descargando ? tr.descargando : tr.descargarTodo}
                  </button>
                  {!isCliente && (
                    <label className="btn-marca motion-interactive inline-flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2 text-[12.5px] font-semibold">
                      <Icon icon="lucide:upload" width={15} height={15} aria-hidden />
                      {tr.subirMultiples}
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.xls,.xlsx"
                        className="sr-only"
                        onChange={(e) => {
                          prepararSubida(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {error && (
                <div className="estado--error estado-chip mb-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold">
                  <Icon icon="lucide:alert-circle" width={16} height={16} className="shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1">{error}</span>
                  <button type="button" onClick={() => setError(null)} aria-label={tr.closeSelection} className="shrink-0 opacity-70 hover:opacity-100">
                    <Icon icon="lucide:x" width={14} height={14} />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {tiposOrdenados.map((tipo, i) => renderTarjeta(tipo, i + 1, i))}
              </div>
            </section>
          )}

          {tabFicha === "datos" && (
            <SeccionesOperacion
              fila={datos}
              grupos={gruposOperacion(isCliente)}
              soloConDatos={false}
              labels={{ tr: trR, campos: trReg }}
            />
          )}

          {tabFicha === "hitos" && (
            <section className="rounded-2xl border border-dash-border bg-dash-surface p-5">
              {hitos.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-dash-muted">{tr.sinHitos}</p>
              ) : (
                <ol className="relative ml-3 border-l-2 border-dash-border">
                  {hitos.map((h, i) => {
                    const cumplido = h.valor.slice(0, 10) <= hoy;
                    return (
                      <li
                        key={h.key}
                        style={staggerStyle(i)}
                        className={`motion-enter motion-stagger motion-stagger-tight relative pb-5 pl-6 last:pb-0 ${cumplido ? "estado--ok" : "estado--curso"}`}
                      >
                        <span
                          className={`absolute -left-[13px] top-0 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                            cumplido
                              ? "border-[var(--estado)] bg-[var(--estado)] text-white"
                              : "border-[var(--estado)] bg-dash-surface text-[var(--estado)]"
                          }`}
                        >
                          <Icon icon={cumplido ? "lucide:check" : h.icono} width={12} height={12} aria-hidden />
                        </span>
                        <p className="text-[13.5px] font-bold text-dash-fg">{h.label}</p>
                        <p className="text-[12px] tabular-nums text-dash-muted">
                          {fmtFecha(h.valor)}
                          <span className="ml-2 font-semibold text-[var(--estado)]">{cumplido ? tr.hitoCumplido : tr.hitoProximo}</span>
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          )}

          {tabFicha === "notas" && (
            <section className="rounded-2xl border border-dash-border bg-dash-surface p-5">
              {notas ? (
                <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-dash-fg">{notas}</p>
              ) : (
                <p className="py-8 text-center text-[13px] text-dash-muted">{tr.sinNotas}</p>
              )}
            </section>
          )}
        </div>
      </PanelBajoFila>
    );
  };

  const kpis = [
    { clave: "todos" as const, label: tr.kpiTotal, valor: resumenDocs.total, pct: null, tono: "estado--curso", icon: "lucide:files" },
    { clave: "completos" as const, label: tr.filtroCompletados, valor: resumenDocs.completas, pct: resumenDocs.pctCompletas, tono: "estado--ok", icon: "lucide:check-circle" },
    { clave: "curso" as const, label: tr.filtroEnCurso, valor: resumenDocs.curso, pct: resumenDocs.pctCurso, tono: "estado--curso", icon: "lucide:loader" },
    { clave: "pendientes" as const, label: tr.filtroPendientes, valor: resumenDocs.pendientes, pct: resumenDocs.pctPendientes, tono: "estado--atencion", icon: "lucide:alert-circle" },
  ];

  return (
    <>
    <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
      <main className="dash-page relative flex min-h-0 flex-1 flex-col overflow-hidden" role="main">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -right-16 top-8 h-64 w-64 rounded-full bg-dash-neon/15 blur-3xl" />
          <div className="absolute bottom-20 left-1/4 h-56 w-56 rounded-full bg-dash-neon-hot/10 blur-3xl" />
        </div>

        {/*
          * Cabecera de la página, la misma de Mis Reservas: título, indicadores
          * y búsqueda. Se repliega con una operación desplegada, para darle a
          * la ficha toda la pantalla.
          */}
        <div className="rd-colapsable relative z-10 shrink-0" data-colapsado={fila.cabeceraOculta} inert={fila.cabeceraOculta || undefined}>
        <div>
        <div className="dash-toolbar relative z-10 shrink-0">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <a
                href={withBase("/inicio")}
                title={tr.backHome}
                aria-label={tr.backHome}
                className="dash-control inline-flex h-9 shrink-0 items-center gap-1.5 px-2.5 text-sm font-semibold sm:px-3"
              >
                <Icon icon="lucide:arrow-left" width={18} height={18} className="shrink-0" />
              </a>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dash-neon/40 bg-dash-neon/15">
                <Icon icon="lucide:folder-open" width={18} height={18} className="text-dash-neon" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold leading-tight tracking-tight text-dash-fg sm:text-xl">{tr.title}</h1>
                <p className="mt-0.5 truncate text-xs text-dash-muted">
                  {tr.subtitle}
                  {filteredOperaciones.length !== operaciones.length ? (
                    <span className="ml-1.5 font-semibold tabular-nums text-dash-neon">
                      {filteredOperaciones.length}/{operaciones.length}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>

            {/*
              * Indicadores del papeleo. Cada uno filtra la tabla —y lo quita si
              * ya estaba activo—, igual que los de Mis Reservas. Ocultos en
              * teléfono: ahí el filtro va en chips bajo la búsqueda.
              */}
            <div className="hidden min-w-0 flex-1 gap-2 md:grid md:grid-cols-4 xl:gap-2.5">
              {kpis.map((k) => {
                const activo = filtroDocs === k.clave && k.clave !== "todos";
                return (
                  <button
                    key={k.clave}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => setFiltroDocs(activo ? "todos" : k.clave)}
                    className={`${k.tono} flex items-center gap-2.5 rounded-xl border bg-dash-control/40 px-2.5 py-2 text-left transition-colors hover:bg-dash-neon/10 ${
                      activo
                        ? "border-[color-mix(in_srgb,var(--estado)_55%,transparent)] bg-[color-mix(in_srgb,var(--estado)_10%,transparent)]"
                        : "border-dash-border"
                    }`}
                  >
                    <span className="estado-icono flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                      <Icon icon={k.icon} width={16} height={16} aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-baseline gap-1.5">
                        <span className="text-[18px] font-extrabold leading-none tabular-nums text-dash-fg">{k.valor}</span>
                        {k.pct !== null && (
                          <span className="text-[11.5px] font-semibold tabular-nums text-dash-muted">{k.pct}%</span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] font-semibold text-dash-muted">{k.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => void fetchOperaciones()}
                className="dash-control inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-dash-muted hover:text-dash-fg"
                title={tr.updateTooltip}
              >
                <Icon icon="lucide:refresh-cw" width={14} height={14} />
                <span className="hidden sm:inline">{tr.updateTooltip}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="relative z-10 shrink-0 border-b border-dash-border bg-[color-mix(in_srgb,var(--dash-header)_70%,transparent)] backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 sm:px-4">
            <div className="relative min-w-0 flex-1">
              <Icon icon="lucide:search" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dash-muted" />
              <input
                type="text"
                placeholder={tr.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-dash-border bg-dash-control py-2 pl-8 pr-8 text-sm text-dash-fg transition-all placeholder:text-dash-muted focus:border-dash-neon/50 focus:outline-none focus:ring-2 focus:ring-dash-neon/40"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-dash-muted transition-colors hover:text-dash-fg"
                >
                  <Icon icon="lucide:x" width={14} height={14} />
                </button>
              )}
            </div>
            {/* Teléfono: los indicadores no caben, el filtro va en chips. */}
            <div className="-mx-1 flex w-full items-center gap-1.5 overflow-x-auto px-1 py-1 md:hidden">
              {kpis.map((k) => {
                const activo = filtroDocs === k.clave;
                return (
                  <button
                    key={k.clave}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => setFiltroDocs(k.clave)}
                    className={`${k.tono} inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
                      activo ? "estado-chip" : "border-dash-border bg-dash-control text-dash-muted"
                    }`}
                  >
                    {k.clave === "todos" ? tr.filtroTodos : k.label}
                    <span className="tabular-nums opacity-70">{k.valor}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        </div>
        </div>

        <div className="relative z-10 min-h-0 flex-1 overflow-auto p-2 sm:p-3">
          <div
            className="dash-card-static flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-dash-border bg-[color-mix(in_srgb,var(--dash-surface)_92%,transparent)]"
            style={{ minHeight: 300 }}
          >
            <div {...fila.scrollProps} className={`min-h-0 flex-1 ${fila.scrollProps.className}`}>
              <table className="w-full text-[13.5px]">
                <thead>
                  <tr>
                    <th className={`${TH} text-left`}>{tr.colOperacion}</th>
                    <th className={`${TH} hidden sm:table-cell`}>{tr.colBooking}</th>
                    <th className={`${TH} hidden text-left md:table-cell`}>{tr.colNaviera}</th>
                    <th className={`${TH} hidden text-left lg:table-cell`}>{tr.colNaveViaje}</th>
                    <th className={`${TH} hidden text-left xl:table-cell`}>{tr.colOrigen}</th>
                    <th className={`${TH} hidden text-left lg:table-cell`}>{tr.colDestino}</th>
                    <th className={`${TH} hidden md:table-cell`}>{tr.colEtd}</th>
                    <th className={`${TH} hidden xl:table-cell`}>{tr.colEta}</th>
                    <th className={`${TH} hidden sm:table-cell`}>{tr.colEstado}</th>
                    <th className={TH}>{tr.colDocs}</th>
                    <th className={`${TH} w-12`}>
                      <span className="sr-only">{tr.acciones}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOperaciones.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMNAS} className="px-4 py-14 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-dash-border bg-dash-control">
                            <Icon icon="lucide:folder-open" width={20} height={20} className="text-dash-muted" />
                          </span>
                          <p className="text-sm font-medium text-dash-muted">{tr.noOperations}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredOperaciones.map((op, idx) => {
                      const abierta = fila.abiertaId === op.id;
                      const cfg = getEstadoOperacionStyle(op.estado_operacion);
                      const estadoTxt = etiquetaEstado(op.estado_operacion);
                      const total = docsExigiblesDe(op.id);
                      const hechos = Math.min(docsRecibidosDe(op.id), total);
                      const papeleo = metaPapeleo(estadoDocsDe(op.id));
                      const fuera = motivoFueraDeNavitrack(op);
                      const menuAbierto = menuFila === op.id;
                      return (
                        <Fragment key={op.id}>
                          <tr
                            {...propsFilaDesplegable(op.id, abierta, fila.toggle)}
                            style={abierta ? undefined : ROW_CV}
                            className={`cursor-pointer border-b outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-dash-neon/50 ${
                              abierta
                                ? "border-transparent bg-[color-mix(in_srgb,var(--estado-curso)_14%,transparent)]"
                                : idx % 2 === 0
                                  ? "border-dash-border bg-transparent hover:bg-dash-neon/10"
                                  : "border-dash-border bg-dash-control/30 hover:bg-dash-neon/10"
                            }`}
                          >
                            <td className="whitespace-nowrap px-3 py-3">
                              <span className="inline-flex items-center gap-2">
                                <Icon
                                  icon="lucide:chevron-right"
                                  width={15}
                                  height={15}
                                  className={`shrink-0 text-dash-muted transition-transform duration-150 ${abierta ? "rotate-90 text-[var(--estado-curso)]" : ""}`}
                                  aria-hidden
                                />
                                <span className="min-w-0">
                                  <span className="block text-[14px] font-bold tabular-nums tracking-tight text-dash-fg">{opRef(op)}</span>
                                  <span className="block max-w-[11rem] truncate text-[11.5px] text-dash-muted">{op.cliente || "—"}</span>
                                </span>
                              </span>
                            </td>
                            <td className="hidden whitespace-nowrap px-3 py-3 text-center font-mono text-[12.5px] font-bold uppercase tracking-[0.04em] text-dash-fg sm:table-cell">
                              {op.booking || <span className="font-sans font-normal text-dash-muted">—</span>}
                            </td>
                            <td className="hidden px-3 py-2 md:table-cell">
                              <span className="flex items-center gap-2">
                                {op.naviera ? (
                                  <NavieraLogo nombre={op.naviera} logoUrl={logosNaviera.get(op.naviera.trim().toUpperCase()) ?? null} size={28} />
                                ) : null}
                                <span className="truncate text-[13px] font-medium text-dash-muted">{op.naviera || "—"}</span>
                              </span>
                            </td>
                            <td className="hidden px-3 py-3 lg:table-cell">
                              <span className="block max-w-[12rem] truncate text-[13px] font-bold text-dash-fg">{op.nave || "—"}</span>
                              <span className="block text-[11.5px] tabular-nums text-dash-muted">{op.viaje || "—"}</span>
                            </td>
                            <td className="hidden px-3 py-3 xl:table-cell">
                              <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-dash-fg">
                                <Bandera puerto={op.pol} />
                                <span className="truncate">{op.pol || "—"}</span>
                              </span>
                            </td>
                            <td className="hidden px-3 py-3 lg:table-cell">
                              <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-dash-fg">
                                <Bandera puerto={op.pod} />
                                <span className="truncate">{op.pod || "—"}</span>
                              </span>
                            </td>
                            <td className="hidden whitespace-nowrap px-3 py-3 text-center text-[13px] font-semibold tabular-nums text-dash-fg md:table-cell">
                              {op.etd ? fmtFecha(op.etd) : "—"}
                            </td>
                            <td className="hidden whitespace-nowrap px-3 py-3 text-center text-[13px] font-semibold tabular-nums text-dash-fg xl:table-cell">
                              {op.eta ? fmtFecha(op.eta) : "—"}
                            </td>
                            <td className="hidden px-3 py-3 text-center sm:table-cell">
                              {estadoTxt ? (
                                <span
                                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11.5px] font-bold ${
                                    cfg ? `${cfg.bg} ${cfg.text} ${cfg.border}` : "border-dash-border text-dash-muted"
                                  }`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${cfg?.dot ?? "bg-dash-muted"}`} aria-hidden />
                                  {estadoTxt}
                                </span>
                              ) : (
                                <span className="text-dash-muted">—</span>
                              )}
                            </td>
                            {/* El papeleo: el ícono toma el color de su estado; la fracción, sin adornos. */}
                            <td className="whitespace-nowrap px-3 py-3 text-center" title={papeleo.label}>
                              <span className={`${papeleo.clase} inline-flex items-center gap-1.5`}>
                                <Icon icon="lucide:file-text" width={16} height={16} className="text-[var(--estado)]" aria-hidden />
                                <span className="text-[13px] font-bold tabular-nums text-dash-fg">
                                  {hechos} / {total}
                                </span>
                              </span>
                            </td>
                            <td className="relative px-2 py-3 text-center" data-row-action>
                              <button
                                type="button"
                                onClick={() => setMenuFila(menuAbierto ? null : op.id)}
                                className="motion-interactive inline-flex h-8 w-8 items-center justify-center rounded-lg text-dash-muted hover:bg-dash-control hover:text-dash-fg"
                                aria-label={tr.acciones}
                                aria-expanded={menuAbierto}
                              >
                                <Icon icon="lucide:more-vertical" width={16} height={16} />
                              </button>
                              {menuAbierto && (
                                <>
                                  <button type="button" aria-hidden tabIndex={-1} onClick={() => setMenuFila(null)} className="fixed inset-0 z-[60] cursor-default" />
                                  <div className="absolute right-2 top-full z-[61] mt-1 w-52 overflow-hidden rounded-xl border border-dash-border bg-dash-surface py-1 text-left shadow-xl">
                                    <button
                                      type="button"
                                      className="flex w-full items-center gap-2.5 px-3 py-2 text-[12.5px] font-semibold text-dash-fg hover:bg-[color-mix(in_srgb,var(--estado-curso)_12%,transparent)]"
                                      onClick={() => {
                                        setMenuFila(null);
                                        fila.toggle(op.id);
                                      }}
                                    >
                                      <Icon icon={abierta ? "lucide:chevrons-up" : "lucide:folder-open"} width={14} height={14} />
                                      {abierta ? trR.detalleReplegar : tr.abrirFicha}
                                    </button>
                                    {fuera ? (
                                      <span
                                        className="flex w-full cursor-not-allowed items-center gap-2.5 px-3 py-2 text-[12.5px] font-semibold text-dash-muted opacity-60"
                                        title={trR[`detalleNavitrack_${fuera}`]}
                                      >
                                        <Icon icon="lucide:radar" width={14} height={14} />
                                        {tr.verNavitrack}
                                      </span>
                                    ) : (
                                      <a
                                        href={`${withBase("/navitrack")}?op=${encodeURIComponent(op.id)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => setMenuFila(null)}
                                        className="flex w-full items-center gap-2.5 px-3 py-2 text-[12.5px] font-semibold text-dash-fg hover:bg-[color-mix(in_srgb,var(--estado-curso)_12%,transparent)]"
                                      >
                                        <Icon icon="lucide:radar" width={14} height={14} />
                                        {tr.verNavitrack}
                                        <Icon icon="lucide:arrow-up-right" width={12} height={12} className="ml-auto opacity-60" />
                                      </a>
                                    )}
                                  </div>
                                </>
                              )}
                            </td>
                          </tr>
                          {abierta && (
                            <tr className="bg-[color-mix(in_srgb,var(--estado-curso)_5%,transparent)]">
                              <td colSpan={COLUMNAS} className="p-0">
                                {renderFicha(op)}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {filteredOperaciones.length > 0 && (
              <div className="flex shrink-0 items-center justify-between border-t border-dash-border bg-[color-mix(in_srgb,var(--dash-control)_90%,transparent)] px-3 py-2">
                <span className="text-xs font-medium tabular-nums text-dash-muted">
                  {filteredOperaciones.length} {tr.registros}
                  {filteredOperaciones.length !== operaciones.length && ` / ${operaciones.length}`}
                </span>
                <span className="hidden text-xs text-dash-muted sm:inline">{tr.selectOperationPrompt}</span>
              </div>
            )}
          </div>
        </div>

        {/* Subir múltiples: cada archivo con el documento al que corresponde. */}
        {subida && (
          <div className="dash-neon fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" data-theme={theme}>
            <div className="dash-card motion-enter-lift flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl">
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-dash-border px-5 py-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="rd-icono flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                    <Icon icon="lucide:upload" width={18} height={18} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[16px] font-bold text-dash-fg">{tr.multiTitulo}</h3>
                    <p className="text-[12.5px] text-dash-muted">{tr.multiAyuda}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !subiendoVarios && setSubida(null)}
                  className="motion-interactive flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-dash-muted hover:bg-dash-control hover:text-dash-fg"
                  aria-label={tr.cancelar}
                >
                  <Icon icon="lucide:x" width={16} height={16} />
                </button>
              </div>
              <ul className="min-h-0 flex-1 divide-y divide-dash-border overflow-y-auto">
                {subida.map((item, idx) => {
                  const repetido = !!item.tipo && subida.some((o, j) => j !== idx && o.tipo === item.tipo);
                  const existe = !!item.tipo && !!documentosPorTipo.get(item.tipo as TipoDocumento);
                  const pdf = item.file.name.toLowerCase().endsWith(".pdf");
                  return (
                    <li key={idx} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <span className={`${pdf ? "estado--error" : "estado--ok"} shrink-0 text-[var(--estado)]`}>
                        <Icon icon={pdf ? "mdi:file-pdf-box" : "mdi:file-excel-box"} width={28} height={28} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-dash-fg" title={item.file.name}>{item.file.name}</p>
                        <p className="text-[11px] text-dash-muted">
                          {formatFileSize(item.file.size)}
                          {repetido ? <span className="estado--error ml-2 font-semibold text-[var(--estado)]">{tr.multiDuplicado}</span> : null}
                          {!repetido && existe ? <span className="estado--atencion ml-2 font-semibold text-[var(--estado)]">{tr.multiReemplaza}</span> : null}
                        </p>
                      </div>
                      <select
                        value={item.tipo}
                        disabled={subiendoVarios}
                        onChange={(e) =>
                          setSubida((prev) => prev && prev.map((o, j) => (j === idx ? { ...o, tipo: e.target.value } : o)))
                        }
                        className="dash-control w-full rounded-lg px-2.5 py-2 text-[12.5px] sm:w-60"
                        aria-label={tr.multiTipo}
                      >
                        <option value="">{tr.multiSinAsignar}</option>
                        {tiposOrdenados
                          .filter((t) => !isTipoMarcadoNoAplica(operacionActual, t))
                          .map((t) => (
                            <option key={t} value={t}>
                              {tr.tipoLabels[t as keyof typeof tr.tipoLabels] ?? TIPO_META[t].label}
                            </option>
                          ))}
                      </select>
                    </li>
                  );
                })}
              </ul>
              {(() => {
                const asignados = subida.filter((o) => o.tipo).length;
                const hayRepetidos = subida.some((o, i) => o.tipo && subida.some((x, j) => j !== i && x.tipo === o.tipo));
                return (
                  <div className="flex shrink-0 items-center justify-end gap-2 border-t border-dash-border px-5 py-3">
                    <button
                      type="button"
                      onClick={() => setSubida(null)}
                      disabled={subiendoVarios}
                      className="motion-interactive rounded-lg border border-dash-border bg-dash-control px-3.5 py-2 text-[12.5px] font-semibold text-dash-muted hover:text-dash-fg disabled:opacity-40"
                    >
                      {tr.cancelar}
                    </button>
                    <button
                      type="button"
                      onClick={() => void confirmarSubida()}
                      disabled={subiendoVarios || asignados === 0 || hayRepetidos}
                      className="btn-marca motion-interactive inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[12.5px] font-semibold disabled:pointer-events-none disabled:opacity-40"
                    >
                      <Icon
                        icon={subiendoVarios ? "lucide:loader-2" : "lucide:upload"}
                        width={15}
                        height={15}
                        className={subiendoVarios ? "animate-spin" : ""}
                        aria-hidden
                      />
                      {subiendoVarios ? tr.uploading : tr.multiSubir.replace("{n}", String(asignados))}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {previewDoc && (
          <div
            className="dash-neon fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            data-theme={theme}
            onClick={closePreview}
          >
            <div
              className="dash-card motion-enter-lift flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rd-hero flex shrink-0 items-center justify-between gap-3 px-5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="rd-vidrio flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                    <Icon
                      icon={isPdf(previewDoc.mime_type) ? "lucide:file-text" : "lucide:file-spreadsheet"}
                      className="rd-acento h-4 w-4"
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">{previewDoc.nombre_archivo}</p>
                    <p className="rd-muted text-sm">
                      {formatFileSize(previewDoc.tamano)} · {formatDate(previewDoc.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(previewDoc)}
                    className="rd-btn-primario motion-interactive inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold"
                  >
                    <Icon icon="lucide:download" className="h-3.5 w-3.5" />
                    {tr.download}
                  </button>
                  <button
                    type="button"
                    onClick={closePreview}
                    className="rd-btn motion-interactive inline-flex h-8 w-8 items-center justify-center rounded-full"
                    aria-label={tr.closeSelection}
                  >
                    <Icon icon="lucide:x" className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden bg-dash-control/50">
                {isPdf(previewDoc.mime_type) ? (
                  <iframe
                    src={`${previewDoc.url}#toolbar=1&navpanes=0`}
                    className="h-full w-full border-0"
                    title={previewDoc.nombre_archivo}
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-4">
                    <span className="rd-icono flex h-16 w-16 items-center justify-center rounded-xl">
                      <Icon icon="lucide:file-spreadsheet" className="h-8 w-8" />
                    </span>
                    <p className="text-base font-medium text-dash-fg">{tr.excelPreviewNotAvailable}</p>
                    <p className="text-base text-dash-muted">{tr.downloadToView}</p>
                    <button
                      type="button"
                      onClick={() => handleDownload(previewDoc)}
                      className="dash-cta inline-flex items-center gap-2 px-5 py-2.5 text-sm"
                    >
                      <Icon icon="lucide:download" className="h-4 w-4" />
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
