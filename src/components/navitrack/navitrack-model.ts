/**
 * Modelo de NaviTrack: tipos y derivaciones puras del viaje.
 *
 * Acá vive todo lo que convierte "una fila de operaciones + un snapshot AIS" en
 * algo que un operador logístico lee de un vistazo: etapa, progreso, posición,
 * ETA comparada y alertas. Sin React y sin Supabase, para que la UI solo
 * presente y esta lógica se pueda razonar aparte.
 */

import { getPortCoordinates } from "@/lib/ports-coordinates";
import { normalizarEstado, ESTADO_META } from "@/lib/operaciones/estados";

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
  /** Fecha del arribo, cuando consta. Acompaña a `arribo_confirmado`. */
  arribo_at: string | null;
  /** Llegada a destino anunciada por la naviera y todavía no ocurrida. */
  arribo_anunciado_at: string | null;
  ingreso_stacking: string | null;
  fin_stacking: string | null;
  corte_documental: string | null;
  tracking_manual_lat: number | null;
  tracking_manual_lng: number | null;
  tracking_manual_updated_at: string | null;
};

export const NAVITRACK_OP_SELECT =
  "id, ref_asli, correlativo, cliente, contenedor, booking, naviera, nave, viaje, pol, pod, pais, etd, eta, tt, estado_operacion, arribo_confirmado, arribo_at, arribo_anunciado_at, ingreso_stacking, fin_stacking, corte_documental, tracking_manual_lat, tracking_manual_lng, tracking_manual_updated_at";

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
  /**
   * `atdUtc` del proveedor. **No es el zarpe de `lastPort`.**
   *
   * Parecía serlo y no lo es: en la serie guardada, 6 de 7 naves cambiaron de
   * `lastPort` más veces de las que cambió su `atdUtc`. El CMA CGM CARL ANTOINE
   * declaró Posorja y después Caucedo con el mismo `atdUtc` del 06-SEP: dos
   * puertos, una sola fecha, así que a lo más una de las dos parejas es cierta.
   *
   * Se conserva porque viene en la lectura ya pagada y puede servir cuando se
   * entienda a qué se refiere, pero **no se muestra como fecha de la escala**:
   * una fecha inventada es peor que ninguna.
   */
  departedAt: Date | null;
  /**
   * Cuándo **preguntamos** nosotros, que no es cuándo transmitió el buque.
   *
   * Un barco fuera de cobertura puede pasar días sin emitir: la consulta del
   * día sale bien, gasta su crédito y devuelve una posición de hace tres días.
   * Sin este dato las dos cosas se confunden en una sola fecha y una lectura
   * fresca de un buque callado se lee como si el sistema no hubiera corrido.
   */
  queriedAt: Date | null;
  vesselName: string | null;
};

/* --------------------------------- Geodesia -------------------------------- */

const R_EARTH_KM = 6371;
/**
 * Dos coordenadas más cerca que esto son el mismo puerto.
 *
 * El catálogo apunta al centro del recinto y el AIS a la posición del buque
 * dentro de él; además "Rotterdam" y "Rotterdam anch" son el mismo lugar con
 * dos nombres. 30 km cubre esa holgura sin tragarse puertos vecinos reales.
 */
const MISMO_PUERTO_KM = 30;
const KM_TO_NM = 0.539957;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * Porcentaje de avance, acotado a 0-100.
 *
 * Ninguna de las fuentes viene acotada: `routeFraction` pasa de 1 cuando la
 * posición queda más allá del destino. Sin acotar, un embarque con una
 * coordenada cargada a mano en Amberes y destino Génova mostraba **105 % del
 * trayecto** y 0 MN restantes.
 *
 * Un porcentaje sobre 100 no es un dato más fino: es una cuenta que se pasó, y
 * en pantalla se lee como un error del sistema justo donde el cliente busca
 * certeza.
 */
export const pctDe = (fraccion: number) => Math.round(clamp01(fraccion) * 100);

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

  /*
   * La comba se mide por la tierra que hay que esquivar, no por el largo.
   *
   * Antes crecía solo con la distancia —`(largoKm / 111) * 0.16`, tope 14°—, así
   * que un salto atlántico de 7.000 km se combaba 10 grados: más de mil
   * kilómetros de desvío sobre mar abierto, donde no hay nada que esquivar. El
   * arco se veía tan inventado como la recta que vino a arreglar.
   *
   * Ahora se atenúa según lo lejos que quede el tramo del continente más
   * cercano. Un tramo pegado a la costa —Valparaíso a Cristóbal, que si no
   * cruza Perú y Colombia por tierra— conserva casi toda su comba; uno que
   * cruza el océano se endereza.
   *
   * `mejor` es la distancia al continente más cercano, ya calculada arriba para
   * decidir el lado. Los centroides son gruesos a propósito: esto gradúa un
   * adorno, no mide nada.
   */
  const LEJOS_DE_TIERRA_KM = 5000;
  const cercania = clamp01((LEJOS_DE_TIERRA_KM - mejor) / LEJOS_DE_TIERRA_KM);
  const amplitud = Math.min(8, (largoKm / 111) * 0.16 * cercania);

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
    // Data Docked lo escribe en camelCase (`lastPort`); las otras formas quedan
    // por si cambia de proveedor. Buscar solo las snake_case dejaba el último
    // puerto en null aunque viniera en la respuesta.
    lastPort: str(pick(raw, ["lastPort", "last_port", "lastport", "departure_port"])),
    departedAt: parseInstant(pick(raw, ["atdUtc", "atd", "atd_utc", "departed"])),
    queriedAt: parseInstant(pick(raw, ["consultadoAt", "consultado_at", "queriedAt"])),
    vesselName: str(pick(raw, ["vessel_name", "name", "shipname"])),
  };
}

/**
 * Si dos nombres de puerto hablan del mismo lugar.
 *
 * El AIS reescribe el destino a medida que el buque se acerca: el mismo
 * embarque declaró "Rotterdam Netherlands" y, dos días después, "Rotterdam anch
 * Netherlands" (anch = fondeadero). Comparando el texto tal cual, eso son dos
 * puertos: se anotaban dos recaladas, se pedían dos verificaciones y el mapa
 * dibujaba dos marcadores encima del otro.
 *
 * Primero el texto normalizado y después la coordenada del catálogo, que es la
 * misma resolución que usa el mapa. Dos nombres que caen en el mismo punto son
 * el mismo puerto; si el catálogo no conoce alguno, manda el texto.
 */
export function mismoPuerto(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizarPuertoTexto(a);
  const nb = normalizarPuertoTexto(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const ca = getPortCoordinates(na);
  const cb = getPortCoordinates(nb);
  if (!ca || !cb) return false;
  return haversineKm({ lng: ca[0], lat: ca[1] }, { lng: cb[0], lat: cb[1] }) < MISMO_PUERTO_KM;
}

function normalizarPuertoTexto(v: string | null | undefined): string {
  return String(v ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

/**
 * Si la carga ya salió del puerto de origen.
 *
 * Manda el estado de la operación cuando lo dice explícitamente; si no, la
 * fecha de zarpe. Vive acá y se exporta porque no es solo cosa de la etapa: el
 * modelo lo necesita para no contar como avance el viaje que el buque está
 * haciendo con otra carga.
 */
export const DIAS_ANTES_ZARPE = 2;

/**
 * Si este embarque ya entra en la ventana de seguimiento.
 *
 * Antes del zarpe, el buque asignado está haciendo **otro** viaje: viene hacia
 * Chile a buscar la carga. Su AIS describe ese viaje, no este. El A00052
 * —San Antonio → Leixões, zarpe el 25 de septiembre— disparó un aviso de
 * "destino distinto al comprometido" porque el buque declaraba Posorja: cierto
 * del barco, falso del embarque. Y peor que el correo: se anotaron Buenaventura
 * y Posorja como recaladas del embarque, o sea puertos que la carga nunca
 * tocó, porque todavía estaba en tierra.
 *
 * La pantalla ya lo resolvía con `yaZarpo()`; el chequeo diario no miraba el
 * ETD y por eso escribía y avisaba igual.
 *
 * Se abre dos días antes y no el día exacto porque el zarpe se corre: con la
 * ventana pegada al ETD, un adelanto de un día deja la carga sin seguir
 * justo cuando empieza a moverse.
 */
export function enVentanaDeSeguimiento(
  op: { etd: string | null; estado_operacion: string | null },
  now = new Date(),
  diasAntes = DIAS_ANTES_ZARPE,
): boolean {
  if (yaZarpo(op as NavitrackOperacion, now)) return true;
  const etd = parseOpDate(op.etd);
  if (!etd) return false; // Sin fecha de zarpe no hay ventana que abrir.

  /*
   * La ventana abre al **empezar** el día, no a la hora del ETD.
   *
   * `etd` es columna `date` y `parseOpDate` la sitúa a mediodía para que no se
   * corra de día por zona horaria. Restarle dos días tal cual dejaba la ventana
   * abriendo a las 12:00, y el cron corre a las 06:00: el día que tocaba entrar,
   * el embarque todavía quedaba fuera y recién entraba al día siguiente.
   */
  const apertura = new Date(etd);
  apertura.setDate(apertura.getDate() - diasAntes);
  apertura.setHours(0, 0, 0, 0);
  return now.getTime() >= apertura.getTime();
}

export function yaZarpo(op: NavitrackOperacion, now = new Date()): boolean {
  const codigo = normalizarEstado(op.estado_operacion);
  const meta = codigo ? ESTADO_META[codigo] : null;
  if (meta?.esFinal) return true;
  if (meta != null && meta.orden >= ESTADO_META.ZARPADA.orden && meta.grupo !== "EXCEPCION") return true;
  const etd = parseOpDate(op.etd);
  return etd != null && etd.getTime() <= now.getTime();
}

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
  /**
   * `prevista` es un puerto que el buque anunció pero donde todavía no llega.
   * Se dibuja distinto: es lo que dice la nave, no lo que ya ocurrió.
   *
   * `recalada` es un puerto donde el buque ya paró, según el AIS. No es una
   * `conexion`: ahí la carga cambia de nave, acá sigue en la misma. Mezclarlos
   * haría aparecer un transbordo que no ocurrió.
   */
  tipo: "origen" | "conexion" | "destino" | "prevista" | "recalada";
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
  /**
   * Puertos del recorrido que no son extremos de ningún tramo.
   *
   * Son las recaladas: paradas del itinerario donde la carga **no** cambia de
   * nave. Los tramos solo conocen los puertos donde el viaje se parte —ahí
   * empieza y termina cada buque—, así que sin esto un embarque con transbordo
   * perdía del mapa todas sus escalas: la ficha decía "parada programada ·
   * Livorno · confirmada" y el mapa no la dibujaba en ninguna parte.
   *
   * `recalados` ya ocurrieron; `previstos`, no. Es la misma pareja que usa el
   * camino directo de `buildJourney`.
   */
  puertosPrevistos: string[] = [],
  puertosRecalados: string[] = [],
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

  /*
   * Después del arribo el buque no se dibuja.
   *
   * Es la misma regla que ya aplican `estaArribado` y el chequeo diario, y acá
   * faltaba: el viaje se armaba igual que uno en curso, con la línea pasando
   * por donde esté la nave **hoy**. Un embarque Valparaíso → Génova ya
   * entregado, con el MSC RITA V navegando el mar del Norte, se dibujaba con el
   * trazo subiendo desde Gioia Tauro, pasándose de largo Génova, cruzando
   * Francia hasta el barco, y otro de vuelta al destino. La ruta decía que la
   * carga se pasó de Génova y volvía.
   *
   * La posición del buque es real; lo falso es atribuírsela a esta carga, que
   * bajó en Génova. Sin marcador y con la ruta entera recorrida, el mapa dice
   * lo único que consta.
   */
  const arribado = Boolean(op.arribo_confirmado);
  if (arribado) indiceActual = pasos.length - 1;

  /*
   * Las recaladas, repartidas en el tramo al que pertenecen.
   *
   * No traen fecha fiable ni número de tramo: lo único que se sabe de ellas es
   * dónde quedan. Así que se ubican por geometría —dentro del arco de un tramo
   * está la que queda más cerca de los dos extremos que ellos entre sí— y se
   * ordenan por cercanía al final de ese tramo, que es el sentido de la marcha.
   * Ordenarlas por la fecha en que se anotaron dibujaría un zigzag cada vez que
   * dos anuncios llegan fuera de orden; es el mismo criterio del camino directo.
   */
  type Intermedio = { nombre: string; coord: LngLat; previsto: boolean };
  const extremos = new Set<string>();
  for (const p of pasos) {
    extremos.add(p.nombreDesde);
    extremos.add(p.nombreHasta);
  }

  const intermedios: Intermedio[] = [];
  for (const [nombres, previsto] of [
    [puertosRecalados, false],
    [puertosPrevistos, true],
  ] as const) {
    for (const nombre of nombres) {
      const limpio = (nombre ?? "").trim();
      if (!limpio) continue;
      // Un puerto que ya es extremo de un tramo se dibujaría dos veces: una
      // como conexión y otra como escala, contando un transbordo de más.
      if ([...extremos].some((e) => mismoPuerto(e, limpio))) continue;
      if (intermedios.some((x) => mismoPuerto(x.nombre, limpio))) continue;
      const c = getPortCoordinates(limpio);
      if (!c) continue;
      intermedios.push({ nombre: limpio, coord: { lng: c[0], lat: c[1] }, previsto });
    }
  }

  /** Los que caen dentro de un tramo, en orden de recorrido. */
  const dentroDe = (desde: LngLat, hasta: LngLat): Intermedio[] => {
    const largo = haversineKm(desde, hasta);
    return intermedios
      .filter(
        (x) =>
          haversineKm(x.coord, hasta) < largo &&
          haversineKm(x.coord, desde) < largo &&
          haversineKm(x.coord, desde) > MISMO_PUERTO_KM &&
          haversineKm(x.coord, hasta) > MISMO_PUERTO_KM,
      )
      .sort((a, b) => haversineKm(b.coord, hasta) - haversineKm(a.coord, hasta));
  };

  /** La curva de un tramo, doblada por las escalas que tenga en medio. */
  const curvaDePaso = (desde: LngLat, hasta: LngLat): LngLat[] => {
    const medio = dentroDe(desde, hasta);
    if (medio.length === 0) return curvaMaritima(desde, hasta);
    const puntos = [desde, ...medio.map((x) => x.coord), hasta];
    return unirTramos(puntos.slice(0, -1).map((a, i) => curvaMaritima(a, puntos[i + 1])));
  };

  const posicion = arribado
    ? null
    : resolvePosition(
        op,
        ais,
        { origen: pasos[indiceActual].desde, destino: pasos[indiceActual].hasta },
        now,
      );

  const anteriores = pasos.slice(0, indiceActual).map((p) => curvaDePaso(p.desde, p.hasta));
  const posteriores = pasos.slice(indiceActual + 1).map((p) => curvaDePaso(p.desde, p.hasta));
  const actual = pasos[indiceActual];

  let traveled: LngLat[];
  let remaining: LngLat[];

  if (arribado) {
    // La cadena completa, de punta a punta: no queda nada por navegar.
    traveled = unirTramos(pasos.map((p) => curvaDePaso(p.desde, p.hasta)));
    remaining = [];
  } else if (isValidCoord(posicion)) {
    /*
     * El tramo en curso se parte en el buque, y sus escalas caen de un lado o
     * del otro según si ya quedaron atrás. Dibujarlas todas por delante haría
     * que el barco pareciera ir a un puerto que ya dejó.
     */
    const aqui = { lng: posicion.lng, lat: posicion.lat };
    traveled = unirTramos([...anteriores, curvaDePaso(actual.desde, aqui)]);
    remaining = unirTramos([curvaDePaso(aqui, actual.hasta), ...posteriores]);
  } else {
    traveled = unirTramos(anteriores);
    remaining = unirTramos([curvaDePaso(actual.desde, actual.hasta), ...posteriores]);
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
  if (arribado) {
    recorridoKm = totalKm;
  } else if (isValidCoord(posicion)) {
    recorridoKm += haversineKm(actual.desde, { lng: posicion.lng, lat: posicion.lat });
  }
  const faltaKm = Math.max(0, totalKm - recorridoKm);

  const escalas: Escala[] = [];
  const ultimo = pasos[pasos.length - 1];
  /** Hasta dónde llegó la carga: el buque, o el destino si ya arribó. */
  const frente = arribado ? ultimo.hasta : isValidCoord(posicion) ? posicion : null;

  pasos.forEach((p, i) => {
    escalas.push({
      nombre: p.nombreDesde,
      coord: p.desde,
      tipo: i === 0 ? "origen" : "conexion",
      nave: p.t.nave,
      // Con el arribo, hasta el último puerto de conexión quedó atrás.
      cumplida: arribado || i < indiceActual,
    });

    /*
     * Las escalas del tramo van entre sus dos extremos, en el mismo orden en
     * que las dobla la línea. Sin esto se dibujaba la línea pasando por
     * Livorno y no había marcador que dijera qué puerto era.
     *
     * `cumplida` no sale del estado de la recalada sino de la geometría: una
     * parada programada puede estar decidida y todavía por delante del buque.
     * Lo que decide es si quedó atrás, igual que en el historial del viaje.
     */
    for (const x of dentroDe(p.desde, p.hasta)) {
      escalas.push({
        nombre: x.nombre,
        coord: x.coord,
        tipo: x.previsto ? "prevista" : "recalada",
        // La carga sigue en el mismo buque: la nave no cambia acá.
        nave: null,
        cumplida:
          arribado ||
          i < indiceActual ||
          (frente != null && haversineKm(x.coord, ultimo.hasta) > haversineKm(frente, ultimo.hasta)),
      });
    }
  });

  escalas.push({
    nombre: ultimo.nombreHasta,
    coord: ultimo.hasta,
    tipo: "destino",
    nave: null,
    cumplida: arribado,
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
          pct: op.arribo_confirmado ? 100 : pctDe(recorridoKm / totalKm),
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
  /**
   * Puertos que el buque anunció y todavía no alcanza, en orden.
   *
   * Sirven para dibujar por dónde va a pasar. Sin ellos, la línea estimada va
   * derecho del buque al destino final y cruza lo que sea que haya en medio:
   * un barco frente a Perú que anunció Callao aparecía con una recta que
   * atravesaba Bolivia rumbo a Hamburgo.
   */
  puertosPrevistos: string[] = [],
  /**
   * Puertos donde consta que el buque paró, en orden de recorrido.
   *
   * Son el espejo de `puertosPrevistos`: lo anunciado dobla la línea de lo que
   * falta, lo recalado dobla la de lo recorrido. Vienen de la base porque el
   * AIS solo informa la última parada: sin persistirlas, el recorrido se
   * borraría solo cada vez que el buque toca un puerto nuevo.
   */
  puertosRecalados: string[] = [],
): Journey {
  /*
   * Con tramos cargados, el viaje son ellos. Sin tramos es directo y vale lo
   * que dice la operación: es la misma regla de lectura que define la tabla.
   */
  if (tramos.length > 0) {
    const porTramos = viajePorTramos(op, tramos, ais, now, puertosPrevistos, puertosRecalados);
    if (porTramos) return porTramos;
  }

  const origenNombre = (op.pol ?? "").trim();
  const destinoNombre = (op.pod ?? "").trim();
  const oc = getPortCoordinates(origenNombre);
  const dc = getPortCoordinates(destinoNombre);
  const origen = oc ? { lng: oc[0], lat: oc[1] } : null;
  const destino = dc ? { lng: dc[0], lat: dc[1] } : null;

  /*
   * Antes del zarpe se ignora el AIS.
   *
   * Es el mismo criterio que con los arribados: el buque anda en otro viaje y
   * su posición no describe esta carga. Lo que se muestra es el puerto de
   * origen, que es donde la carga está de verdad.
   */
  const zarpado = yaZarpo(op, now);
  /*
   * Después del arribo tampoco se dibuja el buque, por lo mismo que antes del
   * zarpe: la nave sigue viaje a otro destino y su posición, aunque real, ya no
   * describe esta carga. Ver la nota en `viajePorTramos`.
   */
  const arribado = Boolean(op.arribo_confirmado);
  const position = arribado
    ? null
    : zarpado
      ? resolvePosition(op, ais, { origen, destino }, now)
      : origen
        ? { lng: origen.lng, lat: origen.lat, source: "ESTIMADA" as const, at: null, course: null, speed: null }
        : null;

  let progress: JourneyProgress | null = null;
  let traveled: LngLat[] = [];
  let remaining: LngLat[] = [];
  let totalNm: number | null = null;
  let remainingNm: number | null = null;

  /*
   * Por dónde pasó el buque.
   *
   * Las recaladas guardadas, más la última que informa el AIS por si todavía no
   * se anotó. Sin esto la pantalla decía "Último puerto: Caucedo" mientras el
   * mapa dibujaba una recta San Antonio → Rotterdam que no se acerca al Caribe:
   * los dos datos salían de la misma lectura y se contradecían.
   *
   * Cada una tiene que resolver coordenada, no ser el origen ni el destino
   * —que ya tienen su propio punto— y quedar **detrás** del buque: un puerto
   * por delante no es por donde pasó, es por donde va a pasar. Un buque
   * todavía en el muelle de carga declara ese mismo puerto como `lastPort`, y
   * sin el filtro del origen duplicaría el punto de partida.
   */
  const recaladas = ((): { nombre: string; coord: LngLat }[] => {
    if (!zarpado || !isValidCoord(destino) || !isValidCoord(position)) return [];
    const nombres = [...puertosRecalados];
    const ultimo = ais?.lastPort?.trim();
    if (ultimo && !nombres.some((n) => mismoPuerto(n, ultimo))) nombres.push(ultimo);

    const salida: { nombre: string; coord: LngLat }[] = [];
    for (const nombre of nombres) {
      const c = getPortCoordinates(nombre);
      if (!c) continue;
      const coord = { lng: c[0], lat: c[1] };
      if (isValidCoord(origen) && haversineKm(coord, origen) < MISMO_PUERTO_KM) continue;
      if (haversineKm(coord, destino) < MISMO_PUERTO_KM) continue;
      if (haversineKm(coord, destino) <= haversineKm(position, destino)) continue;
      if (salida.some((x) => haversineKm(x.coord, coord) < MISMO_PUERTO_KM)) continue;
      salida.push({ nombre, coord });
    }
    /*
     * Se ordenan por cercanía al destino, de más lejos a más cerca, y no por la
     * fecha en que se anotaron: la línea tiene que avanzar hacia el destino.
     * Un par de anuncios llegados fuera de orden dibujarían un zigzag.
     */
    return salida.sort((a, b) => haversineKm(b.coord, destino) - haversineKm(a.coord, destino));
  })();

  if (isValidCoord(origen) && isValidCoord(destino)) {
    const full = curvaMaritima(origen, destino);
    totalNm = haversineKm(origen, destino) * KM_TO_NM;

    let f: number | null = null;
    if (arribado) {
      // Ruta entera recorrida: el corte cae en el último punto y no queda tramo
      // pendiente que pintar.
      f = 1;
      progress = { pct: 100, basis: "tiempo" };
    } else if (!zarpado) {
      /*
       * Antes del zarpe el viaje no ha empezado.
       *
       * El buque que vendrá a buscar la carga está haciendo otro viaje, así que
       * su posición AIS mide el avance de un embarque ajeno: un contenedor que
       * todavía espera en San Antonio aparecía con "30 % del trayecto" y el
       * barco a mitad del Pacífico. Cero es el único número honesto acá.
       */
      f = 0;
      progress = { pct: 0, basis: "tiempo" };
    } else if (position && position.source !== "ESTIMADA") {
      f = routeFraction(origen, destino, position);
      progress = { pct: pctDe(f), basis: "posicion" };
    } else {
      const tf = timeFraction(op, now);
      if (tf != null) {
        f = tf;
        progress = { pct: pctDe(tf), basis: "tiempo" };
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
      if (recaladas.length > 0) {
        const puntos = [origen, ...recaladas.map((r) => r.coord), p];
        traveled = unirTramos(
          puntos.slice(0, -1).map((desde, i) => curvaMaritima(desde, puntos[i + 1])),
        );
      } else {
        traveled = curvaMaritima(origen, p);
      }

      /*
       * Lo que falta pasa por los puertos anunciados.
       *
       * El buque ya dijo dónde para: dibujar una recta hasta el destino final
       * ignora ese dato y traza una ruta que nadie va a navegar. Se encadena
       * buque → cada puerto anunciado → destino, que es lo que el propio barco
       * está diciendo que hará.
       *
       * Se ignoran los puertos sin coordenadas conocidas y los que caen más
       * lejos del destino que el propio destino: un anuncio mal escrito no debe
       * torcer la ruta.
       */
      const previstos = puertosPrevistos
        .map((nombre) => {
          const c = getPortCoordinates(nombre);
          return c ? { lng: c[0], lat: c[1] } : null;
        })
        .filter((c): c is LngLat => c != null && haversineKm(c, destino) < haversineKm(p, destino));

      if (previstos.length > 0) {
        const puntos = [p, ...previstos, destino];
        remaining = unirTramos(
          puntos.slice(0, -1).map((desde, i) => curvaMaritima(desde, puntos[i + 1])),
        );
      } else {
        remaining = curvaMaritima(p, destino);
      }

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

  // La recalada va después del origen y antes de lo anunciado: es lo último que
  // ya ocurrió. `nave` queda en null porque la carga no cambió de buque ahí.
  for (const r of recaladas) {
    escalas.push({ ...r, tipo: "recalada", nave: null, cumplida: true });
  }

  // Los puertos anunciados van al mapa como previstos: forman parte del
  // recorrido que el buque declara, pero todavía no ocurrieron.
  for (const nombre of puertosPrevistos) {
    const c = getPortCoordinates(nombre);
    if (!c) continue;
    const coord = { lng: c[0], lat: c[1] };
    if (destino && haversineKm(coord, destino) >= haversineKm(position ?? origen ?? coord, destino)) continue;
    escalas.push({ nombre, coord, tipo: "prevista", nave: op.nave, cumplida: false });
  }

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
