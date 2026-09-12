"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import type { Locale } from "@/lib/i18n/translations";
import { ETAPA_LABEL_KEY } from "./NavitrackShipment";
import { fmtFecha, fmtRelativo, interpolar } from "./navitrack-format";
import { parseOpDate, type AisSnapshot, type Journey, type NavitrackOperacion } from "./navitrack-model";
import { ETAPA_META, PROXIMO_DIAS, type EstadoEmbarque } from "./navitrack-estado";
import { isoDePuerto } from "./navitrack-banderas";

type Textos = Record<string, string>;

export type FleetRow = {
  op: NavitrackOperacion;
  ais: AisSnapshot | null;
  journey: Journey;
  estado: EstadoEmbarque;
};

/** Etapas que un operador debe mirar hoy. Define el filtro y la franja de la fila. */
export function requiereAtencion(estado: EstadoEmbarque): boolean {
  return (
    estado.etapa === "POSIBLE_RETRASO" ||
    estado.etapa === "POSIBLE_TRANSBORDO" ||
    estado.etapa === "PROXIMO_DESTINO"
  );
}

/* ----------------------------------- KPI ----------------------------------- */

export type FleetFiltro = "transito" | "proximos" | "retrasos" | "transbordos" | null;
/** Dos listas distintas, no dos filtros: lo que se opera y lo que ya cerró. */
export type FleetVista = "activos" | "arribados" | "todos";

/** Columnas por las que se puede ordenar la tabla. */
type Orden =
  | "contenedor"
  | "reserva"
  | "cliente"
  | "ruta"
  | "buque"
  | "etd"
  | "eta"
  | "estado"
  | "actualizado";

/** Embarques por página: entran en pantalla sin scroll en un portátil. */
const POR_PAGINA = 11;

type KpiProps = {
  label: string;
  hint: string;
  valor: number;
  icon: string;
  acento: string;
  activo: boolean;
  onClick: () => void;
};

function Kpi({ label, hint, valor, icon, acento, activo, onClick }: KpiProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`dash-card dash-kpi-card dash-kpi-card--${acento} motion-interactive flex items-center gap-3 p-3.5 text-left sm:p-4 ${
        activo ? "ring-2 ring-[color-mix(in_srgb,var(--dash-kpi-accent)_55%,transparent)]" : ""
      }`}
    >
      <span className="dash-kpi-icon shrink-0">
        <Icon icon={icon} width={18} height={18} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="dash-kpi-label block text-dash-muted">{label}</span>
        <span className="dash-kpi-value mt-1 block text-[26px] font-extrabold sm:text-[30px]">
          {valor}
        </span>
        <span className="dash-kpi-hint mt-1 block truncate text-[11px]">{hint}</span>
      </span>
    </button>
  );
}

/* --------------------------------- Estado ---------------------------------- */

function EtapaChip({ row, tr, locale }: { row: FleetRow; tr: Textos; locale: Locale }) {
  const meta = ETAPA_META[row.estado.etapa];
  const enCurso = row.estado.etapa !== "ARRIBADO" && row.estado.etapa !== "EN_ORIGEN";

  /*
   * En una sospecha de transbordo, el estado solo no alcanza.
   *
   * La tabla muestra el ETA del destino final, así que "Posible transbordo"
   * junto a una fecha lejana parece un error del sistema. Lo que lo explica es
   * el otro dato: qué puerto declaró el buque y cuándo dijo que llegaba ahí.
   * Sin eso, una alerta correcta se lee como una falsa.
   */
  const sospecha = row.estado.etapa === "POSIBLE_TRANSBORDO";
  const puerto = sospecha ? (row.ais?.destination ?? "").trim() : "";
  const llegada = sospecha ? fmtFecha(row.ais?.eta ?? null, locale) : null;

  return (
    <span className="inline-flex flex-col items-center gap-0.5">
      <span
        className={`nt-tone--${meta.tono} nt-stage text-[12.5px]`}
        title={puerto ? `${puerto}${llegada ? ` · ${llegada}` : ""}` : undefined}
      >
        <span className="nt-stage-icon !h-6 !w-6">
          <Icon icon={meta.icon} width={13} height={13} aria-hidden />
        </span>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          {enCurso && <span className="nt-live-dot" aria-hidden />}
          {tr[ETAPA_LABEL_KEY[row.estado.etapa]]}
        </span>
      </span>
      {puerto && (
        <span className="max-w-[170px] truncate text-[10.5px] font-semibold text-dash-fg/60">
          {puerto}
          {llegada ? ` · ${llegada}` : ""}
        </span>
      )}
    </span>
  );
}

/* ---------------------------------- Vista ---------------------------------- */

type FleetProps = {
  rows: FleetRow[];
  total: number;
  conteos: {
    transito: number;
    proximos: number;
    retrasos: number;
    transbordos: number;
    arribados: number;
  };
  vista: FleetVista;
  onVista: (v: FleetVista) => void;
  busqueda: string;
  onBusqueda: (v: string) => void;
  filtro: FleetFiltro;
  onFiltro: (v: FleetFiltro) => void;
  locale: Locale;
  tr: Textos;
  onSelect: (id: string) => void;
  cargando: boolean;
};

/** Texto por el que se ordena cada columna. Las fechas ya vienen comparables en ISO. */
function valorDeOrden(row: FleetRow, col: Orden, tr: Record<string, string>): string {
  switch (col) {
    case "contenedor":
      return (row.op.contenedor || row.op.booking || row.op.ref_asli || "").toUpperCase();
    case "reserva":
      return (row.op.booking ?? "").toUpperCase();
    case "cliente":
      return (row.op.cliente ?? "").toUpperCase();
    case "ruta":
      return `${row.journey.origen.nombre}${row.journey.destino.nombre}`.toUpperCase();
    case "buque":
      return (row.journey.naveActual || row.op.nave || "").toUpperCase();
    case "etd":
      return row.op.etd ?? "";
    case "eta":
      return row.op.eta ?? "";
    case "estado":
      return tr[ETAPA_LABEL_KEY[row.estado.etapa]] ?? row.estado.etapa;
    case "actualizado":
      // Al revés a propósito: lo más reciente primero al ordenar descendente.
      return row.journey.position?.at?.toISOString() ?? "";
    default:
      return "";
  }
}

/**
 * Bandera del puerto, en SVG.
 *
 * No se usa el emoji: Windows no trae la fuente que combina los indicadores
 * regionales y dibuja un literal "CL" en vez de la bandera de Chile. El icono
 * de Iconify es un SVG y se ve igual en cualquier sistema.
 *
 * Sin país conocido no se dibuja nada. Una bandera equivocada en logística
 * internacional se nota, y un hueco es más honesto.
 */
function BanderaPuerto({ puerto }: { puerto: string | null | undefined }) {
  const iso = isoDePuerto(puerto);
  if (!iso) return null;
  return (
    <Icon
      icon={`circle-flags:${iso.toLowerCase()}`}
      width={14}
      height={14}
      className="shrink-0"
      aria-hidden
    />
  );
}

export function NavitrackFleet({
  rows,
  total,
  conteos,
  vista,
  onVista,
  busqueda,
  onBusqueda,
  filtro,
  onFiltro,
  locale,
  tr,
  onSelect,
  cargando,
}: FleetProps) {
  /*
   * Orden y paginación viven aquí, no en el contenedor.
   *
   * Son preferencias de lectura de esta tabla: nadie las necesita fuera, y
   * subirlas obligaría a redibujar el módulo entero al cambiar de página.
   */
  const [orden, setOrden] = useState<{ col: Orden; desc: boolean }>({ col: "eta", desc: false });
  const [pagina, setPagina] = useState(1);

  const ordenar = (col: Orden) => {
    setPagina(1);
    setOrden((o) => (o.col === col ? { col, desc: !o.desc } : { col, desc: false }));
  };

  // Cambiar de vista o de filtro deja la página vieja fuera de rango.
  useEffect(() => {
    setPagina(1);
  }, [vista, filtro, busqueda]);

  const ordenadas = useMemo(() => {
    const copia = [...rows];
    copia.sort((a, b) => {
      const va = valorDeOrden(a, orden.col, tr);
      const vb = valorDeOrden(b, orden.col, tr);
      // Lo vacío siempre al final: un dato que falta no es "el menor".
      if (!va && vb) return 1;
      if (va && !vb) return -1;
      const cmp = va.localeCompare(vb, undefined, { numeric: true });
      return orden.desc ? -cmp : cmp;
    });
    return copia;
  }, [rows, orden, tr]);

  const paginas = Math.max(1, Math.ceil(ordenadas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, paginas);
  const desde = (paginaActual - 1) * POR_PAGINA;
  const visibles = ordenadas.slice(desde, desde + POR_PAGINA);

  const relativos = {
    haceMenosDeUnMinuto: tr.haceMenosDeUnMinuto,
    haceMinutos: tr.haceMinutos,
    haceHoras: tr.haceHoras,
    haceDias: tr.haceDias,
  };

  return (
    <div className="motion-view-section flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-2.5 sm:p-3.5">
      {/* Cuatro números que dicen qué mirar hoy. Cada uno alterna el filtro de la tabla.
          Solo describen lo que está en curso, así que no se muestran sobre los arribados. */}
      <div
        className={`grid shrink-0 grid-cols-2 gap-2.5 xl:grid-cols-4 ${
          vista === "arribados" ? "hidden" : ""
        }`}
      >
        {([
          {
            key: "transito" as const,
            label: tr.kpiEnTransito,
            hint: tr.kpiEnTransitoHint,
            valor: conteos.transito,
            icon: "lucide:ship",
            acento: "emerald",
          },
          {
            key: "proximos" as const,
            label: tr.kpiProximos,
            hint: interpolar(tr.kpiProximosHint, { dias: String(PROXIMO_DIAS) }),
            valor: conteos.proximos,
            icon: "lucide:flag",
            acento: "amber",
          },
          {
            key: "retrasos" as const,
            label: tr.kpiRetrasos,
            hint: tr.kpiRetrasosHint,
            valor: conteos.retrasos,
            icon: "lucide:clock-alert",
            acento: "rose",
          },
          {
            key: "transbordos" as const,
            label: tr.kpiTransbordos,
            hint: tr.kpiTransbordosHint,
            valor: conteos.transbordos,
            icon: "lucide:git-branch",
            acento: "orange",
          },
        ]).map((k) => (
          <Kpi
            key={k.key}
            label={k.label}
            hint={k.hint}
            valor={k.valor}
            icon={k.icon}
            acento={k.acento}
            activo={filtro === k.key}
            onClick={() => onFiltro(filtro === k.key ? null : k.key)}
          />
        ))}
      </div>

      <section className="dash-card dash-card-static flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="dash-section-head flex shrink-0 flex-wrap items-center justify-between gap-2.5 px-3.5 py-3">
          <div className="min-w-0">
            <h2 className="text-[16px] font-extrabold tracking-tight text-dash-fg">{tr.tableTitle}</h2>
            <p className="mt-0.5 text-[12px] text-dash-muted">
              {interpolar(tr.tableSubtitle, { n: String(total) })}
            </p>
          </div>

          <div className="flex shrink-0 rounded-xl border border-dash-border bg-dash-control/80 p-0.5">
            {(["activos", "arribados", "todos"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onVista(v)}
                aria-pressed={vista === v}
                className={`motion-interactive inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-bold ${
                  vista === v
                    ? "border border-dash-neon/40 bg-dash-neon/25 text-dash-fg"
                    : "border border-transparent text-dash-muted hover:text-dash-fg"
                }`}
              >
                {v === "activos" ? tr.vistaActivos : v === "arribados" ? tr.vistaArribados : tr.vistaTodos}
                <span className="tabular-nums opacity-70">
                  {v === "activos" ? conteos.transito : v === "arribados" ? conteos.arribados : total}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            <div className="relative min-w-0 flex-1 sm:max-w-[300px]">
              <Icon
                icon="lucide:search"
                width={14}
                height={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-dash-muted"
                aria-hidden
              />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => onBusqueda(e.target.value)}
                placeholder={tr.searchPlaceholder}
                aria-label={tr.searchPlaceholder}
                className="dash-control w-full py-2 pl-8 pr-2.5 text-[13px] text-dash-fg placeholder:text-dash-muted focus:outline-none focus:ring-2 focus:ring-dash-neon/40"
              />
            </div>
            {filtro && (
              <button
                type="button"
                onClick={() => onFiltro(null)}
                className="dash-control motion-interactive inline-flex shrink-0 items-center gap-1.5 px-2.5 py-2 text-[11.5px] font-semibold"
              >
                <Icon icon="lucide:x" width={13} height={13} aria-hidden />
                {tr.filterAll}
              </button>
            )}
          </div>
        </div>

        {cargando ? (
          <div className="flex flex-1 items-center justify-center gap-2 py-16 text-sm text-dash-muted">
            <Icon icon="lucide:loader-2" width={18} height={18} className="animate-spin text-dash-neon" aria-hidden />
            {tr.loading}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <Icon icon="lucide:ship" width={30} height={30} className="text-dash-muted opacity-70" aria-hidden />
            <p className="text-sm text-dash-muted">
              {total > 0
                ? tr.emptyFilter
                : vista === "arribados"
                  ? tr.emptyArribados
                  : tr.emptyFleet}
            </p>
          </div>
        ) : (
          <>
            {/* Móvil: la fila se vuelve tarjeta y conserva la jerarquía. */}
            <div className="min-h-0 flex-1 overflow-y-auto md:hidden">
              <ul className="divide-y divide-dash-border">
                {rows.map((row) => {
                  const meta = ETAPA_META[row.estado.etapa];
                  const flag = requiereAtencion(row.estado);
                  return (
                    <li key={row.op.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(row.op.id)}
                        className={`nt-row nt-tone--${meta.tono} ${
                          flag ? "nt-row--flag" : ""
                        } w-full px-3.5 py-3 text-left`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-bold text-dash-fg">
                              {row.op.contenedor || row.op.booking || row.op.ref_asli || "—"}
                            </p>
                            <p className="mt-0.5 truncate text-[11.5px] text-dash-muted">
                              {row.op.cliente || "—"}
                              {/* En móvil no hay columnas: la reserva va detrás
                                  del cliente, que es como se la nombra al hablar. */}
                              {row.op.booking ? ` · ${tr.colReserva} ${row.op.booking}` : ""}
                            </p>
                          </div>
                          <EtapaChip row={row} tr={tr} locale={locale} />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-dash-muted">
                          <span className="flex min-w-0 items-center gap-1 truncate">
                            {row.journey.origen.nombre || "—"}
                            <Icon icon="lucide:arrow-right" width={11} height={11} aria-hidden />
                            {row.journey.destino.nombre || "—"}
                          </span>
                          <span className="truncate">{row.op.nave || "—"}</span>
                          <span className="tabular-nums">
                            {tr.colEtd} {fmtFecha(parseOpDate(row.op.etd), locale) ?? "—"}
                          </span>
                          <span className="font-semibold text-dash-fg tabular-nums">
                            {tr.colEta} {fmtFecha(row.estado.eta.erp, locale) ?? "—"}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="hidden min-h-0 flex-1 overflow-auto md:block">
              <table className="nt-tabla w-full border-collapse text-left text-[14.5px]">
                <thead className="sticky top-0 z-[1] backdrop-blur">
                  <tr className="border-b border-dash-border">
                    {(
                      [
                        ["contenedor", tr.colContenedor],
                        ["reserva", tr.colReserva],
                        ["cliente", tr.colCliente],
                        ["ruta", tr.colRuta],
                        ["buque", tr.colBuque],
                        ["etd", tr.colEtd],
                        ["eta", tr.colEta],
                        ["estado", tr.colEstado],
                        ["actualizado", tr.colActualizado],
                      ] as [Orden, string][]
                    ).map(([col, h]) => {
                      const activa = orden.col === col;
                      return (
                        <th
                          key={col}
                          scope="col"
                          aria-sort={activa ? (orden.desc ? "descending" : "ascending") : "none"}
                          className={`whitespace-nowrap py-3.5 text-center text-[12.5px] font-semibold uppercase tracking-[0.07em] text-dash-fg/60 ${
                            col === "actualizado" ? "px-2" : "px-3.5"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => ordenar(col)}
                            title={h}
                            aria-label={h}
                            className="motion-interactive mx-auto inline-flex items-center gap-1 hover:text-dash-fg"
                          >
                            {/* La última actualización se rotula con el ícono de
                                refresco: el texto ocupaba más que el propio dato
                                y empujaba a las columnas que sí se leen. */}
                            {col === "actualizado" ? (
                              <Icon icon="lucide:refresh-cw" width={13} height={13} aria-hidden />
                            ) : (
                              h
                            )}
                            {/* La flecha solo se pinta en la columna activa; en
                                las demás queda tenue para invitar sin gritar. */}
                            <Icon
                              icon={
                                activa
                                  ? orden.desc
                                    ? "lucide:arrow-down"
                                    : "lucide:arrow-up"
                                  : "lucide:chevrons-up-down"
                              }
                              width={12}
                              height={12}
                              className={activa ? "text-dash-neon" : "opacity-35"}
                              aria-hidden
                            />
                          </button>
                        </th>
                      );
                    })}
                    <th
                      scope="col"
                      className="whitespace-nowrap px-3.5 py-3.5 text-center text-[12.5px] font-semibold uppercase tracking-[0.07em] text-dash-fg/60"
                    >
                      {tr.colAcciones}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dash-border">
                  {visibles.map((row) => {
                    const meta = ETAPA_META[row.estado.etapa];
                    const flag = requiereAtencion(row.estado);
                    const actualizado = fmtRelativo(row.journey.position?.at ?? null, relativos);
                    return (
                      <tr
                        key={row.op.id}
                        onClick={() => onSelect(row.op.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelect(row.op.id);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`${tr.verDetalle} ${row.op.contenedor ?? ""}`}
                        className={`nt-row nt-tone--${meta.tono} ${
                          flag ? "nt-row--flag" : ""
                        } cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-dash-neon/50`}
                      >
                        <td className="px-3.5 py-3 text-center">
                          <span className="mx-auto block max-w-[170px] truncate text-[15px] font-bold tracking-tight text-dash-fg">
                            {row.op.contenedor || row.op.booking || row.op.ref_asli || "—"}
                          </span>
                        </td>
                        <td className="px-3.5 py-3">
                          {/* El booking es como la naviera y el cliente nombran
                              el embarque; el contenedor es lo que se mueve. Se
                              muestran los dos porque cada área busca por el suyo. */}
                          <span className="mx-auto block max-w-[150px] truncate font-semibold text-dash-fg/85 tabular-nums">
                            {row.op.booking || "—"}
                          </span>
                        </td>
                        <td className="px-3.5 py-3">
                          <span className="mx-auto block max-w-[170px] truncate font-medium text-dash-fg/75">
                            {row.op.cliente || "—"}
                          </span>
                        </td>
                        <td className="px-3.5 py-3">
                          {/* Las banderas se leen antes que el texto: de un
                              vistazo se ve de dónde a dónde va la carga. */}
                          <span className="mx-auto flex max-w-[260px] items-center justify-center gap-1.5 truncate font-semibold text-dash-fg">
                            <BanderaPuerto puerto={row.journey.origen.nombre} />
                            <span className="truncate">{row.journey.origen.nombre || "—"}</span>
                            <Icon
                              icon="lucide:arrow-right"
                              width={12}
                              height={12}
                              className="shrink-0 text-dash-muted"
                              aria-hidden
                            />
                            <BanderaPuerto puerto={row.journey.destino.nombre} />
                            <span className="truncate">{row.journey.destino.nombre || "—"}</span>
                          </span>
                        </td>
                        <td className="px-3.5 py-3">
                          <span className="mx-auto flex max-w-[180px] items-center justify-center gap-1.5 truncate font-semibold text-dash-fg/90">
                            <Icon
                              icon="lucide:ship"
                              width={13}
                              height={13}
                              className="shrink-0 text-dash-muted"
                              aria-hidden
                            />
                            {/* La nave que lleva la carga ahora, no la del
                                primer tramo: con transbordo no son la misma. */}
                            <span className="truncate">
                              {row.journey.naveActual || row.op.nave || "—"}
                            </span>
                            {row.journey.tramoActual && row.journey.escalas.length > 2 && (
                              <Icon
                                icon="lucide:git-branch"
                                width={11}
                                height={11}
                                className="shrink-0 text-dash-neon"
                                aria-label={tr.cadenaTitulo}
                              />
                            )}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-3 text-center text-[13px] font-medium text-dash-fg/60 tabular-nums">
                          {fmtFecha(parseOpDate(row.op.etd), locale) ?? "—"}
                        </td>
                        {/* El ETA es el compromiso con el cliente: es el dato
                            que más se mira, y se nota. */}
                        <td className="whitespace-nowrap px-3.5 py-3 text-center text-[15px] font-bold text-dash-fg tabular-nums">
                          {fmtFecha(row.estado.eta.erp, locale) ?? "—"}
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <EtapaChip row={row} tr={tr} locale={locale} />
                        </td>
                        {/* Solo el valor, sin repetir la etiqueta: el ícono de
                            la cabecera ya dice de qué se trata. */}
                        <td
                          className="whitespace-nowrap px-2 py-3 text-center text-[12px] font-medium text-dash-fg/55"
                          title={actualizado ?? undefined}
                        >
                          {actualizado ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-3 text-center">
                          {/* La fila entera ya abre el embarque; el botón está
                              para quien navega con teclado o busca el gesto
                              explícito. */}
                          <span
                            role="button"
                            tabIndex={-1}
                            aria-hidden
                            className="nt-row-accion inline-flex h-7 w-7 items-center justify-center rounded-lg border border-dash-border text-dash-muted"
                          >
                            <Icon icon="lucide:eye" width={13} height={13} />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pie: cuántos se ven de cuántos, y el paso de página.
              * Se oculta si todo cabe en una: un paginador de una sola página
              * es ruido. */}
            {paginas > 1 && (
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-dash-border px-4 py-2.5">
                <p className="text-[11.5px] text-dash-muted tabular-nums">
                  {interpolar(tr.paginacion, {
                    desde: String(desde + 1),
                    hasta: String(desde + visibles.length),
                    total: String(ordenadas.length),
                  })}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPagina((n) => Math.max(1, n - 1))}
                    disabled={paginaActual <= 1}
                    aria-label={tr.paginaAnterior}
                    className="dash-control motion-interactive flex h-7 w-7 items-center justify-center disabled:opacity-35"
                  >
                    <Icon icon="lucide:chevron-left" width={14} height={14} aria-hidden />
                  </button>
                  {Array.from({ length: paginas }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPagina(n)}
                      aria-current={n === paginaActual ? "page" : undefined}
                      className={`motion-interactive h-7 min-w-7 rounded-lg px-2 text-[11.5px] font-bold tabular-nums ${
                        n === paginaActual
                          ? "border border-dash-neon/40 bg-dash-neon/25 text-dash-fg"
                          : "border border-dash-border text-dash-muted hover:text-dash-fg"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPagina((n) => Math.min(paginas, n + 1))}
                    disabled={paginaActual >= paginas}
                    aria-label={tr.paginaSiguiente}
                    className="dash-control motion-interactive flex h-7 w-7 items-center justify-center disabled:opacity-35"
                  >
                    <Icon icon="lucide:chevron-right" width={14} height={14} aria-hidden />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
