/** Roles internos de ASLI. No incluye cliente ni el rol residual «usuario». */
export const STAFF_ROLES = ["superadmin", "admin", "ejecutivo", "operador"] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export function isStaffRole(rol: string | null | undefined): boolean {
  return !!rol && (STAFF_ROLES as readonly string[]).includes(rol);
}

export function isClienteRole(rol: string | null | undefined): boolean {
  return rol === "cliente";
}

/** Puede usar módulos operativos (reservas propias o trabajo interno). */
export function isOperationalRole(rol: string | null | undefined): boolean {
  return isStaffRole(rol) || isClienteRole(rol);
}
