import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  applyOperacionesClienteFilter,
  shouldSkipOperacionesForCliente,
} from "@/lib/auth/operacionesClienteScope";
import { aplicarFiltroTemporada } from "@/lib/temporadas";
import { useTemporadaActiva } from "@/lib/useTemporadaActiva";
import { ESTADO_META, normalizarEstado } from "@/lib/operaciones/estados";

type KpiTone = "cyan" | "sky" | "emerald" | "violet" | "amber" | "rose" | "blue";

type Kpi = {
  key: string;
  label: string;
  /** null = no se pudo contar. Se muestra "—", nunca un cero inventado. */
  value: number | null;
  hint: string;
  icon: string;
  tone: KpiTone;
};

/**
 * Casillas todavía sin indicador.
 *
 * Se dibujan con borde punteado y sin número: reservan el lugar de los que
 * faltan sin hacerse pasar por un dato: un cuadrado con un cero se lee como
 * "no tienes nada", que es justo lo contrario de "todavía no lo medimos".
 */
const KPIS_PENDIENTES = 3;

/**
 * Tres grupos, definidos por inversión y no por lista.
 *
 * "Confirmada" es todo lo que ya pasó por RESERVA_CONFIRMADA, no una
 * enumeración de estados: el vocabulario de `operaciones` tiene diecisiete
 * valores y crece, y una lista fija dejaría los nuevos fuera en silencio.
 *
 * La operación sin estado legible cae en "pendiente", que es donde hace ruido
 * y se corrige; sumada a las confirmadas, se perdería de vista.
 */
type GrupoCliente = "pendiente" | "confirmada" | "cancelada";

const ORDEN_CONFIRMADA = ESTADO_META.RESERVA_CONFIRMADA.orden;

function grupoDe(estado: string | null): GrupoCliente {
  const codigo = normalizarEstado(estado);
  if (codigo === "CANCELADA") return "cancelada";
  if (!codigo) return "pendiente";
  return ESTADO_META[codigo].orden < ORDEN_CONFIRMADA ? "pendiente" : "confirmada";
}

/** Lo mínimo para contar: una fila por operación de la temporada. */
const COLUMNAS: string = "contenedor, estado_operacion";

type OperacionConteo = {
  contenedor: string | null;
  estado_operacion: string | null;
};

type Resumen = {
  operaciones: number;
  contenedores: number;
  grupos: Record<GrupoCliente, number>;
};

/**
 * Dashboard del cliente: la pantalla que ve quien embarca, no quien opera.
 *
 * Se arma de a una sección. Hoy solo la fila de indicadores: seis tarjetas de
 * alto fijo que se reparten el ancho. Crece agregando entradas a `kpis` y
 * bajando `KPIS_PENDIENTES`, de modo que la fila no cambia de forma en cada
 * paso.
 *
 * Los datos salen de `operaciones` con `applyOperacionesClienteFilter` + RLS,
 * el mismo camino que DashboardContent: qué embarques ve cada cuenta no lo
 * decide esta pantalla.
 */
export function DashboardClienteContent() {
  const { t, locale } = useLocale();
  const tr = t.dashboardCliente;
  const { isLoading: authLoading, isCliente, isEjecutivo, empresaNombres } = useAuth();
  const { temporadaActiva, temporadaLoading } = useTemporadaActiva();

  /** null = no se pudo consultar; se muestra "—" en vez de ceros. */
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  /** Descarta respuestas viejas si el alcance cambia a mitad de una consulta. */
  const fetchGen = useRef(0);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const intl = locale === "es" ? "es-CL" : "en-US";
  const fmt = useCallback(
    (value: number) => value.toLocaleString(intl, { maximumFractionDigits: 0 }),
    [intl],
  );

  const fetchIndicadores = useCallback(async () => {
    if (!supabase || authLoading || temporadaLoading) return;
    /* Cliente sin empresas asignadas: no hay nada que contar, y un 0 mentiría. */
    if (shouldSkipOperacionesForCliente({ isCliente, isEjecutivo, empresaNombres })) {
      setResumen(null);
      setLoading(false);
      return;
    }
    const gen = ++fetchGen.current;
    setLoading(true);
    let query = supabase.from("operaciones").select(COLUMNAS).is("deleted_at", null);
    query = applyOperacionesClienteFilter(query, { isCliente, isEjecutivo, empresaNombres });
    query = aplicarFiltroTemporada(query, temporadaActiva);
    const { data, error } = await query.limit(5000);
    if (gen !== fetchGen.current) return;
    if (error) {
      setResumen(null);
      setLoading(false);
      return;
    }
    const filas = (data ?? []) as unknown as OperacionConteo[];
    /*
     * Contenedores distintos, y sin las canceladas: esa carga nunca se movió,
     * y el mismo criterio usa el histórico. Se cuentan por número porque una
     * operación puede repetir contenedor y muchas todavía no lo tienen.
     */
    const contenedores = new Set<string>();
    const grupos: Record<GrupoCliente, number> = { pendiente: 0, confirmada: 0, cancelada: 0 };
    for (const fila of filas) {
      const grupo = grupoDe(fila.estado_operacion);
      grupos[grupo] += 1;
      if (grupo === "cancelada") continue;
      const cont = (fila.contenedor ?? "").trim().toUpperCase();
      if (cont) contenedores.add(cont);
    }
    setResumen({ operaciones: filas.length, contenedores: contenedores.size, grupos });
    setLoading(false);
  }, [
    supabase,
    authLoading,
    temporadaLoading,
    temporadaActiva,
    isCliente,
    isEjecutivo,
    empresaNombres,
  ]);

  useEffect(() => {
    if (!authLoading && !temporadaLoading) void fetchIndicadores();
  }, [authLoading, temporadaLoading, fetchIndicadores]);

  const temporadaLabel = temporadaActiva ?? tr.kpiTodasTemporadas;

  /** Reparto por grupo. Sin operaciones no hay porcentaje: se muestra "—". */
  const reparto = useMemo(() => {
    const total = resumen?.operaciones ?? 0;
    const filas: Array<{ grupo: GrupoCliente; label: string; clase: string; pct: number | null }> = [
      { grupo: "pendiente", label: tr.estadoPendientes, clase: "estado--espera", pct: null },
      { grupo: "confirmada", label: tr.estadoConfirmadas, clase: "estado--ok", pct: null },
      { grupo: "cancelada", label: tr.estadoCanceladas, clase: "estado--error", pct: null },
    ];
    if (!resumen || total === 0) return filas;
    return filas.map((fila) => ({
      ...fila,
      pct: Math.round((resumen.grupos[fila.grupo] / total) * 100),
    }));
  }, [resumen, tr]);

  const kpis: Kpi[] = [
    {
      key: "operaciones",
      label: tr.kpiOperaciones,
      value: resumen?.operaciones ?? null,
      hint: temporadaLabel,
      icon: "lucide:package",
      tone: "cyan",
    },
    {
      key: "contenedores",
      label: tr.kpiContenedores,
      value: resumen?.contenedores ?? null,
      hint: temporadaLabel,
      icon: "lucide:container",
      tone: "sky",
    },
  ];

  return (
    <main className="dash-page relative flex min-h-0 flex-1 flex-col overflow-y-auto text-base lg:overflow-hidden">
      <div className="dash-toolbar relative z-10 shrink-0">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-2.5 sm:px-5 lg:py-3">
          {/* El título vive en la barra superior (ver Header); acá quedaría
              dicho dos veces. El h1 se conserva para lectores de pantalla. */}
          <div className="min-w-0">
            <h1 className="sr-only">{tr.title}</h1>
            <p className="dash-subtitle truncate text-sm">{tr.subtitle}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchIndicadores()}
              className="dash-control rounded-lg p-2.5 transition-colors"
              title={t.dashboard.refresh}
            >
              <Icon icon="lucide:refresh-cw" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative flex flex-col gap-3 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
        {/* Una fila de seis: las tarjetas se reparten el ancho de la pantalla,
            así que son rectángulos y no cuadrados. El alto es fijo para que la
            fila no cambie de forma cuando una casilla vacía se llene. */}
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 lg:gap-2.5">
          {loading
            ? kpis.map((kpi) => (
                <div
                  key={kpi.key}
                  className="motion-skeleton motion-skeleton-on-dark dash-card h-24 rounded-xl lg:h-[6.5rem]"
                />
              ))
            : kpis.map((kpi) => (
                <div
                  key={kpi.key}
                  className={`dash-card dash-kpi-card dash-kpi-card--${kpi.tone} flex h-24 min-w-0 flex-col justify-between rounded-xl px-2.5 py-2 lg:h-[6.5rem] lg:px-3`}
                >
                  <div className="relative z-[1] flex items-center gap-2">
                    <span className="dash-kpi-icon shrink-0" aria-hidden>
                      <Icon icon={kpi.icon} width={13} height={13} />
                    </span>
                    <p className="dash-kpi-value text-2xl font-bold leading-none tabular-nums lg:text-[1.75rem]">
                      {kpi.value === null ? "—" : fmt(kpi.value)}
                    </p>
                  </div>
                  <div className="relative z-[1] min-w-0">
                    <p className="dash-kpi-label text-dash-fg leading-tight line-clamp-2 text-[11px] sm:text-xs">
                      {kpi.label}
                    </p>
                    <p className="dash-kpi-hint truncate text-[10px] leading-tight">{kpi.hint}</p>
                  </div>
                </div>
              ))}

          {loading && (
            <div className="motion-skeleton motion-skeleton-on-dark dash-card h-24 rounded-xl lg:h-[6.5rem]" />
          )}

          {!loading && (
            <div className="dash-card flex h-24 min-w-0 flex-col justify-between rounded-xl px-2.5 py-2 lg:h-[6.5rem] lg:px-3">
              <p className="dash-kpi-label truncate text-[11px] text-dash-fg sm:text-xs">
                {tr.kpiEstados}
              </p>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
                {reparto.map((fila) => (
                  <div
                    key={fila.grupo}
                    className={`${fila.clase} estado-barra h-full`}
                    style={{ width: `${fila.pct ?? 0}%` }}
                  />
                ))}
              </div>
              <div className="space-y-0.5">
                {reparto.map((fila) => (
                  <div key={fila.grupo} className={`${fila.clase} flex items-center gap-1.5`}>
                    <span className="estado-barra h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-[10px] leading-tight text-dash-muted">
                      {fila.label}
                    </span>
                    <span className="shrink-0 text-[10px] font-bold leading-tight tabular-nums text-[color:var(--estado)]">
                      {fila.pct === null ? "—" : `${fila.pct}%`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Array.from({ length: KPIS_PENDIENTES }).map((_, i) => (
            <div
              key={`pendiente-${i}`}
              className="flex h-24 items-center justify-center rounded-xl border border-dashed border-dash-neon/20 lg:h-[6.5rem]"
              aria-hidden
            >
              <Icon icon="lucide:plus" width={14} height={14} className="text-dash-neon/25" />
            </div>
          ))}
        </div>

        <div className="dash-card flex flex-1 flex-col items-center justify-center gap-2 rounded-xl px-6 py-16 text-center">
          <Icon icon="lucide:layout-dashboard" width={28} height={28} className="text-dash-neon" />
          <p className="text-base font-semibold text-dash-fg">{tr.emptyTitle}</p>
          <p className="max-w-md text-sm text-dash-muted">{tr.emptyHint}</p>
        </div>
      </div>
    </main>
  );
}
