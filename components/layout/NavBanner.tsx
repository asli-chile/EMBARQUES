"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";

export function NavBanner() {
  const pathname = usePathname();
  const { locale, setLocale, t } = useLocale();

  const handleLocaleToggle = () => {
    setLocale(locale === "es" ? "en" : "es");
  };

  return (
    <nav
      className="h-[30px] min-h-[30px] bg-neutral-600 flex-shrink-0 flex items-center justify-between px-4 shadow-md"
      role="navigation"
      aria-label="Navegación principal"
    >
      <div className="flex items-center gap-8">
      {siteConfig.navItems.map(({ labelKey, href }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`text-sm font-medium uppercase tracking-wide transition-colors ${
              isActive
                ? "text-white border-b-2 border-white pb-0.5"
                : "text-neutral-300 hover:text-white"
            }`}
          >
            {t.nav[labelKey]}
          </Link>
        );
      })}
      </div>
      <button
        type="button"
        onClick={handleLocaleToggle}
        className="text-sm font-medium text-neutral-300 hover:text-white px-2 py-0.5 rounded transition-colors"
        aria-label="Cambiar idioma"
        title={locale === "es" ? "Cambiar a inglés" : "Switch to Spanish"}
      >
        {locale.toUpperCase()}
      </button>
    </nav>
  );
}
