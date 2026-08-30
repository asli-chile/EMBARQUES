/**
 * Tareas de una operación.
 *
 * Espejo de las tablas `operaciones_tareas` y `operaciones_tareas_plantilla`
 * (migración 20260829000001). Ver FLUJO-DE-TRABAJO.md §13.3.
 */

export const ESTADOS_TAREA = ["PENDIENTE", "EN_CURSO", "COMPLETADA", "CANCELADA", "VENCIDA"] as const;

export type EstadoTarea = (typeof ESTADOS_TAREA)[number];

export const ESTADO_TAREA_ETIQUETA: Record<EstadoTarea, string> = {
  PENDIENTE: "Pendiente",
  EN_CURSO: "En curso",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
  VENCIDA: "Vencida",
};

/** Una tarea está abierta mientras no se completa ni se cancela. */
export function esTareaAbierta(estado: string | null | undefined): boolean {
  return estado === "PENDIENTE" || estado === "EN_CURSO" || estado === "VENCIDA";
}

export type UrgenciaTarea = "vencida" | "hoy" | "proxima" | "sin_fecha" | "cerrada";

/**
 * Clasifica una tarea por cuánto aprieta su plazo. `proxima` cubre los
 * siguientes 7 días, que es el horizonte con el que trabaja el ejecutivo.
 */
export function urgenciaTarea(
  estado: string | null | undefined,
  fechaLimite: string | null,
  hoy: Date = new Date(),
): UrgenciaTarea {
  if (!esTareaAbierta(estado)) return "cerrada";
  if (!fechaLimite) return "sin_fecha";

  const limite = new Date(fechaLimite);
  if (Number.isNaN(limite.getTime())) return "sin_fecha";

  const diaLimite = new Date(limite.getFullYear(), limite.getMonth(), limite.getDate());
  const diaHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const dias = Math.round((diaLimite.getTime() - diaHoy.getTime()) / 86_400_000);

  if (dias < 0) return "vencida";
  if (dias === 0) return "hoy";
  if (dias <= 7) return "proxima";
  return "sin_fecha";
}

/** Días restantes hasta el plazo. Negativo si ya venció. */
export function diasRestantes(fechaLimite: string | null, hoy: Date = new Date()): number | null {
  if (!fechaLimite) return null;
  const limite = new Date(fechaLimite);
  if (Number.isNaN(limite.getTime())) return null;

  const diaLimite = new Date(limite.getFullYear(), limite.getMonth(), limite.getDate());
  const diaHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((diaLimite.getTime() - diaHoy.getTime()) / 86_400_000);
}
