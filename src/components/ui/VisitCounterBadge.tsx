import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/auth/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { parseVisitCount, VISIT_COUNTED_KEY } from "@/lib/visitCounter";

/**
 * Contador persistente de visitas totales.
 * - Incrementa 1 vez por sesión de navegador para CUALQUIER visitante (anon o auth).
 * - La UI solo es visible para superadmin (≥ sm).
 */
export function VisitCounterBadge() {
  const { isSuperadmin } = useAuth();
  const [total, setTotal] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const fetchTotal = useCallback(async () => {
    if (!supabase) return;
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("conteo_visitas")
        .select("total")
        .eq("id", 1)
        .single();
      if (!error && data) {
        const parsed = parseVisitCount(data.total);
        if (parsed !== null) setTotal(parsed);
      }
    } catch {
      /* ignore */
    } finally {
      setRefreshing(false);
    }
  }, [supabase]);

  // Contar visita: todos los visitantes, una vez por sesión de navegador
  useEffect(() => {
    if (!supabase) return;
    if (sessionStorage.getItem(VISIT_COUNTED_KEY)) return;

    let cancelled = false;

    void (async () => {
      const { data, error } = await supabase.rpc("incrementar_visitas");
      if (cancelled) return;

      const parsed = parseVisitCount(data);
      if (error || parsed === null) {
        if (import.meta.env.DEV) {
          console.warn("[visitas] incrementar_visitas falló:", error?.message ?? "respuesta inválida");
        }
        return;
      }

      sessionStorage.setItem(VISIT_COUNTED_KEY, "1");
      setTotal((prev) => (prev === null ? parsed : prev));
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // Superadmin: cargar total al montar / al pasar a superadmin
  useEffect(() => {
    if (!isSuperadmin || !supabase) return;
    void fetchTotal();
  }, [isSuperadmin, supabase, fetchTotal]);

  // Superadmin: refrescar periódicamente mientras el badge está montado
  useEffect(() => {
    if (!isSuperadmin || !supabase) return;
    const id = window.setInterval(() => {
      void fetchTotal();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [isSuperadmin, supabase, fetchTotal]);

  // Realtime (requiere migración 20260901000001_conteo_visitas_realtime.sql)
  useEffect(() => {
    if (!isSuperadmin || !supabase) return;
    const channel = supabase
      .channel("conteo-visitas-live")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conteo_visitas" },
        (payload) => {
          const parsed = parseVisitCount((payload.new as { total?: unknown } | null)?.total);
          if (parsed !== null) setTotal(parsed);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel).catch(() => {});
    };
  }, [isSuperadmin, supabase]);

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

  if (!isSuperadmin) return null;

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => {
          void fetchTotal();
          setOpen((v) => !v);
        }}
        className="flex items-center gap-1.5 h-11 px-3 text-neutral-600 hover:bg-neutral-200/80 rounded-full transition-all duration-200 text-base font-semibold"
        title="Total de visitas a la página"
        aria-label="Contador de visitas"
      >
        <Icon icon="lucide:eye" width={20} height={20} />
        <span className="tabular-nums text-lg">
          {total === null ? "–" : total.toLocaleString("es-CL")}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-neutral-200 bg-white shadow-lg z-[200] p-4">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
            Visitas totales
          </p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-brand-blue tabular-nums leading-none">
              {total === null ? "–" : total.toLocaleString("es-CL")}
            </span>
            <span className="text-xs text-neutral-400 pb-0.5">visitas</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-2">
            Cada sesión de navegador cuenta como una visita (cualquier visitante).
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void fetchTotal();
            }}
            className="mt-3 flex items-center gap-1 text-[11px] text-brand-blue hover:underline disabled:opacity-50"
            disabled={refreshing}
          >
            <Icon
              icon="lucide:refresh-cw"
              width={11}
              height={11}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      )}
    </div>
  );
}
