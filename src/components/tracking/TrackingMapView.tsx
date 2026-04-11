"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import { Icon } from "@iconify/react";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapWebGLErrorBoundary } from "@/components/itinerario/MapWebGLErrorBoundary";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

/** Zoom bajo + Pacífico central: encuadra bien rutas Chile–Asia al abrir; el usuario puede alejar y desplazarse con copias del mundo. */
const DEFAULT_CENTER = { longitude: -160, latitude: 5, zoom: 1.35 };

const COORD_CLOSE_EPS = 1.5e-4;

export type MapMarkerPort = {
  lng: number;
  lat: number;
  label: string;
  variant: "pol" | "pod";
};

export type MapVesselPosition = {
  lng: number;
  lat: number;
  course: number | null;
  name: string;
  /** Posición guardada en la operación (no AIS); sin rotación de rumbo. */
  isManual?: boolean;
};

/** Nave con posición manual en flota (nombre siempre visible en mapa). */
export type MapFleetManualVessel = {
  markerKey: string;
  lng: number;
  lat: number;
  name: string;
};

type TrackingMapViewProps = {
  /** AIS del buque elegido, o posición manual de la operación seleccionada si no hay AIS. */
  vessel: MapVesselPosition | null;
  /** Todas las naves activas con coordenadas manuales (una por nave+viaje). */
  fleetManualVessels: MapFleetManualVessel[];
  pol: MapMarkerPort | null;
  pod: MapMarkerPort | null;
  emptyHint: string;
  webglFallback: string;
};

function validCoord(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
}

function coordsClose(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  eps = COORD_CLOSE_EPS,
) {
  return Math.abs(a.lat - b.lat) < eps && Math.abs(a.lng - b.lng) < eps;
}

/**
 * Silueta cenital tipo AIS (proa arriba = rumbo 0° / norte en mapa), estilo MarineTraffic/VesselFinder:
 * casco angosto al frente, popa ancha, borde claro para leer sobre el mar.
 */
function VesselTopDownIcon({ className, label }: { className?: string; label: string }) {
  return (
    <svg
      width={26}
      height={26}
      viewBox="-15 -17 30 34"
      className={`pointer-events-none ${className ?? ""}`}
      aria-hidden
    >
      <title>{label}</title>
      <path
        fill="currentColor"
        stroke="#ffffff"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        d="M 0 -15.5 L 11.2 11.5 L 7 14.8 L -7 14.8 L -11.2 11.5 Z"
      />
    </svg>
  );
}

export function TrackingMapView({
  vessel,
  fleetManualVessels,
  pol,
  pod,
  emptyHint,
  webglFallback,
}: TrackingMapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [containerReady, setContainerReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  /** No duplicar icono si la flota ya marca el mismo punto (AIS o manual primario). */
  const fleetWithoutPrimaryOverlap = useMemo(() => {
    if (!vessel || !validCoord(vessel.lat, vessel.lng)) return fleetManualVessels;
    return fleetManualVessels.filter((f) => !coordsClose(f, vessel));
  }, [fleetManualVessels, vessel]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) setContainerReady(true);
    });
    ro.observe(el);
    const { width, height } = el.getBoundingClientRect();
    if (width > 0 && height > 0) setContainerReady(true);
    return () => ro.disconnect();
  }, [mounted]);

  const flyTo = useCallback((lng: number, lat: number, zoom: number) => {
    const raw = mapRef.current as unknown as { getMap?: () => { flyTo: (o: object) => void } } | null;
    const map = raw?.getMap?.();
    if (map && typeof map.flyTo === "function") {
      map.flyTo({ center: [lng, lat], zoom, duration: 1000, essential: true });
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    if (vessel && validCoord(vessel.lat, vessel.lng)) {
      flyTo(vessel.lng, vessel.lat, 5.5);
      return;
    }
    if (pod && validCoord(pod.lat, pod.lng)) {
      flyTo(pod.lng, pod.lat, 4.5);
      return;
    }
    if (pol && validCoord(pol.lat, pol.lng)) {
      flyTo(pol.lng, pol.lat, 4.5);
    }
  }, [vessel?.lat, vessel?.lng, pod?.lat, pod?.lng, pol?.lat, pol?.lng, flyTo]);

  useEffect(() => {
    if (!containerReady) return;
    const raw = mapRef.current as unknown as { getMap?: () => { resize: () => void } } | null;
    const map = raw?.getMap?.();
    try {
      map?.resize?.();
    } catch {
      /* ignore */
    }
  }, [containerReady, vessel, pol, pod, fleetManualVessels]);

  const showPrimaryVessel = vessel && validCoord(vessel.lat, vessel.lng);
  const primaryIsManual = Boolean(vessel?.isManual);
  const courseDeg =
    !primaryIsManual && vessel?.course != null && Number.isFinite(vessel.course) ? vessel.course : 0;

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[min(420px,55dvh)] lg:min-h-0 bg-neutral-200">
      {!mounted || !containerReady ? (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 text-neutral-500 text-sm z-10">
          {emptyHint}
        </div>
      ) : mapError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 text-neutral-600 text-sm text-center px-4 z-10">
          {webglFallback}
        </div>
      ) : (
        <MapWebGLErrorBoundary
          fallback={
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 text-neutral-600 text-sm text-center px-4">
              {webglFallback}
            </div>
          }
        >
          <Map
            ref={mapRef}
            initialViewState={DEFAULT_CENTER}
            style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
            mapStyle={MAP_STYLE}
            renderWorldCopies
            dragRotate={false}
            touchPitch={false}
            onLoad={(e) => {
              const m = e.target as {
                resize?: () => void;
                setRenderWorldCopies?: (v: boolean) => void;
              };
              m.resize?.();
              if (typeof m.setRenderWorldCopies === "function") m.setRenderWorldCopies(true);
            }}
            onError={() => setMapError(true)}
          >
            <NavigationControl position="top-right" showCompass={false} />

            {pol && validCoord(pol.lat, pol.lng) && (
              <Marker longitude={pol.lng} latitude={pol.lat} anchor="bottom">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="max-w-[140px] truncate rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-brand-blue shadow border border-neutral-200">
                    {pol.label}
                  </span>
                  <div className="h-8 w-8 rounded-full bg-emerald-600 border-2 border-white shadow-md flex items-center justify-center text-white">
                    <Icon icon="lucide:anchor" width={16} height={16} aria-hidden />
                  </div>
                </div>
              </Marker>
            )}

            {pod && validCoord(pod.lat, pod.lng) && (
              <Marker longitude={pod.lng} latitude={pod.lat} anchor="bottom">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="max-w-[140px] truncate rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-brand-blue shadow border border-neutral-200">
                    {pod.label}
                  </span>
                  <div className="h-8 w-8 rounded-full bg-amber-500 border-2 border-white shadow-md flex items-center justify-center text-white">
                    <Icon icon="lucide:map-pin" width={16} height={16} aria-hidden />
                  </div>
                </div>
              </Marker>
            )}

            {fleetWithoutPrimaryOverlap.map((fv) => (
              <Marker key={fv.markerKey} longitude={fv.lng} latitude={fv.lat} anchor="bottom">
                <div className="flex flex-col items-center gap-0.5 pointer-events-none">
                  <span className="max-w-[min(200px,42vw)] truncate rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800 shadow border border-violet-200">
                    {fv.name}
                  </span>
                  <VesselTopDownIcon
                    label={fv.name}
                    className="text-violet-600 drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
                  />
                </div>
              </Marker>
            ))}

            {showPrimaryVessel && vessel && primaryIsManual && (
              <Marker longitude={vessel.lng} latitude={vessel.lat} anchor="bottom">
                <div className="group relative flex flex-col items-center justify-center px-1 py-0.5 cursor-default z-10">
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-0.5 max-w-[min(240px,85vw)] min-w-0 -translate-x-1/2 rounded border border-violet-200 bg-white/95 px-2 py-1 text-center text-[10px] font-semibold text-violet-800 shadow-md opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <span className="block truncate">{vessel.name}</span>
                  </div>
                  <span className="max-w-[min(200px,42vw)] truncate rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800 shadow border border-violet-200 mb-0.5">
                    {vessel.name}
                  </span>
                  <VesselTopDownIcon
                    label={vessel.name}
                    className="text-violet-600 drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
                  />
                </div>
              </Marker>
            )}

            {showPrimaryVessel && vessel && !primaryIsManual && (
              <Marker longitude={vessel.lng} latitude={vessel.lat} anchor="bottom">
                <div
                  className="group relative flex flex-col items-center justify-center px-1.5 py-1.5 cursor-default z-10"
                  title={vessel.name}
                >
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-0.5 max-w-[min(240px,85vw)] min-w-0 -translate-x-1/2 rounded border border-neutral-200 bg-white/95 px-2 py-1 text-center text-[10px] font-semibold text-brand-blue shadow-md opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <span className="block truncate">{vessel.name}</span>
                  </div>
                  <span className="max-w-[min(200px,42vw)] truncate rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-brand-blue shadow border border-neutral-200 mb-0.5">
                    {vessel.name}
                  </span>
                  <div
                    className="flex items-center justify-center [transform-origin:center]"
                    style={{ transform: `rotate(${courseDeg}deg)` }}
                  >
                    <VesselTopDownIcon
                      label={vessel.name}
                      className="text-brand-blue drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
                    />
                  </div>
                </div>
              </Marker>
            )}
          </Map>
        </MapWebGLErrorBoundary>
      )}
    </div>
  );
}
