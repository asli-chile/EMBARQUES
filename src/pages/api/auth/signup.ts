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

export const POST: APIRoute = async ({ request, cookies }) => {
  const formData = await request.formData();
  const email = (formData.get("email") as string | null)?.trim();
  const password = formData.get("password") as string | null;
  const name = (formData.get("name") as string | null)?.trim();

  if (!email) {
    return new Response(
      JSON.stringify({ success: false, error: "Correo requerido" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!password?.trim()) {
    return new Response(
      JSON.stringify({ success: false, error: "Contraseña requerida" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (password.length < 6) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "La contraseña debe tener al menos 6 caracteres",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!isSupabaseConfigured()) {
    return new Response(
      JSON.stringify({ success: false, error: SUPABASE_NOT_CONFIGURED }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(cookies);
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name || undefined } },
  });

  if (error) {
    const msg = error.message.includes("already registered")
      ? "Este correo ya está registrado"
      : error.message;
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, redirect: "/auth/login?registered=true" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
