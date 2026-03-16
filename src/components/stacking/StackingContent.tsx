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
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

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
            {/* Cabecera compacta */}
            <header className="flex-shrink-0 bg-white border-b border-neutral-200 overflow-hidden">
              <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
              <div className="px-4 py-2 flex items-center gap-3 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 shrink-0 rounded-xl bg-brand-blue flex items-center justify-center shadow-sm shadow-brand-blue/20">
                    <Icon icon="lucide:ship" width={16} height={16} className="text-white" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-sm font-bold text-neutral-900 leading-tight truncate">
                      {tr.title}
                      {stackingItinerarios.length > 0 && (
                        <span className="ml-2 text-xs font-bold text-brand-blue">{sortedFiltered.length}/{stackingItinerarios.length}</span>
                      )}
                    </h1>
                  </div>
                </div>
                {stackingItinerarios.length > 0 && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      value={filterNaviera}
                      onChange={(e) => setFilterNaviera(e.target.value)}
                      className="flex-1 sm:flex-initial sm:min-w-[130px] rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all"
                      aria-label={tr.filterNaviera}
                    >
                      <option value="">{tr.filterAll}</option>
                      {navieraOptions.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <select
                      value={filterPol}
                      onChange={(e) => setFilterPol(e.target.value)}
                      className="flex-1 sm:flex-initial sm:min-w-[100px] rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all"
                      aria-label={tr.filterPol}
                    >
                      <option value="">{tr.filterAllPol}</option>
                      {polOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {(filterNaviera || filterPol) && (
                      <button
                        type="button"
                        onClick={() => { setFilterNaviera(""); setFilterPol(""); }}
                        className="shrink-0 p-1.5 rounded-xl text-neutral-400 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 transition-colors"
                        aria-label="Limpiar filtros"
                      >
                        <Icon icon="lucide:x" width={14} height={14} aria-hidden />
                      </button>
                    )}
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
              <section className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 p-3 overflow-hidden">
                {/* ── Col 1: Lista de itinerarios ── */}
                <div className={`min-h-0 flex-col rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden lg:w-[32%] lg:flex-shrink-0 ${mobileView === "detail" ? "hidden lg:flex" : "flex"}`}>
                  <div className="flex-shrink-0 px-3 py-2 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/60">
                    <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">
                      {(tr as { listTitle?: string }).listTitle ?? "Itinerarios"}
                    </span>
                    <span className="text-[11px] font-bold text-brand-blue bg-brand-blue/8 px-2.5 py-0.5 rounded-full tabular-nums">{countLabel}</span>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-neutral-100 scroll-smooth">
                    {sortedFiltered.map((it) => {
                      const isActive = selected?.id === it.id;
                      const firstEta = getFirstEta(it.escalas);
                      const daysLeft = daysUntil(it.etd, 0);
                      const urgency = daysLeft === null ? null : daysLeft <= 3 ? "red" : daysLeft <= 7 ? "amber" : "emerald";
                      return (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => { setSelectedId(it.id); setMobileView("detail"); }}
                          className={`w-full text-left transition-colors duration-150 ${
                            isActive ? "bg-brand-blue/[0.05]" : "hover:bg-neutral-50/80"
                          }`}
                        >
                          <div className={`flex border-l-[3px] ${isActive ? "border-brand-blue" : "border-transparent"}`}>
                            <div className="flex-1 min-w-0 px-3 py-2.5">
                              {/* Row 1: naviera label + urgency pill */}
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className={`text-[10px] font-bold uppercase tracking-widest truncate ${isActive ? "text-brand-blue" : "text-neutral-400"}`}>
                                  {(it.operador || it.naviera || it.servicio || "").trim() || "—"}
                                </span>
                                {daysLeft !== null && (
                                  <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums ${
                                    urgency === "red" ? "bg-red-50 text-red-600 border border-red-200" :
                                    urgency === "amber" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                    "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  }`}>
                                    {isTodayEtd(it.etd) ? "HOY" : `${daysLeft}d`}
                                  </span>
                                )}
                              </div>
                              {/* Row 2: nave · viaje */}
                              <p className={`text-xs font-bold truncate leading-snug ${isActive ? "text-brand-blue" : "text-neutral-800"}`}>
                                {it.nave || "—"} <span className="font-normal text-neutral-400">·</span> {it.viaje || "—"}
                              </p>
                              {/* Row 3: POL + ETD + ETA */}
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-neutral-400">
                                <span>POL <span className="font-mono font-semibold text-neutral-600">{it.pol || "—"}</span></span>
                                <span>ETD <span className="font-mono font-semibold text-neutral-600">{formatEtdDisplay(it.etd)}</span></span>
                                {firstEta && <span>ETA <span className="font-mono font-semibold text-neutral-600">{formatEtdDisplay(firstEta)}</span></span>}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Col 2: Detalle del itinerario ── */}
                <div className={`flex-1 min-h-0 flex-col rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden ${mobileView === "list" ? "hidden lg:flex" : "flex"}`}>
                  {selected ? (() => {
                    const daysToZarpe = daysUntil(selected.etd, 0);
                    const daysToClose = daysUntil(selected.etd, STACKING_CLOSE_OFFSET_DAYS);
                    const zarpeUrgency = daysToZarpe === null ? null : daysToZarpe <= 3 ? "red" : daysToZarpe <= 7 ? "amber" : "emerald";
                    const closeUrgency = daysToClose === null ? null : daysToClose <= 2 ? "red" : daysToClose <= 5 ? "amber" : "emerald";
                    const urgencyCardClass = (u: string | null) =>
                      u === "red" ? "border-red-200 bg-red-50/60" :
                      u === "amber" ? "border-amber-200 bg-amber-50/60" :
                      "border-neutral-200 bg-neutral-50/60";
                    const urgencyNumClass = (u: string | null) =>
                      u === "red" ? "text-red-600" :
                      u === "amber" ? "text-amber-600" :
                      "text-emerald-600";
                    return (
                    <>
                      {/* Header: gradient bar + nave/viaje + meta */}
                      <div className="flex-shrink-0">
                        <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
                        <div className="px-3 py-2 flex items-center gap-2 border-b border-neutral-100 flex-wrap">
                          {/* Back button — mobile only */}
                          <button
                            type="button"
                            onClick={() => setMobileView("list")}
                            className="lg:hidden shrink-0 inline-flex items-center gap-0.5 text-xs font-semibold text-brand-blue hover:text-brand-blue/80 transition-colors"
                          >
                            <Icon icon="lucide:chevron-left" width={14} height={14} aria-hidden />
                            Lista
                          </button>
                          <span className="w-7 h-7 rounded-lg bg-brand-blue flex items-center justify-center shrink-0 shadow-sm shadow-brand-blue/20">
                            <Icon icon="lucide:ship" width={14} height={14} className="text-white" aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-neutral-900 truncate leading-tight">
                              {selected.nave || "—"} <span className="font-normal text-neutral-400">·</span> {selected.viaje || "—"}
                            </p>
                            <p className="text-[11px] text-neutral-500 truncate leading-tight">
                              {(selected.operador || selected.naviera || selected.servicio || "").trim() || "—"}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div>
                              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">POL</p>
                              <p className="text-[11px] font-semibold text-neutral-800">{selected.pol || "—"}</p>
                            </div>
                            <div className="w-px h-5 bg-neutral-100" />
                            <div>
                              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">ETD</p>
                              <p className="text-[11px] font-semibold text-neutral-800 font-mono tabular-nums">
                                {formatEtdDisplay(selected.etd)}
                                {isTodayEtd(selected.etd) && (
                                  <span className="ml-1 inline-flex items-center rounded-full bg-brand-olive/10 text-brand-olive px-1.5 py-0.5 text-[9px] font-black uppercase">HOY</span>
                                )}
                              </p>
                            </div>
                          </div>
                          {isSuperadmin && (
                            <a
                              href={`/itinerario?stackingItId=${encodeURIComponent(selected.id)}`}
                              className="ml-auto shrink-0 inline-flex items-center gap-1 rounded-xl bg-brand-blue text-white px-2.5 py-1 text-xs font-semibold shadow-sm shadow-brand-blue/20 hover:bg-brand-blue/90 transition-colors"
                            >
                              <Icon icon="lucide:pencil" width={12} height={12} aria-hidden />
                              {(tr as { editStacking?: string }).editStacking ?? "Editar"}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Countdown cards — número grande + fecha */}
                      <div className="flex-shrink-0 px-3 py-2 flex gap-2">
                        {/* Cierre stacking */}
                        <div className={`flex-1 rounded-xl border px-3 py-2 flex items-center justify-between gap-2 ${urgencyCardClass(closeUrgency)}`}>
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide mb-1">
                              {(tr as { cardCierreStacking?: string }).cardCierreStacking ?? "Cierre stacking"}
                            </p>
                            {isSuperadmin ? (
                              <input
                                type="text"
                                value={stackingDraft?.reeferFin ?? ""}
                                onChange={(e) => { const v = e.target.value; setStackingDraft((prev) => ({ ...(prev ?? {}), reeferFin: v } as StackingDraft)); }}
                                onBlur={(e) => { saveDraftToStorage(selected.nave, { reeferFin: e.target.value.trim() }); setStackingDraft(getDraftForItinerary(readDraftsFromStorage(), selected)); }}
                                placeholder={getStackingCloseDate(selected.etd)}
                                className="w-full text-xs font-mono rounded-lg border border-neutral-200 bg-white px-2 py-1 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                              />
                            ) : (
                              <p className="text-xs font-bold font-mono text-neutral-800 tabular-nums">
                                {stackingDraft?.reeferFin?.trim() || getStackingCloseDate(selected.etd)}
                              </p>
                            )}
                          </div>
                          {daysToClose !== null && (
                            <div className="shrink-0 text-right">
                              <p className={`text-2xl font-black tabular-nums leading-none ${urgencyNumClass(closeUrgency)}`}>{daysToClose}</p>
                              <p className={`text-[8px] font-bold uppercase tracking-wide ${urgencyNumClass(closeUrgency)} opacity-70`}>días</p>
                            </div>
                          )}
                        </div>

                        {/* Cut off Reefer */}
                        <div className={`flex-1 rounded-xl border px-3 py-2 flex items-center justify-between gap-2 ${urgencyCardClass(zarpeUrgency)}`}>
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide mb-1">
                              {(tr as { cardCutoffReefer?: string }).cardCutoffReefer ?? "Cut off Reefer"}
                            </p>
                            {isSuperadmin ? (
                              <input
                                type="text"
                                value={stackingDraft?.cutoffReefer ?? ""}
                                onChange={(e) => { const v = e.target.value; setStackingDraft((prev) => ({ ...(prev ?? {}), cutoffReefer: v } as StackingDraft)); }}
                                onBlur={(e) => { saveDraftToStorage(selected.nave, { cutoffReefer: e.target.value.trim() }); setStackingDraft(getDraftForItinerary(readDraftsFromStorage(), selected)); }}
                                placeholder={(tr as { placeholderDateFormat?: string }).placeholderDateFormat ?? "DD/MM/AAAA HH:MM"}
                                className="w-full text-xs font-mono rounded-lg border border-neutral-200 bg-white px-2 py-1 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                              />
                            ) : (
                              <p className="text-xs font-bold font-mono text-neutral-800 tabular-nums">
                                {stackingDraft?.cutoffReefer?.trim() ?? "—"}
                              </p>
                            )}
                          </div>
                          {daysToZarpe !== null && (
                            <div className="shrink-0 text-right">
                              <p className={`text-2xl font-black tabular-nums leading-none ${urgencyNumClass(zarpeUrgency)}`}>{daysToZarpe}</p>
                              <p className={`text-[8px] font-bold uppercase tracking-wide ${urgencyNumClass(zarpeUrgency)} opacity-70`}>al zarpe</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Imagen stacking */}
                      <div className="flex-1 min-h-0 overflow-auto bg-neutral-50/40 border-t border-neutral-100 p-3 flex items-start justify-center">
                        {selected.stacking_imagen_url ? (
                          <img
                            src={selected.stacking_imagen_url}
                            alt="Stacking oficial"
                            className="w-full max-w-full h-auto object-contain object-top block rounded-xl"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2.5 text-neutral-400 py-16 text-center">
                            <span className="w-12 h-12 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center shadow-sm">
                              <Icon icon="lucide:image-off" width={22} height={22} aria-hidden />
                            </span>
                            <p className="text-sm font-medium">{(tr as { noImageHint?: string }).noImageHint ?? "Sin imagen de stacking"}</p>
                          </div>
                        )}
                      </div>
                    </>
                  );})() : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-neutral-400 text-center px-4 min-h-[200px]">
                      <span className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center">
                        <Icon icon="lucide:mouse-pointer-click" width={24} height={24} aria-hidden />
                      </span>
                      <p className="text-sm font-medium">{(tr as { selectItinerary?: string }).selectItinerary ?? tr.emptyTitle}</p>
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
    <div className="space-y-5">
      {/* Embarque info card */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-px bg-neutral-100">
          {[
            { label: tr.nave, value: embarque.nave },
            { label: tr.viaje, value: embarque.viaje },
            { label: tr.eta, value: embarque.eta },
            { label: tr.servicio, value: embarque.servicio },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white px-4 py-4">
              <dt className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">{label}</dt>
              <dd className="mt-1 text-sm font-semibold text-neutral-800">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Stacking table */}
      <div className="rounded-2xl border border-neutral-200 overflow-hidden bg-white shadow-sm">
        <table className="w-full border-collapse text-sm" role="table" aria-label={tr.title}>
          <thead>
            <tr className="bg-brand-blue text-white">
              <th className="text-left text-[11px] font-semibold uppercase tracking-wide px-4 py-3.5">
                {tr.colTipoCarga}
              </th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wide px-4 py-3.5">
                {tr.colFecha}
              </th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wide px-4 py-3.5">
                {tr.colHorario}
              </th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wide px-4 py-3.5">
                {tr.colObservaciones}
              </th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((linea, index) => (
              <tr
                key={index}
                className={`border-b border-neutral-100 transition-colors hover:bg-brand-blue/5 ${index % 2 === 0 ? "bg-white" : "bg-neutral-50/40"}`}
              >
                <td className="px-4 py-3 font-semibold text-neutral-800">
                  {linea.tipoCarga}
                </td>
                <td className="px-4 py-3 font-mono text-sm text-neutral-700">
                  {linea.fecha ?? "—"}
                </td>
                <td className="px-4 py-3 text-neutral-700">
                  {linea.horario ?? "—"}
                </td>
                <td className="px-4 py-3 text-neutral-600 text-sm">
                  {linea.nota ?? "—"}
                </td>
              </tr>
            ))}

            {lateArrivalVgmNote && (
              <tr className="bg-red-50 border-b border-neutral-100">
                <td colSpan={4} className="px-4 py-3 text-red-700 text-sm font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    {lateArrivalVgmNote}
                  </span>
                </td>
              </tr>
            )}

            {contenedoresVaciosNote && (
              <tr className="bg-neutral-700 text-white">
                <td colSpan={4} className="px-4 py-3 text-sm font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 flex-shrink-0" />
                    {contenedoresVaciosNote}
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
