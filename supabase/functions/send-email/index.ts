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
      .select("email, nombre, rol")
      .eq("auth_id", userId)
      .single();

    const profileEmail = perfil?.email ?? userEmail;
    if (!profileEmail) return json({ success: false, error: "No se encontró el email del usuario" }, 400);

    // ── 3. Leer cuerpo de la solicitud ────────────────────────────────────
    const { to, subject, body, attachments, sendFrom } = await req.json() as {
      to: string; subject: string; body: string;
      attachments?: { name: string; content: string; mimeType: string }[];
      /** Solo "informaciones": envía desde buzón corporativo (delegación Google). */
      sendFrom?: string;
    };
    if (!to || !subject || !body) return json({ success: false, error: "Faltan campos: to, subject, body" }, 400);

    const sharedMailbox = (Deno.env.get("GMAIL_SHARED_FROM_EMAIL") ?? "informaciones@asli.cl").trim().toLowerCase();
    const sharedFromName = (Deno.env.get("GMAIL_SHARED_FROM_NAME") ?? "ASLI").trim() || "ASLI";

    let senderEmail = profileEmail;
    let senderName = perfil?.nombre ?? profileEmail;

    if (sendFrom === "informaciones") {
      const rol = perfil?.rol as string | undefined;
      const canUseShared = rol === "ejecutivo" || rol === "admin" || rol === "superadmin";
      if (!canUseShared) {
        return json({ success: false, error: "No autorizado a enviar desde el buzón informativo" }, 403);
      }
      senderEmail = sharedMailbox;
      senderName = sharedFromName;
    }

    // ── 4. Obtener token de servicio con impersonación del ejecutivo ───────
    const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT");
    if (!saJson) return json({ success: false, error: "GOOGLE_SERVICE_ACCOUNT no configurado" }, 500);

    const sa = JSON.parse(saJson);
    const accessToken = await getServiceAccountToken(sa, senderEmail);

    // ── 5. Obtener firma del usuario desde Gmail settings (timeout 3s) ────
    let signatureHtml = "";
    try {
      const sigController = new AbortController();
      const sigTimeout = setTimeout(() => sigController.abort(), 3000);
      const sigRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(senderEmail)}/settings/sendAs/${encodeURIComponent(senderEmail)}`,
        { headers: { Authorization: `Bearer ${accessToken}` }, signal: sigController.signal }
      );
      clearTimeout(sigTimeout);
      if (sigRes.ok) {
        const sigData = await sigRes.json() as { signature?: string };
        signatureHtml = sigData.signature ?? "";
      }
    } catch { /* si falla o timeout, se envía sin firma */ }

    // ── 6. Enviar vía Gmail API como el ejecutivo ──────────────────────────
    const raw = buildRawEmail(senderEmail, senderName ?? senderEmail, to, subject, body, attachments, signatureHtml);
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
    scope: "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.settings.basic",
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
  let str: string;
  if (typeof input === "string") {
    // El contenido es ASCII/latin1 (JWT payload, MIME email) — btoa directo, sin encodeURIComponent
    str = btoa(input);
  } else {
    // Uint8Array en chunks para evitar stack overflow con arrays grandes
    const chunkSize = 8192;
    let binary = "";
    for (let i = 0; i < input.length; i += chunkSize) {
      binary += String.fromCharCode(...input.subarray(i, Math.min(i + chunkSize, input.length)));
    }
    str = btoa(binary);
  }
  return str.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function buildRawEmail(
  fromEmail: string, fromName: string,
  to: string, subject: string, body: string,
  attachments?: { name: string; content: string; mimeType: string }[],
  signatureHtml?: string,
): string {
  const boundary    = "----=_Part_" + Math.random().toString(36).slice(2);
  const altBoundary = "----=_Alt_"  + Math.random().toString(36).slice(2);
  const hasAtt = attachments && attachments.length > 0;
  const hasSig = !!signatureHtml;

  // Si body empieza con "<" es HTML; si no, convertir texto plano a HTML
  const isHtml = body.trimStart().startsWith("<");
  const plainText = isHtml ? "Abre este correo en un cliente que soporte HTML para ver el contenido." : body;
  const bodyHtmlContent = isHtml
    ? body
    : body.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g, "<br>\r\n");
  const htmlPart = hasSig
    ? `${bodyHtmlContent}<br><br>${signatureHtml}`
    : bodyHtmlContent;

  const headers = [
    `From: ${fromName} <${fromEmail}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
  ];

  let raw: string;

  if (!hasAtt) {
    // Sin adjuntos: multipart/alternative (plain + html)
    raw = [
      ...headers,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      ``,
      `--${altBoundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      plainText,
      `--${altBoundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      htmlPart,
      `--${altBoundary}--`,
    ].join("\r\n");
  } else {
    // Con adjuntos: multipart/mixed > multipart/alternative + adjuntos
    const parts: string[] = [
      ...headers,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      ``,
      `--${altBoundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      plainText,
      `--${altBoundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      htmlPart,
      `--${altBoundary}--`,
    ];

    for (const att of attachments) {
      parts.push(
        `--${boundary}`,
        `Content-Type: ${att.mimeType}; name="${att.name}"`,
        `Content-Disposition: attachment; filename="${att.name}"`,
        `Content-Transfer-Encoding: base64`,
        ``,
        att.content.match(/.{1,76}/g)?.join("\r\n") ?? att.content,
      );
    }

    parts.push(`--${boundary}--`);
    raw = parts.join("\r\n");
  }

  // Encode as UTF-8 bytes so btoa doesn't fail on non-Latin1 chars (em dash, smart quotes, etc.)
  return b64url(new TextEncoder().encode(raw));
}
