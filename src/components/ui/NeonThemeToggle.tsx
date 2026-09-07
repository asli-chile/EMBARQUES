import { useCallback } from "react";
import {
  toggleNeonTheme,
  useNeonTheme,
  type NeonTheme,
} from "@/lib/ui/neonTheme";
import { IconMoon, IconSun, headerChromeBtnClass } from "@/components/layout/HeaderActionIcons";

type Props = {
  className?: string;
  buttonClassName?: string;
  variant?: "header" | "neon";
  theme?: NeonTheme;
  onThemeChange?: (theme: NeonTheme) => void;
};

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
    buttonClassName ?? (variant === "header" ? headerChromeBtnClass : "dash-theme-toggle");

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
      suppressHydrationWarning
    >
      {theme === "dark" ? <IconSun /> : <IconMoon />}
    </button>
  );
}
