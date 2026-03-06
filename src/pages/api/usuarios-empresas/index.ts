import type { APIRoute, AstroCookies } from "astro";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function trim(s: string): string {
  return s.replace(/^\s+|\s+$/g, "");
}

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function requireSuperadmin(cookies: AstroCookies) {
  const supabase = createClient(cookies);
  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser();
  if (sessionError || !user) {
    return { authorized: false as const, status: 401, error: "Inicia sesión" };
  }
  const { data: perfil, error } = await supabase
    .from("usuarios")
    .select("rol, activo")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  if (error || !perfil) {
    return { authorized: false as const, status: 403, error: "Perfil no encontrado o inactivo" };
  }
  const rol = (perfil.rol ?? "") as string;
  if (trim(rol) !== "superadmin") {
    return { authorized: false as const, status: 403, error: "Solo superadmin" };
  }
  const admin = createAdminClient();
  return { authorized: true as const, admin };
}

export const GET: APIRoute = async ({ cookies }) => {
  const auth = await requireSuperadmin(cookies);
  if (!auth.authorized) {
    return jsonResponse({ error: auth.error }, auth.status);
  }
  const { admin } = auth;

  const [usuariosRes, empresasRes, ueRes] = await Promise.all([
    admin.from("usuarios").select("id, email, nombre, rol, activo, auth_id").order("nombre"),
    admin.from("empresas").select("id, nombre").order("nombre"),
    admin.from("usuarios_empresas").select("usuario_id, empresa_id"),
  ]);

  if (usuariosRes.error) {
    return jsonResponse({ error: usuariosRes.error.message }, 500);
  }
  if (empresasRes.error) {
    return jsonResponse({ error: empresasRes.error.message }, 500);
  }

  const empresasPorUsuario: Record<string, string[]> = {};
  (ueRes.data ?? []).forEach((r: { usuario_id: string; empresa_id: string }) => {
    if (!empresasPorUsuario[r.usuario_id]) empresasPorUsuario[r.usuario_id] = [];
    empresasPorUsuario[r.usuario_id].push(r.empresa_id);
  });

  return jsonResponse({
    usuarios: usuariosRes.data ?? [],
    empresas: empresasRes.data ?? [],
    empresasPorUsuario,
  });
};

export const PATCH: APIRoute = async ({ request, cookies }) => {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return jsonResponse({ error: "Content-Type: application/json" }, 400);
  }
  const auth = await requireSuperadmin(cookies);
  if (!auth.authorized) {
    return jsonResponse({ error: auth.error }, auth.status);
  }
  const { admin } = auth;

  const body = (await request.json()) as { id?: string; rol?: string; empresaIds?: string[] };
  const id = body.id;
  const rol = typeof body.rol === "string" ? body.rol.trim() : undefined;
  const empresaIds = Array.isArray(body.empresaIds) ? body.empresaIds.filter((x) => typeof x === "string") : undefined;

  if (!id || typeof id !== "string") {
    return jsonResponse({ error: "id requerido" }, 400);
  }

  const ROLES = ["superadmin", "admin", "ejecutivo", "operador", "cliente", "usuario"];
  if (rol && !ROLES.includes(rol)) {
    return jsonResponse({ error: "Rol inválido" }, 400);
  }

  if (rol) {
    const { error: updErr } = await admin.from("usuarios").update({ rol }).eq("id", id);
    if (updErr) return jsonResponse({ error: updErr.message }, 400);
  }

  const rolFinal = rol ?? (await admin.from("usuarios").select("rol").eq("id", id).single()).data?.rol;
  await admin.from("usuarios_empresas").delete().eq("usuario_id", id);
  if ((rolFinal === "cliente" || rolFinal === "ejecutivo") && empresaIds && empresaIds.length > 0) {
    const rows = empresaIds.map((empresa_id) => ({ usuario_id: id, empresa_id }));
    await admin.from("usuarios_empresas").insert(rows);
  }

  return jsonResponse({ ok: true });
};
