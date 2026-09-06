import { Icon } from "@iconify/react";
import { useCallback } from "react";
import {
  toggleNeonTheme,
  useNeonTheme,
  type NeonTheme,
} from "@/lib/ui/neonTheme";

type Props = {
  className?: string;
  /** Clase del botón (dashboard vs header). */
  buttonClassName?: string;
  /** Estilo para barra superior clara. */
  variant?: "header" | "neon";
  theme?: NeonTheme;
  onThemeChange?: (theme: NeonTheme) => void;
};

const HEADER_BTN =
  "inline-flex h-7 w-7 items-center justify-center rounded-md text-[#5a6b85] ring-1 ring-[#d5dde8] hover:bg-[#f3f6fb] hover:text-[#11224E]";

/**
 * Toggle día/noche neón. Sin props controlados usa el tema compartido ERP.
 */
export function NeonThemeToggle({
  className = "",
  buttonClassName,
  variant = "neon",
  theme: controlled,
  onThemeChange,
}: Props) {
  const [sharedTheme, setSharedTheme] = useNeonTheme();
  const theme = controlled ?? sharedTheme;
  const btnClass =
    buttonClassName ?? (variant === "header" ? HEADER_BTN : "dash-theme-toggle");

  const onToggle = useCallback(() => {
    const next = toggleNeonTheme(theme);
    if (onThemeChange) onThemeChange(next);
    else setSharedTheme(next);
  }, [theme, onThemeChange, setSharedTheme]);

  return (
    <button
      type="button"
      className={`${btnClass} ${className}`.trim()}
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
      aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      onClick={onToggle}
    >
      <Icon icon={theme === "dark" ? "lucide:sun" : "lucide:moon"} width={14} />
    </button>
  );
}
