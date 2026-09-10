/** Detección y controles de ventana para el shell Tauri (ASLI Embarques .exe). */

type DesktopWindow = {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  startDragging: () => Promise<void>;
  setDecorations?: (decorations: boolean) => Promise<void>;
};

type TauriGlobal = {
  window?: {
    getCurrentWindow?: () => DesktopWindow;
  };
};

function getTauriGlobal(): TauriGlobal | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { __TAURI__?: TauriGlobal };
  return w.__TAURI__ ?? null;
}

export function isDesktopShell(): boolean {
  return typeof getTauriGlobal()?.window?.getCurrentWindow === "function";
}

export function getDesktopWindow(): DesktopWindow | null {
  const getCurrent = getTauriGlobal()?.window?.getCurrentWindow;
  if (!getCurrent) return null;
  try {
    return getCurrent();
  } catch {
    return null;
  }
}

/** Quita la barra blanca de Windows; el header del ERP es la titlebar. */
export function ensureCustomTitlebarShell(): void {
  const win = getDesktopWindow();
  if (!win?.setDecorations) return;
  void win.setDecorations(false).catch(() => {});
}
