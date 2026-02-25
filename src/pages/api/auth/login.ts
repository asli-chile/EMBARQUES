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

  if (!isSupabaseConfigured()) {
    return new Response(
      JSON.stringify({ success: false, error: SUPABASE_NOT_CONFIGURED }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(cookies);
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const msg = error.message.includes("Invalid login")
      ? "Correo o contraseña incorrectos"
      : error.message;
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, redirect: "/inicio" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
