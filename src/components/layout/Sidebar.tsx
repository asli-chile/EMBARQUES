import { useState, useRef, useCallback, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { layout } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

const AUTO_COLLAPSE_MS = 10000;
const HOVER_OPEN_DELAY_MS = 200;
const STORAGE_KEY = "embarques-sidebar-open";

function getInitialOpenState(): boolean {
  if (typeof window === "undefined") return false;
  return (window as unknown as { __SIDEBAR_OPEN__?: boolean }).__SIDEBAR_OPEN__ ?? true;
}

export function Sidebar() {
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(getInitialOpenState);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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

  const handleMouseEnter = useCallback(() => {
    clearCollapseTimer();
    if (!isOpen) {
      clearOpenTimer();
      openTimerRef.current = setTimeout(() => {
        setIsOpen(true);
        openTimerRef.current = null;
      }, HOVER_OPEN_DELAY_MS);
    }
  }, [clearCollapseTimer, clearOpenTimer, isOpen]);

  const handleMouseLeave = useCallback(() => {
    clearOpenTimer();
    if (!isOpen) return;
    clearCollapseTimer();
    collapseTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      collapseTimerRef.current = null;
    }, AUTO_COLLAPSE_MS);
  }, [isOpen, clearCollapseTimer, clearOpenTimer]);

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
            {siteConfig.sidebarItems.map((item) => {
              const hasChildren = "children" in item && item.children?.length;
              const hasHref = "href" in item && item.href;
              const isExpanded = expandedId === item.id;

              const linkClasses =
                "flex items-center justify-between w-full text-left text-base text-neutral-200 hover:text-white hover:bg-neutral-500 px-2 py-1.5 rounded transition-colors";

              return (
                <div key={item.id} className="flex flex-col gap-2">
                  {hasHref ? (
                    <a href={item.href!} className={linkClasses}>
                      {t.sidebar[item.labelKey]}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleItemClick(item.id, !!hasChildren)}
                      className={linkClasses}
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
                      {item.children!.map((child) => (
                        <a
                          key={child.id}
                          href={child.href ?? "#"}
                          className="text-base text-neutral-300 hover:text-white hover:bg-neutral-500/80 px-2 py-1 rounded transition-colors"
                        >
                          {t.sidebar[child.labelKey]}
                        </a>
                      ))}
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
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
