"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import type { Locale } from "@/lib/i18n/translations";
import type { NeonTheme } from "@/lib/ui/neonTheme";
import { NavitrackMap } from "./NavitrackMap";
import { NavitrackJsonCrudo } from "./NavitrackJsonCrudo";
import { NavieraLogo } from "./NavieraLogo";
import { NavitrackCadena, NavitrackTimeline, NavitrackTransbordo } from "./NavitrackJourney";
import { isoDePais, isoDePuerto } from "./navitrack-banderas";
import type { ModoViaje, Recalada } from "./NavitrackItinerario";
import { desvioEta, estadoDesvio, formatoDesvio, sentidoDesvio } from "@/lib/operaciones/desvioEta";
import { fmtFecha, fmtFechaHora, fmtNm, fmtRelativo, interpolar } from "./navitrack-format";
import { formatearVelocidad, useUnidadVelocidad } from "./navitrack-velocidad";
import {
  parseOpDate,
  desvioAnuncio,
  mismoPuerto,
  type AisSnapshot,
  type Journey,
  type NaveIdent,
  type NavitrackOperacion,
  type Tramo,
} from "./navitrack-model";
import {
  ETAPA_META,
  formatearDelta,
  type Alerta,
  type EstadoEmbarque,
  type EventoViaje,
  type NavitrackEtapa,
  type TransbordoDecision,
} from "./navitrack-estado";

type Textos = Record<string, string>;

export const ETAPA_LABEL_KEY: Record<NavitrackEtapa, string> = {
  EN_ORIGEN: "etapaEnOrigen",
  EN_TRANSITO: "etapaEnTransito",
  PROXIMO_DESTINO: "etapaProximo",
  POSIBLE_TRANSBORDO: "etapaPosibleTransbordo",
  TRANSBORDO_CONFIRMADO: "etapaTransbordoConfirmado",
  POSIBLE_RETRASO: "etapaPosibleRetraso",
  ARRIBADO: "etapaArribado",
};

/** Frase corta bajo la etapa: dice qué está pasando, no solo cómo se llama. */
const ETAPA_SUB_KEY: Record<NavitrackEtapa, string> = {
  EN_ORIGEN: "subEnOrigen",
  EN_TRANSITO: "subEnTransito",
  PROXIMO_DESTINO: "subProximo",
  POSIBLE_TRANSBORDO: "subPosibleTransbordo",
  TRANSBORDO_CONFIRMADO: "subTransbordoConfirmado",
  POSIBLE_RETRASO: "subPosibleRetraso",
  ARRIBADO: "subArribado",
};

const ALERTA_TITULO: Record<string, string> = {
  RETRASO: "alertaRetraso",
  TRANSBORDO: "alertaTransbordo",
  POSICION_ANTIGUA: "alertaPosicionAntigua",
  SIN_POSICION: "alertaSinPosicion",
  SIN_RUTA: "alertaSinRuta",
};

const ALERTA_ICON: Record<string, string> = {
  RETRASO: "lucide:clock-alert",
  TRANSBORDO: "lucide:git-branch",
  POSICION_ANTIGUA: "lucide:satellite",
  SIN_POSICION: "lucide:radar",
  SIN_RUTA: "lucide:map-pin-off",
};

/** Cada severidad toma un acento del sistema; el rojo se reserva para lo crítico. */
const ALERTA_TONO: Record<string, string> = {
  info: "teal",
  atencion: "amber",
  critica: "rose",
};

/* --------------------------------- Piezas ---------------------------------- */

function Stat({
  icon,
  label,
  valor,
  sub,
  extra,
  className,
}: {
  icon: string;
  label: string;
  valor: React.ReactNode;
  sub?: string | null;
  extra?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`nt-stat ${className ?? ""}`}>
      <span className="nt-stat-icon">
        <Icon icon={icon} width={15} height={15} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="nt-stat-label block">{label}</span>
        <span className="nt-stat-value mt-0.5 block truncate tabular-nums">{valor}</span>
        {sub && <span className="nt-stat-sub mt-0.5 block truncate">{sub}</span>}
      </span>
      {extra}
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11.5px] font-bold uppercase tracking-wider text-dash-muted sm:text-[10px]">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-semibold text-dash-fg tabular-nums">
        {valor || "—"}
      </p>
    </div>
  );
}

/**
 * La velocidad, que cambia de unidad al hacer clic.
 *
 * El AIS habla en nudos y el ejecutivo también; el cliente que sigue su carga,
 * casi nunca. Es el mismo dato en otra escala, así que en vez de mostrar las dos
 * —y gastar el doble de ancho en una tarjeta que ya va apretada— se alterna.
 *
 * Es un `button` de verdad y no un `span` con `onClick`: así se alcanza con el
 * teclado y el lector de pantalla anuncia que hay algo que hacer acá.
 */
function Velocidad({ nudos, tr }: { nudos: number | null | undefined; tr: Textos }) {
  const { unidad, alternar } = useUnidadVelocidad();
  const texto = formatearVelocidad(nudos, unidad);
  if (texto == null) return <>—</>;
  return (
    <button
      type="button"
      onClick={alternar}
      title={tr.velocidadCambiarUnidad}
      aria-label={`${tr.velocidad} ${texto} — ${tr.velocidadCambiarUnidad}`}
      className="cursor-pointer rounded px-0.5 underline decoration-dotted decoration-dash-muted/60 underline-offset-[3px] transition-colors hover:text-dash-neon focus:outline-none focus-visible:ring-2 focus-visible:ring-dash-neon/60"
    >
      {texto}
    </button>
  );
}

/** Copia el identificador del embarque, que es lo que se pega en un correo. */
function BotonCopiar({ texto, tr }: { texto: string; tr: Textos }) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const id = window.setTimeout(() => setCopiado(false), 1800);
    return () => window.clearTimeout(id);
  }, [copiado]);

  const copiar = useCallback(() => {
    navigator.clipboard
      ?.writeText(texto)
      .then(() => setCopiado(true))
      .catch(() => {
        /* Sin permiso de portapapeles no se avisa nada: no es una acción crítica. */
      });
  }, [texto]);

  return (
    <button
      type="button"
      onClick={copiar}
      title={copiado ? tr.copiado : tr.copiar}
      aria-label={copiado ? tr.copiado : tr.copiar}
      className="motion-interactive shrink-0 rounded-md p-1 text-dash-muted transition-colors hover:text-dash-neon"
    >
      <Icon icon={copiado ? "lucide:check" : "lucide:copy"} width={15} height={15} aria-hidden />
    </button>
  );
}

/* --------------------------------- Vista ----------------------------------- */

type Pestana = "ruta" | "buque" | "escalas" | "transbordo";

export type Escala = {
  puerto: string | null;
  locode: string | null;
  arribo: string | null;
  zarpe: string | null;
};

type ShipmentProps = {
  /**
   * Vista del cliente: sigue su carga y no decide sobre ella.
   *
   * Apaga lo que resuelve o gasta —decidir una recalada, el flujo de
   * transbordo, traer escalas del proveedor— y deja la pizarra completa: dónde
   * va, cuándo llega y qué ha pasado hasta ahora.
   */
  soloLectura?: boolean;
  /**
   * Puede consultar al proveedor AIS, o sea gastar créditos. Solo el superadmin.
   *
   * Es un eje distinto de `soloLectura`: un ejecutivo decide sobre el viaje pero
   * no gasta, así que ve la pizarra completa sin la pestaña de escalas.
   */
  puedeGastar?: boolean;
  /** Tramos del viaje. Vacío = viaje directo. */
  tramos: Tramo[];
  /** Puertos por donde pasa o pasará la carga, con lo que consta de cada uno. */
  recaladas: Recalada[];
  /** Itinerario cargado: directo o con transbordo. Null si nadie lo indicó. */
  modoViaje: ModoViaje | null;
  /**
   * Abre la ventana del itinerario. `foco` resalta un transbordo, cuando se
   * abre porque la carga llegó a él sin que se sepa a qué nave pasa.
   * Ausente para quien no decide.
   */
  onEditarItinerario?: (foco?: string | null) => void;
  /** Abre la carga manual de posición. Ausente para quien no edita. */
  onCargarCoords?: () => void;
  /** Resultado de la última decisión, para confirmarla en pantalla. */
  avisoRecalada: string | null;
  op: NavitrackOperacion;
  ais: AisSnapshot | null;
  /** La lectura del proveedor sin traducir, para el botón "Ver JSON". */
  aisCrudo: { crudo: Record<string, unknown> | null; consultadoAt: string | null } | null;
  journey: Journey;
  estado: EstadoEmbarque;
  alertas: Alerta[];
  eventos: EventoViaje[];
  decision: TransbordoDecision | null;
  navieraLogoUrl: string | null;
  /** IMO/MMSI del catálogo, para la ficha del buque. */
  naveIdent: NaveIdent | null;
  /** Escalas guardadas del buque; se piden al proveedor con un botón aparte. */
  escalas: Escala[];
  escalasCargando: boolean;
  escalasEdadH: number | null;
  escalasPuedeConsultar: boolean;
  onTraerEscalas: () => void;
  locale: Locale;
  theme: NeonTheme;
  tr: Textos;
  onBack: () => void;
  onRefresh: () => void;
  refrescando: boolean;
  /** Posición dentro de la lista visible, para moverse sin volver atrás. */
  indiceEnLista: number;
  totalEnLista: number;
  onAnterior: () => void;
  onSiguiente: () => void;
  transbordoGuardando: boolean;
  transbordoError: string | null;
  onConfirmarTransbordo: () => void;
  onDescartarTransbordo: () => void;
};

/**
 * Pizarra del embarque: todo en una pantalla, sin scroll de página.
 *
 * El alto se reparte con flex y `min-h-0`: encabezado, franja de indicadores y
 * nota son fijos, y el bloque central (mapa + columna derecha) se queda con lo
 * que sobra. Lo único que puede desplazarse por dentro es la historia del viaje,
 * que es la lista de largo variable. Bajo `lg` la pizarra no cabe y la vista
 * vuelve a ser una columna con scroll, que es lo honesto en un teléfono.
 */
export function NavitrackShipment({
  soloLectura = false,
  puedeGastar = false,
  op,
  ais,
  aisCrudo,
  journey,
  estado,
  alertas,
  tramos,
  recaladas,
  modoViaje,
  onEditarItinerario,
  onCargarCoords,
  avisoRecalada,
  eventos,
  decision,
  navieraLogoUrl,
  naveIdent,
  escalas,
  escalasCargando,
  escalasEdadH,
  escalasPuedeConsultar,
  onTraerEscalas,
  locale,
  theme,
  tr,
  onBack,
  onRefresh,
  refrescando,
  indiceEnLista,
  totalEnLista,
  onAnterior,
  onSiguiente,
  transbordoGuardando,
  transbordoError,
  onConfirmarTransbordo,
  onDescartarTransbordo,
}: ShipmentProps) {
  const meta = ETAPA_META[estado.etapa];
  const enCurso = estado.etapa !== "ARRIBADO" && estado.etapa !== "EN_ORIGEN";
  /*
   * La pestaña de transbordo es el lugar donde se decide, así que no existe
   * para el cliente. Que la carga cambió de buque sí lo ve: la cadena de
   * tramos en "Información del buque" y la historia del viaje lo cuentan.
   */
  const mostrarTransbordo =
    !soloLectura && (estado.transbordoSospechado || decision?.estado === "confirmado");

  const [pestana, setPestana] = useState<Pestana>("ruta");
  const [jsonAbierto, setJsonAbierto] = useState(false);
  // Si la sospecha se resuelve estando en esa pestaña, no dejar una vista vacía.
  useEffect(() => {
    if (pestana === "transbordo" && !mostrarTransbordo) setPestana("ruta");
  }, [pestana, mostrarTransbordo]);

  const relativos = {
    haceMenosDeUnMinuto: tr.haceMenosDeUnMinuto,
    haceMinutos: tr.haceMinutos,
    haceHoras: tr.haceHoras,
    haceDias: tr.haceDias,
    haceUnMinuto: tr.haceUnMinuto,
    haceUnaHora: tr.haceUnaHora,
    haceUnDia: tr.haceUnDia,
  };
  const actualizado = fmtRelativo(journey.position?.at ?? null, relativos);
  const actualizadoExacto = fmtFechaHora(journey.position?.at ?? null, locale);

  const etaErp = fmtFecha(estado.eta.erp, locale);
  const etaAis = fmtFechaHora(estado.eta.ais, locale);
  const delta = estado.eta.deltaHoras != null ? formatearDelta(estado.eta.deltaHoras) : null;
  const etaTono =
    estado.eta.severidad === "alta" ? "rose" : estado.eta.severidad === "leve" ? "amber" : "teal";

  const titulo = op.contenedor || op.booking || op.ref_asli || tr.embarque;
  /*
   * Sin avance calculado no se muestra un cero.
   *
   * `progress` viene en null mientras la primera lectura AIS está en vuelo, y
   * un 0 % ahí afirma que la carga no se ha movido, que es tan falso como el
   * 105 % que se mostraba antes. La barra queda vacía y el número, en guion.
   */
  const pct = journey.progress?.pct ?? null;
  const restantes = fmtNm(journey.remainingNm, locale);
  /*
   * Tramo en curso: el primero cuya llegada todavía no pasó.
   *
   * De él salen el último y el próximo puerto que se muestran arriba. En un
   * viaje directo no hay tramos y todo cae en los datos de la operación.
   */
  const tramoEnCurso = (() => {
    if (!tramos.length) return null;
    const hoy = new Date().toISOString().slice(0, 10);
    const ordenados = [...tramos].sort((a, b) => a.orden - b.orden);
    return ordenados.find((t) => !(t.eta && t.eta < hoy)) ?? ordenados[ordenados.length - 1];
  })();

  /*
   * Tramo inicial, y solo cuando hay cadena.
   *
   * En un viaje directo la nave inicial **es** la actual, y repetirla sería una
   * tarjeta que ocupa lugar sin decir nada. La tarjeta aparece justo cuando la
   * pregunta "¿en qué barco salió?" deja de tener la misma respuesta que "¿en
   * cuál va?".
   */
  /*
   * Cuánto se desvió un tramo respecto de lo anunciado.
   *
   * La naviera anuncia en UTC y casi nunca acierta: el atraque depende del
   * clima y de que haya sitio en el puerto. Lo anunciado no se pisa nunca —es
   * la promesa contra la que se mide—, y la llegada real la deja el AIS solo,
   * sin gastar créditos ni pedirle nada a nadie.
   *
   * Sin hora anunciada se dice en días: "+13 h" contra un anuncio que solo dijo
   * "el 20" sería inventar una precisión que el dato no tiene.
   */
  const desvioDe = (t: { pod: string | null; eta: string | null; eta_hora: string | null }): string | null => {
    const llegada = recaladas.find((r) => mismoPuerto(r.puerto, t.pod) && r.recalado_at)?.recalado_at;
    const d = desvioAnuncio(t.eta, t.eta_hora, llegada ?? null);
    if (!d) return null;
    if (d.soloDias) {
      const dias = Math.round(d.horas / 24);
      return dias === 0 ? tr.recaladaEnFecha : `${dias > 0 ? "+" : ""}${dias} d`;
    }
    const h = Math.round(d.horas);
    return h === 0 ? tr.recaladaEnFecha : `${h > 0 ? "+" : ""}${h} h`;
  };

  const hayCadena = tramos.length > 1;
  const tramoInicial = hayCadena
    ? [...tramos].sort((a, b) => a.orden - b.orden)[0]
    : null;

  /*
   * Próximo puerto: lo que el buque declara ahora mismo.
   *
   * Se prefiere la lectura del AIS porque es la más reciente; si no la hay, el
   * primer puerto anotado donde el buque todavía no estuvo, que es el mismo
   * dato guardado.
   */
  const proximoPuerto = (() => {
    const pendiente = recaladas.find((r) => !r.recalado_at);
    const nombre = (ais?.destination ?? pendiente?.puerto ?? "").trim();
    if (!nombre) return null;
    const eta = ais?.destination && ais?.eta
      ? ais.eta
      : pendiente?.eta_anunciada
        ? new Date(pendiente.eta_anunciada)
        : null;
    return { nombre, eta };
  })();

  /*
   * Los transbordos del itinerario, con lo anunciado y lo real de cada uno.
   *
   * Cada transbordo es el punto donde termina un tramo y empieza el siguiente:
   * del que termina sale la llegada anunciada; del que empieza, la nave que
   * recibe la carga. Lo real —cuándo llegó y cuándo zarpó el buque— lo deja el
   * AIS en las recaladas, sin gastar nada.
   */
  const hoyISO = new Date().toISOString().slice(0, 10);
  const transbordosDelViaje = (() => {
    const t = [...tramos].sort((a, b) => a.orden - b.orden);
    const salida: {
      puerto: string;
      nave: string | null;
      naveAnterior: string | null;
      llegada: string | null;
      llegadaHora: string | null;
      real: Recalada | null;
      llego: boolean;
    }[] = [];
    for (let i = 1; i < t.length; i += 1) {
      const puerto = (t[i].pol ?? t[i - 1].pod ?? "").trim();
      if (!puerto) continue;
      const real = recaladas.find((r) => mismoPuerto(r.puerto, puerto)) ?? null;
      salida.push({
        puerto,
        nave: t[i].nave,
        naveAnterior: t[i - 1].nave,
        llegada: t[i - 1].eta,
        llegadaHora: t[i - 1].eta_hora,
        real,
        // Llegó si el AIS lo vio ahí, o si ya pasó la fecha que anunció la naviera.
        llego: Boolean(real?.recalado_at) || Boolean(t[i - 1].eta && t[i - 1].eta! <= hoyISO),
      });
    }
    return salida;
  })();

  /** El primer transbordo al que llegó la carga sin que se sepa a qué nave pasa. */
  const faltaNaveEn = transbordosDelViaje.find((x) => !x.nave && x.llego) ?? null;

  /*
   * Lo que la ficha le pide a quien decide. Es una sola cosa a la vez, y la
   * más urgente primero: una carga en el transbordo sin nave no tiene a quién
   * seguirse; un embarque sin itinerario, solo no sabe todavía qué preguntar.
   */
  const pendienteItinerario =
    !soloLectura && onEditarItinerario && estado.etapa !== "ARRIBADO"
      ? faltaNaveEn
        ? { texto: interpolar(tr.itPendienteNave, { puerto: faltaNaveEn.puerto }), foco: faltaNaveEn.puerto }
        : modoViaje == null
          ? { texto: tr.itSinDefinir, foco: null }
          : null
      : null;

  const banderaPol = isoDePuerto(op.pol);
  const etdFmt = fmtFecha(parseOpDate(op.etd), locale);
  const banderaPod = isoDePais(op.pais) ?? isoDePuerto(op.pod);
  const esReal = journey.position?.source === "AIS";

  // La historia se lee de lo más reciente a lo más antiguo, como un registro.
  const eventosRecientes = [...eventos].reverse();

  const mapLabels = {
    origen: tr.origen,
    destino: tr.destino,
    posicionReal: tr.posicionReal,
    posicionEstimada: tr.posicionEstimada,
    recorrido: tr.legendaRecorrido,
    restante: tr.legendaRestante,
    puerto: tr.legendaPuerto,
    cargando: tr.mapaCargando,
    sinWebgl: tr.mapaSinWebgl,
    sinRuta: tr.mapaSinRuta,
    pantallaCompleta: tr.pantallaCompleta,
    salirPantallaCompleta: tr.salirPantallaCompleta,
    acercarBuque: tr.mapaAcercarBuque,
    verRuta: tr.mapaVerRuta,
  };

  const pestanas: { id: Pestana; label: string; icon: string }[] = [
    { id: "ruta", label: tr.tabRuta, icon: "lucide:map" },
    { id: "buque", label: tr.tabBuque, icon: "lucide:ship" },
    // Escalas le pide al proveedor el historial del buque: es la consulta más
    // cara del plan, así que la ve quien puede gastarla.
    ...(puedeGastar
      ? [{ id: "escalas" as const, label: tr.tabEscalas, icon: "lucide:anchor" }]
      : []),
    ...(mostrarTransbordo
      ? [{ id: "transbordo" as const, label: tr.evTransbordo, icon: "lucide:git-branch" }]
      : []),
  ];

  return (
    <div className="motion-view-section flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 pb-5 sm:gap-2 sm:p-2.5 lg:overflow-hidden">
      {/* Barra superior: salir del detalle y refrescar. */}
      <div className="flex shrink-0 items-center justify-between gap-2 max-sm:order-1">
        <button
          type="button"
          onClick={onBack}
          className="motion-interactive inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[12.5px] font-semibold text-dash-muted transition-colors hover:text-dash-fg"
        >
          <Icon icon="lucide:arrow-left" width={16} height={16} aria-hidden />
          <span className="max-sm:sr-only">{tr.volverEmbarques}</span>
        </button>
        <div className="flex items-center gap-2">
          {/* Recorrer la lista sin volver a ella: es el gesto de revisar la flota. */}
          {indiceEnLista >= 0 && totalEnLista > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onAnterior}
                disabled={indiceEnLista <= 0}
                title={tr.anteriorEmbarque}
                aria-label={tr.anteriorEmbarque}
                className="dash-control motion-interactive inline-flex h-9 w-9 items-center justify-center disabled:opacity-35 sm:h-7 sm:w-7"
              >
                <Icon icon="lucide:chevron-left" width={15} height={15} aria-hidden />
              </button>
              <span className="min-w-[3.5rem] text-center text-[12.5px] font-semibold text-dash-muted tabular-nums sm:min-w-[4.5rem] sm:text-[11px]">
                {interpolar(tr.posicionLista, {
                  i: String(indiceEnLista + 1),
                  n: String(totalEnLista),
                })}
              </span>
              <button
                type="button"
                onClick={onSiguiente}
                disabled={indiceEnLista >= totalEnLista - 1}
                title={tr.siguienteEmbarque}
                aria-label={tr.siguienteEmbarque}
                className="dash-control motion-interactive inline-flex h-9 w-9 items-center justify-center disabled:opacity-35 sm:h-7 sm:w-7"
              >
                <Icon icon="lucide:chevron-right" width={15} height={15} aria-hidden />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={refrescando}
            className="dash-control motion-interactive inline-flex items-center gap-1.5 px-2.5 py-2 text-[12px] font-semibold disabled:opacity-60"
          >
            <Icon
              icon="lucide:refresh-cw"
              width={14}
              height={14}
              className={refrescando ? "animate-spin" : ""}
              aria-hidden
            />
            <span className="max-sm:sr-only">{tr.refresh}</span>
          </button>

          {/*
            * Solo personal interno: es la respuesta cruda del proveedor, sin
            * traducir. Muestra la última lectura ya guardada; no gasta nada.
            */}
          {!soloLectura && (
            <button
              type="button"
              onClick={() => setJsonAbierto(true)}
              title={tr.jsonTitulo}
              className="dash-control motion-interactive inline-flex items-center gap-1.5 px-2.5 py-2 text-[12px] font-semibold"
            >
              <Icon icon="lucide:code-2" width={14} height={14} aria-hidden />
              <span className="max-sm:sr-only">{tr.jsonBoton}</span>
            </button>
          )}
        </div>
      </div>

      {/* Encabezado: identidad, etapa y avance en una sola lectura. */}
      <header
        className={`dash-card dash-card-static nt-tone--${meta.tono} shrink-0 px-3.5 py-3 max-sm:order-2 max-sm:px-4 max-sm:py-4`}
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 max-sm:flex-col max-sm:items-stretch">
          <div className="flex min-w-0 flex-1 items-center gap-3 max-sm:w-full">
            <NavieraLogo nombre={op.naviera} logoUrl={navieraLogoUrl} size={44} />
            <div className="min-w-0">
              <p className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-dash-muted sm:text-[10px]">
                {tr.embarque}
              </p>
              <div className="flex items-center gap-1.5">
                <h1 className="dash-title truncate text-xl font-extrabold tracking-tight sm:text-2xl">
                  {titulo}
                </h1>
                <BotonCopiar texto={titulo} tr={tr} />
              </div>
              {/* Booking y cliente son lo que se busca al identificar un embarque:
                  van con etiqueta y valor destacado, no fundidos en una línea gris.
                  La naviera no se repite acá porque ya la dice su marca al lado. */}
              <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-0.5 max-sm:flex-col max-sm:items-start">
                {op.booking && (
                  <span className="inline-flex min-w-0 items-baseline gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-dash-muted sm:text-[9.5px]">
                      {tr.booking}
                    </span>
                    <span className="truncate text-[13.5px] font-bold text-dash-fg tabular-nums">
                      {op.booking}
                    </span>
                  </span>
                )}
                {op.cliente && (
                  <span className="inline-flex min-w-0 items-baseline gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-dash-muted sm:text-[9.5px]">
                      {tr.cliente}
                    </span>
                    <span className="truncate text-[13.5px] font-bold text-dash-fg">
                      {op.cliente}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0 max-sm:w-full">
            {/*
              * El estado es el punto de entrada a la decisión.
              *
              * Cuando hay una recalada por verificar, lo que la pantalla está
              * afirmando es discutible, así que el propio estado se vuelve el
              * botón para resolverlo: es donde el operador ya está mirando.
              */}
            {pendienteItinerario ? (
              <button
                type="button"
                onClick={() => onEditarItinerario?.(pendienteItinerario.foco)}
                className="motion-interactive block cursor-pointer"
                title={tr.itDefinir}
              >
                <span className="nt-stage">
                  <span className="nt-stage-icon !h-6 !w-6">
                    <Icon icon={meta.icon} width={13} height={13} aria-hidden />
                  </span>
                  {tr[ETAPA_LABEL_KEY[estado.etapa]]}
                  <Icon icon="lucide:pencil" width={12} height={12} className="opacity-70" aria-hidden />
                </span>
                <span className="mt-1 block max-w-[220px] truncate text-center text-[11px] font-semibold text-amber-400">
                  {pendienteItinerario.texto}
                </span>
              </button>
            ) : (
              <>
                <span className="nt-stage">
                  {enCurso ? (
                    <span className="nt-live-dot" aria-hidden />
                  ) : (
                    <span className="nt-stage-icon !h-6 !w-6">
                      <Icon icon={meta.icon} width={13} height={13} aria-hidden />
                    </span>
                  )}
                  {tr[ETAPA_LABEL_KEY[estado.etapa]]}
                </span>
                <p className="mt-1 text-center text-[12.5px] text-dash-muted sm:text-[11px]">
                  {tr[ETAPA_SUB_KEY[estado.etapa]]}
                </p>
              </>
            )}
          </div>

          <div className="min-w-[min(100%,260px)] flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[12.5px] text-dash-muted">
                <span className="nt-accent-fg text-base font-extrabold tabular-nums">
                  {pct == null ? "—" : `${pct}%`}
                </span>{" "}
                {tr.delTrayecto}
              </p>
              {restantes && (
                <p className="text-[12.5px] font-semibold text-dash-muted tabular-nums sm:text-[11px]">
                  {interpolar(tr.restanNm, { nm: restantes })}
                </p>
              )}
            </div>
            <div className="nt-head-rail mt-1.5">
              <div className="nt-head-rail-fill" style={{ width: `${pct ?? 0}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-dash-border pt-2.5">
          <p className="flex min-w-0 items-center gap-2 text-[14px] font-bold text-dash-fg">
            {/* SVG, no emoji: en Windows el emoji de bandera se ve como "CL". */}
            {banderaPol && (
              <Icon icon={`circle-flags:${banderaPol.toLowerCase()}`} width={15} height={15} aria-hidden />
            )}
            <span className="truncate">{journey.origen.nombre || "—"}</span>
            <Icon icon="lucide:arrow-right" width={15} height={15} className="shrink-0 text-dash-muted" aria-hidden />
            {banderaPod && (
              <Icon icon={`circle-flags:${banderaPod.toLowerCase()}`} width={15} height={15} aria-hidden />
            )}
            <span className="truncate">{journey.destino.nombre || "—"}</span>
          </p>
          {etaErp && (
            <p className="flex items-baseline gap-1.5">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-dash-muted sm:text-[10px]">
                {tr.colEta}
              </span>
              <span className="text-[14px] font-extrabold text-dash-fg tabular-nums">{etaErp}</span>
            </p>
          )}
          {op.viaje && (
            <p className="text-[12.5px] text-dash-muted sm:text-[11.5px]">
              {tr.viaje} <span className="font-semibold text-dash-fg">{op.viaje}</span>
            </p>
          )}
        </div>
      </header>

      {/*
        * Bloque central: se queda con el alto que sobra.
        *
        * `flex-1 min-h-0` es lo que sostiene la pizarra de escritorio, donde no
        * hay scroll de página y este bloque absorbe el alto sobrante. En el
        * teléfono la vista es una columna con scroll, y ahí esa misma pareja
        * autoriza a encogerse por debajo del contenido: el mapa pedía 52dvh y
        * la tarjeta, que recorta, lo dejaba en una franja. Bajo `sm` toma su
        * alto natural y el scroll hace el resto.
        */}
      <div className="grid grid-cols-1 gap-3 max-sm:order-4 sm:min-h-0 sm:flex-1 sm:gap-2 lg:grid-cols-[1.6fr_1fr]">
        <section className="dash-card dash-card-static flex flex-col overflow-hidden sm:min-h-0">
          <div className="dash-section-head flex shrink-0 items-center gap-1 overflow-x-auto px-2 py-1.5">
            {pestanas.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={pestana === p.id}
                onClick={() => setPestana(p.id)}
                className="nt-tab"
              >
                <Icon icon={p.icon} width={14} height={14} aria-hidden />
                {p.label}
              </button>
            ))}
          </div>

          {pestana === "ruta" && (
            <div className="relative h-[52dvh] min-h-[300px] w-full shrink-0 lg:h-auto lg:min-h-0 lg:flex-1">
              <NavitrackMap
                journey={journey}
                vesselName={journey.naveActual ?? op.nave ?? ""}
                vesselSpeed={ais?.speed ?? null}
                theme={theme}
                labels={mapLabels}
              />
            </div>
          )}

          {pestana === "buque" && (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5">
              <div className="flex items-center gap-3">
                <NavieraLogo nombre={op.naviera} logoUrl={navieraLogoUrl} size={40} />
                <div className="min-w-0">
                  {/* La nave que lleva la carga ahora, que con transbordo no es `op.nave`. */}
                  <p className="truncate text-lg font-extrabold tracking-tight text-dash-fg">
                    {journey.naveActual || op.nave || "—"}
                  </p>
                  <p className="truncate text-[12px] text-dash-muted">
                    {op.naviera || "—"}
                    {journey.viajeActual ? ` · ${journey.viajeActual}` : ""}
                  </p>
                </div>
              </div>

              <NavitrackCadena escalas={journey.escalas} tramoActual={journey.tramoActual} tr={tr} />

              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5 border-t border-dash-border pt-3.5 sm:grid-cols-3">
                <Dato label="IMO" valor={naveIdent?.imo ?? null} />
                <Dato label="MMSI" valor={naveIdent?.mmsi ?? null} />
                <Dato label={tr.viaje} valor={op.viaje} />
                <Dato label={tr.velocidad} valor={<Velocidad nudos={ais?.speed} tr={tr} />} />
                <Dato
                  label={tr.rumbo}
                  valor={ais?.course != null ? `${Math.round(ais.course)}°` : null}
                />
                <Dato label={tr.destinoAis} valor={ais?.destination ?? null} />
                <Dato label={tr.ultimoPuerto} valor={ais?.lastPort ?? null} />
                <Dato label={tr.booking} valor={op.booking} />
                <Dato label={tr.naviera} valor={op.naviera} />
              </div>

              {!ais && (
                <p className="mt-3.5 border-t border-dash-border pt-3.5 text-[11.5px] leading-snug text-dash-muted">
                  {/* Cerrado el viaje no se consulta al proveedor: el buque ya anda en otro. */}
                  {estado.etapa === "ARRIBADO" ? tr.buqueViajeCerrado : tr.buqueSinAis}
                </p>
              )}
            </div>
          )}

          {pestana === "escalas" && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-dash-border px-4 py-2.5">
                <p className="text-[12.5px] text-dash-muted sm:text-[11.5px]">
                  {escalas.length === 0
                    ? tr.escalasVacio
                    : escalasEdadH == null
                      ? tr.escalasRecien
                      : interpolar(tr.escalasGuardadas, { h: String(escalasEdadH) })}
                </p>
                {escalasPuedeConsultar ? (
                  <button
                    type="button"
                    onClick={onTraerEscalas}
                    disabled={escalasCargando}
                    className="dash-cta motion-interactive inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-[11.5px] disabled:opacity-60"
                  >
                    <Icon
                      icon={escalasCargando ? "lucide:loader-2" : "lucide:download"}
                      width={13}
                      height={13}
                      className={escalasCargando ? "animate-spin" : ""}
                      aria-hidden
                    />
                    {escalasCargando
                      ? tr.escalasConsultando
                      : escalas.length === 0
                        ? tr.escalasTraer
                        : tr.escalasActualizar}
                  </button>
                ) : (
                  <p className="text-[12.5px] text-dash-muted sm:text-[11px]">{tr.escalasNoSeguida}</p>
                )}
              </div>

              {/* El endpoint del proveedor es de historial: no trae escalas futuras. */}
              <p className="shrink-0 px-4 pt-2.5 text-[11px] leading-snug text-dash-muted">
                {tr.escalasLeyenda}
              </p>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                {escalas.length === 0 ? (
                  <p className="py-8 text-center text-[12.5px] text-dash-muted">{tr.escalasSinDatos}</p>
                ) : (
                  <ol className="space-y-0">
                    {escalas.map((e, i) => {
                      const arribo = fmtFechaHora(e.arribo ? new Date(e.arribo) : null, locale);
                      const zarpe = fmtFechaHora(e.zarpe ? new Date(e.zarpe) : null, locale);
                      const enPuerto = Boolean(e.arribo && !e.zarpe);
                      return (
                        <li key={`${e.locode ?? ""}-${e.arribo ?? i}`} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span className={`nt-tl-dot ${enPuerto ? "nt-tl-dot--now" : "nt-tl-dot--done"}`}>
                              <Icon icon="lucide:anchor" width={11} height={11} aria-hidden />
                            </span>
                            {i < escalas.length - 1 && <span className="nt-tl-line nt-tl-line--done" />}
                          </div>
                          <div className={`min-w-0 flex-1 ${i < escalas.length - 1 ? "pb-3.5" : ""}`}>
                            <div className="flex flex-wrap items-center gap-x-2">
                              <p className="truncate text-[13px] font-bold text-dash-fg">
                                {e.puerto || e.locode || "—"}
                              </p>
                              {e.locode && (
                                <span className="nt-certainty nt-certainty--real">{e.locode}</span>
                              )}
                              {enPuerto && <span className="nt-certainty">{tr.escalasEnPuerto}</span>}
                            </div>
                            <p className="mt-0.5 text-[12.5px] text-dash-muted sm:text-[11.5px] tabular-nums">
                              {[
                                arribo ? `${tr.escalasArribo} ${arribo}` : null,
                                zarpe ? `${tr.escalasZarpe} ${zarpe}` : null,
                              ]
                                .filter(Boolean)
                                .join("  ·  ") || "—"}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </div>
          )}

          {pestana === "transbordo" && (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5">
              <NavitrackTransbordo
                naveActual={op.nave ?? ""}
                puerto={ais?.destination ?? decision?.puerto ?? ""}
                naveSiguiente={decision?.nave_siguiente ?? null}
                decision={decision}
                guardando={transbordoGuardando}
                error={transbordoError}
                onConfirmar={onConfirmarTransbordo}
                onDescartar={onDescartarTransbordo}
                onVerificar={() => onEditarItinerario?.(ais?.destination ?? null)}
                tr={tr}
              />
            </div>
          )}
        </section>

        <div className="flex min-h-0 min-w-0 flex-col gap-2">
          {/* Llegada estimada: el dato más consultado, con su contraste al lado. */}
          <section className={`dash-card dash-card-static nt-tone--${etaTono} shrink-0 overflow-hidden`}>
            <div className="dash-section-head flex items-center gap-2 px-3.5 py-2">
              <Icon icon="lucide:calendar-clock" width={14} height={14} className="text-dash-neon" aria-hidden />
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-dash-fg">
                {tr.llegadaEstimada}
              </h2>
            </div>
            <div className="flex flex-wrap items-start justify-between gap-3 px-3.5 py-3 max-sm:flex-col max-sm:gap-2.5">
              <div className="min-w-0">
                <p className="text-xl font-extrabold leading-none tracking-tight text-dash-fg tabular-nums">
                  {etaErp ?? "—"}
                </p>
                <p className="mt-1 truncate text-[12.5px] text-dash-muted sm:text-[11.5px]">
                  {[journey.destino.nombre, op.pais].filter(Boolean).join(", ") || "—"}
                </p>
              </div>
              {etaAis && (
                <div className="shrink-0 text-right max-sm:w-full max-sm:border-t max-sm:border-dash-border max-sm:pt-2.5 max-sm:text-left">
                  {/*
                    * La etiqueta nombra el puerto al que se refiere esa hora.
                    *
                    * "ETA del buque" a secas, junto al ETA de Hamburgo, se lee
                    * como si ambas fechas hablaran del mismo destino. Y no:
                    * mientras el buque anuncia Callao, esa hora es la llegada a
                    * Callao. Sin el puerto al lado, el dato engaña.
                    */}
                  <p className="text-[11.5px] font-bold uppercase tracking-wider text-dash-muted sm:text-[10px]">
                    {proximoPuerto && estado.eta.deltaHoras == null
                      ? `${tr.etaAisA} ${proximoPuerto.nombre}`
                      : tr.etaAis}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <p className="text-[13.5px] font-bold text-dash-fg tabular-nums sm:text-[12.5px]">
                      {etaAis}
                    </p>
                    {delta && (
                      <span className="nt-accent-fg inline-block rounded-md border border-[color-mix(in_srgb,var(--nt-accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--nt-accent)_14%,transparent)] px-1.5 py-0.5 text-[11.5px] font-extrabold tabular-nums">
                        {delta}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/*
              * Prometido contra real.
              *
              * Solo aparece cuando el embarque arribó con fecha: antes no hay
              * nada que comparar, y un cero mientras navega se leería como que
              * va en hora. Las dos referencias van juntas a propósito —la
              * promesa de la reserva y el ETA vigente— porque el segundo suele
              * haberse movido detrás del primero, y esa distancia es la que
              * explica por qué un atraso grande no se vio venir.
              */}
            {(() => {
              const d = desvioEta(op);
              if (!d) return null;
              const sentido = sentidoDesvio(d.dias);
              /* `parseOpDate` sitúa a mediodía: una columna `date` no se corre
                 de día por zona horaria, y `arribo_at` ya viene a mediodía. */
              const fecha = (v: string | null) => fmtFecha(parseOpDate(v), locale) ?? "—";
              const fila = (etiqueta: string, valor: string, extra?: string) => (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-dash-muted">
                    {etiqueta}
                  </span>
                  <span className="min-w-0 text-right">
                    <span className="text-[13px] font-bold text-dash-fg tabular-nums">{valor}</span>
                    {extra && (
                      <span className="ml-1.5 text-[11.5px] text-dash-muted tabular-nums">{extra}</span>
                    )}
                  </span>
                </div>
              );

              return (
                <div className="border-t border-dash-border px-3.5 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-dash-muted">
                    {tr.desvioTitulo}
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {fila(tr.desvioEtaReserva, fecha(op.eta_original))}
                    {fila(
                      tr.desvioEtaVigente,
                      fecha(op.eta),
                      d.diasReprogramado != null && d.diasReprogramado !== 0
                        ? tr.desvioReprogramado.replace("{{dias}}", formatoDesvio(d.diasReprogramado))
                        : tr.desvioSinReprogramar,
                    )}
                    {fila(tr.desvioArriboReal, fecha(op.arribo_at))}
                  </div>

                  <div
                    className={`estado--${estadoDesvio(d.dias)} mt-2.5 flex items-center gap-2 rounded-lg px-2.5 py-2`}
                    style={{
                      border: "1px solid color-mix(in srgb, var(--estado) 38%, transparent)",
                      background: "color-mix(in srgb, var(--estado) 12%, transparent)",
                    }}
                  >
                    <span className="estado-chip shrink-0 rounded-md border px-1.5 py-0.5 text-[12px] font-extrabold tabular-nums">
                      {formatoDesvio(d.dias)}
                    </span>
                    <span className="min-w-0 text-[12px] leading-snug text-dash-fg">
                      {sentido === "en_fecha"
                        ? tr.desvioEnFecha
                        : (sentido === "adelanto" ? tr.desvioAdelanto : tr.desvioAtraso).replace(
                            "{{dias}}",
                            String(Math.abs(d.dias)),
                          )}
                    </span>
                  </div>

                  {/* Una promesa reconstruida no puede presentarse como promesa. */}
                  {d.heredada && (
                    <p className="mt-2 text-[11.5px] leading-snug text-dash-muted">
                      <Icon icon="lucide:info" width={12} height={12} className="mr-1 inline align-[-2px]" aria-hidden />
                      {tr.desvioHeredado}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Incidencias en línea: visibles sin robarle alto al resto. */}
            {alertas.length > 0 && (
              <div className="space-y-1 border-t border-dash-border px-2.5 py-2">
                {alertas.map((a) => (
                  <div
                    key={a.codigo}
                    className={`nt-tone--${ALERTA_TONO[a.severidad]} flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--nt-accent)_38%,transparent)] bg-[color-mix(in_srgb,var(--nt-accent)_10%,transparent)] px-2.5 py-1.5`}
                  >
                    <Icon
                      icon={ALERTA_ICON[a.codigo]}
                      width={14}
                      height={14}
                      className="nt-accent-fg shrink-0"
                      aria-hidden
                    />
                    <p className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-dash-fg">
                      {tr[ALERTA_TITULO[a.codigo]]}
                    </p>
                    {a.accionable && (
                      <button
                        type="button"
                        onClick={() => setPestana("transbordo")}
                        className="shrink-0 text-[11px] font-bold nt-accent-fg underline-offset-2 hover:underline"
                      >
                        {tr.verDetalle}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Historia: la única lista de largo variable, así que es la que scrollea. */}
          <section className="dash-card dash-card-static flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="dash-section-head flex shrink-0 items-center gap-2 px-3.5 py-2">
              <Icon icon="lucide:history" width={14} height={14} className="text-dash-neon" aria-hidden />
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-dash-fg">
                {tr.historiaViaje}
              </h2>
              {/* Lo que agrega —una escala, un transbordo— es historia del viaje,
                  así que el botón vive junto a ella y no en una caja aparte. */}
              {onEditarItinerario && (
                <button
                  type="button"
                  onClick={() => onEditarItinerario()}
                  className="dash-control motion-interactive ml-auto inline-flex shrink-0 items-center gap-1.5 px-2 py-1 text-[11px] font-bold"
                >
                  <Icon icon="lucide:route" width={12} height={12} aria-hidden />
                  {tr.itEditar}
                </button>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3">
              {/*
                * Confirmación de la última decisión.
                *
                * Va aquí y no en un toast porque dice algo que conviene seguir
                * viendo: a qué nave pasó la carga y si quedó con seguimiento.
                */}
              {avisoRecalada && (
                <p className="mb-3 rounded-lg border border-dash-neon/35 bg-dash-neon/10 px-3 py-2 text-[12px] leading-snug text-dash-fg">
                  {avisoRecalada}
                </p>
              )}

              <NavitrackTimeline
                eventos={eventosRecientes}
                etapa={estado.etapa}
                locale={locale}
                tr={tr}
              />

              {/*
                * Los transbordos, con lo prometido y lo ocurrido.
                *
                * El historial ya cuenta que hubo un cambio de nave; esta lista
                * dice lo que el historial no alcanza: qué anunció la naviera
                * para cada transbordo y qué hizo de verdad el buque según el
                * AIS. Las paradas programadas no se listan aparte: son parte
                * del recorrido y el historial las cuenta una sola vez.
                */}
              {transbordosDelViaje.length > 0 && (
                <section className="mt-4">
                  <p className="pb-1.5 text-[11.5px] font-bold uppercase tracking-wider text-dash-muted sm:text-[10px]">
                    {tr.itTransbordosTitulo}
                  </p>
                  <ul className="divide-y divide-dash-border rounded-lg border border-dash-border">
                    {transbordosDelViaje.map((x) => {
                      const faltaNave = !x.nave && x.llego;
                      const d = desvioDe({ pod: x.puerto, eta: x.llegada, eta_hora: x.llegadaHora });
                      return (
                        <li key={x.puerto} className="px-2.5 py-2">
                          <div className="flex items-center gap-2">
                            <Icon
                              icon="lucide:git-branch"
                              width={13}
                              height={13}
                              className={faltaNave ? "shrink-0 text-amber-400" : "shrink-0 text-dash-muted"}
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12.5px] font-bold text-dash-fg">{x.puerto}</span>
                              <span className="block truncate text-[10.5px] text-dash-muted">
                                {(x.naveAnterior ?? "—") + " → "}
                                {x.nave ?? <em>{tr.itNavePorConfirmar}</em>}
                              </span>
                            </span>
                            {faltaNave && onEditarItinerario ? (
                              <button
                                type="button"
                                onClick={() => onEditarItinerario(x.puerto)}
                                className="dash-control motion-interactive shrink-0 px-2 py-1 text-[11px] font-bold"
                              >
                                {tr.itIndicarNave}
                              </button>
                            ) : null}
                          </div>
                          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 pl-5 text-[10.5px] text-dash-muted tabular-nums">
                            <span>
                              {tr.recaladaAnunciado}:{" "}
                              {x.llegada
                                ? `${fmtFecha(parseOpDate(x.llegada), locale) ?? "—"}${
                                    x.llegadaHora ? ` ${x.llegadaHora.slice(0, 5)} UTC` : ""
                                  }`
                                : "—"}
                            </span>
                            <span>
                              {tr.itLlego}:{" "}
                              {x.real?.recalado_at ? (fmtFechaHora(new Date(x.real.recalado_at), locale) ?? "—") : "—"}
                            </span>
                            {x.real?.zarpe_at && (
                              <span>
                                {tr.itZarpo}: {fmtFechaHora(new Date(x.real.zarpe_at), locale) ?? "—"}
                              </span>
                            )}
                            {d && <span className="font-bold text-dash-fg">{d}</span>}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Franja de indicadores: lo que un operador mira de reojo. */}
      <div
        className={`shrink-0 gap-2.5 max-sm:order-3 max-sm:-mx-1 max-sm:flex max-sm:snap-x max-sm:snap-mandatory max-sm:overflow-x-auto max-sm:px-1 max-sm:pb-1 sm:gap-2 sm:grid sm:grid-cols-3 ${
          hayCadena ? "xl:grid-cols-7" : "xl:grid-cols-6"
        }`}
      >
        {/* En un transbordo, de dónde salió la carga es parte de la historia. */}
        {tramoInicial && (
          <Stat
            className="max-sm:w-[58vw] max-sm:min-w-[190px] max-sm:shrink-0 max-sm:snap-start"
            icon="lucide:package-open"
            label={tr.cadenaInicial}
            valor={tramoInicial.nave || "—"}
            sub={
              [
                tramoInicial.pol,
                tramoInicial.etd ? fmtFecha(parseOpDate(tramoInicial.etd), locale) : null,
                // Cuánto se corrió la entrega respecto de lo que anunció la naviera.
                desvioDe(tramoInicial),
              ]
                .filter(Boolean)
                .join(" · ") || null
            }
          />
        )}

        {/*
          * Buque actual: el del tramo en curso, no el de `operaciones.nave`.
          *
          * Con transbordo esa columna guarda el primer barco, que soltó la
          * carga hace semanas. Decir que la carga "va en MSC SENEGAL" cuando
          * está en MSC RITA V es falso, aunque el dato exista.
          */}
        <Stat
          className="max-sm:w-[58vw] max-sm:min-w-[190px] max-sm:shrink-0 max-sm:snap-start"
          icon="lucide:ship"
          label={tr.buqueActual}
          valor={journey.naveActual || op.nave || "—"}
          sub={
            [
              op.naviera,
              journey.viajeActual,
              naveIdent?.imo ? `IMO ${naveIdent.imo}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || null
          }
        />
        <Stat
          className="max-sm:w-[58vw] max-sm:min-w-[190px] max-sm:shrink-0 max-sm:snap-start"
          icon="lucide:gauge"
          label={tr.velocidad}
          valor={<Velocidad nudos={ais?.speed} tr={tr} />}
          sub={ais?.course != null ? `${tr.rumbo} ${Math.round(ais.course)}°` : null}
        />
        {/*
          * Último y próximo puerto son los del **tramo en curso**.
          *
          * En un viaje con transbordo, el puerto de embarque original y el
          * destino final no son de dónde viene ni a dónde va el buque hoy: la
          * carga ya pasó por dos puertos de conexión. Lo que el AIS declare
          * manda por sobre lo calculado, porque es el dato del propio barco.
          */}
        <Stat
          className="max-sm:w-[58vw] max-sm:min-w-[190px] max-sm:shrink-0 max-sm:snap-start"
          icon="lucide:anchor"
          label={tr.ultimoPuerto}
          valor={ais?.lastPort || tramoEnCurso?.pol || journey.origen.nombre || "—"}
          /*
           * Cuando el puerto lo pone el AIS, va sin fecha.
           *
           * El ETD del tramo es el zarpe del **origen**: mostrarlo bajo un
           * puerto que el buque tocó a media ruta juntaba dos puertos y dos
           * semanas distintas en una línea. El `atdUtc` del proveedor tampoco
           * sirve —ver la nota en `parseAisSnapshot`: no acompaña a `lastPort`—,
           * así que acá no hay fecha que decir y se calla, que es lo único
           * honesto. La fecha del tramo se sigue usando cuando el puerto es el
           * calculado, donde sí le corresponde.
           */
          sub={
            ais?.lastPort
              ? null
              : tramoEnCurso?.etd
                ? `${tr.evZarpe}: ${fmtFecha(parseOpDate(tramoEnCurso.etd), locale) ?? "—"}`
                : etdFmt
                  ? `${tr.evZarpe}: ${etdFmt}`
                  : null
          }
        />
        {/*
          * Próximo puerto y puerto de destino son dos datos distintos y hasta
          * ahora se mostraban como uno solo.
          *
          * El próximo es el que **declara el buque** y cambia en cada escala;
          * el de destino es el que se comprometió con el cliente y no cambia.
          * Mostrar Hamburgo como "próximo puerto" mientras el barco navega
          * hacia Callao es decir algo que no es cierto.
          */}
        <Stat
          className="max-sm:w-[58vw] max-sm:min-w-[190px] max-sm:shrink-0 max-sm:snap-start"
          icon="lucide:navigation"
          label={tr.proximoPuerto}
          valor={proximoPuerto?.nombre || tr.proximoPuertoSinDato}
          sub={
            proximoPuerto?.eta
              ? `${tr.colEta}: ${fmtFechaHora(proximoPuerto.eta, locale) ?? "—"}`
              : proximoPuerto
                ? tr.proximoPuertoSegunBuque
                : null
          }
        />
        <Stat
          className="max-sm:w-[58vw] max-sm:min-w-[190px] max-sm:shrink-0 max-sm:snap-start"
          icon="lucide:map-pin"
          label={tr.puertoDestino}
          valor={journey.destino.nombre || "—"}
          sub={
            tramoEnCurso?.eta
              ? `${tr.colEta}: ${fmtFecha(parseOpDate(tramoEnCurso.eta), locale) ?? "—"}`
              : etaErp
                ? `${tr.colEta}: ${etaErp}`
                : null
          }
        />
        <Stat
          className="max-sm:w-[58vw] max-sm:min-w-[190px] max-sm:shrink-0 max-sm:snap-start"
          icon="lucide:crosshair"
          label={tr.posicionActual}
          valor={
            journey.position
              ? `${journey.position.lat.toFixed(3)}, ${journey.position.lng.toFixed(3)}`
              : "—"
          }
          sub={fmtFechaHora(journey.position?.at ?? null, locale) ?? null}
          extra={
            <span
              className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${
                esReal
                  ? "border-[color-mix(in_srgb,var(--trk-vessel)_45%,transparent)] text-[var(--trk-vessel)]"
                  : "border-dash-border text-dash-muted"
              }`}
            >
              {esReal ? tr.aisSatelital : tr.posicionCalculada}
            </span>
          }
        />
      </div>

      {/*
        * Nota de procedencia: explica el dato sin que nadie tenga que preguntarlo.
        *
        * El `order` no es decorativo. Bajo `sm` los bloques se reordenan a mano,
        * y un hijo sin `order` vale 0, o sea que se va delante de todos: esta
        * nota aparecía arriba del embarque, antes incluso de saber cuál era. Al
        * numerar por `order`, los que no se numeran no se quedan en su sitio.
        */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-dash-border bg-dash-control/50 px-3 py-2 max-sm:order-5 max-sm:gap-2.5 max-sm:px-3.5 max-sm:py-3">
        <p className="flex min-w-0 items-center gap-2 text-[11px] leading-snug text-dash-muted">
          <Icon icon="lucide:info" width={13} height={13} className="shrink-0 text-dash-neon" aria-hidden />
          <span className="min-w-0">{tr.notaAis}</span>
        </p>
        <div className="flex shrink-0 items-center gap-3">
          {actualizado && (
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-dash-muted">
              <Icon icon="lucide:refresh-cw" width={12} height={12} aria-hidden />
              {tr.ultimaActualizacion}:{" "}
              {/* El dato exacto, al pasar el mouse: igual que en la tabla. */}
              <span className="nt-tip" data-tip={actualizadoExacto ?? ""}>
                {actualizado}
              </span>
            </p>
          )}
          {/*
            * La posición manual vive acá, pegada a la nota que declara de dónde
            * sale el dato: es justo donde alguien lee "posición estimada" y se
            * da cuenta de que puede hacer algo al respecto.
            */}
          {onCargarCoords && (
            <button
              type="button"
              onClick={onCargarCoords}
              className="dash-control motion-interactive inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold"
            >
              <Icon icon="lucide:map-pin" width={12} height={12} aria-hidden />
              {tr.manualCoordsBtn}
            </button>
          )}
        </div>
      </div>

      {jsonAbierto && (
        <NavitrackJsonCrudo datos={aisCrudo} tr={tr} onCerrar={() => setJsonAbierto(false)} />
      )}
    </div>
  );
}
