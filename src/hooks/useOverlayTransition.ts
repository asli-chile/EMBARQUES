/**
 * Ciclo de vida animado de un overlay (modal, panel, sheet, dropdown).
 *
 * El problema que resuelve: React desmonta el nodo en el mismo frame en que el
 * estado pasa a `false`, así que un modal cerrado desaparece de golpe. Este
 * hook mantiene el nodo montado el tiempo justo para que corra la animación de
 * salida, y expone un `state` (`"open"` / `"closed"`) que el CSS lee con
 * `[data-state]` (ver `.motion-backdrop` y `.motion-panel` en motion.css).
 *
 * Además centraliza lo que cada modal del ERP reimplementaba por separado:
 * bloqueo del scroll del body y cierre con Escape.
 *
 * Sistema de motion: docs/MOTION-DESIGN.md
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { duration } from "@/lib/ui/motion";

type OverlayState = "open" | "closed";

type UseOverlayTransitionOptions = {
  /** Estado deseado por el componente padre. */
  isOpen: boolean;
  /** Se llama cuando la animación de salida terminó y el nodo puede desmontarse. */
  onClose: () => void;
  /** Bloquear el scroll del documento mientras está abierto. */
  lockScroll?: boolean;
  /** Cerrar con la tecla Escape. */
  closeOnEscape?: boolean;
};

type UseOverlayTransition = {
  /** `false` solo cuando ya no hay nada que animar: es la guarda de render. */
  isMounted: boolean;
  /** Valor para `data-state` en backdrop y panel. */
  state: OverlayState;
  /** Inicia la salida animada; `onClose` llega al terminar. */
  close: () => void;
};

export function useOverlayTransition({
  isOpen,
  onClose,
  lockScroll = true,
  closeOnEscape = true,
}: UseOverlayTransitionOptions): UseOverlayTransition {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [state, setState] = useState<OverlayState>("closed");
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (exitTimer.current) {
      clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }
    setIsMounted(true);
    /*
     * Doble rAF: el primero deja que React pinte el nodo con `data-state="closed"`
     * (estado inicial de la transición), el segundo cambia a `"open"`. Sin esto el
     * navegador ve un solo estilo computado y no hay transición que interpolar.
     */
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setState("open"));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [isOpen]);

  const close = useCallback(() => {
    if (state === "closed") return;
    setState("closed");
    exitTimer.current = setTimeout(() => {
      setIsMounted(false);
      onClose();
    }, duration.fast);
  }, [state, onClose]);

  /*
   * Cierre programático: el padre bajó `isOpen` por su cuenta (por ejemplo al
   * guardar con éxito). El overlay se sigue animando al salir, pero sin volver
   * a llamar a `onClose` — el padre ya actualizó su estado.
   */
  useEffect(() => {
    if (isOpen || !isMounted) return;
    setState("closed");
    const timer = setTimeout(() => setIsMounted(false), duration.fast);
    return () => clearTimeout(timer);
  }, [isOpen, isMounted]);

  useEffect(() => () => {
    if (exitTimer.current) clearTimeout(exitTimer.current);
  }, []);

  useEffect(() => {
    if (!isMounted || !lockScroll) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isMounted, lockScroll]);

  useEffect(() => {
    if (!isMounted || !closeOnEscape) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isMounted, closeOnEscape, close]);

  return { isMounted, state, close };
}
