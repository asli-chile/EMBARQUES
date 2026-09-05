import { useLocale } from "@/lib/i18n";

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
      ? "rounded-md px-2 py-1 text-[10px] font-bold tracking-wider text-white/55 ring-1 ring-white/15 hover:bg-white/10 hover:text-white"
      : "rounded-md px-2 py-1 text-[10px] font-bold tracking-wider text-[#5a6b85] ring-1 ring-[#d5dde8] hover:bg-[#f3f6fb] hover:text-[#11224E]";

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
