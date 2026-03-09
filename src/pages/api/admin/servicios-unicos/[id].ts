/**
 * API admin: actualizar un servicio único por ID.
 * PUT body: { nombre, naviera_id, puerto_origen, naves: string[], destinos: { puerto, puerto_nombre?, area? }[] }
 */
import type { APIRoute } from "astro";
import { normalizeArea } from "@/lib/areas";
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
  if (!id) return json({ error: "ID de servicio requerido" }, 400);

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
        { error: "Configure SUPABASE_SERVICE_ROLE_KEY para editar servicios." },
        503
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const { nombre, naviera_id, naviera_nombre, puerto_origen, naves, destinos } = body;

    if (!(nombre as string)?.trim()) return json({ error: "Nombre requerido" }, 400);
    if (!naviera_id) return json({ error: "Naviera requerida" }, 400);
    const nombreNaviera = (naviera_nombre as string)?.trim() ?? "";
    const navesList = naves as unknown[];
    if (!navesList?.length) return json({ error: "Al menos una nave" }, 400);
    const destinosList = destinos as unknown[];
    if (!destinosList?.length) return json({ error: "Al menos un destino" }, 400);
    if (!(puerto_origen as string)?.trim()) return json({ error: "Puerto de origen requerido" }, 400);

    const { error: updateErr } = await admin
      .from("servicios_unicos")
      .update({
        nombre: (nombre as string).trim(),
        naviera_id,
        naviera_nombre: nombreNaviera,
        puerto_origen: (puerto_origen as string).trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateErr) return json({ error: updateErr.message }, 400);

    await admin.from("servicios_unicos_naves").delete().eq("servicio_unico_id", id);
    await admin.from("servicios_unicos_destinos").delete().eq("servicio_unico_id", id);

    const navesToInsert = navesList.map((n: unknown, i: number) => ({
      servicio_unico_id: id,
      nave_nombre: (typeof n === "string" ? n : (n as Record<string, unknown>)?.nave_nombre ?? n)?.trim?.() ?? String(n),
      activo: true,
      orden: i,
    }));
    const destinosToInsert = destinosList.map((d: unknown, i: number) => {
      const dd = d as Record<string, unknown>;
      return {
        servicio_unico_id: id,
        puerto: String(dd.puerto ?? d ?? "").trim(),
        puerto_nombre: (dd.puerto_nombre as string)?.trim() ?? null,
        area: normalizeArea(dd.area),
        orden: i,
        activo: true,
      };
    });

    await admin.from("servicios_unicos_naves").insert(navesToInsert);
    await admin.from("servicios_unicos_destinos").insert(destinosToInsert);

    const { data: updated } = await admin.from("servicios_unicos").select("*").eq("id", id).single();
    return json({ success: true, servicio: updated }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado";
    return json({ error: msg }, 500);
  }
};

export const DELETE: APIRoute = async ({ cookies, params }) => {
  const id = params.id;
  if (!id) return json({ error: "ID de servicio requerido" }, 400);

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
        { error: "Configure SUPABASE_SERVICE_ROLE_KEY para eliminar servicios." },
        503
      );
    }

    const { error: deleteErr } = await admin.from("servicios_unicos").delete().eq("id", id);

    if (deleteErr) return json({ error: deleteErr.message }, 400);
    return json({ success: true }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado";
    return json({ error: msg }, 500);
  }
};
