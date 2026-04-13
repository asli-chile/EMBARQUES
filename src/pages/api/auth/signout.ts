import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase/server";

const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const loginUrl = `${base}/inicio`;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const url = import.meta.env.PUBLIC_SUPABASE_URL?.trim();
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    return redirect(loginUrl);
  }
  const supabase = createClient(cookies);
  await supabase.auth.signOut();
  return redirect(loginUrl);
};
