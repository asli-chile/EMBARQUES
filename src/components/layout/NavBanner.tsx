import { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";

type NavBannerProps = {
  pathname: string;
};

export function NavBanner({ pathname }: NavBannerProps) {
  const { locale, setLocale, t } = useLocale();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLocaleToggle = () => {
    setLocale(locale === "es" ? "en" : "es");
  };

  const handleToggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const handleCloseMenu = () => {
    setIsMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <nav
      className="h-[40px] min-h-[40px] bg-neutral-600 flex-shrink-0 flex items-center justify-between px-4 shadow-md relative"
      role="navigation"
      aria-label="Navegación principal"
      ref={menuRef}
    >
      {/* Desktop: menú horizontal */}
      <div className="hidden md:flex items-center gap-8">
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

      {/* Desktop: selector de idioma */}
      <button
        type="button"
        onClick={handleLocaleToggle}
        className="hidden md:flex items-center gap-1.5 text-sm font-medium text-neutral-300 hover:text-white px-2 py-0.5 rounded transition-colors"
        aria-label="Cambiar idioma"
        title={locale === "es" ? "Cambiar a inglés" : "Switch to Spanish"}
      >
        <Icon icon="lucide:globe" width={16} height={16} />
        {locale.toUpperCase()}
      </button>

      {/* Mobile: botón hamburguesa */}
      <button
        type="button"
        onClick={handleToggleMenu}
        className="md:hidden flex items-center justify-center w-8 h-8 text-white hover:bg-white/10 rounded transition-colors"
        aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={isMenuOpen}
      >
        <Icon icon={isMenuOpen ? "lucide:x" : "lucide:menu"} width={22} height={22} />
      </button>

      {/* Mobile: indicador de página actual */}
      <div className="md:hidden flex-1 text-center">
        <span className="text-sm font-medium text-white uppercase tracking-wide">
          {siteConfig.navItems.find((item) => item.href === pathname)?.labelKey
            ? t.nav[siteConfig.navItems.find((item) => item.href === pathname)!.labelKey]
            : "Menú"}
        </span>
      </div>

      {/* Mobile: selector de idioma compacto */}
      <button
        type="button"
        onClick={handleLocaleToggle}
        className="md:hidden flex items-center justify-center w-8 h-8 text-neutral-300 hover:text-white hover:bg-white/10 rounded transition-colors"
        aria-label="Cambiar idioma"
      >
        <span className="text-xs font-bold">{locale.toUpperCase()}</span>
      </button>

      {/* Mobile: menú desplegable */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-neutral-700 shadow-lg z-50 border-t border-neutral-500">
          <div className="py-2">
            {siteConfig.navItems.map(({ labelKey, href }) => {
              const isActive = pathname === href;
              return (
                <a
                  key={href}
                  href={href}
                  onClick={handleCloseMenu}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium uppercase tracking-wide transition-colors ${
                    isActive
                      ? "text-white bg-neutral-600"
                      : "text-neutral-300 hover:text-white hover:bg-neutral-600"
                  }`}
                >
                  {isActive && (
                    <Icon icon="lucide:check" width={16} height={16} className="text-brand-teal" />
                  )}
                  {!isActive && <span className="w-4" />}
                  {t.nav[labelKey]}
                </a>
              );
            })}

            {/* Separador */}
            <div className="my-2 mx-4 border-t border-neutral-500" />

            {/* Selector de idioma en el menú móvil */}
            <button
              type="button"
              onClick={() => {
                handleLocaleToggle();
                handleCloseMenu();
              }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-600 transition-colors"
            >
              <Icon icon="lucide:globe" width={16} height={16} />
              <span>{locale === "es" ? "Cambiar a Inglés" : "Switch to Spanish"}</span>
              <span className="ml-auto text-xs font-bold bg-neutral-500 px-2 py-0.5 rounded">
                {locale === "es" ? "EN" : "ES"}
              </span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
