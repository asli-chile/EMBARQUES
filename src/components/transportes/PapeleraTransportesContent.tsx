import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { sileo } from "sileo";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { modulePageBg, moduleHeroRounded, moduleCard } from "@/lib/ui/moduleStyles";

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
    if (!supabase || authLoading) return;
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

    const { data, error } = await q.order("transporte_deleted_at", { ascending: false });

    if (error) {
      if (process.env.NODE_ENV === "development") console.error("Error loading papelera transportes:", error);
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
    if (tipo === "asli") return { label: "ASLI", cls: "bg-brand-blue/10 text-brand-blue border-brand-blue/20" };
    if (tipo === "externa") return { label: "Externa", cls: "bg-violet-50 text-violet-700 border-violet-200" };
    return { label: "—", cls: "bg-neutral-100 text-neutral-500 border-neutral-200" };
  };

  if (loading) {
    return (
      <main className={`flex-1 ${modulePageBg} min-h-0 overflow-auto p-4 flex items-center justify-center`}>
        <div className="flex items-center gap-3 px-5 py-4 bg-white rounded-2xl border border-brand-blue/15 shadow-sm text-brand-blue/70 text-base font-medium">
          <Icon icon="typcn:refresh" className="w-5 h-5 animate-spin text-brand-blue" />
          <span>{tr.loading}</span>
        </div>
      </main>
    );
  }

  return (
    <>
    <main className={`flex-1 ${modulePageBg} min-h-0 overflow-auto p-3 sm:p-4 lg:p-5`}>
      <div className="w-full max-w-[1600px] mx-auto space-y-4">

        {/* Hero */}
        <div className={moduleHeroRounded}>
          <div className="px-5 py-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-lg bg-white/15 border border-white/25 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Icon icon="lucide:trash-2" width={24} height={24} className="text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight">{tr.title}</h1>
                <p className="text-base text-white/75 mt-1">{tr.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3.5 py-2.5">
                <Icon icon="lucide:package-x" width={16} height={16} className="text-white/80" />
                <span className="text-base font-bold">{operaciones.length} {tr.itemsInTrash}</span>
              </div>
              {isSuperadmin && operaciones.length > 0 && (
                <button
                  onClick={() => void handleEmptyTrash()}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-base font-semibold bg-red-500/80 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
                >
                  <Icon icon="lucide:trash-2" width={16} height={16} />
                  <span className="hidden sm:inline">{tr.emptyTrash}</span>
                </button>
              )}
              <button
                onClick={() => void fetchOperaciones()}
                className="p-2.5 bg-white/15 hover:bg-white/25 rounded-xl transition-colors text-white"
                title={tr.refresh}
              >
                <Icon icon="lucide:refresh-cw" width={18} height={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Barra de selección */}
        {selectedIds.size > 0 && (
          <div className={`${moduleCard} px-4 py-3 flex items-center gap-3`}>
            <span className="text-base font-semibold text-brand-blue flex-1">
              {selectedIds.size} elemento{selectedIds.size !== 1 ? "s" : ""} seleccionado{selectedIds.size !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => void handleRestore(Array.from(selectedIds))}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-base font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-50"
            >
              <Icon icon="lucide:undo-2" width={16} height={16} />
              <span className="hidden sm:inline">{tr.restore}</span>
            </button>
            {isSuperadmin && (
              <button
                onClick={() => void handleDeletePermanently(Array.from(selectedIds))}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-base font-semibold bg-red-50 text-red-700 border border-red-200 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <Icon icon="lucide:trash-2" width={16} height={16} />
                <span className="hidden sm:inline">{tr.deletePermanent}</span>
              </button>
            )}
            <button onClick={() => setSelectedIds(new Set())} className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors">
              <Icon icon="lucide:x" width={16} height={16} />
            </button>
          </div>
        )}

        {/* Contenido */}
        <div className={moduleCard}>
          {operaciones.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-center">
              <span className="w-14 h-14 rounded-2xl bg-[#F4F8FC] flex items-center justify-center">
                <Icon icon="lucide:trash-2" width={26} height={26} className="text-brand-blue/30" />
              </span>
              <p className="text-brand-blue font-semibold text-base">{tr.trashEmpty}</p>
            </div>
          ) : (
            <>
              {/* Cards móvil */}
              <div className="md:hidden divide-y divide-neutral-100">
                {operaciones.map((op) => {
                  const badge = tipoBadge(op.tipo_reserva_transporte);
                  const isSelected = selectedIds.has(op.id);
                  return (
                    <div
                      key={op.id}
                      onClick={() => handleSelect(op.id)}
                      className={`p-4 cursor-pointer transition-colors ${isSelected ? "bg-red-50/60" : "hover:bg-neutral-50"}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? "bg-red-500 border-red-500" : "border-neutral-300"}`}>
                            {isSelected && <Icon icon="lucide:check" width={11} height={11} className="text-white" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-base text-brand-blue">{op.ref_asli || (op.correlativo ? `#${op.correlativo}` : "—")}</p>
                            <p className="text-base text-neutral-500 truncate">{op.cliente || "-"}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-bold border shrink-0 ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-base mb-3">
                        <div className="bg-[#F4F8FC] rounded-xl px-2.5 py-1.5">
                          <p className="text-brand-blue/60 text-sm font-semibold">Naviera</p>
                          <p className="text-neutral-700 font-medium truncate">{op.naviera || "-"}</p>
                        </div>
                        <div className="bg-[#F4F8FC] rounded-xl px-2.5 py-1.5">
                          <p className="text-brand-blue/60 text-sm font-semibold">Transporte</p>
                          <p className="text-neutral-700 font-medium truncate">{op.transporte || "-"}</p>
                        </div>
                        {op.contenedor && (
                          <div className="bg-[#F4F8FC] rounded-xl px-2.5 py-1.5">
                            <p className="text-brand-blue/60 text-sm font-semibold">Contenedor</p>
                            <p className="text-neutral-700 font-mono truncate">{op.contenedor}</p>
                          </div>
                        )}
                        <div className="bg-red-50 rounded-xl px-2.5 py-1.5">
                          <p className="text-red-400 text-sm font-semibold">Eliminado</p>
                          <p className="text-red-700 font-medium">{formatDate(op.transporte_deleted_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => void handleRestore([op.id])}
                          disabled={actionLoading}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-base font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-50"
                        >
                          <Icon icon="lucide:undo-2" width={16} height={16} />
                          {tr.restore}
                        </button>
                        {isSuperadmin && (
                          <button
                            onClick={() => void handleDeletePermanently([op.id])}
                            disabled={actionLoading}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-base font-semibold bg-red-50 text-red-700 border border-red-200 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            <Icon icon="lucide:trash-2" width={16} height={16} />
                            {tr.deletePermanent}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tabla desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-base">
                  <thead>
                    <tr className="bg-[#F4F8FC] border-b border-brand-blue/10">
                      <th className="px-4 py-3 w-10">
                        <input type="checkbox" checked={selectedIds.size === operaciones.length && operaciones.length > 0} onChange={handleSelectAll} className="w-4 h-4 rounded border-neutral-300 accent-brand-blue" />
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-brand-blue whitespace-nowrap">{tr.colRef}</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-brand-blue whitespace-nowrap">{tr.colClient}</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-brand-blue whitespace-nowrap">{tr.colCarrier}</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-brand-blue whitespace-nowrap">{tr.colBooking}</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-brand-blue whitespace-nowrap">{tr.colTransport}</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-brand-blue whitespace-nowrap">{tr.colContainer}</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-brand-blue whitespace-nowrap">{tr.colType}</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-brand-blue whitespace-nowrap min-w-[7.5rem]">{tr.colDeleted}</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-brand-blue">{tr.colActions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operaciones.map((op, idx) => {
                      const badge = tipoBadge(op.tipo_reserva_transporte);
                      return (
                        <tr
                          key={op.id}
                          className={`border-b border-neutral-50 transition-colors ${
                            selectedIds.has(op.id) ? "bg-red-50/60" : idx % 2 === 0 ? "bg-white hover:bg-neutral-50/80" : "bg-neutral-50/40 hover:bg-neutral-50/80"
                          }`}
                        >
                          <td className="px-4 py-3 text-center">
                            <input type="checkbox" checked={selectedIds.has(op.id)} onChange={() => handleSelect(op.id)} className="w-4 h-4 rounded border-neutral-300 accent-brand-blue" />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-bold text-brand-blue text-base">{op.ref_asli || (op.correlativo ? `#${op.correlativo}` : "-")}</span>
                          </td>
                          <td className="px-4 py-3 text-center text-base text-neutral-700 font-medium">{op.cliente || "-"}</td>
                          <td className="px-4 py-3 text-center text-base text-neutral-600">{op.naviera || "-"}</td>
                          <td className="px-4 py-3 text-center text-base font-mono text-neutral-600">{op.booking || "-"}</td>
                          <td className="px-4 py-3 text-center text-base text-neutral-600">{op.transporte || "-"}</td>
                          <td className="px-4 py-3 text-center text-base font-mono text-neutral-600">{op.contenedor || "-"}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-bold border ${badge.cls}`}>{badge.label}</span>
                          </td>
                          <td className="px-4 py-3 text-center text-base text-neutral-600 font-medium min-w-[7.5rem]">{formatDate(op.transporte_deleted_at)}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => void handleRestore([op.id])} disabled={actionLoading} className="p-1.5 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50" title={tr.restore}>
                                <Icon icon="lucide:undo-2" width={15} height={15} />
                              </button>
                              {isSuperadmin && (
                                <button onClick={() => void handleDeletePermanently([op.id])} disabled={actionLoading} className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50" title={tr.deletePermanent}>
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
                <div className="px-4 py-2.5 border-t border-brand-blue/10 bg-[#F4F8FC]/80 text-base text-neutral-500">
                  {operaciones.length} elemento{operaciones.length !== 1 ? "s" : ""} en papelera
                  {selectedIds.size > 0 && <span className="ml-2 text-brand-blue font-semibold">· {selectedIds.size} seleccionado{selectedIds.size !== 1 ? "s" : ""}</span>}
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
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(null)}
      />
    )}
    </>
  );
}
