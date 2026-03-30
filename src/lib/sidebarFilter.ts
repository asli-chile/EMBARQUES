import { siteConfig } from "./site";

type SidebarItem = (typeof siteConfig.sidebarItems)[number] & {
  allowedEmails?: readonly string[];
  ejecutivoAndAbove?: boolean;
};

/**
 * Ítems del menú lateral visibles según rol, correo y flags del ítem.
 */
export function getVisibleSidebarItems(
  isSuperadmin: boolean,
  canAccessEjecutivoAndAbove: boolean,
  userEmail: string
): SidebarItem[] {
  const normalized = userEmail.trim().toLowerCase();

  const itemAllowed = (item: SidebarItem): boolean => {
    if ("superadminOnly" in item && item.superadminOnly && !isSuperadmin) return false;
    const allow = item.allowedEmails;
    if (allow && allow.length > 0) {
      if (!normalized || !allow.some((a) => a.toLowerCase() === normalized)) return false;
    }
    return true;
  };

  return (siteConfig.sidebarItems as SidebarItem[])
    .filter(itemAllowed)
    .map((item) => {
      if (!("children" in item) || !item.children) return item;
      const filtered = (item.children as SidebarItem[]).filter(
        (child) => itemAllowed(child) && (!child.ejecutivoAndAbove || canAccessEjecutivoAndAbove)
      );
      return { ...item, children: filtered };
    })
    .filter((item) => !("children" in item && item.children && item.children.length === 0));
}
