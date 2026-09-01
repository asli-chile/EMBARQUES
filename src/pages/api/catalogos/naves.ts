/**
 * Crear o vincular nave en catálogo (reservas / proformas).
 * POST: cualquier usuario autenticado activo (incluye clientes).
 */
import type { APIRoute } from "astro";
import { requireAuthenticatedUser } from "@/lib/auth/requireAuthenticated";
import { upsertNaveForNaviera } from "@/lib/catalogos/naveNavieraServer";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const auth = await requireAuthenticatedUser(cookies);
    if (!auth.authorized) return json({ error: auth.error }, auth.status);

    const body = (await request.json()) as Record<string, unknown>;
    const nombre = (body.nombre as string)?.trim();
    const navieraId = (body.naviera_id as string | undefined)?.trim() || undefined;
    const modoRaw = (body.modo_transporte as string | undefined)?.trim();
    const modoTransporte =
      modoRaw === "aereo" || modoRaw === "maritimo" ? modoRaw : undefined;

    if (!nombre) return json({ error: "Nombre de la nave requerido" }, 400);

    const result = await upsertNaveForNaviera(auth.admin, {
      nombre,
      navieraId,
      modoTransporte,
    });

    if ("error" in result) return json({ error: result.error }, 400);

    return json(
      {
        success: true,
        nave: result.nave,
        created: result.created,
        linked: result.linked,
      },
      result.created ? 201 : 200,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado";
    return json({ error: msg }, 500);
  }
};
