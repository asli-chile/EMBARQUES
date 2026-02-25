import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL ?? "";
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) {
    throw new Error("Missing Supabase env: PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY required.");
  }
  return createBrowserClient(url, key);
}
