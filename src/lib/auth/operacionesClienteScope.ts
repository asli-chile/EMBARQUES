/**
 * Alcance de operaciones/reservas según empresas asignadas (usuarios_empresas).
 * Cliente y ejecutivo solo ven las empresas que tienen asignadas.
 */
export type OperacionesClienteScope = {
  isCliente: boolean;
  isEjecutivo?: boolean;
  empresaNombres: string[];
};

/** Cliente o ejecutivo sin empresas asignadas: no debe cargar operaciones. */
export function shouldSkipOperacionesForCliente(scope: OperacionesClienteScope): boolean {
  const scoped = scope.isCliente || scope.isEjecutivo === true;
  return scoped && scope.empresaNombres.length === 0;
}

/** Aplica filtro por nombre de empresa en operaciones.cliente. */
export function applyOperacionesClienteFilter<Q extends { in: (column: string, values: string[]) => Q }>(
  query: Q,
  scope: OperacionesClienteScope,
): Q {
  if (scope.empresaNombres.length > 0) {
    return query.in("cliente", scope.empresaNombres);
  }
  return query;
}

export function isClienteNombrePermitido(nombre: string | null | undefined, empresaNombres: string[]): boolean {
  if (!nombre) return false;
  return empresaNombres.includes(nombre);
}
