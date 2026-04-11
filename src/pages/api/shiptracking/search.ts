import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase/server";

const MYSHIP_BASE = "https://api.myshiptracking.com/api/v2";

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const supabase = createClient(cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return json({ ok: false, code: "UNAUTHORIZED", message: "Se requiere sesión" }, 401);
  }

  const apiKey = import.meta.env.MYSHIPTRACKING_API_KEY;
  if (!apiKey) {
    return json({ ok: false, code: "NO_CONFIG", message: "AIS no configurado" }, 503);
  }

  const name = (url.searchParams.get("name") ?? "").trim();
  if (name.length < 3) {
    return json({ ok: false, code: "VALIDATION", message: "Mínimo 3 caracteres" }, 400);
  }
  if (name.length > 120) {
    return json({ ok: false, code: "VALIDATION", message: "Nombre demasiado largo" }, 400);
  }

  const upstreamUrl = `${MYSHIP_BASE}/vessel/search?name=${encodeURIComponent(name)}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const body = (await upstream.json()) as {
      status: string;
      code?: string;
      message?: string;
      data?: unknown;
    };

    if (body.status === "error") {
      if (body.code === "ERR_VESSEL_NOT_FOUND") {
        return json({ ok: true, data: [] });
      }
      const status =
        body.code === "ERR_RATE_LIMIT"
          ? 429
          : body.code === "ERR_NO_CREDITS"
            ? 402
            : upstream.status >= 400
              ? upstream.status
              : 502;
      return json(
        {
          ok: false,
          code: body.code ?? "UPSTREAM_ERROR",
          message: body.message ?? "Error proveedor AIS",
        },
        status,
      );
    }

    if (!Array.isArray(body.data)) {
      return json({ ok: false, code: "BAD_RESPONSE", message: "Respuesta inválida" }, 502);
    }

    return json({ ok: true, data: body.data });
  } catch {
    return json({ ok: false, code: "NETWORK", message: "Error de conexión" }, 502);
  }
};
