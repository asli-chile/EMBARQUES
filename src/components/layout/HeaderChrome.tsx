import type { ReactNode } from "react";
import type { HeaderChromeTone } from "./HeaderActionIcons";

type Props = {
  compact?: boolean;
  /** Claro (marketing) u oscuro (rail ERP / inicio). */
  tone?: HeaderChromeTone;
  children: ReactNode;
};

/**
 * Chrome del header del ERP. La ventana del .exe usa decoraciones nativas de Windows
 * (mover, maximizar, otras pantallas); este componente solo define la barra de la app.
 */
export function HeaderChrome({ compact = false, tone = "light", children }: Props) {
  const dark = tone === "dark";

  /** Oscuro fijo: no depende del tema de la página. */
  const surface = dark
    ? "border-0 bg-[#0B1A3D]/95 text-white backdrop-blur-xl"
    : "border-b border-[#e8eef5] bg-white/90 backdrop-blur-sm text-[#0a1c3a]";

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
