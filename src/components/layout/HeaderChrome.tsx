import { useEffect, useState, type ReactNode } from "react";
import { getDesktopWindow, isDesktopShell } from "@/lib/desktopShell";
import { DesktopWindowControls } from "./DesktopWindowControls";
import type { HeaderChromeTone } from "./HeaderActionIcons";

type Props = {
  compact?: boolean;
  /** Claro (marketing) u oscuro (rail ERP / inicio). */
  tone?: HeaderChromeTone;
  children: ReactNode;
};

/**
 * En el .exe (Tauri sin decoraciones nativas) el header actúa como barra de título.
 * Compact/dark: transparente y flotante sobre el fondo de la página.
 */
export function HeaderChrome({ compact = false, tone = "light", children }: Props) {
  const [desktop, setDesktop] = useState(false);
  const dark = tone === "dark";

  useEffect(() => {
    setDesktop(isDesktopShell());
  }, []);

  /** Oscuro flotante: sin placa sólida; leve velo solo para legibilidad en módulos claros. */
  const surface = dark
    ? "border-b border-transparent bg-gradient-to-b from-black/35 via-black/10 to-transparent text-white"
    : "border-b border-[#e8eef5] bg-white/90 backdrop-blur-sm text-[#0a1c3a]";

  const surfaceDesktop = dark
    ? "border-b border-transparent bg-gradient-to-b from-black/35 via-black/10 to-transparent text-white"
    : "border-b border-[#e8eef5] bg-white text-[#0a1c3a]";

  if (!desktop) {
    const height = compact
      ? "h-[60px] min-h-[60px]"
      : "h-12 min-h-12 md:h-[60px] md:min-h-[60px]";
    return (
      <header
        className={`z-50 shrink-0 pt-[env(safe-area-inset-top)] ${surface} ${
          compact
            ? `grid ${height} grid-cols-[1fr_auto_1fr] items-center px-2.5`
            : `sticky top-0 flex ${height} items-center gap-1.5 px-3 md:gap-3 md:px-4`
        }`}
        role="banner"
        data-header-tone={tone}
      >
        {children}
      </header>
    );
  }

  const height = compact ? "h-[60px] min-h-[60px]" : "h-[52px] min-h-[52px]";

  return (
    <header
      className={`z-50 flex ${height} shrink-0 items-center select-none ${surfaceDesktop}`}
      role="banner"
      data-desktop-titlebar=""
      data-header-tone={tone}
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
      <div className="h-full w-3 shrink-0 self-stretch" data-tauri-drag-region aria-hidden />
      <DesktopWindowControls tone={tone} />
    </header>
  );
}
