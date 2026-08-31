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

const DASHBOARD_MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

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
};

export function DashboardContent({ view, onViewChange }: Props) {
  const { t, locale } = useLocale();
  const { isLoading: authLoading, isCliente, isEjecutivo, empresaNombres } = useAuth();
  const tr = t.dashboard;
  const { temporadaActiva, temporadaLoading } = useTemporadaActiva();

  const [loading, setLoading] = useState(true);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [mapOperations, setMapOperations] = useState<OperacionResumen[]>([]);
  const [carrierModes, setCarrierModes] = useState<Map<string, TransportMode>>(new Map());
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

  const donutProgress =
    transportDistribution.clasificadas > 0
      ? (transportDistribution.maritima / transportDistribution.clasificadas) * 100
      : 0;

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
      <main className="relative flex-1 min-h-0 overflow-y-auto lg:overflow-hidden flex flex-col bg-dash-bg">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="absolute top-16 right-0 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
        </div>
        <div className="relative shrink-0 bg-dash-header/90 border-b border-cyan-400/20 h-14" />
        <div className="relative p-4 flex flex-col gap-4 lg:flex-1 lg:min-h-0 lg:p-4 lg:gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 h-28 lg:h-14">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="motion-skeleton motion-skeleton-on-dark bg-dash-surface/80 rounded-xl border border-cyan-300/20" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-3 lg:flex-1 lg:min-h-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="motion-skeleton motion-skeleton-on-dark bg-dash-surface/80 rounded-xl border border-cyan-300/20 h-56 lg:h-auto" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="motion-skeleton motion-skeleton-on-dark bg-dash-surface/80 rounded-xl border border-cyan-300/20 h-40 lg:h-32" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  const opsHref = withBase(isCliente ? "/reservas/mis-reservas" : "/registros");
  const transportHref = withBase(isCliente ? "/reservas/mis-reservas" : "/transportes/reserva-asli");

  const kpiCards = [
    {
      key: "total",
      label: tr.totalOperations,
      value: operationalKpis.total,
      hint: `${operationalKpis.active} ${tr.activeOps}`,
      icon: "lucide:layers",
      accent: "text-cyan-300",
      ring: "border-cyan-300/25",
      href: opsHref,
    },
    {
      key: "pending",
      label: tr.pending,
      value: operationalKpis.pending,
      hint: `${operationalKpis.confirmed} ${tr.confirmed}`,
      icon: "lucide:clock-3",
      accent: "text-amber-300",
      ring: "border-amber-300/25",
      href: opsHref,
    },
    {
      key: "etd",
      label: tr.upcomingDepartures,
      value: operationalKpis.etdNext7,
      hint: `${operationalKpis.etdToday} ${tr.today} · ${operationalKpis.etdTomorrow} ${tr.tomorrow}`,
      icon: "lucide:ship",
      accent: "text-sky-300",
      ring: "border-sky-300/25",
      href: opsHref,
    },
    {
      key: "cutoff",
      label: tr.docCutoffSoon,
      value: operationalKpis.cutoffNext3,
      hint: tr.docCutoffSoonHint,
      icon: "lucide:file-warning",
      accent: "text-orange-300",
      ring: "border-orange-300/25",
      href: withBase("/documentos/mis-documentos"),
    },
    {
      key: "stacking",
      label: tr.stackingClosing,
      value: operationalKpis.stackingClosing,
      hint: tr.stackingClosingHint,
      icon: "lucide:calendar-clock",
      accent: "text-violet-300",
      ring: "border-violet-300/25",
      href: opsHref,
    },
    {
      key: "transport",
      label: tr.transportPending,
      value: operationalKpis.transportPending,
      hint: `${operationalKpis.notSentToTransport} ${tr.notSentToTransport}`,
      icon: "lucide:truck",
      accent: "text-emerald-300",
      ring: "border-emerald-300/25",
      href: transportHref,
    },
    {
      key: "docs",
      label: tr.missingBookingDoc,
      value: operationalKpis.noBookingDoc,
      hint: tr.missingBookingDocHint,
      icon: "lucide:file-x",
      accent: "text-rose-300",
      ring: "border-rose-300/25",
      href: withBase("/documentos/mis-documentos"),
    },
    {
      key: "critical",
      label: tr.criticalOps,
      value: operationalKpis.critical,
      hint: operationalKpis.invoicePending > 0
        ? `${operationalKpis.invoicePending} ${tr.invoicePending}`
        : `${operationalKpis.rolled} ${tr.rolled}`,
      icon: "lucide:alert-triangle",
      accent: "text-red-300",
      ring: "border-red-300/30",
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
    <main className="relative flex-1 min-h-0 overflow-y-auto lg:overflow-hidden flex flex-col bg-dash-bg text-base">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute top-16 right-0 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative shrink-0 z-10 bg-dash-header/90 border-b border-cyan-400/20 backdrop-blur">
        <div className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-cyan-100 tracking-tight leading-tight">{tr.title}</h1>
            <p className="text-sm text-cyan-300/70 truncate mt-1">
              {format(new Date(), "EEE d MMM yyyy", { locale: locale === "es" ? es : undefined })}
              {lastFetchedAt && getLastUpdatedText() && (
                <> · {tr.lastUpdated} {getLastUpdatedText()}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DashboardViewTabs view={view} onChange={onViewChange} />
            <a href={withBase("/reservas/crear")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-base font-semibold text-cyan-50 bg-cyan-500/20 border border-cyan-300/40 rounded-lg hover:bg-cyan-500/30 transition-colors">
              <Icon icon="lucide:plus" className="w-5 h-5" />
              <span className="hidden sm:inline">{isCliente ? t.sidebar.solicitarReserva : t.sidebar.crearReserva}</span>
            </a>
            <a href={withBase("/reservas/mis-reservas")}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-base font-medium text-cyan-100 bg-dash-control/85 border border-cyan-300/25 rounded-lg hover:bg-dash-control-hover transition-colors">
              <Icon icon="lucide:list" className="w-5 h-5" />
              {t.sidebar.misReservas}
            </a>
            <button type="button" onClick={() => void fetchDashboardData()}
              className="p-2.5 text-cyan-200/70 hover:text-cyan-100 bg-dash-control/85 border border-cyan-300/25 rounded-lg hover:bg-dash-control-hover transition-colors"
              title={tr.refresh}>
              <Icon icon="lucide:refresh-cw" className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative flex flex-col gap-4 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:flex-1 lg:min-h-0 lg:overflow-hidden lg:gap-3 lg:p-4">

        {/* KPIs */}
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
          {kpiCards.map((kpi) => (
            <a
              key={kpi.key}
              href={kpi.href}
              className={`rounded-xl border ${kpi.ring} bg-dash-surface/90 px-3.5 py-3.5 hover:bg-dash-surface-hover transition-colors min-w-0`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-cyan-200/80 leading-snug line-clamp-2">{kpi.label}</p>
                <Icon icon={kpi.icon} width={18} height={18} className={`shrink-0 mt-0.5 ${kpi.accent}`} />
              </div>
              <p className={`text-3xl sm:text-4xl font-bold tabular-nums leading-none mt-2.5 ${kpi.accent}`}>{kpi.value}</p>
              <p className="text-sm text-cyan-100/60 leading-snug line-clamp-2 mt-2">{kpi.hint}</p>
            </a>
          ))}
        </div>

        {/* Fila media: zarpes | estados | mapa — en móvil cada bloque tiene su altura; en desktop llenan la fila */}
        <div className="grid grid-cols-1 gap-4 lg:flex-1 lg:min-h-[280px] lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)_minmax(0,1.1fr)] lg:gap-3">
          {/* Zarpes */}
          <div className="rounded-xl border border-cyan-300/20 bg-dash-surface/90 overflow-hidden flex flex-col lg:min-h-0">
            <div className="shrink-0 px-4 py-3 border-b border-cyan-300/15 flex items-center justify-between gap-2">
              <p className="text-base font-bold text-cyan-100 truncate">{tr.upcomingDepartures}</p>
              <a href={opsHref} className="text-sm font-semibold text-cyan-300/90 hover:text-cyan-200">{tr.viewAll}</a>
            </div>
            <div className="lg:flex-1 lg:min-h-0 lg:overflow-auto">
              {upcomingRows.length === 0 ? (
                <div className="flex items-center justify-center px-6 py-10 lg:py-6 lg:h-full text-center">
                  <p className="text-base sm:text-lg text-cyan-100/55 leading-relaxed max-w-sm">{tr.noUpcoming}</p>
                </div>
              ) : (
                <table className="w-full text-left text-base">
                  <thead className="sticky top-0 bg-dash-surface">
                    <tr className="text-sm text-cyan-300/60 border-b border-cyan-300/10">
                      <th className="px-4 py-2.5 font-bold">{tr.colRef}</th>
                      <th className="px-4 py-2.5 font-bold hidden sm:table-cell">{tr.colClient}</th>
                      <th className="px-4 py-2.5 font-bold">{tr.colPod}</th>
                      <th className="px-4 py-2.5 font-bold">{tr.colWhen}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyan-300/10">
                    {upcomingRows.map((item) => (
                      <tr key={item.id} className="hover:bg-cyan-400/5">
                        <td className="px-4 py-2.5 font-bold text-cyan-100 whitespace-nowrap">
                          {item.ref}
                          {item.critico && <Icon icon="lucide:alert-triangle" width={16} height={16} className="inline ml-1.5 text-red-300" />}
                        </td>
                        <td className="px-4 py-2.5 text-cyan-100/85 truncate max-w-[8rem] hidden sm:table-cell">{item.cliente}</td>
                        <td className="px-4 py-2.5 text-cyan-100/80 truncate max-w-[6rem]">{item.pod}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-sm font-bold px-2.5 py-1 rounded-sm border ${
                            item.days === 0
                              ? "bg-red-500/15 text-red-300 border-red-400/30"
                              : item.days === 1
                                ? "bg-amber-500/15 text-amber-300 border-amber-400/30"
                                : "bg-cyan-500/10 text-cyan-300 border-cyan-400/25"
                          }`}>
                            {item.days === 0 ? tr.today : item.days === 1 ? tr.tomorrow : `${item.days}d`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Estados */}
          <div className="rounded-xl border border-cyan-300/20 bg-dash-surface/90 overflow-hidden flex flex-col lg:min-h-0">
            <div className="shrink-0 px-4 py-3 border-b border-cyan-300/15">
              <p className="text-base font-bold text-cyan-100">{tr.byStatus}</p>
            </div>
            <div className="px-4 py-3 space-y-2.5 lg:flex-1 lg:min-h-0 lg:overflow-auto">
              {operationalKpis.statusItems.slice(0, 6).map((item) => {
                const pct = operationalKpis.total > 0 ? Math.round((item.cantidad / operationalKpis.total) * 100) : 0;
                const tone =
                  item.estado === "CANCELADA" ? "bg-red-400"
                    : item.estado === "SOLICITADA" ? "bg-amber-400"
                      : item.estado === "RESERVA_CONFIRMADA" ? "bg-emerald-400"
                        : item.estado === "ROLEADA" ? "bg-violet-400"
                          : item.estado === "ZARPADA" ? "bg-sky-400"
                            : "bg-cyan-400";
                return (
                  <div key={item.estado}>
                    <div className="flex items-center justify-between gap-2 text-base mb-1">
                      <span className="font-semibold text-cyan-50/95 truncate">{etiquetaEstado(item.estado) || item.estado}</span>
                      <span className="tabular-nums text-cyan-200/85 shrink-0 font-semibold">{item.cantidad}</span>
                    </div>
                    <div className="h-2 rounded-full bg-cyan-950/60 overflow-hidden">
                      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(pct, 3)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="shrink-0 px-4 py-3 border-t border-cyan-300/15 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-emerald-300 tabular-nums">{operationalKpis.arrived}</p>
                <p className="text-sm text-cyan-300/65 mt-0.5">{tr.arrived}</p>
              </div>
              <div>
                <p className="text-lg font-bold text-violet-300 tabular-nums">{operationalKpis.rolled}</p>
                <p className="text-sm text-cyan-300/65 mt-0.5">{tr.rolled}</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-300 tabular-nums">{operationalKpis.cancelled}</p>
                <p className="text-sm text-cyan-300/65 mt-0.5">{tr.cancelled}</p>
              </div>
            </div>
          </div>

          {/* Mapa */}
          <div className="relative isolate z-0 h-64 sm:h-72 lg:h-full lg:min-h-0 rounded-xl border border-cyan-300/20 bg-dash-surface/70 overflow-hidden">
            <MapLibreMap
              ref={mapRef}
              initialViewState={{ longitude: -30, latitude: 5, zoom: 0.45 }}
              mapStyle={DASHBOARD_MAP_STYLE}
              style={{ width: "100%", height: "100%" }}
              dragRotate={false}
              attributionControl={false}
            >
              <NavigationControl position="top-right" showCompass={false} />
              {portMarkers.map((marker) => {
                const isOrigin = marker.type === "origen";
                return (
                  <Marker key={marker.key} longitude={marker.lng} latitude={marker.lat} anchor="center">
                    <div
                      title={`${marker.label} (${marker.count})`}
                      className={`h-3.5 w-3.5 rounded-full border-2 border-white ${isOrigin ? "bg-red-500" : "bg-emerald-500"}`}
                    />
                  </Marker>
                );
              })}
            </MapLibreMap>
            <div className="absolute bottom-2 left-2 z-10 flex items-center gap-3 rounded-sm bg-dash-header/85 px-2.5 py-1.5 text-sm text-cyan-100/85 backdrop-blur">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />{tr.mapOrigins}</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />{tr.mapDestinations}</span>
            </div>
          </div>
        </div>

        {/* Fila inferior */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 lg:gap-3 lg:shrink-0 lg:min-h-[200px]">
          {/* Clientes */}
          <div className="rounded-xl border border-cyan-300/20 bg-dash-surface/90 overflow-hidden flex flex-col lg:min-h-0">
            <div className="shrink-0 px-4 py-3 border-b border-cyan-300/15 flex items-baseline justify-between gap-2">
              <p className="text-base font-bold text-cyan-200/90">{tr.activeClients}</p>
              <p className="text-2xl font-bold text-cyan-200 tabular-nums">{activeClientsCount}</p>
            </div>
            <ul className="px-4 py-3 space-y-2 lg:flex-1 lg:min-h-0 lg:overflow-auto">
              {topClients.length === 0 ? (
                <li className="text-base text-cyan-100/40 py-2">—</li>
              ) : (
                topClients.map((item) => (
                  <li key={item.cliente} className="flex items-center justify-between gap-2 text-base">
                    <span className="text-cyan-50/95 truncate">{item.cliente}</span>
                    <span className="text-cyan-200/80 tabular-nums shrink-0 font-semibold">{item.cantidad}</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Zarpes por semana */}
          <div className="rounded-xl border border-cyan-300/20 bg-dash-surface/90 overflow-hidden flex flex-col lg:min-h-0">
            <div className="shrink-0 px-4 py-3 border-b border-cyan-300/15 flex items-baseline justify-between gap-2">
              <p className="text-base font-bold text-cyan-200/90">{tr.weeklyDepartures}</p>
              <p className="text-sm text-cyan-300/65">{tr.weeklyDeparturesHint}</p>
            </div>
            <div className="px-4 py-3 flex items-end gap-2 lg:flex-1 lg:min-h-0">
              {weeklyDepartures.buckets.map((bucket) => {
                const height = (bucket.count / weeklyDepartures.max) * 100;
                return (
                  <div key={bucket.start.toISOString()} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                    <span className="text-sm font-semibold text-cyan-100/85 tabular-nums">{bucket.count}</span>
                    <div className="w-full h-16 lg:h-full flex items-end bg-cyan-950/45 rounded-sm overflow-hidden">
                      <div
                        className="w-full bg-sky-400/80 rounded-sm"
                        style={{ height: `${bucket.count > 0 ? Math.max(height, 6) : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-cyan-300/60 tabular-nums">
                      {format(bucket.start, "d MMM", { locale: locale === "es" ? es : undefined })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vía + región */}
          <div className="rounded-xl border border-cyan-300/20 bg-dash-surface/90 overflow-hidden flex flex-col p-4 gap-3 lg:min-h-0">
            <div className="flex items-baseline justify-between gap-2 shrink-0">
              <p className="text-base font-bold text-cyan-200/90">{tr.byMode}</p>
              <p className="text-sm text-cyan-300/65 truncate">{tr.byRegion}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div
                className="relative h-16 w-16 rounded-full shrink-0"
                style={{ background: `conic-gradient(#2563eb 0% ${donutProgress}%, #22c55e ${donutProgress}% 100%)` }}
              >
                <div className="absolute inset-[9px] rounded-full bg-dash-surface flex items-center justify-center">
                  <span className="text-sm font-bold text-cyan-100">{transportDistribution.total > 0 ? `${Math.round(donutProgress)}%` : "0%"}</span>
                </div>
              </div>
              <div className="text-base space-y-1.5 min-w-0">
                <p className="text-cyan-100/95 truncate"><span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 mr-2" />{tr.maritime} {transportDistribution.maritima}</p>
                <p className="text-cyan-100/95 truncate"><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 mr-2" />{tr.air} {transportDistribution.aereo}</p>
                {transportDistribution.desconocida > 0 && (
                  <p className="text-cyan-100/55 truncate text-sm"><span className="inline-block w-2.5 h-2.5 rounded-full bg-neutral-500 mr-2" />{tr.modeUnknown} {transportDistribution.desconocida}</p>
                )}
              </div>
            </div>
            <div className="space-y-2 lg:flex-1 lg:min-h-0 lg:overflow-auto">
              {regionDistribution.items.slice(0, 5).map((item) => {
                const width = (item.count / regionDistribution.max) * 100;
                return (
                  <div key={item.region}>
                    <div className="flex justify-between text-base text-cyan-100/90 mb-1">
                      <span className="truncate">{regionLabels[item.region]}</span>
                      <span className="tabular-nums text-cyan-200/80 font-semibold">{item.count}</span>
                    </div>
                    <div className="h-2 bg-cyan-950/50 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navieras */}
          <div className="rounded-xl border border-cyan-300/20 bg-dash-surface/90 overflow-hidden flex flex-col lg:min-h-0">
            <div className="shrink-0 px-4 py-3 border-b border-cyan-300/15 flex items-baseline justify-between gap-2">
              <p className="text-base font-bold text-cyan-200/90">{tr.topCarriers}</p>
              <p className="text-2xl font-bold text-cyan-200 tabular-nums">{topNavieras.distinct}</p>
            </div>
            <div className="px-4 py-3 space-y-2.5 lg:flex-1 lg:min-h-0 lg:overflow-auto">
              {topNav.length === 0 ? (
                <p className="text-base text-cyan-100/40">{tr.noCarriers}</p>
              ) : (
                topNav.map((item, idx) => (
                  <div key={item.naviera}>
                    <div className="flex justify-between gap-2 text-base mb-1">
                      <span className="text-cyan-50/95 truncate">{idx + 1}. {item.naviera}</span>
                      <span className="tabular-nums text-cyan-200/90 shrink-0 font-semibold">{item.cantidad}</span>
                    </div>
                    <div className="h-2 bg-cyan-950/45 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${Math.max((item.cantidad / topNavieras.max) * 100, 8)}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Especies / POD */}
          <div className="rounded-xl border border-fuchsia-400/20 bg-dash-surface/90 overflow-hidden flex flex-col lg:min-h-0">
            <div className="shrink-0 px-4 py-3 border-b border-fuchsia-300/15 flex items-baseline justify-between gap-2">
              <p className="text-base font-bold text-fuchsia-200/90">{tr.species}</p>
              <p className="text-2xl font-bold text-fuchsia-200 tabular-nums">{speciesStats.distinct}</p>
            </div>
            <div className="px-4 py-3 space-y-2 lg:flex-1 lg:min-h-0 lg:overflow-auto">
              {topSpecies.length === 0 ? (
                <p className="text-base text-cyan-100/40">{tr.noData}</p>
              ) : (
                topSpecies.map((item, idx) => (
                  <div key={item.especie} className="flex items-center justify-between gap-2 text-base">
                    <span className="text-cyan-50/95 truncate min-w-0">
                      {idx + 1}. {item.especie}
                      {item.pod ? <span className="text-emerald-300/85"> · {item.pod}</span> : null}
                    </span>
                    <span className="tabular-nums text-fuchsia-200 font-semibold shrink-0">{item.cantidad}</span>
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
