/** URLs de assets para HTML de correo. */

export const EMAIL_PUBLIC_ORIGIN_FALLBACK = "https://asli.cl";

export function getEmailPublicOrigin(): string {
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
  return EMAIL_PUBLIC_ORIGIN_FALLBACK;
}

export function getEmailAssetBasePath(): string {
  const base =
    typeof import.meta !== "undefined" && import.meta.env?.BASE_URL
      ? String(import.meta.env.BASE_URL).replace(/\/$/, "")
      : "/embarques";
  return base || "/embarques";
}

/**
 * @param preferPublic - true al enviar (Gmail); false en preview local.
 */
export function emailAsset(path: string, preferPublic = false): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = getEmailAssetBasePath();
  if (
    !preferPublic &&
    typeof window !== "undefined" &&
    window.location?.origin
  ) {
    return `${window.location.origin.replace(/\/$/, "")}${base}${p}`;
  }
  return `${getEmailPublicOrigin()}${base}${p}`;
}

export function emailAssetUrls(preferPublic = false) {
  return {
    logoWhite: emailAsset("/logoblanco.png", preferPublic),
    logo: emailAsset("/logoasli.png", preferPublic),
    formasHeader: emailAsset("/email/formas-header.png", preferPublic),
    formasMarcas: emailAsset("/email/formas-marcas.png", preferPublic),
    iconCalendar: emailAsset("/email/icons/calendar.png", preferPublic),
    iconPin: emailAsset("/email/icons/pin.png", preferPublic),
    iconProduct: emailAsset("/email/icons/product.png", preferPublic),
    iconDocument: emailAsset("/email/icons/document.png", preferPublic),
    iconCold: emailAsset("/email/icons/cold.png", preferPublic),
  };
}

/** Sustituye {{asset:/ruta}} por URL absoluta de asset de correo. */
export function resolveEmailAssetTokens(
  html: string,
  preferPublic = false,
): string {
  return html.replace(/\{\{\s*asset:([^}]+)\s*\}\}/gi, (_, rawPath: string) =>
    emailAsset(rawPath.trim(), preferPublic),
  );
}
