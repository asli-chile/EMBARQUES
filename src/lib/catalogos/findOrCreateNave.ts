import type { SupabaseClient } from "@supabase/supabase-js";

export type NaveCatalogRow = {
  id: string;
  nombre: string;
  modo_transporte?: string | null;
};

type FindOrCreateNaveParams = {
  nombre: string;
  navieraId?: string;
  modoTransporte?: "maritimo" | "aereo";
};

type FindOrCreateNaveResult =
  | { nave: NaveCatalogRow; created: boolean; linked: boolean }
  | { error: string };

function isDuplicateError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "23505" ||
    Boolean(error.message?.toLowerCase().includes("duplicate")) ||
    Boolean(error.message?.toLowerCase().includes("unique"))
  );
}

/** Reutiliza una nave existente por nombre y la vincula a la naviera si hace falta. */
export async function findOrCreateNave(
  supabase: SupabaseClient,
  params: FindOrCreateNaveParams,
): Promise<FindOrCreateNaveResult> {
  const nombre = params.nombre.trim().toUpperCase();
  if (!nombre) return { error: "Nombre de nave requerido" };

  const { data: existing } = await supabase
    .from("naves")
    .select("id, nombre, modo_transporte")
    .ilike("nombre", nombre)
    .limit(1)
    .maybeSingle();

  let nave: NaveCatalogRow | null = existing as NaveCatalogRow | null;
  let created = false;

  if (!nave?.id) {
    const insertPayload: Record<string, unknown> = { nombre, activo: true };
    if (params.modoTransporte) insertPayload.modo_transporte = params.modoTransporte;

    const { data, error } = await supabase
      .from("naves")
      .insert(insertPayload)
      .select("id, nombre, modo_transporte")
      .single();

    if (error) {
      if (isDuplicateError(error)) {
        const { data: retry } = await supabase
          .from("naves")
          .select("id, nombre, modo_transporte")
          .ilike("nombre", nombre)
          .limit(1)
          .maybeSingle();
        if (!retry?.id) return { error: error.message };
        nave = retry as NaveCatalogRow;
      } else {
        return { error: error.message };
      }
    } else if (data) {
      nave = data as NaveCatalogRow;
      created = true;
    } else {
      return { error: "No se pudo crear la nave" };
    }
  }

  let linked = false;
  if (params.navieraId) {
    const { error: linkError } = await supabase.from("navieras_naves").insert({
      naviera_id: params.navieraId,
      nave_id: nave.id,
      activo: true,
    });

    if (!linkError) {
      linked = true;
    } else if (isDuplicateError(linkError)) {
      linked = true;
    } else {
      return { error: linkError.message };
    }
  }

  return { nave, created, linked };
}
