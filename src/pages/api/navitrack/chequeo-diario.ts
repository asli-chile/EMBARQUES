/**
 * Chequeo diario de NaviTrack: una lectura por nave seguida, los puertos por
 * donde pasa cada carga y un reporte por correo con lo que falta completar.
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
import { cuerpoProveedor, enVentanaDeSeguimiento, llegoAlPod } from "@/components/navitrack/navitrack-model";
import { calcularVentana, claveDeNave, naveEnVentana } from "@/lib/navitrack/ventana";
import { sincronizarSeguimiento } from "@/lib/navitrack/seguimiento";
import { resolverNavesSinIdentificador } from "@/lib/navitrack/identificadores";
import { correoResumenCorrida } from "@/components/navitrack/navitrack-correo";
import { consultarSaldo, invalidarSaldo } from "@/lib/navitrack/saldo";
import { registrarAnuncio, registrarRecalada, transbordosSinNave } from "@/lib/navitrack/recaladas";

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
  /*
   * El secreto con el que se le habla a `send-email` no es necesariamente el
   * mismo con el que Vercel entra acá.
   *
   * Son dos puertas distintas: Vercel firma su llamada con CRON_SECRET (su
   * convención) y la Edge Function exige NAVITRACK_CRON_SECRET (de sus propios
   * secrets). Si las dos variables existen en Vercel con valores distintos, el
   * reporte salía firmado con el que no era y la función lo rechazaba por JWT
   * inválido, sin que nadie se enterara: el envío vive dentro de un catch.
   *
   * En vez de adivinar cuál es, se prueban los que haya. Son dos como mucho.
   */
  const enviarCorreo = async (payload: Record<string, unknown>): Promise<{ ok: boolean; error: string | null }> => {
    let ultimo = "sin intento";
    for (const s of secretos) {
      try {
        const env = await fetch(
          `${textoDeEntorno(import.meta.env.PUBLIC_SUPABASE_URL, "PUBLIC_SUPABASE_URL")}/functions/v1/send-email`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${textoDeEntorno(import.meta.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY")}`,
              "x-cron-secret": s,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(20_000),
          },
        );
        const j = (await env.json()) as { success?: boolean; error?: string };
        if (j?.success) return { ok: true, error: null };
        ultimo = j?.error ?? `HTTP ${env.status}`;
      } catch (e) {
        ultimo = e instanceof Error ? e.message : "error de red";
      }
    }
    return { ok: false, error: ultimo };
  };

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

  /*
   * En prueba, el correo va **solo** a quien está probando.
   *
   * `sin_gasto=1` evita gastar créditos con el proveedor, pero el envío del
   * reporte no dependía de eso: cada corrida de prueba mandaba el mismo correo
   * de producción a Hans y Mario en copia. Diagnosticar algo a mano —lo que
   * esto existe para permitir— no debería avisarle al resto del equipo cada
   * vez. Quien quiera probar contra otro correo puede pasar `?correo=` en la
   * URL; sin eso, cae en Rodrigo.
   */
  const destinatario = esPrueba
    ? url.searchParams.get("correo")?.trim() || "rodrigo.caceres@asli.cl"
    : textoDeEntorno(import.meta.env.NAVITRACK_ALERTAS_EMAIL, "NAVITRACK_ALERTAS_EMAIL");
  /*
   * En copia.
   *
   * Un aviso de seguimiento que llega a una sola persona depende de que esa
   * persona lo vea. La copia no es formalidad: es que la carga no se quede sin
   * vigilar porque alguien está de vacaciones. En prueba no hay copia: solo va
   * a quien la pidió.
   */
  const enCopia = esPrueba
    ? ""
    : textoDeEntorno(import.meta.env.NAVITRACK_ALERTAS_CC, "NAVITRACK_ALERTAS_CC") ||
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

  /*
   * Qué naves tienen carga que valga la pena consultar hoy.
   *
   * La ventana de seguimiento —abre dos días antes del zarpe— ya existía, pero
   * se aplicaba **después** de pagar: se le preguntaba al proveedor dónde
   * estaba el buque y recién entonces se descartaban sus embarques por no haber
   * zarpado. El CMA CGM ESTELLE, con zarpe el 25-09, gastaba un crédito diario
   * desde el 17 para tirar la respuesta a la basura ocho veces.
   *
   * Antes del zarpe la lectura no solo es inútil: es engañosa. El buque está
   * haciendo otro viaje, así que su posición mide el avance de un embarque
   * ajeno —por eso `resolvePosition` la ignora—. Se paga por un dato que
   * después no se puede mostrar.
   *
   * Se consulta en bloque, antes del bucle, para no sumar una consulta por nave
   * a una corrida que ya tuvo problemas de duración.
   */
  const ahoraVentana = new Date();
  const ventana = await calcularVentana(supabase, ahoraVentana);

  /** Naves con al menos un embarque navegando. Lo calcula `@/lib/navitrack/ventana`. */
  const conCargaEnVentana = ventana.claves;
  /** Embarques en ventana sin ETA: nada los cerraría salvo el arribo o el AIS. */
  const enVentanaSinEta = ventana.sinEta;

  /** Naves omitidas por no tener carga en ventana, para que el reporte lo diga. */
  const fueraDeVentanaNaves: string[] = [];

  /** Lo que pasó con el correo, para que un fallo de envío deje rastro. */
  let reporteEnviado = false;
  let falloCorreo: string | null = null;
  /*
   * Naves que no devolvieron posición, con el motivo.
   *
   * Antes solo se contaban: "1 nave sin respuesta" no dice cuál ni por qué, y
   * al día siguiente hay que adivinar si fue el proveedor, el identificador o
   * un corte de red.
   */
  const sinRespuesta: { nave: string; motivo: string }[] = [];

  const resultado = {
    faltaNave: 0,
    revisadas: 0,
    creditos: 0,
    desvios: 0,
    escalas: 0,
    /** Puertos donde consta que el buque paró, vistos por primera vez hoy. */
    recaladas: 0,
    /** Embarques saltados por no haber zarpado todavía. */
    fueraDeVentana: 0,
    /** Naves no consultadas por no llevar ninguna carga en ventana. */
    naveFueraDeVentana: fueraDeVentanaNaves,
    /** Embarques sin ETA: nada los cerraría salvo el arribo o el AIS. */
    enVentanaSinEta,
    correos: 0,
    errores: 0,
    traspasos: sincro.traspasos.length,
    encendidas: sincro.encendidas,
    apagadas: sincro.apagadas,
    // Las que siguen sin poder seguirse después de intentar resolverlas.
    sinSeguimiento: altas.filter((a) => !a.resuelta).map((a) => a.nombre),
    resueltas: altas.filter((a) => a.resuelta).map((a) => a.nombre),
  };

  /*
   * Las naves se consultan a la vez, no una tras otra.
   *
   * En serie, cada respuesta del proveedor tardaba unos tres segundos y siete
   * naves se comían veinte, más de lo que dura una función de Vercel: la
   * corrida moría a mitad del recorrido. Por eso faltaba siempre la última nave
   * y no llegaba el reporte, que se envía al final.
   *
   * El proveedor admite 50 llamadas por minuto, así que siete simultáneas no lo
   * incomodan. Los contadores se tocan desde varias ramas, pero JavaScript no
   * interrumpe una expresión a medias: no hay carrera que perder.
   */
  await Promise.all((naves ?? []).map(async (nave) => {
    const id = (String(nave.mmsi ?? "").trim() || String(nave.imo ?? "").trim()).trim();
    if (!/^\d{7}$|^\d{9}$/.test(id)) {
      // No es error del proveedor: es un identificador que no se puede consultar.
      sinRespuesta.push({ nave: nave.nombre as string, motivo: `identificador inválido: "${id}"` });
      return;
    }

    /*
     * Sin carga navegando no se consulta: es la decisión de gastar o no.
     *
     * El cruce es por prefijo y no por igualdad porque la operación suele traer
     * el viaje pegado al nombre ("CMA CGM ESTELLE V.0FABCS1MA"), igual que hace
     * la consulta de embarques de más abajo con su `ilike`.
     *
     * No es un error ni un hueco: es una nave cuya carga no zarpó, o ya llegó.
     * Se anota con el motivo real —no siempre es "no zarpó"—, para que el
     * reporte lo diga: una nave que deja de aparecer sin explicación se lee
     * como que falló, y una que aparece con el motivo equivocado se lee como
     * que el sistema se confundió con el estado del embarque.
     */
    if (!naveEnVentana(nave.nombre, ventana)) {
      const razon = ventana.motivoPorClave.get(claveDeNave(nave.nombre));
      const etiqueta =
        razon === "cerrada"
          ? "ya cerrada o arribada"
          : razon === "sin_etd"
            ? "sin fecha de zarpe cargada"
            : razon === "no_zarpa"
              ? "aún no zarpa"
              : "sin operación viva asociada";
      fueraDeVentanaNaves.push(`${nave.nombre} (${etiqueta})`);
      return;
    }

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
          sinRespuesta.push({ nave: nave.nombre as string, motivo: "sin lectura previa que reutilizar" });
          return;
        }
      } else {
        const r = await fetch(
          `${DATADOCKED_BASE}/get-vessel-location?imo_or_mmsi=${encodeURIComponent(id)}`,
          { headers: { "x-api-key": apiKey, Accept: "application/json" }, signal: AbortSignal.timeout(15_000) },
        );
        resultado.creditos += 1;
        if (!r.ok) {
          resultado.errores += 1;
          sinRespuesta.push({ nave: nave.nombre as string, motivo: `proveedor respondió ${r.status}` });
          return;
        }
        detalle = cuerpoProveedor(await r.json());
      }
    } catch (e) {
      resultado.errores += 1;
      // Casi siempre es el timeout de 15 s, y conviene poder distinguirlo.
      sinRespuesta.push({
        nave: nave.nombre as string,
        motivo: e instanceof Error ? e.name : "error de red",
      });
      return;
    }
    if (!detalle) {
      resultado.errores += 1;
      sinRespuesta.push({ nave: nave.nombre as string, motivo: "respuesta sin datos" });
      return;
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
    const ultimoPuerto = str(detalle.lastPort);
    // Sin ninguno de los dos no hay nada que anotar: ni por dónde pasó ni a
    // dónde va. Antes bastaba con que faltara el destino para perder también el
    // puerto de procedencia, que venía en la misma lectura ya pagada.
    if (!destinoAis && !ultimoPuerto) return;

    const posicion =
      num(detalle.latitude) != null && num(detalle.longitude) != null
        ? { lng: num(detalle.longitude) as number, lat: num(detalle.latitude) as number }
        : null;

    /*
     * Embarques de los que habla esta lectura: los que **hoy** van en esta nave.
     *
     * Se buscaban por `operaciones.nave`, que es la nave con que zarpó la carga.
     * Con transbordo eso falla dos veces: los puertos de la nave que la recibió
     * no se anotaban nunca, y los de la que ya la soltó se seguían anotando
     * —en A00051, MSC SERENA dejó la carga en Rodman y su escala en Thames
     * quedó en el historial como si la caja hubiera ido a Inglaterra—.
     *
     * La nave vigente la decide la ventana con el mismo criterio del traspaso.
     */
    const claveNaveLeida = claveDeNave(nave.nombre);
    const idsDeEstaNave = [...ventana.vigentePorOp]
      .filter(([, vigente]) => Boolean(vigente && claveNaveLeida && vigente.startsWith(claveNaveLeida)))
      .map(([id]) => id);
    const { data: ops } = idsDeEstaNave.length
      ? await supabase
          .from("operaciones")
          .select(
            "id, ref_asli, contenedor, cliente, nave, naviera, pol, pod, etd, eta, estado_operacion, arribo_confirmado",
          )
          .in("id", idsDeEstaNave)
          .is("deleted_at", null)
          .limit(50)
      : { data: [] as never[] };

    for (const op of ops ?? []) {
      if (op.arribo_confirmado) continue;

      /*
       * Antes del zarpe, este buque anda en otro viaje.
       *
       * Viene hacia Chile a buscar la carga, así que lo que declara describe
       * ese viaje y no este embarque. Sin este corte, el chequeo anotaba los
       * puertos de la ruta de entrada como recaladas de la carga —que seguía en
       * tierra— y avisaba "destino distinto al comprometido" por un desvío que
       * no existe. Se abre dos días antes del ETD: ver
       * `enVentanaDeSeguimiento`.
       */
      if (
        !enVentanaDeSeguimiento(op, new Date(), {
          // Acá la lectura es la de esta corrida, no la de ayer: ya se pagó.
          llegoAlPod: llegoAlPod(
            { destino: destinoAis, nav_status: str(detalle.navigationalStatus), lastPort: ultimoPuerto },
            op.pod,
          ),
        })
      ) {
        resultado.fueraDeVentana += 1;
        continue;
      }

      /*
       * El puerto declarado se anota y se clasifica según el itinerario.
       *
       * No abre ninguna pregunta: si coincide con un transbordo cargado, es
       * transbordo; si no, parada programada. Si el buque ya está detenido
       * frente a él, queda además la hora de llegada.
       */
      if (destinoAis) {
        const anuncio = await registrarAnuncio(supabase, {
          operacionId: op.id,
          puertoDeclarado: destinoAis,
          nave: String(op.nave ?? nave.nombre),
          etaDeclarada: fecha(detalle.etaUtc),
          navStatus: str(detalle.navigationalStatus),
          recibidoAt: fecha(detalle.positionReceived),
          pol: op.pol,
          pod: op.pod,
        });
        if (anuncio === "nueva") resultado.escalas += 1;
      }

      /*
       * El puerto del que viene el buque, en la misma lectura.
       *
       * Es lo que convierte el historial en recorrido: el AIS solo informa la
       * última parada, así que si esta corrida no la anota, mañana el buque
       * declara otra y la de hoy se pierde para siempre. No cuesta un crédito
       * extra —viene en la lectura que ya se pagó— y se anota igual en los
       * viajes marcados como directos.
       */
      if (ultimoPuerto) {
        const rec = await registrarRecalada(supabase, {
          operacionId: op.id,
          puerto: ultimoPuerto,
          nave: String(op.nave ?? nave.nombre),
          zarpeAt: fecha(detalle.atdUtc),
          pol: op.pol,
          pod: op.pod,
        });
        if (rec === "nueva") resultado.recaladas += 1;
      }

    }
  }));

  /*
   * ── Lo que falta completar ──────────────────────────────────────────────
   *
   * Ya no se pregunta puerto por puerto: qué es cada puerto lo dice el
   * itinerario cargado con la reserva. Quedan dos pendientes, y van dentro del
   * reporte diario en vez de en un correo aparte:
   *
   *   - transbordos a los que la carga llegó sin que se sepa a qué nave pasa;
   *   - embarques navegando sin itinerario, de los que nadie dijo si son
   *     directos o con transbordo.
   *
   * Se repiten cada día hasta que alguien los completa. Es a propósito: son
   * tareas, no noticias.
   */
  const faltaNave: { puerto: string; naveAnterior: string | null; embarque: string }[] = [];
  for (const t of await transbordosSinNave(supabase)) {
    const { data: o } = await supabase
      .from("operaciones")
      .select("contenedor, ref_asli, arribo_confirmado, deleted_at")
      .eq("id", t.operacionId)
      .maybeSingle();
    if (!o || o.deleted_at || o.arribo_confirmado) continue;
    faltaNave.push({
      puerto: t.puerto,
      naveAnterior: t.naveAnterior,
      embarque: String(o.contenedor || o.ref_asli || ""),
    });
  }
  resultado.faltaNave = faltaNave.length;

  const sinItinerario: string[] = [];
  if (ventana.ops.size) {
    const idsVentana = [...ventana.ops];
    const [{ data: conModo }, { data: conTramos }, { data: opsVentana }] = await Promise.all([
      supabase.from("navitrack_viajes").select("operacion_id").in("operacion_id", idsVentana),
      supabase.from("navitrack_tramos").select("operacion_id").in("operacion_id", idsVentana),
      supabase.from("operaciones").select("id, ref_asli, contenedor, nave").in("id", idsVentana),
    ]);
    const definidos = new Set(
      [...(conModo ?? []), ...(conTramos ?? [])].map((r: { operacion_id: string }) => r.operacion_id),
    );
    for (const o of (opsVentana ?? []) as {
      id: string;
      ref_asli: string | null;
      contenedor: string | null;
      nave: string | null;
    }[]) {
      if (definidos.has(o.id)) continue;
      sinItinerario.push(`${o.contenedor || o.ref_asli || o.id}${o.nave ? ` (${o.nave})` : ""}`);
    }
  }

  /*
   * El transbordo ya no manda correo propio: va dentro del reporte.
   *
   * Eran tres canales para un mismo chequeo —desvíos, seguimiento y reporte— y
   * el de seguimiento además se repetía todos los días: `traspasos` se
   * recalcula desde los tramos en cada corrida, así que un embarque con cambio
   * de nave "estrenaba" su traspaso cada mañana hasta arribar. El reporte ya
   * recibe `traspasos` y `sinSeguimiento`, de modo que no se pierde nada.
   *
   * Por eso el traspaso solo se lista cuando **esta** corrida movió algo: las
   * naves encendidas y apagadas sí son cambios de estado, no una relectura de
   * lo mismo. Sin ese filtro, el reporte anunciaría una novedad que ocurrió
   * hace semanas, y una novedad que se repite deja de leerse.
   */
  const huboCambioDeSeguimiento = sincro.encendidas.length > 0 || sincro.apagadas.length > 0;

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
  /*
   * El saldo se consulta también en prueba: `my-credits` no cuesta nada (ver
   * el comentario de `consultarSaldo`), así que no había motivo para
   * ocultarlo. Antes se saltaba en `esPrueba` como si fuera un gasto más, y
   * la corrida de prueba mostraba "sin dato" donde debía decir el saldo real.
   */
  const saldoFinal = await consultarSaldo(apiKey);

  const problemas: string[] = [];
  for (const f of sinRespuesta) problemas.push(`${f.nave}: ${f.motivo}`);
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
      recaladasNuevas: resultado.recaladas,
      faltaNave,
      sinItinerario,
      traspasos: huboCambioDeSeguimiento
        ? sincro.traspasos.map((t) => ({ desde: t.desde, hacia: t.hacia }))
        : [],
      sinSeguimiento: altas.filter((a) => !a.resuelta).map((a) => `${a.nombre}: ${a.motivo ?? "sin identificar"}`),
      fueraDeVentana: fueraDeVentanaNaves,
      errores: problemas,
      enlace: sitio ? `${sitio}/navitrack` : null,
    });

    const envio = await enviarCorreo({
      to: destinatario,
      cc: enCopia || undefined,
      subject: resumen.asunto,
      body: resumen.cuerpo,
      sendFrom: "informaciones",
      skipSignature: true,
    });
    reporteEnviado = envio.ok;
    if (!envio.ok) falloCorreo = envio.error;
  }

  /*
   * Queda registro de la corrida, haya ido bien o mal.
   *
   * El reporte se manda por correo, así que un fallo del correo se veía igual
   * que un cron que no corrió: sin nada que mirar. Esta fila es lo que permite
   * responder "¿qué pasó anoche?" sin gastar una consulta por nave para verlo
   * fallar de nuevo.
   */
  await supabase.from("navitrack_corridas").insert({
    es_prueba: esPrueba,
    revisadas: resultado.revisadas,
    seguidas: (naves ?? []).length,
    creditos: resultado.creditos,
    errores: resultado.errores,
    correos: resultado.correos,
    reporte_enviado: reporteEnviado,
    fallo_correo: falloCorreo,
    saldo: saldoFinal.creditos,
    detalle: {
      sinRespuesta,
      // Por qué la corrida consultó menos naves de las que están en la lista.
      naveFueraDeVentana: fueraDeVentanaNaves,
      problemas,
      traspasos: sincro.traspasos,
      faltaNave,
      sinItinerario,
      sinSeguimiento: resultado.sinSeguimiento,
    },
  });

  return json({
    ok: true,
    esPrueba,
    saldo: saldoFinal.creditos,
    reporteEnviado,
    falloCorreo,
    sinRespuesta,
    ...resultado,
  });
};
