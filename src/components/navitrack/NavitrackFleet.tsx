"use client";

import { Icon } from "@iconify/react";
import type { Locale } from "@/lib/i18n/translations";
import { ETAPA_LABEL_KEY } from "./NavitrackShipment";
import { fmtFecha, fmtRelativo, interpolar } from "./navitrack-format";
import { parseOpDate, type AisSnapshot, type Journey, type NavitrackOperacion } from "./navitrack-model";
import { ETAPA_META, PROXIMO_DIAS, type EstadoEmbarque } from "./navitrack-estado";

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
export type FleetVista = "activos" | "arribados";

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

function EtapaChip({ row, tr }: { row: FleetRow; tr: Textos }) {
  const meta = ETAPA_META[row.estado.etapa];
  const enCurso = row.estado.etapa !== "ARRIBADO" && row.estado.etapa !== "EN_ORIGEN";
  return (
    <span className={`nt-tone--${meta.tono} nt-stage text-[11.5px]`}>
      <span className="nt-stage-icon !h-6 !w-6">
        <Icon icon={meta.icon} width={13} height={13} aria-hidden />
      </span>
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        {enCurso && <span className="nt-live-dot" aria-hidden />}
        {tr[ETAPA_LABEL_KEY[row.estado.etapa]]}
      </span>
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
            <h2 className="text-[15px] font-bold tracking-tight text-dash-fg">{tr.tableTitle}</h2>
            <p className="mt-0.5 text-[11.5px] text-dash-muted">
              {interpolar(tr.tableSubtitle, { n: String(total) })}
            </p>
          </div>

          <div className="flex shrink-0 rounded-xl border border-dash-border bg-dash-control/80 p-0.5">
            {(["activos", "arribados"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onVista(v)}
                aria-pressed={vista === v}
                className={`motion-interactive inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold ${
                  vista === v
                    ? "border border-dash-neon/40 bg-dash-neon/25 text-dash-fg"
                    : "border border-transparent text-dash-muted hover:text-dash-fg"
                }`}
              >
                {v === "activos" ? tr.vistaActivos : tr.vistaArribados}
                <span className="tabular-nums opacity-70">
                  {v === "activos" ? conteos.transito : conteos.arribados}
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
                            </p>
                          </div>
                          <EtapaChip row={row} tr={tr} />
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
              <table className="w-full border-collapse text-left text-[13px]">
                <thead className="sticky top-0 z-[1] bg-[color-mix(in_srgb,var(--dash-surface)_96%,transparent)] backdrop-blur">
                  <tr className="border-b border-dash-border">
                    {[
                      tr.colContenedor,
                      tr.colCliente,
                      tr.colRuta,
                      tr.colBuque,
                      tr.colEtd,
                      tr.colEta,
                      tr.colEstado,
                      tr.colActualizado,
                    ].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="whitespace-nowrap px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-dash-muted"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-dash-border">
                  {rows.map((row) => {
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
                        <td className="px-3 py-2.5">
                          <span className="block max-w-[150px] truncate font-bold text-dash-fg">
                            {row.op.contenedor || row.op.booking || row.op.ref_asli || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="block max-w-[170px] truncate text-dash-muted">
                            {row.op.cliente || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="flex max-w-[230px] items-center gap-1.5 truncate text-dash-fg">
                            <span className="truncate">{row.journey.origen.nombre || "—"}</span>
                            <Icon
                              icon="lucide:arrow-right"
                              width={12}
                              height={12}
                              className="shrink-0 text-dash-muted"
                              aria-hidden
                            />
                            <span className="truncate">{row.journey.destino.nombre || "—"}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="block max-w-[150px] truncate text-dash-fg">
                            {row.op.nave || "—"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-dash-muted tabular-nums">
                          {fmtFecha(parseOpDate(row.op.etd), locale) ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-dash-fg tabular-nums">
                          {fmtFecha(row.estado.eta.erp, locale) ?? "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <EtapaChip row={row} tr={tr} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-[11.5px] text-dash-muted">
                          {actualizado ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
