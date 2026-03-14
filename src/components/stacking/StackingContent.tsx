import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n";
import type { StackingData } from "@/types/stacking";
import { fetchPublicItinerarios } from "@/lib/itinerarios-service";
import type { ItinerarioWithEscalas } from "@/types/itinerarios";
import { format } from "date-fns";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  STACKING_DRAFTS_STORAGE_KEY,
  getDraftForItinerary,
  saveDraftToStorage,
  type StackingDraft,
} from "@/lib/stacking-drafts";

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

/** Fecha de cierre de stacking (ETD + offset en días). */
function getStackingCloseDate(etd: string | null): string {
  const base = parseCalendarDate(etd ?? "");
  if (!base) return "—";
  const d = new Date(base);
  d.setDate(d.getDate() + STACKING_CLOSE_OFFSET_DAYS);
  return format(d, "dd/MM/yyyy");
}

function readDraftsFromStorage(): Record<string, StackingDraft> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STACKING_DRAFTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StackingDraft>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Primera ETA de las escalas (por orden), para mostrar en lista. */
function getFirstEta(escalas: ItinerarioWithEscalas["escalas"]): string | null {
  if (!escalas?.length) return null;
  const sorted = [...escalas].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  const first = sorted.find((e) => e.eta?.trim());
  return first?.eta ?? null;
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
  const [stackingDraft, setStackingDraft] = useState<StackingDraft | null>(null);
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

  useEffect(() => {
    if (!selected) {
      setStackingDraft(null);
      return;
    }
    const drafts = readDraftsFromStorage();
    setStackingDraft(getDraftForItinerary(drafts, selected));
  }, [selected]);

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
          <div className="p-3 sm:p-4">
            <StackingTable data={data} tr={tr} />
          </div>
        )}

        {!hasPropData && (
          <>
            {/* Cabecera moderna: título + filtros */}
            <header className="flex-shrink-0 px-3 py-3 sm:px-6 sm:py-4 bg-white/90 backdrop-blur-sm border-b border-neutral-200/80 shadow-sm">
              <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-brand-blue/10 text-brand-blue">
                    <Icon icon="lucide:ship" width={20} height={20} className="sm:w-[22px] sm:h-[22px]" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base sm:text-lg font-semibold text-brand-blue tracking-tight truncate">
                      {tr.title}
                    </h1>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {(tr as { subtitle?: string }).subtitle ?? "Solo itinerarios con ETD pendiente"}
                    </p>
                  </div>
                </div>
                {stackingItinerarios.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <label className="flex items-center gap-2 text-sm flex-1 sm:flex-initial min-w-0 sm:min-w-[160px]">
                      <Icon icon="lucide:building-2" width={16} height={16} className="text-neutral-500 shrink-0" aria-hidden />
                      <span className="sr-only">{tr.filterNaviera}</span>
                      <select
                        value={filterNaviera}
                        onChange={(e) => setFilterNaviera(e.target.value)}
                        className="w-full sm:min-w-[140px] rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
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
                    <label className="flex items-center gap-2 text-sm flex-1 sm:flex-initial min-w-0 sm:min-w-[130px]">
                      <Icon icon="lucide:anchor" width={16} height={16} className="text-neutral-500 shrink-0" aria-hidden />
                      <span className="sr-only">{tr.filterPol}</span>
                      <select
                        value={filterPol}
                        onChange={(e) => setFilterPol(e.target.value)}
                        className="w-full sm:min-w-[110px] rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
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
                className="flex-1 flex flex-col items-center justify-center gap-4 px-3 sm:px-4 py-10 sm:py-16"
                role="status"
                aria-live="polite"
              >
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" aria-hidden />
                <p className="text-sm text-neutral-500">
                  {(tr as { loading?: string }).loading ?? t.itinerarioPage?.loadingItineraries ?? "Cargando itinerarios…"}
                </p>
              </div>
            )}

            {error && (
              <div
                className="flex-1 flex items-center justify-center px-3 sm:px-4 py-8 sm:py-12"
                role="alert"
              >
                <div className="flex items-center gap-3 rounded-xl sm:rounded-2xl border border-red-200 bg-red-50 px-4 sm:px-5 py-3 sm:py-4 text-red-700 text-sm shadow-sm max-w-md">
                  <Icon icon="lucide:alert-circle" width={20} height={20} className="shrink-0" aria-hidden />
                  {error}
                </div>
              </div>
            )}

            {showEmptyState && (
              <div
                className="flex-1 flex flex-col items-center justify-center px-3 sm:px-4 py-10 sm:py-16 text-center max-w-md mx-auto"
                role="status"
                aria-live="polite"
              >
                <div className="rounded-xl sm:rounded-2xl bg-white/80 border border-neutral-200 p-6 sm:p-8 shadow-sm">
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
                className="flex-1 flex flex-col items-center justify-center px-3 sm:px-4 py-10 sm:py-16 text-center max-w-md mx-auto"
                role="status"
              >
                <div className="rounded-xl sm:rounded-2xl bg-white/80 border border-neutral-200 p-6 sm:p-8 shadow-sm">
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

            {sortedFiltered.length > 0 && (() => {
              const countLabel = sortedFiltered.length === 1
                ? ((tr as { itineraryCount?: string }).itineraryCount ?? "{{count}} itinerario").replace("{{count}}", "1")
                : ((tr as { itineraryCount_other?: string }).itineraryCount_other ?? "{{count}} itinerarios").replace("{{count}}", String(sortedFiltered.length));
              return (
              <section className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,0.35fr)_minmax(0,0.65fr)] gap-3 p-3 sm:gap-4 sm:p-4 lg:gap-5 lg:p-5">
                {/* Col 1: Lista de itinerarios */}
                <div className="flex flex-col min-h-0 rounded-xl sm:rounded-2xl border border-neutral-200/90 bg-white shadow-sm overflow-hidden">
                  <div className="flex-shrink-0 px-3 py-3 sm:px-4 sm:py-4 border-b border-neutral-100 bg-neutral-50/50">
                    <h2 className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
                      <Icon icon="lucide:list" width={18} height={18} className="text-brand-blue shrink-0" aria-hidden />
                      {(tr as { listTitle?: string }).listTitle ?? t.itinerarioPage?.title ?? "Itinerarios con stacking"}
                    </h2>
                    <p className="text-xs text-neutral-500 mt-1.5">
                      {countLabel}
                    </p>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-2 scroll-smooth">
                    {sortedFiltered.map((it) => {
                      const isActive = selected?.id === it.id;
                      const firstEta = getFirstEta(it.escalas);
                      return (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => setSelectedId(it.id)}
                          className={`w-full text-left px-2.5 py-2.5 sm:px-3 sm:py-3 rounded-lg sm:rounded-xl text-sm transition-all duration-200 ease-out ${isActive ? "bg-brand-blue/10 text-brand-blue font-medium shadow-sm ring-1 ring-brand-blue/20" : "hover:bg-neutral-50 text-neutral-700 hover:shadow-sm"}`}
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
                                {isTodayEtd(it.etd) && (
                                  <span className="inline-flex shrink-0 items-center rounded-full bg-brand-olive/10 text-brand-olive px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                                    {(tr as { todayTag?: string }).todayTag ?? "HOY"}
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-neutral-500 truncate">
                                {(it.operador || it.naviera || it.servicio || "").trim() || "—"}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-neutral-600">
                                <span className="inline-flex items-center gap-1">
                                  <span className="font-medium text-neutral-500">{(tr as { polLabel?: string }).polLabel ?? "POL"}</span>
                                  <span className="font-mono tabular-nums truncate max-w-[72px]" title={it.pol || ""}>
                                    {it.pol || "—"}
                                  </span>
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <span className="font-medium text-neutral-500">ETD</span>
                                  <span className="font-mono tabular-nums">{formatEtdDisplay(it.etd)}</span>
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <span className="font-medium text-neutral-500">ETA</span>
                                  <span className="font-mono tabular-nums">{formatEtdDisplay(firstEta)}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Col 2: Datos del itinerario + imagen */}
                <div className="flex flex-col min-h-0 rounded-xl sm:rounded-2xl border border-neutral-200/90 bg-white shadow-sm overflow-hidden mt-3 sm:mt-4 lg:mt-0">
                  {selected ? (
                    <>
                      <div className="flex-shrink-0 flex flex-wrap items-start gap-2 sm:gap-3 px-3 py-3 sm:px-4 sm:py-4 border-b border-neutral-100 bg-neutral-50/30">
                        <div className="flex items-center gap-2 rounded-lg bg-white border border-neutral-200 px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-sm min-w-0">
                          <Icon icon="lucide:ship" width={16} height={16} className="text-brand-blue shrink-0" aria-hidden />
                          <div className="min-w-0">
                            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide block">{tr.nave}</span>
                            <span className="text-sm font-medium text-neutral-800 truncate block">{selected.nave || "—"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg bg-white border border-neutral-200 px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-sm min-w-0">
                          <Icon icon="lucide:route" width={16} height={16} className="text-brand-teal shrink-0" aria-hidden />
                          <div className="min-w-0">
                            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide block">{tr.viaje}</span>
                            <span className="text-sm font-medium text-neutral-800 truncate block">{selected.viaje || "—"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg bg-white border border-neutral-200 px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-sm min-w-0">
                          <Icon icon="lucide:anchor" width={16} height={16} className="text-neutral-500 shrink-0" aria-hidden />
                          <div className="min-w-0">
                            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide block">{(tr as { polLabel?: string }).polLabel ?? "POL"}</span>
                            <span className="text-sm font-medium text-neutral-800">{selected.pol || "—"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg bg-white border border-neutral-200 px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-sm min-w-0">
                          <Icon icon="lucide:calendar" width={16} height={16} className="text-neutral-500 shrink-0" aria-hidden />
                          <div className="min-w-0">
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
                        <div
                          className="flex flex-col gap-1.5 rounded-lg bg-white border border-neutral-200 px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-sm min-w-0"
                          title={(tr as { stackingIndicatorsHelp?: string }).stackingIndicatorsHelp}
                        >
                          <div className="flex flex-col gap-1 text-[11px]">
                            <span className="inline-flex items-center gap-1.5 font-medium text-neutral-700">
                              <span className="inline-block h-1.5 w-1.5 rounded-sm bg-brand-olive shrink-0" aria-hidden />
                              {(tr as { stackingDaysLabel?: string }).stackingDaysLabel ?? "Días para cierre de stacking"}:{" "}
                              <span className="font-mono text-neutral-800 tabular-nums">
                                {daysUntilLabel(selected.etd, STACKING_CLOSE_OFFSET_DAYS)}
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 font-medium text-neutral-700">
                              <span className="inline-block h-1.5 w-1.5 rounded-sm bg-brand-blue shrink-0" aria-hidden />
                              {(tr as { zarpeDaysLabel?: string }).zarpeDaysLabel ?? "Días para zarpe"}:{" "}
                              <span className="font-mono text-neutral-800 tabular-nums">
                                {daysUntilLabel(selected.etd, 0)}
                              </span>
                            </span>
                          </div>
                        </div>
                        {isSuperadmin && (
                          <a
                            href={`/itinerario?stackingItId=${encodeURIComponent(selected.id)}`}
                            className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-brand-blue text-white px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-semibold shadow-sm hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-colors"
                          >
                            <Icon icon="lucide:pencil" width={14} height={14} aria-hidden />
                            {(tr as { editStacking?: string }).editStacking ?? "Editar stacking"}
                          </a>
                        )}
                      </div>
                      {/* Tarjeta: Cierre de stacking y Cut off Reefer (editable para superadmin) */}
                      <div className="flex-shrink-0 mx-3 mb-3 sm:mx-4 sm:mb-4 rounded-lg sm:rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-neutral-100">
                          <div className="px-3 py-2.5 sm:px-4 sm:py-3">
                            <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">
                              {(tr as { cardCierreStacking?: string }).cardCierreStacking ?? "Cierre de stacking"}
                            </p>
                            {isSuperadmin ? (
                              <input
                                type="text"
                                value={stackingDraft?.reeferFin ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setStackingDraft((prev) => ({ ...(prev ?? {}), reeferFin: v } as StackingDraft));
                                }}
                                onBlur={(e) => {
                                  saveDraftToStorage(selected.nave, { reeferFin: e.target.value.trim() });
                                  setStackingDraft(getDraftForItinerary(readDraftsFromStorage(), selected));
                                }}
                                placeholder={getStackingCloseDate(selected.etd)}
                                className="mt-1 w-full text-sm font-mono tabular-nums rounded-lg border border-neutral-200 px-2.5 py-1.5 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                              />
                            ) : (
                              <p className="mt-1 text-sm font-medium text-neutral-800 font-mono tabular-nums">
                                {stackingDraft?.reeferFin?.trim() || getStackingCloseDate(selected.etd)}
                              </p>
                            )}
                          </div>
                          <div className="px-3 py-2.5 sm:px-4 sm:py-3">
                            <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">
                              {(tr as { cardCutoffReefer?: string }).cardCutoffReefer ?? "Cut off Reefer"}
                            </p>
                            {isSuperadmin ? (
                              <input
                                type="text"
                                value={stackingDraft?.cutoffReefer ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setStackingDraft((prev) => ({ ...(prev ?? {}), cutoffReefer: v } as StackingDraft));
                                }}
                                onBlur={(e) => {
                                  saveDraftToStorage(selected.nave, { cutoffReefer: e.target.value.trim() });
                                  setStackingDraft(getDraftForItinerary(readDraftsFromStorage(), selected));
                                }}
                                placeholder={(tr as { placeholderDateFormat?: string }).placeholderDateFormat ?? "DD/MM/AAAA HH:MM"}
                                className="mt-1 w-full text-sm font-mono tabular-nums rounded-lg border border-neutral-200 px-2.5 py-1.5 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                              />
                            ) : (
                              <p className="mt-1 text-sm font-medium text-neutral-800 font-mono tabular-nums">
                                {stackingDraft?.cutoffReefer?.trim() ?? "—"}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 min-h-[260px] sm:min-h-[320px] lg:min-h-[360px] flex items-start justify-center bg-neutral-100/80 rounded-b-xl sm:rounded-b-2xl overflow-auto p-2 sm:p-3">
                        {selected.stacking_imagen_url ? (
                          <img
                            src={selected.stacking_imagen_url}
                            alt="Stacking oficial"
                            className="w-full max-w-full h-auto object-contain object-top block"
                          />
                        ) : (
                          <span className="flex items-center justify-center gap-2 text-sm text-neutral-400 px-4 py-8 sm:py-12 text-center">
                            <Icon icon="lucide:image-off" width={20} height={20} aria-hidden />
                            {(tr as { noImageHint?: string }).noImageHint ?? t.itinerarioPage?.stackingOfficialNoImage ?? "Este itinerario no tiene imagen de stacking asociada."}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-neutral-400 text-center px-4 min-h-[200px] sm:min-h-[240px]">
                      <Icon icon="lucide:mouse-pointer-click" width={32} height={32} aria-hidden />
                      <span className="text-sm">{(tr as { selectItinerary?: string }).selectItinerary ?? tr.emptyTitle}</span>
                    </div>
                  )}
                </div>
              </section>
            );})()}
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
