/** Detección del shell Tauri (ASLI Embarques .exe). */

type TauriGlobal = {
  window?: {
    getCurrentWindow?: () => unknown;
  };
};

function getTauriGlobal(): TauriGlobal | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { __TAURI__?: TauriGlobal };
  return w.__TAURI__ ?? null;
}

/** True cuando la página corre dentro del .exe (p. ej. recordar credenciales en login). */
export function isDesktopShell(): boolean {
  return typeof getTauriGlobal()?.window?.getCurrentWindow === "function";
}
