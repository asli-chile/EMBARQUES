/**
 * El itinerario de la carga: directo o con transbordo.
 *
 * Se responde una vez por embarque, con la confirmación de la reserva a la
 * vista, y se puede editar cuando la naviera cambia algo. Reemplaza la pregunta
 * que antes se hacía puerto por puerto ("¿siguió en el mismo buque o cambió de
 * nave?"): el operador ya sabía la respuesta desde el principio y el sistema
 * igual se la pedía en cada escala.
 *
 *   directo         todos los puertos que anuncie el AIS son paradas programadas
 *   con_transbordo  uno o más transbordos, en orden. Cada uno lleva el puerto
 *                   (obligatorio) y, si la naviera los informó, la nave que
 *                   recibe la carga y la llegada y el zarpe anunciados
 *
 * Guardar reescribe la cadena de `navitrack_tramos` entera a partir de lo que
 * llega. Lo que el buque hizo de verdad —llegada y zarpe en cada puerto— vive
 * en `navitrack_recaladas` y no se toca: cambiar el itinerario cambia lo
 * prometido, nunca lo ocurrido.
 *
 * Deciden superadmin, admin y ejecutivo. El ejecutivo solo alcanza sus
 * operaciones porque RLS no le deja ver ni escribir las demás.
 *
 * GET  lo que la pantalla necesita para mostrar y editar (no gasta nada).
 * POST guarda el itinerario.
 */
import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mismoPuerto } from "@/components/navitrack/navitrack-model";
import { checkRateLimit } from "@/lib/auth/rateLimit";

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type Sesion = Awaited<ReturnType<typeof createClient>>;

/** Roles que pueden decir cómo viaja la carga. */
const DECISORES = ["superadmin", "admin", "ejecutivo"];

/** Un techo razonable: más de cinco transbordos es un error de carga, no un viaje. */
const MAX_TRANSBORDOS = 5;

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
  return { ok: true as const, usuarioId: perfil.id as string, authId: user.id };
}

export const prerender = false;

/** Lo que la pantalla necesita. No gasta créditos. */
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
      .select("orden, nave, viaje, pol, pod, etd, etd_hora, eta, eta_hora, confirmado")
      .eq("operacion_id", operacionId)
      .order("orden"),
    /*
     * Catálogo para el selector de nave. Se manda el IMO junto al nombre para
     * poder decir antes de guardar si la nave quedará seguible o no.
     */
    supabase
      .from("naves")
      .select("id, nombre, imo, mmsi")
      .eq("activo", true)
      .order("nombre")
      .limit(3000),
    supabase.from("navitrack_viajes").select("modo, notas").eq("operacion_id", operacionId).maybeSingle(),
    /* Catálogo de puertos (~180 filas): se filtra en el cliente, como las naves. */
    supabase
      .from("destinos")
      .select("id, nombre, pais, codigo_puerto")
      .eq("activo", true)
      .order("nombre")
      .limit(2000),
  ]);

  const viaje = viajeRes.data as { modo?: string; notas?: string | null } | null;
  return json({
    ok: true,
    modoViaje: viaje?.modo ?? null,
    notasViaje: viaje?.notas ?? null,
    recaladas: recRes.data ?? [],
    tramos: tramosRes.data ?? [],
    naves: navesRes.data ?? [],
    puertos: puertosRes.data ?? [],
  });
};

type TransbordoEntrada = {
  puerto?: string;
  nave?: string | null;
  /** IMO (7 dígitos) o MMSI (9) de la nave que recibe, si se conoce. */
  naveIdentificador?: string | null;
  viaje?: string | null;
  /** Llegada anunciada al puerto de transbordo: día y, aparte, hora UTC. */
  llegada?: string | null;
  llegadaHora?: string | null;
  /** Zarpe anunciado de la nave que recibe la carga. */
  zarpe?: string | null;
  zarpeHora?: string | null;
};

/** "2026-09-18" o nada. Cualquier otra forma se descarta en vez de guardarse a medias. */
function dia(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

/**
 * Hora UTC anunciada. Null si la naviera solo dio el día.
 *
 * Va aparte de la fecha a propósito (ver `navitrack_tramos.eta_hora`): con un
 * timestamp único no se distingue "el 20 a las 00:00" de "el 20, sin hora", y
 * un "12:00" de relleno ensucia la comparación con la llegada real.
 */
function hora(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? `${t}:00` : null;
}

/** Instante de la llegada anunciada, para `navitrack_recaladas.eta_anunciada`. */
function instante(d: string | null, h: string | null): string | null {
  if (!d) return null;
  // Sin hora se sitúa a mediodía UTC, para que el día no se corra en Chile.
  return `${d}T${h ?? "12:00:00"}Z`;
}

/**
 * Separa el nombre de la nave del código de viaje, si viene pegado entre
 * corchetes ("MSC ATHOS [MC633R]", como lo escriben algunas navieras y como
 * lo devuelve el AIS). El código de viaje tiene su propio campo; dejarlo
 * dentro del nombre hace que la misma nave entre al catálogo una vez por
 * cada viaje que haga, en vez de una sola vez. Así quedaron "WEC DE HOOGH" y
 * "WEC DE HOOGH [EH636B]" como dos naves distintas del catálogo, siendo la
 * misma: se corrigió a mano el 26-09-2026, y esta función evita que se repita
 * sin importar cómo se escriba el campo.
 */
function separarNaveYViaje(v: string | null | undefined): { nave: string | null; viaje: string | null } {
  const t = (v ?? "").trim();
  const m = t.match(/^(.*?)\s*\[([^\]]+)\]\s*$/);
  if (!m) return { nave: t.toUpperCase() || null, viaje: null };
  // El catálogo va en mayúsculas y la búsqueda de duplicados compara texto.
  return { nave: m[1].trim().toUpperCase() || null, viaje: m[2].trim() || null };
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createClient(cookies);
  const auth = await exigirDecisor(supabase);
  if (!auth.ok) return json({ ok: false, code: auth.code }, auth.status);

  const limite = checkRateLimit(`navitrack-itinerario:${auth.authId}`, 20, 60_000);
  if (!limite.allowed) return json({ ok: false, code: "RATE_LIMIT" }, 429);

  let body: {
    operacionId?: string;
    modo?: string;
    transbordos?: TransbordoEntrada[];
    notas?: string | null;
  } = {};
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, code: "BAD_REQUEST" }, 400);
  }

  const operacionId = (body.operacionId ?? "").trim();
  const modo = body.modo;
  if (!operacionId || (modo !== "directo" && modo !== "con_transbordo")) {
    return json({ ok: false, code: "BAD_REQUEST" }, 400);
  }

  /*
   * La operación se lee con la sesión del usuario, no con la de servicio.
   *
   * Es la prueba de que puede tocarla: si RLS no se la deja ver, no existe.
   * Todo lo que viene después cuelga de esta lectura.
   */
  const { data: op } = await supabase
    .from("operaciones")
    .select("id, nave, viaje, pol, pod, etd, eta")
    .eq("id", operacionId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!op) return json({ ok: false, code: "NO_ENCONTRADA" }, 404);

  /* ── Transbordos recibidos, limpios ─────────────────────────────────────── */
  const transbordos = modo === "con_transbordo" ? (body.transbordos ?? []) : [];
  const limpios = transbordos.map((t) => {
    const ident = (t.naveIdentificador ?? "").trim();
    const { nave, viaje: viajeDelNombre } = separarNaveYViaje(t.nave);
    return {
      puerto: (t.puerto ?? "").trim(),
      nave,
      identificador: /^\d{7}$|^\d{9}$/.test(ident) ? ident : null,
      viaje: (t.viaje ?? "").trim() || viajeDelNombre,
      llegada: dia(t.llegada),
      llegadaHora: hora(t.llegadaHora),
      zarpe: dia(t.zarpe),
      zarpeHora: hora(t.zarpeHora),
    };
  });

  if (modo === "con_transbordo") {
    if (!limpios.length) return json({ ok: false, code: "FALTA_TRANSBORDO" }, 400);
    if (limpios.length > MAX_TRANSBORDOS) return json({ ok: false, code: "DEMASIADOS" }, 400);
    if (limpios.some((t) => !t.puerto)) return json({ ok: false, code: "FALTA_PUERTO" }, 400);
    // Los extremos no son transbordos: ahí la carga sube o baja, no cambia de nave.
    if (limpios.some((t) => mismoPuerto(t.puerto, op.pol) || mismoPuerto(t.puerto, op.pod))) {
      return json({ ok: false, code: "PUERTO_EXTREMO" }, 400);
    }
    // Dos veces el mismo puerto sería un tramo de largo cero.
    for (let i = 0; i < limpios.length; i += 1) {
      for (let j = i + 1; j < limpios.length; j += 1) {
        if (mismoPuerto(limpios[i].puerto, limpios[j].puerto)) {
          return json({ ok: false, code: "PUERTO_REPETIDO" }, 400);
        }
      }
    }
  }

  const ahora = new Date().toISOString();

  /* ── El modo ─────────────────────────────────────────────────────────────── */
  const { error: errViaje } = await supabase.from("navitrack_viajes").upsert(
    {
      operacion_id: operacionId,
      modo,
      decidido_por: auth.usuarioId,
      decidido_at: ahora,
      notas: (body.notas ?? "").trim() || null,
    },
    { onConflict: "operacion_id" },
  );
  if (errViaje) return json({ ok: false, code: "ERROR_GUARDAR" }, 500);

  /* ── Lo que ya consta del viaje real, para no desconfirmar lo ocurrido ─── */
  const { data: anotadasRes } = await supabase
    .from("navitrack_recaladas")
    .select("id, puerto, estado, recalado_at")
    .eq("operacion_id", operacionId);
  const anotadas = (anotadasRes ?? []) as {
    id: number;
    puerto: string;
    estado: string;
    recalado_at: string | null;
  }[];
  const llegoA = (puerto: string) => anotadas.some((r) => r.recalado_at && mismoPuerto(r.puerto, puerto));

  /* ── La cadena de tramos, reescrita entera ──────────────────────────────── */
  const { error: errBorrar } = await supabase.from("navitrack_tramos").delete().eq("operacion_id", operacionId);
  if (errBorrar) return json({ ok: false, code: "ERROR_GUARDAR" }, 500);

  const idTramoQueEmpiezaEn = new Map<string, number>();

  if (modo === "con_transbordo") {
    /*
     * N transbordos son N + 1 tramos. El primero sale de la operación —su nave
     * es la de la reserva—; cada transbordo cierra un tramo y abre el siguiente
     * con la nave que recibe la carga; el último llega al POD.
     */
    const filas = [];
    for (let i = 0; i <= limpios.length; i += 1) {
      const entra = i > 0 ? limpios[i - 1] : null; // transbordo donde empieza este tramo
      const sale = i < limpios.length ? limpios[i] : null; // transbordo donde termina
      const nave = entra ? entra.nave : (op.nave ?? null);
      filas.push({
        operacion_id: operacionId,
        orden: i + 1,
        nave,
        viaje: entra ? entra.viaje : (op.viaje ?? null),
        pol: entra ? entra.puerto : op.pol,
        pod: sale ? sale.puerto : op.pod,
        etd: entra ? entra.zarpe : (op.etd ?? null),
        etd_hora: entra ? entra.zarpeHora : null,
        eta: sale ? sale.llegada : (op.eta ?? null),
        eta_hora: sale ? sale.llegadaHora : null,
        origen: i === 0 ? "erp" : "manual",
        /*
         * `confirmado` dice si el tramo ya es un hecho: la carga se subió a esa
         * nave. El primero lo es desde el zarpe; los demás, cuando consta que
         * el buque anterior llegó al transbordo y se sabe a qué nave pasó.
         */
        confirmado: i === 0 ? true : Boolean(nave && entra && llegoA(entra.puerto)),
        creado_por: auth.usuarioId,
      });
    }
    const { data: creados, error: errTramos } = await supabase
      .from("navitrack_tramos")
      .insert(filas)
      .select("id, orden, pol");
    if (errTramos) return json({ ok: false, code: "ERROR_GUARDAR" }, 500);
    for (const t of (creados ?? []) as { id: number; orden: number; pol: string | null }[]) {
      if (t.orden > 1 && t.pol) idTramoQueEmpiezaEn.set(t.pol, t.id);
    }
  }

  /* ── Cada puerto anotado, reclasificado según el itinerario ─────────────── */
  const esTransbordo = (puerto: string) => limpios.find((t) => mismoPuerto(t.puerto, puerto)) ?? null;
  const tramoDe = (puerto: string) => {
    for (const [pol, id] of idTramoQueEmpiezaEn) if (mismoPuerto(pol, puerto)) return id;
    return null;
  };
  const sobrantes: number[] = [];

  for (const r of anotadas) {
    /*
     * Origen y destino no son escalas. Si quedó alguna fila así de antes —el
     * A00052 tenía San Antonio, su propio puerto de carga, esperando respuesta—
     * se retira en vez de reclasificarla como parada.
     */
    if (mismoPuerto(r.puerto, op.pol) || mismoPuerto(r.puerto, op.pod)) {
      if (!r.recalado_at) sobrantes.push(r.id);
      continue;
    }
    if (esTransbordo(r.puerto)) {
      await supabase
        .from("navitrack_recaladas")
        .update({
          estado: "transbordo",
          decidido_por: auth.usuarioId,
          decidido_at: ahora,
          tramo_id: tramoDe(r.puerto),
        })
        .eq("id", r.id);
      continue;
    }
    /*
     * Un puerto que era transbordo y ya no lo es.
     *
     * Si el buque pasó por ahí, sigue siendo parte del recorrido: queda como
     * parada. Si no —se había cargado a mano un transbordo que la naviera
     * después movió a otro puerto— no hay nada que contar y se quita, para que
     * el historial no muestre una escala que nunca existió. Si el buque de
     * verdad para ahí, el AIS lo anunciará y volverá como parada.
     */
    if ((r.estado === "transbordo" || r.estado === "transbordo_anunciado") && !r.recalado_at) {
      sobrantes.push(r.id);
      continue;
    }
    if (r.estado !== "parada_programada") {
      await supabase
        .from("navitrack_recaladas")
        .update({
          estado: "parada_programada",
          decidido_por: auth.usuarioId,
          decidido_at: ahora,
          tramo_id: null,
        })
        .eq("id", r.id);
    }
  }

  /*
   * `authenticated` no tiene DELETE sobre `navitrack_recaladas`, y está bien que
   * no lo tenga: desde el navegador nadie borra historia. Esta limpieza la hace
   * el servidor con la clave de servicio, acotada a las filas de esta operación
   * que ya se leyeron con la sesión del usuario —o sea, que RLS le deja ver—.
   */
  if (sobrantes.length) {
    try {
      await createAdminClient()
        .from("navitrack_recaladas")
        .delete()
        .eq("operacion_id", operacionId)
        .in("id", sobrantes);
    } catch {
      // Sin clave de servicio queda la fila; es un sobrante, no un error del viaje.
    }
  }

  /*
   * Cada puerto de transbordo tiene su fila desde ya, aunque el AIS todavía no
   * lo anuncie: así el historial y el mapa lo muestran desde que se carga.
   */
  for (let i = 0; i < limpios.length; i += 1) {
    const t = limpios[i];
    if (anotadas.some((r) => mismoPuerto(r.puerto, t.puerto))) continue;
    await supabase.from("navitrack_recaladas").insert({
      operacion_id: operacionId,
      puerto: t.puerto,
      nave: i === 0 ? (op.nave ?? null) : limpios[i - 1].nave,
      eta_anunciada: instante(t.llegada, t.llegadaHora),
      estado: "transbordo",
      decidido_por: auth.usuarioId,
      decidido_at: ahora,
      tramo_id: tramoDe(t.puerto),
    });
  }

  /*
   * Las naves nuevas quedan en el catálogo, sin gastar nada.
   *
   * Se agregan apagadas: el seguimiento pasa a cada una el día en que su tramo
   * se vuelve el vigente, y lo hace el chequeo diario (`sincronizarSeguimiento`),
   * que es también el que le busca el IMO si le falta. Encenderla hoy mostraría
   * la posición de un buque que todavía no lleva la carga.
   */
  const sinIdentificador: string[] = [];
  for (const t of limpios) {
    if (!t.nave) continue;
    const campoIdent = t.identificador
      ? t.identificador.length === 7
        ? { imo: t.identificador }
        : { mmsi: t.identificador }
      : null;
    const { data: existente } = await supabase
      .from("naves")
      .select("id, imo, mmsi")
      .ilike("nombre", t.nave)
      .maybeSingle();
    if (!existente) {
      await supabase
        .from("naves")
        .insert({ nombre: t.nave, activo: true, tracking_activo: false, ...(campoIdent ?? {}) });
      if (!campoIdent) sinIdentificador.push(t.nave);
    } else if (!(existente.imo ?? "").trim() && !(existente.mmsi ?? "").trim()) {
      // Estaba sin identificador: se completa si vino, nunca se pisa uno existente.
      if (campoIdent) await supabase.from("naves").update(campoIdent).eq("id", existente.id);
      else sinIdentificador.push(t.nave);
    }
  }

  return json({
    ok: true,
    modo,
    transbordos: limpios.length,
    /** Naves que quedarán con posición estimada hasta que se les conozca el IMO. */
    sinIdentificador,
  });
};
