/**
 * El arribo a destino.
 *
 * Es la última pregunta del viaje y son dos cosas distintas, no una:
 *
 *   anunciado   la naviera dijo para cuándo llega. Todavía no pasó: el buque
 *               se sigue consultando y la carga sigue en tránsito.
 *   confirmado  llegó. El embarque deja de verificarse: después del arribo el
 *               buque sigue viaje a otro destino y su posición, aunque real, ya
 *               no dice nada de esta carga.
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

    return json({ ok: true, estado: "deshecho" });
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
   * La lista blanca de naves no se toca acá.
   *
   * El chequeo diario ya salta las operaciones arribadas, así que este embarque
   * deja de verificarse solo. Pero el crédito se gasta **por nave**, no por
   * embarque: apagar el buque porque esta carga llegó le quitaría la posición a
   * las otras que sigue llevando. Quién está en la lista blanca es decisión del
   * usuario, en el panel de rastreo, y sigue siéndolo.
   */
  return json({ ok: true, estado: "confirmado", fecha, pod: op.pod ?? null, nave: op.nave ?? null });
};
