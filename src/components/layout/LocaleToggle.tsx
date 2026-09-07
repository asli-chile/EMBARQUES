import { useLocale } from "@/lib/i18n";
import { Icon } from "@iconify/react";
import { headerChromeBtnClass } from "@/components/layout/HeaderActionIcons";

type LocaleToggleProps = {
  /** Estilo para header claro o rail oscuro. */
  variant?: "light" | "dark";
  className?: string;
};

/** Alterna ES ↔ EN. En dark muestra idioma actual + chevron (estilo flotante). */
export function LocaleToggle({ variant = "light", className = "" }: LocaleToggleProps) {
  const { locale, setLocale } = useLocale();
  const next = locale === "es" ? "en" : "es";
  const current = locale === "es" ? "ES" : "EN";
  const title =
    locale === "es" ? "Cambiar a inglés" : "Switch to Spanish";

  if (variant === "dark") {
    return (
      <button
        type="button"
        title={title}
        aria-label={title}
        className={`inline-flex h-10 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-semibold tracking-wide text-white/90 transition-colors hover:bg-white/10 hover:text-white ${className}`.trim()}
        onClick={() => setLocale(next)}
      >
        <Icon icon="lucide:globe" width={18} height={18} className="text-white/85" aria-hidden />
        <span>{current}</span>
        <Icon icon="lucide:chevron-down" width={15} height={15} className="text-white/55" aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={`${headerChromeBtnClass} min-w-8 px-1.5 text-[10px] font-bold tracking-[0.08em] ${className}`.trim()}
      onClick={() => setLocale(next)}
    >
      {next.toUpperCase()}
    </button>
  );
}
