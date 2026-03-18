import { useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { createClient } from "@/lib/supabase/client";

const SESSION_ID_KEY = "_pres_id";

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

const HEARTBEAT_MS = 60_000; // actualizar last_seen cada 60s

/**
 * Registra la sesión actual en `sesiones_activas` y la mantiene viva con heartbeat.
 * Funciona para usuarios anónimos y autenticados.
 * Llámalo en cualquier componente montado globalmente (Header, AppShell, etc.)
 */
export function useSessionPresence() {
  const { profile, isLoading } = useAuth();

  const supabase = useMemo(() => {
    try { return createClient(); } catch { return null; }
  }, []);

  const sessionId = useMemo(() => getOrCreateSessionId(), []);

  useEffect(() => {
    if (!supabase || isLoading) return;

    const upsert = () =>
      supabase.from("sesiones_activas").upsert(
        {
          session_id: sessionId,
          last_seen: new Date().toISOString(),
          nombre: profile?.nombre ?? "Visitante",
          email: profile?.email ?? "",
          rol: profile?.rol ?? "visitante",
          es_autenticado: !!profile,
        },
        { onConflict: "session_id" }
      ).then(() => {}).catch(() => {});

    upsert();
    const interval = setInterval(upsert, HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [profile, supabase, sessionId, isLoading]);

  return sessionId;
}
