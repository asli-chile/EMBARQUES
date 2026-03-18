import { useEffect, useState, useMemo } from "react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/auth/AuthContext";
import { createClient } from "@/lib/supabase/client";

/** Clave de sessionStorage para no registrar más de una visita por pestaña */
const VISIT_RECORDED_KEY = "_visit_recorded";
/** Clave compartida con OnlineUsersButton para el ID de sesión */
const SESSION_ID_KEY = "_pres_id";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

/**
 * - Registra la visita para TODOS (anon + auth).
 * - Muestra el contador solo a superadmin / admin.
 */
export function VisitCounterBadge() {
  const { profile, isSuperadmin, isLoading } = useAuth();
  const [count, setCount] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const supabase = useMemo(() => {
    try { return createClient(); } catch { return null; }
  }, []);

  // ── Registrar visita (corre para TODOS, espera a que la auth resuelva) ───────
  useEffect(() => {
    if (!supabase || isLoading) return;
    if (sessionStorage.getItem(VISIT_RECORDED_KEY)) return; // ya registrada

    const sessionId = getOrCreateSessionId();
    sessionStorage.setItem(VISIT_RECORDED_KEY, "1");

    supabase
      .from("visitas")
      .upsert(
        { session_id: sessionId, es_autenticado: !!profile },
        { onConflict: "session_id" }
      )
      .then(() => {
        if (isSuperadmin) fetchCount();
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]); // una sola vez cuando la auth termina de cargar

  // ── Obtener conteo total (solo para admin) ───────────────────────────────────
  const fetchCount = () => {
    if (!supabase) return;
    supabase
      .from("visitas")
      .select("*", { count: "exact", head: true })
      .then(({ count: c }) => setCount(c ?? 0));
  };

  useEffect(() => {
    if (!supabase || !isSuperadmin) return;
    fetchCount();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperadmin]);

  // Solo renderizar el badge visual para superadmin/admin
  if (!isSuperadmin) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 h-10 px-2.5 text-neutral-500 hover:bg-neutral-200/80 rounded-full transition-all duration-200 text-xs font-medium"
        title="Total de visitas al sistema"
        aria-label="Contador de visitas"
      >
        <Icon icon="lucide:eye" width={16} height={16} />
        <span className="tabular-nums">
          {count === null ? "–" : count.toLocaleString("es-CL")}
        </span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[199]"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-neutral-200 bg-white shadow-lg z-[200] p-4">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
              Visitas al sistema
            </p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-brand-blue tabular-nums leading-none">
                {count === null ? "–" : count.toLocaleString("es-CL")}
              </span>
              <span className="text-xs text-neutral-400 pb-0.5">sesiones únicas</span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-2">
              Una visita por pestaña de navegador, autenticada o anónima.
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
