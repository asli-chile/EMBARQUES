/**
 * API pública: listar naves del catálogo.
 * Query: ?naviera_id=uuid (opcional) — filtra naves asignadas a esa naviera.
 */
import type { APIRoute } from "astro";
import { createAnonClient } from "@/lib/supabase/admin";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const db = createAnonClient();
    const navieraId = url.searchParams.get("naviera_id")?.trim() || null;

    if (navieraId) {
      const { data: links, error: linkErr } = await db
        .from("navieras_naves")
        .select("nave_id")
        .eq("naviera_id", navieraId);
      if (linkErr) return json({ error: linkErr.message }, 500);
      const naveIds = (links ?? []).map((r: { nave_id: string }) => r.nave_id).filter(Boolean);
      if (naveIds.length === 0) {
        return json({ success: true, naves: [] });
      }
      const { data: naves, error } = await db
        .from("naves")
        .select("id, nombre")
        .in("id", naveIds)
        .order("nombre", { ascending: true });
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, naves: naves ?? [] });
    }

    const { data: naves, error } = await db
      .from("naves")
      .select("id, nombre")
      .order("nombre", { ascending: true });
    if (error) return json({ error: error.message }, 500);
    return json({ success: true, naves: naves ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado";
    return json({ error: msg }, 500);
  }
};
