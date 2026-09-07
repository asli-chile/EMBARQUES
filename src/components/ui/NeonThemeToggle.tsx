import { useCallback, useEffect, useState, type ComponentType } from "react";
import {
  toggleNeonTheme,
  useNeonTheme,
  type NeonTheme,
} from "@/lib/ui/neonTheme";

type DayNightProps = {
  checked: boolean;
  onChange: () => void;
  size?: number;
  startInactive?: boolean;
  animationInactive?: boolean;
  shadows?: boolean;
  className?: string;
};

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
 * Switch día/noche animado (react-day-and-night-toggle).
 * Se importa solo en el cliente: styled-components rompe el SSR de Astro/Vercel.
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
  const [Toggle, setToggle] = useState<ComponentType<DayNightProps> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("react-day-and-night-toggle")
      .then((mod) => {
        if (!cancelled) setToggle(() => mod.DayAndNightToggle as ComponentType<DayNightProps>);
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn("[NeonThemeToggle]", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      {Toggle ? (
        <Toggle
          checked={isDark}
          onChange={onChange}
          size={resolvedSize}
          shadows={variant !== "header"}
          animationInactive
          startInactive={false}
        />
      ) : (
        <span
          className="inline-block rounded-full bg-neutral-200/80"
          style={{ width: resolvedSize * 2.2, height: resolvedSize }}
          aria-hidden
        />
      )}
    </span>
  );
}
