/**
 * API admin de itinerarios (GET con auth; POST crea itinerario)
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

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const supabase = createClient(cookies);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "No autorizado" }, 401);

    const admin = createAdminClient();
    const { data: itinerarios, error: err } = await admin
      .from("itinerarios")
      .select("*, escalas:itinerario_escalas(*)")
      .order("servicio", { ascending: true })
      .order("etd", { ascending: true });

    if (err) {
      if (err.message?.includes("does not exist") || err.code === "42P01") {
        return json({ error: "La tabla de itinerarios no existe.", code: "TABLE_NOT_FOUND" }, 500);
      }
      return json({ error: err.message }, 400);
    }

    const serviciosMap = new Map<string, unknown[]>();
    (itinerarios || []).forEach((it: Record<string, unknown>) => {
      const key = String(it.servicio_id ?? it.servicio ?? "sin-servicio");
      if (!serviciosMap.has(key)) serviciosMap.set(key, []);
      serviciosMap.get(key)!.push(it);
    });

    const result = (itinerarios || []).map((it: Record<string, unknown>) => {
      const key = String(it.servicio_id ?? it.servicio ?? "sin-servicio");
      const viajes = serviciosMap.get(key) || [];
      let escalas = (it.escalas as unknown[]) || [];
      if (viajes.length && escalas.length) {
        const primerViaje = [...viajes]
          .filter((v: Record<string, unknown>) => (v.escalas as unknown[])?.length)
          .sort((a, b) =>
            a.etd && b.etd
              ? new Date(a.etd as string).getTime() - new Date(b.etd as string).getTime()
              : 0
          )[0] as Record<string, unknown> | undefined;
        if (primerViaje?.escalas?.length) {
          const ordenPorPuerto = new Map<string, number>();
          [...(primerViaje.escalas as unknown[])]
            .sort((a, b) => {
              const aa = a as Record<string, unknown>;
              const bb = b as Record<string, unknown>;
              if (!aa.eta && !bb.eta)
                return ((aa.orden as number) ?? 0) - ((bb.orden as number) ?? 0);
              if (!aa.eta) return 1;
              if (!bb.eta) return -1;
              return (
                new Date(aa.eta as string).getTime() - new Date(bb.eta as string).getTime()
              );
            })
            .forEach((e: unknown, i: number) => {
              const ee = e as Record<string, unknown>;
              ordenPorPuerto.set(
                String(ee.puerto ?? ee.puerto_nombre ?? ""),
                i + 1
              );
            });
          escalas = [...escalas].sort((a, b) => {
            const aa = a as Record<string, unknown>;
            const bb = b as Record<string, unknown>;
            const oa =
              ordenPorPuerto.get(String(aa.puerto ?? aa.puerto_nombre ?? "")) ?? 999;
            const ob =
              ordenPorPuerto.get(String(bb.puerto ?? bb.puerto_nombre ?? "")) ?? 999;
            return oa - ob;
          });
        }
      }
      return { ...it, escalas };
    });

    return json({ success: true, itinerarios: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado";
    return json({ error: msg }, 500);
  }
};

export const POST: APIRoute = async ({ cookies, request }) => {
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

    const { nave, viaje, pol, etd, servicio, consorcio, naviera, operador, semana, servicio_id, escalas } = body;
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

    let admin: ReturnType<typeof createAdminClient>;
    try {
      admin = createAdminClient();
    } catch {
      return json({ error: "Configure SUPABASE_SERVICE_ROLE_KEY para crear itinerarios." }, 503);
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

    const { data: nuevo, error: insErr } = await admin
      .from("itinerarios")
      .insert({
        servicio: (servicio as string)?.trim() || "Servicio",
        consorcio: (consorcio as string)?.trim() || null,
        naviera: (naviera as string)?.trim() || null,
        operador: (operador as string)?.trim() || null,
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
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (insErr || !nuevo) {
      const code = (insErr as { code?: string })?.code;
      let msg = insErr?.message ?? "Error al insertar itinerario";
      if (code === "42501") {
        msg =
          "Permiso denegado en la base de datos. Ejecute la migración de permisos: supabase db push (o aplique 20260308000005_itinerarios_admin_grants.sql).";
      }
      return json({ error: msg, code }, 400);
    }

    const toDateStr = (v: unknown): string | null => {
      if (v == null || v === "") return null;
      const s = String(v).trim();
      if (!s) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      if (s.includes("T")) return s.slice(0, 10);
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    };

    const escalasToInsert = escalasList.map((e: unknown, i: number) => {
      const ee = e as Record<string, unknown>;
      const num = ee.dias_transito;
      const diasTransito =
        typeof num === "number" && !Number.isNaN(num) ? num : typeof num === "string" ? parseInt(String(num).trim(), 10) || null : null;
      return {
        itinerario_id: (nuevo as { id: string }).id,
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
      await admin.from("itinerarios").delete().eq("id", (nuevo as { id: string }).id);
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
      .eq("id", (nuevo as { id: string }).id)
      .single();

    return json({ success: true, itinerario: completo ?? nuevo }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado";
    return json({ error: msg }, 500);
  }
};
