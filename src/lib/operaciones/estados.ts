/**
 * Estados del flujo de exportación.
 *
 * Fuente única de verdad en el frontend. El catálogo equivalente vive en la
 * tabla `operaciones_estados` (migración 20260828000001) y ambos deben
 * mantenerse alineados: mismo código, mismo orden y mismo grupo.
 *
 * Ver FLUJO-DE-TRABAJO.md §4.10 y §13.2.
 */

export const ESTADOS_OPERACION = [
  "SOLICITADA",
  "EN_COTIZACION",
  "RESERVA_SOLICITADA",
  "RESERVA_CONFIRMADA",
  "EMBARQUE_EN_COORDINACION",
  "CARGA_COORDINADA",
  "CARGADA",
  "ZARPADA",
  "DOCUMENTACION_PENDIENTE",
  "DOCUMENTACION_EN_REVISION",
  "VB_DOCUMENTAL",
  "DUS_LEGALIZADO",
  "FULLSET_ENVIADO",
  "DOCUMENTACION_FISICA_ENVIADA",
  "OPERACION_CERRADA",
  "ROLEADA",
  "CANCELADA",
] as const;

export type EstadoOperacion = (typeof ESTADOS_OPERACION)[number];

export type GrupoEstado =
  | "COMERCIAL"
  | "COORDINACION"
  | "TRANSITO"
  | "DOCUMENTAL"
  | "CIERRE"
  | "EXCEPCION";

export type EstadoMeta = {
  etiqueta: string;
  orden: number;
  /** Fase del flujo de negocio (1 a 7). Null en estados de excepción. */
  fase: number | null;
  grupo: GrupoEstado;
  esFinal: boolean;
};

export const ESTADO_META: Record<EstadoOperacion, EstadoMeta> = {
  SOLICITADA: { etiqueta: "Solicitada", orden: 1, fase: 1, grupo: "COMERCIAL", esFinal: false },
  EN_COTIZACION: { etiqueta: "En cotización", orden: 2, fase: 1, grupo: "COMERCIAL", esFinal: false },
  RESERVA_SOLICITADA: { etiqueta: "Reserva solicitada", orden: 3, fase: 1, grupo: "COMERCIAL", esFinal: false },
  RESERVA_CONFIRMADA: { etiqueta: "Reserva confirmada", orden: 4, fase: 1, grupo: "COMERCIAL", esFinal: false },
  EMBARQUE_EN_COORDINACION: { etiqueta: "Embarque en coordinación", orden: 5, fase: 2, grupo: "COORDINACION", esFinal: false },
  CARGA_COORDINADA: { etiqueta: "Carga coordinada", orden: 6, fase: 3, grupo: "COORDINACION", esFinal: false },
  CARGADA: { etiqueta: "Cargada", orden: 7, fase: 4, grupo: "COORDINACION", esFinal: false },
  ZARPADA: { etiqueta: "Zarpada", orden: 8, fase: 4, grupo: "TRANSITO", esFinal: false },
  DOCUMENTACION_PENDIENTE: { etiqueta: "Documentación pendiente", orden: 9, fase: 5, grupo: "DOCUMENTAL", esFinal: false },
  DOCUMENTACION_EN_REVISION: { etiqueta: "Documentación en revisión", orden: 10, fase: 6, grupo: "DOCUMENTAL", esFinal: false },
  VB_DOCUMENTAL: { etiqueta: "VB documental", orden: 11, fase: 6, grupo: "DOCUMENTAL", esFinal: false },
  DUS_LEGALIZADO: { etiqueta: "DUS legalizado", orden: 12, fase: 6, grupo: "DOCUMENTAL", esFinal: false },
  FULLSET_ENVIADO: { etiqueta: "Fullset enviado", orden: 13, fase: 7, grupo: "CIERRE", esFinal: false },
  DOCUMENTACION_FISICA_ENVIADA: { etiqueta: "Documentación física enviada", orden: 14, fase: 7, grupo: "CIERRE", esFinal: false },
  OPERACION_CERRADA: { etiqueta: "Operación cerrada", orden: 15, fase: 7, grupo: "CIERRE", esFinal: true },
  ROLEADA: { etiqueta: "Roleada", orden: 90, fase: null, grupo: "EXCEPCION", esFinal: false },
  CANCELADA: { etiqueta: "Cancelada", orden: 91, fase: null, grupo: "EXCEPCION", esFinal: true },
};

export const ESTADO_INICIAL: EstadoOperacion = "SOLICITADA";

/**
 * Equivalencias de los 7 estados anteriores. Se conservan para leer datos que
 * no hayan pasado por la migración 20260828000002 y para interpretar filtros
 * guardados por el usuario.
 */
const ESTADOS_LEGADOS: Record<string, EstadoOperacion> = {
  PENDIENTE: "SOLICITADA",
  SOLICITADO: "SOLICITADA",
  SOLICITUD: "SOLICITADA",
  "EN PROCESO": "EMBARQUE_EN_COORDINACION",
  EN_PROCESO: "EMBARQUE_EN_COORDINACION",
  ABIERTA: "EMBARQUE_EN_COORDINACION",
  CONFIRMADA: "RESERVA_CONFIRMADA",
  "EN TRÁNSITO": "ZARPADA",
  "EN TRANSITO": "ZARPADA",
  EN_TRANSITO: "ZARPADA",
  ARRIBADO: "ZARPADA",
  ARRIBADA: "ZARPADA",
  COMPLETADO: "OPERACION_CERRADA",
  COMPLETADA: "OPERACION_CERRADA",
  CERRADA: "OPERACION_CERRADA",
  CANCELADO: "CANCELADA",
  ROLEADO: "ROLEADA",
};

export function normalizarEstado(estado: string | null | undefined): EstadoOperacion | null {
  if (!estado) return null;
  const limpio = estado.trim().toUpperCase();
  if ((ESTADOS_OPERACION as readonly string[]).includes(limpio)) {
    return limpio as EstadoOperacion;
  }
  return ESTADOS_LEGADOS[limpio] ?? null;
}

export function etiquetaEstado(estado: string | null | undefined): string {
  const codigo = normalizarEstado(estado);
  if (!codigo) return estado?.trim() ?? "";
  return ESTADO_META[codigo].etiqueta;
}

/**
 * Estados que dan por terminada la operación, para métricas y filtros.
 *
 * El arribo a destino ya no cuenta como cierre: la operación se cierra con el
 * fullset y los documentos físicos, y el arribo se registra aparte en
 * `operaciones.arribo_confirmado`. Ver FLUJO-DE-TRABAJO.md §4.11.
 */
export function esEstadoCerrado(estado: string | null | undefined): boolean {
  const codigo = normalizarEstado(estado);
  return codigo ? ESTADO_META[codigo].esFinal : false;
}

/** Estados ordenados según su posición en el flujo. */
export function estadosEnOrden(): EstadoOperacion[] {
  return [...ESTADOS_OPERACION].sort((a, b) => ESTADO_META[a].orden - ESTADO_META[b].orden);
}
