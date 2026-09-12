"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import type { Locale } from "@/lib/i18n/translations";
import type { NeonTheme } from "@/lib/ui/neonTheme";
import { NavitrackMap } from "./NavitrackMap";
import { NavieraLogo } from "./NavieraLogo";
import { NavitrackTimeline, NavitrackTransbordo } from "./NavitrackJourney";
import { banderaDePais, banderaDePuerto } from "./navitrack-banderas";
import { fmtFecha, fmtFechaHora, fmtNm, fmtRelativo, interpolar } from "./navitrack-format";
import {
  parseOpDate,
  type AisSnapshot,
  type Journey,
  type NaveIdent,
  type NavitrackOperacion,
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
}: {
  icon: string;
  label: string;
  valor: string;
  sub?: string | null;
  extra?: React.ReactNode;
}) {
  return (
    <div className="nt-stat">
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
      <p className="text-[10px] font-bold uppercase tracking-wider text-dash-muted">{label}</p>
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
  const banderaPol = banderaDePuerto(op.pol);
  const etdFmt = fmtFecha(parseOpDate(op.etd), locale);
  const banderaPod = banderaDePais(op.pais) ?? banderaDePuerto(op.pod);
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
      <div className="flex shrink-0 items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="motion-interactive inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[12.5px] font-semibold text-dash-muted transition-colors hover:text-dash-fg"
        >
          <Icon icon="lucide:arrow-left" width={15} height={15} aria-hidden />
          {tr.volverEmbarques}
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
                className="dash-control motion-interactive inline-flex h-7 w-7 items-center justify-center disabled:opacity-35"
              >
                <Icon icon="lucide:chevron-left" width={15} height={15} aria-hidden />
              </button>
              <span className="min-w-[4.5rem] text-center text-[11px] font-semibold text-dash-muted tabular-nums">
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
                className="dash-control motion-interactive inline-flex h-7 w-7 items-center justify-center disabled:opacity-35"
              >
                <Icon icon="lucide:chevron-right" width={15} height={15} aria-hidden />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={refrescando}
            className="dash-control motion-interactive inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11.5px] font-semibold disabled:opacity-60"
          >
            <Icon
              icon="lucide:refresh-cw"
              width={13}
              height={13}
              className={refrescando ? "animate-spin" : ""}
              aria-hidden
            />
            {tr.refresh}
          </button>
        </div>
      </div>

      {/* Encabezado: identidad, etapa y avance en una sola lectura. */}
      <header className={`dash-card dash-card-static nt-tone--${meta.tono} shrink-0 px-3.5 py-3`}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <NavieraLogo nombre={op.naviera} logoUrl={navieraLogoUrl} size={54} />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-dash-muted">
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
              <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                {op.booking && (
                  <span className="inline-flex min-w-0 items-baseline gap-1.5">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-dash-muted">
                      {tr.booking}
                    </span>
                    <span className="truncate text-[13.5px] font-bold text-dash-fg tabular-nums">
                      {op.booking}
                    </span>
                  </span>
                )}
                {op.cliente && (
                  <span className="inline-flex min-w-0 items-baseline gap-1.5">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-dash-muted">
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

          <div className="shrink-0">
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
            <p className="mt-1 text-center text-[11px] text-dash-muted">
              {tr[ETAPA_SUB_KEY[estado.etapa]]}
            </p>
          </div>

          <div className="min-w-[min(100%,260px)] flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[12.5px] text-dash-muted">
                <span className="nt-accent-fg text-base font-extrabold tabular-nums">{pct}%</span>{" "}
                {tr.delTrayecto}
              </p>
              {restantes && (
                <p className="text-[11px] font-semibold text-dash-muted tabular-nums">
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
            {banderaPol && <span aria-hidden>{banderaPol}</span>}
            <span className="truncate">{journey.origen.nombre || "—"}</span>
            <Icon icon="lucide:arrow-right" width={15} height={15} className="shrink-0 text-dash-muted" aria-hidden />
            {banderaPod && <span aria-hidden>{banderaPod}</span>}
            <span className="truncate">{journey.destino.nombre || "—"}</span>
          </p>
          {etaErp && (
            <p className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-dash-muted">
                {tr.colEta}
              </span>
              <span className="text-[14px] font-extrabold text-dash-fg tabular-nums">{etaErp}</span>
            </p>
          )}
          {op.viaje && (
            <p className="text-[11.5px] text-dash-muted">
              {tr.viaje} <span className="font-semibold text-dash-fg">{op.viaje}</span>
            </p>
          )}
        </div>
      </header>

      {/* Bloque central: se queda con el alto que sobra. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-[1.6fr_1fr]">
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
            <div className="relative h-[46dvh] w-full shrink-0 lg:h-auto lg:min-h-0 lg:flex-1">
              <NavitrackMap
                journey={journey}
                vesselName={op.nave ?? ""}
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
                  <p className="truncate text-lg font-extrabold tracking-tight text-dash-fg">
                    {op.nave || "—"}
                  </p>
                  <p className="truncate text-[12px] text-dash-muted">{op.naviera || "—"}</p>
                </div>
              </div>

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
                <p className="text-[11.5px] text-dash-muted">
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
                  <p className="text-[11px] text-dash-muted">{tr.escalasNoSeguida}</p>
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
                            <p className="mt-0.5 text-[11.5px] text-dash-muted tabular-nums">
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
            <div className="flex flex-wrap items-start justify-between gap-3 px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-xl font-extrabold leading-none tracking-tight text-dash-fg tabular-nums">
                  {etaErp ?? "—"}
                </p>
                <p className="mt-1 truncate text-[11.5px] text-dash-muted">
                  {[journey.destino.nombre, op.pais].filter(Boolean).join(", ") || "—"}
                </p>
              </div>
              {etaAis && (
                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-dash-muted">
                    {tr.etaAis}
                  </p>
                  <p className="mt-0.5 text-[12.5px] font-bold text-dash-fg tabular-nums">{etaAis}</p>
                  {delta && (
                    <span className="nt-accent-fg mt-1 inline-block rounded-md border border-[color-mix(in_srgb,var(--nt-accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--nt-accent)_14%,transparent)] px-1.5 py-0.5 text-[11px] font-extrabold tabular-nums">
                      {delta}
                    </span>
                  )}
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
      <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        <Stat
          icon="lucide:ship"
          label={tr.buqueActual}
          valor={op.nave || "—"}
          sub={
            [op.naviera, naveIdent?.imo ? `IMO ${naveIdent.imo}` : null].filter(Boolean).join(" · ") ||
            null
          }
        />
        <Stat
          icon="lucide:gauge"
          label={tr.velocidad}
          valor={ais?.speed != null ? `${ais.speed.toFixed(1)} kn` : "—"}
          sub={ais?.course != null ? `${tr.rumbo} ${Math.round(ais.course)}°` : null}
        />
        <Stat
          icon="lucide:anchor"
          label={tr.ultimoPuerto}
          valor={ais?.lastPort || journey.origen.nombre || "—"}
          sub={etdFmt ? `${tr.evZarpe}: ${etdFmt}` : null}
        />
        <Stat
          icon="lucide:map-pin"
          label={tr.proximoPuerto}
          valor={journey.destino.nombre || "—"}
          sub={etaErp ? `${tr.colEta}: ${etaErp}` : null}
        />
        <Stat
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
