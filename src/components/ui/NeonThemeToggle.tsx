import { Icon } from "@iconify/react";
import { useCallback, useEffect, useState } from "react";
import {
  readNeonTheme,
  toggleNeonTheme,
  type NeonTheme,
} from "@/lib/ui/neonTheme";

type Props = {
  className?: string;
  /** Clase del botón (dashboard vs informativos). */
  buttonClassName?: string;
  theme?: NeonTheme;
  onThemeChange?: (theme: NeonTheme) => void;
};

/**
 * Toggle día/noche neón. Si no recibe theme controlado, gestiona estado local
 * y persiste en localStorage (clave compartida ERP).
 */
export function NeonThemeToggle({
  className = "",
  buttonClassName = "dash-theme-toggle",
  theme: controlled,
  onThemeChange,
}: Props) {
  const [localTheme, setLocalTheme] = useState<NeonTheme>("dark");
  const theme = controlled ?? localTheme;

  useEffect(() => {
    if (controlled != null) return;
    setLocalTheme(readNeonTheme());
  }, [controlled]);

  const onToggle = useCallback(() => {
    const next = toggleNeonTheme(theme);
    if (onThemeChange) onThemeChange(next);
    else setLocalTheme(next);
  }, [theme, onThemeChange]);

  return (
    <button
      type="button"
      className={`${buttonClassName} ${className}`.trim()}
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
      aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      onClick={onToggle}
    >
      <Icon icon={theme === "dark" ? "lucide:sun" : "lucide:moon"} width={14} />
    </button>
  );
}
