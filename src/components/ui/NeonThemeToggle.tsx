import { useCallback } from "react";
import { DayAndNightToggle } from "react-day-and-night-toggle";
import {
  toggleNeonTheme,
  useNeonTheme,
  type NeonTheme,
} from "@/lib/ui/neonTheme";

type Props = {
  className?: string;
  /** Compat: antes envolvía un botón; ahora se aplica al switch. */
  buttonClassName?: string;
  variant?: "header" | "neon";
  theme?: NeonTheme;
  onThemeChange?: (theme: NeonTheme) => void;
  /** Alto del switch (recomendado par). Header ~26–28; neon ~32. */
  size?: number;
};

/**
 * Switch día/noche animado ([react-day-and-night-toggle](https://github.com/cutelilangel/react-day-and-night-toggle)).
 * `checked` = modo oscuro.
 */
export function NeonThemeToggle({
  className = "",
  buttonClassName = "",
  variant = "neon",
  theme: controlled,
  onThemeChange,
  size,
}: Props) {
  const [sharedTheme, setSharedTheme] = useNeonTheme();
  const theme = controlled ?? sharedTheme;
  const isDark = theme === "dark";
  const resolvedSize = size ?? (variant === "header" ? 26 : 32);

  const onChange = useCallback(() => {
    const next = toggleNeonTheme(theme);
    if (onThemeChange) onThemeChange(next);
    else setSharedTheme(next);
  }, [theme, onThemeChange, setSharedTheme]);

  return (
    <span
      className={`inline-flex shrink-0 items-center leading-none ${buttonClassName} ${className}`.trim()}
      title={isDark ? "Modo claro" : "Modo oscuro"}
      suppressHydrationWarning
    >
      <DayAndNightToggle
        checked={isDark}
        onChange={onChange}
        size={resolvedSize}
        shadows={variant !== "header"}
        animationInactive
        startInactive={false}
      />
    </span>
  );
}
