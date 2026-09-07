import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/auth/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useSessionPresence } from "@/lib/useSessionPresence";
import { IconUsers, type HeaderChromeTone } from "@/components/layout/HeaderActionIcons";

type SessionRow = {
  session_id: string;
  nombre: string;
  email: string;
  rol: string;
  es_autenticado: boolean;
  last_seen: string;
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

const FALLBACK_POLL_MS = 10_000;
const ONLINE_THRESHOLD_MIN = 3;
const PANEL_WIDTH_PX = 320;
const PANEL_MAX_HEIGHT_PX = 448;

export function OnlineUsersButton({ tone = "light" }: { tone?: HeaderChromeTone }) {
  const { profile, isSuperadmin } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [open, setOpen] = useState(false);
  const [alignEnd, setAlignEnd] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useSessionPresence();

  const supabase = useMemo(() => {
    try { return createClient(); } catch { return null; }
  }, []);

  const fetchSessions = useCallback(() => {
    if (!supabase) return;
    const threshold = new Date(Date.now() - ONLINE_THRESHOLD_MIN * 60 * 1000).toISOString();
    supabase
      .from("sesiones_activas")
      .select("session_id, nombre, email, rol, es_autenticado, last_seen")
      .gte("last_seen", threshold)
      .order("last_seen", { ascending: false })
      .then(({ data, error }) => { if (!error) setSessions(data ?? []); })
      .catch(() => {});
  }, [supabase]);

  const updatePlacement = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;
    const spaceLeft = rect.left;
    // right-0 hace crecer el panel hacia la izquierda; left-0 hacia la derecha
    const growLeft = spaceLeft >= PANEL_WIDTH_PX || spaceLeft >= spaceRight;
    setAlignEnd(growLeft);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    setOpenUp(spaceBelow < PANEL_MAX_HEIGHT_PX && spaceAbove > spaceBelow);
  }, []);

  useEffect(() => {
    if (!isSuperadmin || !supabase) return;

    fetchSessions();

    const channel = supabase
      .channel("online-users-realtime")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "sesiones_activas" },
        () => fetchSessions()
      )
      .subscribe();

    const fallback = setInterval(fetchSessions, FALLBACK_POLL_MS);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(fallback);
    };
  }, [isSuperadmin, supabase, fetchSessions]);

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

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    return () => window.removeEventListener("resize", updatePlacement);
  }, [open, updatePlacement]);

  const authUsers = useMemo(() => {
    const byEmail = new Map<string, SessionRow>();
    for (const s of sessions) {
      if (!s.es_autenticado) continue;
      const existing = byEmail.get(s.email);
      if (!existing || s.last_seen > existing.last_seen) {
        byEmail.set(s.email, s);
      }
    }
    return Array.from(byEmail.values());
  }, [sessions]);
  const guests = useMemo(() => sessions.filter((s) => !s.es_autenticado), [sessions]);
  const total = authUsers.length + (guests.length > 0 ? 1 : 0);

  if (!isSuperadmin) return null;

  const desktopPos = [
    alignEnd ? "md:right-0 md:left-auto" : "md:left-0 md:right-auto",
    openUp ? "md:bottom-full md:top-auto md:mb-2 md:mt-0" : "md:top-full md:bottom-auto md:mt-2 md:mb-0",
  ].join(" ");

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          fetchSessions();
          updatePlacement();
          setOpen((v) => !v);
        }}
        className={
          tone === "dark"
            ? "relative flex h-8 w-8 items-center justify-center rounded-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            : "relative flex h-8 w-8 items-center justify-center rounded-sm text-[#3d4f6f] transition-colors hover:bg-[#f3f6fb] hover:text-brand-blue"
        }
        aria-label={`Ver usuarios en línea (${total})`}
        title="Usuarios en línea"
      >
        <IconUsers size={15} />
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-sm bg-emerald-500 px-0.5 text-[10px] font-bold leading-none text-white pointer-events-none">
            {total}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[199] bg-black/20 md:bg-transparent"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          <div className={`fixed inset-x-0 bottom-0 z-[200] md:absolute md:inset-auto md:w-80 rounded-t-2xl md:rounded-xl border border-neutral-200 bg-white shadow-lg max-h-[70vh] md:max-h-[28rem] flex flex-col ${desktopPos}`}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100 shrink-0">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <p className="text-sm font-semibold text-neutral-800">En línea ahora</p>
              <span className="ml-auto text-xs font-medium text-neutral-500 bg-neutral-100 rounded-full px-2 py-0.5">
                {total} conectado{total !== 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="md:hidden ml-1 p-1 text-neutral-400 hover:text-neutral-600"
                aria-label="Cerrar"
              >
                <Icon icon="lucide:x" width={16} height={16} />
              </button>
            </div>

            <ul className="flex-1 overflow-y-auto divide-y divide-neutral-100">
              {sessions.length === 0 ? (
                <li className="px-4 py-4 text-sm text-neutral-400 text-center">
                  Sin usuarios conectados
                </li>
              ) : (
                <>
                  {authUsers.map((s) => {
                    const isMe = s.session_id === profile?.id || s.email === profile?.email;
                    const initials = s.nombre
                      .split(" ")
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join("")
                      .toUpperCase();
                    return (
                      <li
                        key={s.session_id}
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
                            {s.nombre}
                            {isMe && (
                              <span className="ml-1.5 text-[10px] text-neutral-400 font-normal">(tú)</span>
                            )}
                          </p>
                          <p className="text-xs text-neutral-500 truncate">{s.email}</p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ROL_COLOR[s.rol] ?? "bg-neutral-100 text-neutral-600"}`}>
                          {ROL_LABEL[s.rol] ?? s.rol}
                        </span>
                      </li>
                    );
                  })}

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

            <div className="px-4 py-2 border-t border-neutral-100 flex items-center justify-between shrink-0">
              <span className="text-[10px] text-neutral-400">Actualización en tiempo real</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); fetchSessions(); }}
                className="text-[11px] text-brand-blue hover:underline flex items-center gap-1"
              >
                <Icon icon="lucide:refresh-cw" width={11} height={11} />
                Actualizar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
