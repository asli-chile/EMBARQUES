/**
 * Definición de campos de la tabla Registros para la vista de visitantes.
 * Cada campo tiene: key (campo en DB), labelKey (clave en t.registros) y descKey (clave en t.visitor.registros.fieldsDesc).
 */
export type FieldGroup = {
  groupLabelKey: string;
  fields: { key: string; labelKey: string }[];
};

export const REGISTROS_FIELD_GROUPS: FieldGroup[] = [
  {
    groupLabelKey: "groupGeneral",
    fields: [
      { key: "ref_asli", labelKey: "colRefAsli" },
      { key: "ingreso", labelKey: "colEntryDate" },
      { key: "semana", labelKey: "colWeek" },
      { key: "ejecutivo", labelKey: "colExecutive" },
      { key: "estado_operacion", labelKey: "colOperationStatus" },
      { key: "tipo_operacion", labelKey: "colOperationType" },
    ],
  },
  {
    groupLabelKey: "groupComercial",
    fields: [
      { key: "cliente", labelKey: "colClient" },
      { key: "consignatario", labelKey: "colConsignee" },
      { key: "incoterm", labelKey: "colIncoterm" },
      { key: "forma_pago", labelKey: "colPaymentMethod" },
    ],
  },
  {
    groupLabelKey: "groupCarga",
    fields: [
      { key: "especie", labelKey: "colSpecies" },
      { key: "pais", labelKey: "colDestCountry" },
      { key: "temperatura", labelKey: "colTemperature" },
      { key: "ventilacion", labelKey: "colVentilation" },
      { key: "pallets", labelKey: "colPallets" },
      { key: "peso_bruto", labelKey: "colGrossWeight" },
      { key: "peso_neto", labelKey: "colNetWeight" },
      { key: "tipo_unidad", labelKey: "colUnitType" },
    ],
  },
  {
    groupLabelKey: "groupNaviera",
    fields: [
      { key: "naviera", labelKey: "colCarrier" },
      { key: "nave", labelKey: "colVessel" },
      { key: "pol", labelKey: "colPOL" },
      { key: "etd", labelKey: "colETD" },
      { key: "pod", labelKey: "colPOD" },
      { key: "eta", labelKey: "colETA" },
      { key: "tt", labelKey: "colTransitDays" },
      { key: "booking", labelKey: "colBooking" },
    ],
  },
  {
    groupLabelKey: "groupDocumentacion",
    fields: [
      { key: "aga", labelKey: "colAGA" },
      { key: "dus", labelKey: "colDUS" },
      { key: "sps", labelKey: "colSPS" },
      { key: "numero_guia_despacho", labelKey: "colDispatchGuide" },
    ],
  },
  {
    groupLabelKey: "groupPlantaStacking",
    fields: [
      { key: "planta_presentacion", labelKey: "colPresentationPlant" },
      { key: "citacion", labelKey: "colCitation" },
      { key: "llegada_planta", labelKey: "colPlantArrival" },
      { key: "salida_planta", labelKey: "colPlantDeparture" },
      { key: "inicio_stacking", labelKey: "colStackingStart" },
      { key: "fin_stacking", labelKey: "colStackingEnd" },
      { key: "ingreso_stacking", labelKey: "colStackingEntry" },
      { key: "corte_documental", labelKey: "colDocCutoff" },
    ],
  },
  {
    groupLabelKey: "groupLate",
    fields: [
      { key: "inf_late", labelKey: "colLateInfo" },
      { key: "late_inicio", labelKey: "colLateStart" },
      { key: "late_fin", labelKey: "colLateEnd" },
      { key: "xlate_inicio", labelKey: "colXLateStart" },
      { key: "xlate_fin", labelKey: "colXLateEnd" },
    ],
  },
  {
    groupLabelKey: "groupDeposito",
    fields: [
      { key: "deposito", labelKey: "colWarehouse" },
      { key: "agendamiento_retiro", labelKey: "colPickupSchedule" },
      { key: "devolucion_unidad", labelKey: "colUnitReturn" },
    ],
  },
  {
    groupLabelKey: "groupTransporte",
    fields: [
      { key: "transporte", labelKey: "colTransportCompany" },
      { key: "chofer", labelKey: "colDriverName" },
      { key: "rut_chofer", labelKey: "colDriverRUT" },
      { key: "telefono_chofer", labelKey: "colDriverPhone" },
      { key: "patente_camion", labelKey: "colTruckPlate" },
      { key: "patente_remolque", labelKey: "colTrailerPlate" },
      { key: "contenedor", labelKey: "colContainer" },
      { key: "sello", labelKey: "colSeal" },
      { key: "tara", labelKey: "colTare" },
    ],
  },
  {
    groupLabelKey: "groupCostosTransporte",
    fields: [
      { key: "almacenamiento", labelKey: "colStorageDays" },
      { key: "tramo", labelKey: "colSection" },
      { key: "valor_tramo", labelKey: "colSectionValue" },
      { key: "porteo", labelKey: "colPortage" },
      { key: "valor_porteo", labelKey: "colPortageValue" },
      { key: "falso_flete", labelKey: "colDeadFreight" },
      { key: "valor_falso_flete", labelKey: "colDeadFreightValue" },
      { key: "factura_transporte", labelKey: "colTransportInvoice" },
    ],
  },
  {
    groupLabelKey: "groupFacturacion",
    fields: [
      { key: "monto_facturado", labelKey: "colInvoicedAmount" },
      { key: "numero_factura_asli", labelKey: "colASLIInvoice" },
      { key: "concepto_facturado", labelKey: "colInvoicedConcept" },
      { key: "moneda", labelKey: "colCurrency" },
      { key: "tipo_cambio", labelKey: "colExchangeRate" },
      { key: "margen_estimado", labelKey: "colEstimatedMargin" },
      { key: "margen_real", labelKey: "colRealMargin" },
    ],
  },
  {
    groupLabelKey: "groupFechas",
    fields: [
      { key: "fecha_confirmacion_booking", labelKey: "colBookingConfirmation" },
      { key: "fecha_envio_documentacion", labelKey: "colDocSent" },
      { key: "fecha_entrega_bl", labelKey: "colBLDelivery" },
      { key: "fecha_entrega_factura", labelKey: "colInvoiceDelivery" },
      { key: "fecha_pago_cliente", labelKey: "colClientPayment" },
      { key: "fecha_pago_transporte", labelKey: "colTransportPayment" },
      { key: "fecha_cierre", labelKey: "colCloseDate" },
    ],
  },
  {
    groupLabelKey: "groupOtros",
    fields: [
      { key: "prioridad", labelKey: "colPriority" },
      { key: "operacion_critica", labelKey: "colCriticalOp" },
      { key: "origen_registro", labelKey: "colRecordOrigin" },
      { key: "observaciones", labelKey: "colObservations" },
    ],
  },
];
