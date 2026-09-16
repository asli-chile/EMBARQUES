/**
 * El seguimiento sigue a la carga, no al barco.
 *
 * Cuando una carga se transborda, el primer buque deja de tener nada que ver
 * con ella: sale del puerto de conexión rumbo a otro viaje y su posición pasa a
 * ser un dato real pero falso para ese embarque. Si la lista blanca no se mueve
 * con la carga pasan las dos cosas malas a la vez: se sigue pagando por un
 * buque que ya no interesa, y no se pregunta por el que lleva la caja.
 *
 * Esta función corrige ese desfase. Es el traspaso: apaga el buque que soltó la
 * carga y enciende el que la lleva ahora.
 *
 * Se ejecuta antes de gastar —en el chequeo diario y en la actualización
 * manual—, así el desfase nunca dura más de un ciclo, aunque los tramos se
 * hayan cargado por fuera de la pantalla.
 *
 * Dos límites deliberados:
 *
 * - Solo actúa sobre cadenas de transbordo. Nunca apaga una nave por su cuenta
 *   si no hay un sucesor al que traspasarle el seguimiento: el resto de la
 *   lista blanca es decisión del usuario y no se toca.
 * - Nunca enciende una nave sin IMO ni MMSI, porque no se podría consultar.
 */

import { mismoPuerto } from "@/components/navitrack/navitrack-model";

type Cliente = {
  from: (tabla: string) => any;
};

export type Traspaso = {
  /** Nave que soltó la carga y deja de seguirse. */
  desde: string;
  /** Nave que la lleva ahora y pasa a seguirse. */
  hacia: string;
  /** Embarque que motivó el cambio, para poder explicarlo. */
  referencia: string;
};

export type ResultadoSincronia = {
  traspasos: Traspaso[];
  /** Naves encendidas que no lo estaban. */
  encendidas: string[];
  /** Naves apagadas por haber entregado la carga. */
  apagadas: string[];
  /**
   * Naves que llevan carga pero no se pueden seguir.
   *
   * O no están en el catálogo `naves`, o están sin IMO ni MMSI. Es un hueco
   * real: esa carga queda sin posición hasta que alguien cargue el dato, y
   * callarlo sería peor que el hueco mismo.
   */
  sinCatalogo: string[];
};

/** Nombre comparable: sin el viaje pegado, conservando los números del barco. */
function claveNave(raw: string | null | undefined): string {
  // El proveedor devuelve los nombres con guión bajo ("CALLAO_EXPRESS"), así que
  // los separadores se unifican antes de comparar. Sin esto, ninguna búsqueda
  // por nombre calzaba nunca: gastaba el crédito y devolvía "sin resultado".
  let s = String(raw ?? "")
    .toUpperCase()
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  s = s.replace(/\s*\[[^\]]*\]\s*$/, "").trim();
  const ultimo = s.split(" ").pop() ?? "";
  if (/\d/.test(ultimo) && /[A-Z]/.test(ultimo) && ultimo.length <= 5 && s.split(" ").length > 1) {
    s = s.slice(0, s.length - ultimo.length).trim();
  }
  return s;
}

export async function sincronizarSeguimiento(supabase: Cliente): Promise<ResultadoSincronia> {
  const vacio: ResultadoSincronia = { traspasos: [], encendidas: [], apagadas: [], sinCatalogo: [] };
  const hoy = new Date().toISOString().slice(0, 10);

  const [tramosRes, opsRes, navesRes, recRes] = await Promise.all([
    supabase.from("navitrack_tramos").select("operacion_id, orden, nave, pod, eta").order("orden"),
    supabase
      .from("operaciones")
      .select("id, ref_asli, contenedor, nave, arribo_confirmado")
      .is("deleted_at", null),
    supabase.from("naves").select("id, nombre, imo, mmsi, tracking_activo").eq("activo", true),
    /*
     * Puertos donde consta que el buque paró.
     *
     * Son el respaldo cuando el tramo no tiene fechas: ver `tramoCerrado`.
     */
    supabase
      .from("navitrack_recaladas")
      .select("operacion_id, puerto")
      .not("recalado_at", "is", null),
  ]);

  const tramos = (tramosRes.data ?? []) as {
    operacion_id: string;
    orden: number;
    nave: string | null;
    pod: string | null;
    eta: string | null;
  }[];
  if (!tramos.length) return vacio;

  /** Puertos ya recalados, por operación. */
  const recaladoEn = new Map<string, string[]>();
  for (const r of (recRes.data ?? []) as { operacion_id: string; puerto: string }[]) {
    const lista = recaladoEn.get(r.operacion_id) ?? [];
    lista.push(r.puerto);
    recaladoEn.set(r.operacion_id, lista);
  }

  /*
   * Un tramo terminó si venció su ETA **o** si consta que el buque llegó.
   *
   * La fecha sola no alcanza: el transbordo se suele anunciar sin decir cuándo
   * llega el buque al puerto de conexión ni cuándo zarpa al siguiente. Con la
   * ETA en null el tramo no vencía nunca, así que el tramo 1 quedaba vigente
   * para siempre y el traspaso de seguimiento no ocurría jamás —justo en el
   * caso que la función existe para resolver—.
   *
   * El respaldo es el propio AIS, que ya se paga y se guarda: cuando el buque
   * declara como último puerto el de conexión, la recalada queda anotada y eso
   * cierra el tramo aunque nadie supiera la fecha de antemano.
   */
  const tramoCerrado = (t: { operacion_id: string; pod: string | null; eta: string | null }) => {
    if (t.eta && t.eta < hoy) return true;
    const pod = (t.pod ?? "").trim();
    if (!pod) return false;
    return (recaladoEn.get(t.operacion_id) ?? []).some((p) => mismoPuerto(p, pod));
  };

  const ops = new Map(
    ((opsRes.data ?? []) as {
      id: string;
      ref_asli: string | null;
      contenedor: string | null;
      nave: string | null;
      arribo_confirmado: boolean | null;
    }[]).map((o) => [o.id, o]),
  );

  type NaveFila = {
    id: string;
    nombre: string;
    imo: string | null;
    mmsi: string | null;
    tracking_activo: boolean | null;
  };
  const porClave = new Map<string, NaveFila>();
  for (const n of (navesRes.data ?? []) as NaveFila[]) {
    const k = claveNave(n.nombre);
    if (k) porClave.set(k, n);
  }

  const porOperacion = new Map<string, typeof tramos>();
  for (const t of tramos) {
    const lista = porOperacion.get(t.operacion_id) ?? [];
    lista.push(t);
    porOperacion.set(t.operacion_id, lista);
  }

  /** Naves que llevan alguna carga viva ahora: no deben apagarse. */
  const conCargaViva = new Set<string>();
  const traspasos: Traspaso[] = [];
  /** Nave que entregó -> nave que recibió, por operación. */
  const entregaron = new Map<string, string>();

  for (const [opId, lista] of porOperacion) {
    const op = ops.get(opId);
    if (!op || op.arribo_confirmado) continue;

    const ordenados = [...lista].sort((a, b) => a.orden - b.orden);
    const indice = ordenados.findIndex((t) => !tramoCerrado(t));
    const actual = ordenados[indice < 0 ? ordenados.length - 1 : indice];
    if (!actual?.nave) continue;

    const claveActual = claveNave(actual.nave);
    conCargaViva.add(claveActual);

    // Los tramos ya cerrados entregaron la carga: candidatos a dejar de seguirse.
    for (const t of ordenados) {
      if (t === actual || !t.nave) continue;
      if (t.orden >= actual.orden) continue;
      const k = claveNave(t.nave);
      if (k && k !== claveActual) {
        entregaron.set(k, claveActual);
        traspasos.push({
          desde: t.nave,
          hacia: actual.nave,
          referencia: op.contenedor || op.ref_asli || "",
        });
      }
    }
  }

  // Una nave que además lleva otra carga viva no se apaga, aunque haya
  // entregado esta: el traspaso es por carga, no un castigo a la nave.
  for (const [id, op] of ops) {
    if (op.arribo_confirmado) continue;
    if (porOperacion.has(id)) continue;
    const k = claveNave(op.nave);
    if (k) conCargaViva.add(k);
  }

  // Conjuntos, no listas: una cadena de tres tramos traspasa dos veces a la
  // misma nave final, y nombrarla dos veces confundiría el informe.
  const encendidas = new Set<string>();
  const apagadas = new Set<string>();
  const sinCatalogo = new Set<string>();

  /** Nombre original de cada clave, para poder nombrarla en los avisos. */
  const nombreDeClave = new Map<string, string>();
  for (const t of tramos) {
    const k = claveNave(t.nave);
    if (k && t.nave && !nombreDeClave.has(k)) nombreDeClave.set(k, t.nave);
  }

  for (const [claveVieja, claveNueva] of entregaron) {
    const vieja = porClave.get(claveVieja);
    const nueva = porClave.get(claveNueva);

    // Encender la que lleva la carga, si se puede consultar.
    if (!nueva) {
      // No está en el catálogo: no hay a qué IMO preguntarle.
      sinCatalogo.add(nombreDeClave.get(claveNueva) ?? claveNueva);
    } else if (!nueva.tracking_activo) {
      const ident = (nueva.mmsi ?? "").trim() || (nueva.imo ?? "").trim();
      if (/^\d{7}$|^\d{9}$/.test(ident)) {
        await supabase.from("naves").update({ tracking_activo: true }).eq("id", nueva.id);
        encendidas.add(nueva.nombre);
      } else {
        sinCatalogo.add(nueva.nombre);
      }
    }

    /*
     * Apagar la que entregó, salvo que siga cargando otra cosa nuestra.
     *
     * Se apaga aunque la sucesora no se pueda seguir. Quedarse sin posición es
     * un hueco declarado; seguir mostrando la del buque equivocado es un dato
     * falso que parece bueno, y eso es peor.
     */
    if (vieja?.tracking_activo && !conCargaViva.has(claveVieja)) {
      await supabase.from("naves").update({ tracking_activo: false }).eq("id", vieja.id);
      apagadas.add(vieja.nombre);
    }
  }

  return {
    traspasos,
    encendidas: [...encendidas],
    apagadas: [...apagadas],
    sinCatalogo: [...sinCatalogo],
  };
}
