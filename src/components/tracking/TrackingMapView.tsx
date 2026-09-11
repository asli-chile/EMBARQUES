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

/** Los basemaps de CARTO pintan mar y tierra en gris; acá se repintan con la paleta corporativa.
 *  Son solo el respaldo: el valor real sale de --trk-water / --trk-land (tracking-brand.css). */
const WATER_COLOR_DARK = "#0a3556";
const WATER_COLOR_LIGHT = "#a9cfee";
const LAND_COLOR_DARK = "#141e2e";
const LAND_COLOR_LIGHT = "#f6eee8";

/** Zoom bajo + Pacífico central: encuadra bien rutas Chile–Asia al abrir; el usuario puede alejar y desplazarse con copias del mundo. */
const DEFAULT_CENTER = { longitude: -160, latitude: 5, zoom: 1.35 };

const COORD_CLOSE_EPS = 1.5e-4;

type StyleableMap = {
  getStyle?: () => { layers?: { id: string; type: string }[] } | undefined;
  getPaintProperty?: (layer: string, prop: string) => unknown;
  setPaintProperty?: (layer: string, prop: string, value: string) => void;
};

/** Repinta mar y tierra del basemap con la paleta corporativa.
 *  `water` es el océano; `background` es el lienzo base, que a bajo zoom se ve como tierra
 *  (`landcover` recién entra desde zoom 8). Pintarlos del mismo color deja el mapa plano. */
function paintBrandBasemap(map: StyleableMap, sea: string, land: string) {
  for (const layer of map.getStyle?.()?.layers ?? []) {
    let prop = "";
    let color = "";
    if (layer.type === "background") {
      prop = "background-color";
      color = land;
    } else if (layer.type === "fill" && layer.id === "water") {
      prop = "fill-color";
      color = sea;
    } else {
      continue;
    }
    // setPaintProperty emite `styledata`: sin este chequeo, reaplicar desde ese evento sería un bucle.
    if (map.getPaintProperty?.(layer.id, prop) === color) continue;
    map.setPaintProperty?.(layer.id, prop, color);
  }
}

/** Zoom al clickear un marcador: el puerto se mira de cerca, la nave necesita algo de mar alrededor. */
const PORT_FOCUS_ZOOM = 9;
const VESSEL_FOCUS_ZOOM = 6.5;
/** Ventana en que el auto-encuadre cede ante el clic del usuario (cubre la animación de flyTo). */
const FOCUS_GUARD_MS = 1500;

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
  /** Nombre de nave en operaciones (para cargar la carga al hacer clic). */
  nave: string;
  viaje: string | null;
};

type TrackingMapViewProps = {
  /** AIS del buque elegido, o posición manual de la operación seleccionada si no hay AIS. */
  vessel: MapVesselPosition | null;
  /** Todas las naves activas con coordenadas manuales (una por nave+viaje). */
  fleetManualVessels: MapFleetManualVessel[];
  /** POL/POD a pintar (varios cuando no hay nave seleccionada). */
  ports: MapMarkerPort[];
  emptyHint: string;
  webglFallback: string;
  theme?: NeonTheme;
  /** Clic en marcador de flota (violeta). */
  onFleetVesselClick?: (vessel: MapFleetManualVessel) => void;
  selectedFleetKey?: string | null;
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
  ports,
  emptyHint,
  webglFallback,
  theme = "dark",
  onFleetVesselClick,
  selectedFleetKey = null,
}: TrackingMapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [containerReady, setContainerReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapStyle = theme === "light" ? MAP_STYLE_LIGHT : MAP_STYLE_DARK;
  const isDark = theme !== "light";
  const shellBg = "bg-[var(--trk-water)]";
  const overlayBg = "bg-dash-control text-dash-muted";
  const labelCls =
    "rounded-md border border-[color-mix(in_srgb,var(--trk-vessel)_45%,transparent)] bg-dash-surface/95 px-1.5 py-0.5 text-[10px] font-semibold text-dash-fg shadow-sm";
  const labelManualCls =
    "rounded-md border border-[color-mix(in_srgb,var(--trk-vessel-manual)_45%,transparent)] bg-dash-surface/95 px-1.5 py-0.5 text-[10px] font-semibold text-dash-fg shadow-sm";
  const vesselColor = "text-[var(--trk-vessel)]";
  const vesselManualColor = "text-[var(--trk-vessel-manual)]";

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
      // Al colapsar el panel lateral cambia el ancho del contenedor: sin esto el canvas queda del tamaño viejo.
      (mapRef.current as unknown as { getMap?: () => { resize: () => void } } | null)?.getMap?.()?.resize();
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

  const applyBasemapColors = useCallback(() => {
    const map = (mapRef.current as unknown as { getMap?: () => StyleableMap } | null)?.getMap?.();
    if (!map) return;
    const el = containerRef.current;
    const css = (name: string) => (el ? getComputedStyle(el).getPropertyValue(name).trim() : "");
    paintBrandBasemap(
      map,
      css("--trk-water") || (isDark ? WATER_COLOR_DARK : WATER_COLOR_LIGHT),
      css("--trk-land") || (isDark ? LAND_COLOR_DARK : LAND_COLOR_LIGHT),
    );
  }, [isDark]);

  /** El cambio de tema reemplaza el estilo del basemap, lo que descarta el repintado.
   *  `styledata` avisa cada vez que el estilo vuelve a cargar. */
  useEffect(() => {
    const map = (
      mapRef.current as unknown as {
        getMap?: () => { on: (e: string, h: () => void) => void; off: (e: string, h: () => void) => void };
      } | null
    )?.getMap?.();
    if (!map) return;
    const onStyleData = () => applyBasemapColors();
    map.on("styledata", onStyleData);
    applyBasemapColors();
    return () => map.off("styledata", onStyleData);
  }, [applyBasemapColors, containerReady]);

  /** Acercarse a un marcador clickeado. Clicar una nave cambia `ports` (se carga su carga),
   *  lo que dispara el auto-encuadre; esta marca de tiempo hace que gane el gesto del usuario. */
  const manualFocusAt = useRef(0);
  const focusOn = useCallback(
    (lng: number, lat: number, zoom: number) => {
      if (!validCoord(lat, lng)) return;
      manualFocusAt.current = Date.now();
      flyTo(lng, lat, zoom);
    },
    [flyTo],
  );

  const fitPoints = useCallback((points: { lng: number; lat: number }[]) => {
    const raw = mapRef.current as unknown as {
      getMap?: () => {
        flyTo: (o: object) => void;
        fitBounds: (b: [[number, number], [number, number]], o?: object) => void;
      };
    } | null;
    const map = raw?.getMap?.();
    if (!map) return;
    const valid = points.filter((p) => validCoord(p.lat, p.lng));
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.flyTo({ center: [valid[0].lng, valid[0].lat], zoom: 5, duration: 900, essential: true });
      return;
    }
    const lngs = valid.map((p) => p.lng);
    const lats = valid.map((p) => p.lat);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    // Evitar bounds degenerados
    const padLng = Math.max((maxLng - minLng) * 0.12, 2);
    const padLat = Math.max((maxLat - minLat) * 0.12, 1.5);
    try {
      map.fitBounds(
        [
          [minLng - padLng, minLat - padLat],
          [maxLng + padLng, maxLat + padLat],
        ],
        { padding: 56, duration: 1000, maxZoom: 6, essential: true },
      );
    } catch {
      flyTo(valid[0].lng, valid[0].lat, 4.5);
    }
  }, [flyTo]);

  useEffect(() => {
    if (!mapRef.current) return;
    // El usuario acaba de acercarse a un marcador: no volver a encuadrar todo encima del gesto.
    if (Date.now() - manualFocusAt.current < FOCUS_GUARD_MS) return;
    const pts: { lng: number; lat: number }[] = [];
    for (const p of ports) {
      if (validCoord(p.lat, p.lng)) pts.push(p);
    }
    if (vessel && validCoord(vessel.lat, vessel.lng)) pts.push(vessel);
    for (const f of fleetManualVessels) {
      if (validCoord(f.lat, f.lng)) pts.push(f);
    }
    if (pts.length > 0) fitPoints(pts);
  }, [vessel?.lat, vessel?.lng, ports, fleetManualVessels, fitPoints]);

  useEffect(() => {
    if (!containerReady) return;
    const raw = mapRef.current as unknown as { getMap?: () => { resize: () => void } } | null;
    const map = raw?.getMap?.();
    try {
      map?.resize?.();
    } catch {
      /* ignore */
    }
  }, [containerReady, vessel, ports, fleetManualVessels]);

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
            className="animate-spin text-dash-neon"
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
              applyBasemapColors();
            }}
            onError={() => setMapError(true)}
          >
            <NavigationControl position="top-right" showCompass={false} />

            {ports.map((port) =>
              validCoord(port.lat, port.lng) ? (
                <Marker
                  key={`${port.variant}-${port.lng.toFixed(4)}-${port.lat.toFixed(4)}-${port.label}`}
                  longitude={port.lng}
                  latitude={port.lat}
                  anchor="bottom"
                  style={{ zIndex: 2 }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      focusOn(port.lng, port.lat, PORT_FOCUS_ZOOM);
                    }}
                    aria-label={port.label}
                    title={port.label}
                    className="flex cursor-pointer flex-col items-center gap-0.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-dash-neon"
                  >
                    <span className={`max-w-[160px] truncate ${labelCls}`}>{port.label}</span>
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-white shadow-lg ring-2 transition-transform hover:scale-110 ${
                        port.variant === "pol"
                          ? "bg-[var(--trk-pol)] ring-[color-mix(in_srgb,var(--trk-pol)_50%,transparent)]"
                          : "bg-[var(--trk-pod)] ring-[color-mix(in_srgb,var(--trk-pod)_50%,transparent)]"
                      }`}
                    >
                      <Icon
                        icon={port.variant === "pol" ? "lucide:anchor" : "lucide:map-pin"}
                        width={17}
                        height={17}
                        aria-hidden
                      />
                    </span>
                  </button>
                </Marker>
              ) : null,
            )}

            {fleetWithoutPrimaryOverlap.map((fv) => {
              const selected = selectedFleetKey != null && selectedFleetKey === fv.markerKey;
              return (
                <Marker key={fv.markerKey} longitude={fv.lng} latitude={fv.lat} anchor="bottom" style={{ zIndex: selected ? 4 : 3 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      focusOn(fv.lng, fv.lat, VESSEL_FOCUS_ZOOM);
                      onFleetVesselClick?.(fv);
                    }}
                    className="flex cursor-pointer flex-col items-center gap-0.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--trk-vessel-manual)_70%,transparent)]"
                    aria-label={fv.name}
                    title={fv.name}
                  >
                    <span
                      className={`max-w-[min(200px,42vw)] truncate ${labelManualCls} ${
                        selected ? "ring-1 ring-[color-mix(in_srgb,var(--trk-vessel-manual)_60%,transparent)]" : ""
                      }`}
                    >
                      {fv.name}
                    </span>
                    <VesselTopDownIcon
                      label={fv.name}
                      className={`${vesselManualColor} drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)] ${
                        selected ? "scale-110" : ""
                      }`}
                    />
                  </button>
                </Marker>
              );
            })}

            {showPrimaryVessel && vessel && primaryIsManual && (
              <Marker longitude={vessel.lng} latitude={vessel.lat} anchor="bottom">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    focusOn(vessel.lng, vessel.lat, VESSEL_FOCUS_ZOOM);
                  }}
                  title={vessel.name}
                  aria-label={vessel.name}
                  className="group relative z-10 flex cursor-pointer flex-col items-center justify-center rounded-lg px-1 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--trk-vessel-manual)_70%,transparent)]"
                >
                  <span
                    className={`pointer-events-none absolute bottom-full left-1/2 z-20 mb-0.5 max-w-[min(240px,85vw)] min-w-0 -translate-x-1/2 truncate text-center opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${labelManualCls}`}
                  >
                    {vessel.name}
                  </span>
                  <span className={`mb-0.5 max-w-[min(200px,42vw)] truncate ${labelManualCls}`}>{vessel.name}</span>
                  <VesselTopDownIcon
                    label={vessel.name}
                    className={`${vesselManualColor} drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)] transition-transform group-hover:scale-110`}
                  />
                </button>
              </Marker>
            )}

            {showPrimaryVessel && vessel && !primaryIsManual && (
              <Marker longitude={vessel.lng} latitude={vessel.lat} anchor="bottom">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    focusOn(vessel.lng, vessel.lat, VESSEL_FOCUS_ZOOM);
                  }}
                  title={vessel.name}
                  aria-label={vessel.name}
                  className="group relative z-10 flex cursor-pointer flex-col items-center justify-center rounded-lg px-1.5 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--trk-vessel)_70%,transparent)]"
                >
                  <span
                    className={`pointer-events-none absolute bottom-full left-1/2 z-20 mb-0.5 max-w-[min(240px,85vw)] min-w-0 -translate-x-1/2 truncate text-center opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${labelCls}`}
                  >
                    {vessel.name}
                  </span>
                  <span className={`mb-0.5 max-w-[min(200px,42vw)] truncate ${labelCls}`}>{vessel.name}</span>
                  <span
                    className="flex items-center justify-center [transform-origin:center]"
                    style={{ transform: `rotate(${courseDeg}deg)` }}
                  >
                    <VesselTopDownIcon
                      label={vessel.name}
                      className={`${vesselColor} drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]`}
                    />
                  </span>
                </button>
              </Marker>
            )}
          </Map>
        </MapWebGLErrorBoundary>
      )}
    </div>
  );
}
