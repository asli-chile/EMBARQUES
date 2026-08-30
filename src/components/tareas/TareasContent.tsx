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
  moduleSectionTitle,
} from "@/lib/ui/moduleStyles";
import { formatRefAsli } from "@/lib/refAsli";
import { etiquetaEstado } from "@/lib/operaciones/estados";
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

  const nombreResponsable = useCallback(
    (t: TareaRow): string => {
      if (t.responsable_externo) return t.responsable_externo;
      if (!t.responsable_usuario_id) return "Sin responsable";
      if (t.responsable_usuario_id === profile?.id) return "Yo";
      return nombresUsuarios[t.responsable_usuario_id] ?? "Sin responsable";
    },
    [nombresUsuarios, profile?.id],
  );

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return tareas.filter((t) => {
      const abierta = esTareaAbierta(t.estado);
      if (!verCerradas && !abierta) return false;
      if (soloMias && t.responsable_usuario_id !== profile?.id) return false;

      if (q) {
        const ref = formatRefAsli(t.operaciones?.ref_asli, t.operaciones?.correlativo) ?? "";
        const campos = [t.titulo, t.tipo, ref, t.operaciones?.cliente ?? "", t.responsable_externo ?? ""];
        if (!campos.some((c) => c.toLowerCase().includes(q))) return false;
      }

      return true;
    });
  }, [tareas, verCerradas, soloMias, busqueda, profile?.id]);

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

  const grupos = useMemo(() => {
    const orden: UrgenciaTarea[] = ["vencida", "hoy", "proxima", "sin_fecha", "cerrada"];
    const mapa = new Map<UrgenciaTarea, TareaRow[]>();

    for (const t of filtradas) {
      const u = urgenciaTarea(t.estado, t.fecha_limite);
      const actual = mapa.get(u);
      if (actual) actual.push(t);
      else mapa.set(u, [t]);
    }

    return orden
      .map((u) => ({ urgencia: u, tareas: mapa.get(u) ?? [] }))
      .filter((g) => g.tareas.length > 0);
  }, [filtradas]);

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
                <strong className="text-white">Completar una tarea no mueve la operación.</strong> Solo apaga
                el recordatorio. El estado se sigue cambiando en Registros, y ese cambio es el que genera el
                lote de tareas siguiente.
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
              {filtradas.length} {filtradas.length === 1 ? "tarea" : "tareas"}
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
        ) : grupos.length === 0 ? (
          <div className={`${moduleCard} px-4 py-10 text-center`}>
            <Icon icon="lucide:check-circle-2" width={28} height={28} className="mx-auto text-emerald-500" />
            <p className="text-base text-brand-blue/80 mt-2 font-semibold">No hay tareas pendientes</p>
            <p className="text-base text-neutral-500 mt-1 max-w-md mx-auto">
              Las tareas se crean solas cuando una operación se registra o avanza de estado. Si esperabas
              ver alguna, revisa los filtros de arriba.
            </p>
          </div>
        ) : (
          grupos.map((grupo) => {
            const cfg = URGENCIA_STYLE[grupo.urgencia];
            return (
              <section key={grupo.urgencia} className={moduleCard}>
                <div className={moduleCardAccent} />
                <div className="px-4 py-3 border-b border-brand-blue/10 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                  <div className="min-w-0">
                    <h2 className={moduleSectionTitle}>{cfg.etiqueta}</h2>
                    <p className="text-base text-neutral-500">{cfg.explicacion}</p>
                  </div>
                  <span className="ml-auto text-base font-semibold text-neutral-500 shrink-0">
                    {grupo.tareas.length}
                  </span>
                </div>

                <ul className="divide-y divide-brand-blue/10">
                  {grupo.tareas.map((t) => {
                    const ref = formatRefAsli(t.operaciones?.ref_asli, t.operaciones?.correlativo) ?? "—";
                    const abierta = esTareaAbierta(t.estado);
                    const ocupado = guardando === t.id;

                    return (
                      <li key={t.id} className="px-4 py-3">
                        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold text-brand-blue">{t.titulo}</p>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-base text-neutral-600">
                              <span className="font-bold text-brand-blue">{ref}</span>
                              {t.operaciones?.cliente && (
                                <span className="truncate max-w-[240px]">{t.operaciones.cliente}</span>
                              )}
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
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-sm font-semibold border ${cfg.badge}`}>
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
                  })}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </main>
  );
}
