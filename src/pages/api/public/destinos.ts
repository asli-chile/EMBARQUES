/**
 * API pública: listar destinos del catálogo (tabla destinos).
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
  let db;
  try {
    db = createAnonClient();
  } catch (envErr) {
    const msg = envErr instanceof Error ? envErr.message : "Configuración de Supabase faltante";
    return json({ error: msg }, 503);
  }
  try {
    const { data: destinos, error } = await db
      .from("destinos")
      .select("id, nombre, codigo_puerto, pais")
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (error) {
      const isTableMissing = error.message?.includes("does not exist") || error.code === "42P01";
      return json(
        { error: isTableMissing ? "La tabla destinos no existe." : error.message },
        isTableMissing ? 404 : 500
      );
    }
    return json({ success: true, destinos: destinos ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado";
    return json({ error: msg }, 500);
  }
};
