import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { brand } from "@/lib/brand";
import { withBase } from "@/lib/basePath";
import { useLocale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  getVisibleSidebarItems,
  resolveSidebarLabel,
  sidebarAccessFromAuth,
} from "@/lib/sidebarFilter";
import { sidebarIconFor } from "@/lib/ui/sidebarIcons";
import { prefetchRoute } from "@/lib/routePrefetch";
import { LocaleToggle } from "./LocaleToggle";

type RailItem = {
  labelKey: string;
  id: string;
  href?: string;
  children?: readonly RailItem[];
};

type AppIconRailProps = {
  pathname: string;
};

function navPrefetch(href: string) {
  return {
    onPointerEnter: () => prefetchRoute(href),
    onFocus: () => prefetchRoute(href),
  };
}

/**
 * Rail navy tipo estudio Informativos: iconos siempre visibles, labels al expandir.
 */
export function AppIconRail({ pathname }: AppIconRailProps) {
  const { t } = useLocale();
  const { user, profile, isSuperadmin, isAdmin, isEjecutivo, isStaff, isCliente } =
    useAuth();
  const sidebarLabels = t.sidebar as Record<string, string>;
  const labelFor = (labelKey: string) =>
    resolveSidebarLabel(labelKey, sidebarLabels, isCliente);

  const items = useMemo(
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
      ) as RailItem[],
    [isSuperadmin, isAdmin, isEjecutivo, isStaff, isCliente, user, profile],
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [railWide, setRailWide] = useState(false);

  const openRail = () => {
    setRailWide(true);
  };

  const closeRail = () => {
    setRailWide(false);
    // Al minimizar: todo cerrado; no se restaura al volver a abrir.
    setExpandedId(null);
  };

  const railIcon = 22;
  const childIcon = 18;
  const navBtn =
    "group/item flex h-11 w-full items-center gap-3 overflow-hidden rounded-lg px-[11px] text-left text-[12px] font-semibold text-white/70 transition hover:bg-white/10 hover:text-white";
  const navActive = "bg-white/12 text-white shadow-sm ring-1 ring-white/10";
  const labelCls =
    "min-w-0 truncate opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100";

  const isActiveHref = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const groupActive = (item: RailItem) =>
    !!item.children?.some((c) => isActiveHref(c.href)) || isActiveHref(item.href);

  return (
    <nav
      className="group/rail z-40 flex h-full w-[56px] shrink-0 flex-col overflow-hidden border-r border-black/20 bg-[#0B1A3D] text-white transition-[width] duration-200 ease-out hover:w-[220px] focus-within:w-[220px]"
      aria-label="Navegación ERP"
      onMouseEnter={openRail}
      onMouseLeave={closeRail}
      onFocus={openRail}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          closeRail();
        }
      }}
    >
      <div className="flex h-12 shrink-0 items-center gap-3 overflow-hidden border-b border-white/10 px-[10px]">
        <a
          href={withBase("/inicio")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10"
          title={t.nav.home}
          {...navPrefetch("/inicio")}
        >
          <img
            src={brand.logoWhite}
            alt="ASLI"
            className="h-5 w-auto max-w-[22px] object-contain"
          />
        </a>
        <div className={`${labelCls} leading-tight`}>
          <p className="text-[12px] font-bold text-white">ASLI ERP</p>
          <p className="text-[9px] font-medium text-white/45">Embarques</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-1.5 py-2">
        <a
          href={withBase("/inicio")}
          className={`${navBtn} ${pathname === "/inicio" ? navActive : ""}`}
          title={t.nav.home}
          {...navPrefetch("/inicio")}
        >
          <Icon icon="lucide:house" width={railIcon} className="shrink-0 opacity-90" />
          <span className={labelCls}>{t.nav.home}</span>
        </a>
        <a
          href={withBase("/dashboard")}
          className={`${navBtn} ${pathname === "/dashboard" || pathname.startsWith("/dashboard/") ? navActive : ""}`}
          title={t.nav.dashboardShort}
          {...navPrefetch("/dashboard")}
        >
          <Icon icon="lucide:layout-dashboard" width={railIcon} className="shrink-0 opacity-90" />
          <span className={labelCls}>{t.nav.dashboardShort}</span>
        </a>
        <a
          href={withBase("/tracking")}
          className={`${navBtn} ${pathname === "/tracking" || pathname.startsWith("/tracking/") ? navActive : ""}`}
          title={t.nav.tracking}
          {...navPrefetch("/tracking")}
        >
          <Icon icon="lucide:ship" width={railIcon} className="shrink-0 opacity-90" />
          <span className={labelCls}>{t.sidebar.tracking}</span>
        </a>

        <div className="mx-2 my-1.5 h-px bg-white/10" />

        {items.map((item) => {
          if (item.children && item.children.length > 0) {
            const open = railWide && expandedId === item.id;
            return (
              <div key={item.id} className="space-y-0.5">
                <button
                  type="button"
                  title={labelFor(item.labelKey)}
                  className={`${navBtn} ${groupActive(item) ? navActive : ""}`}
                  aria-expanded={open}
                  onClick={() =>
                    setExpandedId((prev) => (prev === item.id ? null : item.id))
                  }
                >
                  <Icon
                    icon={sidebarIconFor(item.id)}
                    width={railIcon}
                    className="shrink-0 opacity-90"
                  />
                  <span className={`${labelCls} flex-1`}>{labelFor(item.labelKey)}</span>
                  <Icon
                    icon={open ? "lucide:chevron-down" : "lucide:chevron-right"}
                    width={14}
                    className={`${labelCls} !min-w-0 shrink-0 opacity-50`}
                  />
                </button>
                {open ? (
                  <div className="ml-[26px] space-y-0.5 border-l border-white/10 pl-1">
                    {item.children.map((child) => (
                      <a
                        key={child.id}
                        href={child.href ? withBase(child.href) : "#"}
                        title={labelFor(child.labelKey)}
                        className={`${navBtn} !h-9 !px-2 ${
                          isActiveHref(child.href) ? navActive : ""
                        }`}
                        {...(child.href ? navPrefetch(child.href) : {})}
                      >
                        <Icon
                          icon={sidebarIconFor(child.id)}
                          width={childIcon}
                          className="shrink-0 opacity-90"
                        />
                        <span className={labelCls}>{labelFor(child.labelKey)}</span>
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          }

          if (!item.href) return null;
          // Evitar duplicar: ya van fijos arriba
          if (item.id === "dashboard" || item.id === "inicio" || item.id === "tracking") return null;

          return (
            <a
              key={item.id}
              href={withBase(item.href)}
              title={labelFor(item.labelKey)}
              className={`${navBtn} ${isActiveHref(item.href) ? navActive : ""}`}
              {...navPrefetch(item.href)}
            >
              <Icon
                icon={sidebarIconFor(item.id)}
                width={railIcon}
                className="shrink-0 opacity-90"
              />
              <span className={labelCls}>{labelFor(item.labelKey)}</span>
            </a>
          );
        })}
      </div>

      <div className="shrink-0 overflow-hidden border-t border-white/10 px-1.5 py-2">
        <div className="mb-0.5 flex h-11 items-center gap-2 overflow-hidden px-[11px]">
          <Icon icon="lucide:languages" width={railIcon} className="shrink-0 text-white/55" />
          <span className={`${labelCls} flex-1`}>{t.nav.language}</span>
          <LocaleToggle variant="dark" className="shrink-0" />
        </div>
        <a
          href={withBase("/inicio")}
          className={navBtn}
          title={t.nav.website}
          {...navPrefetch("/inicio")}
        >
          <Icon icon="lucide:globe" width={railIcon} className="shrink-0 opacity-90" />
          <span className={labelCls}>{t.nav.website}</span>
        </a>
        <div className={`${navBtn} pointer-events-none !text-white/40`}>
          <Icon icon="lucide:user" width={railIcon} className="shrink-0" />
          <span className={labelCls}>
            {profile?.nombre || user?.email || t.nav.guest}
          </span>
        </div>
      </div>
    </nav>
  );
}
