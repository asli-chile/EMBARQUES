import type { APIRoute } from "astro";
import { createAnonClient } from "@/lib/supabase/admin";
import { loadPublicItinerariosWithEscalas } from "@/lib/itinerarios-public-query";

export const prerender = false;

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = async () => {
  try {
    const supabase = createAnonClient();
    const result = await loadPublicItinerariosWithEscalas(supabase);
    if (!result.ok) {
      if (result.code === "TABLE_NOT_FOUND") {
        return jsonResponse({ code: result.code, error: result.message }, result.status);
      }
      return jsonResponse({ error: result.message }, result.status);
    }
    return jsonResponse({ success: true, itinerarios: result.itinerarios });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error interno";
    return jsonResponse({ error: msg }, 500);
  }
};
