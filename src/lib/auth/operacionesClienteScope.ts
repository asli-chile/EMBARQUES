/**
 * Alcance de operaciones/reservas según rol cliente y empresas asignadas (usuarios_empresas).
 */
export type OperacionesClienteScope = {
  isCliente: boolean;
  empresaNombres: string[];
};

/** Cliente sin empresas asignadas: no debe cargar operaciones. */
export function shouldSkipOperacionesForCliente(scope: OperacionesClienteScope): boolean {
  return scope.isCliente && scope.empresaNombres.length === 0;
}

/** Aplica filtro por nombre de empresa en operaciones.cliente. */
export function applyOperacionesClienteFilter<Q extends { in: (column: string, values: string[]) => Q }>(
  query: Q,
  scope: OperacionesClienteScope,
): Q {
  if (scope.isCliente || scope.empresaNombres.length > 0) {
    return query.in("cliente", scope.empresaNombres);
  }
  return query;
}

export function isClienteNombrePermitido(nombre: string | null | undefined, empresaNombres: string[]): boolean {
  if (!nombre) return false;
  return empresaNombres.includes(nombre);
}
