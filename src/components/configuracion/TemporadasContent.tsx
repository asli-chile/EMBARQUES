"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { sileo } from "sileo";
import { useAuth } from "@/lib/auth/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { listarTemporadas, type Temporada } from "@/lib/temporadas";
import { formatRefAsli } from "@/lib/refAsli";
import { invalidarTemporadaActiva } from "@/lib/useTemporadaActiva";
import { useNeonTheme } from "@/lib/ui/neonTheme";

type FormState = {
  nombre: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
};

const emptyForm: FormState = { nombre: "", descripcion: "", fecha_inicio: "", fecha_fin: "" };

type Confirmacion = { tipo: "activar" | "eliminar"; temporada: Temporada };

const neonInput =
  "dash-control w-full px-3.5 py-2.5 border border-dash-border rounded-lg text-base text-dash-fg placeholder:text-dash-muted focus:outline-none focus:ring-2 focus:ring-dash-neon/40 focus:border-dash-neon/50";
const neonLabel = "block text-sm font-semibold text-dash-muted mb-1.5";
const neonBtnSecondary =
  "inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-dash-control px-3 py-2 text-sm font-semibold text-dash-fg transition-colors hover:bg-dash-neon/15";

function toForm(tp: Temporada): FormState {
  return {
    nombre: tp.nombre,
    descripcion: tp.descripcion ?? "",
    fecha_inicio: tp.fecha_inicio ?? "",
    fecha_fin: tp.fecha_fin ?? "",
  };
}

export function TemporadasContent() {
  const { isSuperadmin, profile, isLoading: authLoading } = useAuth();
  const [theme] = useNeonTheme();
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [conteos, setConteos] = useState<Record<string, number>>({});
  const [ultimos, setUltimos] = useState<Record<string, number>>({});
  const [huerfanas, setHuerfanas] = useState<{ nombre: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const load = useCallback(async () => {
    if (!supabase) {
      setError("No se pudo conectar con la base de datos.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { temporadas: rows, error: err } = await listarTemporadas(supabase);
    if (err) {
      setError(err);
      setTemporadas([]);
      setLoading(false);
      return;
    }
    setTemporadas(rows);
    setLoading(false);

    const { data: correlativos } = await supabase
      .from("temporadas_correlativos")
      .select("temporada, ultimo");
    setUltimos(
      Object.fromEntries((correlativos ?? []).map((c) => [c.temporada as string, (c.ultimo as number) ?? 0]))
    );

    const counts = await Promise.all(
      rows.map(async (tp) => {
        const { count } = await supabase
          .from("operaciones")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
          .eq("temporada", tp.nombre);
        return [tp.id, count ?? 0] as const;
      })
    );
    setConteos(Object.fromEntries(counts));

    const { data: valores } = await supabase
      .from("operaciones")
      .select("temporada")
      .is("deleted_at", null);
    const registradas = new Set(rows.map((tp) => tp.nombre));
    const sueltas = new Map<string, number>();
    for (const fila of valores ?? []) {
      const nombre = (fila.temporada as string | null)?.trim();
      if (!nombre || registradas.has(nombre)) continue;
      sueltas.set(nombre, (sueltas.get(nombre) ?? 0) + 1);
    }
    setHuerfanas([...sueltas.entries()].map(([nombre, total]) => ({ nombre, total })).sort((a, b) => b.total - a.total));
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!confirmacion) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmacion(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmacion]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!supabase) return;
    const nombre = form.nombre.trim();
    if (!nombre) {
      sileo.error({ title: "El nombre de la temporada es obligatorio." });
      return;
    }
    if (form.fecha_inicio && form.fecha_fin && form.fecha_fin < form.fecha_inicio) {
      sileo.error({ title: "La fecha de término no puede ser anterior al inicio." });
      return;
    }

    setSaving(true);
    const payload = {
      nombre,
      descripcion: form.descripcion.trim() || null,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null,
    };

    const { error: err } = editingId
      ? await supabase.from("temporadas").update(payload).eq("id", editingId)
      : await supabase.from("temporadas").insert(payload);
    setSaving(false);

    if (err) {
      sileo.error({
        title: err.message.includes("temporadas_nombre_key")
          ? "Ya existe una temporada con ese nombre."
          : err.message,
      });
      return;
    }
    sileo.success({ title: editingId ? "Temporada actualizada." : "Temporada creada." });
    resetForm();
    void load();
  }, [supabase, form, editingId, resetForm, load]);

  const handleActivar = useCallback(
    async (tp: Temporada) => {
      if (!supabase || tp.activa) return;
      setSaving(true);
      const { error: err } = await supabase
        .from("temporadas")
        .update({ activa: true, cerrada: false })
        .eq("id", tp.id);
      setSaving(false);
      setConfirmacion(null);
      if (err) {
        sileo.error({ title: err.message });
        return;
      }
      invalidarTemporadaActiva();
      sileo.success({ title: `Temporada activa: ${tp.nombre}` });
      void load();
    },
    [supabase, load]
  );

  const handleToggleCerrada = useCallback(
    async (tp: Temporada) => {
      if (!supabase) return;
      if (tp.activa && !tp.cerrada) {
        sileo.error({ title: "Activa otra temporada antes de cerrar esta." });
        return;
      }
      const { error: err } = await supabase
        .from("temporadas")
        .update({ cerrada: !tp.cerrada })
        .eq("id", tp.id);
      if (err) {
        sileo.error({ title: err.message });
        return;
      }
      sileo.success({ title: tp.cerrada ? `${tp.nombre} reabierta.` : `${tp.nombre} cerrada.` });
      void load();
    },
    [supabase, load]
  );

  const handleEliminar = useCallback(
    async (tp: Temporada) => {
      if (!supabase) return;
      setSaving(true);
      const { error: err } = await supabase.from("temporadas").delete().eq("id", tp.id);
      setSaving(false);
      setConfirmacion(null);
      if (err) {
        sileo.error({ title: err.message });
        return;
      }
      sileo.success({ title: "Temporada eliminada." });
      if (editingId === tp.id) resetForm();
      void load();
    },
    [supabase, editingId, resetForm, load]
  );

  const pedirConfirmacion = useCallback(
    (tipo: Confirmacion["tipo"], tp: Temporada) => {
      if (tipo === "eliminar") {
        const usadas = conteos[tp.id] ?? 0;
        if (usadas > 0) {
          sileo.error({
            title: `No se puede eliminar: ${usadas} operación${usadas !== 1 ? "es" : ""} usa esta temporada.`,
          });
          return;
        }
      }
      setConfirmacion({ tipo, temporada: tp });
    },
    [conteos]
  );

  const activa = temporadas.find((tp) => tp.activa) ?? null;
  const totalOperaciones = Object.values(conteos).reduce((acc, n) => acc + n, 0);

  const wrapEarly = (message: string, center = false) => (
    <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
      <main
        className={`dash-page relative flex min-h-0 flex-1 flex-col p-6 ${center ? "items-center justify-center" : ""}`}
        role="main"
      >
        <p className="text-dash-muted">{message}</p>
      </main>
    </div>
  );

  if (authLoading) return wrapEarly("Cargando…", true);
  if (!profile) return wrapEarly("Debes iniciar sesión.");
  if (!isSuperadmin) return wrapEarly("Solo un superadmin puede administrar las temporadas.");

  return (
    <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
      <main className="dash-page relative flex min-h-0 flex-1 flex-col overflow-hidden" role="main">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -right-16 top-10 h-72 w-72 rounded-full bg-dash-neon/20 blur-3xl" />
          <div className="absolute bottom-20 left-1/4 h-64 w-64 rounded-full bg-dash-neon-hot/15 blur-3xl" />
        </div>

        <div className="dash-toolbar relative z-10 shrink-0">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dash-neon/40 bg-dash-neon/15 shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--dash-neon)_55%,transparent)]">
                <Icon icon="lucide:calendar-range" width={22} height={22} className="text-dash-neon" aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold tracking-tight text-dash-fg sm:text-xl">Temporadas</h1>
                <p className="mt-0.5 line-clamp-2 text-xs text-dash-muted sm:text-sm">
                  Nombra las temporadas y controla cuál está activa. Las operaciones nuevas entran en la temporada activa y su
                  numeración parte en A00001 en cada temporada.
                </p>
              </div>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-dash-control px-3 py-1.5 text-xs font-semibold text-dash-fg">
                <Icon icon="lucide:check-circle-2" width={13} height={13} className="text-dash-neon" />
                Activa: {activa?.nombre ?? "sin definir"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-dash-control px-3 py-1.5 text-xs font-semibold text-dash-fg">
                <Icon icon="lucide:layers" width={13} height={13} className="text-dash-muted" />
                {temporadas.length} temporada{temporadas.length !== 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-dash-control px-3 py-1.5 text-xs font-semibold text-dash-fg">
                <Icon icon="lucide:package" width={13} height={13} className="text-dash-muted" />
                {totalOperaciones} operaciones
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="relative z-10 shrink-0 border-b border-red-400/35 bg-red-500/10 px-4 py-2.5 text-sm text-red-300" role="alert">
            {error}
          </div>
        )}

        {huerfanas.length > 0 && (
          <div className="relative z-10 mx-3 mt-3 shrink-0 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3" role="alert">
            <p className="text-sm font-bold text-amber-200">
              Hay operaciones con temporadas que no están en el catálogo
            </p>
            <p className="mt-0.5 text-xs text-amber-200/80">
              No aparecen en el filtro de Registros hasta que registres el valor o lo unifiques con una temporada existente.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {huerfanas.map((h) => (
                <button
                  key={h.nombre}
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ ...emptyForm, nombre: h.nombre });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/35 bg-amber-500/15 px-3 py-1.5 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/25"
                  title="Cargar este nombre en el formulario para registrarlo"
                >
                  <Icon icon="lucide:plus" width={12} height={12} />
                  {h.nombre} ({h.total})
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 lg:flex-row">
          <div className="dash-card shrink-0 overflow-hidden rounded-xl lg:w-80">
            <div className="border-b border-dash-border px-4 py-3">
              <span className="text-sm font-bold tracking-wide text-dash-neon">
                {editingId ? "Editar temporada" : "Nueva temporada"}
              </span>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label className={neonLabel} htmlFor="temporada-nombre">Nombre</label>
                <input
                  id="temporada-nombre"
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="2026-2027"
                  className={neonInput}
                />
              </div>
              <div>
                <label className={neonLabel} htmlFor="temporada-descripcion">Descripción</label>
                <input
                  id="temporada-descripcion"
                  type="text"
                  value={form.descripcion}
                  onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Opcional"
                  className={neonInput}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={neonLabel} htmlFor="temporada-inicio">Inicio</label>
                  <input
                    id="temporada-inicio"
                    type="date"
                    value={form.fecha_inicio}
                    onChange={(e) => setForm((p) => ({ ...p, fecha_inicio: e.target.value }))}
                    className={neonInput}
                  />
                </div>
                <div>
                  <label className={neonLabel} htmlFor="temporada-fin">Término</label>
                  <input
                    id="temporada-fin"
                    type="date"
                    value={form.fecha_fin}
                    onChange={(e) => setForm((p) => ({ ...p, fecha_fin: e.target.value }))}
                    className={neonInput}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={saving}
                  className="dash-cta inline-flex items-center gap-1.5 px-4 py-2 text-sm disabled:opacity-50"
                >
                  <Icon icon={editingId ? "lucide:save" : "lucide:plus"} width={14} height={14} />
                  {editingId ? "Guardar" : "Crear"}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} className={neonBtnSecondary}>
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="dash-card min-w-0 flex-1 overflow-hidden rounded-xl">
            <div className="border-b border-dash-border px-4 py-3">
              <span className="text-sm font-bold tracking-wide text-dash-neon">Temporadas registradas</span>
            </div>
            {loading ? (
              <div className="flex items-center gap-3 p-6 text-dash-muted">
                <Icon icon="typcn:refresh" className="h-4 w-4 animate-spin text-dash-neon" />
                Cargando temporadas…
              </div>
            ) : temporadas.length === 0 ? (
              <p className="p-6 text-dash-muted">Aún no hay temporadas registradas.</p>
            ) : (
              <ul className="divide-y divide-dash-border">
                {temporadas.map((tp) => (
                  <li key={tp.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold text-dash-fg">{tp.nombre}</span>
                        {tp.activa && (
                          <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-300">
                            Activa
                          </span>
                        )}
                        {tp.cerrada && (
                          <span className="rounded-full border border-dash-border bg-dash-control px-2 py-0.5 text-xs font-bold text-dash-muted">
                            Cerrada
                          </span>
                        )}
                        <span className="text-sm text-dash-muted">
                          {conteos[tp.id] ?? 0} operacion{(conteos[tp.id] ?? 0) === 1 ? "" : "es"}
                        </span>
                        <span
                          className="tabular-nums text-sm font-semibold text-dash-neon/80"
                          title="Referencia que recibirá la próxima operación de esta temporada"
                        >
                          Próxima ref: {formatRefAsli(null, (ultimos[tp.nombre] ?? 0) + 1)}
                        </span>
                      </div>
                      {(tp.descripcion || tp.fecha_inicio || tp.fecha_fin) && (
                        <p className="mt-0.5 truncate text-sm text-dash-muted">
                          {[tp.descripcion, [tp.fecha_inicio, tp.fecha_fin].filter(Boolean).join(" → ")]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {!tp.activa && (
                        <button
                          type="button"
                          onClick={() => pedirConfirmacion("activar", tp)}
                          disabled={saving}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-3 py-1.5 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/25 disabled:opacity-50"
                        >
                          <Icon icon="lucide:play" width={12} height={12} />
                          Activar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleToggleCerrada(tp)}
                        className={neonBtnSecondary}
                        title={tp.cerrada ? "Reabrir temporada" : "Cerrar temporada"}
                      >
                        <Icon icon={tp.cerrada ? "lucide:unlock" : "lucide:lock"} width={12} height={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(tp.id);
                          setForm(toForm(tp));
                        }}
                        className={neonBtnSecondary}
                        title="Editar"
                      >
                        <Icon icon="lucide:pencil" width={12} height={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => pedirConfirmacion("eliminar", tp)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/35 bg-red-500/15 px-3 py-1.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/25"
                        title="Eliminar"
                      >
                        <Icon icon="lucide:trash-2" width={12} height={12} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>

      {confirmacion && (
        <div
          className="dash-neon fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          data-theme={theme}
          onClick={() => setConfirmacion(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="temporada-confirm-titulo"
        >
          <div
            className="dash-card w-full overflow-hidden rounded-t-3xl sm:max-w-sm sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`h-1.5 ${confirmacion.tipo === "activar" ? "bg-emerald-500" : "bg-red-500"}`} />
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-dash-border" />
            </div>
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                    confirmacion.tipo === "activar"
                      ? "border-emerald-400/35 bg-emerald-500/15"
                      : "border-red-400/35 bg-red-500/15"
                  }`}
                >
                  <Icon
                    icon={confirmacion.tipo === "activar" ? "lucide:calendar-check" : "lucide:trash-2"}
                    width={20}
                    height={20}
                    className={confirmacion.tipo === "activar" ? "text-emerald-300" : "text-red-400"}
                  />
                </div>
                <div>
                  <h3 id="temporada-confirm-titulo" className="text-sm font-bold text-dash-fg">
                    {confirmacion.tipo === "activar" ? "Cambiar temporada activa" : "Eliminar temporada"}
                  </h3>
                  <p className="mt-0.5 text-xs text-dash-muted">
                    {confirmacion.tipo === "activar"
                      ? "Afecta a las operaciones que se creen desde ahora."
                      : "Esta acción no se puede deshacer."}
                  </p>
                </div>
              </div>

              {confirmacion.tipo === "activar" ? (
                <div className="mb-6 space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <span className="rounded-xl border border-dash-border bg-dash-control px-3 py-1.5 text-sm font-semibold text-dash-muted">
                      {activa?.nombre ?? "sin definir"}
                    </span>
                    <Icon icon="lucide:arrow-right" width={16} height={16} className="shrink-0 text-dash-muted" />
                    <span className="rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-3 py-1.5 text-sm font-bold text-emerald-300">
                      {confirmacion.temporada.nombre}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-dash-muted">
                    Las operaciones nuevas quedarán en{" "}
                    <span className="font-semibold text-dash-fg">{confirmacion.temporada.nombre}</span> y su
                    numeración partirá en{" "}
                    <span className="tabular-nums font-semibold text-dash-fg">
                      {formatRefAsli(null, (ultimos[confirmacion.temporada.nombre] ?? 0) + 1)}
                    </span>
                    . Las operaciones ya cargadas no se modifican.
                  </p>
                </div>
              ) : (
                <p className="mb-6 text-sm leading-relaxed text-dash-muted">
                  ¿Confirmas eliminar{" "}
                  <span className="font-semibold text-dash-fg">&quot;{confirmacion.temporada.nombre}&quot;</span>? No tiene
                  operaciones asociadas.
                </p>
              )}

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmacion(null)}
                  className="flex-1 rounded-xl border border-dash-border bg-dash-control py-3 text-sm font-semibold text-dash-fg transition-colors hover:bg-dash-neon/15"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void (confirmacion.tipo === "activar"
                      ? handleActivar(confirmacion.temporada)
                      : handleEliminar(confirmacion.temporada))
                  }
                  disabled={saving}
                  className={`flex-1 rounded-xl py-3 text-sm font-bold transition-colors disabled:opacity-50 ${
                    confirmacion.tipo === "activar"
                      ? "border border-emerald-400/35 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                      : "border border-red-400/35 bg-red-500/20 text-red-300 hover:bg-red-500/30"
                  }`}
                >
                  {confirmacion.tipo === "activar" ? "Activar temporada" : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
