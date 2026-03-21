import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { sileo } from "sileo";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

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
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; confirmLabel: string; onConfirm: () => void } | null>(null);

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
      sileo.error({ title: tr.errorRestoring });
    } else {
      setSelectedIds(new Set());
      await fetchOperaciones();
    }
    setActionLoading(false);
  };

  const handleDeletePermanently = (ids: string[]) => {
    if (!supabase || ids.length === 0) return;

    setConfirmDialog({
      title: "Eliminar definitivamente",
      message: tr.confirmDelete.replace("{count}", String(ids.length)),
      confirmLabel: tr.delete,
      onConfirm: async () => {
        setConfirmDialog(null);
        setActionLoading(true);

        const { error } = await supabase.from("operaciones").delete().in("id", ids);

        if (error) {
          console.error("Error deleting:", error);
          sileo.error({ title: tr.errorDeleting });
        } else {
          setSelectedIds(new Set());
          await fetchOperaciones();
        }
        setActionLoading(false);
      },
    });
  };

  const handleEmptyTrash = () => {
    if (!supabase || operaciones.length === 0) return;

    setConfirmDialog({
      title: "Vaciar papelera",
      message: tr.confirmEmptyTrash.replace("{count}", String(operaciones.length)),
      confirmLabel: tr.emptyTrash,
      onConfirm: async () => {
        setConfirmDialog(null);
        setActionLoading(true);

        const { error } = await supabase
          .from("operaciones")
          .delete()
          .not("deleted_at", "is", null);

        if (error) {
          console.error("Error emptying trash:", error);
          sileo.error({ title: tr.errorEmptyingTrash });
        } else {
          setSelectedIds(new Set());
          await fetchOperaciones();
        }
        setActionLoading(false);
      },
    });
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

  const allSelected = selectedIds.size === operaciones.length && operaciones.length > 0;

  return (
    <>
    <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-neutral-800 via-neutral-700 to-neutral-600 px-4 sm:px-6 py-5 sm:py-6">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
              <Icon icon="lucide:trash-2" width={22} height={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">{t.sidebar.papelera}</h1>
              <p className="text-xs text-white/60 mt-0.5">
                {operaciones.length === 0
                  ? tr.trashEmpty
                  : `${operaciones.length} ${tr.itemsInTrash}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={() => handleRestore(Array.from(selectedIds))}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-xl hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                >
                  <Icon icon="lucide:rotate-ccw" width={14} height={14} />
                  {tr.restore} ({selectedIds.size})
                </button>
                <button
                  onClick={() => handleDeletePermanently(Array.from(selectedIds))}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-red-500/20 text-red-300 border border-red-400/30 rounded-xl hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  <Icon icon="lucide:trash-2" width={14} height={14} />
                  {tr.delete} ({selectedIds.size})
                </button>
              </>
            )}
            {operaciones.length > 0 && selectedIds.size === 0 && (
              <button
                onClick={handleEmptyTrash}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white/10 text-white/80 border border-white/20 rounded-xl hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                <Icon icon="lucide:trash" width={14} height={14} />
                {tr.emptyTrash}
              </button>
            )}
            <button
              onClick={() => void fetchOperaciones()}
              disabled={actionLoading}
              className="p-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors text-white/70"
              title={t.misReservas.refresh}
            >
              <Icon icon="typcn:refresh" width={17} height={17} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 lg:p-5">
        <div className="w-full max-w-[1600px] mx-auto space-y-3">

          {/* Warning banner */}
          {operaciones.length > 0 && (
            <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              <Icon icon="lucide:alert-triangle" width={15} height={15} className="flex-shrink-0 mt-0.5 text-amber-500" />
              <span>Los elementos en la papelera pueden eliminarse permanentemente. Restaura lo que necesites antes de vaciarla.</span>
            </div>
          )}

          {/* Selection toolbar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-brand-blue/5 border border-brand-blue/20 rounded-xl">
              <span className="text-xs font-semibold text-brand-blue">
                {selectedIds.size} {selectedIds.size === 1 ? "elemento seleccionado" : "elementos seleccionados"}
              </span>
              <button onClick={() => setSelectedIds(new Set())} className="text-xs text-neutral-500 hover:text-neutral-700">
                Deseleccionar todo
              </button>
            </div>
          )}

          {/* Empty state */}
          {operaciones.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-16 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center">
                <Icon icon="lucide:trash-2" width={28} height={28} className="text-neutral-300" />
              </div>
              <div className="text-center">
                <p className="text-neutral-700 font-semibold text-sm">{tr.trashEmpty}</p>
                <p className="text-neutral-400 text-xs mt-1">No hay operaciones eliminadas</p>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {operaciones.map((op) => {
                  const cfg = op.estado_operacion ? estadoConfig[op.estado_operacion] : null;
                  const sel = selectedIds.has(op.id);
                  return (
                    <div
                      key={op.id}
                      onClick={() => handleSelect(op.id)}
                      className={`bg-white rounded-2xl border shadow-sm p-4 cursor-pointer transition-all ${
                        sel ? "border-brand-blue/40 bg-brand-blue/5 ring-1 ring-brand-blue/20" : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={sel}
                            onChange={() => handleSelect(op.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded border-neutral-300 accent-brand-blue flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-brand-blue text-sm">
                                {op.ref_asli || (op.correlativo ? `#${op.correlativo}` : "-")}
                              </span>
                              {cfg && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                  {op.estado_operacion}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-600 font-medium mt-0.5 truncate">{op.cliente || "-"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); void handleRestore([op.id]); }}
                            disabled={actionLoading}
                            className="p-1.5 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                            title={tr.restore}
                          >
                            <Icon icon="lucide:rotate-ccw" width={15} height={15} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); void handleDeletePermanently([op.id]); }}
                            disabled={actionLoading}
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title={tr.delete}
                          >
                            <Icon icon="lucide:trash-2" width={15} height={15} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs text-neutral-500">
                        {op.especie && (
                          <div className="flex items-center gap-1.5 col-span-2">
                            <Icon icon="lucide:package" width={12} height={12} className="flex-shrink-0 text-neutral-400" />
                            <span className="truncate">{op.especie}</span>
                          </div>
                        )}
                        {op.naviera && (
                          <div className="flex items-center gap-1.5">
                            <Icon icon="lucide:ship" width={12} height={12} className="flex-shrink-0 text-neutral-400" />
                            <span className="truncate">{op.naviera}</span>
                          </div>
                        )}
                        {op.nave && (
                          <div className="flex items-center gap-1.5">
                            <Icon icon="lucide:anchor" width={12} height={12} className="flex-shrink-0 text-neutral-400" />
                            <span className="truncate">{op.nave}</span>
                          </div>
                        )}
                        {op.booking && (
                          <div className="flex items-center gap-1.5">
                            <Icon icon="lucide:hash" width={12} height={12} className="flex-shrink-0 text-neutral-400" />
                            <span className="font-mono truncate">{op.booking}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 col-span-2 pt-1 border-t border-neutral-100 mt-1">
                          <Icon icon="lucide:clock" width={12} height={12} className="flex-shrink-0 text-red-400" />
                          <span className="text-red-500 font-medium">Eliminado: {formatDate(op.deleted_at)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-100">
                        <th className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={handleSelectAll}
                            className="w-4 h-4 rounded border-neutral-300 accent-brand-blue"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider whitespace-nowrap">{tr.colRef}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider whitespace-nowrap">{tr.colClient}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider whitespace-nowrap">{tr.colSpecies}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider whitespace-nowrap">{tr.colCarrier}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider whitespace-nowrap">{tr.colVessel}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider whitespace-nowrap">{tr.colBooking}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider whitespace-nowrap">{tr.colStatus}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider whitespace-nowrap min-w-[8rem]">{tr.colDeleted}</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-400 uppercase tracking-wider">{tr.colActions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      {operaciones.map((op, idx) => {
                        const cfg = op.estado_operacion ? estadoConfig[op.estado_operacion] : null;
                        const sel = selectedIds.has(op.id);
                        return (
                          <tr
                            key={op.id}
                            onClick={() => handleSelect(op.id)}
                            className={`cursor-pointer transition-colors ${
                              sel
                                ? "bg-brand-blue/5"
                                : idx % 2 === 0
                                ? "bg-white hover:bg-neutral-50/80"
                                : "bg-neutral-50/40 hover:bg-neutral-50/80"
                            }`}
                          >
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={sel}
                                onChange={() => handleSelect(op.id)}
                                className="w-4 h-4 rounded border-neutral-300 accent-brand-blue"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-brand-blue text-xs">
                                {op.ref_asli || (op.correlativo ? `#${op.correlativo}` : "-")}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-neutral-700 font-medium whitespace-nowrap">{op.cliente || "-"}</td>
                            <td className="px-4 py-3 text-xs text-neutral-600">{op.especie || "-"}</td>
                            <td className="px-4 py-3 text-xs text-neutral-600 whitespace-nowrap">{op.naviera || "-"}</td>
                            <td className="px-4 py-3 text-xs text-neutral-600 whitespace-nowrap">{op.nave || "-"}</td>
                            <td className="px-4 py-3 text-xs font-mono text-neutral-600">{op.booking || "-"}</td>
                            <td className="px-4 py-3">
                              {cfg ? (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
                                  {op.estado_operacion}
                                </span>
                              ) : (
                                <span className="text-neutral-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-red-500 font-medium min-w-[8rem] whitespace-nowrap">
                              {formatDate(op.deleted_at)}
                            </td>
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => void handleRestore([op.id])}
                                  disabled={actionLoading}
                                  className="p-1.5 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                                  title={tr.restore}
                                >
                                  <Icon icon="lucide:rotate-ccw" width={15} height={15} />
                                </button>
                                <button
                                  onClick={() => void handleDeletePermanently([op.id])}
                                  disabled={actionLoading}
                                  className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                  title={tr.delete}
                                >
                                  <Icon icon="lucide:trash-2" width={15} height={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Table footer */}
                <div className="px-4 py-2.5 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
                  <span className="text-xs text-neutral-400">
                    {operaciones.length} {operaciones.length === 1 ? "elemento" : "elementos"} en papelera
                  </span>
                  {selectedIds.size > 0 && (
                    <span className="text-xs font-semibold text-brand-blue">
                      {selectedIds.size} seleccionado{selectedIds.size !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
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
