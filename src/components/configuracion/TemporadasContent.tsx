"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { sileo } from "sileo";
import { useAuth } from "@/lib/auth/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { listarTemporadas, type Temporada } from "@/lib/temporadas";
import { formatRefAsli } from "@/lib/refAsli";
import { invalidarTemporadaActiva } from "@/lib/useTemporadaActiva";
import {
  modulePageBg,
  moduleHero,
  moduleInput,
  moduleLabel,
  moduleBtnPrimary,
  moduleBtnSecondary,
  moduleCard,
  moduleSectionTitle,
} from "@/lib/ui/moduleStyles";

type FormState = {
  nombre: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
};

const emptyForm: FormState = { nombre: "", descripcion: "", fecha_inicio: "", fecha_fin: "" };

type Confirmacion = { tipo: "activar" | "eliminar"; temporada: Temporada };

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
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [conteos, setConteos] = useState<Record<string, number>>({});
  /** Último correlativo entregado en cada temporada (por nombre), para anticipar la próxima referencia. */
  const [ultimos, setUltimos] = useState<Record<string, number>>({});
  /** Valores de operaciones.temporada que no existen en el catálogo: quedarían fuera de todo filtro. */
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
      // Los módulos operativos leen la temporada activa de una caché en memoria.
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

  /** Abre el modal de confirmación, salvo que la temporada no se pueda eliminar. */
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

  if (authLoading) {
    return (
      <main className={`flex-1 min-h-0 ${modulePageBg} flex items-center justify-center`} role="main">
        <p className="text-neutral-500">Cargando…</p>
      </main>
    );
  }
  if (!profile) {
    return (
      <main className={`flex-1 min-h-0 ${modulePageBg} p-6`} role="main">
        <p className="text-neutral-600">Debes iniciar sesión.</p>
      </main>
    );
  }
  if (!isSuperadmin) {
    return (
      <main className={`flex-1 min-h-0 ${modulePageBg} p-6`} role="main">
        <p className="text-neutral-600">Solo un superadmin puede administrar las temporadas.</p>
      </main>
    );
  }

  return (
    <main className={`flex-1 min-h-0 flex flex-col ${modulePageBg} overflow-hidden`} role="main">
      <div className={`flex-shrink-0 ${moduleHero}`}>
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-white/15 border border-white/25 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Icon icon="lucide:calendar-range" width={24} height={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight tracking-tight">Temporadas</h1>
              <p className="text-base text-white/75 mt-1">
                Nombra las temporadas y controla cuál está activa. Las operaciones nuevas entran en la temporada activa y su
                numeración parte en A00001 en cada temporada.
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-4 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
              <Icon icon="lucide:check-circle-2" width={13} height={13} className="text-white/80" />
              <span className="text-sm font-semibold">Activa: {activa?.nombre ?? "sin definir"}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
              <Icon icon="lucide:layers" width={13} height={13} className="text-white/80" />
              <span className="text-sm font-semibold">
                {temporadas.length} temporada{temporadas.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
              <Icon icon="lucide:package" width={13} height={13} className="text-white/80" />
              <span className="text-sm font-semibold">{totalOperaciones} operaciones clasificadas</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex-shrink-0 px-4 py-2.5 bg-red-100 text-red-700 text-base border-b border-red-200" role="alert">
          {error}
        </div>
      )}

      {huerfanas.length > 0 && (
        <div className="flex-shrink-0 mx-3 mt-3 px-4 py-3 rounded-2xl border border-amber-300 bg-amber-50" role="alert">
          <p className="text-base font-bold text-amber-800">
            Hay operaciones con temporadas que no están en el catálogo
          </p>
          <p className="text-sm text-amber-800/80 mt-0.5">
            No aparecen en el filtro de Registros hasta que registres el valor o lo unifiques con una temporada existente.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {huerfanas.map((h) => (
              <button
                key={h.nombre}
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm({ ...emptyForm, nombre: h.nombre });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors"
                title="Cargar este nombre en el formulario para registrarlo"
              >
                <Icon icon="lucide:plus" width={12} height={12} />
                {h.nombre} ({h.total})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col lg:flex-row gap-3">
        <div className={`lg:w-80 shrink-0 ${moduleCard}`}>
          <div className="px-4 py-3 border-b border-brand-blue/15">
            <span className={moduleSectionTitle}>
              {editingId ? "Editar temporada" : "Nueva temporada"}
            </span>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className={moduleLabel} htmlFor="temporada-nombre">
                Nombre
              </label>
              <input
                id="temporada-nombre"
                type="text"
                value={form.nombre}
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="2026-2027"
                className={moduleInput}
              />
            </div>
            <div>
              <label className={moduleLabel} htmlFor="temporada-descripcion">
                Descripción
              </label>
              <input
                id="temporada-descripcion"
                type="text"
                value={form.descripcion}
                onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                placeholder="Opcional"
                className={moduleInput}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={moduleLabel} htmlFor="temporada-inicio">
                  Inicio
                </label>
                <input
                  id="temporada-inicio"
                  type="date"
                  value={form.fecha_inicio}
                  onChange={(e) => setForm((p) => ({ ...p, fecha_inicio: e.target.value }))}
                  className={moduleInput}
                />
              </div>
              <div>
                <label className={moduleLabel} htmlFor="temporada-fin">
                  Término
                </label>
                <input
                  id="temporada-fin"
                  type="date"
                  value={form.fecha_fin}
                  onChange={(e) => setForm((p) => ({ ...p, fecha_fin: e.target.value }))}
                  className={moduleInput}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => void handleSubmit()} disabled={saving} className={`${moduleBtnPrimary} disabled:opacity-50`}>
                <Icon icon={editingId ? "lucide:save" : "lucide:plus"} width={14} height={14} />
                {editingId ? "Guardar" : "Crear"}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className={moduleBtnSecondary}>
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={`flex-1 min-w-0 ${moduleCard}`}>
          <div className="px-4 py-3 border-b border-brand-blue/15">
            <span className={moduleSectionTitle}>Temporadas registradas</span>
          </div>
          {loading ? (
            <p className="p-6 text-neutral-500">Cargando temporadas…</p>
          ) : temporadas.length === 0 ? (
            <p className="p-6 text-neutral-500">Aún no hay temporadas registradas.</p>
          ) : (
            <ul className="divide-y divide-brand-blue/10">
              {temporadas.map((tp) => (
                <li key={tp.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-brand-blue">{tp.nombre}</span>
                      {tp.activa && (
                        <span className="text-sm font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700">
                          Activa
                        </span>
                      )}
                      {tp.cerrada && (
                        <span className="text-sm font-bold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-600">
                          Cerrada
                        </span>
                      )}
                      <span className="text-sm text-neutral-500">
                        {conteos[tp.id] ?? 0} operacion{(conteos[tp.id] ?? 0) === 1 ? "" : "es"}
                      </span>
                      <span className="text-sm font-semibold text-brand-blue/70 tabular-nums" title="Referencia que recibirá la próxima operación de esta temporada">
                        Próxima ref: {formatRefAsli(null, (ultimos[tp.nombre] ?? 0) + 1)}
                      </span>
                    </div>
                    {(tp.descripcion || tp.fecha_inicio || tp.fecha_fin) && (
                      <p className="text-sm text-neutral-500 mt-0.5 truncate">
                        {[tp.descripcion, [tp.fecha_inicio, tp.fecha_fin].filter(Boolean).join(" → ")]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!tp.activa && (
                      <button
                        type="button"
                        onClick={() => pedirConfirmacion("activar", tp)}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        <Icon icon="lucide:play" width={12} height={12} />
                        Activar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleToggleCerrada(tp)}
                      className={moduleBtnSecondary}
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
                      className={moduleBtnSecondary}
                      title="Editar"
                    >
                      <Icon icon="lucide:pencil" width={12} height={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => pedirConfirmacion("eliminar", tp)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
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

      {confirmacion && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setConfirmacion(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="temporada-confirm-titulo"
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`h-1.5 ${confirmacion.tipo === "activar" ? "bg-emerald-500" : "bg-red-500"}`} />
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-neutral-200" />
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    confirmacion.tipo === "activar" ? "bg-emerald-100" : "bg-red-100"
                  }`}
                >
                  <Icon
                    icon={confirmacion.tipo === "activar" ? "lucide:calendar-check" : "lucide:trash-2"}
                    width={20}
                    height={20}
                    className={confirmacion.tipo === "activar" ? "text-emerald-600" : "text-red-600"}
                  />
                </div>
                <div>
                  <h3 id="temporada-confirm-titulo" className="text-sm font-bold text-neutral-900">
                    {confirmacion.tipo === "activar" ? "Cambiar temporada activa" : "Eliminar temporada"}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {confirmacion.tipo === "activar"
                      ? "Afecta a las operaciones que se creen desde ahora."
                      : "Esta acción no se puede deshacer."}
                  </p>
                </div>
              </div>

              {confirmacion.tipo === "activar" ? (
                <div className="mb-6 space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <span className="px-3 py-1.5 rounded-xl bg-neutral-100 text-sm font-semibold text-neutral-500">
                      {activa?.nombre ?? "sin definir"}
                    </span>
                    <Icon icon="lucide:arrow-right" width={16} height={16} className="text-neutral-400 shrink-0" />
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-sm font-bold text-emerald-700">
                      {confirmacion.temporada.nombre}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    Las operaciones nuevas quedarán en{" "}
                    <span className="font-semibold text-neutral-900">{confirmacion.temporada.nombre}</span> y su
                    numeración partirá en{" "}
                    <span className="font-semibold text-neutral-900 tabular-nums">
                      {formatRefAsli(null, (ultimos[confirmacion.temporada.nombre] ?? 0) + 1)}
                    </span>
                    . Las operaciones ya cargadas no se modifican.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
                  ¿Confirmas eliminar{" "}
                  <span className="font-semibold text-neutral-900">"{confirmacion.temporada.nombre}"</span>? No tiene
                  operaciones asociadas.
                </p>
              )}

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmacion(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold bg-neutral-100 hover:bg-neutral-200 transition-colors text-neutral-700"
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
                  className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50 ${
                    confirmacion.tipo === "activar"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {confirmacion.tipo === "activar" ? "Activar temporada" : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
