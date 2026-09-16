/**
 * Puertos que el buque va anunciando, y cuándo toca verificarlos.
 *
 * El AIS declara el **próximo puerto**, no el destino final. Un buque de San
 * Antonio a Tokio anuncia Callao, luego Balboa, luego otro. Cada anuncio abre
 * una pregunta que nadie puede responder desde el dato: ¿es una parada del
 * itinerario o ahí la carga cambia de barco?
 *
 * La respuesta llega sola en el peor momento —cuando el contenedor no aparece—
 * así que el sistema la pregunta antes: **el día que el buque dice que va a
 * llegar a ese puerto**, la recalada pasa a `por_verificar` y alguien la mira.
 *
 * Antes de esa fecha no se molesta a nadie. Un buque que anuncia Callao con
 * diez días de anticipación no es noticia; que haya llegado a Callao sí.
 */

import { mismoPuerto } from "@/components/navitrack/navitrack-model";

type Cliente = { from: (tabla: string) => any };

export type RecaladaPendiente = {
  id: number;
  operacionId: string;
  puerto: string;
  nave: string | null;
  etaAnunciada: string | null;
};

export type ResultadoRecaladas = {
  /** Puertos vistos por primera vez en esta corrida. */
  nuevas: number;
  /** Recaladas que hoy pasaron a requerir verificación. */
  porVerificar: RecaladaPendiente[];
};

/** Nombres de puerto comparables: el AIS los escribe de cualquier manera. */
function normalizar(puerto: string | null | undefined): string {
  return String(puerto ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Registra el puerto que declara un buque para cada embarque suyo.
 *
 * Se llama una vez por lectura del chequeo diario. No consulta al proveedor:
 * trabaja con el destino que ya vino en esa lectura, así que no gasta nada.
 */
export async function registrarAnuncio(
  supabase: Cliente,
  datos: {
    operacionId: string;
    puertoDeclarado: string;
    nave: string | null;
    etaDeclarada: string | null;
    /** POD comprometido: si el buque declara el destino final, no hay nada que verificar. */
    pod: string | null;
  },
): Promise<"nueva" | "repetida" | "ignorada"> {
  const puerto = datos.puertoDeclarado.trim();
  if (!puerto) return "ignorada";

  // Declarar el destino final no abre ninguna pregunta.
  const p = normalizar(puerto);
  const pod = normalizar(datos.pod);
  if (p && pod && (p.includes(pod) || pod.includes(p))) return "ignorada";

  /*
   * Viaje marcado como directo.
   *
   * Alguien con el booking a la vista afirmó que la carga no cambia de nave.
   * Los puertos que el buque anuncie se anotan igual —son parte del recorrido y
   * del historial— pero ya resueltos: no preguntan ni avisan.
   */
  const { data: viaje } = await supabase
    .from("navitrack_viajes")
    .select("modo")
    .eq("operacion_id", datos.operacionId)
    .maybeSingle();
  const esDirecto = viaje?.modo === "directo";

  /*
   * El puerto ya anotado se busca por identidad de lugar, no por texto exacto.
   *
   * Comparando `eq("puerto", puerto)`, el mismo Rotterdam entraba de nuevo en
   * cuanto el buque cambiaba el rótulo a "Rotterdam anch": dos filas, dos
   * verificaciones pendientes y dos líneas en el historial para una sola
   * parada. Se trae lo anotado para este embarque y se compara con la misma
   * regla que usa el mapa.
   */
  const { data: anotadas } = await supabase
    .from("navitrack_recaladas")
    .select("id, estado, puerto")
    .eq("operacion_id", datos.operacionId);

  const existente = ((anotadas ?? []) as { id: number; estado: string; puerto: string }[]).find((r) =>
    mismoPuerto(r.puerto, puerto),
  );

  if (existente) {
    // Sigue declarando el mismo puerto: solo se refresca cuándo se vio.
    await supabase
      .from("navitrack_recaladas")
      .update({ visto_at: new Date().toISOString(), eta_anunciada: datos.etaDeclarada })
      .eq("id", existente.id);
    return "repetida";
  }

  await supabase.from("navitrack_recaladas").insert({
    operacion_id: datos.operacionId,
    puerto,
    nave: datos.nave,
    eta_anunciada: datos.etaDeclarada,
    estado: esDirecto ? "parada_programada" : "anunciada",
    decidido_at: esDirecto ? new Date().toISOString() : null,
    notas: esDirecto ? "Viaje marcado como directo: no requiere verificación." : null,
  });
  return "nueva";
}

/**
 * Anota el puerto donde el buque **ya paró**, según el AIS.
 *
 * Es el otro dato de la misma lectura, y el que el cliente realmente pregunta:
 * no por dónde dice el buque que va a pasar, sino por dónde pasó. Se descartaba
 * entero —vivía solo en el JSON crudo—, así que el historial mostraba futuro
 * anunciado y ningún puerto tocado.
 *
 * Tres cosas lo separan de `registrarAnuncio`:
 *
 * 1. **Se anota siempre**, incluso en un viaje marcado directo. Que nadie tenga
 *    que verificar nada no quita que el buque haya parado ahí, y esconderlo
 *    deja al cliente sin saber dónde está su carga. Directo significa "no
 *    preguntes", no "no lo cuentes".
 * 2. **No abre una verificación.** `marcarPorVerificar` se alimenta solo de
 *    `anunciada`: una recalada es un hecho, no una pregunta.
 * 3. **No pisa el estado de una fila existente.** Si ese puerto ya estaba
 *    anunciado o por verificar, solo se le agrega el hecho —`recalado_at` y el
 *    zarpe—; cerrar la pregunta sería afirmar que la carga no cambió de barco,
 *    que es justo lo que nadie ha comprobado.
 */
export async function registrarRecalada(
  supabase: Cliente,
  datos: {
    operacionId: string;
    puerto: string;
    nave: string | null;
    /** Zarpe real de ese puerto (`atdUtc` del AIS). */
    zarpeAt: string | null;
    /** POL y POD del embarque: los extremos ya tienen su propio hito. */
    pol: string | null;
    pod: string | null;
  },
): Promise<"nueva" | "repetida" | "ignorada"> {
  const puerto = datos.puerto.trim();
  if (!puerto) return "ignorada";
  if (mismoPuerto(puerto, datos.pol) || mismoPuerto(puerto, datos.pod)) return "ignorada";

  const ahora = new Date().toISOString();

  const { data: anotadas } = await supabase
    .from("navitrack_recaladas")
    .select("id, estado, puerto, recalado_at")
    .eq("operacion_id", datos.operacionId);

  const existente = (
    (anotadas ?? []) as { id: number; estado: string; puerto: string; recalado_at: string | null }[]
  ).find((r) => mismoPuerto(r.puerto, puerto));

  if (existente) {
    await supabase
      .from("navitrack_recaladas")
      .update({
        // La primera vez que consta la parada es la que vale: releer la misma
        // lectura mañana no la convierte en una escala más reciente.
        recalado_at: existente.recalado_at ?? ahora,
        zarpe_at: datos.zarpeAt,
        visto_at: ahora,
      })
      .eq("id", existente.id);
    return "repetida";
  }

  await supabase.from("navitrack_recaladas").insert({
    operacion_id: datos.operacionId,
    puerto,
    nave: datos.nave,
    estado: "recalada",
    recalado_at: ahora,
    zarpe_at: datos.zarpeAt,
  });
  return "nueva";
}

/**
 * Pasa a `por_verificar` las recaladas cuya fecha anunciada ya llegó.
 *
 * Sin ETA anunciada se usa un plazo prudente desde que se vio el anuncio: es
 * preferible preguntar tarde que no preguntar nunca.
 */
export async function marcarPorVerificar(
  supabase: Cliente,
  diasSinEta = 7,
): Promise<RecaladaPendiente[]> {
  const ahora = new Date();

  const { data } = await supabase
    .from("navitrack_recaladas")
    .select("id, operacion_id, puerto, nave, eta_anunciada, anunciado_at")
    .eq("estado", "anunciada")
    .limit(200);

  const vencidas = ((data ?? []) as {
    id: number;
    operacion_id: string;
    puerto: string;
    nave: string | null;
    eta_anunciada: string | null;
    anunciado_at: string;
  }[]).filter((r) => {
    if (r.eta_anunciada) return new Date(r.eta_anunciada) <= ahora;
    const desde = new Date(r.anunciado_at);
    return ahora.getTime() - desde.getTime() >= diasSinEta * 86_400_000;
  });

  if (!vencidas.length) return [];

  await supabase
    .from("navitrack_recaladas")
    .update({ estado: "por_verificar" })
    .in(
      "id",
      vencidas.map((r) => r.id),
    );

  return vencidas.map((r) => ({
    id: r.id,
    operacionId: r.operacion_id,
    puerto: r.puerto,
    nave: r.nave,
    etaAnunciada: r.eta_anunciada,
  }));
}
