import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { applyOperacionesClienteFilter, shouldSkipOperacionesForCliente } from "@/lib/auth/operacionesClienteScope";
import { aplicarFiltroTemporada, listarTemporadas, type Temporada } from "@/lib/temporadas";
import { useTemporadaActiva } from "@/lib/useTemporadaActiva";
import { normalizarEstado } from "@/lib/operaciones/estados";
import { DashboardViewTabs, type DashboardView } from "./DashboardViewTabs";

type OperacionVolumen = {
  etd: string | null;
  especie: string | null;
  tipo_unidad: string | null;
  contenedor: string | null;
  pallets: number | null;
  peso_neto: number | null;
  total_cajas_25kg: number | null;
  total_cajas_5kg: number | null;
  estado_operacion: string | null;
  cliente: string | null;
  pod: string | null;
};

type Props = {
  view: DashboardView;
  onViewChange: (view: DashboardView) => void;
};

/** Valor del selector histórico: todas las temporadas (sin filtro). */
const TEMPORADA_TODAS = "__all__";

/** Anotado como `string` a propósito: con el literal, el genérico de PostgREST hace explotar la inferencia. */
const COLUMNAS: string =
  "etd, especie, tipo_unidad, contenedor, pallets, peso_neto, total_cajas_25kg, total_cajas_5kg, estado_operacion, cliente, pod";

type KpiTone = "cyan" | "sky" | "emerald" | "violet" | "amber" | "rose" | "blue";

type RankingItem = {
  label: string;
  operaciones: number;
  contenedores: number;
};

function num(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function parseEtd(value: string | null): Date | null {
  if (!value) return null;
  try {
    const d = parseISO(value.length === 10 ? `${value}T12:00:00` : value);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

function contenedorKey(value: string | null | undefined): string | null {
  const cont = (value ?? "").trim().toUpperCase();
  return cont || null;
}

function rankByField(
  ops: OperacionVolumen[],
  field: "cliente" | "pod",
  limit = 5
): { items: RankingItem[]; maxOps: number; maxCont: number; distinct: number } {
  const acc = new Map<string, { operaciones: number; contenedores: Set<string> }>();
  for (const op of ops) {
    const label = (op[field] ?? "").trim();
    if (!label) continue;
    let row = acc.get(label);
    if (!row) {
      row = { operaciones: 0, contenedores: new Set() };
      acc.set(label, row);
    }
    row.operaciones += 1;
    const cont = contenedorKey(op.contenedor);
    if (cont) row.contenedores.add(cont);
  }
  const items = Array.from(acc.entries())
    .map(([label, v]) => ({
      label,
      operaciones: v.operaciones,
      contenedores: v.contenedores.size,
    }))
    .sort(
      (a, b) =>
        b.contenedores - a.contenedores ||
        b.operaciones - a.operaciones ||
        a.label.localeCompare(b.label, "es")
    );
  return {
    items: items.slice(0, limit),
    maxOps: Math.max(...items.map((i) => i.operaciones), 1),
    maxCont: Math.max(...items.map((i) => i.contenedores), 1),
    distinct: acc.size,
  };
}

export function DashboardHistoricoContent({
  view,
  onViewChange,
}: Props) {
  const { t, locale } = useLocale();
  const tr = t.dashboard;
  const {
    isLoading: authLoading,
    isCliente,
    isEjecutivo,
    isAdmin,
    isSuperadmin,
    empresaNombres,
  } = useAuth();
  const { temporadaActiva, temporadaLoading } = useTemporadaActiva();

  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [temporadaSel, setTemporadaSel] = useState<string | null>(null);
  const [operaciones, setOperaciones] = useState<OperacionVolumen[]>([]);
  const [loading, setLoading] = useState(true);

  /** Indicadores de empresa / destino: solo roles comerciales y administración. */
  const showEmpresaInsights = isSuperadmin || isAdmin || isEjecutivo;

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const intl = locale === "es" ? "es-CL" : "en-US";
  const fmt = useCallback((value: number) => value.toLocaleString(intl, { maximumFractionDigits: 0 }), [intl]);

  useEffect(() => {
    if (temporadaLoading) return;
    setTemporadaSel((actual) => actual ?? temporadaActiva);
  }, [temporadaActiva, temporadaLoading]);

  useEffect(() => {
    if (!supabase) return;
    let vigente = true;
    void listarTemporadas(supabase).then(({ temporadas: lista }) => {
      if (vigente) setTemporadas(lista);
    });
    return () => {
      vigente = false;
    };
  }, [supabase]);

  const fetchVolumen = useCallback(async () => {
    if (!supabase || authLoading || temporadaLoading) return;
    if (shouldSkipOperacionesForCliente({ isCliente, isEjecutivo, empresaNombres })) {
      setOperaciones([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let query = supabase.from("operaciones").select(COLUMNAS).is("deleted_at", null);
    query = applyOperacionesClienteFilter(query, { isCliente, isEjecutivo, empresaNombres });
    query = aplicarFiltroTemporada(
      query,
      temporadaSel && temporadaSel !== TEMPORADA_TODAS ? temporadaSel : null
    );
    const { data } = await query.limit(5000);
    setOperaciones((data ?? []) as unknown as OperacionVolumen[]);
    setLoading(false);
  }, [supabase, authLoading, temporadaLoading, isCliente, isEjecutivo, empresaNombres, temporadaSel]);

  useEffect(() => {
    if (!authLoading) void fetchVolumen();
  }, [authLoading, fetchVolumen]);

  /** El volumen embarcado excluye las canceladas: nunca se movió carga. */
  const embarcadas = useMemo(
    () => operaciones.filter((op) => normalizarEstado(op.estado_operacion) !== "CANCELADA"),
    [operaciones]
  );

  /**
   * Cada magnitud lleva su cobertura (cuántas operaciones tienen el dato
   * cargado). Sin eso, un campo que casi nadie llena se ve como un cero y
   * parece un error del dashboard en lugar de un vacío de captura.
   */
  const totales = useMemo(() => {
    const contenedores = new Set<string>();
    const suma = { pallets: 0, pesoNeto: 0, cajas25: 0, cajas5: 0 };
    const cobertura = { pallets: 0, pesoNeto: 0, cajas25: 0, cajas5: 0 };
    let sinEtd = 0;

    const acumular = (campo: keyof typeof suma, valor: number | null) => {
      const n = num(valor);
      suma[campo] += n;
      if (n > 0) cobertura[campo] += 1;
    };

    for (const op of embarcadas) {
      const cont = contenedorKey(op.contenedor);
      if (cont) contenedores.add(cont);
      acumular("pallets", op.pallets);
      acumular("pesoNeto", op.peso_neto);
      acumular("cajas25", op.total_cajas_25kg);
      acumular("cajas5", op.total_cajas_5kg);
      if (!parseEtd(op.etd)) sinEtd += 1;
    }

    return {
      operaciones: embarcadas.length,
      contenedores: contenedores.size,
      suma,
      cobertura,
      sinEtd,
      palletsPorOperacion: cobertura.pallets > 0 ? suma.pallets / cobertura.pallets : 0,
    };
  }, [embarcadas]);

  const porMes = useMemo(() => {
    const buckets = new Map<string, { inicio: Date; operaciones: number; pallets: number }>();
    for (const op of embarcadas) {
      const etd = parseEtd(op.etd);
      if (!etd) continue;
      const inicio = new Date(etd.getFullYear(), etd.getMonth(), 1);
      const clave = format(inicio, "yyyy-MM");
      const actual = buckets.get(clave);
      if (actual) {
        actual.operaciones += 1;
        actual.pallets += num(op.pallets);
      } else {
        buckets.set(clave, { inicio, operaciones: 1, pallets: num(op.pallets) });
      }
    }
    const items = Array.from(buckets.values()).sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
    return { items, max: Math.max(...items.map((i) => i.operaciones), 1) };
  }, [embarcadas]);

  const porTipoUnidad = useMemo(() => {
    const counts = new Map<string, number>();
    for (const op of embarcadas) {
      const tipo = (op.tipo_unidad ?? "").trim().toUpperCase();
      if (!tipo) continue;
      counts.set(tipo, (counts.get(tipo) ?? 0) + 1);
    }
    const items = Array.from(counts.entries())
      .map(([tipo, cantidad]) => ({ tipo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad || a.tipo.localeCompare(b.tipo));
    return { items: items.slice(0, 6), max: Math.max(...items.map((i) => i.cantidad), 1) };
  }, [embarcadas]);

  const porEspecie = useMemo(() => {
    const acc = new Map<string, { operaciones: number; pallets: number }>();
    for (const op of embarcadas) {
      const especie = (op.especie ?? "").trim();
      if (!especie) continue;
      const actual = acc.get(especie);
      if (actual) {
        actual.operaciones += 1;
        actual.pallets += num(op.pallets);
      } else {
        acc.set(especie, { operaciones: 1, pallets: num(op.pallets) });
      }
    }
    const items = Array.from(acc.entries())
      .map(([especie, v]) => ({ especie, ...v }))
      .sort((a, b) => b.operaciones - a.operaciones || a.especie.localeCompare(b.especie, "es"));
    return { items: items.slice(0, 6), max: Math.max(...items.map((i) => i.operaciones), 1) };
  }, [embarcadas]);

  const porEmpresa = useMemo(
    () => (showEmpresaInsights ? rankByField(embarcadas, "cliente") : null),
    [embarcadas, showEmpresaInsights]
  );

  const porDestino = useMemo(
    () => (showEmpresaInsights ? rankByField(embarcadas, "pod") : null),
    [embarcadas, showEmpresaInsights]
  );

  const coberturaHint = (conDato: number) =>
    conDato === 0
      ? tr.volumeNoCoverage
      : `${fmt(conDato)}/${fmt(totales.operaciones)} ${tr.volumeCoverage}`;

  const kpis: Array<{
    key: string;
    label: string;
    value: string;
    hint: string;
    icon: string;
    iconAlt: string;
    tone: KpiTone;
    numeric: number;
  }> = [
    {
      key: "ops",
      label: tr.volumeOperations,
      value: fmt(totales.operaciones),
      hint: tr.volumeCancelledExcluded,
      icon: "lucide:layers",
      iconAlt: "lucide:activity",
      tone: "cyan",
      numeric: totales.operaciones,
    },
    {
      key: "cont",
      label: tr.volumeContainers,
      value: fmt(totales.contenedores),
      hint: coberturaHint(totales.contenedores),
      icon: "lucide:container",
      iconAlt: "lucide:box",
      tone: "sky",
      numeric: totales.contenedores,
    },
    {
      key: "pallets",
      label: tr.volumePallets,
      value: totales.cobertura.pallets > 0 ? fmt(totales.suma.pallets) : "—",
      hint: coberturaHint(totales.cobertura.pallets),
      icon: "lucide:package",
      iconAlt: "lucide:package-open",
      tone: "emerald",
      numeric: totales.suma.pallets,
    },
    {
      key: "kg",
      label: tr.volumeNetKg,
      value: totales.cobertura.pesoNeto > 0 ? fmt(totales.suma.pesoNeto) : "—",
      hint: coberturaHint(totales.cobertura.pesoNeto),
      icon: "lucide:weight",
      iconAlt: "lucide:scale",
      tone: "violet",
      numeric: totales.suma.pesoNeto,
    },
    {
      key: "c25",
      label: tr.volumeBoxes25,
      value: totales.cobertura.cajas25 > 0 ? fmt(totales.suma.cajas25) : "—",
      hint: coberturaHint(totales.cobertura.cajas25),
      icon: "lucide:box",
      iconAlt: "lucide:square-stack",
      tone: "amber",
      numeric: totales.suma.cajas25,
    },
    {
      key: "c5",
      label: tr.volumeBoxes5,
      value: totales.cobertura.cajas5 > 0 ? fmt(totales.suma.cajas5) : "—",
      hint: coberturaHint(totales.cobertura.cajas5),
      icon: "lucide:boxes",
      iconAlt: "lucide:layout-grid",
      tone: "rose",
      numeric: totales.suma.cajas5,
    },
  ];

  if (showEmpresaInsights && porEmpresa && porDestino) {
    kpis.splice(
      2,
      0,
      {
        key: "empresas",
        label: tr.volumeCompanies,
        value: fmt(porEmpresa.distinct),
        hint: tr.volumeByCompany,
        icon: "lucide:building-2",
        iconAlt: "lucide:users",
        tone: "blue",
        numeric: porEmpresa.distinct,
      },
      {
        key: "destinos",
        label: tr.volumeDestinations,
        value: fmt(porDestino.distinct),
        hint: tr.volumeByDestination,
        icon: "lucide:map-pin",
        iconAlt: "lucide:globe-2",
        tone: "emerald",
        numeric: porDestino.distinct,
      }
    );
  }

  const kpiGridClass = showEmpresaInsights
    ? "grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2.5 lg:gap-3"
    : "grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 lg:gap-3";

  const rankingTable = (
    ranking: NonNullable<typeof porEmpresa>,
    opts: {
      title: string;
      icon: string;
      labelHeader: string;
      barClass: string;
      pctClass: string;
      useContainersForPct: boolean;
    }
  ) => (
    <div className="dash-card rounded-xl overflow-hidden flex flex-col lg:min-h-0">
      <div className="dash-section-head shrink-0 px-3.5 py-2.5 flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 text-sm font-bold text-dash-fg truncate sm:text-base">
          <Icon icon={opts.icon} width={16} height={16} className="text-dash-neon shrink-0" />
          {opts.title}
        </p>
        <p className="text-xl font-bold text-dash-neon tabular-nums sm:text-2xl">{ranking.distinct}</p>
      </div>
      <div className="lg:flex-1 lg:min-h-0 lg:overflow-auto">
        {ranking.items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-dash-muted">{tr.noData}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-dash-surface">
              <tr className="text-dash-muted border-b border-cyan-300/10">
                <th className="px-3.5 py-1.5 font-bold">{opts.labelHeader}</th>
                <th className="px-2 py-1.5 font-bold text-right">{tr.volumeColContainers}</th>
                <th className="px-2 py-1.5 font-bold text-right hidden sm:table-cell">{tr.colOperations}</th>
                <th className="px-3.5 py-1.5 font-bold w-[34%]">{tr.colPct}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-300/10">
              {ranking.items.map((item) => {
                const pctBase = opts.useContainersForPct
                  ? totales.contenedores
                  : Math.max(totales.operaciones, 1);
                const pctValue = opts.useContainersForPct ? item.contenedores : item.operaciones;
                const pct = pctBase > 0 ? Math.round((pctValue / pctBase) * 100) : 0;
                const barRatio = opts.useContainersForPct
                  ? item.contenedores / ranking.maxCont
                  : item.operaciones / ranking.maxOps;
                return (
                  <tr key={item.label} className="hover:bg-cyan-400/5">
                    <td className="px-3.5 py-2 text-dash-fg font-semibold truncate max-w-[8rem]">
                      {item.label}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-dash-fg font-bold">
                      {fmt(item.contenedores)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-dash-muted font-semibold hidden sm:table-cell">
                      {fmt(item.operaciones)}
                    </td>
                    <td className="px-3.5 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-cyan-950/50 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${opts.barClass}`}
                            style={{ width: `${Math.max(barRatio * 100, 4)}%` }}
                          />
                        </div>
                        <span className={`text-[11px] tabular-nums font-bold w-8 text-right ${opts.pctClass}`}>
                          {pct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  return (
    <main className="dash-page relative flex min-h-0 flex-1 flex-col overflow-y-auto text-base lg:overflow-hidden">
      <div className="dash-toolbar relative z-10 shrink-0">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-2.5 sm:px-5 lg:py-3">
          <div className="min-w-0">
            <h1 className="dash-title text-xl font-bold leading-tight tracking-tight sm:text-2xl lg:text-3xl">
              {tr.historicTitle}
            </h1>
            <p className="dash-subtitle mt-0.5 truncate text-sm">
              {tr.volumeCancelledExcluded}
              {totales.sinEtd > 0 && <> · {fmt(totales.sinEtd)} {tr.volumeNoEtd}</>}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <DashboardViewTabs view={view} onChange={onViewChange} />
            <label className="sr-only" htmlFor="dashboard-temporada">{tr.season}</label>
            <select
              id="dashboard-temporada"
              value={temporadaSel ?? ""}
              onChange={(e) => setTemporadaSel(e.target.value || TEMPORADA_TODAS)}
              className="dash-control rounded-lg px-3 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-dash-neon/40"
            >
              <option value={TEMPORADA_TODAS} className="text-neutral-800">
                {tr.seasonAll}
              </option>
              {temporadas.map((tp) => (
                <option key={tp.id} value={tp.nombre} className="text-neutral-800">
                  {tp.nombre}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void fetchVolumen()}
              className="dash-control rounded-lg p-2.5 transition-colors"
              title={tr.refresh}
            >
              <Icon icon="lucide:refresh-cw" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="relative flex flex-col gap-3 p-4 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
          <div className={`${kpiGridClass} h-24 shrink-0`}>
            {Array.from({ length: showEmpresaInsights ? 8 : 6 }).map((_, i) => (
              <div key={i} className="motion-skeleton motion-skeleton-on-dark dash-card rounded-2xl" />
            ))}
          </div>
          <div className="motion-skeleton motion-skeleton-on-dark dash-card rounded-xl flex-1 min-h-[12rem]" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0 lg:min-h-[9rem]">
            <div className="motion-skeleton motion-skeleton-on-dark dash-card rounded-xl h-36 lg:h-full" />
            <div className="motion-skeleton motion-skeleton-on-dark dash-card rounded-xl h-36 lg:h-full" />
          </div>
        </div>
      ) : (
        <div className="relative flex flex-col gap-3 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4 lg:flex-1 lg:min-h-0 lg:overflow-hidden lg:gap-3">
          <div className={`shrink-0 ${kpiGridClass}`}>
            {kpis.map((kpi) => {
              const spark = Array.from({ length: 7 }, (_, i) => {
                const n = ((Math.abs(kpi.numeric) + 1) * (i + 3) * 19) % 51;
                return 0.28 + (n / 51) * 0.72;
              });
              return (
                <div
                  key={kpi.key}
                  className={`dash-card dash-kpi-card dash-kpi-card--${kpi.tone} min-w-0 rounded-2xl px-2.5 py-2.5 lg:px-3 lg:py-2.5`}
                >
                  <div className="relative z-[1] flex items-start justify-between gap-2">
                    <span className="dash-kpi-icon" aria-hidden>
                      <Icon icon={kpi.icon} width={16} height={16} />
                    </span>
                    <Icon
                      icon={kpi.iconAlt}
                      width={14}
                      height={14}
                      className="dash-kpi-icon-alt shrink-0 mt-0.5"
                      aria-hidden
                    />
                  </div>
                  <p className="dash-kpi-label relative z-[1] mt-1.5 text-dash-fg leading-snug line-clamp-2 text-[11px] sm:text-sm">
                    {kpi.label}
                  </p>
                  <div className="relative z-[1] mt-1.5 flex items-end justify-between gap-1.5">
                    <div className="min-w-0">
                      <p className="dash-kpi-value text-2xl font-bold sm:text-[1.75rem] lg:text-[1.85rem] tabular-nums leading-none">
                        {kpi.value}
                      </p>
                      <p className="dash-kpi-hint mt-1 text-[10px] leading-snug line-clamp-1 sm:text-[11px]">
                        {kpi.hint}
                      </p>
                    </div>
                    <div className="dash-kpi-spark hidden sm:flex" aria-hidden>
                      {spark.map((h, i) => (
                        <span key={i} style={{ height: `${Math.round(h * 100)}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fila media: ocupa el alto restante en desktop */}
          <div
            className={
              showEmpresaInsights
                ? "grid grid-cols-1 gap-3 lg:flex-1 lg:min-h-0 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)]"
                : "grid grid-cols-1 gap-3 lg:flex-1 lg:min-h-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]"
            }
          >
            <div className="dash-card rounded-xl overflow-hidden flex flex-col lg:min-h-0">
              <div className="dash-section-head shrink-0 px-3.5 py-2.5 flex items-baseline justify-between gap-2">
                <p className="inline-flex items-center gap-2 text-sm font-bold text-dash-fg sm:text-base">
                  <Icon icon="lucide:calendar-range" width={16} height={16} className="text-dash-neon shrink-0" />
                  {tr.volumeByMonth}
                </p>
                {totales.cobertura.pallets > 0 && (
                  <p className="text-xs text-dash-muted truncate sm:text-sm">
                    {tr.volumeAvgPallets}:{" "}
                    {totales.palletsPorOperacion.toLocaleString(intl, { maximumFractionDigits: 1 })}
                  </p>
                )}
              </div>
              {porMes.items.length === 0 ? (
                <div className="flex flex-1 items-center justify-center px-4 py-8">
                  <p className="text-sm text-dash-muted">{tr.noData}</p>
                </div>
              ) : (
                <div className="px-3 py-3 flex items-end gap-1.5 overflow-x-auto lg:flex-1 lg:min-h-0 sm:gap-2 sm:px-4">
                  {porMes.items.map((item) => {
                    const height = (item.operaciones / porMes.max) * 100;
                    return (
                      <div
                        key={item.inicio.toISOString()}
                        className="flex-1 min-w-[2.5rem] flex flex-col items-center gap-1 lg:h-full"
                      >
                        <span className="text-xs font-semibold text-dash-neon tabular-nums sm:text-sm">
                          {item.operaciones}
                        </span>
                        <div className="w-full h-28 flex items-end bg-cyan-950/45 rounded-md overflow-hidden lg:h-full lg:min-h-0">
                          <div
                            className="w-full bg-gradient-to-t from-sky-500/70 to-cyan-300 rounded-md"
                            style={{ height: `${Math.max(height, 4)}%` }}
                            title={
                              item.pallets > 0
                                ? `${item.operaciones} · ${fmt(item.pallets)} ${tr.volumePallets.toLowerCase()}`
                                : String(item.operaciones)
                            }
                          />
                        </div>
                        <span className="text-[10px] text-dash-muted whitespace-nowrap sm:text-xs">
                          {format(item.inicio, "MMM yy", { locale: locale === "es" ? es : undefined })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {showEmpresaInsights && porEmpresa && porDestino ? (
              <>
                {rankingTable(porEmpresa, {
                  title: tr.volumeContainersByCompany,
                  icon: "lucide:building-2",
                  labelHeader: tr.colClient,
                  barClass: "bg-sky-400",
                  pctClass: "text-dash-neon",
                  useContainersForPct: true,
                })}
                {rankingTable(porDestino, {
                  title: tr.volumeByDestination,
                  icon: "lucide:map-pin",
                  labelHeader: tr.colPod,
                  barClass: "bg-emerald-400",
                  pctClass: "text-emerald-300",
                  useContainersForPct: totales.contenedores > 0,
                })}
              </>
            ) : (
              <>
                <div className="dash-card rounded-xl overflow-hidden flex flex-col lg:min-h-0">
                  <div className="dash-section-head shrink-0 px-3.5 py-2.5">
                    <p className="inline-flex items-center gap-2 text-sm font-bold text-dash-fg sm:text-base">
                      <Icon icon="lucide:container" width={16} height={16} className="text-dash-neon shrink-0" />
                      {tr.volumeByUnitType}
                    </p>
                  </div>
                  <div className="px-3.5 py-2.5 space-y-2 lg:flex-1 lg:min-h-0 lg:overflow-auto">
                    {porTipoUnidad.items.length === 0 ? (
                      <p className="text-sm text-dash-muted">{tr.noData}</p>
                    ) : (
                      porTipoUnidad.items.map((item) => (
                        <div key={item.tipo}>
                          <div className="flex justify-between gap-2 text-sm mb-1">
                            <span className="text-dash-fg truncate font-semibold">{item.tipo}</span>
                            <span className="tabular-nums text-dash-neon shrink-0 font-bold">{fmt(item.cantidad)}</span>
                          </div>
                          <div className="h-1.5 bg-cyan-950/45 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-sky-400 rounded-full"
                              style={{ width: `${Math.max((item.cantidad / porTipoUnidad.max) * 100, 6)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="dash-card rounded-xl overflow-hidden flex flex-col lg:min-h-0">
                  <div className="shrink-0 px-3.5 py-2.5 border-b border-fuchsia-300/15 flex items-center justify-between gap-2">
                    <p className="inline-flex items-center gap-2 text-sm font-bold text-fuchsia-200/90 sm:text-base">
                      <Icon icon="lucide:sprout" width={16} height={16} className="text-fuchsia-300 shrink-0" />
                      {tr.volumeBySpecies}
                    </p>
                    <p className="text-xl font-bold text-fuchsia-300 tabular-nums">{porEspecie.items.length}</p>
                  </div>
                  <div className="px-3.5 py-2.5 space-y-2 lg:flex-1 lg:min-h-0 lg:overflow-auto">
                    {porEspecie.items.length === 0 ? (
                      <p className="text-sm text-dash-muted">{tr.noData}</p>
                    ) : (
                      porEspecie.items.map((item) => (
                        <div key={item.especie}>
                          <div className="flex justify-between gap-2 text-sm mb-1">
                            <span className="text-dash-fg truncate font-semibold">{item.especie}</span>
                            <span className="tabular-nums text-fuchsia-200 shrink-0 font-semibold">
                              {fmt(item.operaciones)}
                            </span>
                          </div>
                          <div className="h-1.5 bg-cyan-950/45 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-fuchsia-400 rounded-full"
                              style={{ width: `${Math.max((item.operaciones / porEspecie.max) * 100, 6)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Fila inferior: solo cuando hay insights de empresa (unidad + especie) */}
          {showEmpresaInsights && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:shrink-0 lg:min-h-[9.5rem] lg:max-h-[11rem]">
              <div className="dash-card rounded-xl overflow-hidden flex flex-col lg:min-h-0">
                <div className="dash-section-head shrink-0 px-3.5 py-2">
                  <p className="inline-flex items-center gap-2 text-sm font-bold text-dash-fg">
                    <Icon icon="lucide:container" width={15} height={15} className="text-dash-neon shrink-0" />
                    {tr.volumeByUnitType}
                  </p>
                </div>
                <div className="px-3.5 py-2 space-y-1.5 lg:flex-1 lg:min-h-0 lg:overflow-auto">
                  {porTipoUnidad.items.length === 0 ? (
                    <p className="text-sm text-dash-muted">{tr.noData}</p>
                  ) : (
                    porTipoUnidad.items.slice(0, 4).map((item) => (
                      <div key={item.tipo}>
                        <div className="flex justify-between gap-2 text-xs mb-0.5 sm:text-sm">
                          <span className="text-dash-fg truncate font-semibold">{item.tipo}</span>
                          <span className="tabular-nums text-dash-neon shrink-0 font-bold">{fmt(item.cantidad)}</span>
                        </div>
                        <div className="h-1.5 bg-cyan-950/45 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-400 rounded-full"
                            style={{ width: `${Math.max((item.cantidad / porTipoUnidad.max) * 100, 6)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="dash-card rounded-xl overflow-hidden flex flex-col lg:min-h-0">
                <div className="shrink-0 px-3.5 py-2 border-b border-fuchsia-300/15 flex items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-2 text-sm font-bold text-fuchsia-200/90">
                    <Icon icon="lucide:sprout" width={15} height={15} className="text-fuchsia-300 shrink-0" />
                    {tr.volumeBySpecies}
                  </p>
                  <p className="text-lg font-bold text-fuchsia-300 tabular-nums">{porEspecie.items.length}</p>
                </div>
                <div className="px-3.5 py-2 space-y-1.5 lg:flex-1 lg:min-h-0 lg:overflow-auto">
                  {porEspecie.items.length === 0 ? (
                    <p className="text-sm text-dash-muted">{tr.noData}</p>
                  ) : (
                    porEspecie.items.slice(0, 4).map((item) => (
                      <div key={item.especie}>
                        <div className="flex justify-between gap-2 text-xs mb-0.5 sm:text-sm">
                          <span className="text-dash-fg truncate font-semibold">{item.especie}</span>
                          <span className="tabular-nums text-fuchsia-200 shrink-0 font-semibold">
                            {fmt(item.operaciones)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-cyan-950/45 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-fuchsia-400 rounded-full"
                            style={{ width: `${Math.max((item.operaciones / porEspecie.max) * 100, 6)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
