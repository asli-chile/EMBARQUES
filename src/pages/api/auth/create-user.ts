import type { APIRoute } from "astro";
import { PASSWORD_MIN_LENGTH, PASSWORD_MIN_LENGTH_MESSAGE } from "@/lib/auth/password";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";

const ROLES = ["superadmin", "admin", "ejecutivo", "operador", "cliente", "usuario"] as const;

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
  if (password.length < PASSWORD_MIN_LENGTH) {
    return new Response(
      JSON.stringify({ success: false, error: PASSWORD_MIN_LENGTH_MESSAGE }),
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
