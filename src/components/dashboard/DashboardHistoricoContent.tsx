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
import { NeonThemeToggle } from "@/components/ui/NeonThemeToggle";
import type { NeonTheme } from "@/lib/ui/neonTheme";

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
};

type Props = {
  view: DashboardView;
  onViewChange: (view: DashboardView) => void;
  theme?: NeonTheme;
  onThemeChange?: (theme: NeonTheme) => void;
};

/** Anotado como `string` a propósito: con el literal, el genérico de PostgREST hace explotar la inferencia. */
const COLUMNAS: string =
  "etd, especie, tipo_unidad, contenedor, pallets, peso_neto, total_cajas_25kg, total_cajas_5kg, estado_operacion";

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

export function DashboardHistoricoContent({
  view,
  onViewChange,
  theme = "dark",
  onThemeChange,
}: Props) {
  const { t, locale } = useLocale();
  const tr = t.dashboard;
  const { isLoading: authLoading, isCliente, isEjecutivo, empresaNombres } = useAuth();
  const { temporadaActiva, temporadaLoading } = useTemporadaActiva();

  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [temporadaSel, setTemporadaSel] = useState<string | null>(null);
  const [operaciones, setOperaciones] = useState<OperacionVolumen[]>([]);
  const [loading, setLoading] = useState(true);

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
    query = aplicarFiltroTemporada(query, temporadaSel);
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
      const cont = (op.contenedor ?? "").trim();
      if (cont) contenedores.add(cont.toUpperCase());
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

  const coberturaHint = (conDato: number) =>
    conDato === 0
      ? tr.volumeNoCoverage
      : `${fmt(conDato)}/${fmt(totales.operaciones)} ${tr.volumeCoverage}`;

  const kpis = [
    {
      key: "ops",
      label: tr.volumeOperations,
      value: fmt(totales.operaciones),
      hint: null,
      icon: "lucide:layers",
      accent: "text-cyan-300",
      ring: "border-cyan-300/25",
    },
    {
      key: "cont",
      label: tr.volumeContainers,
      value: fmt(totales.contenedores),
      hint: coberturaHint(totales.contenedores),
      icon: "lucide:container",
      accent: "text-sky-300",
      ring: "border-sky-300/25",
    },
    {
      key: "pallets",
      label: tr.volumePallets,
      value: totales.cobertura.pallets > 0 ? fmt(totales.suma.pallets) : "—",
      hint: coberturaHint(totales.cobertura.pallets),
      icon: "lucide:package",
      accent: "text-emerald-300",
      ring: "border-emerald-300/25",
    },
    {
      key: "kg",
      label: tr.volumeNetKg,
      value: totales.cobertura.pesoNeto > 0 ? fmt(totales.suma.pesoNeto) : "—",
      hint: coberturaHint(totales.cobertura.pesoNeto),
      icon: "lucide:weight",
      accent: "text-violet-300",
      ring: "border-violet-300/25",
    },
    {
      key: "c25",
      label: tr.volumeBoxes25,
      value: totales.cobertura.cajas25 > 0 ? fmt(totales.suma.cajas25) : "—",
      hint: coberturaHint(totales.cobertura.cajas25),
      icon: "lucide:box",
      accent: "text-amber-300",
      ring: "border-amber-300/25",
    },
    {
      key: "c5",
      label: tr.volumeBoxes5,
      value: totales.cobertura.cajas5 > 0 ? fmt(totales.suma.cajas5) : "—",
      hint: coberturaHint(totales.cobertura.cajas5),
      icon: "lucide:boxes",
      accent: "text-fuchsia-300",
      ring: "border-fuchsia-300/25",
    },
  ];

  return (
    <main className="dash-page relative flex min-h-0 flex-1 flex-col overflow-y-auto text-base">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute top-16 right-0 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
      </div>

      <div className="dash-toolbar relative z-10 shrink-0">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h1 className="dash-title text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{tr.historicTitle}</h1>
            <p className="dash-subtitle mt-1 truncate text-sm">
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
              onChange={(e) => setTemporadaSel(e.target.value || null)}
              className="dash-control rounded-lg px-3 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-dash-neon/40"
            >
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
            <NeonThemeToggle theme={theme} onThemeChange={onThemeChange} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="relative p-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 h-24">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="motion-skeleton motion-skeleton-on-dark bg-dash-surface/80 rounded-xl border border-cyan-300/20" />
            ))}
          </div>
          <div className="motion-skeleton motion-skeleton-on-dark bg-dash-surface/80 rounded-xl border border-cyan-300/20 h-64" />
        </div>
      ) : (
        <div className="relative flex flex-col gap-4 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {kpis.map((kpi) => (
              <div key={kpi.key} className="dash-card rounded-xl px-3.5 py-3.5 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-dash-fg leading-snug line-clamp-2">{kpi.label}</p>
                  <Icon icon={kpi.icon} width={18} height={18} className={`shrink-0 mt-0.5 ${kpi.accent}`} />
                </div>
                <p className={`text-3xl sm:text-4xl font-bold tabular-nums leading-none mt-2.5 ${kpi.accent}`}>{kpi.value}</p>
                {kpi.hint && <p className="text-sm text-dash-muted leading-snug line-clamp-2 mt-2">{kpi.hint}</p>}
              </div>
            ))}
          </div>

          <div className="dash-card rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-cyan-300/15 flex items-baseline justify-between gap-2">
              <p className="text-base font-bold text-dash-fg">{tr.volumeByMonth}</p>
              {totales.cobertura.pallets > 0 && (
                <p className="text-sm text-dash-muted">
                  {tr.volumeAvgPallets}: {totales.palletsPorOperacion.toLocaleString(intl, { maximumFractionDigits: 1 })}
                </p>
              )}
            </div>
            {porMes.items.length === 0 ? (
              <p className="px-4 py-10 text-center text-base text-dash-muted">{tr.noData}</p>
            ) : (
              <div className="px-4 py-4 flex items-end gap-2 overflow-x-auto">
                {porMes.items.map((item) => {
                  const height = (item.operaciones / porMes.max) * 100;
                  return (
                    <div key={item.inicio.toISOString()} className="flex-1 min-w-[3rem] flex flex-col items-center gap-1.5">
                      <span className="text-sm font-semibold text-dash-fg/85 tabular-nums">{item.operaciones}</span>
                      <div className="w-full h-40 flex items-end bg-cyan-950/45 rounded-sm overflow-hidden">
                        <div
                          className="w-full bg-sky-400/80 rounded-sm"
                          style={{ height: `${Math.max(height, 4)}%` }}
                          title={
                            item.pallets > 0
                              ? `${item.operaciones} · ${fmt(item.pallets)} ${tr.volumePallets.toLowerCase()}`
                              : String(item.operaciones)
                          }
                        />
                      </div>
                      <span className="text-xs text-dash-muted whitespace-nowrap">
                        {format(item.inicio, "MMM yy", { locale: locale === "es" ? es : undefined })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="dash-card rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-cyan-300/15">
                <p className="text-base font-bold text-dash-fg">{tr.volumeByUnitType}</p>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                {porTipoUnidad.items.length === 0 ? (
                  <p className="text-base text-dash-muted">{tr.noData}</p>
                ) : (
                  porTipoUnidad.items.map((item) => (
                    <div key={item.tipo}>
                      <div className="flex justify-between gap-2 text-base mb-1">
                        <span className="text-dash-fg truncate">{item.tipo}</span>
                        <span className="tabular-nums text-dash-fg shrink-0 font-semibold">{fmt(item.cantidad)}</span>
                      </div>
                      <div className="h-2 bg-cyan-950/45 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 rounded-full"
                          style={{ width: `${Math.max((item.cantidad / porTipoUnidad.max) * 100, 6)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="dash-card rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-fuchsia-300/15">
                <p className="text-base font-bold text-fuchsia-200/90">{tr.volumeBySpecies}</p>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                {porEspecie.items.length === 0 ? (
                  <p className="text-base text-dash-muted">{tr.noData}</p>
                ) : (
                  porEspecie.items.map((item) => (
                    <div key={item.especie}>
                      <div className="flex justify-between gap-2 text-base mb-1">
                        <span className="text-dash-fg truncate">{item.especie}</span>
                        <span className="tabular-nums text-fuchsia-200 shrink-0 font-semibold">
                          {fmt(item.operaciones)}
                          {item.pallets > 0 && <> · {fmt(item.pallets)} {tr.volumePallets.toLowerCase()}</>}
                        </span>
                      </div>
                      <div className="h-2 bg-cyan-950/45 rounded-full overflow-hidden">
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
        </div>
      )}
    </main>
  );
}
