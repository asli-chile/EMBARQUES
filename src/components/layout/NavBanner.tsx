import { useLocale } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";

type NavBannerProps = {
  pathname: string;
};

export function NavBanner({ pathname }: NavBannerProps) {
  const { locale, setLocale, t } = useLocale();

  const handleLocaleToggle = () => {
    setLocale(locale === "es" ? "en" : "es");
  };

  return (
    <nav
      className="h-[40px] min-h-[40px] bg-neutral-600 flex-shrink-0 flex items-center justify-between px-4 shadow-md"
      role="navigation"
      aria-label="Navegación principal"
    >
      <div className="flex items-center gap-8">
        {siteConfig.navItems.map(({ labelKey, href }) => {
          const isActive = pathname === href;
          return (
            <a
              key={href}
              href={href}
              className={`text-sm font-medium uppercase tracking-wide transition-colors ${
                isActive
                  ? "text-white border-b-2 border-white pb-0.5"
                  : "text-neutral-300 hover:text-white"
              }`}
            >
              {t.nav[labelKey]}
            </a>
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
