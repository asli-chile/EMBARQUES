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
    iconShip: emailAsset("/email/icons/ship.png", preferPublic),
    iconPlane: emailAsset("/email/icons/plane.png", preferPublic),
    iconTruck: emailAsset("/email/icons/truck.png", preferPublic),
    iconPackage: emailAsset("/email/icons/package.png", preferPublic),
    iconClock: emailAsset("/email/icons/clock.png", preferPublic),
    iconCheck: emailAsset("/email/icons/check.png", preferPublic),
    iconAlert: emailAsset("/email/icons/alert.png", preferPublic),
    iconMail: emailAsset("/email/icons/mail.png", preferPublic),
    iconPhone: emailAsset("/email/icons/phone.png", preferPublic),
    iconLeaf: emailAsset("/email/icons/leaf.png", preferPublic),
    iconList: emailAsset("/email/icons/list.png", preferPublic),
    iconGlobe: emailAsset("/email/icons/globe.png", preferPublic),
    iconPeople: emailAsset("/email/icons/people.png", preferPublic),
    iconStar: emailAsset("/email/icons/star.png", preferPublic),
    iconAnchor: emailAsset("/email/icons/anchor.png", preferPublic),
  };
}

/** Íconos disponibles en filas de dato del studio de informativos. */
export const DATA_ROW_ICON_OPTIONS = [
  { value: "", label: "Sin ícono" },
  { value: "calendar", label: "Calendario" },
  { value: "pin", label: "Ubicación" },
  { value: "product", label: "Producto" },
  { value: "document", label: "Documento" },
  { value: "cold", label: "Frío" },
  { value: "ship", label: "Barco" },
  { value: "plane", label: "Avión" },
  { value: "truck", label: "Camión" },
  { value: "package", label: "Paquete" },
  { value: "anchor", label: "Puerto" },
  { value: "globe", label: "Mundo" },
  { value: "clock", label: "Reloj" },
  { value: "check", label: "OK" },
  { value: "alert", label: "Alerta" },
  { value: "list", label: "Lista" },
  { value: "mail", label: "Correo" },
  { value: "phone", label: "Teléfono" },
  { value: "people", label: "Personas" },
  { value: "leaf", label: "Agro" },
  { value: "star", label: "Destacado" },
] as const;

export function dataRowIconSrc(
  icon: string | undefined,
  preferPublic = false,
): string {
  const key = (icon || "").trim().toLowerCase();
  const assets = emailAssetUrls(preferPublic);
  const map: Record<string, string> = {
    calendar: assets.iconCalendar,
    pin: assets.iconPin,
    product: assets.iconProduct,
    document: assets.iconDocument,
    cold: assets.iconCold,
    ship: assets.iconShip,
    plane: assets.iconPlane,
    truck: assets.iconTruck,
    package: assets.iconPackage,
    clock: assets.iconClock,
    check: assets.iconCheck,
    alert: assets.iconAlert,
    mail: assets.iconMail,
    phone: assets.iconPhone,
    leaf: assets.iconLeaf,
    list: assets.iconList,
    globe: assets.iconGlobe,
    people: assets.iconPeople,
    star: assets.iconStar,
    anchor: assets.iconAnchor,
  };
  return map[key] ?? "";
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
