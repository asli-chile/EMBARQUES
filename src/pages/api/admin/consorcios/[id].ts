/**
 * API admin: actualizar o eliminar un consorcio por ID.
 * PUT/DELETE: solo superadmin.
 */
import type { APIRoute } from "astro";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";

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

  try {
    const auth = await requireSuperadmin(cookies);
    if (!auth.authorized) return json({ error: auth.error }, auth.status);
    const { admin } = auth;

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

  try {
    const auth = await requireSuperadmin(cookies);
    if (!auth.authorized) return json({ error: auth.error }, auth.status);
    const { admin } = auth;

    const { error: deleteErr } = await admin.from("consorcios").delete().eq("id", id);

    if (deleteErr) return json({ error: deleteErr.message }, 400);
    return json({ success: true }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado";
    return json({ error: msg }, 500);
  }
};
