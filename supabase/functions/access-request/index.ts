const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_NOTIFY_EMAIL = "rodrigo.caceres@asli.cl";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader) return json({ success: false, error: "Sin autorización" }, 401);

    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    let role: string | undefined;
    try {
      const parts = jwt.split(".");
      if (parts.length !== 3) throw new Error("JWT malformado");
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      role = payload.role as string | undefined;
    } catch {
      return json({ success: false, error: "JWT inválido" }, 401);
    }

    if (role !== "service_role") {
      return json({ success: false, error: "No autorizado" }, 403);
    }

    const { name, email, password } = await req.json() as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!email?.trim() || !password?.trim()) {
      return json({ success: false, error: "Faltan correo o contraseña" }, 400);
    }

    const notifyTo = (Deno.env.get("ACCESS_REQUEST_NOTIFY_EMAIL") ?? DEFAULT_NOTIFY_EMAIL).trim();
    const sharedMailbox = (Deno.env.get("GMAIL_SHARED_FROM_EMAIL") ?? "informaciones@asli.cl").trim().toLowerCase();

    const requesterEmail = email.trim().toLowerCase();
    const requesterName = (name ?? "").trim() || requesterEmail;
    const isAsliMailbox = requesterEmail.endsWith("@asli.cl");

    const subject = `[EMBARQUES] Nueva solicitud de acceso — ${requesterEmail}`;
    const body = [
      "Nueva solicitud de acceso a la plataforma EMBARQUES.",
      "",
      `Nombre: ${requesterName}`,
      `Correo: ${requesterEmail}`,
      `Contraseña solicitada: ${password}`,
      "",
      "Crea el usuario manualmente en el panel de administración y responde al solicitante por correo cuando el acceso esté listo.",
    ].join("\n");

    const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT");
    if (!saJson) return json({ success: false, error: "GOOGLE_SERVICE_ACCOUNT no configurado" }, 500);

    const sa = JSON.parse(saJson);

    // @asli.cl: envío real desde el buzón del solicitante (delegación Google Workspace).
    // Otros dominios: no se puede impersonar; se usa Reply-To para que «Responder» vaya al solicitante.
    let senderEmail = isAsliMailbox ? requesterEmail : sharedMailbox;
    let senderName = isAsliMailbox ? requesterName : `${requesterName} (solicitud acceso)`;
    let replyTo: string | undefined = isAsliMailbox ? undefined : requesterEmail;

    let accessToken: string;
    try {
      accessToken = await getServiceAccountToken(sa, senderEmail);
    } catch (tokenErr) {
      if (!isAsliMailbox) throw tokenErr;
      const tokenMsg = tokenErr instanceof Error ? tokenErr.message : String(tokenErr);
      console.error("Impersonación @asli.cl falló, se usa buzón compartido:", requesterEmail, tokenMsg);
      senderEmail = sharedMailbox;
      senderName = `${requesterName} (solicitud acceso)`;
      replyTo = requesterEmail;
      accessToken = await getServiceAccountToken(sa, sharedMailbox);
    }

    const raw = buildRawEmail(senderEmail, senderName, notifyTo, subject, body, replyTo);
    const gmailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(senderEmail)}/messages/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      },
    );

    if (!gmailRes.ok) {
      const errText = await gmailRes.text();
      console.error("Gmail API error:", errText);
      return json({ success: false, error: `Gmail API ${gmailRes.status}` }, 502);
    }

    return json({ success: true, sentTo: notifyTo, sentFrom: senderEmail, replyTo: replyTo ?? senderEmail });
  } catch (e) {
    console.error("access-request error:", e);
    return json({ success: false, error: e instanceof Error ? e.message : "Error interno" }, 500);
  }
});

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

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss: sa.client_email,
    sub: impersonateEmail,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));

  const sigInput = `${header}.${payload}`;
  const pemBody = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\n/g, "");

  const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sigBytes = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(sigInput),
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
    str = btoa(input);
  } else {
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
  fromEmail: string,
  fromName: string,
  to: string,
  subject: string,
  body: string,
  replyTo?: string,
): string {
  const altBoundary = "----=_Alt_" + Math.random().toString(36).slice(2);
  const plainText = body;
  const htmlPart = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>\r\n");

  const headers = [
    `From: ${fromName} <${fromEmail}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
  ];
  if (replyTo) {
    headers.push(`Reply-To: ${fromName} <${replyTo}>`);
  }

  const raw = [
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

  return b64url(new TextEncoder().encode(raw));
}
