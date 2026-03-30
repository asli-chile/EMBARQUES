import { useMemo } from "react";
import { useLocale } from "@/lib/i18n";
import { stripBasePathname, withBase } from "@/lib/basePath";
import { getVisibleSidebarItems } from "@/lib/sidebarFilter";
import { useAuth } from "@/lib/auth/AuthContext";

type SidebarLink = { href: string; labelKey: string };

function linksFromVisibleSidebar(visible: ReturnType<typeof getVisibleSidebarItems>): SidebarLink[] {
  const links: SidebarLink[] = [];
  for (const item of visible) {
    if ("href" in item && item.href) {
      links.push({ href: item.href, labelKey: item.labelKey });
    }
    if ("children" in item && item.children) {
      for (const child of item.children) {
        if (child.href) {
          links.push({ href: child.href, labelKey: child.labelKey });
        }
      }
    }
  }
  return links;
}

type VisitorSidebarQuickAccessProps = {
  /** Ruta actual para marcar la sección activa */
  currentHref?: string;
};

/**
 * Accesos rápidos a los módulos del menú lateral.
 * Estilo estándar en todas las vistas de visitantes.
 * Marca la sección actual con estilo activo.
 */
export function VisitorSidebarQuickAccess({ currentHref }: VisitorSidebarQuickAccessProps) {
  const { t } = useLocale();
  const { isSuperadmin, isAdmin, isEjecutivo, user, profile } = useAuth();
  const sessionEmail = (profile?.email ?? user?.email ?? "").trim();
  const canAccessEjecutivoAndAbove = isSuperadmin || isAdmin || isEjecutivo;
  const links = useMemo(
    () => linksFromVisibleSidebar(getVisibleSidebarItems(isSuperadmin, canAccessEjecutivoAndAbove, sessionEmail)),
    [isSuperadmin, canAccessEjecutivoAndAbove, sessionEmail]
  );

  const baseBtnClass =
    "px-2 py-0.5 text-[11px] font-medium rounded transition-colors duration-200 " +
    "focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:ring-offset-2";

  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-[11px] font-medium text-neutral-500 mr-1">
        {t.visitor.quickAccessModules}:
      </span>
      {links.map((link) => {
        const isCurrent =
          stripBasePathname(currentHref ?? "") === stripBasePathname(link.href);
        const btnClass = isCurrent
          ? `${baseBtnClass} text-white bg-brand-blue border border-brand-blue cursor-default`
          : `${baseBtnClass} text-brand-blue bg-white border border-neutral-200
              hover:bg-brand-blue hover:text-white hover:border-brand-blue`;
        return isCurrent ? (
          <span key={link.href} className={btnClass} aria-current="page">
            {t.sidebar[link.labelKey]}
          </span>
        ) : (
          <a key={link.href} href={withBase(link.href)} className={btnClass}>
            {t.sidebar[link.labelKey]}
          </a>
        );
      })}
    </div>
  );
}
