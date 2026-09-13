"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import type { Locale } from "@/lib/i18n/translations";
import type { NeonTheme } from "@/lib/ui/neonTheme";
import { NavitrackMap } from "./NavitrackMap";
import { NavieraLogo } from "./NavieraLogo";
import { NavitrackCadena, NavitrackTimeline, NavitrackTransbordo } from "./NavitrackJourney";
import { isoDePais, isoDePuerto } from "./navitrack-banderas";
import type { Recalada } from "./NavitrackRecalada";
import { fmtFecha, fmtFechaHora, fmtNm, fmtRelativo, interpolar } from "./navitrack-format";
import {
  parseOpDate,
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
  valor: string;
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

function Dato({ label, valor }: { label: string; valor: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-[11.5px] font-bold uppercase tracking-wider text-dash-muted sm:text-[10px]">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-semibold text-dash-fg tabular-nums">
        {valor || "—"}
      </p>
    </div>
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
  /** Tramos del viaje. Vacío = viaje directo. */
  tramos: Tramo[];
  /** Puertos que el buque fue anunciando, con su decisión si ya se tomó. */
  recaladas: Recalada[];
  /** Abre la ventana para decidir qué pasó en ese puerto. */
  onVerificarRecalada: (r: Recalada) => void;
  /** Resultado de la última decisión, para confirmarla en pantalla. */
  avisoRecalada: string | null;
  op: NavitrackOperacion;
  ais: AisSnapshot | null;
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
  op,
  ais,
  journey,
  estado,
  alertas,
  tramos,
  recaladas,
  onVerificarRecalada,
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
  const mostrarTransbordo = estado.transbordoSospechado || decision?.estado === "confirmado";

  const [pestana, setPestana] = useState<Pestana>("ruta");
  // Si la sospecha se resuelve estando en esa pestaña, no dejar una vista vacía.
  useEffect(() => {
    if (pestana === "transbordo" && !mostrarTransbordo) setPestana("ruta");
  }, [pestana, mostrarTransbordo]);

  const relativos = {
    haceMenosDeUnMinuto: tr.haceMenosDeUnMinuto,
    haceMinutos: tr.haceMinutos,
    haceHoras: tr.haceHoras,
    haceDias: tr.haceDias,
  };
  const actualizado = fmtRelativo(journey.position?.at ?? null, relativos);

  const etaErp = fmtFecha(estado.eta.erp, locale);
  const etaAis = fmtFechaHora(estado.eta.ais, locale);
  const delta = estado.eta.deltaHoras != null ? formatearDelta(estado.eta.deltaHoras) : null;
  const etaTono =
    estado.eta.severidad === "alta" ? "rose" : estado.eta.severidad === "leve" ? "amber" : "teal";

  const titulo = op.contenedor || op.booking || op.ref_asli || tr.embarque;
  const pct = journey.progress?.pct ?? 0;
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
  const hayCadena = tramos.length > 1;
  const tramoInicial = hayCadena
    ? [...tramos].sort((a, b) => a.orden - b.orden)[0]
    : null;

  /** Primera recalada sin resolver: es la que el estado ofrece verificar. */
  const recaladaPendiente = recaladas.find((r) => r.estado === "por_verificar") ?? null;

  /*
   * Sobre qué se decide.
   *
   * Si el chequeo diario ya anotó el puerto, se usa esa fila. Si no —porque el
   * buque lo declaró hoy y el cron corre mañana— se arma una con lo que el AIS
   * dice ahora, con `id: 0` para que el servidor sepa que debe crearla. Sin
   * esto habría que esperar un día para responder algo que ya se sabe.
   */
  const recaladaAVerificar: Recalada = recaladaPendiente ?? {
    id: 0,
    puerto: (ais?.destination ?? "").trim(),
    nave: journey.naveActual ?? op.nave,
    anunciado_at: new Date().toISOString(),
    eta_anunciada: ais?.eta ? ais.eta.toISOString() : null,
    visto_at: new Date().toISOString(),
    estado: "por_verificar",
    decidido_at: null,
    notas: null,
  };

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
    { id: "escalas", label: tr.tabEscalas, icon: "lucide:anchor" },
    ...(mostrarTransbordo
      ? [{ id: "transbordo" as const, label: tr.evTransbordo, icon: "lucide:git-branch" }]
      : []),
  ];

  return (
    <div className="motion-view-section flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 sm:p-2.5 lg:overflow-hidden">
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
        </div>
      </div>

      {/* Encabezado: identidad, etapa y avance en una sola lectura. */}
      <header
        className={`dash-card dash-card-static nt-tone--${meta.tono} shrink-0 px-3.5 py-3 max-sm:order-2`}
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
            {recaladaPendiente || (estado.transbordoSospechado && recaladaAVerificar.puerto) ? (
              <button
                type="button"
                onClick={() => onVerificarRecalada(recaladaAVerificar)}
                className="motion-interactive block cursor-pointer"
                title={tr.recaladaVerificar}
              >
                <span className="nt-stage">
                  <span className="nt-stage-icon !h-6 !w-6">
                    <Icon icon={meta.icon} width={13} height={13} aria-hidden />
                  </span>
                  {tr[ETAPA_LABEL_KEY[estado.etapa]]}
                  <Icon icon="lucide:pencil" width={12} height={12} className="opacity-70" aria-hidden />
                </span>
                <span className="mt-1 block max-w-[190px] truncate text-center text-[11px] font-semibold text-amber-400">
                  {tr.recaladaVerificar} · {recaladaAVerificar.puerto}
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
                <span className="nt-accent-fg text-base font-extrabold tabular-nums">{pct}%</span>{" "}
                {tr.delTrayecto}
              </p>
              {restantes && (
                <p className="text-[12.5px] font-semibold text-dash-muted tabular-nums sm:text-[11px]">
                  {interpolar(tr.restanNm, { nm: restantes })}
                </p>
              )}
            </div>
            <div className="nt-head-rail mt-1.5">
              <div className="nt-head-rail-fill" style={{ width: `${pct}%` }} />
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

      {/* Bloque central: se queda con el alto que sobra. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 max-sm:order-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="dash-card dash-card-static flex min-h-0 flex-col overflow-hidden">
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
                <Dato
                  label={tr.velocidad}
                  valor={ais?.speed != null ? `${ais.speed.toFixed(1)} kn` : null}
                />
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
                onVerificar={() => onVerificarRecalada(recaladaAVerificar)}
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
                  <p className="text-[11.5px] font-bold uppercase tracking-wider text-dash-muted sm:text-[10px]">
                    {tr.etaAis}
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

              {/*
                * Puertos que el buque fue anunciando.
                *
                * Es la parte del historial que el AIS conoce y el ERP no: dónde
                * dijo el buque que iba parando. Lo que está por verificar se
                * puede resolver desde aquí mismo.
                */}
              {recaladas.length > 0 && (
                <section className="mb-3">
                  <p className="pb-1.5 text-[11.5px] font-bold uppercase tracking-wider text-dash-muted sm:text-[10px]">
                    {tr.historialRecaladas}
                  </p>
                  <ul className="divide-y divide-dash-border rounded-lg border border-dash-border">
                    {recaladas.map((r) => {
                      const pendiente = r.estado === "por_verificar";
                      const etiqueta =
                        r.estado === "transbordo"
                          ? tr.historialTransbordo
                          : r.estado === "parada_programada"
                            ? tr.historialParada
                            : pendiente
                              ? tr.historialPorVerificar
                              : tr.historialAnunciada;
                      return (
                        <li key={r.id} className="flex items-center gap-2 px-2.5 py-2">
                          <Icon
                            icon={
                              r.estado === "transbordo"
                                ? "lucide:git-branch"
                                : r.estado === "parada_programada"
                                  ? "lucide:anchor"
                                  : "lucide:help-circle"
                            }
                            width={13}
                            height={13}
                            className={
                              pendiente ? "shrink-0 text-amber-400" : "shrink-0 text-dash-muted"
                            }
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12.5px] font-bold text-dash-fg">
                              {r.puerto}
                            </span>
                            <span className="block truncate text-[10.5px] text-dash-muted">
                              {etiqueta}
                              {r.nave ? ` · ${r.nave}` : ""}
                            </span>
                          </span>
                          {pendiente ? (
                            <button
                              type="button"
                              onClick={() => onVerificarRecalada(r)}
                              className="dash-control motion-interactive shrink-0 px-2 py-1 text-[11px] font-bold"
                            >
                              {tr.recaladaVerificar}
                            </button>
                          ) : (
                            <span className="shrink-0 text-[10.5px] text-dash-muted tabular-nums">
                              {fmtFecha(
                                r.decidido_at ? new Date(r.decidido_at) : parseOpDate(r.eta_anunciada),
                                locale,
                              ) ?? "—"}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              <NavitrackTimeline
                eventos={eventosRecientes}
                etapa={estado.etapa}
                locale={locale}
                tr={tr}
              />
            </div>
          </section>
        </div>
      </div>

      {/* Franja de indicadores: lo que un operador mira de reojo. */}
      <div
        className={`shrink-0 gap-2 max-sm:order-3 max-sm:-mx-1 max-sm:flex max-sm:snap-x max-sm:snap-mandatory max-sm:overflow-x-auto max-sm:px-1 max-sm:pb-1 sm:grid sm:grid-cols-3 ${
          hayCadena ? "xl:grid-cols-6" : "xl:grid-cols-5"
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
          valor={ais?.speed != null ? `${ais.speed.toFixed(1)} kn` : "—"}
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
          sub={
            tramoEnCurso?.etd
              ? `${tr.evZarpe}: ${fmtFecha(parseOpDate(tramoEnCurso.etd), locale) ?? "—"}`
              : etdFmt
                ? `${tr.evZarpe}: ${etdFmt}`
                : null
          }
        />
        <Stat
          className="max-sm:w-[58vw] max-sm:min-w-[190px] max-sm:shrink-0 max-sm:snap-start"
          icon="lucide:map-pin"
          label={tr.proximoPuerto}
          valor={tramoEnCurso?.pod || journey.destino.nombre || "—"}
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

      {/* Nota de procedencia: explica el dato sin que nadie tenga que preguntarlo. */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-dash-border bg-dash-control/50 px-3 py-2">
        <p className="flex min-w-0 items-center gap-2 text-[11px] leading-snug text-dash-muted">
          <Icon icon="lucide:info" width={13} height={13} className="shrink-0 text-dash-neon" aria-hidden />
          <span className="min-w-0">{tr.notaAis}</span>
        </p>
        {actualizado && (
          <p className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-dash-muted">
            <Icon icon="lucide:refresh-cw" width={12} height={12} aria-hidden />
            {tr.ultimaActualizacion}: {actualizado}
          </p>
        )}
      </div>
    </div>
  );
}
