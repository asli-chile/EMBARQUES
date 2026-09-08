"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { sileo } from "sileo";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useNeonTheme } from "@/lib/ui/neonTheme";
import { FormSelect } from "@/components/ui/FormSelect";

type Cliente = { id: string; nombre: string };

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

const neonInput =
  "dash-control w-full px-3.5 py-2.5 border border-dash-border rounded-lg text-base text-dash-fg placeholder:text-dash-muted focus:outline-none focus:ring-2 focus:ring-dash-neon/40 focus:border-dash-neon/50";
const neonLabel = "block text-sm font-semibold text-dash-muted mb-1.5";

export function ConsignatariosContent() {
  const { isSuperadmin, isAdmin } = useAuth();
  const { t } = useLocale();
  const tr = t.consignatarios;
  const canEdit = isSuperadmin || isAdmin;
  const [theme] = useNeonTheme();

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
    const [{ data: emp }, { data: cons }] = await Promise.all([
      supabase.from("empresas").select("id, nombre").order("nombre"),
      supabase.from("consignatarios").select("*").order("nombre"),
    ]);
    setClientes((emp ?? []).map((e) => ({ id: e.id as string, nombre: e.nombre as string })));
    setConsignatarios(cons ?? []);
    setLoading(false);
  }, [supabase]);

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
      <label className={neonLabel}>{label}</label>
      {multiline ? (
        <textarea
          value={(form[field] as string) ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
          rows={3}
          className={`${neonInput} resize-none`}
        />
      ) : (
        <input
          type={type}
          value={(form[field] as string) ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
          className={neonInput}
        />
      )}
    </div>
  );

  return (
    <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
      <main className="dash-page relative flex min-h-0 flex-1 flex-col overflow-y-auto" role="main">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -right-16 top-10 h-72 w-72 rounded-full bg-dash-neon/20 blur-3xl" />
          <div className="absolute bottom-20 left-1/4 h-64 w-64 rounded-full bg-dash-neon-hot/15 blur-3xl" />
        </div>

        <div className="dash-toolbar relative z-10 shrink-0">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dash-neon/40 bg-dash-neon/15 shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--dash-neon)_55%,transparent)]">
                <Icon icon="lucide:contact" width={22} height={22} className="text-dash-neon" aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold tracking-tight text-dash-fg sm:text-xl">{tr.title}</h1>
                <p className="mt-0.5 line-clamp-1 text-xs text-dash-muted sm:text-sm">{tr.subtitle}</p>
                {!loading && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-dash-neon/35 bg-dash-neon/15 px-2 py-0.5 text-xs font-semibold text-dash-fg">
                      <Icon icon="lucide:users" width={12} height={12} />
                      {filtered.length} {filtered.length !== 1 ? tr.resultados : tr.resultado}
                    </span>
                    {!showInactive && consignatarios.filter((c) => !c.activo).length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-dash-border bg-dash-control px-2 py-0.5 text-xs font-semibold text-dash-muted">
                        {consignatarios.filter((c) => !c.activo).length} {tr.inactivosLabel}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {canEdit && (
              <div className="ml-auto">
                <button type="button" onClick={openCreate} className="dash-cta inline-flex items-center gap-1.5 px-4 py-2 text-sm">
                  <Icon icon="lucide:plus" width={15} height={15} />
                  <span className="hidden sm:inline">{tr.nuevo}</span>
                  <span className="sm:hidden">{tr.nuevoShort}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="relative z-10 flex-1 space-y-3 p-3 sm:p-4">
          {error && !modal && (
            <div className="flex items-center gap-3 rounded-xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <Icon icon="lucide:alert-circle" className="h-4 w-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <button type="button" onClick={() => setError(null)}><Icon icon="lucide:x" width={14} /></button>
            </div>
          )}

          <div className="dash-card flex flex-col gap-2 rounded-xl p-3 sm:flex-row">
            <div className="relative flex-1">
              <Icon icon="lucide:search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dash-muted" />
              <input
                type="text"
                placeholder={tr.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${neonInput} pl-9`}
              />
            </div>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1 sm:w-52 sm:flex-none">
                <FormSelect
                  variant="neon"
                  value={selectedCliente === "all" ? "" : selectedCliente}
                  placeholder={tr.allClients}
                  options={clientes.map((c) => ({ value: c.nombre, label: c.nombre }))}
                  onChange={(v) => setSelectedCliente(v || "all")}
                />
              </div>
              <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-dash-border bg-dash-control px-3 py-2 text-sm font-semibold text-dash-fg transition-colors hover:bg-dash-neon/15">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[var(--dash-neon)]"
                />
                <span className="hidden sm:inline">{tr.showInactive}</span>
                <span className="sm:hidden">{tr.showInactiveShort}</span>
              </label>
            </div>
          </div>

          {loading ? (
            <div className="dash-card flex items-center justify-center gap-3 rounded-xl px-5 py-16 text-sm text-dash-muted">
              <Icon icon="typcn:refresh" className="h-5 w-5 animate-spin text-dash-neon" />
              {tr.loading}
            </div>
          ) : filtered.length === 0 ? (
            <div className="dash-card flex flex-col items-center gap-3 rounded-xl px-4 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dash-border bg-dash-control">
                <Icon icon="lucide:contact" width={26} height={26} className="text-dash-muted" />
              </div>
              <div>
                <p className="text-sm font-semibold text-dash-fg">{tr.noConsignatarios}</p>
                <p className="mt-1 text-sm text-dash-muted">{canEdit ? tr.createHint : tr.adminHint}</p>
              </div>
              {canEdit && (
                <button type="button" onClick={openCreate} className="dash-cta inline-flex items-center gap-2 px-5 py-2.5 text-sm">
                  <Icon icon="lucide:plus" width={15} />
                  {tr.nuevo}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2 md:hidden">
                {filtered.map((c) => (
                  <div
                    key={c.id}
                    className={`dash-card overflow-hidden rounded-xl border transition-all ${
                      !c.activo ? "border-dash-border opacity-60" : "border-dash-border hover:border-dash-neon/35"
                    }`}
                  >
                    <div className="p-4">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-dash-fg">{c.nombre}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {c.cliente && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-dash-neon/35 bg-dash-neon/15 px-2 py-0.5 text-xs font-bold text-dash-fg">
                                <Icon icon="lucide:building-2" width={9} height={9} />
                                {c.cliente}
                              </span>
                            )}
                            {c.destino && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-dash-border bg-dash-control px-2 py-0.5 text-xs font-semibold text-dash-muted">
                                <Icon icon="lucide:map-pin" width={9} height={9} />
                                {c.destino}
                              </span>
                            )}
                            {canEdit ? (
                              <button
                                type="button"
                                onClick={() => handleToggleActivo(c)}
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold transition-colors ${
                                  c.activo
                                    ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-300"
                                    : "border-dash-border bg-dash-control text-dash-muted"
                                }`}
                              >
                                <Icon icon={c.activo ? "lucide:check" : "lucide:x"} width={9} />
                                {c.activo ? tr.activo : tr.inactivo}
                              </button>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                                  c.activo ? "bg-emerald-500/15 text-emerald-300" : "bg-dash-control text-dash-muted"
                                }`}
                              >
                                {c.activo ? tr.activo : tr.inactivo}
                              </span>
                            )}
                          </div>
                        </div>
                        {canEdit && (
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(c)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl text-dash-neon transition-colors hover:bg-dash-neon/15"
                            >
                              <Icon icon="lucide:pencil" width={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete({ id: c.id, nombre: c.nombre })}
                              className="flex h-8 w-8 items-center justify-center rounded-xl text-dash-muted transition-colors hover:bg-red-500/15 hover:text-red-400"
                            >
                              <Icon icon="lucide:trash-2" width={14} />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 border-t border-dash-border pt-3">
                        <div className="rounded-xl border border-dash-border bg-dash-control/50 p-2.5">
                          <p className="mb-1 text-xs font-semibold text-dash-neon">Consignee</p>
                          <p className="line-clamp-1 text-xs font-semibold leading-snug text-dash-fg">
                            {c.consignee_company || <span className="font-normal text-dash-muted">—</span>}
                          </p>
                          {c.consignee_attn && <p className="mt-0.5 truncate text-xs text-dash-muted">{c.consignee_attn}</p>}
                        </div>
                        <div className="rounded-xl border border-dash-border bg-dash-control/50 p-2.5">
                          <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-dash-muted">Notify Party</p>
                          <p className="line-clamp-1 text-xs font-semibold leading-snug text-dash-fg">
                            {c.notify_company || <span className="font-normal text-dash-muted">—</span>}
                          </p>
                          {c.notify_attn && <p className="mt-0.5 truncate text-xs text-dash-muted">{c.notify_attn}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="dash-card hidden overflow-hidden rounded-xl md:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dash-border bg-dash-control/50">
                        <th className="px-4 py-3 text-left text-sm font-bold text-dash-neon">{tr.colNombre}</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-dash-neon">{tr.colCliente}</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-dash-neon">{tr.colDestino}</th>
                        <th className="hidden px-4 py-3 text-left text-sm font-bold text-dash-neon lg:table-cell">Consignee</th>
                        <th className="hidden px-4 py-3 text-left text-sm font-bold text-dash-neon xl:table-cell">Notify</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-dash-neon">{tr.colEstado}</th>
                        {canEdit && <th className="w-20 px-4 py-3" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dash-border">
                      {filtered.map((c) => (
                        <tr
                          key={c.id}
                          className={`transition-colors hover:bg-dash-neon/10 ${!c.activo ? "opacity-50" : ""}`}
                        >
                          <td className="px-4 py-3"><p className="text-xs font-semibold text-dash-fg">{c.nombre}</p></td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 rounded-full border border-dash-neon/35 bg-dash-neon/15 px-2 py-0.5 text-xs font-bold text-dash-fg">
                              <Icon icon="lucide:building-2" width={9} height={9} />
                              {c.cliente || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-dash-muted">{c.destino || "—"}</td>
                          <td className="hidden px-4 py-3 lg:table-cell">
                            <p className="text-xs font-medium text-dash-fg">{c.consignee_company || "—"}</p>
                            {c.consignee_attn && <p className="text-xs text-dash-muted">{c.consignee_attn}</p>}
                          </td>
                          <td className="hidden px-4 py-3 xl:table-cell">
                            <p className="text-xs font-medium text-dash-fg">{c.notify_company || "—"}</p>
                            {c.notify_attn && <p className="text-xs text-dash-muted">{c.notify_attn}</p>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {canEdit ? (
                              <button
                                type="button"
                                onClick={() => handleToggleActivo(c)}
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold transition-colors ${
                                  c.activo
                                    ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                                    : "border-dash-border bg-dash-control text-dash-muted hover:bg-dash-neon/15"
                                }`}
                              >
                                <Icon icon={c.activo ? "lucide:check" : "lucide:x"} width={10} />
                                {c.activo ? tr.activo : tr.inactivo}
                              </button>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                                  c.activo ? "bg-emerald-500/15 text-emerald-300" : "bg-dash-control text-dash-muted"
                                }`}
                              >
                                {c.activo ? tr.activo : tr.inactivo}
                              </span>
                            )}
                          </td>
                          {canEdit && (
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEdit(c)}
                                  className="rounded-lg p-1.5 text-dash-neon transition-colors hover:bg-dash-neon/15"
                                  title="Editar"
                                >
                                  <Icon icon="lucide:pencil" width={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDelete({ id: c.id, nombre: c.nombre })}
                                  className="rounded-lg p-1.5 text-dash-muted transition-colors hover:bg-red-500/15 hover:text-red-400"
                                  title="Eliminar"
                                >
                                  <Icon icon="lucide:trash-2" width={13} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-dash-border bg-dash-control/30 px-4 py-2.5">
                  <span className="text-sm font-medium text-dash-muted">
                    {filtered.length} {filtered.length !== 1 ? tr.consignatarios_plural : tr.consignatario}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {modal && (
        <div
          className="dash-neon fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          data-theme={theme}
          onClick={closeModal}
        >
          <div
            className="dash-card flex max-h-[95dvh] w-full flex-col overflow-hidden rounded-t-3xl sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 sm:hidden"><div className="h-1 w-10 rounded-full bg-dash-border" /></div>
            <div className="flex shrink-0 items-center justify-between border-b border-dash-border px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-dash-neon/40 bg-dash-neon/15">
                  <Icon icon={modal === "create" ? "lucide:user-plus" : "lucide:user-cog"} className="h-4 w-4 text-dash-neon" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-dash-fg">{modal === "create" ? tr.createTitle : tr.editTitle}</h2>
                  {editId && <p className="mt-0.5 max-w-[220px] truncate text-[11px] text-dash-muted">{form.nombre}</p>}
                </div>
              </div>
              <button type="button" onClick={closeModal} className="flex h-8 w-8 items-center justify-center rounded-xl text-dash-muted transition-colors hover:bg-dash-neon/15 hover:text-dash-fg">
                <Icon icon="lucide:x" width={16} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
              <div>
                <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-dash-muted">
                  <Icon icon="lucide:info" width={10} height={10} />
                  {tr.generalSection}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">{inp(tr.nombre, "nombre")}</div>
                  <div className="flex flex-col gap-1">
                    <label className={neonLabel}>{tr.clienteLabel}</label>
                    <FormSelect
                      variant="neon"
                      value={form.cliente ?? ""}
                      placeholder={tr.selectCliente}
                      options={clientes.map((c) => ({ value: c.nombre, label: c.nombre }))}
                      onChange={(v) => setForm((f) => ({ ...f, cliente: v }))}
                    />
                  </div>
                  {inp(tr.destino, "destino")}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-dash-border">
                <div className="flex gap-1.5 border-b border-dash-border bg-dash-control/50 p-2">
                  {(["consignee", "notify"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                        activeTab === tab
                          ? "bg-dash-neon/25 text-dash-fg ring-1 ring-dash-neon/40"
                          : "text-dash-muted hover:bg-dash-neon/10 hover:text-dash-fg"
                      }`}
                    >
                      <Icon icon={tab === "consignee" ? "lucide:user-check" : "lucide:bell"} width={12} height={12} />
                      {tab === "consignee" ? tr.consigneeTab : tr.notifyTab}
                    </button>
                  ))}
                </div>

                {activeTab === "notify" && (
                  <div className="flex items-center justify-between gap-3 border-b border-amber-400/30 bg-amber-500/10 px-4 py-2.5">
                    <p className="text-xs leading-snug text-amber-200">{tr.notifyEquals}</p>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          notify_company: f.consignee_company,
                          notify_address: f.consignee_address,
                          notify_attn: f.consignee_attn,
                          notify_uscc: f.consignee_uscc,
                          notify_mobile: f.consignee_mobile,
                          notify_email: f.consignee_email,
                          notify_zip: f.consignee_zip,
                        }))
                      }
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-400/35 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-200 transition-colors hover:bg-amber-500/25"
                    >
                      <Icon icon="lucide:copy" width={11} /> {tr.copyBtn}
                    </button>
                  </div>
                )}
                {activeTab === "consignee" && (
                  <div className="flex items-center justify-between gap-3 border-b border-sky-400/30 bg-sky-500/10 px-4 py-2.5">
                    <p className="text-xs leading-snug text-sky-200">{tr.consigneeEquals}</p>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          consignee_company: f.notify_company,
                          consignee_address: f.notify_address,
                          consignee_attn: f.notify_attn,
                          consignee_uscc: f.notify_uscc,
                          consignee_mobile: f.notify_mobile,
                          consignee_email: f.notify_email,
                          consignee_zip: f.notify_zip,
                        }))
                      }
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-sky-400/35 bg-sky-500/15 px-3 py-1.5 text-xs font-bold text-sky-200 transition-colors hover:bg-sky-500/25"
                    >
                      <Icon icon="lucide:copy" width={11} /> {tr.copyBtn}
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
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

              <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
                <div>{inp(tr.notas, "notas", "text", true)}</div>
                <div className="flex items-center gap-3 rounded-xl border border-dash-border bg-dash-control/50 p-3 sm:mt-5">
                  <label className="flex flex-1 cursor-pointer items-center gap-2.5">
                    <div
                      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${form.activo ? "bg-emerald-500" : "bg-dash-border"}`}
                      onClick={() => setForm((f) => ({ ...f, activo: !f.activo }))}
                    >
                      <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${form.activo ? "left-4" : "left-0.5"}`} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-dash-fg">{tr.consignatarioActivo}</p>
                      <p className="text-xs text-dash-muted">{form.activo ? tr.visibleDocs : tr.hiddenDocs}</p>
                    </div>
                  </label>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 rounded-xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-xs text-red-300">
                  <Icon icon="lucide:alert-circle" className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>

            <div className="flex shrink-0 gap-2.5 border-t border-dash-border px-4 py-4 sm:px-6">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 rounded-xl border border-dash-border bg-dash-control px-5 py-3 text-sm font-semibold text-dash-fg transition-colors hover:bg-dash-neon/15 sm:flex-none"
              >
                {tr.cancel}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="dash-cta flex flex-1 items-center justify-center gap-1.5 px-4 py-3 text-sm disabled:opacity-50"
              >
                {saving ? (
                  <><Icon icon="typcn:refresh" className="h-4 w-4 animate-spin" />{tr.guardando}</>
                ) : (
                  <><Icon icon="lucide:save" className="h-4 w-4" />{tr.guardar}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div
          className="dash-neon fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          data-theme={theme}
          onClick={() => setConfirmDelete(null)}
        >
          <div className="dash-card w-full overflow-hidden rounded-t-3xl sm:max-w-sm sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="h-1.5 bg-red-500" />
            <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="h-1 w-10 rounded-full bg-dash-border" /></div>
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-400/35 bg-red-500/15">
                  <Icon icon="lucide:trash-2" className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-dash-fg">{tr.deleteTitle}</h3>
                  <p className="mt-0.5 text-xs text-dash-muted">{tr.deleteWarning}</p>
                </div>
              </div>
              <p className="mb-6 text-sm leading-relaxed text-dash-muted">
                ¿Confirmas eliminar <span className="font-semibold text-dash-fg">&quot;{confirmDelete.nombre}&quot;</span>?
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 rounded-xl border border-dash-border bg-dash-control py-3 text-sm font-semibold text-dash-fg transition-colors hover:bg-dash-neon/15"
                >
                  {tr.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 rounded-xl border border-red-400/35 bg-red-500/20 py-3 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/30"
                >
                  {tr.delete}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
