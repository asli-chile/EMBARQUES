import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { DashboardVisitorContent } from "./DashboardVisitorContent";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { withBase } from "@/lib/basePath";
import { getPortCoordinates } from "@/lib/ports-coordinates";
import MapLibreMap, { Marker, NavigationControl } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

type OperacionResumen = {
  id: string;
  ref_asli: string | null;
  cliente: string | null;
  naviera: string | null;
  nave: string | null;
  pol: string | null;
  pod: string | null;
  etd: string | null;
  eta: string | null;
  estado_operacion: string | null;
  booking: string | null;
  especie: string | null;
  created_at?: string;
};

type PortMarker = {
  key: string;
  label: string;
  lng: number;
  lat: number;
  count: number;
  type: "origen" | "destino";
};

const DASHBOARD_MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const REGION_LABELS = ["America", "Europa", "India y Medio Oriente", "Oceania", "Asia"] as const;
type RegionLabel = (typeof REGION_LABELS)[number];

function classifyRegionFromPodName(pod: string): RegionLabel | null {
  const text = pod.toUpperCase();

  if (
    text.includes("INDIA") ||
    text.includes("NHAVA") ||
    text.includes("MUNDRA") ||
    text.includes("DUBAI") ||
    text.includes("JEBEL") ||
    text.includes("DOHA") ||
    text.includes("KUWAIT") ||
    text.includes("JEDDAH") ||
    text.includes("DAMMAM") ||
    text.includes("OMAN") ||
    text.includes("MUSCAT") ||
    text.includes("BANDAR")
  ) {
    return "India y Medio Oriente";
  }
  if (
    text.includes("AUSTRALIA") ||
    text.includes("SYDNEY") ||
    text.includes("MELBOURNE") ||
    text.includes("BRISBANE") ||
    text.includes("AUCKLAND") ||
    text.includes("WELLINGTON") ||
    text.includes("TAURANGA") ||
    text.includes("LYTTELTON")
  ) {
    return "Oceania";
  }
  if (
    text.includes("ROTTERDAM") ||
    text.includes("HAMBURG") ||
    text.includes("HAMBURGO") ||
    text.includes("ANTWERP") ||
    text.includes("VALENCIA") ||
    text.includes("BARCELONA") ||
    text.includes("LONDON") ||
    text.includes("SOUTHAMPTON") ||
    text.includes("GENOVA") ||
    text.includes("LIVORNO")
  ) {
    return "Europa";
  }
  if (
    text.includes("SHANGHAI") ||
    text.includes("NINGBO") ||
    text.includes("QINGDAO") ||
    text.includes("SHENZHEN") ||
    text.includes("HONG KONG") ||
    text.includes("BUSAN") ||
    text.includes("SINGAPORE") ||
    text.includes("YOKOHAMA") ||
    text.includes("TOKYO") ||
    text.includes("MANILA") ||
    text.includes("JAKARTA")
  ) {
    return "Asia";
  }
  if (
    text.includes("PHILADELPHIA") ||
    text.includes("NEW YORK") ||
    text.includes("LOS ANGELES") ||
    text.includes("BALBOA") ||
    text.includes("BUENAVENTURA") ||
    text.includes("CALLAO") ||
    text.includes("CARTAGENA") ||
    text.includes("SAN ANTONIO") ||
    text.includes("VALPARAISO")
  ) {
    return "America";
  }

  return null;
}

export function DashboardContent() {
  const { t, locale } = useLocale();
  const { isExternalUser, isLoading: authLoading, isCliente, empresaNombres } = useAuth();
  const tr = t.dashboard;

  if (!authLoading && isExternalUser) {
    return <DashboardVisitorContent />;
  }
  const [loading, setLoading] = useState(true);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [mapOperations, setMapOperations] = useState<OperacionResumen[]>([]);
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
      if (empresaNombres.length > 0) {
        q = q.in("cliente", empresaNombres);
      }
      return q;
    },
    [supabase, empresaNombres]
  );

  const fetchDashboardData = useCallback(async () => {
    if (!supabase || authLoading) return;
    if (isCliente && empresaNombres.length === 0) {
      setMapOperations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const allRes = await buildFilteredQuery(
      "id, ref_asli, cliente, naviera, nave, pol, pod, etd, eta, estado_operacion, booking, especie, created_at"
    ).limit(2000);
    const allData = (allRes.data ?? []) as OperacionResumen[];
    setMapOperations(allData);

    setLastFetchedAt(new Date());
    setLoading(false);
  }, [supabase, authLoading, isCliente, empresaNombres, buildFilteredQuery]);

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

  const transportDistribution = useMemo(() => {
    let maritima = 0;
    let aereo = 0;
    for (const op of mapOperations) {
      // Regla pragmática: si tiene datos navieros, cuenta como marítima; de lo contrario, aéreo.
      if (op.naviera || op.nave || op.pol || op.pod) maritima += 1;
      else aereo += 1;
    }
    const total = maritima + aereo;
    return { maritima, aereo, total };
  }, [mapOperations]);

  const donutProgress =
    transportDistribution.total > 0 ? (transportDistribution.maritima / transportDistribution.total) * 100 : 0;

  const regionDistribution = useMemo(() => {
    const counts: Record<RegionLabel, number> = {
      America: 0,
      Europa: 0,
      "India y Medio Oriente": 0,
      Oceania: 0,
      Asia: 0,
    };

    for (const op of mapOperations) {
      if (!op.pod) continue;

      let region: RegionLabel | null = null;
      const coords = getPortCoordinates(op.pod);
      if (coords) {
        const [lng, lat] = coords;
        if (lng >= -170 && lng <= -30 && lat >= -60 && lat <= 75) region = "America";
        else if (lng >= -15 && lng <= 40 && lat >= 35 && lat <= 72) region = "Europa";
        else if (lng >= 35 && lng <= 80 && lat >= 5 && lat <= 36) region = "India y Medio Oriente";
        else if (lng >= 110 && lng <= 180 && lat >= -50 && lat <= 0) region = "Oceania";
        else if (lng >= 85 && lng <= 150 && lat >= -10 && lat <= 55) region = "Asia";
      }
      if (!region) region = classifyRegionFromPodName(op.pod);
      if (region) counts[region] += 1;
    }

    const items = REGION_LABELS.map((region) => ({ region, count: counts[region] }));
    const max = Math.max(...items.map((i) => i.count), 1);
    return { items, max };
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
    const distinct = ranked.length;
    const top = ranked[0] ?? null;
    return { distinct, top, ranked };
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

  const speciesWithPodLeaderCount = useMemo(() => {
    let n = 0;
    for (const { especie } of speciesStats.ranked) {
      if (speciesTopPodByEspecie.has(especie)) n += 1;
    }
    return n;
  }, [speciesStats.ranked, speciesTopPodByEspecie]);

  const speciesFunnelItems = useMemo(() => speciesStats.ranked.slice(0, 8), [speciesStats.ranked]);
  const speciesFunnelMax = useMemo(
    () => Math.max(...speciesFunnelItems.map((item) => item.cantidad), 1),
    [speciesFunnelItems]
  );
  const speciesLeaderByEspecie = useMemo(
    () =>
      speciesStats.ranked
        .map((item) => {
          const leader = speciesTopPodByEspecie.get(item.especie);
          if (!leader) return null;
          return {
            especie: item.especie,
            totalEspecie: item.cantidad,
            pod: leader.pod,
            podCantidad: leader.cantidad,
          };
        })
        .filter(
          (
            item
          ): item is { especie: string; totalEspecie: number; pod: string; podCantidad: number } => item !== null
        ),
    [speciesStats.ranked, speciesTopPodByEspecie]
  );
  const speciesLeaderPodItems = useMemo(() => speciesLeaderByEspecie.slice(0, 8), [speciesLeaderByEspecie]);
  const speciesLeaderPodItemsMax = useMemo(
    () => Math.max(...speciesLeaderPodItems.map((item) => item.podCantidad), 1),
    [speciesLeaderPodItems]
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
      <main className="relative flex-1 min-h-0 overflow-auto bg-[#060B17]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="absolute top-16 right-0 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        </div>
        <div className="relative bg-[#0A1328]/90 border-b border-cyan-400/20 h-14" />
        <div className="p-4 sm:p-5 w-full max-w-[1600px] mx-auto space-y-4 animate-pulse">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`bg-[#101C36]/80 rounded-2xl border border-cyan-300/20 h-24 ${i === 0 ? "col-span-2 sm:col-span-1" : ""}`} />
            ))}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-[#101C36]/80 rounded-2xl border border-cyan-300/20 h-20" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#101C36]/80 rounded-2xl border border-cyan-300/20 h-72" />
            <div className="bg-[#101C36]/80 rounded-2xl border border-cyan-300/20 h-72" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#101C36]/80 rounded-2xl border border-cyan-300/20 h-60" />
            <div className="bg-[#101C36]/80 rounded-2xl border border-cyan-300/20 h-60" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex-1 min-h-0 overflow-auto bg-[#060B17]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute top-16 right-0 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-[#0A1328]/90 border-b border-cyan-400/20 backdrop-blur">
        <div className="w-full px-4 sm:px-5 lg:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-base font-bold text-cyan-100 tracking-tight leading-tight">{tr.title}</h1>
            <p className="text-[11px] text-cyan-300/60 mt-0.5">
              {format(new Date(), "EEEE d MMM yyyy", { locale: locale === "es" ? es : undefined })}
              {lastFetchedAt && getLastUpdatedText() && (
                <> · <span className="text-cyan-300/40">actualizado {getLastUpdatedText()}</span></>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a href={withBase("/reservas/crear")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-50 bg-cyan-500/20 border border-cyan-300/40 rounded-lg hover:bg-cyan-500/30 transition-colors shadow-[0_0_18px_rgba(34,211,238,0.25)]">
              <Icon icon="lucide:plus" className="w-3.5 h-3.5" />
              {t.sidebar.crearReserva}
            </a>
            <a href={withBase("/reservas/mis-reservas")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-100 bg-[#111E38]/85 border border-cyan-300/25 rounded-lg hover:bg-[#172748] transition-colors">
              <Icon icon="lucide:list" className="w-3.5 h-3.5" />
              {t.sidebar.misReservas}
            </a>
            <button onClick={() => void fetchDashboardData()}
              className="p-1.5 text-cyan-200/70 hover:text-cyan-100 bg-[#111E38]/85 border border-cyan-300/25 rounded-lg hover:bg-[#172748] transition-colors"
              title={tr.refresh}>
              <Icon icon="lucide:refresh-cw" className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 lg:p-5 w-full overflow-x-auto min-[2200px]:overflow-visible">
        <div className="min-[2200px]:h-[720px]">
          <div className="min-[2200px]:w-1/2 min-[2200px]:scale-[2] min-[2200px]:origin-top-left">
          <div className="grid grid-cols-1 md:grid-cols-2 min-[1180px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] min-[1440px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,2.3fr)] min-[2200px]:grid-cols-[380px_380px_minmax(0,1fr)_980px] gap-4 min-[2200px]:gap-6 items-start">
          {/* KPI clientes (izquierda) */}
          <div className="bg-[#0D1830]/80 rounded-2xl border border-cyan-300/20 shadow-[0_0_30px_rgba(56,189,248,0.12)] p-3.5 min-[2133px]:p-6 h-[220px] min-[1180px]:h-[240px] min-[1440px]:h-[260px] min-[2133px]:h-[360px] flex flex-col backdrop-blur-sm">
            <p className="text-[11px] min-[2133px]:text-sm font-semibold text-cyan-300/70 uppercase tracking-[0.16em]">Clientes con operaciones</p>
            <p className="text-2xl min-[2133px]:text-[52px] font-bold text-cyan-200 leading-none mt-2 drop-shadow-[0_0_14px_rgba(103,232,249,0.4)]">{activeClientsCount}</p>
            <p className="text-sm min-[2133px]:text-lg text-cyan-100/60 mt-1">con operaciones</p>
            <div className="mt-2 border-t border-cyan-300/15 pt-1.5 min-[2133px]:mt-3 min-[2133px]:pt-3 flex-1 overflow-auto">
              {clientsWithOperationCount.length === 0 ? (
                <p className="text-sm min-[2133px]:text-lg text-cyan-100/45">Sin clientes con operaciones</p>
              ) : (
                <ul className="space-y-1.5">
                  {clientsWithOperationCount.map((item) => (
                    <li key={item.cliente} className="text-sm min-[2133px]:text-lg text-cyan-50/90">
                      <span className="font-medium">{item.cliente}</span>{" "}
                      <span className="text-cyan-200/60">({item.cantidad})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Dona marítima vs aéreo */}
          <div className="bg-[#0D1830]/80 rounded-2xl border border-cyan-300/20 shadow-[0_0_30px_rgba(56,189,248,0.12)] p-3.5 min-[2133px]:p-6 h-[220px] min-[1180px]:h-[240px] min-[1440px]:h-[260px] min-[2133px]:h-[360px] backdrop-blur-sm">
            <p className="text-[11px] min-[2133px]:text-sm font-semibold text-cyan-300/70 uppercase tracking-[0.16em]">Operaciones por vía</p>
            <div className="mt-3 min-[2133px]:mt-4 flex items-center gap-4 min-[2133px]:gap-6">
              <div
                className="relative h-28 w-28 min-[2133px]:h-44 min-[2133px]:w-44 rounded-full shadow-inner"
                style={{
                  background: `conic-gradient(#2563eb 0% ${donutProgress}%, #22c55e ${donutProgress}% 100%)`,
                }}
              >
                <div className="absolute inset-[14px] min-[2133px]:inset-[24px] rounded-full bg-[#0D1830] border border-cyan-300/20 flex items-center justify-center">
                  <div className="text-center leading-tight">
                    <p className="text-xs min-[2133px]:text-base text-cyan-200/60">Marítima</p>
                    <p className="text-base min-[2133px]:text-2xl font-bold text-cyan-100">
                      {transportDistribution.total > 0 ? `${Math.round(donutProgress)}%` : "0%"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-sm min-[2133px]:text-lg space-y-1.5 min-[2133px]:space-y-2">
                <p className="text-cyan-100/90"><span className="inline-block w-2 h-2 rounded-full bg-cyan-400 mr-1" />Marítima ({transportDistribution.maritima})</p>
                <p className="text-cyan-100/90"><span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1" />Aéreo ({transportDistribution.aereo})</p>
              </div>
            </div>
            <p className="text-[13px] min-[2133px]:text-base text-cyan-100/60 mt-2 min-[2133px]:mt-3">Total: {transportDistribution.total}</p>
          </div>

          {/* Barras por región */}
          <div className="bg-[#0D1830]/80 rounded-2xl border border-cyan-300/20 shadow-[0_0_30px_rgba(56,189,248,0.12)] p-3.5 min-[2133px]:p-6 h-[220px] min-[1180px]:h-[240px] min-[1440px]:h-[260px] min-[2133px]:h-[360px] backdrop-blur-sm">
            <p className="text-[11px] min-[2133px]:text-sm font-semibold text-cyan-300/70 uppercase tracking-[0.16em]">Distribución por región</p>
            <div className="mt-3 min-[2133px]:mt-4 space-y-2.5 min-[2133px]:space-y-3">
              {regionDistribution.items.map((item) => {
                const width = (item.count / regionDistribution.max) * 100;
                return (
                  <div key={item.region}>
                    <div className="flex items-center justify-between text-[13px] min-[2133px]:text-lg mb-1 min-[2133px]:mb-1.5">
                      <span className="text-cyan-50/90">{item.region}</span>
                      <span className="text-cyan-200/60">{item.count}</span>
                    </div>
                    <div className="h-2 min-[2133px]:h-4 bg-cyan-950/50 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(34,211,238,0.8)]" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mapa */}
          <div className="overflow-hidden h-[220px] min-[1180px]:h-[240px] min-[1440px]:h-[260px] min-[2133px]:h-[360px] rounded-2xl border border-cyan-300/20 shadow-[0_0_35px_rgba(56,189,248,0.16)] bg-[#0D1830]/70 backdrop-blur-sm">
            <div className="relative h-full">
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
                        className={`h-3.5 w-3.5 rounded-full border border-white shadow-[0_0_0_2px_rgba(0,0,0,0.14)] ${
                          isOrigin ? "bg-red-500" : "bg-emerald-500"
                        }`}
                      />
                    </Marker>
                  );
                })}
              </MapLibreMap>
            </div>
          </div>
          </div>

          {/* KPI especies + destino por especie — fila inferior */}
          <div className="mt-4 min-[1180px]:mt-5 grid grid-cols-1 min-[1180px]:grid-cols-2 gap-4 min-[1180px]:gap-5">
            <div className="bg-[#0D1830]/80 rounded-2xl border border-fuchsia-400/25 shadow-[0_0_30px_rgba(232,121,249,0.12)] p-4 min-[1440px]:p-5 min-[2133px]:p-6 backdrop-blur-sm h-[280px] min-[1180px]:flex min-[1180px]:flex-row min-[1180px]:items-stretch min-[1180px]:gap-6">
              <div className="min-[1180px]:w-44 min-[1440px]:w-48 shrink-0">
                <p className="text-[11px] min-[2133px]:text-sm font-semibold text-cyan-300/70 uppercase tracking-[0.16em]">Operaciones por especie</p>
                <p className="text-2xl min-[2133px]:text-5xl font-bold text-fuchsia-200 leading-none mt-2 drop-shadow-[0_0_14px_rgba(232,121,249,0.35)]">
                  {speciesStats.distinct}
                </p>
                <p className="text-sm min-[2133px]:text-base text-cyan-100/60 mt-1">especies distintas</p>
                {speciesStats.top && (
                  <p className="text-xs min-[2133px]:text-sm text-fuchsia-200/80 mt-2 min-[1180px]:line-clamp-none" title={speciesStats.top.especie}>
                    Líder: <span className="font-semibold">{speciesStats.top.especie}</span> ({speciesStats.top.cantidad})
                  </p>
                )}
              </div>
              <div className="mt-3 min-[1180px]:mt-0 w-full min-[1180px]:flex-1 border-t border-cyan-300/15 min-[1180px]:border-t-0 min-[1180px]:border-l min-[1180px]:border-cyan-300/15 min-[1180px]:pl-6 pt-3 min-[1180px]:pt-0 min-[1180px]:flex min-[1180px]:flex-col">
                {speciesStats.ranked.length === 0 ? (
                  <p className="text-sm text-cyan-100/45">Sin especie registrada</p>
                ) : (
                  <div className="h-[240px] min-[1180px]:h-full w-full overflow-auto pr-1">
                    <div className="space-y-1.5 w-full">
                      {speciesFunnelItems.map((item, index) => {
                        const widthPercent = (item.cantidad / speciesFunnelMax) * 100;
                        return (
                          <div key={item.especie} className="space-y-0.5 w-full" title={`${item.especie}: ${item.cantidad}`}>
                            <div className="flex items-center justify-between gap-2 text-xs min-[1440px]:text-sm">
                              <span className="text-cyan-100/85 font-medium truncate">
                                {index + 1}. {item.especie}
                              </span>
                              <span className="text-fuchsia-200/85 tabular-nums shrink-0">{item.cantidad}</span>
                            </div>
                            <div className="h-3.5 min-[1440px]:h-4.5 bg-fuchsia-950/35 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-fuchsia-400 rounded-full shadow-[0_0_12px_rgba(232,121,249,0.75)] transition-all duration-500"
                                style={{ width: `${Math.max(widthPercent, 8)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#0D1830]/80 rounded-2xl border border-emerald-400/25 shadow-[0_0_30px_rgba(52,211,153,0.12)] p-4 min-[1440px]:p-5 min-[2133px]:p-6 backdrop-blur-sm h-[280px] min-[1180px]:flex min-[1180px]:flex-row min-[1180px]:items-stretch min-[1180px]:gap-6">
              <div className="min-[1180px]:w-44 min-[1440px]:w-48 shrink-0">
                <p className="text-[11px] min-[2133px]:text-sm font-semibold text-cyan-300/70 uppercase tracking-[0.16em]">Destino más usado por especie</p>
                <p className="text-2xl min-[2133px]:text-5xl font-bold text-emerald-200 leading-none mt-2 drop-shadow-[0_0_14px_rgba(52,211,153,0.35)]">
                  {speciesWithPodLeaderCount}
                </p>
                <p className="text-sm min-[2133px]:text-base text-cyan-100/60 mt-1">de {speciesStats.distinct} con POD líder</p>
                {speciesLeaderPodItems[0] && (
                  <p className="text-xs min-[2133px]:text-sm text-emerald-200/80 mt-2 min-[1180px]:line-clamp-none" title={speciesLeaderPodItems[0].pod}>
                    Líder: <span className="font-semibold">{speciesLeaderPodItems[0].pod}</span> ({speciesLeaderPodItems[0].podCantidad})
                  </p>
                )}
                <div className="mt-2 space-y-1 max-h-[110px] overflow-auto pr-1">
                  {speciesLeaderPodItems.slice(0, 4).map((item, idx) => (
                    <p
                      key={`left-mini-${item.especie}`}
                      className="text-[11px] text-cyan-100/85 truncate"
                      title={`${item.especie} -> ${item.pod} (${item.podCantidad})`}
                    >
                      {idx + 1}. <span className="font-semibold text-cyan-50">{item.especie}</span>
                    </p>
                  ))}
                </div>
              </div>

              <div className="mt-3 min-[1180px]:mt-0 w-full min-[1180px]:flex-1 border-t border-cyan-300/15 min-[1180px]:border-t-0 min-[1180px]:border-l min-[1180px]:border-cyan-300/15 min-[1180px]:pl-6 pt-3 min-[1180px]:pt-0 min-[1180px]:flex min-[1180px]:flex-col">
                {speciesLeaderByEspecie.length === 0 ? (
                  <p className="text-sm text-cyan-100/45">Sin especie registrada</p>
                ) : (
                  <div className="h-[240px] min-[1180px]:h-full w-full overflow-auto pr-1">
                    {speciesLeaderPodItems.map((item, idx) => (
                      <div key={`species-destino-${item.especie}`} className="space-y-0.5 w-full" title={`${item.especie} -> ${item.pod} (${item.podCantidad})`}>
                        <div className="flex items-center justify-between gap-2 text-xs min-[1440px]:text-sm">
                          <span className="truncate">
                            {idx + 1}. <span className="font-semibold text-cyan-50">{item.especie}</span> - <span className="text-emerald-200/90">{item.pod}</span>
                          </span>
                          <span className="text-emerald-200/90 tabular-nums shrink-0">{item.podCantidad}</span>
                        </div>
                        <div className="h-3.5 min-[1440px]:h-4.5 w-full bg-emerald-950/35 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.75)] transition-all duration-500"
                            style={{ width: `${Math.max((item.podCantidad / speciesLeaderPodItemsMax) * 100, 8)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </main>
  );
}
