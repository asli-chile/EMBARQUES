/**
 * Historial de escalas (port calls) de un buque, con la base por delante.
 *
 * Mismo criterio que la posición: se devuelve lo guardado y solo se consulta al
 * proveedor cuando envejeció. Acá el caché es mucho más largo porque las escalas
 * cambian poco y la consulta es la más cara del plan: la documentación del
 * proveedor se contradice entre 1 y 5 créditos, así que se asume 5.
 */
import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { cuerpoProveedor } from "@/components/navitrack/navitrack-model";

const DATADOCKED_BASE = "https://datadocked.com/api/vessels_operations";
/** Horas que el historial de escalas se considera vigente. */
const TTL_HORAS = Number(import.meta.env.NAVITRACK_ESCALAS_TTL_H ?? 24);
const MAX_DIA = Number(import.meta.env.NAVITRACK_AIS_MAX_DIA ?? 10);

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function esIdentificadorValido(s: string): boolean {
  return /^\d{7}$|^\d{9}$/.test(s);
}

function str(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

function fecha(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** El proveedor devuelve `ports` como lista anidada; se aplana sin suponer profundidad. */
function aplanar(v: unknown): Record<string, unknown>[] {
  const salida: Record<string, unknown>[] = [];
  const recorrer = (x: unknown) => {
    if (Array.isArray(x)) {
      for (const y of x) recorrer(y);
    } else if (x && typeof x === "object") {
      salida.push(x as Record<string, unknown>);
    }
  };
  recorrer(v);
  return salida;
}

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const supabase = createClient(cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ ok: false, code: "UNAUTHORIZED" }, 401);

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol, activo")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  if (!perfil || String(perfil.rol ?? "").trim() !== "superadmin") {
    return json({ ok: false, code: "FORBIDDEN" }, 403);
  }

  const id = (url.searchParams.get("id") ?? "").trim();
  if (!esIdentificadorValido(id)) return json({ ok: false, code: "VALIDATION" }, 400);

  const limite = checkRateLimit(`navitrack:escalas:${user.id}`, 20, 60_000);
  if (!limite.allowed) return json({ ok: false, code: "RATE_LIMIT" }, 429);

  /* ── 1. Lo guardado ─────────────────────────────────────────────────────── */

  const { data: guardadas } = await supabase
    .from("navitrack_escalas")
    .select("puerto, locode, arribo, zarpe, consultado_at")
    .eq("identificador", id)
    .order("arribo", { ascending: false })
    .limit(60);

  const filas = guardadas ?? [];
  const masReciente = filas.reduce<string | null>(
    (max, f) => (!max || String(f.consultado_at) > max ? String(f.consultado_at) : max),
    null,
  );
  const edadH = masReciente
    ? (Date.now() - new Date(masReciente).getTime()) / 3_600_000
    : Number.POSITIVE_INFINITY;

  const forzar = url.searchParams.get("forzar") === "1";
  // La pestaña abre con esto: mira lo guardado y nunca gasta. Traer escalas
  // nuevas es un botón aparte, porque es la consulta más cara del plan.
  const soloCache = url.searchParams.get("solo_cache") === "1";

  if (soloCache) {
    return json({
      ok: true,
      escalas: filas,
      cache: true,
      vencido: filas.length === 0 || edadH >= TTL_HORAS,
      edadH: Number.isFinite(edadH) ? Math.round(edadH) : null,
    });
  }

  if (filas.length > 0 && edadH < TTL_HORAS && !forzar) {
    return json({ ok: true, escalas: filas, cache: true, edadH: Math.round(edadH) });
  }

  /* ── 2. ¿Se puede gastar? ───────────────────────────────────────────────── */

  const { data: nave } = await supabase
    .from("naves")
    .select("id, nombre, tracking_activo")
    .or(`imo.eq.${id},mmsi.eq.${id}`)
    .eq("tracking_activo", true)
    .limit(1)
    .maybeSingle();

  if (!nave) {
    return json({ ok: true, escalas: filas, cache: true, seguimientoInactivo: true });
  }

  const medianoche = new Date();
  medianoche.setHours(0, 0, 0, 0);
  const { count: hoy } = await supabase
    .from("navitrack_ais_lecturas")
    .select("id", { count: "exact", head: true })
    .gte("consultado_at", medianoche.toISOString());
  if ((hoy ?? 0) >= MAX_DIA) {
    return json({ ok: true, escalas: filas, cache: true, topeDiario: true });
  }

  const apiKey = import.meta.env.DATADOCKED_API_KEY;
  if (!apiKey) {
    return filas.length > 0
      ? json({ ok: true, escalas: filas, cache: true })
      : json({ ok: false, code: "NO_CONFIG" }, 503);
  }

  /* ── 3. Proveedor ───────────────────────────────────────────────────────── */

  try {
    const r = await fetch(
      `${DATADOCKED_BASE}/port-calls-by-vessel?imo_or_mmsi=${encodeURIComponent(id)}`,
      { headers: { "x-api-key": apiKey, Accept: "application/json" }, signal: AbortSignal.timeout(15_000) },
    );

    // El crédito se gasta con la respuesta, traiga escalas o no.
    await supabase.from("navitrack_ais_lecturas").insert({
      identificador: id,
      nave_id: nave.id as string,
      nave_nombre: nave.nombre as string,
      tipo: "escalas",
    });

    if (!r.ok) {
      const code =
        r.status === 401 ? "BAD_KEY" : r.status === 403 ? "NO_CREDITS" : r.status === 404 ? "NO_ENCONTRADA" : "UPSTREAM_ERROR";
      return json({ ok: filas.length > 0, escalas: filas, cache: true, aviso: code });
    }

    const body = cuerpoProveedor(await r.json()) ?? {};
    const puertos = aplanar(body.ports);

    const nuevas = puertos
      .map((p) => ({
        identificador: id,
        nave_id: nave.id as string,
        nave_nombre: str(body.name) ?? (nave.nombre as string),
        puerto: str(p.portName),
        locode: str(p.portSign),
        arribo: fecha(p.arrived),
        zarpe: fecha(p.departed),
      }))
      .filter((e) => e.puerto || e.locode);

    if (nuevas.length > 0) {
      // Reconsultar no debe duplicar: el índice único descarta las repetidas.
      await supabase.from("navitrack_escalas").upsert(nuevas, {
        onConflict: "identificador,locode,arribo",
        ignoreDuplicates: true,
      });
    }

    const { data: frescas } = await supabase
      .from("navitrack_escalas")
      .select("puerto, locode, arribo, zarpe, consultado_at")
      .eq("identificador", id)
      .order("arribo", { ascending: false })
      .limit(60);

    return json({ ok: true, escalas: frescas ?? nuevas, cache: false });
  } catch {
    return json({ ok: filas.length > 0, escalas: filas, cache: true, aviso: "NETWORK" });
  }
};
