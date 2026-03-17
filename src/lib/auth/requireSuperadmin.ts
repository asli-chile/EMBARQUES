/**
 * Helper para rutas API: exige que el usuario autenticado sea superadmin.
 * Uso: const auth = await requireSuperadmin(cookies); if (!auth.authorized) return json({ error: auth.error }, auth.status);
 */
import type { AstroCookies } from "astro";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function trim(s: string): string {
  return s.replace(/^\s+|\s+$/g, "");
}

export async function requireSuperadmin(cookies: AstroCookies): Promise<
  | { authorized: false; status: 401 | 403; error: string }
  | { authorized: true; admin: ReturnType<typeof createAdminClient> }
> {
  const supabase = createClient(cookies);
  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser();
  if (sessionError || !user) {
    return { authorized: false, status: 401, error: "Inicia sesión" };
  }
  const { data: perfil, error } = await supabase
    .from("usuarios")
    .select("rol, activo")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  if (error || !perfil) {
    return { authorized: false, status: 403, error: "Perfil no encontrado o inactivo" };
  }
  const rol = (perfil.rol ?? "") as string;
  if (trim(rol) !== "superadmin") {
    return { authorized: false, status: 403, error: "Solo superadmin puede realizar esta acción" };
  }
  const admin = createAdminClient();
  return { authorized: true, admin };
}
