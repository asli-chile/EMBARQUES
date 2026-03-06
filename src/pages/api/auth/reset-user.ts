import type { APIRoute } from "astro";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function isSupabaseConfigured(): boolean {
  return !!(
    import.meta.env.PUBLIC_SUPABASE_URL?.trim() &&
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

function isAdminConfigured(): boolean {
  return !!import.meta.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
}

/**
 * Resetear usuario: borra todas las asociaciones (empresas) y establece una nueva contraseña.
 * Mantiene nombre, email y rol. Solo superadmin.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return new Response(
      JSON.stringify({ success: false, error: "Content-Type debe ser application/json" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!isSupabaseConfigured() || !isAdminConfigured()) {
    return new Response(
      JSON.stringify({ success: false, error: "API de administración no configurada" }),
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
      JSON.stringify({ success: false, error: "Debes iniciar sesión" }),
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
      JSON.stringify({ success: false, error: "Solo el superadmin puede resetear usuarios" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { usuarioId?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "JSON inválido" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const usuarioId = typeof body.usuarioId === "string" ? body.usuarioId.trim() : undefined;
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : undefined;

  if (!usuarioId) {
    return new Response(
      JSON.stringify({ success: false, error: "ID de usuario requerido" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!newPassword || newPassword.length < 6) {
    return new Response(
      JSON.stringify({ success: false, error: "La nueva contraseña debe tener al menos 6 caracteres" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: usuario, error: usuarioError } = await adminClient
    .from("usuarios")
    .select("id, email, auth_id")
    .eq("id", usuarioId)
    .single();

  if (usuarioError || !usuario) {
    return new Response(
      JSON.stringify({ success: false, error: "Usuario no encontrado" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const authId = usuario.auth_id as string | null;
  if (!authId) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Este usuario no tiene cuenta vinculada. Usa «Activar cuenta» para crear una.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 1. Borrar asignaciones a empresas
  const { error: deleteUeError } = await adminClient
    .from("usuarios_empresas")
    .delete()
    .eq("usuario_id", usuarioId);

  if (deleteUeError) {
    return new Response(
      JSON.stringify({ success: false, error: "Error al borrar asignaciones: " + deleteUeError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. Actualizar contraseña
  const { error: updateError } = await adminClient.auth.admin.updateUserById(authId, {
    password: newPassword,
  });

  if (updateError) {
    return new Response(
      JSON.stringify({ success: false, error: updateError.message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
