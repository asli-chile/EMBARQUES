import type { APIRoute } from "astro";
import { isPasswordLongEnough, PASSWORD_MIN_LENGTH_MESSAGE } from "@/lib/auth/password";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return new Response(
      JSON.stringify({ success: false, error: "Content-Type debe ser application/json" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const auth = await requireSuperadmin(cookies);
  if (!auth.authorized) {
    return new Response(
      JSON.stringify({ success: false, error: auth.error }),
      { status: auth.status, headers: { "Content-Type": "application/json" } }
    );
  }
  const adminClient = auth.admin;

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
  if (!isPasswordLongEnough(password)) {
    return new Response(
      JSON.stringify({ success: false, error: PASSWORD_MIN_LENGTH_MESSAGE }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: usuario, error: usuarioError } = await adminClient
    .from("usuarios")
    .select("id, email, nombre, rol, auth_id")
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
      rol: (usuario.rol as string) || "usuario",
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
