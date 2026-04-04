"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import Map, { Source, Layer } from "react-map-gl/maplibre";
import type { MapRef } from "@vis.gl/react-maplibre";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { getPortCoordinates } from "@/lib/ports-coordinates";
import { formatDisplayDateLocal } from "@/lib/calendarUtils";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapWebGLErrorBoundary } from "./MapWebGLErrorBoundary";
import { FallbackSvgMap } from "./FallbackSvgMap";
import { withBase } from "@/lib/basePath";

/** Países con property "area": AMERICA | EUROPA | ASIA | MEDIO-ORIENTE | OCEANIA (generado por scripts/build-countries-by-region.mjs). */
const COUNTRIES_BY_REGION_URL = withBase("/geo/countries-by-region.geojson");

/** Estilo tipo Google Maps: calles, etiquetas, terreno (Carto Voyager, gratuito). */
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr?.trim()) return "—";
  try {
    const d = dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`;
    return formatDisplayDateLocal(new Date(d));
  } catch {
    return dateStr;
  }
}

/** Punto de destino en el mapa con detalle para tooltip */
export type MapPortPoint = {
  puerto: string;
  puerto_nombre: string | null;
  pol: string;
  etd: string | null;
  eta: string | null;
  /** Días de tránsito (ETA − ETD) */
  dias_transito: number | null;
  servicio: string;
  naviera: string;
  /** Área geográfica de la escala (ASIA, EUROPA, AMERICA, MEDIO-ORIENTE, OCEANIA) */
  area?: string;
};

type ItinerarioMapProps = {
  selectedArea: string | null;
  onSelectArea: (area: string | null) => void;
  areasWithData: string[];
  /** Puntos de destino con detalle (POL, ETD, ETA, servicio, naviera) para mostrar todos y tooltip. */
  portPoints?: MapPortPoint[];
  /** @deprecated Usar portPoints. Nombres o códigos de puertos (solo si portPoints no se pasa). */
  portNames?: string[];
  /** Cuando true, el mapa se muestra más bajo (tras haber elegido región). */
  compact?: boolean;
  /** Callback al hacer clic en un marcador de puerto. */
  onPortClick?: (port: MapPortPoint) => void;
};

export default function ItinerarioMap({
  selectedArea,
  onSelectArea,
  areasWithData,
  portPoints = [],
  portNames = [],
  compact = false,
  onPortClick,
}: ItinerarioMapProps) {
  const hasPortPoints = portPoints.length > 0;
  const { t } = useLocale();
  const tr = t.itinerarioPage ?? { mapAreaLabel: "Área", mapHint: "Haz clic en una región para filtrar itinerarios." };
  const mapRef = useRef<MapRef>(null);
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);
  /** Tooltip al pasar el mouse sobre un punto de destino (detalle en esquina). */
  const [hoveredPortDetail, setHoveredPortDetail] = useState<{
    destino: string;
    pol: string;
    etd: string;
    eta: string;
    tt: string;
    servicio: string;
    naviera: string;
    area: string;
  } | null>(null);
  const [geoJson, setGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  /** Capas de regiones se añaden solo tras cargar el estilo para que no se borren. */
  const [styleLoaded, setStyleLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /** Guard de montaje: evita que MapLibre intente inicializar antes de que el DOM esté listo. */
  const [mounted, setMounted] = useState(false);
  /**
   * Guard de dimensiones: MapLibre falla con WebGLContextCreationError si el canvas
   * tiene 0×0 px en el momento de inicialización. Solo montamos <Map> cuando el
   * contenedor ya tiene ancho y alto reales.
   */
  const [containerReady, setContainerReady] = useState(false);
  /** Error de runtime capturado por el prop onError del Map (WebGLContextCreationError, etc.). */
  const [mapRuntimeError, setMapRuntimeError] = useState<string | null>(null);
  /** Clave para forzar remontaje del mapa al hacer "Reintentar". */
  const [mapMountKey, setMapMountKey] = useState(0);
  /** Pequeño retraso tras tener dimensiones, para que el contexto WebGL esté listo. */
  const [mapReadyDelay, setMapReadyDelay] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Espera a que el contenedor tenga dimensiones reales antes de montar el mapa
  useEffect(() => {
    if (!mounted) return;
    const container = containerRef.current;
    if (!container) return;

    const check = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width > 0 && height > 0) setContainerReady(true);
    };

    check(); // intento inmediato
    const ro = new ResizeObserver(check);
    ro.observe(container);
    return () => ro.disconnect();
  }, [mounted]);

  // Retraso breve tras containerReady para reducir fallos de WebGL por timing
  useEffect(() => {
    if (!containerReady) return;
    const t = setTimeout(() => setMapReadyDelay(true), 300);
    return () => clearTimeout(t);
  }, [containerReady]);

  useEffect(() => {
    fetch(COUNTRIES_BY_REGION_URL)
      .then((r) => {
        return r.json();
      })
      .then((data: GeoJSON.FeatureCollection) => {
        setGeoJson(data);
      })
      .catch((err) => {
        setGeoJson({ type: "FeatureCollection", features: [] });
      });
  }, []);

  // Aplicar zoom inicial vía API cada vez que el estilo carga (bypasa initialViewState que es uncontrolled)
  useEffect(() => {
    if (!styleLoaded) return;
    const raw = mapRef.current as unknown as { getMap?: () => unknown } | null;
    const map = (raw?.getMap ? raw.getMap() : raw) as { jumpTo?: (opts: object) => void } | null;
    if (typeof map?.jumpTo === "function") {
      map.jumpTo({ zoom: 0.1, center: [10, 10] });
    }
  }, [styleLoaded]);

  const highlightArea = hoveredArea ?? selectedArea;

  const portsGeoJson = useMemo((): GeoJSON.FeatureCollection => {
    if (hasPortPoints) {
      const features: GeoJSON.Feature[] = [];
      for (const pt of portPoints) {
        const name = (pt.puerto_nombre?.trim() || pt.puerto?.trim() || "") as string;
        const coords = getPortCoordinates(name);
        if (!coords) continue;
        const destino = (pt.puerto_nombre?.trim() || pt.puerto?.trim() || "—") as string;
        features.push({
          type: "Feature",
          properties: {
            destino,
            pol: pt.pol?.trim() ?? "—",
            etd: pt.etd ?? "",
            eta: pt.eta ?? "",
            tt: pt.dias_transito != null ? pt.dias_transito : null,
            servicio: pt.servicio?.trim() ?? "—",
            naviera: pt.naviera?.trim() ?? "—",
            area: pt.area ?? "",
          },
          geometry: { type: "Point", coordinates: coords },
        });
      }
      return { type: "FeatureCollection", features };
    }
    const seen = new Set<string>();
    const features: GeoJSON.Feature[] = [];
    for (const name of portNames) {
      const coords = getPortCoordinates(name);
      if (!coords) continue;
      const key = `${coords[0]},${coords[1]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      features.push({
        type: "Feature",
        properties: { name: name.trim(), destino: name.trim(), pol: "—", etd: "", eta: "", tt: null, servicio: "—", naviera: "—" },
        geometry: { type: "Point", coordinates: coords },
      });
    }
    return { type: "FeatureCollection", features };
  }, [portPoints, hasPortPoints, portNames]);

  const onMouseMove = useCallback(
    (evt: { point: [number, number] }) => {
      const mapRefCurrent = mapRef.current as unknown as { getMap?: () => any } | null;
      const map = mapRefCurrent?.getMap ? mapRefCurrent.getMap() : (mapRefCurrent as any);
      if (!map || typeof map.queryRenderedFeatures !== "function") return;

      const hasPortsLayer =
        typeof map.getLayer === "function" && !!map.getLayer("ports-circles");
      const hasCountriesLayer =
        typeof map.getLayer === "function" &&
        (!!map.getLayer("countries-fill") || !!map.getLayer("countries-highlight-outline"));

      const portFeature: GeoJSON.Feature | undefined =
        hasPortsLayer
          ? (map.queryRenderedFeatures(evt.point, { layers: ["ports-circles"] })[0] as GeoJSON.Feature | undefined)
          : undefined;
      if (portFeature?.properties) {
        const p = portFeature.properties as Record<string, unknown>;
        const tt = p.tt;
        setHoveredPortDetail({
          destino: String(p.destino ?? "—"),
          pol: String(p.pol ?? "—"),
          etd: String(p.etd ?? "—"),
          eta: String(p.eta ?? "—"),
          tt: tt != null && typeof tt === "number" ? String(tt) : "—",
          servicio: String(p.servicio ?? "—"),
          naviera: String(p.naviera ?? "—"),
          area: String(p.area ?? ""),
        });
        const canvas = map.getCanvas?.();
        if (canvas) canvas.style.cursor = "pointer";
      } else {
        setHoveredPortDetail(null);
        if (geoJson && hasCountriesLayer) {
          const features = map.queryRenderedFeatures(evt.point, {
            layers: ["countries-fill", "countries-highlight-outline"],
          });
          const feature = features[0] as GeoJSON.Feature | undefined;
          const area = feature?.properties?.area as string | undefined;
          setHoveredArea(area ?? null);
          const canvas = map.getCanvas?.();
          if (canvas) canvas.style.cursor = area ? "pointer" : "default";
        }
      }
    },
    [geoJson]
  );

  const onMouseLeave = useCallback(() => {
    setHoveredArea(null);
    setHoveredPortDetail(null);
    const map = mapRef.current;
    if (map?.getCanvas?.()) map.getCanvas().style.cursor = "default";
  }, []);

  const onClick = useCallback(
    (evt: { point: [number, number] }) => {
      const mapRefCurrent = mapRef.current as unknown as { getMap?: () => any } | null;
      const map = mapRefCurrent?.getMap ? mapRefCurrent.getMap() : (mapRefCurrent as any);
      if (!map || typeof map.queryRenderedFeatures !== "function") return;

      // Prioridad 1: clic en marcador de puerto
      const hasPortsLayer = typeof map.getLayer === "function" && !!map.getLayer("ports-circles");
      if (hasPortsLayer && onPortClick) {
        const portFeatures = map.queryRenderedFeatures(evt.point, { layers: ["ports-circles"] });
        if (portFeatures.length > 0) {
          const p = portFeatures[0].properties as Record<string, unknown>;
          const destino = String(p.destino ?? "");
          const servicio = String(p.servicio ?? "");
          // Buscar el portPoint completo (incluye area)
          const match = portPoints.find(
            (pt) => (pt.puerto_nombre?.trim() || pt.puerto?.trim() || "") === destino && pt.servicio.trim() === servicio
          ) ?? portPoints.find(
            (pt) => (pt.puerto_nombre?.trim() || pt.puerto?.trim() || "") === destino
          );
          if (match) {
            onPortClick(match);
          } else {
            onPortClick({
              puerto: destino,
              puerto_nombre: destino,
              pol: String(p.pol ?? ""),
              etd: String(p.etd ?? "") || null,
              eta: String(p.eta ?? "") || null,
              dias_transito: typeof p.tt === "number" ? p.tt : null,
              servicio,
              naviera: String(p.naviera ?? ""),
            });
          }
          return;
        }
      }

      // Prioridad 2: clic en región de país
      if (!geoJson) return;
      const hasCountriesLayer =
        typeof map.getLayer === "function" &&
        (!!map.getLayer("countries-fill") || !!map.getLayer("countries-highlight-outline"));
      if (!hasCountriesLayer) return;

      const features = map.queryRenderedFeatures(evt.point, {
        layers: ["countries-fill", "countries-highlight-outline"],
      });
      const feature = features[0] as GeoJSON.Feature | undefined;
      const area = feature?.properties?.area as string | undefined;
      if (area) onSelectArea(selectedArea === area ? null : area);
    },
    [geoJson, selectedArea, onSelectArea, onPortClick, portPoints]
  );

  // ResizeObserver: MapLibre no redimensiona solo cuando cambia el contenedor; hay que llamar resize()
  useEffect(() => {
    if (!styleLoaded) return;

    const container = containerRef.current;
    const ref = mapRef.current as unknown as { getMap?: () => { resize: () => void } } | null;
    const map = ref?.getMap?.();
    if (!container || typeof map?.resize !== "function") return;

    const ro = new ResizeObserver(() => {
      try {
        map.resize();
      } catch {
        // ignore
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [styleLoaded]);

  return (
    <div
      className={`overflow-hidden flex flex-col bg-white ${
        compact
          ? "rounded-2xl border border-neutral-200 shadow-mac-modal"
          : "rounded-none border-0 h-full min-h-0 flex-1"
      }`}
    >
      <div
        ref={containerRef}
        className={`relative w-full ${compact ? "" : "flex-1 min-h-0"}`}
        style={
          compact
            ? { height: 280 }
            : { height: "100%", minHeight: "min(400px, 50dvh)" }
        }
      >
        {/* Estado: esperando montaje, dimensiones, retraso o GeoJSON */}
        {!mounted || !containerReady || !mapReadyDelay || !geoJson ? (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 text-neutral-500 text-sm">
            {tr.mapLoading ?? "Cargando mapa…"}
          </div>
        ) : mapRuntimeError ? (
          /* Fallback: mapa SVG cuando WebGL no está disponible — vista limpia sin botones */
          <FallbackSvgMap
            geoJson={geoJson}
            selectedArea={selectedArea}
            onSelectArea={onSelectArea}
            highlightArea={highlightArea}
            portPoints={portPoints}
          />
        ) : (
          <>
          <MapWebGLErrorBoundary
            fallback={
              <FallbackSvgMap
                geoJson={geoJson}
                selectedArea={selectedArea}
                onSelectArea={onSelectArea}
                highlightArea={highlightArea}
                portPoints={portPoints}
              />
            }
          >
          <Map
            key={mapMountKey}
            ref={mapRef}
            initialViewState={{
              longitude: 10,
              latitude: 10,
              zoom: 0.1,
            }}
            minZoom={0}
            maxZoom={20}
            style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
            mapStyle={MAP_STYLE}
            renderWorldCopies={false}
            dragRotate={false}
            touchPitch={false}
            onLoad={(e) => {
              const map = e.target as { setRenderWorldCopies?: (v: boolean) => void; resize?: () => void; jumpTo?: (opts: object) => void };
              if (typeof map.setRenderWorldCopies === "function") map.setRenderWorldCopies(false);
              if (typeof map.resize === "function") map.resize();
              if (typeof map.jumpTo === "function") map.jumpTo({ zoom: 0.1, center: [10, 10] });
              setStyleLoaded(true);
            }}
            onError={() => {
              // WebGL no disponible (sandbox, aceleración desactivada, etc.). Se muestra fallback; no loguear para no saturar la consola.
              setMapRuntimeError("WebGL no disponible");
            }}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
            interactiveLayerIds={["countries-fill", "countries-highlight-outline"]}
          >
            {(() => {
              const showCountries = styleLoaded && geoJson && geoJson.features.length > 0;
              return showCountries ? (
              <Source id="countries" type="geojson" data={geoJson}>
                <Layer
                  id="countries-fill"
                  type="fill"
                  paint={{
                    "fill-color": [
                      "match",
                      ["get", "area"],
                      "AMERICA",
                      "rgba(34, 197, 94, 0.5)",
                      "EUROPA",
                      "rgba(0, 82, 155, 0.5)",
                      "ASIA",
                      "rgba(234, 179, 8, 0.5)",
                      "MEDIO-ORIENTE",
                      "rgba(249, 115, 22, 0.5)",
                      "OCEANIA",
                      "rgba(20, 184, 166, 0.5)",
                      "rgba(0, 0, 0, 0)",
                    ],
                    "fill-opacity": 1,
                  }}
                />
                <Layer
                  id="countries-outline"
                  type="line"
                  paint={{
                    "line-color": "rgba(255, 255, 255, 0.4)",
                    "line-width": 0.5,
                  }}
                />
                <Layer
                  id="countries-highlight-outline"
                  type="line"
                  filter={highlightArea ? ["==", ["get", "area"], highlightArea] : ["==", ["get", "area"], "__none__"]}
                  paint={{
                    "line-color": "rgba(0, 0, 0, 0.6)",
                    "line-width": 2,
                  }}
                />
              </Source>
              ) : null;
            })()}
            {(() => {
              const showPorts = styleLoaded && portsGeoJson.features.length > 0;
              return showPorts ? (
              <Source id="ports" type="geojson" data={portsGeoJson}>
                <Layer
                  id="ports-halo"
                  type="circle"
                  paint={{
                    "circle-radius": 16,
                    "circle-color": "#1a6fc4",
                    "circle-opacity": 0.18,
                    "circle-blur": 0.6,
                  }}
                />
                <Layer
                  id="ports-circles"
                  type="circle"
                  paint={{
                    "circle-radius": 7,
                    "circle-color": "#1a6fc4",
                    "circle-stroke-width": 2.5,
                    "circle-stroke-color": "#ffffff",
                    "circle-stroke-opacity": 0.95,
                  }}
                />
              </Source>
              ) : null;
            })()}
          </Map>
          </MapWebGLErrorBoundary>
          {hoveredPortDetail && (() => {
            // AMERICA/OCEANIA → esquina inferior derecha; otras regiones → esquina inferior izquierda
            const isRight = hoveredPortDetail.area === "AMERICA" || hoveredPortDetail.area === "OCEANIA";
            const cornerClass = isRight
              ? "right-4 bottom-4"
              : "left-4 bottom-4";
            return (
            <div
              className={`absolute ${cornerClass} z-10 w-[272px] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10`}
              style={{ background: "linear-gradient(160deg, #0d1e3b 0%, #0a2456 100%)" }}
              role="tooltip"
              aria-live="polite"
            >
              {/* Línea de brillo superior */}
              <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" aria-hidden />

              {/* Cabecera */}
              <div className="px-4 pt-4 pb-3 border-b border-white/10 flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300 ring-1 ring-blue-400/25">
                  <Icon icon="lucide:map-pin" width={17} height={17} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-blue-300/60 uppercase tracking-[0.2em]">
                    {tr.mapTooltipDestino ?? "Destino"}
                  </p>
                  <p className="text-sm font-bold text-white tracking-tight leading-tight truncate">
                    {hoveredPortDetail.destino}
                  </p>
                </div>
              </div>

              {/* Grid de datos */}
              <div className="px-4 py-3.5 grid grid-cols-2 gap-x-4 gap-y-3.5">
                <div>
                  <p className="text-[9px] font-bold text-blue-300/50 uppercase tracking-[0.15em] mb-1 flex items-center gap-1">
                    <Icon icon="lucide:anchor" width={10} aria-hidden /> {tr.mapTooltipPol ?? "POL"}
                  </p>
                  <p className="text-xs font-semibold text-white/90 truncate">{hoveredPortDetail.pol}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-blue-300/50 uppercase tracking-[0.15em] mb-1 flex items-center gap-1">
                    <Icon icon="lucide:timer" width={10} aria-hidden /> {tr.mapTooltipTt ?? "TT"}
                  </p>
                  <p className="text-xs font-semibold tabular-nums">
                    {hoveredPortDetail.tt !== "—" ? (
                      <><span className="text-cyan-300 font-bold">{hoveredPortDetail.tt}</span><span className="text-white/60"> días</span></>
                    ) : <span className="text-white/40">—</span>}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-blue-300/50 uppercase tracking-[0.15em] mb-1 flex items-center gap-1">
                    <Icon icon="lucide:calendar-clock" width={10} aria-hidden /> {tr.mapTooltipEtd ?? "ETD"}
                  </p>
                  <p className="text-xs font-semibold text-white/90 tabular-nums">{formatDate(hoveredPortDetail.etd)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-blue-300/50 uppercase tracking-[0.15em] mb-1 flex items-center gap-1">
                    <Icon icon="lucide:calendar-check" width={10} aria-hidden /> {tr.mapTooltipEta ?? "ETA"}
                  </p>
                  <p className="text-xs font-semibold text-white/90 tabular-nums">{formatDate(hoveredPortDetail.eta)}</p>
                </div>
                <div className="col-span-2 pt-0.5 border-t border-white/10">
                  <p className="text-[9px] font-bold text-blue-300/50 uppercase tracking-[0.15em] mb-1 flex items-center gap-1">
                    <Icon icon="lucide:layers" width={10} aria-hidden /> {tr.mapTooltipServicio ?? "Servicio"}
                  </p>
                  <p className="text-xs font-semibold text-white/90 truncate">{hoveredPortDetail.servicio}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[9px] font-bold text-blue-300/50 uppercase tracking-[0.15em] mb-1 flex items-center gap-1">
                    <Icon icon="lucide:ship" width={10} aria-hidden /> {tr.mapTooltipNaviera ?? "Naviera"}
                  </p>
                  <p className="text-xs font-semibold text-white/90 truncate">{hoveredPortDetail.naviera}</p>
                </div>
              </div>
              {onPortClick && (
                <div className="px-4 pb-3.5 pt-0">
                  <div className="flex items-center justify-center gap-1.5 rounded-lg bg-white/10 border border-white/15 py-1.5 text-[11px] font-semibold text-white/70">
                    <Icon icon="lucide:mouse-pointer-click" width={12} aria-hidden />
                    Clic para ver itinerario
                  </div>
                </div>
              )}
            </div>
            );
          })()}
          </>
        )}
      </div>
      <div className="px-4 py-2.5 border-t border-neutral-200/80 bg-white flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">{tr.mapAreaLabel ?? "Área"}:</span>
          {selectedArea ? (
            <button
              type="button"
              onClick={() => onSelectArea(null)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-blue text-white text-xs font-semibold hover:bg-brand-blue/90 shadow-sm shadow-brand-blue/30"
              aria-label={`Quitar filtro ${selectedArea}`}
            >
              {selectedArea}
              <span className="text-white/70 font-normal">✕</span>
            </button>
          ) : (
            <span className="text-xs text-neutral-400 italic">{tr.mapHint ?? "Haz clic en una región para filtrar itinerarios."}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onSelectArea("ALL")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-blue text-white font-semibold hover:bg-brand-blue/90 text-xs shrink-0 shadow-sm shadow-brand-blue/30 transition-colors"
          aria-label={tr.viewAllAria ?? "Ver todos los itinerarios"}
        >
          <Icon icon="lucide:globe" width={12} height={12} aria-hidden />
          {tr.viewAll ?? "Ver todos"}
        </button>
      </div>
    </div>
  );
}
