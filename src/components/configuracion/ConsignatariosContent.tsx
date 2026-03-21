"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { sileo } from "sileo";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";

type Cliente = { id: string; nombre_cliente: string };

type Consignatario = {
  id: string;
  nombre: string;
  cliente: string | null;
  destino: string | null;
  consignee_company: string | null;
  consignee_address: string | null;
  consignee_attn: string | null;
  consignee_uscc: string | null;
  consignee_mobile: string | null;
  consignee_email: string | null;
  consignee_zip: string | null;
  notify_company: string | null;
  notify_address: string | null;
  notify_attn: string | null;
  notify_uscc: string | null;
  notify_mobile: string | null;
  notify_email: string | null;
  notify_zip: string | null;
  activo: boolean;
  notas: string | null;
};

const emptyForm = (): Omit<Consignatario, "id"> => ({
  nombre: "",
  cliente: "",
  destino: "",
  consignee_company: "",
  consignee_address: "",
  consignee_attn: "",
  consignee_uscc: "",
  consignee_mobile: "",
  consignee_email: "",
  consignee_zip: "",
  notify_company: "",
  notify_address: "",
  notify_attn: "",
  notify_uscc: "",
  notify_mobile: "",
  notify_email: "",
  notify_zip: "",
  activo: true,
  notas: "",
});

export function ConsignatariosContent() {
  const { isSuperadmin, isAdmin } = useAuth();
  const { t } = useLocale();
  const tr = t.consignatarios;
  const canEdit = isSuperadmin || isAdmin;

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [consignatarios, setConsignatarios] = useState<Consignatario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedCliente, setSelectedCliente] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Consignatario, "id">>(emptyForm());
  const [activeTab, setActiveTab] = useState<"consignee" | "notify">("consignee");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nombre: string } | null>(null);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: cls }, { data: cons }] = await Promise.all([
      supabase.from("clientes").select("id, nombre_cliente").order("nombre_cliente"),
      supabase.from("consignatarios").select("*").order("nombre"),
    ]);
    setClientes(cls ?? []);
    setConsignatarios(cons ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = consignatarios.filter((c) => {
    if (!showInactive && !c.activo) return false;
    if (selectedCliente !== "all" && c.cliente !== selectedCliente) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.nombre.toLowerCase().includes(q) ||
        (c.destino ?? "").toLowerCase().includes(q) ||
        (c.consignee_company ?? "").toLowerCase().includes(q) ||
        (c.notify_company ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  function openCreate() {
    setForm(emptyForm());
    setEditId(null);
    setActiveTab("consignee");
    setModal("create");
    setError(null);
  }

  function openEdit(c: Consignatario) {
    const { id, ...rest } = c;
    setForm({ ...rest });
    setEditId(id);
    setActiveTab("consignee");
    setModal("edit");
    setError(null);
  }

  function closeModal() {
    setModal(null);
    setEditId(null);
  }

  const handleSave = async () => {
    if (!form.nombre.trim()) { setError(tr.errorNombre); return; }
    if (!form.cliente) { setError(tr.errorCliente); return; }
    setSaving(true);
    setError(null);

    const payload = {
      nombre: form.nombre.trim(),
      cliente: form.cliente || null,
      destino: form.destino || null,
      consignee_company: form.consignee_company || null,
      consignee_address: form.consignee_address || null,
      consignee_attn: form.consignee_attn || null,
      consignee_uscc: form.consignee_uscc || null,
      consignee_mobile: form.consignee_mobile || null,
      consignee_email: form.consignee_email || null,
      consignee_zip: form.consignee_zip || null,
      notify_company: form.notify_company || null,
      notify_address: form.notify_address || null,
      notify_attn: form.notify_attn || null,
      notify_uscc: form.notify_uscc || null,
      notify_mobile: form.notify_mobile || null,
      notify_email: form.notify_email || null,
      notify_zip: form.notify_zip || null,
      activo: form.activo,
      notas: form.notas || null,
      updated_at: new Date().toISOString(),
    };

    let err;
    if (modal === "edit" && editId) {
      ({ error: err } = await supabase.from("consignatarios").update(payload).eq("id", editId));
    } else {
      ({ error: err } = await supabase.from("consignatarios").insert(payload));
    }

    if (err) { setError(err.message); setSaving(false); return; }
    sileo.success({ title: modal === "edit" ? tr.savedUpdate : tr.savedCreate });
    setSaving(false);
    closeModal();
    fetchData();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { error: err } = await supabase.from("consignatarios").delete().eq("id", confirmDelete.id);
    if (err) { setError(err.message); } else { sileo.success({ title: tr.deleted }); fetchData(); }
    setConfirmDelete(null);
  };

  const handleToggleActivo = async (c: Consignatario) => {
    await supabase.from("consignatarios").update({ activo: !c.activo }).eq("id", c.id);
    fetchData();
  };

  const inp = (label: string, field: keyof typeof form, type: string = "text", multiline = false) => (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">{label}</label>
      {multiline ? (
        <textarea
          value={(form[field] as string) ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
          rows={3}
          className="px-3 py-2 border border-neutral-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue resize-none"
        />
      ) : (
        <input
          type={type}
          value={(form[field] as string) ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
          className="px-3 py-2 border border-neutral-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
        />
      )}
    </div>
  );

  return (
    <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto">

      {/* ── Hero header ── */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-blue/90 to-indigo-700 px-4 sm:px-6 py-5 sm:py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <Icon icon="lucide:contact" width={22} height={22} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-white leading-tight">{tr.title}</h1>
              <p className="text-xs text-white/60 mt-0.5 hidden sm:block">{tr.subtitle}</p>
              {!loading && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-white/90 border border-white/20">
                    <Icon icon="lucide:users" width={9} height={9} />
                    {filtered.length} {filtered.length !== 1 ? tr.resultados : tr.resultado}
                  </span>
                  {!showInactive && consignatarios.filter(c => !c.activo).length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-white/60 border border-white/15">
                      {consignatarios.filter(c => !c.activo).length} {tr.inactivosLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          {canEdit && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-white text-brand-blue text-xs sm:text-sm font-bold hover:bg-white/90 transition-colors shadow-sm shrink-0"
            >
              <Icon icon="lucide:plus" width={15} height={15} />
              <span className="hidden sm:inline">{tr.nuevo}</span>
              <span className="sm:hidden">{tr.nuevoShort}</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-3 sm:p-4 lg:p-6 max-w-6xl mx-auto space-y-3">

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <Icon icon="lucide:alert-circle" className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}><Icon icon="lucide:x" width={14} /></button>
          </div>
        )}

        {/* ── Filtros ── */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder={tr.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 border border-neutral-200 bg-neutral-50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedCliente}
              onChange={(e) => setSelectedCliente(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2.5 border border-neutral-200 bg-neutral-50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue min-w-0"
            >
              <option value="all">{tr.allClients}</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.nombre_cliente}>{c.nombre_cliente}</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition-colors shrink-0">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="w-3.5 h-3.5 accent-brand-blue" />
              <span className="hidden sm:inline">{tr.showInactive}</span>
              <span className="sm:hidden">{tr.showInactiveShort}</span>
            </label>
          </div>
        </div>

        {/* ── Lista ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 px-5 py-4 bg-white rounded-2xl border border-neutral-200 shadow-sm text-neutral-500 text-sm">
              <Icon icon="typcn:refresh" className="w-5 h-5 text-brand-blue animate-spin" />
              {tr.loading}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-neutral-200 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
              <Icon icon="lucide:contact" width={28} height={28} className="text-neutral-300" />
            </div>
            <p className="text-neutral-700 font-semibold text-sm">{tr.noConsignatarios}</p>
            <p className="text-neutral-400 text-xs mt-1 mb-5">
              {canEdit ? tr.createHint : tr.adminHint}
            </p>
            {canEdit && (
              <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-blue text-white text-sm font-bold hover:bg-brand-blue/90 transition-colors shadow-sm">
                <Icon icon="lucide:plus" width={15} />
                {tr.nuevo}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── Cards móvil ── */}
            <div className="md:hidden space-y-2">
              {filtered.map((c) => (
                <div key={c.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${!c.activo ? "opacity-60 border-neutral-200" : "border-neutral-200 hover:border-neutral-300"}`}>
                  <div className="h-1 bg-gradient-to-r from-brand-blue to-indigo-500" />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-neutral-900 truncate">{c.nombre}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {c.cliente && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue text-[10px] font-bold border border-brand-blue/15">
                              <Icon icon="lucide:building-2" width={9} height={9} />
                              {c.cliente}
                            </span>
                          )}
                          {c.destino && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-semibold border border-neutral-200">
                              <Icon icon="lucide:map-pin" width={9} height={9} />
                              {c.destino}
                            </span>
                          )}
                          {canEdit ? (
                            <button onClick={() => handleToggleActivo(c)} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${c.activo ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-neutral-100 text-neutral-500 border-neutral-200"}`}>
                              <Icon icon={c.activo ? "lucide:check" : "lucide:x"} width={9} />
                              {c.activo ? tr.activo : tr.inactivo}
                            </button>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${c.activo ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
                              {c.activo ? tr.activo : tr.inactivo}
                            </span>
                          )}
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => openEdit(c)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-brand-blue/10 text-brand-blue transition-colors border border-transparent hover:border-brand-blue/20">
                            <Icon icon="lucide:pencil" width={14} />
                          </button>
                          <button onClick={() => setConfirmDelete({ id: c.id, nombre: c.nombre })} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-colors border border-transparent hover:border-red-200">
                            <Icon icon="lucide:trash-2" width={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-neutral-100">
                      <div className="bg-neutral-50 rounded-xl p-2.5">
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Consignee</p>
                        <p className="text-xs text-neutral-800 font-semibold leading-snug line-clamp-1">{c.consignee_company || <span className="text-neutral-300 font-normal">—</span>}</p>
                        {c.consignee_attn && <p className="text-[10px] text-neutral-400 mt-0.5 truncate">{c.consignee_attn}</p>}
                      </div>
                      <div className="bg-neutral-50 rounded-xl p-2.5">
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Notify Party</p>
                        <p className="text-xs text-neutral-800 font-semibold leading-snug line-clamp-1">{c.notify_company || <span className="text-neutral-300 font-normal">—</span>}</p>
                        {c.notify_attn && <p className="text-[10px] text-neutral-400 mt-0.5 truncate">{c.notify_attn}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Tabla desktop ── */}
            <div className="hidden md:block bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-brand-blue to-indigo-500" />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50">
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">{tr.colNombre}</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">{tr.colCliente}</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">{tr.colDestino}</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider hidden lg:table-cell">Consignee</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider hidden xl:table-cell">Notify</th>
                      <th className="text-center px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">{tr.colEstado}</th>
                      {canEdit && <th className="px-4 py-3 w-20" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {filtered.map((c) => (
                      <tr key={c.id} className={`hover:bg-neutral-50 transition-colors ${!c.activo ? "opacity-50" : ""}`}>
                        <td className="px-4 py-3"><p className="font-semibold text-neutral-800 text-xs">{c.nombre}</p></td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue text-[10px] font-bold border border-brand-blue/15">
                            <Icon icon="lucide:building-2" width={9} height={9} />
                            {c.cliente || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-600">{c.destino || "—"}</td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <p className="text-xs text-neutral-700 font-medium">{c.consignee_company || "—"}</p>
                          {c.consignee_attn && <p className="text-[10px] text-neutral-400">{c.consignee_attn}</p>}
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <p className="text-xs text-neutral-700 font-medium">{c.notify_company || "—"}</p>
                          {c.notify_attn && <p className="text-[10px] text-neutral-400">{c.notify_attn}</p>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {canEdit ? (
                            <button onClick={() => handleToggleActivo(c)} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${c.activo ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-neutral-100 text-neutral-500 border-neutral-200 hover:bg-neutral-200"}`}>
                              <Icon icon={c.activo ? "lucide:check" : "lucide:x"} width={10} />{c.activo ? tr.activo : tr.inactivo}
                            </button>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${c.activo ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>{c.activo ? tr.activo : tr.inactivo}</span>
                          )}
                        </td>
                        {canEdit && (
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-brand-blue/10 text-brand-blue transition-colors" title="Editar"><Icon icon="lucide:pencil" width={13} /></button>
                              <button onClick={() => setConfirmDelete({ id: c.id, nombre: c.nombre })} className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-colors" title="Eliminar"><Icon icon="lucide:trash-2" width={13} /></button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 border-t border-neutral-100 bg-neutral-50/50">
                <span className="text-[10px] text-neutral-400 font-medium">{filtered.length} {filtered.length !== 1 ? tr.consignatarios_plural : tr.consignatario}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Modal crear/editar (bottom sheet en mobile) ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-[2px]" onClick={closeModal}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[95dvh] sm:max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="h-1.5 bg-gradient-to-r from-brand-blue to-indigo-500 shrink-0" />
            <div className="sm:hidden flex justify-center pt-3 pb-0 shrink-0"><div className="w-10 h-1 rounded-full bg-neutral-200" /></div>

            {/* Modal header */}
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                  <Icon icon={modal === "create" ? "lucide:user-plus" : "lucide:user-cog"} className="w-4 h-4 text-brand-blue" />
                </span>
                <div>
                  <h2 className="font-bold text-neutral-900 text-sm">{modal === "create" ? tr.createTitle : tr.editTitle}</h2>
                  {editId && <p className="text-[11px] text-neutral-400 mt-0.5 truncate max-w-[220px]">{form.nombre}</p>}
                </div>
              </div>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-100 text-neutral-400 transition-colors">
                <Icon icon="lucide:x" width={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
              {/* Datos generales */}
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                  <Icon icon="lucide:info" width={10} height={10} />
                  {tr.generalSection}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">{inp(tr.nombre, "nombre")}</div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">{tr.clienteLabel}</label>
                    <select
                      value={form.cliente ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, cliente: e.target.value }))}
                      className="px-3 py-2.5 border border-neutral-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                    >
                      <option value="">{tr.selectCliente}</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.nombre_cliente}>{c.nombre_cliente}</option>
                      ))}
                    </select>
                  </div>
                  {inp(tr.destino, "destino")}
                </div>
              </div>

              {/* Tabs consignee / notify */}
              <div className="rounded-2xl border border-neutral-200 overflow-hidden">
                {/* Pill toggle */}
                <div className="p-2 bg-neutral-50 border-b border-neutral-100 flex gap-1.5">
                  {(["consignee", "notify"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeTab === tab
                          ? "bg-brand-blue text-white shadow-sm"
                          : "text-neutral-500 hover:bg-neutral-100"
                      }`}
                    >
                      <Icon icon={tab === "consignee" ? "lucide:user-check" : "lucide:bell"} width={12} height={12} />
                      {tab === "consignee" ? tr.consigneeTab : tr.notifyTab}
                    </button>
                  ))}
                </div>

                {/* Copy banner */}
                {activeTab === "notify" && (
                  <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-3">
                    <p className="text-xs text-amber-700 leading-snug">{tr.notifyEquals}</p>
                    <button type="button"
                      onClick={() => setForm((f) => ({ ...f, notify_company: f.consignee_company, notify_address: f.consignee_address, notify_attn: f.consignee_attn, notify_uscc: f.consignee_uscc, notify_mobile: f.consignee_mobile, notify_email: f.consignee_email, notify_zip: f.consignee_zip }))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded-xl hover:bg-amber-200 transition-colors shrink-0"
                    >
                      <Icon icon="lucide:copy" width={11} /> {tr.copyBtn}
                    </button>
                  </div>
                )}
                {activeTab === "consignee" && (
                  <div className="px-4 py-2.5 bg-sky-50 border-b border-sky-100 flex items-center justify-between gap-3">
                    <p className="text-xs text-sky-700 leading-snug">{tr.consigneeEquals}</p>
                    <button type="button"
                      onClick={() => setForm((f) => ({ ...f, consignee_company: f.notify_company, consignee_address: f.notify_address, consignee_attn: f.notify_attn, consignee_uscc: f.notify_uscc, consignee_mobile: f.notify_mobile, consignee_email: f.notify_email, consignee_zip: f.notify_zip }))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-sky-700 bg-sky-100 border border-sky-200 rounded-xl hover:bg-sky-200 transition-colors shrink-0"
                    >
                      <Icon icon="lucide:copy" width={11} /> {tr.copyBtn}
                    </button>
                  </div>
                )}

                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeTab === "consignee" ? (
                    <>
                      <div className="sm:col-span-2">{inp(tr.consigneeCompany, "consignee_company")}</div>
                      <div className="sm:col-span-2">{inp(tr.address, "consignee_address", "text", true)}</div>
                      {inp(tr.attn, "consignee_attn")}
                      {inp(tr.uscc, "consignee_uscc")}
                      {inp(tr.mobile, "consignee_mobile")}
                      {inp(tr.email, "consignee_email", "email")}
                      {inp(tr.zip, "consignee_zip")}
                    </>
                  ) : (
                    <>
                      <div className="sm:col-span-2">{inp(tr.notifyCompany, "notify_company")}</div>
                      <div className="sm:col-span-2">{inp(tr.address, "notify_address", "text", true)}</div>
                      {inp(tr.attn, "notify_attn")}
                      {inp(tr.uscc, "notify_uscc")}
                      {inp(tr.mobile, "notify_mobile")}
                      {inp(tr.email, "notify_email", "email")}
                      {inp(tr.zip, "notify_zip")}
                    </>
                  )}
                </div>
              </div>

              {/* Notas + activo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                <div>{inp(tr.notas, "notas", "text", true)}</div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200 sm:mt-5">
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                    <div className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${form.activo ? "bg-emerald-500" : "bg-neutral-300"}`}
                      onClick={() => setForm((f) => ({ ...f, activo: !f.activo }))}>
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.activo ? "left-4" : "left-0.5"}`} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-neutral-700">{tr.consignatarioActivo}</p>
                      <p className="text-[10px] text-neutral-400">{form.activo ? tr.visibleDocs : tr.hiddenDocs}</p>
                    </div>
                  </label>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  <Icon icon="lucide:alert-circle" className="w-4 h-4 shrink-0" />{error}
                </div>
              )}
            </div>

            <div className="px-4 sm:px-6 py-4 border-t border-neutral-100 flex gap-2.5 shrink-0">
              <button onClick={closeModal} className="flex-1 sm:flex-none py-3 px-5 text-sm font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors">
                {tr.cancel}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 text-sm font-bold text-white bg-brand-blue rounded-xl hover:bg-brand-blue/90 transition-colors disabled:opacity-50"
              >
                {saving ? <><Icon icon="typcn:refresh" className="w-4 h-4 animate-spin" />{tr.guardando}</> : <><Icon icon="lucide:save" className="w-4 h-4" />{tr.guardar}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar eliminación ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-[2px]" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="h-1.5 bg-red-500" />
            <div className="sm:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-neutral-200" /></div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                  <Icon icon="lucide:trash-2" className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm">{tr.deleteTitle}</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">{tr.deleteWarning}</p>
                </div>
              </div>
              <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
                ¿Confirmas eliminar <span className="font-semibold text-neutral-900">"{confirmDelete.nombre}"</span>?
              </p>
              <div className="flex gap-2.5">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 text-sm font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors">{tr.cancel}</button>
                <button onClick={handleDelete} className="flex-1 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors">{tr.delete}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
