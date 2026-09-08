import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { withBase } from "@/lib/basePath";
import { staggerStyle } from "@/lib/ui/motion";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { FormSelect } from "@/components/ui/FormSelect";
import { useNeonTheme } from "@/lib/ui/neonTheme";

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

const neonInput =
  "dash-control w-full px-3.5 py-2.5 border border-dash-border rounded-lg text-base text-dash-fg placeholder:text-dash-muted focus:outline-none focus:ring-2 focus:ring-dash-neon/40 focus:border-dash-neon/50";
const neonLabel = "block text-sm font-semibold text-dash-muted mb-1.5";

export function ClientesContent() {
  const [theme] = useNeonTheme();
  const [rowData, setRowData] = useState<ClienteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<{ id: string; nombre: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingRow, setEditingRow] = useState<ClienteRow | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<ClienteForm>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<ClienteForm>(emptyForm());
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const empresaOptions = useMemo(
    () => empresas.map((e) => ({ value: e.id, label: e.nombre })),
    [empresas]
  );

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
    setIsEditOpen(true);
  };

  const handleEditClose = () => { setIsEditOpen(false); };

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

  const isFirstLoad = loading && rowData.length === 0;
  const isRefreshing = loading && rowData.length > 0;

  return (
    <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
      <main className="dash-page relative flex min-h-0 flex-1 flex-col overflow-hidden" role="main">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -right-16 top-10 h-72 w-72 rounded-full bg-dash-neon/20 blur-3xl" />
          <div className="absolute bottom-20 left-1/4 h-64 w-64 rounded-full bg-dash-neon-hot/15 blur-3xl" />
        </div>

        <div className="dash-toolbar relative z-10 shrink-0" style={staggerStyle(0)}>
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dash-neon/40 bg-dash-neon/15 shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--dash-neon)_55%,transparent)]">
                <Icon icon="lucide:briefcase" width={22} height={22} className="text-dash-neon" aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold tracking-tight text-dash-fg sm:text-xl">Clientes</h1>
                <p className="mt-0.5 line-clamp-1 text-xs text-dash-muted sm:text-sm">Empresas con términos comerciales</p>
              </div>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-dash-control px-3 py-1.5 text-xs font-semibold text-dash-fg">
                <Icon icon="lucide:building-2" width={13} height={13} className="text-dash-muted" />
                {rowData.length} cliente{rowData.length !== 1 ? "s" : ""}
              </span>
              {rowData.filter((r) => r.activo).length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                  <Icon icon="lucide:check-circle" width={13} height={13} />
                  {rowData.filter((r) => r.activo).length} activo{rowData.filter((r) => r.activo).length !== 1 ? "s" : ""}
                </span>
              )}
              {selectedIds.size > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="inline-flex items-center gap-1 rounded-lg border border-dash-border bg-dash-control px-3 py-1.5 text-xs font-medium text-dash-muted transition-colors hover:bg-dash-neon/15 hover:text-dash-fg"
                  >
                    <Icon icon="lucide:x" width={11} height={11} />
                    Desmarcar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRemoveSelected()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/35 bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/25"
                  >
                    <Icon icon="lucide:trash-2" width={13} height={13} />
                    <span className="hidden sm:inline">Eliminar ({selectedIds.size})</span>
                    <span className="sm:hidden">{selectedIds.size}</span>
                  </button>
                </>
              )}
              <button type="button" onClick={handleOpenAddModal} className="dash-cta inline-flex items-center gap-1.5 px-4 py-2 text-sm">
                <Icon icon="lucide:plus" width={14} height={14} />
                Agregar
              </button>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex shrink-0 items-center gap-2 border-b border-dash-border bg-dash-control/40 px-4 py-2.5" style={staggerStyle(1)}>
          <div className="relative flex-1">
            <Icon icon="lucide:search" width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dash-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente…"
              className={`${neonInput} pl-9`}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dash-muted hover:text-dash-fg"
              >
                <Icon icon="lucide:x" width={12} height={12} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => void fetchClientes()}
            className="rounded-lg border border-dash-border bg-dash-control p-2.5 text-dash-muted transition-colors hover:bg-dash-neon/15 hover:text-dash-fg disabled:opacity-60"
            disabled={loading}
            title="Actualizar"
          >
            <Icon icon="lucide:refresh-cw" width={14} height={14} className={isRefreshing ? "animate-spin" : undefined} />
          </button>
        </div>

        {error && (
          <div className="relative z-10 mx-4 mt-3 flex shrink-0 items-center gap-2 rounded-xl border border-red-400/35 bg-red-500/10 px-4 py-2.5 text-xs text-red-300" role="alert">
            <Icon icon="lucide:alert-circle" width={14} height={14} className="shrink-0" />
            {error}
          </div>
        )}

        <div
          className="relative z-10 min-h-0 flex-1 overflow-auto p-3 sm:p-4"
          style={staggerStyle(2)}
          data-refreshing={isRefreshing}
          aria-busy={loading}
        >
          {isFirstLoad ? (
            <SkeletonRows rows={7} />
          ) : filtered.length === 0 ? (
            <div className="dash-card flex flex-col items-center gap-4 rounded-xl px-4 py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dash-border bg-dash-control">
                <Icon icon="lucide:briefcase" width={26} height={26} className="text-dash-muted" />
              </div>
              <div>
                <p className="text-sm font-semibold text-dash-fg">
                  {search ? `Sin resultados para "${search}"` : "Sin clientes aún"}
                </p>
                <p className="mt-1 text-xs text-dash-muted">
                  {search ? "Prueba con otro término." : "Agrega el primero con el botón de arriba."}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2.5 md:hidden">
                {filtered.map((row, index) => {
                  const isSelected = selectedIds.has(row.id);
                  const initials = row.nombre.slice(0, 2).toUpperCase();
                  return (
                    <div
                      key={row.id}
                      onClick={() => setSelectedIds((prev) => { const next = new Set(prev); if (next.has(row.id)) next.delete(row.id); else next.add(row.id); return next; })}
                      style={staggerStyle(index)}
                      className={`dash-card cursor-pointer overflow-hidden rounded-xl border transition-all ${
                        isSelected
                          ? "border-dash-neon/50 bg-dash-neon/15 ring-2 ring-dash-neon/25"
                          : "border-dash-border hover:border-dash-neon/35"
                      }`}
                    >
                      <div className="p-4">
                        <div className="mb-3 flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${
                              isSelected
                                ? "bg-dash-neon/30 text-dash-fg"
                                : "border border-dash-neon/35 bg-dash-neon/15 text-dash-neon"
                            }`}
                          >
                            {isSelected ? <Icon icon="lucide:check" width={16} height={16} /> : initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold leading-tight text-dash-fg">{row.nombre}</p>
                            <p className="mt-0.5 text-xs text-dash-muted">
                              {row.condicion_pago ? `Pago: ${row.condicion_pago}` : "Sin condición de pago"}
                            </p>
                          </div>
                          {row.activo ? (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Activo
                            </span>
                          ) : (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dash-border bg-dash-control px-2 py-0.5 text-xs font-semibold text-dash-muted">
                              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />Inactivo
                            </span>
                          )}
                        </div>

                        <div className="mb-3 grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-dash-border bg-dash-control/50 px-3 py-2">
                            <p className="text-xs font-semibold text-dash-neon">Límite crédito</p>
                            <p className="mt-0.5 font-mono text-xs font-bold text-dash-fg">
                              {row.limite_credito !== null ? row.limite_credito.toLocaleString("es-CL") : "—"}
                            </p>
                          </div>
                          <div className="rounded-xl border border-dash-border bg-dash-control/50 px-3 py-2">
                            <p className="text-xs font-semibold text-dash-neon">Descuento</p>
                            <p className="mt-0.5 text-xs font-bold text-dash-fg">
                              {row.descuento !== null ? `${row.descuento}%` : "—"}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleEditOpen(row); }}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dash-neon/35 bg-dash-neon/15 py-2.5 text-xs font-semibold text-dash-fg transition-colors hover:bg-dash-neon/25"
                        >
                          <Icon icon="lucide:pencil" width={13} height={13} />Editar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="dash-card hidden overflow-hidden rounded-xl md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dash-border bg-dash-control/50">
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={handleToggleAll}
                          className="rounded border-dash-border accent-[var(--dash-neon)] focus:ring-dash-neon/30"
                          aria-label="Seleccionar todos"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-dash-neon">Cliente / Empresa</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-dash-neon">Límite crédito</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-dash-neon">Condición pago</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-dash-neon">Descuento</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-dash-neon">Estado</th>
                      <th className="w-20 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dash-border">
                    {filtered.map((row, index) => {
                      const initials = row.nombre.slice(0, 2).toUpperCase();
                      return (
                        <tr
                          key={row.id}
                          style={staggerStyle(index)}
                          className={`transition-colors ${
                            selectedIds.has(row.id) ? "bg-dash-neon/15" : "hover:bg-dash-neon/10"
                          }`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(row.id)}
                              onChange={() => setSelectedIds((prev) => { const next = new Set(prev); if (next.has(row.id)) next.delete(row.id); else next.add(row.id); return next; })}
                              className="rounded border-dash-border accent-[var(--dash-neon)] focus:ring-dash-neon/30"
                              aria-label={`Seleccionar ${row.nombre}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-dash-neon/35 bg-dash-neon/15 text-xs font-bold text-dash-neon">
                                {initials}
                              </div>
                              <span className="text-sm font-semibold text-dash-fg">{row.nombre}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {row.limite_credito !== null
                              ? <span className="font-mono text-xs font-semibold text-dash-fg">{row.limite_credito.toLocaleString("es-CL")}</span>
                              : <span className="text-xs text-dash-muted">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-dash-muted">{row.condicion_pago || <span className="text-dash-muted">—</span>}</td>
                          <td className="px-4 py-3 text-xs text-dash-muted">
                            {row.descuento !== null
                              ? <span className="font-semibold text-dash-fg">{row.descuento}%</span>
                              : <span className="text-dash-muted">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {row.activo
                              ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Activo</span>
                              : <span className="inline-flex items-center gap-1 rounded-full border border-dash-border bg-dash-control px-2 py-0.5 text-xs font-semibold text-dash-muted"><span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />Inactivo</span>}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => handleEditOpen(row)}
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-dash-neon transition-colors hover:bg-dash-neon/15"
                            >
                              <Icon icon="lucide:pencil" width={12} height={12} />Editar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex items-center justify-between border-t border-dash-border bg-dash-control/30 px-4 py-2.5">
                  <span className="text-sm text-dash-muted">
                    {filtered.length} cliente{filtered.length !== 1 ? "s" : ""}{search ? ` · filtrado de ${rowData.length}` : ""}
                  </span>
                  {selectedIds.size > 0 && (
                    <span className="text-sm font-medium text-dash-neon">
                      {selectedIds.size} seleccionado{selectedIds.size !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {showAddModal && (
        <div
          className="dash-neon fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          data-theme={theme}
          onClick={() => setShowAddModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-cliente-title"
        >
          <div
            className="dash-card flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl sm:max-w-md sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 sm:hidden"><div className="h-1 w-10 rounded-full bg-dash-border" /></div>
            <div className="flex shrink-0 items-center justify-between border-b border-dash-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-dash-neon/40 bg-dash-neon/15">
                  <Icon icon="lucide:plus" width={15} height={15} className="text-dash-neon" />
                </div>
                <h2 id="add-cliente-title" className="text-sm font-bold text-dash-fg">Agregar cliente</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-dash-muted transition-colors hover:bg-dash-neon/15 hover:text-dash-fg"
                aria-label="Cerrar"
              >
                <Icon icon="lucide:x" width={14} />
              </button>
            </div>
            <div className="space-y-4 overflow-y-auto px-5 py-4">
              <div>
                <label className={neonLabel}>
                  Empresa <span className="text-red-400">*</span>
                </label>
                <FormSelect
                  variant="neon"
                  value={addForm.empresa_id}
                  placeholder="— Seleccionar empresa —"
                  options={empresaOptions}
                  onChange={(v) => setAddForm((f) => ({ ...f, empresa_id: v }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={neonLabel}>Límite de crédito</label>
                  <input
                    type="number"
                    value={addForm.limite_credito}
                    onChange={(e) => setAddForm((f) => ({ ...f, limite_credito: e.target.value }))}
                    className={neonInput}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className={neonLabel}>Descuento (%)</label>
                  <input
                    type="number"
                    value={addForm.descuento}
                    onChange={(e) => setAddForm((f) => ({ ...f, descuento: e.target.value }))}
                    className={neonInput}
                    placeholder="0"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              <div>
                <label className={neonLabel}>Condición de pago</label>
                <input
                  type="text"
                  value={addForm.condicion_pago}
                  onChange={(e) => setAddForm((f) => ({ ...f, condicion_pago: e.target.value }))}
                  className={neonInput}
                  placeholder="Ej: 30 días"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={addForm.activo}
                    onChange={(e) => setAddForm((f) => ({ ...f, activo: e.target.checked }))}
                    className="peer sr-only"
                  />
                  <div className="h-5 w-9 rounded-full bg-dash-border transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:bg-dash-neon peer-checked:after:translate-x-4" />
                </label>
                <span className="text-sm font-medium text-dash-fg">{addForm.activo ? "Activo" : "Inactivo"}</span>
              </div>
              {addError && (
                <p className="flex items-center gap-1 text-xs text-red-300" role="alert">
                  <Icon icon="lucide:alert-circle" width={13} height={13} className="shrink-0" />
                  {addError}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2.5 border-t border-dash-border px-5 py-4">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 rounded-xl border border-dash-border bg-dash-control px-4 py-2.5 text-sm font-medium text-dash-fg transition-colors hover:bg-dash-neon/15"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleAddSubmit()}
                disabled={isAdding || !addForm.empresa_id}
                className="dash-cta flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAdding && <Icon icon="lucide:loader-2" width={14} height={14} className="animate-spin" />}
                {isAdding ? "Agregando…" : "Agregar cliente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingRow && isEditOpen && (
        <div
          className="dash-neon fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          data-theme={theme}
          onClick={handleEditClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-cliente-title"
        >
          <div
            className="dash-card flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl sm:max-w-md sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 sm:hidden"><div className="h-1 w-10 rounded-full bg-dash-border" /></div>
            <div className="flex shrink-0 items-center justify-between border-b border-dash-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-dash-neon/40 bg-dash-neon/15">
                  <Icon icon="lucide:pencil" width={15} height={15} className="text-dash-neon" />
                </div>
                <div>
                  <h2 id="edit-cliente-title" className="text-sm font-bold text-dash-fg">Editar cliente</h2>
                  <p className="text-xs text-dash-muted">{editingRow.nombre}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleEditClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-dash-muted transition-colors hover:bg-dash-neon/15 hover:text-dash-fg"
                aria-label="Cerrar"
              >
                <Icon icon="lucide:x" width={14} />
              </button>
            </div>
            <div className="space-y-4 overflow-y-auto px-5 py-4">
              <div>
                <label className={neonLabel}>Empresa</label>
                <FormSelect
                  variant="neon"
                  value={editForm.empresa_id}
                  placeholder="— Sin empresa —"
                  options={empresaOptions}
                  onChange={(v) => setEditForm((f) => ({ ...f, empresa_id: v }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={neonLabel}>Límite de crédito</label>
                  <input
                    type="number"
                    value={editForm.limite_credito}
                    onChange={(e) => setEditForm((f) => ({ ...f, limite_credito: e.target.value }))}
                    className={neonInput}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className={neonLabel}>Descuento (%)</label>
                  <input
                    type="number"
                    value={editForm.descuento}
                    onChange={(e) => setEditForm((f) => ({ ...f, descuento: e.target.value }))}
                    className={neonInput}
                    placeholder="0"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              <div>
                <label className={neonLabel}>Condición de pago</label>
                <input
                  type="text"
                  value={editForm.condicion_pago}
                  onChange={(e) => setEditForm((f) => ({ ...f, condicion_pago: e.target.value }))}
                  className={neonInput}
                  placeholder="Ej: 30 días"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={editForm.activo}
                    onChange={(e) => setEditForm((f) => ({ ...f, activo: e.target.checked }))}
                    className="peer sr-only"
                  />
                  <div className="h-5 w-9 rounded-full bg-dash-border transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:bg-dash-neon peer-checked:after:translate-x-4" />
                </label>
                <span className="text-sm font-medium text-dash-fg">
                  {editForm.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 gap-2.5 border-t border-dash-border px-5 py-4">
              <button
                type="button"
                onClick={handleEditClose}
                className="flex-1 rounded-xl border border-dash-border bg-dash-control px-4 py-2.5 text-sm font-medium text-dash-fg transition-colors hover:bg-dash-neon/15"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleEditSave()}
                disabled={isSaving}
                className="dash-cta flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving && <Icon icon="lucide:loader-2" width={14} height={14} className="animate-spin" />}
                {isSaving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
