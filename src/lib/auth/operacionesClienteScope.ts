/**
 * Alcance de operaciones/reservas según empresas asignadas (usuarios_empresas).
 * Cliente y ejecutivo solo ven las empresas que tienen asignadas.
 * COPEFRUT y otros clientes ocultos se excluyen siempre.
 */
import { CLIENTE_OCULTO_ILIKE, filterNombresVisibles } from "@/lib/clientesOcultos";

export type OperacionesClienteScope = {
  isCliente: boolean;
  isEjecutivo?: boolean;
  empresaNombres: string[];
};

type QueryConFiltros = {
  in: (column: string, values: string[]) => QueryConFiltros;
  not: (column: string, op: string, value: string) => QueryConFiltros;
};

/** Cliente o ejecutivo sin empresas asignadas: no debe cargar operaciones. */
export function shouldSkipOperacionesForCliente(scope: OperacionesClienteScope): boolean {
  const scoped = scope.isCliente || scope.isEjecutivo === true;
  return scoped && filterNombresVisibles(scope.empresaNombres).length === 0;
}

/** Excluye clientes ocultos (p. ej. COPEFRUT) de cualquier query de operaciones. */
export function excludeClientesOcultos<Q extends { not: (column: string, op: string, value: string) => Q }>(
  query: Q,
): Q {
  return query.not("cliente", "ilike", CLIENTE_OCULTO_ILIKE);
}

/** Aplica filtro por nombre de empresa y oculta clientes reservados. */
export function applyOperacionesClienteFilter<Q extends QueryConFiltros>(
  query: Q,
  scope: OperacionesClienteScope,
): Q {
  let q = excludeClientesOcultos(query);
  const visibles = filterNombresVisibles(scope.empresaNombres);
  if (visibles.length > 0) {
    q = q.in("cliente", visibles) as Q;
  }
  return q;
}

export function isClienteNombrePermitido(nombre: string | null | undefined, empresaNombres: string[]): boolean {
  if (!nombre) return false;
  return filterNombresVisibles(empresaNombres).includes(nombre);
}
