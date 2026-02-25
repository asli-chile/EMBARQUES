"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";

export function Sidebar() {
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggle = () => setIsOpen((prev) => !prev);

  const handleItemClick = (id: string, hasChildren: boolean) => {
    if (hasChildren) {
      setExpandedId((prev) => (prev === id ? null : id));
    }
  };

  return (
    <>
      {isOpen && (
        <aside
          className="flex-shrink-0 w-40 bg-neutral-600 pt-16 pb-3 px-2 shadow-lg"
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
                    <Link
                      href={item.href!}
                      className={linkClasses}
                    >
                      {t.sidebar[item.labelKey]}
                    </Link>
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
                        <Link
                          key={child.id}
                          href={child.href ?? "#"}
                          className="text-base text-neutral-300 hover:text-white hover:bg-neutral-500/80 px-2 py-1 rounded transition-colors"
                        >
                          {t.sidebar[child.labelKey]}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>
      )}
      <button
        type="button"
        onClick={handleToggle}
        className={`fixed z-50 flex items-center justify-center h-14 w-7 bg-neutral-600 text-white shadow-lg hover:bg-neutral-500 transition-all duration-300 ease-in-out rounded-r-full ${
          isOpen ? "left-40" : "left-0"
        }`}
        style={{ top: "50%", transform: "translateY(-50%)" }}
        aria-label={isOpen ? "Ocultar menú lateral" : "Mostrar menú lateral"}
      >
        <Icon
          icon={isOpen ? "typcn:arrow-left-outline" : "typcn:arrow-right-outline"}
          width={18}
          height={18}
        />
      </button>
    </>
  );
}
