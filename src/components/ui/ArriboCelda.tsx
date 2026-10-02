/**
 * La columna "Arribo" de Mis Reservas: cuándo llegó de verdad la carga y por
 * cuántos días le ganó o le perdió a la ETA.
 *
 * Antes el arribo iba como chip debajo del estado. Ahí no se podía comparar
 * con la ETA —que está en otra columna— ni recorrer la tabla buscando las que
 * llegaron tarde. Como columna propia queda al lado de la ETA y se lee de un
 * vistazo.
 *
 * Tres formas de mostrarla, y un clic pasa a la siguiente:
 *
 *   fecha   20-09-2026          la fecha real de arribo
 *   dias    -2  /  +3           diferencia contra la ETA: verde si llegó antes,
 *                               rojo si llegó después
 *   ambos   20-09-2026  -2
 *
 * El modo es de **toda la columna**, no de la celda: el punto de ver los días
 * es comparar filas, y una columna con formas mezcladas no se compara.
 *
 * La diferencia se mide contra `operaciones.eta` porque es la fecha que está al
 * lado y la que el cliente conoce. El arribo *anunciado* no entra en la cuenta:
 * es otra promesa, no una llegada; se muestra en tenue y sin días.
 */
import type { MouseEvent } from "react";
import { Icon } from "@iconify/react";

export type ModoArribo = "fecha" | "dias" | "ambos";

export const MODOS_ARRIBO: readonly ModoArribo[] = ["fecha", "dias", "ambos"];

export function siguienteModoArribo(modo: ModoArribo): ModoArribo {
  return MODOS_ARRIBO[(MODOS_ARRIBO.indexOf(modo) + 1) % MODOS_ARRIBO.length];
}

/**
 * Día calendario en Chile, como número de días desde la época.
 *
 * `eta` es `date` ("2026-09-20") y `arribo_at` es `timestamptz`. Una fecha sin
 * hora se sitúa a mediodía —leída como medianoche UTC caería el día anterior en
 * Chile—; la que trae hora se lleva al día local. Mismo criterio que ArriboChip
 * y NaviTrack, para que las tres pantallas digan la misma fecha.
 */
function diaLocal(iso: string | null | undefined): number | null {
  const texto = String(iso ?? "").trim();
  if (!texto) return null;
  const d = new Date(texto.includes("T") || texto.includes(" ") ? texto : `${texto}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

function fechaDe(iso: string | null | undefined): string | null {
  const dia = diaLocal(iso);
  if (dia === null) return null;
  const d = new Date(dia * 86_400_000);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getUTCFullYear()}`;
}

/** Fecha real de arribo como texto (dd-mm-aaaa), o "" si no llegó. Para exportar. */
export function fechaArriboReal(op: { arribo_confirmado?: boolean | null; arribo_at?: string | null }): string {
  return op.arribo_confirmado ? (fechaDe(op.arribo_at) ?? "") : "";
}

/** Días entre la ETA y el arribo real. Negativo = llegó antes. */
export function diasContraEta(eta: string | null | undefined, arribo: string | null | undefined): number | null {
  const a = diaLocal(arribo);
  const e = diaLocal(eta);
  return a === null || e === null ? null : a - e;
}

/** Valor para ordenar la columna: la fecha real, y si no hay, la anunciada. */
export function valorOrdenArribo(op: {
  arribo_confirmado?: boolean | null;
  arribo_at?: string | null;
  arribo_anunciado_at?: string | null;
}): number | null {
  return op.arribo_confirmado ? diaLocal(op.arribo_at) : diaLocal(op.arribo_anunciado_at);
}

export type ArriboCeldaLabels = {
  /** Con {{fecha}}. */
  anunciado: string;
  /** Con {{fecha}}. */
  real: string;
  /** Con {{n}}. */
  antes: string;
  /** Con {{n}}. */
  despues: string;
  aTiempo: string;
  sinEta: string;
  cambiarVista: string;
};

type Props = {
  arribo_confirmado?: boolean | null;
  arribo_at?: string | null;
  arribo_anunciado_at?: string | null;
  eta?: string | null;
  modo: ModoArribo;
  onCambiarModo: () => void;
  labels: ArriboCeldaLabels;
};

export function ArriboCelda({
  arribo_confirmado,
  arribo_at,
  arribo_anunciado_at,
  eta,
  modo,
  onCambiarModo,
  labels,
}: Props) {
  const confirmado = Boolean(arribo_confirmado);

  if (!confirmado) {
    const anunciada = fechaDe(arribo_anunciado_at);
    if (!anunciada) return <span className="text-xs text-dash-muted">—</span>;
    // Una promesa, no una llegada: tenue, con reloj, sin días.
    return (
      <span
        className="inline-flex items-center gap-1 whitespace-nowrap text-[12.5px] tabular-nums text-dash-muted"
        title={labels.anunciado.replace("{{fecha}}", anunciada)}
      >
        <Icon icon="lucide:clock-arrow-down" width={12} height={12} className="shrink-0" aria-hidden />
        {anunciada}
      </span>
    );
  }

  const fecha = fechaDe(arribo_at);
  if (!fecha) return <span className="text-xs text-dash-muted">—</span>;

  const dias = diasContraEta(eta, arribo_at);
  const fechaEl = (
    <span className="text-[13.5px] font-semibold text-dash-fg tabular-nums">{fecha}</span>
  );

  // Sin ETA no hay contra qué medir: solo la fecha, y no se ofrece el clic.
  if (dias === null) {
    return <span title={`${labels.real.replace("{{fecha}}", fecha)} · ${labels.sinEta}`}>{fechaEl}</span>;
  }

  const n = Math.abs(dias);
  const explicacion =
    dias < 0
      ? labels.antes.replace("{{n}}", String(n))
      : dias > 0
        ? labels.despues.replace("{{n}}", String(n))
        : labels.aTiempo;
  const diasEl = (
    <span
      className={`text-[12.5px] font-bold tabular-nums ${dias === 0 ? "text-dash-muted" : ""}`}
      /* Los tokens de estado de marca, no verdes y rojos de Tailwind: oliva es
         "cumplido" y rojo es "falla" en todo el ERP, en los dos temas. */
      style={dias < 0 ? { color: "var(--estado-ok)" } : dias > 0 ? { color: "var(--estado-error)" } : undefined}
    >
      {dias > 0 ? `+${dias}` : dias < 0 ? `-${n}` : "0"}
    </span>
  );

  const manejarClic = (e: MouseEvent<HTMLButtonElement>) => {
    // La fila entera abre el detalle; este clic es solo de la celda.
    e.stopPropagation();
    onCambiarModo();
  };

  return (
    <button
      type="button"
      onClick={manejarClic}
      onKeyDown={(e) => e.stopPropagation()}
      title={`${labels.real.replace("{{fecha}}", fecha)} · ${explicacion}\n${labels.cambiarVista}`}
      aria-label={`${labels.real.replace("{{fecha}}", fecha)}. ${explicacion}. ${labels.cambiarVista}`}
      className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 transition-colors duration-150 hover:bg-dash-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-neon/50"
    >
      {modo !== "dias" && fechaEl}
      {modo !== "fecha" && diasEl}
    </button>
  );
}
