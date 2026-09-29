/**
 * Operaciones de demostración, fuera del seguimiento real.
 *
 * Las del cliente ASLI son ficticias: se cargaron para publicidad y
 * demostraciones (al 29-09-2026, 23 operaciones, todas en la temporada
 * `asli`). Ocho de ellas tenían nave asignada y sin arribo, así que entraban a
 * la ventana de seguimiento: se pagaban consultas AIS por buques que no llevan
 * carga nuestra y aparecían en el reporte diario como embarques reales.
 *
 * Se filtran por cliente, que es como se definen. Todo lo que decide a quién
 * consultar o qué reportar pasa por aquí: la ventana, la sincronía del
 * seguimiento, el chequeo diario, la actualización manual y el panel de
 * rastreo. La pantalla de NaviTrack de una cuenta cliente ASLI no usa este
 * filtro: esa cuenta sí debe ver sus operaciones de demostración.
 */
export const CLIENTE_DEMO = "ASLI";

/** ¿Es una operación de demostración? Para filas ya leídas. */
export function esOperacionDemo(cliente: string | null | undefined): boolean {
  return (cliente ?? "").trim().toUpperCase() === CLIENTE_DEMO;
}

/**
 * Excluye las operaciones de demostración de una consulta a `operaciones`.
 * `cliente` nunca es NULL en la base, así que el `not ilike` no descarta
 * filas reales por accidente.
 */
export function sinOperacionesDemo<Q extends { not: (columna: string, operador: string, valor: string) => Q }>(q: Q): Q {
  return q.not("cliente", "ilike", CLIENTE_DEMO);
}
