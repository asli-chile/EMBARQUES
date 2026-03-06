import type { APIRoute, AstroCookies } from "astro";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type DbCliente = {
  id: string;
  empresa_id: string | null;
  limite_credito?: number | null;
  condicion_pago?: string | null;
  descuento?: number | null;
  activo?: boolean | null;
  empresa_nombre?: string;
};

async function requireSuperadmin(cookies: AstroCookies) {
  const supabase = createClient(cookies);
  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser();
  if (sessionError || !user) {
    return { authorized: false as const, status: 401, error: "Inicia sesión" };
  }
  const { data: perfil, error } = await supabase
    .from("usuarios")
    .select("rol, activo")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  if (error || !perfil) {
    return { authorized: false as const, status: 403, error: "Perfil no encontrado o inactivo" };
  }
  const rol = (perfil.rol ?? "") as string;
  if (trim(rol) !== "superadmin") {
    return { authorized: false as const, status: 403, error: "Solo superadmin" };
  }
  const admin = createAdminClient();
  return { authorized: true as const, admin };
}

function trim(s: string): string {
  return s.replace(/^\s+|\s+$/g, "");
}

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = async ({ cookies }) => {
  const auth = await requireSuperadmin(cookies);
  if (!auth.authorized) {
    return jsonResponse({ error: auth.error }, auth.status);
  }
  const { admin } = auth;
  const { data: clientesData, error: errClientes } = await admin
    .from("clientes")
    .select("id, empresa_id, limite_credito, condicion_pago, descuento, activo")
    .order("id");
  if (errClientes) {
    return jsonResponse({ error: errClientes.message }, 500);
  }
  const raw = (clientesData ?? []) as Record<string, unknown>[];
  const clientes: DbCliente[] = raw.map((r) => ({
    id: String(r.id ?? ""),
    empresa_id: r.empresa_id != null ? String(r.empresa_id) : null,
    limite_credito: r.limite_credito != null ? Number(r.limite_credito) : null,
    condicion_pago: r.condicion_pago != null ? String(r.condicion_pago) : null,
    descuento: r.descuento != null ? Number(r.descuento) : null,
    activo: r.activo != null ? Boolean(r.activo) : null,
  }));
  const { data: empresasData } = await admin.from("empresas").select("id, nombre").order("nombre");
  const empresas = (empresasData ?? []) as { id: string; nombre: string }[];
  const empMap = new Map(empresas.map((e) => [e.id, e.nombre]));
  const clientesConNombre = clientes.map((c) => ({
    ...c,
    empresa_nombre: c.empresa_id ? empMap.get(c.empresa_id) ?? "—" : "—",
  }));
  return jsonResponse({ clientes: clientesConNombre, empresas });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return jsonResponse({ error: "Content-Type: application/json" }, 400);
  }
  const auth = await requireSuperadmin(cookies);
  if (!auth.authorized) {
    return jsonResponse({ error: auth.error }, auth.status);
  }
  const body = (await request.json()) as Record<string, unknown>;
  const { data, error } = await auth.admin
    .from("clientes")
    .insert({
      empresa_id: body.empresa_id ?? null,
      limite_credito: body.limite_credito ?? null,
      condicion_pago: body.condicion_pago ?? null,
      descuento: body.descuento ?? null,
      activo: body.activo ?? true,
    })
    .select("id, empresa_id, limite_credito, condicion_pago, descuento, activo")
    .single();
  if (error) return jsonResponse({ error: error.message }, 400);
  return jsonResponse({ data: data as DbCliente });
};

export const PATCH: APIRoute = async ({ request, cookies }) => {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return jsonResponse({ error: "Content-Type: application/json" }, 400);
  }
  const auth = await requireSuperadmin(cookies);
  if (!auth.authorized) {
    return jsonResponse({ error: auth.error }, auth.status);
  }
  const body = (await request.json()) as { id: string } & Record<string, unknown>;
  const { id, ...rest } = body;
  if (!id || typeof id !== "string") {
    return jsonResponse({ error: "id requerido" }, 400);
  }
  const payload: Record<string, unknown> = {};
  if ("empresa_id" in rest) payload.empresa_id = rest.empresa_id;
  if ("limite_credito" in rest) payload.limite_credito = rest.limite_credito;
  if ("condicion_pago" in rest) payload.condicion_pago = rest.condicion_pago;
  if ("descuento" in rest) payload.descuento = rest.descuento;
  if ("activo" in rest) payload.activo = rest.activo;
  if (Object.keys(payload).length === 0) {
    return jsonResponse({ error: "Nada que actualizar" }, 400);
  }
  const { error: err } = await auth.admin.from("clientes").update(payload).eq("id", id);
  if (err) return jsonResponse({ error: err.message }, 400);
  return jsonResponse({ ok: true });
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return jsonResponse({ error: "Content-Type: application/json" }, 400);
  }
  const auth = await requireSuperadmin(cookies);
  if (!auth.authorized) {
    return jsonResponse({ error: auth.error }, auth.status);
  }
  const body = (await request.json()) as { ids?: string[] };
  const ids = Array.isArray(body.ids) ? body.ids : [];
  if (ids.length === 0) return jsonResponse({ error: "ids requerido (array)" }, 400);
  const { error } = await auth.admin.from("clientes").delete().in("id", ids);
  if (error) return jsonResponse({ error: error.message }, 400);
  return jsonResponse({ ok: true });
};
