/**
 * Actualización manual de posiciones de NaviTrack.
 *
 * Es la única acción del módulo que gasta varios créditos de una vez: consulta
 * al proveedor la posición de **cada** nave en seguimiento, una llamada por
 * nave. Normalmente esto lo hace el chequeo diario y nadie necesita tocarlo;
 * este endpoint existe para cuando hay que ver algo ahora mismo.
 *
 * Por eso está construido para ser difícil de disparar sin querer:
 *
 * - Solo superadmin.
 * - GET devuelve el presupuesto —cuántas naves, cuántos créditos, qué saldo
 *   queda después— sin gastar nada, para que la pantalla lo muestre antes.
 * - POST exige `confirmar: true` explícito.
 * - Cada actualización avisa por correo, así que ninguna pasa inadvertida.
 *
 * Las naves que todavía no zarpan se omiten: su posición es el puerto de
 * embarque, dato que ya está en el ETD, y pagar por saberlo no tiene sentido.
 */
import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { cuerpoProveedor } from "@/components/navitrack/navitrack-model";
import { correoActualizacionManual } from "@/components/navitrack/navitrack-correo";
import { consultarSaldo, invalidarSaldo } from "@/lib/navitrack/saldo";

const DATADOCKED_BASE = "https://datadocked.com/api/vessels_operations";
/** Tope duro de esta acción, pase lo que pase con la lista blanca. */
const MAX_NAVES = Number(import.meta.env.NAVITRACK_ACTUALIZAR_MAX ?? 30);
/** Días hacia atrás para considerar vigente un viaje. */
const VENTANA_DIAS = 7;

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type Sesion = Awaited<ReturnType<typeof createClient>>;

async function exigirSuperadmin(supabase: Sesion) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, code: "UNAUTHORIZED" };
  const { data: perfil } = await supabase
    .from("usuarios")
    .select("nombre, email, rol")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  if (!perfil || String(perfil.rol ?? "").trim() !== "superadmin") {
    return { ok: false as const, status: 403, code: "FORBIDDEN" };
  }
  return {
    ok: true as const,
    userId: user.id,
    nombre: String(perfil.nombre ?? "").trim(),
    email: String(perfil.email ?? "").trim(),
  };
}

function claveNave(raw: string | null | undefined): string {
  let s = String(raw ?? "").toUpperCase().replace(/\s+/g, " ").trim();
  s = s.replace(/\s*\[[^\]]*\]\s*$/, "").trim();
  const ultimo = s.split(" ").pop() ?? "";
  if (/\d/.test(ultimo) && /[A-Z]/.test(ultimo) && ultimo.length <= 5 && s.split(" ").length > 1) {
    s = s.slice(0, s.length - ultimo.length).trim();
  }
  return s;
}

function str(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function fecha(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

type NaveObjetivo = {
  id: string;
  nombre: string;
  identificador: string;
  zarpo: boolean;
};

/**
 * Qué naves se consultarían y cuántos créditos cuesta.
 *
 * Se calcula igual para el presupuesto y para la ejecución, de modo que el
 * número que se muestra en pantalla es exactamente el que se va a gastar.
 */
async function planificar(supabase: Sesion) {
  const desde = new Date(Date.now() - VENTANA_DIAS * 86_400_000).toISOString().slice(0, 10);
  const hoy = new Date().toISOString().slice(0, 10);

  const [navesRes, opsRes, gastoRes, ultimaRes] = await Promise.all([
    supabase
      .from("naves")
      .select("id, nombre, imo, mmsi")
      .eq("tracking_activo", true)
      .eq("activo", true)
      .limit(MAX_NAVES),
    supabase
      .from("operaciones")
      .select("nave, etd, eta, arribo_confirmado")
      .is("deleted_at", null)
      .not("nave", "is", null)
      .gte("eta", desde)
      .limit(2000),
    supabase.from("navitrack_ais_lecturas").select("id", { count: "exact", head: true }),
    /*
     * Cuándo se actualizó por última vez, y por qué vía.
     *
     * No hace falta guardarlo aparte: cada consulta al proveedor ya deja su
     * fila. La más reciente *es* la última actualización.
     */
    supabase
      .from("navitrack_ais_lecturas")
      .select("consultado_at, origen")
      .eq("tipo", "posicion")
      .order("consultado_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  /** Naves con al menos un embarque que ya zarpó y todavía no llega. */
  const navegando = new Set<string>();
  for (const o of (opsRes.data ?? []) as {
    nave: string | null;
    etd: string | null;
    eta: string | null;
    arribo_confirmado: boolean | null;
  }[]) {
    if (o.arribo_confirmado) continue;
    if (!o.etd || o.etd > hoy) continue;
    const k = claveNave(o.nave);
    if (k) navegando.add(k);
  }

  const todas: NaveObjetivo[] = ((navesRes.data ?? []) as Record<string, unknown>[])
    .map((n) => ({
      id: String(n.id),
      nombre: String(n.nombre ?? ""),
      identificador: (String(n.mmsi ?? "").trim() || String(n.imo ?? "").trim()).trim(),
      zarpo: navegando.has(claveNave(String(n.nombre ?? ""))),
    }))
    .filter((n) => /^\d{7}$|^\d{9}$/.test(n.identificador));

  const objetivo = todas.filter((n) => n.zarpo);
  const gastados = gastoRes.count ?? 0;

  const ultimaFila = ultimaRes.data as { consultado_at: string; origen: string } | null;

  // El saldo lo dice el proveedor. Consultarlo no cuesta nada.
  const saldo = await consultarSaldo(import.meta.env.DATADOCKED_API_KEY);

  return {
    objetivo,
    omitidas: todas.filter((n) => !n.zarpo),
    costo: objetivo.length,
    gastados,
    saldo: saldo.creditos,
    ultima: ultimaFila
      ? { at: ultimaFila.consultado_at, origen: ultimaFila.origen ?? "pantalla" }
      : null,
  };
}

export const prerender = false;

/** Presupuesto. No gasta nada: es lo que la pantalla muestra antes de confirmar. */
export const GET: APIRoute = async ({ cookies }) => {
  const supabase = createClient(cookies);
  const auth = await exigirSuperadmin(supabase);
  if (!auth.ok) return json({ ok: false, code: auth.code }, auth.status);

  const p = await planificar(supabase);
  return json({
    ok: true,
    costo: p.costo,
    saldo: p.saldo,
    gastados: p.gastados,
    // Sin saldo conocido no se inventa uno: la pantalla lo dirá.
    saldoDespues: p.saldo == null ? null : Math.max(0, p.saldo - p.costo),
    naves: p.objetivo.map((n) => n.nombre),
    omitidas: p.omitidas.map((n) => n.nombre),
    ultima: p.ultima,
    hayClave: Boolean(import.meta.env.DATADOCKED_API_KEY),
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createClient(cookies);
  const auth = await exigirSuperadmin(supabase);
  if (!auth.ok) return json({ ok: false, code: auth.code }, auth.status);

  // Una actualización cada pocos minutos basta de sobra; esto frena el doble clic
  // y cualquier reintento automático del navegador.
  const limite = checkRateLimit(`navitrack-actualizar:${auth.userId}`, 3, 300_000);
  if (!limite.allowed) return json({ ok: false, code: "RATE_LIMIT" }, 429);

  const apiKey = import.meta.env.DATADOCKED_API_KEY;
  if (!apiKey) return json({ ok: false, code: "NO_CONFIG" }, 503);

  let cuerpo: { confirmar?: boolean } = {};
  try {
    cuerpo = (await request.json()) as { confirmar?: boolean };
  } catch {
    return json({ ok: false, code: "BAD_REQUEST" }, 400);
  }
  // El gasto nunca es un efecto secundario: hay que pedirlo.
  if (cuerpo.confirmar !== true) return json({ ok: false, code: "SIN_CONFIRMAR" }, 400);

  const p = await planificar(supabase);
  if (p.costo === 0) return json({ ok: true, actualizadas: 0, creditos: 0, errores: 0 });

  let actualizadas = 0;
  let errores = 0;
  const nombres: string[] = [];

  for (const nave of p.objetivo) {
    try {
      const r = await fetch(
        `${DATADOCKED_BASE}/get-vessel-location?imo_or_mmsi=${encodeURIComponent(nave.identificador)}`,
        {
          headers: { "x-api-key": apiKey, Accept: "application/json" },
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (!r.ok) {
        errores += 1;
        continue;
      }
      const d = cuerpoProveedor(await r.json());
      if (!d) {
        errores += 1;
        continue;
      }

      await supabase.from("navitrack_ais_lecturas").insert({
        identificador: nave.identificador,
        nave_id: nave.id,
        nave_nombre: str(d.name) ?? nave.nombre,
        lat: num(d.latitude),
        lng: num(d.longitude),
        speed: num(d.speed),
        course: num(d.course) ?? num(d.heading),
        destino: str(d.destination),
        nav_status: str(d.navigationalStatus),
        eta: fecha(d.etaUtc),
        posicion_recibida_at: fecha(d.positionReceived),
        tipo: "posicion",
      origen: "manual",
        crudo: d,
      });

      actualizadas += 1;
      nombres.push(nave.nombre);
    } catch {
      errores += 1;
    }
  }

  /*
   * Aviso por correo.
   *
   * No es una cortesía: es el registro de que alguien gastó créditos a mano. Si
   * falla el envío, la actualización ya ocurrió igual, así que no se trata como
   * error de la operación.
   */
  // Ya se gastó: el saldo cacheado quedó viejo. Se relee para informar el real.
  invalidarSaldo();
  const saldoFinal = await consultarSaldo(import.meta.env.DATADOCKED_API_KEY);

  const destinatario = (import.meta.env.NAVITRACK_AVISO_GASTO_EMAIL ?? "rodrigo.caceres@asli.cl").trim();
  const secreto = (import.meta.env.NAVITRACK_CRON_SECRET ?? "").trim();
  let avisado = false;

  if (destinatario && secreto.length >= 16) {
    const { asunto, cuerpo: html } = correoActualizacionManual({
      usuario: auth.nombre || auth.email || "un usuario",
      email: auth.email,
      naves: nombres,
      creditos: actualizadas,
      errores,
      saldoAntes: p.saldo,
      saldoDespues: saldoFinal.creditos,
      ultima: p.ultima,
    });
    try {
      const env = await fetch(`${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "x-cron-secret": secreto,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: destinatario,
          subject: asunto,
          body: html,
          sendFrom: "informaciones",
          skipSignature: true,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      avisado = Boolean(((await env.json()) as { success?: boolean })?.success);
    } catch {
      avisado = false;
    }
  }

  return json({
    ok: true,
    actualizadas,
    creditos: actualizadas,
    errores,
    saldoDespues: saldoFinal.creditos,
    avisado,
  });
};
