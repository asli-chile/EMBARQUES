import { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";
import { useAuth, getRolLabel } from "@/lib/auth/AuthContext";

type NavBannerProps = {
  pathname: string;
};

export function NavBanner({ pathname }: NavBannerProps) {
  const { locale, setLocale, t } = useLocale();
  const { user, profile, isExternalUser, empresaNombres } = useAuth();
  const displayName = profile?.nombre || user?.name || user?.email || null;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
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
    <>
    <nav
      className="h-[44px] min-h-[44px] bg-neutral-700/95 backdrop-blur-md flex-shrink-0 flex items-center justify-between px-4 md:px-6 border-b border-white/10 relative z-40"
      role="navigation"
      aria-label="Navegación principal"
      ref={menuRef}
    >
      {/* Desktop: menú horizontal con pills */}
      <div className="hidden md:flex items-center gap-1">
        {siteConfig.navItems.map(({ labelKey, href }) => {
          const isActive = pathname === href;
          return (
            <a
              key={href}
              href={href}
              className={`px-3 py-1.5 text-sm font-medium uppercase tracking-wide rounded-lg transition-all duration-200 ${
                isActive
                  ? "text-white bg-white/15 border border-white/20 shadow-sm"
                  : "text-neutral-300 hover:text-white hover:bg-white/10 border border-transparent"
              }`}
            >
              {t.nav[labelKey]}
            </a>
          );
        })}
      </div>

      {/* Desktop: nombre de usuario + idioma */}
      <div className="hidden md:flex items-center gap-2">
        {!isExternalUser && user && displayName && (
          <button
            type="button"
            onClick={() => setShowUserModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/15 hover:border-white/25 transition-all duration-200 cursor-pointer"
            aria-label="Ver detalles de mi cuenta"
          >
            <span className="w-5 h-5 rounded-full bg-brand-blue flex items-center justify-center text-white text-[10px] font-black uppercase shrink-0">
              {displayName[0]}
            </span>
            <span className="text-xs font-semibold text-white/90 max-w-[140px] truncate">
              {displayName}
            </span>
            <Icon icon="lucide:chevron-down" width={11} height={11} className="text-white/50 shrink-0" />
          </button>
        )}
        <button
          type="button"
          onClick={handleLocaleToggle}
          className="flex items-center gap-2 text-sm font-medium text-neutral-300 hover:text-white px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-200"
          aria-label="Cambiar idioma"
          title={locale === "es" ? "Cambiar a inglés" : "Switch to Spanish"}
        >
          <Icon icon="lucide:globe" width={14} height={14} className="opacity-80" />
          <span className="text-xs font-semibold tracking-wider">{locale.toUpperCase()}</span>
        </button>
      </div>

      {/* Mobile: botón hamburguesa */}
      <button
        type="button"
        onClick={handleToggleMenu}
        className="md:hidden flex items-center justify-center w-9 h-9 text-white hover:bg-white/10 rounded-lg transition-all duration-200"
        aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={isMenuOpen}
      >
        <Icon icon={isMenuOpen ? "lucide:x" : "lucide:menu"} width={22} height={22} />
      </button>

      {/* Mobile: indicador de página actual */}
      <div className="md:hidden flex-1 text-center">
        <span className="text-sm font-semibold text-white uppercase tracking-wide">
          {siteConfig.navItems.find((item) => item.href === pathname)?.labelKey
            ? t.nav[siteConfig.navItems.find((item) => item.href === pathname)!.labelKey]
            : "Menú"}
        </span>
      </div>

      {/* Mobile: selector de idioma (pill compacto) */}
      <button
        type="button"
        onClick={handleLocaleToggle}
        className="md:hidden flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 border border-white/10 text-xs font-bold tracking-wider transition-all duration-200"
        aria-label="Cambiar idioma"
      >
        {locale.toUpperCase()}
      </button>

      {/* Mobile: menú desplegable (estilo card) */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-2 right-2 mt-1 bg-neutral-800/95 backdrop-blur-xl rounded-xl shadow-xl shadow-black/40 border border-white/10 overflow-hidden z-50">
          <div className="py-2">
            {!isExternalUser && user && displayName && (
              <button
                type="button"
                onClick={() => { setShowUserModal(true); handleCloseMenu(); }}
                className="flex items-center gap-3 px-4 py-3 mx-2 mb-1 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 w-[calc(100%-1rem)] text-left"
              >
                <span className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-white text-sm font-black uppercase shrink-0">
                  {displayName[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                  <p className="text-[11px] text-neutral-400 truncate">{user.email}</p>
                </div>
                <Icon icon="lucide:info" width={14} height={14} className="text-white/40 shrink-0" />
              </button>
            )}
            {siteConfig.navItems.map(({ labelKey, href }) => {
              const isActive = pathname === href;
              return (
                <a
                  key={href}
                  href={href}
                  onClick={handleCloseMenu}
                  className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium uppercase tracking-wide transition-all duration-200 ${
                    isActive
                      ? "text-white bg-brand-olive/20 border border-brand-olive/40"
                      : "text-neutral-300 hover:text-white hover:bg-white/10 border border-transparent"
                  }`}
                >
                  {isActive ? (
                    <Icon icon="lucide:check" width={16} height={16} className="text-brand-olive shrink-0" />
                  ) : (
                    <span className="w-4 shrink-0" />
                  )}
                  {t.nav[labelKey]}
                </a>
              );
            })}

            <div className="my-2 mx-4 border-t border-white/10" />

            <button
              type="button"
              onClick={() => {
                handleLocaleToggle();
                handleCloseMenu();
              }}
              className="flex items-center gap-3 w-[calc(100%-1rem)] mx-2 px-4 py-3 rounded-lg text-sm font-medium text-neutral-300 hover:text-white hover:bg-white/10 border border-transparent transition-all duration-200"
            >
              <Icon icon="lucide:globe" width={16} height={16} className="shrink-0 opacity-80" />
              <span className="text-left">{locale === "es" ? "Cambiar a Inglés" : "Switch to Spanish"}</span>
              <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10">
                {locale === "es" ? "EN" : "ES"}
              </span>
            </button>
          </div>
        </div>
      )}
    </nav>

    {showUserModal && profile && (
      <div
        className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-profile-modal-title"
        onClick={() => setShowUserModal(false)}
      >
        <div
          className="bg-white rounded-t-2xl sm:rounded-2xl shadow-mac-modal w-full sm:max-w-sm max-h-[92dvh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal flex-shrink-0" />
          <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-neutral-200" />
          </div>
          {/* Header */}
          <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-b border-neutral-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-blue flex items-center justify-center text-white text-sm font-black uppercase flex-shrink-0">
                {displayName![0]}
              </div>
              <div>
                <h2 id="user-profile-modal-title" className="text-sm font-bold text-neutral-900">
                  {displayName}
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">{user!.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowUserModal(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors flex-shrink-0"
              aria-label="Cerrar"
            >
              <Icon icon="lucide:x" width={16} height={16} />
            </button>
          </div>
          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3">
            {/* Rol */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                <Icon icon="lucide:shield" width={15} height={15} className="text-brand-blue" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide mb-0.5">Rol</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-blue/10 text-brand-blue">
                  {getRolLabel(profile.rol as "superadmin" | "admin" | "ejecutivo" | "operador" | "cliente" | "usuario")}
                </span>
              </div>
            </div>
            {/* Estado */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${profile.activo ? "bg-green-100" : "bg-red-100"}`}>
                <Icon
                  icon={profile.activo ? "lucide:check-circle" : "lucide:circle-off"}
                  width={15}
                  height={15}
                  className={profile.activo ? "text-green-600" : "text-red-500"}
                />
              </div>
              <div>
                <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide mb-0.5">Estado</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${profile.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  <Icon icon={profile.activo ? "lucide:check" : "lucide:x"} width={10} height={10} />
                  {profile.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
            {/* Empresas */}
            {empresaNombres.length > 0 && (
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                    <Icon icon="lucide:building-2" width={15} height={15} className="text-brand-blue" />
                  </div>
                  <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide">
                    Empresas asignadas
                    <span className="ml-1 text-neutral-300">({empresaNombres.length})</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-10">
                  {empresaNombres.map((n) => (
                    <span key={n} className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Footer */}
          <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setShowUserModal(false)}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-300"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
