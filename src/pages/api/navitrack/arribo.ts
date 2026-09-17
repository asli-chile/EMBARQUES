/**
 * El arribo a destino.
 *
 * Es la última pregunta del viaje y son dos cosas distintas, no una:
 *
 *   anunciado   la naviera dijo para cuándo llega. Todavía no pasó: el buque
 *               se sigue consultando y la carga sigue en tránsito.
 *   confirmado  llegó. El embarque deja de verificarse, y si esa nave se quedó
 *               sin ninguna carga viva, sale de la lista blanca: después del
 *               arribo sigue viaje a otro destino y su posición, aunque real,
 *               ya no dice nada de esta carga.
 *
 * Va aparte de `/api/navitrack/recalada` a propósito. Esa ruta responde qué
 * pasó con la **carga en un puerto** —si cambió de barco o no—; esta registra
 * un hecho del **embarque**. Mezclarlas obligaría a tratar el destino como una
 * escala más, que es justamente lo que no es.
 *
 * Lo que **no** hace: tocar `estado_operacion`. El arribo no es un estado del
 * flujo (FLUJO-DE-TRABAJO.md §4.11); una carga puede llegar a destino estando
 * ya en DOCUMENTACION_EN_REVISION, y escribir "arribada" ahí la haría retroceder
 * en el papeleo. Mis Reservas y Registros lo muestran al lado del estado.
 *
 * Deciden los mismos que deciden recaladas: superadmin, admin y ejecutivo. El
 * ejecutivo solo alcanza lo suyo, y no porque se compruebe acá sino porque RLS
 * no le deja ver ni escribir las demás operaciones.
 */
import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/auth/rateLimit";

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type Sesion = Awaited<ReturnType<typeof createClient>>;

/** Roles que pueden registrar el arribo. Los mismos que deciden recaladas. */
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
  return { ok: true as const, usuarioId: perfil.id as string, authId: user.id, rol };
}

/**
 * Embarques vivos que lleva una nave: los que no han arribado.
 *
 * Mira los dos caminos por los que una carga apunta a un buque —la columna
 * `operaciones.nave` y los tramos de NaviTrack—, porque en un viaje con
 * transbordo la columna guarda la nave del **primer** tramo y la que lleva la
 * caja hoy solo aparece en `navitrack_tramos`.
 *
 * `excluir` deja fuera la operación que se acaba de marcar: la lectura de
 * `operaciones` puede no reflejar todavía el update recién hecho.
 */
async function cargasVivasDe(
  supabase: Sesion,
  nave: string,
  excluir: string,
): Promise<number> {
  const patron = `${nave.trim()}%`;
  if (!nave.trim()) return 0;

  const [porColumna, porTramo] = await Promise.all([
    supabase
      .from("operaciones")
      .select("id")
      .is("deleted_at", null)
      .eq("arribo_confirmado", false)
      .neq("id", excluir)
      .ilike("nave", patron)
      .limit(50),
    supabase.from("navitrack_tramos").select("operacion_id").ilike("nave", patron).limit(200),
  ]);

  const ids = new Set<string>(((porColumna.data ?? []) as { id: string }[]).map((o) => o.id));

  const candidatos = [
    ...new Set(
      ((porTramo.data ?? []) as { operacion_id: string }[])
        .map((t) => t.operacion_id)
        .filter((id) => id && id !== excluir && !ids.has(id)),
    ),
  ];
  if (candidatos.length > 0) {
    const { data } = await supabase
      .from("operaciones")
      .select("id")
      .is("deleted_at", null)
      .eq("arribo_confirmado", false)
      .in("id", candidatos);
    for (const o of (data ?? []) as { id: string }[]) ids.add(o.id);
  }

  return ids.size;
}

/** La nave que lleva la carga: el último tramo, o la columna si no hay tramos. */
async function naveDeLaCarga(
  supabase: Sesion,
  operacionId: string,
  naveOperacion: string | null,
): Promise<string> {
  const { data } = await supabase
    .from("navitrack_tramos")
    .select("nave, orden")
    .eq("operacion_id", operacionId)
    .order("orden", { ascending: false })
    .limit(1);
  const ultima = ((data ?? []) as { nave: string | null }[])[0]?.nave;
  return (ultima ?? naveOperacion ?? "").trim();
}

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createClient(cookies);
  const auth = await exigirDecisor(supabase);
  if (!auth.ok) return json({ ok: false, code: auth.code }, auth.status);

  const limite = checkRateLimit(`navitrack-arribo:${auth.authId}`, 20, 60_000);
  if (!limite.allowed) return json({ ok: false, code: "RATE_LIMIT" }, 429);

  let body: {
    operacionId?: string;
    decision?: "anunciado" | "confirmado" | "deshacer";
    fecha?: string | null;
    notas?: string;
    /** Recalada pendiente que esta respuesta también cierra, si la hay. */
    recaladaId?: number;
  } = {};
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, code: "BAD_REQUEST" }, 400);
  }

  const operacionId = (body.operacionId ?? "").trim();
  const { decision } = body;
  if (
    !operacionId ||
    (decision !== "anunciado" && decision !== "confirmado" && decision !== "deshacer")
  ) {
    return json({ ok: false, code: "BAD_REQUEST" }, 400);
  }

  /*
   * Una fecha sin hora se guarda a mediodía UTC.
   *
   * Mismo motivo que en `/recalada`: "2026-09-18" guardado tal cual queda en
   * medianoche UTC, que en Chile —tres horas atrás— es el 17. El operador
   * escribe 18 y la pantalla muestra 17. Mediodía deja el día intacto en todo
   * el continente.
   */
  const aInstante = (v: string | null | undefined): string | null => {
    const t = (v ?? "").trim();
    if (!t) return null;
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(t) ? `${t}T12:00:00Z` : t;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };

  const { data: op } = await supabase
    .from("operaciones")
    .select("id, ref_asli, contenedor, nave, pod, eta, arribo_confirmado")
    .eq("id", operacionId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!op) return json({ ok: false, code: "NO_ENCONTRADA" }, 404);

  const ahora = new Date().toISOString();
  const fecha = aInstante(body.fecha);

  /* ── Anunciado: se anota la fecha y nada más cambia ─────────────────────── */
  if (decision === "anunciado") {
    if (!fecha) return json({ ok: false, code: "FALTA_FECHA" }, 400);
    const { error } = await supabase
      .from("operaciones")
      .update({
        arribo_anunciado_at: fecha,
        arribo_registrado_por: auth.usuarioId,
      })
      .eq("id", operacionId);
    if (error) return json({ ok: false, code: "ERROR_GUARDAR" }, 500);

    return json({ ok: true, estado: "anunciado", fecha, pod: op.pod ?? null });
  }

  /* ── Deshacer: alguien lo marcó por error ───────────────────────────────── */
  if (decision === "deshacer") {
    const { error } = await supabase
      .from("operaciones")
      .update({
        arribo_confirmado: false,
        arribo_at: null,
        arribo_registrado_por: auth.usuarioId,
      })
      .eq("id", operacionId);
    if (error) return json({ ok: false, code: "ERROR_GUARDAR" }, 500);

    /*
     * La carga vuelve a estar viva, así que su nave vuelve a la lista blanca.
     *
     * Solo si se puede consultar: encender una nave sin IMO ni MMSI gastaría
     * la corrida en una búsqueda que no tiene a qué preguntarle.
     */
    const nave = await naveDeLaCarga(supabase, operacionId, op.nave);
    let seguimientoEncendido = false;
    if (nave) {
      const { data: fila } = await supabase
        .from("naves")
        .select("id, imo, mmsi, tracking_activo, activo")
        .ilike("nombre", nave)
        .maybeSingle();
      const ident = ((fila?.mmsi ?? "").trim() || (fila?.imo ?? "").trim());
      if (fila && fila.activo && !fila.tracking_activo && /^\d{7}$|^\d{9}$/.test(ident)) {
        await supabase.from("naves").update({ tracking_activo: true }).eq("id", fila.id);
        seguimientoEncendido = true;
      }
    }

    return json({ ok: true, estado: "deshecho", nave: nave || null, seguimientoEncendido });
  }

  /* ── Confirmado: la carga llegó ─────────────────────────────────────────── */
  if (!fecha) return json({ ok: false, code: "FALTA_FECHA" }, 400);

  const { error } = await supabase
    .from("operaciones")
    .update({
      arribo_confirmado: true,
      arribo_at: fecha,
      arribo_registrado_por: auth.usuarioId,
    })
    .eq("id", operacionId);
  if (error) return json({ ok: false, code: "ERROR_GUARDAR" }, 500);

  /*
   * Una recalada sin responder ya no tiene a quién preguntarle.
   *
   * Si la carga llegó a destino, el puerto pendiente fue una escala del
   * itinerario: la carga siguió en el mismo buque hasta el final. Dejarla en
   * `por_verificar` mantendría viva una pregunta que el arribo ya respondió, y
   * la pantalla seguiría mostrando "posible transbordo" sobre un embarque
   * terminado.
   */
  if (body.recaladaId) {
    await supabase
      .from("navitrack_recaladas")
      .update({
        estado: "parada_programada",
        decidido_por: auth.usuarioId,
        decidido_at: ahora,
        notas: body.notas ?? "Resuelta al registrar el arribo a destino.",
      })
      .eq("id", body.recaladaId)
      .in("estado", ["anunciada", "por_verificar"]);
  }

  /*
   * La nave se apaga solo si se quedó sin nada que llevar.
   *
   * El crédito se gasta **por nave**, no por embarque, así que apagarla porque
   * esta carga llegó le quitaría la posición a las otras que sigue llevando. Y
   * dejarla encendida sin carga es pagar un crédito diario por un viaje ajeno:
   * el chequeo salta la operación arribada, pero igual le pregunta al proveedor
   * dónde está el buque.
   *
   * El criterio no es "esta carga llegó" sino "no queda ninguna". Se comprueba
   * acá y no en `sincronizarSeguimiento` porque esa función solo actúa sobre
   * cadenas de transbordo —apaga al que entregó y enciende al que recibió— y
   * nunca apaga una nave sin sucesor, que es justo este caso.
   *
   * Se dispara solo al confirmar un arribo, no en cada corrida: una nave que
   * alguien puso a mano en la lista blanca sin carga todavía no se toca.
   */
  const nave = await naveDeLaCarga(supabase, operacionId, op.nave);
  let seguimientoApagado = false;
  if (nave) {
    const vivas = await cargasVivasDe(supabase, nave, operacionId);
    if (vivas === 0) {
      const { data: apagada } = await supabase
        .from("naves")
        .update({ tracking_activo: false })
        .ilike("nombre", nave)
        .eq("tracking_activo", true)
        .select("id");
      seguimientoApagado = (apagada ?? []).length > 0;
    }
  }

  return json({
    ok: true,
    estado: "confirmado",
    fecha,
    pod: op.pod ?? null,
    nave: nave || op.nave || null,
    seguimientoApagado,
  });
};
