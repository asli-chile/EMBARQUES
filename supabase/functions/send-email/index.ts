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
    if (!authHeader) return json({ success: false, error: "Sin header de autorización" });

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
      return json({ success: false, error: "JWT inválido" });
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
    if (!profileEmail) return json({ success: false, error: "No se encontró el email del usuario" });

    // ── 3. Leer cuerpo de la solicitud ────────────────────────────────────
    const { to, subject, body, attachments, sendFrom, skipSignature } = await req.json() as {
      to: string; subject: string; body: string;
      attachments?: { name: string; content: string; mimeType: string }[];
      /** Solo "informaciones": envía desde buzón corporativo (delegación Google). */
      sendFrom?: string;
      /** Si true, no se adjunta la firma HTML del buzón Gmail (p. ej. informativos con footer de marca). */
      skipSignature?: boolean;
    };
    if (!to || !subject || !body) return json({ success: false, error: "Faltan campos: to, subject, body" });

    const sharedMailbox = (Deno.env.get("GMAIL_SHARED_FROM_EMAIL") ?? "informaciones@asli.cl").trim().toLowerCase();
    const sharedFromName = (Deno.env.get("GMAIL_SHARED_FROM_NAME") ?? "ASLI").trim() || "ASLI";

    let senderEmail = profileEmail;
    let senderName = perfil?.nombre ?? profileEmail;
    const profileEmailLower = (profileEmail ?? "").trim().toLowerCase();
    const isAsliMailbox = profileEmailLower.endsWith("@asli.cl");

    const wantsShared = sendFrom === "informaciones" || !isAsliMailbox;
    if (wantsShared) {
      senderEmail = sharedMailbox;
      senderName = sharedFromName;
    }

    // ── 4. Obtener token de servicio con impersonación ────────────────────
    const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT");
    if (!saJson) return json({ success: false, error: "GOOGLE_SERVICE_ACCOUNT no configurado" });

    const sa = JSON.parse(saJson);
    let accessToken: string;
    try {
      accessToken = await getServiceAccountToken(sa, senderEmail);
    } catch (tokenErr) {
      const tokenMsg = tokenErr instanceof Error ? tokenErr.message : String(tokenErr);
      const canFallback = senderEmail.toLowerCase() !== sharedMailbox && /unauthorized_client/i.test(tokenMsg);
      if (!canFallback) throw tokenErr;
      console.error("Impersonación falló, se usa buzón compartido:", senderEmail, tokenMsg);
      senderEmail = sharedMailbox;
      senderName = sharedFromName;
      accessToken = await getServiceAccountToken(sa, sharedMailbox);
    }

    // ── 5. Obtener firma del usuario desde Gmail settings (timeout 3s) ────
    let signatureHtml = "";
    if (!skipSignature) {
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
    }

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
      return json({ success: false, error: `Gmail API ${gmailRes.status}: ${errText.slice(0, 300)}` });
    }

    return json({ success: true, sender: senderEmail });
  } catch (e) {
    console.error("Edge function error:", e);
    return json({ success: false, error: e instanceof Error ? e.message : "Error interno" });
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function getServiceAccountToken(
  sa: Record<string, string>,
  impersonateEmail: string,
  scope = "https://www.googleapis.com/auth/gmail.send",
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const privateKeyPem = (sa.private_key ?? "").replace(/\\n/g, "\n");

  const header  = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss:   sa.client_email,
    sub:   impersonateEmail,
    scope,
    aud:   "https://oauth2.googleapis.com/token",
    iat:   now,
    exp:   now + 3600,
  }));

  const sigInput = `${header}.${payload}`;

  const pemBody = privateKeyPem
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
    throw new Error(`Token Google (${impersonateEmail}): ${data.error ?? ""} — ${data.error_description ?? JSON.stringify(data)}`);
  }
  return data.access_token;
}

function bytesToBinary(bytes: Uint8Array): string {
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)),
    );
  }
  return binary;
}

function b64url(input: string | Uint8Array): string {
  let str: string;
  if (typeof input === "string") {
    // JWT / ASCII — btoa directo
    str = btoa(input);
  } else {
    str = btoa(bytesToBinary(input));
  }
  return str.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/** RFC 2047 encoded-word para Subject / display-name con tildes. */
function encodeRfc2047(text: string): string {
  const clean = text.replace(/[\r\n]+/g, " ").trim();
  if (!/[^\x00-\x7F]/.test(clean)) return clean;
  const b64 = btoa(bytesToBinary(new TextEncoder().encode(clean)));
  // Partir en trozos para no superar ~75 chars por línea de header
  const chunks: string[] = [];
  for (let i = 0; i < b64.length; i += 45) {
    chunks.push(`=?UTF-8?B?${b64.slice(i, i + 45)}?=`);
  }
  return chunks.join(" ");
}

function encodeMimeAddress(name: string, email: string): string {
  const n = name.replace(/[\r\n]+/g, " ").trim();
  if (!n) return email;
  if (!/[^\x00-\x7F]/.test(n) && !/[<>\\"]/.test(n)) return `${n} <${email}>`;
  return `${encodeRfc2047(n)} <${email}>`;
}

function encodeBase64Mime(text: string): string {
  const b64 = btoa(bytesToBinary(new TextEncoder().encode(text)));
  return b64.match(/.{1,76}/g)?.join("\r\n") ?? b64;
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
    `From: ${encodeMimeAddress(fromName, fromEmail)}`,
    `To: ${to}`,
    `Subject: ${encodeRfc2047(subject)}`,
    `MIME-Version: 1.0`,
  ];

  const altParts = [
    `--${altBoundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    encodeBase64Mime(plainText),
    `--${altBoundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    encodeBase64Mime(htmlPart),
    `--${altBoundary}--`,
  ];

  let raw: string;

  if (!hasAtt) {
    raw = [
      ...headers,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      ``,
      ...altParts,
    ].join("\r\n");
  } else {
    const parts: string[] = [
      ...headers,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      ``,
      ...altParts,
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

  // El MIME ya va en ASCII (headers RFC2047 + bodies base64); bytes UTF-8 por seguridad
  return b64url(new TextEncoder().encode(raw));
}
