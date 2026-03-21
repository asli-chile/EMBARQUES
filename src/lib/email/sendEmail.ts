import { createClient } from "@/lib/supabase/client";

export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ success: boolean; sender?: string; error?: string }> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return { success: false, error: "No hay sesión activa." };

    const res = await fetch(
      `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/send-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(params),
      }
    );

    const data = await res.json() as { success: boolean; error?: string; sender?: string };
    return data;
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error de red." };
  }
}
