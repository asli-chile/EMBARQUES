import { siteConfig } from "@/lib/site";
import { withBase } from "@/lib/basePath";
import { AuthWidget } from "@/components/ui/AuthWidget";
import { OnlineUsersButton } from "@/components/ui/OnlineUsersButton";
import { VisitCounterBadge } from "@/components/ui/VisitCounterBadge";
import { NotificationsBell } from "@/components/ui/NotificationsBell";
import { HeaderTitle } from "./HeaderTitle";
import { LocaleToggle } from "./LocaleToggle";

type HeaderProps = {
  /** Con rail lateral: barra fina, sin logo ni título grande. */
  compact?: boolean;
};

export function Header({ compact = false }: HeaderProps) {
  if (compact) {
    return (
      <header
        className="sticky top-0 z-50 grid h-10 min-h-10 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-[#e8eef5] bg-white/90 px-2.5 backdrop-blur-sm pt-[env(safe-area-inset-top)]"
        role="banner"
      >
        <div className="flex items-center gap-1 justify-self-start opacity-70">
          <div className="hidden sm:flex sm:items-center sm:gap-1">
            <VisitCounterBadge />
            <OnlineUsersButton />
          </div>
          <div className="sm:hidden">
            <VisitCounterBadge />
          </div>
        </div>

        <a
          href={withBase("/dashboard")}
          className="flex h-7 items-center justify-self-center"
          aria-label="ASLI ERP"
          title="Inicio"
        >
          <img
            src={siteConfig.logo}
            alt={siteConfig.companyTitle}
            className="h-full w-auto max-w-[120px] object-contain"
            loading="eager"
            decoding="async"
          />
        </a>

        <div className="flex items-center justify-end gap-1.5 justify-self-end">
          <LocaleToggle />
          <NotificationsBell />
          <AuthWidget />
        </div>
      </header>
    );
  }

  return (
    <header
      className="sticky top-0 z-50 flex h-12 min-h-12 shrink-0 items-center gap-1.5 bg-white px-3 pt-[env(safe-area-inset-top)] md:h-[60px] md:min-h-[60px] md:gap-3 md:px-4"
      role="banner"
    >
      <a
        href={withBase("/inicio")}
        className="flex h-8 w-auto flex-shrink-0 items-center md:h-[50px]"
        aria-label="Ir al inicio del ERP"
      >
        <img
          src={siteConfig.logo}
          alt={siteConfig.companyTitle}
          width={160}
          height={44}
          className="h-full w-auto object-contain object-left"
          loading="eager"
          decoding="async"
        />
      </a>

      <div className="hidden flex-1 items-center md:flex">
        <HeaderTitle />
      </div>

      <div className="flex-1 md:hidden" />

      <VisitCounterBadge />
      <div className="hidden sm:block">
        <OnlineUsersButton />
      </div>
      <LocaleToggle />
      <NotificationsBell />
      <AuthWidget />
    </header>
  );
}
