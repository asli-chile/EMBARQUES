/**
 * Etapa del viaje, comparación de ETA, alertas y línea de tiempo.
 *
 * Separado del cálculo geográfico (`navitrack-model.ts`) porque esto es criterio
 * de negocio: cuándo un embarque "está por llegar", cuándo una diferencia de ETA
 * merece alarma y cuándo un destino AIS distinto insinúa un transbordo.
 */

import {
  DAY_MS,
  HOUR_MS,
  haversineKm,
  parseInstant,
  parseOpDate,
  type AisSnapshot,
  type Journey,
  type LngLat,
  type NavitrackOperacion,
} from "./navitrack-model";
import { getPortCoordinates } from "@/lib/ports-coordinates";
import { normalizarEstado, ESTADO_META } from "@/lib/operaciones/estados";

/* --------------------------------- Etapas ---------------------------------- */

export type NavitrackEtapa =
  | "EN_ORIGEN"
  | "EN_TRANSITO"
  | "PROXIMO_DESTINO"
  | "POSIBLE_TRANSBORDO"
  | "TRANSBORDO_CONFIRMADO"
  | "POSIBLE_RETRASO"
  | "ARRIBADO";

/**
 * Tono de cada etapa. Son los mismos acentos que ya usan los KPI del dashboard
 * (`dash-kpi-card--*`), no una paleta nueva.
 */
export type EtapaTono = "teal" | "emerald" | "amber" | "orange" | "sky" | "rose";

export const ETAPA_META: Record<
  NavitrackEtapa,
  { tono: EtapaTono; icon: string; orden: number }
> = {
  EN_ORIGEN: { tono: "teal", icon: "lucide:anchor", orden: 1 },
  EN_TRANSITO: { tono: "emerald", icon: "lucide:ship", orden: 2 },
  PROXIMO_DESTINO: { tono: "amber", icon: "lucide:flag", orden: 3 },
  POSIBLE_TRANSBORDO: { tono: "orange", icon: "lucide:git-branch", orden: 4 },
  TRANSBORDO_CONFIRMADO: { tono: "sky", icon: "lucide:git-merge", orden: 5 },
  POSIBLE_RETRASO: { tono: "rose", icon: "lucide:clock-alert", orden: 6 },
  ARRIBADO: { tono: "teal", icon: "lucide:circle-check", orden: 7 },
};

/** Horas de atraso desde las que el embarque deja de considerarse en fecha. */
export const RETRASO_HORAS = 24;
/** Días antes del ETA en que el embarque pasa a "próximo a llegar". */
export const PROXIMO_DIAS = 5;
/** Horas sin lectura AIS tras las que la posición se marca como antigua. */
export const POSICION_ANTIGUA_HORAS = 12;

/* ------------------------------ Comparar ETA -------------------------------- */

export type EtaSeveridad = "en_fecha" | "leve" | "alta";

export type EtaComparada = {
  erp: Date | null;
  ais: Date | null;
  /** Horas de diferencia (positivo = el AIS llega después de lo comprometido). */
  deltaHoras: number | null;
  severidad: EtaSeveridad;
};

export function compararEta(op: NavitrackOperacion, ais: AisSnapshot | null): EtaComparada {
  const erp = parseOpDate(op.eta);
  const aisEta = ais?.eta ?? null;
  if (!erp || !aisEta) {
    return { erp, ais: aisEta, deltaHoras: null, severidad: "en_fecha" };
  }
  const deltaHoras = (aisEta.getTime() - erp.getTime()) / HOUR_MS;
  const abs = Math.abs(deltaHoras);
  // Una diferencia de pocas horas es ruido del propio AIS: no merece color de alarma.
  const severidad: EtaSeveridad = abs < 6 ? "en_fecha" : abs < RETRASO_HORAS ? "leve" : "alta";
  return { erp, ais: aisEta, deltaHoras, severidad };
}

/* -------------------------------- Transbordo -------------------------------- */

function normalizarPuerto(s: string | null | undefined): string {
  return String(s ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * El destino que declara el AIS no coincide con el POD comprometido.
 *
 * Es una señal, no un hecho: los capitanes escriben el destino a mano y abundan
 * las abreviaturas. Por eso el resultado se presenta siempre como "posible" y
 * necesita que una persona lo confirme.
 */
export function destinoAisDiscrepa(pod: string | null, destinoAis: string | null): boolean {
  const a = normalizarPuerto(pod);
  const b = normalizarPuerto(destinoAis);
  if (!a || !b || b.length < 3) return false;
  if (a.includes(b) || b.includes(a)) return false;
  // Los destinos AIS suelen venir como "CLSAI" o "CL SAI": comparar por tokens.
  const tokensA = new Set(a.split(" ").filter((t) => t.length >= 3));
  return !b.split(" ").some((t) => t.length >= 3 && tokensA.has(t));
}

/**
 * Resultado de evaluar el destino que declara el buque.
 *
 *   en_ruta        el puerto declarado acerca la carga al POD: es una escala
 *   fuera_de_ruta  aleja o no acerca: esto sí merece que alguien lo mire
 *   desconocido    el puerto no está en el catálogo, no hay cómo juzgarlo
 *   coincide       declara el POD comprometido
 */
export type DestinoEvaluado = "coincide" | "en_ruta" | "fuera_de_ruta" | "desconocido";

/**
 * ¿El destino declarado es un desvío o una escala normal?
 *
 * El AIS declara el **próximo puerto**, no el destino final del contenedor. Un
 * buque que sale de San Antonio hacia Hamburgo declara Callao, después Balboa,
 * y solo al final Hamburgo. Comparar contra el POD sin más marca desvío en cada
 * escala: una alerta diaria que siempre grita y nunca acierta.
 *
 * La pregunta útil es otra: **¿ir a ese puerto acerca la carga a su destino?**
 * Si el puerto declarado está más cerca del POD que el buque ahora, es una
 * escala en ruta. Si no, algo pasa y vale la pena preguntar.
 *
 * Es geometría de círculo máximo sobre un mundo con continentes y canales, así
 * que es una aproximación. Sirve para separar lo evidente —Callao camino a
 * Europa— de lo que no lo es, y el margen evita que un puerto casi equidistante
 * dispare la alerta.
 */
export function evaluarDestinoAis(
  pod: string | null,
  destinoAis: string | null,
  posicion: LngLat | null,
  margenKm = 200,
): DestinoEvaluado {
  if (!destinoAisDiscrepa(pod, destinoAis)) return "coincide";

  const cPod = getPortCoordinates(pod ?? "");
  const cDeclarado = getPortCoordinates(destinoAis ?? "");
  if (!cPod || !cDeclarado || !posicion) return "desconocido";

  const destino = { lng: cPod[0], lat: cPod[1] };
  const declarado = { lng: cDeclarado[0], lat: cDeclarado[1] };

  const faltaAhora = haversineKm(posicion, destino);
  const faltaDesdeDeclarado = haversineKm(declarado, destino);
  const hastaDeclarado = haversineKm(posicion, declarado);

  /*
   * Dos condiciones, y hacen falta las dos.
   *
   * "Acerca" por sí sola no basta: desde Chile, Shanghai también queda más
   * cerca de Hamburgo en línea recta, y declararlo sería un desvío enorme. La
   * segunda condición lo descarta —un puerto intermedio no puede estar más
   * lejos que el destino final— y es la que separa una escala de un disparate.
   */
  const acerca = faltaDesdeDeclarado + margenKm < faltaAhora;
  const estaDeCamino = hastaDeclarado < faltaAhora;

  return acerca && estaDeCamino ? "en_ruta" : "fuera_de_ruta";
}

/** Decisión humana sobre una alerta de transbordo, guardada en `navitrack_transbordos`. */
export type TransbordoDecision = {
  operacion_id: string;
  estado: "confirmado" | "descartado";
  puerto: string | null;
  nave_siguiente: string | null;
};

/* --------------------------------- Etapa ------------------------------------ */

export type EstadoEmbarque = {
  etapa: NavitrackEtapa;
  /** Días hasta el ETA (negativo si ya pasó). Null si no hay ETA. */
  diasParaEta: number | null;
  eta: EtaComparada;
  /** El destino AIS no calza con el POD y nadie lo ha resuelto todavía. */
  transbordoSospechado: boolean;
  posicionAntigua: boolean;
};

export function resolverEstado(
  op: NavitrackOperacion,
  ais: AisSnapshot | null,
  journey: Journey,
  decision: TransbordoDecision | null,
  now = new Date(),
): EstadoEmbarque {
  const eta = compararEta(op, ais);
  const etaDate = eta.erp;
  const diasParaEta = etaDate ? Math.round((etaDate.getTime() - now.getTime()) / DAY_MS) : null;

  const posAt = journey.position?.at ?? null;
  const posicionAntigua =
    journey.position?.source === "AIS" &&
    posAt != null &&
    now.getTime() - posAt.getTime() > POSICION_ANTIGUA_HORAS * HOUR_MS;

  const sospecha =
    decision?.estado !== "descartado" && destinoAisDiscrepa(op.pod, ais?.destination ?? null);
  const transbordoSospechado = sospecha && decision?.estado !== "confirmado";

  const etapa = ((): NavitrackEtapa => {
    if (op.arribo_confirmado) return "ARRIBADO";

    const codigo = normalizarEstado(op.estado_operacion);
    const meta = codigo ? ESTADO_META[codigo] : null;
    if (meta?.esFinal) return "ARRIBADO";

    const etd = parseOpDate(op.etd);
    const yaZarpo =
      (meta != null && meta.orden >= ESTADO_META.ZARPADA.orden && meta.grupo !== "EXCEPCION") ||
      (etd != null && etd.getTime() <= now.getTime());
    if (!yaZarpo) return "EN_ORIGEN";

    if (decision?.estado === "confirmado") return "TRANSBORDO_CONFIRMADO";
    if (transbordoSospechado) return "POSIBLE_TRANSBORDO";

    const retrasado =
      eta.deltaHoras != null
        ? eta.deltaHoras >= RETRASO_HORAS
        : diasParaEta != null && diasParaEta < 0;
    if (retrasado) return "POSIBLE_RETRASO";

    if (diasParaEta != null && diasParaEta <= PROXIMO_DIAS) return "PROXIMO_DESTINO";
    return "EN_TRANSITO";
  })();

  return { etapa, diasParaEta, eta, transbordoSospechado, posicionAntigua };
}

/**
 * El embarque ya llegó.
 *
 * Se resuelve sin AIS a propósito: es lo que decide si vale la pena consultar al
 * proveedor. Después del arribo el buque sigue viaje a otro destino, así que su
 * posición ya no dice nada de esta carga — mostrarla sería un dato falso.
 */
export function estaArribado(op: NavitrackOperacion): boolean {
  if (op.arribo_confirmado) return true;
  const codigo = normalizarEstado(op.estado_operacion);
  return codigo ? ESTADO_META[codigo].esFinal : false;
}

/* --------------------------------- Alertas ---------------------------------- */

export type AlertaCodigo =
  | "RETRASO"
  | "TRANSBORDO"
  | "POSICION_ANTIGUA"
  | "SIN_POSICION"
  | "SIN_RUTA";

export type AlertaSeveridad = "info" | "atencion" | "critica";

export type Alerta = {
  codigo: AlertaCodigo;
  severidad: AlertaSeveridad;
  /** Datos para interpolar en el texto traducido. */
  datos: Record<string, string>;
  accionable: boolean;
};

export function construirAlertas(
  op: NavitrackOperacion,
  ais: AisSnapshot | null,
  journey: Journey,
  estado: EstadoEmbarque,
): Alerta[] {
  const alertas: Alerta[] = [];

  if (estado.transbordoSospechado) {
    alertas.push({
      codigo: "TRANSBORDO",
      severidad: "atencion",
      datos: {
        destino: ais?.destination ?? "",
        pod: op.pod ?? "",
        nave: op.nave ?? "",
      },
      accionable: true,
    });
  }

  if (estado.etapa === "POSIBLE_RETRASO") {
    const horas = estado.eta.deltaHoras;
    alertas.push({
      codigo: "RETRASO",
      severidad: horas != null && horas >= 72 ? "critica" : "atencion",
      datos: { delta: horas != null ? formatearDelta(horas) : "" },
      accionable: false,
    });
  }

  if (estado.posicionAntigua && journey.position?.at) {
    alertas.push({
      codigo: "POSICION_ANTIGUA",
      severidad: "info",
      datos: { desde: journey.position.at.toISOString() },
      accionable: false,
    });
  }

  if (!journey.position && estado.etapa !== "ARRIBADO" && estado.etapa !== "EN_ORIGEN") {
    alertas.push({ codigo: "SIN_POSICION", severidad: "info", datos: {}, accionable: false });
  }

  if (!journey.origen.coord || !journey.destino.coord) {
    alertas.push({
      codigo: "SIN_RUTA",
      severidad: "info",
      datos: { puerto: !journey.origen.coord ? journey.origen.nombre : journey.destino.nombre },
      accionable: false,
    });
  }

  return alertas;
}

/** "+3h 20m" / "-1d 4h". Se muestra tal cual junto a la ETA. */
export function formatearDelta(horas: number): string {
  const signo = horas >= 0 ? "+" : "-";
  const abs = Math.abs(horas);
  const dias = Math.floor(abs / 24);
  const h = Math.floor(abs % 24);
  const m = Math.round((abs - Math.floor(abs)) * 60);
  if (dias > 0) return `${signo}${dias}d ${h}h`;
  if (h > 0) return `${signo}${h}h ${String(m).padStart(2, "0")}m`;
  return `${signo}${m}m`;
}

/* ------------------------------ Línea de tiempo ----------------------------- */

export type EventoCerteza = "REAL" | "CONFIRMADO" | "ESTIMADO";

export type EventoCodigo =
  | "STACKING"
  | "CORTE_DOCUMENTAL"
  | "FIN_STACKING"
  | "ZARPE"
  | "TRANSITO"
  | "TRANSBORDO"
  | "ARRIBO";

export type EventoViaje = {
  codigo: EventoCodigo;
  fecha: Date | null;
  /** Puerto o zona donde ocurre. Vacío cuando no aplica. */
  lugar: string;
  certeza: EventoCerteza;
  /** El evento ya ocurrió: se pinta como hito cumplido. */
  cumplido: boolean;
  /** Es el punto en que está el viaje ahora mismo. */
  actual: boolean;
};

/**
 * Hitos del viaje a partir de lo que la operación realmente registra.
 *
 * No se inventan escalas: el ERP no guarda los port calls intermedios, así que
 * el timeline muestra stacking, corte documental, zarpe, tránsito y arribo, y
 * marca cada uno como real, confirmado o estimado según su origen.
 */
export function construirTimeline(
  op: NavitrackOperacion,
  ais: AisSnapshot | null,
  estado: EstadoEmbarque,
  decision: TransbordoDecision | null,
  now = new Date(),
): EventoViaje[] {
  const pol = (op.pol ?? "").trim();
  const pod = (op.pod ?? "").trim();
  const eventos: EventoViaje[] = [];

  const pasado = (d: Date | null) => d != null && d.getTime() <= now.getTime();

  const stacking = parseOpDate(op.ingreso_stacking);
  if (stacking) {
    eventos.push({
      codigo: "STACKING",
      fecha: stacking,
      lugar: pol,
      certeza: pasado(stacking) ? "REAL" : "ESTIMADO",
      cumplido: pasado(stacking),
      actual: false,
    });
  }

  const corte = parseOpDate(op.corte_documental);
  if (corte) {
    eventos.push({
      codigo: "CORTE_DOCUMENTAL",
      fecha: corte,
      lugar: pol,
      certeza: pasado(corte) ? "REAL" : "ESTIMADO",
      cumplido: pasado(corte),
      actual: false,
    });
  }

  const finStacking = parseOpDate(op.fin_stacking);
  if (finStacking) {
    eventos.push({
      codigo: "FIN_STACKING",
      fecha: finStacking,
      lugar: pol,
      certeza: pasado(finStacking) ? "REAL" : "ESTIMADO",
      cumplido: pasado(finStacking),
      actual: false,
    });
  }

  const etd = parseOpDate(op.etd);
  const zarpado = estado.etapa !== "EN_ORIGEN";
  if (etd || zarpado) {
    eventos.push({
      codigo: "ZARPE",
      fecha: etd,
      lugar: pol,
      // El zarpe es "real" cuando el estado de la operación lo confirma, no solo por fecha.
      certeza: zarpado ? "CONFIRMADO" : "ESTIMADO",
      cumplido: zarpado,
      actual: false,
    });
  }

  if (decision?.estado === "confirmado") {
    eventos.push({
      codigo: "TRANSBORDO",
      fecha: null,
      lugar: decision.puerto ?? "",
      certeza: "CONFIRMADO",
      cumplido: true,
      actual: false,
    });
  } else if (estado.transbordoSospechado) {
    eventos.push({
      codigo: "TRANSBORDO",
      fecha: null,
      lugar: ais?.destination ?? "",
      certeza: "ESTIMADO",
      cumplido: false,
      actual: false,
    });
  }

  const enTransito =
    estado.etapa === "EN_TRANSITO" ||
    estado.etapa === "PROXIMO_DESTINO" ||
    estado.etapa === "POSIBLE_RETRASO" ||
    estado.etapa === "POSIBLE_TRANSBORDO" ||
    estado.etapa === "TRANSBORDO_CONFIRMADO";

  if (enTransito) {
    eventos.push({
      codigo: "TRANSITO",
      fecha: ais?.receivedAt ?? null,
      lugar: ais?.destination ? "" : "",
      certeza: ais ? "REAL" : "ESTIMADO",
      cumplido: false,
      actual: true,
    });
  }

  const eta = parseOpDate(op.eta);
  eventos.push({
    codigo: "ARRIBO",
    fecha: eta,
    lugar: pod,
    certeza: op.arribo_confirmado ? "CONFIRMADO" : "ESTIMADO",
    cumplido: Boolean(op.arribo_confirmado),
    actual: estado.etapa === "ARRIBADO",
  });

  return eventos;
}

/** Momento de la última actualización mostrable del embarque. */
export function ultimaActualizacion(journey: Journey, op: NavitrackOperacion): Date | null {
  return journey.position?.at ?? parseInstant(op.tracking_manual_updated_at);
}
