import { siteConfig, marketingHomeUrl } from "@/lib/site";
import { AuthWidget } from "@/components/ui/AuthWidget";
import { OnlineUsersButton } from "@/components/ui/OnlineUsersButton";
import { VisitCounterBadge } from "@/components/ui/VisitCounterBadge";
import { HeaderTitle } from "./HeaderTitle";

export function Header() {
  return (
    <header
      className="sticky top-0 z-50 h-[50px] min-h-[50px] bg-white flex items-center px-4 flex-shrink-0 gap-2"
      role="banner"
    >
      {/* Logo — mobile: tamaño reducido, desktop: tamaño completo */}
      <a
        href={marketingHomeUrl}
        className="h-7 md:h-[46px] w-auto flex items-center flex-shrink-0"
        aria-label="Ir al inicio del sitio web"
      >
        <img
          src={siteConfig.logo}
          alt={siteConfig.companyTitle}
          width={150}
          height={40}
          className="h-full w-auto object-contain object-left"
          loading="eager"
          decoding="async"
        />
      </a>

      {/* Título — solo desktop */}
      <div className="hidden md:flex flex-1 items-center">
        <HeaderTitle />
      </div>

      {/* Spacer — empuja el auth widget a la derecha en mobile */}
      <div className="flex-1 md:hidden" />

      {/* Auth widget — visible en todas las pantallas */}
      <VisitCounterBadge />
      <OnlineUsersButton />
      <AuthWidget />
    </header>
  );
}
