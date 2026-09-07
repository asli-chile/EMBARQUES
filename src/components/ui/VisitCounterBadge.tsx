import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/auth/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { parseVisitCount, VISIT_COUNTED_KEY } from "@/lib/visitCounter";
import { IconEye } from "@/components/layout/HeaderActionIcons";

const PANEL_WIDTH_PX = 224;

/**
 * Contador persistente de visitas totales.
 * - Incrementa 1 vez por sesión de navegador para CUALQUIER visitante (anon o auth).
 * - La UI solo es visible para superadmin (≥ sm).
 */
export function VisitCounterBadge() {
  const { isSuperadmin } = useAuth();
  const [total, setTotal] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [alignEnd, setAlignEnd] = useState(false);
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

  const updatePlacement = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;
    const spaceLeft = rect.left;
    const growLeft = spaceLeft >= PANEL_WIDTH_PX || spaceLeft >= spaceRight;
    setAlignEnd(growLeft);
  }, []);

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

  useEffect(() => {
    if (!isSuperadmin || !supabase) return;
    void fetchTotal();
  }, [isSuperadmin, supabase, fetchTotal]);

  useEffect(() => {
    if (!isSuperadmin || !supabase) return;
    const id = window.setInterval(() => {
      void fetchTotal();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [isSuperadmin, supabase, fetchTotal]);

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

  useEffect(() => {
    if (!open) return;
    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    return () => window.removeEventListener("resize", updatePlacement);
  }, [open, updatePlacement]);

  if (!isSuperadmin) return null;

  const panelAlign = alignEnd ? "right-0 left-auto" : "left-0 right-auto";

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => {
          void fetchTotal();
          updatePlacement();
          setOpen((v) => !v);
        }}
        className="flex h-8 items-center gap-1.5 rounded-sm px-2 text-[13px] font-semibold text-[#3d4f6f] transition-colors hover:bg-[#f3f6fb] hover:text-brand-blue"
        title="Total de visitas a la página"
        aria-label="Contador de visitas"
      >
        <IconEye size={15} />
        <span className="tabular-nums">
          {total === null ? "–" : total.toLocaleString("es-CL")}
        </span>
      </button>

      {open && (
        <div className={`absolute top-full mt-2 w-56 rounded-xl border border-neutral-200 bg-white shadow-lg z-[200] p-4 ${panelAlign}`}>
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
