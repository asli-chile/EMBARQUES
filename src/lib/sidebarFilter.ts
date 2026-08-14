import { isCartolasNuboxSidebarPriority } from "./cartolas-nubox-access";
import { siteConfig } from "./site";

type SidebarItem = {
  labelKey: string;
  id: string;
  href?: string;
  children?: readonly SidebarItem[];
  allowedEmails?: readonly string[];
  ejecutivoAndAbove?: boolean;
  adminAndAbove?: boolean;
  superadminOnly?: boolean;
  staffOnly?: boolean;
  operational?: boolean;
};

export type SidebarAccess = {
  isSuperadmin: boolean;
  isAdmin: boolean;
  isEjecutivo: boolean;
  isStaff: boolean;
  isCliente: boolean;
  isLoggedIn: boolean;
  userEmail: string;
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
export function getVisibleSidebarItems(access: SidebarAccess): SidebarItem[] {
  const { isSuperadmin, isAdmin, isEjecutivo, isStaff, isCliente, isLoggedIn, userEmail } = access;
  const normalized = userEmail.trim().toLowerCase();
  const canAccessAdminAndAbove = isSuperadmin || isAdmin;
  const canAccessEjecutivoAndAbove = isSuperadmin || isAdmin || isEjecutivo;

  const itemAllowed = (item: SidebarItem): boolean => {
    if (item.superadminOnly && !isSuperadmin) return false;
    if (item.adminAndAbove && !canAccessAdminAndAbove) return false;
    if (item.ejecutivoAndAbove && !canAccessEjecutivoAndAbove) return false;
    if (item.staffOnly && !isStaff) return false;
    if (item.operational && !isStaff && !isCliente) return false;
    if (
      !isLoggedIn &&
      (item.ejecutivoAndAbove || item.adminAndAbove || item.superadminOnly || item.staffOnly || item.operational)
    ) {
      return false;
    }
    const allow = item.allowedEmails;
    if (allow && allow.length > 0) {
      if (!normalized || !allow.some((a) => a.toLowerCase() === normalized)) return false;
    }
    return true;
  };

  let result: SidebarItem[] = (siteConfig.sidebarItems as unknown as SidebarItem[])
    .filter(itemAllowed)
    .map((item) => {
      if (!item.children) return item;
      return { ...item, children: item.children.filter(itemAllowed) };
    })
    .filter((item) => !item.children || item.children.length > 0);

  if (isCartolasNuboxSidebarPriority(normalized)) {
    result = prioritizeCartolasNuboxAfterDashboard(result);
  }

  return result;
}

export function sidebarAccessFromAuth(auth: {
  isSuperadmin: boolean;
  isAdmin: boolean;
  isEjecutivo: boolean;
  isStaff: boolean;
  isCliente: boolean;
  user: { email: string } | null;
  profile: { email?: string } | null;
}): SidebarAccess {
  return {
    isSuperadmin: auth.isSuperadmin,
    isAdmin: auth.isAdmin,
    isEjecutivo: auth.isEjecutivo,
    isStaff: auth.isStaff,
    isCliente: auth.isCliente,
    isLoggedIn: !!auth.user,
    userEmail: (auth.profile?.email ?? auth.user?.email ?? "").trim(),
  };
}
