"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { sileo } from "sileo";
import { createClient } from "@/lib/supabase/client";
import { withBase } from "@/lib/basePath";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useNeonTheme } from "@/lib/ui/neonTheme";

const NEW_EMPRESA_VALUE = "__new__";

type Empresa = { id: string; nombre: string };
type UsuarioCliente = { id: string; nombre: string; email: string };

const neonInput =
  "dash-control w-full px-3.5 py-2.5 border border-dash-border rounded-lg text-base text-dash-fg placeholder:text-dash-muted focus:outline-none focus:ring-2 focus:ring-dash-neon/40 focus:border-dash-neon/50";

function Avatar({ name, assigned }: { name: string; assigned: boolean }) {
  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold uppercase ${
        assigned
          ? "border border-emerald-400/35 bg-emerald-500/15 text-emerald-300"
          : "border border-dash-neon/35 bg-dash-neon/15 text-dash-neon"
      }`}
    >
      {name[0]}
    </div>
  );
}

export function AsignarClientesEmpresasContent() {
  const { isSuperadmin, isAdmin, profile, isLoading: authLoading } = useAuth();
  const { t } = useLocale();
  const tr = t.asignarClientes;
  const [theme] = useNeonTheme();
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
  const [savedAsignados, setSavedAsignados] = useState<Set<string>>(new Set());
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

  const clienteIdsSet = useMemo(() => new Set(usuariosCliente.map((u) => u.id)), [usuariosCliente]);

  const fetchAllCounts = useCallback(async () => {
    try {
      const res = await fetch(withBase("/api/config/usuarios-empresas"), { credentials: "include" });
      const json = (await res.json()) as {
        porEmpresa?: Record<string, { clienteIds?: string[] }>;
      };
      if (!res.ok) return;
      const counts: Record<string, number> = {};
      for (const [empId, bucket] of Object.entries(json.porEmpresa ?? {})) {
        counts[empId] = bucket.clienteIds?.length ?? 0;
      }
      setCountPerEmpresa(counts);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchAsignados = useCallback(async (empresaId: string) => {
    if (!empresaId) { setAsignados(new Set()); setSavedAsignados(new Set()); return; }
    try {
      const res = await fetch(withBase("/api/config/usuarios-empresas"), { credentials: "include" });
      const json = (await res.json()) as {
        porEmpresa?: Record<string, { clienteIds?: string[] }>;
        error?: string;
      };
      if (!res.ok) { setAsignados(new Set()); return; }
      const ids = new Set(json.porEmpresa?.[empresaId]?.clienteIds ?? []);
      setAsignados(ids);
      setSavedAsignados(new Set(ids));
    } catch {
      setAsignados(new Set());
    }
  }, []);

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
    if (!selectedEmpresaId) return;
    setError(null);
    setSaving(true);
    try {
      const clienteIds = Array.from(asignados).filter((id) => clienteIdsSet.has(id));
      const res = await fetch(withBase("/api/config/usuarios-empresas"), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId: selectedEmpresaId, clienteIds }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      setSavedAsignados(new Set(asignados));
      setCountPerEmpresa((prev) => ({ ...prev, [selectedEmpresaId]: asignados.size }));
      sileo.success({ title: tr.savedSuccess });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }, [selectedEmpresaId, asignados, clienteIdsSet, tr.savedSuccess]);

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

  if (authLoading) return wrapEarly(tr.loading, true);
  if (!profile) return wrapEarly(tr.loginRequired);
  if (!isSuperadmin && !isAdmin) return wrapEarly(tr.superadminOnly);

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
                <Icon icon="lucide:link" width={22} height={22} className="text-dash-neon" aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold tracking-tight text-dash-fg sm:text-xl">{tr.title}</h1>
                <p className="mt-0.5 line-clamp-1 text-xs text-dash-muted sm:text-sm">{tr.subtitle}</p>
              </div>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-dash-control px-3 py-1.5 text-xs font-semibold text-dash-fg">
                <Icon icon="lucide:building-2" width={13} height={13} className="text-dash-muted" />
                {empresas.length} {empresas.length !== 1 ? tr.empresas : tr.empresa}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-dash-control px-3 py-1.5 text-xs font-semibold text-dash-fg">
                <Icon icon="lucide:users" width={13} height={13} className="text-dash-muted" />
                {usuariosCliente.length} {usuariosCliente.length !== 1 ? tr.clientes : tr.cliente}
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 lg:flex-row">
          <div className="dash-card flex h-48 shrink-0 flex-col overflow-hidden rounded-xl sm:h-56 lg:h-auto lg:w-64">
            <div className="shrink-0 space-y-2 border-b border-dash-border px-3 pb-2 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold tracking-wide text-dash-neon">{tr.empresasSection}</span>
                <button
                  type="button"
                  onClick={() => { setShowNewEmpresa((v) => !v); setNewEmpresaNombre(""); }}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-dash-neon transition-colors hover:bg-dash-neon/15"
                  title={tr.newEmpresa}
                >
                  <Icon icon="lucide:plus" width={13} height={13} />
                  {tr.newEmpresaShort}
                </button>
              </div>

              {showNewEmpresa && (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newEmpresaNombre}
                    onChange={(e) => setNewEmpresaNombre(e.target.value)}
                    placeholder={tr.nombreEmpresaPlaceholder}
                    className={`${neonInput} min-w-0 flex-1`}
                    onKeyDown={(e) => e.key === "Enter" && void handleCreateEmpresa()}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => void handleCreateEmpresa()}
                    disabled={!newEmpresaNombre.trim() || creatingEmpresa}
                    className="dash-cta px-3 py-2 text-sm disabled:opacity-40"
                  >
                    {creatingEmpresa ? "…" : "OK"}
                  </button>
                </div>
              )}

              <div className="relative">
                <Icon icon="lucide:search" width={12} height={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dash-muted" />
                <input
                  type="text"
                  value={searchEmpresa}
                  onChange={(e) => setSearchEmpresa(e.target.value)}
                  placeholder={tr.buscarEmpresa}
                  className={`${neonInput} pl-7`}
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5">
              {filteredEmpresas.length === 0 ? (
                <p className="py-6 text-center text-xs text-dash-muted">
                  {searchEmpresa ? tr.sinResultados : tr.noEmpresas}
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
                      className={`mb-0.5 flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition-all duration-150 ${
                        isSelected
                          ? "bg-dash-neon/25 text-dash-fg ring-1 ring-inset ring-dash-neon/40"
                          : "text-dash-fg hover:bg-dash-neon/10"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Icon
                          icon="lucide:building-2"
                          width={13}
                          height={13}
                          className={isSelected ? "shrink-0 text-dash-neon" : "shrink-0 text-dash-muted"}
                        />
                        <span className="truncate text-xs font-medium">{emp.nombre}</span>
                      </div>
                      {count > 0 && (
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs font-bold ${
                            isSelected
                              ? "bg-dash-neon/30 text-dash-fg"
                              : "border border-dash-neon/35 bg-dash-neon/15 text-dash-neon"
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

          <div className="dash-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
            {!selectedEmpresaId ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dash-border bg-dash-control">
                  <Icon icon="lucide:building-2" width={26} height={26} className="text-dash-muted" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-dash-fg">{tr.selectEmpresa}</p>
                  <p className="mt-1 text-xs text-dash-muted">{tr.selectEmpresaHint}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-dash-border px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-dash-neon/40 bg-dash-neon/15">
                      <Icon icon="lucide:building-2" width={15} height={15} className="text-dash-neon" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-dash-fg">{selectedEmpresa?.nombre}</h2>
                      <p className="text-[11px] text-dash-muted">
                        {asignados.size} {asignados.size !== 1 ? tr.clientes : tr.cliente} {tr.asignados}
                        {hasChanges && <span className="ml-1.5 font-medium text-amber-300">{tr.cambiosSinGuardar}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasChanges && (
                      <button
                        type="button"
                        onClick={() => { setAsignados(new Set(savedAsignados)); }}
                        className="rounded-xl border border-dash-border bg-dash-control px-3 py-1.5 text-xs font-medium text-dash-fg transition-colors hover:bg-dash-neon/15"
                      >
                        {tr.descartar}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleGuardar()}
                      disabled={saving || !hasChanges}
                      className="dash-cta inline-flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {saving ? (
                        <><Icon icon="eos-icons:loading" width={13} height={13} className="animate-spin" />{tr.guardando}</>
                      ) : (
                        <><Icon icon="lucide:save" width={13} height={13} />{tr.guardar}</>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="shrink-0 px-4 pt-2">
                    <div className="flex items-center gap-2 rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2 text-xs text-red-300" role="alert">
                      <Icon icon="lucide:alert-circle" width={13} height={13} className="shrink-0" />
                      {error}
                    </div>
                  </div>
                )}

                <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-dash-border px-4 py-2.5">
                  <div className="relative min-w-[160px] flex-1">
                    <Icon icon="lucide:search" width={12} height={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-dash-muted" />
                    <input
                      type="text"
                      value={searchUsuario}
                      onChange={(e) => setSearchUsuario(e.target.value)}
                      placeholder={tr.buscarUsuario}
                      className={`${neonInput} pl-8`}
                    />
                    {searchUsuario && (
                      <button
                        type="button"
                        onClick={() => setSearchUsuario("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dash-muted hover:text-dash-fg"
                      >
                        <Icon icon="lucide:x" width={11} height={11} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAsignados(new Set(filteredUsuarios.map((u) => u.id)))}
                      className="rounded-xl border border-dash-neon/35 bg-dash-neon/10 px-2.5 py-1.5 text-[11px] font-medium text-dash-neon transition-colors hover:bg-dash-neon/20"
                    >
                      {tr.todos}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAsignados((prev) => {
                        const next = new Set(prev);
                        filteredUsuarios.forEach((u) => next.delete(u.id));
                        return next;
                      })}
                      className="rounded-xl border border-dash-border bg-dash-control px-2.5 py-1.5 text-[11px] font-medium text-dash-muted transition-colors hover:bg-dash-neon/15 hover:text-dash-fg"
                    >
                      {tr.ninguno}
                    </button>
                  </div>
                  <span className="ml-auto text-[11px] text-dash-muted">
                    {asignadosCount} / {filteredUsuarios.length} {tr.asignados}
                  </span>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="flex h-32 items-center justify-center">
                      <p className="text-sm text-dash-muted">{tr.cargandoUsuarios}</p>
                    </div>
                  ) : usuariosCliente.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dash-border bg-dash-control">
                        <Icon icon="lucide:users" width={22} height={22} className="text-dash-muted" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-dash-fg">{tr.sinUsuariosCliente}</p>
                        <p className="mt-1 text-xs text-dash-muted">{tr.sinUsuariosClienteHint}</p>
                      </div>
                    </div>
                  ) : sortedUsuarios.length === 0 ? (
                    <p className="py-8 text-center text-xs text-dash-muted">{tr.sinResultadosBusqueda}</p>
                  ) : (
                    <div className="divide-y divide-dash-border">
                      {asignadosCount > 0 && (
                        <div className="sticky top-0 z-10 bg-emerald-500/10 px-4 py-1.5">
                          <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
                            <Icon icon="lucide:user-check" width={10} height={10} />
                            {tr.asignadosSection} ({asignadosCount})
                          </span>
                        </div>
                      )}
                      {sortedUsuarios.filter((u) => asignados.has(u.id)).map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleToggleUsuario(u.id)}
                          className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-emerald-500/10"
                        >
                          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-dash-neon bg-dash-neon/30">
                            <Icon icon="lucide:check" width={10} height={10} className="text-dash-fg" />
                          </div>
                          <Avatar name={u.nombre || u.email} assigned />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-dash-fg">{u.nombre || u.email}</p>
                            <p className="truncate text-xs text-dash-muted">{u.email}</p>
                          </div>
                          <span className="shrink-0 text-xs font-medium text-red-400 opacity-0 transition-opacity group-hover:opacity-100">
                            {tr.quitar}
                          </span>
                        </button>
                      ))}

                      {sortedUsuarios.filter((u) => !asignados.has(u.id)).length > 0 && (
                        <div className="sticky top-0 z-10 bg-dash-control/80 px-4 py-1.5">
                          <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-dash-muted">
                            <Icon icon="lucide:user-plus" width={10} height={10} />
                            {tr.disponiblesSection} ({sortedUsuarios.filter((u) => !asignados.has(u.id)).length})
                          </span>
                        </div>
                      )}
                      {sortedUsuarios.filter((u) => !asignados.has(u.id)).map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleToggleUsuario(u.id)}
                          className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-dash-neon/10"
                        >
                          <div className="h-4 w-4 shrink-0 rounded border-2 border-dash-border transition-colors group-hover:border-dash-neon" />
                          <Avatar name={u.nombre || u.email} assigned={false} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-dash-fg">{u.nombre || u.email}</p>
                            <p className="truncate text-xs text-dash-muted">{u.email}</p>
                          </div>
                          <span className="shrink-0 text-xs font-medium text-dash-neon opacity-0 transition-opacity group-hover:opacity-100">
                            {tr.asignar}
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
    </div>
  );
}
