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
/*
 * Centroides gruesos de los continentes.
 *
 * Solo sirven para decidir **hacia qué lado** combar una línea: la que se aleja
 * del continente más cercano es, casi siempre, la que va hacia el mar. No
 * pretenden ser exactos y no se usan para medir nada.
 */
const CONTINENTES: LngLat[] = [
  { lng: -58, lat: -15 }, // Sudamérica
  { lng: -100, lat: 42 }, // Norteamérica
  { lng: 20, lat: 3 }, // África
  { lng: 15, lat: 50 }, // Europa
  { lng: 95, lat: 40 }, // Asia
  { lng: 134, lat: -25 }, // Australia
];

/**
 * Curva la ruta hacia mar abierto.
 *
 * Una geodésica entre dos puertos es la línea más corta sobre la esfera, y por
 * eso cruza continentes: Valparaíso a Cristóbal se dibujaba atravesando Perú y
 * Colombia por tierra. Ningún barco hace eso, y la línea recta delataba que el
 * dibujo no entendía de qué estaba hablando.
 *
 * La comba desplaza el centro del tramo perpendicularmente, hacia el lado que
 * se aleja del continente más cercano —que es, en la práctica, el lado del
 * mar—, y se desvanece hacia los extremos con un seno para que los puertos
 * queden clavados en su sitio.
 *
 * **Es cosmético y hay que decirlo:** hace que la línea parezca la derrota de
 * un barco, pero no lo es. No conoce canales, estrechos ni costas. Para la
 * derrota real haría falta una red de rutas marítimas de verdad.
 */
function curvaMaritima(a: LngLat, b: LngLat, steps = 96): LngLat[] {
  const base = greatCirclePath(a, b, steps);
  if (base.length < 3) return base;

  const medio = base[Math.floor(base.length / 2)];
  const largoKm = haversineKm(a, b);
  // Tramos cortos no se comban: en el Mediterráneo la curva estorbaría más de
  // lo que ayuda, y el error de una recta de 300 km es imperceptible.
  if (largoKm < 800) return base;

  // Perpendicular al tramo, en grados. La longitud se encoge con la latitud.
  const cosLat = Math.max(0.2, Math.cos((medio.lat * Math.PI) / 180));
  const dx = (b.lng - a.lng) * cosLat;
  const dy = b.lat - a.lat;
  const norma = Math.hypot(dx, dy) || 1;
  const perpX = -dy / norma;
  const perpY = dx / norma;

  // Hacia el lado que se aleja del continente más cercano.
  let masCerca = CONTINENTES[0];
  let mejor = Infinity;
  for (const c of CONTINENTES) {
    const d = haversineKm(medio, c);
    if (d < mejor) {
      mejor = d;
      masCerca = c;
    }
  }
  const haciaTierraX = (masCerca.lng - medio.lng) * cosLat;
  const haciaTierraY = masCerca.lat - medio.lat;
  const signo = perpX * haciaTierraX + perpY * haciaTierraY > 0 ? -1 : 1;

  // Proporcional al tramo y con tope: una comba enorme sería tan falsa como la recta.
  const amplitud = Math.min(14, (largoKm / 111) * 0.16);

  return base.map((p, i) => {
    const t = i / (base.length - 1);
    const peso = Math.sin(Math.PI * t) * amplitud * signo;
    return {
      lng: p.lng + (perpX * peso) / cosLat,
      lat: Math.max(-82, Math.min(82, p.lat + perpY * peso)),
    };
  });
}

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

/** Un tramo del viaje, tal como vive en `navitrack_tramos`. */
export type Tramo = {
  orden: number;
  nave: string | null;
  viaje: string | null;
  pol: string | null;
  pod: string | null;
  etd: string | null;
  eta: string | null;
  confirmado: boolean;
};

export const NAVITRACK_TRAMO_SELECT =
  "operacion_id, orden, nave, viaje, pol, pod, etd, eta, origen, confirmado";

/** Punto de la ruta: los puertos de conexión se dibujan distinto que los extremos. */
export type Escala = {
  nombre: string;
  coord: LngLat;
  tipo: "origen" | "conexion" | "destino";
  /** Nave que sale desde aquí. Null en el destino final. */
  nave: string | null;
  /** Ya pasó por aquí. */
  cumplida: boolean;
};

export type Journey = {
  origen: { nombre: string; coord: LngLat | null };
  destino: { nombre: string; coord: LngLat | null };
  /** Puertos de la ruta. Con transbordo son más de dos. */
  escalas: Escala[];
  /** Tramo en curso, 1-based. Null si el viaje es directo o no se sabe. */
  tramoActual: number | null;
  /**
   * Nave que lleva la carga **ahora**.
   *
   * No tiene por qué ser `operaciones.nave`: en un viaje con transbordo, esa
   * columna guarda la nave del primer tramo, que ya soltó la carga y anda en
   * otro viaje. Seguir su AIS mostraría una posición real pero falsa para este
   * embarque, que es peor que no mostrar nada.
   */
  naveActual: string | null;
  /** Viaje de la nave actual, si se conoce. */
  viajeActual: string | null;
  position: TrackPosition | null;
  progress: JourneyProgress | null;
  /** Tramo recorrido y tramo restante, listos para pintar. */
  traveled: LngLat[];
  remaining: LngLat[];
  /** Distancia total de la ruta y la que falta, en millas náuticas. */
  totalNm: number | null;
  remainingNm: number | null;
};

/**
 * Une varias geodésicas en una sola línea continua.
 *
 * Cada tramo se desenrolla desde su propio punto de partida, así que dos tramos
 * seguidos pueden quedar en copias distintas del mundo (lng y lng ± 360). Se
 * alinea cada uno con el final del anterior y se evita repetir el punto de
 * unión, que si no aparece dos veces.
 */
function unirTramos(tramos: LngLat[][]): LngLat[] {
  const salida: LngLat[] = [];
  for (const tramo of tramos) {
    if (!tramo.length) continue;
    if (!salida.length) {
      salida.push(...tramo);
      continue;
    }
    const salto = salida[salida.length - 1].lng - tramo[0].lng;
    for (let i = 1; i < tramo.length; i += 1) {
      salida.push({ lng: tramo[i].lng + salto, lat: tramo[i].lat });
    }
  }
  return salida;
}

/**
 * Viaje con transbordo: la ruta es la cadena de tramos, no una recta.
 *
 * Sin esto un embarque Valparaíso → Génova se dibujaba como una línea directa
 * por el Atlántico, cuando en realidad pasó por Cristóbal y Gioia Tauro en tres
 * buques distintos. La línea recta no solo era fea: era falsa, y el progreso
 * calculado sobre ella tampoco correspondía a nada.
 *
 * El tramo en curso se decide por fechas; si hay posición real del buque, la
 * línea pasa por ella igual que en un viaje directo.
 */
function viajePorTramos(
  op: NavitrackOperacion,
  tramos: Tramo[],
  ais: AisSnapshot | null,
  now: Date,
): Journey | null {
  const ordenados = [...tramos].sort((a, b) => a.orden - b.orden);

  type Paso = { desde: LngLat; hasta: LngLat; t: Tramo; nombreDesde: string; nombreHasta: string };
  const pasos: Paso[] = [];
  for (const t of ordenados) {
    const a = getPortCoordinates(t.pol ?? "");
    const b = getPortCoordinates(t.pod ?? "");
    // Un tramo sin coordenadas no se puede dibujar; se ignora en vez de inventarlo.
    if (!a || !b) continue;
    pasos.push({
      desde: { lng: a[0], lat: a[1] },
      hasta: { lng: b[0], lat: b[1] },
      t,
      nombreDesde: (t.pol ?? "").trim(),
      nombreHasta: (t.pod ?? "").trim(),
    });
  }
  if (pasos.length < 2) return null;

  const hoy = now.toISOString().slice(0, 10);

  /*
   * Tramo en curso: el primero que todavía no terminó.
   *
   * Un tramo se da por cerrado si está confirmado y su ETA ya pasó. Así, cuando
   * la carga espera en el puerto de conexión, el viaje se muestra en el tramo
   * siguiente y no en el que ya se completó.
   */
  let indiceActual = pasos.findIndex((p) => !(p.t.eta && p.t.eta < hoy));
  if (indiceActual < 0) indiceActual = pasos.length - 1;

  const posicion = resolvePosition(
    op,
    ais,
    { origen: pasos[indiceActual].desde, destino: pasos[indiceActual].hasta },
    now,
  );

  const anteriores = pasos.slice(0, indiceActual).map((p) => curvaMaritima(p.desde, p.hasta));
  const posteriores = pasos.slice(indiceActual + 1).map((p) => curvaMaritima(p.desde, p.hasta));
  const actual = pasos[indiceActual];

  let traveled: LngLat[];
  let remaining: LngLat[];

  if (isValidCoord(posicion)) {
    const aqui = { lng: posicion.lng, lat: posicion.lat };
    traveled = unirTramos([...anteriores, curvaMaritima(actual.desde, aqui)]);
    remaining = unirTramos([curvaMaritima(aqui, actual.hasta), ...posteriores]);
  } else {
    traveled = unirTramos(anteriores);
    remaining = unirTramos([curvaMaritima(actual.desde, actual.hasta), ...posteriores]);
  }

  // La línea es una sola: el tramo restante arranca donde terminó el recorrido.
  if (traveled.length && remaining.length) {
    const salto = traveled[traveled.length - 1].lng - remaining[0].lng;
    if (salto !== 0) remaining = remaining.map((q) => ({ lng: q.lng + salto, lat: q.lat }));
  }

  /*
   * Las distancias se miden entre puertos, no sobre la línea dibujada.
   *
   * La curva hacia mar abierto es cosmética: si se midiera sobre ella, cada
   * comba sumaría millas que nadie navega y el avance se correría. La geometría
   * del dibujo y la del cálculo son cosas distintas a propósito.
   */
  const kmDeTramo = (i: number) => haversineKm(pasos[i].desde, pasos[i].hasta);
  const totalKm = pasos.reduce((acc, _p, i) => acc + kmDeTramo(i), 0);

  let recorridoKm = 0;
  for (let i = 0; i < indiceActual; i += 1) recorridoKm += kmDeTramo(i);
  if (isValidCoord(posicion)) {
    recorridoKm += haversineKm(actual.desde, { lng: posicion.lng, lat: posicion.lat });
  }
  const faltaKm = Math.max(0, totalKm - recorridoKm);

  const escalas: Escala[] = pasos.map((p, i) => ({
    nombre: p.nombreDesde,
    coord: p.desde,
    tipo: i === 0 ? "origen" : "conexion",
    nave: p.t.nave,
    cumplida: i < indiceActual,
  }));
  const ultimo = pasos[pasos.length - 1];
  escalas.push({
    nombre: ultimo.nombreHasta,
    coord: ultimo.hasta,
    tipo: "destino",
    nave: null,
    cumplida: Boolean(op.arribo_confirmado),
  });

  return {
    origen: { nombre: pasos[0].nombreDesde, coord: pasos[0].desde },
    destino: { nombre: ultimo.nombreHasta, coord: ultimo.hasta },
    escalas,
    tramoActual: indiceActual + 1,
    naveActual: actual.t.nave,
    viajeActual: actual.t.viaje,
    position: posicion,
    progress: totalKm > 0
      ? {
          pct: op.arribo_confirmado ? 100 : Math.round((recorridoKm / totalKm) * 100),
          basis: posicion && posicion.source !== "ESTIMADA" ? "posicion" : "tiempo",
        }
      : null,
    traveled,
    remaining,
    totalNm: totalKm * KM_TO_NM,
    remainingNm: op.arribo_confirmado ? 0 : faltaKm * KM_TO_NM,
  };
}

export function buildJourney(
  op: NavitrackOperacion,
  ais: AisSnapshot | null,
  now = new Date(),
  tramos: Tramo[] = [],
): Journey {
  /*
   * Con tramos cargados, el viaje son ellos. Sin tramos es directo y vale lo
   * que dice la operación: es la misma regla de lectura que define la tabla.
   */
  if (tramos.length > 0) {
    const porTramos = viajePorTramos(op, tramos, ais, now);
    if (porTramos) return porTramos;
  }

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
    const full = curvaMaritima(origen, destino);
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
      traveled = curvaMaritima(origen, p);
      remaining = curvaMaritima(p, destino);

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

  const escalas: Escala[] = [];
  if (origen) escalas.push({ nombre: origenNombre, coord: origen, tipo: "origen", nave: op.nave, cumplida: true });
  if (destino) {
    escalas.push({
      nombre: destinoNombre,
      coord: destino,
      tipo: "destino",
      nave: null,
      cumplida: Boolean(op.arribo_confirmado),
    });
  }

  return {
    origen: { nombre: origenNombre, coord: origen },
    destino: { nombre: destinoNombre, coord: destino },
    escalas,
    tramoActual: null,
    naveActual: op.nave,
    viajeActual: op.viaje ?? null,
    position,
    progress,
    traveled,
    remaining,
    totalNm,
    remainingNm,
  };
}
