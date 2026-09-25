/**
 * Puertos por donde pasa la carga, según el AIS y el itinerario.
 *
 * El AIS declara el **próximo puerto**, no el destino final. Un buque de
 * Valparaíso a Leixões con transbordo en Rotterdam anuncia Callao, luego
 * Balboa, luego Rotterdam, luego Amberes. Qué es cada uno no lo decide este
 * archivo ni lo pregunta: lo dice el itinerario que se cargó con la reserva
 * (ver `itinerario.ts`). Rotterdam es el transbordo; los demás, paradas
 * programadas que solo se muestran.
 *
 * Lo que sí hace es guardar los hechos, que el AIS informa una sola vez:
 *
 *   - cuándo llegó el buque a un puerto: la primera lectura que lo ve atracado
 *     o fondeado frente a él (`recalado_at`);
 *   - cuándo zarpó: `atdUtc`, que el proveedor entrega junto al último puerto
 *     (`zarpe_at`).
 *
 * Sin guardarlos, cada puerto desaparece del historial en cuanto el buque toca
 * el siguiente.
 */

import { mismoPuerto } from "@/components/navitrack/navitrack-model";
import { estadoSegunItinerario, leerItinerario } from "@/lib/navitrack/itinerario";

type Cliente = { from: (tabla: string) => any };

/** El buque está detenido en un puerto, no navegando hacia él. */
function estaDetenido(navStatus: string | null | undefined): boolean {
  return /moor|anchor|berth/i.test(String(navStatus ?? ""));
}

/** Estados que todavía no dicen nada: los reemplaza el itinerario apenas existe. */
const SIN_DECIDIR = ["anunciada", "por_verificar", "recalada"];

type FilaAnotada = { id: number; estado: string; puerto: string; recalado_at: string | null };

async function anotadasDe(supabase: Cliente, operacionId: string): Promise<FilaAnotada[]> {
  const { data } = await supabase
    .from("navitrack_recaladas")
    .select("id, estado, puerto, recalado_at")
    .eq("operacion_id", operacionId);
  return (data ?? []) as FilaAnotada[];
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
    /** Estado de navegación de la misma lectura: detenido frente al puerto = llegó. */
    navStatus?: string | null;
    /** Cuándo se tomó la posición. Es la mejor aproximación a la hora de llegada. */
    recibidoAt?: string | null;
    /** Extremos del embarque: ninguno de los dos es una escala. */
    pol: string | null;
    pod: string | null;
  },
): Promise<"nueva" | "repetida" | "ignorada"> {
  const puerto = datos.puertoDeclarado.trim();
  if (!puerto) return "ignorada";

  /*
   * Los extremos del viaje no son recaladas.
   *
   * En el origen el buque todavía no zarpó: declara el puerto donde está
   * cargando. El A00052 quedó así, preguntando si la carga cambiaba de barco en
   * San Antonio, el puerto del que aún no salía. La comparación la hace
   * `mismoPuerto` y no un cotejo de texto: el AIS escribe "Hamburg Germany"
   * donde el ERP dice "HAMBURGO".
   */
  if (mismoPuerto(puerto, datos.pol) || mismoPuerto(puerto, datos.pod)) return "ignorada";

  const itinerario = await leerItinerario(supabase, datos.operacionId);
  const segun = estadoSegunItinerario(itinerario, puerto);

  /*
   * Detenido frente al puerto que declara: el buque llegó.
   *
   * El proveedor no informa la hora de llegada, solo la de zarpe. La primera
   * lectura que lo ve atracado o fondeado con ese destino es lo más cerca que
   * se puede estar sin inventar el dato, y se guarda una sola vez.
   */
  const llegoAhora = estaDetenido(datos.navStatus)
    ? (datos.recibidoAt ?? new Date().toISOString())
    : null;

  /*
   * El puerto ya anotado se busca por identidad de lugar, no por texto exacto.
   *
   * El AIS reescribe el destino al acercarse —"Rotterdam Netherlands" pasa a
   * "Rotterdam anch Netherlands"— y comparando texto eso eran dos filas y dos
   * líneas en el historial para una sola parada.
   */
  const existente = (await anotadasDe(supabase, datos.operacionId)).find((r) =>
    mismoPuerto(r.puerto, puerto),
  );

  if (existente) {
    const cambios: Record<string, unknown> = {
      visto_at: new Date().toISOString(),
      eta_anunciada: datos.etaDeclarada,
    };
    if (llegoAhora && !existente.recalado_at) cambios.recalado_at = llegoAhora;
    if (segun && SIN_DECIDIR.includes(existente.estado)) cambios.estado = segun;
    await supabase.from("navitrack_recaladas").update(cambios).eq("id", existente.id);
    return "repetida";
  }

  await supabase.from("navitrack_recaladas").insert({
    operacion_id: datos.operacionId,
    puerto,
    nave: datos.nave,
    eta_anunciada: datos.etaDeclarada,
    recalado_at: llegoAhora,
    estado: segun ?? "anunciada",
    decidido_at: segun ? new Date().toISOString() : null,
  });
  return "nueva";
}

/**
 * Anota el puerto donde el buque **ya paró**, según el AIS.
 *
 * Es el otro dato de la misma lectura, y el que el cliente realmente pregunta:
 * no por dónde dice el buque que va a pasar, sino por dónde pasó. Trae además
 * la hora exacta de zarpe, que es el único dato de tiempo real que entrega el
 * proveedor para un puerto.
 *
 * Si ese puerto es un transbordo, confirma el tramo que empieza ahí: el buque
 * que traía la carga ya estuvo en el puerto de conexión, así que el cambio de
 * nave dejó de ser un anuncio.
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
  const itinerario = await leerItinerario(supabase, datos.operacionId);
  const segun = estadoSegunItinerario(itinerario, puerto);

  if (segun === "transbordo") {
    // Se compara por lugar y no con `ilike`: "Rotterdam" y "ROTTERDAM
    // NETHERLANDS" son el mismo puerto y ningún cotejo de texto lo sabe.
    const { data: tramos } = await supabase
      .from("navitrack_tramos")
      .select("id, pol, nave, confirmado")
      .eq("operacion_id", datos.operacionId)
      .gt("orden", 1);
    for (const t of (tramos ?? []) as {
      id: number;
      pol: string | null;
      nave: string | null;
      confirmado: boolean;
    }[]) {
      if (!t.confirmado && t.nave && mismoPuerto(t.pol, puerto)) {
        await supabase.from("navitrack_tramos").update({ confirmado: true }).eq("id", t.id);
      }
    }
  }

  const existente = (await anotadasDe(supabase, datos.operacionId)).find((r) =>
    mismoPuerto(r.puerto, puerto),
  );

  if (existente) {
    const cambios: Record<string, unknown> = {
      // La primera vez que consta la parada es la que vale: releer la misma
      // lectura mañana no la convierte en una escala más reciente.
      recalado_at: existente.recalado_at ?? ahora,
      zarpe_at: datos.zarpeAt,
      visto_at: ahora,
    };
    if (segun && SIN_DECIDIR.includes(existente.estado)) cambios.estado = segun;
    await supabase.from("navitrack_recaladas").update(cambios).eq("id", existente.id);
    return "repetida";
  }

  await supabase.from("navitrack_recaladas").insert({
    operacion_id: datos.operacionId,
    puerto,
    nave: datos.nave,
    estado: segun ?? "recalada",
    decidido_at: segun ? ahora : null,
    recalado_at: ahora,
    zarpe_at: datos.zarpeAt,
  });
  return "nueva";
}

export type TransbordoSinNave = {
  operacionId: string;
  puerto: string;
  /** Nave que trajo la carga hasta el puerto de transbordo. */
  naveAnterior: string | null;
  /** Llegada real si consta; si no, la anunciada por la naviera. */
  llegada: string | null;
  /** La llegada es la real del AIS, no la anunciada. */
  llegoSegunAis: boolean;
};

/**
 * Transbordos a los que ya llegó la carga sin que se sepa a qué nave pasa.
 *
 * Es el único caso en que el sistema pide algo: se cargó "transbordo en
 * Rodman" sin la nave, porque la naviera no la había informado, y el buque ya
 * está en Rodman. Desde ese momento la carga no tiene a quién seguirse.
 *
 * Cuenta como llegada la real del AIS o, si no hay lectura, la fecha que
 * anunció la naviera para ese puerto.
 */
export async function transbordosSinNave(
  supabase: Cliente,
  ahora = new Date(),
): Promise<TransbordoSinNave[]> {
  const { data: huecos } = await supabase
    .from("navitrack_tramos")
    .select("operacion_id, orden, pol")
    .is("nave", null)
    .gt("orden", 1)
    .limit(500);

  const pendientes = (huecos ?? []) as { operacion_id: string; orden: number; pol: string | null }[];
  if (!pendientes.length) return [];

  const ids = [...new Set(pendientes.map((t) => t.operacion_id))];
  const [anterioresRes, recRes] = await Promise.all([
    supabase.from("navitrack_tramos").select("operacion_id, orden, nave, eta").in("operacion_id", ids),
    supabase
      .from("navitrack_recaladas")
      .select("operacion_id, puerto, recalado_at")
      .in("operacion_id", ids)
      .not("recalado_at", "is", null),
  ]);
  const anteriores = (anterioresRes.data ?? []) as {
    operacion_id: string;
    orden: number;
    nave: string | null;
    eta: string | null;
  }[];
  const recaladas = (recRes.data ?? []) as { operacion_id: string; puerto: string; recalado_at: string }[];
  const hoy = ahora.toISOString().slice(0, 10);

  const salida: TransbordoSinNave[] = [];
  for (const t of pendientes) {
    const puerto = (t.pol ?? "").trim();
    if (!puerto) continue;
    const previo = anteriores.find((a) => a.operacion_id === t.operacion_id && a.orden === t.orden - 1);
    const real = recaladas.find((r) => r.operacion_id === t.operacion_id && mismoPuerto(r.puerto, puerto));
    const anunciadaVencida = Boolean(previo?.eta && previo.eta <= hoy);
    if (!real && !anunciadaVencida) continue;
    salida.push({
      operacionId: t.operacion_id,
      puerto,
      naveAnterior: previo?.nave ?? null,
      llegada: real?.recalado_at ?? previo?.eta ?? null,
      llegoSegunAis: Boolean(real),
    });
  }
  return salida;
}
