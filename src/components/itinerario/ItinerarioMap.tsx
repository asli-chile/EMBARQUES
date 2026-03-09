"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import Map, { Source, Layer } from "react-map-gl/maplibre";
import type { MapRef } from "@vis.gl/react-maplibre";
import { useLocale } from "@/lib/i18n";
import { getPortCoordinates } from "@/lib/ports-coordinates";
import "maplibre-gl/dist/maplibre-gl.css";

/** Países con property "area": AMERICA | EUROPA | ASIA | INDIA-MEDIOORIENTE (generado por scripts/build-countries-by-region.mjs). */
const COUNTRIES_BY_REGION_URL = "/geo/countries-by-region.geojson";

/** Estilo tipo Google Maps: calles, etiquetas, terreno (Carto Voyager, gratuito). */
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

const isDev =
  (typeof import.meta !== "undefined" && (import.meta as { env?: { DEV?: boolean } }).env?.DEV) ||
  (typeof process !== "undefined" && process.env?.NODE_ENV === "development");
function logMap(...args: unknown[]) {
  if (isDev) console.log("[ItinerarioMap]", ...args);
}

type ItinerarioMapProps = {
  selectedArea: string | null;
  onSelectArea: (area: string | null) => void;
  areasWithData: string[];
  /** Nombres o códigos de puertos que aparecen en los itinerarios (se resaltan en el mapa). */
  portNames?: string[];
  /** Cuando true, el mapa se muestra más bajo (tras haber elegido región). */
  compact?: boolean;
};

export default function ItinerarioMap({
  selectedArea,
  onSelectArea,
  areasWithData,
  portNames = [],
  compact = false,
}: ItinerarioMapProps) {
  logMap("mount/render props: portNames=", portNames.length, "areasWithData=", areasWithData);
  const { t } = useLocale();
  const tr = t.itinerarioPage ?? { mapAreaLabel: "Área", mapHint: "Haz clic en una región para filtrar itinerarios." };
  const mapRef = useRef<MapRef>(null);
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);
  const [geoJson, setGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  /** Capas de regiones se añaden solo tras cargar el estilo para que no se borren. */
  const [styleLoaded, setStyleLoaded] = useState(false);

  useEffect(() => {
    logMap("fetch countries by region:", COUNTRIES_BY_REGION_URL);
    fetch(COUNTRIES_BY_REGION_URL)
      .then((r) => {
        logMap("countries fetch status:", r.status, r.ok);
        return r.json();
      })
      .then((data: GeoJSON.FeatureCollection) => {
        const count = data?.features?.length ?? 0;
        logMap("countries loaded OK, features:", count);
        setGeoJson(data);
      })
      .catch((err) => {
        logMap("countries fetch error:", err);
        setGeoJson({ type: "FeatureCollection", features: [] });
      });
  }, []);

  const highlightArea = hoveredArea ?? selectedArea;

  const portsGeoJson = useMemo((): GeoJSON.FeatureCollection => {
    logMap("ports useMemo input portNames:", portNames.length, portNames.slice(0, 5));
    const seen = new Set<string>();
    const features: GeoJSON.Feature[] = [];
    for (const name of portNames) {
      const coords = getPortCoordinates(name);
      if (!coords) {
        logMap("  puerto sin coords:", name);
        continue;
      }
      const key = `${coords[0]},${coords[1]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      features.push({
        type: "Feature",
        properties: { name: name.trim() },
        geometry: { type: "Point", coordinates: coords },
      });
    }
    logMap("portsGeoJson result: features", features.length, features.slice(0, 2));
    return { type: "FeatureCollection", features };
  }, [portNames]);

  const onMouseMove = useCallback(
    (evt: { point: [number, number] }) => {
      const map = mapRef.current;
      if (!map || !geoJson) return;
      const features = map.queryRenderedFeatures(evt.point, {
        layers: ["countries-fill", "countries-highlight-outline"],
      });
      const feature = features[0];
      const area = feature?.properties?.area as string | undefined;
      setHoveredArea(area ?? null);
      const canvas = map.getCanvas?.();
      if (canvas) canvas.style.cursor = area ? "pointer" : "default";
    },
    [geoJson]
  );

  const onMouseLeave = useCallback(() => {
    setHoveredArea(null);
    const map = mapRef.current;
    if (map?.getCanvas?.()) map.getCanvas().style.cursor = "default";
  }, []);

  const onClick = useCallback(
    (evt: { point: [number, number] }) => {
      const map = mapRef.current;
      if (!map || !geoJson) return;
      const features = map.queryRenderedFeatures(evt.point, {
        layers: ["countries-fill", "countries-highlight-outline"],
      });
      const feature = features[0];
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
              logMap("map onLoad: estilo cargado, styleLoaded=true");
              setStyleLoaded(true);
            }}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
            interactiveLayerIds={["countries-fill", "countries-highlight-outline"]}
          >
            {(() => {
              const showCountries = styleLoaded && geoJson && geoJson.features.length > 0;
              logMap("render: styleLoaded=", styleLoaded, "countries=", geoJson?.features?.length ?? 0, "=> showCountries=", showCountries);
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
              logMap("render: showPorts=", showPorts, "portsGeoJson.features=", portsGeoJson.features.length);
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
        )}
      </div>
      <div className="px-4 py-2 border-t border-neutral-200 bg-neutral-50/80 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-neutral-600 font-medium">{tr.mapAreaLabel ?? "Área"}:</span>
        {selectedArea ? (
          <button
            type="button"
            onClick={() => onSelectArea(null)}
            className="px-2.5 py-1 rounded-lg bg-brand-blue text-white font-medium hover:bg-brand-blue/90"
          >
            {selectedArea} ✕
          </button>
        ) : (
          <span className="text-neutral-500">{tr.mapHint ?? "Haz clic en una región para filtrar itinerarios."}</span>
        )}
      </div>
    </div>
  );
}
