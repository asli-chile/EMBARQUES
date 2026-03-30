/**
 * Acceso a la sección «Cartolas a Nubox».
 * Solo estos correos (tabla usuarios o sesión Supabase) ven el menú y la ruta.
 * Nota: reforzar con RLS/API si en el futuro esta sección expone datos sensibles.
 */
export const CARTOLAS_NUBOX_ALLOWED_EMAILS = [
  "rodrigo.caceres@asli.cl",
  "stefanie.cordova@asli.cl",
] as const;

export function canAccessCartolasNubox(email: string | null | undefined): boolean {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) return false;
  return CARTOLAS_NUBOX_ALLOWED_EMAILS.some((a) => a.toLowerCase() === e);
}
