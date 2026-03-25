// Módulo: Consorcios
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import { AREAS_CANONICAL, normalizeArea } from "@/lib/areas";
import { sileo } from "sileo";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

function getApiUrl(): string {
  if (typeof import.meta !== "undefined" && import.meta.env?.PUBLIC_API_URL) {
    return String(import.meta.env.PUBLIC_API_URL);
  }
  return "";
}

type ServicioOption = {
  id: string;
  nombre: string;
  naviera_nombre?: string | null;
  destinos?: { area?: string | null }[];
};
type Consorcio = {
  id: string;
  nombre: string;
  servicios?: {
    servicio_unico?: {
      id: string;
      nombre: string;
      naviera_nombre?: string | null;
      puerto_origen?: string | null;
      naves?: { nave_nombre?: string | null }[];
      destinos?: { puerto?: string | null; puerto_nombre?: string | null; area?: string | null }[];
    };
  }[];
};

const defaultConsorciosTr: Record<string, string> = {
  title: "Consorcios",
  newConsortium: "Nuevo consorcio",
  newConsortiumAria: "Nuevo consorcio",
  errorLoad: "Error cargando consorcios",
  noConsorcios: "No hay consorcios",
  noConsorciosHint: "Cree uno con el botón «Nuevo consorcio».",
  areaLabel: "Área",
  consortiumCount: "{{count}} consorcio",
  consortiumCount_other: "{{count}} consorcios",
  serviceCount: "{{count}} servicio",
  serviceCount_other: "{{count}} servicios",
  destinationCount: "{{count}} destino",
  destinationCount_other: "{{count}} destinos",
  carriers: "Navieras",
  edit: "Editar",
  editAria: "Editar consorcio {{name}}",
  delete: "Eliminar",
  deleteAria: "Eliminar consorcio {{name}}",
  modalTitleNew: "Nuevo consorcio",
  modalTitleEdit: "Editar consorcio",
  modalDescNew: "Asigne un nombre y seleccione los servicios que forman parte del consorcio.",
  modalDescEdit: "Modifique el nombre o los servicios del consorcio.",
  nameLabel: "Nombre del consorcio",
  namePlaceholder: "Ej. ALIANZA ASIA",
  servicesIncluded: "Servicios incluidos",
  createServicesFirst: "Cree primero servicios en «Servicios por naviera».",
  selectedCount: "{{count}} servicio seleccionado",
  selectedCount_other: "{{count}} servicios seleccionados",
  cancel: "Cancelar",
  save: "Guardar cambios",
  create: "Crear consorcio",
  saving: "Guardando…",
  errorNameRequired: "Nombre del consorcio requerido.",
  errorUpdate: "Error al actualizar",
  errorCreate: "Error al crear",
  errorSave: "Error al guardar",
  successCreated: "Consorcio creado correctamente.",
  successUpdated: "Consorcio actualizado correctamente.",
  successDeleted: "Consorcio eliminado correctamente.",
  confirmDelete: "¿Eliminar el consorcio «{{name}}»? Esta acción no se puede deshacer.",
  errorDelete: "Error al eliminar",
  errorDeleteMsg: "Error al eliminar el consorcio.",
  noArea: "Sin área",
};

export function ConsorciosContent() {
  const { t } = useLocale();
  const { isSuperadmin } = useAuth();
  const tr = { ...defaultConsorciosTr, ...(t?.consorciosPage as Record<string, string> | undefined) };
  const [consorcios, setConsorcios] = useState<Consorcio[]>([]);
  const [serviciosOpts, setServiciosOpts] = useState<ServicioOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: "", servicios_ids: [] as string[] });
  const modalRef = useRef<HTMLDivElement>(null);
  const [detailsConsorcio, setDetailsConsorcio] = useState<Consorcio | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; confirmLabel: string; onConfirm: () => void } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const base = getApiUrl() || "";
    try {
      const [consRes, servRes] = await Promise.all([
        fetch(`${base}/api/admin/consorcios`, { credentials: "include" }),
        fetch(`${base}/api/admin/servicios-unicos`, { credentials: "include" }),
      ]);
      if (!consRes.ok) {
        const errData = (await consRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error ?? tr.errorLoad);
      }
      const consData = (await consRes.json()) as { consorcios?: Consorcio[] };
      setConsorcios(consData.consorcios ?? []);

      if (servRes.ok) {
        const servData = (await servRes.json()) as {
          servicios?: { id: string; nombre: string; naviera_nombre?: string | null; destinos?: { area?: string | null }[] }[];
        };
        setServiciosOpts(servData.servicios ?? []);
      } else {
        setServiciosOpts([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setConsorcios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpenModal = useCallback(() => {
    setEditingId(null);
    setModalError(null);
    setForm({ nombre: "", servicios_ids: [] });
    setModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((c: Consorcio) => {
    setModalError(null);
    setEditingId(c.id);
    const ids =
      c.servicios
        ?.map((s) => s.servicio_unico?.id)
        .filter((id): id is string => Boolean(id)) ?? [];
    setForm({
      nombre: c.nombre,
      servicios_ids: ids,
    });
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
    setModalError(null);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCloseModal();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [modalOpen, handleCloseModal]);

  useEffect(() => {
    if (modalOpen && modalRef.current) {
      const firstInput = modalRef.current.querySelector<HTMLInputElement>("#consorcio-nombre");
      firstInput?.focus();
    }
  }, [modalOpen]);

  const handleToggleServicio = useCallback((id: string) => {
    setForm((f) => ({
      ...f,
      servicios_ids: f.servicios_ids.includes(id)
        ? f.servicios_ids.filter((s) => s !== id)
        : [...f.servicios_ids, id],
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    const nombre = form.nombre.trim();
    setModalError(null);
    if (!nombre) {
      setModalError(tr.errorNameRequired);
      return;
    }

    setSaving(true);
    const base = getApiUrl() || "";
    const url = editingId
      ? `${base}/api/admin/consorcios/${editingId}`
      : `${base}/api/admin/consorcios`;
    const method = editingId ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, servicios_ids: form.servicios_ids }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? (editingId ? tr.errorUpdate : tr.errorCreate));
      handleCloseModal();
      sileo.success({ title: editingId ? tr.successUpdated : tr.successCreated });
      load();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : tr.errorSave);
    } finally {
      setSaving(false);
    }
  }, [form, editingId, load, handleCloseModal, tr]);

  const handleDelete = useCallback(
    (c: Consorcio) => {
      setConfirmDialog({
        title: "Eliminar consorcio",
        message: tr.confirmDelete.replace("{{name}}", c.nombre),
        confirmLabel: tr.delete,
        onConfirm: async () => {
          setConfirmDialog(null);
          setDeletingId(c.id);
          setError(null);
          const base = getApiUrl() || "";
          try {
            const res = await fetch(`${base}/api/admin/consorcios/${c.id}`, {
              method: "DELETE",
              credentials: "include",
            });
            const data = (await res.json()) as { error?: string };
            if (!res.ok) throw new Error(data.error ?? tr.errorDelete);
            sileo.success({ title: tr.successDeleted });
            load();
          } catch (e) {
            setError(e instanceof Error ? e.message : tr.errorDeleteMsg);
          } finally {
            setDeletingId(null);
          }
        },
      });
    },
    [load, tr]
  );

  const getServiceAreas = useCallback((s: ServicioOption): string[] => {
    const areas = (s.destinos ?? [])
      .map((d) => (d.area != null && String(d.area).trim() ? normalizeArea(d.area) : null))
      .filter((a): a is string => Boolean(a));
    return [...new Set(areas)];
  }, []);

  const serviciosByArea = serviciosOpts.reduce<Record<string, ServicioOption[]>>((acc, s) => {
    const areas = getServiceAreas(s);
    if (areas.length === 0) {
      const key = tr.noArea;
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
    } else {
      areas.forEach((area) => {
        if (!acc[area]) acc[area] = [];
        acc[area].push(s);
      });
    }
    return acc;
  }, {});

  const areaOrderList: string[] = [...AREAS_CANONICAL, tr.noArea];
  const areaNames = [...new Set(Object.keys(serviciosByArea))].sort((a, b) => {
    const iA = areaOrderList.indexOf(a);
    const iB = areaOrderList.indexOf(b);
    if (iA >= 0 && iB >= 0) return iA - iB;
    if (iA >= 0) return -1;
    if (iB >= 0) return 1;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });

  // Mapa servicioId → nombre(s) del consorcio que ya lo tiene asignado
  // (excluye el consorcio que se está editando para no marcar sus propios servicios)
  const usedInConsorcioMap = consorcios.reduce<Record<string, string[]>>((acc, c) => {
    if (c.id === editingId) return acc;
    (c.servicios ?? []).forEach((item) => {
      const sid = item.servicio_unico?.id;
      if (!sid) return;
      if (!acc[sid]) acc[sid] = [];
      if (!acc[sid].includes(c.nombre)) acc[sid].push(c.nombre);
    });
    return acc;
  }, {});

  const getConsorcioAreas = useCallback((c: Consorcio): string[] => {
    const areas: string[] = [];
    (c.servicios ?? []).forEach((item) => {
      (item.servicio_unico?.destinos ?? []).forEach((d) => {
        if (d.area != null && String(d.area).trim()) {
          areas.push(normalizeArea(d.area));
        }
      });
    });
    return [...new Set(areas)];
  }, []);

  const consorciosByArea = consorcios.reduce<Record<string, Consorcio[]>>((acc, c) => {
    const areas = getConsorcioAreas(c);
    if (areas.length === 0) {
      const key = tr.noArea;
      if (!acc[key]) acc[key] = [];
      acc[key].push(c);
    } else {
      areas.forEach((area) => {
        if (!acc[area]) acc[area] = [];
        acc[area].push(c);
      });
    }
    return acc;
  }, {});

  const consorcioAreaNames = [...new Set(Object.keys(consorciosByArea))].sort((a, b) => {
    const iA = areaOrderList.indexOf(a);
    const iB = areaOrderList.indexOf(b);
    if (iA >= 0 && iB >= 0) return iA - iB;
    if (iA >= 0) return -1;
    if (iB >= 0) return 1;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });

  /** Columnas fijas: las 4 áreas canónicas + "Sin área" si existe */
  const columnAreas = AREAS_CANONICAL.slice();
  const hasNoArea = consorcioAreaNames.some((a) => a === tr.noArea);
  const areasForColumns = hasNoArea ? [...columnAreas, tr.noArea] : columnAreas;

  function renderConsorcioCard(c: Consorcio) {
    const numServicios = c.servicios?.length ?? 0;
    const numDestinos = new Set(
      (c.servicios ?? []).flatMap(
        (s) => (s.servicio_unico?.destinos ?? []).map((d) => (d.puerto ?? "").trim().toUpperCase()).filter(Boolean)
      )
    ).size;
    const servicioNombres = c.servicios?.map((s) => s.servicio_unico?.nombre).filter(Boolean) ?? [];
    const navieras = [
      ...new Set(
        (c.servicios ?? [])
          .map((s) => s.servicio_unico?.naviera_nombre?.trim())
          .filter((n): n is string => Boolean(n))
      ),
    ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return (
      <li
        key={c.id}
        className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm flex items-start justify-between gap-3"
      >
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-brand-blue">{c.nombre}</p>
          <p className="text-sm text-neutral-600 mt-0.5">
            {numServicios === 1 ? tr.serviceCount.replace("{{count}}", String(numServicios)) : tr.serviceCount_other.replace("{{count}}", String(numServicios))}
            <span className="text-neutral-400 mx-1">·</span>
            {numDestinos === 1 ? tr.destinationCount.replace("{{count}}", String(numDestinos)) : tr.destinationCount_other.replace("{{count}}", String(numDestinos))}
            {servicioNombres.length > 0 && (
              <span className="text-neutral-500"> · {servicioNombres.join(", ")}</span>
            )}
          </p>
          {navieras.length > 0 && (
            <p className="text-xs text-neutral-500 mt-1">
              {tr.carriers}: {navieras.join(", ")}
            </p>
          )}
          <button
            type="button"
            onClick={() => setDetailsConsorcio(c)}
            className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-brand-blue/40 text-[11px] font-medium text-brand-blue hover:bg-brand-blue/5 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          >
            <Icon icon="lucide:eye" width={14} height={14} aria-hidden />
            Ver detalle de servicios
          </button>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenEdit(c)}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-brand-blue hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            aria-label={tr.editAria.replace("{{name}}", c.nombre)}
            title={tr.edit}
          >
            <Icon icon="lucide:pencil" width={18} height={18} />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(c)}
            disabled={deletingId === c.id}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/30 disabled:opacity-50"
            aria-label={tr.deleteAria.replace("{{name}}", c.nombre)}
            title={tr.delete}
          >
            <Icon icon="lucide:trash-2" width={18} height={18} />
          </button>
        </div>
      </li>
    );
  }

  return (
    <>
    <main className="flex-1 min-h-0 min-w-0 overflow-auto bg-neutral-50" role="main">
      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-5 py-4 sm:py-6 space-y-4">

        {/* Header card */}
        <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
          <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-blue flex items-center justify-center flex-shrink-0">
                <Icon icon="lucide:layers" width={20} height={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-neutral-900 leading-tight">
                  {tr.title}
                </h1>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {tr.modalDescNew}
                </p>
              </div>
            </div>
            {isSuperadmin && (
            <button
              type="button"
              onClick={handleOpenModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-brand-blue text-white hover:bg-brand-blue/90 transition-colors shadow-sm shadow-brand-blue/20 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              aria-label={tr.newConsortiumAria}
            >
              <Icon icon="lucide:plus" width={18} height={18} />
              {tr.newConsortium}
            </button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2" role="alert">
            <Icon icon="lucide:alert-circle" width={18} height={18} aria-hidden />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Icon icon="lucide:loader-2" width={32} height={32} className="animate-spin text-brand-blue" aria-hidden />
          </div>
        ) : consorcios.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 text-center text-neutral-500">
            <Icon icon="lucide:layers" width={40} height={40} className="mx-auto mb-3 opacity-50" />
            <p className="font-medium">{tr.noConsorcios}</p>
            <p className="text-sm mt-1">{tr.noConsorciosHint}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {areasForColumns.map((areaName) => {
              const list = (consorciosByArea[areaName] ?? []).sort((a, b) =>
                (a.nombre ?? "").localeCompare(b.nombre ?? "", undefined, { sensitivity: "base" })
              );
              return (
                <section key={areaName} className="min-w-0">
                  <h2 className="text-base font-bold text-neutral-800 mb-1 flex items-center gap-2">
                    <Icon icon="lucide:map-pin" width={16} height={16} className="text-brand-blue shrink-0" />
                    {areaName}
                  </h2>
                  <p className="text-xs text-neutral-500 mb-3">
                    {list.length === 1
                      ? tr.consortiumCount.replace("{{count}}", String(list.length))
                      : tr.consortiumCount_other.replace("{{count}}", String(list.length))}
                  </p>
                  <ul className="space-y-3" role="list">
                    {list.map(renderConsorcioCard)}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-white"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-consorcio-title"
        >
          <div ref={modalRef} className="flex flex-col min-h-0 flex-1 overflow-y-auto">
            <div className="p-6 sm:p-8 w-full pb-24">
              <header className="mb-8">
                <h2 id="modal-consorcio-title" className="text-xl font-semibold text-brand-blue tracking-tight">
                  {editingId ? tr.modalTitleEdit : tr.modalTitleNew}
                </h2>
                <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
                  {editingId ? tr.modalDescEdit : tr.modalDescNew}
                </p>
              </header>

              {modalError && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200 flex items-center gap-3" role="alert">
                  <Icon icon="lucide:alert-circle" width={20} height={20} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="space-y-8">
                <section className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-5 sm:p-6">
                  <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Icon icon="lucide:tag" width={16} height={16} className="text-brand-blue" />
                    {tr.nameLabel}
                  </h3>
                  <input
                    id="consorcio-nombre"
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white transition-colors"
                    placeholder={tr.namePlaceholder}
                    autoComplete="off"
                  />
                </section>

                <section className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-5 sm:p-6">
                  <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Icon icon="lucide:layers" width={16} height={16} className="text-brand-blue" />
                    {tr.servicesIncluded}
                  </h3>
                  {serviciosOpts.length === 0 ? (
                    <p className="text-sm text-neutral-500 py-2">{tr.createServicesFirst}</p>
                  ) : (
                    <div className="rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100 max-h-[50vh] overflow-y-auto">
                      {areaNames.map((areaName) => (
                        <div key={areaName}>
                          <p className="px-4 py-2.5 text-xs font-semibold text-neutral-600 uppercase tracking-wider bg-neutral-50 sticky top-0">
                            {tr.areaLabel}: {areaName}
                          </p>
                          <ul className="py-1">
                            {serviciosByArea[areaName]
                              ?.sort((a, b) => (a.nombre ?? "").localeCompare(b.nombre ?? "", undefined, { sensitivity: "base" }))
                              .map((s) => {
                                const inputId = `serv-${areaName}-${s.id}`;
                                const usedIn = usedInConsorcioMap[s.id];
                                const isUsed = usedIn && usedIn.length > 0;
                                const isChecked = form.servicios_ids.includes(s.id);
                                return (
                                  <li
                                    key={inputId}
                                    className={`flex items-start gap-3 px-4 py-2.5 transition-colors ${
                                      isUsed
                                        ? "bg-amber-50/70 hover:bg-amber-50"
                                        : "hover:bg-neutral-50/80"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      id={inputId}
                                      checked={isChecked}
                                      onChange={() => handleToggleServicio(s.id)}
                                      className="rounded border-neutral-300 text-brand-blue focus:ring-brand-blue/30 w-4 h-4 mt-0.5 shrink-0"
                                    />
                                    <label htmlFor={inputId} className="text-sm cursor-pointer flex-1 min-w-0">
                                      <span className={`font-medium ${isUsed ? "text-amber-800" : "text-neutral-800"}`}>
                                        {s.nombre}
                                      </span>
                                      {s.naviera_nombre?.trim() && (
                                        <span className={`ml-1 ${isUsed ? "text-amber-600" : "text-neutral-500"}`}>
                                          · {s.naviera_nombre}
                                        </span>
                                      )}
                                      {isUsed && (
                                        <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-100 border border-amber-300 rounded px-1.5 py-0.5">
                                          <Icon icon="lucide:alert-triangle" width={11} height={11} aria-hidden />
                                          Ya en: {usedIn.join(", ")}
                                        </span>
                                      )}
                                    </label>
                                  </li>
                                );
                              }) ?? null}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    {form.servicios_ids.length > 0 && (
                      <p className="text-sm text-neutral-500">
                        {form.servicios_ids.length === 1
                          ? tr.selectedCount.replace("{{count}}", String(form.servicios_ids.length))
                          : tr.selectedCount_other.replace("{{count}}", String(form.servicios_ids.length))}
                      </p>
                    )}
                    {Object.keys(usedInConsorcioMap).length > 0 && (
                      <p className="text-xs text-amber-700 flex items-center gap-1">
                        <Icon icon="lucide:alert-triangle" width={13} height={13} aria-hidden />
                        Los servicios en ámbar ya pertenecen a otro consorcio.
                      </p>
                    )}
                  </div>
                </section>
              </div>

              <footer className="fixed bottom-0 left-0 right-0 flex gap-4 p-4 sm:p-6 bg-white/95 border-t border-neutral-200 backdrop-blur-sm">
                <div className="w-full flex gap-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-5 py-3 rounded-xl border border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-colors"
                  >
                    {tr.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex-1 px-5 py-3 rounded-xl bg-brand-blue text-white font-medium hover:bg-brand-blue/90 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-colors"
                  >
                    {saving ? tr.saving : editingId ? tr.save : tr.create}
                  </button>
                </div>
              </footer>
            </div>
          </div>
        </div>
      )}

      {detailsConsorcio && (
        <div
          className="fixed inset-0 z-40 flex flex-col bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Detalle del consorcio ${detailsConsorcio.nombre}`}
        >
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-neutral-200 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 bg-neutral-50">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-900">
                    Consorcio: {detailsConsorcio.nombre}
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Detalle de los servicios que componen este consorcio (nombre, naviera, naves y destinos).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailsConsorcio(null)}
                  className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  aria-label="Cerrar detalle de consorcio"
                >
                  <Icon icon="lucide:x" width={18} height={18} aria-hidden />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-auto px-5 py-4">
                {(() => {
                  const servicios = (detailsConsorcio.servicios ?? [])
                    .map((s) => s.servicio_unico)
                    .filter((s): s is NonNullable<Consorcio["servicios"]>[number]["servicio_unico"] => Boolean(s));
                  if (servicios.length === 0) {
                    return (
                      <p className="text-sm text-neutral-500">
                        Este consorcio aún no tiene servicios asociados.
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      {servicios.map((s) => {
                        const naves =
                          (s.naves ?? [])
                            .map((n) => (n.nave_nombre ?? "").trim())
                            .filter(Boolean)
                            .join(", ") || "—";
                        const destinos =
                          (s.destinos ?? [])
                            .map((d) => (d.puerto_nombre || d.puerto || "").toString().trim())
                            .filter(Boolean)
                            .join(", ") || "—";
                        return (
                          <div
                            key={s.id}
                            className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4 flex flex-col gap-1.5"
                          >
                            <p className="text-sm font-semibold text-neutral-900 flex items-center justify-between gap-2">
                              <span>{s.nombre}</span>
                              {s.naviera_nombre?.trim() && (
                                <span className="text-xs font-medium text-brand-blue uppercase">
                                  {s.naviera_nombre}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-neutral-600">
                              <span className="font-medium">POL:</span> {s.puerto_origen || "—"}
                            </p>
                            <p className="text-xs text-neutral-600">
                              <span className="font-medium">Naves:</span> {naves}
                            </p>
                            <p className="text-xs text-neutral-600">
                              <span className="font-medium">Destinos:</span> {destinos}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
    {confirmDialog && (
      <ConfirmDialog
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant="danger"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(null)}
      />
    )}
    </>
  );
}
