/**
 * Skeletons compartidos del ERP.
 *
 * Un skeleton reserva el espacio del contenido que todavía no llegó, con la
 * misma forma que tendrá el dato real, para que la transición
 * skeleton → contenido no mueva el layout.
 *
 * Sistema de motion: docs/MOTION-DESIGN.md
 */
import type { CSSProperties } from "react";
import { staggerStyle } from "@/lib/ui/motion";

/**
 * `default` — sobre el fondo azulado de los módulos.
 * `onDark`  — sobre el hero navy o el drawer.
 * `surface` — ocupa el lugar de una card blanca, sin oscurecerla.
 */
type SkeletonTone = "default" | "onDark" | "surface";

const toneClass: Record<SkeletonTone, string> = {
  default: "",
  onDark: "motion-skeleton-on-dark",
  surface: "motion-skeleton-surface",
};

type SkeletonProps = {
  /** Clases de tamaño y forma (`h-4 w-32 rounded-md`). */
  className?: string;
  tone?: SkeletonTone;
  style?: CSSProperties;
};

/** Bloque con shimmer. Es la pieza base: todo lo demás la compone. */
export function Skeleton({ className = "", tone = "default", style }: SkeletonProps) {
  return (
    <div
      className={`motion-skeleton ${toneClass[tone]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

type SkeletonRowsProps = {
  /** Cuántas filas dibujar. */
  rows?: number;
  className?: string;
};

/**
 * Filas de tabla o de lista, en cascada.
 *
 * El stagger aquí no es decorativo: comunica que el contenido llega en orden
 * y evita el "golpe" de N bloques apareciendo a la vez.
 */
export function SkeletonRows({ rows = 6, className = "" }: SkeletonRowsProps) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="motion-enter motion-stagger motion-stagger-tight flex items-center gap-3 rounded-xl border border-brand-blue/10 bg-white/70 px-3 py-3"
          style={staggerStyle(i)}
        >
          <Skeleton className="h-8 w-8 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/5 rounded-md" />
            <Skeleton className="h-3 w-1/4 rounded-md" />
          </div>
          <Skeleton className="hidden h-3.5 w-20 rounded-md sm:block" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}