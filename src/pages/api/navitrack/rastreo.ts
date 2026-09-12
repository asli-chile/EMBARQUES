/**
 * Panel de Rastreo de NaviTrack: qué naves se siguen y cuántos créditos van.
 *
 * GET  devuelve el estado (no gasta créditos).
 * POST ejecuta una acción:
 *   seguir / dejar   habilita o deshabilita el rastreo de una nave (no gasta)
 *   resolver         busca el IMO/MMSI de una nave por su nombre (1 crédito)
 *
 * Todo lo que gasta queda registrado en `navitrack_ais_lecturas`, así que
 * contar filas sigue siendo contar créditos.
 */
import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/auth/rateLimit";

const DATADOCKED_BASE = "https://datadocked.com/api/vessels_operations";
const TTL_MIN = Number(import.meta.env.NAVITRACK_AIS_TTL_MIN ?? 360);
const MAX_DIA = Number(import.meta.env.NAVITRACK_AIS_MAX_DIA ?? 10);
/** Días hacia atrás para considerar que una nave todavía tiene viaje vigente. */
const VENTANA_DIAS = 7;

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type Sesion = Awaited<ReturnType<typeof createClient>>;

/** Solo superadmin: es quien puede gastar créditos. */
async function exigirSuperadmin(supabase: Sesion) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, code: "UNAUTHORIZED" };
  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol, activo")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  if (!perfil || String(perfil.rol ?? "").trim() !== "superadmin") {
    return { ok: false as const, status: 403, code: "FORBIDDEN" };
  }
  return { ok: true as const, userId: user.id };
}

/** Nombre comparable: sin el viaje pegado, pero conservando números propios del barco. */
function claveNave(raw: string | null | undefined): string {
  let s = String(raw ?? "").toUpperCase().replace(/\s+/g, " ").trim();
  s = s.replace(/\s*\[[^\]]*\]\s*$/, "").trim();
  const ultimo = s.split(" ").pop() ?? "";
  // "635R" o "W012" son viaje; "512" en "WAN HAI 512" es parte del nombre.
  if (/\d/.test(ultimo) && /[A-Z]/.test(ultimo) && ultimo.length <= 5 && s.split(" ").length > 1) {
    s = s.slice(0, s.length - ultimo.length).trim();
  }
  return s;
}

async function creditos(supabase: Sesion) {
  const medianoche = new Date();
  medianoche.setHours(0, 0, 0, 0);
  const [{ count: total }, { count: hoy }] = await Promise.all([
    supabase.from("navitrack_ais_lecturas").select("id", { count: "exact", head: true }),
    supabase
      .from("navitrack_ais_lecturas")
      .select("id", { count: "exact", head: true })
      .gte("consultado_at", medianoche.toISOString()),
  ]);
  return { total: total ?? 0, hoy: hoy ?? 0 };
}

export const prerender = false;

/* ────────────────────────────── Estado ─────────────────────────────────── */

/**
 * Etapa gruesa del viaje, la que se muestra en la lista del panel.
 *
 * Deliberadamente más simple que `resolverEstado()`: aquí no hay AIS ni ruta,
 * solo las fechas comprometidas, y responde una única pregunta —¿todavía no
 * zarpa, va navegando o ya llegó?—. Un transbordo confirmado pisa a las fechas
 * porque cambia el viaje entero.
 */
type EtapaRastreo = "origen" | "transito" | "transbordo" | "arribado" | "sin_fecha";

function etapaDe(
  op: { etd: string | null; eta: string | null; arribo_confirmado: boolean | null },
  tieneTransbordo: boolean,
  hoy: string,
): EtapaRastreo {
  if (tieneTransbordo) return "transbordo";
  if (op.arribo_confirmado) return "arribado";
  if (op.eta && op.eta < hoy) return "arribado";
  if (op.etd && op.etd > hoy) return "origen";
  if (op.etd) return "transito";
  return "sin_fecha";
}

export const GET: APIRoute = async ({ cookies }) => {
  const supabase = createClient(cookies);
  const auth = await exigirSuperadmin(supabase);
  if (!auth.ok) return json({ ok: false, code: auth.code }, auth.status);

  const desde = new Date(Date.now() - VENTANA_DIAS * 86_400_000).toISOString().slice(0, 10);

  const [opsRes, navesRes, transRes, lecturasRes, gasto] = await Promise.all([
    supabase
      .from("operaciones")
      .select("id, nave, etd, eta, arribo_confirmado")
      .is("deleted_at", null)
      .not("nave", "is", null)
      .gte("eta", desde)
      .limit(2000),
    supabase.from("naves").select("id, nombre, imo, mmsi, tracking_activo").eq("activo", true).limit(2000),
    // Transbordos ya confirmados: cambian la etapa que se muestra.
    supabase.from("navitrack_transbordos").select("operacion_id, estado"),
    supabase
      .from("navitrack_ais_lecturas")
      .select("identificador, consultado_at")
      .eq("tipo", "posicion")
      .order("consultado_at", { ascending: false })
      .limit(500),
    creditos(supabase),
  ]);

  // Operaciones con transbordo confirmado: pesan más que las fechas.
  const conTransbordo = new Set(
    ((transRes.data ?? []) as { operacion_id: string; estado: string }[])
      .filter((t) => t.estado === "confirmado")
      .map((t) => t.operacion_id),
  );

  type OpFila = {
    id: string;
    nave: string | null;
    etd: string | null;
    eta: string | null;
    arribo_confirmado: boolean | null;
  };

  /*
   * Viajes vigentes por nave.
   *
   * Una nave puede llevar varios embarques a la vez. El que manda es el de ETA
   * más próxima: es el viaje en curso, y del que salen las fechas y la etapa
   * que se muestran en la lista.
   */
  const vigentes = new Map<
    string,
    { ops: number; proximaEta: string | null; etd: string | null; etapa: EtapaRastreo }
  >();

  const hoy = new Date().toISOString().slice(0, 10);

  for (const o of (opsRes.data ?? []) as OpFila[]) {
    const k = claveNave(o.nave);
    if (!k) continue;
    const a = vigentes.get(k) ?? { ops: 0, proximaEta: null, etd: null, etapa: "sin_fecha" as EtapaRastreo };
    a.ops += 1;
    if (o.eta && (!a.proximaEta || o.eta < a.proximaEta)) {
      a.proximaEta = o.eta;
      a.etd = o.etd;
      a.etapa = etapaDe(o, conTransbordo.has(o.id), hoy);
    }
    vigentes.set(k, a);
  }

  const ultimaPorIdent = new Map<string, string>();
  for (const l of (lecturasRes.data ?? []) as { identificador: string; consultado_at: string }[]) {
    if (!ultimaPorIdent.has(l.identificador)) ultimaPorIdent.set(l.identificador, l.consultado_at);
  }

  type NaveFila = { id: string; nombre: string; imo: string | null; mmsi: string | null; tracking_activo: boolean };
  const naves = ((navesRes.data ?? []) as NaveFila[])
    .map((n) => {
      const v = vigentes.get(claveNave(n.nombre));
      const ident = (n.mmsi ?? "").trim() || (n.imo ?? "").trim();
      const ultima = ident ? (ultimaPorIdent.get(ident) ?? null) : null;
      return {
        id: n.id,
        nombre: n.nombre,
        imo: n.imo,
        mmsi: n.mmsi,
        siguiendo: Boolean(n.tracking_activo),
        ops: v?.ops ?? 0,
        etd: v?.etd ?? null,
        proximaEta: v?.proximaEta ?? null,
        etapa: v?.etapa ?? "sin_fecha",
        ultimaLectura: ultima,
      };
    })
    // Primero lo que está navegando; dentro de eso, lo ya seguido arriba.
    .filter((n) => n.ops > 0 || n.siguiendo)
    .sort((a, b) => Number(b.siguiendo) - Number(a.siguiendo) || b.ops - a.ops || a.nombre.localeCompare(b.nombre));

  return json({
    ok: true,
    creditos: gasto,
    topeDia: MAX_DIA,
    ttlMin: TTL_MIN,
    hayClave: Boolean(import.meta.env.DATADOCKED_API_KEY),
    /** Hora local de la revisión automática, para que el panel no la invente. */
    revisionDiaria: import.meta.env.NAVITRACK_CHEQUEO_HORA ?? "07:00",
    naves,
  });
};

/* ────────────────────────────── Acciones ───────────────────────────────── */

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createClient(cookies);
  const auth = await exigirSuperadmin(supabase);
  if (!auth.ok) return json({ ok: false, code: auth.code }, auth.status);

  const limite = checkRateLimit(`navitrack:rastreo:${auth.userId}`, 40, 60_000);
  if (!limite.allowed) return json({ ok: false, code: "RATE_LIMIT" }, 429);

  const body = (await request.json().catch(() => ({}))) as {
    accion?: string;
    naveId?: string;
  };
  const naveId = String(body.naveId ?? "").trim();
  if (!naveId) return json({ ok: false, code: "VALIDATION" }, 400);

  const { data: nave } = await supabase
    .from("naves")
    .select("id, nombre, imo, mmsi, tracking_activo")
    .eq("id", naveId)
    .single();
  if (!nave) return json({ ok: false, code: "NO_ENCONTRADA" }, 404);

  /* ── Habilitar o deshabilitar el rastreo: no cuesta nada ─────────────── */

  if (body.accion === "seguir" || body.accion === "dejar") {
    const seguir = body.accion === "seguir";
    // Sin identificador no hay nada que consultar: seguirla sería un botón muerto.
    if (seguir && !(nave.imo || nave.mmsi)) {
      return json({ ok: false, code: "SIN_IDENTIFICADOR" }, 400);
    }
    const { error } = await supabase
      .from("naves")
      .update({ tracking_activo: seguir })
      .eq("id", naveId);
    if (error) return json({ ok: false, code: "NO_GUARDADO" }, 500);
    return json({ ok: true, siguiendo: seguir });
  }

  /* ── Resolver IMO/MMSI por nombre: 1 crédito ─────────────────────────── */

  if (body.accion === "resolver") {
    const apiKey = import.meta.env.DATADOCKED_API_KEY;
    if (!apiKey) return json({ ok: false, code: "NO_CONFIG" }, 503);

    const gasto = await creditos(supabase);
    if (gasto.hoy >= MAX_DIA) return json({ ok: false, code: "TOPE_DIARIO" }, 200);

    const nombre = claveNave(nave.nombre as string);
    try {
      const r = await fetch(
        `${DATADOCKED_BASE}/vessels-by-vessel-name?vessel_name=${encodeURIComponent(nombre)}`,
        { headers: { "x-api-key": apiKey, Accept: "application/json" }, signal: AbortSignal.timeout(12_000) },
      );

      // El crédito se gasta apenas el proveedor responde, haya match o no.
      await supabase.from("navitrack_ais_lecturas").insert({
        identificador: nombre.slice(0, 60),
        nave_id: nave.id as string,
        nave_nombre: nave.nombre as string,
        tipo: "busqueda",
      });

      if (!r.ok) {
        const code = r.status === 401 ? "BAD_KEY" : r.status === 403 ? "NO_CREDITS" : "UPSTREAM_ERROR";
        return json({ ok: false, code }, 200);
      }

      // La búsqueda por nombre puede venir como arreglo suelto o envuelta;
      // por eso aquí no sirve `cuerpoProveedor`, que resuelve objetos.
      const data = (await r.json()) as unknown;
      const lista = Array.isArray(data)
        ? data
        : ((data as Record<string, unknown>)?.detail ??
            (data as Record<string, unknown>)?.data ??
            (data as Record<string, unknown>)?.vessels ??
            []);
      const items = (Array.isArray(lista) ? lista : [lista]) as Record<string, unknown>[];

      for (const v of items) {
        if (!v || typeof v !== "object") continue;
        const nom = String(v.name ?? v.vessel_name ?? "");
        // El nombre debe calzar: un parecido llevaría a seguir otro barco.
        if (claveNave(nom) !== nombre) continue;
        const imo = String(v.imo ?? "").replace(/\D/g, "");
        const mmsi = String(v.mmsi ?? "").replace(/\D/g, "");
        const cambios: Record<string, string> = {};
        if (/^\d{7}$/.test(imo)) cambios.imo = imo;
        if (/^\d{9}$/.test(mmsi)) cambios.mmsi = mmsi;
        if (Object.keys(cambios).length === 0) break;
        await supabase.from("naves").update(cambios).eq("id", naveId);
        return json({ ok: true, imo: cambios.imo ?? null, mmsi: cambios.mmsi ?? null });
      }

      return json({ ok: false, code: "SIN_RESULTADO" }, 200);
    } catch {
      return json({ ok: false, code: "NETWORK" }, 200);
    }
  }

  return json({ ok: false, code: "ACCION_INVALIDA" }, 400);
};
