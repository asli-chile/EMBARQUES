/**
 * Requisitos de contraseña compartidos entre las rutas API de auth y los formularios.
 * Mantener el valor en un solo lugar evita que la validación del cliente y la del
 * servidor se desincronicen.
 */
export const PASSWORD_MIN_LENGTH = 12;

export const PASSWORD_MIN_LENGTH_MESSAGE =
  `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`;

export const PASSWORD_MIN_LENGTH_MESSAGE_NEW =
  `La nueva contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`;

export const PASSWORD_PLACEHOLDER = `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`;

export const PASSWORD_PLACEHOLDER_SHORT = `Mín. ${PASSWORD_MIN_LENGTH} caracteres`;

export function isPasswordLongEnough(password: string | null | undefined): boolean {
  return typeof password === "string" && password.length >= PASSWORD_MIN_LENGTH;
}
