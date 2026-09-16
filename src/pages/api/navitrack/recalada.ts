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
 * Lo deciden superadmin, admin y ejecutivo. El ejecutivo solo alcanza sus
 * operaciones, y no porque se compruebe acá: RLS no le deja ver ni escribir
 * las demás.
 *
 * Gastar es otro permiso. La segunda respuesta cambia qué buque se consulta, y
 * si esa nave no tiene IMO hay que pedírselo al proveedor. Eso lo hace solo el
 * superadmin; para el resto la decisión se guarda igual y la nave queda
 * esperando identificador, que es preferible a no poder responder.
 *
 * GET  devuelve lo que la pantalla necesita para preguntar (no gasta nada).
 * POST guarda la decisión.
 */
import type { APIRoute } from "astro";
import { numeroDeEntorno, textoDeEntorno } from "@/lib/navitrack/config";
import { createClient } from "@/lib/supabase/server";
import { mismoPuerto } from "@/components/navitrack/navitrack-model";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { resolverNavesSinIdentificador } from "@/lib/navitrack/identificadores";

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type Sesion = Awaited<ReturnType<typeof createClient>>;

/** Roles que pueden responder qué pasó en un puerto. */
const DECISORES = ["superadmin", "admin", "ejecutivo"];

async function exigirDecisor(supabase: Sesion) {
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
  const rol = String(perfil?.rol ?? "").trim();
  if (!perfil || !DECISORES.includes(rol)) {
    return { ok: false as const, status: 403, code: "FORBIDDEN" };
  }
  return {
    ok: true as const,
    usuarioId: perfil.id as string,
    authId: user.id,
    rol,
    puedeGastar: rol === "superadmin",
  };
}

export const prerender = false;

/** Lo que la pantalla necesita para preguntar. No gasta créditos. */
export const GET: APIRoute = async ({ url, cookies }) => {
  const supabase = createClient(cookies);
  const auth = await exigirDecisor(supabase);
  if (!auth.ok) return json({ ok: false, code: auth.code }, auth.status);

  const operacionId = (url.searchParams.get("op") ?? "").trim();
  if (!operacionId) return json({ ok: false, code: "BAD_REQUEST" }, 400);

  const [recRes, tramosRes, navesRes, viajeRes, puertosRes] = await Promise.all([
    supabase
      .from("navitrack_recaladas")
      .select("id, puerto, nave, anunciado_at, eta_anunciada, visto_at, estado, decidido_at, notas, recalado_at, zarpe_at")
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
    supabase.from("navitrack_viajes").select("modo").eq("operacion_id", operacionId).maybeSingle(),
    /*
     * Catálogo de puertos para el alta a mano.
     *
     * Va acá y no en una consulta aparte porque se necesita en el mismo momento
     * que el de naves y tiene el mismo permiso. Son ~180 filas: se mandan
     * enteras y el filtrado es en el cliente, igual que con las naves.
     */
    supabase
      .from("destinos")
      .select("id, nombre, pais, codigo_puerto")
      .eq("activo", true)
      .order("nombre")
      .limit(2000),
  ]);

  return json({
    ok: true,
    modoViaje: (viajeRes.data as { modo?: string } | null)?.modo ?? null,
    recaladas: recRes.data ?? [],
    tramos: tramosRes.data ?? [],
    naves: navesRes.data ?? [],
    puertos: puertosRes.data ?? [],
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createClient(cookies);
  const auth = await exigirDecisor(supabase);
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
    decision?: "parada" | "transbordo" | "directo" | "anunciado";
    naveNombre?: string;
    /** IMO (7 dígitos) o MMSI (9) de la nave nueva, si el operador lo conoce. */
    naveIdentificador?: string;
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
  if (
    decision !== "parada" &&
    decision !== "transbordo" &&
    decision !== "directo" &&
    decision !== "anunciado"
  ) {
    return json({ ok: false, code: "BAD_REQUEST" }, 400);
  }
  /*
   * Transbordo ya ocurrido y transbordo anunciado comparten casi todo: los dos
   * crean el tramo nuevo y cierran la pregunta. Se separan en una sola cosa, y
   * es la que importa: quién lleva la carga **hoy**.
   */
  const esAnunciado = decision === "anunciado";

  /*
   * La recalada, ya registrada o creada al vuelo.
   *
   * El operador ve el puerto declarado en pantalla y puede resolverlo en ese
   * momento; obligarlo a esperar a que el cron lo anote sería pedirle que
   * espere a mañana para responder algo que ya sabe hoy.
   */
  type RecaladaFila = {
    id: number;
    operacion_id: string;
    puerto: string;
    nave: string | null;
    eta_anunciada: string | null;
  };
  let rec: RecaladaFila | null = null;

  if (body.recaladaId) {
    const { data } = await supabase
      .from("navitrack_recaladas")
      .select("id, operacion_id, puerto, nave, eta_anunciada")
      .eq("id", body.recaladaId)
      .maybeSingle();
    rec = data ?? null;
  } else if (body.operacionId && (body.puerto ?? "").trim()) {
    const puerto = (body.puerto ?? "").trim();
    /*
     * El puerto ya anotado se busca por identidad de lugar, no por texto.
     *
     * Comparando el texto exacto, escribir "Cartagena Colombia" donde ya había
     * "Cartagena" abría una segunda fila para la misma escala: dos puertos en
     * el historial y dos marcadores encimados en el mapa. Es el mismo criterio
     * que usa `registrarAnuncio`.
     */
    const { data: anotadas } = await supabase
      .from("navitrack_recaladas")
      .select("id, operacion_id, puerto, nave, eta_anunciada")
      .eq("operacion_id", body.operacionId);

    const previa =
      ((anotadas ?? []) as RecaladaFila[]).find((r) => mismoPuerto(r.puerto, puerto)) ?? null;

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

  /* ── Viaje directo: no se vuelve a preguntar por este embarque ──────────── */
  if (decision === "directo") {
    /*
     * Marcar el viaje como directo silencia las preguntas futuras, así que la
     * afirmación queda con autor y fecha: alguien miró el booking y dijo que
     * esta carga no cambia de nave.
     */
    await supabase.from("navitrack_viajes").upsert(
      {
        operacion_id: rec.operacion_id,
        modo: "directo",
        decidido_por: auth.usuarioId,
        decidido_at: ahora,
        notas: body.notas ?? null,
      },
      { onConflict: "operacion_id" },
    );

    /*
     * Las recaladas pendientes de este embarque pasan a paradas programadas.
     *
     * Incluye la que se estaba verificando y cualquier otra que el buque haya
     * anunciado antes: si el viaje es directo, todas son escalas del itinerario
     * por definición.
     */
    const { data: resueltas } = await supabase
      .from("navitrack_recaladas")
      .update({
        estado: "parada_programada",
        decidido_por: auth.usuarioId,
        decidido_at: ahora,
        notas: "Viaje marcado como directo.",
      })
      .eq("operacion_id", rec.operacion_id)
      .in("estado", ["anunciada", "por_verificar"])
      .select("puerto");

    return json({
      ok: true,
      estado: "directo",
      paradas: (resueltas ?? []).map((r: { puerto: string }) => r.puerto),
    });
  }

  /* ── Transbordo: hay que registrar el tramo nuevo ───────────────────────── */
  /* El catálogo de naves va en mayúsculas y la búsqueda de duplicados compara
     texto: normalizar acá evita que una nave entre dos veces con distinta caja. */
  const naveNombre = (body.naveNombre ?? "").trim().toUpperCase();

  /*
   * Identificador escrito a mano.
   *
   * Es exactamente el dato por el que se gastaría un crédito preguntándole al
   * proveedor. Si viene, se guarda y no se busca nada. Se valida la forma —IMO
   * son 7 dígitos y MMSI 9— porque un número mal copiado haría consultar por un
   * buque ajeno: cuesta igual y devuelve la posición equivocada.
   */
  const identBruto = (body.naveIdentificador ?? "").trim();
  const identValido = /^\d{7}$|^\d{9}$/.test(identBruto) ? identBruto : null;
  const campoIdent: { imo: string } | { mmsi: string } | null = identValido
    ? identValido.length === 7
      ? { imo: identValido }
      : { mmsi: identValido }
    : null;
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
      /*
       * `confirmado` dice si el tramo ya es un hecho, no si el dato es fiable.
       *
       * Un transbordo anunciado por la naviera es información de primera mano,
       * pero la carga todavía no se subió a ese buque. Marcarlo confirmado
       * haría que el historial lo contara como ocurrido y que el traspaso de
       * seguimiento se adelantara: `sincronizarSeguimiento` da por cerrado el
       * tramo cuyo ETA venció, y el de arriba aún no zarpa.
       */
      confirmado: !esAnunciado,
      creado_por: auth.usuarioId,
      notas: body.notas ?? null,
    })
    .select("id")
    .single();

  // Si alguien lo había marcado directo, un transbordo lo desmiente.
  await supabase.from("navitrack_viajes").upsert(
    {
      operacion_id: rec.operacion_id,
      modo: "con_transbordo",
      decidido_por: auth.usuarioId,
      decidido_at: ahora,
    },
    { onConflict: "operacion_id" },
  );

  await supabase
    .from("navitrack_recaladas")
    .update({
      estado: esAnunciado ? "transbordo_anunciado" : "transbordo",
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

  if (esAnunciado) {
    /*
     * Anunciado: la nave se anota, pero el seguimiento **no se mueve hoy**.
     *
     * La carga sigue en el buque anterior hasta la fecha del transbordo, así
     * que encender el nuevo ahora mostraría la posición de un barco que todavía
     * no la lleva —y apagaría el que sí—. Peor: gastaría un crédito diario en
     * seguir un viaje ajeno durante los días que falten.
     *
     * El traspaso lo hace el chequeo diario el día en que este tramo pasa a ser
     * el vigente, que es exactamente la fecha anunciada de llegada al puerto de
     * conexión. Ese mismo chequeo le busca el IMO si le falta, así que tampoco
     * hay que pagarlo por adelantado.
     */
    if (!existente) {
      await supabase
        .from("naves")
        .insert({ nombre: naveNombre, activo: true, tracking_activo: false, ...(campoIdent ?? {}) });
    } else if (campoIdent && !(existente.imo ?? "").trim() && !(existente.mmsi ?? "").trim()) {
      // Estaba en el catálogo pero sin identificador: se completa, no se pisa.
      await supabase.from("naves").update(campoIdent).eq("id", existente.id);
    }
    identificador = {
      imo: (campoIdent && "imo" in campoIdent ? campoIdent.imo : null) ?? existente?.imo ?? null,
      mmsi: (campoIdent && "mmsi" in campoIdent ? campoIdent.mmsi : null) ?? existente?.mmsi ?? null,
    };
    aviso = "TRASPASO_PROGRAMADO";
  } else if (campoIdent) {
    /*
     * Lo escribió el operador: no hay nada que preguntarle al proveedor.
     *
     * Se completa la nave y se enciende su seguimiento, que es lo mismo que
     * haría la búsqueda pagada, sin el crédito.
     */
    if (existente) {
      await supabase
        .from("naves")
        .update({ tracking_activo: true, ...campoIdent })
        .eq("id", existente.id);
    } else {
      await supabase
        .from("naves")
        .insert({ nombre: naveNombre, activo: true, tracking_activo: true, ...campoIdent });
    }
    identificador = {
      imo: "imo" in campoIdent ? campoIdent.imo : (existente?.imo ?? null),
      mmsi: "mmsi" in campoIdent ? campoIdent.mmsi : (existente?.mmsi ?? null),
    };
    aviso = "IDENTIFICADOR_DADO";
  } else if (existente && ((existente.imo ?? "").trim() || (existente.mmsi ?? "").trim())) {
    await supabase.from("naves").update({ tracking_activo: true }).eq("id", existente.id);
    identificador = { imo: existente.imo, mmsi: existente.mmsi };
    aviso = "YA_TENIA_IMO";
  } else if (!auth.puedeGastar) {
    /*
     * La nave no tiene identificador y quien decidió no gasta créditos.
     *
     * El transbordo queda guardado igual —es lo que de verdad importa— y la
     * nave, sin IMO: hasta que alguien se lo busque, su posición será estimada.
     * La alternativa era rechazar la decisión, y perder el dato por no poder
     * pagar un crédito sería el peor de los dos resultados.
     */
    aviso = "SIN_IDENTIFICADOR_PENDIENTE";
  } else {
    const [alta] = await resolverNavesSinIdentificador(
      supabase,
      textoDeEntorno(import.meta.env.DATADOCKED_API_KEY, "DATADOCKED_API_KEY"),
      [naveNombre],
      1,
    );
    creditoGastado = Boolean(alta);
    identificador = { imo: alta?.imo ?? null, mmsi: alta?.mmsi ?? null };
    aviso = alta?.resuelta ? "RESUELTA" : "SIN_IDENTIFICADOR";
  }

  return json({
    ok: true,
    estado: esAnunciado ? "transbordo_anunciado" : "transbordo",
    naveAnterior: previos[previos.length - 1]?.nave ?? op.nave,
    naveNueva: naveNombre,
    identificador,
    creditoGastado,
    aviso,
  });
};
