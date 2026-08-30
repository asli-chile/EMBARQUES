import type { SupabaseClient } from "@supabase/supabase-js";

export type Temporada = {
  id: string;
  nombre: string;
  descripcion: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activa: boolean;
  cerrada: boolean;
  orden: number | null;
};

export const TEMPORADA_TODAS = "__todas__";

const COLUMNS = "id, nombre, descripcion, fecha_inicio, fecha_fin, activa, cerrada, orden";

/** Lista las temporadas: activa primero, luego por orden y nombre descendente (más reciente arriba). */
export async function listarTemporadas(
  supabase: SupabaseClient
): Promise<{ temporadas: Temporada[]; error: string | null }> {
  const { data, error } = await supabase
    .from("temporadas")
    .select(COLUMNS)
    .order("activa", { ascending: false })
    .order("orden", { ascending: true, nullsFirst: false })
    .order("nombre", { ascending: false });

  if (error) return { temporadas: [], error: error.message };
  return { temporadas: (data ?? []) as Temporada[], error: null };
}

export function temporadaActiva(temporadas: Temporada[]): Temporada | null {
  return temporadas.find((tp) => tp.activa) ?? null;
}

/**
 * Restringe una query de operaciones a una temporada. Sin temporada definida
 * devuelve la query intacta, para no dejar los módulos en blanco.
 *
 * `columna` permite filtrar a través de una relación, p. ej. "operaciones.temporada".
 *
 * El cast evita que el genérico recursivo de PostgREST haga explotar la
 * inferencia de tipos en las queries largas de los módulos.
 */
export function aplicarFiltroTemporada<Q>(query: Q, temporada: string | null, columna = "temporada"): Q {
  if (!temporada) return query;
  return (query as unknown as { eq: (columna: string, valor: string) => Q }).eq(columna, temporada);
}
