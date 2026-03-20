"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { sileo } from "sileo";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";

const NEW_EMPRESA_VALUE = "__new__";

type Empresa = { id: string; nombre: string };
type UsuarioCliente = { id: string; nombre: string; email: string };

function Avatar({ name, assigned }: { name: string; assigned: boolean }) {
  return (
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold uppercase ${
        assigned ? "bg-green-500/15 text-green-700" : "bg-brand-blue/10 text-brand-blue"
      }`}
    >
      {name[0]}
    </div>
  );
}

export function AsignarClientesEmpresasContent() {
  const { isSuperadmin, profile, isLoading: authLoading } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [usuariosCliente, setUsuariosCliente] = useState<UsuarioCliente[]>([]);
  const [asignados, setAsignados] = useState<Set<string>>(new Set());
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>("");
  const [showNewEmpresa, setShowNewEmpresa] = useState(false);
  const [newEmpresaNombre, setNewEmpresaNombre] = useState("");
  const [creatingEmpresa, setCreatingEmpresa] = useState(false);
  const [searchEmpresa, setSearchEmpresa] = useState("");
  const [searchUsuario, setSearchUsuario] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // track original asignados to know if there are unsaved changes
  const [savedAsignados, setSavedAsignados] = useState<Set<string>>(new Set());
  // count per empresa: empresaId -> count
  const [countPerEmpresa, setCountPerEmpresa] = useState<Record<string, number>>({});

  const supabase = useMemo(() => {
    try { return createClient(); } catch { return null; }
  }, []);

  const fetchEmpresas = useCallback(async () => {
    if (!supabase) return;
    const { data, error: err } = await supabase.from("empresas").select("id, nombre").order("nombre");
    if (err) { setError(err.message); return; }
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
    if (err) { setError(err.message); return; }
    setUsuariosCliente((data ?? []) as UsuarioCliente[]);
  }, [supabase]);

  const fetchAllCounts = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("usuarios_empresas").select("empresa_id");
    if (!data) return;
    const counts: Record<string, number> = {};
    for (const row of data as { empresa_id: string }[]) {
      counts[row.empresa_id] = (counts[row.empresa_id] ?? 0) + 1;
    }
    setCountPerEmpresa(counts);
  }, [supabase]);

  const fetchAsignados = useCallback(async (empresaId: string) => {
    if (!supabase || !empresaId) { setAsignados(new Set()); setSavedAsignados(new Set()); return; }
    const { data, error: err } = await supabase
      .from("usuarios_empresas").select("usuario_id").eq("empresa_id", empresaId);
    if (err) { setAsignados(new Set()); return; }
    const ids = new Set((data ?? []).map((r: { usuario_id: string }) => r.usuario_id));
    setAsignados(ids);
    setSavedAsignados(new Set(ids));
  }, [supabase]);

  useEffect(() => {
    void fetchEmpresas();
    void fetchUsuariosCliente();
    void fetchAllCounts();
    setLoading(false);
  }, [fetchEmpresas, fetchUsuariosCliente, fetchAllCounts]);

  useEffect(() => {
    if (selectedEmpresaId) {
      void fetchAsignados(selectedEmpresaId);
      setSearchUsuario("");
    } else {
      setAsignados(new Set());
      setSavedAsignados(new Set());
    }
  }, [selectedEmpresaId, fetchAsignados]);

  const handleCreateEmpresa = useCallback(async () => {
    if (!supabase || !newEmpresaNombre.trim()) return;
    setError(null);
    setCreatingEmpresa(true);
    const { data, error: err } = await supabase
      .from("empresas").insert({ nombre: newEmpresaNombre.trim() }).select("id, nombre").single();
    setCreatingEmpresa(false);
    if (err) { setError(err.message); return; }
    setEmpresas((prev) => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setNewEmpresaNombre("");
    setShowNewEmpresa(false);
    setSelectedEmpresaId(data.id);
  }, [supabase, newEmpresaNombre]);

  const handleToggleUsuario = useCallback((usuarioId: string) => {
    setAsignados((prev) => {
      const next = new Set(prev);
      if (next.has(usuarioId)) { next.delete(usuarioId); } else { next.add(usuarioId); }
      return next;
    });
  }, []);

  const handleGuardar = useCallback(async () => {
    if (!supabase || !selectedEmpresaId) return;
    setError(null);
    setSaving(true);
    try {
      const { error: delErr } = await supabase
        .from("usuarios_empresas").delete().eq("empresa_id", selectedEmpresaId);
      if (delErr) throw delErr;
      if (asignados.size > 0) {
        const rows = Array.from(asignados).map((usuario_id) => ({ usuario_id, empresa_id: selectedEmpresaId }));
        const { error: insErr } = await supabase.from("usuarios_empresas").insert(rows);
        if (insErr) throw insErr;
      }
      setSavedAsignados(new Set(asignados));
      setCountPerEmpresa((prev) => ({ ...prev, [selectedEmpresaId]: asignados.size }));
      sileo.success({ title: "Asignación guardada." });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }, [supabase, selectedEmpresaId, asignados]);

  const hasChanges = useMemo(() => {
    if (asignados.size !== savedAsignados.size) return true;
    for (const id of asignados) { if (!savedAsignados.has(id)) return true; }
    return false;
  }, [asignados, savedAsignados]);

  const filteredEmpresas = useMemo(
    () => empresas.filter((e) => e.nombre.toLowerCase().includes(searchEmpresa.toLowerCase())),
    [empresas, searchEmpresa]
  );

  const filteredUsuarios = useMemo(() => {
    const q = searchUsuario.toLowerCase();
    return usuariosCliente.filter(
      (u) => u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [usuariosCliente, searchUsuario]);

  // Sort: assigned first, then available
  const sortedUsuarios = useMemo(
    () => [...filteredUsuarios].sort((a, b) => {
      const aA = asignados.has(a.id);
      const bA = asignados.has(b.id);
      if (aA && !bA) return -1;
      if (!aA && bA) return 1;
      return 0;
    }),
    [filteredUsuarios, asignados]
  );

  const asignadosCount = useMemo(
    () => filteredUsuarios.filter((u) => asignados.has(u.id)).length,
    [filteredUsuarios, asignados]
  );

  const selectedEmpresa = empresas.find((e) => e.id === selectedEmpresaId);

  if (authLoading) {
    return (
      <main className="flex-1 min-h-0 bg-neutral-100 flex items-center justify-center" role="main">
        <p className="text-neutral-500">Cargando…</p>
      </main>
    );
  }
  if (!profile) {
    return (
      <main className="flex-1 min-h-0 bg-neutral-100 p-6" role="main">
        <p className="text-neutral-600">Inicia sesión para continuar.</p>
      </main>
    );
  }
  if (!isSuperadmin) {
    return (
      <main className="flex-1 min-h-0 bg-neutral-100 p-6" role="main">
        <p className="text-neutral-600">Solo el superadmin puede gestionar esta configuración.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 min-h-0 flex flex-col bg-neutral-100 overflow-hidden" role="main">

      {/* Page header */}
      <div className="flex-shrink-0 bg-white border-b border-neutral-200 overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
        <div className="px-5 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-blue flex items-center justify-center flex-shrink-0">
            <Icon icon="lucide:link" width={18} height={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900">Asignar clientes a empresas</h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Selecciona una empresa y marca los usuarios cliente que tendrán acceso a sus datos.
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 p-3 overflow-hidden">

        {/* ── Left panel: empresa list ── */}
        <div className="flex-shrink-0 h-52 sm:h-60 lg:h-auto lg:w-64 flex flex-col bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b border-neutral-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Empresas</span>
              <button
                type="button"
                onClick={() => { setShowNewEmpresa((v) => !v); setNewEmpresaNombre(""); }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-brand-blue hover:bg-brand-blue/10 transition-colors"
                title="Nueva empresa"
              >
                <Icon icon="lucide:plus" width={13} height={13} />
                Nueva
              </button>
            </div>

            {/* Inline create form */}
            {showNewEmpresa && (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newEmpresaNombre}
                  onChange={(e) => setNewEmpresaNombre(e.target.value)}
                  placeholder="Nombre de la empresa"
                  className="flex-1 min-w-0 rounded-xl border border-neutral-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                  onKeyDown={(e) => e.key === "Enter" && void handleCreateEmpresa()}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => void handleCreateEmpresa()}
                  disabled={!newEmpresaNombre.trim() || creatingEmpresa}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-40 transition-colors"
                >
                  {creatingEmpresa ? "…" : "OK"}
                </button>
              </div>
            )}

            {/* Search empresas */}
            <div className="relative">
              <Icon icon="lucide:search" width={12} height={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchEmpresa}
                onChange={(e) => setSearchEmpresa(e.target.value)}
                placeholder="Buscar empresa…"
                className="w-full rounded-xl border border-neutral-200 pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              />
            </div>
          </div>

          {/* Empresa list */}
          <div className="flex-1 min-h-0 overflow-y-auto py-1.5 px-1.5">
            {filteredEmpresas.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-6">
                {searchEmpresa ? "Sin resultados." : "No hay empresas aún."}
              </p>
            ) : (
              filteredEmpresas.map((emp) => {
                const isSelected = selectedEmpresaId === emp.id;
                const count = countPerEmpresa[emp.id] ?? 0;
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => setSelectedEmpresaId(emp.id)}
                    className={`w-full text-left flex items-center justify-between gap-2 px-3 py-2 rounded-xl mb-0.5 transition-all duration-150 ${
                      isSelected
                        ? "bg-brand-blue text-white shadow-sm"
                        : "text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon
                        icon="lucide:building-2"
                        width={13}
                        height={13}
                        className={isSelected ? "text-white/80 shrink-0" : "text-neutral-400 shrink-0"}
                      />
                      <span className="text-xs font-medium truncate">{emp.nombre}</span>
                    </div>
                    {count > 0 && (
                      <span
                        className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isSelected ? "bg-white/20 text-white" : "bg-brand-blue/10 text-brand-blue"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right panel: user assignment ── */}
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">

          {!selectedEmpresaId ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center">
                <Icon icon="lucide:building-2" width={26} height={26} className="text-neutral-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-500">Selecciona una empresa</p>
                <p className="text-xs text-neutral-400 mt-1">
                  Elige una empresa de la lista para ver y gestionar sus clientes asignados.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Right header */}
              <div className="flex-shrink-0 px-4 py-3 border-b border-neutral-200 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                    <Icon icon="lucide:building-2" width={15} height={15} className="text-brand-blue" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-neutral-900">{selectedEmpresa?.nombre}</h2>
                    <p className="text-[11px] text-neutral-400">
                      {asignados.size} cliente{asignados.size !== 1 ? "s" : ""} asignado{asignados.size !== 1 ? "s" : ""}
                      {hasChanges && <span className="ml-1.5 text-amber-500 font-medium">· cambios sin guardar</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasChanges && (
                    <button
                      type="button"
                      onClick={() => { setAsignados(new Set(savedAsignados)); }}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors"
                    >
                      Descartar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleGuardar()}
                    disabled={saving || !hasChanges}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {saving ? (
                      <><Icon icon="eos-icons:loading" width={13} height={13} className="animate-spin" />Guardando…</>
                    ) : (
                      <><Icon icon="lucide:save" width={13} height={13} />Guardar</>
                    )}
                  </button>
                </div>
              </div>

              {/* Alerts */}
              {(error || success) && (
                <div className="flex-shrink-0 px-4 pt-2">
                  {error && (
                    <div className="px-3 py-2 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2" role="alert">
                      <Icon icon="lucide:alert-circle" width={13} height={13} className="shrink-0" />
                      {error}
                    </div>
                  )}
                </div>
              )}

              {/* Search + bulk actions */}
              <div className="flex-shrink-0 px-4 py-2.5 border-b border-neutral-100 flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[160px]">
                  <Icon icon="lucide:search" width={12} height={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={searchUsuario}
                    onChange={(e) => setSearchUsuario(e.target.value)}
                    placeholder="Buscar usuario…"
                    className="w-full rounded-xl border border-neutral-200 pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                  />
                  {searchUsuario && (
                    <button
                      type="button"
                      onClick={() => setSearchUsuario("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-neutral-500"
                    >
                      <Icon icon="lucide:x" width={11} height={11} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAsignados(new Set(filteredUsuarios.map((u) => u.id)))}
                    className="px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-brand-blue hover:bg-brand-blue/8 bg-brand-blue/5 transition-colors"
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setAsignados((prev) => {
                      const next = new Set(prev);
                      filteredUsuarios.forEach((u) => next.delete(u.id));
                      return next;
                    })}
                    className="px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-neutral-500 hover:bg-neutral-100 transition-colors"
                  >
                    Ninguno
                  </button>
                </div>
                <span className="text-[11px] text-neutral-400 ml-auto">
                  {asignadosCount} / {filteredUsuarios.length} asignados
                </span>
              </div>

              {/* User list */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-sm text-neutral-400">Cargando usuarios…</p>
                  </div>
                ) : usuariosCliente.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-center px-6">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center">
                      <Icon icon="lucide:users" width={22} height={22} className="text-neutral-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-500">Sin usuarios cliente</p>
                      <p className="text-xs text-neutral-400 mt-1">Crea usuarios con rol &quot;cliente&quot; en Configuración → Usuarios.</p>
                    </div>
                  </div>
                ) : sortedUsuarios.length === 0 ? (
                  <p className="text-xs text-neutral-400 text-center py-8">Sin resultados para &ldquo;{searchUsuario}&rdquo;.</p>
                ) : (
                  <div className="divide-y divide-neutral-100">
                    {/* Assigned section header */}
                    {asignadosCount > 0 && (
                      <div className="px-4 py-1.5 bg-green-50/60 sticky top-0 z-10">
                        <span className="text-[10px] font-semibold text-green-700 uppercase tracking-wide flex items-center gap-1">
                          <Icon icon="lucide:user-check" width={10} height={10} />
                          Asignados ({asignadosCount})
                        </span>
                      </div>
                    )}
                    {sortedUsuarios.filter((u) => asignados.has(u.id)).map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleToggleUsuario(u.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-green-50/50 transition-colors text-left group"
                      >
                        <div className="w-4 h-4 rounded flex items-center justify-center bg-brand-blue border border-brand-blue shrink-0">
                          <Icon icon="lucide:check" width={10} height={10} className="text-white" />
                        </div>
                        <Avatar name={u.nombre || u.email} assigned />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-neutral-800 truncate">{u.nombre || u.email}</p>
                          <p className="text-[10px] text-neutral-400 truncate">{u.email}</p>
                        </div>
                        <span className="shrink-0 text-[10px] text-red-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                          Quitar
                        </span>
                      </button>
                    ))}

                    {/* Available section header */}
                    {sortedUsuarios.filter((u) => !asignados.has(u.id)).length > 0 && (
                      <div className="px-4 py-1.5 bg-neutral-50 sticky top-0 z-10">
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide flex items-center gap-1">
                          <Icon icon="lucide:user-plus" width={10} height={10} />
                          Disponibles ({sortedUsuarios.filter((u) => !asignados.has(u.id)).length})
                        </span>
                      </div>
                    )}
                    {sortedUsuarios.filter((u) => !asignados.has(u.id)).map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleToggleUsuario(u.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-brand-blue/5 transition-colors text-left group"
                      >
                        <div className="w-4 h-4 rounded border-2 border-neutral-300 group-hover:border-brand-blue shrink-0 transition-colors" />
                        <Avatar name={u.nombre || u.email} assigned={false} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-neutral-700 truncate">{u.nombre || u.email}</p>
                          <p className="text-[10px] text-neutral-400 truncate">{u.email}</p>
                        </div>
                        <span className="shrink-0 text-[10px] text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                          Asignar
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
