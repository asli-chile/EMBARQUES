import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
import { displayRefAsli } from "@/lib/refAsli";
import {
  BarraFiltrosTransporte,
  CabeceraTransporte,
  CargandoTransporte,
  ChipEstado,
  FilaVacia,
  MarcoTabla,
  PaginaTransporte,
  TD,
  TH,
  type Indicador,
} from "@/components/transportes/FichaTransporte";

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
  /** De qué tabla viene: la operación (ASLI) o `transportes_reservas_ext`. */
  origen: "asli" | "ext";
};

/**
 * Papelera de transportes, con el aspecto de Reserva ASLI y Externa: cabecera
 * con indicadores que filtran, búsqueda y tabla a todo el ancho. Al
 * seleccionar filas aparece la barra de acciones, como en Mis Reservas.
 *
 * Reúne dos tablas: las operaciones de ASLI marcadas con
 * `transporte_deleted_at` y las reservas externas con `deleted_at`. Restaurar
 * y eliminar actúan sobre la tabla de cada fila.
 */
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
  const [busqueda, setBusqueda] = useState("");
  const [origenFiltro, setOrigenFiltro] = useState("");
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

    /* Las reservas externas viven en su propia tabla y no tienen temporada:
       se listan todas las que están en la papelera. */
    let qExt = supabase
      .from("transportes_reservas_ext")
      .select("id, cliente, naviera, nave, booking, transporte, chofer, contenedor, tramo, deleted_at")
      .not("deleted_at", "is", null);
    if (empresaNombres.length > 0) {
      qExt = qExt.in("cliente", empresaNombres);
    }

    const [{ data, error }, ext] = await Promise.all([
      q.order("transporte_deleted_at", { ascending: false }),
      qExt.order("deleted_at", { ascending: false }),
    ]);

    if (error || ext.error) {
      if (process.env.NODE_ENV === "development") console.error("Error loading papelera transportes:", error ?? ext.error);
    }
    const asli: Operacion[] = (data ?? []).map((o) => ({ ...(o as Omit<Operacion, "origen">), origen: "asli" as const }));
    const externas: Operacion[] = (ext.data ?? []).map((r) => ({
      id: r.id as string,
      correlativo: null,
      ref_asli: null,
      cliente: r.cliente as string | null,
      naviera: r.naviera as string | null,
      nave: r.nave as string | null,
      booking: r.booking as string | null,
      transporte: r.transporte as string | null,
      chofer: r.chofer as string | null,
      contenedor: r.contenedor as string | null,
      tramo: r.tramo as string | null,
      tipo_reserva_transporte: "externa",
      transporte_deleted_at: r.deleted_at as string,
      origen: "ext" as const,
    }));
    setOperaciones(
      [...asli, ...externas].sort((a, b) => b.transporte_deleted_at.localeCompare(a.transporte_deleted_at)),
    );
    setLoading(false);
  }, [supabase, authLoading, temporadaLoading, temporadaActiva, isCliente, empresaNombres]);

  useEffect(() => {
    if (!authLoading) void fetchOperaciones();
    else setOperaciones([]);
  }, [authLoading, fetchOperaciones]);

  const visibles = useMemo(() => {
    let list = operaciones;
    if (origenFiltro) list = list.filter((o) => o.origen === origenFiltro);
    const s = busqueda.trim().toLowerCase();
    if (!s) return list;
    return list.filter((o) =>
      [displayRefAsli(o.ref_asli, o.correlativo, ""), o.cliente, o.booking, o.contenedor, o.naviera, o.nave, o.transporte, o.chofer]
        .some((v) => (v ?? "").toLowerCase().includes(s)),
    );
  }, [operaciones, origenFiltro, busqueda]);

  /* La selección solo cuenta lo que se ve: con un filtro puesto, "todas" son
     las visibles, y lo seleccionado que el filtro esconde no se toca. */
  const seleccionVisible = useMemo(
    () => visibles.filter((o) => selectedIds.has(o.id)).map((o) => o.id),
    [visibles, selectedIds],
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: locale === "es" ? es : undefined });
    } catch {
      return dateStr;
    }
  };

  const allSelected = visibles.length > 0 && seleccionVisible.length === visibles.length;
  const handleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(visibles.map((op) => op.id)));
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  /* Cada fila vuelve a (o sale de) su propia tabla. */
  const separar = (ids: string[]) => {
    const ext = new Set(operaciones.filter((o) => o.origen === "ext").map((o) => o.id));
    return { asli: ids.filter((id) => !ext.has(id)), ext: ids.filter((id) => ext.has(id)) };
  };

  const handleRestore = async (ids: string[]) => {
    if (!supabase || ids.length === 0) return;
    setActionLoading(true);
    const { asli, ext } = separar(ids);
    const [r1, r2] = await Promise.all([
      asli.length ? supabase.from("operaciones").update({ transporte_deleted_at: null }).in("id", asli) : null,
      ext.length ? supabase.from("transportes_reservas_ext").update({ deleted_at: null }).in("id", ext) : null,
    ]);
    const error = r1?.error ?? r2?.error;
    if (error) {
      sileo.error({ title: tr.errorRestoring });
    } else {
      sileo.success({ title: tr.restaurados });
      setSelectedIds(new Set());
      await fetchOperaciones();
    }
    setActionLoading(false);
  };

  const handleDeletePermanently = (ids: string[]) => {
    if (!supabase || ids.length === 0) return;
    setConfirmDialog({
      title: tr.eliminarTitulo,
      message: tr.confirmDelete.replace("{count}", String(ids.length)),
      confirmLabel: tr.eliminarDefinitivo,
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

    const { asli, ext } = separar(ids);
    const [r1, r2] = await Promise.all([
      asli.length ? supabase.from("operaciones").update(cleared).in("id", asli) : null,
      // Una reserva externa no tiene operación que limpiar: se borra la fila.
      ext.length ? supabase.from("transportes_reservas_ext").delete().in("id", ext) : null,
    ]);
    const error = r1?.error ?? r2?.error;

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
      title: tr.vaciarTitulo,
      message: tr.confirmEmptyTrash.replace("{count}", String(operaciones.length)),
      confirmLabel: tr.emptyTrash,
      onConfirm: () => {
        setConfirmDialog(null);
        void doDeletePermanently(operaciones.map((o) => o.id));
      },
    });
  };

  if (loading) return <CargandoTransporte theme={theme} label={tr.loading} />;

  const nAsli = operaciones.filter((o) => o.origen === "asli").length;
  const nExt = operaciones.length - nAsli;
  const pct = (n: number) => (operaciones.length ? Math.round((n / operaciones.length) * 100) : 0);
  const indicadores: Indicador[] = [
    { clave: "", label: tr.kpiTotal, valor: operaciones.length, pct: null, tono: "estado--espera", icon: "lucide:trash-2" },
    { clave: "asli", label: tr.kpiAsli, valor: nAsli, pct: pct(nAsli), tono: "estado--curso", icon: "lucide:truck" },
    { clave: "ext", label: tr.kpiExt, valor: nExt, pct: pct(nExt), tono: "estado--transito", icon: "lucide:external-link" },
  ];

  const hayFiltros = !!(busqueda || origenFiltro);
  const COLS = 10;
  const btnFila = "rounded-lg p-1.5 text-dash-muted transition-colors disabled:opacity-50";

  return (
    <PaginaTransporte theme={theme}>
      <div className="relative z-10 shrink-0">
        <CabeceraTransporte
          titulo={tr.title}
          subtitulo={operaciones.length === 0 ? tr.trashEmpty : `${operaciones.length} ${tr.itemsInTrash}`}
          icono="lucide:trash-2"
          volverLabel={tr.volver}
          visibles={visibles.length}
          total={operaciones.length}
          indicadores={indicadores}
          activo={origenFiltro}
          onIndicador={setOrigenFiltro}
          acciones={
            isSuperadmin && operaciones.length > 0 ? (
              <button
                type="button"
                onClick={handleEmptyTrash}
                disabled={actionLoading}
                className="estado--error estado-chip motion-interactive inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
              >
                <Icon icon="lucide:trash" width={14} height={14} />
                <span className="hidden sm:inline">{tr.emptyTrash}</span>
              </button>
            ) : undefined
          }
        />
        <BarraFiltrosTransporte
          busqueda={busqueda}
          onBusqueda={setBusqueda}
          placeholder={tr.searchPlaceholder}
          onRefrescar={() => void fetchOperaciones()}
          refrescarLabel={tr.refresh}
        />

        {/* Barra de selección: aparece con la primera casilla marcada. */}
        {seleccionVisible.length > 0 && (
          <div className="motion-enter-lift flex flex-wrap items-center gap-2 border-b border-dash-border bg-dash-neon/10 px-3 py-2 sm:px-4">
            <span className="flex-1 text-sm font-semibold tabular-nums text-dash-fg">
              {seleccionVisible.length} {seleccionVisible.length === 1 ? tr.seleccionado : tr.seleccionados}
            </span>
            <button
              type="button"
              onClick={() => void handleRestore(seleccionVisible)}
              disabled={actionLoading}
              className="estado--ok estado-chip motion-interactive inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
            >
              <Icon icon="lucide:undo-2" width={14} height={14} />
              {tr.restore}
            </button>
            {isSuperadmin && (
              <button
                type="button"
                onClick={() => handleDeletePermanently(seleccionVisible)}
                disabled={actionLoading}
                className="estado--error estado-chip motion-interactive inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
              >
                <Icon icon="lucide:trash-2" width={14} height={14} />
                <span className="hidden sm:inline">{tr.eliminarDefinitivo}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              title={tr.quitarSeleccion}
              aria-label={tr.quitarSeleccion}
              className="rounded-lg p-1.5 text-dash-muted transition-colors hover:bg-dash-neon/15 hover:text-dash-fg"
            >
              <Icon icon="lucide:x" width={14} height={14} />
            </button>
          </div>
        )}
      </div>

      <MarcoTabla
        pie={
          visibles.length > 0 ? (
            <span className="text-xs font-medium tabular-nums text-dash-muted">
              {visibles.length} {tr.itemsInTrash}
              {visibles.length !== operaciones.length && ` · ${operaciones.length}`}
            </span>
          ) : undefined
        }
      >
        <thead>
          <tr>
            <th className={`${TH} w-10`}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                aria-label={tr.seleccionados}
                className="h-4 w-4 rounded accent-[var(--dash-neon)]"
              />
            </th>
            <th className={TH}>{tr.colRef}</th>
            <th className={TH}>{tr.colClient}</th>
            <th className={TH}>{tr.colBooking}</th>
            <th className={TH}>{tr.colContainer}</th>
            <th className={TH}>{tr.colCarrier}</th>
            <th className={TH}>{tr.colTransport}</th>
            <th className={TH}>{tr.colType}</th>
            <th className={TH}>{tr.colDeleted}</th>
            <th className={`${TH} text-center`}>{tr.colActions}</th>
          </tr>
        </thead>
        <tbody>
          {visibles.length === 0 ? (
            <FilaVacia
              colSpan={COLS}
              icono="lucide:trash-2"
              texto={operaciones.length === 0 ? tr.trashEmpty : tr.sinResultados}
              accion={
                hayFiltros ? (
                  <button
                    type="button"
                    onClick={() => {
                      setBusqueda("");
                      setOrigenFiltro("");
                    }}
                    className="mt-1 text-xs font-medium text-dash-fg hover:underline"
                  >
                    {tr.limpiarFiltros}
                  </button>
                ) : undefined
              }
            />
          ) : (
            visibles.map((op, idx) => {
              const sel = selectedIds.has(op.id);
              const esExt = op.origen === "ext";
              return (
                <tr
                  key={op.id}
                  onClick={() => handleSelect(op.id)}
                  className={`cursor-pointer border-b border-dash-border transition-colors ${
                    sel
                      ? "bg-dash-neon/15"
                      : idx % 2 === 0
                        ? "bg-transparent hover:bg-dash-neon/10"
                        : "bg-dash-control/30 hover:bg-dash-neon/10"
                  }`}
                >
                  <td className={`${TD} relative`} onClick={(e) => e.stopPropagation()}>
                    {/* El canto dice de dónde viene, como el chip de tipo. */}
                    <span
                      className={`${esExt ? "estado--transito" : "estado--curso"} estado-barra absolute inset-y-0 left-0 w-[3px]`}
                      aria-hidden
                    />
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => handleSelect(op.id)}
                      className="h-4 w-4 rounded accent-[var(--dash-neon)]"
                    />
                  </td>
                  <td className={`${TD} whitespace-nowrap text-[14px] font-bold tabular-nums tracking-tight text-dash-fg`}>
                    {displayRefAsli(op.ref_asli, op.correlativo, "—")}
                  </td>
                  <td className={`${TD} max-w-[14rem] truncate font-semibold text-dash-fg`}>{op.cliente || "—"}</td>
                  <td className={`${TD} whitespace-nowrap font-mono text-[12.5px] text-dash-fg`}>{op.booking || "—"}</td>
                  <td className={`${TD} whitespace-nowrap font-mono text-[12.5px] text-dash-fg`}>{op.contenedor || "—"}</td>
                  <td className={TD}>
                    <p className="max-w-[12rem] truncate text-dash-fg">{op.naviera || "—"}</p>
                    {op.nave && <p className="max-w-[12rem] truncate text-[12px] text-dash-muted">{op.nave}</p>}
                  </td>
                  <td className={TD}>
                    <p className="max-w-[12rem] truncate text-dash-fg">{op.transporte || "—"}</p>
                    {op.chofer && <p className="max-w-[12rem] truncate text-[12px] text-dash-muted">{op.chofer}</p>}
                  </td>
                  <td className={TD}>
                    <ChipEstado tono={esExt ? "estado--transito" : "estado--curso"} label={esExt ? tr.tipoExt : tr.tipoAsli} />
                  </td>
                  <td className={`${TD} whitespace-nowrap tabular-nums text-dash-muted`}>
                    <span className="inline-flex items-center gap-1.5">
                      <Icon icon="lucide:clock" width={13} height={13} aria-hidden />
                      {formatDate(op.transporte_deleted_at)}
                    </span>
                  </td>
                  <td className={TD} onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => void handleRestore([op.id])}
                        disabled={actionLoading}
                        className={`${btnFila} hover:bg-[color-mix(in_srgb,var(--estado-ok)_14%,transparent)] hover:text-[var(--estado-ok)]`}
                        title={tr.restore}
                        aria-label={tr.restore}
                      >
                        <Icon icon="lucide:undo-2" width={15} height={15} />
                      </button>
                      {isSuperadmin && (
                        <button
                          type="button"
                          onClick={() => handleDeletePermanently([op.id])}
                          disabled={actionLoading}
                          className={`${btnFila} hover:bg-[color-mix(in_srgb,var(--estado-error)_14%,transparent)] hover:text-[var(--estado-error)]`}
                          title={tr.eliminarDefinitivo}
                          aria-label={tr.eliminarDefinitivo}
                        >
                          <Icon icon="lucide:trash-2" width={15} height={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </MarcoTabla>

      {confirmDialog &&
        createPortal(
          <ConfirmDialog
            title={confirmDialog.title}
            message={confirmDialog.message}
            confirmLabel={confirmDialog.confirmLabel}
            cancelLabel={tr.cancelar}
            variant="danger"
            onConfirm={confirmDialog.onConfirm}
            onCancel={() => setConfirmDialog(null)}
          />,
          document.body,
        )}
    </PaginaTransporte>
  );
}
