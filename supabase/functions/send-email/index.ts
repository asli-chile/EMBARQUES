import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // ── 1. Extraer JWT y decodificar user ID directamente ──────────────────
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader) return json({ success: false, error: "Sin header de autorización" }, 401);

    const jwt = authHeader.replace(/^Bearer\s+/i, "");

    // Decodificar payload del JWT (base64url) sin verificar firma —
    // Supabase ya verificó el token antes de llegar aquí (auth_user en logs)
    let userId: string;
    let userEmail: string | undefined;
    try {
      const parts = jwt.split(".");
      if (parts.length !== 3) throw new Error("JWT malformado");
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      userId    = payload.sub as string;
      userEmail = payload.email as string | undefined;
      if (!userId) throw new Error("sin sub");
    } catch {
      return json({ success: false, error: "JWT inválido" }, 401);
    }

    // ── 2. Obtener email del ejecutivo desde usuarios (service role) ────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: perfil } = await supabaseAdmin
      .from("usuarios")
      .select("email, nombre")
      .eq("auth_id", userId)
      .single();

    const senderEmail = perfil?.email ?? userEmail;
    const senderName  = perfil?.nombre ?? senderEmail;
    if (!senderEmail) return json({ success: false, error: "No se encontró el email del usuario" }, 400);

    // ── 3. Leer cuerpo de la solicitud ────────────────────────────────────
    const { to, subject, body } = await req.json() as {
      to: string; subject: string; body: string;
    };
    if (!to || !subject || !body) return json({ success: false, error: "Faltan campos: to, subject, body" }, 400);

    // ── 4. Obtener token de servicio con impersonación del ejecutivo ───────
    const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT");
    if (!saJson) return json({ success: false, error: "GOOGLE_SERVICE_ACCOUNT no configurado" }, 500);

    const sa = JSON.parse(saJson);
    const accessToken = await getServiceAccountToken(sa, senderEmail);

    // ── 5. Enviar vía Gmail API como el ejecutivo ──────────────────────────
    const raw = buildRawEmail(senderEmail, senderName ?? senderEmail, to, subject, body);
    const gmailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(senderEmail)}/messages/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      }
    );

    if (!gmailRes.ok) {
      const errText = await gmailRes.text();
      console.error("Gmail API error:", errText);
      return json({ success: false, error: `Gmail API: ${gmailRes.status} — ${errText.slice(0, 200)}` }, 500);
    }

    return json({ success: true, sender: senderEmail });
  } catch (e) {
    console.error("Edge function error:", e);
    return json({ success: false, error: e instanceof Error ? e.message : "Error interno" }, 500);
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function getServiceAccountToken(sa: Record<string, string>, impersonateEmail: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header  = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss:   sa.client_email,
    sub:   impersonateEmail,
    scope: "https://www.googleapis.com/auth/gmail.send",
    aud:   "https://oauth2.googleapis.com/token",
    iat:   now,
    exp:   now + 3600,
  }));

  const sigInput = `${header}.${payload}`;

  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\n/g, "");

  const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const privateKey = await crypto.subtle.importKey(
    "pkcs8", keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );

  const sigBytes = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", privateKey,
    new TextEncoder().encode(sigInput)
  );
  const sig = b64url(new Uint8Array(sigBytes));
  const jwtToken = `${sigInput}.${sig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwtToken}`,
  });

  const data = await res.json() as { access_token?: string; error?: string; error_description?: string };
  if (!data.access_token) {
    throw new Error(`Token Google: ${data.error ?? ""} — ${data.error_description ?? JSON.stringify(data)}`);
  }
  return data.access_token;
}

function b64url(input: string | Uint8Array): string {
  const str = typeof input === "string"
    ? btoa(unescape(encodeURIComponent(input)))
    : btoa(String.fromCharCode(...input));
  return str.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function buildRawEmail(fromEmail: string, fromName: string, to: string, subject: string, body: string): string {
  const lines = [
    `From: ${fromName} <${fromEmail}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    body,
  ].join("\r\n");
  return b64url(lines);
}
