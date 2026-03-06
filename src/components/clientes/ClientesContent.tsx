import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import type { ColDef } from "ag-grid-community";
import { Icon } from "@iconify/react";

ModuleRegistry.registerModules([AllCommunityModule]);

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

export function ClientesContent() {
  const gridRef = useRef<AgGridReact<ClienteRow>>(null);
  const [rowData, setRowData] = useState<ClienteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<{ id: string; nombre: string }[]>([]);

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_CLIENTES, { credentials: "include" });
      const json = (await res.json()) as { clientes?: DbCliente[]; empresas?: { id: string; nombre: string }[]; error?: string };
      setLoading(false);
      if (!res.ok) {
        setError(json.error ?? `Error ${res.status}`);
        return;
      }
      const clientes = (json.clientes ?? []) as DbCliente[];
      const empresasList = json.empresas ?? [];
      setEmpresas(empresasList);
      setRowData(clientes.map((c) => toRow(c)));
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "Error al cargar clientes");
    }
  }, []);

  useEffect(() => {
    void fetchClientes();
  }, [fetchClientes]);

  const columnDefs = useMemo<ColDef<ClienteRow>[]>(
    () => [
      { field: "nombre", headerName: "Cliente", sortable: true, editable: false, flex: 1, minWidth: 180 },
      {
        field: "empresa_id",
        headerName: "Empresa",
        sortable: true,
        editable: true,
        flex: 1,
        minWidth: 140,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: ["", ...empresas.map((e) => e.id)] },
        valueFormatter: (p) => {
          const name = p.data?.nombre;
          if (name && name !== "—") return name;
          if (!p.value) return "—";
          const found = empresas.find((e) => String(e.id) === String(p.value));
          return found?.nombre ?? String(p.value);
        },
      },
      { field: "limite_credito", headerName: "Límite crédito", sortable: true, editable: true, width: 120 },
      { field: "condicion_pago", headerName: "Condición pago", sortable: true, editable: true, flex: 1, minWidth: 120 },
      { field: "descuento", headerName: "Descuento", sortable: true, editable: true, width: 100 },
      {
        field: "activo",
        headerName: "Activo",
        sortable: true,
        editable: true,
        width: 90,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: [true, false] },
        valueFormatter: (p) => (p.value ? "Sí" : "No"),
      },
    ],
    [empresas]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      filter: false,
      cellStyle: { textAlign: "center" },
      headerClass: "ag-header-cell-centered",
    }),
    []
  );

  const handleAddRow = useCallback(async () => {
    const empresaId = empresas[0]?.id ?? null;
    try {
      const res = await fetch(API_CLIENTES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          empresa_id: empresaId,
          limite_credito: null,
          condicion_pago: null,
          descuento: null,
          activo: true,
        }),
      });
      const json = (await res.json()) as { data?: DbCliente; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Error al agregar");
        return;
      }
      if (json.data) {
        const d = json.data as DbCliente;
        const nombre = d.empresa_id ? empresas.find((e) => e.id === d.empresa_id)?.nombre : undefined;
        gridRef.current?.api?.applyTransaction({ add: [toRow(d, nombre)] });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al agregar");
    }
  }, [empresas]);

  const handleRemoveSelected = useCallback(async () => {
    const selected = gridRef.current?.api?.getSelectedRows();
    if (!selected?.length) return;
    const ids = selected.map((r) => r.id);
    try {
      const res = await fetch(API_CLIENTES, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Error al eliminar");
        return;
      }
      gridRef.current?.api?.applyTransaction({ remove: selected });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    }
  }, []);

  const handleRefresh = useCallback(() => {
    void fetchClientes();
  }, [fetchClientes]);

  const handleCellValueChanged = useCallback(
    async (e: { data: ClienteRow; colDef: { field?: string }; newValue: unknown; oldValue: unknown }) => {
      const field = e.colDef.field;
      if (!field || field === "nombre" || e.newValue === e.oldValue) return;
      if (field === "empresa_id") {
        const emp = empresas.find((x) => x.id === e.newValue);
        if (emp) (e.data as ClienteRow).nombre = emp.nombre;
      }
      try {
        const res = await fetch(API_CLIENTES, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id: e.data.id, [field]: e.newValue ?? null }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) setError(json.error ?? "Error al actualizar");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al actualizar");
      }
    },
    [empresas]
  );

  if (loading && rowData.length === 0) {
    return (
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-neutral-100 relative z-10" role="main">
        <div className="flex-1 flex items-center justify-center text-neutral-500">Cargando clientes…</div>
      </main>
    );
  }

  return (
    <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-neutral-100 relative z-10" role="main">
      <header className="flex-shrink-0 px-4 py-3 bg-white border-b border-neutral-200">
        <h1 className="text-lg font-semibold text-brand-blue">Clientes</h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          Empresas cliente con términos comerciales. Asigna usuarios (personas) a cada empresa en Configuración → Usuarios para que varios accedan a los mismos datos.
        </p>
      </header>
      {error && (
        <div className="flex-shrink-0 px-4 py-2 bg-brand-red/10 text-brand-red text-sm border-b border-brand-red/20" role="alert">
          {error}
        </div>
      )}
      <div className="flex-shrink-0 px-4 py-3 bg-white border-b border-neutral-200 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => void handleAddRow()}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-blue text-white hover:bg-brand-blue/90 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
        >
          <Icon icon="typcn:plus" width={16} height={16} />
          Agregar
        </button>
        <button
          type="button"
          onClick={() => void handleRemoveSelected()}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        >
          <Icon icon="typcn:trash" width={16} height={16} />
          Eliminar selección
        </button>
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        >
          <Icon icon="typcn:refresh" width={16} height={16} />
          Actualizar
        </button>
      </div>
      <div className="flex-1 min-h-0 p-4 overflow-hidden flex flex-col">
        <div className="ag-theme-balham flex-1 min-h-[300px] w-full rounded overflow-hidden" style={{ minHeight: 400 }}>
          <AgGridReact<ClienteRow>
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowSelection={{ mode: "multiRow", checkboxes: true, headerCheckbox: true }}
            animateRows
            domLayout="normal"
            suppressCellFocus
            getRowId={(params) => params.data.id}
            onCellValueChanged={handleCellValueChanged}
          />
        </div>
      </div>
    </main>
  );
}
