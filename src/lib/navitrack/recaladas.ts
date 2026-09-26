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

import { getPortCoordinates } from "@/lib/ports-coordinates";
import { haversineKm, mismoPuerto, MISMO_PUERTO_KM } from "@/components/navitrack/navitrack-model";
import { estadoSegunItinerario, leerItinerario } from "@/lib/navitrack/itinerario";
import { claveAis } from "@/lib/navitrack/ventana";

type Cliente = { from: (tabla: string) => any };

/** El buque está detenido en algún lado, no navegando. Por sí solo no dice dónde. */
function estaDetenido(navStatus: string | null | undefined): boolean {
  return /moor|anchor|berth/i.test(String(navStatus ?? ""));
}

/**
 * La llegada real de un buque a un puerto, buscada en lo ya guardado.
 *
 * El AIS nunca informa una llegada, solo el zarpe (`atdUtc`, exacto) y el
 * destino que declara en cada lectura. Sin esto, `registrarRecalada` fechaba
 * la llegada con "cuándo nos enteramos nosotros" —la primera vez que el
 * chequeo diario vio ese puerto como `lastPort`—, y si el seguimiento de ese
 * embarque empezó después de que el buque ya había zarpado, la llegada
 * quedaba **después** del zarpe: el MSC BRUNELLA zarpó de Colón el 13-sept a
 * las 04:07 y el sistema anotó su llegada el 17, porque recién ese día se
 * puso a mirar ese embarque.
 *
 * Se busca entre las lecturas que ya se pagaron: la primera que declaró ese
 * puerto como destino con el buque detenido (fondeado o atracado), anterior
 * al zarpe. No siempre hay una —el buque puede haber estado ahí un momento
 * demasiado corto para que el chequeo diario lo alcanzara a ver—, y en ese
 * caso no hay nada mejor que decir.
 */
async function buscarLlegada(
  supabase: Cliente,
  nave: string | null,
  puerto: string,
  antesDe: string | null,
): Promise<string | null> {
  const clave = claveAis(nave);
  if (!clave) return null;
  const tope = antesDe ? new Date(antesDe).getTime() : null;

  const { data } = await supabase
    .from("navitrack_ais_lecturas")
    .select("nave_nombre, destino, nav_status, posicion_recibida_at, consultado_at")
    .eq("tipo", "posicion")
    .order("consultado_at", { ascending: true })
    .limit(2000);

  for (const l of (data ?? []) as {
    nave_nombre: string | null;
    destino: string | null;
    nav_status: string | null;
    posicion_recibida_at: string | null;
    consultado_at: string;
  }[]) {
    if (claveAis(l.nave_nombre) !== clave) continue;
    if (!mismoPuerto(l.destino, puerto)) continue;
    if (!estaDetenido(l.nav_status)) continue;
    const cuando = l.posicion_recibida_at ?? l.consultado_at;
    if (tope != null && new Date(cuando).getTime() >= tope) continue;
    // Ordenadas ascendente: la primera que calza es la más cercana a la llegada real.
    return cuando;
  }
  return null;
}

/**
 * La posición de la lectura está de verdad cerca del puerto declarado.
 *
 * "Detenido" no alcanza por sí solo. Un buque que acaba de zarpar puede seguir
 * mostrando `Moored` un rato mientras suelta amarras, con el destino **ya**
 * cambiado al próximo puerto: "detenido + declara Callao" también describe a
 * un buque parado en San Antonio que recién actualizó su destino. Sin este
 * chequeo, el A00052 quedó con Callao marcado como recalada real el mismo día
 * del zarpe desde San Antonio, a más de 2.000 km de distancia.
 *
 * Sin coordenadas del puerto no se puede comprobar nada, y no comprobar no es
 * lo mismo que confirmar: se prefiere no afirmar la llegada antes que
 * afirmarla sin poder verificarla. La corrobora entonces `registrarRecalada`,
 * cuando el buque ya haya zarpado de ahí de verdad.
 */
function cercaDelPuerto(lat: number | null, lng: number | null, puerto: string): boolean {
  if (lat == null || lng == null) return false;
  const c = getPortCoordinates(puerto);
  if (!c) return false;
  return haversineKm({ lng, lat }, { lng: c[0], lat: c[1] }) < MISMO_PUERTO_KM;
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
    /** Estado de navegación de la misma lectura: detenido = parado en algún lado. */
    navStatus?: string | null;
    /** Cuándo se tomó la posición. Es la mejor aproximación a la hora de llegada. */
    recibidoAt?: string | null;
    /** Posición de la misma lectura, para comprobar que "detenido" es aquí. */
    lat?: number | null;
    lng?: number | null;
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
   * Detenido y cerca del puerto que declara: el buque llegó.
   *
   * El proveedor no informa la hora de llegada, solo la de zarpe. La primera
   * lectura que lo ve atracado o fondeado **en las coordenadas de ese
   * puerto** es lo más cerca que se puede estar sin inventar el dato.
   *
   * Las dos condiciones hacen falta. Un buque recién zarpado puede seguir
   * "Moored" un rato mientras suelta amarras, con el destino ya actualizado al
   * próximo puerto: "detenido" solo, sin mirar dónde, marcó a Callao como
   * recalada real el mismo día en que el A00052 zarpaba de San Antonio, a más
   * de 2.000 km de ahí.
   */
  const llegoAhora =
    estaDetenido(datos.navStatus) && cercaDelPuerto(datos.lat ?? null, datos.lng ?? null, puerto)
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

  /*
   * La llegada nunca queda después del zarpe.
   *
   * Se busca primero en el historial ya guardado; si no hay nada, la mejor
   * fecha disponible es el propio zarpe (el buque no puede haber llegado
   * después de irse). Usar "ahora" a secas fue el error: si el seguimiento de
   * este embarque empezó después del zarpe, "ahora" cae después de una fecha
   * que ya pasó, y la ficha mostraba un zarpe anterior a la llegada.
   */
  const llegadaCalculada = async () => {
    const historica = await buscarLlegada(supabase, datos.nave, puerto, datos.zarpeAt);
    if (historica) return historica;
    if (!datos.zarpeAt) return ahora;
    return ahora <= datos.zarpeAt ? ahora : datos.zarpeAt;
  };

  if (existente) {
    const cambios: Record<string, unknown> = {
      // La primera vez que consta la parada es la que vale: releer la misma
      // lectura mañana no la convierte en una escala más reciente.
      recalado_at: existente.recalado_at ?? (await llegadaCalculada()),
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
    recalado_at: await llegadaCalculada(),
    zarpe_at: datos.zarpeAt,
  });
  return "nueva";
}

/**
 * Cuánto puede alejarse una fecha detectada del ETD sin dejar de ser creíble.
 *
 * Un zarpe se atrasa por clima o cupo en el puerto: unos días son normales.
 * Que aparezca semanas después no es un zarpe tardío, es que el chequeo
 * diario recién empezó a mirar este embarque —o esta función recién se
 * desplegó— mucho después de que el buque ya se había ido. Afirmar "real" con
 * esa fecha sería inventar una precisión que no existe: mejor seguir
 * mostrando el ETD como estimado, que es lo que se mostraba antes.
 */
const ZARPE_CREIBLE_DIAS = 7;

/**
 * El zarpe real del puerto de origen.
 *
 * `operaciones.etd` es la fecha planificada de la reserva; puede moverse por
 * clima o cupo en el puerto. El historial del viaje solo la mostraba a ella,
 * nunca la confirmaba con lo que ve el AIS —el mismo hueco que ya se cerró
 * para los transbordos (anunciado vs. real) y el arribo.
 *
 * **Que zarpó** se decide por posición y no por `atdUtc`: ese campo quedó
 * documentado como poco confiable para emparejarlo con un puerto en
 * particular en viajes ya avanzados, con varias escalas (ver el comentario
 * de `AisSnapshot.departedAt`). Que el buque esté **fuera** del radio de su
 * puerto de origen es la evidencia; no hace falta más.
 *
 * **Cuándo** se busca primero hacia atrás, en las lecturas ya guardadas, la
 * más antigua que ya lo vio afuera —el mismo método de `buscarLlegada()`—.
 * Si esa fecha no alcanza (`ZARPE_CREIBLE_DIAS` es el freno), es señal de que
 * el seguimiento de este embarque empezó mucho después de que el buque ya
 * había zarpado: siete embarques que ya llevaban semanas navegando cuando esta
 * función se desplegó quedaron con "zarpó hoy" en vez de su fecha real —el
 * A00047 decía 26-sept, veintiocho días después de su ETD del 29-ago—. En ese
 * caso no se afirma nada: se deja `zarpe_real_at` sin tocar y el hito sigue
 * mostrando el ETD como estimado, que es lo honesto.
 *
 * `atdUtc` de la lectura de hoy se usa como último refinamiento, solo si cae
 * dentro de lo creíble: es más preciso que "cuándo se tomó la posición", pero
 * acá no hay ambigüedad de puerto que resolver —es el primer zarpe del viaje,
 * no una escala en el medio de varias—.
 *
 * Se guarda en `operaciones.zarpe_real_at`, no en `navitrack_recaladas`: esa
 * tabla es el historial de puertos intermedios, y el zarpe de origen no es
 * una escala, es el propio inicio del viaje.
 */
export async function registrarZarpeReal(
  supabase: Cliente,
  datos: {
    operacionId: string;
    /** Nombre de la nave, para buscar su historial de posiciones. */
    nave: string | null;
    pol: string | null;
    etd: string | null;
    lat: number | null;
    lng: number | null;
    /** Cuándo se tomó esta posición: respaldo si no hay nada mejor. */
    recibidoAt: string | null;
    /** `atdUtc` de la misma lectura, si el proveedor lo entrega. */
    atdUtc: string | null;
  },
  // Los cuatro últimos son diagnóstico: dicen por qué esta llamada no escribió
  // nada, no un problema por sí solos.
): Promise<"nueva" | "ya_tenia" | "sin_pol" | "cerca" | "sin_evidencia" | "no_creible"> {
  const pol = (datos.pol ?? "").trim();
  if (!pol) return "sin_pol";
  // Sigue cerca del origen: nada que registrar todavía.
  if (cercaDelPuerto(datos.lat, datos.lng, pol)) return "cerca";

  const historico = await buscarZarpeHistorico(supabase, datos.nave, pol);

  /*
   * `atdUtc` vale solo si es anterior a esta lectura. Si fuera posterior,
   * describiría un hecho que todavía no pasó cuando se tomó la posición —un
   * dato inconsistente que no conviene mostrar como si fuera el real.
   */
  const recibido = datos.recibidoAt ? new Date(datos.recibidoAt).getTime() : null;
  const atd = datos.atdUtc ? new Date(datos.atdUtc).getTime() : null;
  const deHoy =
    atd != null && recibido != null && atd <= recibido ? datos.atdUtc : (datos.recibidoAt ?? new Date().toISOString());

  const candidato = historico ?? deHoy;
  if (!candidato) return "sin_evidencia";

  const etd = datos.etd ? new Date(`${datos.etd}T00:00:00Z`) : null;
  if (etd) {
    const diasDesdeEtd = (new Date(candidato).getTime() - etd.getTime()) / 86_400_000;
    if (diasDesdeEtd > ZARPE_CREIBLE_DIAS) return "no_creible";
  }

  const { data } = await supabase
    .from("operaciones")
    .update({ zarpe_real_at: candidato })
    .eq("id", datos.operacionId)
    // La primera lectura que lo vio zarpado es la que vale: no se pisa.
    .is("zarpe_real_at", null)
    .select("id");

  return (data ?? []).length > 0 ? "nueva" : "ya_tenia";
}

/** La lectura más antigua ya guardada que vio al buque fuera de su puerto de origen. */
async function buscarZarpeHistorico(
  supabase: Cliente,
  nave: string | null,
  pol: string,
): Promise<string | null> {
  const clave = claveAis(nave);
  if (!clave) return null;

  const { data } = await supabase
    .from("navitrack_ais_lecturas")
    .select("nave_nombre, lat, lng, posicion_recibida_at, consultado_at")
    .eq("tipo", "posicion")
    .order("consultado_at", { ascending: true })
    .limit(2000);

  for (const l of (data ?? []) as {
    nave_nombre: string | null;
    lat: number | null;
    lng: number | null;
    posicion_recibida_at: string | null;
    consultado_at: string;
  }[]) {
    if (claveAis(l.nave_nombre) !== clave) continue;
    if (cercaDelPuerto(l.lat, l.lng, pol)) continue;
    // Ordenadas ascendente: la primera que calza es la más antigua guardada.
    return l.posicion_recibida_at ?? l.consultado_at;
  }
  return null;
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
