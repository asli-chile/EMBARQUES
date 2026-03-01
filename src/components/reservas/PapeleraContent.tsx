import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Operacion = {
  id: string;
  correlativo: number | null;
  ref_asli: string | null;
  cliente: string | null;
  especie: string | null;
  naviera: string | null;
  nave: string | null;
  booking: string | null;
  estado_operacion: string | null;
  deleted_at: string;
  created_at: string;
};

export function PapeleraContent() {
  const { t } = useLocale();
  const tr = t.papelera;
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const fetchOperaciones = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("operaciones")
      .select(
        "id, correlativo, ref_asli, cliente, especie, naviera, nave, booking, estado_operacion, deleted_at, created_at"
      )
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (error) {
      console.error("Error loading operaciones:", error);
    } else {
      setOperaciones(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchOperaciones();
  }, [fetchOperaciones]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd-MM-yyyy HH:mm", { locale: es });
    } catch {
      return dateStr;
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === operaciones.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(operaciones.map((op) => op.id)));
    }
  };

  const handleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleRestore = async (ids: string[]) => {
    if (!supabase || ids.length === 0) return;
    setActionLoading(true);

    const { error } = await supabase
      .from("operaciones")
      .update({ deleted_at: null })
      .in("id", ids);

    if (error) {
      console.error("Error restoring:", error);
      alert(tr.errorRestoring);
    } else {
      setSelectedIds(new Set());
      await fetchOperaciones();
    }
    setActionLoading(false);
  };

  const handleDeletePermanently = async (ids: string[]) => {
    if (!supabase || ids.length === 0) return;

    const confirmed = window.confirm(
      tr.confirmDelete.replace("{count}", String(ids.length))
    );

    if (!confirmed) return;

    setActionLoading(true);

    const { error } = await supabase.from("operaciones").delete().in("id", ids);

    if (error) {
      console.error("Error deleting:", error);
      alert(tr.errorDeleting);
    } else {
      setSelectedIds(new Set());
      await fetchOperaciones();
    }
    setActionLoading(false);
  };

  const handleEmptyTrash = async () => {
    if (!supabase || operaciones.length === 0) return;

    const confirmed = window.confirm(
      tr.confirmEmptyTrash.replace("{count}", String(operaciones.length))
    );

    if (!confirmed) return;

    setActionLoading(true);

    const { error } = await supabase
      .from("operaciones")
      .delete()
      .not("deleted_at", "is", null);

    if (error) {
      console.error("Error emptying trash:", error);
      alert(tr.errorEmptyingTrash);
    } else {
      setSelectedIds(new Set());
      await fetchOperaciones();
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto p-4 flex items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-500">
          <Icon icon="typcn:refresh" className="w-6 h-6 animate-spin" />
          <span>{tr.loading}</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto p-4">
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-blue flex items-center gap-2">
              <Icon icon="typcn:trash" width={28} height={28} />
              {t.sidebar.papelera}
            </h1>
            <p className="text-neutral-500 text-sm mt-1">
              {operaciones.length} {tr.itemsInTrash}
            </p>
          </div>
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={() => handleRestore(Array.from(selectedIds))}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Icon icon="typcn:arrow-back" width={18} height={18} />
                  {tr.restore} ({selectedIds.size})
                </button>
                <button
                  onClick={() => handleDeletePermanently(Array.from(selectedIds))}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <Icon icon="typcn:delete" width={18} height={18} />
                  {tr.delete} ({selectedIds.size})
                </button>
              </>
            )}
            {operaciones.length > 0 && (
              <button
                onClick={handleEmptyTrash}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <Icon icon="typcn:trash" width={18} height={18} />
                {tr.emptyTrash}
              </button>
            )}
            <button
              onClick={fetchOperaciones}
              className="px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors"
              title={t.misReservas.refresh}
            >
              <Icon icon="typcn:refresh" width={20} height={20} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === operaciones.length && operaciones.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-neutral-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-neutral-600">{tr.colRef}</th>
                  <th className="px-4 py-3 text-center font-medium text-neutral-600">{tr.colClient}</th>
                  <th className="px-4 py-3 text-center font-medium text-neutral-600">{tr.colSpecies}</th>
                  <th className="px-4 py-3 text-center font-medium text-neutral-600">{tr.colCarrier}</th>
                  <th className="px-4 py-3 text-center font-medium text-neutral-600">{tr.colVessel}</th>
                  <th className="px-4 py-3 text-center font-medium text-neutral-600">{tr.colBooking}</th>
                  <th className="px-4 py-3 text-center font-medium text-neutral-600">{tr.colStatus}</th>
                  <th className="px-4 py-3 text-center font-medium text-neutral-600">{tr.colDeleted}</th>
                  <th className="px-4 py-3 text-center font-medium text-neutral-600">{tr.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {operaciones.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-neutral-500">
                      <div className="flex flex-col items-center gap-2">
                        <Icon icon="typcn:trash" className="w-12 h-12 text-neutral-300" />
                        <span>{tr.trashEmpty}</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  operaciones.map((op) => (
                    <tr
                      key={op.id}
                      className={`hover:bg-neutral-50 transition-colors ${
                        selectedIds.has(op.id) ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(op.id)}
                          onChange={() => handleSelect(op.id)}
                          className="w-4 h-4 rounded border-neutral-300"
                        />
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-neutral-400">
                        {op.ref_asli || op.correlativo || "-"}
                      </td>
                      <td className="px-4 py-3 text-center text-neutral-500">{op.cliente || "-"}</td>
                      <td className="px-4 py-3 text-center text-neutral-500">{op.especie || "-"}</td>
                      <td className="px-4 py-3 text-center text-neutral-500">{op.naviera || "-"}</td>
                      <td className="px-4 py-3 text-center text-neutral-500">{op.nave || "-"}</td>
                      <td className="px-4 py-3 text-center text-neutral-500">{op.booking || "-"}</td>
                      <td className="px-4 py-3 text-center">
                        {op.estado_operacion && (
                          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-neutral-100 text-neutral-500">
                            {op.estado_operacion}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-neutral-400 text-xs">
                        {formatDate(op.deleted_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleRestore([op.id])}
                            disabled={actionLoading}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title={tr.restore}
                          >
                            <Icon icon="typcn:arrow-back" width={18} height={18} />
                          </button>
                          <button
                            onClick={() => handleDeletePermanently([op.id])}
                            disabled={actionLoading}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title={tr.delete}
                          >
                            <Icon icon="typcn:delete" width={18} height={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
