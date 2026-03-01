import { siteConfig } from "@/lib/site";
import { AuthWidget } from "@/components/ui/AuthWidget";
import { HeaderTitle } from "./HeaderTitle";

export function Header() {
  return (
    <header
      className="sticky top-0 z-50 h-[50px] min-h-[50px] bg-white flex items-center px-4 flex-shrink-0"
      role="banner"
    >
      {/* Mobile: logo centrado */}
      <div className="md:hidden flex-1 flex items-center justify-center">
        <a href="/inicio" className="h-10 w-auto flex items-center">
          <img
            src={siteConfig.logo}
            alt={siteConfig.companyTitle}
            width={120}
            height={32}
            className="h-full w-auto object-contain"
            loading="eager"
            decoding="async"
          />
        </a>
      </div>

      {/* Desktop: layout completo */}
      <div className="hidden md:flex items-center gap-3 flex-1">
        <a href="/inicio" className="h-12 w-auto flex items-center flex-shrink-0">
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
        <HeaderTitle />
      </div>
      <div className="hidden md:block">
        <AuthWidget />
      </div>
    </header>
  );
}
