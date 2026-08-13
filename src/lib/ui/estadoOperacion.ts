/** Estilos de badge para estado_operacion (Mis Reservas / Registros / Papelera). */
export type EstadoOperacionStyle = {
  dot: string;
  bg: string;
  text: string;
  border: string;
};

export const ESTADO_OPERACION_STYLES: Record<string, EstadoOperacionStyle> = {
  PENDIENTE: { dot: "bg-amber-400", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "EN PROCESO": { dot: "bg-blue-400", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "EN TRÁNSITO": { dot: "bg-violet-400", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  ARRIBADO: { dot: "bg-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  COMPLETADO: { dot: "bg-neutral-400", bg: "bg-neutral-100", text: "text-neutral-600", border: "border-neutral-200" },
  CANCELADO: { dot: "bg-red-400", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  ROLEADO: { dot: "bg-orange-400", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
};

export function getEstadoOperacionStyle(estado: string | null | undefined): EstadoOperacionStyle | null {
  if (!estado) return null;
  return ESTADO_OPERACION_STYLES[estado] ?? null;
}
