/**
 * La decisión sobre un puerto anunciado.
 *
 * El buque declaró un puerto, llegó la fecha, y ahora una persona tiene que
 * decir qué pasó ahí. Solo hay dos respuestas posibles y son excluyentes:
 *
 *   parada      la carga siguió en el mismo buque; el puerto queda en el
 *               historial como una escala del itinerario
 *   transbordo  la carga cambió de barco; se registra el tramo nuevo y el
 *               seguimiento pasa a la nave siguiente
 *
 * Nadie más que un superadmin decide esto, porque la segunda respuesta cambia
 * qué buque se consulta y por lo tanto en qué se gastan los créditos.
 *
 * GET  devuelve lo que la pantalla necesita para preguntar (no gasta nada).
 * POST guarda la decisión. Solo gasta si hay que buscar el IMO de una nave
 *      nueva, y la pantalla lo advierte antes de que se apriete el botón.
 */
import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { resolverNavesSinIdentificador } from "@/lib/navitrack/identificadores";

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
    .select("id, rol")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  if (!perfil || String(perfil.rol ?? "").trim() !== "superadmin") {
    return { ok: false as const, status: 403, code: "FORBIDDEN" };
  }
  return { ok: true as const, usuarioId: perfil.id as string, authId: user.id };
}

export const prerender = false;

/** Lo que la pantalla necesita para preguntar. No gasta créditos. */
export const GET: APIRoute = async ({ url, cookies }) => {
  const supabase = createClient(cookies);
  const auth = await exigirSuperadmin(supabase);
  if (!auth.ok) return json({ ok: false, code: auth.code }, auth.status);

  const operacionId = (url.searchParams.get("op") ?? "").trim();
  if (!operacionId) return json({ ok: false, code: "BAD_REQUEST" }, 400);

  const [recRes, tramosRes, navesRes] = await Promise.all([
    supabase
      .from("navitrack_recaladas")
      .select("id, puerto, nave, anunciado_at, eta_anunciada, visto_at, estado, decidido_at, notas")
      .eq("operacion_id", operacionId)
      .order("anunciado_at"),
    supabase
      .from("navitrack_tramos")
      .select("orden, nave, viaje, pol, pod, etd, eta, confirmado")
      .eq("operacion_id", operacionId)
      .order("orden"),
    /*
     * Catálogo para el selector.
     *
     * Se manda el IMO junto al nombre para que la pantalla pueda advertir el
     * gasto **antes** de guardar: una nave sin identificador costará una
     * búsqueda, una que ya lo tiene no cuesta nada.
     */
    supabase
      .from("naves")
      .select("id, nombre, imo, mmsi")
      .eq("activo", true)
      .order("nombre")
      .limit(3000),
  ]);

  return json({
    ok: true,
    recaladas: recRes.data ?? [],
    tramos: tramosRes.data ?? [],
    naves: navesRes.data ?? [],
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createClient(cookies);
  const auth = await exigirSuperadmin(supabase);
  if (!auth.ok) return json({ ok: false, code: auth.code }, auth.status);

  const limite = checkRateLimit(`navitrack-recalada:${auth.authId}`, 20, 60_000);
  if (!limite.allowed) return json({ ok: false, code: "RATE_LIMIT" }, 429);

  let body: {
    recaladaId?: number;
    /* Alternativa a `recaladaId`: decidir sobre un puerto que el AIS declara
     * pero que el chequeo diario todavía no registró. Sin esto habría que
     * esperar a mañana para poder responder algo que ya se sabe hoy. */
    operacionId?: string;
    puerto?: string;
    etaAnunciada?: string | null;
    nave?: string | null;
    decision?: "parada" | "transbordo";
    naveNombre?: string;
    viaje?: string;
    etd?: string;
    eta?: string;
    notas?: string;
  } = {};
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, code: "BAD_REQUEST" }, 400);
  }

  const { decision } = body;
  if (decision !== "parada" && decision !== "transbordo") {
    return json({ ok: false, code: "BAD_REQUEST" }, 400);
  }

  /*
   * La recalada, ya registrada o creada al vuelo.
   *
   * El operador ve el puerto declarado en pantalla y puede resolverlo en ese
   * momento; obligarlo a esperar a que el cron lo anote sería pedirle que
   * espere a mañana para responder algo que ya sabe hoy.
   */
  let rec: {
    id: number;
    operacion_id: string;
    puerto: string;
    nave: string | null;
    eta_anunciada: string | null;
  } | null = null;

  if (body.recaladaId) {
    const { data } = await supabase
      .from("navitrack_recaladas")
      .select("id, operacion_id, puerto, nave, eta_anunciada")
      .eq("id", body.recaladaId)
      .maybeSingle();
    rec = data ?? null;
  } else if (body.operacionId && (body.puerto ?? "").trim()) {
    const puerto = (body.puerto ?? "").trim();
    const { data: previa } = await supabase
      .from("navitrack_recaladas")
      .select("id, operacion_id, puerto, nave, eta_anunciada")
      .eq("operacion_id", body.operacionId)
      .eq("puerto", puerto)
      .maybeSingle();

    if (previa) {
      rec = previa;
    } else {
      const { data: creada } = await supabase
        .from("navitrack_recaladas")
        .insert({
          operacion_id: body.operacionId,
          puerto,
          nave: body.nave ?? null,
          eta_anunciada: body.etaAnunciada ?? null,
          estado: "por_verificar",
        })
        .select("id, operacion_id, puerto, nave, eta_anunciada")
        .single();
      rec = creada ?? null;
    }
  }

  if (!rec) return json({ ok: false, code: "NO_ENCONTRADA" }, 404);
  const recaladaId = rec.id;

  const ahora = new Date().toISOString();

  /* ── Sigue viaje: el puerto queda como escala del itinerario ────────────── */
  if (decision === "parada") {
    await supabase
      .from("navitrack_recaladas")
      .update({
        estado: "parada_programada",
        decidido_por: auth.usuarioId,
        decidido_at: ahora,
        notas: body.notas ?? null,
      })
      .eq("id", recaladaId);

    return json({ ok: true, estado: "parada_programada" });
  }

  /* ── Transbordo: hay que registrar el tramo nuevo ───────────────────────── */
  const naveNombre = (body.naveNombre ?? "").trim();
  if (!naveNombre) return json({ ok: false, code: "FALTA_NAVE" }, 400);

  const { data: op } = await supabase
    .from("operaciones")
    .select("id, nave, viaje, pol, pod, etd, eta")
    .eq("id", rec.operacion_id)
    .maybeSingle();
  if (!op) return json({ ok: false, code: "NO_ENCONTRADA" }, 404);

  const { data: tramosPrevios } = await supabase
    .from("navitrack_tramos")
    .select("id, orden, nave, pod, eta")
    .eq("operacion_id", rec.operacion_id)
    .order("orden");

  const previos = (tramosPrevios ?? []) as {
    id: number;
    orden: number;
    nave: string | null;
    pod: string | null;
    eta: string | null;
  }[];

  /*
   * Primer transbordo de este embarque: hay que crear también el tramo 1.
   *
   * Sin él la cadena empezaría en el puerto de conexión y se perdería de dónde
   * salió la carga. Se copia de la operación, que es de donde venía el dato
   * hasta ahora.
   */
  if (previos.length === 0) {
    const { data: creado } = await supabase
      .from("navitrack_tramos")
      .insert({
        operacion_id: rec.operacion_id,
        orden: 1,
        nave: op.nave,
        viaje: op.viaje,
        pol: op.pol,
        pod: rec.puerto,
        etd: op.etd,
        eta: rec.eta_anunciada ? String(rec.eta_anunciada).slice(0, 10) : null,
        origen: "erp",
        confirmado: true,
        creado_por: auth.usuarioId,
      })
      .select("id, orden")
      .single();
    if (creado) previos.push({ id: creado.id, orden: 1, nave: op.nave, pod: rec.puerto, eta: null });
  }

  const ordenNuevo = Math.max(...previos.map((t) => t.orden), 0) + 1;

  const { data: tramoNuevo } = await supabase
    .from("navitrack_tramos")
    .insert({
      operacion_id: rec.operacion_id,
      orden: ordenNuevo,
      nave: naveNombre,
      viaje: (body.viaje ?? "").trim() || null,
      // El transbordo ocurre en el puerto anunciado: ahí termina un tramo y empieza otro.
      pol: rec.puerto,
      pod: op.pod,
      etd: (body.etd ?? "").trim() || null,
      eta: (body.eta ?? "").trim() || null,
      origen: "manual",
      confirmado: true,
      creado_por: auth.usuarioId,
      notas: body.notas ?? null,
    })
    .select("id")
    .single();

  await supabase
    .from("navitrack_recaladas")
    .update({
      estado: "transbordo",
      decidido_por: auth.usuarioId,
      decidido_at: ahora,
      notas: body.notas ?? null,
      tramo_id: tramoNuevo?.id ?? null,
    })
    .eq("id", recaladaId);

  /*
   * La nave siguiente tiene que quedar seguible.
   *
   * Si ya está en el catálogo con IMO, basta habilitarla: no cuesta nada. Si es
   * nueva o está sin identificador, se busca ahora mismo (1 crédito) para que
   * la carga no pase el día sin posición. La pantalla ya advirtió cuál de los
   * dos casos era antes de guardar.
   */
  const { data: existente } = await supabase
    .from("naves")
    .select("id, nombre, imo, mmsi, tracking_activo")
    .ilike("nombre", naveNombre)
    .maybeSingle();

  let creditoGastado = false;
  let identificador: { imo: string | null; mmsi: string | null } = { imo: null, mmsi: null };
  let aviso: string | null = null;

  if (existente && ((existente.imo ?? "").trim() || (existente.mmsi ?? "").trim())) {
    await supabase.from("naves").update({ tracking_activo: true }).eq("id", existente.id);
    identificador = { imo: existente.imo, mmsi: existente.mmsi };
    aviso = "YA_TENIA_IMO";
  } else {
    const [alta] = await resolverNavesSinIdentificador(
      supabase,
      import.meta.env.DATADOCKED_API_KEY,
      [naveNombre],
      1,
    );
    creditoGastado = Boolean(alta);
    identificador = { imo: alta?.imo ?? null, mmsi: alta?.mmsi ?? null };
    aviso = alta?.resuelta ? "RESUELTA" : "SIN_IDENTIFICADOR";
  }

  return json({
    ok: true,
    estado: "transbordo",
    naveAnterior: previos[previos.length - 1]?.nave ?? op.nave,
    naveNueva: naveNombre,
    identificador,
    creditoGastado,
    aviso,
  });
};
