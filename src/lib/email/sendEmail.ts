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
}): Promise<{ success: boolean; sender?: string; error?: string }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.functions.invoke("send-email", {
      body: params,
    });

    if (error) {
      console.error("[sendEmail] Error:", error);
      return { success: false, error: error.message ?? "Error al invocar el servicio de correo." };
    }

    const result = data as { success: boolean; error?: string; sender?: string };
    if (!result?.success) console.error("[sendEmail] Error del servidor:", result?.error);
    return result ?? { success: false, error: "Respuesta vacía del servidor." };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error de red." };
  }
}
