import { useLocale } from "@/lib/i18n";
import { headerChromeBtnClass } from "@/components/layout/HeaderActionIcons";

type LocaleToggleProps = {
  /** Estilo para header claro o rail oscuro. */
  variant?: "light" | "dark";
  className?: string;
};

/** Alterna ES ↔ EN. */
export function LocaleToggle({ variant = "light", className = "" }: LocaleToggleProps) {
  const { locale, setLocale } = useLocale();
  const next = locale === "es" ? "en" : "es";
  const label = locale === "es" ? "EN" : "ES";
  const title =
    locale === "es" ? "Cambiar a inglés" : "Switch to Spanish";

  const base =
    variant === "dark"
      ? "inline-flex h-8 min-w-8 items-center justify-center rounded-sm px-1.5 text-[10px] font-bold tracking-wider text-white/70 ring-1 ring-white/15 hover:bg-white/10 hover:text-white"
      : `${headerChromeBtnClass} min-w-8 px-1.5 text-[10px] font-bold tracking-[0.08em]`;

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={`${base} ${className}`.trim()}
      onClick={() => setLocale(next)}
    >
      {label}
    </button>
  );
}
