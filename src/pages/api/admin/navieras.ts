/**
 * API admin: listar navieras (para desplegables en servicios únicos)
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

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const supabase = createClient(cookies);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "No autenticado" }, 401);

    let client: ReturnType<typeof createClient>;
    try {
      client = createAdminClient();
    } catch {
      client = supabase;
    }

    const { data: navieras, error } = await client
      .from("navieras")
      .select("id, nombre")
      .order("nombre", { ascending: true });

    if (error) {
      const isTableMissing = error.message?.includes("does not exist") || error.code === "42P01";
      return json(
        {
          error: isTableMissing ? "La tabla navieras no existe. Ejecute las migraciones de Supabase." : error.message,
          code: isTableMissing ? "TABLE_NOT_FOUND" : error.code,
        },
        isTableMissing ? 404 : 500
      );
    }
    return json({ success: true, navieras: navieras ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado";
    return json({ error: msg }, 500);
  }
};
