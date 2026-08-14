import type { APIRoute } from "astro";
import { requireAdminOrAbove } from "@/lib/auth/requireSuperadmin";

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = async ({ cookies }) => {
  const auth = await requireAdminOrAbove(cookies);
  if (!auth.authorized) {
    return jsonResponse({ error: auth.error }, auth.status);
  }
  const { admin } = auth;

  const [empresasRes, usuariosRes, ueRes] = await Promise.all([
    admin.from("empresas").select("id, nombre").order("nombre"),
    admin.from("usuarios").select("id, nombre, email, rol, activo").eq("activo", true).order("nombre"),
    admin.from("usuarios_empresas").select("usuario_id, empresa_id"),
  ]);

  if (empresasRes.error) return jsonResponse({ error: empresasRes.error.message }, 500);
  if (usuariosRes.error) return jsonResponse({ error: usuariosRes.error.message }, 500);
  if (ueRes.error) return jsonResponse({ error: ueRes.error.message }, 500);

  const ejecutivos = (usuariosRes.data ?? []).filter((u) => u.rol === "ejecutivo");
  const clientes = (usuariosRes.data ?? []).filter((u) => u.rol === "cliente");
  const rolById = new Map((usuariosRes.data ?? []).map((u) => [u.id, u.rol]));

  const porEmpresa: Record<string, { ejecutivoIds: string[]; clienteIds: string[] }> = {};
  for (const row of ueRes.data ?? []) {
    const bucket = porEmpresa[row.empresa_id] ?? { ejecutivoIds: [], clienteIds: [] };
    const rol = rolById.get(row.usuario_id);
    if (rol === "ejecutivo") bucket.ejecutivoIds.push(row.usuario_id);
    if (rol === "cliente") bucket.clienteIds.push(row.usuario_id);
    porEmpresa[row.empresa_id] = bucket;
  }

  return jsonResponse({
    empresas: empresasRes.data ?? [],
    ejecutivos,
    clientes,
    porEmpresa,
  });
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return jsonResponse({ error: "Content-Type: application/json" }, 400);
  }
  const auth = await requireAdminOrAbove(cookies);
  if (!auth.authorized) {
    return jsonResponse({ error: auth.error }, auth.status);
  }
  const { admin } = auth;

  const body = (await request.json()) as {
    empresaId?: string;
    ejecutivoIds?: string[];
    clienteIds?: string[];
  };
  const empresaId = typeof body.empresaId === "string" ? body.empresaId : "";
  if (!empresaId) return jsonResponse({ error: "empresaId requerido" }, 400);

  const updateEjecutivos = Array.isArray(body.ejecutivoIds);
  const updateClientes = Array.isArray(body.clienteIds);
  if (!updateEjecutivos && !updateClientes) {
    return jsonResponse({ error: "Indica ejecutivoIds o clienteIds" }, 400);
  }

  const { data: usuarios, error: usersErr } = await admin
    .from("usuarios")
    .select("id, rol, activo");
  if (usersErr) return jsonResponse({ error: usersErr.message }, 500);

  const ejecutivoIdsAll = (usuarios ?? []).filter((u) => u.rol === "ejecutivo").map((u) => u.id);
  const clienteIdsAll = (usuarios ?? []).filter((u) => u.rol === "cliente").map((u) => u.id);
  const ejecutivoIdsActive = (usuarios ?? [])
    .filter((u) => u.rol === "ejecutivo" && u.activo)
    .map((u) => u.id);
  const clienteIdsActive = (usuarios ?? [])
    .filter((u) => u.rol === "cliente" && u.activo)
    .map((u) => u.id);

  if (updateEjecutivos && ejecutivoIdsAll.length > 0) {
    const { error: delErr } = await admin
      .from("usuarios_empresas")
      .delete()
      .eq("empresa_id", empresaId)
      .in("usuario_id", ejecutivoIdsAll);
    if (delErr) return jsonResponse({ error: delErr.message }, 500);

    const next = (body.ejecutivoIds ?? []).filter((id) => ejecutivoIdsActive.includes(id));
    if (next.length > 0) {
      const { error: insErr } = await admin.from("usuarios_empresas").insert(
        next.map((usuario_id) => ({ usuario_id, empresa_id: empresaId }))
      );
      if (insErr) return jsonResponse({ error: insErr.message }, 500);
    }
  }

  if (updateClientes && clienteIdsAll.length > 0) {
    const { error: delErr } = await admin
      .from("usuarios_empresas")
      .delete()
      .eq("empresa_id", empresaId)
      .in("usuario_id", clienteIdsAll);
    if (delErr) return jsonResponse({ error: delErr.message }, 500);

    const next = (body.clienteIds ?? []).filter((id) => clienteIdsActive.includes(id));
    if (next.length > 0) {
      const { error: insErr } = await admin.from("usuarios_empresas").insert(
        next.map((usuario_id) => ({ usuario_id, empresa_id: empresaId }))
      );
      if (insErr) return jsonResponse({ error: insErr.message }, 500);
    }
  }

  return jsonResponse({ ok: true });
};
