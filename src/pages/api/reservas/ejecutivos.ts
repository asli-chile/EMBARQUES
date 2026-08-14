import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOperationalRole } from "@/lib/auth/roles";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Ejecutivos activos y mapa empresa → ejecutivos asignados (para nueva reserva). */
export const GET: APIRoute = async ({ cookies }) => {
  const supabase = createClient(cookies);
  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser();
  if (sessionError || !user) return json({ error: "Inicia sesión" }, 401);

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol, activo")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  if (!perfil || !isOperationalRole(perfil.rol as string)) {
    return json({ error: "Sin permiso" }, 403);
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return json({ error: "Configure SUPABASE_SERVICE_ROLE_KEY" }, 503);
  }

  const [usersRes, ueRes] = await Promise.all([
    admin.from("usuarios").select("id, nombre").eq("rol", "ejecutivo").eq("activo", true).order("nombre"),
    admin.from("usuarios_empresas").select("usuario_id, empresa_id"),
  ]);
  if (usersRes.error) return json({ error: usersRes.error.message }, 500);
  if (ueRes.error) return json({ error: ueRes.error.message }, 500);

  const ejecutivoIds = new Set((usersRes.data ?? []).map((u) => u.id));
  const porEmpresa: Record<string, string[]> = {};
  for (const row of ueRes.data ?? []) {
    if (!ejecutivoIds.has(row.usuario_id)) continue;
    const list = porEmpresa[row.empresa_id] ?? [];
    list.push(row.usuario_id);
    porEmpresa[row.empresa_id] = list;
  }

  return json({ ejecutivos: usersRes.data ?? [], porEmpresa });
};
