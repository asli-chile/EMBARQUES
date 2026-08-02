/**
 * API admin: crear nave en el catálogo y asignarla a una naviera.
 * POST: solo superadmin.
 */
import type { APIRoute } from "astro";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const auth = await requireSuperadmin(cookies);
    if (!auth.authorized) return json({ error: auth.error }, auth.status);
    const { admin } = auth;

    const body = (await request.json()) as Record<string, unknown>;
    const nombre = (body.nombre as string)?.trim();
    const navieraId = body.naviera_id as string;
    if (!nombre) return json({ error: "Nombre de la nave requerido" }, 400);
    if (!navieraId) return json({ error: "Naviera requerida para asignar la nave" }, 400);

    const { data: existing } = await admin
      .from("naves")
      .select("id, nombre")
      .ilike("nombre", nombre)
      .limit(1)
      .maybeSingle();

    let naveId: string;
    if (existing?.id) {
      naveId = existing.id as string;
    } else {
      const { data: inserted, error: insErr } = await admin
        .from("naves")
        .insert({ nombre })
        .select("id")
        .single();
      if (insErr || !inserted) {
        const isDuplicate = insErr?.code === "23505" || insErr?.message?.includes("duplicate") || insErr?.message?.includes("unique");
        if (isDuplicate) {
          const { data: existing2 } = await admin.from("naves").select("id").ilike("nombre", nombre).limit(1).maybeSingle();
          if (existing2?.id) {
            naveId = existing2.id as string;
          } else {
            return json({ error: insErr?.message ?? "La nave ya existe pero no se pudo vincular" }, 400);
          }
        } else {
          return json({ error: insErr?.message ?? "Error al crear nave" }, 400);
        }
      } else {
        naveId = (inserted as { id: string }).id;
      }
    }

    const { error: linkErr } = await admin
      .from("navieras_naves")
      .insert({ nave_id: naveId, naviera_id: navieraId });
    if (linkErr) {
      const isDuplicate =
        String(linkErr.code) === "23505" ||
        linkErr.message?.toLowerCase().includes("duplicate") ||
        linkErr.message?.toLowerCase().includes("unique");
      const { data: existingLink } = await admin
        .from("navieras_naves")
        .select("id")
        .eq("nave_id", naveId)
        .eq("naviera_id", navieraId)
        .maybeSingle();
      if (isDuplicate || existingLink?.id) {
        const { data: nave } = await admin.from("naves").select("id, nombre").eq("id", naveId).single();
        return json({ success: true, nave: nave ?? { id: naveId, nombre } }, 200);
      }
      return json({ error: linkErr.message ?? "Error al asignar nave a la naviera" }, 400);
    }

    const { data: nave } = await admin
      .from("naves")
      .select("id, nombre")
      .eq("id", naveId)
      .single();

    return json({ success: true, nave: nave ?? { id: naveId, nombre } }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado";
    return json({ error: msg }, 500);
  }
};
