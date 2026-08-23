/** Clientes ocultos por defecto (siguen en BD; no se listan ni se consultan). */

export const CLIENTE_OCULTO_ILIKE = "%COPEFRUT%";

export function isNombreClienteOculto(nombre: string | null | undefined): boolean {
  if (!nombre) return false;
  return nombre.toLowerCase().includes("copefrut");
}

export function filterNombresVisibles(nombres: string[]): string[] {
  return nombres.filter((n) => !isNombreClienteOculto(n));
}

export function filterRowsByNombreVisible<T>(
  rows: T[],
  getNombre: (row: T) => string | null | undefined,
): T[] {
  return rows.filter((row) => !isNombreClienteOculto(getNombre(row)));
}
