import { useEffect, useRef, useState } from "react";
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

/** Selector de idioma con desplegable (Chile = ES, EE.UU. = EN). */
export function LocaleToggle({ variant = "light", className = "" }: LocaleToggleProps) {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const dark = variant === "dark";
  const current = OPTIONS.find((o) => o.locale === locale) ?? OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
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
    ? "absolute right-0 top-[calc(100%+6px)] z-[200] min-w-[10.5rem] overflow-hidden rounded-lg border border-white/15 bg-[#0c1730]/95 py-1 shadow-lg backdrop-blur-xl"
    : "absolute right-0 top-[calc(100%+6px)] z-[200] min-w-[10.5rem] overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg";

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

      {open && (
        <div className={menu} role="listbox" aria-label="Idiomas">
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
        </div>
      )}
    </div>
  );
}
