import type { APIRoute } from "astro";
import { createAdminClient } from "@/lib/supabase/admin";
import { PASSWORD_MIN_LENGTH, PASSWORD_MIN_LENGTH_MESSAGE } from "@/lib/auth/password";

const json = (data: { success: boolean; error?: string; message?: string }, status: number) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

function isSupabaseConfigured(): boolean {
  return !!(
    import.meta.env.PUBLIC_SUPABASE_URL?.trim() &&
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

export const POST: APIRoute = async ({ request }) => {
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
  if (password.length < PASSWORD_MIN_LENGTH)
    return json({ success: false, error: PASSWORD_MIN_LENGTH_MESSAGE }, 400);

  if (!isSupabaseConfigured()) {
    return json(
      {
        success: false,
        error: "Servicio no configurado. Contacta al administrador.",
      },
      500,
    );
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.functions.invoke("access-request", {
      body: { name, email, password },
    });

    if (error) {
      const msg = error.message?.includes("FunctionsFetchError")
        ? "No se pudo enviar la solicitud. La función de correo no está disponible."
        : error.message || "Error al enviar la solicitud";
      return json({ success: false, error: msg }, 502);
    }

    const result = data as { success?: boolean; error?: string } | null;
    if (!result?.success) {
      return json(
        {
          success: false,
          error: result?.error || "No se pudo enviar la solicitud de acceso",
        },
        502,
      );
    }

    return json(
      {
        success: true,
        message:
          "Solicitud enviada. Te contactaremos por correo cuando tu acceso esté listo.",
      },
      200,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error inesperado al enviar la solicitud";
    return json({ success: false, error: msg }, 500);
  }
};
