/**
 * Cliente Supabase para el navegador (Astro/React)
 * Usar en componentes con client:load para leer catálogos (navieras, naves, destinos)
 */
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Faltan PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY');
  return createSupabaseClient(url, key);
}
