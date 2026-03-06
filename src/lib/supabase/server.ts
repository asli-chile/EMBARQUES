import { createServerClient } from "@supabase/ssr";
import type { AstroCookies } from "astro";

export function createClient(cookies: AstroCookies) {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY");
  }
  return createServerClient(url, key, {
    cookies: {
      get(key: string) {
        return cookies.get(key)?.value ?? undefined;
      },
      set(name: string, value: string, options?: Record<string, unknown>) {
        cookies.set(name, value, options as Record<string, unknown>);
      },
      remove(name: string, options?: Record<string, unknown>) {
        cookies.delete(name, options as Record<string, unknown>);
      },
    },
  });
}
