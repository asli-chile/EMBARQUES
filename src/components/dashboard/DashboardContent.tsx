import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { applyOperacionesClienteFilter, shouldSkipOperacionesForCliente } from "@/lib/auth/operacionesClienteScope";
import { aplicarFiltroTemporada } from "@/lib/temporadas";
import { useTemporadaActiva } from "@/lib/useTemporadaActiva";
import { DashboardViewTabs, type DashboardView } from "./DashboardViewTabs";
import { AnilloPizarra, Cifra, ListaRieles, PanelPizarra, retrasoEntrada, useEntrada, type FilaPizarra } from "./pizarra";
import { isoDePuerto } from "@/components/navitrack/navitrack-banderas";
import { format, formatDistanceToNow, addDays, startOfDay, startOfWeek, parseISO, isValid, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";
import { withBase } from "@/lib/basePath";
import { getPortCoordinates } from "@/lib/ports-coordinates";
import { formatRefAsli } from "@/lib/refAsli";
import MapLibreMap, { Marker, NavigationControl } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { NeonTheme } from "@/lib/ui/neonTheme";
import { esEstadoCerrado, etiquetaEstado, normalizarEstado } from "@/lib/operaciones/estados";

type OperacionResumen = {
  id: string;
  ref_asli: string | null;
  correlativo: number | null;
  cliente: string | null;
  naviera: string | null;
  nave: string | null;
  pol: string | null;
  pod: string | null;
  etd: string | null;
  estado_operacion: string | null;
  arribo_confirmado: boolean | null;
  especie: string | null;
  contenedor: string | null;
  booking_doc_url: string | null;
  enviado_transporte: boolean | null;
  transporte: string | null;
  corte_documental: string | null;
  fin_stacking: string | null;
  operacion_critica: boolean | null;
  prioridad: string | null;
  numero_factura_asli: string | null;
};

type TransportMode = "maritimo" | "aereo";

type PortMarker = {
  key: string;
  label: string;
  lng: number;
  lat: number;
  count: number;
  type: "origen" | "destino";
};

const DASHBOARD_MAP_STYLE_DARK =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const DASHBOARD_MAP_STYLE_LIGHT =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const REGION_KEYS = ["america", "europa", "indiaMedioOriente", "oceania", "asia", "otros"] as const;
type RegionKey = (typeof REGION_KEYS)[number];

/**
 * Cajas geográficas [lngMin, lngMax, latMin, latMax] evaluadas en orden.
 * Única fuente de verdad para agrupar destinos por región: si el puerto no
 * tiene coordenadas conocidas cae en "otros" en lugar de desaparecer.
 */
const REGION_BOXES: Array<{ key: RegionKey; box: [number, number, number, number] }> = [
  { key: "america", box: [-170, -30, -60, 75] },
  { key: "europa", box: [-15, 40, 35, 72] },
  { key: "indiaMedioOriente", box: [30, 80, 5, 40] },
  { key: "oceania", box: [110, 180, -50, 0] },
  { key: "asia", box: [80, 150, -10, 55] },
];

function regionFromCoordinates(lng: number, lat: number): RegionKey {
  for (const { key, box } of REGION_BOXES) {
    const [lngMin, lngMax, latMin, latMax] = box;
    if (lng >= lngMin && lng <= lngMax && lat >= latMin && lat <= latMax) return key;
  }
  return "otros";
}

function normText(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

function parseOpDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  try {
    const d = parseISO(value.length === 10 ? `${value}T12:00:00` : value);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

function opRefLabel(op: OperacionResumen): string {
  return formatRefAsli(op.ref_asli, op.correlativo) ?? "—";
}

type Props = {
  view: DashboardView;
  onViewChange: (view: DashboardView) => void;
  theme?: NeonTheme;
};

export function DashboardContent({
  view,
  onViewChange,
  theme = "dark",
}: Props) {
  const { t, locale } = useLocale();
  const { isLoading: authLoading, isCliente, isEjecutivo, empresaNombres } = useAuth();
  const tr = t.dashboard;
  const { temporadaActiva, temporadaLoading } = useTemporadaActiva();

  const [loading, setLoading] = useState(true);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [mapOperations, setMapOperations] = useState<OperacionResumen[]>([]);
  const [carrierModes, setCarrierModes] = useState<Map<string, TransportMode>>(new Map());
  const [showOrigins, setShowOrigins] = useState(true);
  const [showDestinations, setShowDestinations] = useState(true);
  const mapRef = useRef<MapRef | null>(null);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const buildFilteredQuery = useCallback(
    (selectCols: string) => {
      if (!supabase) throw new Error("Supabase not ready");
      let q = supabase.from("operaciones").select(selectCols).is("deleted_at", null);
      q = applyOperacionesClienteFilter(q, { isCliente, isEjecutivo, empresaNombres });
      q = aplicarFiltroTemporada(q, temporadaActiva);
      return q;
    },
    [supabase, isCliente, isEjecutivo, empresaNombres, temporadaActiva]
  );

  const fetchDashboardData = useCallback(async () => {
    if (!supabase || authLoading || temporadaLoading) return;
    if (shouldSkipOperacionesForCliente({ isCliente, isEjecutivo, empresaNombres })) {
      setMapOperations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [opsRes, carriersRes] = await Promise.all([
      buildFilteredQuery(
        "id, ref_asli, correlativo, cliente, naviera, nave, pol, pod, etd, estado_operacion, arribo_confirmado, especie, contenedor, booking_doc_url, enviado_transporte, transporte, corte_documental, fin_stacking, operacion_critica, prioridad, numero_factura_asli"
      ).limit(2000),
      supabase.from("navieras").select("nombre, modo_transporte"),
    ]);

    setMapOperations((opsRes.data ?? []) as unknown as OperacionResumen[]);

    const modes = new Map<string, TransportMode>();
    for (const row of (carriersRes.data ?? []) as Array<{ nombre: string | null; modo_transporte: string | null }>) {
      const key = normText(row.nombre);
      if (key) modes.set(key, row.modo_transporte === "aereo" ? "aereo" : "maritimo");
    }
    setCarrierModes(modes);

    setLastFetchedAt(new Date());
    setLoading(false);
  }, [supabase, authLoading, temporadaLoading, isCliente, isEjecutivo, empresaNombres, buildFilteredQuery]);

  useEffect(() => {
    if (!authLoading) void fetchDashboardData();
  }, [authLoading, fetchDashboardData]);

  const getLastUpdatedText = () => {
    if (!lastFetchedAt) return null;
    try {
      return formatDistanceToNow(lastFetchedAt, {
        addSuffix: false,
        locale: locale === "es" ? es : undefined,
      });
    } catch {
      return null;
    }
  };

  const portMarkers = useMemo<PortMarker[]>(() => {
    const originsMap = new Map<string, PortMarker>();
    const destinationsMap = new Map<string, PortMarker>();

    for (const op of mapOperations) {
      if (op.pol) {
        const originCoords = getPortCoordinates(op.pol);
        if (originCoords) {
          const [lng, lat] = originCoords;
          const key = `origen-${op.pol.toUpperCase()}`;
          const current = originsMap.get(key);
          if (current) {
            current.count += 1;
          } else {
            originsMap.set(key, { key, label: op.pol, lng, lat, count: 1, type: "origen" });
          }
        }
      }

      if (op.pod) {
        const destinationCoords = getPortCoordinates(op.pod);
        if (destinationCoords) {
          const [lng, lat] = destinationCoords;
          const key = `destino-${op.pod.toUpperCase()}`;
          const current = destinationsMap.get(key);
          if (current) {
            current.count += 1;
          } else {
            destinationsMap.set(key, { key, label: op.pod, lng, lat, count: 1, type: "destino" });
          }
        }
      }
    }

    return [...originsMap.values(), ...destinationsMap.values()];
  }, [mapOperations]);

  const activeClientsCount = useMemo(() => {
    const clients = new Set<string>();
    for (const op of mapOperations) {
      if (op.cliente) clients.add(op.cliente);
    }
    return clients.size;
  }, [mapOperations]);

  const operationalKpis = useMemo(() => {
    const today = startOfDay(new Date());
    const in7 = addDays(today, 7);
    const in3 = addDays(today, 3);

    let total = 0;
    let active = 0;
    let pending = 0;
    let confirmed = 0;
    let cancelled = 0;
    let arrived = 0;
    let rolled = 0;
    let etdNext7 = 0;
    let etdToday = 0;
    let etdTomorrow = 0;
    let cutoffNext3 = 0;
    let stackingClosing = 0;
    let transportPending = 0;
    let notSentToTransport = 0;
    let noBookingDoc = 0;
    let critical = 0;
    let invoicePending = 0;

    const byStatus = new Map<string, number>();
    const upcoming: Array<{
      id: string;
      ref: string;
      cliente: string;
      naviera: string;
      nave: string;
      pod: string;
      etd: Date;
      days: number;
      critico: boolean;
    }> = [];
    let nextDeparture: (typeof upcoming)[number] | null = null;

    for (const op of mapOperations) {
      total += 1;
      const codigo = normalizarEstado(op.estado_operacion);
      const estado = codigo ?? "SIN ESTADO";
      const cerrada = esEstadoCerrado(op.estado_operacion);
      byStatus.set(estado, (byStatus.get(estado) ?? 0) + 1);

      if (!cerrada) active += 1;
      if (codigo === "SOLICITADA") pending += 1;
      if (codigo === "RESERVA_CONFIRMADA") confirmed += 1;
      if (codigo === "CANCELADA") cancelled += 1;
      if (op.arribo_confirmado) arrived += 1;
      if (codigo === "ROLEADA") rolled += 1;
      if (op.operacion_critica || normText(op.prioridad) === "ALTA") critical += 1;

      const etd = parseOpDate(op.etd);
      if (etd && codigo !== "CANCELADA") {
        const etdDay = startOfDay(etd);
        if (etdDay >= today) {
          const days = differenceInCalendarDays(etdDay, today);
          const item = {
            id: op.id,
            ref: opRefLabel(op),
            cliente: op.cliente ?? "—",
            naviera: op.naviera ?? "—",
            nave: (op.nave ?? "").trim() || "—",
            pod: op.pod ?? "—",
            etd: etdDay,
            days,
            critico: !!(op.operacion_critica || normText(op.prioridad) === "ALTA"),
          };
          if (
            !nextDeparture ||
            etdDay < nextDeparture.etd ||
            (etdDay.getTime() === nextDeparture.etd.getTime() && item.ref.localeCompare(nextDeparture.ref) < 0)
          ) {
            nextDeparture = item;
          }
          if (etdDay <= in7) {
            etdNext7 += 1;
            if (days === 0) etdToday += 1;
            if (days === 1) etdTomorrow += 1;
            upcoming.push(item);
          }
        }
      }

      const corte = parseOpDate(op.corte_documental);
      if (corte) {
        const corteDay = startOfDay(corte);
        if (corteDay >= today && corteDay <= in3 && !cerrada) cutoffNext3 += 1;
      }

      const stackingEnd = parseOpDate(op.fin_stacking);
      if (stackingEnd) {
        const stackDay = startOfDay(stackingEnd);
        if (stackDay >= today && stackDay <= in3 && !cerrada) stackingClosing += 1;
      }

      if (op.enviado_transporte) {
        if (!op.transporte && !op.contenedor) transportPending += 1;
      } else if (!cerrada) {
        notSentToTransport += 1;
      }

      if (!op.booking_doc_url && !cerrada) noBookingDoc += 1;

      if (
        op.enviado_transporte &&
        (op.transporte || op.contenedor) &&
        !op.numero_factura_asli &&
        !cerrada
      ) {
        invoicePending += 1;
      }
    }

    upcoming.sort((a, b) => a.etd.getTime() - b.etd.getTime() || a.ref.localeCompare(b.ref));

    const statusItems = Array.from(byStatus.entries())
      .map(([estado, cantidad]) => ({ estado, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad || a.estado.localeCompare(b.estado));

    return {
      total,
      active,
      pending,
      confirmed,
      cancelled,
      arrived,
      rolled,
      etdNext7,
      etdToday,
      etdTomorrow,
      cutoffNext3,
      stackingClosing,
      transportPending,
      notSentToTransport,
      noBookingDoc,
      critical,
      invoicePending,
      statusItems,
      upcoming: upcoming.slice(0, 8),
      nextDeparture,
    };
  }, [mapOperations]);

  const clientsWithOperationCount = useMemo(() => {
    const countByClient = new Map<string, number>();
    for (const op of mapOperations) {
      if (!op.cliente) continue;
      countByClient.set(op.cliente, (countByClient.get(op.cliente) ?? 0) + 1);
    }
    return Array.from(countByClient.entries())
      .map(([cliente, cantidad]) => ({ cliente, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad || a.cliente.localeCompare(b.cliente));
  }, [mapOperations]);

  /** Vía real según `navieras.modo_transporte`; sin naviera conocida queda sin clasificar. */
  const transportDistribution = useMemo(() => {
    let maritima = 0;
    let aereo = 0;
    let desconocida = 0;
    for (const op of mapOperations) {
      const mode = carrierModes.get(normText(op.naviera));
      if (mode === "maritimo") maritima += 1;
      else if (mode === "aereo") aereo += 1;
      else desconocida += 1;
    }
    const clasificadas = maritima + aereo;
    return { maritima, aereo, desconocida, clasificadas, total: mapOperations.length };
  }, [mapOperations, carrierModes]);

  const regionDistribution = useMemo(() => {
    const counts = new Map<RegionKey, number>();
    for (const op of mapOperations) {
      if (!op.pod) continue;
      const coords = getPortCoordinates(op.pod);
      const region: RegionKey = coords ? regionFromCoordinates(coords[0], coords[1]) : "otros";
      counts.set(region, (counts.get(region) ?? 0) + 1);
    }
    const items = REGION_KEYS.map((region) => ({ region, count: counts.get(region) ?? 0 })).filter(
      (item) => item.count > 0
    );
    const max = Math.max(...items.map((i) => i.count), 1);
    return { items, max };
  }, [mapOperations]);

  /** Zarpes agrupados por semana ISO para las próximas 6 semanas. */
  const weeklyDepartures = useMemo(() => {
    const today = startOfDay(new Date());
    const firstWeek = startOfWeek(today, { weekStartsOn: 1 });
    const buckets = Array.from({ length: 6 }, (_, i) => ({
      start: addDays(firstWeek, i * 7),
      count: 0,
    }));
    const horizonEnd = addDays(firstWeek, 6 * 7);

    for (const op of mapOperations) {
      const etd = parseOpDate(op.etd);
      if (!etd) continue;
      const day = startOfDay(etd);
      if (day < today || day >= horizonEnd) continue;
      const index = Math.floor(differenceInCalendarDays(day, firstWeek) / 7);
      if (buckets[index]) buckets[index].count += 1;
    }

    const max = Math.max(...buckets.map((b) => b.count), 1);
    return { buckets, max };
  }, [mapOperations]);

  const speciesStats = useMemo(() => {
    const countBySpecies = new Map<string, number>();
    for (const op of mapOperations) {
      const name = (op.especie ?? "").trim();
      if (!name) continue;
      countBySpecies.set(name, (countBySpecies.get(name) ?? 0) + 1);
    }
    const ranked = Array.from(countBySpecies.entries())
      .map(([especie, cantidad]) => ({ especie, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad || a.especie.localeCompare(b.especie));
    return { distinct: ranked.length, ranked };
  }, [mapOperations]);

  const topNavieras = useMemo(() => {
    const byNaviera = new Map<string, number>();
    for (const op of mapOperations) {
      const name = (op.naviera ?? "").trim();
      if (!name) continue;
      byNaviera.set(name, (byNaviera.get(name) ?? 0) + 1);
    }
    const ranked = Array.from(byNaviera.entries())
      .map(([naviera, cantidad]) => ({ naviera, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad || a.naviera.localeCompare(b.naviera, "es"));
    return {
      distinct: ranked.length,
      topItems: ranked.slice(0, 5),
      max: Math.max(...ranked.map((item) => item.cantidad), 1),
    };
  }, [mapOperations]);

  /** POD (destino) con más operaciones por cada especie. */
  const speciesTopPodByEspecie = useMemo(() => {
    const bySpecies = new Map<string, Map<string, number>>();
    for (const op of mapOperations) {
      const esp = (op.especie ?? "").trim();
      const pod = (op.pod ?? "").trim();
      if (!esp || !pod) continue;
      let inner = bySpecies.get(esp);
      if (!inner) {
        inner = new Map();
        bySpecies.set(esp, inner);
      }
      inner.set(pod, (inner.get(pod) ?? 0) + 1);
    }
    const leaders = new Map<string, { pod: string; cantidad: number }>();
    for (const [esp, podCounts] of bySpecies) {
      let bestPod = "";
      let bestCount = 0;
      for (const [pod, c] of podCounts) {
        if (c > bestCount || (c === bestCount && pod.localeCompare(bestPod, "es") < 0)) {
          bestCount = c;
          bestPod = pod;
        }
      }
      if (bestPod) leaders.set(esp, { pod: bestPod, cantidad: bestCount });
    }
    return leaders;
  }, [mapOperations]);

  const topSpecies = useMemo(
    () =>
      speciesStats.ranked.slice(0, 5).map((item) => ({
        ...item,
        pod: speciesTopPodByEspecie.get(item.especie)?.pod ?? null,
      })),
    [speciesStats.ranked, speciesTopPodByEspecie]
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || portMarkers.length === 0) return;

    if (portMarkers.length === 1) {
      map.flyTo({ center: [portMarkers[0].lng, portMarkers[0].lat], zoom: 2.6, duration: 900 });
      return;
    }

    const lngs = portMarkers.map((m) => m.lng);
    const lats = portMarkers.map((m) => m.lat);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 68, duration: 900, maxZoom: 2.9 }
    );
  }, [portMarkers]);

  /* Entra una vez por carga; "Actualizar" vuelve a mostrar la entrada. */
  const listo = useEntrada(loading ? "cargando" : `${lastFetchedAt?.getTime() ?? 0}-${locale}`);
  const fmt = (n: number) => Math.round(n).toLocaleString(locale === "es" ? "es-CL" : "en-US");
  const d = retrasoEntrada;

  const encabezado = (
    <header className="hm-aparece flex shrink-0 flex-wrap items-center justify-between gap-3" style={d(0)}>
      <div className="min-w-0">
        <h1 className="hm-titulo">{tr.title}</h1>
        <p className="hm-sub truncate">
          {format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: locale === "es" ? es : undefined })}
          {lastFetchedAt && getLastUpdatedText() && (
            <> · {tr.lastUpdated} {getLastUpdatedText()}</>
          )}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <DashboardViewTabs view={view} onChange={onViewChange} />
        <a href={withBase("/reservas/crear")} className="hm-cta">
          <Icon icon="lucide:plus" className="h-4 w-4" />
          <span className="hidden sm:inline">{isCliente ? t.sidebar.solicitarReserva : t.sidebar.crearReserva}</span>
        </a>
        <a href={withBase("/reservas/mis-reservas")} className="hm-control hidden items-center gap-1.5 px-3 py-2 text-sm font-semibold sm:inline-flex">
          <Icon icon="lucide:list" className="h-4 w-4" />
          {t.sidebar.misReservas}
        </a>
        <button
          type="button"
          onClick={() => void fetchDashboardData()}
          className="hm-control p-2.5"
          title={tr.refresh}
          aria-label={tr.refresh}
        >
          <Icon icon="lucide:refresh-cw" className="h-4 w-4" />
        </button>
      </div>
    </header>
  );

  if (loading) {
    return (
      <main className="hm dash-page relative flex min-h-0 flex-1 flex-col overflow-y-auto lg:overflow-hidden">
        <div className="relative flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4 lg:px-6 lg:py-5">
          <div className="h-12 shrink-0" />
          <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="hm-panel motion-skeleton motion-skeleton-on-dark h-24" />
            ))}
          </div>
          <div className="hm-panel motion-skeleton motion-skeleton-on-dark min-h-[16rem] flex-1" />
          <div className="hm-panel motion-skeleton motion-skeleton-on-dark h-48 shrink-0" />
        </div>
      </main>
    );
  }

  const opsHref = withBase(isCliente ? "/reservas/mis-reservas" : "/registros");
  const dateLocale = locale === "es" ? es : undefined;
  const next = operationalKpis.nextDeparture;
  const nextZarpeValue = next
    ? next.days === 0
      ? tr.today
      : next.days === 1
        ? tr.tomorrow
        : format(next.etd, "d MMM", { locale: dateLocale })
    : "—";
  const nextZarpeHint = next
    ? [next.nave !== "—" ? next.nave : null, next.pod !== "—" ? next.pod : null].filter(Boolean).join(" · ")
    : tr.noNextDepartureHint;

  type KpiEnCurso = {
    key: string;
    label: string;
    icon: string;
    href: string;
    valor?: number;
    texto?: string;
    nota: string;
    /** Acento de estado cuando hay algo que mirar hoy. */
    tono?: "atencion" | "error";
  };

  const kpis: KpiEnCurso[] = [
    {
      key: "total",
      label: tr.totalOperations,
      icon: "lucide:ship",
      href: opsHref,
      valor: operationalKpis.total,
      nota: `${fmt(operationalKpis.active)} ${tr.activeOps}`,
    },
    {
      key: "pending",
      label: tr.pending,
      icon: "lucide:calendar-days",
      href: opsHref,
      valor: operationalKpis.pending,
      nota: `${fmt(operationalKpis.confirmed)} ${tr.confirmed}`,
    },
    {
      key: "etd",
      label: tr.nextDeparture,
      icon: "lucide:calendar-check-2",
      href: opsHref,
      texto: nextZarpeValue,
      nota: nextZarpeHint,
      tono: next && next.days <= 1 ? "atencion" : undefined,
    },
    {
      key: "cutoff",
      label: tr.docCutoffSoon,
      icon: "lucide:file-text",
      href: withBase("/documentos/mis-documentos"),
      valor: operationalKpis.cutoffNext3,
      nota: tr.docCutoffSoonHint,
      tono: operationalKpis.cutoffNext3 > 0 ? "atencion" : undefined,
    },
    {
      key: "stacking",
      label: tr.stackingClosing,
      icon: "lucide:box",
      href: opsHref,
      valor: operationalKpis.stackingClosing,
      nota: tr.stackingClosingHint,
      tono: operationalKpis.stackingClosing > 0 ? "atencion" : undefined,
    },
    {
      key: "critical",
      label: tr.criticalOps,
      icon: "lucide:alert-triangle",
      href: opsHref,
      valor: operationalKpis.critical,
      nota:
        operationalKpis.invoicePending > 0
          ? `${fmt(operationalKpis.invoicePending)} ${tr.invoicePending}`
          : `${fmt(operationalKpis.rolled)} ${tr.rolled}`,
      tono: operationalKpis.critical > 0 ? "error" : undefined,
    },
  ];

  const upcomingRows = operationalKpis.upcoming.slice(0, 6);

  /* Estados en tokens del ERP: confirmada en curso (teal), solicitada pide
     atención (ámbar), cancelada en rojo; el resto, gris de espera. */
  const otrosEstados = Math.max(
    0,
    operationalKpis.total - operationalKpis.confirmed - operationalKpis.cancelled - operationalKpis.pending,
  );
  const filasEstado: FilaPizarra[] = [
    { label: etiquetaEstado("RESERVA_CONFIRMADA"), valor: operationalKpis.confirmed, color: "var(--estado-curso)" },
    { label: etiquetaEstado("SOLICITADA"), valor: operationalKpis.pending, color: "var(--estado-atencion)" },
    { label: etiquetaEstado("CANCELADA"), valor: operationalKpis.cancelled, color: "var(--estado-error)" },
    { label: tr.statusOthers, valor: otrosEstados, color: "var(--estado-espera)" },
  ];

  const regionLabels: Record<RegionKey, string> = {
    america: tr.regionAmerica,
    europa: tr.regionEurope,
    indiaMedioOriente: tr.regionIndiaMiddleEast,
    oceania: tr.regionOceania,
    asia: tr.regionAsia,
    otros: tr.regionOther,
  };
  const filasRegion: FilaPizarra[] = regionDistribution.items
    .slice(0, 5)
    .map((item) => ({ label: regionLabels[item.region], valor: item.count }));
  const viaResumen = [
    transportDistribution.maritima > 0 ? `${tr.maritime} ${fmt(transportDistribution.maritima)}` : null,
    transportDistribution.aereo > 0 ? `${tr.air} ${fmt(transportDistribution.aereo)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const filasClientes: FilaPizarra[] = clientsWithOperationCount.slice(0, 5).map((c) => ({ label: c.cliente, valor: c.cantidad }));
  const filasNavieras: FilaPizarra[] = topNavieras.topItems.map((n) => ({ label: n.naviera, valor: n.cantidad }));
  const filasEspecies: FilaPizarra[] = topSpecies.map((s) => ({ label: s.especie, valor: s.cantidad }));
  const maxSemana = Math.max(1, ...weeklyDepartures.buckets.map((b) => b.count));

  return (
    <main className={`hm ${listo ? "hm--listo" : ""} dash-page relative flex min-h-0 flex-1 flex-col overflow-y-auto text-base lg:overflow-hidden`}>
      <svg className="hm-ruta" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden>
        <path d="M -40 760 C 300 700 420 520 700 540 S 1150 760 1380 520 S 1560 140 1680 90" />
      </svg>

      <div className="relative flex min-h-0 flex-1 flex-col gap-3 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4 lg:gap-3.5 lg:px-6 lg:py-5">
        {encabezado}

        {/* indicadores del día */}
        <section className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-3.5" aria-label={tr.title}>
          {kpis.map((k, i) => (
            <a
              key={k.key}
              href={k.href}
              className={`hm-panel hm-kpi hm-aparece ${k.tono ? `hm-kpi--${k.tono}` : ""}`}
              style={d(80 + i * 55)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="hm-kpi-nombre line-clamp-1">{k.label}</span>
                <span className="hm-kpi-ico" aria-hidden>
                  <Icon icon={k.icon} width={16} height={16} />
                </span>
              </div>
              {k.valor != null ? (
                <b className="hm-kpi-valor tabular-nums">
                  <Cifra valor={k.valor} activo={listo} retraso={180 + i * 55} formato={fmt} />
                </b>
              ) : (
                <b className="hm-kpi-texto truncate">{k.texto}</b>
              )}
              <span className="hm-kpi-nota line-clamp-1">{k.nota}</span>
              <span className="hm-franja" style={d(80 + i * 55)} />
            </a>
          ))}
        </section>

        {/* zarpes · estados · mapa */}
        <section className="grid min-h-0 grid-cols-1 gap-3 lg:flex-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.95fr)_minmax(0,1.15fr)] lg:gap-3.5">
          <PanelPizarra
            titulo={tr.upcomingDepartures}
            retraso={360}
            className="min-h-[18rem] lg:min-h-0"
            extra={
              <a href={opsHref} className="hm-link">
                {tr.viewAll}
                <Icon icon="lucide:arrow-right" width={14} height={14} />
              </a>
            }
          >
            {upcomingRows.length === 0 ? (
              <p className="hm-vacio">{tr.noUpcoming}</p>
            ) : (
              <div className="hm-zarpes">
                {upcomingRows.map((item) => {
                  const iso = isoDePuerto(item.pod);
                  return (
                    <div key={item.id} className="hm-zarpe">
                      <span className="hm-zarpe-ref">
                        {item.ref}
                        {item.critico && (
                          <Icon
                            icon="lucide:alert-triangle"
                            width={15}
                            height={15}
                            style={{ color: "var(--estado-error)" }}
                            aria-label={tr.criticalOps}
                          />
                        )}
                      </span>
                      <span className="hm-zarpe-det">
                        {iso && <Icon icon={`circle-flags:${iso.toLowerCase()}`} width={15} height={15} className="shrink-0" aria-hidden />}
                        <span>{[isCliente ? null : item.cliente, item.pod].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className="hm-zarpe-cuando">
                        <span
                          className={`hm-dias ${item.days === 0 ? "hm-dias--hoy" : item.days === 1 ? "hm-dias--manana" : ""}`}
                        >
                          {item.days === 0 ? tr.today : item.days === 1 ? tr.tomorrow : `${item.days} d`}
                        </span>
                        <small>{format(item.etd, "d MMM", { locale: dateLocale })}</small>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </PanelPizarra>

          <PanelPizarra titulo={tr.byStatus} extra={tr.statusSub} retraso={420} className="min-h-[16rem] lg:min-h-0">
            <AnilloPizarra
              filas={filasEstado}
              listo={listo}
              retraso={420}
              formato={fmt}
              centro={operationalKpis.total}
              centroTexto={tr.statusTotal}
              vacio={tr.noData}
              etiqueta={tr.byStatus}
            />
          </PanelPizarra>

          <PanelPizarra
            titulo={tr.shipmentMap}
            retraso={480}
            className="h-72 lg:h-auto lg:min-h-0"
            extra={
              <span className="flex items-center gap-1.5">
                <button type="button" className="hm-filtro" aria-pressed={showOrigins} onClick={() => setShowOrigins((v) => !v)}>
                  <i style={{ background: "var(--hm-teal-dato)" }} />
                  {tr.mapOrigins}
                </button>
                <button type="button" className="hm-filtro" aria-pressed={showDestinations} onClick={() => setShowDestinations((v) => !v)}>
                  <i style={{ background: "var(--hm-oliva-dato)" }} />
                  {tr.mapDestinations}
                </button>
              </span>
            }
          >
            <div className="hm-mapa isolate">
              <MapLibreMap
                ref={mapRef}
                initialViewState={{ longitude: -30, latitude: 5, zoom: 0.45 }}
                mapStyle={theme === "light" ? DASHBOARD_MAP_STYLE_LIGHT : DASHBOARD_MAP_STYLE_DARK}
                style={{ width: "100%", height: "100%" }}
                dragRotate={false}
                attributionControl={false}
              >
                <NavigationControl position="top-right" showCompass={false} />
                {portMarkers
                  .filter((m) => (m.type === "origen" ? showOrigins : showDestinations))
                  .map((marker) => (
                    <Marker key={marker.key} longitude={marker.lng} latitude={marker.lat} anchor="center">
                      <div
                        title={`${marker.label} (${marker.count})`}
                        className="hm-marca-mapa"
                        style={{
                          background: marker.type === "origen" ? "var(--hm-teal-dato)" : "var(--hm-oliva-dato)",
                          color: marker.type === "origen" ? "var(--hm-teal-dato)" : "var(--hm-oliva-dato)",
                        }}
                      />
                    </Marker>
                  ))}
              </MapLibreMap>
            </div>
          </PanelPizarra>
        </section>

        {/* desglose */}
        <section
          className={`grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:h-[clamp(11rem,24vh,15rem)] lg:gap-3.5 ${
            isCliente ? "lg:grid-cols-4" : "lg:grid-cols-5"
          }`}
        >
          {!isCliente && (
            <PanelPizarra titulo={tr.activeClients} extra={fmt(activeClientsCount)} retraso={540} className="min-h-[12rem] lg:min-h-0">
              <ListaRieles filas={filasClientes} listo={listo} retraso={540} formato={fmt} vacio="—" base={operationalKpis.total || 1} />
            </PanelPizarra>
          )}

          <PanelPizarra titulo={tr.weeklyDepartures} extra={tr.weeklyDeparturesHint} retraso={600} className="min-h-[12rem] lg:min-h-0">
            <div className="hm-semanas">
              {weeklyDepartures.buckets.map((bucket, i) => {
                const alto = (bucket.count / (maxSemana * 1.25)) * 100;
                return (
                  <div
                    key={bucket.start.toISOString()}
                    className={`hm-columna ${bucket.count === 0 ? "es-cero" : ""}`}
                    style={d(700 + i * 45)}
                  >
                    <i style={{ height: `${Math.max(alto, 1.5)}%` }} />
                    <em style={{ bottom: `${alto}%`, fontSize: 13 }}>{bucket.count}</em>
                  </div>
                );
              })}
            </div>
            <div className="hm-semanas-rotulos" aria-hidden>
              {weeklyDepartures.buckets.map((bucket) => (
                <span key={bucket.start.toISOString()}>{format(bucket.start, "d MMM", { locale: dateLocale })}</span>
              ))}
            </div>
          </PanelPizarra>

          <PanelPizarra titulo={tr.byRegion} extra={viaResumen || tr.modeUnknown} retraso={660} className="min-h-[12rem] lg:min-h-0">
            <ListaRieles filas={filasRegion} listo={listo} retraso={660} formato={fmt} vacio={tr.noData} />
          </PanelPizarra>

          <PanelPizarra titulo={tr.topCarriers} extra={fmt(topNavieras.distinct)} retraso={720} className="min-h-[12rem] lg:min-h-0">
            <ListaRieles filas={filasNavieras} listo={listo} retraso={720} formato={fmt} vacio={tr.noCarriers} base={operationalKpis.total || 1} />
          </PanelPizarra>

          <PanelPizarra titulo={tr.species} extra={fmt(speciesStats.distinct)} retraso={780} className="min-h-[12rem] lg:min-h-0">
            <ListaRieles filas={filasEspecies} listo={listo} retraso={780} formato={fmt} vacio={tr.noData} base={operationalKpis.total || 1} />
          </PanelPizarra>
        </section>
      </div>
    </main>
  );
}
