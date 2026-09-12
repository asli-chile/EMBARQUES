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

  const { data: existente } = await supabase
    .from("navitrack_recaladas")
    .select("id, estado")
    .eq("operacion_id", datos.operacionId)
    .eq("puerto", puerto)
    .maybeSingle();

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
    estado: "anunciada",
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
