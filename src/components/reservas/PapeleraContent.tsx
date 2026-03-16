import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
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

const estadoConfig: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  PENDIENTE:     { dot: "bg-amber-400",   bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
  "EN PROCESO":  { dot: "bg-blue-400",    bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200" },
  "EN TRÁNSITO": { dot: "bg-violet-400",  bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200" },
  ARRIBADO:      { dot: "bg-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  COMPLETADO:    { dot: "bg-neutral-400", bg: "bg-neutral-100", text: "text-neutral-600", border: "border-neutral-200" },
  CANCELADO:     { dot: "bg-red-400",     bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200" },
  ROLEADO:       { dot: "bg-orange-400",  bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200" },
};

export function PapeleraContent() {
  const { t } = useLocale();
  const { isCliente, empresaNombres, isLoading: authLoading } = useAuth();
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
    if (!supabase || authLoading) return;
    setLoading(true);

    let q = supabase
      .from("operaciones")
      .select(
        "id, correlativo, ref_asli, cliente, especie, naviera, nave, booking, estado_operacion, deleted_at, created_at"
      )
      .not("deleted_at", "is", null);
    if (empresaNombres.length > 0) {
      q = q.in("cliente", empresaNombres);
    }
    const { data, error } = await q.order("deleted_at", { ascending: false });

    if (error) {
      console.error("Error loading operaciones:", error);
    } else {
      setOperaciones(data || []);
    }
    setLoading(false);
  }, [supabase, authLoading, isCliente, empresaNombres]);

  useEffect(() => {
    if (!authLoading) void fetchOperaciones();
    else setOperaciones([]);
  }, [authLoading, fetchOperaciones]);

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
        <div className="flex items-center gap-3 px-5 py-4 bg-white rounded-2xl border border-neutral-200 shadow-sm text-neutral-500 text-sm font-medium">
          <Icon icon="typcn:refresh" className="w-5 h-5 animate-spin text-brand-blue" />
          <span>{tr.loading}</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto p-3 sm:p-4 lg:p-5">
      <div className="w-full max-w-[1600px] mx-auto space-y-4">

        {/* Header — mismo estilo que Mis Reservas */}
        <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
          <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-600 flex items-center justify-center flex-shrink-0">
                <Icon icon="typcn:trash" width={20} height={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-neutral-900 leading-tight">
                  {t.sidebar.papelera}
                </h1>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {operaciones.length} {tr.itemsInTrash}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {selectedIds.size > 0 && (
                <>
                  <button
                    onClick={() => handleRestore(Array.from(selectedIds))}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  >
                    <Icon icon="typcn:arrow-back" width={15} height={15} />
                    {tr.restore} ({selectedIds.size})
                  </button>
                  <button
                    onClick={() => handleDeletePermanently(Array.from(selectedIds))}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <Icon icon="typcn:delete" width={15} height={15} />
                    {tr.delete} ({selectedIds.size})
                  </button>
                </>
              )}
              {operaciones.length > 0 && (
                <button
                  onClick={handleEmptyTrash}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-red-200 text-red-600 bg-white rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <Icon icon="typcn:trash" width={15} height={15} />
                  {tr.emptyTrash}
                </button>
              )}
              <button
                onClick={() => void fetchOperaciones()}
                className="p-2 border border-neutral-200 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors text-neutral-500"
                title={t.misReservas.refresh}
              >
                <Icon icon="typcn:refresh" width={18} height={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabla — mismo contenedor y estilo que Mis Reservas */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === operaciones.length && operaciones.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-neutral-300 accent-brand-blue"
                    />
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-400 uppercase tracking-wider whitespace-nowrap">{tr.colRef}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-400 uppercase tracking-wider whitespace-nowrap">{tr.colClient}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-400 uppercase tracking-wider whitespace-nowrap">{tr.colSpecies}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-400 uppercase tracking-wider whitespace-nowrap">{tr.colCarrier}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-400 uppercase tracking-wider whitespace-nowrap">{tr.colVessel}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-400 uppercase tracking-wider whitespace-nowrap">{tr.colBooking}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-400 uppercase tracking-wider whitespace-nowrap">{tr.colStatus}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-400 uppercase tracking-wider whitespace-nowrap min-w-[7.5rem]">{tr.colDeleted}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-400 uppercase tracking-wider">{tr.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {operaciones.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center">
                          <Icon icon="typcn:trash" width={24} height={24} className="text-neutral-400" />
                        </span>
                        <p className="text-neutral-500 font-medium text-sm">{tr.trashEmpty}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  operaciones.map((op, idx) => {
                    const cfg = op.estado_operacion ? estadoConfig[op.estado_operacion] : null;
                    return (
                      <tr
                        key={op.id}
                        className={`border-b border-neutral-50 transition-colors ${
                          selectedIds.has(op.id)
                            ? "bg-brand-blue/5"
                            : idx % 2 === 0
                            ? "bg-white hover:bg-neutral-50/80"
                            : "bg-neutral-50/40 hover:bg-neutral-50/80"
                        }`}
                      >
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(op.id)}
                            onChange={() => handleSelect(op.id)}
                            className="w-4 h-4 rounded border-neutral-300 accent-brand-blue"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-brand-blue text-xs">
                            {op.ref_asli || (op.correlativo ? `#${op.correlativo}` : "-")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-neutral-700 font-medium">{op.cliente || "-"}</td>
                        <td className="px-4 py-3 text-center text-xs text-neutral-600">{op.especie || "-"}</td>
                        <td className="px-4 py-3 text-center text-xs text-neutral-600">{op.naviera || "-"}</td>
                        <td className="px-4 py-3 text-center text-xs text-neutral-600">{op.nave || "-"}</td>
                        <td className="px-4 py-3 text-center text-xs font-mono text-neutral-600">{op.booking || "-"}</td>
                        <td className="px-4 py-3 text-center">
                          {cfg ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
                              {op.estado_operacion}
                            </span>
                          ) : (
                            <span className="text-neutral-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-neutral-600 font-medium min-w-[7.5rem]">{formatDate(op.deleted_at)}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleRestore([op.id])}
                              disabled={actionLoading}
                              className="p-1.5 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                              title={tr.restore}
                            >
                              <Icon icon="typcn:arrow-back" width={16} height={16} />
                            </button>
                            <button
                              onClick={() => handleDeletePermanently([op.id])}
                              disabled={actionLoading}
                              className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title={tr.delete}
                            >
                              <Icon icon="typcn:delete" width={16} height={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
