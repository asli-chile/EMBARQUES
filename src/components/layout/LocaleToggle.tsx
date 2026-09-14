import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { useLocale, type Locale } from "@/lib/i18n";
import { headerChromeBtnClass } from "@/components/layout/HeaderActionIcons";

type LocaleToggleProps = {
  /** Estilo para header claro o rail oscuro. */
  variant?: "light" | "dark";
  className?: string;
};

const OPTIONS: { locale: Locale; label: string; flag: string; name: string }[] = [
  { locale: "es", label: "ES", flag: "circle-flags:cl", name: "Español" },
  { locale: "en", label: "EN", flag: "circle-flags:us", name: "English" },
];

/**
 * Selector de idioma con desplegable (Chile = ES, EE.UU. = EN).
 *
 * El panel se dibuja en un portal sobre `body`, con posición fija calculada
 * desde el botón. No es un capricho: en el rail lateral el desplegable no
 * aparecía, porque el rail usa `overflow-hidden` para animar su ancho y
 * recortaba todo lo que se saliera de sus 64 px. El panel se abría y quedaba
 * invisible, que desde fuera se ve igual que un botón roto.
 *
 * Fuera del flujo, además, elige solo hacia dónde abrirse: en el rail el botón
 * vive abajo, y hacia abajo no cabe.
 */
export function LocaleToggle({ variant = "light", className = "" }: LocaleToggleProps) {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dark = variant === "dark";
  const current = OPTIONS.find((o) => o.locale === locale) ?? OPTIONS[0];

  /** Coordenadas del panel, en píxeles de ventana. */
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  const ubicar = useCallback(() => {
    const boton = rootRef.current;
    if (!boton) return;
    const r = boton.getBoundingClientRect();
    // Alto estimado del panel: dos opciones más el relleno del contenedor.
    const alto = 2 * 42 + 8;
    const cabeAbajo = r.bottom + 6 + alto <= window.innerHeight;
    setPos({
      // Hacia arriba cuando no cabe abajo, que es lo que pasa en el rail.
      top: cabeAbajo ? r.bottom + 6 : Math.max(8, r.top - 6 - alto),
      // Alineado por la derecha del botón, sin tener que medir el panel.
      right: Math.max(8, window.innerWidth - r.right),
    });
  }, []);

  useLayoutEffect(() => {
    if (open) ubicar();
  }, [open, ubicar]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      // El panel ya no cuelga del botón: hay que preguntar por los dos.
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // Si la página se mueve bajo el panel, queda apuntando a cualquier parte.
    const onMover = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onMover);
    window.addEventListener("scroll", onMover, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onMover);
      window.removeEventListener("scroll", onMover, true);
    };
  }, [open]);

  const pick = (next: Locale) => {
    setLocale(next);
    setOpen(false);
  };

  const trigger = dark
    ? "inline-flex h-10 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-semibold tracking-wide text-white/90 transition-colors hover:bg-white/10 hover:text-white"
    : `${headerChromeBtnClass} min-w-8 gap-1 px-1.5 text-[10px] font-bold tracking-[0.08em]`;

  const menu = dark
    ? "fixed z-[300] min-w-[10.5rem] overflow-hidden rounded-lg border border-white/15 bg-[#0c1730]/95 py-1 shadow-lg backdrop-blur-xl"
    : "fixed z-[300] min-w-[10.5rem] overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg";

  const optionBase = dark
    ? "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium text-white/90 transition-colors hover:bg-white/10"
    : "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium text-neutral-800 transition-colors hover:bg-neutral-50";

  return (
    <div ref={rootRef} className={`relative ${className}`.trim()}>
      <button
        type="button"
        title={dark ? "Idioma / Language" : "Cambiar idioma"}
        aria-label="Elegir idioma"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={trigger}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon icon={current.flag} width={dark ? 20 : 16} height={dark ? 20 : 16} aria-hidden />
        <span>{current.label}</span>
        <Icon
          icon="lucide:chevron-down"
          width={dark ? 15 : 12}
          height={dark ? 15 : 12}
          className={`${dark ? "text-white/55" : "text-neutral-500"} transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && pos && typeof document !== "undefined" &&
        createPortal(
        <div
          ref={menuRef}
          className={menu}
          style={{ top: pos.top, right: pos.right }}
          role="listbox"
          aria-label="Idiomas"
        >
          {OPTIONS.map((opt) => {
            const active = opt.locale === locale;
            return (
              <button
                key={opt.locale}
                type="button"
                role="option"
                aria-selected={active}
                className={`${optionBase} ${active ? (dark ? "bg-white/10" : "bg-brand-blue/5 text-brand-blue") : ""}`}
                onClick={() => pick(opt.locale)}
              >
                <Icon icon={opt.flag} width={22} height={22} aria-hidden />
                <span className="flex-1">{opt.name}</span>
                <span className={`text-[11px] font-semibold ${dark ? "text-white/45" : "text-neutral-400"}`}>
                  {opt.label}
                </span>
                {active ? (
                  <Icon
                    icon="lucide:check"
                    width={14}
                    height={14}
                    className={dark ? "text-sky-300" : "text-brand-blue"}
                    aria-hidden
                  />
                ) : (
                  <span className="w-3.5" aria-hidden />
                )}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
