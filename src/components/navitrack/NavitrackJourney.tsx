"use client";

import { Icon } from "@iconify/react";
import type { Locale } from "@/lib/i18n/translations";
import { fmtFechaCorta, fmtFechaHora } from "./navitrack-format";
import type { EventoViaje, NavitrackEtapa, TransbordoDecision } from "./navitrack-estado";
import { ETAPA_META } from "./navitrack-estado";
import type { Escala } from "./navitrack-model";

type Textos = Record<string, string>;

/* ------------------------------ Línea de tiempo ----------------------------- */

const EVENTO_ICON: Record<string, string> = {
  STACKING: "lucide:container",
  CORTE_DOCUMENTAL: "lucide:file-check",
  FIN_STACKING: "lucide:package-check",
  ZARPE: "lucide:ship",
  TRANSITO: "lucide:waves",
  TRANSBORDO: "lucide:git-branch",
  ARRIBO: "lucide:map-pin",
};

const EVENTO_LABEL: Record<string, string> = {
  STACKING: "evStacking",
  CORTE_DOCUMENTAL: "evCorte",
  FIN_STACKING: "evFinStacking",
  ZARPE: "evZarpe",
  TRANSITO: "evTransito",
  TRANSBORDO: "evTransbordo",
  ARRIBO: "evArribo",
};

type TimelineProps = {
  eventos: EventoViaje[];
  etapa: NavitrackEtapa;
  locale: Locale;
  tr: Textos;
};

export function NavitrackTimeline({ eventos, etapa, locale, tr }: TimelineProps) {
  const tono = ETAPA_META[etapa].tono;

  return (
    <ol className={`nt-tone--${tono} motion-stagger-group space-y-0`}>
      {eventos.map((ev, i) => {
        const ultimo = i === eventos.length - 1;
        const certezaKey =
          ev.certeza === "REAL"
            ? "certezaReal"
            : ev.certeza === "CONFIRMADO"
              ? "certezaConfirmado"
              : "certezaEstimado";
        const fecha = ev.codigo === "TRANSITO" ? fmtFechaHora(ev.fecha, locale) : fmtFechaCorta(ev.fecha, locale);

        return (
          <li key={`${ev.codigo}-${i}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`nt-tl-dot ${
                  ev.actual ? "nt-tl-dot--now" : ev.cumplido ? "nt-tl-dot--done" : ""
                }`}
              >
                <Icon
                  icon={ev.cumplido && !ev.actual ? "lucide:check" : EVENTO_ICON[ev.codigo]}
                  width={12}
                  height={12}
                  aria-hidden
                />
              </span>
              {!ultimo && <span className={`nt-tl-line ${ev.cumplido ? "nt-tl-line--done" : ""}`} />}
            </div>

            <div className={`min-w-0 flex-1 ${ultimo ? "pb-0" : "pb-4"}`}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p
                  className={`text-[13px] font-bold leading-tight ${
                    ev.cumplido || ev.actual ? "text-dash-fg" : "text-dash-muted"
                  }`}
                >
                  {tr[EVENTO_LABEL[ev.codigo]] ?? ev.codigo}
                </p>
                <span
                  className={`nt-certainty ${
                    ev.certeza === "REAL"
                      ? "nt-certainty--real"
                      : ev.certeza === "CONFIRMADO"
                        ? "nt-certainty--confirmado"
                        : ""
                  }`}
                >
                  {tr[certezaKey]}
                </span>
              </div>
              {(ev.lugar || fecha) && (
                <p className="mt-0.5 truncate text-[11.5px] text-dash-muted">
                  {[ev.lugar, fecha].filter(Boolean).join(" · ")}
                </p>
              )}
              {/* En un transbordo, el hito sin las dos naves no dice nada:
                  saber que hubo transbordo en Cristóbal no sirve si no se ve
                  de qué buque a cuál pasó la carga. */}
              {ev.naveAnterior && ev.nave && (
                <p className="mt-0.5 flex items-center gap-1 truncate text-[11.5px] text-dash-fg">
                  <span className="truncate opacity-70">{ev.naveAnterior}</span>
                  <Icon icon="lucide:arrow-right" width={11} height={11} className="shrink-0 opacity-60" aria-hidden />
                  <span className="truncate font-semibold">{ev.nave}</span>
                </p>
              )}
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
  // Cada tramo es el trayecto entre una escala y la siguiente.
  const tramos = escalas.slice(0, -1).map((e, i) => ({
    n: i + 1,
    nave: e.nave,
    desde: e.nombre,
    hasta: escalas[i + 1]?.nombre ?? "",
    cumplido: escalas[i + 1]?.cumplida ?? false,
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
