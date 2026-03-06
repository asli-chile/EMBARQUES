import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase/server";

const SUPABASE_NOT_CONFIGURED =
  "Autenticación no configurada. Configura PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY en .env";

function isSupabaseConfigured(): boolean {
  return !!(
    import.meta.env.PUBLIC_SUPABASE_URL?.trim() &&
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

const json = (data: { success: boolean; error?: string; redirect?: string }, status: number) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

export const POST: APIRoute = async ({ request, cookies }) => {
  let email: string | null = null;
  let password: string | null = null;
  let name: string | null = null;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    email = (body.email as string)?.trim() ?? null;
    password = body.password ?? null;
    name = (body.name as string)?.trim() ?? null;
  } else {
    const formData = await request.formData().catch(() => null);
    if (formData) {
      email = (formData.get("email") as string | null)?.trim() ?? null;
      password = formData.get("password") as string | null;
      name = (formData.get("name") as string | null)?.trim() ?? null;
    }
  }

  if (!email) return json({ success: false, error: "Correo requerido" }, 400);
  if (!password?.trim()) return json({ success: false, error: "Contraseña requerida" }, 400);
  if (password.length < 6)
    return json({ success: false, error: "La contraseña debe tener al menos 6 caracteres" }, 400);

  if (!isSupabaseConfigured()) return json({ success: false, error: SUPABASE_NOT_CONFIGURED }, 500);

  try {
    const supabase = createClient(cookies);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name || undefined } },
    });

    if (error) {
      const msg =
        error.message.includes("already registered") || error.message.includes("already been registered")
          ? "Este correo ya está registrado"
          : error.message.includes("Signups not allowed") || error.message.includes("signup")
            ? "Registro deshabilitado. Contacta al administrador o habilita signups en Supabase."
            : error.message;
      return json({ success: false, error: msg }, 400);
    }

    return json({ success: true, redirect: "/auth/login?registered=true" }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error inesperado al crear la cuenta";
    return json({ success: false, error: msg }, 500);
  }
};
