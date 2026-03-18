import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";

const API_CLIENTES = "/api/clientes";

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

  const allSelected = useMemo(
    () => rowData.length > 0 && rowData.every((r) => selectedIds.has(r.id)),
    [rowData, selectedIds]
  );

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rowData.map((r) => r.id)));
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

      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-neutral-200 overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
        <div className="px-5 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-blue flex items-center justify-center flex-shrink-0">
            <Icon icon="lucide:briefcase" width={18} height={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900">Clientes</h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Empresas cliente con términos comerciales. Asigna usuarios en Configuración → Usuarios.
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex-shrink-0 mx-4 mt-3 px-4 py-2.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2" role="alert">
          <Icon icon="lucide:alert-circle" width={14} height={14} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-2.5 bg-white border-b border-neutral-200 flex items-center gap-2">
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-brand-blue text-white hover:bg-brand-blue/90 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/50 shadow-sm"
        >
          <Icon icon="lucide:plus" width={14} height={14} />
          <span>Agregar</span>
        </button>
        <button
          type="button"
          onClick={() => void handleRemoveSelected()}
          disabled={selectedIds.size === 0}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          aria-label={selectedIds.size > 0 ? `Eliminar ${selectedIds.size} seleccionados` : "Eliminar seleccionados"}
        >
          <Icon icon="lucide:trash-2" width={14} height={14} />
          <span className="hidden sm:inline">Eliminar{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}</span>
          {selectedIds.size > 0 && <span className="sm:hidden">{selectedIds.size}</span>}
        </button>
        <button
          type="button"
          onClick={() => void fetchClientes()}
          className="inline-flex items-center justify-center p-2 rounded-xl text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          aria-label="Actualizar"
          title="Actualizar"
        >
          <Icon icon="lucide:refresh-cw" width={15} height={15} />
        </button>
        {selectedIds.size > 0 && (
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            Desmarcar
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-4">

        {rowData.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center shadow-sm">
              <Icon icon="lucide:briefcase" width={22} height={22} className="text-neutral-400" />
            </div>
            <p className="text-sm text-neutral-400">Sin clientes aún. Agrega uno con el botón de arriba.</p>
          </div>
        ) : (
          <>
            {/* ── Mobile cards (< md) ── */}
            <div className="md:hidden space-y-2">
              {rowData.map((row) => (
                <div
                  key={row.id}
                  className={`bg-white rounded-2xl border shadow-sm p-4 transition-colors ${
                    selectedIds.has(row.id) ? "border-brand-blue/40 bg-brand-blue/5" : "border-neutral-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() =>
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(row.id)) next.delete(row.id); else next.add(row.id);
                          return next;
                        })
                      }
                      className="mt-0.5 rounded border-neutral-300 text-brand-blue focus:ring-brand-blue/30 shrink-0"
                      aria-label={`Seleccionar ${row.nombre}`}
                    />
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="font-semibold text-neutral-900 text-sm truncate">{row.nombre}</p>
                        {row.activo ? (
                          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-green-100 text-green-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Activo
                          </span>
                        ) : (
                          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-neutral-100 text-neutral-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                            Inactivo
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-xs text-neutral-500 mb-3">
                        <div>
                          <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide">Crédito</p>
                          <p className="text-neutral-700 font-mono">
                            {row.limite_credito !== null ? row.limite_credito.toLocaleString() : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide">Descuento</p>
                          <p className="text-neutral-700">
                            {row.descuento !== null ? `${row.descuento}%` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide">Pago</p>
                          <p className="text-neutral-700 truncate">{row.condicion_pago || "—"}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleEditOpen(row)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-brand-blue bg-brand-blue/8 hover:bg-brand-blue/15 transition-colors"
                        aria-label={`Editar ${row.nombre}`}
                      >
                        <Icon icon="lucide:pencil" width={13} height={13} />
                        Editar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Desktop table (md+) ── */}
            <div className="hidden md:block bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th className="px-4 py-2.5 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={handleToggleAll}
                        className="rounded border-neutral-300 text-brand-blue focus:ring-brand-blue/30"
                        aria-label="Seleccionar todos"
                      />
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Cliente / Empresa</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Límite crédito</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Condición pago</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Descuento</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-2.5 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {rowData.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-t border-neutral-100 transition-colors ${
                        selectedIds.has(row.id) ? "bg-brand-blue/5" : "hover:bg-neutral-50"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() =>
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(row.id)) next.delete(row.id); else next.add(row.id);
                              return next;
                            })
                          }
                          className="rounded border-neutral-300 text-brand-blue focus:ring-brand-blue/30"
                          aria-label={`Seleccionar ${row.nombre}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-neutral-900">{row.nombre}</span>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {row.limite_credito !== null ? (
                          <span className="font-mono text-xs">{row.limite_credito.toLocaleString()}</span>
                        ) : (
                          <span className="text-neutral-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-600 text-xs">
                        {row.condicion_pago || <span className="text-neutral-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-neutral-600 text-xs">
                        {row.descuento !== null ? `${row.descuento}%` : <span className="text-neutral-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {row.activo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-green-100 text-green-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-neutral-100 text-neutral-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleEditOpen(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-brand-blue hover:bg-brand-blue/10 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                          aria-label={`Editar ${row.nombre}`}
                        >
                          <Icon icon="lucide:pencil" width={12} height={12} />
                          Editar
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
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
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
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
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
