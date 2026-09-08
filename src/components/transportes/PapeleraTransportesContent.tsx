import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { sileo } from "sileo";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { aplicarFiltroTemporada } from "@/lib/temporadas";
import { useTemporadaActiva } from "@/lib/useTemporadaActiva";
import { useNeonTheme } from "@/lib/ui/neonTheme";

type Operacion = {
  id: string;
  correlativo: number | null;
  ref_asli: string | null;
  cliente: string | null;
  naviera: string | null;
  nave: string | null;
  booking: string | null;
  transporte: string | null;
  chofer: string | null;
  contenedor: string | null;
  tramo: string | null;
  tipo_reserva_transporte: string | null;
  transporte_deleted_at: string;
};

export function PapeleraTransportesContent() {
  const { t, locale } = useLocale();
  const { isCliente, isSuperadmin, empresaNombres, isLoading: authLoading } = useAuth();
  const tr = t.papeleraTransportes;
  const [theme] = useNeonTheme();
  const { temporadaActiva, temporadaLoading } = useTemporadaActiva();

  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; message: string; confirmLabel: string; onConfirm: () => void;
  } | null>(null);

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

    let q = supabase
      .from("operaciones")
      .select(
        "id, correlativo, ref_asli, cliente, naviera, nave, booking, transporte, chofer, contenedor, tramo, tipo_reserva_transporte, transporte_deleted_at"
      )
      .is("deleted_at", null)
      .not("transporte_deleted_at", "is", null);

    if (empresaNombres.length > 0) {
      q = q.in("cliente", empresaNombres);
    }
    q = aplicarFiltroTemporada(q, temporadaActiva);

    const { data, error } = await q.order("transporte_deleted_at", { ascending: false });

    if (error) {
      if (process.env.NODE_ENV === "development") console.error("Error loading papelera transportes:", error);
    } else {
      setOperaciones(data || []);
    }
    setLoading(false);
  }, [supabase, authLoading, temporadaLoading, temporadaActiva, isCliente, empresaNombres]);

  useEffect(() => {
    if (!authLoading) void fetchOperaciones();
    else setOperaciones([]);
  }, [authLoading, fetchOperaciones]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd-MM-yyyy HH:mm", { locale: locale === "es" ? es : undefined });
    } catch {
      return dateStr;
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === operaciones.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(operaciones.map((op) => op.id)));
  };

  const handleSelect = (id: string) => {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  };

  const handleRestore = async (ids: string[]) => {
    if (!supabase || ids.length === 0) return;
    setActionLoading(true);
    const { error } = await supabase
      .from("operaciones")
      .update({ transporte_deleted_at: null })
      .in("id", ids);
    if (error) {
      sileo.error({ title: tr.errorRestoring });
    } else {
      setSelectedIds(new Set());
      await fetchOperaciones();
    }
    setActionLoading(false);
  };

  const handleDeletePermanently = async (ids: string[]) => {
    if (!supabase || ids.length === 0) return;
    setConfirmDialog({
      title: tr.confirmDelete.replace("{count}", String(ids.length)).split(".")[0] || "Eliminar definitivamente",
      message: tr.confirmDelete.replace("{count}", String(ids.length)),
      confirmLabel: "Eliminar",
      onConfirm: () => { setConfirmDialog(null); void doDeletePermanently(ids); },
    });
  };

  const doDeletePermanently = async (ids: string[]) => {
    if (!supabase) return;
    setActionLoading(true);

    const cleared: Record<string, unknown> = {
      enviado_transporte: false,
      tipo_reserva_transporte: null,
      transporte_deleted_at: null,
      transporte: null,
      chofer: null,
      rut_chofer: null,
      telefono_chofer: null,
      patente_camion: null,
      patente_remolque: null,
      contenedor: null,
      sello: null,
      tara: null,
      citacion: null,
      llegada_planta: null,
      salida_planta: null,
      deposito: null,
      agendamiento_retiro: null,
      inicio_stacking: null,
      fin_stacking: null,
      ingreso_stacking: null,
      tramo: null,
      valor_tramo: null,
      moneda: null,
      observaciones: null,
    };

    const { error } = await supabase.from("operaciones").update(cleared).in("id", ids);

    if (error) {
      sileo.error({ title: tr.errorDeleting });
    } else {
      setSelectedIds(new Set());
      await fetchOperaciones();
    }
    setActionLoading(false);
  };

  const handleEmptyTrash = () => {
    if (!supabase || operaciones.length === 0) return;
    setConfirmDialog({
      title: "Vaciar papelera",
      message: tr.confirmEmptyTrash.replace("{count}", String(operaciones.length)),
      confirmLabel: "Vaciar",
      onConfirm: () => {
        setConfirmDialog(null);
        const allIds = operaciones.map((o) => o.id);
        void doDeletePermanently(allIds);
      },
    });
  };

  const tipoBadge = (tipo: string | null) => {
    if (tipo === "asli") return { label: "ASLI", cls: "bg-dash-neon/15 text-dash-fg border-dash-neon/35" };
    if (tipo === "externa") return { label: "Externa", cls: "bg-violet-500/15 text-violet-300 border-violet-400/35" };
    return { label: "—", cls: "bg-dash-control text-dash-muted border-dash-border" };
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
                  <h1 className="truncate text-lg font-bold tracking-tight text-dash-fg sm:text-xl">{tr.title}</h1>
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
                      onClick={() => void handleRestore(Array.from(selectedIds))}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/25 disabled:opacity-50"
                    >
                      <Icon icon="lucide:undo-2" width={14} height={14} />
                      {tr.restore} ({selectedIds.size})
                    </button>
                    {isSuperadmin && (
                      <button
                        onClick={() => void handleDeletePermanently(Array.from(selectedIds))}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/35 bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/25 disabled:opacity-50"
                      >
                        <Icon icon="lucide:trash-2" width={14} height={14} />
                        {tr.deletePermanent} ({selectedIds.size})
                      </button>
                    )}
                  </>
                )}
                {isSuperadmin && operaciones.length > 0 && selectedIds.size === 0 && (
                  <button
                    onClick={() => void handleEmptyTrash()}
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
                  title={tr.refresh}
                >
                  <Icon icon="typcn:refresh" width={16} height={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex-1 space-y-3 p-3 sm:p-4">
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
                  <p className="mt-1 text-sm text-dash-muted">{tr.subtitle}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2 md:hidden">
                  {operaciones.map((op) => {
                    const badge = tipoBadge(op.tipo_reserva_transporte);
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
                                  {op.ref_asli || (op.correlativo ? `#${op.correlativo}` : "—")}
                                </span>
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>
                                  {badge.label}
                                </span>
                              </div>
                              <p className="mt-0.5 truncate text-sm font-medium text-dash-muted">{op.cliente || "-"}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => void handleRestore([op.id])}
                              disabled={actionLoading}
                              className="rounded-lg p-1.5 text-dash-muted transition-colors hover:bg-emerald-500/15 hover:text-emerald-400 disabled:opacity-50"
                              title={tr.restore}
                            >
                              <Icon icon="lucide:undo-2" width={15} height={15} />
                            </button>
                            {isSuperadmin && (
                              <button
                                onClick={() => void handleDeletePermanently([op.id])}
                                disabled={actionLoading}
                                className="rounded-lg p-1.5 text-dash-muted transition-colors hover:bg-red-500/15 hover:text-red-400 disabled:opacity-50"
                                title={tr.deletePermanent}
                              >
                                <Icon icon="lucide:trash-2" width={15} height={15} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-dash-muted">
                          {op.naviera && (
                            <div className="flex items-center gap-1.5">
                              <Icon icon="lucide:ship" width={14} height={14} className="shrink-0 text-dash-muted" />
                              <span className="truncate">{op.naviera}</span>
                            </div>
                          )}
                          {op.transporte && (
                            <div className="flex items-center gap-1.5">
                              <Icon icon="lucide:truck" width={14} height={14} className="shrink-0 text-dash-muted" />
                              <span className="truncate">{op.transporte}</span>
                            </div>
                          )}
                          {op.contenedor && (
                            <div className="flex items-center gap-1.5">
                              <Icon icon="lucide:container" width={14} height={14} className="shrink-0 text-dash-muted" />
                              <span className="truncate font-mono">{op.contenedor}</span>
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
                            <span className="font-medium text-red-400">Eliminado: {formatDate(op.transporte_deleted_at)}</span>
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
                          <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-dash-muted">{tr.colCarrier}</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-dash-muted">{tr.colBooking}</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-dash-muted">{tr.colTransport}</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-dash-muted">{tr.colContainer}</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-dash-muted">{tr.colType}</th>
                          <th className="min-w-[8rem] whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-dash-muted">{tr.colDeleted}</th>
                          <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-dash-muted">{tr.colActions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {operaciones.map((op, idx) => {
                          const badge = tipoBadge(op.tipo_reserva_transporte);
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
                                  {op.ref_asli || (op.correlativo ? `#${op.correlativo}` : "-")}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-dash-fg">{op.cliente || "-"}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-sm text-dash-muted">{op.naviera || "-"}</td>
                              <td className="px-4 py-3 font-mono text-sm text-dash-muted">{op.booking || "-"}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-sm text-dash-muted">{op.transporte || "-"}</td>
                              <td className="px-4 py-3 font-mono text-sm text-dash-muted">{op.contenedor || "-"}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>
                                  {badge.label}
                                </span>
                              </td>
                              <td className="min-w-[8rem] whitespace-nowrap px-4 py-3 text-sm font-medium text-red-400">
                                {formatDate(op.transporte_deleted_at)}
                              </td>
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => void handleRestore([op.id])}
                                    disabled={actionLoading}
                                    className="rounded-lg p-1.5 text-dash-muted transition-colors hover:bg-emerald-500/15 hover:text-emerald-400 disabled:opacity-50"
                                    title={tr.restore}
                                  >
                                    <Icon icon="lucide:undo-2" width={15} height={15} />
                                  </button>
                                  {isSuperadmin && (
                                    <button
                                      onClick={() => void handleDeletePermanently([op.id])}
                                      disabled={actionLoading}
                                      className="rounded-lg p-1.5 text-dash-muted transition-colors hover:bg-red-500/15 hover:text-red-400 disabled:opacity-50"
                                      title={tr.deletePermanent}
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
          cancelLabel="Cancelar"
          variant="danger"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </>
  );
}
