"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Marker, Source } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import { Icon } from "@iconify/react";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapWebGLErrorBoundary } from "@/components/itinerario/MapWebGLErrorBoundary";
import type { NeonTheme } from "@/lib/ui/neonTheme";
import { isValidCoord, type Journey, type LngLat } from "./navitrack-model";

const MAP_STYLE_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const MAP_STYLE_LIGHT = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const WATER_DARK = "#0a3556";
const WATER_LIGHT = "#a9cfee";
const LAND_DARK = "#141e2e";
const LAND_LIGHT = "#f6eee8";

const DEFAULT_VIEW = { longitude: -70, latitude: -20, zoom: 1.4 };

type StyleableMap = {
  getStyle?: () => { layers?: { id: string; type: string }[] } | undefined;
  getPaintProperty?: (layer: string, prop: string) => unknown;
  setPaintProperty?: (layer: string, prop: string, value: string) => void;
};

/**
 * Repinta mar y tierra del basemap con la paleta corporativa.
 *
 * Los estilos de CARTO vienen en gris neutro; sin esto el mapa se ve como un GIS
 * cualquiera y no como parte del ERP.
 */
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
    if (map.getPaintProperty?.(layer.id, prop) === color) continue;
    map.setPaintProperty?.(layer.id, prop, color);
  }
}

function lineFeature(coords: LngLat[]) {
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "LineString" as const,
          coordinates: coords.map((p) => [p.lng, p.lat] as [number, number]),
        },
      },
    ],
  };
}

/** Silueta cenital del buque, proa al norte: se rota con el rumbo real. */
function VesselMark({ label }: { label: string }) {
  return (
    <svg width={28} height={28} viewBox="-15 -17 30 34" className="pointer-events-none" aria-hidden>
      <title>{label}</title>
      <path
        fill="currentColor"
        stroke="#ffffff"
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        d="M 0 -15.5 L 11.2 11.5 L 7 14.8 L -7 14.8 L -11.2 11.5 Z"
      />
    </svg>
  );
}

export type NavitrackMapLabels = {
  origen: string;
  destino: string;
  posicionReal: string;
  posicionEstimada: string;
  recorrido: string;
  restante: string;
  puerto: string;
  cargando: string;
  sinWebgl: string;
  sinRuta: string;
  pantallaCompleta: string;
  salirPantallaCompleta: string;
};

type NavitrackMapProps = {
  journey: Journey;
  vesselName: string;
  /** Velocidad en nudos, para la etiqueta del buque. */
  vesselSpeed: number | null;
  theme: NeonTheme;
  labels: NavitrackMapLabels;
};

export function NavitrackMap({ journey, vesselName, vesselSpeed, theme, labels }: NavitrackMapProps) {
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);

  const isDark = theme !== "light";
  const mapStyle = isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;

  const { origen, destino, position, traveled, remaining, escalas } = journey;

  /** Puertos de conexión de un viaje con transbordo. Vacío si es directo. */
  const conexiones = (escalas ?? []).filter((e) => e.tipo === "conexion");
  const esReal = position?.source === "AIS";

  const traveledData = useMemo(
    () => (traveled.length > 1 ? lineFeature(traveled) : null),
    [traveled],
  );
  const remainingData = useMemo(
    () => (remaining.length > 1 ? lineFeature(remaining) : null),
    [remaining],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) setReady(true);
      (mapRef.current as unknown as { getMap?: () => { resize: () => void } } | null)
        ?.getMap?.()
        ?.resize();
    });
    ro.observe(el);
    const { width, height } = el.getBoundingClientRect();
    if (width > 0 && height > 0) setReady(true);
    return () => ro.disconnect();
  }, [mounted]);

  /** El navegador puede salir de pantalla completa por su cuenta (Esc). */
  useEffect(() => {
    const onChange = () => setPantallaCompleta(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const alternarPantallaCompleta = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void el.requestFullscreen?.().catch(() => {});
  }, []);

  const zoom = useCallback((delta: number) => {
    const map = (
      mapRef.current as unknown as {
        getMap?: () => { getZoom: () => number; easeTo: (o: object) => void };
      } | null
    )?.getMap?.();
    if (!map) return;
    map.easeTo({ zoom: map.getZoom() + delta, duration: 260 });
  }, []);

  const applyBasemapColors = useCallback(() => {
    const map = (mapRef.current as unknown as { getMap?: () => StyleableMap } | null)?.getMap?.();
    if (!map) return;
    const el = containerRef.current;
    const css = (name: string) => (el ? getComputedStyle(el).getPropertyValue(name).trim() : "");
    paintBrandBasemap(
      map,
      css("--trk-water") || (isDark ? WATER_DARK : WATER_LIGHT),
      css("--trk-land") || (isDark ? LAND_DARK : LAND_LIGHT),
    );
  }, [isDark]);

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
  }, [applyBasemapColors, ready]);

  /** Encuadra la ruta completa: el viaje debe entenderse sin tocar el mapa. */
  useEffect(() => {
    if (!ready) return;
    const map = (
      mapRef.current as unknown as {
        getMap?: () => {
          flyTo: (o: object) => void;
          fitBounds: (b: [[number, number], [number, number]], o?: object) => void;
        };
      } | null
    )?.getMap?.();
    if (!map) return;

    const pts: LngLat[] = [];
    if (isValidCoord(origen.coord)) pts.push(origen.coord);
    if (isValidCoord(destino.coord)) pts.push(destino.coord);
    // Sin esto, un transbordo lejos de la recta origen-destino queda fuera de cuadro.
    for (const c of conexiones) if (isValidCoord(c.coord)) pts.push(c.coord);
    if (position) pts.push(position);
    for (const p of traveled) pts.push(p);
    for (const p of remaining) pts.push(p);
    if (pts.length === 0) return;

    if (pts.length === 1) {
      map.flyTo({ center: [pts[0].lng, pts[0].lat], zoom: 4.5, duration: 900, essential: true });
      return;
    }

    const lngs = pts.map((p) => p.lng);
    const lats = pts.map((p) => p.lat);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const padLng = Math.max((maxLng - minLng) * 0.1, 2);
    const padLat = Math.max((maxLat - minLat) * 0.18, 2);
    try {
      map.fitBounds(
        [
          [minLng - padLng, minLat - padLat],
          [maxLng + padLng, maxLat + padLat],
        ],
        { padding: 56, duration: 1100, maxZoom: 6, essential: true },
      );
    } catch {
      map.flyTo({ center: [pts[0].lng, pts[0].lat], zoom: 3, duration: 900, essential: true });
    }
  }, [ready, origen.coord, destino.coord, conexiones, position, traveled, remaining, pantallaCompleta]);

  const courseDeg = position?.course != null && Number.isFinite(position.course) ? position.course : 0;
  const sinRuta = !isValidCoord(origen.coord) && !isValidCoord(destino.coord) && !position;
  const overlay = "bg-dash-control text-dash-muted";

  return (
    <div ref={containerRef} className="relative h-full w-full bg-[var(--trk-water)]">
      {!mounted || !ready ? (
        <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-sm ${overlay}`}>
          <Icon icon="lucide:loader-2" width={22} height={22} className="animate-spin text-dash-neon" aria-hidden />
          {labels.cargando}
        </div>
      ) : mapError ? (
        <div className={`absolute inset-0 z-10 flex items-center justify-center px-4 text-center text-sm ${overlay}`}>
          {labels.sinWebgl}
        </div>
      ) : (
        <MapWebGLErrorBoundary
          fallback={
            <div className={`absolute inset-0 flex items-center justify-center px-4 text-center text-sm ${overlay}`}>
              {labels.sinWebgl}
            </div>
          }
        >
          <Map
            ref={mapRef}
            initialViewState={DEFAULT_VIEW}
            style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
            mapStyle={mapStyle}
            renderWorldCopies
            dragRotate={false}
            touchPitch={false}
            attributionControl={false}
            onLoad={(e) => {
              const m = e.target as { resize?: () => void };
              m.resize?.();
              applyBasemapColors();
            }}
            onError={() => setMapError(true)}
          >
            {/* Tramo restante: guía tenue y punteada, no compite con lo ya navegado. */}
            {remainingData && (
              <Source id="nt-remaining" type="geojson" data={remainingData}>
                <Layer
                  id="nt-remaining-line"
                  type="line"
                  layout={{ "line-cap": "round", "line-join": "round" }}
                  paint={{
                    "line-color": isDark ? "#9bb4c4" : "#5d7385",
                    "line-width": 2,
                    "line-opacity": 0.45,
                    "line-dasharray": [1.6, 2.2],
                  }}
                />
              </Source>
            )}

            {/* Tramo recorrido: halo + línea llena en el teal corporativo. */}
            {traveledData && (
              <Source id="nt-traveled" type="geojson" data={traveledData}>
                <Layer
                  id="nt-traveled-glow"
                  type="line"
                  layout={{ "line-cap": "round", "line-join": "round" }}
                  paint={{
                    "line-color": isDark ? "#33bdbd" : "#007a7b",
                    "line-width": 9,
                    "line-opacity": isDark ? 0.2 : 0.14,
                    "line-blur": 4,
                  }}
                />
                <Layer
                  id="nt-traveled-line"
                  type="line"
                  layout={{ "line-cap": "round", "line-join": "round" }}
                  paint={{
                    "line-color": isDark ? "#33bdbd" : "#007a7b",
                    "line-width": 3,
                    "line-opacity": 0.95,
                  }}
                />
              </Source>
            )}

            {isValidCoord(origen.coord) && (
              <Marker longitude={origen.coord.lng} latitude={origen.coord.lat} anchor="center">
                <div className="flex flex-col items-center gap-1">
                  <span className="nt-map-chip">{origen.nombre || labels.origen}</span>
                  <span className="nt-port-dot nt-port-dot--pol" aria-hidden />
                </div>
              </Marker>
            )}

            {isValidCoord(destino.coord) && (
              <Marker longitude={destino.coord.lng} latitude={destino.coord.lat} anchor="center">
                <div className="flex flex-col items-center gap-1">
                  <span className="nt-map-chip">{destino.nombre || labels.destino}</span>
                  <span className="nt-port-dot nt-port-dot--pod" aria-hidden />
                </div>
              </Marker>
            )}

            {/*
              * Puertos de conexión.
              *
              * Se dibujan más discretos que origen y destino a propósito: son
              * parte del recorrido, no los extremos del compromiso con el
              * cliente. El chip lleva la nave que zarpa desde ahí, que es lo
              * que convierte el punto en un transbordo y no en una escala más.
              */}
            {conexiones.map((c) => (
              <Marker key={`${c.nombre}-${c.coord.lng}`} longitude={c.coord.lng} latitude={c.coord.lat} anchor="center">
                <div className="flex flex-col items-center gap-1">
                  <span className="nt-map-chip nt-map-chip--conexion">
                    {c.nombre}
                    {c.nave ? ` · ${c.nave}` : ""}
                  </span>
                  <span
                    className={`nt-port-dot nt-port-dot--conexion${c.cumplida ? " is-cumplida" : ""}`}
                    aria-hidden
                  />
                </div>
              </Marker>
            ))}

            {position && (
              <Marker longitude={position.lng} latitude={position.lat} anchor="center">
                <div className="relative flex items-center justify-center">
                  {/* Ficha del buque: nombre y, si hay AIS, velocidad y rumbo reales. */}
                  <div className="nt-vessel-card">
                    <p className="truncate font-bold">{vesselName || labels.posicionEstimada}</p>
                    {esReal && (vesselSpeed != null || position.course != null) && (
                      <p className="mt-0.5 flex items-center gap-2 text-[10px] font-medium opacity-80">
                        {vesselSpeed != null && <span>{vesselSpeed.toFixed(1)} kn</span>}
                        {position.course != null && <span>{Math.round(position.course)}°</span>}
                      </p>
                    )}
                  </div>
                  {esReal && <span className="nt-vessel-pulse" aria-hidden />}
                  <span
                    className={`relative ${
                      esReal ? "text-[var(--trk-vessel)]" : "text-[var(--trk-vessel-manual)] opacity-90"
                    }`}
                    style={{ transform: `rotate(${courseDeg}deg)`, transformOrigin: "center" }}
                  >
                    <VesselMark label={vesselName} />
                  </span>
                </div>
              </Marker>
            )}
          </Map>
        </MapWebGLErrorBoundary>
      )}

      {/* Controles propios: los de MapLibre traen su propio look y desentonan. */}
      {!mapError && ready && (
        <div className="absolute right-2.5 top-2.5 z-[6] flex flex-col gap-1.5">
          <div className="nt-map-ctrl-group">
            <button type="button" onClick={() => zoom(1)} aria-label="Zoom +" className="nt-map-ctrl">
              <Icon icon="lucide:plus" width={15} height={15} aria-hidden />
            </button>
            <span className="nt-map-ctrl-sep" aria-hidden />
            <button type="button" onClick={() => zoom(-1)} aria-label="Zoom −" className="nt-map-ctrl">
              <Icon icon="lucide:minus" width={15} height={15} aria-hidden />
            </button>
          </div>
          <button
            type="button"
            onClick={alternarPantallaCompleta}
            title={pantallaCompleta ? labels.salirPantallaCompleta : labels.pantallaCompleta}
            aria-label={pantallaCompleta ? labels.salirPantallaCompleta : labels.pantallaCompleta}
            className="nt-map-ctrl-group nt-map-ctrl"
          >
            <Icon
              icon={pantallaCompleta ? "lucide:minimize-2" : "lucide:maximize-2"}
              width={15}
              height={15}
              aria-hidden
            />
          </button>
        </div>
      )}

      {sinRuta && !mapError && ready && (
        <div className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center px-6">
          <p className="rounded-xl border border-dash-border bg-dash-surface/95 px-3.5 py-2.5 text-center text-xs font-medium text-dash-muted shadow-lg backdrop-blur">
            {labels.sinRuta}
          </p>
        </div>
      )}

      {!mapError && (
        <div className="pointer-events-none absolute bottom-2.5 left-2.5 z-[6] hidden flex-wrap items-center gap-1.5 sm:flex">
          <span className="nt-legend">
            <span className="nt-legend-line nt-legend-line--done" aria-hidden />
            {labels.recorrido}
          </span>
          <span className="nt-legend">
            <span className="nt-legend-line nt-legend-line--todo" aria-hidden />
            {labels.restante}
          </span>
          <span className="nt-legend">
            <span className={`nt-legend-dot ${esReal ? "nt-legend-dot--real" : "nt-legend-dot--est"}`} aria-hidden />
            {esReal ? labels.posicionReal : labels.posicionEstimada}
          </span>
          <span className="nt-legend">
            <span className="nt-legend-dot nt-legend-dot--puerto" aria-hidden />
            {labels.puerto}
          </span>
        </div>
      )}
    </div>
  );
}
