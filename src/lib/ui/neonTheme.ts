/** Tema neón claro/oscuro compartido (Dashboard + Informativos). */

export type NeonTheme = "light" | "dark";

export const NEON_THEME_KEY = "erp-neon-theme";
/** Clave legacy de Informativos — se migra a NEON_THEME_KEY. */
const LEGACY_INF_THEME_KEY = "informativos-studio-theme";

export function readNeonTheme(): NeonTheme {
  try {
    const v = localStorage.getItem(NEON_THEME_KEY);
    if (v === "dark" || v === "light") return v;
    const legacy = localStorage.getItem(LEGACY_INF_THEME_KEY);
    if (legacy === "dark" || legacy === "light") {
      localStorage.setItem(NEON_THEME_KEY, legacy);
      return legacy;
    }
  } catch {
    /* ignore */
  }
  return "dark";
}

export function writeNeonTheme(theme: NeonTheme): void {
  try {
    localStorage.setItem(NEON_THEME_KEY, theme);
    localStorage.setItem(LEGACY_INF_THEME_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function toggleNeonTheme(current: NeonTheme): NeonTheme {
  const next: NeonTheme = current === "dark" ? "light" : "dark";
  writeNeonTheme(next);
  return next;
}
