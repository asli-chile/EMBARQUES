import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { duration as motionDuration } from "@/lib/ui/motion";

/**
 * Tablas cuyas filas se despliegan en el lugar (Mis Reservas, Documentos).
 *
 * El comportamiento es uno solo y vive acá, para que las dos pantallas no se
 * sientan distintas:
 *
 * - Una fila abierta a la vez. Mientras hay una abierta no se abre otra: para
 *   pasar a otra operación hay que replegar.
 * - Al abrir, la fila sube bajo el encabezado de la tabla y el panel ocupa
 *   exactamente el alto que queda. La tabla deja de desplazarse; lo que no
 *   cabe se recorre dentro del panel.
 * - La cabecera de la página (título, indicadores, búsqueda) se repliega para
 *   darle al panel toda la pantalla, y vuelve apenas se empieza a replegar.
 * - Abre con `motion-unfold` y cierra con la misma transición al revés; el
 *   panel se desmonta cuando termina.
 * - `Escape` repliega, salvo que se esté escribiendo o haya un modal encima.
 */

/** Atributo del contenedor con scroll: el panel lo busca para medirse. */
export const FILA_SCROLL_ATTR = "data-fila-scroll";

type Opciones = {
  /** Ids de las filas visibles. Si la abierta sale de la lista, se cierra. */
  visibles: readonly string[];
  /** `false` cuando la tabla no está en pantalla (otra vista, cargando). */
  habilitado: boolean;
  /** Hay un modal encima: `Escape` es de él. */
  bloqueoEscape?: boolean;
};

export function useFilaDesplegable({ visibles, habilitado, bloqueoEscape = false }: Opciones) {
  const [abiertaId, setAbiertaId] = useState<string | null>(null);
  const [cerrando, setCerrando] = useState(false);
  const abiertaRef = useRef<string | null>(null);
  abiertaRef.current = abiertaId;
  const timer = useRef<number | null>(null);

  const cerrar = useCallback(() => {
    if (!abiertaRef.current || timer.current != null) return;
    setCerrando(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setAbiertaId(null);
      setCerrando(false);
    }, motionDuration.fast);
  }, []);

  useEffect(
    () => () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    },
    [],
  );

  const toggle = useCallback(
    (id: string) => {
      const actual = abiertaRef.current;
      if (actual === id) cerrar();
      else if (actual == null) setAbiertaId(id);
    },
    [cerrar],
  );

  /** Abre sin pasar por el toggle: para enlaces profundos (`?op=`). */
  const abrir = useCallback((id: string) => setAbiertaId(id), []);

  /* Si un filtro saca de la lista a la fila abierta, o la tabla deja de
     estar en pantalla, se cierra: si no, quedaría bloqueada sin panel. */
  useEffect(() => {
    if (!abiertaId) return;
    if (!habilitado || !visibles.includes(abiertaId)) {
      setAbiertaId(null);
      setCerrando(false);
    }
  }, [abiertaId, visibles, habilitado]);

  useEffect(() => {
    if (!abiertaId || bloqueoEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if ((e.target as HTMLElement | null)?.closest("input, select, textarea")) return;
      cerrar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abiertaId, bloqueoEscape, cerrar]);

  /* El panel ocupa el ancho visible, no el de la tabla: con scroll horizontal
     quedaría cortado a la derecha. Se mide el contenedor y se fija como var.
     Ref de callback: el contenedor aparece recién cuando termina de cargar. */
  const observer = useRef<ResizeObserver | null>(null);
  const scrollRef = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => el.style.setProperty("--fila-panel-w", `${el.clientWidth}px`));
    ro.observe(el);
    observer.current = ro;
  }, []);

  return {
    abiertaId,
    cerrando,
    toggle,
    abrir,
    cerrar,
    /** Props del contenedor con scroll de la tabla. */
    scrollProps: {
      ref: scrollRef,
      [FILA_SCROLL_ATTR]: "",
      className: abiertaId ? "overflow-x-auto overflow-y-hidden" : "overflow-auto",
    },
    /** Para `rd-colapsable` sobre la cabecera de la página. */
    cabeceraOculta: !!abiertaId && !cerrando && habilitado,
  };
}

/** Lo que dentro de una fila tiene su propio clic y no debe desplegarla. */
export const FILA_INTERACTIVA = "button, a, input, select, textarea, label, [data-row-action]";

/** Props de la `<tr>` que se despliega al hacer clic o con Enter/Espacio. */
export function propsFilaDesplegable(id: string, abierta: boolean, onToggle: (id: string) => void) {
  return {
    tabIndex: 0,
    "aria-expanded": abierta,
    onClick: (event: React.MouseEvent) => {
      if ((event.target as HTMLElement).closest(FILA_INTERACTIVA)) return;
      onToggle(id);
    },
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.target !== event.currentTarget) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onToggle(id);
      }
    },
  };
}

type PanelProps = {
  cerrando: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Contenedor del panel, dentro de la `<td colSpan>` que sigue a la fila.
 *
 * Mide el alto disponible, lleva la fila bajo el encabezado de la tabla y
 * corre la animación de entrada. El contenido decide su propio diseño.
 */
export function PanelBajoFila({ cerrando, children, className }: PanelProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [alto, setAlto] = useState<number | null>(null);
  const [abierto, setAbierto] = useState(false);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const cont = wrap?.closest<HTMLElement>(`[${FILA_SCROLL_ATTR}]`);
    const fila = wrap?.closest("tr")?.previousElementSibling as HTMLElement | null;
    if (!wrap || !cont || !fila) return;
    const medir = () => {
      const thead = cont.querySelector("thead")?.getBoundingClientRect().height ?? 0;
      const disponible = cont.clientHeight - thead - fila.getBoundingClientRect().height;
      setAlto(Math.max(Math.floor(disponible), 260));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(cont);
    return () => ro.disconnect();
  }, []);

  /* Con el alto ya puesto, la fila se lleva bajo el encabezado. El scroll es
     programático porque la rueda está bloqueada en el contenedor. Solo al
     abrir: redimensionar la ventana no debe volver a desplazar. */
  const altoListo = alto != null;
  useEffect(() => {
    if (!altoListo) return;
    const wrap = wrapRef.current;
    const cont = wrap?.closest<HTMLElement>(`[${FILA_SCROLL_ATTR}]`);
    const fila = wrap?.closest("tr")?.previousElementSibling as HTMLElement | null;
    if (!cont || !fila) return;
    const thead = cont.querySelector("thead")?.getBoundingClientRect().height ?? 0;
    const delta = fila.getBoundingClientRect().top - cont.getBoundingClientRect().top - thead;
    cont.scrollTo({ top: cont.scrollTop + delta, behavior: "smooth" });
  }, [altoListo]);

  /* Un frame en estado cerrado y después abierto: así la transición corre. */
  useEffect(() => {
    const id = requestAnimationFrame(() => setAbierto(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      ref={wrapRef}
      className="sticky left-0 px-3 pb-3 pt-2"
      style={{ width: "var(--fila-panel-w, 100%)", height: alto ?? undefined } as CSSProperties}
    >
      <div
        data-state={!cerrando && abierto ? "open" : "closed"}
        className={`motion-unfold flex h-full flex-col overflow-hidden rounded-2xl border border-dash-border shadow-[0_30px_70px_-35px_rgba(0,0,0,0.7)] ${className ?? "bg-dash-bg"}`}
      >
        {children}
      </div>
    </div>
  );
}
