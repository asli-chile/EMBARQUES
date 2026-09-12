/**
 * Modelo de NaviTrack: tipos y derivaciones puras del viaje.
 *
 * Acá vive todo lo que convierte "una fila de operaciones + un snapshot AIS" en
 * algo que un operador logístico lee de un vistazo: etapa, progreso, posición,
 * ETA comparada y alertas. Sin React y sin Supabase, para que la UI solo
 * presente y esta lógica se pueda razonar aparte.
 */

import { getPortCoordinates } from "@/lib/ports-coordinates";

export type LngLat = { lng: number; lat: number };

/** Fila de `operaciones` que NaviTrack necesita. */
export type NavitrackOperacion = {
  id: string;
  ref_asli: string | null;
  correlativo: number | null;
  cliente: string | null;
  contenedor: string | null;
  booking: string | null;
  naviera: string | null;
  nave: string | null;
  viaje: string | null;
  pol: string | null;
  pod: string | null;
  /** País de destino: da la bandera del POD en la cabecera. */
  pais: string | null;
  etd: string | null;
  eta: string | null;
  tt: number | null;
  estado_operacion: string | null;
  arribo_confirmado: boolean | null;
  ingreso_stacking: string | null;
  fin_stacking: string | null;
  corte_documental: string | null;
  tracking_manual_lat: number | null;
  tracking_manual_lng: number | null;
  tracking_manual_updated_at: string | null;
};

export const NAVITRACK_OP_SELECT =
  "id, ref_asli, correlativo, cliente, contenedor, booking, naviera, nave, viaje, pol, pod, pais, etd, eta, tt, estado_operacion, arribo_confirmado, ingreso_stacking, fin_stacking, corte_documental, tracking_manual_lat, tracking_manual_lng, tracking_manual_updated_at";

/** Identificadores del catálogo `naves`: permiten resolver el AIS sin buscar a mano. */
export type NaveIdent = { nombre: string; imo: string | null; mmsi: string | null };

/** Lectura AIS normalizada. El proveedor cambia nombres entre respuestas; acá se unifican. */
export type AisSnapshot = {
  lat: number | null;
  lng: number | null;
  course: number | null;
  speed: number | null;
  destination: string | null;
  receivedAt: Date | null;
  eta: Date | null;
  navStatus: string | null;
  lastPort: string | null;
  vesselName: string | null;
};

/* --------------------------------- Geodesia -------------------------------- */

const R_EARTH_KM = 6371;
const KM_TO_NM = 0.539957;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export function isValidCoord(p: LngLat | null | undefined): p is LngLat {
  if (!p) return false;
  return (
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lng) <= 180 &&
    (p.lat !== 0 || p.lng !== 0)
  );
}

export function haversineKm(a: LngLat, b: LngLat): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Rumbo inicial de a hacia b, en grados (0 = norte). */
export function bearingDeg(a: LngLat, b: LngLat): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Punto intermedio sobre el círculo máximo (interpolación esférica).
 *
 * La ruta marítima real no es una geodésica, pero dibujarla como recta en
 * Mercator sería peor: en las rutas Asia-Chile cruzaría continentes. El círculo
 * máximo es la aproximación honesta y la que usan las plataformas del rubro.
 */
export function greatCirclePoint(a: LngLat, b: LngLat, f: number): LngLat {
  const lat1 = toRad(a.lat);
  const lng1 = toRad(a.lng);
  const lat2 = toRad(b.lat);
  const lng2 = toRad(b.lng);
  const d =
    2 *
    Math.asin(
      Math.min(
        1,
        Math.sqrt(
          Math.sin((lat2 - lat1) / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2,
        ),
      ),
    );
  if (d === 0) return { lng: a.lng, lat: a.lat };
  const A = Math.sin((1 - f) * d) / Math.sin(d);
  const B = Math.sin(f * d) / Math.sin(d);
  const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
  const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
  const z = A * Math.sin(lat1) + B * Math.sin(lat2);
  return {
    lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))),
    lng: toDeg(Math.atan2(y, x)),
  };
}

/**
 * Ruta como polilínea, desenrollando el antimeridiano.
 *
 * Sin desenrollar, una ruta Shanghái-San Antonio salta de +180 a -180 y MapLibre
 * la dibuja como una línea que cruza el mundo entero al revés.
 */
export function greatCirclePath(a: LngLat, b: LngLat, steps = 96): LngLat[] {
  const pts: LngLat[] = [];
  let prevLng: number | null = null;
  let offset = 0;
  for (let i = 0; i <= steps; i += 1) {
    const p = greatCirclePoint(a, b, i / steps);
    if (prevLng != null) {
      const raw = p.lng + offset;
      if (raw - prevLng > 180) offset -= 360;
      else if (raw - prevLng < -180) offset += 360;
    }
    const lng = p.lng + offset;
    pts.push({ lng, lat: p.lat });
    prevLng = lng;
  }
  return pts;
}

/**
 * Avance sobre la ruta (0 a 1) según cercanía relativa a cada extremo.
 *
 * Se usa la razón de distancias y no la proyección cross-track porque cuando el
 * buque se desvía de la geodésica (canales, cabotaje) la razón sigue siendo
 * monótona y no produce saltos.
 */
export function routeFraction(origen: LngLat, destino: LngLat, pos: LngLat): number {
  const da = haversineKm(origen, pos);
  const db = haversineKm(pos, destino);
  const total = da + db;
  if (total <= 0) return 0;
  return clamp01(da / total);
}

/* ---------------------------------- Fechas --------------------------------- */

export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

/** Columna `date` a mediodía local: evita que el día se corra por zona horaria. */
export function parseOpDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const iso = v.includes("T") ? v : `${v}T12:00:00`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

const MESES_EN: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

export function parseInstant(v: unknown): Date | null {
  if (typeof v === "number") {
    const d = new Date(v < 1e12 ? v * 1000 : v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v !== "string" || !v.trim()) return null;
  const raw = v.trim();

  // Data Docked entrega "Jan 04, 2026 04:15 UTC". V8 lo parsea, pero no es un
  // formato estándar y otros motores podrían no hacerlo: se arma a mano.
  const texto = raw.match(
    /^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})[\s,]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(UTC|GMT|Z)?$/,
  );
  if (texto) {
    const mes = MESES_EN[texto[1].toLowerCase()];
    if (mes != null) {
      const ms = Date.UTC(
        Number(texto[3]),
        mes,
        Number(texto[2]),
        Number(texto[4]),
        Number(texto[5]),
        Number(texto[6] ?? 0),
      );
      return Number.isNaN(ms) ? null : new Date(ms);
    }
  }

  // "2026-09-11 14:03:22" (UTC, sin zona): normalizar a ISO.
  const norm = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(raw) ? `${raw.replace(" ", "T")}Z` : raw;
  const d = new Date(norm);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ----------------------------------- AIS ----------------------------------- */

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

function pick(raw: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (raw[k] != null && raw[k] !== "") return raw[k];
  }
  return null;
}

/**
 * Normaliza la respuesta del proveedor AIS.
 *
 * Los nombres se buscan en varias formas porque no todos los proveedores (ni
 * todos los modos de uno mismo) los escriben igual: Data Docked usa
 * `latitude`/`etaUtc`/`positionReceived`, otros usan `lat`/`eta`/`received`.
 */
/**
 * Saca el cuerpo útil de una respuesta del proveedor AIS.
 *
 * Data Docked no es consistente: `get-vessel-location` devuelve los campos en
 * la raíz del JSON, mientras que otras consultas los envuelven en `detail`.
 * Asumir uno solo de los dos formatos deja la lectura en null y el dato se
 * pierde en silencio, que es justo lo que pasó la primera vez que se consultó
 * de verdad.
 *
 * Devuelve `detail` si viene y es un objeto; si no, el objeto de la raíz.
 */
export function cuerpoProveedor(json: unknown): Record<string, unknown> | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const raiz = json as Record<string, unknown>;
  const envuelto = raiz.detail;
  if (envuelto && typeof envuelto === "object" && !Array.isArray(envuelto)) {
    return envuelto as Record<string, unknown>;
  }
  return raiz;
}

export function parseAisSnapshot(raw: Record<string, unknown> | null): AisSnapshot | null {
  if (!raw) return null;
  return {
    lat: num(pick(raw, ["lat", "latitude"])),
    lng: num(pick(raw, ["lng", "lon", "longitude"])),
    course: num(pick(raw, ["course", "cog", "heading"])),
    speed: num(pick(raw, ["speed", "sog"])),
    destination: str(pick(raw, ["destination", "dest"])),
    receivedAt: parseInstant(
      pick(raw, ["positionReceived", "received", "last_position", "timestamp"]),
    ),
    eta: parseInstant(pick(raw, ["etaUtc", "eta", "eta_utc", "eta_predicted"])),
    navStatus: str(pick(raw, ["navigationalStatus", "nav_status", "navstat", "status"])),
    lastPort: str(pick(raw, ["last_port", "lastport", "departure_port"])),
    vesselName: str(pick(raw, ["vessel_name", "name", "shipname"])),
  };
}

/* --------------------------------- Posición -------------------------------- */

export type PositionSource = "AIS" | "MANUAL" | "ESTIMADA";

export type TrackPosition = {
  lng: number;
  lat: number;
  course: number | null;
  source: PositionSource;
  /** Momento del dato. En las estimadas es null: no hay lectura, hay cálculo. */
  at: Date | null;
};

/** Avance del viaje por calendario (ETD a ETA). Null si falta alguna fecha. */
export function timeFraction(
  op: Pick<NavitrackOperacion, "etd" | "eta">,
  now = new Date(),
): number | null {
  const etd = parseOpDate(op.etd);
  const eta = parseOpDate(op.eta);
  if (!etd || !eta) return null;
  const total = eta.getTime() - etd.getTime();
  if (total <= 0) return null;
  return clamp01((now.getTime() - etd.getTime()) / total);
}

/**
 * Mejor posición disponible, en orden de confianza:
 * AIS real, coordenada cargada a mano, estimación por tiempo sobre la ruta.
 */
export function resolvePosition(
  op: NavitrackOperacion,
  ais: AisSnapshot | null,
  route: { origen: LngLat | null; destino: LngLat | null },
  now = new Date(),
): TrackPosition | null {
  if (ais && ais.lat != null && ais.lng != null && isValidCoord({ lat: ais.lat, lng: ais.lng })) {
    return { lng: ais.lng, lat: ais.lat, course: ais.course, source: "AIS", at: ais.receivedAt };
  }

  const manual = { lat: op.tracking_manual_lat ?? Number.NaN, lng: op.tracking_manual_lng ?? Number.NaN };
  if (isValidCoord(manual)) {
    return {
      lng: manual.lng,
      lat: manual.lat,
      course: null,
      source: "MANUAL",
      at: parseInstant(op.tracking_manual_updated_at),
    };
  }

  const { origen, destino } = route;
  if (!isValidCoord(origen) || !isValidCoord(destino)) return null;
  const f = timeFraction(op, now);
  if (f == null || f <= 0 || f >= 1) return null;
  const p = greatCirclePoint(origen, destino, f);
  return { lng: p.lng, lat: p.lat, course: bearingDeg(p, destino), source: "ESTIMADA", at: null };
}

/* ---------------------------------- Viaje ---------------------------------- */

export type JourneyProgress = {
  /** 0 a 100, ya redondeado para mostrar. */
  pct: number;
  /** De dónde salió el número: la posición del buque o el calendario. */
  basis: "posicion" | "tiempo";
};

export type Journey = {
  origen: { nombre: string; coord: LngLat | null };
  destino: { nombre: string; coord: LngLat | null };
  position: TrackPosition | null;
  progress: JourneyProgress | null;
  /** Tramo recorrido y tramo restante, listos para pintar. */
  traveled: LngLat[];
  remaining: LngLat[];
  /** Distancia total de la ruta y la que falta, en millas náuticas. */
  totalNm: number | null;
  remainingNm: number | null;
};

export function buildJourney(
  op: NavitrackOperacion,
  ais: AisSnapshot | null,
  now = new Date(),
): Journey {
  const origenNombre = (op.pol ?? "").trim();
  const destinoNombre = (op.pod ?? "").trim();
  const oc = getPortCoordinates(origenNombre);
  const dc = getPortCoordinates(destinoNombre);
  const origen = oc ? { lng: oc[0], lat: oc[1] } : null;
  const destino = dc ? { lng: dc[0], lat: dc[1] } : null;

  const position = resolvePosition(op, ais, { origen, destino }, now);

  let progress: JourneyProgress | null = null;
  let traveled: LngLat[] = [];
  let remaining: LngLat[] = [];
  let totalNm: number | null = null;
  let remainingNm: number | null = null;

  if (isValidCoord(origen) && isValidCoord(destino)) {
    const full = greatCirclePath(origen, destino);
    totalNm = haversineKm(origen, destino) * KM_TO_NM;

    let f: number | null = null;
    if (position && position.source !== "ESTIMADA") {
      f = routeFraction(origen, destino, position);
      progress = { pct: Math.round(f * 100), basis: "posicion" };
    } else {
      const tf = timeFraction(op, now);
      if (tf != null) {
        f = tf;
        progress = { pct: Math.round(tf * 100), basis: "tiempo" };
      }
    }

    if (f == null) {
      remaining = full;
    } else if (isValidCoord(position)) {
      /*
       * La línea se dibuja en dos tramos que pasan por el buque: origen →
       * posición y posición → destino.
       *
       * Antes se recortaba la geodésica origen → destino y se le reemplazaba el
       * último punto por la posición real. Eso dibujaba un zigzag cada vez que
       * el buque no iba sobre la línea teórica, que es casi siempre: un barco
       * de San Antonio a Hamburgo sube por el Pacífico hasta Panamá, mientras
       * la geodésica cruza Sudamérica hacia el Atlántico. La línea salía hacia
       * el noreste y volvía de un salto al oeste a buscar el buque.
       *
       * Sigue siendo una aproximación —no conoce el canal ni las costas—, pero
       * es coherente: una sola línea continua que pasa por donde está el buque.
       */
      const p = { lng: position.lng, lat: position.lat };
      traveled = greatCirclePath(origen, p);
      remaining = greatCirclePath(p, destino);

      /*
       * Los dos tramos se desenrollan por separado, así que el buque puede
       * quedar en copias distintas del mundo (lng y lng ± 360) y la línea se
       * partiría en dos. Se alinea el segundo tramo con el final del primero.
       */
      const fin = traveled[traveled.length - 1];
      const salto = fin.lng - remaining[0].lng;
      if (salto !== 0) {
        remaining = remaining.map((q) => ({ lng: q.lng + salto, lat: q.lat }));
      }

      // Lo que falta se mide desde el buque, no desde el punto teórico.
      remainingNm = haversineKm(p, destino) * KM_TO_NM;
    } else {
      const cut = Math.round(clamp01(f) * (full.length - 1));
      traveled = full.slice(0, cut + 1);
      remaining = full.slice(cut);
      remainingNm = totalNm * (1 - clamp01(f));
    }
  }

  if (op.arribo_confirmado) {
    progress = { pct: 100, basis: progress?.basis ?? "tiempo" };
    remainingNm = 0;
  }

  return {
    origen: { nombre: origenNombre, coord: origen },
    destino: { nombre: destinoNombre, coord: destino },
    position,
    progress,
    traveled,
    remaining,
    totalNm,
    remainingNm,
  };
}
