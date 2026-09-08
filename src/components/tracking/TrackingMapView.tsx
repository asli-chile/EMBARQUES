"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import { Icon } from "@iconify/react";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapWebGLErrorBoundary } from "@/components/itinerario/MapWebGLErrorBoundary";
import type { NeonTheme } from "@/lib/ui/neonTheme";

const MAP_STYLE_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const MAP_STYLE_LIGHT = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

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
  theme?: NeonTheme;
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
  theme = "dark",
}: TrackingMapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [containerReady, setContainerReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapStyle = theme === "light" ? MAP_STYLE_LIGHT : MAP_STYLE_DARK;
  const isDark = theme !== "light";
  const shellBg = isDark ? "bg-[#0B1428]" : "bg-[#E8F0FA]";
  const overlayBg = isDark ? "bg-[#101c38] text-dash-muted" : "bg-[#F4F8FC] text-brand-blue/50";
  const labelCls = isDark
    ? "rounded border border-cyan-400/40 bg-[#101c38]/95 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-100 shadow"
    : "rounded border border-neutral-200 bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-brand-blue shadow";
  const labelManualCls = isDark
    ? "rounded border border-violet-400/45 bg-[#101c38]/95 px-1.5 py-0.5 text-[10px] font-semibold text-violet-200 shadow"
    : "rounded border border-violet-200 bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800 shadow";
  const vesselColor = isDark ? "text-cyan-300" : "text-brand-blue";
  const vesselManualColor = isDark ? "text-violet-300" : "text-violet-600";

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
    <div ref={containerRef} className={`relative h-full min-h-[min(420px,55dvh)] w-full lg:min-h-0 ${shellBg}`}>
      {!mounted || !containerReady ? (
        <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-sm ${overlayBg}`}>
          <Icon
            icon="lucide:loader-2"
            width={24}
            height={24}
            className={`animate-spin ${isDark ? "text-cyan-400/60" : "text-brand-blue/40"}`}
            aria-hidden
          />
          {emptyHint}
        </div>
      ) : mapError ? (
        <div className={`absolute inset-0 z-10 flex items-center justify-center px-4 text-center text-sm ${overlayBg}`}>
          {webglFallback}
        </div>
      ) : (
        <MapWebGLErrorBoundary
          fallback={
            <div className={`absolute inset-0 flex items-center justify-center px-4 text-center text-sm ${overlayBg}`}>
              {webglFallback}
            </div>
          }
        >
          <Map
            key={mapStyle}
            ref={mapRef}
            initialViewState={DEFAULT_CENTER}
            style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
            mapStyle={mapStyle}
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
                  <span className={`max-w-[140px] truncate ${labelCls}`}>{pol.label}</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-white shadow-md">
                    <Icon icon="lucide:anchor" width={16} height={16} aria-hidden />
                  </div>
                </div>
              </Marker>
            )}

            {pod && validCoord(pod.lat, pod.lng) && (
              <Marker longitude={pod.lng} latitude={pod.lat} anchor="bottom">
                <div className="flex flex-col items-center gap-0.5">
                  <span className={`max-w-[140px] truncate ${labelCls}`}>{pod.label}</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-amber-500 text-white shadow-md">
                    <Icon icon="lucide:map-pin" width={16} height={16} aria-hidden />
                  </div>
                </div>
              </Marker>
            )}

            {fleetWithoutPrimaryOverlap.map((fv) => (
              <Marker key={fv.markerKey} longitude={fv.lng} latitude={fv.lat} anchor="bottom">
                <div className="pointer-events-none flex flex-col items-center gap-0.5">
                  <span className={`max-w-[min(200px,42vw)] truncate ${labelManualCls}`}>{fv.name}</span>
                  <VesselTopDownIcon
                    label={fv.name}
                    className={`${vesselManualColor} drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]`}
                  />
                </div>
              </Marker>
            ))}

            {showPrimaryVessel && vessel && primaryIsManual && (
              <Marker longitude={vessel.lng} latitude={vessel.lat} anchor="bottom">
                <div className="group relative z-10 flex cursor-default flex-col items-center justify-center px-1 py-0.5">
                  <div
                    className={`pointer-events-none absolute bottom-full left-1/2 z-20 mb-0.5 max-w-[min(240px,85vw)] min-w-0 -translate-x-1/2 text-center opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${labelManualCls}`}
                  >
                    <span className="block truncate">{vessel.name}</span>
                  </div>
                  <span className={`mb-0.5 max-w-[min(200px,42vw)] truncate ${labelManualCls}`}>{vessel.name}</span>
                  <VesselTopDownIcon
                    label={vessel.name}
                    className={`${vesselManualColor} drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]`}
                  />
                </div>
              </Marker>
            )}

            {showPrimaryVessel && vessel && !primaryIsManual && (
              <Marker longitude={vessel.lng} latitude={vessel.lat} anchor="bottom">
                <div
                  className="group relative z-10 flex cursor-default flex-col items-center justify-center px-1.5 py-1.5"
                  title={vessel.name}
                >
                  <div
                    className={`pointer-events-none absolute bottom-full left-1/2 z-20 mb-0.5 max-w-[min(240px,85vw)] min-w-0 -translate-x-1/2 text-center opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${labelCls}`}
                  >
                    <span className="block truncate">{vessel.name}</span>
                  </div>
                  <span className={`mb-0.5 max-w-[min(200px,42vw)] truncate ${labelCls}`}>{vessel.name}</span>
                  <div
                    className="flex items-center justify-center [transform-origin:center]"
                    style={{ transform: `rotate(${courseDeg}deg)` }}
                  >
                    <VesselTopDownIcon
                      label={vessel.name}
                      className={`${vesselColor} drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]`}
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
