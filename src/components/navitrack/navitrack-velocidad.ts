/**
 * La velocidad del buque, en la unidad que prefiera quien mira.
 *
 * El AIS entrega nudos, que es la unidad del rubro y la que usa el ejecutivo.
 * El cliente que abre el seguimiento rara vez sabe cuánto es un nudo, así que
 * la misma cifra le dice poco. En vez de elegir por los dos, la pantalla deja
 * cambiar de unidad con un clic.
 *
 * La preferencia vive acá y no en cada componente por una razón concreta: la
 * velocidad aparece en tres lugares a la vez —tarjeta, ficha del buque y mapa—
 * y verlos en unidades distintas al mismo tiempo se lee como un error de dato.
 * Se guarda en el navegador para que la elección no haya que repetirla en cada
 * embarque que se abra.
 */
import { useCallback, useSyncExternalStore } from "react";

export type UnidadVelocidad = "kn" | "kmh";

/** Definición náutica: un nudo es una milla náutica por hora. */
const KM_POR_NUDO = 1.852;

const CLAVE = "navitrack:unidad-velocidad";

function esUnidad(v: unknown): v is UnidadVelocidad {
  return v === "kn" || v === "kmh";
}

function leerGuardada(): UnidadVelocidad {
  try {
    const v = window.localStorage.getItem(CLAVE);
    return esUnidad(v) ? v : "kn";
  } catch {
    // Sin acceso al almacenamiento (modo privado, cookies bloqueadas) se
    // trabaja en memoria: la preferencia dura la sesión y nada se rompe.
    return "kn";
  }
}

let unidad: UnidadVelocidad = "kn";
let hidratada = false;
const oyentes = new Set<() => void>();

function suscribir(fn: () => void) {
  if (!hidratada) {
    // La lectura se hace en el cliente, no al importar el módulo: en el render
    // del servidor no existe `window` y el HTML debe salir con el valor por
    // defecto para que la hidratación no encuentre otro texto.
    unidad = leerGuardada();
    hidratada = true;
  }
  oyentes.add(fn);
  return () => {
    oyentes.delete(fn);
  };
}

function cambiar(siguiente: UnidadVelocidad) {
  if (siguiente === unidad) return;
  unidad = siguiente;
  try {
    window.localStorage.setItem(CLAVE, siguiente);
  } catch {
    /* Ver arriba: sin almacenamiento la preferencia igual rige en esta sesión. */
  }
  for (const fn of oyentes) fn();
}

/**
 * La unidad elegida y cómo alternarla.
 *
 * Todas las pantallas montadas se enteran del cambio, porque todas leen de este
 * mismo estado.
 */
export function useUnidadVelocidad() {
  const actual = useSyncExternalStore(
    suscribir,
    () => unidad,
    () => "kn" as UnidadVelocidad,
  );
  const alternar = useCallback(() => {
    cambiar(actual === "kn" ? "kmh" : "kn");
  }, [actual]);
  return { unidad: actual, alternar };
}

/**
 * Los nudos del AIS, escritos en la unidad pedida.
 *
 * Un decimal en ambas: el AIS reporta la velocidad con esa precisión y añadir
 * cifras al convertir inventaría una exactitud que el dato no tiene.
 */
export function formatearVelocidad(nudos: number | null | undefined, u: UnidadVelocidad): string | null {
  if (nudos == null || !Number.isFinite(nudos)) return null;
  return u === "kmh" ? `${(nudos * KM_POR_NUDO).toFixed(1)} km/h` : `${nudos.toFixed(1)} kn`;
}
