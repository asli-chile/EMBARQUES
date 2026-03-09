import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con clave anónima (RLS aplica). Para APIs públicas de solo lectura.
 */
export function createAnonClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Cliente Supabase con service_role. Solo usar en API routes del servidor.
 * Permite operaciones admin como crear usuarios.
 */
export function createAdminClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
