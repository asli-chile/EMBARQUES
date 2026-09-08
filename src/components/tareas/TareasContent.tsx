import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { sileo } from "sileo";
import { formatRefAsli } from "@/lib/refAsli";
import {
  ESTADO_META,
  estadoAvanceRecomendado,
  etiquetaEstado,
  esEstadoCerrado,
  normalizarEstado,
  type EstadoOperacion,
  type GrupoEstado,
} from "@/lib/operaciones/estados";
import { aplicarFiltroTemporada } from "@/lib/temporadas";
import { useTemporadaActiva } from "@/lib/useTemporadaActiva";
import { useNeonTheme } from "@/lib/ui/neonTheme";
import {
  ESTADO_TAREA_ETIQUETA,
  diasRestantes,
  esTareaAbierta,
  urgenciaTarea,
  type EstadoTarea,
  type UrgenciaTarea,
} from "@/lib/operaciones/tareas";

type TareaRow = {
  id: string;
  operacion_id: string;
  tipo: string;
  titulo: string;
  estado: EstadoTarea;
  responsable_usuario_id: string | null;
  responsable_externo: string | null;
  fecha_limite: string | null;
  origen: string;
  estado_origen: string | null;
  operaciones: {
    ref_asli: string | null;
    correlativo: number | null;
    cliente: string | null;
    estado_operacion: string | null;
  } | null;
};

const URGENCIA_STYLE: Record<
  UrgenciaTarea,
  { badge: string; dot: string; etiqueta: string; explicacion: string }
> = {
  vencida: {
    badge: "bg-red-400/15 text-dash-fg border-red-400/35",
    dot: "bg-red-400",
    etiqueta: "Atrasadas",
    explicacion: "El plazo ya se cumplió y la tarea sigue abierta",
  },
  hoy: {
    badge: "bg-amber-400/15 text-dash-fg border-amber-400/35",
    dot: "bg-amber-400",
    etiqueta: "Para hoy",
    explicacion: "Vencen hoy",
  },
  proxima: {
    badge: "bg-sky-400/15 text-dash-fg border-sky-400/35",
    dot: "bg-sky-400",
    etiqueta: "Próximos 7 días",
    explicacion: "Todavía hay tiempo",
  },
  sin_fecha: {
    badge: "bg-dash-control text-dash-muted border-dash-border",
    dot: "bg-neutral-400",
    etiqueta: "Sin plazo",
    explicacion: "No tienen fecha límite calculada, normalmente porque falta el ETD o el ETA de la operación",
  },
  cerrada: {
    badge: "bg-emerald-400/15 text-dash-fg border-emerald-400/35",
    dot: "bg-emerald-400",
    etiqueta: "Cerradas",
    explicacion: "Completadas o canceladas",
  },
};

const ESTADO_GRUPO_STYLE: Record<GrupoEstado, { bg: string; text: string; border: string; dot: string }> = {
  COMERCIAL: {
    bg: "bg-amber-400/15",
    text: "text-dash-fg",
    border: "border-amber-400/35",
    dot: "bg-amber-400",
  },
  COORDINACION: {
    bg: "bg-sky-400/15",
    text: "text-dash-fg",
    border: "border-sky-400/35",
    dot: "bg-sky-400",
  },
  TRANSITO: {
    bg: "bg-violet-400/15",
    text: "text-dash-fg",
    border: "border-violet-400/35",
    dot: "bg-violet-400",
  },
  DOCUMENTAL: {
    bg: "bg-emerald-400/15",
    text: "text-dash-fg",
    border: "border-emerald-400/35",
    dot: "bg-emerald-400",
  },
  CIERRE: {
    bg: "bg-dash-control",
    text: "text-dash-muted",
    border: "border-dash-border",
    dot: "bg-neutral-400",
  },
  EXCEPCION: {
    bg: "bg-red-400/15",
    text: "text-dash-fg",
    border: "border-red-400/35",
    dot: "bg-red-400",
  },
};

function getEstadoGrupoStyle(estado: string | null | undefined) {
  const codigo = normalizarEstado(estado);
  if (!codigo) return null;
  return ESTADO_GRUPO_STYLE[ESTADO_META[codigo].grupo];
}

function fmtFecha(valor: string | null): string {
  if (!valor) return "—";
  const d = parseISO(valor);
  return isValid(d) ? format(d, "dd MMM yyyy", { locale: es }) : "—";
}

function textoPlazo(fechaLimite: string | null): string {
  const dias = diasRestantes(fechaLimite);
  if (dias === null) return "Sin plazo definido";
  if (dias === 0) return "Vence hoy";
  if (dias < 0) return `Atrasada ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "día" : "días"}`;
  return `Faltan ${dias} ${dias === 1 ? "día" : "días"}`;
}

const ORDEN_URGENCIA: UrgenciaTarea[] = ["vencida", "hoy", "proxima", "sin_fecha", "cerrada"];

function pesoUrgencia(u: UrgenciaTarea): number {
  return ORDEN_URGENCIA.indexOf(u);
}

type GrupoOperacion = {
  operacionId: string;
  ref: string;
  cliente: string;
  estadoOperacion: string;
  tareas: TareaRow[];
  progreso: { completadas: number; total: number };
  urgenciaMax: UrgenciaTarea;
  siguienteEstado: EstadoOperacion | null;
  faseCompleta: boolean;
};

function progresoFase(tareasOperacion: TareaRow[], estadoOperacion: string | null): { completadas: number; total: number } {
  const codigo = normalizarEstado(estadoOperacion);
  const deFase = tareasOperacion.filter((t) => normalizarEstado(t.estado_origen) === codigo);
  return {
    total: deFase.length,
    completadas: deFase.filter((t) => !esTareaAbierta(t.estado)).length,
  };
}

export function TareasContent() {
  const { profile, isStaff, isLoading: authLoading } = useAuth();
  const { temporadaActiva, temporadaLoading } = useTemporadaActiva();
  const [theme] = useNeonTheme();
  const [tareas, setTareas] = useState<TareaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verCerradas, setVerCerradas] = useState(false);
  const [soloMias, setSoloMias] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [guardando, setGuardando] = useState<string | null>(null);
  const [avanzandoOperacion, setAvanzandoOperacion] = useState<string | null>(null);
  const [nombresUsuarios, setNombresUsuarios] = useState<Record<string, string>>({});
  const [verAyuda, setVerAyuda] = useState(false);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const cargar = useCallback(async () => {
    if (!supabase || temporadaLoading) return;
    setLoading(true);

    let q = supabase
      .from("operaciones_tareas")
      .select(
        "id, operacion_id, tipo, titulo, estado, responsable_usuario_id, responsable_externo, fecha_limite, origen, estado_origen, operaciones!inner(ref_asli, correlativo, cliente, estado_operacion)",
      );
    // El filtro viaja por la relación: solo tareas de operaciones de la temporada activa.
    q = aplicarFiltroTemporada(q, temporadaActiva, "operaciones.temporada");
    const { data, error: err } = await q.order("fecha_limite", { ascending: true, nullsFirst: false });

    if (err) {
      setError(err.message);
      setTareas([]);
      setLoading(false);
      return;
    }

    const filas = (data ?? []) as unknown as TareaRow[];
    setError(null);
    setTareas(filas);

    // Los nombres se resuelven aparte: la tarea guarda solo el id del responsable.
    const ids = [...new Set(filas.map((t) => t.responsable_usuario_id).filter((v): v is string => !!v))];
    if (ids.length > 0) {
      const { data: usuarios } = await supabase.from("usuarios").select("id, nombre").in("id", ids);
      setNombresUsuarios(
        Object.fromEntries((usuarios ?? []).map((u) => [u.id as string, u.nombre as string])),
      );
    }

    setLoading(false);
  }, [supabase, temporadaLoading, temporadaActiva]);

  useEffect(() => {
    if (authLoading) return;
    void cargar();
  }, [authLoading, cargar]);

  const avanzarOperacionCore = useCallback(
    async (
      operacionId: string,
      estadoOperacion: string,
      siguienteEstado: EstadoOperacion,
      ref: string,
      cerrarPendientes: boolean,
    ) => {
      if (!supabase) return false;
      setAvanzandoOperacion(operacionId);

      const codigoFase = normalizarEstado(estadoOperacion);
      const pendientes = cerrarPendientes
        ? tareas.filter(
            (t) =>
              t.operacion_id === operacionId &&
              normalizarEstado(t.estado_origen) === codigoFase &&
              esTareaAbierta(t.estado),
          )
        : [];

      if (pendientes.length > 0) {
        const { error: errTareas } = await supabase
          .from("operaciones_tareas")
          .update({ estado: "COMPLETADA" })
          .in(
            "id",
            pendientes.map((t) => t.id),
          );

        if (errTareas) {
          setAvanzandoOperacion(null);
          sileo.error({ title: "No se pudieron cerrar las tareas", description: errTareas.message });
          return false;
        }
      }

      const { error: err } = await supabase
        .from("operaciones")
        .update({ estado_operacion: siguienteEstado })
        .eq("id", operacionId);

      setAvanzandoOperacion(null);

      if (err) {
        sileo.error({ title: "No se pudo avanzar la operación", description: err.message });
        return false;
      }

      const etiqueta = etiquetaEstado(siguienteEstado);
      setTareas((prev) =>
        prev.map((t) => {
          if (t.operacion_id !== operacionId) return t;
          const completada = pendientes.some((p) => p.id === t.id);
          return {
            ...t,
            estado: completada ? "COMPLETADA" : t.estado,
            operaciones: t.operaciones
              ? { ...t.operaciones, estado_operacion: siguienteEstado }
              : t.operaciones,
          };
        }),
      );
      sileo.success({ title: `${ref} pasó a ${etiqueta}` });
      await cargar();
      return true;
    },
    [supabase, cargar, tareas],
  );

  const cambiarEstado = useCallback(
    async (tarea: TareaRow, nuevo: EstadoTarea) => {
      if (!supabase) return;
      setGuardando(tarea.id);

      const { error: err } = await supabase
        .from("operaciones_tareas")
        .update({ estado: nuevo })
        .eq("id", tarea.id);

      setGuardando(null);

      if (err) {
        sileo.error({ title: "No se pudo actualizar la tarea", description: err.message });
        return;
      }

      const estadoOperacion = tarea.operaciones?.estado_operacion ?? "";
      const ref = formatRefAsli(tarea.operaciones?.ref_asli, tarea.operaciones?.correlativo) ?? "—";
      const actualizadas = tareas.map((t) => (t.id === tarea.id ? { ...t, estado: nuevo } : t));
      setTareas(actualizadas);

      if (nuevo === "COMPLETADA") {
        const progreso = progresoFase(
          actualizadas.filter((t) => t.operacion_id === tarea.operacion_id),
          estadoOperacion,
        );
        const siguiente = estadoAvanceRecomendado(estadoOperacion);
        const debeAvanzar =
          progreso.total >= 2 &&
          progreso.completadas === progreso.total &&
          siguiente !== null &&
          !esEstadoCerrado(estadoOperacion);

        if (debeAvanzar) {
          await avanzarOperacionCore(tarea.operacion_id, estadoOperacion, siguiente, ref, false);
          return;
        }
      }

      sileo.success({ title: `Tarea marcada como ${ESTADO_TAREA_ETIQUETA[nuevo].toLowerCase()}` });
    },
    [supabase, tareas, avanzarOperacionCore],
  );

  const avanzarOperacion = useCallback(
    async (grupo: GrupoOperacion) => {
      if (!grupo.siguienteEstado) return;
      await avanzarOperacionCore(
        grupo.operacionId,
        grupo.estadoOperacion,
        grupo.siguienteEstado,
        grupo.ref,
        true,
      );
    },
    [avanzarOperacionCore],
  );

  const nombreResponsable = useCallback(
    (t: TareaRow): string => {
      if (t.responsable_externo) return t.responsable_externo;
      if (!t.responsable_usuario_id) return "Sin responsable";
      if (t.responsable_usuario_id === profile?.id) return "Yo";
      return nombresUsuarios[t.responsable_usuario_id] ?? "Sin responsable";
    },
    [nombresUsuarios, profile?.id],
  );

  const tareasFiltradasBase = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return tareas.filter((t) => {
      if (soloMias && t.responsable_usuario_id !== profile?.id) return false;

      if (q) {
        const ref = formatRefAsli(t.operaciones?.ref_asli, t.operaciones?.correlativo) ?? "";
        const campos = [t.titulo, t.tipo, ref, t.operaciones?.cliente ?? "", t.responsable_externo ?? ""];
        if (!campos.some((c) => c.toLowerCase().includes(q))) return false;
      }

      return true;
    });
  }, [tareas, soloMias, busqueda, profile?.id]);

  const filtradas = useMemo(() => {
    return tareasFiltradasBase.filter((t) => verCerradas || esTareaAbierta(t.estado));
  }, [tareasFiltradasBase, verCerradas]);

  const kpis = useMemo(() => {
    let vencidas = 0;
    let hoy = 0;
    let semana = 0;
    let mias = 0;

    for (const t of tareas) {
      if (!esTareaAbierta(t.estado)) continue;
      const u = urgenciaTarea(t.estado, t.fecha_limite);
      if (u === "vencida") vencidas += 1;
      if (u === "hoy") hoy += 1;
      if (u === "proxima") semana += 1;
      if (t.responsable_usuario_id === profile?.id) mias += 1;
    }

    return { vencidas, hoy, semana, mias, abiertas: vencidas + hoy + semana };
  }, [tareas, profile?.id]);

  const gruposOperacion = useMemo(() => {
    const idsOperacion = [...new Set(tareasFiltradasBase.map((t) => t.operacion_id))];
    const grupos: GrupoOperacion[] = [];

    for (const operacionId of idsOperacion) {
      const todasOperacion = tareas.filter((t) => t.operacion_id === operacionId);
      const primera = todasOperacion[0];
      if (!primera) continue;

      const estadoOperacion = primera.operaciones?.estado_operacion ?? "";
      const progreso = progresoFase(todasOperacion, estadoOperacion);
      const faseCompleta = progreso.total === 0 || progreso.completadas === progreso.total;
      const siguienteEstado = estadoAvanceRecomendado(estadoOperacion);
      const puedeMostrarAvance =
        faseCompleta && siguienteEstado !== null && !esEstadoCerrado(estadoOperacion);
      const tareasVisibles = filtradas.filter((t) => t.operacion_id === operacionId);

      if (tareasVisibles.length === 0 && !puedeMostrarAvance) continue;

      const urgenciaMax =
        tareasVisibles.length > 0
          ? tareasVisibles.reduce<UrgenciaTarea>(
              (peor, t) => {
                const u = urgenciaTarea(t.estado, t.fecha_limite);
                return pesoUrgencia(u) < pesoUrgencia(peor) ? u : peor;
              },
              "cerrada",
            )
          : "cerrada";

      grupos.push({
        operacionId,
        ref: formatRefAsli(primera.operaciones?.ref_asli, primera.operaciones?.correlativo) ?? "—",
        cliente: primera.operaciones?.cliente ?? "",
        estadoOperacion,
        tareas: [...tareasVisibles].sort(
          (a, b) =>
            pesoUrgencia(urgenciaTarea(a.estado, a.fecha_limite)) -
            pesoUrgencia(urgenciaTarea(b.estado, b.fecha_limite)),
        ),
        progreso,
        urgenciaMax,
        siguienteEstado,
        faseCompleta,
      });
    }

    return grupos.sort((a, b) => {
      const diff = pesoUrgencia(a.urgenciaMax) - pesoUrgencia(b.urgenciaMax);
      if (diff !== 0) return diff;
      return a.ref.localeCompare(b.ref);
    });
  }, [filtradas, tareas, tareasFiltradasBase]);

  if (!isStaff && !authLoading && profile === null) {
    return (
      <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
        <main className="dash-page relative flex min-h-0 flex-1 flex-col overflow-auto p-4" role="main">
          <div className="dash-card mx-auto mt-10 max-w-md rounded-xl p-6 text-center">
            <p className="text-base text-dash-muted">Inicia sesión para ver las tareas de tus operaciones.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
      <main className="dash-page relative flex min-h-0 flex-1 flex-col overflow-y-auto" role="main">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -right-16 top-10 h-72 w-72 rounded-full bg-dash-neon/20 blur-3xl" />
          <div className="absolute bottom-20 left-1/4 h-64 w-64 rounded-full bg-dash-neon-hot/15 blur-3xl" />
        </div>

        <div className="dash-toolbar relative z-10 shrink-0">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dash-neon/40 bg-dash-neon/15 shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--dash-neon)_55%,transparent)]">
                <Icon icon="lucide:list-checks" width={22} height={22} className="text-dash-neon" aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold tracking-tight text-dash-fg sm:text-xl">Tareas</h1>
                <p className="mt-0.5 line-clamp-1 text-xs text-dash-muted sm:text-sm">
                  Qué hay que hacer hoy, ordenado por lo que más apura
                </p>
              </div>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setVerAyuda((v) => !v)}
                className="dash-control inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold"
                aria-expanded={verAyuda}
              >
                <Icon icon="lucide:help-circle" width={14} height={14} />
                Cómo funciona
              </button>
              <button
                type="button"
                onClick={() => void cargar()}
                className="dash-cta inline-flex items-center gap-1.5 px-4 py-2 text-sm"
              >
                <Icon icon="lucide:refresh-cw" width={14} height={14} />
                Actualizar
              </button>
            </div>
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[1400px] space-y-3 p-3 sm:p-4 lg:p-5">
          {verAyuda && (
            <div className="dash-card space-y-2 rounded-xl px-4 py-3 text-sm text-dash-muted">
              <p>
                <strong className="text-dash-fg">Las tareas las crea el sistema, no se escriben a mano.</strong>{" "}
                Cada vez que una operación entra a un estado nuevo, se generan las tareas que corresponden a ese
                estado, con su responsable y su fecha límite.
              </p>
              <p>
                <strong className="text-dash-fg">Completar una tarea apaga el recordatorio.</strong> Si la fase
                tiene dos o más tareas y completas la última, la operación avanza sola al siguiente estado.
                También puedes usar <strong className="text-dash-fg">Avanzar</strong> para cerrar todo de una vez
                sin ir a Registros.
              </p>
              <p>
                <strong className="text-dash-fg">El plazo se cuenta desde que la operación entró al estado</strong>
                , o desde el ETD o el ETA cuando la tarea depende de la nave, como el rescate del BL o el aviso de
                arribo.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {[
              {
                label: "Vencidas",
                valor: kpis.vencidas,
                icono: "lucide:alert-triangle",
                accent: "text-red-300",
                bar: "bg-red-400",
              },
              {
                label: "Vencen hoy",
                valor: kpis.hoy,
                icono: "lucide:clock",
                accent: "text-amber-300",
                bar: "bg-amber-400",
              },
              {
                label: "Esta semana",
                valor: kpis.semana,
                icono: "lucide:calendar-days",
                accent: "text-sky-300",
                bar: "bg-sky-400",
              },
              {
                label: "Asignadas a mí",
                valor: kpis.mias,
                icono: "lucide:user-check",
                accent: "text-dash-neon",
                bar: "bg-dash-neon",
              },
            ].map((k) => (
              <div key={k.label} className="dash-card relative overflow-hidden rounded-xl px-3.5 py-3.5">
                <span className={`absolute inset-x-0 top-0 h-0.5 ${k.bar}`} aria-hidden />
                <div className="flex items-center gap-1.5 text-dash-muted">
                  <Icon icon={k.icono} width={13} height={13} className={k.accent} />
                  <span className="text-sm font-semibold">{k.label}</span>
                </div>
                <p className={`mt-1 text-2xl font-bold tabular-nums ${k.accent}`}>{k.valor}</p>
              </div>
            ))}
          </div>

          <section className="dash-card rounded-xl">
            <div className="dash-section-head flex flex-wrap items-center gap-2.5 px-4 py-3">
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por tarea, referencia o cliente"
                className="dash-control max-w-xs flex-1 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dash-neon/40"
              />
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-dash-muted">
                <input
                  type="checkbox"
                  checked={soloMias}
                  onChange={(e) => setSoloMias(e.target.checked)}
                  className="h-4 w-4 rounded border-dash-border text-dash-neon focus:ring-dash-neon/30"
                />
                Solo mías
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-dash-muted">
                <input
                  type="checkbox"
                  checked={verCerradas}
                  onChange={(e) => setVerCerradas(e.target.checked)}
                  className="h-4 w-4 rounded border-dash-border text-dash-neon focus:ring-dash-neon/30"
                />
                Ver cerradas
              </label>
              <span className="ml-auto text-sm text-dash-muted">
                {filtradas.length} {filtradas.length === 1 ? "tarea" : "tareas"} · {gruposOperacion.length}{" "}
                {gruposOperacion.length === 1 ? "operación" : "operaciones"}
              </span>
            </div>
          </section>

          {error && (
            <div className="rounded-lg border border-red-400/35 bg-red-500/15 px-4 py-3 text-sm text-dash-fg" role="alert">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="motion-skeleton motion-skeleton-on-dark dash-card h-36 rounded-xl" />
              ))}
            </div>
          ) : gruposOperacion.length === 0 ? (
            <div className="dash-card rounded-xl px-4 py-10 text-center">
              <Icon icon="lucide:check-circle-2" width={28} height={28} className="mx-auto text-emerald-300" />
              <p className="mt-2 text-base font-semibold text-dash-fg">No hay tareas pendientes</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-dash-muted">
                Las tareas se crean solas cuando una operación se registra o avanza de estado. Si esperabas ver
                alguna, revisa los filtros de arriba.
              </p>
            </div>
          ) : (
            gruposOperacion.map((grupo) => {
              const estadoStyle = getEstadoGrupoStyle(grupo.estadoOperacion);
              const etiquetaEstadoActual = etiquetaEstado(grupo.estadoOperacion);
              const puedeAvanzar = grupo.siguienteEstado !== null && !esEstadoCerrado(grupo.estadoOperacion);
              const pendientesFase = grupo.progreso.total - grupo.progreso.completadas;
              const avanzando = avanzandoOperacion === grupo.operacionId;
              const pctProgreso =
                grupo.progreso.total > 0
                  ? Math.round((grupo.progreso.completadas / grupo.progreso.total) * 100)
                  : 100;

              return (
                <section key={grupo.operacionId} className="dash-card overflow-hidden rounded-xl">
                  <div className="dash-section-head px-4 py-3">
                    <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <h2 className="text-lg font-bold text-dash-neon">{grupo.ref}</h2>
                          {grupo.cliente && (
                            <span className="max-w-[280px] truncate text-sm text-dash-muted">{grupo.cliente}</span>
                          )}
                          {estadoStyle && (
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-sm font-semibold ${estadoStyle.bg} ${estadoStyle.text} ${estadoStyle.border}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${estadoStyle.dot}`} aria-hidden />
                              {etiquetaEstadoActual}
                            </span>
                          )}
                        </div>

                        {grupo.progreso.total > 0 ? (
                          <div className="mt-2 max-w-md">
                            <div className="flex items-center justify-between gap-2 text-sm text-dash-muted">
                              <span>
                                {grupo.progreso.completadas} de {grupo.progreso.total} tareas de esta fase
                              </span>
                              <span className="font-semibold tabular-nums text-dash-fg">{pctProgreso}%</span>
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-dash-control">
                              <div
                                className="h-full rounded-full bg-dash-neon transition-all duration-300"
                                style={{ width: `${pctProgreso}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="mt-1.5 text-sm text-dash-muted">Sin tareas pendientes en esta fase</p>
                        )}
                      </div>

                      {grupo.siguienteEstado && (
                        <button
                          type="button"
                          disabled={!puedeAvanzar || avanzando}
                          title={
                            pendientesFase > 0
                              ? `Cierra ${pendientesFase} ${pendientesFase === 1 ? "tarea pendiente" : "tareas pendientes"} y avanza la operación`
                              : "Avanza la operación al siguiente estado"
                          }
                          onClick={() => void avanzarOperacion(grupo)}
                          className="dash-cta inline-flex shrink-0 items-center gap-1.5 px-3.5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Icon icon="lucide:arrow-right-circle" width={15} height={15} />
                          {avanzando
                            ? "Avanzando..."
                            : `Avanzar a ${etiquetaEstado(grupo.siguienteEstado)}`}
                        </button>
                      )}
                    </div>
                  </div>

                  <ul className="divide-y divide-dash-border">
                    {grupo.tareas.length === 0 ? (
                      <li className="bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                        <Icon
                          icon="lucide:check-circle-2"
                          width={16}
                          height={16}
                          className="-mt-0.5 mr-1.5 inline"
                        />
                        Todas las tareas de esta fase están listas. Avanza la operación para generar el siguiente
                        lote.
                      </li>
                    ) : (
                      grupo.tareas.map((t) => {
                        const abierta = esTareaAbierta(t.estado);
                        const ocupado = guardando === t.id;
                        const urgencia = urgenciaTarea(t.estado, t.fecha_limite);
                        const cfg = URGENCIA_STYLE[urgencia];

                        return (
                          <li key={t.id} className="px-4 py-3">
                            <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-base font-semibold text-dash-fg">{t.titulo}</p>

                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-dash-muted">
                                  <span className="inline-flex items-center gap-1">
                                    <Icon icon="lucide:user" width={12} height={12} className="text-dash-neon" />
                                    {nombreResponsable(t)}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <Icon icon="lucide:calendar" width={12} height={12} className="text-dash-neon" />
                                    {fmtFecha(t.fecha_limite)}
                                  </span>
                                </div>

                                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                  <span
                                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-sm font-semibold ${cfg.badge}`}
                                  >
                                    {textoPlazo(t.fecha_limite)}
                                  </span>
                                  {t.estado_origen && (
                                    <span className="inline-flex items-center gap-1 text-sm text-dash-muted">
                                      <Icon icon="lucide:git-branch" width={12} height={12} />
                                      Se creó al pasar a {etiquetaEstado(t.estado_origen)}
                                    </span>
                                  )}
                                  {!abierta && (
                                    <span className="inline-flex items-center rounded-md border border-dash-border bg-dash-control px-2 py-0.5 text-sm font-semibold text-dash-muted">
                                      {ESTADO_TAREA_ETIQUETA[t.estado]}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {abierta && (
                                <div className="flex shrink-0 items-center gap-2">
                                  {t.estado !== "EN_CURSO" && (
                                    <button
                                      type="button"
                                      disabled={ocupado}
                                      onClick={() => void cambiarEstado(t, "EN_CURSO")}
                                      className="dash-control inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold disabled:opacity-50"
                                    >
                                      <Icon icon="lucide:play" width={13} height={13} />
                                      En curso
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    disabled={ocupado}
                                    onClick={() => void cambiarEstado(t, "COMPLETADA")}
                                    className="dash-cta inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm disabled:opacity-50"
                                  >
                                    <Icon icon="lucide:check" width={13} height={13} />
                                    Completar
                                  </button>
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </section>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
