"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";

const NEW_EMPRESA_VALUE = "__new__";

type Empresa = { id: string; nombre: string };
type UsuarioCliente = { id: string; nombre: string; email: string };

export function AsignarClientesEmpresasContent() {
  const { isSuperadmin, profile, isLoading: authLoading } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [usuariosCliente, setUsuariosCliente] = useState<UsuarioCliente[]>([]);
  const [asignados, setAsignados] = useState<Set<string>>(new Set());
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | typeof NEW_EMPRESA_VALUE>("");
  const [newEmpresaNombre, setNewEmpresaNombre] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const fetchEmpresas = useCallback(async () => {
    if (!supabase) return;
    const { data, error: err } = await supabase
      .from("empresas")
      .select("id, nombre")
      .order("nombre");
    if (err) {
      setError(err.message);
      return;
    }
    setEmpresas((data ?? []) as Empresa[]);
  }, [supabase]);

  const fetchUsuariosCliente = useCallback(async () => {
    if (!supabase) return;
    const { data, error: err } = await supabase
      .from("usuarios")
      .select("id, nombre, email")
      .eq("rol", "cliente")
      .eq("activo", true)
      .order("nombre");
    if (err) {
      setError(err.message);
      return;
    }
    setUsuariosCliente((data ?? []) as UsuarioCliente[]);
  }, [supabase]);

  const fetchAsignados = useCallback(
    async (empresaId: string) => {
      if (!supabase || !empresaId) {
        setAsignados(new Set());
        return;
      }
      const { data, error: err } = await supabase
        .from("usuarios_empresas")
        .select("usuario_id")
        .eq("empresa_id", empresaId);
      if (err) {
        setAsignados(new Set());
        return;
      }
      const ids = new Set((data ?? []).map((r: { usuario_id: string }) => r.usuario_id));
      setAsignados(ids);
    },
    [supabase]
  );

  useEffect(() => {
    void fetchEmpresas();
    void fetchUsuariosCliente();
    setLoading(false);
  }, [fetchEmpresas, fetchUsuariosCliente]);

  useEffect(() => {
    if (selectedEmpresaId && selectedEmpresaId !== NEW_EMPRESA_VALUE) {
      void fetchAsignados(selectedEmpresaId);
    } else {
      setAsignados(new Set());
    }
  }, [selectedEmpresaId, fetchAsignados]);

  const handleCreateEmpresa = useCallback(async () => {
    if (!supabase || !newEmpresaNombre.trim()) return;
    setError(null);
    const { data, error: err } = await supabase
      .from("empresas")
      .insert({ nombre: newEmpresaNombre.trim() })
      .select("id, nombre")
      .single();
    if (err) {
      setError(err.message);
      return;
    }
    setEmpresas((prev) => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setSelectedEmpresaId(data.id);
    setNewEmpresaNombre("");
  }, [supabase, newEmpresaNombre]);

  const asignadosLista = useMemo(
    () => usuariosCliente.filter((u) => asignados.has(u.id)),
    [usuariosCliente, asignados]
  );
  const disponiblesLista = useMemo(
    () => usuariosCliente.filter((u) => !asignados.has(u.id)),
    [usuariosCliente, asignados]
  );

  const handleToggleUsuario = useCallback((usuarioId: string) => {
    setAsignados((prev) => {
      const next = new Set(prev);
      if (next.has(usuarioId)) {
        next.delete(usuarioId);
      } else {
        next.add(usuarioId);
      }
      return next;
    });
  }, []);

  const handleSelectAllDisponibles = useCallback(() => {
    setAsignados((prev) => new Set([...prev, ...disponiblesLista.map((u) => u.id)]));
  }, [disponiblesLista]);

  const handleQuitarTodosAsignados = useCallback(() => {
    setAsignados(new Set());
  }, []);

  const handleGuardar = useCallback(async () => {
    if (!supabase || !selectedEmpresaId || selectedEmpresaId === NEW_EMPRESA_VALUE) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const { error: delErr } = await supabase
        .from("usuarios_empresas")
        .delete()
        .eq("empresa_id", selectedEmpresaId);
      if (delErr) throw delErr;

      if (asignados.size > 0) {
        const rows = Array.from(asignados).map((usuario_id) => ({
          usuario_id,
          empresa_id: selectedEmpresaId,
        }));
        const { error: insErr } = await supabase.from("usuarios_empresas").insert(rows);
        if (insErr) throw insErr;
      }

      setSuccess("Asignación guardada correctamente.");
      setSelectedEmpresaId("");
      setAsignados(new Set());
      void fetchEmpresas();
      setTimeout(() => setSuccess(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }, [supabase, selectedEmpresaId, asignados, fetchEmpresas]);

  if (authLoading) {
    return (
      <main className="flex-1 min-h-0 overflow-auto bg-neutral-100 p-6 flex items-center justify-center" role="main">
        <p className="text-neutral-500">Cargando…</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex-1 min-h-0 overflow-auto bg-neutral-100 p-6" role="main">
        <p className="text-neutral-600">Inicia sesión para continuar.</p>
      </main>
    );
  }

  if (!isSuperadmin) {
    return (
      <main className="flex-1 min-h-0 overflow-auto bg-neutral-100 p-6" role="main">
        <p className="text-neutral-600">Solo el superadmin puede gestionar esta configuración.</p>
      </main>
    );
  }

  const showCreateForm = selectedEmpresaId === NEW_EMPRESA_VALUE;
  const empresaSelected = selectedEmpresaId && selectedEmpresaId !== NEW_EMPRESA_VALUE;

  return (
    <main className="flex-1 min-h-0 overflow-auto bg-neutral-100 p-6" role="main">
      <div className="max-w-2xl mx-auto space-y-6">
        <header>
          <h1 className="text-xl font-bold text-brand-blue">Asignar clientes a empresas</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Selecciona o crea una empresa y luego marca los usuarios (nivel cliente) que tendrán acceso a sus datos.
          </p>
        </header>

        {error && (
          <div className="px-4 py-2 bg-brand-red/10 text-brand-red text-sm rounded-lg border border-brand-red/20" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="px-4 py-2 bg-green-100 text-green-800 text-sm rounded-lg border border-green-200" role="status">
            {success}
          </div>
        )}

        <section className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-neutral-800">Empresa</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={showCreateForm ? NEW_EMPRESA_VALUE : selectedEmpresaId}
              onChange={(e) => setSelectedEmpresaId(e.target.value)}
              className="flex-1 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              aria-label="Seleccionar empresa"
            >
              <option value="">— Seleccionar empresa —</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
              <option value={NEW_EMPRESA_VALUE}>+ Crear nueva empresa</option>
            </select>
          </div>

          {showCreateForm && (
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-neutral-100">
              <input
                type="text"
                value={newEmpresaNombre}
                onChange={(e) => setNewEmpresaNombre(e.target.value)}
                placeholder="Nombre de la nueva empresa"
                className="flex-1 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                aria-label="Nombre de la nueva empresa"
                onKeyDown={(e) => e.key === "Enter" && handleCreateEmpresa()}
              />
              <button
                type="button"
                onClick={handleCreateEmpresa}
                disabled={!newEmpresaNombre.trim()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-brand-blue text-white hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
              >
                <Icon icon="typcn:plus" width={16} height={16} />
                Crear empresa
              </button>
            </div>
          )}

          {empresaSelected && (
            <p className="text-sm text-neutral-600">
              Empresa seleccionada: <strong>{empresas.find((e) => e.id === selectedEmpresaId)?.nombre ?? "—"}</strong>
            </p>
          )}
        </section>

        {empresaSelected && (
          <section className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm space-y-6">
            {loading ? (
              <p className="text-neutral-500 text-sm">Cargando usuarios…</p>
            ) : usuariosCliente.length === 0 ? (
              <p className="text-neutral-500 text-sm">
                No hay usuarios con rol cliente. Créalos en Configuración → Usuarios.
              </p>
            ) : (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-base font-semibold text-neutral-800">Asignados a esta empresa</h2>
                    {asignadosLista.length > 0 && (
                      <button
                        type="button"
                        onClick={handleQuitarTodosAsignados}
                        className="text-sm font-medium text-brand-blue hover:underline focus:outline-none focus:ring-2 focus:ring-brand-blue/30 rounded"
                      >
                        Quitar todos
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 mb-2">
                    Los asignados dejan de estar disponibles para seleccionar. Desmarca para quitar.
                  </p>
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto p-2 border border-green-200 rounded-lg bg-green-50/50">
                    {asignadosLista.length === 0 ? (
                      <p className="text-neutral-500 text-sm py-2">Ningún usuario asignado aún.</p>
                    ) : (
                      asignadosLista.map((u) => (
                        <label
                          key={u.id}
                          className="flex items-center gap-3 px-3 py-2 rounded-md bg-white border border-green-200 cursor-pointer hover:bg-green-50/50"
                        >
                          <input
                            type="checkbox"
                            checked
                            onChange={() => handleToggleUsuario(u.id)}
                            className="rounded border-neutral-300 text-brand-blue focus:ring-brand-blue/30"
                          />
                          <span className="text-sm font-medium">{u.nombre || u.email}</span>
                          <span className="text-xs text-neutral-500">{u.email}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-base font-semibold text-neutral-800">Disponibles para asignar</h2>
                    {disponiblesLista.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAllDisponibles}
                        className="text-sm font-medium text-brand-blue hover:underline focus:outline-none focus:ring-2 focus:ring-brand-blue/30 rounded"
                      >
                        Seleccionar todos
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto p-2 border border-neutral-200 rounded-lg bg-neutral-50">
                    {disponiblesLista.length === 0 ? (
                      <p className="text-neutral-500 text-sm py-2">
                        No hay más usuarios disponibles. Todos están asignados a esta empresa.
                      </p>
                    ) : (
                      disponiblesLista.map((u) => (
                        <label
                          key={u.id}
                          className="flex items-center gap-3 px-3 py-2 rounded-md bg-white border border-neutral-200 cursor-pointer hover:bg-neutral-50"
                        >
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={() => handleToggleUsuario(u.id)}
                            className="rounded border-neutral-300 text-brand-blue focus:ring-brand-blue/30"
                          />
                          <span className="text-sm font-medium">{u.nombre || u.email}</span>
                          <span className="text-xs text-neutral-500">{u.email}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}

            <button
              type="button"
              onClick={handleGuardar}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-brand-blue text-white hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
            >
              {saving ? (
                <>
                  <Icon icon="eos-icons:loading" width={18} height={18} className="animate-spin" />
                  Guardando…
                </>
              ) : (
                <>
                  <Icon icon="typcn:tick" width={18} height={18} />
                  Guardar asignación
                </>
              )}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
