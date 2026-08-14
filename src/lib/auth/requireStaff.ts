/**
 * Helper para rutas API: exige usuario autenticado con rol staff
 * (superadmin, admin, ejecutivo u operador).
 */
import type { AstroCookies } from "astro";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaffRole } from "@/lib/auth/roles";

function trim(s: string): string {
  return s.replace(/^\s+|\s+$/g, "");
}

export async function requireStaff(cookies: AstroCookies): Promise<
  | { authorized: false; status: 401 | 403 | 503; error: string }
  | { authorized: true; admin: ReturnType<typeof createAdminClient>; rol: string }
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
  if (!isStaffRole(rol)) {
    return { authorized: false, status: 403, error: "Sin permisos para esta acción" };
  }
  try {
    const admin = createAdminClient();
    return { authorized: true, admin, rol };
  } catch {
    return {
      authorized: false,
      status: 503,
      error: "Configure SUPABASE_SERVICE_ROLE_KEY para acciones de administración",
    };
  }
}
