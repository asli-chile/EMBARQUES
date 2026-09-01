import type { AstroCookies } from "astro";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/auth/AuthContext";

export type PageSession = {
  user: { id: string; email: string } | null;
  profile: { rol: UserRole; email: string; activo: boolean } | null;
};

const EMPTY_SESSION: PageSession = { user: null, profile: null };

/** Resuelve sesión y perfil activo para guards de página (sin service_role). */
export async function resolvePageSession(cookies: AstroCookies): Promise<PageSession> {
  try {
    const supabase = createClient(cookies);
    const {
      data: { user },
      error: sessionError,
    } = await supabase.auth.getUser();

    if (sessionError || !user) {
      return EMPTY_SESSION;
    }

    const { data: perfil } = await supabase
      .from("usuarios")
      .select("rol, email, activo")
      .eq("auth_id", user.id)
      .eq("activo", true)
      .maybeSingle();

    if (!perfil) {
      return {
        user: { id: user.id, email: user.email ?? "" },
        profile: null,
      };
    }

    return {
      user: { id: user.id, email: user.email ?? "" },
      profile: {
        rol: perfil.rol as UserRole,
        email: (perfil.email as string) ?? user.email ?? "",
        activo: perfil.activo === true,
      },
    };
  } catch {
    return EMPTY_SESSION;
  }
}
