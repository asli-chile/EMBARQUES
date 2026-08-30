/**
 * Tokens de motion del ERP (espejo en TypeScript de `src/styles/motion.css`).
 *
 * Los valores viven en CSS como variables (`--motion-*`); este módulo existe
 * para lo que el CSS no puede resolver: timeouts de React que deben coincidir
 * con la duración de una animación, e índices de stagger inline.
 *
 * Si cambias un valor aquí, cámbialo también en `motion.css`.
 * Documentación: docs/MOTION-DESIGN.md
 */

/** Duraciones en milisegundos. */
export const duration = {
  instant: 90,
  fast: 160,
  base: 240,
  slow: 360,
  slower: 520,
} as const;

/** Curvas de aceleración. `enter` desacelera (inercia), `exit` acelera (se va). */
export const easing = {
  enter: "cubic-bezier(0.22, 1, 0.36, 1)",
  exit: "cubic-bezier(0.4, 0, 1, 1)",
  standard: "cubic-bezier(0.4, 0, 0.2, 1)",
  emphasis: "cubic-bezier(0.34, 1.24, 0.64, 1)",
} as const;

/** Retrasos en milisegundos. */
export const delay = {
  none: 0,
  short: 60,
  medium: 120,
} as const;

/** Separación entre hermanos de una lista o grupo, en milisegundos. */
export const stagger = {
  tight: 30,
  base: 45,
  loose: 70,
} as const;

/** Desplazamiento de translateX/translateY, en píxeles. */
export const distance = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 24,
} as const;

/** Escalas de entrada y de press. */
export const scale = {
  from: 0.97,
  press: 0.985,
} as const;

export const motion = { duration, easing, delay, stagger, distance, scale } as const;

/**
 * Tope de elementos que reciben stagger.
 *
 * Con 200 filas y 45 ms de separación el último elemento entraría 9 s tarde.
 * A partir de este índice todos comparten el mismo retraso: la cascada se
 * percibe igual y la lista termina de aparecer en ~360 ms.
 */
export const STAGGER_MAX_INDEX = 8;

/**
 * Estilo inline con el índice de stagger para un hijo de `.motion-stagger`.
 *
 * @example
 * {items.map((item, i) => (
 *   <li key={item.id} className="motion-enter motion-stagger" style={staggerStyle(i)}>
 * ))}
 */
export function staggerStyle(index: number, maxIndex: number = STAGGER_MAX_INDEX) {
  return { "--motion-i": Math.min(index, maxIndex) } as React.CSSProperties;
}

/** `true` si el usuario pidió reducir el movimiento en su sistema operativo. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
