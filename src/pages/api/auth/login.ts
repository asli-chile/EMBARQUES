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
  const contentType = request.headers.get("content-type") ?? "";
  let email: string | null = null;
  let password: string | null = null;
  if (contentType.includes("application/json")) {
    try {
      const body = (await request.json()) as { email?: string; password?: string };
      email = (body?.email ?? "").trim() || null;
      password = (body?.password ?? null) ?? null;
    } catch {
      email = null;
      password = null;
    }
  } else {
    const formData = await request.formData();
    email = (formData.get("email") as string | null)?.trim() || null;
    password = formData.get("password") as string | null;
  }

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
