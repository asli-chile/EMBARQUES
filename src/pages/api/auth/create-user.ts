import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ROLES = ["superadmin", "admin", "ejecutivo", "operador", "cliente", "usuario"] as const;

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
      JSON.stringify({ success: false, error: "Solo el superadmin puede crear cuentas" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: {
    email?: string;
    password?: string;
    nombre?: string;
    rol?: string;
    empresaIds?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "JSON inválido" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const email = (body.email as string | undefined)?.trim();
  const password = body.password;
  const nombre = (body.nombre as string | undefined)?.trim();
  const rol = (body.rol as string | undefined)?.trim();
  const empresaIds = Array.isArray(body.empresaIds) ? body.empresaIds : [];

  if (!email) {
    return new Response(
      JSON.stringify({ success: false, error: "Correo requerido" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!password || typeof password !== "string") {
    return new Response(
      JSON.stringify({ success: false, error: "Contraseña requerida" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (password.length < 6) {
    return new Response(
      JSON.stringify({ success: false, error: "La contraseña debe tener al menos 6 caracteres" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!rol || !ROLES.includes(rol as (typeof ROLES)[number])) {
    return new Response(
      JSON.stringify({ success: false, error: "Rol inválido" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if ((rol === "cliente" || rol === "ejecutivo") && empresaIds.length === 0) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Los clientes y ejecutivos deben tener al menos una empresa asignada",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: newAuthUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      nombre: nombre || email.split("@")[0],
      rol,
    },
  });

  if (createError) {
    const msg =
      createError.message.includes("already been registered") || createError.message.includes("already exists")
        ? "Este correo ya está registrado"
        : createError.message;
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!newAuthUser.user) {
    return new Response(
      JSON.stringify({ success: false, error: "Error al crear el usuario" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const authId = newAuthUser.user.id;
  const nombreFinal = nombre || email.split("@")[0];

  let usuarioId: string | undefined;

  const { data: usuarioRow } = await adminClient
    .from("usuarios")
    .select("id")
    .eq("auth_id", authId)
    .single();

  if (usuarioRow?.id) {
    usuarioId = usuarioRow.id;
    // Ensure the rol is correct — the trigger's ON CONFLICT may have preserved an old role
    await adminClient.from("usuarios").update({ rol, activo: true }).eq("id", usuarioId);
  } else {
    const { data: inserted, error: insertErr } = await adminClient
      .from("usuarios")
      .insert({
        auth_id: authId,
        email,
        nombre: nombreFinal,
        rol,
        activo: true,
      })
      .select("id")
      .single();

    if (insertErr) {
      if (insertErr.code === "23505") {
        const { data: existing } = await adminClient
          .from("usuarios")
          .select("id")
          .eq("email", email)
          .single();
        usuarioId = existing?.id;
      }
      if (!usuarioId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Usuario creado en Auth pero falló guardar en tabla usuarios: ${insertErr.message}`,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    } else {
      usuarioId = inserted?.id;
    }
  }

  if (usuarioId && (rol === "cliente" || rol === "ejecutivo") && empresaIds.length > 0) {
    const rows = empresaIds
      .filter((id): id is string => typeof id === "string" && id.length > 0)
      .map((empresaId) => ({ usuario_id: usuarioId!, empresa_id: empresaId }));

    if (rows.length > 0) {
      await adminClient.from("usuarios_empresas").insert(rows);
    }
  }

  return new Response(
    JSON.stringify({ success: true, userId: newAuthUser.user.id }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
