/**
 * API admin servicios únicos (GET lista; POST crea, solo superadmin)
 * Requiere tablas: servicios_unicos, servicios_unicos_naves, servicios_unicos_destinos, navieras
 */
import type { APIRoute } from "astro";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { normalizeArea } from "@/lib/areas";
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
  let supabase: ReturnType<typeof createClient>;
  try {
    supabase = createClient(cookies);
  } catch (envErr) {
    const msg = envErr instanceof Error ? envErr.message : "Configuración de Supabase faltante";
    return json({ error: msg }, 503);
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "No autenticado" }, 401);

    let db: ReturnType<typeof createClient>;
    try {
      db = createAdminClient();
    } catch {
      db = supabase;
    }

    const { data: servicios, error: err } = await db
      .from("servicios_unicos")
      .select("*")
      .order("nombre", { ascending: true });

    if (err) {
      const isTableMissing = err.message?.includes("does not exist") || err.code === "42P01";
      return json(
        {
          error: isTableMissing
            ? "La tabla servicios_unicos no existe. Ejecute la migración 20260307100001_servicios_unicos_consorcios.sql en Supabase."
            : err.message,
          code: isTableMissing ? "TABLE_NOT_FOUND" : err.code,
        },
        isTableMissing ? 404 : 500
      );
    }

    const list = servicios ?? [];
    const navieraIds = [
      ...new Set(
        list
          .map((s: Record<string, unknown>) => s.naviera_id as string)
          .filter(Boolean)
      ),
    ];
    const navierasMap: Record<string, { id: string; nombre: string }> = {};
    if (navieraIds.length > 0) {
      const { data: navieras, error: navErr } = await db
        .from("navieras")
        .select("id, nombre")
        .in("id", navieraIds);
      if (!navErr && Array.isArray(navieras)) {
        for (const n of navieras as { id: string; nombre: string }[]) {
          if (n?.id) navierasMap[n.id] = { id: n.id, nombre: n.nombre ?? "" };
        }
      }
    }

    const conDetalles = await Promise.all(
      list.map(async (s: Record<string, unknown>) => {
        const id = s.id as string;
        const nav = navierasMap[s.naviera_id as string];
        const [navesRes, destinosRes] = await Promise.all([
          db.from("servicios_unicos_naves").select("*").eq("servicio_unico_id", id).eq("activo", true).order("orden"),
          db.from("servicios_unicos_destinos").select("*").eq("servicio_unico_id", id).eq("activo", true).order("orden"),
        ]);
        const nombreNaviera = (s.naviera_nombre as string)?.trim() || nav?.nombre || null;
        return {
          ...s,
          naviera: nav ? { id: nav.id, nombre: nav.nombre } : (nombreNaviera ? { id: s.naviera_id as string, nombre: nombreNaviera } : null),
          naviera_nombre: nombreNaviera,
          naves: navesRes.data ?? [],
          destinos: destinosRes.data ?? [],
        };
      })
    );

    return json({ success: true, servicios: conDetalles });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado";
    return json({ error: msg }, 500);
  }
};

export const POST: APIRoute = async ({ cookies, request }) => {
  let supabase: ReturnType<typeof createClient>;
  try {
    supabase = createClient(cookies);
  } catch (envErr) {
    const msg = envErr instanceof Error ? envErr.message : "Configuración de Supabase faltante";
    return json({ error: msg }, 503);
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "No autenticado" }, 401);

    const auth = await requireSuperadmin(cookies);
    if (!auth.authorized) return json({ error: auth.error }, auth.status);

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ error: "Cuerpo de la petición inválido (JSON esperado)" }, 400);
    }
    const { nombre, naviera_id, naviera_nombre, puerto_origen, naves, destinos } = body;

    if (!(nombre as string)?.trim()) return json({ error: "Nombre requerido" }, 400);
    if (!naviera_id) return json({ error: "Naviera requerida" }, 400);
    const nombreNaviera = (naviera_nombre as string)?.trim() ?? "";
    const navesList = Array.isArray(naves) ? naves : [];
    if (!navesList.length) return json({ error: "Al menos una nave" }, 400);
    const destinosList = Array.isArray(destinos) ? destinos : [];
    if (!destinosList.length) return json({ error: "Al menos un destino" }, 400);
    if (!(puerto_origen as string)?.trim())
      return json({ error: "Puerto de origen requerido" }, 400);

    const admin = auth.admin;

    const { data: nuevo, error: insErr } = await admin
      .from("servicios_unicos")
      .insert({
        nombre: (nombre as string).trim(),
        naviera_id,
        naviera_nombre: nombreNaviera,
        puerto_origen: (puerto_origen as string).trim(),
        activo: true,
      })
      .select()
      .single();

    if (insErr) {
      return json({ error: insErr.message ?? "Error al crear el servicio" }, 400);
    }
    const nuevoRow = nuevo as { id?: string } | null;
    if (!nuevoRow?.id) {
      return json({ error: "El servicio se creó pero no se devolvió el ID" }, 500);
    }
    const nuevoId = nuevoRow.id;

    const navesToInsert = navesList.map((n: unknown, i: number) => ({
      servicio_unico_id: nuevoId,
      nave_nombre: (typeof n === "string" ? n : (n as Record<string, unknown>)?.nave_nombre ?? n)?.toString?.()?.trim?.() ?? String(n),
      activo: true,
      orden: i,
    }));
    const destinosToInsert = destinosList.map((d: unknown, i: number) => {
      const dd = (d && typeof d === "object" ? d : {}) as Record<string, unknown>;
      return {
        servicio_unico_id: nuevoId,
        puerto: String(dd.puerto ?? "").trim() || "",
        puerto_nombre: (dd.puerto_nombre != null ? String(dd.puerto_nombre) : "").trim() || null,
        area: normalizeArea(dd.area),
        orden: typeof dd.orden === "number" ? dd.orden : i,
        activo: true,
      };
    });

    const [navesRes, destinosRes] = await Promise.all([
      admin.from("servicios_unicos_naves").insert(navesToInsert),
      admin.from("servicios_unicos_destinos").insert(destinosToInsert),
    ]);
    if (navesRes.error) {
      return json({ error: `Error al guardar naves: ${navesRes.error.message}` }, 400);
    }
    if (destinosRes.error) {
      return json({ error: `Error al guardar destinos: ${destinosRes.error.message}` }, 400);
    }

    return json({ success: true, servicio: nuevo }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado";
    return json({ error: msg }, 500);
  }
};
