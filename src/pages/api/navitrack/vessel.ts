/**
 * Posición de un buque para NaviTrack, con la base de datos por delante.
 *
 * Cada llamada a Data Docked cuesta un crédito, así que el orden es: leer la
 * última lectura guardada y devolverla si todavía sirve; consultar al proveedor
 * solo cuando envejeció. La pantalla nunca decide si se gasta un crédito — eso
 * se resuelve acá, donde el cliente no puede forzarlo.
 *
 * Tres frenos, de más fuerte a más débil:
 *   1. La nave debe estar marcada `tracking_activo` en el catálogo.
 *   2. Tope de llamadas por día (NAVITRACK_AIS_MAX_DIA).
 *   3. Antigüedad mínima entre llamadas (NAVITRACK_AIS_TTL_MIN).
 *
 * Vive aparte de `/api/shiptracking/*`, que sirve a `/tracking` con otro
 * proveedor y está en producción.
 */
import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { cuerpoProveedor } from "@/components/navitrack/navitrack-model";

const DATADOCKED_BASE = "https://datadocked.com/api/vessels_operations";

/**
 * Minutos que una lectura se considera vigente.
 *
 * 6 h son 4 lecturas al día por nave. Para el viaje en curso (San Antonio a
 * Hamburgo, 30 días) eso son ~120 créditos: alcanza para
 * seguirlo entero con margen. Bajarlo multiplica el gasto en proporción directa.
 */
const TTL_MIN = Number(import.meta.env.NAVITRACK_AIS_TTL_MIN ?? 360);
/**
 * Red de seguridad: llamadas al proveedor permitidas por día, sumando naves.
 *
 * El uso normal con una nave son 4; el resto es holgura para refrescos manuales.
 * Existe para que un error nuestro no vacíe el plan en una tarde.
 */
const MAX_DIA = Number(import.meta.env.NAVITRACK_AIS_MAX_DIA ?? 10);
/** Freno por usuario contra bucles del cliente. */
const RATE = { limit: 30, windowMs: 60_000 };

type Lectura = {
  lat: number | null;
  lng: number | null;
  speed: number | null;
  course: number | null;
  destino: string | null;
  nav_status: string | null;
  eta: string | null;
  posicion_recibida_at: string | null;
  consultado_at: string;
  nave_nombre: string | null;
};

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** IMO son 7 dígitos y MMSI 9; el proveedor acepta cualquiera de los dos. */
function esIdentificadorValido(s: string): boolean {
  return /^\d{7}$|^\d{9}$/.test(s);
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

/** "Jan 04, 2026 04:15 UTC" y variantes; null si no se entiende. */
function fecha(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Forma en que la pantalla espera el dato, venga de la caché o del proveedor. */
function comoRespuesta(l: Lectura) {
  return {
    name: l.nave_nombre,
    latitude: l.lat,
    longitude: l.lng,
    speed: l.speed,
    course: l.course,
    destination: l.destino,
    navigationalStatus: l.nav_status,
    etaUtc: l.eta,
    positionReceived: l.posicion_recibida_at,
  };
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

  // NaviTrack es superadmin-only: el guard de pantalla es de cliente, así que la
  // puerta de verdad está acá. Sin esto cualquier sesión podría gastar créditos.
  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol, activo")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  if (!perfil || String(perfil.rol ?? "").trim() !== "superadmin") {
    return json({ ok: false, code: "FORBIDDEN", message: "Sin acceso a NaviTrack" }, 403);
  }

  const id = (url.searchParams.get("id") ?? "").trim();
  if (!esIdentificadorValido(id)) {
    return json({ ok: false, code: "VALIDATION", message: "IMO o MMSI inválido" }, 400);
  }

  const limite = checkRateLimit(`navitrack:vessel:${user.id}`, RATE.limit, RATE.windowMs);
  if (!limite.allowed) {
    return json({ ok: false, code: "RATE_LIMIT", retryAfterSec: limite.retryAfterSec }, 429);
  }

  /* ── 1. Lo que ya está guardado ─────────────────────────────────────────── */

  const { data: ultimaFila } = await supabase
    .from("navitrack_ais_lecturas")
    .select(
      "lat, lng, speed, course, destino, nav_status, eta, posicion_recibida_at, consultado_at, nave_nombre",
    )
    .eq("identificador", id)
    .order("consultado_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const ultima = (ultimaFila ?? null) as Lectura | null;
  const edadMin = ultima
    ? (Date.now() - new Date(ultima.consultado_at).getTime()) / 60_000
    : Number.POSITIVE_INFINITY;

  // El botón "Actualizar ahora" del panel puede saltarse el TTL, pero no la
  // lista blanca ni el tope diario: el gasto sigue acotado.
  const forzar = url.searchParams.get("forzar") === "1";

  if (ultima && edadMin < TTL_MIN && !forzar) {
    return json({
      ok: true,
      data: comoRespuesta(ultima),
      cache: true,
      edadMin: Math.round(edadMin),
      proximaEnMin: Math.max(0, Math.round(TTL_MIN - edadMin)),
    });
  }

  /* ── 2. ¿Se puede gastar un crédito? ────────────────────────────────────── */

  // La nave tiene que estar habilitada a mano. Es el freno más fuerte: impide
  // que abrir cualquier embarque dispare una consulta.
  const { data: nave } = await supabase
    .from("naves")
    .select("id, nombre, tracking_activo")
    .or(`imo.eq.${id},mmsi.eq.${id}`)
    .eq("tracking_activo", true)
    .limit(1)
    .maybeSingle();

  if (!nave) {
    // Sin permiso para consultar: se entrega lo último que haya, aunque esté viejo.
    if (ultima) {
      return json({
        ok: true,
        data: comoRespuesta(ultima),
        cache: true,
        edadMin: Math.round(edadMin),
        seguimientoInactivo: true,
      });
    }
    return json({ ok: false, code: "TRACKING_INACTIVO" }, 200);
  }

  const desdeMedianoche = new Date();
  desdeMedianoche.setHours(0, 0, 0, 0);
  const { count: llamadasHoy } = await supabase
    .from("navitrack_ais_lecturas")
    .select("id", { count: "exact", head: true })
    .gte("consultado_at", desdeMedianoche.toISOString());

  if ((llamadasHoy ?? 0) >= MAX_DIA) {
    if (ultima) {
      return json({
        ok: true,
        data: comoRespuesta(ultima),
        cache: true,
        edadMin: Math.round(edadMin),
        topeDiario: true,
      });
    }
    return json({ ok: false, code: "TOPE_DIARIO" }, 200);
  }

  const apiKey = import.meta.env.DATADOCKED_API_KEY;
  if (!apiKey) {
    if (ultima) {
      return json({ ok: true, data: comoRespuesta(ultima), cache: true, edadMin: Math.round(edadMin) });
    }
    return json({ ok: false, code: "NO_CONFIG" }, 503);
  }

  /* ── 3. Recién ahora, el proveedor ──────────────────────────────────────── */

  try {
    const upstream = await fetch(
      `${DATADOCKED_BASE}/get-vessel-location?imo_or_mmsi=${encodeURIComponent(id)}`,
      {
        headers: { "x-api-key": apiKey, Accept: "application/json" },
        signal: AbortSignal.timeout(12_000),
      },
    );

    if (!upstream.ok) {
      const code =
        upstream.status === 401
          ? "BAD_KEY"
          : upstream.status === 403
            ? "NO_CREDITS"
            : upstream.status === 404
              ? "VESSEL_NOT_FOUND"
              : upstream.status === 429
                ? "RATE_LIMIT"
                : "UPSTREAM_ERROR";
      // Un fallo no debe dejar la pantalla en blanco si hay algo guardado.
      if (ultima) {
        return json({ ok: true, data: comoRespuesta(ultima), cache: true, edadMin: Math.round(edadMin), aviso: code });
      }
      return json({ ok: false, code }, upstream.status === 404 ? 404 : 502);
    }

    const d = cuerpoProveedor(await upstream.json());
    if (!d) {
      return json({ ok: false, code: "BAD_RESPONSE" }, 502);
    }

    const lectura = {
      identificador: id,
      nave_id: nave.id as string,
      nave_nombre: str(d.name) ?? (nave.nombre as string),
      lat: num(d.latitude),
      lng: num(d.longitude),
      speed: num(d.speed),
      course: num(d.course) ?? num(d.heading),
      destino: str(d.destination),
      nav_status: str(d.navigationalStatus),
      eta: fecha(d.etaUtc),
      posicion_recibida_at: fecha(d.positionReceived),
      tipo: "posicion",
      origen: "pantalla",
      crudo: d,
    };

    // Se guarda aunque la posición sea idéntica a la anterior: la fila es el
    // registro del crédito gastado, no solo de la posición.
    await supabase.from("navitrack_ais_lecturas").insert(lectura);

    return json({
      ok: true,
      data: comoRespuesta({ ...lectura, consultado_at: new Date().toISOString() } as Lectura),
      cache: false,
      proximaEnMin: TTL_MIN,
    });
  } catch {
    if (ultima) {
      return json({ ok: true, data: comoRespuesta(ultima), cache: true, edadMin: Math.round(edadMin), aviso: "NETWORK" });
    }
    return json({ ok: false, code: "NETWORK" }, 502);
  }
};
