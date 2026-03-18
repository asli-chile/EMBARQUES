import { useEffect, useState, useMemo, useRef } from "react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/auth/AuthContext";
import { createClient } from "@/lib/supabase/client";

type PresenceUser = {
  user_id: string;
  nombre: string;
  email: string;
  rol: string;
  es_guest: boolean;
};

const ROL_COLOR: Record<string, string> = {
  superadmin: "bg-purple-100 text-purple-700",
  admin: "bg-brand-blue/10 text-brand-blue",
  ejecutivo: "bg-sky-100 text-sky-700",
  operador: "bg-amber-100 text-amber-700",
  cliente: "bg-emerald-100 text-emerald-700",
  visitante: "bg-neutral-100 text-neutral-500",
};

const ROL_LABEL: Record<string, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  ejecutivo: "Ejecutivo",
  operador: "Operador",
  cliente: "Cliente",
  usuario: "Usuario",
  visitante: "Visitante",
};

/** ID estable por sesión de navegador (persiste hasta cerrar la pestaña) */
function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = sessionStorage.getItem("_pres_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("_pres_id", id);
  }
  return id;
}

/**
 * - Registra presencia de TODOS los usuarios (autenticados y visitantes).
 * - El botón visible + popover solo aparece para superadmin / admin.
 */
export function OnlineUsersButton() {
  const { profile, isSuperadmin } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const supabase = useMemo(() => {
    try { return createClient(); } catch { return null; }
  }, []);

  const guestId = useMemo(() => getSessionId(), []);

  // ── Presencia: corre para TODOS (auth + visitantes) ─────────────────────────
  useEffect(() => {
    if (!supabase) return;

    const presenceKey = profile?.id ?? guestId;

    const channel = supabase.channel("presencia-usuarios", {
      config: { presence: { key: presenceKey } },
    });

    const syncUsers = () => {
      const state = channel.presenceState<PresenceUser>();
      const users: PresenceUser[] = Object.values(state).flatMap(
        (arr) => arr as PresenceUser[]
      );
      setOnlineUsers(users);
    };

    channel
      .on("presence", { event: "sync" }, syncUsers)
      .on("presence", { event: "join" }, syncUsers)
      .on("presence", { event: "leave" }, syncUsers)
      .subscribe(async (status: string) => {
        if (status !== "SUBSCRIBED") return;
        if (profile) {
          await channel.track({
            user_id: profile.id,
            nombre: profile.nombre,
            email: profile.email,
            rol: profile.rol,
            es_guest: false,
          });
        } else {
          await channel.track({
            user_id: guestId,
            nombre: "Visitante",
            email: "",
            rol: "visitante",
            es_guest: true,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, supabase, guestId]);

  // ── Cerrar popover al click fuera ────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Solo el botón visible para superadmin/admin
  if (!isSuperadmin) return null;

  const authUsers = onlineUsers.filter((u) => !u.es_guest);
  const guests = onlineUsers.filter((u) => u.es_guest);
  const totalCount = onlineUsers.length;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-10 h-10 text-brand-blue hover:bg-neutral-200/80 rounded-full transition-all duration-200"
        aria-label={`Ver usuarios en línea (${totalCount})`}
        title="Usuarios en línea"
      >
        <Icon icon="lucide:users" width={20} height={20} />
        {totalCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-0.5 items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-bold leading-none pointer-events-none">
            {totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-neutral-200 bg-white shadow-lg z-[200]">
          {/* Header del popover */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <p className="text-sm font-semibold text-neutral-800">Usuarios en línea</p>
            <span className="ml-auto text-xs font-medium text-neutral-500 bg-neutral-100 rounded-full px-2 py-0.5">
              {totalCount} conectado{totalCount !== 1 ? "s" : ""}
            </span>
          </div>

          <ul className="max-h-80 overflow-y-auto divide-y divide-neutral-100">
            {onlineUsers.length === 0 ? (
              <li className="px-4 py-4 text-sm text-neutral-400 text-center">
                Sin usuarios conectados
              </li>
            ) : (
              <>
                {/* Usuarios autenticados */}
                {authUsers.map((u) => {
                  const isMe = u.user_id === profile?.id;
                  const initials = u.nombre
                    .split(" ")
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")
                    .toUpperCase();
                  return (
                    <li
                      key={u.user_id}
                      className={`flex items-center gap-3 px-4 py-2.5 ${isMe ? "bg-brand-blue/5" : ""}`}
                    >
                      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue text-xs font-bold shrink-0">
                        {initials}
                        <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-white">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-neutral-800 truncate">
                          {u.nombre}
                          {isMe && (
                            <span className="ml-1.5 text-[10px] text-neutral-400 font-normal">(tú)</span>
                          )}
                        </p>
                        <p className="text-xs text-neutral-500 truncate">{u.email}</p>
                      </div>
                      <span
                        className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ROL_COLOR[u.rol] ?? "bg-neutral-100 text-neutral-600"}`}
                      >
                        {ROL_LABEL[u.rol] ?? u.rol}
                      </span>
                    </li>
                  );
                })}

                {/* Visitantes no autenticados — agrupados */}
                {guests.length > 0 && (
                  <li className="flex items-center gap-3 px-4 py-2.5">
                    <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 shrink-0">
                      <Icon icon="lucide:eye" width={15} height={15} />
                      <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-white">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-600">
                        {guests.length} visitante{guests.length !== 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-neutral-400">Sin sesión iniciada</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
                      Anónimo
                    </span>
                  </li>
                )}
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
