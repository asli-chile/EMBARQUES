/**
 * Botón de "correo de prueba" del Panel de Rastreo.
 *
 * Corre el chequeo diario en modo de prueba (`sin_gasto=1`): no consulta al
 * proveedor, reutiliza lecturas ya guardadas, y el reporte va **solo a quien
 * lo pide**, sin copia al resto del equipo (ver `chequeo-diario.ts`). No cuesta
 * nada: ni un crédito del proveedor ni un correo de más para Hans y Mario.
 *
 * Antes de este botón, probar esto era armar un `curl` a mano con el secreto
 * del cron. Existe para no depender de la terminal, y solo superadmin puede
 * apretarlo: es la misma llave que abre el cron, y no conviene ponerla al
 * alcance de cualquiera solo porque el botón es gratis.
 *
 * No reimplementa el chequeo: lo llama por HTTP, con el secreto que ya vive en
 * las variables de entorno del servidor y nunca viaja al navegador.
 */
import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { textoDeEntorno } from "@/lib/navitrack/config";

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
  if (!user) return json({ ok: false, code: "UNAUTHORIZED" }, 401);

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  if (!perfil || String(perfil.rol ?? "").trim() !== "superadmin") {
    return json({ ok: false, code: "FORBIDDEN" }, 403);
  }

  const limite = checkRateLimit(`navitrack-prueba-correo:${user.id}`, 5, 60_000);
  if (!limite.allowed) return json({ ok: false, code: "RATE_LIMIT" }, 429);

  const secreto = textoDeEntorno(import.meta.env.NAVITRACK_CRON_SECRET, "NAVITRACK_CRON_SECRET");
  if (secreto.length < 16) return json({ ok: false, code: "NO_CONFIG" }, 503);

  // Mismo host y mismo prefijo que este endpoint, sin depender de una URL
  // configurada aparte: `chequeo-diario` vive junto a este archivo.
  const destino = new URL(request.url);
  destino.pathname = destino.pathname.replace(/\/prueba-correo$/, "/chequeo-diario");
  destino.search = "?sin_gasto=1";

  try {
    const r = await fetch(destino.toString(), {
      headers: { "x-cron-secret": secreto },
      signal: AbortSignal.timeout(25_000),
    });
    const j = await r.json();
    return json(j, r.status);
  } catch {
    return json({ ok: false, code: "ERROR_RED" }, 502);
  }
};
