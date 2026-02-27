import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import type { ColDef } from "ag-grid-community";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";

ModuleRegistry.registerModules([AllCommunityModule]);

export type ClienteRow = {
  id: string;
  nombre_cliente: string;
  contacto: string;
  usuarios: string;
  rut_empresa: string;
  giro: string;
};

type DbCliente = {
  id: string;
  nombre_cliente: string;
  contacto: string | null;
  rut_empresa: string | null;
  giro: string | null;
};

function toRow(db: DbCliente): ClienteRow {
  return {
    id: db.id,
    nombre_cliente: db.nombre_cliente,
    contacto: db.contacto ?? "",
    usuarios: "—",
    rut_empresa: db.rut_empresa ?? "",
    giro: db.giro ?? "",
  };
}

export function ClientesContent() {
  const gridRef = useRef<AgGridReact<ClienteRow>>(null);
  const [rowData, setRowData] = useState<ClienteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const fetchClientes = useCallback(async () => {
    if (!supabase) {
      setError("Supabase no configurado. Revisa PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY en .env");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.from("clientes").select("*").order("nombre_cliente");
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setRowData((data ?? []).map(toRow));
  }, [supabase]);

  useEffect(() => {
    void fetchClientes();
  }, [fetchClientes]);

  const columnDefs = useMemo<ColDef<ClienteRow>[]>(
    () => [
      { checkboxSelection: true, headerCheckboxSelection: true, width: 48, pinned: "left", suppressMovable: true },
      { field: "nombre_cliente", headerName: "Nombre de cliente", sortable: true, editable: true, flex: 1, minWidth: 160 },
      { field: "contacto", headerName: "Contacto", sortable: true, editable: true, flex: 1, minWidth: 140 },
      {
        field: "usuarios",
        headerName: "Usuario(s)",
        sortable: false,
        editable: false,
        flex: 1,
        minWidth: 120,
        tooltipValueGetter: () => "Se vinculará cuando exista la tabla usuarios",
      },
      { field: "rut_empresa", headerName: "RUT empresa", sortable: true, editable: true, flex: 1, minWidth: 120 },
      { field: "giro", headerName: "Giro", sortable: true, editable: true, flex: 1, minWidth: 120 },
    ],
    []
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
    if (!supabase) return;
    const { data, error: err } = await supabase
      .from("clientes")
      .insert({ nombre_cliente: "Nuevo cliente", contacto: "", rut_empresa: "", giro: "" })
      .select("id,nombre_cliente,contacto,rut_empresa,giro")
      .single();
    if (err) {
      setError(err.message);
      return;
    }
    if (data) {
      gridRef.current?.api?.applyTransaction({ add: [toRow(data as DbCliente)] });
    }
  }, [supabase]);

  const handleRemoveSelected = useCallback(async () => {
    const selected = gridRef.current?.api?.getSelectedRows();
    if (!selected?.length || !supabase) return;
    const ids = selected.map((r) => r.id);
    const { error: err } = await supabase.from("clientes").delete().in("id", ids);
    if (err) {
      setError(err.message);
      return;
    }
    gridRef.current?.api?.applyTransaction({ remove: selected });
  }, [supabase]);

  const handleRefresh = useCallback(() => {
    void fetchClientes();
  }, [fetchClientes]);

  const handleCellValueChanged = useCallback(
    async (e: { data: ClienteRow; colDef: { field?: string }; newValue: unknown; oldValue: unknown }) => {
      const field = e.colDef.field;
      if (!supabase || !field || field === "usuarios" || e.newValue === e.oldValue) return;
      const { error: err } = await supabase
        .from("clientes")
        .update({ [field]: e.newValue ?? null })
        .eq("id", e.data.id);
      if (err) setError(err.message);
    },
    [supabase]
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
            rowSelection="multiple"
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
