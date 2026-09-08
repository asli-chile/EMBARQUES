import { useCallback } from "react";
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
 * Switch día/noche animado propio (sin dependencia externa).
 * El paquete react-day-and-night-toggle fue despublicado de npm.
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
  const h = size ?? (variant === "header" ? 26 : 32);
  const w = Math.round(h * 2.15);
  const pad = Math.max(2, Math.round(h * 0.12));
  const knob = h - pad * 2;

  const onChange = useCallback(() => {
    const next = toggleNeonTheme(theme);
    if (onThemeChange) onThemeChange(next);
    else setSharedTheme(next);
  }, [theme, onThemeChange, setSharedTheme]);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Modo claro" : "Modo oscuro"}
      onClick={onChange}
      className={`relative inline-flex shrink-0 items-center overflow-hidden rounded-full border transition-[background-color,border-color] duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 ${buttonClassName} ${className}`.trim()}
      style={{
        width: w,
        height: h,
        background: isDark
          ? "linear-gradient(145deg, #0f172a 0%, #1e3a5f 55%, #0c4a6e 100%)"
          : "linear-gradient(145deg, #7dd3fc 0%, #38bdf8 45%, #0ea5e9 100%)",
        borderColor: isDark ? "rgba(148,163,184,0.35)" : "rgba(14,165,233,0.45)",
        boxShadow:
          variant === "header"
            ? "none"
            : isDark
              ? "0 0 18px -6px rgba(56,189,248,0.45)"
              : "0 0 14px -6px rgba(14,165,233,0.4)",
      }}
      suppressHydrationWarning
    >
      {/* estrellas (modo noche) */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{ opacity: isDark ? 1 : 0 }}
      >
        <span className="absolute rounded-full bg-white" style={{ width: 2, height: 2, top: "22%", left: "18%" }} />
        <span className="absolute rounded-full bg-white/80" style={{ width: 1.5, height: 1.5, top: "55%", left: "28%" }} />
        <span className="absolute rounded-full bg-white" style={{ width: 2, height: 2, top: "35%", left: "42%" }} />
      </span>

      {/* nube suave (modo día) */}
      <span
        aria-hidden
        className="pointer-events-none absolute rounded-full bg-white/55 transition-opacity duration-300"
        style={{
          opacity: isDark ? 0 : 1,
          width: h * 0.55,
          height: h * 0.28,
          right: pad + 2,
          bottom: pad + 1,
          filter: "blur(0.5px)",
        }}
      />

      {/* knob sol/luna */}
      <span
        aria-hidden
        className="absolute rounded-full transition-transform duration-300 ease-out"
        style={{
          width: knob,
          height: knob,
          top: pad,
          left: pad,
          transform: isDark ? `translateX(${w - knob - pad * 2}px)` : "translateX(0)",
          background: isDark
            ? "linear-gradient(145deg, #e2e8f0 0%, #94a3b8 100%)"
            : "linear-gradient(145deg, #fef08a 0%, #facc15 55%, #eab308 100%)",
          boxShadow: isDark
            ? "inset -3px -2px 0 0 rgba(15,23,42,0.35)"
            : "0 1px 4px rgba(161,98,7,0.35)",
        }}
      />
    </button>
  );
}
