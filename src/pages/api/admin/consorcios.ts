/**
 * API admin consorcios (GET lista; POST crea)
 * Requiere tablas: consorcios, consorcios_servicios, servicios_unicos, navieras, etc.
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
  const log = (step: string, err?: unknown) => {
    if (process.env.NODE_ENV === "development") console.error("[consorcios GET]", step, err ?? "");
  };

  let supabase: ReturnType<typeof createClient>;
  try {
    supabase = createClient(cookies);
  } catch (envErr) {
    log("createClient", envErr);
    const msg = envErr instanceof Error ? envErr.message : "Configuración de Supabase faltante";
    return json({ error: msg }, 503);
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      log("auth", authError?.message);
      return json({ error: "No autenticado" }, 401);
    }

    let db: ReturnType<typeof createClient>;
    try {
      db = createAdminClient();
    } catch {
      db = supabase;
    }

    const { data: consorcios, error: err } = await db
      .from("consorcios")
      .select("*")
      .order("nombre", { ascending: true });

    if (err) {
      log("consorcios select", err.message);
      if (err.message?.includes("does not exist") || err.code === "42P01") {
        return json(
          { error: "La tabla consorcios no existe.", code: "TABLE_NOT_FOUND" },
          500
        );
      }
      return json({ error: err.message }, 400);
    }

    const conDetalles = await Promise.all(
      (consorcios ?? []).map(async (c: Record<string, unknown>) => {
        const { data: csData, error: csErr } = await db
          .from("consorcios_servicios")
          .select("*")
          .eq("consorcio_id", c.id)
          .eq("activo", true)
          .order("orden");

        if (csErr) {
          log("consorcios_servicios select", csErr.message);
        }

        const filas = (csData ?? []) as Record<string, unknown>[];
        const serviciosConNaves = await Promise.all(
          filas.map(async (item: Record<string, unknown>) => {
            const servicioUnicoId = item.servicio_unico_id as string | undefined;
            if (!servicioUnicoId) return { ...item, servicio_unico: null };

            const { data: su, error: suErr } = await db
              .from("servicios_unicos")
              .select("*")
              .eq("id", servicioUnicoId)
              .single();

            if (suErr || !su) {
              log("servicios_unicos single", suErr?.message);
              return { ...item, servicio_unico: null };
            }

            const suRow = su as Record<string, unknown>;
            const [navesRes, destinosRes] = await Promise.all([
              db
                .from("servicios_unicos_naves")
                .select("*")
                .eq("servicio_unico_id", servicioUnicoId)
                .eq("activo", true)
                .order("orden"),
              db
                .from("servicios_unicos_destinos")
                .select("*")
                .eq("servicio_unico_id", servicioUnicoId)
                .eq("activo", true)
                .order("orden"),
            ]);

            let navieraNombre: string | null = null;
            if (suRow.naviera_id) {
              const { data: navRow } = await db
                .from("navieras")
                .select("nombre")
                .eq("id", suRow.naviera_id)
                .single();
              navieraNombre = (navRow as { nombre?: string } | null)?.nombre ?? null;
            }

            return {
              ...item,
              servicio_unico: {
                ...suRow,
                naviera_nombre: navieraNombre,
                naves: navesRes.data || [],
                destinos: destinosRes.data || [],
              },
            };
          })
        );

        return {
          ...c,
          servicios: serviciosConNaves,
          destinos_activos: [] as unknown[],
        };
      })
    );

    return json({ success: true, consorcios: conDetalles });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado";
    log("catch", e);
    return json({ error: msg }, 500);
  }
};

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient(cookies);
    } catch (envErr) {
      const msg = envErr instanceof Error ? envErr.message : "Configuración de Supabase faltante";
      if (process.env.NODE_ENV === "development") console.error("[consorcios POST] createClient:", msg);
      return json({ error: msg }, 503);
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      if (process.env.NODE_ENV === "development") console.error("[consorcios POST] auth:", authError?.message);
      return json({ error: "No autenticado" }, 401);
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : "Body JSON inválido";
      if (process.env.NODE_ENV === "development") console.error("[consorcios POST] request.json:", msg);
      return json({ error: "Cuerpo de la petición inválido" }, 400);
    }

    const nombre = (body.nombre as string)?.trim();
    const serviciosIds = body.servicios_ids as string[] | undefined;

    if (!nombre) return json({ error: "Nombre del consorcio requerido" }, 400);

    let admin: ReturnType<typeof createAdminClient>;
    try {
      admin = createAdminClient();
    } catch {
      if (process.env.NODE_ENV === "development") console.error("[consorcios POST] createAdminClient: SUPABASE_SERVICE_ROLE_KEY no configurado");
      return json(
        { error: "Para crear consorcios configure SUPABASE_SERVICE_ROLE_KEY en .env (Supabase → Project Settings → API)." },
        503
      );
    }

    const { data: nuevo, error: insErr } = await admin
      .from("consorcios")
      .insert({ nombre, activo: true })
      .select()
      .single();

    if (insErr || !nuevo) {
      if (process.env.NODE_ENV === "development") console.error("[consorcios POST] insert consorcios:", insErr?.message, insErr?.code, insErr?.details);
      return json({ error: insErr?.message ?? "Error al crear consorcio" }, 400);
    }

    const consorcioId = (nuevo as { id: string }).id;
    if (Array.isArray(serviciosIds) && serviciosIds.length > 0) {
      const filas = serviciosIds.map((id, i) => ({
        consorcio_id: consorcioId,
        servicio_unico_id: id,
        orden: i,
        activo: true,
      }));
      const { error: servErr } = await admin.from("consorcios_servicios").insert(filas);
      if (servErr) {
        if (process.env.NODE_ENV === "development") console.error("[consorcios POST] insert consorcios_servicios:", servErr.message, servErr.code, servErr.details);
        return json({ error: `Error al vincular servicios: ${servErr.message}` }, 400);
      }
    }

    return json({ success: true, consorcio: nuevo }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado";
    if (process.env.NODE_ENV === "development") console.error("[consorcios POST] catch:", e);
    return json({ error: msg }, 500);
  }
};
