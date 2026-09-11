import { siteConfig } from "@/lib/site";
import { brand } from "@/lib/brand";
import { withBase } from "@/lib/basePath";
import { AuthWidget } from "@/components/ui/AuthWidget";
import { OnlineUsersButton } from "@/components/ui/OnlineUsersButton";
import { VisitCounterBadge } from "@/components/ui/VisitCounterBadge";
import { NotificationsBell } from "@/components/ui/NotificationsBell";
import { NeonThemeToggle } from "@/components/ui/NeonThemeToggle";
import { LocaleToggle } from "./LocaleToggle";
import { HeaderChrome } from "./HeaderChrome";
import { ViewAsControl } from "./ViewAsControl";

/**
 * Barra superior del ERP (siempre compacta sobre el rail navy).
 * El Header claro + título centrado del chrome antiguo ya no existe.
 */
export function Header() {
  const tone = "dark" as const;

  return (
    <HeaderChrome compact tone={tone}>
      <div className="asli-no-drag relative z-10 flex items-center gap-1 justify-self-start">
        <div className="hidden sm:flex sm:items-center sm:gap-1">
          <VisitCounterBadge tone={tone} />
          <OnlineUsersButton tone={tone} />
        </div>
        <div className="sm:hidden">
          <VisitCounterBadge tone={tone} />
        </div>
      </div>

      <div className="flex h-full min-w-0 items-center justify-self-center">
        <div className="h-full w-4 shrink-0 self-stretch" data-tauri-drag-region aria-hidden />
        <a
          href={withBase("/inicio")}
          className="asli-no-drag relative z-10 flex h-12 items-center"
          aria-label="ASLI ERP"
          title="Inicio"
        >
          <img
            src={brand.logoWhite}
            alt={siteConfig.companyTitle}
            className="h-full w-auto max-w-[220px] object-contain"
            loading="eager"
            decoding="async"
          />
        </a>
        <div className="h-full w-4 shrink-0 self-stretch" data-tauri-drag-region aria-hidden />
      </div>

      <div className="asli-no-drag relative z-10 flex items-center justify-end gap-1 justify-self-end">
        <NeonThemeToggle variant="header" />
        <span className="mx-0.5 hidden h-4 w-px bg-white/20 sm:block" aria-hidden />
        <LocaleToggle variant="dark" />
        <span className="mx-0.5 h-4 w-px bg-white/20" aria-hidden />
        <ViewAsControl tone={tone} />
        <span className="mx-0.5 h-4 w-px bg-white/20" aria-hidden />
        <NotificationsBell tone={tone} />
        <span className="mx-0.5 h-4 w-px bg-white/20" aria-hidden />
        <AuthWidget tone={tone} />
      </div>
    </HeaderChrome>
  );
}
