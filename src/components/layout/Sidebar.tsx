import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { layout } from "@/lib/brand";
import { siteConfig } from "@/lib/site";
import { useAuth } from "@/lib/auth/AuthContext";

const AUTO_COLLAPSE_MS = 2000;
const HOVER_OPEN_DELAY_MS = 200;
const STORAGE_KEY = "embarques-sidebar-open";

type SidebarProps = {
  pathname: string;
};

type SidebarItem = (typeof siteConfig.sidebarItems)[number] & { superadminOnly?: boolean };

export function Sidebar({ pathname }: SidebarProps) {
  const { t } = useLocale();
  const { isSuperadmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const visibleItems = useMemo(() => {
    return (siteConfig.sidebarItems as SidebarItem[]).filter(
      (item) => !("superadminOnly" in item && item.superadminOnly) || isSuperadmin
    );
  }, [isSuperadmin]);
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
    if (!isOpen) {
      clearOpenTimer();
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

  return (
    <div
      ref={sidebarRef}
      className={`flex flex-shrink-0 overflow-hidden ${layout.sidebar.bg} ${layout.sidebar.shadow} transition-[width] duration-300 ease-out ${
        isOpen ? "w-[11.75rem]" : "w-7"
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`flex overflow-hidden transition-[width] duration-300 ease-out ${
          isOpen ? "w-40" : "w-0"
        }`}
      >
        <aside
          className="w-40 min-w-40 pt-16 pb-3 px-2 overflow-hidden"
          role="navigation"
          aria-label="Menú de módulos"
        >
          <nav className="flex flex-col gap-4">
            {visibleItems.map((item) => {
              const hasChildren = "children" in item && item.children?.length;
              const hasHref = "href" in item && item.href;
              const isExpanded = expandedId === item.id;
              const isActive = hasHref && pathname === item.href;
              const isParentActive =
                hasChildren &&
                item.children!.some((c) => c.href && pathname === c.href);

              const linkBaseClasses =
                "flex items-center justify-between w-full text-left text-base px-2 py-1.5 rounded transition-colors";
              const linkClasses = isActive
                ? `${linkBaseClasses} text-white bg-brand-blue/80`
                : `${linkBaseClasses} text-neutral-200 hover:text-white hover:bg-neutral-500`;
              const buttonClasses = isParentActive
                ? `${linkBaseClasses} text-white bg-brand-blue/50`
                : `${linkBaseClasses} text-neutral-200 hover:text-white hover:bg-neutral-500`;

              return (
                <div key={item.id} className="flex flex-col gap-2">
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
                          className="flex-shrink-0"
                        />
                      )}
                    </button>
                  )}
                  {hasChildren && isExpanded && (
                    <div className="flex flex-col gap-2 pl-2 ml-0.5 border-l border-neutral-500">
                      {item.children!.map((child) => {
                        const childHref = child.href ?? "#";
                        const isChildActive = pathname === childHref;
                        const childClasses = isChildActive
                          ? "text-base text-white bg-brand-blue/80 px-2 py-1 rounded transition-colors"
                          : "text-base text-neutral-300 hover:text-white hover:bg-neutral-500/80 px-2 py-1 rounded transition-colors";
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
        </aside>
      </div>
      <button
        type="button"
        onClick={handleToggle}
        className={`flex-shrink-0 flex items-center justify-center h-14 w-7 ${layout.sidebar.bg} text-white hover:bg-neutral-500 transition-colors self-center`}
        aria-label={isOpen ? "Ocultar menú lateral" : "Mostrar menú lateral"}
      >
        <Icon
          icon={
            isOpen ? "typcn:arrow-left-outline" : "typcn:arrow-right-outline"
          }
          width={18}
          height={18}
        />
      </button>
    </div>
  );
}
