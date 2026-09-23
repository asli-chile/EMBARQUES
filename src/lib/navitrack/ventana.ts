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

import { enVentanaDeSeguimiento, llegoAlPod, mismoPuerto } from "@/components/navitrack/navitrack-model";

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
};

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
    supabase
      .from("navitrack_tramos")
      .select("nave, operacion_id, orden, pod, eta")
      .not("nave", "is", null)
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

  const hoyISO = ahora.toISOString().slice(0, 10);

  /** Puertos ya recalados, por operación. */
  const recaladoEn = new Map<string, string[]>();
  for (const r of (recaladasRes.data ?? []) as { operacion_id: string; puerto: string }[]) {
    const lista = recaladoEn.get(r.operacion_id) ?? [];
    lista.push(r.puerto);
    recaladoEn.set(r.operacion_id, lista);
  }

  type Tramo = { operacion_id: string; orden: number; nave: string | null; pod: string | null; eta: string | null };

  /**
   * Un tramo terminó si venció su ETA **o** si consta que el buque llegó.
   *
   * Mismo criterio que `sincronizarSeguimiento`, y a propósito: si las dos
   * funciones decidieran distinto cuál es el tramo vigente, una apagaría la nave
   * que la otra sigue pagando.
   */
  const tramoCerrado = (t: Tramo) => {
    if (t.eta && t.eta < hoyISO) return true;
    const pod = (t.pod ?? "").trim();
    if (!pod) return false;
    return (recaladoEn.get(t.operacion_id) ?? []).some((p) => mismoPuerto(p, pod));
  };

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
  const naveVigenteDe = (opId: string): string | null => {
    const lista = tramosPorOp.get(opId);
    if (!lista?.length) return null;
    const i = lista.findIndex((t) => !tramoCerrado(t));
    return (i < 0 ? lista[lista.length - 1] : lista[i]).nave;
  };

  const claves = new Set<string>();
  const ops = new Set<string>();
  const sinEta: string[] = [];

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
    const llego = llegoAlPod(ultimaPorNave.get(claveAis(o.nave)) ?? null, o.pod);
    if (!enVentanaDeSeguimiento(o, ahora, { llegoAlPod: llego })) continue;
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
    const vigente = naveVigenteDe(o.id);
    const k = claveDeNave(vigente ?? o.nave);
    if (k) claves.add(k);
  }

  return { claves, ops, sinEta, ultimaPorNave };
}
