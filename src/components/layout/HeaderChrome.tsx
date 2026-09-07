import { useEffect, useState, type ReactNode } from "react";
import { getDesktopWindow, isDesktopShell } from "@/lib/desktopShell";
import { DesktopWindowControls } from "./DesktopWindowControls";

type Props = {
  compact?: boolean;
  children: ReactNode;
};

/**
 * En el .exe (Tauri sin decoraciones nativas) el header actúa como barra de título:
 * zona de arrastre + controles min/max/cerrar.
 */
export function HeaderChrome({ compact = false, children }: Props) {
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    setDesktop(isDesktopShell());
  }, []);

  const height = compact
    ? "h-10 min-h-10"
    : "h-12 min-h-12 md:h-[60px] md:min-h-[60px]";

  if (!desktop) {
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

  return (
    <header
      className={`relative sticky top-0 z-50 flex ${height} shrink-0 items-center border-b border-[#e8eef5] bg-white select-none`}
      role="banner"
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest("button,a,input,select,textarea,[role='button']")) return;
        void getDesktopWindow()?.toggleMaximize();
      }}
    >
      {/* Franja superior para arrastrar aunque el header esté lleno de controles */}
      <div className="absolute inset-x-0 top-0 z-20 h-1.5" data-tauri-drag-region />
      <div
        className={`flex min-w-0 flex-1 items-center self-stretch ${
          compact
            ? "grid grid-cols-[1fr_auto_1fr] gap-0 px-2.5"
            : "gap-1.5 px-3 md:gap-3 md:px-4"
        }`}
      >
        {children}
      </div>
      <DesktopWindowControls />
    </header>
  );
}
