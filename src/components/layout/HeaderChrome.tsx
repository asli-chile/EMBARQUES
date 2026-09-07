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
 *
 * Alturas en px fijos: con html { font-size: 90% } los rem (h-10/h-11) descuadran
 * y los botones se salen de la franja blanca.
 */
export function HeaderChrome({ compact = false, children }: Props) {
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    setDesktop(isDesktopShell());
  }, []);

  if (!desktop) {
    const height = compact
      ? "h-12 min-h-12 overflow-hidden"
      : "h-12 min-h-12 overflow-hidden md:h-[60px] md:min-h-[60px]";
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
      className={`relative sticky top-0 z-50 flex ${height} shrink-0 items-center overflow-hidden border-b border-[#e8eef5] bg-white select-none`}
      role="banner"
      data-desktop-titlebar=""
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest("button,a,input,select,textarea,[role='button']")) return;
        void getDesktopWindow()?.toggleMaximize();
      }}
    >
      <div className="absolute inset-x-0 top-0 z-20 h-1.5" data-tauri-drag-region />
      <div
        className={`flex h-full min-w-0 flex-1 items-center overflow-hidden ${
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
