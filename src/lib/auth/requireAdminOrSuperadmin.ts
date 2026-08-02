/**
 * Helper para rutas API: exige superadmin o admin.
 */
import type { AstroCookies } from "astro";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function trim(s: string): string {
  return s.replace(/^\s+|\s+$/g, "");
}

export async function requireAdminOrSuperadmin(cookies: AstroCookies): Promise<
  | { authorized: false; status: 401 | 403 | 503; error: string }
  | { authorized: true; admin: ReturnType<typeof createAdminClient>; userId: string; rol: string }
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
  const rol = trim((perfil.rol ?? "") as string);
  if (rol !== "superadmin" && rol !== "admin") {
    return { authorized: false, status: 403, error: "Solo administradores pueden realizar esta acción" };
  }
  try {
    const admin = createAdminClient();
    return { authorized: true, admin, userId: user.id, rol };
  } catch {
    return {
      authorized: false,
      status: 503,
      error: "Configure SUPABASE_SERVICE_ROLE_KEY para acciones de administración",
    };
  }
}
