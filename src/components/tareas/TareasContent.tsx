import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { sileo } from "sileo";
import {
  moduleBtnSecondary,
  moduleCard,
  moduleCardAccent,
  moduleHeroRounded,
  moduleInput,
  modulePageBg,
} from "@/lib/ui/moduleStyles";
import { formatRefAsli } from "@/lib/refAsli";
import {
  estadoAvanceRecomendado,
  etiquetaEstado,
  esEstadoCerrado,
  normalizarEstado,
  type EstadoOperacion,
} from "@/lib/operaciones/estados";
import { getEstadoOperacionStyle } from "@/lib/ui/estadoOperacion";
import { aplicarFiltroTemporada } from "@/lib/temporadas";
import { useTemporadaActiva } from "@/lib/useTemporadaActiva";
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
    badge: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
    etiqueta: "Atrasadas",
    explicacion: "El plazo ya se cumplió y la tarea sigue abierta",
  },
  hoy: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    etiqueta: "Para hoy",
    explicacion: "Vencen hoy",
  },
  proxima: {
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-400",
    etiqueta: "Próximos 7 días",
    explicacion: "Todavía hay tiempo",
  },
  sin_fecha: {
    badge: "bg-neutral-100 text-neutral-600 border-neutral-200",
    dot: "bg-neutral-400",
    etiqueta: "Sin plazo",
    explicacion: "No tienen fecha límite calculada, normalmente porque falta el ETD o el ETA de la operación",
  },
  cerrada: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    etiqueta: "Cerradas",
    explicacion: "Completadas o canceladas",
  },
};

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

      setTareas((prev) => prev.map((t) => (t.id === tarea.id ? { ...t, estado: nuevo } : t)));
      sileo.success({ title: `Tarea marcada como ${ESTADO_TAREA_ETIQUETA[nuevo].toLowerCase()}` });
    },
    [supabase],
  );

  const avanzarOperacion = useCallback(
    async (grupo: GrupoOperacion) => {
      if (!supabase || !grupo.siguienteEstado) return;
      setAvanzandoOperacion(grupo.operacionId);

      const { error: err } = await supabase
        .from("operaciones")
        .update({ estado_operacion: grupo.siguienteEstado })
        .eq("id", grupo.operacionId);

      setAvanzandoOperacion(null);

      if (err) {
        sileo.error({ title: "No se pudo avanzar la operación", description: err.message });
        return;
      }

      const etiqueta = etiquetaEstado(grupo.siguienteEstado);
      setTareas((prev) =>
        prev.map((t) =>
          t.operacion_id === grupo.operacionId && t.operaciones
            ? {
                ...t,
                operaciones: { ...t.operaciones, estado_operacion: grupo.siguienteEstado },
              }
            : t,
        ),
      );
      sileo.success({ title: `${grupo.ref} pasó a ${etiqueta}` });
      await cargar();
    },
    [supabase, cargar],
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
      <main className={`flex-1 ${modulePageBg} min-h-0 overflow-auto p-4`}>
        <div className={`${moduleCard} max-w-md mx-auto mt-10 p-6 text-center`}>
          <p className="text-base text-brand-blue/80">Inicia sesión para ver las tareas de tus operaciones.</p>
        </div>
      </main>
    );
  }

  return (
    <main className={`flex-1 ${modulePageBg} min-h-0 overflow-auto p-3 sm:p-4 lg:p-5`}>
      <div className="w-full max-w-[1400px] mx-auto space-y-4">
        <section className={`${moduleHeroRounded} px-5 py-4`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold">Tareas</h1>
              <p className="text-base text-white/70 mt-0.5">
                Qué hay que hacer hoy, ordenado por lo que más apura
              </p>
            </div>
            <button
              type="button"
              onClick={() => setVerAyuda((v) => !v)}
              className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-base font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
              aria-expanded={verAyuda}
            >
              <Icon icon="lucide:help-circle" width={14} height={14} />
              Cómo funciona
            </button>
            <button
              type="button"
              onClick={() => void cargar()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-base font-semibold bg-white text-brand-blue hover:bg-white/90 transition-colors"
            >
              <Icon icon="lucide:refresh-cw" width={14} height={14} />
              Actualizar
            </button>
          </div>

          {verAyuda && (
            <div className="mt-3 rounded-lg bg-white/10 border border-white/15 px-4 py-3 space-y-2 text-base text-white/85">
              <p>
                <strong className="text-white">Las tareas las crea el sistema, no se escriben a mano.</strong>{" "}
                Cada vez que una operación entra a un estado nuevo, se generan las tareas que corresponden a
                ese estado, con su responsable y su fecha límite.
              </p>
              <p>
                <strong className="text-white">Completar una tarea apaga el recordatorio.</strong> Cuando
                termines todas las de la fase actual, usa <strong className="text-white">Avanzar</strong> en
                la tarjeta de la operación para pasar al siguiente estado sin ir a Registros.
              </p>
              <p>
                <strong className="text-white">El plazo se cuenta desde que la operación entró al estado</strong>,
                o desde el ETD o el ETA cuando la tarea depende de la nave, como el rescate del BL o el aviso
                de arribo.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-4">
            {[
              { label: "Vencidas", valor: kpis.vencidas, tono: "text-red-200", icono: "lucide:alert-triangle" },
              { label: "Vencen hoy", valor: kpis.hoy, tono: "text-amber-200", icono: "lucide:clock" },
              { label: "Esta semana", valor: kpis.semana, tono: "text-sky-200", icono: "lucide:calendar-days" },
              { label: "Asignadas a mí", valor: kpis.mias, tono: "text-white", icono: "lucide:user-check" },
            ].map((k) => (
              <div key={k.label} className="rounded-lg bg-white/10 border border-white/15 px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-white/70">
                  <Icon icon={k.icono} width={13} height={13} />
                  <span className="text-sm font-semibold">{k.label}</span>
                </div>
                <p className={`text-2xl font-bold tabular-nums mt-1 ${k.tono}`}>{k.valor}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={moduleCard}>
          <div className={moduleCardAccent} />
          <div className="px-4 py-3 flex flex-wrap items-center gap-2.5">
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por tarea, referencia o cliente"
              className={`${moduleInput} max-w-xs`}
            />
            <label className="inline-flex items-center gap-2 text-base font-semibold text-brand-blue/80 cursor-pointer">
              <input
                type="checkbox"
                checked={soloMias}
                onChange={(e) => setSoloMias(e.target.checked)}
                className="w-4 h-4 rounded accent-brand-blue"
              />
              Solo mías
            </label>
            <label className="inline-flex items-center gap-2 text-base font-semibold text-brand-blue/80 cursor-pointer">
              <input
                type="checkbox"
                checked={verCerradas}
                onChange={(e) => setVerCerradas(e.target.checked)}
                className="w-4 h-4 rounded accent-brand-blue"
              />
              Ver cerradas
            </label>
            <span className="ml-auto text-base text-neutral-500">
              {filtradas.length} {filtradas.length === 1 ? "tarea" : "tareas"} · {gruposOperacion.length}{" "}
              {gruposOperacion.length === 1 ? "operación" : "operaciones"}
            </span>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-base text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className={`${moduleCard} px-4 py-10 text-center text-base text-neutral-500`}>
            Cargando tareas...
          </div>
        ) : gruposOperacion.length === 0 ? (
          <div className={`${moduleCard} px-4 py-10 text-center`}>
            <Icon icon="lucide:check-circle-2" width={28} height={28} className="mx-auto text-emerald-500" />
            <p className="text-base text-brand-blue/80 mt-2 font-semibold">No hay tareas pendientes</p>
            <p className="text-base text-neutral-500 mt-1 max-w-md mx-auto">
              Las tareas se crean solas cuando una operación se registra o avanza de estado. Si esperabas
              ver alguna, revisa los filtros de arriba.
            </p>
          </div>
        ) : (
          gruposOperacion.map((grupo) => {
            const estadoStyle = getEstadoOperacionStyle(grupo.estadoOperacion);
            const etiquetaEstadoActual = etiquetaEstado(grupo.estadoOperacion);
            const puedeAvanzar =
              grupo.faseCompleta &&
              grupo.siguienteEstado !== null &&
              !esEstadoCerrado(grupo.estadoOperacion);
            const avanzando = avanzandoOperacion === grupo.operacionId;
            const pctProgreso =
              grupo.progreso.total > 0
                ? Math.round((grupo.progreso.completadas / grupo.progreso.total) * 100)
                : 100;

            return (
              <section key={grupo.operacionId} className={moduleCard}>
                <div className={moduleCardAccent} />
                <div className="px-4 py-3 border-b border-brand-blue/10">
                  <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h2 className="text-lg font-bold text-brand-blue">{grupo.ref}</h2>
                        {grupo.cliente && (
                          <span className="text-base text-neutral-600 truncate max-w-[280px]">{grupo.cliente}</span>
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
                          <div className="flex items-center justify-between gap-2 text-sm text-neutral-600">
                            <span>
                              {grupo.progreso.completadas} de {grupo.progreso.total} tareas de esta fase
                            </span>
                            <span className="font-semibold tabular-nums">{pctProgreso}%</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-brand-blue/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand-blue transition-all duration-300"
                              style={{ width: `${pctProgreso}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1.5 text-sm text-neutral-500">Sin tareas pendientes en esta fase</p>
                      )}
                    </div>

                    {grupo.siguienteEstado && (
                      <button
                        type="button"
                        disabled={!puedeAvanzar || avanzando}
                        title={
                          puedeAvanzar
                            ? undefined
                            : "Completa todas las tareas de esta fase para avanzar"
                        }
                        onClick={() => void avanzarOperacion(grupo)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-base font-semibold bg-brand-blue text-white hover:bg-brand-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                      >
                        <Icon icon="lucide:arrow-right-circle" width={15} height={15} />
                        {avanzando
                          ? "Avanzando..."
                          : `Avanzar a ${etiquetaEstado(grupo.siguienteEstado)}`}
                      </button>
                    )}
                  </div>
                </div>

                <ul className="divide-y divide-brand-blue/10">
                  {grupo.tareas.length === 0 ? (
                    <li className="px-4 py-3 text-base text-emerald-700 bg-emerald-50/50">
                      <Icon icon="lucide:check-circle-2" width={16} height={16} className="inline mr-1.5 -mt-0.5" />
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
                            <p className="text-base font-semibold text-brand-blue">{t.titulo}</p>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-base text-neutral-600">
                              <span className="inline-flex items-center gap-1">
                                <Icon icon="lucide:user" width={12} height={12} />
                                {nombreResponsable(t)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Icon icon="lucide:calendar" width={12} height={12} />
                                {fmtFecha(t.fecha_limite)}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-sm font-semibold border ${cfg.badge}`}
                              >
                                {textoPlazo(t.fecha_limite)}
                              </span>
                              {t.estado_origen && (
                                <span className="inline-flex items-center gap-1 text-sm text-neutral-500">
                                  <Icon icon="lucide:git-branch" width={12} height={12} />
                                  Se creó al pasar a {etiquetaEstado(t.estado_origen)}
                                </span>
                              )}
                              {!abierta && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-sm font-semibold border bg-neutral-100 text-neutral-600 border-neutral-200">
                                  {ESTADO_TAREA_ETIQUETA[t.estado]}
                                </span>
                              )}
                            </div>
                          </div>

                          {abierta && (
                            <div className="flex items-center gap-2 shrink-0">
                              {t.estado !== "EN_CURSO" && (
                                <button
                                  type="button"
                                  disabled={ocupado}
                                  onClick={() => void cambiarEstado(t, "EN_CURSO")}
                                  className={`${moduleBtnSecondary} disabled:opacity-50`}
                                >
                                  <Icon icon="lucide:play" width={13} height={13} />
                                  En curso
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={ocupado}
                                onClick={() => void cambiarEstado(t, "COMPLETADA")}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-base font-semibold bg-brand-blue text-white hover:bg-brand-blue/90 transition-colors disabled:opacity-50"
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
  );
}
