import { useEffect, useState, useMemo, useRef } from "react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/auth/AuthContext";
import { createClient } from "@/lib/supabase/client";

const VISITED_KEY = "_visit_counted";

/**
 * Contador persistente de visitas totales a la página.
 * Incrementa una vez por sesión de navegador (sessionStorage).
 * Solo visible para superadmin.
 */
export function VisitCounterBadge() {
  const { isSuperadmin } = useAuth();
  const [total, setTotal] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const counted = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const supabase = useMemo(() => {
    try { return createClient(); } catch { return null; }
  }, []);

  const fetchTotal = () => {
    if (!supabase) return;
    supabase
      .from("conteo_visitas")
      .select("total")
      .eq("id", 1)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setTotal(data.total);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!supabase || counted.current || !isSuperadmin) return;
    const alreadyCounted = sessionStorage.getItem(VISITED_KEY);
    if (alreadyCounted) {
      counted.current = true;
      fetchTotal();
      return;
    }

    counted.current = true;
    supabase
      .rpc("incrementar_visitas")
      .then(({ data, error }) => {
        if (!error && data != null) {
          setTotal(data as number);
          sessionStorage.setItem(VISITED_KEY, "1");
        } else {
          fetchTotal();
        }
      })
      .catch(() => fetchTotal());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, isSuperadmin]);

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
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => { fetchTotal(); setOpen((v) => !v); }}
        className="flex items-center gap-1.5 h-10 px-2.5 text-neutral-500 hover:bg-neutral-200/80 rounded-full transition-all duration-200 text-xs font-medium"
        title="Total de visitas a la página"
        aria-label="Contador de visitas"
      >
        <Icon icon="lucide:eye" width={16} height={16} />
        <span className="tabular-nums">
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
            Cada sesión de navegador cuenta como una visita.
          </p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); fetchTotal(); }}
            className="mt-3 flex items-center gap-1 text-[11px] text-brand-blue hover:underline"
          >
            <Icon icon="lucide:refresh-cw" width={11} height={11} />
            Actualizar
          </button>
        </div>
      )}
    </div>
  );
}
