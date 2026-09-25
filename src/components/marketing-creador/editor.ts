/**
 * Motor de ajuste manual de la pieza: arrastrar, redimensionar y guías.
 *
 * Todo se calcula en píxeles del lienzo (1080x1350), nunca en píxeles de
 * pantalla. La vista previa está encogida con `transform: scale()`, así que
 * cada movimiento del puntero se divide por esa escala antes de aplicarse; si
 * no, arrastrar 10 px en pantalla movería el elemento 26 px en la pieza.
 */

import type { Ajuste, Ajustes } from "./plantillas";

/** Medidas del lienzo del formato en curso. */
export type Dims = { ancho: number; alto: number };

/** A cuántos px del lienzo se activa el imán. */
const IMAN = 8;

export type Guia = {
  eje: "x" | "y";
  /** Posición de la línea, en px del lienzo. */
  en: number;
  /** "centro" pinta distinto: es la que más se busca. */
  tipo: "centro" | "borde";
};

/** Los lugares contra los que vale la pena alinear. */
function referencias(eje: "x" | "y", dims: Dims): { en: number; tipo: Guia["tipo"] }[] {
  const largo = eje === "x" ? dims.ancho : dims.alto;
  return [
    { en: largo / 2, tipo: "centro" },
    { en: 56, tipo: "borde" },
    { en: largo - 56, tipo: "borde" },
  ];
}

/**
 * Ajusta la posición al imán y devuelve las guías que hay que dibujar.
 *
 * Se comparan tres puntos del elemento contra cada referencia: su borde
 * inicial, su centro y su borde final. Es lo que hace que alinear "por el
 * centro del elemento" y "por sus extremos" funcionen igual de bien.
 */
export function imantar(
  x: number,
  y: number,
  ancho: number,
  alto: number,
  dims: Dims,
): { x: number; y: number; guias: Guia[] } {
  const guias: Guia[] = [];
  let rx = x;
  let ry = y;

  for (const eje of ["x", "y"] as const) {
    const pos = eje === "x" ? x : y;
    const largo = eje === "x" ? ancho : alto;
    // desplazamiento del punto respecto del origen del elemento
    const puntos = [0, largo / 2, largo];

    let mejor: { delta: number; en: number; tipo: Guia["tipo"] } | null = null;
    for (const ref of referencias(eje, dims)) {
      for (const p of puntos) {
        const delta = ref.en - (pos + p);
        if (Math.abs(delta) <= IMAN && (!mejor || Math.abs(delta) < Math.abs(mejor.delta))) {
          mejor = { delta, en: ref.en, tipo: ref.tipo };
        }
      }
    }

    if (mejor) {
      if (eje === "x") rx = x + mejor.delta;
      else ry = y + mejor.delta;
      guias.push({ eje, en: mejor.en, tipo: mejor.tipo });
    }
  }

  return { x: rx, y: ry, guias };
}

export type Arrastre =
  | { modo: "mover"; id: string }
  | { modo: "redimensionar"; id: string; esquina: boolean };

type Inicio = {
  puntero: { x: number; y: number };
  ajuste: Ajuste;
  alto: number;
};

/**
 * Sigue el puntero y devuelve el ajuste nuevo.
 *
 * Trabaja sobre el ajuste que habia al empezar, no sobre el ultimo: acumular
 * deltas hace que el elemento se vaya quedando atras del cursor cuando el
 * iman corrige la posicion.
 */
export function mover(
  arrastre: Arrastre,
  inicio: Inicio,
  puntero: { x: number; y: number },
  escala: number,
  dims: Dims,
): { ajuste: Ajuste; guias: Guia[] } {
  const dx = (puntero.x - inicio.puntero.x) / escala;
  const dy = (puntero.y - inicio.puntero.y) / escala;

  if (arrastre.modo === "mover") {
    const { x, y, guias } = imantar(
      inicio.ajuste.x + dx,
      inicio.ajuste.y + dy,
      inicio.ajuste.w,
      inicio.alto,
      dims,
    );
    return { ajuste: { ...inicio.ajuste, x, y }, guias };
  }

  // Redimensionar desde la esquina inferior derecha. El ancho manda: el alto
  // lo decide el contenido, porque el texto reacomoda solo.
  const w = Math.max(80, Math.min(dims.ancho, inicio.ajuste.w + dx));
  if (!arrastre.esquina) {
    return { ajuste: { ...inicio.ajuste, w }, guias: [] };
  }

  // En la esquina, además, se escala la letra según cuánto creció la caja.
  const factor = w / Math.max(1, inicio.ajuste.w);
  const escalaNueva = Math.max(0.4, Math.min(3, (inicio.ajuste.escala ?? 1) * factor));
  return { ajuste: { ...inicio.ajuste, w, escala: escalaNueva }, guias: [] };
}

/** Un elemento medido en el lienzo, listo para congelar. */
export type Medida = { id: string; x: number; y: number; w: number };

/**
 * Convierte lo que está en flujo a posiciones absolutas.
 *
 * Se mide contra el rectángulo del lienzo y se divide por la escala, para que
 * las coordenadas queden en px de la pieza y no de la pantalla.
 */
export function medirElementos(lienzo: HTMLElement, escala: number): Ajustes {
  const ajustes: Ajustes = {};

  for (const el of Array.from(lienzo.querySelectorAll<HTMLElement>("[data-elemento]"))) {
    const id = el.dataset.elemento;
    if (!id) continue;
    ajustes[id] = medirElemento(el, lienzo, escala);
  }

  return ajustes;
}

/**
 * Mide un solo elemento, en px de la pieza.
 *
 * Hace falta suelto porque los bloques que se agregan estando ya en modo
 * ajuste no pasaron por la medición de entrada: sin coordenadas propias el
 * arrastre no tiene de dónde partir y el bloque queda inmóvil.
 */
export function medirElemento(el: HTMLElement, lienzo: HTMLElement, escala: number): Ajuste {
  const base = lienzo.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return {
    x: Math.round((r.left - base.left) / escala),
    y: Math.round((r.top - base.top) / escala),
    w: Math.round(r.width / escala),
  };
}
