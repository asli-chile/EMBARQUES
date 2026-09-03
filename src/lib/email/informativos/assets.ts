import { withBase } from "@/lib/basePath";
import type { InformativoIconId } from "./types";

const ICON_FILES: Record<Exclude<InformativoIconId, "custom">, string> = {
  calendar: "/email/icons/calendar.png",
  pin: "/email/icons/pin.png",
  product: "/email/icons/product.png",
  document: "/email/icons/document.png",
  cold: "/email/icons/cold.png",
};

/** Origen público por defecto para HTML que viaja a Gmail (no localhost). */
export const EMAIL_PUBLIC_ORIGIN_FALLBACK = "https://asli.cl";

/**
 * Origen absoluto para assets públicos en HTML de correo.
 * Gmail/Outlook no resuelven rutas relativas del ERP.
 */
export function getEmailAssetOrigin(preferPublic = false): string {
  const configured =
    (typeof import.meta !== "undefined" && import.meta.env?.PUBLIC_SITE_URL
      ? String(import.meta.env.PUBLIC_SITE_URL)
      : ""
    ).trim() ||
    (typeof import.meta !== "undefined" && import.meta.env?.SITE
      ? String(import.meta.env.SITE)
      : ""
    ).trim();

  if (configured) return configured.replace(/\/$/, "");

  if (!preferPublic && typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }

  return EMAIL_PUBLIC_ORIGIN_FALLBACK;
}

/** URL absoluta de un path bajo `public/` (respeta BASE_URL /embarques). */
export function absolutePublicUrl(path: string, preferPublic = false): string {
  const relative = withBase(path.startsWith("/") ? path : `/${path}`);
  return `${getEmailAssetOrigin(preferPublic)}${relative}`;
}

export function iconAbsoluteUrl(
  icon: InformativoIconId,
  customUrl?: string,
  preferPublic = false,
): string {
  if (icon === "custom" && customUrl?.trim()) return customUrl.trim();
  if (icon === "custom") return absolutePublicUrl(ICON_FILES.document, preferPublic);
  return absolutePublicUrl(ICON_FILES[icon], preferPublic);
}

export function footerLogoUrl(preferPublic = false): string {
  return absolutePublicUrl("/logoblanco.png", preferPublic);
}

export function footerMarkUrl(preferPublic = false): string {
  return absolutePublicUrl("/email/icons/mark-a.png", preferPublic);
}
