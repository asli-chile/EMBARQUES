/**
 * La distancia que le falta al buque, en la unidad que prefiera quien mira.
 *
 * El cálculo trabaja en millas náuticas, la unidad del rubro. El cliente
 * piensa en kilómetros, así que se muestra en km por defecto y un clic la
 * cambia a MN. Mismo esquema que la velocidad (`navitrack-velocidad.ts`): la
 * distancia aparece en la cabecera y en la tarjeta a la vez, y verlas en
 * unidades distintas se leería como un error de dato. La elección se guarda
 * en el navegador.
 */
import { useCallback, useSyncExternalStore } from "react";

export type UnidadDistancia = "km" | "mn";

/** Definición náutica: una milla náutica son 1,852 km. */
const KM_POR_MN = 1.852;

const CLAVE = "navitrack:unidad-distancia";
const POR_DEFECTO: UnidadDistancia = "km";

function esUnidad(v: unknown): v is UnidadDistancia {
  return v === "km" || v === "mn";
}

function leerGuardada(): UnidadDistancia {
  try {
    const v = window.localStorage.getItem(CLAVE);
    return esUnidad(v) ? v : POR_DEFECTO;
  } catch {
    // Sin almacenamiento (modo privado) la preferencia dura la sesión.
    return POR_DEFECTO;
  }
}

let unidad: UnidadDistancia = POR_DEFECTO;
let hidratada = false;
const oyentes = new Set<() => void>();

function suscribir(fn: () => void) {
  if (!hidratada) {
    // En el cliente, no al importar: el HTML del servidor sale con el valor
    // por defecto para que la hidratación no encuentre otro texto.
    unidad = leerGuardada();
    hidratada = true;
  }
  oyentes.add(fn);
  return () => {
    oyentes.delete(fn);
  };
}

function cambiar(siguiente: UnidadDistancia) {
  if (siguiente === unidad) return;
  unidad = siguiente;
  try {
    window.localStorage.setItem(CLAVE, siguiente);
  } catch {
    /* Sin almacenamiento la preferencia igual rige en esta sesión. */
  }
  for (const fn of oyentes) fn();
}

/** La unidad elegida y cómo alternarla; todas las vistas montadas se enteran. */
export function useUnidadDistancia() {
  const actual = useSyncExternalStore(
    suscribir,
    () => unidad,
    () => POR_DEFECTO,
  );
  const alternar = useCallback(() => {
    cambiar(actual === "km" ? "mn" : "km");
  }, [actual]);
  return { unidad: actual, alternar };
}

/**
 * Millas náuticas escritas en la unidad pedida, sin decimales: la distancia
 * restante es una estimación y un decimal inventaría precisión.
 */
export function formatearDistancia(
  mn: number | null | undefined,
  u: UnidadDistancia,
  etiquetas: { km: string; mn: string },
  locale: string,
): string | null {
  if (mn == null || !Number.isFinite(mn)) return null;
  const valor = u === "km" ? mn * KM_POR_MN : mn;
  const texto = Math.round(valor).toLocaleString(locale === "en" ? "en-US" : "es-CL");
  return `${texto} ${u === "km" ? etiquetas.km : etiquetas.mn}`;
}
