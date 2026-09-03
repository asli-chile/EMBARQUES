import { createClient } from "@/lib/supabase/client";

export interface EmailAttachment {
  name: string;       // filename, ej: "Instructivo_ASLI-2026-001.pdf"
  content: string;    // base64 del archivo
  mimeType: string;   // "application/pdf"
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
  attachments?: EmailAttachment[];
  /**
   * `informaciones`: la Edge Function envía desde el buzón corporativo (p. ej. informaciones@asli.cl),
   * con delegación de dominio en Google Workspace. Otros módulos omiten esto y usan el correo del usuario.
   */
  sendFrom?: "informaciones";
  /**
   * Si true, no se adjunta la firma de Gmail del buzón.
   * Usar en informativos con footer de marca propio.
   */
  skipSignature?: boolean;
}): Promise<{ success: boolean; sender?: string; error?: string }> {
  try {
    const supabase = createClient();

    let { data: sessionData } = await supabase.auth.getSession();
    let accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      const refreshed = await supabase.auth.refreshSession();
      accessToken = refreshed.data.session?.access_token ?? undefined;
    }
    if (!accessToken) {
      return {
        success: false,
        error: "Debes iniciar sesión para enviar correo. Si ya estás logueado, cierra sesión y vuelve a entrar.",
      };
    }

    const { data, error } = await supabase.functions.invoke("send-email", {
      body: params,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (error) {
      if (import.meta.env.DEV) {
        console.error("[sendEmail] Error:", error);
      }
      return { success: false, error: error.message ?? "Error al invocar el servicio de correo." };
    }

    const result = data as { success: boolean; error?: string; sender?: string };
    if (!result?.success && import.meta.env.DEV) {
      console.error("[sendEmail] Error del servidor:", result?.error);
    }
    if (result?.error && /unauthorized_client|Token Google/i.test(result.error)) {
      return {
        success: false,
        error:
          "Google no autorizó el envío desde esta cuenta. Prueba de nuevo; las solicitudes de cliente se envían desde informaciones@asli.cl.",
      };
    }
    return result ?? { success: false, error: "Respuesta vacía del servidor." };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error de red." };
  }
}
