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
  refAsli: 110,

  // ─── INFORMACIÓN GENERAL ───────────────────────────────────────────────────
  ingreso: 140,
  semana: 90,
  ejecutivo: 150,
  estadoOperacion: 160,
  tipoOperacion: 150,
  cliente: 180,
  consignatario: 160,

  // ─── COMERCIAL ─────────────────────────────────────────────────────────────
  incoterm: 110,
  formaPago: 130,

  // ─── CARGA ─────────────────────────────────────────────────────────────────
  especie: 130,
  pais: 140,
  temperatura: 110,
  ventilacion: 110,
  tratamientoFrio: 170,
  tratamientoFrioO2: 80,
  tratamientoFrioCo2: 80,
  tipoAtmosfera: 170,
  pallets: 90,
  pesoBruto: 130,
  pesoNeto: 130,
  tipoUnidad: 130,

  // ─── NAVIERA / EMBARQUE ────────────────────────────────────────────────────
  naviera: 150,
  nave: 190,
  viaje: 120,
  pol: 150,
  etd: 155,
  pod: 155,
  eta: 155,
  tt: 110,
  booking: 140,

  // ─── DOCUMENTACIÓN ─────────────────────────────────────────────────────────
  aga: 100,
  dus: 100,
  sps: 100,
  numeroGuiaDespacho: 160,

  // ─── PLANTA / STACKING ─────────────────────────────────────────────────────
  plantaPresentacion: 175,
  citacion: 145,
  llegadaPlanta: 155,
  salidaPlanta: 150,
  inicioStacking: 155,
  finStacking: 150,
  ingresoStacking: 160,
  corteDocumental: 160,

  // ─── LATE / XLATE ──────────────────────────────────────────────────────────
  infLate: 140,
  lateInicio: 145,
  lateFin: 140,
  xlateInicio: 145,
  xlateFin: 140,

  // ─── DEPÓSITO / RETIRO ─────────────────────────────────────────────────────
  deposito: 160,
  agendamientoRetiro: 170,
  devolucionUnidad: 165,

  // ─── TRANSPORTE ────────────────────────────────────────────────────────────
  transporte: 160,
  chofer: 150,
  rutChofer: 120,
  telefonoChofer: 145,
  patenteCamion: 145,
  patenteRemolque: 155,
  contenedor: 140,
  sello: 110,
  tara: 90,

  // ─── COSTOS TRANSPORTE ─────────────────────────────────────────────────────
  almacenamiento: 170,
  tramo: 200,
  valorTramo: 130,
  porteo: 100,
  valorPorteo: 140,
  falsoFlete: 120,
  valorFalsoFlete: 175,
  facturaTransporte: 160,

  // ─── FACTURACIÓN ───────────────────────────────────────────────────────────
  montoFacturado: 160,
  numeroFacturaAsli: 160,
  conceptoFacturado: 175,
  moneda: 90,
  tipoCambio: 130,
  margenEstimado: 160,
  margenReal: 140,

  // ─── FECHAS ADMINISTRATIVAS ────────────────────────────────────────────────
  fechaConfirmacionBooking: 185,
  fechaEnvioDocumentacion: 185,
  fechaEntregaBl: 155,
  fechaEntregaFactura: 165,
  fechaPagoCliente: 160,
  fechaPagoTransporte: 170,
  fechaCierre: 145,

  // ─── OTROS ─────────────────────────────────────────────────────────────────
  prioridad: 110,
  operacionCritica: 150,
  origenRegistro: 140,
  observaciones: 220,
} as const;

export type ColumnWidthKey = keyof typeof columnWidths;
