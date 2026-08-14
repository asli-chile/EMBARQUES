import { useState, useEffect, useRef, useMemo } from "react";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";
import { useAuth, getRolLabel } from "@/lib/auth/AuthContext";
import { withBase } from "@/lib/basePath";
import { getVisibleSidebarItems, resolveSidebarLabel, sidebarAccessFromAuth } from "@/lib/sidebarFilter";
import { AuthModal, type AuthUser } from "@/components/ui/AuthModal";
import { prefetchRoute } from "@/lib/routePrefetch";

function navPrefetchHandlers(href: string) {
  return {
    onPointerEnter: () => prefetchRoute(href),
    onFocus: () => prefetchRoute(href),
  };
}

// Ítems fijos que siempre se muestran en la barra cuando está logueado (Inicio → panel del sistema / dashboard)
const PINNED_NAV = [
  { labelKey: "inicio" as const, href: "/dashboard" },
];

// Ítems del menú público con descripción e ícono para el drawer moderno
const PUBLIC_NAV_CARDS = [
  { labelKey: "inicio"       as const, href: "/inicio",         icon: "lucide:home",        desc: "Página principal y bienvenida" },
  { labelKey: "servicios"    as const, href: "/servicios",      icon: "lucide:briefcase",   desc: "Conoce nuestros servicios logísticos" },
  { labelKey: "sobreNosotros"as const, href: "/sobre-nosotros", icon: "lucide:users",        desc: "Quiénes somos y nuestra misión" },
];

type SidebarItem = (typeof siteConfig.sidebarItems)[number] & {
  superadminOnly?: boolean;
  ejecutivoAndAbove?: boolean;
  allowedEmails?: readonly string[];
};

// Metadatos visuales de cada módulo (ícono + descripción)
const SIDEBAR_META: Record<string, { icon: string; desc: string }> = {
  dashboard:             { icon: "lucide:layout-dashboard", desc: "Resumen y estadísticas generales" },
  registros:             { icon: "lucide:clipboard-list",   desc: "Operaciones y registros de carga" },
  reservas:              { icon: "lucide:package",           desc: "Gestión de reservas de exportación" },
  "crear-reserva":       { icon: "lucide:plus-circle",       desc: "Nueva solicitud de reserva" },
  "mis-reservas":        { icon: "lucide:list",              desc: "Ver y gestionar mis reservas" },
  papelera:              { icon: "lucide:trash-2",           desc: "Reservas eliminadas" },
  transportes:           { icon: "lucide:truck",             desc: "Módulo de transportes terrestres" },
  "reserva-asli":        { icon: "lucide:clipboard-check",   desc: "Asignar unidad y chofer ASLI" },
  "reserva-ext":         { icon: "lucide:external-link",     desc: "Reservas con transporte externo" },
  "papelera-transportes":{ icon: "lucide:trash-2",           desc: "Transportes eliminados" },
  documentos:            { icon: "lucide:file-text",         desc: "Documentos de exportación" },
  "mis-documentos":      { icon: "lucide:folder-open",       desc: "Ver documentos generados" },
  configuracion:         { icon: "lucide:settings",          desc: "Configuración del sistema" },
  usuarios:              { icon: "lucide:users",             desc: "Gestión de usuarios y roles" },
  clientes:              { icon: "lucide:building-2",        desc: "Empresas clientes" },
  "asignar-clientes-empresas": { icon: "lucide:link",        desc: "Asignar clientes a empresas" },
  "asignar-ejecutivos":        { icon: "lucide:user-cog",    desc: "Asignar ejecutivos a clientes" },
  "configuracion-transportes": { icon: "lucide:truck",       desc: "Empresas y tarifas de transporte" },
  consignatarios:        { icon: "lucide:contact",           desc: "Consignatarios y notify parties" },
  "formatos-documentos": { icon: "lucide:layout-template",  desc: "Plantillas de documentos" },
};

type NavBannerProps = { pathname: string };

export function NavBanner({ pathname }: NavBannerProps) {
  const { locale, setLocale, t } = useLocale();
  const { user, profile, isExternalUser, isSuperadmin, isAdmin, isEjecutivo, isCliente, isStaff } = useAuth();
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
  const isLoggedIn = !!user;

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
    <nav className="flex flex-col gap-2.5">
      {PUBLIC_NAV_CARDS.map(({ labelKey, href, icon, desc }) => {
        const isActive = pathname === href;
        return (
          <a
            key={href}
            href={withBase(href)}
            onClick={() => setDrawerOpen(false)}
            {...navPrefetchHandlers(href)}
            className={`flex items-center gap-3.5 w-full text-left px-3.5 py-3.5 rounded-xl border transition-all duration-200 ${
              isActive
                ? "bg-white/15 border-white/25 text-white"
                : "bg-white/5 border-white/10 text-neutral-200 hover:bg-white/10 hover:border-white/20 hover:text-white"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isActive ? "bg-brand-blue/30" : "bg-white/8"}`}>
              <Icon icon={icon} width={22} height={22} className={isActive ? "text-white" : "text-neutral-300"} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold leading-tight">{t.nav[labelKey]}</p>
              <p className="text-sm text-neutral-300/80 mt-1 leading-snug">{desc}</p>
            </div>
            {isActive && <Icon icon="lucide:check-circle" width={18} height={18} className="text-brand-olive ml-auto shrink-0" />}
          </a>
        );
      })}
    </nav>
  );

  // ── Drawer con sidebarItems (estilo cards modernas) ──────────────────────
  const sidebarDrawerContent = (
    <nav className="flex flex-col gap-2.5">
      {visibleSidebarItems.map((item) => {
        const hasChildren  = "children" in item && !!item.children?.length;
        const hasHref      = "href" in item && item.href;
        const isExpanded   = expandedId === item.id;
        const isActive     = hasHref && pathname === item.href;
        const isParentActive = hasChildren && item.children!.some((c) => c.href === pathname);
        const meta = SIDEBAR_META[item.id] ?? { icon: "lucide:circle", desc: "" };

        const cardBase = "flex items-center gap-3.5 w-full text-left px-3.5 py-3.5 rounded-xl border transition-all duration-200";
        const cardActive = `${cardBase} bg-white/15 border-white/25 text-white`;
        const cardNormal = `${cardBase} bg-white/5 border-white/10 text-neutral-200 hover:bg-white/10 hover:border-white/20 hover:text-white`;

        const cardContent = (active: boolean) => (
          <>
            <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-brand-blue/30" : "bg-white/8"}`}>
              <Icon icon={meta.icon} width={22} height={22} className={active ? "text-white" : "text-neutral-300"} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold leading-tight">{labelFor(item.labelKey)}</p>
              {meta.desc && <p className="text-sm text-neutral-300/80 mt-1 leading-snug">{meta.desc}</p>}
            </div>
          </>
        );

        return (
          <div key={item.id} className="flex flex-col gap-1.5">
            {hasHref ? (
              <a href={withBase(item.href!)} onClick={() => setDrawerOpen(false)}
                {...navPrefetchHandlers(item.href!)}
                className={isActive ? cardActive : cardNormal}
                aria-current={isActive ? "page" : undefined}
              >
                {cardContent(!!isActive)}
                {isActive && <Icon icon="lucide:check-circle" width={18} height={18} className="text-brand-olive ml-auto shrink-0" />}
              </a>
            ) : (
              <button type="button"
                onClick={() => setExpandedId((p) => p === item.id ? null : item.id)}
                className={isParentActive ? cardActive : cardNormal}
                aria-expanded={isExpanded}
              >
                {cardContent(!!isParentActive)}
                <Icon icon={isExpanded ? "lucide:chevron-up" : "lucide:chevron-down"}
                  width={18} height={18} className="ml-auto shrink-0 opacity-70" />
              </button>
            )}

            {/* Hijos expandidos */}
            {hasChildren && isExpanded && (
              <div className="flex flex-col gap-1.5 pl-3 ml-4 border-l-2 border-white/20">
                {item.children!.map((child) => {
                  const childMeta = SIDEBAR_META[child.id] ?? { icon: "lucide:minus", desc: "" };
                  const isChildActive = pathname === child.href;
                  return (
                    <a key={child.id} href={child.href ? withBase(child.href) : "#"} onClick={() => setDrawerOpen(false)}
                      {...(child.href ? navPrefetchHandlers(child.href) : {})}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all duration-200 ${
                        isChildActive
                          ? "bg-brand-olive/20 border-brand-olive/40 text-white"
                          : "bg-white/5 border-white/8 text-neutral-300 hover:bg-white/10 hover:text-white hover:border-white/15"
                      }`}
                      aria-current={isChildActive ? "page" : undefined}
                    >
                      <Icon icon={childMeta.icon} width={18} height={18} className="shrink-0 opacity-80" />
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold leading-tight">{labelFor(child.labelKey)}</p>
                        {childMeta.desc && <p className="text-sm text-neutral-400 mt-1 leading-snug">{childMeta.desc}</p>}
                      </div>
                      {isChildActive && <Icon icon="lucide:check" width={16} height={16} className="text-brand-olive ml-auto shrink-0" />}
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
              className={`flex items-center justify-center w-11 h-11 rounded-lg border transition-all duration-200 ${
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
                  className={`px-3 py-2 text-sm md:text-lg font-semibold uppercase tracking-wide rounded-lg transition-all duration-200 ${
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
            {!isExternalUser && displayName && (
              <button type="button" onClick={() => setShowUserModal(true)}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/15 hover:border-white/25 transition-all duration-200"
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
              className={`flex items-center justify-center w-11 h-11 rounded-lg border transition-all duration-200 ${
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
                    className={`px-3.5 py-2 text-lg font-semibold uppercase tracking-wide rounded-lg transition-all duration-200 ${
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
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        ref={drawerRef}
        className={`fixed inset-y-0 left-0 z-50 w-[min(100vw,20rem)] bg-brand-blue/95 backdrop-blur-md border-r border-white/10 shadow-2xl shadow-black/50 flex flex-col transition-transform duration-300 ease-out pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
      >
        {/* Cabecera del drawer */}
        <div className="flex items-center justify-between px-3 pt-3 pb-1 flex-shrink-0">
          <p className="text-sm font-semibold uppercase tracking-wider text-white/70 px-1">
            {isLoggedIn ? "Menú" : "Navegación"}
          </p>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="flex items-center justify-center w-11 h-11 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Cerrar menú"
          >
            <Icon icon="lucide:x" width={22} height={22} />
          </button>
        </div>

        {/* Header: info de usuario si está logueado */}
        {isLoggedIn && !isExternalUser && displayName && (
          <button type="button"
            onClick={() => { setShowUserModal(true); setDrawerOpen(false); }}
            className="flex items-center gap-3.5 mx-3 mt-1 mb-2 px-3.5 py-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 text-left flex-shrink-0"
          >
            <span className="w-11 h-11 rounded-full bg-brand-blue flex items-center justify-center text-white text-base font-black uppercase shrink-0">
              {displayName[0]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-white truncate">{displayName}</p>
              <p className="text-sm text-neutral-300/80 truncate mt-0.5">{user!.email}</p>
            </div>
            <Icon icon="lucide:info" width={18} height={18} className="text-white/50 shrink-0" />
          </button>
        )}

        {isLoggedIn && <div className="mx-3 mb-2 border-t border-white/10 flex-shrink-0" />}

        {/* Items de navegación */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-3 pt-2 pb-4">
          {isLoggedIn ? sidebarDrawerContent : publicDrawerContent}
        </div>

        {/* Footer: idioma */}
        <div className="flex-shrink-0 border-t border-white/10 px-3 py-3.5">
          <button type="button" onClick={handleLocaleToggle}
            className="flex items-center gap-3 w-full px-3.5 py-3 rounded-lg text-base text-neutral-200 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            <Icon icon="lucide:globe" width={20} height={20} className="shrink-0 opacity-80" />
            <span>{locale === "es" ? "Cambiar a Inglés" : "Switch to Spanish"}</span>
            <span className="ml-auto text-sm font-bold px-2.5 py-1 rounded-full bg-white/10 border border-white/10">
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
