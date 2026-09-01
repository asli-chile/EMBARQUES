import type { SupabaseClient } from "@supabase/supabase-js";

export type NavieraCatalogRow = {
  id: string;
  nombre: string;
  modo_transporte?: string | null;
};

export type UpsertNavieraParams = {
  nombre: string;
  modoTransporte?: "maritimo" | "aereo";
};

export type UpsertNavieraResult =
  | { naviera: NavieraCatalogRow; created: boolean }
  | { error: string };

function isDuplicateError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "23505" ||
    Boolean(error.message?.toLowerCase().includes("duplicate")) ||
    Boolean(error.message?.toLowerCase().includes("unique"))
  );
}

export async function upsertNaviera(
  admin: SupabaseClient,
  params: UpsertNavieraParams,
): Promise<UpsertNavieraResult> {
  const nombre = params.nombre.trim().toUpperCase();
  if (!nombre) return { error: "Nombre de naviera requerido" };

  const { data: existing } = await admin
    .from("navieras")
    .select("id, nombre, modo_transporte")
    .ilike("nombre", nombre)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return { naviera: existing as NavieraCatalogRow, created: false };
  }

  const insertPayload: Record<string, unknown> = { nombre, activo: true };
  if (params.modoTransporte) insertPayload.modo_transporte = params.modoTransporte;

  const { data, error } = await admin
    .from("navieras")
    .insert(insertPayload)
    .select("id, nombre, modo_transporte")
    .single();

  if (error) {
    if (isDuplicateError(error)) {
      const { data: retry } = await admin
        .from("navieras")
        .select("id, nombre, modo_transporte")
        .ilike("nombre", nombre)
        .limit(1)
        .maybeSingle();
      if (!retry?.id) return { error: error.message };
      return { naviera: retry as NavieraCatalogRow, created: false };
    }
    return { error: error.message };
  }

  if (!data) return { error: "No se pudo crear la naviera" };
  return { naviera: data as NavieraCatalogRow, created: true };
}
