import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n";
import type { StackingData } from "@/types/stacking";
import { fetchPublicItinerarios } from "@/lib/itinerarios-service";
import type { ItinerarioWithEscalas } from "@/types/itinerarios";
import { format } from "date-fns";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/auth/AuthContext";

type StackingContentProps = {
  /** Datos del embarque y horarios de recepción stacking. Si no se pasa, se intenta cargar automáticamente. */
  data?: StackingData | null;
};

const TODAY_START_MS = () =>
  new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
    0,
    0,
    0,
    0
  ).getTime();

/** ETD no cumplido: fecha de salida es hoy o en el futuro */
function isEtdUpcoming(etd: string | null): boolean {
  if (!etd?.trim()) return false;
  const t = new Date(etd.includes("T") ? etd : `${etd}T12:00:00`).getTime();
  return t >= TODAY_START_MS();
}

function formatEtdDisplay(etd: string | null): string {
  if (!etd?.trim()) return "—";
  try {
    const d = etd.includes("T") ? etd.slice(0, 10) : etd;
    return format(new Date(d + "T12:00:00"), "dd/MM/yyyy");
  } catch {
    return etd;
  }
}

const STACKING_CLOSE_OFFSET_DAYS = -1; // cierre stacking = 1 día antes del ETD (ajustable, en días calendario)

function parseCalendarDate(dateStr: string): Date | null {
  const raw = dateStr.trim();
  if (!raw) return null;

  try {
    // Formato calendario con barra: DD/MM/AAAA (con o sin hora)
    if (raw.includes("/")) {
      const [datePart] = raw.split(" ");
      const [dd, mm, yyyy] = datePart.split("/");
      const d = parseInt(dd, 10);
      const m = parseInt(mm, 10);
      const y = parseInt(yyyy, 10);
      if (!d || !m || !y) return null;
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    }

    // Formato ISO: AAAA-MM-DD o AAAA-MM-DDTHH:MM
    const iso = raw.slice(0, 10); // yyyy-MM-dd
    const [yyyy, mm, dd] = iso.split("-");
    const y = parseInt(yyyy, 10);
    const m = parseInt(mm, 10);
    const d = parseInt(dd, 10);
    if (!d || !m || !y) return null;
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  } catch {
    return null;
  }
}

function daysUntil(dateStr: string | null, offsetDays = 0): number | null {
  if (!dateStr?.trim()) return null;
  const base = parseCalendarDate(dateStr);
  if (!base) return null;

  const target = new Date(base);
  target.setDate(target.getDate() + offsetDays);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

function daysUntilLabel(dateStr: string | null, offsetDays = 0): string {
  const n = daysUntil(dateStr, offsetDays);
  if (n == null) return "—";
  return `${n} d`;
}

function isTodayEtd(etd: string | null): boolean {
  if (!etd?.trim()) return false;
  try {
    const today = new Date();
    const d = new Date((etd.includes("T") ? etd : `${etd}T12:00:00`));
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  } catch {
    return false;
  }
}

export function StackingContent({ data = null }: StackingContentProps) {
  const { t } = useLocale();
  const tr = t.stackingPage;
  const { isSuperadmin } = useAuth();

  const [itinerarios, setItinerarios] = useState<ItinerarioWithEscalas[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterNaviera, setFilterNaviera] = useState("");
  const [filterPol, setFilterPol] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPropData = data != null;

  useEffect(() => {
    if (hasPropData) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchPublicItinerarios()
      .then((list) => {
        if (!isMounted) return;
        setItinerarios(list);
        const withStacking = list.filter((it) => it.stacking_imagen_url && isEtdUpcoming(it.etd));
        if (withStacking.length > 0) {
          const sorted = [...withStacking].sort((a, b) => {
            const da = new Date(a.etd ?? "").getTime();
            const db = new Date(b.etd ?? "").getTime();
            return da - db;
          });
          setSelectedId(sorted[0].id);
        } else {
          setSelectedId(null);
        }
      })
      .catch((e) => {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : String(e));
        setItinerarios([]);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [hasPropData]);

  /** Solo itinerarios con imagen de stacking y ETD no cumplido */
  const stackingItinerarios = useMemo(() => {
    const list = itinerarios ?? [];
    return list.filter(
      (it) => it.stacking_imagen_url && isEtdUpcoming(it.etd)
    );
  }, [itinerarios]);

  /** Opciones únicas para filtros (naviera/operador y POL) */
  const navieraOptions = useMemo(() => {
    const set = new Set<string>();
    stackingItinerarios.forEach((it) => {
      const v = (it.operador || it.naviera || "").trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [stackingItinerarios]);

  const polOptions = useMemo(() => {
    const set = new Set<string>();
    stackingItinerarios.forEach((it) => {
      const v = (it.pol || "").trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [stackingItinerarios]);

  /** Lista filtrada por naviera y POL */
  const filteredStacking = useMemo(() => {
    return stackingItinerarios.filter((it) => {
      if (filterNaviera) {
        const nav = (it.operador || it.naviera || "").trim();
        if (nav !== filterNaviera) return false;
      }
      if (filterPol) {
        if ((it.pol || "").trim() !== filterPol) return false;
      }
      return true;
    });
  }, [stackingItinerarios, filterNaviera, filterPol]);

  /** Ordenar por naviera y luego por ETD ascendente */
  const sortedFiltered = useMemo(() => {
    return [...filteredStacking].sort((a, b) => {
      const navA = (a.operador || a.naviera || "").trim().toLocaleUpperCase();
      const navB = (b.operador || b.naviera || "").trim().toLocaleUpperCase();
      if (navA && navB && navA !== navB) {
        return navA.localeCompare(navB);
      }

      const da = new Date(a.etd ?? "").getTime();
      const db = new Date(b.etd ?? "").getTime();
      return da - db;
    });
  }, [filteredStacking]);

  const selected = useMemo(
    () =>
      sortedFiltered.find((it) => it.id === selectedId) ?? sortedFiltered[0] ?? null,
    [sortedFiltered, selectedId]
  );

  useEffect(() => {
    if (selectedId && !sortedFiltered.some((it) => it.id === selectedId)) {
      setSelectedId(sortedFiltered[0]?.id ?? null);
    }
  }, [selectedId, sortedFiltered]);

  const showEmptyState = !hasPropData && !loading && !error && stackingItinerarios.length === 0;
  const showNoResultsAfterFilter =
    !hasPropData && !loading && !error && stackingItinerarios.length > 0 && sortedFiltered.length === 0;

  return (
    <main
      className="flex flex-col flex-1 min-h-0 overflow-hidden bg-gradient-to-b from-neutral-50 to-neutral-100/80"
      role="main"
      aria-label={tr.title}
    >
      <div className="flex flex-col flex-1 min-h-0 w-full max-w-[1920px] mx-auto">
        {hasPropData && data && (
          <div className="p-4">
            <StackingTable data={data} tr={tr} />
          </div>
        )}

        {!hasPropData && (
          <>
            {/* Cabecera moderna: título + filtros */}
            <header className="flex-shrink-0 px-4 sm:px-6 py-4 bg-white/90 backdrop-blur-sm border-b border-neutral-200/80 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-blue/10 text-brand-blue">
                    <Icon icon="lucide:ship" width={22} height={22} aria-hidden />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-brand-blue tracking-tight">
                      {tr.title}
                    </h1>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Solo itinerarios con ETD pendiente
                    </p>
                  </div>
                </div>
                {stackingItinerarios.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <Icon icon="lucide:building-2" width={16} height={16} className="text-neutral-500" aria-hidden />
                      <span className="sr-only">{tr.filterNaviera}</span>
                      <select
                        value={filterNaviera}
                        onChange={(e) => setFilterNaviera(e.target.value)}
                        className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue min-w-[160px] transition-colors"
                        aria-label={tr.filterNaviera}
                      >
                        <option value="">{tr.filterAll}</option>
                        {navieraOptions.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Icon icon="lucide:anchor" width={16} height={16} className="text-neutral-500" aria-hidden />
                      <span className="sr-only">{tr.filterPol}</span>
                      <select
                        value={filterPol}
                        onChange={(e) => setFilterPol(e.target.value)}
                        className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue min-w-[130px] transition-colors"
                        aria-label={tr.filterPol}
                      >
                        <option value="">{tr.filterAllPol}</option>
                        {polOptions.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </div>
            </header>

            {loading && (
              <div
                className="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-16"
                role="status"
                aria-live="polite"
              >
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" aria-hidden />
                <p className="text-sm text-neutral-500">
                  {t.itinerarioPage?.loadingItineraries ?? "Cargando itinerarios…"}
                </p>
              </div>
            )}

            {error && (
              <div
                className="flex-1 flex items-center justify-center px-4 py-12"
                role="alert"
              >
                <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 text-sm shadow-sm max-w-md">
                  <Icon icon="lucide:alert-circle" width={20} height={20} className="shrink-0" aria-hidden />
                  {error}
                </div>
              </div>
            )}

            {showEmptyState && (
              <div
                className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center max-w-md mx-auto"
                role="status"
                aria-live="polite"
              >
                <div className="rounded-2xl bg-white/80 border border-neutral-200 p-8 shadow-sm">
                  <div className="flex justify-center text-neutral-300 mb-4">
                    <Icon icon="lucide:calendar-x" width={48} height={48} aria-hidden />
                  </div>
                  <p className="text-neutral-700 font-medium">{tr.emptyTitle}</p>
                  <p className="text-neutral-500 text-sm mt-2">{tr.emptySubtitle}</p>
                  <p className="text-neutral-400 text-xs mt-4">{tr.noUpcomingStacking}</p>
                </div>
              </div>
            )}

            {showNoResultsAfterFilter && (
              <div
                className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center max-w-md mx-auto"
                role="status"
              >
                <div className="rounded-2xl bg-white/80 border border-neutral-200 p-8 shadow-sm">
                  <div className="flex justify-center text-neutral-300 mb-4">
                    <Icon icon="lucide:filter-x" width={48} height={48} aria-hidden />
                  </div>
                  <p className="text-neutral-700 font-medium">{tr.emptyTitle}</p>
                  <p className="text-neutral-500 text-sm mt-2">
                    {(tr as Record<string, string>).filterNoResults ?? "No hay resultados con los filtros seleccionados."}
                  </p>
                </div>
              </div>
            )}

            {sortedFiltered.length > 0 && (
              <section className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] gap-4 p-4 lg:p-6">
                {/* Lista de itinerarios */}
                <div className="flex flex-col min-h-0 rounded-2xl border border-neutral-200/90 bg-white shadow-sm overflow-hidden">
                  <div className="flex-shrink-0 px-4 py-4 border-b border-neutral-100 bg-neutral-50/50">
                    <h2 className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
                      <Icon icon="lucide:list" width={18} height={18} className="text-brand-blue" aria-hidden />
                      {t.itinerarioPage?.title ?? "Itinerarios con stacking"}
                    </h2>
                    <p className="text-xs text-neutral-500 mt-1.5">
                      {sortedFiltered.length} {sortedFiltered.length === 1 ? "itinerario" : "itinerarios"} con ETD pendiente
                    </p>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto p-2 scroll-smooth">
                    {sortedFiltered.map((it) => {
                      const isActive = selected?.id === it.id;
                      return (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => setSelectedId(it.id)}
                          className={`w-full text-left px-3 py-3 rounded-xl text-sm transition-all duration-200 ease-out ${isActive ? "bg-brand-blue/10 text-brand-blue font-medium shadow-sm ring-1 ring-brand-blue/20" : "hover:bg-neutral-50 text-neutral-700 hover:shadow-sm"}`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="flex shrink-0 mt-0.5 text-neutral-400">
                              <Icon icon="lucide:ship" width={14} height={14} aria-hidden />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate font-medium">
                                  {it.nave || "—"} · {it.viaje || "—"}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs text-neutral-500 shrink-0 tabular-nums font-mono">
                                  {formatEtdDisplay(it.etd)}
                                  {isTodayEtd(it.etd) && (
                                    <span className="inline-flex items-center rounded-full bg-brand-olive/10 text-brand-olive px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                                      HOY
                                    </span>
                                  )}
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs text-neutral-500 truncate">
                                {(it.operador || it.naviera || it.servicio || "").trim() || it.pol || "—"}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Panel detalle: datos + imagen */}
                <div className="flex flex-col min-h-0 rounded-2xl border border-neutral-200/90 bg-white shadow-sm overflow-hidden">
                  {selected ? (
                    <>
                      <div className="flex-shrink-0 flex flex-wrap items-start gap-3 px-4 py-4 border-b border-neutral-100 bg-neutral-50/30">
                        <div className="flex items-center gap-2 rounded-lg bg-white border border-neutral-200 px-3 py-2 shadow-sm">
                          <Icon icon="lucide:ship" width={16} height={16} className="text-brand-blue" aria-hidden />
                          <div>
                            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide block">{tr.nave}</span>
                            <span className="text-sm font-medium text-neutral-800">{selected.nave || "—"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg bg-white border border-neutral-200 px-3 py-2 shadow-sm">
                          <Icon icon="lucide:route" width={16} height={16} className="text-brand-teal" aria-hidden />
                          <div>
                            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide block">{tr.viaje}</span>
                            <span className="text-sm font-medium text-neutral-800">{selected.viaje || "—"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg bg-white border border-neutral-200 px-3 py-2 shadow-sm">
                          <Icon icon="lucide:anchor" width={16} height={16} className="text-neutral-500" aria-hidden />
                          <div>
                            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide block">POL</span>
                            <span className="text-sm font-medium text-neutral-800">{selected.pol || "—"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg bg-white border border-neutral-200 px-3 py-2 shadow-sm">
                          <Icon icon="lucide:calendar" width={16} height={16} className="text-neutral-500" aria-hidden />
                          <div>
                            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide block">ETD</span>
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-neutral-800 tabular-nums font-mono">
                              {formatEtdDisplay(selected.etd)}
                              {isTodayEtd(selected.etd) && (
                                <span className="inline-flex items-center rounded-full bg-brand-olive/10 text-brand-olive px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                                  HOY
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg bg-white border border-neutral-200 px-3 py-2 shadow-sm ml-auto">
                          <div className="flex flex-col items-start gap-1 text-[11px] text-neutral-600">
                            <span className="inline-flex items-center gap-1 font-medium">
                              <span className="inline-block h-1.5 w-1.5 rounded-sm bg-brand-olive" aria-hidden />
                              STACKING
                            </span>
                            <span className="inline-flex items-center gap-1 font-medium">
                              <span className="inline-block h-1.5 w-1.5 rounded-sm bg-brand-blue" aria-hidden />
                              ETD
                            </span>
                          </div>
                          <div className="flex flex-col items-end gap-1 text-[11px] font-mono text-neutral-800">
                            <span>{daysUntilLabel(selected.etd, STACKING_CLOSE_OFFSET_DAYS)}</span>
                            <span>{daysUntilLabel(selected.etd, 0)}</span>
                          </div>
                        </div>
                        {isSuperadmin && selected && (
                          <a
                            href={`/itinerario?stackingItId=${encodeURIComponent(selected.id)}`}
                            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-brand-blue text-white px-3 py-2 text-xs font-semibold shadow-sm hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-colors"
                          >
                            <Icon icon="lucide:pencil" width={14} height={14} aria-hidden />
                            Editar stacking
                          </a>
                        )}
                      </div>
                      <div className="flex-1 min-h-[360px] flex items-stretch justify-center bg-neutral-100/80 rounded-b-2xl overflow-hidden">
                        {selected.stacking_imagen_url ? (
                          <iframe
                            src={selected.stacking_imagen_url}
                            title="Stacking oficial"
                            className="w-full flex-1 min-h-[360px] border-0"
                          />
                        ) : (
                          <span className="flex items-center justify-center gap-2 text-sm text-neutral-400 px-4 py-12 text-center">
                            <Icon icon="lucide:image-off" width={20} height={20} aria-hidden />
                            {t.itinerarioPage?.stackingOfficialNoImage ??
                              "Este itinerario no tiene imagen de stacking asociada."}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-neutral-400 text-center px-4 min-h-[240px]">
                      <Icon icon="lucide:mouse-pointer-click" width={32} height={32} aria-hidden />
                      <span className="text-sm">{tr.emptyTitle}</span>
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

type StackingTableProps = {
  data: StackingData;
  tr: Record<string, string>;
};

function StackingTable({ data, tr }: StackingTableProps) {
  const { embarque, lineas, lateArrivalVgmNote, contenedoresVaciosNote } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="rounded-lg bg-neutral-50/80 px-4 py-3">
          <dt className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">{tr.nave}</dt>
          <dd className="mt-1 text-sm font-medium text-neutral-800">{embarque.nave || "—"}</dd>
        </div>
        <div className="rounded-lg bg-neutral-50/80 px-4 py-3">
          <dt className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">{tr.viaje}</dt>
          <dd className="mt-1 text-sm font-medium text-neutral-800">{embarque.viaje || "—"}</dd>
        </div>
        <div className="rounded-lg bg-neutral-50/80 px-4 py-3">
          <dt className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">{tr.eta}</dt>
          <dd className="mt-1 text-sm font-medium text-neutral-800">{embarque.eta || "—"}</dd>
        </div>
        <div className="rounded-lg bg-neutral-50/80 px-4 py-3">
          <dt className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">{tr.servicio}</dt>
          <dd className="mt-1 text-sm font-medium text-neutral-800">{embarque.servicio || "—"}</dd>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 overflow-hidden bg-white shadow-sm">
        <table className="w-full border-collapse text-sm" role="table" aria-label={tr.title}>
          <thead>
            <tr className="bg-brand-blue text-white">
              <th className="text-left font-semibold uppercase tracking-wide px-4 py-3.5 border-b border-white/20">
                {tr.colTipoCarga}
              </th>
              <th className="text-left font-semibold uppercase tracking-wide px-4 py-3.5 border-b border-white/20">
                {tr.colFecha}
              </th>
              <th className="text-left font-semibold uppercase tracking-wide px-4 py-3.5 border-b border-white/20">
                {tr.colHorario}
              </th>
              <th className="text-left font-semibold uppercase tracking-wide px-4 py-3.5 border-b border-white/20">
                {tr.colObservaciones}
              </th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((linea, index) => (
              <tr
                key={index}
                className={`border-b border-neutral-100 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-neutral-50/50"}`}
              >
                <td className="px-4 py-3 font-medium text-neutral-800">
                  {linea.tipoCarga}
                </td>
                <td className="px-4 py-3 text-neutral-700">
                  {linea.fecha ?? "—"}
                </td>
                <td className="px-4 py-3 text-neutral-700">
                  {linea.horario ?? "—"}
                </td>
                <td className="px-4 py-3 text-neutral-700">
                  {linea.nota ?? "—"}
                </td>
              </tr>
            ))}

            {lateArrivalVgmNote && (
              <tr className="bg-red-50 border-b border-neutral-100">
                <td colSpan={4} className="px-4 py-3 text-red-800 text-sm font-medium">
                  {lateArrivalVgmNote}
                </td>
              </tr>
            )}

            {contenedoresVaciosNote && (
              <tr className="bg-neutral-600 text-white">
                <td colSpan={4} className="px-4 py-3 text-sm font-medium">
                  {contenedoresVaciosNote}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
