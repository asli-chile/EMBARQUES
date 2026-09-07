import type { APIRoute } from "astro";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SIGNUP_EMAIL_RATE,
  SIGNUP_IP_RATE,
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@/lib/auth/rateLimit";

const json = (data: { success: boolean; error?: string; message?: string }, status: number) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

function isSupabaseConfigured(): boolean {
  return !!(
    import.meta.env.PUBLIC_SUPABASE_URL?.trim() &&
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

/**
 * Solicitud de acceso (no crea usuario Auth).
 * Recibe nombre, empresa y correo; notifica al admin por la Edge Function access-request.
 */
export const POST: APIRoute = async ({ request }) => {
  let email: string | null = null;
  let name: string | null = null;
  let company: string | null = null;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    email = (body.email as string)?.trim() ?? null;
    name = (body.name as string)?.trim() ?? null;
    company = (body.company as string)?.trim() ?? null;
  } else {
    const formData = await request.formData().catch(() => null);
    if (formData) {
      email = (formData.get("email") as string | null)?.trim() ?? null;
      name = (formData.get("name") as string | null)?.trim() ?? null;
      company = (formData.get("company") as string | null)?.trim() ?? null;
    }
  }

  if (!name) return json({ success: false, error: "Nombre requerido" }, 400);
  if (!company) return json({ success: false, error: "Empresa requerida" }, 400);
  if (!email) return json({ success: false, error: "Correo requerido" }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ success: false, error: "Correo inválido" }, 400);
  }

  const emailKey = email.toLowerCase();
  const ip = clientIp(request);
  const ipLimit = checkRateLimit(`signup:ip:${ip}`, SIGNUP_IP_RATE.limit, SIGNUP_IP_RATE.windowMs);
  if (!ipLimit.allowed) {
    return rateLimitResponse(
      ipLimit.retryAfterSec,
      `Demasiadas solicitudes desde esta red. Espera ${ipLimit.retryAfterSec}s.`,
    );
  }
  const emailLimit = checkRateLimit(
    `signup:email:${emailKey}`,
    SIGNUP_EMAIL_RATE.limit,
    SIGNUP_EMAIL_RATE.windowMs,
  );
  if (!emailLimit.allowed) {
    return rateLimitResponse(
      emailLimit.retryAfterSec,
      `Demasiadas solicitudes para este correo. Espera ${emailLimit.retryAfterSec}s.`,
    );
  }

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
      body: { name, company, email },
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
