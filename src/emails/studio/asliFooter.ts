/** Datos de pie ASLI (dirección + contacto) para footers de correo. */

export const ASLI_FOOTER = {
  tagline: "Logística y Comercio Exterior",
  address1: "Longitudinal Sur Km. 186",
  address2: "3340000 Curicó, Maule",
  contactName: "Mario Basaez",
  contactPhone: "+56 9 6839 4225",
  contactHref: "https://wa.me/56968394225",
} as const;

export const ASLI_FOOTER_PROPS: Record<string, string> = {
  tagline: ASLI_FOOTER.tagline,
  address1: ASLI_FOOTER.address1,
  address2: ASLI_FOOTER.address2,
  contactName: ASLI_FOOTER.contactName,
  contactPhone: ASLI_FOOTER.contactPhone,
};
