/**
 * Herramientas personales de Rodrigo en la barra superior (uso de Claude,
 * estado de los deploys). Se decide por el correo del usuario autenticado, no
 * por el perfil efectivo: "ver como" no debe esconderlas ni mostrárselas a otro.
 *
 * Esto solo decide qué se pinta. Si una de estas piezas lee algo privado, la
 * barrera va en la base (ver `claude_uso`, que filtra por RLS).
 */
export const CORREO_DUENO = "rodrigo.caceres@asli.cl";

export function esDueno(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === CORREO_DUENO;
}
