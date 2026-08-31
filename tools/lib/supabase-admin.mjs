/**
 * Conexión compartida por los scripts de tools/: cliente Supabase con service
 * role, que evita RLS a propósito porque son tareas administrativas de datos.
 */
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

/** Raíz del proyecto ERP, dos niveles arriba de tools/lib. */
export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function conectar() {
  dotenv.config({ path: join(RAIZ, ".env.local"), quiet: true });
  dotenv.config({ path: join(RAIZ, ".env"), quiet: true });
  const url = process.env.PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Trae todas las operaciones vivas, paginando el límite de 1000 filas. */
export async function traerOperaciones(supabase, columnas = "*") {
  const todas = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase
      .from("operaciones")
      .select(columnas)
      .is("deleted_at", null)
      .range(desde, desde + 999);
    if (error) throw new Error(error.message);
    todas.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return todas;
}
