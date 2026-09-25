/**
 * El itinerario de la carga, tal como lo informó la naviera.
 *
 * Se decide una sola vez por embarque, con la confirmación de la reserva en la
 * mano: o el viaje es directo, o tiene uno o más transbordos en puertos
 * conocidos. De esa respuesta sale todo lo demás, y ya no se pregunta puerto
 * por puerto.
 *
 * La regla es corta a propósito:
 *
 *   - Un puerto que coincide con un transbordo declarado es `transbordo`.
 *   - Cualquier otro puerto que anuncie el AIS, antes o después del transbordo,
 *     es una `parada_programada`: el buque completa carga en puertos
 *     intermedios y a nadie le interesa confirmarlo, solo mostrarlo.
 *   - Sin itinerario todavía, el puerto se anota sin decidir (`anunciada` o
 *     `recalada`). No abre ninguna pregunta: lo que falta es el itinerario, y
 *     eso se pide una sola vez, no una por puerto.
 *
 * Dónde vive: el modo en `navitrack_viajes`, y los transbordos como la cadena
 * de `navitrack_tramos`. Un transbordo es el punto donde termina un tramo y
 * empieza el siguiente, así que los puertos de transbordo son los POD de todos
 * los tramos menos el último.
 */

import { mismoPuerto } from "@/components/navitrack/navitrack-model";

type Cliente = { from: (tabla: string) => any };

export type ModoViaje = "directo" | "con_transbordo";

export type Itinerario = {
  /** Null mientras nadie haya dicho si es directo o con transbordo. */
  modo: ModoViaje | null;
  /** Puertos donde la carga cambia de nave, en orden de recorrido. */
  transbordos: string[];
};

/** Puertos de transbordo a partir de la cadena de tramos. */
export function puertosDeTransbordo(
  tramos: { orden: number; pod: string | null }[],
): string[] {
  const ordenados = [...tramos].sort((a, b) => a.orden - b.orden);
  return ordenados
    .slice(0, -1)
    .map((t) => (t.pod ?? "").trim())
    .filter(Boolean);
}

export async function leerItinerario(supabase: Cliente, operacionId: string): Promise<Itinerario> {
  const [viajeRes, tramosRes] = await Promise.all([
    supabase.from("navitrack_viajes").select("modo").eq("operacion_id", operacionId).maybeSingle(),
    supabase.from("navitrack_tramos").select("orden, pod").eq("operacion_id", operacionId),
  ]);
  const tramos = (tramosRes.data ?? []) as { orden: number; pod: string | null }[];
  const modoGuardado = (viajeRes.data as { modo?: string } | null)?.modo;
  /*
   * Una cadena de tramos es un itinerario con transbordo aunque falte la fila
   * de `navitrack_viajes`. Así quedaron embarques cargados antes de que el
   * modo existiera (A00042 tiene tres naves y ningún modo), y tratarlos como
   * "sin definir" pediría de nuevo un dato que ya está.
   */
  const modo: ModoViaje | null =
    modoGuardado === "directo" || modoGuardado === "con_transbordo"
      ? modoGuardado
      : tramos.length > 1
        ? "con_transbordo"
        : null;
  return { modo, transbordos: modo === "con_transbordo" ? puertosDeTransbordo(tramos) : [] };
}

/**
 * Qué es un puerto para esta carga, según el itinerario.
 *
 * Null cuando el itinerario no está definido: el puerto se anota igual, pero
 * nadie puede decir todavía qué es.
 */
export function estadoSegunItinerario(
  itinerario: Itinerario,
  puerto: string,
): "transbordo" | "parada_programada" | null {
  if (itinerario.transbordos.some((t) => mismoPuerto(t, puerto))) return "transbordo";
  return itinerario.modo ? "parada_programada" : null;
}
