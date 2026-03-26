"use client";

import { useMemo, useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import { getPortCoordinates } from "@/lib/ports-coordinates";
import { format } from "date-fns";
import type { MapPortPoint } from "./ItinerarioMap";

const DATE_DISPLAY = "dd/MM/yyyy";
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr?.trim()) return "—";
  try {
    const d = dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`;
    return format(new Date(d), DATE_DISPLAY);
  } catch {
    return dateStr ?? "—";
  }
}

const AREA_COLORS: Record<string, string> = {
  AMERICA: "rgba(34, 197, 94, 0.55)",
  EUROPA: "rgba(0, 82, 155, 0.55)",
  ASIA: "rgba(234, 179, 8, 0.55)",
  "MEDIO-ORIENTE": "rgba(249, 115, 22, 0.55)",
  OCEANIA: "rgba(20, 184, 166, 0.55)",
};

const AREA_STROKES: Record<string, string> = {
  AMERICA: "rgba(22, 163, 74, 0.9)",
  EUROPA: "rgba(0, 65, 124, 0.9)",
  ASIA: "rgba(202, 138, 4, 0.9)",
  "MEDIO-ORIENTE": "rgba(234, 88, 12, 0.9)",
  OCEANIA: "rgba(13, 148, 136, 0.9)",
};

const AREA_LABELS: Record<string, string> = {
  AMERICA: "América",
  EUROPA: "Europa",
  ASIA: "Asia",
  "MEDIO-ORIENTE": "Medio Oriente",
  OCEANIA: "Oceanía",
};

/** Posición aproximada (lon, lat) para etiquetas de región */
const AREA_LABEL_POS: Record<string, [number, number]> = {
  AMERICA: [-75, 15],
  EUROPA: [12, 52],
  ASIA: [105, 38],
  "MEDIO-ORIENTE": [55, 22],
  OCEANIA: [140, -25],
};

const W = 360;
const H = 180;

function lonLatToSvg(lon: number, lat: number): [number, number] {
  const x = ((lon + 180) / 360) * W;
  const y = (1 - (lat + 90) / 180) * H;
  return [x, y];
}

function coordsToPath(ring: number[][], step = 1): string {
  const points = ring
    .filter((_, i) => i % step === 0)
    .map(([lon, lat]) => {
      const [x, y] = lonLatToSvg(lon, lat);
      return `${x},${y}`;
    });
  if (points.length < 2) return "";
  return `M ${points.join(" L ")} Z`;
}

function geometryToPaths(geom: GeoJSON.Geometry): string[] {
  const paths: string[] = [];
  if (geom.type === "Polygon") {
    for (const ring of geom.coordinates) {
      paths.push(coordsToPath(ring, 2));
    }
  } else if (geom.type === "MultiPolygon") {
    for (const polygon of geom.coordinates) {
      for (const ring of polygon) {
        paths.push(coordsToPath(ring, 2));
      }
    }
  }
  return paths.filter(Boolean);
}

function buildPathsByArea(geoJson: GeoJSON.FeatureCollection): Map<string, string> {
  const byArea = new Map<string, string[]>();
  for (const f of geoJson.features) {
    const area = (f.properties?.area as string) || "";
    if (!area || !AREA_COLORS[area]) continue;
    const paths = geometryToPaths(f.geometry);
    const list = byArea.get(area) ?? [];
    list.push(...paths);
    byArea.set(area, list);
  }
  const result = new Map<string, string>();
  byArea.forEach((paths, area) => {
    result.set(area, paths.join(" "));
  });
  return result;
}

type FallbackSvgMapProps = {
  geoJson: GeoJSON.FeatureCollection;
  selectedArea: string | null;
  onSelectArea: (area: string | null) => void;
  highlightArea: string | null;
  portPoints?: MapPortPoint[];
};

export function FallbackSvgMap({
  geoJson,
  selectedArea,
  onSelectArea,
  highlightArea,
  portPoints = [],
}: FallbackSvgMapProps) {
  const [hoveredPort, setHoveredPort] = useState<MapPortPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const pathsByArea = useMemo(() => buildPathsByArea(geoJson), [geoJson]);
  const areas = useMemo(() => Array.from(pathsByArea.keys()), [pathsByArea]);

  const points = useMemo(() => {
    const seen = new Set<string>();
    const out: { pt: MapPortPoint; x: number; y: number }[] = [];
    for (const pt of portPoints) {
      const name = (pt.puerto_nombre?.trim() || pt.puerto?.trim() || "") as string;
      const coords = getPortCoordinates(name);
      if (!coords) continue;
      const key = `${coords[0].toFixed(2)},${coords[1].toFixed(2)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const [x, y] = lonLatToSvg(coords[0], coords[1]);
      out.push({ pt, x, y });
    }
    return out;
  }, [portPoints]);

  const handlePointMouseEnter = useCallback(
    (pt: MapPortPoint, clientX: number, clientY: number) => {
      setHoveredPort(pt);
      setTooltipPos({ x: clientX, y: clientY });
    },
    []
  );
  const handlePointMouseLeave = useCallback(() => {
    setHoveredPort(null);
    setTooltipPos(null);
  }, []);

  return (
    <div className="absolute inset-0 bg-slate-200/80 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full block"
          preserveAspectRatio="xMidYMid meet"
          style={{ minHeight: 200 }}
        >
          {/* Fondo océano */}
          <rect width={W} height={H} fill="rgba(148, 163, 184, 0.25)" />
          {/* Regiones por área */}
          {areas.map((area) => {
            const d = pathsByArea.get(area);
            if (!d) return null;
            const isHighlight = highlightArea === area || selectedArea === area;
            const fill = AREA_COLORS[area] ?? "rgba(0,0,0,0.1)";
            const stroke = isHighlight ? AREA_STROKES[area] ?? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.7)";
            const strokeWidth = isHighlight ? 2 : 1;
            return (
              <path
                key={area}
                d={d}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                className="cursor-pointer transition-all duration-200 hover:opacity-95"
                onClick={() => onSelectArea(selectedArea === area ? null : area)}
                aria-label={AREA_LABELS[area] ?? area}
                role="button"
              />
            );
          })}
          {/* Etiquetas de región */}
          {areas.map((area) => {
            const pos = AREA_LABEL_POS[area];
            if (!pos) return null;
            const [x, y] = lonLatToSvg(pos[0], pos[1]);
            const isHighlight = selectedArea === area;
            return (
              <text
                key={`label-${area}`}
                x={x}
                y={y}
                textAnchor="middle"
                className="pointer-events-none select-none"
                fill={isHighlight ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.6)"}
                fontSize={Math.max(4, 5)}
                fontWeight={isHighlight ? 700 : 600}
              >
                {AREA_LABELS[area] ?? area}
              </text>
            );
          })}
          {/* Puntos de destino (puertos) */}
          {points.map(({ pt, x, y }, i) => (
            <g key={`${pt.puerto}-${i}`}>
              <circle
                cx={x}
                cy={y}
                r={4}
                fill="#00529b"
                stroke="#fff"
                strokeWidth={1.5}
                className="cursor-pointer"
                onMouseEnter={(e) => handlePointMouseEnter(pt, e.clientX, e.clientY)}
                onMouseLeave={handlePointMouseLeave}
              />
              <circle
                cx={x}
                cy={y}
                r={8}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={(e) => handlePointMouseEnter(pt, e.clientX, e.clientY)}
                onMouseLeave={handlePointMouseLeave}
              />
            </g>
          ))}
        </svg>

        {/* Tooltip del puerto */}
        {hoveredPort && tooltipPos && (
          <div
            className="fixed z-50 max-w-[280px] rounded-xl border border-neutral-200 bg-white/98 shadow-xl shadow-neutral-900/20 backdrop-blur-md overflow-hidden py-3 px-4 text-left"
            style={{
              left: Math.min(tooltipPos.x + 12, typeof window !== "undefined" ? window.innerWidth - 300 : tooltipPos.x + 12),
              top: tooltipPos.y + 12,
            }}
          >
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                <Icon icon="lucide:map-pin" width={16} height={16} />
              </span>
              <p className="font-semibold text-neutral-900 text-sm truncate">
                {hoveredPort.puerto_nombre?.trim() || hoveredPort.puerto?.trim() || "—"}
              </p>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs mt-2">
              <dt className="text-neutral-500">POL</dt>
              <dd className="font-medium text-neutral-800">{hoveredPort.pol ?? "—"}</dd>
              <dt className="text-neutral-500">ETD</dt>
              <dd className="tabular-nums">{formatDate(hoveredPort.etd)}</dd>
              <dt className="text-neutral-500">ETA</dt>
              <dd className="tabular-nums">{formatDate(hoveredPort.eta)}</dd>
              <dt className="text-neutral-500">TT</dt>
              <dd className="tabular-nums">{hoveredPort.dias_transito != null ? `${hoveredPort.dias_transito} d` : "—"}</dd>
              <dt className="text-neutral-500">Servicio</dt>
              <dd className="truncate">{hoveredPort.servicio ?? "—"}</dd>
              <dt className="text-neutral-500">Naviera</dt>
              <dd className="truncate">{hoveredPort.naviera ?? "—"}</dd>
            </dl>
          </div>
        )}

        <div className="absolute bottom-2 right-2">
          <span className="text-[10px] text-neutral-400 bg-white/80 px-2 py-1 rounded shadow-sm border border-neutral-100">
            Vista simplificada
          </span>
        </div>
      </div>
    </div>
  );
}
