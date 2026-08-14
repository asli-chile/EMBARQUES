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

const HEARTBEAT_MS = 15_000;

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
      supabase.rpc("upsert_sesion_activa", { p_session_id: sessionId }).then(() => {}).catch(() => {});

    upsert();
    const interval = setInterval(upsert, HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [profile, supabase, sessionId, isLoading]);

  return sessionId;
}
