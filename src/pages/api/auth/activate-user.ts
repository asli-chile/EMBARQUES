import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = createClient(cookies);
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
      JSON.stringify({ success: false, error: "Solo el superadmin puede activar cuentas" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { usuarioId?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "JSON inválido" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const usuarioId = typeof body.usuarioId === "string" ? body.usuarioId.trim() : undefined;
  const password = typeof body.password === "string" ? body.password : undefined;

  if (!usuarioId) {
    return new Response(
      JSON.stringify({ success: false, error: "ID de usuario requerido" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!password || password.length < 6) {
    return new Response(
      JSON.stringify({ success: false, error: "La contraseña debe tener al menos 6 caracteres" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: usuario, error: usuarioError } = await adminClient
    .from("usuarios")
    .select("id, email, nombre, auth_id")
    .eq("id", usuarioId)
    .single();

  if (usuarioError || !usuario) {
    return new Response(
      JSON.stringify({ success: false, error: "Usuario no encontrado" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  if (usuario.auth_id) {
    return new Response(
      JSON.stringify({ success: false, error: "Este usuario ya tiene cuenta activa" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const email = (usuario.email as string)?.trim();
  if (!email) {
    return new Response(
      JSON.stringify({ success: false, error: "El usuario no tiene correo" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let authId: string;

  const { data: newAuthUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      nombre: usuario.nombre || email.split("@")[0],
    },
  });

  if (createError) {
    const alreadyExists =
      createError.message.includes("already been registered") ||
      createError.message.includes("already exists");
    if (alreadyExists) {
      const { data: listData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const existing = listData?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (existing) {
        authId = existing.id;
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            error: "El correo ya está en Auth pero no se pudo vincular. Revisa en Supabase Dashboard.",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ success: false, error: createError.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  } else if (newAuthUser?.user) {
    authId = newAuthUser.user.id;
  } else {
    return new Response(
      JSON.stringify({ success: false, error: "Error al crear la cuenta" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const { error: updateError } = await adminClient
    .from("usuarios")
    .update({ auth_id: authId })
    .eq("id", usuarioId);

  if (updateError) {
    return new Response(
      JSON.stringify({ success: false, error: updateError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, userId: authId }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
