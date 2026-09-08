import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import {
  applyOperacionesClienteFilter,
  shouldSkipOperacionesForCliente,
} from "@/lib/auth/operacionesClienteScope";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { sileo } from "sileo";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { displayRefAsli } from "@/lib/refAsli";
import { getEstadoOperacionStyle } from "@/lib/ui/estadoOperacion";
import { etiquetaEstado } from "@/lib/operaciones/estados";
import { aplicarFiltroTemporada } from "@/lib/temporadas";
import { useTemporadaActiva } from "@/lib/useTemporadaActiva";
import { useNeonTheme } from "@/lib/ui/neonTheme";

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
  const { isCliente, isEjecutivo, isSuperadmin, empresaNombres, isLoading: authLoading } = useAuth();
  const tr = t.papelera;
  const [theme] = useNeonTheme();
  const { temporadaActiva, temporadaLoading } = useTemporadaActiva();
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
    if (!supabase || authLoading || temporadaLoading) return;
    setLoading(true);

    const scope = { isCliente, isEjecutivo, empresaNombres };
    if (shouldSkipOperacionesForCliente(scope)) {
      setOperaciones([]);
      setLoading(false);
      return;
    }

    let q = supabase
      .from("operaciones")
      .select(
        "id, correlativo, ref_asli, cliente, especie, naviera, nave, booking, estado_operacion, deleted_at, created_at"
      )
      .not("deleted_at", "is", null);

    q = applyOperacionesClienteFilter(q, scope);
    q = aplicarFiltroTemporada(q, temporadaActiva);
    const { data, error } = await q.order("deleted_at", { ascending: false });

    if (error) {
      console.error("Error loading operaciones:", error);
    } else {
      setOperaciones(data || []);
    }
    setLoading(false);
  }, [supabase, authLoading, temporadaLoading, temporadaActiva, isCliente, isEjecutivo, empresaNombres]);

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
      <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
        <main className="dash-page relative flex min-h-0 flex-1 items-center justify-center p-4" role="main">
          <div className="dash-card flex items-center gap-3 rounded-xl px-5 py-4 text-sm font-medium text-dash-muted">
            <Icon icon="typcn:refresh" className="h-4 w-4 animate-spin text-dash-neon" />
            <span>{tr.loading}</span>
          </div>
        </main>
      </div>
    );
  }

  const allSelected = selectedIds.size === operaciones.length && operaciones.length > 0;

  return (
    <>
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
                  <Icon icon="lucide:trash-2" width={22} height={22} className="text-dash-neon" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-bold tracking-tight text-dash-fg sm:text-xl">{t.sidebar.papelera}</h1>
                  <p className="mt-0.5 line-clamp-1 text-xs text-dash-muted sm:text-sm">
                    {operaciones.length === 0
                      ? tr.trashEmpty
                      : `${operaciones.length} ${tr.itemsInTrash}`}
                  </p>
                </div>
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                {selectedIds.size > 0 && (
                  <>
                    <button
                      onClick={() => handleRestore(Array.from(selectedIds))}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/25 disabled:opacity-50"
                    >
                      <Icon icon="lucide:rotate-ccw" width={14} height={14} />
                      {tr.restore} ({selectedIds.size})
                    </button>
                    {isSuperadmin && (
                      <button
                        onClick={() => handleDeletePermanently(Array.from(selectedIds))}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/35 bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/25 disabled:opacity-50"
                      >
                        <Icon icon="lucide:trash-2" width={14} height={14} />
                        {tr.delete} ({selectedIds.size})
                      </button>
                    )}
                  </>
                )}
                {isSuperadmin && operaciones.length > 0 && selectedIds.size === 0 && (
                  <button
                    onClick={handleEmptyTrash}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-dash-control px-3 py-2 text-sm font-semibold text-dash-fg transition-colors hover:bg-dash-neon/15 disabled:opacity-50"
                  >
                    <Icon icon="lucide:trash" width={14} height={14} />
                    {tr.emptyTrash}
                  </button>
                )}
                <button
                  onClick={() => void fetchOperaciones()}
                  disabled={actionLoading}
                  className="rounded-lg border border-dash-border bg-dash-control p-2 text-dash-muted transition-colors hover:bg-dash-neon/15 hover:text-dash-fg"
                  title={t.misReservas.refresh}
                >
                  <Icon icon="typcn:refresh" width={16} height={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex-1 space-y-3 p-3 sm:p-4">
            {operaciones.length > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
                <Icon icon="lucide:alert-triangle" width={16} height={16} className="mt-0.5 shrink-0 text-amber-500" />
                <span>Los elementos en la papelera pueden eliminarse permanentemente. Restaura lo que necesites antes de vaciarla.</span>
              </div>
            )}

            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-dash-neon/35 bg-dash-neon/10 px-4 py-2.5">
                <span className="text-sm font-semibold text-dash-fg">
                  {selectedIds.size} {selectedIds.size === 1 ? "elemento seleccionado" : "elementos seleccionados"}
                </span>
                <button onClick={() => setSelectedIds(new Set())} className="text-sm text-dash-muted hover:text-dash-fg">
                  Deseleccionar todo
                </button>
              </div>
            )}

            {operaciones.length === 0 ? (
              <div className="dash-card flex flex-col items-center gap-3 rounded-xl px-4 py-16">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dash-border bg-dash-control">
                  <Icon icon="lucide:trash-2" width={26} height={26} className="text-dash-muted" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-dash-fg">{tr.trashEmpty}</p>
                  <p className="mt-1 text-sm text-dash-muted">No hay operaciones eliminadas</p>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2 md:hidden">
                  {operaciones.map((op) => {
                    const cfg = getEstadoOperacionStyle(op.estado_operacion);
                    const sel = selectedIds.has(op.id);
                    return (
                      <div
                        key={op.id}
                        onClick={() => handleSelect(op.id)}
                        className={`dash-card cursor-pointer rounded-xl border p-4 transition-all ${
                          sel
                            ? "border-dash-neon/50 bg-dash-neon/15 ring-2 ring-dash-neon/25"
                            : "border-dash-border hover:border-dash-neon/35"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <input
                              type="checkbox"
                              checked={sel}
                              onChange={() => handleSelect(op.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 shrink-0 rounded accent-[var(--dash-neon)]"
                            />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-dash-fg">
                                  {displayRefAsli(op.ref_asli, op.correlativo, "-")}
                                </span>
                                {cfg && (
                                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                                    {etiquetaEstado(op.estado_operacion)}
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 truncate text-sm font-medium text-dash-muted">{op.cliente || "-"}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); void handleRestore([op.id]); }}
                              disabled={actionLoading}
                              className="rounded-lg p-1.5 text-dash-muted transition-colors hover:bg-emerald-500/15 hover:text-emerald-400 disabled:opacity-50"
                              title={tr.restore}
                            >
                              <Icon icon="lucide:rotate-ccw" width={15} height={15} />
                            </button>
                            {isSuperadmin && (
                              <button
                                onClick={(e) => { e.stopPropagation(); void handleDeletePermanently([op.id]); }}
                                disabled={actionLoading}
                                className="rounded-lg p-1.5 text-dash-muted transition-colors hover:bg-red-500/15 hover:text-red-400 disabled:opacity-50"
                                title={tr.delete}
                              >
                                <Icon icon="lucide:trash-2" width={15} height={15} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-dash-muted">
                          {op.especie && (
                            <div className="col-span-2 flex items-center gap-1.5">
                              <Icon icon="lucide:package" width={14} height={14} className="shrink-0 text-dash-muted" />
                              <span className="truncate">{op.especie}</span>
                            </div>
                          )}
                          {op.naviera && (
                            <div className="flex items-center gap-1.5">
                              <Icon icon="lucide:ship" width={14} height={14} className="shrink-0 text-dash-muted" />
                              <span className="truncate">{op.naviera}</span>
                            </div>
                          )}
                          {op.nave && (
                            <div className="flex items-center gap-1.5">
                              <Icon icon="lucide:anchor" width={14} height={14} className="shrink-0 text-dash-muted" />
                              <span className="truncate">{op.nave}</span>
                            </div>
                          )}
                          {op.booking && (
                            <div className="flex items-center gap-1.5">
                              <Icon icon="lucide:hash" width={14} height={14} className="shrink-0 text-dash-muted" />
                              <span className="truncate font-mono">{op.booking}</span>
                            </div>
                          )}
                          <div className="col-span-2 mt-1 flex items-center gap-1.5 border-t border-dash-border pt-1">
                            <Icon icon="lucide:clock" width={14} height={14} className="shrink-0 text-red-400" />
                            <span className="font-medium text-red-400">Eliminado: {formatDate(op.deleted_at)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="dash-card-static hidden overflow-hidden rounded-xl border border-dash-border md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-dash-border bg-[color-mix(in_srgb,var(--dash-control)_92%,transparent)]">
                          <th className="w-10 px-4 py-3">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={handleSelectAll}
                              className="h-4 w-4 rounded accent-[var(--dash-neon)]"
                            />
                          </th>
                          <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-dash-muted">{tr.colRef}</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-dash-muted">{tr.colClient}</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-dash-muted">{tr.colSpecies}</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-dash-muted">{tr.colCarrier}</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-dash-muted">{tr.colVessel}</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-dash-muted">{tr.colBooking}</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-dash-muted">{tr.colStatus}</th>
                          <th className="min-w-[8rem] whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-dash-muted">{tr.colDeleted}</th>
                          <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-dash-muted">{tr.colActions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {operaciones.map((op, idx) => {
                          const cfg = getEstadoOperacionStyle(op.estado_operacion);
                          const sel = selectedIds.has(op.id);
                          return (
                            <tr
                              key={op.id}
                              onClick={() => handleSelect(op.id)}
                              className={`cursor-pointer transition-colors ${
                                sel
                                  ? "bg-dash-neon/15"
                                  : idx % 2 === 0
                                  ? "bg-transparent hover:bg-dash-neon/10"
                                  : "bg-dash-control/30 hover:bg-dash-neon/10"
                              }`}
                            >
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={sel}
                                  onChange={() => handleSelect(op.id)}
                                  className="h-4 w-4 rounded accent-[var(--dash-neon)]"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm font-bold text-dash-fg">
                                  {displayRefAsli(op.ref_asli, op.correlativo, "-")}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-dash-fg">{op.cliente || "-"}</td>
                              <td className="px-4 py-3 text-sm text-dash-muted">{op.especie || "-"}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-sm text-dash-muted">{op.naviera || "-"}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-sm text-dash-muted">{op.nave || "-"}</td>
                              <td className="px-4 py-3 font-mono text-sm text-dash-muted">{op.booking || "-"}</td>
                              <td className="px-4 py-3">
                                {cfg ? (
                                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
                                    {etiquetaEstado(op.estado_operacion)}
                                  </span>
                                ) : (
                                  <span className="text-sm text-dash-muted">-</span>
                                )}
                              </td>
                              <td className="min-w-[8rem] whitespace-nowrap px-4 py-3 text-sm font-medium text-red-400">
                                {formatDate(op.deleted_at)}
                              </td>
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => void handleRestore([op.id])}
                                    disabled={actionLoading}
                                    className="rounded-lg p-1.5 text-dash-muted transition-colors hover:bg-emerald-500/15 hover:text-emerald-400 disabled:opacity-50"
                                    title={tr.restore}
                                  >
                                    <Icon icon="lucide:rotate-ccw" width={15} height={15} />
                                  </button>
                                  {isSuperadmin && (
                                    <button
                                      onClick={() => void handleDeletePermanently([op.id])}
                                      disabled={actionLoading}
                                      className="rounded-lg p-1.5 text-dash-muted transition-colors hover:bg-red-500/15 hover:text-red-400 disabled:opacity-50"
                                      title={tr.delete}
                                    >
                                      <Icon icon="lucide:trash-2" width={15} height={15} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between border-t border-dash-border bg-dash-control/50 px-4 py-2.5">
                    <span className="text-sm text-dash-muted">
                      {operaciones.length} {operaciones.length === 1 ? "elemento" : "elementos"} en papelera
                    </span>
                    {selectedIds.size > 0 && (
                      <span className="text-sm font-semibold text-dash-fg">
                        {selectedIds.size} seleccionado{selectedIds.size !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
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
