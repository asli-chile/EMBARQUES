/**
 * Qué operaciones entran en NaviTrack.
 *
 * NaviTrack carga solo las operaciones con nave, no canceladas y cuya ETA no
 * quedó hace más de `NAVITRACK_VENTANA_DIAS`. Otras pantallas enlazan a un
 * embarque concreto (`/navitrack?op=…`) y necesitan saber de antemano si ese
 * enlace va a mostrar algo: si no, llevan al usuario a un listado donde su
 * operación no aparece.
 *
 * La regla vive acá para que la consulta de NaviTrack y esos enlaces no
 * diverjan. Si cambia el filtro de la consulta, cambia esta función.
 */

/** Ventana hacia atrás: un embarque arribado hace más de esto ya no es seguimiento. */
export const NAVITRACK_VENTANA_DIAS = 21;

export function isoHaceDias(dias: number, ahora = new Date()): string {
  const d = new Date(ahora.getTime() - dias * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export type MotivoFueraDeNavitrack = "sinNave" | "cancelada" | "arribada";

type OpAlcance = {
  nave?: unknown;
  estado_operacion?: unknown;
  eta?: unknown;
};

/** `null` si NaviTrack muestra la operación; si no, por qué no. */
export function motivoFueraDeNavitrack(op: OpAlcance, ahora = new Date()): MotivoFueraDeNavitrack | null {
  if (op.nave == null || String(op.nave).trim() === "") return "sinNave";
  if (op.estado_operacion === "CANCELADA") return "cancelada";
  if (op.eta != null && String(op.eta).slice(0, 10) < isoHaceDias(NAVITRACK_VENTANA_DIAS, ahora)) return "arribada";
  return null;
}
