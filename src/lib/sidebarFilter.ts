import { isCartolasNuboxSidebarPriority } from "./cartolas-nubox-access";
import { siteConfig } from "./site";

type SidebarItem = (typeof siteConfig.sidebarItems)[number] & {
  allowedEmails?: readonly string[];
  ejecutivoAndAbove?: boolean;
};

/**
 * Etiqueta del menú lateral según rol.
 * Los clientes ven "Solicitar reserva" en lugar de "Crear reserva".
 */
export function resolveSidebarLabel(
  labelKey: string,
  sidebar: Record<string, string>,
  isCliente: boolean
): string {
  if (isCliente && labelKey === "crearReserva") {
    return sidebar.solicitarReserva ?? sidebar.crearReserva ?? labelKey;
  }
  return sidebar[labelKey] ?? labelKey;
}

/** Coloca Cartolas Nubox justo después de Dashboard para correos con prioridad. */
function prioritizeCartolasNuboxAfterDashboard(items: SidebarItem[]): SidebarItem[] {
  const cartola = items.find((item) => item.id === "cartolas-nubox");
  if (!cartola) return items;
  const without = items.filter((item) => item.id !== "cartolas-nubox");
  const dashIdx = without.findIndex((item) => item.id === "dashboard");
  if (dashIdx === -1) return items;
  return [...without.slice(0, dashIdx + 1), cartola, ...without.slice(dashIdx + 1)];
}

/**
 * Ítems del menú lateral visibles según rol, correo y flags del ítem.
 */
export function getVisibleSidebarItems(
  isSuperadmin: boolean,
  canAccessEjecutivoAndAbove: boolean,
  userEmail: string,
  isLoggedIn: boolean = false,
  isAdmin: boolean = false
): SidebarItem[] {
  const normalized = userEmail.trim().toLowerCase();
  const canAccessAdminAndAbove = isSuperadmin || isAdmin;

  const itemAllowed = (item: SidebarItem & { adminAndAbove?: boolean }): boolean => {
    if ("superadminOnly" in item && item.superadminOnly && !isSuperadmin) return false;
    if ("adminAndAbove" in item && item.adminAndAbove && !canAccessAdminAndAbove) return false;
    if ("ejecutivoAndAbove" in item && item.ejecutivoAndAbove && !canAccessEjecutivoAndAbove) return false;
    if (!isLoggedIn && (item.ejecutivoAndAbove || item.adminAndAbove || item.superadminOnly)) return false;
    const allow = item.allowedEmails;
    if (allow && allow.length > 0) {
      if (!normalized || !allow.some((a) => a.toLowerCase() === normalized)) return false;
    }
    return true;
  };

  let result = (siteConfig.sidebarItems as SidebarItem[])
    .filter(itemAllowed)
    .map((item) => {
      if (!("children" in item) || !item.children) return item;
      const filtered = (item.children as SidebarItem[]).filter(
        (child) => itemAllowed(child) && (!child.ejecutivoAndAbove || canAccessEjecutivoAndAbove)
      );
      return { ...item, children: filtered };
    })
    .filter((item) => !("children" in item && item.children && item.children.length === 0));

  if (isCartolasNuboxSidebarPriority(normalized)) {
    result = prioritizeCartolasNuboxAfterDashboard(result);
  }

  return result;
}
