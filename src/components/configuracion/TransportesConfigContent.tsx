"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { sileo } from "sileo";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";

type Empresa = {
  id: string;
  nombre: string;
  rut: string | null;
};

type Chofer = {
  id: string;
  empresa_id: string;
  nombre: string;
  numero_chofer: string | null;
  rut: string | null;
  telefono: string | null;
  activo: boolean;
};

type Equipo = {
  id: string;
  empresa_id: string;
  patente_camion: string;
  patente_remolque: string | null;
  activo: boolean;
};

type Tramo = {
  id: string;
  origen: string;
  destino: string;
  valor: number;
  moneda: string;
  activo: boolean;
};

export function TransportesConfigContent() {
  const { isSuperadmin, profile, isLoading: authLoading } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>("");
  const [searchEmpresa, setSearchEmpresa] = useState("");
  const [creatingEmpresa, setCreatingEmpresa] = useState(false);
  const [newEmpresaNombre, setNewEmpresaNombre] = useState("");
  const [newEmpresaRut, setNewEmpresaRut] = useState("");

  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [tramos, setTramos] = useState<Tramo[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'empresa' | 'chofer' | 'equipo' | 'tramo'; id: string; name: string } | null>(null);

  const [newChofer, setNewChofer] = useState<{ nombre: string; numero_chofer: string; rut: string; telefono: string }>({
    nombre: "",
    numero_chofer: "",
    rut: "",
    telefono: "",
  });
  const [newEquipo, setNewEquipo] = useState<{ patente_camion: string; patente_remolque: string }>({
    patente_camion: "",
    patente_remolque: "",
  });
  const [newTramo, setNewTramo] = useState<{ origen: string; destino: string; valor: string; moneda: string }>({
    origen: "",
    destino: "",
    valor: "",
    moneda: "CLP",
  });

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
      .from("transportes_empresas")
      .select("id, nombre, rut")
      .order("nombre");
    if (err) {
      setError(err.message);
      return;
    }
    setEmpresas((data ?? []) as Empresa[]);
  }, [supabase]);

  const fetchEmpresaRelated = useCallback(
    async (empresaId: string) => {
      if (!supabase || !empresaId) {
        setChoferes([]);
        setEquipos([]);
        return;
      }
      const [choferesRes, equiposRes] = await Promise.all([
        supabase
          .from("transportes_choferes")
          .select("id, empresa_id, nombre, numero_chofer, rut, telefono, activo")
          .eq("empresa_id", empresaId)
          .order("nombre"),
        supabase
          .from("transportes_equipos")
          .select("id, empresa_id, patente_camion, patente_remolque, activo")
          .eq("empresa_id", empresaId)
          .order("patente_camion"),
      ]);
      if (!choferesRes.error) setChoferes((choferesRes.data ?? []) as Chofer[]);
      if (!equiposRes.error) setEquipos((equiposRes.data ?? []) as Equipo[]);
    },
    [supabase]
  );

  const fetchTramos = useCallback(async () => {
    if (!supabase) return;
    const { data, error: err } = await supabase
      .from("transportes_tramos")
      .select("id, origen, destino, valor, moneda, activo")
      .order("origen");
    if (err) {
      setError(err.message);
      return;
    }
    setTramos((data ?? []) as Tramo[]);
  }, [supabase]);

  useEffect(() => {
    void (async () => {
      await fetchEmpresas();
      await fetchTramos();
      setLoading(false);
    })();
  }, [fetchEmpresas, fetchTramos]);

  useEffect(() => {
    if (selectedEmpresaId) {
      void fetchEmpresaRelated(selectedEmpresaId);
    } else {
      setChoferes([]);
      setEquipos([]);
    }
  }, [selectedEmpresaId, fetchEmpresaRelated]);

  const handleCreateEmpresa = async () => {
    if (!supabase || !newEmpresaNombre.trim()) return;
    setError(null);
    setCreatingEmpresa(true);
    const { data, error: err } = await supabase
      .from("transportes_empresas")
      .insert({
        nombre: newEmpresaNombre.trim(),
        rut: newEmpresaRut.trim() || null,
      })
      .select("id, nombre, rut")
      .single();
    setCreatingEmpresa(false);
    if (err) {
      setError(err.message);
      return;
    }
    setEmpresas((prev) => [...prev, data as Empresa].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setNewEmpresaNombre("");
    setNewEmpresaRut("");
    setSelectedEmpresaId(data.id);
    sileo.success({ title: "Empresa creada." });
  };

  const handleAddChofer = async () => {
    if (!supabase || !selectedEmpresaId || !newChofer.nombre.trim()) return;
    setSaving(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("transportes_choferes")
      .insert({
        empresa_id: selectedEmpresaId,
        nombre: newChofer.nombre.trim(),
        numero_chofer: newChofer.numero_chofer.trim() || null,
        rut: newChofer.rut.trim() || null,
        telefono: newChofer.telefono.trim() || null,
        activo: true,
      })
      .select("id, empresa_id, nombre, numero_chofer, rut, telefono, activo")
      .single();
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setChoferes((prev) => [...prev, data as Chofer].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setNewChofer({ nombre: "", numero_chofer: "", rut: "", telefono: "" });
  };

  const handleToggleChoferActivo = async (id: string, current: boolean) => {
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("transportes_choferes")
      .update({ activo: !current })
      .eq("id", id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setChoferes((prev) => prev.map((c) => (c.id === id ? { ...c, activo: !current } : c)));
  };

  const handleAddEquipo = async () => {
    if (!supabase || !selectedEmpresaId || !newEquipo.patente_camion.trim()) return;
    setSaving(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("transportes_equipos")
      .insert({
        empresa_id: selectedEmpresaId,
        patente_camion: newEquipo.patente_camion.trim(),
        patente_remolque: newEquipo.patente_remolque.trim() || null,
        activo: true,
      })
      .select("id, empresa_id, patente_camion, patente_remolque, activo")
      .single();
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setEquipos((prev) => [...prev, data as Equipo].sort((a, b) => a.patente_camion.localeCompare(b.patente_camion)));
    setNewEquipo({ patente_camion: "", patente_remolque: "" });
  };

  const handleToggleEquipoActivo = async (id: string, current: boolean) => {
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("transportes_equipos")
      .update({ activo: !current })
      .eq("id", id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setEquipos((prev) => prev.map((e) => (e.id === id ? { ...e, activo: !current } : e)));
  };

  const handleAddTramo = async () => {
    if (!supabase || !newTramo.origen.trim() || !newTramo.destino.trim() || !newTramo.valor.trim()) return;
    setSaving(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("transportes_tramos")
      .insert({
        origen: newTramo.origen.trim(),
        destino: newTramo.destino.trim(),
        valor: parseFloat(newTramo.valor),
        moneda: newTramo.moneda.trim() || "CLP",
        activo: true,
      })
      .select("id, origen, destino, valor, moneda, activo")
      .single();
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setTramos((prev) =>
      [...prev, data as Tramo].sort((a, b) =>
        `${a.origen}-${a.destino}`.localeCompare(`${b.origen}-${b.destino}`)
      )
    );
    setNewTramo({ origen: "", destino: "", valor: "", moneda: newTramo.moneda || "CLP" });
  };

  const handleToggleTramoActivo = async (id: string, current: boolean) => {
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("transportes_tramos")
      .update({ activo: !current })
      .eq("id", id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setTramos((prev) => prev.map((t) => (t.id === id ? { ...t, activo: !current } : t)));
  };

  const handleDeleteEmpresa = async (id: string) => {
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("transportes_empresas")
      .delete()
      .eq("id", id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setEmpresas((prev) => prev.filter((e) => e.id !== id));
    if (selectedEmpresaId === id) {
      setSelectedEmpresaId("");
    }
    sileo.success({ title: "Empresa eliminada." });
  };

  const handleDeleteChofer = async (id: string) => {
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("transportes_choferes")
      .delete()
      .eq("id", id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setChoferes((prev) => prev.filter((c) => c.id !== id));
    sileo.success({ title: "Chofer eliminado." });
  };

  const handleDeleteEquipo = async (id: string) => {
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("transportes_equipos")
      .delete()
      .eq("id", id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setEquipos((prev) => prev.filter((e) => e.id !== id));
    sileo.success({ title: "Equipo eliminado." });
  };

  const handleDeleteTramo = async (id: string) => {
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("transportes_tramos")
      .delete()
      .eq("id", id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setTramos((prev) => prev.filter((t) => t.id !== id));
    sileo.success({ title: "Tramo eliminado." });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setConfirmDelete(null);
    
    switch (confirmDelete.type) {
      case 'empresa':
        await handleDeleteEmpresa(confirmDelete.id);
        break;
      case 'chofer':
        await handleDeleteChofer(confirmDelete.id);
        break;
      case 'equipo':
        await handleDeleteEquipo(confirmDelete.id);
        break;
      case 'tramo':
        await handleDeleteTramo(confirmDelete.id);
        break;
    }
  };

  const filteredEmpresas = useMemo(
    () => empresas.filter((e) => e.nombre.toLowerCase().includes(searchEmpresa.toLowerCase())),
    [empresas, searchEmpresa]
  );

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
      <main className="flex-1 min-h-0 bg-neutral-100 p-6 flex items-center justify-center" role="main">
        <p className="text-neutral-600">
          No tienes acceso a la configuración de transportes. Solo el superadmin puede gestionarla.
        </p>
      </main>
    );
  }

  const inputBase =
    "w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all";

  return (
    <main className="flex-1 min-h-0 flex flex-col bg-neutral-100 overflow-auto" role="main">

      {/* Hero gradient header */}
      <div className="flex-shrink-0 bg-gradient-to-br from-brand-blue via-brand-blue/90 to-sky-700 text-white">
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Icon icon="lucide:truck" width={22} height={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Configuración de transportes</h1>
              <p className="text-xs text-white/70 mt-0.5">Empresas, choferes, equipos y tramos</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
              <Icon icon="lucide:building-2" width={13} height={13} className="text-white/80" />
              <span className="text-xs font-semibold">{empresas.length} empresa{empresas.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
              <Icon icon="lucide:route" width={13} height={13} className="text-white/80" />
              <span className="text-xs font-semibold">{tramos.length} tramo{tramos.length !== 1 ? "s" : ""}</span>
            </div>
            {selectedEmpresaId && (
              <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-1.5">
                <Icon icon="lucide:user" width={13} height={13} className="text-white/80" />
                <span className="text-xs font-semibold">{choferes.length} chofer{choferes.length !== 1 ? "es" : ""}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 flex flex-col xl:flex-row gap-3 p-3">

        {/* Empresas panel */}
        <section className="flex-shrink-0 xl:w-64 xl:self-start xl:sticky xl:top-0 flex flex-col bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b border-neutral-100 space-y-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Empresas de transporte</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <input
                type="text"
                value={newEmpresaNombre}
                onChange={(e) => setNewEmpresaNombre(e.target.value)}
                placeholder="Nombre empresa"
                className={inputBase}
              />
              <input
                type="text"
                value={newEmpresaRut}
                onChange={(e) => setNewEmpresaRut(e.target.value)}
                placeholder="RUT (opcional)"
                className={inputBase}
              />
              <button
                type="button"
                onClick={() => void handleCreateEmpresa()}
                disabled={!newEmpresaNombre.trim() || creatingEmpresa}
                className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-white bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-40 transition-colors"
              >
                {creatingEmpresa ? (
                  <><Icon icon="eos-icons:loading" width={13} height={13} className="animate-spin" />Creando…</>
                ) : (
                  <><Icon icon="lucide:plus" width={13} height={13} />Agregar empresa</>
                )}
              </button>
            </div>
            <div className="relative">
              <Icon icon="lucide:search" width={12} height={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchEmpresa}
                onChange={(e) => setSearchEmpresa(e.target.value)}
                placeholder="Buscar…"
                className={`${inputBase} pl-7`}
              />
            </div>
          </div>

          {/* Mobile: horizontal chip scroller */}
          <div className="xl:hidden overflow-x-auto py-2 px-2 flex gap-1.5 border-b border-neutral-100">
            {filteredEmpresas.length === 0 ? (
              <p className="text-xs text-neutral-400 py-1 px-2">
                {searchEmpresa ? "Sin resultados." : "No hay empresas aún."}
              </p>
            ) : filteredEmpresas.map((emp) => {
              const isSelected = selectedEmpresaId === emp.id;
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => setSelectedEmpresaId(isSelected ? "" : emp.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isSelected ? "bg-brand-blue text-white shadow-sm" : "bg-neutral-100 text-neutral-700"
                  }`}
                >
                  <Icon icon="lucide:building-2" width={11} height={11} className={isSelected ? "text-white/80" : "text-neutral-400"} />
                  <span className="max-w-[120px] truncate">{emp.nombre}</span>
                  {isSelected && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: 'empresa', id: emp.id, name: emp.nombre }); }}
                      className="ml-1 text-white/60 hover:text-white"
                    >
                      <Icon icon="lucide:trash-2" width={10} height={10} />
                    </button>
                  )}
                </button>
              );
            })}
          </div>

          {/* Desktop: vertical list */}
          <div className="hidden xl:block max-h-[calc(100vh-340px)] overflow-y-auto py-1.5 px-1.5">
            {filteredEmpresas.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-6">
                {searchEmpresa ? "Sin resultados." : "No hay empresas aún."}
              </p>
            ) : filteredEmpresas.map((emp) => {
              const isSelected = selectedEmpresaId === emp.id;
              return (
                <div key={emp.id} className={`flex items-center gap-1 px-1 py-1 rounded-xl mb-0.5 transition-all duration-150 ${
                  isSelected ? "bg-brand-blue text-white shadow-sm" : "text-neutral-700 hover:bg-neutral-100"
                }`}>
                  <button
                    type="button"
                    onClick={() => setSelectedEmpresaId(emp.id)}
                    className="flex-1 text-left flex flex-col gap-0.5 px-2 py-1 min-w-0"
                  >
                    <span className="text-xs font-medium truncate">{emp.nombre}</span>
                    {emp.rut && (
                      <span className={`text-[10px] ${isSelected ? "text-white/80" : "text-neutral-400"}`}>{emp.rut}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete({ type: 'empresa', id: emp.id, name: emp.nombre })}
                    className={`shrink-0 p-1 rounded-lg transition-colors ${
                      isSelected ? "text-white/60 hover:bg-white/20" : "text-red-400 hover:bg-red-50"
                    }`}
                    title="Eliminar empresa"
                  >
                    <Icon icon="lucide:trash-2" width={12} height={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Detail: choferes + equipos + tramos */}
        <section className="flex-1 min-w-0 space-y-3">

          {/* Choferes y Equipos */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            {!selectedEmpresaId ? (
              <div className="flex flex-col items-center justify-center gap-3 text-center p-10">
                <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center">
                  <Icon icon="lucide:truck" width={26} height={26} className="text-neutral-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-500">Selecciona una empresa</p>
                  <p className="text-xs text-neutral-400 mt-1">Elige una empresa arriba para ver y gestionar sus choferes y equipos.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-brand-blue/10 flex items-center justify-center shrink-0">
                    <Icon icon="lucide:truck" width={15} height={15} className="text-brand-blue" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold text-neutral-900 truncate">
                      {empresas.find((e) => e.id === selectedEmpresaId)?.nombre}
                    </h2>
                    <p className="text-[11px] text-neutral-400">{choferes.length} chofer(es) · {equipos.length} equipo(s)</p>
                  </div>
                </div>

                {error && (
                  <div className="px-4 pt-2">
                    <div className="px-3 py-2 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2" role="alert">
                      <Icon icon="lucide:alert-circle" width={13} height={13} className="shrink-0" />
                      {error}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3">
                  {/* Choferes */}
                  <div className="rounded-2xl border border-neutral-200 overflow-hidden">
                    <div className="px-3 py-2.5 border-b border-neutral-100 flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                        <Icon icon="lucide:user" width={14} height={14} className="text-brand-blue" />
                      </span>
                      <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Choferes</span>
                      <span className="ml-auto text-[10px] font-semibold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">{choferes.length}</span>
                    </div>
                    <div className="p-3 border-b border-neutral-100 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <input type="text" value={newChofer.nombre} onChange={(e) => setNewChofer((p) => ({ ...p, nombre: e.target.value }))} placeholder="Nombre chofer" className={inputBase} />
                      <input type="text" value={newChofer.numero_chofer} onChange={(e) => setNewChofer((p) => ({ ...p, numero_chofer: e.target.value }))} placeholder="Código / número" className={inputBase} />
                      <input type="text" value={newChofer.rut} onChange={(e) => setNewChofer((p) => ({ ...p, rut: e.target.value }))} placeholder="RUT" className={inputBase} />
                      <input type="text" value={newChofer.telefono} onChange={(e) => setNewChofer((p) => ({ ...p, telefono: e.target.value }))} placeholder="Teléfono" className={inputBase} />
                      <button type="button" onClick={() => void handleAddChofer()} disabled={!newChofer.nombre.trim() || saving}
                        className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-white bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-40 transition-colors">
                        <Icon icon="lucide:plus" width={13} height={13} />Agregar chofer
                      </button>
                    </div>
                    <div className="divide-y divide-neutral-100">
                      {choferes.length === 0 ? (
                        <p className="text-[11px] text-neutral-400 text-center py-6">No hay choferes para esta empresa.</p>
                      ) : choferes.map((c) => (
                        <div key={c.id} className="px-3 py-2.5 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-bold flex items-center justify-center uppercase shrink-0">
                            {c.nombre[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-neutral-800 truncate">{c.nombre}</p>
                            <p className="text-[10px] text-neutral-400 truncate">{c.rut || "Sin RUT"} · {c.telefono || "Sin teléfono"}</p>
                          </div>
                          <div className="shrink-0 flex items-center gap-1">
                            <button type="button" onClick={() => void handleToggleChoferActivo(c.id, c.activo)}
                              className={`px-2 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                                c.activo ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-neutral-50 text-neutral-500 border-neutral-200"
                              }`}>
                              {c.activo ? "Activo" : "Inactivo"}
                            </button>
                            <button type="button" onClick={() => setConfirmDelete({ type: 'chofer', id: c.id, name: c.nombre })}
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                              <Icon icon="lucide:trash-2" width={12} height={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Equipos */}
                  <div className="rounded-2xl border border-neutral-200 overflow-hidden">
                    <div className="px-3 py-2.5 border-b border-neutral-100 flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center">
                        <Icon icon="lucide:truck" width={14} height={14} className="text-sky-600" />
                      </span>
                      <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Equipos</span>
                      <span className="ml-auto text-[10px] font-semibold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">{equipos.length}</span>
                    </div>
                    <div className="p-3 border-b border-neutral-100 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <input type="text" value={newEquipo.patente_camion} onChange={(e) => setNewEquipo((p) => ({ ...p, patente_camion: e.target.value }))} placeholder="Patente camión" className={inputBase} />
                      <input type="text" value={newEquipo.patente_remolque} onChange={(e) => setNewEquipo((p) => ({ ...p, patente_remolque: e.target.value }))} placeholder="Remolque (opcional)" className={inputBase} />
                      <button type="button" onClick={() => void handleAddEquipo()} disabled={!newEquipo.patente_camion.trim() || saving}
                        className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-white bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-40 transition-colors">
                        <Icon icon="lucide:plus" width={13} height={13} />Agregar equipo
                      </button>
                    </div>
                    <div className="divide-y divide-neutral-100">
                      {equipos.length === 0 ? (
                        <p className="text-[11px] text-neutral-400 text-center py-6">No hay equipos para esta empresa.</p>
                      ) : equipos.map((e) => (
                        <div key={e.id} className="px-3 py-2.5 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
                            <Icon icon="lucide:truck" width={14} height={14} className="text-sky-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-neutral-800 truncate">{e.patente_camion}</p>
                            <p className="text-[10px] text-neutral-400 truncate">{e.patente_remolque ? `Remolque: ${e.patente_remolque}` : "Sin remolque"}</p>
                          </div>
                          <div className="shrink-0 flex items-center gap-1">
                            <button type="button" onClick={() => void handleToggleEquipoActivo(e.id, e.activo)}
                              className={`px-2 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                                e.activo ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-neutral-50 text-neutral-500 border-neutral-200"
                              }`}>
                              {e.activo ? "Activo" : "Inactivo"}
                            </button>
                            <button type="button" onClick={() => setConfirmDelete({ type: 'equipo', id: e.id, name: e.patente_camion })}
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                              <Icon icon="lucide:trash-2" width={12} height={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Tramos */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-brand-blue/10 flex items-center justify-center shrink-0">
                <Icon icon="lucide:route" width={15} height={15} className="text-brand-blue" />
              </span>
              <div>
                <h2 className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">Tramos y valores</h2>
                <p className="text-[11px] text-neutral-400">Tramos punto a punto para formularios de transporte.</p>
              </div>
              <span className="ml-auto text-[10px] font-semibold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">{tramos.length}</span>
            </div>

            {/* Add form */}
            <div className="p-3 border-b border-neutral-100 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <input type="text" value={newTramo.origen} onChange={(e) => setNewTramo((p) => ({ ...p, origen: e.target.value }))} placeholder="Origen" className={inputBase} />
              <input type="text" value={newTramo.destino} onChange={(e) => setNewTramo((p) => ({ ...p, destino: e.target.value }))} placeholder="Destino" className={inputBase} />
              <input type="number" value={newTramo.valor} onChange={(e) => setNewTramo((p) => ({ ...p, valor: e.target.value }))} placeholder="Valor" className={inputBase} />
              <input type="text" value={newTramo.moneda} onChange={(e) => setNewTramo((p) => ({ ...p, moneda: e.target.value }))} placeholder="Moneda" className={inputBase} />
              <button type="button" onClick={() => void handleAddTramo()} disabled={!newTramo.origen.trim() || !newTramo.destino.trim() || !newTramo.valor.trim() || saving}
                className="col-span-2 sm:col-span-4 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-white bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-40 transition-colors">
                <Icon icon="lucide:plus" width={13} height={13} />Agregar tramo
              </button>
            </div>

            {tramos.length === 0 ? (
              <p className="text-[11px] text-neutral-400 text-center py-6">No hay tramos configurados aún.</p>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-neutral-100">
                  {tramos.map((t) => (
                    <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
                          <span className="truncate">{t.origen}</span>
                          <Icon icon="lucide:arrow-right" width={11} height={11} className="shrink-0 text-neutral-400" />
                          <span className="truncate">{t.destino}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-brand-blue">
                            {t.moneda} {t.valor.toLocaleString("es-CL", { maximumFractionDigits: 0 })}
                          </span>
                          <button type="button" onClick={() => void handleToggleTramoActivo(t.id, t.activo)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${
                              t.activo ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-neutral-50 text-neutral-500 border-neutral-200"
                            }`}>
                            {t.activo ? "Activo" : "Inactivo"}
                          </button>
                        </div>
                      </div>
                      <button type="button" onClick={() => setConfirmDelete({ type: 'tramo', id: t.id, name: `${t.origen} → ${t.destino}` })}
                        className="shrink-0 p-2 rounded-xl text-red-400 hover:bg-red-50 transition-colors">
                        <Icon icon="lucide:trash-2" width={14} height={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-neutral-50 text-[11px] text-neutral-500 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">Origen</th>
                        <th className="text-left px-3 py-2 font-semibold">Destino</th>
                        <th className="text-right px-3 py-2 font-semibold">Valor</th>
                        <th className="text-left px-3 py-2 font-semibold">Moneda</th>
                        <th className="text-center px-3 py-2 font-semibold">Estado</th>
                        <th className="text-center px-3 py-2 font-semibold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {tramos.map((t) => (
                        <tr key={t.id} className="hover:bg-neutral-50">
                          <td className="px-3 py-2">{t.origen}</td>
                          <td className="px-3 py-2">{t.destino}</td>
                          <td className="px-3 py-2 text-right font-semibold">{t.valor.toLocaleString("es-CL", { maximumFractionDigits: 0 })}</td>
                          <td className="px-3 py-2">{t.moneda}</td>
                          <td className="px-3 py-2 text-center">
                            <button type="button" onClick={() => void handleToggleTramoActivo(t.id, t.activo)}
                              className={`px-2 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                                t.activo ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-neutral-50 text-neutral-500 border-neutral-200"
                              }`}>
                              {t.activo ? "Activo" : "Inactivo"}
                            </button>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button type="button" onClick={() => setConfirmDelete({ type: 'tramo', id: t.id, name: `${t.origen} → ${t.destino}` })}
                              className="p-1 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                              <Icon icon="lucide:trash-2" width={12} height={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {/* Delete confirmation — bottom sheet on mobile */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-3xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-neutral-200" />
            </div>
            <div className="px-6 pt-4 pb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <Icon icon="lucide:trash-2" width={18} height={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900">Confirmar eliminación</h3>
                  <p className="text-xs text-neutral-500">Esta acción no se puede deshacer</p>
                </div>
              </div>
              <p className="text-sm text-neutral-700 mb-1">
                ¿Eliminar <span className="font-semibold">{confirmDelete.name}</span>?
              </p>
              {confirmDelete.type === 'empresa' && (
                <p className="text-xs text-red-600 mt-1 mb-4">
                  Se eliminarán también todos sus choferes y equipos.
                </p>
              )}
              <div className="flex gap-3 mt-5">
                <button type="button" onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors">
                  Cancelar
                </button>
                <button type="button" onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

