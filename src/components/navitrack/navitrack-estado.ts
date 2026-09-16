/**
 * Etapa del viaje, comparación de ETA, alertas y línea de tiempo.
 *
 * Separado del cálculo geográfico (`navitrack-model.ts`) porque esto es criterio
 * de negocio: cuándo un embarque "está por llegar", cuándo una diferencia de ETA
 * merece alarma y cuándo un destino AIS distinto insinúa un transbordo.
 */

import {
  yaZarpo,
  DAY_MS,
  HOUR_MS,
  haversineKm,
  mismoPuerto,
  parseInstant,
  parseOpDate,
  type AisSnapshot,
  type Journey,
  type LngLat,
  type NavitrackOperacion,
  type Tramo,
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
/**
 * Días antes del ETA en que el embarque pasa a "próximo a llegar".
 *
 * Uno: el aviso sale la víspera. Con cinco, siete de nueve embarques vivían
 * permanentemente en "próximo a destino" y el estado dejaba de distinguir nada.
 */
export const PROXIMO_DIAS = 1;
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

/**
 * Compara la llegada comprometida con la que anuncia el buque.
 *
 * **Solo tiene sentido si el buque va al puerto comprometido.** El ETA del AIS
 * es la llegada a su *próxima escala*, no al destino final: un barco que sale
 * de San Antonio hacia Hamburgo y anuncia Callao para el 14 de septiembre no
 * está llegando veintiséis días antes, está llegando a otro puerto.
 *
 * Restar esas dos fechas producía un adelanto enorme y falso, y lo peor no era
 * el número en pantalla sino que alimentaba la detección de retrasos.
 */
export function compararEta(op: NavitrackOperacion, ais: AisSnapshot | null): EtaComparada {
  const erp = parseOpDate(op.eta);
  const aisEta = ais?.eta ?? null;
  if (!erp || !aisEta) {
    return { erp, ais: aisEta, deltaHoras: null, severidad: "en_fecha" };
  }

  // Si declara otro puerto, su ETA no habla del destino: no hay nada que restar.
  if (destinoAisDiscrepa(op.pod, ais?.destination ?? null)) {
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
 * Ya no decide si se avisa: eso lo decide la fecha anunciada, porque el
 * operador quiere revisar **todas** las recaladas, también las que van en ruta.
 * Se conserva para presentarlas: una parada en ruta y un desvío evidente no
 * merecen el mismo tono en pantalla.
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

/**
 * Quién está mirando.
 *
 * `interna` es el personal de ASLI y ve el módulo completo. `cliente` es el
 * dueño de la carga, que entra a la misma pantalla en modo seguimiento.
 *
 * La diferencia no es de permisos —eso lo impone RLS— sino de criterio: al
 * cliente se le muestra lo que ya se sabe del viaje, no lo que ASLI todavía
 * está averiguando. Una sospecha de transbordo sale de comparar el destino que
 * la tripulación escribe a mano contra el POD; mostrarla antes de que alguien
 * la revise es anunciar un problema que la mayoría de las veces no existe.
 */
export type NavitrackVista = "interna" | "cliente";

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

/** Lo que hace falta saber de una recalada para decidir el estado. */
export type RecaladaEstado = { puerto: string; estado: string };

/** Una parada, para el historial: dónde fue, si consta y cuándo se anunció. */
export type RecaladaViaje = {
  puerto: string;
  estado?: string;
  eta_anunciada?: string | null;
  recalado_at?: string | null;
  zarpe_at?: string | null;
};

/** Días enteros de calendario entre dos fechas, en hora local. */
function diferenciaEnDias(desde: Date, hasta: Date): number {
  const a = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
  const b = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

export function resolverEstado(
  op: NavitrackOperacion,
  ais: AisSnapshot | null,
  journey: Journey,
  decision: TransbordoDecision | null,
  now = new Date(),
  recaladas: RecaladaEstado[] = [],
  vista: NavitrackVista = "interna",
): EstadoEmbarque {
  const eta = compararEta(op, ais);
  const etaDate = eta.erp;
  /*
   * Días de calendario hasta el ETA, no horas redondeadas.
   *
   * `operaciones.eta` es columna `date` y `parseOpDate` la sitúa a mediodía, así
   * que restando instantes la víspera del arribo daba 2 por la mañana y 1 desde
   * las 12:00: el mismo día, contado distinto según la hora. Con el umbral en
   * cinco días nadie lo notaba; con el aviso pegado a la víspera, decide si sale
   * o no. Se comparan los días, que es como lo cuenta una persona.
   */
  const diasParaEta = etaDate ? diferenciaEnDias(now, etaDate) : null;

  const posAt = journey.position?.at ?? null;
  const posicionAntigua =
    journey.position?.source === "AIS" &&
    posAt != null &&
    now.getTime() - posAt.getTime() > POSICION_ANTIGUA_HORAS * HOUR_MS;

  /*
   * Sospecha de transbordo: el destino declarado **y** que ya haya llegado.
   *
   * Que el buque declare otro puerto no es noticia por sí solo: va anunciando
   * su próxima escala durante todo el viaje. Un embarque a Génova que anuncia
   * Gioia Tauro con tres semanas de anticipación no tiene nada de anómalo, y
   * marcarlo "posible transbordo" durante veinte días entrena a cualquiera a
   * ignorar ese estado.
   *
   * La pregunta se abre el día que el buque dice que llega a ese puerto: ahí
   * es cuando o siguió viaje o cambió de barco, y alguien tiene que mirarlo.
   */
  const llegadaAnunciada = ais?.eta ?? null;
  const yaLlegoAlPuertoAnunciado =
    llegadaAnunciada == null || llegadaAnunciada.getTime() <= now.getTime();

  /*
   * Si el puerto que declara el buque ya se resolvió, no hay sospecha.
   *
   * Alguien miró esa recalada y dijo qué pasó ahí. Seguir mostrando "posible
   * transbordo" después de eso es ignorar la respuesta y pedirla de nuevo, que
   * es la forma más rápida de que las alertas dejen de creerse.
   *
   * La lista manda sobre el cálculo: una decisión humana pesa más que una
   * deducción a partir de fechas.
   */
  const declarado = normalizarPuerto(ais?.destination ?? null);
  /*
   * `transbordo_anunciado` cuenta como resuelto.
   *
   * Es una decisión humana igual que las otras dos: alguien miró la web de la
   * naviera y dijo qué pasa en ese puerto. Faltaba en esta lista, así que
   * después de registrar el transbordo la pantalla seguía mostrando "posible
   * transbordo detectado · verificar" sobre el puerto recién resuelto, que es
   * pedir de nuevo una respuesta ya dada.
   */
  const yaResuelto = recaladas.some(
    (r) =>
      (r.estado === "parada_programada" ||
        r.estado === "transbordo" ||
        r.estado === "transbordo_anunciado") &&
      declarado.length > 0 &&
      normalizarPuerto(r.puerto) === declarado,
  );
  // Una recalada vencida y sin responder es sospecha aunque el AIS ya no la declare.
  const hayPendiente = recaladas.some((r) => r.estado === "por_verificar");

  const sospecha =
    /*
     * El cliente no ve sospechas: para él, o el transbordo está confirmado o el
     * viaje sigue su curso. Se corta acá y no en la pantalla para que etapa,
     * alerta y color no puedan contradecirse entre sí más adelante.
     */
    vista === "interna" &&
    decision?.estado !== "descartado" &&
    !yaResuelto &&
    (hayPendiente ||
      (destinoAisDiscrepa(op.pod, ais?.destination ?? null) && yaLlegoAlPuertoAnunciado));
  const transbordoSospechado = sospecha && decision?.estado !== "confirmado";

  const etapa = ((): NavitrackEtapa => {
    if (op.arribo_confirmado) return "ARRIBADO";

    const codigo = normalizarEstado(op.estado_operacion);
    const meta = codigo ? ESTADO_META[codigo] : null;
    if (meta?.esFinal) return "ARRIBADO";

    if (!yaZarpo(op, now)) return "EN_ORIGEN";

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
  vista: NavitrackVista = "interna",
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

  /*
   * "No se conoce la coordenada de este puerto" es un aviso para quien mantiene
   * el catálogo, no para quien espera su carga: el cliente ve el puerto por su
   * nombre igual, y la nota de procedencia ya explica que la posición es
   * estimada.
   */
  if (vista === "interna" && (!journey.origen.coord || !journey.destino.coord)) {
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

/**
 * De dónde sale la certeza de un hito.
 *
 * `ANUNCIADO` no es un punto medio entre confirmado y estimado: es otra cosa.
 * Dice que el dato lo dio la naviera —puerto, fecha y nave— y que el hecho
 * todavía no ocurrió. Un transbordo así es más fiable que una estimación y, al
 * mismo tiempo, no puede contarse como pasado.
 */
export type EventoCerteza = "REAL" | "CONFIRMADO" | "ANUNCIADO" | "ESTIMADO";

export type EventoCodigo =
  | "STACKING"
  | "CORTE_DOCUMENTAL"
  | "FIN_STACKING"
  | "ZARPE"
  | "RECALADA"
  | "ANUNCIADO"
  | "PARADA"
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
  /** Nave que recibe la carga, en un transbordo. */
  nave?: string | null;
  /** Nave que la entrega. Sin esto el hito no dice de qué a qué. */
  naveAnterior?: string | null;
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
  tramos: Tramo[] = [],
  /**
   * Paradas que constan, de la base.
   *
   * El AIS solo informa la última, así que sin esta lista el historial olvida
   * cada puerto en cuanto el buque toca el siguiente: el cliente vería un
   * recorrido que se borra solo.
   */
  recaladas: RecaladaViaje[] = [],
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

  /*
   * Transbordos registrados.
   *
   * Cada cambio de nave entre tramos consecutivos es un hito del viaje: ahí la
   * carga se bajó de un barco y se subió a otro. Sin esto, el historial de un
   * embarque con tres buques contaba solo el zarpe del primero y el arribo del
   * último, como si hubiera sido directo.
   *
   * La fecha es la de llegada del tramo que termina, que es cuando la carga
   * tocó el puerto de conexión.
   */
  const cadena = [...tramos].sort((a, b) => a.orden - b.orden);
  for (let i = 1; i < cadena.length; i += 1) {
    const anterior = cadena[i - 1];
    const siguiente = cadena[i];
    // Mismo buque en los dos tramos: es una escala del itinerario, no un transbordo.
    if (!siguiente.nave || anterior.nave === siguiente.nave) continue;

    const cuando = parseOpDate(anterior.eta) ?? parseOpDate(siguiente.etd);
    eventos.push({
      codigo: "TRANSBORDO",
      fecha: cuando,
      lugar: siguiente.pol ?? anterior.pod ?? "",
      nave: siguiente.nave,
      naveAnterior: anterior.nave,
      /*
       * Manda el tramo que **empieza** aquí, no el que termina.
       *
       * El hito dice que la carga se pasó a la nave del tramo siguiente; si ese
       * tramo aún no es un hecho, el transbordo tampoco. Mirando el anterior,
       * un transbordo anunciado para dentro de dos semanas salía "confirmado"
       * solo porque el viaje en curso sí lo estaba.
       */
      certeza: !siguiente.confirmado
        ? "ANUNCIADO"
        : anterior.confirmado
          ? "CONFIRMADO"
          : "ESTIMADO",
      /*
       * Un transbordo anunciado nunca está cumplido, aunque la fecha calce.
       *
       * `cumplido` se decidía solo por fecha, y la del tramo que termina en el
       * puerto de conexión suele ser hoy mismo: el transbordo aparecía con el
       * tilde de hecho consumado y se ordenaba entre lo pasado, debajo del
       * arribo. Que la carga cambie de barco no lo dice el calendario; lo dice
       * el tramo siguiente, y mientras no esté confirmado no ocurrió.
       */
      cumplido: siguiente.confirmado && pasado(cuando),
      actual: false,
    });
  }

  if (cadena.length > 1) {
    // Con cadena registrada, la sospecha y la decisión vieja sobran.
  } else if (decision?.estado === "confirmado") {
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

  /*
   * Puertos donde el buque ya paró.
   *
   * El historial listaba los puertos que el buque **anuncia** y ninguno de los
   * que ya tocó: un embarque que pasó por Caucedo mostraba Rotterdam por
   * verificar y, del Caribe, nada.
   *
   * Salen de la base, no de la lectura: el AIS solo informa la última parada, y
   * leerla directo hacía que cada puerto desapareciera del historial en cuanto
   * el buque tocaba el siguiente. La lectura actual se suma igual, por si el
   * chequeo diario todavía no la anotó.
   *
   * Se descartan el origen y el destino, que ya tienen su propio hito.
   */
  const paradas: string[] = [];
  const sumarParada = (puerto: string | null | undefined) => {
    const nombre = (puerto ?? "").trim();
    if (!nombre) return;
    if (mismoPuerto(nombre, pol) || mismoPuerto(nombre, pod)) return;
    if (paradas.some((x) => mismoPuerto(x, nombre))) return;
    paradas.push(nombre);
  };

  for (const r of recaladas) {
    if (!r.recalado_at) continue; // Anunciada pero no visitada: no es historia.
    sumarParada(r.puerto);
  }
  if (zarpado) sumarParada(ais?.lastPort);

  /*
   * Las recaladas se ordenan por avance de ruta, no por cuándo las vimos.
   *
   * El proveedor alterna `lastPort` entre dos puertos para la misma lectura:
   * el GUAYAQUIL EXPRESS declaró Caucedo, después Posorja, después Caucedo otra
   * vez, todo con la misma posición. Anotando en el orden en que llegan, Posorja
   * —la primera escala del viaje— quedó registrada después de Cartagena y el
   * historial la mostraba como la más reciente.
   *
   * La ruta no se equivoca: lo que está más lejos del destino se tocó antes.
   * Los puertos que el catálogo no ubica conservan el orden en que se vieron,
   * que es lo único que se sabe de ellos.
   */
  const destinoCoord = (() => {
    const c = getPortCoordinates(pod);
    return c ? { lng: c[0], lat: c[1] } : null;
  })();
  if (destinoCoord) {
    const distancia = (puerto: string) => {
      const c = getPortCoordinates(puerto);
      return c ? haversineKm({ lng: c[0], lat: c[1] }, destinoCoord) : -1;
    };
    paradas.sort((a, b) => {
      const da = distancia(a);
      const db = distancia(b);
      if (da < 0 || db < 0) return 0;
      return db - da;
    });
  }

  for (const puerto of paradas) {
    eventos.push({
      codigo: "RECALADA",
      /*
       * Sin fecha, a propósito.
       *
       * Del AIS consta **que** el buque paró ahí, no cuándo: `atdUtc` no
       * acompaña a `lastPort` (ver `AisSnapshot`), y la hora en que lo leímos
       * es cuándo nos enteramos, no cuándo atracó. Poner cualquiera de las dos
       * con el sello REAL sería firmar como dato lo que es una suposición; el
       * hito se ordena igual, anclado al presente por estar cumplido.
       */
      fecha: null,
      lugar: puerto,
      certeza: "REAL",
      cumplido: true,
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

  /*
   * Puertos que el buque anunció y todavía no alcanza.
   *
   * Vivían solo en la caja de arriba de la pantalla, fuera de la línea de
   * tiempo, y ahí se leían al revés: un puerto anunciado para el 24-SEP
   * aparecía por encima del arribo del 01-OCT, o sea después de llegar al
   * destino. Son parte del recorrido y tienen fecha propia, así que van en el
   * historial, en el lugar que les toca.
   *
   * No se repite el que ya cuenta un transbordo: ahí el hito dice algo más
   * fuerte —que la carga cambia de barco— y duplicarlo sería listar dos veces
   * la misma parada diciendo dos cosas distintas.
   */
  const yaEnTransbordo = eventos
    .filter((e) => e.codigo === "TRANSBORDO")
    .map((e) => e.lugar)
    .filter(Boolean);

  for (const r of recaladas) {
    /*
     * Antes del zarpe no se anuncia nada.
     *
     * Lo que el buque declare mientras viene a buscar la carga pertenece a su
     * viaje de entrada. Pintarlo en el historial de este embarque le promete al
     * cliente una escala de un viaje que no es el suyo.
     */
    if (!zarpado) break;
    if (r.recalado_at) continue; // Ya pasó: es recalada, no anuncio.
    if (r.estado === "transbordo") continue;
    const puerto = (r.puerto ?? "").trim();
    if (!puerto) continue;
    if (mismoPuerto(puerto, pol) || mismoPuerto(puerto, pod)) continue;
    if (yaEnTransbordo.some((l) => mismoPuerto(l, puerto))) continue;
    if (paradas.some((x) => mismoPuerto(x, puerto))) continue;

    /*
     * Anunciado y decidido no son lo mismo.
     *
     * `parada_programada` la respondió una persona: el buque para ahí y la
     * carga sigue a bordo. Mostrarla como "puerto anunciado · estimado" —lo
     * que hacía— le quita el respaldo de esa decisión y la deja pareciendo una
     * suposición del AIS, que es justo lo contrario de lo que es.
     */
    const decidida = r.estado === "parada_programada";
    eventos.push({
      codigo: decidida ? "PARADA" : "ANUNCIADO",
      fecha: parseInstant(r.eta_anunciada),
      lugar: puerto,
      certeza: decidida ? "CONFIRMADO" : "ESTIMADO",
      cumplido: false,
      actual: false,
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

  /*
   * El historial se ordena por fecha, no por orden de construcción.
   *
   * Los hitos se empujan agrupados por tipo, y eso alcanzaba mientras todos
   * tuvieran fecha. El transbordo sospechado no la tiene —el AIS dice dónde,
   * no cuándo— y quedaba encajado entre "En tránsito" y el zarpe, o sea leído
   * como algo que ya pasó, cuando es justamente lo que falta por ocurrir.
   *
   * Lo que no tiene fecha se ancla al presente según lo único que se sabe de
   * él: si está cumplido cae del lado del pasado, y si no, del futuro.
   */
  /*
   * El presente lo marca el hito actual, no el reloj.
   *
   * "En tránsito" se fecha con la última lectura del AIS, que es de hace horas.
   * Anclando al reloj, una recalada sin fecha caía **después** de esa lectura y
   * el historial la mostraba encima: un puerto que el buque ya dejó atrás
   * leyéndose como lo último que pasó.
   */
  const presente = eventos.find((e) => e.actual)?.fecha?.getTime() ?? now.getTime();

  /*
   * La fecha ordena, pero no manda sobre lo ocurrido.
   *
   * Un puerto anunciado con la ETA vencida seguía teniendo fecha de hoy a las
   * 03:12 mientras la lectura de tránsito era de las 14:01, así que caía por
   * debajo y quedaba intercalado entre hechos cumplidos: Livorno, al que el
   * buque no ha llegado, aparecía antes de una recalada que sí ocurrió. Que una
   * previsión se atrase no la convierte en pasado.
   *
   * Entonces la fecha ordena **dentro** de su lado: lo cumplido por debajo del
   * presente, lo pendiente por encima. El hito actual es la frontera.
   */
  const clave = (ev: EventoViaje) => {
    if (ev.actual) return presente;
    const base = ev.fecha ? ev.fecha.getTime() : presente;
    return ev.cumplido ? Math.min(base, presente - 1) : Math.max(base, presente + 1);
  };

  /*
   * El arribo se queda al final pase lo que pase: es el cierre del viaje.
   * Ordenarlo por fecha mandaría el ETA vencido de un embarque retrasado al
   * medio del historial, diciendo que la carga llegó cuando sigue navegando.
   */
  const arribo = eventos.filter((e) => e.codigo === "ARRIBO");
  const resto = eventos.filter((e) => e.codigo !== "ARRIBO");
  resto.sort((a, b) => clave(a) - clave(b));

  return [...resto, ...arribo];
}

/** Momento de la última actualización mostrable del embarque. */
export function ultimaActualizacion(journey: Journey, op: NavitrackOperacion): Date | null {
  return journey.position?.at ?? parseInstant(op.tracking_manual_updated_at);
}
