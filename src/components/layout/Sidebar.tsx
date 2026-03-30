import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";
import { useAuth } from "@/lib/auth/AuthContext";
import { getVisibleSidebarItems } from "@/lib/sidebarFilter";

const AUTO_COLLAPSE_MS = 2000;
const HOVER_OPEN_DELAY_MS = 1000;
const STORAGE_KEY = "embarques-sidebar-open";

type SidebarProps = {
  pathname: string;
};

type SidebarItem = (typeof siteConfig.sidebarItems)[number] & { superadminOnly?: boolean; ejecutivoAndAbove?: boolean };

export function Sidebar({ pathname }: SidebarProps) {
  const { t } = useLocale();
  const { isSuperadmin, isAdmin, isEjecutivo, user, profile } = useAuth();
  const sessionEmail = (profile?.email ?? user?.email ?? "").trim();
  const [isOpen, setIsOpen] = useState(false);

  const canAccessEjecutivoAndAbove = isSuperadmin || isAdmin || isEjecutivo;

  const visibleItems = useMemo(
    () => getVisibleSidebarItems(isSuperadmin, canAccessEjecutivoAndAbove, sessionEmail) as SidebarItem[],
    [isSuperadmin, canAccessEjecutivoAndAbove, sessionEmail]
  );
  const [isMouseInside, setIsMouseInside] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setIsOpen(stored === "true");
      } else {
        setIsOpen(true);
      }
    } catch {
      setIsOpen(true);
    }
  }, []);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Auto-expand sección padre cuando pathname coincide con un hijo
  useEffect(() => {
    for (const item of visibleItems) {
      if ("children" in item && item.children) {
        const childMatches = item.children.some((c) => c.href && pathname === c.href);
        if (childMatches) {
          setExpandedId(item.id);
          return;
        }
      }
    }
  }, [pathname, visibleItems]);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => setIsOpen((prev) => !prev);

  const clearCollapseTimer = useCallback(() => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  }, []);

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  const startCollapseTimer = useCallback(() => {
    clearCollapseTimer();
    collapseTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      collapseTimerRef.current = null;
    }, AUTO_COLLAPSE_MS);
  }, [clearCollapseTimer]);

  const handleMouseEnter = useCallback(() => {
    setIsMouseInside(true);
    clearCollapseTimer();
    clearOpenTimer();
    if (!isOpen) {
      openTimerRef.current = setTimeout(() => {
        setIsOpen(true);
        openTimerRef.current = null;
      }, HOVER_OPEN_DELAY_MS);
    }
  }, [clearCollapseTimer, clearOpenTimer, isOpen]);

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    const relatedTarget = e.relatedTarget;
    const isStillInside = relatedTarget instanceof Node && sidebarRef.current?.contains(relatedTarget);

    if (isStillInside) return;

    setIsMouseInside(false);
    clearOpenTimer();
    if (isOpen) {
      startCollapseTimer();
    }
  }, [isOpen, clearOpenTimer, startCollapseTimer]);

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isOutsideSidebar = !sidebarRef.current?.contains(target);
      const isInteractiveElement = target.closest(
        'button, a, input, select, textarea, [role="button"]'
      );
      if (isOutsideSidebar && isOpen && !isInteractiveElement) {
        clearCollapseTimer();
        setIsOpen(false);
      }
    },
    [isOpen, clearCollapseTimer]
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isOpen));
    } catch {
      // ignore storage errors
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      clearCollapseTimer();
      clearOpenTimer();
    };
  }, [clearCollapseTimer, clearOpenTimer]);

  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [handleClickOutside]);

  useEffect(() => {
    if (isMouseInside) {
      clearCollapseTimer();
    }
  }, [isMouseInside, clearCollapseTimer]);

  const handleItemClick = (id: string, hasChildren: boolean) => {
    if (hasChildren) {
      setExpandedId((prev) => (prev === id ? null : id));
    }
  };

  // Nav items JSX – shared between mobile drawer and desktop sidebar
  const navItems = (
    <nav className="flex flex-col gap-1.5">
      {visibleItems.map((item) => {
        const hasChildren = "children" in item && item.children?.length;
        const hasHref = "href" in item && item.href;
        const isExpanded = expandedId === item.id;
        const isActive = hasHref && pathname === item.href;
        const isParentActive =
          hasChildren &&
          item.children!.some((c) => c.href && pathname === c.href);

        const linkBaseClasses =
          "flex items-center justify-between w-full text-left text-sm px-3 py-2 rounded-lg border border-transparent transition-all duration-200";
        const linkClasses = isActive
          ? `${linkBaseClasses} text-white bg-white/15 border-white/20`
          : `${linkBaseClasses} text-neutral-200 hover:text-white hover:bg-white/10`;
        const buttonClasses = isParentActive
          ? `${linkBaseClasses} text-white bg-white/15 border-white/20`
          : `${linkBaseClasses} text-neutral-200 hover:text-white hover:bg-white/10`;

        return (
          <div key={item.id} className="flex flex-col gap-1">
            {hasHref ? (
              <a
                href={item.href!}
                className={linkClasses}
                aria-current={isActive ? "page" : undefined}
              >
                {t.sidebar[item.labelKey]}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => handleItemClick(item.id, !!hasChildren)}
                className={buttonClasses}
                aria-expanded={hasChildren ? isExpanded : undefined}
                aria-current={isParentActive ? "true" : undefined}
              >
                {t.sidebar[item.labelKey]}
                {hasChildren && (
                  <Icon
                    icon={
                      isExpanded
                        ? "typcn:arrow-sorted-up"
                        : "typcn:arrow-sorted-down"
                    }
                    width={12}
                    height={12}
                    className="flex-shrink-0 opacity-80"
                  />
                )}
              </button>
            )}
            {hasChildren && isExpanded && (
              <div className="flex flex-col gap-1 pl-3 ml-1 border-l-2 border-white/20">
                {item.children!.map((child) => {
                  const childHref = child.href ?? "#";
                  const isChildActive = pathname === childHref;
                  const childBaseClasses =
                    "text-sm px-3 py-1.5 rounded-lg border border-transparent transition-all duration-200";
                  const childClasses = isChildActive
                    ? `${childBaseClasses} text-white bg-brand-olive/20 border-brand-olive/40`
                    : `${childBaseClasses} text-neutral-300 hover:text-white hover:bg-white/10`;
                  return (
                    <a
                      key={child.id}
                      href={childHref}
                      className={childClasses}
                      aria-current={isChildActive ? "page" : undefined}
                    >
                      {t.sidebar[child.labelKey]}
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
      {/* Mobile: backdrop overlay when sidebar is open */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile: fixed drawer that slides in from left */}
      <div
        className={`md:hidden fixed left-0 top-[94px] bottom-0 z-50 w-56 bg-neutral-700/97 backdrop-blur-md border-r border-white/10 shadow-2xl shadow-black/40 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <aside
          className="w-full pt-4 pb-3 px-2 flex-1 min-h-0 overflow-y-auto"
          role="navigation"
          aria-label="Menú de módulos"
        >
          {navItems}
        </aside>
      </div>

      {/* Mobile: tab centrado en el borde del sidebar */}
      <div className="md:hidden flex-shrink-0 relative w-3 bg-neutral-700/95">
        <button
          type="button"
          onClick={handleToggle}
          className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 z-20 flex items-center justify-center w-5 h-10 rounded-full bg-neutral-700/95 text-white border border-white/15 shadow-lg hover:bg-neutral-600 transition-all duration-200"
          aria-label={isOpen ? "Cerrar menú lateral" : "Abrir menú lateral"}
          aria-expanded={isOpen}
        >
          <Icon
            icon={isOpen ? "typcn:arrow-left-outline" : "typcn:arrow-right-outline"}
            width={13}
            height={13}
            className="opacity-80"
          />
        </button>
      </div>

      {/* Desktop: sidebar con botón centrado en el borde derecho */}
      <div
        ref={sidebarRef}
        className={`hidden md:block relative flex-shrink-0 overflow-visible bg-neutral-700/95 z-10 transition-[width] duration-300 ease-out ${
          isOpen ? "w-[11.75rem]" : "w-3"
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Zona de hover invisible cuando está colapsado */}
        {!isOpen && (
          <div className="absolute inset-y-0 left-0 w-6 cursor-pointer" />
        )}
        {/* Panel del sidebar */}
        <div
          className={`absolute inset-y-0 left-0 flex flex-col overflow-hidden bg-neutral-700/95 backdrop-blur-md border-r border-white/10 shadow-xl shadow-black/20 transition-[width] duration-300 ease-out ${
            isOpen ? "w-[11.75rem]" : "w-0"
          }`}
        >
          <aside
            className="w-[11.75rem] min-w-[11.75rem] pt-4 pb-3 px-2 flex-1 min-h-0 overflow-y-auto"
            role="navigation"
            aria-label="Menú de módulos"
          >
            {navItems}
          </aside>
        </div>

        {/* Botón toggle — centrado en el borde derecho */}
        <button
          type="button"
          onClick={handleToggle}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20 flex items-center justify-center w-5 h-10 rounded-full bg-neutral-700 border border-white/20 text-white shadow-lg hover:bg-neutral-600 hover:scale-105 transition-all duration-200"
          aria-label={isOpen ? "Ocultar menú lateral" : "Mostrar menú lateral"}
          aria-expanded={isOpen}
        >
          <Icon
            icon={isOpen ? "typcn:arrow-left-outline" : "typcn:arrow-right-outline"}
            width={14}
            height={14}
            className="opacity-90"
          />
        </button>
      </div>
    </>
  );
}
