"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import Map, { Source, Layer } from "react-map-gl/maplibre";
import type { MapRef } from "@vis.gl/react-maplibre";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { getPortCoordinates } from "@/lib/ports-coordinates";
import { format } from "date-fns";
import "maplibre-gl/dist/maplibre-gl.css";

/** Países con property "area": AMERICA | EUROPA | ASIA | INDIA-MEDIOORIENTE (generado por scripts/build-countries-by-region.mjs). */
const COUNTRIES_BY_REGION_URL = "/geo/countries-by-region.geojson";

/** Estilo tipo Google Maps: calles, etiquetas, terreno (Carto Voyager, gratuito). */
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

const DATE_DISPLAY = "dd/MM/yyyy";
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr?.trim()) return "—";
  try {
    const d = dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`;
    return format(new Date(d), DATE_DISPLAY);
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
};

export default function ItinerarioMap({
  selectedArea,
  onSelectArea,
  areasWithData,
  portPoints = [],
  portNames = [],
  compact = false,
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
  } | null>(null);
  const [geoJson, setGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  /** Capas de regiones se añaden solo tras cargar el estilo para que no se borren. */
  const [styleLoaded, setStyleLoaded] = useState(false);

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
      if (!map || !geoJson || typeof map.queryRenderedFeatures !== "function") return;

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
    [geoJson, selectedArea, onSelectArea]
  );

  return (
    <div
      className={`overflow-hidden flex flex-col bg-white ${
        compact
          ? "rounded-2xl border border-neutral-200 shadow-mac-modal"
          : "rounded-none border-0 h-full min-h-0 flex-1"
      }`}
    >
      <div
        className={`relative w-full ${compact ? "" : "flex-1 min-h-0"}`}
        style={compact ? { height: 280 } : { minHeight: "calc(100dvh - 14rem)" }}
      >
        {!geoJson ? (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 text-neutral-500 text-sm">
            {tr.mapLoading ?? "Cargando mapa…"}
          </div>
        ) : (
          <>
          <Map
            ref={mapRef}
            initialViewState={{
              longitude: 10,
              latitude: 30,
              zoom: 0.5,
            }}
            style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
            mapStyle={MAP_STYLE}
            renderWorldCopies={false}
            onLoad={(e) => {
              const map = e.target as { setRenderWorldCopies?: (v: boolean) => void };
              if (typeof map.setRenderWorldCopies === "function") map.setRenderWorldCopies(false);
              setStyleLoaded(true);
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
                      "INDIA-MEDIOORIENTE",
                      "rgba(120, 53, 15, 0.55)",
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
                  id="ports-circles"
                  type="circle"
                  paint={{
                    "circle-radius": 6,
                    "circle-color": "#00529b",
                    "circle-stroke-width": 2,
                    "circle-stroke-color": "#ffffff",
                  }}
                />
              </Source>
              ) : null;
            })()}
          </Map>
          {hoveredPortDetail && (
            <div
              className="absolute left-4 bottom-14 z-10 max-w-[320px] rounded-2xl border border-neutral-200/90 bg-white/98 shadow-mac-modal shadow-neutral-900/10 backdrop-blur-md overflow-hidden ring-1 ring-neutral-100"
              role="tooltip"
              aria-live="polite"
            >
              {/* Barra de acento lateral */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-blue to-brand-blue/70 rounded-l-2xl" aria-hidden />
              <div className="pl-4">
                {/* Cabecera */}
                <div className="flex items-center gap-2 py-3 pr-4 border-b border-neutral-200/80">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                    <Icon icon="lucide:map-pin" width={18} height={18} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-brand-blue uppercase tracking-wider">{tr.mapTooltipDestino ?? "Destino"}</p>
                    <p className="text-sm font-bold text-neutral-900 tracking-tight truncate">{hoveredPortDetail.destino}</p>
                  </div>
                </div>
                {/* Filas con líneas divisorias e iconos */}
                <div className="divide-y divide-neutral-100">
                  <div className="flex items-center gap-3 py-2.5 pr-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-500" aria-hidden>
                      <Icon icon="lucide:anchor" width={14} height={14} />
                    </span>
                    <div className="flex-1 min-w-0 flex justify-between items-baseline gap-2">
                      <span className="text-xs font-medium text-neutral-500">{tr.mapTooltipPol ?? "POL"}</span>
                      <span className="text-xs font-semibold text-neutral-800 text-right truncate">{hoveredPortDetail.pol}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 py-2.5 pr-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-500" aria-hidden>
                      <Icon icon="lucide:calendar-clock" width={14} height={14} />
                    </span>
                    <div className="flex-1 min-w-0 flex justify-between items-baseline gap-2">
                      <span className="text-xs font-medium text-neutral-500">{tr.mapTooltipEtd ?? "ETD"}</span>
                      <span className="text-xs font-semibold text-neutral-800 tabular-nums">{formatDate(hoveredPortDetail.etd)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 py-2.5 pr-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-500" aria-hidden>
                      <Icon icon="lucide:calendar-check" width={14} height={14} />
                    </span>
                    <div className="flex-1 min-w-0 flex justify-between items-baseline gap-2">
                      <span className="text-xs font-medium text-neutral-500">{tr.mapTooltipEta ?? "ETA"}</span>
                      <span className="text-xs font-semibold text-neutral-800 tabular-nums">{formatDate(hoveredPortDetail.eta)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 py-2.5 pr-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-500" aria-hidden>
                      <Icon icon="lucide:timer" width={14} height={14} />
                    </span>
                    <div className="flex-1 min-w-0 flex justify-between items-baseline gap-2">
                      <span className="text-xs font-medium text-neutral-500">{tr.mapTooltipTt ?? "TT"}</span>
                      <span className="text-xs font-semibold text-neutral-800 tabular-nums">{hoveredPortDetail.tt}{hoveredPortDetail.tt !== "—" ? " d" : ""}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 py-2.5 pr-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-500" aria-hidden>
                      <Icon icon="lucide:layers" width={14} height={14} />
                    </span>
                    <div className="flex-1 min-w-0 flex justify-between items-baseline gap-2">
                      <span className="text-xs font-medium text-neutral-500">{tr.mapTooltipServicio ?? "Servicio"}</span>
                      <span className="text-xs font-semibold text-neutral-800 text-right truncate">{hoveredPortDetail.servicio}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 py-2.5 pr-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-500" aria-hidden>
                      <Icon icon="lucide:ship" width={14} height={14} />
                    </span>
                    <div className="flex-1 min-w-0 flex justify-between items-baseline gap-2">
                      <span className="text-xs font-medium text-neutral-500">{tr.mapTooltipNaviera ?? "Naviera"}</span>
                      <span className="text-xs font-semibold text-neutral-800 text-right truncate">{hoveredPortDetail.naviera}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </>
        )}
      </div>
      <div className="px-4 py-2 border-t border-neutral-200 bg-neutral-50/80 flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-neutral-600 font-medium">{tr.mapAreaLabel ?? "Área"}:</span>
          {selectedArea ? (
            <button
              type="button"
              onClick={() => onSelectArea(null)}
              className="px-2.5 py-1 rounded-lg bg-neutral-200 text-neutral-700 font-medium hover:bg-neutral-300"
              aria-label={`Quitar filtro ${selectedArea}`}
            >
              {selectedArea} ✕
            </button>
          ) : (
            <span className="text-neutral-500">{tr.mapHint ?? "Haz clic en una región para filtrar itinerarios."}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onSelectArea("ALL")}
          className="px-3 py-1.5 rounded-lg bg-brand-blue text-white font-medium hover:bg-brand-blue/90 text-xs shrink-0"
          aria-label={tr.viewAllAria ?? "Ver todos los itinerarios"}
        >
          {tr.viewAll ?? "Ver todos"}
        </button>
      </div>
    </div>
  );
}
