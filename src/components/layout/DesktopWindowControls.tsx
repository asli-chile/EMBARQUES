import { useCallback, useEffect, useState } from "react";
import { getDesktopWindow, isDesktopShell } from "@/lib/desktopShell";

/**
 * Botones min / max / cerrar del shell Tauri (reemplazan la barra nativa de Windows).
 */
export function DesktopWindowControls() {
  const [active, setActive] = useState(false);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    setActive(isDesktopShell());
  }, []);

  useEffect(() => {
    if (!active) return;
    const win = getDesktopWindow();
    if (!win) return;
    void win.isMaximized().then(setMaximized).catch(() => {});
  }, [active]);

  const onMinimize = useCallback(() => {
    void getDesktopWindow()?.minimize();
  }, []);

  const onToggleMaximize = useCallback(() => {
    const win = getDesktopWindow();
    if (!win) return;
    void win.toggleMaximize().then(async () => {
      try {
        setMaximized(await win.isMaximized());
      } catch {
        setMaximized((v) => !v);
      }
    });
  }, []);

  const onClose = useCallback(() => {
    void getDesktopWindow()?.close();
  }, []);

  if (!active) return null;

  const btn =
    "inline-flex h-full w-11 items-center justify-center text-brand-blue/70 transition-colors hover:bg-neutral-200/80 hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30";

  return (
    <div className="ml-1 flex h-full shrink-0 items-stretch border-l border-[#e8eef5]">
      <button type="button" className={btn} aria-label="Minimizar" title="Minimizar" onClick={onMinimize}>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <button
        type="button"
        className={btn}
        aria-label={maximized ? "Restaurar" : "Maximizar"}
        title={maximized ? "Restaurar" : "Maximizar"}
        onClick={onToggleMaximize}
      >
        {maximized ? (
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path
              d="M3.5 4.5h5v5h-5zM4.5 3.5h5v5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
            />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <rect x="2.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1.25" />
          </svg>
        )}
      </button>
      <button
        type="button"
        className={`${btn} hover:bg-red-500 hover:text-white`}
        aria-label="Cerrar"
        title="Cerrar"
        onClick={onClose}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 3l6 6M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
