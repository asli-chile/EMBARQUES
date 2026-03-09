/**
 * Cliente Supabase para servidor en Astro
 * Adaptado desde ASLI/src/lib/supabase-server.ts
 *
 * Uso en endpoints: pasar el contexto { cookies, request } de APIRoute
 */
import { createServerClient } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader) return [];
  return cookieHeader.split(';').map((cookie) => {
    const eq = cookie.trim().indexOf('=');
    if (eq === -1) return { name: '', value: '' };
    return {
      name: cookie.trim().slice(0, eq).trim(),
      value: decodeURIComponent(cookie.trim().slice(eq + 1).trim() || ''),
    };
  }).filter((c) => c.name);
}

export function createSupabaseServerClient(context: {
  cookies: AstroCookies;
  request: Request;
}) {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY deben estar definidas');
  }

  const cookieHeader = context.request.headers.get('Cookie') ?? '';

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(cookieHeader);
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          if (value) {
            context.cookies.set(name, value, {
              path: options?.path ?? '/',
              maxAge: options?.maxAge,
              domain: options?.domain,
              secure: options?.secure,
              httpOnly: options?.httpOnly ?? true,
              sameSite: (options?.sameSite as 'lax' | 'strict' | 'none') ?? 'lax',
            });
          } else {
            context.cookies.delete(name, { path: options?.path ?? '/' });
          }
        });
      },
    },
  });
}
