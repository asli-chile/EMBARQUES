"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { sileo } from "sileo";
import { useAuth } from "@/lib/auth/AuthContext";
import { withBase } from "@/lib/basePath";
import { useLocale } from "@/lib/i18n/LocaleContext";
import {
  modulePageBg,
  moduleHero,
  moduleInput,
  moduleBtnPrimary,
  moduleCard,
  moduleSectionTitle,
} from "@/lib/ui/moduleStyles";

type Empresa = { id: string; nombre: string };
type Ejecutivo = { id: string; nombre: string; email: string };

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

export function AsignarEjecutivosContent() {
  const { isSuperadmin, isAdmin, profile, isLoading: authLoading } = useAuth();
  const { t } = useLocale();
  const tr = t.asignarEjecutivos;
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [ejecutivos, setEjecutivos] = useState<Ejecutivo[]>([]);
  const [porEmpresa, setPorEmpresa] = useState<Record<string, string[]>>({});
  const [asignados, setAsignados] = useState<Set<string>>(new Set());
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>("");
  const [searchEmpresa, setSearchEmpresa] = useState("");
  const [searchUsuario, setSearchUsuario] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAsignados, setSavedAsignados] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(withBase("/api/config/usuarios-empresas"), { credentials: "include" });
      const json = (await res.json()) as {
        empresas?: Empresa[];
        ejecutivos?: Ejecutivo[];
        porEmpresa?: Record<string, { ejecutivoIds: string[]; clienteIds: string[] }>;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      setEmpresas(json.empresas ?? []);
      setEjecutivos(json.ejecutivos ?? []);
      const map: Record<string, string[]> = {};
      for (const [empId, bucket] of Object.entries(json.porEmpresa ?? {})) {
        map[empId] = bucket.ejecutivoIds ?? [];
      }
      setPorEmpresa(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
      setEmpresas([]);
      setEjecutivos([]);
      setPorEmpresa({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedEmpresaId) {
      setAsignados(new Set());
      setSavedAsignados(new Set());
      return;
    }
    const ids = new Set(porEmpresa[selectedEmpresaId] ?? []);
    setAsignados(ids);
    setSavedAsignados(new Set(ids));
    setSearchUsuario("");
  }, [selectedEmpresaId, porEmpresa]);

  const handleToggleUsuario = useCallback((usuarioId: string) => {
    setAsignados((prev) => {
      const next = new Set(prev);
      if (next.has(usuarioId)) next.delete(usuarioId);
      else next.add(usuarioId);
      return next;
    });
  }, []);

  const handleGuardar = useCallback(async () => {
    if (!selectedEmpresaId) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(withBase("/api/config/usuarios-empresas"), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId: selectedEmpresaId,
          ejecutivoIds: Array.from(asignados),
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      setSavedAsignados(new Set(asignados));
      setPorEmpresa((prev) => ({ ...prev, [selectedEmpresaId]: Array.from(asignados) }));
      sileo.success({ title: tr.savedSuccess });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }, [selectedEmpresaId, asignados, tr.savedSuccess]);

  const hasChanges = useMemo(() => {
    if (asignados.size !== savedAsignados.size) return true;
    for (const id of asignados) {
      if (!savedAsignados.has(id)) return true;
    }
    return false;
  }, [asignados, savedAsignados]);

  const filteredEmpresas = useMemo(
    () => empresas.filter((e) => e.nombre.toLowerCase().includes(searchEmpresa.toLowerCase())),
    [empresas, searchEmpresa]
  );

  const filteredUsuarios = useMemo(() => {
    const q = searchUsuario.toLowerCase();
    return ejecutivos.filter(
      (u) => u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [ejecutivos, searchUsuario]);

  const sortedUsuarios = useMemo(
    () =>
      [...filteredUsuarios].sort((a, b) => {
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
      <main className={`flex-1 min-h-0 ${modulePageBg} flex items-center justify-center`} role="main">
        <p className="text-neutral-500">{tr.loading}</p>
      </main>
    );
  }
  if (!profile) {
    return (
      <main className={`flex-1 min-h-0 ${modulePageBg} p-6`} role="main">
        <p className="text-neutral-600">{tr.loginRequired}</p>
      </main>
    );
  }
  if (!isSuperadmin && !isAdmin) {
    return (
      <main className={`flex-1 min-h-0 ${modulePageBg} p-6`} role="main">
        <p className="text-neutral-600">{tr.superadminOnly}</p>
      </main>
    );
  }

  return (
    <main className={`flex-1 min-h-0 flex flex-col ${modulePageBg} overflow-hidden`} role="main">
      <div className={`flex-shrink-0 ${moduleHero}`}>
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-white/15 border border-white/25 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Icon icon="lucide:user-cog" width={24} height={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight tracking-tight">{tr.title}</h1>
              <p className="text-base text-white/75 mt-1">{tr.subtitle}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
              <Icon icon="lucide:building-2" width={13} height={13} className="text-white/80" />
              <span className="text-sm font-semibold">
                {empresas.length} {empresas.length !== 1 ? tr.empresas : tr.empresa}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
              <Icon icon="lucide:briefcase" width={13} height={13} className="text-white/80" />
              <span className="text-sm font-semibold">
                {ejecutivos.length} {ejecutivos.length !== 1 ? tr.ejecutivos : tr.ejecutivo}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 p-3 overflow-hidden">
        <div className={`flex-shrink-0 h-48 sm:h-56 lg:h-auto lg:w-64 flex flex-col ${moduleCard}`}>
          <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b border-brand-blue/15 space-y-2">
            <span className={moduleSectionTitle}>{tr.empresasSection}</span>
            <div className="relative">
              <Icon
                icon="lucide:search"
                width={12}
                height={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="text"
                value={searchEmpresa}
                onChange={(e) => setSearchEmpresa(e.target.value)}
                placeholder={tr.buscarEmpresa}
                className={`${moduleInput} pl-7`}
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto py-1.5 px-1.5">
            {filteredEmpresas.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-6">
                {searchEmpresa ? tr.sinResultados : tr.noEmpresas}
              </p>
            ) : (
              filteredEmpresas.map((emp) => {
                const isSelected = selectedEmpresaId === emp.id;
                const count = (porEmpresa[emp.id] ?? []).length;
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
                        className={`shrink-0 text-sm font-bold px-1.5 py-0.5 rounded-full ${
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

        <div className={`flex-1 min-h-0 flex flex-col ${moduleCard}`}>
          {!selectedEmpresaId ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center">
                <Icon icon="lucide:building-2" width={26} height={26} className="text-neutral-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-500">{tr.selectEmpresa}</p>
                <p className="text-xs text-neutral-400 mt-1">{tr.selectEmpresaHint}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-shrink-0 px-4 py-3 border-b border-neutral-200 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                    <Icon icon="lucide:building-2" width={15} height={15} className="text-brand-blue" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-neutral-900">{selectedEmpresa?.nombre}</h2>
                    <p className="text-[11px] text-neutral-400">
                      {asignados.size} {asignados.size !== 1 ? tr.ejecutivos : tr.ejecutivo} {tr.asignados}
                      {hasChanges && (
                        <span className="ml-1.5 text-amber-500 font-medium">{tr.cambiosSinGuardar}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasChanges && (
                    <button
                      type="button"
                      onClick={() => {
                        setAsignados(new Set(savedAsignados));
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors"
                    >
                      {tr.descartar}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleGuardar()}
                    disabled={saving || !hasChanges}
                    className={`${moduleBtnPrimary} disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {saving ? (
                      <>
                        <Icon icon="eos-icons:loading" width={13} height={13} className="animate-spin" />
                        {tr.guardando}
                      </>
                    ) : (
                      <>
                        <Icon icon="lucide:save" width={13} height={13} />
                        {tr.guardar}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex-shrink-0 px-4 pt-2">
                  <div
                    className="px-3 py-2 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2"
                    role="alert"
                  >
                    <Icon icon="lucide:alert-circle" width={13} height={13} className="shrink-0" />
                    {error}
                  </div>
                </div>
              )}

              <div className="flex-shrink-0 px-4 py-2.5 border-b border-neutral-100 flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[160px]">
                  <Icon
                    icon="lucide:search"
                    width={12}
                    height={12}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    type="text"
                    value={searchUsuario}
                    onChange={(e) => setSearchUsuario(e.target.value)}
                    placeholder={tr.buscarUsuario}
                    className={`${moduleInput} pl-8`}
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
                    {tr.todos}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAsignados((prev) => {
                        const next = new Set(prev);
                        filteredUsuarios.forEach((u) => next.delete(u.id));
                        return next;
                      })
                    }
                    className="px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-neutral-500 hover:bg-neutral-100 transition-colors"
                  >
                    {tr.ninguno}
                  </button>
                </div>
                <span className="text-[11px] text-neutral-400 ml-auto">
                  {asignadosCount} / {filteredUsuarios.length} {tr.asignados}
                </span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-sm text-neutral-400">{tr.cargandoUsuarios}</p>
                  </div>
                ) : ejecutivos.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-center px-6">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center">
                      <Icon icon="lucide:briefcase" width={22} height={22} className="text-neutral-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-500">{tr.sinEjecutivos}</p>
                      <p className="text-xs text-neutral-400 mt-1">{tr.sinEjecutivosHint}</p>
                    </div>
                  </div>
                ) : sortedUsuarios.length === 0 ? (
                  <p className="text-xs text-neutral-400 text-center py-8">{tr.sinResultadosBusqueda}</p>
                ) : (
                  <div className="divide-y divide-neutral-100">
                    {asignadosCount > 0 && (
                      <div className="px-4 py-1.5 bg-green-50/60 sticky top-0 z-10">
                        <span className="text-sm font-semibold text-green-700 uppercase tracking-wide flex items-center gap-1">
                          <Icon icon="lucide:user-check" width={10} height={10} />
                          {tr.asignadosSection} ({asignadosCount})
                        </span>
                      </div>
                    )}
                    {sortedUsuarios
                      .filter((u) => asignados.has(u.id))
                      .map((u) => (
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
                            <p className="text-xs font-semibold text-neutral-800 truncate">
                              {u.nombre || u.email}
                            </p>
                            <p className="text-sm text-neutral-400 truncate">{u.email}</p>
                          </div>
                          <span className="shrink-0 text-sm text-red-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                            {tr.quitar}
                          </span>
                        </button>
                      ))}

                    {sortedUsuarios.filter((u) => !asignados.has(u.id)).length > 0 && (
                      <div className="px-4 py-1.5 bg-neutral-50 sticky top-0 z-10">
                        <span className="text-sm font-semibold text-neutral-400 uppercase tracking-wide flex items-center gap-1">
                          <Icon icon="lucide:user-plus" width={10} height={10} />
                          {tr.disponiblesSection} (
                          {sortedUsuarios.filter((u) => !asignados.has(u.id)).length})
                        </span>
                      </div>
                    )}
                    {sortedUsuarios
                      .filter((u) => !asignados.has(u.id))
                      .map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleToggleUsuario(u.id)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-brand-blue/5 transition-colors text-left group"
                        >
                          <div className="w-4 h-4 rounded border-2 border-neutral-300 group-hover:border-brand-blue shrink-0 transition-colors" />
                          <Avatar name={u.nombre || u.email} assigned={false} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-neutral-700 truncate">
                              {u.nombre || u.email}
                            </p>
                            <p className="text-sm text-neutral-400 truncate">{u.email}</p>
                          </div>
                          <span className="shrink-0 text-sm text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity font-medium">
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
  );
}
