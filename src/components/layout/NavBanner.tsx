import { useState, useEffect, useRef, useMemo } from "react";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";
import { useAuth, getRolLabel } from "@/lib/auth/AuthContext";

// Ítems fijos que siempre se muestran en la barra cuando está logueado
const PINNED_NAV = [
  { labelKey: "inicio"     as const, href: "/inicio" },
  { labelKey: "itinerario" as const, href: "/itinerario" },
  { labelKey: "stacking"   as const, href: "/stacking" },
];

// Ítems del menú público con descripción e ícono para el drawer moderno
const PUBLIC_NAV_CARDS = [
  { labelKey: "inicio"       as const, href: "/inicio",         icon: "lucide:home",        desc: "Página principal y bienvenida" },
  { labelKey: "servicios"    as const, href: "/servicios",      icon: "lucide:briefcase",   desc: "Conoce nuestros servicios logísticos" },
  { labelKey: "sobreNosotros"as const, href: "/sobre-nosotros", icon: "lucide:users",        desc: "Quiénes somos y nuestra misión" },
  { labelKey: "tracking"     as const, href: "/tracking",       icon: "lucide:map-pin",     desc: "Seguimiento de tus embarques" },
  { labelKey: "itinerario"   as const, href: "/itinerario",     icon: "lucide:ship",         desc: "Itinerarios de navieras disponibles" },
  { labelKey: "stacking"     as const, href: "/stacking",       icon: "lucide:layers",      desc: "Fechas de stacking por servicio" },
];

type SidebarItem = (typeof siteConfig.sidebarItems)[number] & { superadminOnly?: boolean };

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
  facturacion:           { icon: "lucide:receipt",           desc: "Proformas y facturación de tramos" },
  "facturas-transporte": { icon: "lucide:file-text",         desc: "Registro de facturas emitidas" },
  "papelera-transportes":{ icon: "lucide:trash-2",           desc: "Transportes eliminados" },
  documentos:            { icon: "lucide:file-text",         desc: "Documentos de exportación" },
  "mis-documentos":      { icon: "lucide:folder-open",       desc: "Ver documentos generados" },
  "crear-instructivo":   { icon: "lucide:file-plus",         desc: "Crear instructivo de embarque" },
  "crear-proforma":      { icon: "lucide:file-plus",         desc: "Crear proforma de costos" },
  reportes:              { icon: "lucide:bar-chart-2",       desc: "Reportes e indicadores" },
  finanzas:              { icon: "lucide:dollar-sign",       desc: "Gestión financiera y pagos" },
  itinerarios:           { icon: "lucide:ship",              desc: "Itinerarios navieros" },
  "servicios-por-naviera":{ icon: "lucide:anchor",           desc: "Servicios por naviera" },
  consorcios:            { icon: "lucide:network",           desc: "Gestión de consorcios" },
  configuracion:         { icon: "lucide:settings",          desc: "Configuración del sistema" },
  usuarios:              { icon: "lucide:users",             desc: "Gestión de usuarios y roles" },
  clientes:              { icon: "lucide:building-2",        desc: "Empresas clientes" },
  "asignar-clientes-empresas": { icon: "lucide:link",        desc: "Asignar clientes a empresas" },
  "configuracion-transportes": { icon: "lucide:truck",       desc: "Empresas y tarifas de transporte" },
  consignatarios:        { icon: "lucide:contact",           desc: "Consignatarios y notify parties" },
  "formatos-documentos": { icon: "lucide:layout-template",  desc: "Plantillas de documentos" },
};

type NavBannerProps = { pathname: string };

export function NavBanner({ pathname }: NavBannerProps) {
  const { locale, setLocale, t } = useLocale();
  const { user, profile, isExternalUser, empresaNombres, isSuperadmin } = useAuth();
  const displayName = profile?.nombre || user?.name || user?.email || null;

  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [showUserModal, setShowUserModal]   = useState(false);
  // Sección expandida en el drawer (grupos de primer nivel)
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Sub-grupo expandido dentro de un grupo (ej: itinerarios dentro de configuracion)
  const [expandedChildId, setExpandedChildId] = useState<string | null>(null);

  const drawerRef = useRef<HTMLDivElement>(null);
  const isLoggedIn = !!user;

  // Filtrar sidebarItems según rol
  const visibleSidebarItems = useMemo(() =>
    (siteConfig.sidebarItems as SidebarItem[]).filter(
      (item) => !(("superadminOnly" in item && item.superadminOnly) || false) || isSuperadmin
    ), [isSuperadmin]);

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

  // Cerrar drawer al hacer clic fuera
  useEffect(() => {
    if (!drawerOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setDrawerOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [drawerOpen]);


  const handleLocaleToggle = () => setLocale(locale === "es" ? "en" : "es");

  // ── Drawer con sidebarItems (estilo cards modernas) ──────────────────────
  const sidebarDrawerContent = (
    <nav className="flex flex-col gap-2">
      {visibleSidebarItems.map((item) => {
        const hasChildren  = "children" in item && !!item.children?.length;
        const hasHref      = "href" in item && item.href;
        const isExpanded   = expandedId === item.id;
        const isActive     = hasHref && pathname === item.href;
        const isParentActive = hasChildren && item.children!.some((c) => c.href === pathname);
        const meta = SIDEBAR_META[item.id] ?? { icon: "lucide:circle", desc: "" };

        const cardBase = "flex items-center gap-3 w-full text-left px-3 py-3 rounded-xl border transition-all duration-200";
        const cardActive = `${cardBase} bg-white/15 border-white/25 text-white`;
        const cardNormal = `${cardBase} bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:border-white/20 hover:text-white`;

        const cardContent = (active: boolean) => (
          <>
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-brand-blue/30" : "bg-white/8"}`}>
              <Icon icon={meta.icon} width={17} height={17} className={active ? "text-white" : "text-neutral-400"} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">{t.sidebar[item.labelKey]}</p>
              {meta.desc && <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">{meta.desc}</p>}
            </div>
          </>
        );

        return (
          <div key={item.id} className="flex flex-col gap-1">
            {hasHref ? (
              <a href={item.href!} onClick={() => setDrawerOpen(false)}
                className={isActive ? cardActive : cardNormal}
                aria-current={isActive ? "page" : undefined}
              >
                {cardContent(!!isActive)}
                {isActive && <Icon icon="lucide:check-circle" width={15} height={15} className="text-brand-olive ml-auto shrink-0" />}
              </a>
            ) : (
              <button type="button"
                onClick={() => setExpandedId((p) => p === item.id ? null : item.id)}
                className={isParentActive ? cardActive : cardNormal}
                aria-expanded={isExpanded}
              >
                {cardContent(!!isParentActive)}
                <Icon icon={isExpanded ? "lucide:chevron-up" : "lucide:chevron-down"}
                  width={14} height={14} className="ml-auto shrink-0 opacity-60" />
              </button>
            )}

            {/* Hijos expandidos */}
            {hasChildren && isExpanded && (
              <div className="flex flex-col gap-1 pl-3 ml-3 border-l border-white/15">
                {item.children!.map((child) => {
                  const childMeta = SIDEBAR_META[child.id] ?? { icon: "lucide:minus", desc: "" };

                  // Ítem especial sin href → colapsable inline
                  if (!("href" in child)) {
                    const isSubExpanded = expandedChildId === child.id;
                    const itinerarioSubs = [
                      { id: "servicios-por-naviera", labelKey: "serviciosPorNaviera" as const, href: "/itinerario/servicios", icon: "lucide:anchor", desc: "Servicios por naviera" },
                      { id: "consorcios",             labelKey: "consorcios"           as const, href: "/itinerario/consorcios",  icon: "lucide:network", desc: "Gestión de consorcios" },
                    ];
                    return (
                      <div key={child.id} className="flex flex-col gap-1">
                        <button type="button"
                          onClick={() => setExpandedChildId((p) => p === child.id ? null : child.id)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all duration-200 bg-white/5 border-white/8 text-neutral-400 hover:bg-white/10 hover:text-white hover:border-white/15 text-left"
                        >
                          <Icon icon={childMeta.icon} width={14} height={14} className="shrink-0 opacity-70" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold leading-tight">{t.sidebar[child.labelKey]}</p>
                            {childMeta.desc && <p className="text-[10px] text-neutral-500 mt-0.5">{childMeta.desc}</p>}
                          </div>
                          <Icon icon={isSubExpanded ? "lucide:chevron-up" : "lucide:chevron-down"} width={12} height={12} className="ml-auto shrink-0 opacity-40" />
                        </button>
                        {isSubExpanded && (
                          <div className="flex flex-col gap-1 pl-3 ml-3 border-l border-white/10">
                            {itinerarioSubs.map((sub) => {
                              const isSubActive = pathname === sub.href;
                              return (
                                <a key={sub.id} href={sub.href} onClick={() => setDrawerOpen(false)}
                                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-200 ${
                                    isSubActive
                                      ? "bg-brand-olive/20 border-brand-olive/40 text-white"
                                      : "bg-white/5 border-white/8 text-neutral-400 hover:bg-white/10 hover:text-white hover:border-white/15"
                                  }`}
                                >
                                  <Icon icon={sub.icon} width={12} height={12} className="shrink-0 opacity-70" />
                                  <p className="text-[11px] font-semibold leading-tight">{t.sidebar[sub.labelKey]}</p>
                                  {isSubActive && <Icon icon="lucide:check" width={11} height={11} className="text-brand-olive ml-auto shrink-0" />}
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const isChildActive = pathname === child.href;
                  return (
                    <a key={child.id} href={child.href ?? "#"} onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all duration-200 ${
                        isChildActive
                          ? "bg-brand-olive/20 border-brand-olive/40 text-white"
                          : "bg-white/5 border-white/8 text-neutral-400 hover:bg-white/10 hover:text-white hover:border-white/15"
                      }`}
                      aria-current={isChildActive ? "page" : undefined}
                    >
                      <Icon icon={childMeta.icon} width={14} height={14} className="shrink-0 opacity-70" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-tight">{t.sidebar[child.labelKey]}</p>
                        {childMeta.desc && <p className="text-[10px] text-neutral-500 mt-0.5">{childMeta.desc}</p>}
                      </div>
                      {isChildActive && <Icon icon="lucide:check" width={12} height={12} className="text-brand-olive ml-auto shrink-0" />}
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
      className="h-[44px] min-h-[44px] bg-neutral-700/95 backdrop-blur-md flex-shrink-0 flex items-center justify-between px-4 md:px-6 border-b border-white/10 relative z-40"
      role="navigation"
      aria-label="Navegación principal"
    >
      {isLoggedIn ? (
        /* ── LOGUEADO: ítems fijos + hamburguesa ── */
        <>
          <div className="flex items-center gap-1">
            {/* Hamburguesa */}
            <button
              type="button"
              onClick={() => setDrawerOpen((p) => !p)}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-200 mr-1 ${
                drawerOpen
                  ? "text-white bg-white/15 border-white/25"
                  : "text-neutral-300 hover:text-white hover:bg-white/10 border-transparent"
              }`}
              aria-label={drawerOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={drawerOpen}
            >
              <Icon icon={drawerOpen ? "lucide:x" : "lucide:menu"} width={18} height={18} />
            </button>

            {/* Ítems fijos */}
            {PINNED_NAV.map(({ labelKey, href }) => {
              const isActive = pathname === href;
              return (
                <a key={href} href={href}
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

          {/* Derecha: usuario */}
          <div className="flex items-center gap-2">
            {!isExternalUser && displayName && (
              <button type="button" onClick={() => setShowUserModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/15 hover:border-white/25 transition-all duration-200"
              >
                <span className="w-5 h-5 rounded-full bg-brand-blue flex items-center justify-center text-white text-[10px] font-black uppercase shrink-0">
                  {displayName[0]}
                </span>
                <span className="hidden sm:block text-xs font-semibold text-white/90 max-w-[140px] truncate">
                  {displayName}
                </span>
                <Icon icon="lucide:chevron-down" width={11} height={11} className="text-white/50 shrink-0" />
              </button>
            )}
          </div>
        </>
      ) : (
        /* ── NO LOGUEADO: horizontal en desktop, hamburguesa en mobile ── */
        <>
          {/* Desktop + Mobile izquierda: hamburguesa + ítems horizontales */}
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setDrawerOpen((p) => !p)}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-200 mr-1 ${
                drawerOpen ? "text-white bg-white/15 border-white/25" : "text-neutral-300 hover:text-white hover:bg-white/10 border-transparent"
              }`}
              aria-label={drawerOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={drawerOpen}
            >
              <Icon icon={drawerOpen ? "lucide:x" : "lucide:menu"} width={18} height={18} />
            </button>

            {/* Ítems horizontales solo en desktop */}
            <div className="hidden md:flex items-center gap-1">
              {siteConfig.navItems.map(({ labelKey, href }) => {
                const isActive = pathname === href;
                return (
                  <a key={href} href={href}
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
          </div>

          {/* Derecha vacía para mantener distribución */}
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
        className={`fixed left-0 top-[88px] bottom-0 z-50 w-64 bg-brand-blue/95 backdrop-blur-md border-r border-white/10 shadow-2xl shadow-black/50 flex flex-col transition-transform duration-300 ease-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header: info de usuario si está logueado */}
        {isLoggedIn && !isExternalUser && displayName && (
          <button type="button"
            onClick={() => { setShowUserModal(true); setDrawerOpen(false); }}
            className="flex items-center gap-3 mx-3 mt-3 mb-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 text-left flex-shrink-0"
          >
            <span className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-white text-sm font-black uppercase shrink-0">
              {displayName[0]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              <p className="text-[11px] text-neutral-400 truncate">{user!.email}</p>
            </div>
            <Icon icon="lucide:info" width={14} height={14} className="text-white/40 shrink-0" />
          </button>
        )}

        {isLoggedIn && <div className="mx-3 mb-2 border-t border-white/10 flex-shrink-0" />}

        {/* Items de navegación */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-3 pb-4">
          {sidebarDrawerContent}
        </div>

        {/* Footer: idioma */}
        <div className="flex-shrink-0 border-t border-white/10 px-3 py-3">
          <button type="button" onClick={handleLocaleToggle}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-neutral-300 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            <Icon icon="lucide:globe" width={15} height={15} className="shrink-0 opacity-80" />
            <span>{locale === "es" ? "Cambiar a Inglés" : "Switch to Spanish"}</span>
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
              {locale === "es" ? "EN" : "ES"}
            </span>
          </button>
        </div>
      </div>
    </>

    {/* ── Modal de usuario ────────────────────────────────────────────────── */}
    {showUserModal && profile && (
      <div
        className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4"
        role="dialog" aria-modal="true" aria-labelledby="user-profile-modal-title"
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
          <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-b border-neutral-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-blue flex items-center justify-center text-white text-sm font-black uppercase flex-shrink-0">
                {displayName![0]}
              </div>
              <div>
                <h2 id="user-profile-modal-title" className="text-sm font-bold text-neutral-900">{displayName}</h2>
                <p className="text-xs text-neutral-500 mt-0.5">{user!.email}</p>
              </div>
            </div>
            <button type="button" onClick={() => setShowUserModal(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <Icon icon="lucide:x" width={16} height={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3">
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
            <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${profile.activo ? "bg-green-100" : "bg-red-100"}`}>
                <Icon icon={profile.activo ? "lucide:check-circle" : "lucide:circle-off"} width={15} height={15} className={profile.activo ? "text-green-600" : "text-red-500"} />
              </div>
              <div>
                <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide mb-0.5">Estado</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${profile.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  <Icon icon={profile.activo ? "lucide:check" : "lucide:x"} width={10} height={10} />
                  {profile.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
            {empresaNombres.length > 0 && (
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                    <Icon icon="lucide:building-2" width={15} height={15} className="text-brand-blue" />
                  </div>
                  <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide">
                    Empresas asignadas <span className="text-neutral-300">({empresaNombres.length})</span>
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
          <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-t border-neutral-100">
            <button type="button" onClick={() => setShowUserModal(false)}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors"
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
