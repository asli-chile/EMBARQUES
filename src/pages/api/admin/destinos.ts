/**
 * API admin: crear destino en el catálogo (tabla destinos).
 * POST body: { nombre: string, codigo_puerto?: string, pais?: string }
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

export const POST: APIRoute = async ({ cookies, request }) => {
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

    const body = (await request.json()) as Record<string, unknown>;
    const nombre = (body.nombre as string)?.trim();
    if (!nombre) return json({ error: "Nombre del destino requerido" }, 400);

    let admin: ReturnType<typeof createAdminClient>;
    try {
      admin = createAdminClient();
    } catch {
      return json(
        { error: "Configure SUPABASE_SERVICE_ROLE_KEY para crear destinos en el catálogo." },
        503
      );
    }

    const codigo_puerto = (body.codigo_puerto as string)?.trim() || null;
    const pais = (body.pais as string)?.trim() || null;

    const { data: existing } = await admin
      .from("destinos")
      .select("id, nombre")
      .ilike("nombre", nombre)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const { data: full } = await admin
        .from("destinos")
        .select("id, nombre, codigo_puerto, pais")
        .eq("id", existing.id)
        .single();
      return json({ success: true, destino: full ?? existing }, 200);
    }

    const { data: inserted, error: insErr } = await admin
      .from("destinos")
      .insert({ nombre, codigo_puerto, pais, activo: true })
      .select("id, nombre, codigo_puerto, pais")
      .single();

    if (insErr || !inserted) return json({ error: insErr?.message ?? "Error al crear destino" }, 400);
    return json({ success: true, destino: inserted }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado";
    return json({ error: msg }, 500);
  }
};
