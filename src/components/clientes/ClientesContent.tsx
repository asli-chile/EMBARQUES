import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { withBase } from "@/lib/basePath";

const API_CLIENTES = withBase("/api/clientes");

export type ClienteRow = {
  id: string;
  nombre: string;
  empresa_id: string | null;
  limite_credito: number | null;
  condicion_pago: string;
  descuento: number | null;
  activo: boolean;
};

type DbCliente = {
  id: string;
  empresa_id: string | null;
  limite_credito?: number | null;
  condicion_pago?: string | null;
  descuento?: number | null;
  activo?: boolean | null;
  empresa_nombre?: string;
};

function toRow(db: DbCliente, nombreEmpresa?: string): ClienteRow {
  return {
    id: db.id,
    nombre: nombreEmpresa ?? db.empresa_nombre ?? "—",
    empresa_id: db.empresa_id,
    limite_credito: db.limite_credito ?? null,
    condicion_pago: db.condicion_pago ?? "",
    descuento: db.descuento ?? null,
    activo: db.activo ?? true,
  };
}

type ClienteForm = {
  empresa_id: string;
  limite_credito: string;
  condicion_pago: string;
  descuento: string;
  activo: boolean;
};

const emptyForm = (): ClienteForm => ({
  empresa_id: "",
  limite_credito: "",
  condicion_pago: "",
  descuento: "",
  activo: true,
});

export function ClientesContent() {
  const [rowData, setRowData] = useState<ClienteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<{ id: string; nombre: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingRow, setEditingRow] = useState<ClienteRow | null>(null);
  const [editForm, setEditForm] = useState<ClienteForm>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<ClienteForm>(emptyForm());
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_CLIENTES, { credentials: "include" });
      const json = (await res.json()) as { clientes?: DbCliente[]; empresas?: { id: string; nombre: string }[]; error?: string };
      setLoading(false);
      if (!res.ok) { setError(json.error ?? `Error ${res.status}`); return; }
      const clientes = (json.clientes ?? []) as DbCliente[];
      const empresasList = json.empresas ?? [];
      setEmpresas(empresasList);
      setRowData(clientes.map((c) => toRow(c)));
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "Error al cargar clientes");
    }
  }, []);

  useEffect(() => { void fetchClientes(); }, [fetchClientes]);

  const handleOpenAddModal = () => {
    setAddForm({ ...emptyForm(), empresa_id: empresas[0]?.id ?? "" });
    setAddError(null);
    setShowAddModal(true);
  };

  const handleAddSubmit = useCallback(async () => {
    if (!addForm.empresa_id) { setAddError("Selecciona una empresa."); return; }
    setAddError(null);
    setIsAdding(true);
    try {
      const res = await fetch(API_CLIENTES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          empresa_id: addForm.empresa_id || null,
          limite_credito: addForm.limite_credito !== "" ? Number(addForm.limite_credito) : null,
          condicion_pago: addForm.condicion_pago || null,
          descuento: addForm.descuento !== "" ? Number(addForm.descuento) : null,
          activo: addForm.activo,
        }),
      });
      const json = (await res.json()) as { data?: DbCliente; error?: string };
      if (!res.ok) { setAddError(json.error ?? "Error al agregar"); return; }
      if (json.data) {
        const d = json.data as DbCliente;
        const nombre = d.empresa_id ? empresas.find((e) => e.id === d.empresa_id)?.nombre : undefined;
        setRowData((prev) => [...prev, toRow(d, nombre)]);
      }
      setShowAddModal(false);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Error al agregar");
    } finally {
      setIsAdding(false);
    }
  }, [addForm, empresas]);

  const handleRemoveSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      const res = await fetch(API_CLIENTES, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) { setError(json.error ?? "Error al eliminar"); return; }
      setRowData((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    }
  }, [selectedIds]);

  const handleEditOpen = (row: ClienteRow) => {
    setEditingRow(row);
    setEditForm({
      empresa_id: row.empresa_id ?? "",
      limite_credito: row.limite_credito !== null ? String(row.limite_credito) : "",
      condicion_pago: row.condicion_pago,
      descuento: row.descuento !== null ? String(row.descuento) : "",
      activo: row.activo,
    });
  };

  const handleEditClose = () => { setEditingRow(null); };

  const handleEditSave = useCallback(async () => {
    if (!editingRow) return;
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        id: editingRow.id,
        empresa_id: editForm.empresa_id || null,
        limite_credito: editForm.limite_credito !== "" ? Number(editForm.limite_credito) : null,
        condicion_pago: editForm.condicion_pago || null,
        descuento: editForm.descuento !== "" ? Number(editForm.descuento) : null,
        activo: editForm.activo,
      };
      const res = await fetch(API_CLIENTES, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) { setError(json.error ?? "Error al actualizar"); return; }
      const empNombre = editForm.empresa_id ? empresas.find((e) => e.id === editForm.empresa_id)?.nombre ?? "—" : "—";
      setRowData((prev) =>
        prev.map((r) =>
          r.id === editingRow.id
            ? {
                ...r,
                nombre: empNombre,
                empresa_id: editForm.empresa_id || null,
                limite_credito: editForm.limite_credito !== "" ? Number(editForm.limite_credito) : null,
                condicion_pago: editForm.condicion_pago,
                descuento: editForm.descuento !== "" ? Number(editForm.descuento) : null,
                activo: editForm.activo,
              }
            : r
        )
      );
      handleEditClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar");
    } finally {
      setIsSaving(false);
    }
  }, [editingRow, editForm, empresas]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rowData;
    const q = search.toLowerCase();
    return rowData.filter((r) => r.nombre.toLowerCase().includes(q) || r.condicion_pago?.toLowerCase().includes(q));
  }, [rowData, search]);

  const allSelected = useMemo(
    () => filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id)),
    [filtered, selectedIds]
  );

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((r) => r.id)));
    }
  };

  if (loading && rowData.length === 0) {
    return (
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-neutral-100" role="main">
        <div className="flex-1 flex items-center justify-center text-neutral-500">Cargando clientes…</div>
      </main>
    );
  }

  return (
    <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-neutral-100" role="main">

      {/* Hero gradient header */}
      <div className="flex-shrink-0 bg-gradient-to-br from-brand-blue via-brand-blue/90 to-teal-700 text-white">
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Icon icon="lucide:briefcase" width={22} height={22} className="text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight">Clientes</h1>
                <p className="text-xs text-white/70 mt-0.5">Empresas con términos comerciales</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {selectedIds.size > 0 && (
                <button type="button" onClick={() => void handleRemoveSelected()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-100 bg-red-500/30 hover:bg-red-500/50 transition-colors">
                  <Icon icon="lucide:trash-2" width={13} height={13} />
                  <span className="hidden sm:inline">Eliminar ({selectedIds.size})</span>
                  <span className="sm:hidden">{selectedIds.size}</span>
                </button>
              )}
              <button type="button" onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-brand-blue bg-white hover:bg-white/90 transition-colors shadow-sm">
                <Icon icon="lucide:plus" width={14} height={14} />
                Agregar
              </button>
            </div>
          </div>
          <div className="flex gap-2 mt-4 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
              <Icon icon="lucide:building-2" width={13} height={13} className="text-white/80" />
              <span className="text-xs font-semibold">{rowData.length} cliente{rowData.length !== 1 ? "s" : ""}</span>
            </div>
            {rowData.filter((r) => r.activo).length > 0 && (
              <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
                <Icon icon="lucide:check-circle" width={13} height={13} className="text-white/80" />
                <span className="text-xs font-semibold">{rowData.filter((r) => r.activo).length} activo{rowData.filter((r) => r.activo).length !== 1 ? "s" : ""}</span>
              </div>
            )}
            {selectedIds.size > 0 && (
              <button type="button" onClick={() => setSelectedIds(new Set())}
                className="flex items-center gap-1 bg-white/20 rounded-xl px-3 py-1.5 text-xs font-medium text-white/80 hover:text-white transition-colors">
                <Icon icon="lucide:x" width={11} height={11} />
                Desmarcar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex-shrink-0 bg-white border-b border-neutral-200 px-4 py-2.5 flex items-center gap-2">
        <div className="relative flex-1">
          <Icon icon="lucide:search" width={13} height={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente…"
            className="w-full rounded-xl border border-neutral-200 pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-neutral-500">
              <Icon icon="lucide:x" width={12} height={12} />
            </button>
          )}
        </div>
        <button type="button" onClick={() => void fetchClientes()}
          className="p-2 rounded-xl text-neutral-500 bg-neutral-100 hover:bg-neutral-200 transition-colors" title="Actualizar">
          <Icon icon="lucide:refresh-cw" width={14} height={14} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex-shrink-0 mx-4 mt-3 px-4 py-2.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2" role="alert">
          <Icon icon="lucide:alert-circle" width={14} height={14} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-4">

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="w-16 h-16 rounded-3xl bg-white border border-neutral-200 flex items-center justify-center shadow-sm">
              <Icon icon="lucide:briefcase" width={28} height={28} className="text-neutral-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-500">
                {search ? `Sin resultados para "${search}"` : "Sin clientes aún"}
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                {search ? "Prueba con otro término." : "Agrega el primero con el botón de arriba."}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Mobile cards (< md) ── */}
            <div className="md:hidden space-y-2.5">
              {filtered.map((row) => {
                const isSelected = selectedIds.has(row.id);
                const initials = row.nombre.slice(0, 2).toUpperCase();
                return (
                  <div
                    key={row.id}
                    onClick={() => setSelectedIds((prev) => { const next = new Set(prev); if (next.has(row.id)) next.delete(row.id); else next.add(row.id); return next; })}
                    className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all cursor-pointer active:scale-[0.99] ${
                      isSelected ? "border-brand-blue ring-1 ring-brand-blue/30" : "border-neutral-200"
                    }`}
                  >
                    <div className={`h-1 transition-colors ${isSelected ? "bg-brand-blue" : "bg-gradient-to-r from-brand-blue/20 to-teal-400/20"}`} />
                    <div className="p-4">
                      {/* Header row */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-sm font-bold transition-colors ${
                          isSelected ? "bg-brand-blue text-white" : "bg-brand-blue/10 text-brand-blue"
                        }`}>
                          {isSelected ? <Icon icon="lucide:check" width={16} height={16} /> : initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-neutral-900 text-sm leading-tight truncate">{row.nombre}</p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            {row.condicion_pago ? `Pago: ${row.condicion_pago}` : "Sin condición de pago"}
                          </p>
                        </div>
                        {row.activo ? (
                          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-100 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Activo
                          </span>
                        ) : (
                          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-neutral-100 text-neutral-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />Inactivo
                          </span>
                        )}
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-neutral-50 rounded-xl px-3 py-2">
                          <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide">Límite crédito</p>
                          <p className="text-xs font-bold text-neutral-800 mt-0.5 font-mono">
                            {row.limite_credito !== null ? row.limite_credito.toLocaleString("es-CL") : "—"}
                          </p>
                        </div>
                        <div className="bg-neutral-50 rounded-xl px-3 py-2">
                          <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide">Descuento</p>
                          <p className="text-xs font-bold text-neutral-800 mt-0.5">
                            {row.descuento !== null ? `${row.descuento}%` : "—"}
                          </p>
                        </div>
                      </div>

                      {/* Action */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleEditOpen(row); }}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-brand-blue bg-brand-blue/8 hover:bg-brand-blue/15 transition-colors"
                      >
                        <Icon icon="lucide:pencil" width={13} height={13} />Editar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop table (md+) ── */}
            <div className="hidden md:block bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" checked={allSelected} onChange={handleToggleAll}
                        className="rounded border-neutral-300 text-brand-blue focus:ring-brand-blue/30"
                        aria-label="Seleccionar todos" />
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Cliente / Empresa</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Límite crédito</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Condición pago</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Descuento</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-3 w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filtered.map((row) => {
                    const initials = row.nombre.slice(0, 2).toUpperCase();
                    return (
                      <tr key={row.id} className={`transition-colors ${selectedIds.has(row.id) ? "bg-brand-blue/5" : "hover:bg-neutral-50"}`}>
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selectedIds.has(row.id)}
                            onChange={() => setSelectedIds((prev) => { const next = new Set(prev); if (next.has(row.id)) next.delete(row.id); else next.add(row.id); return next; })}
                            className="rounded border-neutral-300 text-brand-blue focus:ring-brand-blue/30"
                            aria-label={`Seleccionar ${row.nombre}`} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-brand-blue/10 text-brand-blue text-xs font-bold flex items-center justify-center shrink-0">{initials}</div>
                            <span className="font-semibold text-neutral-900 text-sm">{row.nombre}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.limite_credito !== null
                            ? <span className="font-mono text-xs font-semibold text-neutral-700">{row.limite_credito.toLocaleString("es-CL")}</span>
                            : <span className="text-neutral-400 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-600">{row.condicion_pago || <span className="text-neutral-400">—</span>}</td>
                        <td className="px-4 py-3 text-xs text-neutral-600">
                          {row.descuento !== null
                            ? <span className="font-semibold text-neutral-700">{row.descuento}%</span>
                            : <span className="text-neutral-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {row.activo
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-100 text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Activo</span>
                            : <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-neutral-100 text-neutral-500"><span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />Inactivo</span>}
                        </td>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => handleEditOpen(row)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-brand-blue hover:bg-brand-blue/10 transition-colors">
                            <Icon icon="lucide:pencil" width={12} height={12} />Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-2.5 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between">
                <span className="text-[11px] text-neutral-400">{filtered.length} cliente{filtered.length !== 1 ? "s" : ""}{search ? ` · filtrado de ${rowData.length}` : ""}</span>
                {selectedIds.size > 0 && <span className="text-[11px] text-brand-blue font-medium">{selectedIds.size} seleccionado{selectedIds.size !== 1 ? "s" : ""}</span>}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-cliente-title"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-neutral-200" />
            </div>
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-neutral-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-brand-blue flex items-center justify-center">
                  <Icon icon="lucide:plus" width={15} height={15} className="text-white" />
                </div>
                <h2 id="add-cliente-title" className="text-sm font-bold text-neutral-900">Agregar cliente</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                aria-label="Cerrar"
              >
                <Icon icon="lucide:x" width={16} height={16} />
              </button>
            </div>
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Empresa <span className="text-red-500">*</span>
                </label>
                <select
                  value={addForm.empresa_id}
                  onChange={(e) => setAddForm((f) => ({ ...f, empresa_id: e.target.value }))}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue outline-none"
                >
                  <option value="">— Seleccionar empresa —</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Límite de crédito</label>
                  <input
                    type="number"
                    value={addForm.limite_credito}
                    onChange={(e) => setAddForm((f) => ({ ...f, limite_credito: e.target.value }))}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue outline-none"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Descuento (%)</label>
                  <input
                    type="number"
                    value={addForm.descuento}
                    onChange={(e) => setAddForm((f) => ({ ...f, descuento: e.target.value }))}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue outline-none"
                    placeholder="0"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Condición de pago</label>
                <input
                  type="text"
                  value={addForm.condicion_pago}
                  onChange={(e) => setAddForm((f) => ({ ...f, condicion_pago: e.target.value }))}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue outline-none"
                  placeholder="Ej: 30 días"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addForm.activo}
                    onChange={(e) => setAddForm((f) => ({ ...f, activo: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-200 rounded-full peer peer-checked:bg-brand-blue transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                </label>
                <span className="text-sm font-medium text-neutral-700">{addForm.activo ? "Activo" : "Inactivo"}</span>
              </div>
              {addError && (
                <p className="text-xs text-red-600 flex items-center gap-1" role="alert">
                  <Icon icon="lucide:alert-circle" width={13} height={13} className="shrink-0" />
                  {addError}
                </p>
              )}
            </div>
            <div className="flex gap-2 px-5 sm:px-6 pb-5 sm:pb-6 pt-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleAddSubmit()}
                disabled={isAdding || !addForm.empresa_id}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30 shadow-sm"
              >
                {isAdding ? "Agregando…" : "Agregar cliente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingRow && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-cliente-title"
          onClick={handleEditClose}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-neutral-200" />
            </div>
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-neutral-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-brand-blue flex items-center justify-center">
                  <Icon icon="lucide:pencil" width={15} height={15} className="text-white" />
                </div>
                <div>
                  <h2 id="edit-cliente-title" className="text-sm font-bold text-neutral-900">Editar cliente</h2>
                  <p className="text-xs text-neutral-500">{editingRow.nombre}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleEditClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                aria-label="Cerrar"
              >
                <Icon icon="lucide:x" width={16} height={16} />
              </button>
            </div>
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Empresa</label>
                <select
                  value={editForm.empresa_id}
                  onChange={(e) => setEditForm((f) => ({ ...f, empresa_id: e.target.value }))}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue outline-none"
                >
                  <option value="">— Sin empresa —</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Límite de crédito</label>
                  <input
                    type="number"
                    value={editForm.limite_credito}
                    onChange={(e) => setEditForm((f) => ({ ...f, limite_credito: e.target.value }))}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Descuento (%)</label>
                  <input
                    type="number"
                    value={editForm.descuento}
                    onChange={(e) => setEditForm((f) => ({ ...f, descuento: e.target.value }))}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue outline-none"
                    placeholder="0"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Condición de pago</label>
                <input
                  type="text"
                  value={editForm.condicion_pago}
                  onChange={(e) => setEditForm((f) => ({ ...f, condicion_pago: e.target.value }))}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue outline-none"
                  placeholder="Ej: 30 días"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.activo}
                    onChange={(e) => setEditForm((f) => ({ ...f, activo: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-200 rounded-full peer peer-checked:bg-brand-blue transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                </label>
                <span className="text-sm font-medium text-neutral-700">
                  {editForm.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
            <div className="flex gap-2 px-5 sm:px-6 pb-5 sm:pb-6 pt-2 shrink-0">
              <button
                type="button"
                onClick={handleEditClose}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleEditSave()}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                {isSaving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
