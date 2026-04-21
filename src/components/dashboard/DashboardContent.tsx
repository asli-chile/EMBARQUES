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

const DASHBOARD_MAP_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
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
      "id, ref_asli, cliente, naviera, nave, pol, pod, etd, eta, estado_operacion, booking, created_at"
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
      <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto">
        <div className="bg-white border-b border-neutral-200 h-14" />
        <div className="p-4 sm:p-5 w-full max-w-[1600px] mx-auto space-y-4 animate-pulse">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`bg-white rounded-2xl border border-neutral-200 h-24 ${i === 0 ? "col-span-2 sm:col-span-1" : ""}`} />
            ))}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-neutral-200 h-20" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-neutral-200 h-72" />
            <div className="bg-white rounded-2xl border border-neutral-200 h-72" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-neutral-200 h-60" />
            <div className="bg-white rounded-2xl border border-neutral-200 h-60" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-base font-bold text-neutral-900 tracking-tight leading-tight">{tr.title}</h1>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {format(new Date(), "EEEE d MMM yyyy", { locale: locale === "es" ? es : undefined })}
              {lastFetchedAt && getLastUpdatedText() && (
                <> · <span className="text-neutral-300">actualizado {getLastUpdatedText()}</span></>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a href={withBase("/reservas/crear")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors shadow-sm">
              <Icon icon="lucide:plus" className="w-3.5 h-3.5" />
              {t.sidebar.crearReserva}
            </a>
            <a href={withBase("/registros")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
              <Icon icon="lucide:list" className="w-3.5 h-3.5" />
              {t.sidebar.registros}
            </a>
            <button onClick={() => void fetchDashboardData()}
              className="p-1.5 text-neutral-400 hover:text-brand-blue bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              title={tr.refresh}>
              <Icon icon="lucide:refresh-cw" className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 lg:p-5 w-full max-w-[1700px] 2xl:max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[260px_260px_minmax(0,1fr)_540px] xl:grid-cols-[280px_280px_minmax(0,1fr)_600px] gap-4 items-start">
          {/* KPI clientes (izquierda) */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 min-h-[286px]">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Clientes</p>
            <p className="text-2xl font-bold text-brand-blue leading-none mt-2">{activeClientsCount}</p>
            <p className="text-xs text-neutral-500 mt-1">con operaciones</p>
            <div className="mt-2.5 border-t border-neutral-100 pt-2 max-h-[158px] overflow-auto">
              {clientsWithOperationCount.length === 0 ? (
                <p className="text-xs text-neutral-400">Sin clientes con operaciones</p>
              ) : (
                <ul className="space-y-1.5">
                  {clientsWithOperationCount.map((item) => (
                    <li key={item.cliente} className="text-xs text-neutral-700">
                      <span className="font-medium">{item.cliente}</span>{" "}
                      <span className="text-neutral-500">({item.cantidad})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Dona marítima vs aéreo */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 min-h-[286px]">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Operaciones por vía</p>
            <div className="mt-3 flex items-center gap-4">
              <div
                className="relative h-28 w-28 rounded-full shadow-inner"
                style={{
                  background: `conic-gradient(#2563eb 0% ${donutProgress}%, #22c55e ${donutProgress}% 100%)`,
                }}
              >
                <div className="absolute inset-[14px] rounded-full bg-white border border-neutral-100 flex items-center justify-center">
                  <div className="text-center leading-tight">
                    <p className="text-[10px] text-neutral-400">Marítima</p>
                    <p className="text-sm font-bold text-neutral-800">
                      {transportDistribution.total > 0 ? `${Math.round(donutProgress)}%` : "0%"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-xs space-y-1">
                <p className="text-neutral-700"><span className="inline-block w-2 h-2 rounded-full bg-blue-600 mr-1" />Marítima ({transportDistribution.maritima})</p>
                <p className="text-neutral-700"><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />Aéreo ({transportDistribution.aereo})</p>
              </div>
            </div>
            <p className="text-[11px] text-neutral-500 mt-2">Total: {transportDistribution.total}</p>
          </div>

          {/* Barras por región */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 min-h-[286px]">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Distribucion por region</p>
            <div className="mt-3 space-y-2.5">
              {regionDistribution.items.map((item) => {
                const width = (item.count / regionDistribution.max) * 100;
                return (
                  <div key={item.region}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-neutral-700">{item.region}</span>
                      <span className="text-neutral-500">{item.count}</span>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-blue rounded-full transition-all duration-500" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mapa */}
          <div className="overflow-hidden min-h-[286px]">
            <div className="relative min-h-[286px]">
              <MapLibreMap
                ref={mapRef}
                initialViewState={{ longitude: -30, latitude: 5, zoom: 0.45 }}
                mapStyle={DASHBOARD_MAP_STYLE}
                style={{ width: "100%", height: "286px" }}
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
      </div>
    </main>
  );
}
