import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function isSupabaseConfigured(): boolean {
  return !!(
    import.meta.env.PUBLIC_SUPABASE_URL?.trim() &&
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return new Response(
      JSON.stringify({ success: false, verified: false, error: "Content-Type debe ser application/json" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!isSupabaseConfigured()) {
    return new Response(
      JSON.stringify({ success: false, verified: false, error: "Supabase no configurado" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createServerClient(cookies);
  const {
    data: { user: currentUser },
    error: sessionError,
  } = await supabase.auth.getUser();

  if (sessionError || !currentUser) {
    return new Response(
      JSON.stringify({ success: false, verified: false, error: "Debes iniciar sesión" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const adminClient = createAdminClient();
  const { data: perfil } = await adminClient
    .from("usuarios")
    .select("rol")
    .eq("auth_id", currentUser.id)
    .single();

  if (!perfil || perfil.rol !== "superadmin") {
    return new Response(
      JSON.stringify({ success: false, verified: false, error: "Solo el superadmin puede verificar contraseñas" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { usuarioId?: string; currentPassword?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, verified: false, error: "JSON inválido" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const usuarioId = typeof body.usuarioId === "string" ? body.usuarioId.trim() : undefined;
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : undefined;

  if (!usuarioId || !currentPassword) {
    return new Response(
      JSON.stringify({ success: false, verified: false, error: "Usuario y contraseña requeridos" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: usuario, error: usuarioError } = await adminClient
    .from("usuarios")
    .select("id, email, auth_id")
    .eq("id", usuarioId)
    .single();

  if (usuarioError || !usuario?.auth_id) {
    return new Response(
      JSON.stringify({ success: false, verified: false, error: "Usuario no encontrado o sin cuenta vinculada" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const url = import.meta.env.PUBLIC_SUPABASE_URL ?? "";
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? "";
  const tempClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: signInError } = await tempClient.auth.signInWithPassword({
    email: usuario.email as string,
    password: currentPassword,
  });

  if (signInError) {
    return new Response(
      JSON.stringify({ success: false, verified: false, error: "Contraseña actual incorrecta" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, verified: true }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
