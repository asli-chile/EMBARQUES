import { siteConfig } from "@/lib/site";
import { withBase } from "@/lib/basePath";
import { AuthWidget } from "@/components/ui/AuthWidget";
import { OnlineUsersButton } from "@/components/ui/OnlineUsersButton";
import { VisitCounterBadge } from "@/components/ui/VisitCounterBadge";
import { NotificationsBell } from "@/components/ui/NotificationsBell";
import { HeaderTitle } from "./HeaderTitle";

type HeaderProps = {
  /** Con rail lateral: sin logo (ya está en el rail). */
  compact?: boolean;
};

export function Header({ compact = false }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-50 h-12 min-h-12 md:h-[60px] md:min-h-[60px] bg-white flex items-center px-3 md:px-4 flex-shrink-0 gap-1.5 md:gap-3 pt-[env(safe-area-inset-top)]"
      role="banner"
    >
      {!compact ? (
        <a
          href={withBase("/inicio")}
          className="h-8 md:h-[50px] w-auto flex items-center flex-shrink-0"
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
      ) : null}

      <div className={`hidden md:flex flex-1 items-center ${compact ? "" : ""}`}>
        <HeaderTitle />
      </div>

      <div className="flex-1 md:hidden" />

      {/* Siempre montado: cuenta visitas de todos; la UI se oculta en <sm */}
      <VisitCounterBadge />
      <div className="hidden sm:block">
        <OnlineUsersButton />
      </div>
      <NotificationsBell />
      <AuthWidget />
    </header>
  );
}
