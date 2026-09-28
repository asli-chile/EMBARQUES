import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Icon } from "@iconify/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ComboboxInput } from "@/components/ui/ComboboxInput";
import { PanelBajoFila, useFilaDesplegable } from "@/components/ui/FilaDesplegable";
import { withBase } from "@/lib/basePath";
import { goBackOr } from "@/lib/navigation";

/**
 * Piezas de las pantallas de reserva de transporte (ASLI y externa).
 *
 * Las dos se ven y se comportan como Mis Reservas: cabecera con indicadores
 * que filtran, barra de búsqueda, tabla a todo el ancho y una fila que se
 * despliega en el lugar con la ficha editable. Viven acá para que las dos
 * pantallas no se separen; la mecánica de la fila es la de `FilaDesplegable`.
 *
 * A diferencia de la ficha de Mis Reservas, esta es un formulario: los
 * cambios se anotan en el estado de la pantalla y se guardan juntos con la
 * barra de abajo.
 */

/* ── Campos ─────────────────────────────────────────────────────────────── */

export const CAMPO_INPUT =
  "w-full min-h-[2.5rem] rounded-lg border border-dash-border bg-dash-bg px-3 py-2 text-[13.5px] font-semibold text-dash-fg outline-none transition-colors placeholder:font-medium placeholder:text-dash-muted/70 focus:border-[var(--estado-curso)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--estado-curso)_35%,transparent)] disabled:cursor-not-allowed disabled:opacity-50";
export const CAMPO_LABEL = "mb-1 block text-[10.5px] font-bold uppercase tracking-wider text-dash-muted";

/** Cuántos campos del formulario difieren de lo que había al abrir la ficha. */
export function contarCambios<T extends Record<string, string>>(actual: T, base: T): string[] {
  return (Object.keys(actual) as (keyof T & string)[]).filter((k) => actual[k] !== base[k]);
}

/* ── Página ─────────────────────────────────────────────────────────────── */

export function PaginaTransporte({ theme, children }: { theme: string; children: ReactNode }) {
  return (
    <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
      <main className="dash-page relative flex min-h-0 flex-1 flex-col overflow-hidden" role="main">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -right-16 top-8 h-64 w-64 rounded-full bg-dash-neon/15 blur-3xl" />
          <div className="absolute bottom-20 left-1/4 h-56 w-56 rounded-full bg-dash-neon-hot/10 blur-3xl" />
        </div>
        {children}
      </main>
    </div>
  );
}

export function CargandoTransporte({ theme, label }: { theme: string; label: string }) {
  return (
    <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
      <main className="dash-page relative flex min-h-0 flex-1 items-center justify-center p-4" role="main">
        <div className="dash-card flex items-center gap-3 rounded-xl px-5 py-4 text-sm font-medium text-dash-muted">
          <Icon icon="lucide:loader-2" className="h-4 w-4 animate-spin text-[var(--estado-curso)]" />
          <span>{label}</span>
        </div>
      </main>
    </div>
  );
}

/* ── Cabecera ───────────────────────────────────────────────────────────── */

export type Indicador = {
  clave: string;
  label: string;
  valor: number;
  pct: number | null;
  tono: string;
  icon: string;
};

type CabeceraProps = {
  titulo: string;
  subtitulo: string;
  icono: string;
  volverLabel: string;
  visibles: number;
  total: number;
  indicadores: Indicador[];
  /** Clave del indicador que filtra la tabla ("" = ninguno). */
  activo: string;
  onIndicador: (clave: string) => void;
  acciones?: ReactNode;
};

/**
 * Título, indicadores y acciones de la página. Cada indicador filtra la
 * tabla, y vuelve a quitarlo si ya estaba activo; el de total (clave "") no
 * filtra. Ocultos en teléfono: ahí ese alto es la lista.
 */
export function CabeceraTransporte({
  titulo,
  subtitulo,
  icono,
  volverLabel,
  visibles,
  total,
  indicadores,
  activo,
  onIndicador,
  acciones,
}: CabeceraProps) {
  return (
    <div className="dash-toolbar relative z-10 shrink-0">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => goBackOr(withBase("/inicio"))}
            title={volverLabel}
            aria-label={volverLabel}
            className="dash-control inline-flex h-9 shrink-0 items-center gap-1.5 px-2.5 text-sm font-semibold sm:px-3"
          >
            <Icon icon="lucide:arrow-left" width={18} height={18} className="shrink-0" />
            <span className="hidden sm:inline">{volverLabel}</span>
          </button>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dash-neon/40 bg-dash-neon/15">
            <Icon icon={icono} width={18} height={18} className="text-dash-neon" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold leading-tight tracking-tight text-dash-fg sm:text-xl">{titulo}</h1>
            <p className="mt-0.5 truncate text-xs text-dash-muted">
              {subtitulo}
              {visibles !== total ? (
                <span className="ml-1.5 font-semibold tabular-nums text-dash-neon">
                  {visibles}/{total}
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <div
          className="hidden min-w-0 flex-1 gap-2 md:grid xl:gap-2.5"
          style={{ gridTemplateColumns: `repeat(${indicadores.length}, minmax(0, 1fr))` }}
        >
          {indicadores.map((k) => {
            const esActivo = activo === k.clave && k.clave !== "";
            return (
              <button
                key={k.label}
                type="button"
                aria-pressed={esActivo}
                onClick={() => onIndicador(esActivo ? "" : k.clave)}
                className={`${k.tono} flex items-center gap-2.5 rounded-xl border bg-dash-control/40 px-2.5 py-2 text-left transition-colors hover:bg-dash-neon/10 ${
                  esActivo
                    ? "border-[color-mix(in_srgb,var(--estado)_55%,transparent)] bg-[color-mix(in_srgb,var(--estado)_10%,transparent)]"
                    : "border-dash-border"
                }`}
              >
                <span className="estado-icono flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                  <Icon icon={k.icon} width={16} height={16} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-[18px] font-extrabold leading-none tabular-nums text-dash-fg">{k.valor}</span>
                    {k.pct !== null && (
                      <span className="text-[11.5px] font-semibold tabular-nums text-dash-muted">{k.pct}%</span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] font-semibold text-dash-muted">{k.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {acciones && <div className="ml-auto flex shrink-0 items-center gap-1.5">{acciones}</div>}
      </div>
    </div>
  );
}

/* ── Barra de búsqueda y filtros ────────────────────────────────────────── */

type BarraProps = {
  busqueda: string;
  onBusqueda: (v: string) => void;
  placeholder: string;
  onRefrescar: () => void;
  refrescarLabel: string;
  children?: ReactNode;
};

export function BarraFiltrosTransporte({ busqueda, onBusqueda, placeholder, onRefrescar, refrescarLabel, children }: BarraProps) {
  return (
    <div className="relative z-10 shrink-0 border-b border-dash-border bg-[color-mix(in_srgb,var(--dash-header)_70%,transparent)] backdrop-blur-md">
      <div className="flex items-center gap-1.5 px-3 py-2 sm:px-4">
        <div className="relative min-w-0 flex-1">
          <Icon icon="lucide:search" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dash-muted" />
          <input
            type="text"
            placeholder={placeholder}
            value={busqueda}
            onChange={(e) => onBusqueda(e.target.value)}
            className="w-full rounded-lg border border-dash-border bg-dash-control py-2 pl-8 pr-8 text-sm text-dash-fg transition-all placeholder:text-dash-muted focus:border-dash-neon/50 focus:outline-none focus:ring-2 focus:ring-dash-neon/40"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => onBusqueda("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-dash-muted transition-colors hover:text-dash-fg"
            >
              <Icon icon="lucide:x" width={13} height={13} />
            </button>
          )}
        </div>
        {children}
        <button
          type="button"
          onClick={onRefrescar}
          className="shrink-0 rounded-lg p-2 text-dash-muted transition-colors hover:bg-dash-control hover:text-dash-fg"
          title={refrescarLabel}
        >
          <Icon icon="lucide:refresh-cw" width={14} height={14} />
        </button>
      </div>
    </div>
  );
}

/** Desplegable de filtro de la barra. Se resalta cuando tiene valor. */
export function FiltroSelect({
  valor,
  onCambio,
  etiqueta,
  todos,
  opciones,
}: {
  valor: string;
  onCambio: (v: string) => void;
  etiqueta: string;
  todos: string;
  opciones: { valor: string; label: string }[];
}) {
  return (
    <select
      value={valor}
      onChange={(e) => onCambio(e.target.value)}
      aria-label={etiqueta}
      className={`dash-control hidden shrink-0 rounded-lg border px-2.5 py-2 text-sm lg:block ${
        valor ? "border-dash-neon/50 text-dash-fg" : "border-dash-border text-dash-muted"
      }`}
    >
      <option value="">{todos}</option>
      {opciones.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ── Tabla ──────────────────────────────────────────────────────────────── */

export const TH =
  "sticky top-0 z-20 border-b border-dash-border bg-dash-control px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-dash-muted whitespace-nowrap";
export const TD = "px-3 py-2 align-middle";

/** Clases de la `<tr>`: zebra, hover y el tono de la fila abierta. */
export function claseFila(abierta: boolean, idx: number) {
  return `cursor-pointer border-b outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-dash-neon/50 ${
    abierta
      ? "border-transparent bg-[color-mix(in_srgb,var(--estado-curso)_16%,transparent)]"
      : idx % 2 === 0
        ? "border-dash-border bg-transparent hover:bg-dash-neon/10"
        : "border-dash-border bg-dash-control/30 hover:bg-dash-neon/10"
  }`;
}

/** Chevron de la primera celda: gira cuando la fila está abierta. */
export function ChevronFila({ abierta }: { abierta: boolean }) {
  return (
    <Icon
      icon="lucide:chevron-right"
      width={14}
      height={14}
      className={`shrink-0 text-dash-muted transition-transform duration-150 ${abierta ? "rotate-90 text-[var(--estado-curso)]" : ""}`}
      aria-hidden
    />
  );
}

export function MarcoTabla({
  scrollProps,
  pie,
  children,
}: {
  /** De `useFilaDesplegable`; sin filas que se desplieguen, se omite. */
  scrollProps?: ReturnType<typeof useFilaDesplegable>["scrollProps"];
  pie?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative z-10 min-h-0 flex-1 overflow-hidden p-2 sm:p-3">
      <div className="dash-card-static flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-dash-border bg-[color-mix(in_srgb,var(--dash-surface)_92%,transparent)]">
        <div {...scrollProps} className={`min-h-0 flex-1 ${scrollProps?.className ?? "overflow-auto"}`}>
          <table className="w-full text-[13.5px]">{children}</table>
        </div>
        {pie && (
          <div className="flex shrink-0 items-center justify-between border-t border-dash-border bg-[color-mix(in_srgb,var(--dash-control)_90%,transparent)] px-3 py-2">
            {pie}
          </div>
        )}
      </div>
    </div>
  );
}

export function FilaVacia({ colSpan, icono, texto, accion }: { colSpan: number; icono: string; texto: string; accion?: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14 text-center">
        <div className="flex flex-col items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-dash-border bg-dash-control">
            <Icon icon={icono} width={20} height={20} className="text-dash-muted" />
          </span>
          <p className="text-sm font-medium text-dash-muted">{texto}</p>
          {accion}
        </div>
      </td>
    </tr>
  );
}

/** Chip de estado con los tokens de marca (`estado--*`). */
export function ChipEstado({ tono, label, icono }: { tono: string; label: string; icono?: string }) {
  return (
    <span className={`${tono} estado-chip inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold`}>
      {icono ? <Icon icon={icono} width={11} height={11} aria-hidden /> : <span className="h-1.5 w-1.5 rounded-full bg-[var(--estado)]" aria-hidden />}
      {label}
    </span>
  );
}

/* ── Ficha desplegada ───────────────────────────────────────────────────── */

/** `mono`: códigos (booking, contenedor), que además se pueden copiar. */
export type CeldaResumen = { label: string; valor: string | null; icono: string; mono?: boolean };

/**
 * Una celda de la barra de resumen. Los códigos llevan botón de copiar: son
 * lo que más se pega en correos y portales de navieras, y seleccionarlos a
 * mano sobre la franja se lleva también la etiqueta.
 */
function CeldaResumenVista({ celda: r }: { celda: CeldaResumen }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    if (!r.valor) return;
    try {
      await navigator.clipboard.writeText(r.valor);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1400);
    } catch {
      /* Sin permiso de portapapeles: el valor sigue seleccionable a mano. */
    }
  };
  return (
    <div className="group/celda min-w-0 px-3.5 py-2.5">
      <dt className="rd-muted flex items-center gap-1.5 truncate text-[10.5px] font-bold uppercase tracking-wider">
        <Icon icon={r.icono} width={13} height={13} className="rd-acento shrink-0" aria-hidden />
        {r.label}
      </dt>
      <dd className="mt-0.5 flex min-w-0 items-center gap-1.5">
        <span
          className={`truncate text-[16px] leading-snug ${r.valor ? "font-bold" : "rd-muted"} ${
            r.mono && r.valor ? "font-mono tracking-tight" : ""
          }`}
          title={r.valor ?? undefined}
        >
          {r.valor ?? "—"}
        </span>
        {r.mono && r.valor && (
          <button
            type="button"
            onClick={() => void copiar()}
            title={copiado ? "Copiado" : `Copiar ${r.label.toLowerCase()}`}
            aria-label={`Copiar ${r.label.toLowerCase()}`}
            className={`rd-btn motion-interactive inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-1.5 text-[11px] font-semibold ${
              copiado ? "rd-acento" : ""
            }`}
          >
            <Icon icon={copiado ? "lucide:check" : "lucide:copy"} width={13} height={13} aria-hidden />
            {copiado && <span>Copiado</span>}
          </button>
        )}
      </dd>
    </div>
  );
}

type FichaProps = {
  cerrando: boolean;
  onCerrar: () => void;
  onSubmit: (e: FormEvent) => void;
  labels: { volver: string; replegar: string };
  /** Rótulo chico sobre el título ("Transporte ASLI", "Reserva externa"). */
  eyebrow: string;
  titulo: string;
  estado?: ReactNode;
  subtitulo: string;
  /** Seis celdas: la barra de resumen parte en 2, 3 y 6 columnas. */
  resumen: CeldaResumen[];
  acciones?: ReactNode;
  /** Barra fija al pie del formulario (guardar, eliminar). */
  pie: ReactNode;
  /** Columna de consulta a la derecha en pantallas anchas (estado, notas). */
  lateral?: ReactNode;
  children: ReactNode;
};

/**
 * Panel bajo la fila: franja de marca con qué embarque es y un resumen, y
 * debajo el formulario por secciones. Todo va dentro de un `<form>` para que
 * Enter en un campo y el botón de guardar del pie hagan lo mismo.
 */
export function FichaTransporte({
  cerrando,
  onCerrar,
  onSubmit,
  labels,
  eyebrow,
  titulo,
  estado,
  subtitulo,
  resumen,
  acciones,
  pie,
  lateral,
  children,
}: FichaProps) {
  return (
    <PanelBajoFila cerrando={cerrando}>
      {/* Franja de marca. En pantallas anchas va en una sola línea —quién es,
          el resumen y las acciones— para dejarle el alto al formulario. */}
      <div className="rd-hero shrink-0 px-5 py-3 sm:px-6">
        <div className="grid items-center gap-x-6 gap-y-3 lg:grid-cols-[minmax(0,1fr)_auto] 2xl:grid-cols-[minmax(14rem,20rem)_minmax(0,1fr)_auto]">
          <div className="flex min-w-0 items-center gap-3">
            {/* La cabecera de la página se repliega con la ficha abierta; esta
                flecha ocupa su lugar y vuelve a la lista. */}
            <button
              type="button"
              onClick={onCerrar}
              title={`${labels.volver} (Esc)`}
              aria-label={labels.volver}
              className="rd-btn motion-interactive inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold"
            >
              <Icon icon="lucide:arrow-left" width={17} height={17} aria-hidden />
            </button>
            <div className="min-w-0">
              <p className="rd-muted text-[10px] font-bold uppercase tracking-[0.18em]">{eyebrow}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h3 className="truncate text-2xl font-extrabold leading-none tracking-tight">{titulo}</h3>
                {estado}
              </div>
              <p className="rd-muted mt-1 truncate text-xs font-semibold">{subtitulo}</p>
            </div>
          </div>

          <dl className="rd-vidrio rd-resumen order-last grid grid-cols-2 overflow-hidden rounded-xl sm:grid-cols-3 lg:col-span-2 xl:grid-cols-6 2xl:order-none 2xl:col-span-1">
            {resumen.map((r) => (
              <CeldaResumenVista key={r.label} celda={r} />
            ))}
          </dl>

          <div className="flex shrink-0 flex-wrap items-center gap-1.5 lg:justify-end">
            {acciones}
            <button
              type="button"
              onClick={onCerrar}
              className="rd-btn-primario motion-interactive inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold"
              title={`${labels.replegar} (Esc)`}
            >
              <Icon icon="lucide:chevrons-up" width={14} height={14} aria-hidden />
              {labels.replegar}
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* A la izquierda el trabajo (el recorrido), a todo el ancho que
              quede; a la derecha lo que se consulta, fijo mientras se baja.
              En pantallas angostas la columna lateral va al final. */}
          <div className="grid items-start gap-3 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,23rem)]">
            <div className="min-w-0 space-y-3">{children}</div>
            {lateral && <aside className="min-w-0 space-y-3 xl:sticky xl:top-4">{lateral}</aside>}
          </div>
        </div>
        <div className="shrink-0 border-t border-dash-border bg-[color-mix(in_srgb,var(--dash-bg)_92%,transparent)] px-4 py-2.5 backdrop-blur-md">
          {pie}
        </div>
      </form>
    </PanelBajoFila>
  );
}

/** Botón del hero (enlace o acción) con el vidrio de la franja de marca. */
export const BTN_HERO =
  "rd-btn motion-interactive inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold";

/** Rejilla de campos: tantas columnas como quepan, de 13rem como mínimo. */
const REJILLA_CAMPOS = "grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-[repeat(auto-fill,minmax(13rem,1fr))]";

/** Sección del formulario: tarjeta del tema con el teal de marca como acento. */
export function SeccionFicha({
  icono,
  titulo,
  extra,
  children,
}: {
  icono: string;
  titulo: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rd-card rounded-2xl">
      <header className="flex items-center gap-2.5 px-4 pb-2.5 pt-3.5">
        <span className="rd-icono flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
          <Icon icon={icono} width={16} height={16} aria-hidden />
        </span>
        <h4 className="min-w-0 flex-1 truncate text-[13px] font-bold text-dash-fg">{titulo}</h4>
        {extra}
      </header>
      <div className={REJILLA_CAMPOS}>{children}</div>
    </section>
  );
}

/** Dos opciones excluyentes (Sí/No, estados) como botones segmentados. */
export function Segmentos({
  valor,
  opciones,
  onCambio,
}: {
  valor: string;
  opciones: { valor: string; label: string }[];
  onCambio: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-dash-border bg-dash-bg p-0.5">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          aria-pressed={valor === o.valor}
          onClick={() => onCambio(o.valor)}
          className={`flex-1 rounded-md px-3 py-1.5 text-[13px] font-bold transition-colors ${
            valor === o.valor
              ? "estado--curso estado-chip"
              : "border border-transparent text-dash-muted hover:text-dash-fg"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Recorrido de pasos ─────────────────────────────────────────────────── */

export type Paso = {
  id: string;
  icono: string;
  titulo: string;
  /** Campos que cuentan para el avance, con su valor ya formateado. */
  campos: { label: string; valor: string }[];
  /** Hay cambios sin guardar en alguno de sus campos. */
  conCambios: boolean;
  contenido: ReactNode;
};

type RecorridoLabels = { siguiente: string; sinDatos: string; falta: string };

/**
 * El formulario como el trabajo se hace: pasos numerados en orden, unidos
 * por la espina punteada de Mis Reservas (`rd-pasos`). Cada paso dice cuánto
 * lleva; el número se enciende en oliva al completarse.
 *
 * Al abrir la ficha los pasos completos arrancan plegados —se ven en una
 * línea con sus datos— y el primero incompleto se marca como el siguiente.
 * El plegado se decide una sola vez: si se recalculara al escribir, el paso
 * se cerraría en la cara del usuario al llenar su último campo.
 */
export function RecorridoPasos({ pasos, labels }: { pasos: Paso[]; labels: RecorridoLabels }) {
  const llenosDe = (p: Paso) => p.campos.filter((c) => c.valor.trim() !== "");
  const [plegados, setPlegados] = useState<Set<string>>(
    () => new Set(pasos.filter((p) => llenosDe(p).length === p.campos.length).map((p) => p.id)),
  );
  const alternar = (id: string) =>
    setPlegados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const siguienteId = pasos.find((p) => llenosDe(p).length < p.campos.length)?.id;

  return (
    <ol className="rd-pasos relative space-y-2.5 pl-11 sm:pl-12">
      {pasos.map((p, i) => {
        const llenos = llenosDe(p);
        const total = p.campos.length;
        const frac = total ? llenos.length / total : 1;
        const completo = frac === 1;
        /* Estados de marca: completo en oliva, a medias en teal, nada en gris. */
        const tono = completo ? "estado--ok" : frac > 0 ? "estado--curso" : "estado--espera";
        const plegado = plegados.has(p.id);
        const faltan = p.campos.filter((c) => c.valor.trim() === "").map((c) => c.label);
        const resumen = completo
          ? llenos.slice(0, 4).map((c) => c.valor).join("  ·  ")
          : `${labels.falta}: ${faltan.join(", ")}`;
        const cuerpoId = `tr-paso-${p.id}`;
        const esSiguiente = p.id === siguienteId;
        return (
          <li key={p.id} className={`${tono} relative`}>
            {/* Número del paso, sobre la espina. Se enciende al completarse. */}
            <span
              className={`rd-paso-num absolute -left-11 top-3 flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-extrabold tabular-nums sm:-left-12 ${
                completo ? "rd-paso-num--lleno" : ""
              }`}
              aria-hidden
            >
              {completo ? <Icon icon="lucide:check" width={15} height={15} /> : i + 1}
            </span>
            <section
              className={`rd-card overflow-hidden rounded-2xl ${
                esSiguiente ? "ring-1 ring-[color-mix(in_srgb,var(--estado-curso)_45%,transparent)]" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => alternar(p.id)}
                aria-expanded={!plegado}
                aria-controls={cuerpoId}
                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left outline-none hover:bg-dash-control/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--estado-curso)]"
              >
                <span className="rd-icono flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                  <Icon icon={p.icono} width={17} height={17} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[13.5px] font-bold text-dash-fg">{p.titulo}</span>
                    {esSiguiente && <ChipEstado tono="estado--curso" label={labels.siguiente} icono="lucide:arrow-right" />}
                    {p.conCambios && (
                      <span className="estado--curso h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--estado)]" aria-hidden />
                    )}
                  </span>
                  {plegado && (
                    <span className="mt-0.5 block truncate text-[11.5px] text-dash-muted">
                      {llenos.length === 0 ? labels.sinDatos : resumen}
                    </span>
                  )}
                </span>
                <span className="hidden w-32 shrink-0 items-center gap-2 sm:flex">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-dash-control" aria-hidden>
                    <span
                      className="block h-full rounded-full bg-[var(--estado)] transition-[width] duration-300"
                      style={{ width: `${Math.round(frac * 100)}%` }}
                    />
                  </span>
                  <span className="w-9 text-right text-[11px] font-bold tabular-nums text-dash-muted">
                    {llenos.length}/{total}
                  </span>
                </span>
                <Icon
                  icon="lucide:chevron-down"
                  width={16}
                  height={16}
                  className={`shrink-0 text-dash-muted transition-transform duration-200 ${plegado ? "-rotate-90" : ""}`}
                  aria-hidden
                />
              </button>
              {!plegado && (
                <div id={cuerpoId} className={`border-t border-dash-border pt-3 ${REJILLA_CAMPOS}`}>
                  {p.contenido}
                </div>
              )}
            </section>
          </li>
        );
      })}
    </ol>
  );
}

/** Fecha u hora guardada como texto ISO, en corto para el resumen de un paso. */
export function fechaCorta(v: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(v);
  if (!m) return v;
  return m[4] ? `${m[3]}/${m[2]} ${m[4]}:${m[5]}` : `${m[3]}/${m[2]}/${m[1]}`;
}

/* ── Planta de citación ─────────────────────────────────────────────────── */

type PlantaCatalogo = { id: string; nombre: string };

/**
 * Planta elegida del catálogo `plantas`, con alta de una nueva desde el mismo
 * campo (como en Crear Reserva). La operación guarda el nombre, no el id.
 *
 * Mientras se escribe, el valor queda vacío salvo que el texto coincida con
 * una planta existente: así no se guarda un nombre a medio escribir que no
 * está en el catálogo. Escribir en el catálogo lo permite RLS a superadmin,
 * admin y ejecutivo; a los demás se les muestra el error.
 */
export function CampoPlanta({
  label,
  value,
  onChange,
  plantas,
  onPlantaCreada,
  onError,
  supabase,
  labels,
}: {
  label: string;
  value: string;
  onChange: (nombre: string) => void;
  plantas: PlantaCatalogo[];
  onPlantaCreada: (p: PlantaCatalogo) => void;
  onError: (mensaje: string) => void;
  supabase: SupabaseClient | null;
  labels: { buscar: string; agregar: string };
}) {
  const [texto, setTexto] = useState(value);
  const [agregando, setAgregando] = useState(false);
  /* Último valor que salió de aquí: si el de afuera cambia por otra razón
     (descartar, otra reserva), el texto lo sigue. */
  const emitido = useRef(value);
  useEffect(() => {
    if (value !== emitido.current) {
      emitido.current = value;
      setTexto(value);
    }
  }, [value]);

  const emitir = (nombre: string) => {
    emitido.current = nombre;
    onChange(nombre);
  };

  const agregar = async (t: string) => {
    const nombre = t.trim().toUpperCase();
    if (!supabase || !nombre) return;
    setAgregando(true);
    const { data, error } = await supabase.from("plantas").insert({ nombre, activo: true }).select("id, nombre").single();
    setAgregando(false);
    if (error || !data) {
      onError(error?.message ?? "No se pudo agregar la planta");
      return;
    }
    onPlantaCreada(data as PlantaCatalogo);
    setTexto(data.nombre);
    emitir(data.nombre);
  };

  return (
    <ComboboxInput
      label={label}
      labelClass={CAMPO_LABEL}
      inputClass={CAMPO_INPUT}
      neon
      icon="lucide:factory"
      value={texto}
      options={plantas}
      onSelect={(opt) => {
        setTexto(opt.nombre);
        emitir(opt.nombre);
      }}
      onChange={(v) => {
        setTexto(v);
        const existente = plantas.find((p) => p.nombre.toLowerCase() === v.trim().toLowerCase());
        emitir(existente ? existente.nombre : "");
      }}
      onAddNew={agregar}
      addNewLabel={(t) => `${labels.agregar} "${t.trim().toUpperCase()}"`}
      addingNew={agregando}
      placeholder={labels.buscar}
    />
  );
}

/* ── Instructivo de embarque ────────────────────────────────────────────── */

export type InstructivoLabels = {
  titulo: string;
  cargado: string;
  hintGuardado: string;
  hintSubir: string;
  guardadoEn: string;
  descargar: string;
  subir: string;
  reemplazar: string;
  subiendo: string;
};

export function SeccionInstructivo({
  url,
  nombre,
  error,
  subiendo,
  onElegir,
  onLimpiarError,
  labels,
}: {
  url: string | null;
  nombre: string;
  error: string | null;
  subiendo: boolean;
  onElegir: () => void;
  onLimpiarError: () => void;
  labels: InstructivoLabels;
}) {
  return (
    <section className="rd-card rounded-2xl">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
        <span className={`${url ? "estado--ok estado-icono" : "rd-icono"} flex h-8 w-8 shrink-0 items-center justify-center rounded-xl`}>
          <Icon icon={url ? "lucide:file-check-2" : "lucide:file-spreadsheet"} width={16} height={16} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-[13px] font-bold text-dash-fg">{labels.titulo}</h4>
            {url && <ChipEstado tono="estado--ok" label={labels.cargado} icono="lucide:check" />}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-dash-muted">
            {url ? (
              <>
                <span className="font-semibold text-dash-fg">{nombre}</span> · {labels.guardadoEn}
              </>
            ) : (
              labels.hintSubir
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="rd-chip motion-interactive inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold"
            >
              <Icon icon="lucide:download" width={13} height={13} aria-hidden />
              {labels.descargar}
            </a>
          )}
          <button
            type="button"
            disabled={subiendo}
            onClick={onElegir}
            className="rd-chip motion-interactive inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon icon={subiendo ? "lucide:loader-2" : "lucide:upload"} width={13} height={13} className={subiendo ? "animate-spin" : ""} aria-hidden />
            {subiendo ? labels.subiendo : url ? labels.reemplazar : labels.subir}
          </button>
        </div>
      </div>
      {error && (
        <div className="estado--error flex items-center gap-2 border-t border-dash-border px-4 py-2">
          <Icon icon="lucide:cloud-off" width={14} height={14} className="shrink-0 text-[var(--estado)]" />
          <span className="flex-1 text-[11px] text-dash-fg">{error}</span>
          <button type="button" onClick={onLimpiarError} className="text-dash-muted hover:text-dash-fg">
            <Icon icon="lucide:x" width={13} height={13} />
          </button>
        </div>
      )}
    </section>
  );
}

/* ── Barra de guardar ───────────────────────────────────────────────────── */

export type PieLabels = {
  cambio: string;
  cambios: string;
  sinCambios: string;
  descartar: string;
  guardar: string;
  guardando: string;
};

/**
 * Pie de la ficha. A la izquierda lo destructivo (eliminar) y el estado de
 * los cambios; a la derecha descartar y guardar. Guardar se apaga sin cambios,
 * salvo `siempreGuardable` (una reserva nueva se crea aunque vaya vacía).
 */
export function PieFicha({
  cambios,
  error,
  guardando,
  onDescartar,
  izquierda,
  labels,
  labelGuardar,
  siempreGuardable = false,
}: {
  cambios: string[];
  error: string | null;
  guardando: boolean;
  onDescartar: () => void;
  izquierda?: ReactNode;
  labels: PieLabels;
  labelGuardar?: string;
  siempreGuardable?: boolean;
}) {
  const n = cambios.length;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {izquierda}
      {error ? (
        <span className="estado--error estado-chip inline-flex min-w-0 max-w-full items-center gap-1.5 truncate rounded-full px-2.5 py-0.5 text-[11px] font-bold">
          <Icon icon="lucide:alert-circle" width={12} height={12} className="shrink-0" aria-hidden />
          <span className="truncate">{error}</span>
        </span>
      ) : n > 0 ? (
        <span className="estado--curso estado-chip inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--estado)]" aria-hidden />
          {n} {n === 1 ? labels.cambio : labels.cambios}
        </span>
      ) : (
        <span className="text-[11px] text-dash-muted">{labels.sinCambios}</span>
      )}
      <span className="min-w-0 flex-1" />
      <div className="flex shrink-0 items-center gap-2">
        {n > 0 && (
          <button
            type="button"
            onClick={onDescartar}
            disabled={guardando}
            className="rd-chip motion-interactive rounded-full px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
          >
            {labels.descartar}
          </button>
        )}
        <button
          type="submit"
          disabled={guardando || (n === 0 && !siempreGuardable)}
          className="motion-interactive inline-flex items-center gap-1.5 rounded-full bg-[var(--estado-curso)] px-3.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-45"
        >
          <Icon
            icon={guardando ? "lucide:loader-2" : "lucide:save"}
            width={13}
            height={13}
            className={guardando ? "animate-spin" : ""}
            aria-hidden
          />
          {guardando ? labels.guardando : labelGuardar ?? labels.guardar}
        </button>
      </div>
    </div>
  );
}

/** Botón de eliminar del pie, en rojo de estado. */
export function BotonEliminarPie({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="estado--error estado-chip motion-interactive inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold"
    >
      <Icon icon="lucide:trash-2" width={13} height={13} aria-hidden />
      {label}
    </button>
  );
}

/* ── Fila abierta con cambios pendientes ────────────────────────────────── */

/**
 * `useFilaDesplegable` más la guarda de cambios sin guardar, como en Mis
 * Reservas: con cambios, replegar (botón o Escape) pide confirmación y salir
 * de la página avisa el navegador.
 */
export function useFilaConCambios({
  visibles,
  habilitado,
  pendientes,
  bloqueoEscape = false,
}: {
  visibles: readonly string[];
  habilitado: boolean;
  pendientes: number;
  bloqueoEscape?: boolean;
}) {
  const [confirmarDescarte, setConfirmarDescarte] = useState(false);
  const fila = useFilaDesplegable({ visibles, habilitado, bloqueoEscape: bloqueoEscape || pendientes > 0 });
  const { cerrar: cerrarFila } = fila;

  const cerrar = useCallback(() => {
    if (pendientes > 0) setConfirmarDescarte(true);
    else cerrarFila();
  }, [pendientes, cerrarFila]);

  useEffect(() => {
    if (pendientes === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || confirmarDescarte || bloqueoEscape) return;
      if ((e.target as HTMLElement | null)?.closest("input, select, textarea")) return;
      setConfirmarDescarte(true);
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [pendientes, confirmarDescarte, bloqueoEscape]);

  const descartarYCerrar = useCallback(() => {
    setConfirmarDescarte(false);
    cerrarFila();
  }, [cerrarFila]);

  return { fila, cerrar, confirmarDescarte, setConfirmarDescarte, descartarYCerrar };
}
