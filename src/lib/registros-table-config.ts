/**
 * Configuración de anchos de columnas para la tabla de Registros
 * 
 * Modifica los valores de `width` para ajustar el tamaño inicial de cada columna.
 * Los valores están en píxeles.
 * 
 * Tipos de columnas:
 * - xs: 48-60px (checkboxes, íconos)
 * - sm: 80-100px (códigos cortos, números)
 * - md: 110-140px (textos medianos, fechas)
 * - lg: 150-200px (textos largos, descripciones)
 */

export const columnWidths = {
  // ─── COLUMNAS FIJAS ────────────────────────────────────────────────────────
  checkbox: 48,
  refAsli: 100,

  // ─── INFORMACIÓN GENERAL ───────────────────────────────────────────────────
  ingreso: 140,
  semana: 80,
  ejecutivo: 140,
  estadoOperacion: 140,
  tipoOperacion: 100,
  cliente: 100,
  consignatario: 130,

  // ─── COMERCIAL ─────────────────────────────────────────────────────────────
  incoterm: 100,
  formaPago: 90,

  // ─── CARGA ─────────────────────────────────────────────────────────────────
  especie: 120,
  pais: 130,
  temperatura: 80,
  ventilacion: 100,
  pallets: 80,
  pesoBruto: 120,
  pesoNeto: 120,
  tipoUnidad: 120,

  // ─── NAVIERA / EMBARQUE ────────────────────────────────────────────────────
  naviera: 100,
  nave: 180,
  pol: 140,
  etd: 130,
  pod: 150,
  eta: 130,
  tt: 110,
  booking: 120,

  // ─── DOCUMENTACIÓN ─────────────────────────────────────────────────────────
  aga: 100,
  dus: 100,
  sps: 100,
  numeroGuiaDespacho: 140,

  // ─── PLANTA / STACKING ─────────────────────────────────────────────────────
  plantaPresentacion: 150,
  citacion: 140,
  llegadaPlanta: 140,
  salidaPlanta: 140,
  inicioStacking: 140,
  finStacking: 140,
  ingresoStacking: 140,
  corteDocumental: 140,

  // ─── LATE / XLATE ──────────────────────────────────────────────────────────
  infLate: 140,
  lateInicio: 140,
  lateFin: 140,
  xlateInicio: 140,
  xlateFin: 140,

  // ─── DEPÓSITO / RETIRO ─────────────────────────────────────────────────────
  deposito: 150,
  agendamientoRetiro: 150,
  devolucionUnidad: 150,

  // ─── TRANSPORTE ────────────────────────────────────────────────────────────
  transporte: 150,
  chofer: 140,
  rutChofer: 110,
  telefonoChofer: 130,
  patenteCamion: 130,
  patenteRemolque: 140,
  contenedor: 130,
  sello: 100,
  tara: 90,

  // ─── COSTOS TRANSPORTE ─────────────────────────────────────────────────────
  almacenamiento: 150,
  tramo: 100,
  valorTramo: 120,
  porteo: 80,
  valorPorteo: 130,
  falsoFlete: 100,
  valorFalsoFlete: 150,
  facturaTransporte: 140,

  // ─── FACTURACIÓN ───────────────────────────────────────────────────────────
  montoFacturado: 150,
  numeroFacturaAsli: 140,
  conceptoFacturado: 150,
  moneda: 80,
  tipoCambio: 120,
  margenEstimado: 150,
  margenReal: 130,

  // ─── FECHAS ADMINISTRATIVAS ────────────────────────────────────────────────
  fechaConfirmacionBooking: 160,
  fechaEnvioDocumentacion: 160,
  fechaEntregaBl: 140,
  fechaEntregaFactura: 140,
  fechaPagoCliente: 140,
  fechaPagoTransporte: 140,
  fechaCierre: 140,

  // ─── OTROS ─────────────────────────────────────────────────────────────────
  prioridad: 100,
  operacionCritica: 130,
  origenRegistro: 120,
  observaciones: 200,
} as const;

export type ColumnWidthKey = keyof typeof columnWidths;
