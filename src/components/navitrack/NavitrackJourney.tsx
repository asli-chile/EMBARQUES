"use client";

import { Icon } from "@iconify/react";
import type { Locale } from "@/lib/i18n/translations";
import { fmtFechaCorta, fmtFechaHora } from "./navitrack-format";
import type { EventoViaje, NavitrackEtapa, TransbordoDecision } from "./navitrack-estado";
import { ETAPA_META } from "./navitrack-estado";

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
export function NavitrackTransbordo({
  naveActual,
  puerto,
  naveSiguiente,
  decision,
  guardando,
  error,
  onConfirmar,
  onDescartar,
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
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onConfirmar}
            disabled={guardando}
            className="dash-cta motion-interactive inline-flex items-center gap-1.5 px-3 py-2 text-xs disabled:opacity-60"
          >
            <Icon icon="lucide:check" width={14} height={14} aria-hidden />
            {tr.confirmarTransbordo}
          </button>
          <button
            type="button"
            onClick={onDescartar}
            disabled={guardando}
            className="dash-control motion-interactive inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold disabled:opacity-60"
          >
            <Icon icon="lucide:x" width={14} height={14} aria-hidden />
            {tr.descartarAlerta}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-[11.5px] font-medium text-rose-300">{error}</p>}
    </div>
  );
}
