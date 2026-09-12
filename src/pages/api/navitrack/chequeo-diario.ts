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
import { evaluarDestinoAis } from "@/components/navitrack/navitrack-estado";
import { cuerpoProveedor } from "@/components/navitrack/navitrack-model";
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
  // Para el botón del correo. Sin sitio configurado, el aviso va sin enlace.
  const sitio = (import.meta.env.PUBLIC_SITE_URL ?? "https://www.asli.cl").replace(/\/+$/, "");
  const supabase = createAdminClient();

  const { data: naves } = await supabase
    .from("naves")
    .select("id, nombre, imo, mmsi")
    .eq("tracking_activo", true)
    .eq("activo", true)
    .limit(MAX_NAVES);

  const resultado = { revisadas: 0, creditos: 0, desvios: 0, escalas: 0, correos: 0, errores: 0 };

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
       * El AIS declara el próximo puerto, no el destino final. Callao camino a
       * Hamburgo es una escala, no un desvío, y avisarlo cada día entrenaría a
       * todo el mundo a ignorar estos correos.
       *
       * Solo se avisa de lo que no acerca la carga a su destino. Un puerto que
       * no está en el catálogo tampoco se avisa: sin coordenadas no hay forma
       * de juzgarlo, y una alerta que no se puede sostener es peor que ninguna.
       */
      const veredicto = evaluarDestinoAis(op.pod, destinoAis, posicion);
      if (veredicto !== "fuera_de_ruta") {
        if (veredicto === "en_ruta") resultado.escalas += 1;
        continue;
      }

      // Una decisión previa cierra el tema: no se vuelve a avisar.
      const { data: decision } = await supabase
        .from("navitrack_transbordos")
        .select("estado")
        .eq("operacion_id", op.id)
        .maybeSingle();
      if (decision) continue;

      resultado.desvios += 1;

      // El mismo destino no se avisa dos veces; uno nuevo sí.
      const { data: avisado } = await supabase
        .from("navitrack_avisos")
        .select("id")
        .eq("operacion_id", op.id)
        .eq("tipo", "desvio")
        .eq("detalle", destinoAis)
        .maybeSingle();
      if (avisado) continue;

      if (!destinatario) continue;

      const { asunto, cuerpo } = correoDesvio({
        referencia: String(op.ref_asli ?? ""),
        contenedor: String(op.contenedor ?? ""),
        cliente: String(op.cliente ?? ""),
        nave: String(op.nave ?? nave.nombre),
        naviera: op.naviera ?? null,
        pol: op.pol ?? null,
        pod: String(op.pod ?? ""),
        eta: fechaLarga(op.eta),
        destinoAis,
        // Al embarque concreto, no al listado: quien recibe el aviso quiere
        // ver ese contenedor. `ref_asli` es estable; el uuid sirve de respaldo.
        enlace: sitio
          ? `${sitio}/navitrack?op=${encodeURIComponent(String(op.ref_asli ?? op.id))}`
          : null,
      });

      try {
        // La Edge Function acepta esta vía con el secreto del cron y envía
        // siempre desde el buzón corporativo, nunca suplantando a una persona.
        const env = await fetch(
          `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/send-email`,
          {
            method: "POST",
            headers: {
              // Supabase valida el JWT antes de entrar a la función.
              Authorization: `Bearer ${import.meta.env.SUPABASE_SERVICE_ROLE_KEY}`,
              "x-cron-secret": secreto,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: destinatario,
              subject: asunto,
              body: cuerpo,
              sendFrom: "informaciones",
              skipSignature: true,
            }),
            signal: AbortSignal.timeout(20_000),
          },
        );
        const envJson = (await env.json()) as { success?: boolean };
        if (envJson?.success) {
          resultado.correos += 1;
          await supabase.from("navitrack_avisos").insert({
            operacion_id: op.id,
            tipo: "desvio",
            detalle: destinoAis,
            enviado_a: destinatario,
          });
        } else {
          resultado.errores += 1;
        }
      } catch {
        resultado.errores += 1;
      }
    }
  }

  return json({ ok: true, ...resultado });
};
