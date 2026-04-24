import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase/server";
import { parseStackingDatesFromText } from "@/lib/stacking-parse";

const DOCLING_TIMEOUT_MS = 30000;

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createClient(cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json({ ok: false, code: "UNAUTHORIZED", message: "Se requiere sesión" }, 401);
  }

  const serviceUrlRaw = import.meta.env.DOCLING_SERVICE_URL;
  if (!serviceUrlRaw) {
    return json(
      { ok: false, code: "NO_CONFIG", message: "Servicio Docling no configurado" },
      503,
    );
  }

  const serviceUrl = serviceUrlRaw.replace(/\/+$/, "");
  const body = (await request.json().catch(() => null)) as { imageUrl?: unknown } | null;
  const imageUrl = typeof body?.imageUrl === "string" ? body.imageUrl.trim() : "";

  if (!imageUrl) {
    return json({ ok: false, code: "VALIDATION", message: "imageUrl es requerido" }, 400);
  }

  try {
    const upstream = await fetch(`${serviceUrl}/extract-stacking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl }),
      signal: AbortSignal.timeout(DOCLING_TIMEOUT_MS),
    });

    const payload = (await upstream.json().catch(() => null)) as
      | { text?: unknown; markdown?: unknown; message?: unknown }
      | null;

    if (!upstream.ok) {
      const upstreamMessage = payload && typeof payload === "object" ? payload["message"] : null;
      const message =
        typeof upstreamMessage === "string" && upstreamMessage.trim()
          ? upstreamMessage
          : "Error al procesar imagen en Docling";
      return json({ ok: false, code: "UPSTREAM_ERROR", message }, upstream.status);
    }

    const rawText =
      typeof payload?.text === "string"
        ? payload.text
        : typeof payload?.markdown === "string"
          ? payload.markdown
          : "";

    if (!rawText.trim()) {
      return json(
        { ok: false, code: "EMPTY_TEXT", message: "Docling no retornó texto útil" },
        422,
      );
    }

    return json({
      ok: true,
      engine: "docling",
      text: rawText,
      parsed: parseStackingDatesFromText(rawText),
    });
  } catch {
    return json({ ok: false, code: "NETWORK", message: "No se pudo conectar con Docling" }, 502);
  }
};
