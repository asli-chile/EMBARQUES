import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { AnimatedNetworkBackground } from "@/components/ui/AnimatedNetworkBackground";

type TrackingResult = {
  id: string;
  correlativo: number | null;
  estado_operacion: string | null;
  cliente: string | null;
  contenedor: string | null;
  booking: string | null;
  ref_asli: string | null;
  tipo_unidad: string | null;
  especie: string | null;
  naviera: string | null;
  nave: string | null;
  pol: string | null;
  etd: string | null;
  pod: string | null;
  eta: string | null;
  tt: number | null;
};

const estadoColors: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800 border-amber-200",
  EN_PROCESO: "bg-blue-100 text-blue-800 border-blue-200",
  ZARPE: "bg-indigo-100 text-indigo-800 border-indigo-200",
  EN_TRANSITO: "bg-violet-100 text-violet-800 border-violet-200",
  ARRIBADO: "bg-emerald-100 text-emerald-800 border-emerald-200",
  COMPLETADO: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELADO: "bg-red-100 text-red-800 border-red-200",
};

function getEstadoStyle(estado: string | null): string {
  if (!estado) return "bg-neutral-100 text-neutral-700 border-neutral-200";
  const key = estado.toUpperCase().replace(/\s+/g, "_");
  return estadoColors[key] ?? "bg-neutral-100 text-neutral-700 border-neutral-200";
}

function formatDate(dateStr: string | null, locale: "es" | "en"): string {
  if (!dateStr) return "—";
  try {
    const iso = dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return dateStr;
    const tag = locale === "es" ? "es-CL" : "en-US";
    return new Intl.DateTimeFormat(tag, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function TrackingContent() {
  const { t, locale } = useLocale();
  const tr = t.trackingPage;
  const [termino, setTermino] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TrackingResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const handleSearch = useCallback(async () => {
    const value = termino.trim();
    if (!value) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    if (!supabase) {
      setError(tr.supabaseError);
      setLoading(false);
      return;
    }

    const { data, error: rpcError } = await supabase.rpc("buscar_tracking", { termino: value });
    setLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      setResults([]);
      return;
    }

    setResults((data ?? []) as TrackingResult[]);
  }, [termino, supabase, tr.supabaseError]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSearch();
    },
    [handleSearch]
  );

  return (
    <main className="flex-1 min-h-0 overflow-auto relative isolate" role="main">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden min-h-[100dvh] w-full">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-600 via-slate-800 to-slate-900" />
        <AnimatedNetworkBackground />
      </div>
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(15,23,42,0.35) 0%, rgba(15,23,42,0.2) 30%, rgba(15,23,42,0.15) 50%, rgba(15,23,42,0.2) 70%, rgba(15,23,42,0.35) 100%)",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6">
        <header className="text-center">
          <h1
            className="text-xl sm:text-2xl font-bold text-white tracking-tight"
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 2px 12px rgba(0,0,0,0.8)" }}
          >
            {tr.title}
          </h1>
          <p
            className="text-white text-sm mt-2"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 1px 8px rgba(0,0,0,0.7)" }}
          >
            {tr.subtitle}
          </p>
          <ul className="mt-4 text-left max-w-md mx-auto text-white text-xs sm:text-sm space-y-1.5">
            <li className="flex items-start gap-2" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9), 0 1px 6px rgba(0,0,0,0.6)" }}>
              <Icon icon="typcn:media-record" className="text-brand-teal flex-shrink-0 mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" width={6} height={6} />
              {tr.feature1}
            </li>
            <li className="flex items-start gap-2" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9), 0 1px 6px rgba(0,0,0,0.6)" }}>
              <Icon icon="typcn:media-record" className="text-brand-teal flex-shrink-0 mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" width={6} height={6} />
              {tr.feature2}
            </li>
            <li className="flex items-start gap-2" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9), 0 1px 6px rgba(0,0,0,0.6)" }}>
              <Icon icon="typcn:media-record" className="text-brand-teal flex-shrink-0 mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" width={6} height={6} />
              {tr.feature3}
            </li>
          </ul>
        </header>

        <section className="bg-white rounded-2xl shadow-mac-modal border border-black/5 p-6">
          <label htmlFor="tracking-search" className="text-xs font-semibold text-neutral-700 uppercase tracking-wider block mb-2">
            {tr.searchLabel}
          </label>
          <div className="flex gap-2">
            <input
              id="tracking-search"
              type="text"
              value={termino}
              onChange={(e) => setTermino(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={tr.searchPlaceholder}
              className="flex-1 w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-brand-blue placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
              aria-label={tr.searchLabel}
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-blue text-white font-medium hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:ring-offset-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label={tr.searchButton}
            >
              {loading ? (
                <Icon icon="lucide:loader-2" width={18} height={18} className="animate-spin" aria-hidden />
              ) : (
                <Icon icon="lucide:search" width={18} height={18} aria-hidden />
              )}
              {tr.searchButton}
            </button>
          </div>
        </section>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200" role="alert">
            {error}
          </div>
        )}

        {searched && !loading && (
          <section className="space-y-4">
            {results.length === 0 ? (
              <div className="bg-white rounded-xl border border-neutral-200 p-6 text-center text-neutral-500">
                <Icon icon="lucide:package-x" width={40} height={40} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">{tr.noResults}</p>
                <p className="text-xs mt-1">{tr.noResultsHint}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-white text-sm font-medium" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}>
                  {tr.resultsCount.replace("{{count}}", String(results.length))}
                </p>
                {results.map((op) => (
                  <article
                    key={op.id}
                    className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden transition-colors hover:border-neutral-300"
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {op.contenedor && (
                            <span className="font-semibold text-brand-blue">
                              {op.contenedor}
                            </span>
                          )}
                          {op.ref_asli && (
                            <span className="text-sm text-neutral-500">
                              {tr.refAsli}: {op.ref_asli}
                            </span>
                          )}
                          {op.booking && (
                            <span className="text-sm text-neutral-500">
                              Booking: {op.booking}
                            </span>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded border text-xs font-medium ${getEstadoStyle(op.estado_operacion)}`}
                        >
                          {op.estado_operacion ?? "—"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-neutral-600">
                          <Icon icon="lucide:map-pin" width={16} height={16} className="text-brand-blue shrink-0" />
                          <span>
                            {op.pol ?? "—"} → {op.pod ?? "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-neutral-600">
                          <Icon icon="lucide:ship" width={16} height={16} className="text-brand-blue shrink-0" />
                          <span>
                            {op.naviera ?? "—"}
                            {op.nave ? ` / ${op.nave}` : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-neutral-600">
                          <Icon icon="lucide:calendar" width={16} height={16} className="text-brand-blue shrink-0" />
                          <span>
                            ETD: {formatDate(op.etd, locale)} · ETA: {formatDate(op.eta, locale)}
                          </span>
                        </div>
                        {(op.cliente || op.especie || op.tipo_unidad) && (
                          <div className="flex items-center gap-2 text-neutral-600 sm:col-span-2">
                            <Icon icon="lucide:package" width={16} height={16} className="text-brand-blue shrink-0" />
                            <span>
                              {[op.cliente, op.especie, op.tipo_unidad].filter(Boolean).join(" · ") || "—"}
                            </span>
                          </div>
                        )}
                      </div>

                      {op.tt != null && op.tt > 0 && (
                        <p className="text-xs text-neutral-500 mt-2">
                          {tr.transitTime.replace("{{days}}", String(op.tt))}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
