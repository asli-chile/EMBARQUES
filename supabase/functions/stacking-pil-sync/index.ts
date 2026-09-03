import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-stacking-token",
};

const BUCKET = "stacking-navieras";
const DEFAULT_MAILBOX = "rodrigo.caceres@asli.cl";
const DEFAULT_FROM = "valentina.parra@chl.pilship.com";
const DEFAULT_SUBJECT = "STACKING";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "Solo POST" }, 405);

  try {
    const authError = authorize(req);
    if (authError) return authError;

    const body = await safeJson(req);
    const mailbox = String(body.recipient || Deno.env.get("STACKING_PIL_MAILBOX") || DEFAULT_MAILBOX).trim().toLowerCase();
    const from = String(body.from || DEFAULT_FROM).trim();
    const subjectIncludes = String(body.subjectIncludes || DEFAULT_SUBJECT).trim();

    const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT");
    if (!saJson) return json({ ok: false, error: "GOOGLE_SERVICE_ACCOUNT no configurado" }, 500);

    const sa = JSON.parse(saJson);
    const accessToken = await getServiceAccountToken(sa, mailbox, "https://www.googleapis.com/auth/gmail.readonly");

    const query = `from:${from} subject:${subjectIncludes} has:attachment`;
    const listed = await gmailJson(
      accessToken,
      `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(mailbox)}/messages?q=${encodeURIComponent(query)}&maxResults=1`,
    );

    const messageId = listed.messages?.[0]?.id as string | undefined;
    if (!messageId) {
      return json({ ok: false, error: `No hay correos en ${mailbox} de ${from} con asunto ${subjectIncludes}` }, 404);
    }

    const message = await gmailJson(
      accessToken,
      `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(mailbox)}/messages/${messageId}?format=full`,
    );

    const pdfPart = findPdfPart(message.payload);
    if (!pdfPart?.body?.attachmentId) {
      return json({ ok: false, error: "Correo encontrado, pero sin PDF adjunto" }, 404);
    }

    const attachment = await gmailJson(
      accessToken,
      `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(mailbox)}/messages/${messageId}/attachments/${pdfPart.body.attachmentId}`,
    );

    const pdfBytes = fromBase64Url(String(attachment.data || ""));
    if (!pdfBytes.length) return json({ ok: false, error: "El adjunto PDF llegó vacío" }, 502);

    const headers = Object.fromEntries(
      (message.payload?.headers || []).map((h: { name?: string; value?: string }) => [
        String(h.name || "").toLowerCase(),
        h.value || "",
      ]),
    );
    const subject = headers.subject || null;
    const sentAt = message.internalDate
      ? new Date(Number(message.internalDate)).toISOString()
      : null;
    const originalFileName = cleanFileName(pdfPart.filename || "stacking-pil.pdf");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await ensureBucket(supabase);

    const now = new Date();
    const y = String(now.getUTCFullYear());
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const d = String(now.getUTCDate()).padStart(2, "0");
    const stamp = now.toISOString().replace(/[:.]/g, "-");
    const versionedPath = `pil/${y}/${m}/${d}/${stamp}-${originalFileName}`;
    const latestPath = "pil/latest.pdf";
    const metadataPath = "pil/latest.json";

    await uploadBytes(supabase, versionedPath, pdfBytes, "application/pdf");
    await uploadBytes(supabase, latestPath, pdfBytes, "application/pdf");

    const metadata = {
      source: {
        from,
        subjectIncludes,
        recipient: mailbox,
        messageId,
        subject,
        sentAt,
      },
      latestPath,
      versionedPath,
      originalFileName,
      syncedAt: now.toISOString(),
    };

    await uploadBytes(
      supabase,
      metadataPath,
      new TextEncoder().encode(JSON.stringify(metadata, null, 2)),
      "application/json",
    );

    return json({
      ok: true,
      message: "Stacking PIL sincronizado",
      data: { ...metadata, appUrl: "/stacking/pil" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    const needsScope = /unauthorized_client|insufficientPermissions|accessNotConfigured|invalid_grant|gmail.readonly/i.test(message);
    let serviceAccountEmail = null;
    try {
      serviceAccountEmail = JSON.parse(Deno.env.get("GOOGLE_SERVICE_ACCOUNT") || "{}").client_email || null;
    } catch {
      /* ignore */
    }
    return json({
      ok: false,
      error: needsScope
        ? "Google Workspace no autorizó lectura de Gmail. Agrega el scope gmail.readonly a la cuenta de servicio (misma delegación de dominio que send-email)."
        : message,
      detail: message,
      serviceAccountEmail,
    }, 500);
  }
});

function authorize(req: Request) {
  const token = (req.headers.get("x-stacking-token") || "").trim();
  const expected = (Deno.env.get("STACKING_SYNC_TOKEN") || "").trim();
  if (expected && token === expected) return null;

  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader) return json({ ok: false, error: "Sin autorización" }, 401);

  try {
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const parts = jwt.split(".");
    if (parts.length !== 3) throw new Error("JWT malformado");
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.role !== "service_role") return json({ ok: false, error: "No autorizado" }, 403);
    return null;
  } catch {
    return json({ ok: false, error: "JWT inválido" }, 401);
  }
}

async function safeJson(req: Request) {
  try {
    const text = await req.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function gmailJson(accessToken: string, url: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`Gmail API ${res.status}: ${text.slice(0, 400)}`);
  }
  return data as Record<string, any>;
}

function findPdfPart(part: any): any | null {
  if (!part) return null;
  const mime = String(part.mimeType || "").toLowerCase();
  const name = String(part.filename || "").toLowerCase();
  if (part.body?.attachmentId && (mime.includes("pdf") || name.endsWith(".pdf"))) {
    return part;
  }
  for (const child of part.parts || []) {
    const found = findPdfPart(child);
    if (found) return found;
  }
  return null;
}

function cleanFileName(name: string) {
  return String(name || "stacking.pdf")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]/g, "_");
}

function fromBase64Url(input: string) {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const binary = atob(b64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function ensureBucket(supabase: ReturnType<typeof createClient>) {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (data) return;
  const created = await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 20971520,
    allowedMimeTypes: ["application/pdf", "application/json"],
  });
  if (created.error && !/already exists/i.test(created.error.message)) {
    throw new Error(`No se pudo crear el bucket ${BUCKET}: ${created.error.message}`);
  }
}

async function uploadBytes(
  supabase: ReturnType<typeof createClient>,
  path: string,
  bytes: Uint8Array,
  contentType: string,
) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`No se pudo subir ${path}: ${error.message}`);
}

async function getServiceAccountToken(
  sa: Record<string, string>,
  impersonateEmail: string,
  scope: string,
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
  const jwtToken = `${sigInput}.${b64url(new Uint8Array(sigBytes))}`;

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
