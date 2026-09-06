/** Tema neón claro/oscuro compartido (Dashboard + Inicio + Informativos). */

import { useCallback, useEffect, useState } from "react";

export type NeonTheme = "light" | "dark";

export const NEON_THEME_KEY = "erp-neon-theme";
export const NEON_THEME_EVENT = "erp-neon-theme-change";

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
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NEON_THEME_EVENT, { detail: theme }));
  }
}

export function toggleNeonTheme(current: NeonTheme): NeonTheme {
  const next: NeonTheme = current === "dark" ? "light" : "dark";
  writeNeonTheme(next);
  return next;
}

/** Tema neón reactivo (Header, Inicio, Dashboard). */
export function useNeonTheme(): [NeonTheme, (theme: NeonTheme) => void] {
  const [theme, setTheme] = useState<NeonTheme>(() =>
    typeof window !== "undefined" ? readNeonTheme() : "dark",
  );

  useEffect(() => {
    setTheme(readNeonTheme());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<NeonTheme>).detail;
      if (detail === "dark" || detail === "light") setTheme(detail);
      else setTheme(readNeonTheme());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === NEON_THEME_KEY || e.key === LEGACY_INF_THEME_KEY) {
        setTheme(readNeonTheme());
      }
    };
    window.addEventListener(NEON_THEME_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(NEON_THEME_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setNeonTheme = useCallback((next: NeonTheme) => {
    writeNeonTheme(next);
    setTheme(next);
  }, []);

  return [theme, setNeonTheme];
}
