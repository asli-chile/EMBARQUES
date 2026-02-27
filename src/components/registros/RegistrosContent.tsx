import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import type { ColDef } from "ag-grid-community";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleContext";

ModuleRegistry.registerModules([AllCommunityModule]);

export type OperacionRow = {
  id: string;
  correlativo: number;
  ref_asli: string;
  ingreso: string;
  semana: number | null;
  ejecutivo: string;
  estado_operacion: string;
  tipo_operacion: string;
  cliente: string;
  consignatario: string;
  incoterm: string;
  forma_pago: string;
  especie: string;
  pais: string;
  temperatura: string;
  ventilacion: string;
  pallets: number | null;
  peso_bruto: number | null;
  peso_neto: number | null;
  tipo_unidad: string;
  naviera: string;
  nave: string;
  pol: string;
  etd: string;
  pod: string;
  eta: string;
  tt: number | null;
  booking: string;
  aga: string;
  dus: string;
  sps: string;
  numero_guia_despacho: string;
  planta_presentacion: string;
  citacion: string;
  llegada_planta: string;
  salida_planta: string;
  inicio_stacking: string;
  fin_stacking: string;
  ingreso_stacking: string;
  corte_documental: string;
  inf_late: string;
  late_inicio: string;
  late_fin: string;
  xlate_inicio: string;
  xlate_fin: string;
  deposito: string;
  agendamiento_retiro: string;
  devolucion_unidad: string;
  transporte: string;
  chofer: string;
  rut_chofer: string;
  telefono_chofer: string;
  patente_camion: string;
  patente_remolque: string;
  contenedor: string;
  sello: string;
  tara: number | null;
  almacenamiento: number | null;
  tramo: string;
  valor_tramo: number | null;
  porteo: boolean;
  valor_porteo: number | null;
  falso_flete: boolean;
  valor_falso_flete: number | null;
  factura_transporte: string;
  monto_facturado: number | null;
  numero_factura_asli: string;
  concepto_facturado: string;
  moneda: string;
  tipo_cambio: number | null;
  margen_estimado: number | null;
  margen_real: number | null;
  fecha_confirmacion_booking: string;
  fecha_envio_documentacion: string;
  fecha_entrega_bl: string;
  fecha_entrega_factura: string;
  fecha_pago_cliente: string;
  fecha_pago_transporte: string;
  fecha_cierre: string;
  prioridad: string;
  operacion_critica: boolean;
  origen_registro: string;
  observaciones: string;
};

type DbOperacion = {
  id: string;
  correlativo: number;
  ref_asli: string | null;
  ingreso: string | null;
  semana: number | null;
  ejecutivo: string;
  estado_operacion: string;
  tipo_operacion: string;
  cliente: string;
  consignatario: string | null;
  incoterm: string | null;
  forma_pago: string | null;
  especie: string | null;
  pais: string | null;
  temperatura: string | null;
  ventilacion: string | null;
  pallets: number | null;
  peso_bruto: number | null;
  peso_neto: number | null;
  tipo_unidad: string | null;
  naviera: string | null;
  nave: string | null;
  pol: string | null;
  etd: string | null;
  pod: string | null;
  eta: string | null;
  tt: number | null;
  booking: string | null;
  aga: string | null;
  dus: string | null;
  sps: string | null;
  numero_guia_despacho: string | null;
  planta_presentacion: string | null;
  citacion: string | null;
  llegada_planta: string | null;
  salida_planta: string | null;
  inicio_stacking: string | null;
  fin_stacking: string | null;
  ingreso_stacking: string | null;
  corte_documental: string | null;
  inf_late: string | null;
  late_inicio: string | null;
  late_fin: string | null;
  xlate_inicio: string | null;
  xlate_fin: string | null;
  deposito: string | null;
  agendamiento_retiro: string | null;
  devolucion_unidad: string | null;
  transporte: string | null;
  chofer: string | null;
  rut_chofer: string | null;
  telefono_chofer: string | null;
  patente_camion: string | null;
  patente_remolque: string | null;
  contenedor: string | null;
  sello: string | null;
  tara: number | null;
  almacenamiento: number | null;
  tramo: string | null;
  valor_tramo: number | null;
  porteo: boolean | null;
  valor_porteo: number | null;
  falso_flete: boolean | null;
  valor_falso_flete: number | null;
  factura_transporte: string | null;
  monto_facturado: number | null;
  numero_factura_asli: string | null;
  concepto_facturado: string | null;
  moneda: string | null;
  tipo_cambio: number | null;
  margen_estimado: number | null;
  margen_real: number | null;
  fecha_confirmacion_booking: string | null;
  fecha_envio_documentacion: string | null;
  fecha_entrega_bl: string | null;
  fecha_entrega_factura: string | null;
  fecha_pago_cliente: string | null;
  fecha_pago_transporte: string | null;
  fecha_cierre: string | null;
  prioridad: string | null;
  operacion_critica: boolean | null;
  origen_registro: string | null;
  observaciones: string | null;
};

function formatDate(value: string | null, _locale: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTime(value: string | null, _locale: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function createToRow(locale: string) {
  return function toRow(db: DbOperacion): OperacionRow {
    return {
      id: db.id,
      correlativo: db.correlativo,
      ref_asli: db.ref_asli ?? `A${String(db.correlativo).padStart(5, "0")}`,
      ingreso: formatDateTime(db.ingreso, locale),
      semana: db.semana,
      ejecutivo: db.ejecutivo,
      estado_operacion: db.estado_operacion,
      tipo_operacion: db.tipo_operacion,
      cliente: db.cliente,
      consignatario: db.consignatario ?? "",
      incoterm: db.incoterm ?? "",
      forma_pago: db.forma_pago ?? "",
      especie: db.especie ?? "",
      pais: db.pais ?? "",
      temperatura: db.temperatura ?? "",
      ventilacion: db.ventilacion ?? "",
      pallets: db.pallets,
      peso_bruto: db.peso_bruto,
      peso_neto: db.peso_neto,
      tipo_unidad: db.tipo_unidad ?? "",
      naviera: db.naviera ?? "",
      nave: db.nave ?? "",
      pol: db.pol ?? "",
      etd: formatDate(db.etd, locale),
      pod: db.pod ?? "",
      eta: formatDate(db.eta, locale),
      tt: db.tt,
      booking: db.booking ?? "",
      aga: db.aga ?? "",
      dus: db.dus ?? "",
      sps: db.sps ?? "",
      numero_guia_despacho: db.numero_guia_despacho ?? "",
      planta_presentacion: db.planta_presentacion ?? "",
      citacion: formatDateTime(db.citacion, locale),
      llegada_planta: formatDateTime(db.llegada_planta, locale),
      salida_planta: formatDateTime(db.salida_planta, locale),
      inicio_stacking: formatDateTime(db.inicio_stacking, locale),
      fin_stacking: formatDateTime(db.fin_stacking, locale),
      ingreso_stacking: formatDateTime(db.ingreso_stacking, locale),
      corte_documental: formatDateTime(db.corte_documental, locale),
      inf_late: formatDateTime(db.inf_late, locale),
      late_inicio: formatDateTime(db.late_inicio, locale),
      late_fin: formatDateTime(db.late_fin, locale),
      xlate_inicio: formatDateTime(db.xlate_inicio, locale),
      xlate_fin: formatDateTime(db.xlate_fin, locale),
      deposito: db.deposito ?? "",
      agendamiento_retiro: formatDateTime(db.agendamiento_retiro, locale),
      devolucion_unidad: formatDateTime(db.devolucion_unidad, locale),
      transporte: db.transporte ?? "",
      chofer: db.chofer ?? "",
      rut_chofer: db.rut_chofer ?? "",
      telefono_chofer: db.telefono_chofer ?? "",
      patente_camion: db.patente_camion ?? "",
      patente_remolque: db.patente_remolque ?? "",
      contenedor: db.contenedor ?? "",
      sello: db.sello ?? "",
      tara: db.tara,
      almacenamiento: db.almacenamiento,
      tramo: db.tramo ?? "",
      valor_tramo: db.valor_tramo,
      porteo: db.porteo ?? false,
      valor_porteo: db.valor_porteo,
      falso_flete: db.falso_flete ?? false,
      valor_falso_flete: db.valor_falso_flete,
      factura_transporte: db.factura_transporte ?? "",
      monto_facturado: db.monto_facturado,
      numero_factura_asli: db.numero_factura_asli ?? "",
      concepto_facturado: db.concepto_facturado ?? "",
      moneda: db.moneda ?? "CLP",
      tipo_cambio: db.tipo_cambio,
      margen_estimado: db.margen_estimado,
      margen_real: db.margen_real,
      fecha_confirmacion_booking: formatDateTime(db.fecha_confirmacion_booking, locale),
      fecha_envio_documentacion: formatDateTime(db.fecha_envio_documentacion, locale),
      fecha_entrega_bl: formatDateTime(db.fecha_entrega_bl, locale),
      fecha_entrega_factura: formatDateTime(db.fecha_entrega_factura, locale),
      fecha_pago_cliente: formatDateTime(db.fecha_pago_cliente, locale),
      fecha_pago_transporte: formatDateTime(db.fecha_pago_transporte, locale),
      fecha_cierre: formatDateTime(db.fecha_cierre, locale),
      prioridad: db.prioridad ?? "",
      operacion_critica: db.operacion_critica ?? false,
      origen_registro: db.origen_registro ?? "manual",
      observaciones: db.observaciones ?? "",
    };
  };
}

export function RegistrosContent() {
  const { locale, t } = useLocale();
  const gridRef = useRef<AgGridReact<OperacionRow>>(null);
  const [rowData, setRowData] = useState<OperacionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const toRow = useMemo(() => createToRow(locale), [locale]);

  const fetchOperaciones = useCallback(async () => {
    if (!supabase) {
      setError(t.registros.supabaseError);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("operaciones")
      .select("*")
      .is("deleted_at", null)
      .order("correlativo", { ascending: false });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setRowData((data ?? []).map(toRow));
  }, [supabase, t.registros.supabaseError, toRow]);

  useEffect(() => {
    void fetchOperaciones();
  }, [fetchOperaciones]);

  const booleanCellRenderer = useCallback(
    (p: { value: boolean }) => (p.value ? t.registros.yes : t.registros.no),
    [t.registros.yes, t.registros.no]
  );

  const columnDefs = useMemo<ColDef<OperacionRow>[]>(
    () => [
      { checkboxSelection: true, headerCheckboxSelection: true, width: 48, pinned: "left", suppressMovable: true },
      { field: "ref_asli", headerName: t.registros.colRefAsli, sortable: true, width: 100, pinned: "left" },
      { field: "ingreso", headerName: t.registros.colEntryDate, sortable: true, width: 140 },
      { field: "semana", headerName: t.registros.colWeek, sortable: true, width: 80 },
      { field: "ejecutivo", headerName: t.registros.colExecutive, sortable: true, editable: true, width: 140 },
      { field: "estado_operacion", headerName: t.registros.colOperationStatus, sortable: true, editable: true, width: 140 },
      { field: "tipo_operacion", headerName: t.registros.colOperationType, sortable: true, editable: true, width: 130 },
      { field: "cliente", headerName: t.registros.colClient, sortable: true, editable: true, width: 140 },
      { field: "consignatario", headerName: t.registros.colConsignee, sortable: true, editable: true, width: 140 },
      { field: "incoterm", headerName: t.registros.colIncoterm, sortable: true, editable: true, width: 100 },
      { field: "forma_pago", headerName: t.registros.colPaymentMethod, sortable: true, editable: true, width: 120 },
      { field: "especie", headerName: t.registros.colSpecies, sortable: true, editable: true, width: 100 },
      { field: "pais", headerName: t.registros.colDestCountry, sortable: true, editable: true, width: 110 },
      { field: "temperatura", headerName: t.registros.colTemperature, sortable: true, editable: true, width: 100 },
      { field: "ventilacion", headerName: t.registros.colVentilation, sortable: true, editable: true, width: 100 },
      { field: "pallets", headerName: t.registros.colPallets, sortable: true, editable: true, width: 80 },
      { field: "peso_bruto", headerName: t.registros.colGrossWeight, sortable: true, editable: true, width: 120 },
      { field: "peso_neto", headerName: t.registros.colNetWeight, sortable: true, editable: true, width: 120 },
      { field: "tipo_unidad", headerName: t.registros.colUnitType, sortable: true, editable: true, width: 120 },
      { field: "naviera", headerName: t.registros.colCarrier, sortable: true, editable: true, width: 100 },
      { field: "nave", headerName: t.registros.colVessel, sortable: true, editable: true, width: 150 },
      { field: "pol", headerName: t.registros.colPOL, sortable: true, editable: true, width: 140 },
      { field: "etd", headerName: t.registros.colETD, sortable: true, width: 130 },
      { field: "pod", headerName: t.registros.colPOD, sortable: true, editable: true, width: 150 },
      { field: "eta", headerName: t.registros.colETA, sortable: true, width: 130 },
      { field: "tt", headerName: t.registros.colTransitDays, sortable: true, editable: true, width: 110 },
      { field: "booking", headerName: t.registros.colBooking, sortable: true, editable: true, width: 120 },
      { field: "aga", headerName: t.registros.colAGA, sortable: true, editable: true, width: 100 },
      { field: "dus", headerName: t.registros.colDUS, sortable: true, editable: true, width: 100 },
      { field: "sps", headerName: t.registros.colSPS, sortable: true, editable: true, width: 100 },
      { field: "numero_guia_despacho", headerName: t.registros.colDispatchGuide, sortable: true, editable: true, width: 140 },
      { field: "planta_presentacion", headerName: t.registros.colPresentationPlant, sortable: true, editable: true, width: 150 },
      { field: "citacion", headerName: t.registros.colCitation, sortable: true, width: 140 },
      { field: "llegada_planta", headerName: t.registros.colPlantArrival, sortable: true, width: 140 },
      { field: "salida_planta", headerName: t.registros.colPlantDeparture, sortable: true, width: 140 },
      { field: "inicio_stacking", headerName: t.registros.colStackingStart, sortable: true, width: 140 },
      { field: "fin_stacking", headerName: t.registros.colStackingEnd, sortable: true, width: 140 },
      { field: "ingreso_stacking", headerName: t.registros.colStackingEntry, sortable: true, width: 140 },
      { field: "corte_documental", headerName: t.registros.colDocCutoff, sortable: true, width: 140 },
      { field: "inf_late", headerName: t.registros.colLateInfo, sortable: true, width: 140 },
      { field: "late_inicio", headerName: t.registros.colLateStart, sortable: true, width: 140 },
      { field: "late_fin", headerName: t.registros.colLateEnd, sortable: true, width: 140 },
      { field: "xlate_inicio", headerName: t.registros.colXLateStart, sortable: true, width: 140 },
      { field: "xlate_fin", headerName: t.registros.colXLateEnd, sortable: true, width: 140 },
      { field: "deposito", headerName: t.registros.colWarehouse, sortable: true, editable: true, width: 120 },
      { field: "agendamiento_retiro", headerName: t.registros.colPickupSchedule, sortable: true, width: 150 },
      { field: "devolucion_unidad", headerName: t.registros.colUnitReturn, sortable: true, width: 150 },
      { field: "transporte", headerName: t.registros.colTransportCompany, sortable: true, editable: true, width: 150 },
      { field: "chofer", headerName: t.registros.colDriverName, sortable: true, editable: true, width: 140 },
      { field: "rut_chofer", headerName: t.registros.colDriverRUT, sortable: true, editable: true, width: 110 },
      { field: "telefono_chofer", headerName: t.registros.colDriverPhone, sortable: true, editable: true, width: 130 },
      { field: "patente_camion", headerName: t.registros.colTruckPlate, sortable: true, editable: true, width: 130 },
      { field: "patente_remolque", headerName: t.registros.colTrailerPlate, sortable: true, editable: true, width: 140 },
      { field: "contenedor", headerName: t.registros.colContainer, sortable: true, editable: true, width: 130 },
      { field: "sello", headerName: t.registros.colSeal, sortable: true, editable: true, width: 100 },
      { field: "tara", headerName: t.registros.colTare, sortable: true, editable: true, width: 90 },
      { field: "almacenamiento", headerName: t.registros.colStorageDays, sortable: true, editable: true, width: 150 },
      { field: "tramo", headerName: t.registros.colSection, sortable: true, editable: true, width: 100 },
      { field: "valor_tramo", headerName: t.registros.colSectionValue, sortable: true, editable: true, width: 120 },
      { field: "porteo", headerName: t.registros.colPortage, sortable: true, editable: true, width: 80, cellRenderer: booleanCellRenderer },
      { field: "valor_porteo", headerName: t.registros.colPortageValue, sortable: true, editable: true, width: 130 },
      { field: "falso_flete", headerName: t.registros.colDeadFreight, sortable: true, editable: true, width: 100, cellRenderer: booleanCellRenderer },
      { field: "valor_falso_flete", headerName: t.registros.colDeadFreightValue, sortable: true, editable: true, width: 150 },
      { field: "factura_transporte", headerName: t.registros.colTransportInvoice, sortable: true, editable: true, width: 140 },
      { field: "monto_facturado", headerName: t.registros.colInvoicedAmount, sortable: true, editable: true, width: 150 },
      { field: "numero_factura_asli", headerName: t.registros.colASLIInvoice, sortable: true, editable: true, width: 140 },
      { field: "concepto_facturado", headerName: t.registros.colInvoicedConcept, sortable: true, editable: true, width: 150 },
      { field: "moneda", headerName: t.registros.colCurrency, sortable: true, editable: true, width: 80 },
      { field: "tipo_cambio", headerName: t.registros.colExchangeRate, sortable: true, editable: true, width: 120 },
      { field: "margen_estimado", headerName: t.registros.colEstimatedMargin, sortable: true, editable: true, width: 150 },
      { field: "margen_real", headerName: t.registros.colRealMargin, sortable: true, editable: true, width: 130 },
      { field: "fecha_confirmacion_booking", headerName: t.registros.colBookingConfirmation, sortable: true, width: 160 },
      { field: "fecha_envio_documentacion", headerName: t.registros.colDocSent, sortable: true, width: 160 },
      { field: "fecha_entrega_bl", headerName: t.registros.colBLDelivery, sortable: true, width: 140 },
      { field: "fecha_entrega_factura", headerName: t.registros.colInvoiceDelivery, sortable: true, width: 140 },
      { field: "fecha_pago_cliente", headerName: t.registros.colClientPayment, sortable: true, width: 140 },
      { field: "fecha_pago_transporte", headerName: t.registros.colTransportPayment, sortable: true, width: 140 },
      { field: "fecha_cierre", headerName: t.registros.colCloseDate, sortable: true, width: 140 },
      { field: "prioridad", headerName: t.registros.colPriority, sortable: true, editable: true, width: 100 },
      { field: "operacion_critica", headerName: t.registros.colCriticalOp, sortable: true, editable: true, width: 130, cellRenderer: booleanCellRenderer },
      { field: "origen_registro", headerName: t.registros.colRecordOrigin, sortable: true, width: 120 },
      { field: "observaciones", headerName: t.registros.colObservations, sortable: true, editable: true, width: 200 },
    ],
    [t.registros, booleanCellRenderer]
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
      .from("operaciones")
      .insert({
        ejecutivo: "",
        estado_operacion: "PENDIENTE",
        tipo_operacion: "EXPORTACIÓN",
        cliente: "NUEVO",
      })
      .select("*")
      .single();
    if (err) {
      setError(err.message);
      return;
    }
    if (data) {
      gridRef.current?.api?.applyTransaction({ add: [toRow(data as DbOperacion)], addIndex: 0 });
    }
  }, [supabase, toRow]);

  const handleRemoveSelected = useCallback(async () => {
    const selected = gridRef.current?.api?.getSelectedRows();
    if (!selected?.length || !supabase) return;
    const ids = selected.map((r) => r.id);
    const { error: err } = await supabase
      .from("operaciones")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", ids);
    if (err) {
      setError(err.message);
      return;
    }
    gridRef.current?.api?.applyTransaction({ remove: selected });
  }, [supabase]);

  const handleRefresh = useCallback(() => {
    void fetchOperaciones();
  }, [fetchOperaciones]);

  const handleCellValueChanged = useCallback(
    async (e: { data: OperacionRow; colDef: { field?: string }; newValue: unknown; oldValue: unknown }) => {
      const field = e.colDef.field;
      if (!supabase || !field || e.newValue === e.oldValue) return;
      const { error: err } = await supabase
        .from("operaciones")
        .update({ [field]: e.newValue ?? null })
        .eq("id", e.data.id);
      if (err) setError(err.message);
    },
    [supabase]
  );

  if (loading && rowData.length === 0) {
    return (
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-neutral-100 relative z-10" role="main">
        <div className="flex-1 flex items-center justify-center text-neutral-500">{t.registros.loading}</div>
      </main>
    );
  }

  return (
    <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-neutral-100 relative z-10" role="main">
      {error && (
        <div className="flex-shrink-0 px-4 py-2 bg-red-100 text-red-700 text-sm border-b border-red-200" role="alert">
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
          {t.registros.add}
        </button>
        <button
          type="button"
          onClick={() => void handleRemoveSelected()}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        >
          <Icon icon="typcn:trash" width={16} height={16} />
          {t.registros.deleteSelection}
        </button>
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        >
          <Icon icon="typcn:refresh" width={16} height={16} />
          {t.registros.refresh}
        </button>
        <span className="ml-auto text-sm text-neutral-500">{rowData.length} {t.registros.records}</span>
      </div>
      <div className="flex-1 min-h-0 p-4 overflow-hidden flex flex-col">
        <div className="ag-theme-balham flex-1 min-h-[300px] w-full rounded overflow-hidden" style={{ minHeight: 400 }}>
          <AgGridReact<OperacionRow>
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            localeText={t.agGrid}
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
