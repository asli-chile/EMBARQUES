import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { sileo } from "sileo";
import { useAuth } from "@/lib/auth/AuthContext";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type NotificacionTipo =
  | "nueva_reserva"
  | "nuevo_transporte"
  | "facturacion"
  | "nueva_factura_ext";

export type Notificacion = {
  id: string;
  tipo: NotificacionTipo;
  titulo: string;
  mensaje: string;
  creado_por_auth_id: string | null;
  creado_por_nombre: string;
  datos: Record<string, unknown> | null;
  created_at: string;
  leida: boolean;
};

type NotificationsContextValue = {
  notificaciones: Notificacion[];
  noLeidas: number;
  marcarLeida: (id: string) => Promise<void>;
  marcarTodasLeidas: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const ICONO_POR_TIPO: Record<string, string> = {
  nueva_reserva:     "📋",
  nuevo_transporte:  "🚛",
  facturacion:       "🧾",
  nueva_factura_ext: "📄",
};

const MAX_NOTIFICACIONES = 50;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const leidasRef = useRef<Set<string>>(new Set());
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  // ── Cargar historial inicial ─────────────────────────────────────────────
  const cargarHistorial = useCallback(async (supabase: SupabaseClient, authId: string) => {
    const [{ data: notifs }, { data: leidas }] = await Promise.all([
      supabase
        .from("notificaciones")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(MAX_NOTIFICACIONES),
      supabase
        .from("notificaciones_leidas")
        .select("notificacion_id")
        .eq("usuario_auth_id", authId),
    ]);

    const leidasSet = new Set(
      (leidas ?? []).map((r) => r.notificacion_id as string),
    );
    leidasRef.current = leidasSet;

    setNotificaciones(
      (notifs ?? []).map((n) => ({
        ...(n as Omit<Notificacion, "leida">),
        leida: leidasSet.has(n.id as string),
      })),
    );
  }, []);

  // ── Suscripción Realtime ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setNotificaciones([]);
      return;
    }

    const authId = user.id;
    let active = true;

    import("@/lib/supabase/client").then(({ createClient }) => {
      if (!active) return;

      const supabase = createClient();
      supabaseRef.current = supabase;

      // Cargar historial
      void cargarHistorial(supabase, authId);

      // Suscribir a nuevas notificaciones en tiempo real
      const channel = supabase
        .channel("notificaciones-global")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notificaciones" },
          (payload) => {
            const nueva = payload.new as Omit<Notificacion, "leida">;

            // Mostrar toast solo a quienes NO crearon la notificación
            if (nueva.creado_por_auth_id !== authId) {
              const icono = ICONO_POR_TIPO[nueva.tipo] ?? "🔔";
              sileo.info({
                title: `${icono} ${nueva.titulo}`,
                description: nueva.mensaje,
              });
            }

            setNotificaciones((prev) => {
              if (prev.some((n) => n.id === nueva.id)) return prev;
              return [
                { ...nueva, leida: nueva.creado_por_auth_id === authId },
                ...prev,
              ].slice(0, MAX_NOTIFICACIONES);
            });
          },
        )
        .subscribe();

      channelRef.current = channel;
    });

    return () => {
      active = false;
      if (channelRef.current && supabaseRef.current) {
        void supabaseRef.current.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, cargarHistorial]);

  // ── Marcar leída ─────────────────────────────────────────────────────────
  const marcarLeida = useCallback(
    async (id: string) => {
      if (!user || leidasRef.current.has(id)) return;
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.from("notificaciones_leidas").upsert({
        notificacion_id: id,
        usuario_auth_id: user.id,
      });
      leidasRef.current.add(id);
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: true } : n)),
      );
    },
    [user],
  );

  // ── Marcar todas leídas ──────────────────────────────────────────────────
  const marcarTodasLeidas = useCallback(async () => {
    if (!user) return;
    const noLeidasList = notificaciones.filter((n) => !n.leida);
    if (noLeidasList.length === 0) return;

    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.from("notificaciones_leidas").upsert(
      noLeidasList.map((n) => ({
        notificacion_id: n.id,
        usuario_auth_id: user.id,
      })),
    );
    noLeidasList.forEach((n) => leidasRef.current.add(n.id));
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
  }, [user, notificaciones]);

  return (
    <NotificationsContext.Provider
      value={{ notificaciones, noLeidas, marcarLeida, marcarTodasLeidas }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    return {
      notificaciones: [] as Notificacion[],
      noLeidas: 0,
      marcarLeida: async (_id: string) => {},
      marcarTodasLeidas: async () => {},
    };
  }
  return ctx;
}

// ── Helper para insertar notificación (llamar desde componentes) ──────────
export async function insertarNotificacion(opts: {
  tipo: NotificacionTipo;
  titulo: string;
  mensaje: string;
  creadoPorAuthId: string;   // user.id (auth UID) — NO profile.id
  creadoPorNombre: string;
  datos?: Record<string, unknown>;
}) {
  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { error } = await supabase.from("notificaciones").insert({
      tipo: opts.tipo,
      titulo: opts.titulo,
      mensaje: opts.mensaje,
      creado_por_auth_id: opts.creadoPorAuthId,
      creado_por_nombre: opts.creadoPorNombre,
      datos: opts.datos ?? null,
    });
    if (error) console.error("[notificaciones] insert error:", error.message);
  } catch (e) {
    console.error("[notificaciones] unexpected error:", e);
  }
}
