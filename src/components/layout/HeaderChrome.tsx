import { useEffect, useState, type ReactNode } from "react";
import { getDesktopWindow, isDesktopShell } from "@/lib/desktopShell";
import { DesktopWindowControls } from "./DesktopWindowControls";

type Props = {
  compact?: boolean;
  children: ReactNode;
};

/**
 * En el .exe (Tauri sin decoraciones nativas) el header actúa como barra de título.
 * Sin overflow-hidden (rompe popovers) y sin capa drag a pantalla completa (roba clics).
 */
export function HeaderChrome({ compact = false, children }: Props) {
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    setDesktop(isDesktopShell());
  }, []);

  if (!desktop) {
    const height = compact
      ? "h-12 min-h-12"
      : "h-12 min-h-12 md:h-[60px] md:min-h-[60px]";
    return (
      <header
        className={`sticky top-0 z-50 shrink-0 border-b border-[#e8eef5] bg-white/90 backdrop-blur-sm pt-[env(safe-area-inset-top)] ${
          compact
            ? `grid ${height} grid-cols-[1fr_auto_1fr] items-center px-2.5`
            : `flex ${height} items-center gap-1.5 px-3 md:gap-3 md:px-4`
        }`}
        role="banner"
      >
        {children}
      </header>
    );
  }

  const height = compact ? "h-[48px] min-h-[48px]" : "h-[52px] min-h-[52px]";

  return (
    <header
      className={`relative sticky top-0 z-50 flex ${height} shrink-0 items-center border-b border-[#e8eef5] bg-white select-none`}
      role="banner"
      data-desktop-titlebar=""
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest("button,a,input,select,textarea,[role='button']")) return;
        void getDesktopWindow()?.toggleMaximize();
      }}
    >
      <div
        className={`flex h-full min-w-0 flex-1 items-center ${
          compact
            ? "grid grid-cols-[1fr_auto_1fr] gap-0 px-2.5"
            : "gap-1.5 px-3 md:gap-3 md:px-4"
        }`}
      >
        {children}
      </div>
      {/* Espacio libre para arrastrar entre acciones y min/max/cerrar */}
      <div className="h-full w-3 shrink-0 self-stretch" data-tauri-drag-region aria-hidden />
      <DesktopWindowControls />
    </header>
  );
}
