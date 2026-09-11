/**
 * API admin: catálogo de naves.
 * POST: crear nave y asignarla a una naviera (superadmin).
 * PATCH: actualizar IMO/MMSI (superadmin); crea la ficha si solo viene el nombre.
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

function normalizeDigits(raw: unknown): string {
  return String(raw ?? "").trim().replace(/\s+/g, "");
}

function isValidImo(s: string) {
  return /^\d{7}$/.test(s);
}

function isValidMmsi(s: string) {
  return /^\d{9}$/.test(s);
}

/** Vacío → null; si hay valor debe ser IMO/MMSI válido. */
function parseOptionalId(
  raw: unknown,
  kind: "imo" | "mmsi",
): { ok: true; value: string | null } | { ok: false; error: string } {
  const s = normalizeDigits(raw);
  if (!s) return { ok: true, value: null };
  if (kind === "imo" && !isValidImo(s)) {
    return { ok: false, error: "IMO inválido (7 dígitos)" };
  }
  if (kind === "mmsi" && !isValidMmsi(s)) {
    return { ok: false, error: "MMSI inválido (9 dígitos)" };
  }
  return { ok: true, value: s };
}

export const PATCH: APIRoute = async ({ cookies, request }) => {
  try {
    const auth = await requireSuperadmin(cookies);
    if (!auth.authorized) return json({ error: auth.error }, auth.status);
    const { admin } = auth;

    const body = (await request.json()) as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";

    if (!id && !nombre) {
      return json({ error: "Indica id o nombre de la nave" }, 400);
    }

    const imoParsed = parseOptionalId(body.imo, "imo");
    if (!imoParsed.ok) return json({ error: imoParsed.error }, 400);
    const mmsiParsed = parseOptionalId(body.mmsi, "mmsi");
    if (!mmsiParsed.ok) return json({ error: mmsiParsed.error }, 400);

    const patch: { imo: string | null; mmsi: string | null; activo?: boolean; modo_transporte?: string } = {
      imo: imoParsed.value,
      mmsi: mmsiParsed.value,
    };

    let naveId = id;

    if (naveId) {
      const { data: updated, error: upErr } = await admin
        .from("naves")
        .update(patch)
        .eq("id", naveId)
        .select("id, nombre, imo, mmsi, activo, modo_transporte")
        .maybeSingle();
      if (upErr) return json({ error: upErr.message }, 400);
      if (!updated) return json({ error: "Nave no encontrada" }, 404);
      return json({ success: true, nave: updated });
    }

    const { data: existing } = await admin
      .from("naves")
      .select("id, nombre, imo, mmsi, activo, modo_transporte")
      .ilike("nombre", nombre)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const { data: updated, error: upErr } = await admin
        .from("naves")
        .update(patch)
        .eq("id", existing.id)
        .select("id, nombre, imo, mmsi, activo, modo_transporte")
        .single();
      if (upErr || !updated) return json({ error: upErr?.message ?? "Error al actualizar nave" }, 400);
      return json({ success: true, nave: updated });
    }

    const { data: inserted, error: insErr } = await admin
      .from("naves")
      .insert({
        nombre,
        imo: patch.imo,
        mmsi: patch.mmsi,
        activo: true,
        modo_transporte: "maritimo",
      })
      .select("id, nombre, imo, mmsi, activo, modo_transporte")
      .single();

    if (insErr || !inserted) {
      return json({ error: insErr?.message ?? "Error al crear nave" }, 400);
    }
    return json({ success: true, nave: inserted, created: true }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado";
    return json({ error: msg }, 500);
  }
};

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
