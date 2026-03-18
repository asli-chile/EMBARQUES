import { useEffect, useState, useMemo } from "react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/auth/AuthContext";
import { createClient } from "@/lib/supabase/client";

const REFRESH_MS = 30_000;
const ONLINE_THRESHOLD_MIN = 3;

/**
 * Muestra el conteo de personas en línea ahora mismo (auth + anon).
 * Solo visible para superadmin.
 * El tracking de la sesión lo maneja OnlineUsersButton → useSessionPresence.
 */
export function VisitCounterBadge() {
  const { isSuperadmin } = useAuth();
  const [count, setCount] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const supabase = useMemo(() => {
    try { return createClient(); } catch { return null; }
  }, []);

  const fetchCount = () => {
    if (!supabase) return;
    const threshold = new Date(Date.now() - ONLINE_THRESHOLD_MIN * 60 * 1000).toISOString();
    supabase
      .from("sesiones_activas")
      .select("*", { count: "exact", head: true })
      .gte("last_seen", threshold)
      .then(({ count: c, error }) => {
        if (!error) setCount(c ?? 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!isSuperadmin) return;
    fetchCount();
    const interval = setInterval(fetchCount, REFRESH_MS);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperadmin, supabase]);

  if (!isSuperadmin) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { fetchCount(); setOpen((v) => !v); }}
        className="flex items-center gap-1.5 h-10 px-2.5 text-neutral-500 hover:bg-neutral-200/80 rounded-full transition-all duration-200 text-xs font-medium"
        title="Personas en el sitio ahora"
        aria-label="Contador de visitantes en línea"
      >
        <Icon icon="lucide:eye" width={16} height={16} />
        <span className="tabular-nums">
          {count === null ? "–" : count}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[199]" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-neutral-200 bg-white shadow-lg z-[200] p-4">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
              En el sitio ahora
            </p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-brand-blue tabular-nums leading-none">
                {count === null ? "–" : count}
              </span>
              <span className="text-xs text-neutral-400 pb-0.5">personas</span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-2">
              Con actividad en los últimos {ONLINE_THRESHOLD_MIN} minutos. Incluye visitantes sin sesión.
            </p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fetchCount(); }}
              className="mt-3 flex items-center gap-1 text-[11px] text-brand-blue hover:underline"
            >
              <Icon icon="lucide:refresh-cw" width={11} height={11} />
              Actualizar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
