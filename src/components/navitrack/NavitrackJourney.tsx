"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import type { Locale } from "@/lib/i18n/translations";
import { fmtFechaCorta, fmtFechaHora } from "./navitrack-format";
import type { EventoViaje, TransbordoDecision } from "./navitrack-estado";
import type { Escala } from "./navitrack-model";

type Textos = Record<string, string>;

/* ------------------------------ Línea de tiempo ----------------------------- */

const EVENTO_ICON: Record<string, string> = {
  STACKING: "lucide:container",
  CORTE_DOCUMENTAL: "lucide:file-check",
  FIN_STACKING: "lucide:package-check",
  ZARPE: "lucide:ship",
  RECALADA: "lucide:anchor",
  ANUNCIADO: "lucide:megaphone",
  PARADA: "lucide:anchor",
  TRANSITO: "lucide:waves",
  TRANSBORDO: "lucide:git-branch",
  ARRIBO: "lucide:map-pin",
};

const EVENTO_LABEL: Record<string, string> = {
  STACKING: "evStacking",
  CORTE_DOCUMENTAL: "evCorte",
  FIN_STACKING: "evFinStacking",
  ZARPE: "evZarpe",
  RECALADA: "evRecalada",
  ANUNCIADO: "evAnunciado",
  PARADA: "evParada",
  TRANSITO: "evTransito",
  TRANSBORDO: "evTransbordo",
  ARRIBO: "evArribo",
};

type TimelineProps = {
  eventos: EventoViaje[];
  locale: Locale;
  tr: Textos;
};

const CERTEZA_KEY: Record<EventoViaje["certeza"], string> = {
  REAL: "certezaReal",
  CONFIRMADO: "certezaConfirmado",
  ANUNCIADO: "certezaAnunciado",
  ESTIMADO: "certezaEstimado",
};

/**
 * La fecha de un hito, con la precisión que el dato tiene.
 *
 * El zarpe lleva hora solo cuando es real: la fecha planificada (`etd`) no
 * tiene hora, y ponerle una sería inventar una precisión que no hay.
 */
function fechaDeEvento(ev: EventoViaje, locale: Locale): string | null {
  const conHora = ev.codigo === "TRANSITO" || (ev.codigo === "ZARPE" && ev.certeza === "REAL");
  return conHora ? fmtFechaHora(ev.fecha, locale) : fmtFechaCorta(ev.fecha, locale);
}

/** En qué punto del viaje está un hito, que es lo que decide cómo se pinta. */
type PasoEstado = "hecho" | "actual" | "proximo" | "pendiente";

/**
 * La historia del viaje como un stepper horizontal, de izquierda (lo que pasó)
 * a derecha (lo que falta).
 *
 * Va sobre el mapa porque cuenta lo mismo que la ruta y en el mismo sentido de
 * lectura. Un riel continuo une los pasos y cambia de color con el avance: lo
 * cumplido en el tono de "completo", el tramo que llega al presente fundido
 * hacia el acento, y lo que falta apagado. El próximo paso lleva un anillo
 * claro: es lo siguiente que va a pasar, y es lo que el ojo busca después del
 * presente.
 *
 * Con muchos hitos se desplaza en horizontal, y al abrirse se centra en el hito
 * actual: lo que se quiere ver primero es dónde va la carga, no cómo empezó.
 */
export function NavitrackTimelineHorizontal({ eventos, locale, tr }: TimelineProps) {
  const contenedor = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const ol = contenedor.current;
    const actual = ol?.querySelector<HTMLElement>("[data-actual='true']");
    if (!ol || !actual) return;
    // `scrollLeft` y no `scrollIntoView`: este último también mueve la página
    // en vertical si puede, y la ficha no tiene por qué saltar al abrirse.
    ol.scrollLeft = actual.offsetLeft - ol.clientWidth / 2 + actual.clientWidth / 2;
  }, [eventos]);

  const idxProximo = eventos.findIndex((e) => !e.cumplido && !e.actual);
  const estadoDe = (i: number): PasoEstado => {
    const ev = eventos[i];
    if (ev.actual) return "actual";
    if (ev.cumplido) return "hecho";
    return i === idxProximo ? "proximo" : "pendiente";
  };

  /*
   * El riel se arma con dos mitades por paso, una a cada lado del nodo. La
   * mitad que entra a un paso toma el color de haber llegado a él: así el
   * tramo hacia el presente puede fundirse de "completo" al acento sin que
   * ningún tramo pinte algo que todavía no pasó.
   */
  const claseEntrada = (i: number): string => {
    const e = estadoDe(i);
    if (e === "hecho") return "nt-step-seg--hecho";
    if (e === "actual") return "nt-step-seg--hacia";
    if (e === "proximo" && eventos.some((x) => x.actual)) return "nt-step-seg--acento";
    return "";
  };
  const claseSalida = (i: number): string => {
    if (i + 1 >= eventos.length) return "";
    const siguiente = claseEntrada(i + 1);
    if (siguiente === "nt-step-seg--hacia") return "nt-step-seg--hecho";
    return siguiente;
  };

  return (
    <ol ref={contenedor} aria-label={tr.historiaDesliza} className="relative flex overflow-x-auto pb-1">
      {eventos.map((ev, i) => {
        const estado = estadoDe(i);
        const fecha = fechaDeEvento(ev, locale);
        const certeza = tr[CERTEZA_KEY[ev.certeza]];
        const pildora =
          estado === "hecho" ? tr.pasoCompletado : estado === "actual" ? tr.pasoActual : certeza;
        return (
          <li
            key={`${ev.codigo}-${i}`}
            data-actual={ev.actual ? "true" : undefined}
            className="flex min-w-[8.75rem] flex-1 flex-col items-center"
          >
            <div className="relative flex h-9 w-full items-center justify-center">
              {i > 0 && <span className={`nt-step-seg nt-step-seg--izq ${claseEntrada(i)}`} aria-hidden />}
              {i < eventos.length - 1 && (
                <span className={`nt-step-seg nt-step-seg--der ${claseSalida(i)}`} aria-hidden />
              )}
              <span className={`nt-step-node nt-step-node--${estado}`}>
                {estado === "hecho" ? (
                  <Icon icon="lucide:check" width={15} height={15} aria-hidden />
                ) : estado === "actual" ? (
                  <Icon icon={EVENTO_ICON[ev.codigo]} width={14} height={14} aria-hidden />
                ) : (
                  <span className="nt-step-node-core" aria-hidden />
                )}
              </span>
            </div>

            <div className="mt-2 flex w-full min-w-0 flex-col items-center px-1.5 text-center">
              <p
                className={`max-w-full truncate text-[13px] font-extrabold leading-tight ${
                  estado === "pendiente" ? "text-dash-muted" : "text-dash-fg"
                }`}
              >
                {tr[EVENTO_LABEL[ev.codigo]] ?? ev.codigo}
              </p>
              {ev.lugar && (
                <p
                  className="mt-0.5 max-w-full truncate text-[10.5px] font-semibold uppercase tracking-wide text-dash-muted"
                  title={ev.lugar}
                >
                  {ev.lugar}
                </p>
              )}
              {fecha && (
                <p className="max-w-full truncate text-[10.5px] uppercase text-dash-muted tabular-nums">{fecha}</p>
              )}
              {/* Sin las dos naves, un transbordo no dice de qué buque a cuál pasó la carga. */}
              {ev.codigo === "TRANSBORDO" && ev.naveAnterior && (
                <p
                  className="max-w-full truncate text-[10px] text-dash-muted"
                  title={`${ev.naveAnterior} → ${ev.nave ?? tr.itNavePorConfirmar}`}
                >
                  {ev.naveAnterior} → {ev.nave ?? <em>{tr.itNavePorConfirmar}</em>}
                </p>
              )}
              {/* Lo cumplido dice "completado"; de dónde salió el dato queda a mano, al pasar el mouse. */}
              <span className={`nt-step-pill nt-step-pill--${estado} mt-1.5`} title={certeza}>
                {pildora}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* -------------------------------- Transbordo -------------------------------- */

type TransbordoProps = {
  naveActual: string;
  puerto: string;
  naveSiguiente: string | null;
  decision: TransbordoDecision | null;
  guardando: boolean;
  error: string | null;
  onConfirmar: () => void;
  onDescartar: () => void;
  /** Abre la ventana que pregunta qué ocurrió en ese puerto. */
  onVerificar: () => void;
  tr: Textos;
};

function FlowNode({
  texto,
  sub,
  estado,
  icon,
}: {
  texto: string;
  sub?: string;
  estado: "ok" | "alerta" | "pendiente";
  icon: string;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
        estado === "ok"
          ? "border-[color-mix(in_srgb,var(--nt-accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--nt-accent)_12%,transparent)]"
          : estado === "alerta"
            ? "border-[color-mix(in_srgb,var(--nt-accent)_55%,transparent)] bg-[color-mix(in_srgb,var(--nt-accent)_16%,transparent)]"
            : "border-dashed border-dash-border bg-dash-control/60"
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
          estado === "pendiente" ? "text-dash-muted" : "nt-accent-fg"
        }`}
      >
        <Icon icon={icon} width={15} height={15} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-[13px] font-bold leading-tight ${
            estado === "pendiente" ? "text-dash-muted" : "text-dash-fg"
          }`}
        >
          {texto}
        </span>
        {sub && <span className="block truncate text-[11px] text-dash-muted">{sub}</span>}
      </span>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex justify-center py-1" aria-hidden>
      <Icon icon="lucide:chevron-down" width={16} height={16} className="text-dash-muted opacity-60" />
    </div>
  );
}

/**
 * El transbordo contado como parte del viaje, no como un formulario.
 *
 * Mientras es sospecha se muestra el quiebre y las dos salidas posibles; una vez
 * que alguien decide, la misma pieza pasa a leerse como un tramo más de la ruta.
 */
/**
 * Cadena de transporte: por qué buques ha pasado la carga.
 *
 * Esto es lo que distingue seguir una carga de seguir un barco. En un viaje con
 * transbordo la pregunta "¿en qué nave va?" no tiene una sola respuesta: hubo
 * una inicial, hay una actual, y entre medio puertos donde la caja estuvo en
 * tierra esperando. `operaciones.nave` solo guarda la primera, así que sin esta
 * vista el operador cree que la carga sigue en un buque que la soltó hace
 * semanas.
 *
 * Una tarjeta por tramo, en orden. La actual se destaca; las cumplidas se
 * apagan sin desaparecer, porque el historial es parte de la respuesta.
 */
export function NavitrackCadena({
  escalas,
  tramoActual,
  tr,
}: {
  escalas: Escala[];
  tramoActual: number | null;
  tr: Record<string, string>;
}) {
  /*
   * Las recaladas del AIS no entran: esta cadena describe en qué nave viaja la
   * carga en cada tramo, y en una recalada la nave es la misma. Contarlas
   * partiría un viaje directo en dos tramos y lo haría pasar por transbordo.
   */
  const puertos = escalas.filter((e) => e.tipo !== "recalada");

  // Cada tramo es el trayecto entre una escala y la siguiente.
  const tramos = puertos.slice(0, -1).map((e, i) => ({
    n: i + 1,
    nave: e.nave,
    desde: e.nombre,
    hasta: puertos[i + 1]?.nombre ?? "",
    cumplido: puertos[i + 1]?.cumplida ?? false,
    actual: tramoActual === i + 1,
  }));

  if (tramos.length < 2) return null;

  return (
    <section className="mt-3">
      <div className="dash-section-head flex items-center gap-2 px-1 pb-2">
        <Icon icon="lucide:git-branch" width={14} height={14} className="text-dash-neon" aria-hidden />
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-dash-muted">
          {tr.cadenaTitulo}
        </h3>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {tramos.map((t) => (
          <article
            key={t.n}
            className={`rounded-xl border px-3 py-2.5 ${
              t.actual
                ? "border-[color-mix(in_srgb,var(--dash-neon)_55%,transparent)] bg-[color-mix(in_srgb,var(--dash-neon)_12%,transparent)]"
                : t.cumplido
                  ? "border-dash-border bg-dash-control/40 opacity-75"
                  : "border-dash-border bg-dash-control/60"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-dash-muted">
                {t.n === 1
                  ? tr.cadenaInicial
                  : t.n === tramos.length
                    ? tr.cadenaFinal
                    : tr.cadenaIntermedia.replace("{{n}}", String(t.n))}
              </span>
              {t.actual ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--dash-neon)_50%,transparent)] px-1.5 py-0.5 text-[9.5px] font-bold text-dash-fg">
                  <span className="nt-live-dot" aria-hidden />
                  {tr.cadenaAqui}
                </span>
              ) : t.cumplido ? (
                <Icon icon="lucide:check" width={12} height={12} className="text-dash-muted" aria-hidden />
              ) : null}
            </div>

            <p className="mt-1 truncate text-[14px] font-bold text-dash-fg">{t.nave ?? "—"}</p>
            <p className="mt-0.5 truncate text-[11px] text-dash-muted">
              {t.desde} → {t.hasta}
            </p>
          </article>
        ))}
      </div>

      <p className="mt-2 px-1 text-[10.5px] leading-snug text-dash-muted">{tr.cadenaNota}</p>
    </section>
  );
}

export function NavitrackTransbordo({
  naveActual,
  puerto,
  naveSiguiente,
  decision,
  guardando,
  error,
  onConfirmar,
  onDescartar,
  onVerificar,
  tr,
}: TransbordoProps) {
  const confirmado = decision?.estado === "confirmado";
  const tono = confirmado ? "sky" : "orange";

  return (
    <div className={`nt-tone--${tono}`}>
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-dash-muted">
        {tr.transbordoFlujoTitle}
      </p>

      <FlowNode texto={naveActual || tr.sinDato} sub={tr.buqueActual} estado="ok" icon="lucide:ship" />
      <FlowArrow />
      <FlowNode texto={puerto || tr.sinDato} estado={confirmado ? "ok" : "alerta"} icon="lucide:anchor" />
      <FlowArrow />
      <FlowNode
        texto={confirmado ? tr.etapaTransbordoConfirmado : tr.etapaPosibleTransbordo}
        estado="alerta"
        icon={confirmado ? "lucide:git-merge" : "lucide:triangle-alert"}
      />
      <FlowArrow />
      <FlowNode
        texto={naveSiguiente || tr.buqueSiguienteDesconocido}
        sub={tr.buqueSiguiente}
        estado={confirmado && naveSiguiente ? "ok" : "pendiente"}
        icon="lucide:ship"
      />

      {confirmado ? (
        <p className="mt-3 text-[11.5px] font-medium nt-accent-fg">{tr.transbordoConfirmadoNota}</p>
      ) : (
        <div className="mt-3">
          {/*
            * Un solo botón, no dos.
            *
            * Antes había "Confirmar transbordo" y "Descartar alerta", y la
            * segunda era engañosa: sonaba a silenciar un aviso, cuando lo que
            * de verdad significaba era "la carga siguió en el mismo buque".
            * Quien la apretaba creía estar ocultando una notificación y en
            * realidad estaba respondiendo una pregunta —o creía responderla y
            * no quedaba registrada en ninguna parte.
            *
            * Ahora este botón abre la ventana que pregunta con todas las
            * palabras, y ahí cada respuesta deja su rastro en el historial.
            */}
          <button
            type="button"
            onClick={onVerificar}
            disabled={guardando}
            className="dash-cta motion-interactive inline-flex items-center gap-1.5 px-3.5 py-2 text-xs disabled:opacity-60"
          >
            <Icon icon="lucide:help-circle" width={14} height={14} aria-hidden />
            {tr.transbordoVerificar}
          </button>
          <p className="mt-1.5 text-[11.5px] leading-snug text-dash-muted">
            {tr.transbordoVerificarAyuda}
          </p>
        </div>
      )}

      {error && <p className="mt-2 text-[11.5px] font-medium text-rose-300">{error}</p>}
    </div>
  );
}
