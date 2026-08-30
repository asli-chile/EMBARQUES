/** Estilos de badge para estado_operacion (Mis Reservas / Registros / Papelera). */
import { normalizarEstado, type EstadoOperacion } from "../operaciones/estados";

export type EstadoOperacionStyle = {
  dot: string;
  bg: string;
  text: string;
  border: string;
};

const AMBAR: EstadoOperacionStyle = { dot: "bg-amber-400", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
const AZUL: EstadoOperacionStyle = { dot: "bg-blue-400", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" };
const VIOLETA: EstadoOperacionStyle = { dot: "bg-violet-400", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" };
const ESMERALDA: EstadoOperacionStyle = { dot: "bg-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
const NEUTRO: EstadoOperacionStyle = { dot: "bg-neutral-400", bg: "bg-neutral-100", text: "text-neutral-600", border: "border-neutral-200" };
const ROJO: EstadoOperacionStyle = { dot: "bg-red-400", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" };
const NARANJA: EstadoOperacionStyle = { dot: "bg-orange-400", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" };

/** Un color por grupo del flujo: comercial ámbar, coordinación azul, tránsito violeta, documental esmeralda, cierre neutro. */
export const ESTADO_OPERACION_STYLES: Record<EstadoOperacion, EstadoOperacionStyle> = {
  SOLICITADA: AMBAR,
  EN_COTIZACION: AMBAR,
  RESERVA_SOLICITADA: AMBAR,
  RESERVA_CONFIRMADA: AMBAR,
  EMBARQUE_EN_COORDINACION: AZUL,
  CARGA_COORDINADA: AZUL,
  CARGADA: AZUL,
  ZARPADA: VIOLETA,
  DOCUMENTACION_PENDIENTE: ESMERALDA,
  DOCUMENTACION_EN_REVISION: ESMERALDA,
  VB_DOCUMENTAL: ESMERALDA,
  DUS_LEGALIZADO: ESMERALDA,
  FULLSET_ENVIADO: NEUTRO,
  DOCUMENTACION_FISICA_ENVIADA: NEUTRO,
  OPERACION_CERRADA: NEUTRO,
  ROLEADA: NARANJA,
  CANCELADA: ROJO,
};

export function getEstadoOperacionStyle(estado: string | null | undefined): EstadoOperacionStyle | null {
  const codigo = normalizarEstado(estado);
  if (!codigo) return null;
  return ESTADO_OPERACION_STYLES[codigo] ?? null;
}
