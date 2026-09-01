import { useState, useEffect, useRef, useMemo } from "react";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";
import { useAuth, getRolLabel } from "@/lib/auth/AuthContext";
import { withBase } from "@/lib/basePath";
import { getVisibleSidebarItems, resolveSidebarLabel, sidebarAccessFromAuth } from "@/lib/sidebarFilter";
import { AuthModal, type AuthUser } from "@/components/ui/AuthModal";
import { prefetchRoute } from "@/lib/routePrefetch";
import { useTemporadaActiva } from "@/lib/useTemporadaActiva";
import { staggerStyle } from "@/lib/ui/motion";

function navPrefetchHandlers(href: string) {
  return {
    onPointerEnter: () => prefetchRoute(href),
    onFocus: () => prefetchRoute(href),
  };
}

// Ítems fijos que siempre se muestran en la barra cuando está logueado (Inicio → panel del sistema / dashboard)
const PINNED_NAV = [
  { labelKey: "inicio" as const, href: "/dashboard" },
  { labelKey: "tracking" as const, href: "/tracking" },
];

// Ítems del menú público para el drawer
const PUBLIC_NAV_CARDS = [
  { labelKey: "inicio"        as const, href: "/inicio" },
  { labelKey: "servicios"     as const, href: "/servicios" },
  { labelKey: "sobreNosotros" as const, href: "/sobre-nosotros" },
  { labelKey: "tracking"      as const, href: "/tracking" },
];

type SidebarItem = (typeof siteConfig.sidebarItems)[number] & {
  superadminOnly?: boolean;
  ejecutivoAndAbove?: boolean;
  allowedEmails?: readonly string[];
};

type NavBannerProps = { pathname: string };

export function NavBanner({ pathname }: NavBannerProps) {
  const { locale, setLocale, t } = useLocale();
  const { user, profile, isExternalUser, isSuperadmin, isAdmin, isEjecutivo, isCliente, isStaff, isLoading: authLoading } = useAuth();
  const isLoggedIn = !!user;
  const { temporadaActiva } = useTemporadaActiva({ enabled: !authLoading && isLoggedIn });
  const displayName = profile?.nombre || user?.name || user?.email || null;

  const authUser: AuthUser | null = user
    ? {
        name: displayName ?? user.email,
        email: user.email,
        level: profile ? getRolLabel(profile.rol) : "Usuario",
      }
    : null;

  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [showUserModal, setShowUserModal]   = useState(false);
  // Sección expandida en el drawer (grupos de primer nivel)
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const drawerRef = useRef<HTMLDivElement>(null);

  const sidebarLabels = t.sidebar as Record<string, string>;
  const labelFor = (labelKey: string) => resolveSidebarLabel(labelKey, sidebarLabels, isCliente);

  const visibleSidebarItems = useMemo(
    () =>
      getVisibleSidebarItems(
        sidebarAccessFromAuth({
          isSuperadmin,
          isAdmin,
          isEjecutivo,
          isStaff,
          isCliente,
          user,
          profile,
        }),
      ) as SidebarItem[],
    [isSuperadmin, isAdmin, isEjecutivo, isStaff, isCliente, user, profile]
  );

  // Auto-expandir sección activa al abrir drawer
  useEffect(() => {
    if (!drawerOpen) return;
    for (const item of visibleSidebarItems) {
      if ("children" in item && item.children) {
        if (item.children.some((c) => c.href === pathname)) {
          setExpandedId(item.id);
          return;
        }
      }
    }
  }, [drawerOpen, pathname, visibleSidebarItems]);

  // Overlay + Escape + botón X cierran el drawer (sin listener de click fuera:
  // el hamburguesa está fuera del drawer y chocaría con el toggle)
  useEffect(() => {
    if (!drawerOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [drawerOpen]);

  // Escape cierra el drawer
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const handleLocaleToggle = () => setLocale(locale === "es" ? "en" : "es");

  // ── Drawer público (invitados) ───────────────────────────────────────────
  const publicDrawerContent = (
    <nav className="flex flex-col">
      {PUBLIC_NAV_CARDS.map(({ labelKey, href }) => {
        const isActive = pathname === href;
        return (
          <a
            key={href}
            href={withBase(href)}
            onClick={() => setDrawerOpen(false)}
            {...navPrefetchHandlers(href)}
            className={`relative flex items-center w-full text-left pl-4 pr-3 py-3 text-base transition-colors duration-200 ${
              isActive
                ? "text-white font-semibold bg-white/10"
                : "text-neutral-300 hover:text-white hover:bg-white/5"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {isActive && (
              <span className="absolute left-0 inset-y-0 w-[3px] bg-brand-olive" aria-hidden />
            )}
            <span className="truncate">{t.nav[labelKey]}</span>
          </a>
        );
      })}
    </nav>
  );

  // ── Drawer con sidebarItems (lista minimalista) ──────────────────────────
  const sidebarDrawerContent = (
    <nav className="flex flex-col">
      {visibleSidebarItems.map((item) => {
        const hasChildren  = "children" in item && !!item.children?.length;
        const hasHref      = "href" in item && item.href;
        const isExpanded   = expandedId === item.id;
        const isActive     = hasHref && pathname === item.href;
        const isParentActive = hasChildren && item.children!.some((c) => c.href === pathname);

        const rowBase = "relative flex items-center w-full text-left pl-4 pr-3 py-3 text-base transition-colors duration-200";
        const rowActive = `${rowBase} text-white font-semibold bg-white/10`;
        const rowParentOpen = `${rowBase} text-white font-semibold`;
        const rowNormal = `${rowBase} text-neutral-300 hover:text-white hover:bg-white/5`;
        const activeBar = (
          <span className="absolute left-0 inset-y-0 w-[3px] bg-brand-olive" aria-hidden />
        );

        return (
          <div key={item.id} className="flex flex-col">
            {hasHref ? (
              <a href={withBase(item.href!)} onClick={() => setDrawerOpen(false)}
                {...navPrefetchHandlers(item.href!)}
                className={isActive ? rowActive : rowNormal}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && activeBar}
                <span className="truncate">{labelFor(item.labelKey)}</span>
              </a>
            ) : (
              <button type="button"
                onClick={() => setExpandedId((p) => p === item.id ? null : item.id)}
                className={isParentActive ? rowParentOpen : rowNormal}
                aria-expanded={isExpanded}
              >
                {isParentActive && activeBar}
                <span className="truncate">{labelFor(item.labelKey)}</span>
                <Icon icon={isExpanded ? "lucide:chevron-up" : "lucide:chevron-down"}
                  width={16} height={16} className="ml-auto shrink-0 text-white/40" />
              </button>
            )}

            {/* Hijos expandidos */}
            {hasChildren && isExpanded && (
              <div className="flex flex-col pb-1">
                {item.children!.map((child, childIndex) => {
                  const isChildActive = pathname === child.href;
                  return (
                    <a key={child.id} href={child.href ? withBase(child.href) : "#"} onClick={() => setDrawerOpen(false)}
                      {...(child.href ? navPrefetchHandlers(child.href) : {})}
                      style={staggerStyle(childIndex)}
                      className={`motion-enter motion-stagger motion-stagger-tight relative flex items-center pl-8 pr-3 py-2.5 text-[15px] transition-colors duration-fast ease-standard ${
                        isChildActive
                          ? "text-white font-semibold bg-white/10"
                          : "text-neutral-400 hover:text-white hover:bg-white/5"
                      }`}
                      aria-current={isChildActive ? "page" : undefined}
                    >
                      {isChildActive && (
                        <span className="absolute left-0 inset-y-0 w-[3px] bg-brand-olive" aria-hidden />
                      )}
                      <span className="truncate">{labelFor(child.labelKey)}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
    {/* ── Barra de navegación ──────────────────────────────────────────────── */}
    <nav
      className="h-12 min-h-12 md:h-[56px] md:min-h-[56px] bg-neutral-700/95 backdrop-blur-md flex-shrink-0 flex items-center justify-between px-3 md:px-6 border-b border-white/10 relative z-40"
      role="navigation"
      aria-label="Navegación principal"
    >
      {isLoggedIn ? (
        /* ── LOGUEADO: ítems fijos + hamburguesa ── */
        <>
          <div className="flex items-center gap-1 min-w-0">
            {/* Hamburguesa */}
            <button
              type="button"
              onClick={() => setDrawerOpen((p) => !p)}
              className={`motion-interactive flex items-center justify-center w-11 h-11 rounded-lg border ${
                drawerOpen
                  ? "text-white bg-white/15 border-white/25"
                  : "text-neutral-300 hover:text-white hover:bg-white/10 border-transparent"
              }`}
              aria-label={drawerOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={drawerOpen}
            >
              <Icon icon={drawerOpen ? "lucide:x" : "lucide:menu"} width={22} height={22} />
            </button>

            {/* Ítems fijos */}
            {PINNED_NAV.map(({ labelKey, href }) => {
              const isActive = pathname === href;
              return (
                <a key={href} href={withBase(href)}
                  {...navPrefetchHandlers(href)}
                  className={`motion-interactive px-3 py-2 text-sm md:text-lg font-semibold uppercase tracking-wide rounded-lg ${
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

          {/* Derecha: usuario — oculto en móvil (está en el drawer) */}
          <div className="hidden sm:flex items-center gap-2">
            {temporadaActiva && (
              <a
                href={withBase("/registros")}
                {...navPrefetchHandlers("/registros")}
                className="motion-interactive flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/15 hover:border-white/25"
                title={`Los módulos muestran solo la temporada ${temporadaActiva}. En Registros puedes ver el histórico completo.`}
              >
                <Icon icon="lucide:calendar-range" width={14} height={14} className="text-white/60 shrink-0" />
                <span className="text-sm font-semibold text-white/90 max-w-[160px] truncate">{temporadaActiva}</span>
              </a>
            )}
            {!isExternalUser && displayName && (
              <button type="button" onClick={() => setShowUserModal(true)}
                className="motion-interactive flex items-center gap-2.5 px-3.5 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/15 hover:border-white/25"
              >
                <span className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-white text-base font-black uppercase shrink-0">
                  {displayName[0]}
                </span>
                <span className="hidden sm:block text-lg font-semibold text-white max-w-[200px] truncate">
                  {displayName}
                </span>
                <Icon icon="lucide:chevron-down" width={16} height={16} className="text-white/60 shrink-0" />
              </button>
            )}
          </div>
        </>
      ) : (
        /* ── NO LOGUEADO: horizontal en desktop, hamburguesa en mobile ── */
        <>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setDrawerOpen((p) => !p)}
              className={`motion-interactive flex items-center justify-center w-11 h-11 rounded-lg border ${
                drawerOpen ? "text-white bg-white/15 border-white/25" : "text-neutral-300 hover:text-white hover:bg-white/10 border-transparent"
              }`}
              aria-label={drawerOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={drawerOpen}
            >
              <Icon icon={drawerOpen ? "lucide:x" : "lucide:menu"} width={22} height={22} />
            </button>

            <div className="hidden md:flex items-center gap-1">
              {siteConfig.navItems.map(({ labelKey, href }) => {
                const isActive = pathname === href;
                return (
                  <a key={href} href={withBase(href)}
                    {...navPrefetchHandlers(href)}
                    className={`motion-interactive px-3.5 py-2 text-lg font-semibold uppercase tracking-wide rounded-lg ${
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
          </div>

          <div className="flex items-center gap-2" />
        </>
      )}
    </nav>

    {/* ── Drawer hamburguesa (logueado y no logueado) ─────────────────────── */}
    <>
      {/*
        Siempre montado: si se desmontara al cerrar, el velo se cortaría de golpe
        mientras el drawer todavía se está deslizando hacia afuera.
      */}
      <div
        className={`motion-backdrop fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40 ${
          drawerOpen ? "" : "pointer-events-none"
        }`}
        data-state={drawerOpen ? "open" : "closed"}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      <div
        ref={drawerRef}
        className={`fixed inset-y-0 left-0 z-50 w-[min(100vw,17.5rem)] bg-brand-blue border-r border-white/10 shadow-xl shadow-black/30 flex flex-col transition-transform pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] ${
          drawerOpen
            ? "translate-x-0 duration-slow ease-enter"
            : "-translate-x-full duration-fast ease-exit"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
      >
        {/* Cabecera del drawer */}
        <div className="flex items-center justify-between pl-4 pr-2 pt-3 pb-2 flex-shrink-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">
            {isLoggedIn ? "Menú" : "Navegación"}
          </p>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-white/60 hover:text-white transition-colors"
            aria-label="Cerrar menú"
          >
            <Icon icon="lucide:x" width={20} height={20} />
          </button>
        </div>

        {/* Header: info de usuario si está logueado */}
        {isLoggedIn && !isExternalUser && displayName && (
          <button type="button"
            onClick={() => { setShowUserModal(true); setDrawerOpen(false); }}
            className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors duration-200 text-left flex-shrink-0"
          >
            <span className="w-9 h-9 rounded-full border border-white/25 flex items-center justify-center text-white text-sm font-semibold uppercase shrink-0">
              {displayName[0]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <p className="text-xs text-white/45 truncate mt-0.5">{user!.email}</p>
            </div>
          </button>
        )}

        {isLoggedIn && <div className="mx-4 my-1 border-t border-white/10 flex-shrink-0" />}

        {/* Items de navegación */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide py-2">
          {isLoggedIn ? sidebarDrawerContent : publicDrawerContent}
        </div>

        {/* Footer: idioma */}
        <div className="flex-shrink-0 border-t border-white/10 px-4 py-3">
          <button type="button" onClick={handleLocaleToggle}
            className="flex items-center w-full text-sm text-white/60 hover:text-white transition-colors duration-200"
          >
            <span>{locale === "es" ? "Cambiar a Inglés" : "Switch to Spanish"}</span>
            <span className="ml-auto text-xs tracking-wider text-white/40">
              {locale === "es" ? "EN" : "ES"}
            </span>
          </button>
        </div>
      </div>
    </>

    {/* ── Modal de usuario (mismo AuthModal que el icono del header) ─────── */}
    {authUser && (
      <AuthModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        user={authUser}
      />
    )}
    </>
  );
}
