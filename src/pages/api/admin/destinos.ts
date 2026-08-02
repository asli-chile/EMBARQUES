/**
 * API admin: crear destino en el catálogo (tabla destinos).
 * POST: staff (superadmin, admin, ejecutivo, operador).
 */
import type { APIRoute } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireStaff } from "@/lib/auth/requireStaff";

export const prerender = false;

type DestinoRow = {
  id: string;
  nombre: string;
  codigo_puerto?: string | null;
  pais?: string | null;
  activo?: boolean | null;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function normalizeNombre(raw: string) {
  return raw.trim().toUpperCase();
}

function isDuplicateError(message?: string | null, code?: string | null) {
  const msg = (message ?? "").toLowerCase();
  return code === "23505" || msg.includes("duplicate") || msg.includes("unique") || msg.includes("already exists");
}

async function findDestinoByNombre(db: SupabaseClient, nombre: string): Promise<DestinoRow | null> {
  const nombreUpper = normalizeNombre(nombre);
  const { data: exact } = await db
    .from("destinos")
    .select("id, nombre, codigo_puerto, pais, activo")
    .eq("nombre", nombreUpper)
    .maybeSingle();
  if (exact) return exact as DestinoRow;

  const { data: rows } = await db
    .from("destinos")
    .select("id, nombre, codigo_puerto, pais, activo");
  const match = (rows ?? []).find((d) => String(d.nombre).toUpperCase() === nombreUpper);
  return (match as DestinoRow | undefined) ?? null;
}

async function ensureDestinoActivo(db: SupabaseClient, destino: DestinoRow): Promise<DestinoRow> {
  if (destino.activo === false) {
    await db.from("destinos").update({ activo: true }).eq("id", destino.id);
    return { ...destino, activo: true };
  }
  return destino;
}

async function createDestino(
  db: SupabaseClient,
  nombreUpper: string,
  codigo_puerto: string | null,
  pais: string | null
): Promise<{ destino?: DestinoRow; error?: string; created?: boolean }> {
  const existing = await findDestinoByNombre(db, nombreUpper);
  if (existing?.id) {
    const active = await ensureDestinoActivo(db, existing);
    return { destino: active, created: false };
  }

  const { data: inserted, error: insErr } = await db
    .from("destinos")
    .insert({ nombre: nombreUpper, codigo_puerto, pais, activo: true })
    .select("id, nombre, codigo_puerto, pais, activo")
    .maybeSingle();

  if (!insErr && inserted) {
    return { destino: inserted as DestinoRow, created: true };
  }

  if (isDuplicateError(insErr?.message, insErr?.code)) {
    const dup = await findDestinoByNombre(db, nombreUpper);
    if (dup) {
      const active = await ensureDestinoActivo(db, dup);
      return { destino: active, created: false };
    }
  }

  return { error: insErr?.message ?? "Error al crear destino" };
}

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const auth = await requireStaff(cookies);
    if (!auth.authorized) return json({ error: auth.error }, auth.status);
    const { admin } = auth;

    const body = (await request.json()) as Record<string, unknown>;
    const nombreRaw = (body.nombre as string)?.trim();
    if (!nombreRaw) return json({ error: "Nombre del destino requerido" }, 400);

    const nombreUpper = normalizeNombre(nombreRaw);
    const codigo_puerto = (body.codigo_puerto as string)?.trim() || null;
    const pais = (body.pais as string)?.trim() || null;

    const result = await createDestino(admin, nombreUpper, codigo_puerto, pais);

    if (result?.destino) {
      const { activo: _activo, ...destino } = result.destino;
      return json({ success: true, destino }, result.created ? 201 : 200);
    }

    const errMsg = result?.error ?? "Error al crear destino";
    const isPermission = errMsg.toLowerCase().includes("permission denied");
    return json(
      {
        error: isPermission
          ? "Sin permisos para crear destinos. Aplique la migración 20260611000000_destinos_insert_grants.sql en Supabase."
          : errMsg,
      },
      400
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado";
    return json({ error: msg }, 500);
  }
};
