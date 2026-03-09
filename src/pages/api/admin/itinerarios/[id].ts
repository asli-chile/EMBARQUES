/**
 * API admin: actualizar un itinerario por ID.
 * PUT body: mismo que POST (servicio, consorcio, naviera, nave, viaje, semana, pol, etd, servicio_id, escalas).
 */
import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function toDateStr(v: unknown): string | null {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s.includes("T")) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export const PUT: APIRoute = async ({ cookies, params, request }) => {
  const id = params.id;
  if (!id) return json({ error: "ID de itinerario requerido" }, 400);

  try {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient(cookies);
    } catch {
      return json({ error: "Configuración de Supabase faltante" }, 503);
    }
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "No autorizado" }, 401);

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ error: "Cuerpo de la petición inválido" }, 400);
    }

    const { nave, viaje, pol, etd, servicio, consorcio, naviera, semana, servicio_id, escalas } = body;
    const naveStr = typeof nave === "string" ? nave.trim() : String(nave ?? "").trim();
    const viajeStr = typeof viaje === "string" ? viaje.trim() : String(viaje ?? "").trim();
    const polStr = typeof pol === "string" ? pol.trim() : String(pol ?? "").trim();
    if (!naveStr || !viajeStr || !polStr) {
      return json({ error: "Faltan campos obligatorios: nave, viaje o pol" }, 400);
    }
    if (etd == null || (typeof etd === "string" && !etd.trim())) {
      return json({ error: "Falta la fecha de salida (ETD)" }, 400);
    }
    const escalasList = escalas as unknown[] | undefined;
    if (!escalasList?.length) {
      return json({ error: "Debe incluir al menos una escala" }, 400);
    }

    const etdStr = (() => {
      if (typeof etd === "number" && !Number.isNaN(etd)) {
        const d = new Date(etd);
        return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
      }
      const s = typeof etd === "string" ? (etd as string).trim() : String(etd ?? "").trim();
      if (!s) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      if (s.includes("T")) return s.slice(0, 10);
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    })();
    if (!etdStr) return json({ error: "Fecha ETD inválida (use YYYY-MM-DD)" }, 400);

    let admin: ReturnType<typeof createAdminClient>;
    try {
      admin = createAdminClient();
    } catch {
      return json({ error: "Configure SUPABASE_SERVICE_ROLE_KEY para actualizar itinerarios." }, 503);
    }

    const { error: updateErr } = await admin
      .from("itinerarios")
      .update({
        servicio: (servicio as string)?.trim() || "Servicio",
        consorcio: (consorcio as string)?.trim() || null,
        naviera: (naviera as string)?.trim() || null,
        nave: naveStr,
        viaje: viajeStr,
        pol: polStr,
        etd: etdStr,
        semana:
          typeof semana === "number"
            ? semana
            : typeof semana === "string" && String(semana).trim()
              ? parseInt(String(semana).trim(), 10) || null
              : null,
        servicio_id: (servicio_id as string) || null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateErr) {
      const code = (updateErr as { code?: string })?.code;
      let msg = updateErr.message ?? "Error al actualizar itinerario";
      if (code === "42501") {
        msg =
          "Permiso denegado en la base de datos. Ejecute la migración de permisos: supabase db push (o aplique 20260308000005_itinerarios_admin_grants.sql).";
      }
      return json({ error: msg, code }, 400);
    }

    await admin.from("itinerario_escalas").delete().eq("itinerario_id", id);

    const escalasToInsert = escalasList.map((e: unknown, i: number) => {
      const ee = e as Record<string, unknown>;
      const num = ee.dias_transito;
      const diasTransito =
        typeof num === "number" && !Number.isNaN(num)
          ? num
          : typeof num === "string"
            ? parseInt(String(num).trim(), 10) || null
            : null;
      return {
        itinerario_id: id,
        puerto: String(ee.puerto ?? "").trim() || "",
        puerto_nombre: (ee.puerto_nombre as string)?.trim() || null,
        eta: toDateStr(ee.eta),
        dias_transito: diasTransito,
        orden: typeof ee.orden === "number" && !Number.isNaN(ee.orden) ? ee.orden : i + 1,
        area: (ee.area as string)?.trim() || "ASIA",
      };
    });

    const { error: errEsc } = await admin.from("itinerario_escalas").insert(escalasToInsert);
    if (errEsc) {
      const code = (errEsc as { code?: string })?.code;
      let errMsg = `Error al guardar escalas: ${errEsc.message}`;
      if (code === "42501") {
        errMsg =
          "Permiso denegado en la base de datos. Ejecute la migración de permisos: supabase db push (o aplique 20260308000005_itinerarios_admin_grants.sql).";
      }
      return json({ error: errMsg, code }, 400);
    }

    const { data: completo } = await admin
      .from("itinerarios")
      .select("*, escalas:itinerario_escalas(*)")
      .eq("id", id)
      .single();

    return json({ success: true, itinerario: completo }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado";
    return json({ error: msg }, 500);
  }
};
