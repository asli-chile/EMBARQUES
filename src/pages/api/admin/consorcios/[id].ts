/**
 * API admin: actualizar o eliminar un consorcio por ID.
 * PUT body: { nombre, servicios_ids: string[] }
 * DELETE: elimina el consorcio y sus relaciones (CASCADE).
 */
import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const PUT: APIRoute = async ({ cookies, params, request }) => {
  const id = params.id;
  if (!id) return json({ error: "ID de consorcio requerido" }, 400);

  let supabase: ReturnType<typeof createClient>;
  try {
    supabase = createClient(cookies);
  } catch (envErr) {
    const msg = envErr instanceof Error ? envErr.message : "Configuración de Supabase faltante";
    return json({ error: msg }, 503);
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "No autenticado" }, 401);

    let admin: ReturnType<typeof createAdminClient>;
    try {
      admin = createAdminClient();
    } catch {
      return json(
        { error: "Configure SUPABASE_SERVICE_ROLE_KEY para editar consorcios." },
        503
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const nombre = (body.nombre as string)?.trim();
    const serviciosIds = body.servicios_ids as string[] | undefined;

    if (!nombre) return json({ error: "Nombre del consorcio requerido" }, 400);

    const { error: updateErr } = await admin
      .from("consorcios")
      .update({ nombre, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateErr) return json({ error: updateErr.message }, 400);

    await admin.from("consorcios_servicios").delete().eq("consorcio_id", id);

    if (Array.isArray(serviciosIds) && serviciosIds.length > 0) {
      const filas = serviciosIds.map((servicioId, i) => ({
        consorcio_id: id,
        servicio_unico_id: servicioId,
        orden: i,
        activo: true,
      }));
      const { error: insErr } = await admin.from("consorcios_servicios").insert(filas);
      if (insErr) return json({ error: insErr.message }, 400);
    }

    const { data: updated } = await admin.from("consorcios").select("*").eq("id", id).single();
    return json({ success: true, consorcio: updated }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado";
    return json({ error: msg }, 500);
  }
};

export const DELETE: APIRoute = async ({ cookies, params }) => {
  const id = params.id;
  if (!id) return json({ error: "ID de consorcio requerido" }, 400);

  let supabase: ReturnType<typeof createClient>;
  try {
    supabase = createClient(cookies);
  } catch (envErr) {
    const msg = envErr instanceof Error ? envErr.message : "Configuración de Supabase faltante";
    return json({ error: msg }, 503);
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "No autenticado" }, 401);

    let admin: ReturnType<typeof createAdminClient>;
    try {
      admin = createAdminClient();
    } catch {
      return json(
        { error: "Configure SUPABASE_SERVICE_ROLE_KEY para eliminar consorcios." },
        503
      );
    }

    const { error: deleteErr } = await admin.from("consorcios").delete().eq("id", id);

    if (deleteErr) return json({ error: deleteErr.message }, 400);
    return json({ success: true }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado";
    return json({ error: msg }, 500);
  }
};
