import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase/server";

const MYSHIP_BASE = "https://api.myshiptracking.com/api/v2";

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isValidMmsi(s: string) {
  if (!/^\d{1,9}$/.test(s)) return false;
  const n = Number(s);
  return n >= 1 && n <= 999999999;
}

function isValidImo(s: string) {
  return /^\d{7}$/.test(s);
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

  const mmsiRaw = (url.searchParams.get("mmsi") ?? "").trim();
  const imoRaw = (url.searchParams.get("imo") ?? "").trim();

  if ((mmsiRaw && imoRaw) || (!mmsiRaw && !imoRaw)) {
    return json({ ok: false, code: "VALIDATION", message: "Indica MMSI o IMO (solo uno)" }, 400);
  }

  let query = "";
  if (mmsiRaw) {
    if (!isValidMmsi(mmsiRaw)) {
      return json({ ok: false, code: "VALIDATION", message: "MMSI inválido" }, 400);
    }
    query = `mmsi=${encodeURIComponent(mmsiRaw)}`;
  } else if (!isValidImo(imoRaw)) {
    return json({ ok: false, code: "VALIDATION", message: "IMO inválido" }, 400);
  } else {
    query = `imo=${encodeURIComponent(imoRaw)}`;
  }

  const responseType = url.searchParams.get("response") === "extended" ? "extended" : "simple";
  const upstreamUrl = `${MYSHIP_BASE}/vessel?${query}&response=${responseType}`;

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
        return json(
          { ok: false, code: body.code, message: body.message ?? "Buque no encontrado o sin cobertura" },
          404,
        );
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

    if (!body.data || typeof body.data !== "object") {
      return json({ ok: false, code: "BAD_RESPONSE", message: "Respuesta inválida" }, 502);
    }

    return json({ ok: true, data: body.data });
  } catch {
    return json({ ok: false, code: "NETWORK", message: "Error de conexión" }, 502);
  }
};
