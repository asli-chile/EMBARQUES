/**
 * Migración de operaciones desde JSON (p. ej. Google Sheets → Apps Script → POST).
 *
 * GET: JSON de referencia (columnas, tipos, ejemplos, reglas para Hoja 1). Misma auth que POST.
 * POST: body { "rows": [...] } inserta. Con { "dryRun": true, "rows": [...] } devuelve JSON normalizado sin insertar.
 *
 * Auth: Bearer MIGRATION_IMPORT_SECRET, o sesión superadmin.
 */
import type { APIRoute } from "astro";
import type { AstroCookies } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  insertarOperacionesMigracion,
  obtenerDocumentacionMigracionJson,
  previewFilasMigracion,
} from "@/lib/import/operacionesMigracion";

export const prerender = false;

const MAX_FILAS = 2000;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function extraerBearer(request: Request): string | null {
  const h = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim();
}

async function autorizarMigracion(
  request: Request,
  cookies: AstroCookies,
): Promise<{ admin: SupabaseClient } | Response> {
  const secretEnv = import.meta.env.MIGRATION_IMPORT_SECRET;
  const bearer = extraerBearer(request);
  const secretOk = typeof secretEnv === "string" && secretEnv.length >= 16 && bearer === secretEnv;

  if (secretOk) {
    try {
      return { admin: createAdminClient() };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error de configuración";
      return json({ error: msg }, 500);
    }
  }

  const auth = await requireSuperadmin(cookies);
  if (!auth.authorized) {
    return json({ error: auth.error }, auth.status);
  }
  return { admin: auth.admin };
}

export const GET: APIRoute = async ({ request, cookies }) => {
  const auth = await autorizarMigracion(request, cookies);
  if (auth instanceof Response) return auth;

  const postUrl = new URL(request.url);
  postUrl.search = "";

  const doc = obtenerDocumentacionMigracionJson({
    urlPost: postUrl.toString(),
    maxFilas: MAX_FILAS,
  });

  return json(doc);
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await autorizarMigracion(request, cookies);
  if (auth instanceof Response) return auth;

  const { admin } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  if (!body || typeof body !== "object" || !("rows" in body)) {
    return json({ error: 'Se espera un objeto con clave "rows" (array de filas).' }, 400);
  }

  const b = body as { rows: unknown; dryRun?: unknown };
  const dryRun = b.dryRun === true;

  const rows = b.rows;
  if (!Array.isArray(rows)) {
    return json({ error: '"rows" debe ser un array.' }, 400);
  }
  if (rows.length === 0) {
    return json({ error: "El array rows está vacío." }, 400);
  }
  if (rows.length > MAX_FILAS) {
    return json({ error: `Máximo ${MAX_FILAS} filas por solicitud.` }, 400);
  }

  for (let i = 0; i < rows.length; i++) {
    if (rows[i] === null || typeof rows[i] !== "object" || Array.isArray(rows[i])) {
      return json({ error: `La fila en índice ${i} no es un objeto.` }, 400);
    }
  }

  const filas = rows as Record<string, unknown>[];

  if (dryRun) {
    const preview = previewFilasMigracion(filas);
    return json({
      dryRun: true,
      total: filas.length,
      mensaje:
        "Nada se insertó en la base. Revisa filasNormalizadas; cuando esté bien, repite POST sin dryRun.",
      filasNormalizadas: preview.map((p) => ({
        index: p.index,
        payload: p.payload,
        clavesOrdenadas: p.clavesOrdenadas,
      })),
      cuerpoListoParaInsertar: {
        rows: preview.map((p) => p.payload),
      },
    });
  }

  const { resultados, insertadas, fallidas } = await insertarOperacionesMigracion(admin, filas);

  return json({
    ok: fallidas === 0,
    insertadas,
    fallidas,
    total: filas.length,
    resultados,
    ayuda: "GET en esta misma URL devuelve la guía JSON (columnas, ejemplos, dryRun).",
  });
};
