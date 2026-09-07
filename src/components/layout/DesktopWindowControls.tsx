import { useCallback, useEffect, useState } from "react";
import { getDesktopWindow, isDesktopShell } from "@/lib/desktopShell";
import type { HeaderChromeTone } from "./HeaderActionIcons";

/**
 * Botones min / max / cerrar del shell Tauri (estilo Windows 11 + ASLI).
 */
export function DesktopWindowControls({ tone = "light" }: { tone?: HeaderChromeTone }) {
  const [active, setActive] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const dark = tone === "dark";

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

  const btn = dark
    ? "inline-flex h-full w-[46px] items-center justify-center text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300/40"
    : "inline-flex h-full w-[46px] items-center justify-center text-[#3d4f6f] transition-colors hover:bg-[#e8eef5] hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue/30";

  /** Sin hover del resto: así el rojo de cerrar no queda pisado por hover:bg-white/10. */
  const closeBtn = dark
    ? "inline-flex h-full w-[46px] items-center justify-center text-white/70 transition-colors hover:bg-[#e81123] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#e81123]/50"
    : "inline-flex h-full w-[46px] items-center justify-center text-[#3d4f6f] transition-colors hover:bg-[#e81123] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#e81123]/40";

  return (
    <div
      className={`flex h-full shrink-0 items-stretch border-l ${
        dark ? "border-white/10" : "border-[#e8eef5]"
      }`}
    >
      <button type="button" className={btn} aria-label="Minimizar" title="Minimizar" onClick={onMinimize}>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M1 5h8" stroke="currentColor" strokeWidth="1.2" />
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
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M3 3.5h5.5V9H3z" fill="none" stroke="currentColor" strokeWidth="1.1" />
            <path d="M1.5 7V1.5H7" fill="none" stroke="currentColor" strokeWidth="1.1" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <rect x="1.5" y="1.5" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1.1" />
          </svg>
        )}
      </button>
      <button
        type="button"
        className={closeBtn}
        aria-label="Cerrar"
        title="Cerrar"
        onClick={onClose}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>
    </div>
  );
}
