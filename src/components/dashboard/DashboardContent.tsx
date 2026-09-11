import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { applyOperacionesClienteFilter, shouldSkipOperacionesForCliente } from "@/lib/auth/operacionesClienteScope";
import { aplicarFiltroTemporada } from "@/lib/temporadas";
import { useTemporadaActiva } from "@/lib/useTemporadaActiva";
import { DashboardViewTabs, type DashboardView } from "./DashboardViewTabs";
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
        "id, ref_asli, correlativo, cliente, naviera, pol, pod, etd, estado_operacion, arribo_confirmado, especie, contenedor, booking_doc_url, enviado_transporte, transporte, corte_documental, fin_stacking, operacion_critica, prioridad, numero_factura_asli"
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
      pod: string;
      etd: Date;
      days: number;
      critico: boolean;
    }> = [];

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
      if (etd) {
        const etdDay = startOfDay(etd);
        if (etdDay >= today && etdDay <= in7) {
          etdNext7 += 1;
          const days = differenceInCalendarDays(etdDay, today);
          if (days === 0) etdToday += 1;
          if (days === 1) etdTomorrow += 1;
          upcoming.push({
            id: op.id,
            ref: opRefLabel(op),
            cliente: op.cliente ?? "—",
            naviera: op.naviera ?? "—",
            pod: op.pod ?? "—",
            etd: etdDay,
            days,
            critico: !!(op.operacion_critica || normText(op.prioridad) === "ALTA"),
          });
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

  const modeDonutStyle = useMemo(() => {
    const total = Math.max(transportDistribution.total, 1);
    const pMar = (transportDistribution.maritima / total) * 100;
    const pAir = (transportDistribution.aereo / total) * 100;
    const pUnk = (transportDistribution.desconocida / total) * 100;
    if (transportDistribution.total === 0) return "conic-gradient(#1e293b 0 100%)";
    return `conic-gradient(#38bdf8 0% ${pMar}%, #a78bfa ${pMar}% ${pMar + pAir}%, #64748b ${pMar + pAir}% ${pMar + pAir + pUnk}%)`;
  }, [transportDistribution]);

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

  if (loading) {
    return (
      <main className="dash-page relative flex flex-1 min-h-0 flex-col overflow-y-auto lg:overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="absolute top-16 right-0 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
        </div>
        <div className="dash-toolbar relative shrink-0 h-14" />
        <div className="relative p-4 flex flex-col gap-4 lg:flex-1 lg:min-h-0 lg:p-4 lg:gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 h-28 lg:h-14">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="motion-skeleton motion-skeleton-on-dark dash-card rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-3 lg:flex-1 lg:min-h-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="motion-skeleton motion-skeleton-on-dark dash-card rounded-xl h-56 lg:h-auto" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="motion-skeleton motion-skeleton-on-dark dash-card rounded-xl h-40 lg:h-32" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  const opsHref = withBase(isCliente ? "/reservas/mis-reservas" : "/registros");

  const kpiCards = [
    {
      key: "total",
      label: tr.totalOperations,
      value: operationalKpis.total,
      hint: `${operationalKpis.active} ${tr.activeOps}`,
      icon: "lucide:ship",
      iconAlt: "lucide:users",
      tone: "cyan" as const,
      href: opsHref,
    },
    {
      key: "pending",
      label: tr.pending,
      value: operationalKpis.pending,
      hint: `${operationalKpis.confirmed} ${tr.confirmed}`,
      icon: "lucide:calendar-days",
      iconAlt: "lucide:clock-3",
      tone: "amber" as const,
      href: opsHref,
    },
    {
      key: "etd",
      label: tr.upcomingDepartures,
      value: operationalKpis.etdNext7,
      hint: `${operationalKpis.etdToday} ${tr.today} · ${operationalKpis.etdTomorrow} ${tr.tomorrow}`,
      icon: "lucide:calendar-check-2",
      iconAlt: "lucide:ship",
      tone: "sky" as const,
      href: opsHref,
    },
    {
      key: "cutoff",
      label: tr.docCutoffSoon,
      value: operationalKpis.cutoffNext3,
      hint: tr.docCutoffSoonHint,
      icon: "lucide:file-text",
      iconAlt: "lucide:info",
      tone: "blue" as const,
      href: withBase("/documentos/mis-documentos"),
    },
    {
      key: "stacking",
      label: tr.stackingClosing,
      value: operationalKpis.stackingClosing,
      hint: tr.stackingClosingHint,
      icon: "lucide:box",
      iconAlt: "lucide:package",
      tone: "violet" as const,
      href: opsHref,
    },
    {
      key: "critical",
      label: tr.criticalOps,
      value: operationalKpis.critical,
      hint: operationalKpis.invoicePending > 0
        ? `${operationalKpis.invoicePending} ${tr.invoicePending}`
        : `${operationalKpis.rolled} ${tr.rolled}`,
      icon: "lucide:alert-triangle",
      iconAlt: "lucide:flag",
      tone: "red" as const,
      href: opsHref,
    },
  ] as const;

  const upcomingRows = operationalKpis.upcoming.slice(0, 5);
  const topClients = clientsWithOperationCount.slice(0, 5);
  const topNav = topNavieras.topItems;

  const regionLabels: Record<RegionKey, string> = {
    america: tr.regionAmerica,
    europa: tr.regionEurope,
    indiaMedioOriente: tr.regionIndiaMiddleEast,
    oceania: tr.regionOceania,
    asia: tr.regionAsia,
    otros: tr.regionOther,
  };

  return (
    <main className="dash-page relative flex min-h-0 flex-1 flex-col overflow-y-auto text-base lg:overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-dash-neon-hot/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-dash-neon/15 blur-3xl" />
      </div>

      {/* Header */}
      <div className="dash-toolbar relative z-10 shrink-0">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h1 className="dash-title text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{tr.title}</h1>
            <p className="dash-subtitle mt-1 truncate text-sm">
              {format(new Date(), "EEE d MMM yyyy", { locale: locale === "es" ? es : undefined })}
              {lastFetchedAt && getLastUpdatedText() && (
                <> · {tr.lastUpdated} {getLastUpdatedText()}</>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <DashboardViewTabs view={view} onChange={onViewChange} />
            <a href={withBase("/reservas/crear")}
              className="dash-cta inline-flex items-center gap-1.5 px-3.5 py-2.5 text-base transition-colors">
              <Icon icon="lucide:plus" className="h-5 w-5" />
              <span className="hidden sm:inline">{isCliente ? t.sidebar.solicitarReserva : t.sidebar.crearReserva}</span>
            </a>
            <a href={withBase("/reservas/mis-reservas")}
              className="dash-control hidden items-center gap-1.5 rounded-lg px-3.5 py-2 text-base font-medium transition-colors sm:inline-flex">
              <Icon icon="lucide:list" className="h-5 w-5" />
              {t.sidebar.misReservas}
            </a>
            <button type="button" onClick={() => void fetchDashboardData()}
              className="dash-control rounded-lg p-2.5 transition-colors"
              title={tr.refresh}>
              <Icon icon="lucide:refresh-cw" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative flex flex-col gap-4 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:flex-1 lg:min-h-0 lg:overflow-hidden lg:gap-3 lg:p-4">

        {/* KPIs */}
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {kpiCards.map((kpi) => {
            const spark = Array.from({ length: 7 }, (_, i) => {
              const n = ((Math.abs(kpi.value) + 1) * (i + 3) * 19) % 51;
              return 0.28 + (n / 51) * 0.72;
            });
            return (
              <a
                key={kpi.key}
                href={kpi.href}
                className={`dash-card dash-kpi-card dash-kpi-card--${kpi.tone} min-w-0 rounded-2xl px-3 py-3`}
              >
                <div className="relative z-[1] flex items-start justify-between gap-2">
                  <span className="dash-kpi-icon" aria-hidden>
                    <Icon icon={kpi.icon} width={18} height={18} />
                  </span>
                  <Icon
                    icon={kpi.iconAlt}
                    width={15}
                    height={15}
                    className="dash-kpi-icon-alt shrink-0 mt-0.5"
                    aria-hidden
                  />
                </div>
                <p className="dash-kpi-label relative z-[1] mt-2.5 text-dash-fg leading-snug line-clamp-2">
                  {kpi.label}
                </p>
                <div className="relative z-[1] mt-2 flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <p className="dash-kpi-value text-3xl font-bold sm:text-[2rem]">{kpi.value}</p>
                    <p className="dash-kpi-hint mt-1 text-[11px] leading-snug line-clamp-2 sm:text-xs">
                      {kpi.hint}
                    </p>
                  </div>
                  <div className="dash-kpi-spark" aria-hidden>
                    {spark.map((h, i) => (
                      <span key={i} style={{ height: `${Math.round(h * 100)}%` }} />
                    ))}
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {/* Fila media: zarpes | estados | mapa */}
        <div className="grid grid-cols-1 gap-4 lg:flex-1 lg:min-h-[280px] lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)_minmax(0,1.1fr)] lg:gap-3">
          {/* Zarpes */}
          <div className="dash-card rounded-xl overflow-hidden flex flex-col lg:min-h-0">
            <div className="dash-section-head shrink-0 px-4 py-3 flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-2 text-base font-bold text-dash-fg truncate">
                <Icon icon="lucide:ship" width={18} height={18} className="text-dash-neon shrink-0" />
                {tr.upcomingDepartures}
              </p>
              <a href={opsHref} className="inline-flex items-center gap-1 text-sm font-semibold text-dash-neon hover:text-cyan-200">
                {tr.viewAll}
                <Icon icon="lucide:arrow-right" width={14} height={14} />
              </a>
            </div>
            <div className="lg:flex-1 lg:min-h-0 lg:overflow-auto">
              {upcomingRows.length === 0 ? (
                <div className="flex items-center justify-center px-6 py-10 lg:py-6 lg:h-full text-center">
                  <p className="text-base sm:text-lg text-dash-muted leading-relaxed max-w-sm">{tr.noUpcoming}</p>
                </div>
              ) : (
                <table className="w-full text-left text-base">
                  <thead className="sticky top-0 bg-dash-surface">
                    <tr className="text-sm text-dash-muted border-b border-cyan-300/10">
                      <th className="px-4 py-2.5 font-bold">{tr.colRef}</th>
                      <th className="px-4 py-2.5 font-bold hidden sm:table-cell">{tr.colClient}</th>
                      <th className="px-4 py-2.5 font-bold">{tr.colPod}</th>
                      <th className="px-4 py-2.5 font-bold">{tr.colWhen}</th>
                      <th className="px-4 py-2.5 font-bold hidden md:table-cell">{tr.colEtd}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyan-300/10">
                    {upcomingRows.map((item) => (
                      <tr key={item.id} className="hover:bg-cyan-400/5">
                        <td className="px-4 py-2.5 font-bold text-dash-fg whitespace-nowrap">
                          {item.ref}
                          {item.critico && <Icon icon="lucide:alert-triangle" width={16} height={16} className="inline ml-1.5 text-red-300" />}
                        </td>
                        <td className="px-4 py-2.5 text-dash-fg/90 truncate max-w-[8rem] hidden sm:table-cell">{item.cliente}</td>
                        <td className="px-4 py-2.5 text-dash-fg/85 truncate max-w-[6rem]">{item.pod}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-sm font-bold px-2.5 py-1 rounded-md border ${
                            item.days === 0
                              ? "bg-red-500/15 text-red-300 border-red-400/30"
                              : item.days === 1
                                ? "bg-amber-500/15 text-amber-300 border-amber-400/30"
                                : "bg-cyan-500/10 text-cyan-300 border-cyan-400/25"
                          }`}>
                            {item.days === 0 ? tr.today : item.days === 1 ? tr.tomorrow : `${item.days}d`}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-dash-muted whitespace-nowrap hidden md:table-cell">
                          {format(item.etd, "d MMM yyyy", { locale: locale === "es" ? es : undefined })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Estados — donut */}
          <div className="dash-card rounded-xl overflow-hidden flex flex-col lg:min-h-0">
            <div className="dash-section-head shrink-0 px-4 py-3">
              <p className="inline-flex items-center gap-2 text-base font-bold text-dash-fg">
                <Icon icon="lucide:layout-grid" width={18} height={18} className="text-dash-neon shrink-0" />
                {tr.byStatus}
              </p>
            </div>
            {(() => {
              const confirmed = operationalKpis.confirmed;
              const cancelled = operationalKpis.cancelled;
              const requested = operationalKpis.pending;
              const total = operationalKpis.total;
              const other = Math.max(0, total - confirmed - cancelled - requested);
              const safeTotal = total > 0 ? total : 1;
              const pConf = (confirmed / safeTotal) * 100;
              const pCanc = (cancelled / safeTotal) * 100;
              const pReq = (requested / safeTotal) * 100;
              const pOther = (other / safeTotal) * 100;
              const a0 = 0;
              const a1 = a0 + pConf;
              const a2 = a1 + pCanc;
              const a3 = a2 + pReq;
              const donut =
                total === 0
                  ? "conic-gradient(#1e293b 0 100%)"
                  : `conic-gradient(
                      #38bdf8 ${a0}% ${a1}%,
                      #f87171 ${a1}% ${a2}%,
                      #fbbf24 ${a2}% ${a3}%,
                      #64748b ${a3}% ${a3 + pOther}%
                    )`;
              const legend = [
                { label: etiquetaEstado("RESERVA_CONFIRMADA"), value: confirmed, color: "bg-sky-400" },
                { label: etiquetaEstado("CANCELADA"), value: cancelled, color: "bg-red-400" },
                { label: etiquetaEstado("SOLICITADA"), value: requested, color: "bg-amber-400" },
              ];
              return (
                <>
                  <div className="px-4 py-4 flex flex-1 min-h-0 items-center gap-4">
                    <div
                      className="dash-status-donut relative shrink-0"
                      style={{ background: donut }}
                      aria-hidden
                    >
                      <div className="dash-status-donut-hole">
                        <p className="text-2xl font-bold text-dash-fg tabular-nums leading-none">{total}</p>
                        <p className="text-[11px] text-dash-muted mt-1">{tr.statusTotal}</p>
                      </div>
                    </div>
                    <ul className="min-w-0 flex-1 space-y-2.5">
                      {legend.map((item) => (
                        <li key={item.label} className="flex items-center justify-between gap-2 text-sm">
                          <span className="inline-flex items-center gap-2 text-dash-fg truncate">
                            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${item.color}`} />
                            {item.label}
                          </span>
                          <span className="tabular-nums font-semibold text-dash-fg shrink-0">{item.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="shrink-0 px-4 py-3 border-t border-cyan-300/15 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-emerald-300 tabular-nums">{confirmed}</p>
                      <p className="text-xs text-dash-muted mt-0.5">{tr.confirmedTitle}</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-300 tabular-nums">{cancelled}</p>
                      <p className="text-xs text-dash-muted mt-0.5">{tr.cancelledTitle}</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-amber-300 tabular-nums">{requested}</p>
                      <p className="text-xs text-dash-muted mt-0.5">{tr.requestedTitle}</p>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Mapa */}
          <div className="relative isolate z-0 h-64 sm:h-72 lg:h-full lg:min-h-0 dash-card rounded-xl overflow-hidden flex flex-col">
            <div className="dash-section-head relative z-20 shrink-0 px-4 py-3 flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-2 text-base font-bold text-dash-fg truncate">
                <Icon icon="lucide:box" width={18} height={18} className="text-dash-neon shrink-0" />
                {tr.shipmentMap}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowOrigins((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold transition-colors ${
                    showOrigins
                      ? "border-sky-500/55 bg-sky-500/20 text-sky-700 dash-map-toggle-origen"
                      : "border-dash-border bg-dash-control text-dash-muted"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                  {tr.mapOrigins}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDestinations((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold transition-colors ${
                    showDestinations
                      ? "border-emerald-500/55 bg-emerald-500/20 text-emerald-700 dash-map-toggle-destino"
                      : "border-dash-border bg-dash-control text-dash-muted"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {tr.mapDestinations}
                </button>
              </div>
            </div>
            <div className="relative flex-1 min-h-0">
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
                  .map((marker) => {
                    const isOrigin = marker.type === "origen";
                    return (
                      <Marker key={marker.key} longitude={marker.lng} latitude={marker.lat} anchor="center">
                        <div
                          title={`${marker.label} (${marker.count})`}
                          className={`h-3.5 w-3.5 rounded-full border-2 border-white shadow-[0_0_12px_currentColor] ${
                            isOrigin ? "bg-sky-400 text-sky-400" : "bg-emerald-400 text-emerald-400"
                          }`}
                        />
                      </Marker>
                    );
                  })}
              </MapLibreMap>
            </div>
          </div>
        </div>

        {/* Fila inferior */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 lg:gap-3 lg:shrink-0 lg:min-h-[200px]">
          {/* Clientes */}
          <div className="dash-card rounded-xl overflow-hidden flex flex-col lg:min-h-0">
            <div className="dash-section-head shrink-0 px-4 py-3 flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-2 text-base font-bold text-dash-fg truncate">
                <Icon icon="lucide:users" width={18} height={18} className="text-dash-neon shrink-0" />
                {tr.activeClients}
              </p>
              <p className="text-2xl font-bold text-dash-neon tabular-nums">{activeClientsCount}</p>
            </div>
            <div className="lg:flex-1 lg:min-h-0 lg:overflow-auto">
              {topClients.length === 0 ? (
                <p className="px-4 py-3 text-base text-dash-muted">—</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-dash-surface">
                    <tr className="text-dash-muted border-b border-cyan-300/10">
                      <th className="px-4 py-2 font-bold">{tr.colClient}</th>
                      <th className="px-2 py-2 font-bold text-right">{tr.colOperations}</th>
                      <th className="px-4 py-2 font-bold w-[40%]">{tr.colPct}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyan-300/10">
                    {topClients.map((item) => {
                      const pct =
                        operationalKpis.total > 0
                          ? Math.round((item.cantidad / operationalKpis.total) * 100)
                          : 0;
                      return (
                        <tr key={item.cliente}>
                          <td className="px-4 py-2.5 text-dash-fg font-semibold truncate max-w-[7rem]">{item.cliente}</td>
                          <td className="px-2 py-2.5 text-right tabular-nums text-dash-fg font-semibold">{item.cantidad}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 rounded-full bg-cyan-950/50 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-sky-400"
                                  style={{ width: `${Math.max(pct, 4)}%` }}
                                />
                              </div>
                              <span className="text-xs tabular-nums text-dash-neon font-bold w-9 text-right">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Zarpes por semana */}
          <div className="dash-card rounded-xl overflow-hidden flex flex-col lg:min-h-0">
            <div className="dash-section-head shrink-0 px-4 py-3 flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-2 text-base font-bold text-dash-fg truncate">
                <Icon icon="lucide:send" width={18} height={18} className="text-dash-neon shrink-0" />
                {tr.weeklyDepartures}
              </p>
              <p className="text-xs text-dash-muted shrink-0">{tr.weeklyDeparturesHint}</p>
            </div>
            <div className="px-4 py-3 flex items-end gap-2 lg:flex-1 lg:min-h-0">
              {weeklyDepartures.buckets.map((bucket) => {
                const height = (bucket.count / weeklyDepartures.max) * 100;
                return (
                  <div key={bucket.start.toISOString()} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                    <span className="text-sm font-semibold text-dash-neon tabular-nums">{bucket.count}</span>
                    <div className="w-full h-16 lg:h-full flex items-end bg-cyan-950/45 rounded-md overflow-hidden">
                      <div
                        className="w-full bg-gradient-to-t from-sky-500/70 to-cyan-300 rounded-md"
                        style={{ height: `${bucket.count > 0 ? Math.max(height, 8) : 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-dash-muted tabular-nums">
                      {format(bucket.start, "d MMM", { locale: locale === "es" ? es : undefined })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vía + región */}
          <div className="dash-card rounded-xl overflow-hidden flex flex-col p-4 gap-3 lg:min-h-0">
            <div className="flex items-center gap-2 shrink-0">
              <Icon icon="lucide:container" width={18} height={18} className="text-dash-neon shrink-0" />
              <p className="text-base font-bold text-dash-fg">{tr.byMode}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative h-16 w-16 rounded-full shrink-0" style={{ background: modeDonutStyle }}>
                <div className="absolute inset-[9px] rounded-full bg-dash-surface flex items-center justify-center border border-cyan-300/10">
                  <span className="text-sm font-bold text-dash-fg">
                    {transportDistribution.total > 0
                      ? `${Math.round((transportDistribution.maritima / transportDistribution.total) * 100)}%`
                      : "0%"}
                  </span>
                </div>
              </div>
              <div className="text-sm space-y-1.5 min-w-0">
                <p className="text-dash-fg truncate">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-400 mr-2" />
                  {tr.maritime} <strong className="tabular-nums">{transportDistribution.maritima}</strong>
                </p>
                <p className="text-dash-fg truncate">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-violet-400 mr-2" />
                  {tr.air} <strong className="tabular-nums">{transportDistribution.aereo}</strong>
                </p>
                <p className="text-dash-muted truncate">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-neutral-500 mr-2" />
                  {tr.modeUnknown}
                  {transportDistribution.desconocida > 0 ? (
                    <> <strong className="tabular-nums text-dash-fg">{transportDistribution.desconocida}</strong></>
                  ) : null}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-dash-muted mb-2">{tr.byRegion}</p>
              <div className="space-y-2 lg:max-h-[7.5rem] lg:overflow-auto">
                {regionDistribution.items.slice(0, 5).map((item) => {
                  const width = (item.count / regionDistribution.max) * 100;
                  return (
                    <div key={item.region}>
                      <div className="flex justify-between text-sm text-dash-fg mb-1">
                        <span className="truncate">{regionLabels[item.region]}</span>
                        <span className="tabular-nums font-semibold">{item.count}</span>
                      </div>
                      <div className="h-2 bg-cyan-950/50 rounded-full overflow-hidden">
                        <div className="h-full bg-sky-400 rounded-full" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Navieras */}
          <div className="dash-card rounded-xl overflow-hidden flex flex-col lg:min-h-0">
            <div className="dash-section-head shrink-0 px-4 py-3 flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-2 text-base font-bold text-dash-fg truncate">
                <Icon icon="lucide:ship" width={18} height={18} className="text-dash-neon shrink-0" />
                {tr.topCarriers}
              </p>
              <p className="text-2xl font-bold text-dash-neon tabular-nums">{topNavieras.distinct}</p>
            </div>
            <div className="px-4 py-3 space-y-2.5 lg:flex-1 lg:min-h-0 lg:overflow-auto">
              {topNav.length === 0 ? (
                <p className="text-base text-dash-muted">{tr.noCarriers}</p>
              ) : (
                topNav.map((item) => (
                  <div key={item.naviera}>
                    <div className="flex justify-between gap-2 text-sm mb-1">
                      <span className="text-dash-fg truncate font-semibold">{item.naviera}</span>
                      <span className="tabular-nums text-dash-neon shrink-0 font-bold">{item.cantidad}</span>
                    </div>
                    <div className="h-2 bg-cyan-950/45 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-400 rounded-full"
                        style={{ width: `${Math.max((item.cantidad / topNavieras.max) * 100, 8)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Especies */}
          <div className="dash-card rounded-xl overflow-hidden flex flex-col lg:min-h-0">
            <div className="shrink-0 px-4 py-3 border-b border-fuchsia-300/15 flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-2 text-base font-bold text-fuchsia-200/90 truncate">
                <Icon icon="lucide:sprout" width={18} height={18} className="text-fuchsia-300 shrink-0" />
                {tr.species}
              </p>
              <p className="text-2xl font-bold text-fuchsia-300 tabular-nums">{speciesStats.distinct}</p>
            </div>
            <div className="px-4 py-3 space-y-2.5 lg:flex-1 lg:min-h-0 lg:overflow-auto">
              {topSpecies.length === 0 ? (
                <p className="text-base text-dash-muted">{tr.noData}</p>
              ) : (
                topSpecies.map((item, idx) => (
                  <div key={item.especie} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-dash-fg truncate min-w-0 font-semibold">
                      <span className="text-fuchsia-300/80 tabular-nums mr-1.5">{idx + 1}.</span>
                      {item.especie}
                    </span>
                    <span className="tabular-nums text-fuchsia-300 font-bold shrink-0">{item.cantidad}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
