/**
 * Chequeo diario de NaviTrack: una lectura por nave seguida y aviso por correo
 * si el buque declara un destino distinto al comprometido.
 *
 * Lo dispara el cron de Vercel (ver `vercel.json`). Gasta **1 crédito por nave
 * en seguimiento y por día**, que es el uso más barato del plan: con una nave,
 * 150 créditos alcanzan para meses.
 *
 * Se protege con NAVITRACK_CRON_SECRET: sin ese secreto el endpoint no hace
 * nada, porque cualquiera que lo llamara gastaría créditos ajenos.
 */
import type { APIRoute } from "astro";
import { createAdminClient } from "@/lib/supabase/admin";
import { cuerpoProveedor } from "@/components/navitrack/navitrack-model";
import { sincronizarSeguimiento } from "@/lib/navitrack/seguimiento";
import { resolverNavesSinIdentificador } from "@/lib/navitrack/identificadores";
import { correoSeguimiento } from "@/components/navitrack/navitrack-correo";
import { marcarPorVerificar, registrarAnuncio } from "@/lib/navitrack/recaladas";
import { correoDesvio } from "@/components/navitrack/navitrack-correo";

const DATADOCKED_BASE = "https://datadocked.com/api/vessels_operations";
/** Naves que puede revisar una corrida. Freno ante una lista blanca inflada. */
const MAX_NAVES = Number(import.meta.env.NAVITRACK_CHEQUEO_MAX ?? 25);

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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

/**
 * Fecha para leer, no para parsear. `operaciones.eta` es columna `date`: no
 * lleva hora y no hay que inventarle una.
 */
function fechaLarga(v: unknown): string {
  const s = str(v);
  if (!s) return "";
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return s;
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${d} de ${meses[m - 1]} de ${y}`;
}

function fecha(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const secreto = (import.meta.env.NAVITRACK_CRON_SECRET ?? "").trim();
  const enviado =
    (request.headers.get("x-cron-secret") ?? "").trim() ||
    (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (secreto.length < 16 || enviado !== secreto) {
    return json({ ok: false, code: "FORBIDDEN" }, 403);
  }

  const apiKey = import.meta.env.DATADOCKED_API_KEY;
  if (!apiKey) return json({ ok: false, code: "NO_CONFIG" }, 503);

  const destinatario = (import.meta.env.NAVITRACK_ALERTAS_EMAIL ?? "").trim();
  /*
   * En copia.
   *
   * Un aviso de seguimiento que llega a una sola persona depende de que esa
   * persona lo vea. La copia no es formalidad: es que la carga no se quede sin
   * vigilar porque alguien está de vacaciones.
   */
  const enCopia = (import.meta.env.NAVITRACK_ALERTAS_CC ?? "hans.vasquez@asli.cl").trim();
  // Para el botón del correo. Sin sitio configurado, el aviso va sin enlace.
  const sitio = (import.meta.env.PUBLIC_SITE_URL ?? "https://www.asli.cl").replace(/\/+$/, "");
  const supabase = createAdminClient();

  /*
   * Antes de gastar, que la lista blanca apunte a donde está la carga.
   *
   * Si un embarque se transbordó, seguir al primer buque es pagar por una
   * posición que ya no dice nada de esa caja. El traspaso se hace aquí para que
   * el desfase no dure más de un día, aunque los tramos se hayan cargado por
   * fuera de la pantalla.
   */
  const sincro = await sincronizarSeguimiento(supabase);

  /*
   * Las naves que aparecieron por transbordo no suelen estar en el catálogo.
   * Se dan de alta y se les busca el IMO aquí mismo: si se esperara a que
   * alguien lo notara, esa carga quedaría sin posición indefinidamente.
   *
   * Cuesta una búsqueda por nave, y se compensa sola: la nave anterior dejó de
   * consultarse en esta misma corrida.
   */
  const altas = await resolverNavesSinIdentificador(supabase, apiKey, sincro.sinCatalogo);

  const { data: naves } = await supabase
    .from("naves")
    .select("id, nombre, imo, mmsi")
    .eq("tracking_activo", true)
    .eq("activo", true)
    .limit(MAX_NAVES);

  const resultado = {
    porVerificar: 0,
    revisadas: 0,
    creditos: 0,
    desvios: 0,
    escalas: 0,
    correos: 0,
    errores: 0,
    traspasos: sincro.traspasos.length,
    encendidas: sincro.encendidas,
    apagadas: sincro.apagadas,
    // Las que siguen sin poder seguirse después de intentar resolverlas.
    sinSeguimiento: altas.filter((a) => !a.resuelta).map((a) => a.nombre),
    resueltas: altas.filter((a) => a.resuelta).map((a) => a.nombre),
  };

  for (const nave of naves ?? []) {
    const id = (String(nave.mmsi ?? "").trim() || String(nave.imo ?? "").trim()).trim();
    if (!/^\d{7}$|^\d{9}$/.test(id)) continue;
    resultado.revisadas += 1;

    let detalle: Record<string, unknown> | null = null;
    try {
      const r = await fetch(
        `${DATADOCKED_BASE}/get-vessel-location?imo_or_mmsi=${encodeURIComponent(id)}`,
        { headers: { "x-api-key": apiKey, Accept: "application/json" }, signal: AbortSignal.timeout(15_000) },
      );
      resultado.creditos += 1;
      if (!r.ok) {
        resultado.errores += 1;
        continue;
      }
      detalle = cuerpoProveedor(await r.json());
    } catch {
      resultado.errores += 1;
      continue;
    }
    if (!detalle) {
      resultado.errores += 1;
      continue;
    }

    // La lectura se guarda igual que las del mapa: alimenta el caché y el contador.
    await supabase.from("navitrack_ais_lecturas").insert({
      identificador: id,
      nave_id: nave.id,
      nave_nombre: str(detalle.name) ?? nave.nombre,
      lat: num(detalle.latitude),
      lng: num(detalle.longitude),
      speed: num(detalle.speed),
      course: num(detalle.course) ?? num(detalle.heading),
      destino: str(detalle.destination),
      nav_status: str(detalle.navigationalStatus),
      eta: fecha(detalle.etaUtc),
      posicion_recibida_at: fecha(detalle.positionReceived),
      tipo: "posicion",
      origen: "cron",
      crudo: detalle,
    });

    const destinoAis = str(detalle.destination);
    if (!destinoAis) continue;

    const posicion =
      num(detalle.latitude) != null && num(detalle.longitude) != null
        ? { lng: num(detalle.longitude) as number, lat: num(detalle.latitude) as number }
        : null;

    // Operaciones vivas de esa nave: son las que tienen algo que verificar.
    const hoy = new Date().toISOString().slice(0, 10);
    const { data: ops } = await supabase
      .from("operaciones")
      .select("id, ref_asli, contenedor, cliente, nave, naviera, pol, pod, eta, arribo_confirmado")
      .is("deleted_at", null)
      .ilike("nave", `${nave.nombre}%`)
      .gte("eta", hoy)
      .limit(50);

    for (const op of ops ?? []) {
      if (op.arribo_confirmado) continue;

      /*
       * El puerto declarado se anota, no se avisa todavía.
       *
       * Que un buque anuncie Callao con diez días de anticipación no es noticia;
       * que haya llegado a Callao sí. El aviso sale el día que se cumple la
       * fecha anunciada, y lo dispara `marcarPorVerificar`.
       */
      const anuncio = await registrarAnuncio(supabase, {
        operacionId: op.id,
        puertoDeclarado: destinoAis,
        nave: String(op.nave ?? nave.nombre),
        etaDeclarada: fecha(detalle.etaUtc),
        pod: op.pod,
      });
      if (anuncio === "nueva") resultado.escalas += 1;

    }
  }

  /*
   * ── Las recaladas que vencen hoy ────────────────────────────────────────
   *
   * Aquí es donde el anuncio se convierte en pregunta. El buque dijo que
   * llegaría a este puerto en esta fecha, la fecha llegó, y ahora alguien tiene
   * que decir si la carga siguió viaje o cambió de barco.
   *
   * Un solo correo por recalada: esta lista ya viene filtrada por estado, así
   * que lo que se avisó ayer no se repite hoy.
   */
  const vencidas = await marcarPorVerificar(supabase);
  resultado.porVerificar = vencidas.length;

  for (const r of vencidas) {
    if (!destinatario) break;

    const { data: op } = await supabase
      .from("operaciones")
      .select("ref_asli, contenedor, cliente, nave, naviera, pol, pod, eta")
      .eq("id", r.operacionId)
      .maybeSingle();
    if (!op) continue;

    const { asunto, cuerpo } = correoDesvio({
      referencia: String(op.ref_asli ?? ""),
      contenedor: String(op.contenedor ?? ""),
      cliente: String(op.cliente ?? ""),
      nave: r.nave ?? String(op.nave ?? ""),
      naviera: op.naviera ?? null,
      pol: op.pol ?? null,
      pod: String(op.pod ?? ""),
      eta: fechaLarga(op.eta),
      destinoAis: r.puerto,
      // Al embarque concreto: quien recibe el aviso quiere ver ese contenedor.
      enlace: sitio
        ? `${sitio}/navitrack?op=${encodeURIComponent(String(op.ref_asli ?? r.operacionId))}`
        : null,
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
          cc: enCopia || undefined,
          subject: asunto,
          body: cuerpo,
          sendFrom: "informaciones",
          skipSignature: true,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (((await env.json()) as { success?: boolean })?.success) {
        resultado.correos += 1;
        resultado.desvios += 1;
        await supabase.from("navitrack_avisos").insert({
          operacion_id: r.operacionId,
          tipo: "desvio",
          detalle: r.puerto,
          enviado_a: destinatario,
        });
      } else {
        resultado.errores += 1;
      }
    } catch {
      resultado.errores += 1;
    }
  }

  /*
   * Aviso de transbordo.
   *
   * Va aparte del aviso de desvío porque responde otra pregunta: no "¿este
   * buque se está desviando?", sino "¿esta carga sigue estando vigilada?". Y se
   * envía sobre todo cuando la respuesta es no.
   */
  const avisoSeguimiento = correoSeguimiento({
    traspasos: sincro.traspasos,
    resueltas: altas.filter((a) => a.resuelta).map((a) => ({ nombre: a.nombre, imo: a.imo })),
    sinSeguimiento: altas
      .filter((a) => !a.resuelta)
      .map((a) => ({
        nombre: a.nombre,
        motivo: a.motivo,
        reemplazaA: sincro.traspasos.find((t) => t.hacia === a.nombre)?.desde ?? null,
      })),
  });

  if (avisoSeguimiento && destinatario) {
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
          cc: enCopia || undefined,
          subject: avisoSeguimiento.asunto,
          body: avisoSeguimiento.cuerpo,
          sendFrom: "informaciones",
          skipSignature: true,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (((await env.json()) as { success?: boolean })?.success) resultado.correos += 1;
    } catch {
      resultado.errores += 1;
    }
  }

  return json({ ok: true, ...resultado });
};
