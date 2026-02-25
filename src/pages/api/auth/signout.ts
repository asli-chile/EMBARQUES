import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase/server";

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const url = import.meta.env.PUBLIC_SUPABASE_URL?.trim();
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    return redirect("/auth/login");
  }
  const supabase = createClient(cookies);
  await supabase.auth.signOut();
  return redirect("/auth/login");
};
