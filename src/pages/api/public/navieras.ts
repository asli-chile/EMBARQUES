/**
 * API pública: listar navieras (solo lectura, RLS permite anon).
 * Usado por el formulario de servicios únicos para el desplegable.
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

export const GET: APIRoute = async () => {
  let supabase;
  try {
    supabase = createAnonClient();
  } catch (envErr) {
    const msg = envErr instanceof Error ? envErr.message : "Configuración de Supabase faltante";
    return json({ error: msg }, 503);
  }
  try {
    const { data: navieras, error } = await supabase
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
