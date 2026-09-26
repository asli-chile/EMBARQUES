/**
 * Quién lleva carga navegando ahora mismo.
 *
 * Esta pregunta la hacen dos partes del sistema por motivos distintos: el
 * chequeo diario, para decidir a qué nave le paga un crédito, y el panel de
 * Rastreo, para decirle al usuario qué se está siguiendo. **Tienen que
 * responder lo mismo.**
 *
 * Vivía solo dentro del chequeo diario, y el panel contaba otra cosa —las naves
 * con `tracking_activo`—. Mientras la ventana fue laxa la diferencia era de una
 * nave y pasaba por detalle; al ajustarla, el panel empezó a prometer siete
 * consultas diarias cuando se hacían seis. Quien mire ese número para saber
 * cuánto le dura el saldo calcula de más.
 *
 * Por eso el cálculo es uno solo y vive acá. Si algún día divergen, que sea por
 * un cambio deliberado en este archivo y no porque alguien tocó una de las dos
 * copias.
 */

import {
  enVentanaDeSeguimiento,
  GRACIA_POST_ETA_DIAS,
  llegoAlPod,
  mismoPuerto,
  parseOpDate,
} from "@/components/navitrack/navitrack-model";
import { ESTADO_META, normalizarEstado } from "@/lib/operaciones/estados";

type Cliente = { from: (tabla: string) => any };

export type LecturaMinima = {
  destino: string | null;
  nav_status: string | null;
  lastPort: string | null;
};

export type Ventana = {
  /** Claves de nave con al menos un embarque navegando. */
  claves: Set<string>;
  /** Ids de operación dentro de la ventana. */
  ops: Set<string>;
  /**
   * Embarques en ventana sin ETA.
   *
   * Sin ETA no hay nivel 3 que los cierre (ver `enVentanaDeSeguimiento`), así
   * que dependen de que alguien marque el arribo o de que el AIS vea la
   * llegada. Se nombran para que el hueco se vea en vez de costar en silencio.
   */
  sinEta: string[];
  /** Última lectura conocida de cada nave, indexada por `claveAis`. */
  ultimaPorNave: Map<string, LecturaMinima>;
  /**
   * La nave que lleva la carga hoy, por operación en ventana (`claveDeNave`).
   *
   * Es a quién se le atribuye lo que declara el AIS. Null cuando la carga ya
   * llegó a un transbordo y todavía no se sabe a qué nave pasa: en ese momento
   * no hay buque cuya lectura hable de ella.
   */
  vigentePorOp: Map<string, string | null>;
  /**
   * Por qué cada nave excluida no entró a la ventana (`claveDeNave`).
   *
   * Solo tiene entrada la nave que **ninguna** de sus operaciones metió en
   * ventana. Si una nave tiene una operación cerrada y otra que aún no zarpa,
   * manda "no_zarpa": es el motivo que todavía puede cambiar hoy.
   */
  motivoPorClave: Map<string, MotivoFueraDeVentana>;
};

/** Cuál de dos motivos prevalece cuando una nave acumula más de uno. */
const PRIORIDAD_MOTIVO: Record<MotivoFueraDeVentana, number> = {
  no_zarpa: 0,
  sin_etd: 1,
  cerrada: 2,
};

type TramoMinimo = { operacion_id: string; orden: number; nave: string | null; pod: string | null; eta: string | null };

/**
 * Criterio único de "este tramo ya terminó".
 *
 * Termina si consta que el buque estuvo en su puerto de llegada, o si pasaron
 * `GRACIA_POST_ETA_DIAS` desde la llegada anunciada. La fecha sola no alcanza:
 * es la que informó la naviera y los buques se atrasan días. Cortar en ella
 * dejaba de leer al buque que traía la carga justo antes de que llegara al
 * transbordo, y con eso se perdía la llegada y el zarpe reales, que son el
 * dato que interesa.
 *
 * Lo usan esta ventana y `sincronizarSeguimiento`. Si decidieran distinto
 * cuál es el tramo vigente, una apagaría la nave que la otra sigue pagando.
 */
export function crearTramoCerrado(recaladoEn: Map<string, string[]>, ahora: Date) {
  const tope = new Date(ahora);
  tope.setDate(tope.getDate() - GRACIA_POST_ETA_DIAS);
  const topeISO = tope.toISOString().slice(0, 10);
  return (t: Pick<TramoMinimo, "operacion_id" | "pod" | "eta">): boolean => {
    if (t.eta && t.eta < topeISO) return true;
    const pod = (t.pod ?? "").trim();
    if (!pod) return false;
    return (recaladoEn.get(t.operacion_id) ?? []).some((p) => mismoPuerto(p, pod));
  };
}

/** Clave comparable de nave: el catálogo y las operaciones no coinciden en caja. */
export function claveDeNave(v: unknown): string {
  return String(v ?? "").trim().toUpperCase();
}

/**
 * Nombre comparable entre el catálogo, las operaciones y el proveedor.
 *
 * Las tres fuentes lo escriben distinto: "CALLAO_EXPRESS" viene del AIS,
 * "MSC BRUNELLA 635R" de la operación con el viaje pegado, "MSC BRUNELLA" del
 * catálogo. Sin unificar, la lectura de una nave nunca encuentra a su operación
 * y el nivel 2 del cierre no se activa nunca.
 */
export function claveAis(v: unknown): string {
  let s = String(v ?? "").toUpperCase().replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  s = s.replace(/\s*\[[^\]]*\]\s*$/, "").trim();
  const ultimo = s.split(" ").pop() ?? "";
  // "635R" o "W012" son viaje; "512" en "WAN HAI 512" es parte del nombre.
  if (/\d/.test(ultimo) && /[A-Z]/.test(ultimo) && ultimo.length <= 5 && s.split(" ").length > 1) {
    s = s.slice(0, s.length - ultimo.length).trim();
  }
  return s;
}

/** Por qué una operación no abre la ventana de seguimiento hoy. */
export type MotivoFueraDeVentana = "no_zarpa" | "sin_etd" | "cerrada";

/**
 * Explica lo que `enVentanaDeSeguimiento` solo responde con `false`.
 *
 * El reporte diario listaba **toda** nave excluida bajo el mismo rótulo,
 * "todavía sin zarpar", y esa frase solo es cierta para el nivel de apertura.
 * Una nave puede quedar fuera por el motivo contrario y exactamente opuesto:
 * porque su operación **ya cerró** —se marcó un estado final, se vio llegar
 * al POD, o venció el plazo de gracia—. El CMA CGM CARL ANTOINE de A00046
 * decía "aún no zarpa" en el correo del 26-09-2026 con la operación en
 * `OPERACION_CERRADA` desde que arribó: lo contrario de lo que decía.
 *
 * Repite, paso a paso, los mismos niveles que `enVentanaDeSeguimiento`: el
 * primero que se cumple explica la exclusión. No se llama para una operación
 * que sí está en ventana —ahí no hay nada que explicar—.
 */
export function razonFueraDeVentana(
  op: {
    estado_operacion: string | null;
    arribo_confirmado: boolean | null;
    etd: string | null;
    eta: string | null;
  },
  now: Date,
  llegoAlPodOp: boolean,
): MotivoFueraDeVentana {
  const codigo = normalizarEstado(op.estado_operacion);
  if ((codigo && ESTADO_META[codigo].esFinal) || op.arribo_confirmado) return "cerrada";

  const etd = parseOpDate(op.etd);
  if (!etd) return "sin_etd";

  const apertura = new Date(etd);
  apertura.setHours(0, 0, 0, 0);
  if (now.getTime() < apertura.getTime()) return "no_zarpa";

  if (llegoAlPodOp) return "cerrada";

  // Sin ETA, el nivel 3 no cierra nunca: si llegamos hasta acá sin haber
  // vuelto true arriba, la operación seguiría en ventana y no se llama a esto.
  return "cerrada";
}

/**
 * Si esta nave del catálogo lleva carga navegando.
 *
 * El cruce es por prefijo y no por igualdad porque la operación suele traer el
 * viaje pegado al nombre ("CMA CGM ESTELLE V.0FABCS1MA").
 */
export function naveEnVentana(nombreCatalogo: unknown, v: Ventana): boolean {
  const clave = claveDeNave(nombreCatalogo);
  if (!clave) return false;
  for (const k of v.claves) if (k.startsWith(clave)) return true;
  return false;
}

export async function calcularVentana(supabase: Cliente, ahora = new Date()): Promise<Ventana> {
  const [opsRes, tramosRes, ultimasRes, recaladasRes] = await Promise.all([
    supabase
      .from("operaciones")
      .select("id, ref_asli, nave, pod, etd, eta, estado_operacion, arribo_confirmado")
      .is("deleted_at", null)
      .eq("arribo_confirmado", false)
      .not("nave", "is", null)
      .limit(2000),
    /*
     * Los tramos cuentan igual que la columna.
     *
     * En un viaje con transbordo, `operaciones.nave` guarda la nave del primer
     * tramo: la que lleva la caja hoy solo aparece acá. Sin esto, la nave que
     * recibe la carga quedaría fuera de la ventana y no se consultaría nunca.
     */
    /*
     * También los tramos sin nave: son transbordos a los que todavía no se les
     * conoce el buque. Dejarlos fuera hacía que, cerrado el primer tramo, el
     * último conocido pasara por vigente y se siguiera leyendo al buque que ya
     * soltó la carga.
     */
    supabase
      .from("navitrack_tramos")
      .select("nave, operacion_id, orden, pod, eta")
      .limit(2000),
    /*
     * La última posición conocida de cada nave, para el nivel 2 del cierre.
     *
     * Es la lectura de **ayer**, y así tiene que ser: se usa para decidir si
     * vale la pena pagar la de hoy. Pedir una nueva para saber si hace falta
     * pedirla sería el gasto que esto viene a evitar.
     */
    supabase
      .from("navitrack_ais_lecturas")
      .select("nave_nombre, destino, nav_status, crudo, consultado_at")
      .eq("tipo", "posicion")
      .order("consultado_at", { ascending: false })
      .limit(400),
    /*
     * Puertos donde consta que el buque paró. Cierran un tramo sin fechas.
     *
     * Es el mismo respaldo que usa `sincronizarSeguimiento`: el transbordo se
     * anuncia sin decir cuándo llega el buque al puerto de conexión, así que con
     * la ETA en null el tramo no vencería nunca.
     */
    supabase
      .from("navitrack_recaladas")
      .select("operacion_id, puerto")
      .not("recalado_at", "is", null)
      .limit(2000),
  ]);

  /** La lectura más reciente de cada nave. Viene ordenada, así que la primera manda. */
  const ultimaPorNave = new Map<string, LecturaMinima>();
  for (const l of (ultimasRes.data ?? []) as {
    nave_nombre: string | null;
    destino: string | null;
    nav_status: string | null;
    crudo: Record<string, unknown> | null;
  }[]) {
    const k = claveAis(l.nave_nombre);
    if (!k || ultimaPorNave.has(k)) continue;
    ultimaPorNave.set(k, {
      destino: l.destino,
      nav_status: l.nav_status,
      lastPort: typeof l.crudo?.lastPort === "string" ? (l.crudo.lastPort as string) : null,
    });
  }

  /** Puertos ya recalados, por operación. */
  const recaladoEn = new Map<string, string[]>();
  for (const r of (recaladasRes.data ?? []) as { operacion_id: string; puerto: string }[]) {
    const lista = recaladoEn.get(r.operacion_id) ?? [];
    lista.push(r.puerto);
    recaladoEn.set(r.operacion_id, lista);
  }

  type Tramo = TramoMinimo;
  const tramoCerrado = crearTramoCerrado(recaladoEn, ahora);

  /** Tramos por operación, ordenados por recorrido. */
  const tramosPorOp = new Map<string, Tramo[]>();
  for (const t of (tramosRes.data ?? []) as Tramo[]) {
    const lista = tramosPorOp.get(t.operacion_id) ?? [];
    lista.push(t);
    tramosPorOp.set(t.operacion_id, lista);
  }
  for (const lista of tramosPorOp.values()) lista.sort((a, b) => a.orden - b.orden);

  /**
   * La nave que lleva la carga **ahora** en un viaje con transbordo.
   *
   * Es el primer tramo que no cerró; si cerraron todos, el último.
   */
  const naveVigenteDe = (opId: string): { nave: string | null } | null => {
    const lista = tramosPorOp.get(opId);
    if (!lista?.length) return null;
    const i = lista.findIndex((t) => !tramoCerrado(t));
    return { nave: (i < 0 ? lista[lista.length - 1] : lista[i]).nave };
  };

  const claves = new Set<string>();
  const ops = new Set<string>();
  const sinEta: string[] = [];
  const vigentePorOp = new Map<string, string | null>();
  const motivoPorClave = new Map<string, MotivoFueraDeVentana>();

  for (const o of (opsRes.data ?? []) as {
    id: string;
    ref_asli: string | null;
    nave: string | null;
    pod: string | null;
    etd: string | null;
    eta: string | null;
    estado_operacion: string | null;
    arribo_confirmado: boolean | null;
  }[]) {
    // Al destino llega la nave del último tramo, no la que zarpó de origen.
    const cadena = tramosPorOp.get(o.id);
    const naveFinal = cadena?.length ? (cadena[cadena.length - 1].nave ?? o.nave) : o.nave;
    const llego = llegoAlPod(ultimaPorNave.get(claveAis(naveFinal)) ?? null, o.pod);

    /*
     * La misma nave que entraría a `claves` si esta operación abriera ventana.
     *
     * Se calcula siempre, esté o no en ventana: es la clave con la que se
     * anota el motivo cuando queda afuera.
     */
    const vigente = naveVigenteDe(o.id);
    const k = vigente ? claveDeNave(vigente.nave) : claveDeNave(o.nave);

    if (!enVentanaDeSeguimiento(o, ahora, { llegoAlPod: llego })) {
      if (k) {
        const razon = razonFueraDeVentana(o, ahora, llego);
        const previa = motivoPorClave.get(k);
        if (!previa || PRIORIDAD_MOTIVO[razon] < PRIORIDAD_MOTIVO[previa]) {
          motivoPorClave.set(k, razon);
        }
      }
      continue;
    }

    ops.add(o.id);
    if (!o.eta) sinEta.push(`${o.ref_asli ?? o.id} (${o.nave ?? "sin nave"})`);

    /*
     * De un viaje con transbordo se sigue **solo la nave del tramo vigente**.
     *
     * Antes se sumaban todas las naves de todos los tramos, más la columna
     * `operaciones.nave`. En A00051 eso pagaba dos buques por la misma caja:
     * MSC SERENA, que la entregó en Rodman el 18-09-2026 y siguió a Thames con
     * otra carga, y MSC BOSTON, que la recibió. Un crédito diario por una
     * posición que ya no dice nada de ese embarque.
     *
     * `sincronizarSeguimiento` apaga la nave que entregó, pero esto la volvía a
     * encender por la puerta de atrás en la misma corrida.
     */
    // Tramo vigente sin nave: la carga espera en el transbordo y no hay buque
    // al que valga la pena preguntarle por ella.
    vigentePorOp.set(o.id, k || null);
    if (k) claves.add(k);
  }

  // Una operación en ventana borra cualquier motivo anotado para su nave: si
  // alguna otra operación sí la necesita hoy, no está "fuera" de nada.
  for (const k of claves) motivoPorClave.delete(k);

  return { claves, ops, sinEta, ultimaPorNave, vigentePorOp, motivoPorClave };
}
