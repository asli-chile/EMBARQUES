import { useMemo } from "react";
import { useLocale } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";

type SidebarLink = { href: string; labelKey: string };

function getSidebarLinks(): SidebarLink[] {
  const links: SidebarLink[] = [];
  for (const item of siteConfig.sidebarItems) {
    if ("superadminOnly" in item && item.superadminOnly) continue;
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
  const links = useMemo(getSidebarLinks, []);

  const baseBtnClass =
    "px-2 py-0.5 text-[11px] font-medium rounded transition-colors duration-200 " +
    "focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:ring-offset-2";

  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-[11px] font-medium text-neutral-500 mr-1">
        {t.visitor.quickAccessModules}:
      </span>
      {links.map((link) => {
        const isCurrent = currentHref === link.href;
        const btnClass = isCurrent
          ? `${baseBtnClass} text-white bg-brand-blue border border-brand-blue cursor-default`
          : `${baseBtnClass} text-brand-blue bg-white border border-neutral-200
              hover:bg-brand-blue hover:text-white hover:border-brand-blue`;
        return isCurrent ? (
          <span key={link.href} className={btnClass} aria-current="page">
            {t.sidebar[link.labelKey]}
          </span>
        ) : (
          <a key={link.href} href={link.href} className={btnClass}>
            {t.sidebar[link.labelKey]}
          </a>
        );
      })}
    </div>
  );
}
