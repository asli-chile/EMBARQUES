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
import { numeroDeEntorno, textoDeEntorno } from "@/lib/navitrack/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { cuerpoProveedor } from "@/components/navitrack/navitrack-model";
import { sincronizarSeguimiento } from "@/lib/navitrack/seguimiento";
import { resolverNavesSinIdentificador } from "@/lib/navitrack/identificadores";
import { correoSeguimiento, correoResumenCorrida } from "@/components/navitrack/navitrack-correo";
import { consultarSaldo, invalidarSaldo } from "@/lib/navitrack/saldo";
import { marcarPorVerificar, registrarAnuncio } from "@/lib/navitrack/recaladas";
import { correoDesvio } from "@/components/navitrack/navitrack-correo";

const DATADOCKED_BASE = "https://datadocked.com/api/vessels_operations";
/** Naves que puede revisar una corrida. Freno ante una lista blanca inflada. */
const MAX_NAVES = numeroDeEntorno(import.meta.env.NAVITRACK_CHEQUEO_MAX, 25);

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

export const GET: APIRoute = async ({ request, url }) => {
  /*
   * Autenticación del cron.
   *
   * Vercel firma sus llamadas programadas con `Authorization: Bearer <valor>`,
   * y el valor lo toma de una variable que **tiene que llamarse CRON_SECRET**:
   * es su convención, no la nuestra. Si solo existe NAVITRACK_CRON_SECRET,
   * Vercel llama sin ninguna cabecera y el endpoint responde 403 en silencio,
   * que es exactamente lo que pasó la primera noche.
   *
   * Se aceptan las dos para que funcione con cualquiera de las dos puestas.
   */
  const secretos = [
    textoDeEntorno(import.meta.env.NAVITRACK_CRON_SECRET, "NAVITRACK_CRON_SECRET"),
    textoDeEntorno(import.meta.env.CRON_SECRET, "CRON_SECRET"),
  ].filter((x) => x.length >= 16);

  const enviado =
    (request.headers.get("x-cron-secret") ?? "").trim() ||
    (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();

  if (secretos.length === 0 || !secretos.includes(enviado)) {
    return json({ ok: false, code: "FORBIDDEN" }, 403);
  }
  const secreto = secretos[0];

  /*
   * Diagnóstico.
   *
   * Dice qué falta para que la corrida funcione **sin llamar al proveedor**, o
   * sea sin gastar nada. Existe porque la alternativa para averiguar por qué no
   * corrió era gastar una consulta por nave para verlo fallar.
   */
  if (url.searchParams.get("diagnostico") === "1") {
    const supabaseDiag = createAdminClient();
    const [{ data: navesDiag }, { data: ultimaDiag }] = await Promise.all([
      supabaseDiag
        .from("naves")
        .select("nombre, imo, mmsi")
        .eq("tracking_activo", true)
        .eq("activo", true),
      supabaseDiag
        .from("navitrack_ais_lecturas")
        .select("consultado_at, origen")
        .order("consultado_at", { ascending: false })
        .limit(1),
    ]);

    const seguidas = (navesDiag ?? []) as { nombre: string; imo: string | null; mmsi: string | null }[];
    return json({
      ok: true,
      diagnostico: true,
      /*
       * Qué sabe hacer este build.
       *
       * Sin esto no hay forma de distinguir desde afuera un despliegue nuevo de
       * uno viejo: el diagnóstico responde igual en ambos. Y confundirlos sale
       * caro, porque lanzar la prueba contra un build sin `sin_gasto` ejecuta
       * la corrida de verdad y cobra una consulta por nave.
       */
      modoPruebaDisponible: true,
      hayClaveProveedor: Boolean(textoDeEntorno(import.meta.env.DATADOCKED_API_KEY, "DATADOCKED_API_KEY")),
      hayDestinatario: Boolean(textoDeEntorno(import.meta.env.NAVITRACK_ALERTAS_EMAIL, "NAVITRACK_ALERTAS_EMAIL")),
      hayServiceRole: Boolean(textoDeEntorno(import.meta.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY")),
      autenticadoPor: enviado === textoDeEntorno(import.meta.env.CRON_SECRET, "CRON_SECRET") ? "CRON_SECRET" : "NAVITRACK_CRON_SECRET",
      navesSeguidas: seguidas.length,
      sinIdentificador: seguidas
        .filter((n) => !/^\d{7}$|^\d{9}$/.test((n.mmsi ?? "").trim() || (n.imo ?? "").trim()))
        .map((n) => n.nombre),
      costoProximaCorrida: seguidas.length,
      ultimaLectura: (ultimaDiag ?? [])[0] ?? null,
    });
  }

  /*
   * Ejecución de prueba.
   *
   * Hace el recorrido completo —lista blanca, traspasos, anuncios, correo— pero
   * sin llamar al proveedor: reutiliza la última lectura guardada de cada nave.
   * Sirve para comprobar que la cadena entera funciona antes de que llegue la
   * hora, sin pagar por comprobarlo.
   */
  const esPrueba = url.searchParams.get("sin_gasto") === "1";

  const apiKey = textoDeEntorno(import.meta.env.DATADOCKED_API_KEY, "DATADOCKED_API_KEY");
  if (!apiKey) return json({ ok: false, code: "NO_CONFIG" }, 503);

  const destinatario = textoDeEntorno(import.meta.env.NAVITRACK_ALERTAS_EMAIL, "NAVITRACK_ALERTAS_EMAIL");
  /*
   * En copia.
   *
   * Un aviso de seguimiento que llega a una sola persona depende de que esa
   * persona lo vea. La copia no es formalidad: es que la carga no se quede sin
   * vigilar porque alguien está de vacaciones.
   */
  const enCopia =
    textoDeEntorno(import.meta.env.NAVITRACK_ALERTAS_CC, "NAVITRACK_ALERTAS_CC") ||
    "hans.vasquez@asli.cl, mario.basaez@asli.cl";
  /*
   * Base para el botón del correo.
   *
   * El ERP se sirve bajo /embarques, no en la raíz: asli.cl/navitrack es 404 y
   * asli.cl/embarques/navitrack es la pantalla. El enlace de los avisos
   * apuntaba a la raíz, así que el botón no llevaba a ninguna parte.
   *
   * El prefijo se añade solo si la URL configurada no lo trae ya, para que
   * poner PUBLIC_SITE_URL completa siga funcionando.
   */
  const sitioBruto = (
    textoDeEntorno(import.meta.env.PUBLIC_SITE_URL, "PUBLIC_SITE_URL") || "https://www.asli.cl"
  ).replace(/\/+$/, "");
  const sitio = sitioBruto.endsWith("/embarques") ? sitioBruto : `${sitioBruto}/embarques`;
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
      if (esPrueba) {
        // Se reutiliza lo último guardado: mismo recorrido, cero consultas.
        const { data: previa } = await supabase
          .from("navitrack_ais_lecturas")
          .select("crudo")
          .eq("identificador", id)
          .eq("tipo", "posicion")
          .order("consultado_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        detalle = (previa?.crudo as Record<string, unknown> | null) ?? null;
        if (!detalle) {
          resultado.errores += 1;
          continue;
        }
      } else {
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
      }
    } catch {
      resultado.errores += 1;
      continue;
    }
    if (!detalle) {
      resultado.errores += 1;
      continue;
    }

    // La lectura se guarda igual que las del mapa: alimenta el caché y el
    // contador. En prueba no se guarda: inventaría un gasto que no ocurrió.
    if (!esPrueba) await supabase.from("navitrack_ais_lecturas").insert({
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
      const env = await fetch(`${textoDeEntorno(import.meta.env.PUBLIC_SUPABASE_URL, "PUBLIC_SUPABASE_URL")}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${textoDeEntorno(import.meta.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY")}`,
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
      const env = await fetch(`${textoDeEntorno(import.meta.env.PUBLIC_SUPABASE_URL, "PUBLIC_SUPABASE_URL")}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${textoDeEntorno(import.meta.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY")}`,
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

  /*
   * ── Reporte de la corrida ───────────────────────────────────────────────
   *
   * Se manda siempre, con novedades o sin ellas. El primer día el cron estuvo
   * veinticuatro horas sin correr y nadie se enteró: un sistema que solo
   * escribe cuando hay problemas se ve igual apagado que funcionando.
   *
   * Va al final y fuera de cualquier condición, así que también sale cuando la
   * corrida fracasó a medias.
   */
  const saldoFinal = await consultarSaldo(esPrueba ? undefined : apiKey);

  const detallesPorVerificar: { puerto: string; nave: string | null; embarque: string }[] = [];
  for (const r of vencidas) {
    const { data: o } = await supabase
      .from("operaciones")
      .select("contenedor, ref_asli")
      .eq("id", r.operacionId)
      .maybeSingle();
    detallesPorVerificar.push({
      puerto: r.puerto,
      nave: r.nave,
      embarque: String(o?.contenedor ?? o?.ref_asli ?? ""),
    });
  }

  const problemas: string[] = [];
  if (resultado.errores > 0) problemas.push(`${resultado.errores} nave(s) sin respuesta del proveedor`);
  if (!destinatario) problemas.push("No hay destinatario configurado para las alertas");
  if (saldoFinal.creditos != null && saldoFinal.creditos < 30) {
    problemas.push(`Saldo bajo: quedan ${saldoFinal.creditos} consultas`);
  }

  if (destinatario) {
    const resumen = correoResumenCorrida({
      ok: resultado.errores === 0,
      esPrueba,
      revisadas: resultado.revisadas,
      creditos: resultado.creditos,
      saldo: saldoFinal.creditos,
      puertosNuevos: resultado.escalas,
      porVerificar: detallesPorVerificar,
      traspasos: sincro.traspasos.map((t) => ({ desde: t.desde, hacia: t.hacia })),
      sinSeguimiento: altas.filter((a) => !a.resuelta).map((a) => `${a.nombre}: ${a.motivo ?? "sin identificar"}`),
      errores: problemas,
      enlace: sitio ? `${sitio}/navitrack` : null,
    });

    try {
      await fetch(`${textoDeEntorno(import.meta.env.PUBLIC_SUPABASE_URL, "PUBLIC_SUPABASE_URL")}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${textoDeEntorno(import.meta.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY")}`,
          "x-cron-secret": secreto,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: destinatario,
          cc: enCopia || undefined,
          subject: resumen.asunto,
          body: resumen.cuerpo,
          sendFrom: "informaciones",
          skipSignature: true,
        }),
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      // El reporte es lo último: si falla, la revisión ya se hizo igual.
    }
  }

  return json({ ok: true, esPrueba, saldo: saldoFinal.creditos, ...resultado });
};
