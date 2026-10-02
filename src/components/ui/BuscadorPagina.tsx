import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@iconify/react";

/**
 * Buscador de página: el mismo campo, en el mismo lugar, en todas las secciones.
 *
 * Cada pantalla tenía el suyo —a la izquierda, a la derecha, dentro de una
 * tarjeta, de 176 px o a todo el ancho— y con el fondo del control casi igual
 * al de la barra, así que en el tema claro no se distinguía. Ahora va siempre
 * en la franja de justo debajo del título, primero a la izquierda, con fondo
 * propio, borde de acento y la lupa en color (clase `dash-search`).
 *
 * La tecla `/` lleva al buscador desde cualquier parte de la página (salvo que
 * se esté escribiendo en otro campo) y `Esc` lo vacía.
 */

type BuscadorProps = {
  valor: string;
  onCambio: (v: string) => void;
  placeholder: string;
  /** Texto para lectores de pantalla; por defecto, el placeholder. */
  etiqueta?: string;
  className?: string;
};

function escribiendoEnOtroCampo(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

export function BuscadorPagina({ valor, onCambio, placeholder, etiqueta, className = "" }: BuscadorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enfocado, setEnfocado] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (escribiendoEnOtroCampo(document.activeElement)) return;
      const input = inputRef.current;
      if (!input || input.offsetParent === null) return;
      e.preventDefault();
      input.focus();
      input.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={`relative min-w-0 flex-1 ${className}`}>
      <Icon icon="lucide:search" width={16} height={16} className="dash-search-icon" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        onFocus={() => setEnfocado(true)}
        onBlur={() => setEnfocado(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && valor) {
            e.preventDefault();
            onCambio("");
          }
        }}
        placeholder={placeholder}
        aria-label={etiqueta ?? placeholder}
        className="dash-search"
      />
      {valor ? (
        <button
          type="button"
          onClick={() => {
            onCambio("");
            inputRef.current?.focus();
          }}
          className="dash-search-clear"
          aria-label="Limpiar búsqueda"
          title="Limpiar (Esc)"
        >
          <Icon icon="lucide:x" width={14} height={14} />
        </button>
      ) : (
        !enfocado && (
          <kbd className="dash-search-kbd" title="Pulsa / para buscar">
            /
          </kbd>
        )
      )}
    </div>
  );
}

/**
 * Franja bajo el título de la página: buscador a la izquierda y, a su derecha,
 * lo que cada pantalla necesite (filtros, temporada, refrescar…).
 */
export function BarraBusqueda({
  zIndex = "z-10",
  children,
  buscador,
}: {
  /** Algunas pantallas abren menús desde la barra y la necesitan por encima. */
  zIndex?: string;
  buscador: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      className={`dash-search-bar relative ${zIndex} shrink-0 border-b border-dash-border bg-[color-mix(in_srgb,var(--dash-header)_70%,transparent)] backdrop-blur-md`}
    >
      <div className="flex items-center gap-1.5 px-3 py-2 sm:px-4">
        {buscador}
        {children}
      </div>
    </div>
  );
}
