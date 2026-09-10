import { siteConfig } from "@/lib/site";
import { brand } from "@/lib/brand";
import { withBase } from "@/lib/basePath";
import { AuthWidget } from "@/components/ui/AuthWidget";
import { OnlineUsersButton } from "@/components/ui/OnlineUsersButton";
import { VisitCounterBadge } from "@/components/ui/VisitCounterBadge";
import { NotificationsBell } from "@/components/ui/NotificationsBell";
import { NeonThemeToggle } from "@/components/ui/NeonThemeToggle";
import { HeaderTitle } from "./HeaderTitle";
import { LocaleToggle } from "./LocaleToggle";
import { HeaderChrome } from "./HeaderChrome";
import { ViewAsControl } from "./ViewAsControl";
import type { HeaderChromeTone } from "./HeaderActionIcons";

type HeaderProps = {
  /** Con rail lateral: barra fina navy, logo blanco, controles sobre oscuro. */
  compact?: boolean;
};

export function Header({ compact = false }: HeaderProps) {
  const tone: HeaderChromeTone = compact ? "dark" : "light";
  const logoSrc = tone === "dark" ? brand.logoWhite : siteConfig.logo;

  if (compact) {
    return (
      <HeaderChrome compact tone={tone}>
        <div className="relative z-10 flex items-center gap-1 justify-self-start">
          <div className="hidden sm:flex sm:items-center sm:gap-1">
            <VisitCounterBadge tone={tone} />
            <OnlineUsersButton tone={tone} />
          </div>
          <div className="sm:hidden">
            <VisitCounterBadge tone={tone} />
          </div>
        </div>

        <div className="flex h-full min-w-0 items-center justify-self-center">
          <a
            href={withBase("/inicio")}
            className="relative z-10 flex h-12 items-center"
            aria-label="ASLI ERP"
            title="Inicio"
          >
            <img
              src={logoSrc}
              alt={siteConfig.companyTitle}
              className="h-full w-auto max-w-[220px] object-contain"
              loading="eager"
              decoding="async"
            />
          </a>
        </div>

        <div className="relative z-10 flex items-center justify-end gap-1 justify-self-end">
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

  return (
    <HeaderChrome tone={tone}>
      <a
        href={withBase("/inicio")}
        className="flex h-8 w-auto flex-shrink-0 items-center md:h-[50px]"
        aria-label="Ir al inicio del ERP"
      >
        <img
          src={logoSrc}
          alt={siteConfig.companyTitle}
          width={160}
          height={44}
          className="h-full w-auto object-contain object-left"
          loading="eager"
          decoding="async"
        />
      </a>

      <div className="hidden min-w-0 flex-1 items-center md:flex">
        <div className="min-h-8 min-w-[12px] flex-1" aria-hidden />
        <HeaderTitle />
        <div className="min-h-8 min-w-[12px] flex-1" aria-hidden />
      </div>

      <div className="min-h-8 flex-1 md:hidden" aria-hidden />

      <div className="flex items-center gap-1.5">
        <VisitCounterBadge tone={tone} />
        <div className="hidden sm:block">
          <OnlineUsersButton tone={tone} />
        </div>
        <NeonThemeToggle variant="header" />
        <LocaleToggle />
        <ViewAsControl tone={tone} />
        <NotificationsBell tone={tone} />
        <AuthWidget />
      </div>
    </HeaderChrome>
  );
}
