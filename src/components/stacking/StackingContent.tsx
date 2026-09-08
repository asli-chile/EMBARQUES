import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale } from "@/lib/i18n";
import type { StackingData } from "@/types/stacking";
import { fetchPublicItinerarios } from "@/lib/itinerarios-service";
import type { ItinerarioWithEscalas } from "@/types/itinerarios";
import { formatDisplayDateLocal } from "@/lib/calendarUtils";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  STACKING_DRAFTS_STORAGE_KEY,
  getDraftForItinerary,
  getEmptyStackingDraft,
  saveDraftToStorage,
  type StackingDraft,
} from "@/lib/stacking-drafts";
import { useNeonTheme } from "@/lib/ui/neonTheme";
import { FormSelect } from "@/components/ui/FormSelect";

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
    return formatDisplayDateLocal(new Date(d + "T12:00:00"));
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

function StackingFieldRow({
  label,
  field,
  value,
  editable,
  placeholder,
  onChange,
  onBlurSave,
}: {
  label: string;
  field: keyof StackingDraft;
  value: string;
  editable: boolean;
  placeholder?: string;
  onChange: (field: keyof StackingDraft, v: string) => void;
  onBlurSave: (field: keyof StackingDraft) => void;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-[9px] font-bold uppercase tracking-wide text-dash-muted">{label}</p>
      {editable ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(field, e.target.value)}
          onBlur={() => onBlurSave(field)}
          placeholder={placeholder}
          className="dash-control w-full rounded-lg px-2 py-1.5 font-mono text-xs text-dash-fg placeholder:text-dash-muted focus:outline-none focus:ring-2 focus:ring-dash-neon/40"
        />
      ) : (
        <p className="flex min-h-[28px] items-center font-mono text-xs font-semibold tabular-nums text-dash-fg">
          {value.trim() || "—"}
        </p>
      )}
    </div>
  );
}

function StackingScheduleCard({
  title,
  icon,
  borderAccent,
  children,
}: {
  title: string;
  icon: string;
  borderAccent: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`dash-card group overflow-hidden rounded-xl transition-all duration-200 ${borderAccent}`}
    >
      <div className="dash-section-head flex items-center gap-2 px-3 py-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-dash-neon/35 bg-dash-neon/15">
          <Icon icon={icon} width={15} height={15} className="text-dash-neon" aria-hidden />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wide text-dash-fg">{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

export function StackingContent({ data = null }: StackingContentProps) {
  const { t } = useLocale();
  const tr = t.stackingPage;
  const { isSuperadmin } = useAuth();
  const [theme] = useNeonTheme();

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
    const raw = getDraftForItinerary(drafts, selected);
    setStackingDraft({ ...getEmptyStackingDraft(), ...(raw ?? {}) });
  }, [selected?.id]);

  const showEmptyState = !hasPropData && !loading && !error && stackingItinerarios.length === 0;
  const showNoResultsAfterFilter =
    !hasPropData && !loading && !error && stackingItinerarios.length > 0 && sortedFiltered.length === 0;

  return (
    <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
      <main
        className="dash-page relative flex min-h-0 flex-1 flex-col overflow-hidden"
        role="main"
        aria-label={tr.title}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -right-16 top-10 h-72 w-72 rounded-full bg-dash-neon/20 blur-3xl" />
          <div className="absolute bottom-20 left-1/4 h-64 w-64 rounded-full bg-dash-neon-hot/15 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col">
          {hasPropData && data && (
            <div className="p-3 sm:p-4">
              <StackingTable data={data} tr={tr} />
            </div>
          )}

          {!hasPropData && (
            <>
              <div className="dash-toolbar relative z-10 shrink-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dash-neon/40 bg-dash-neon/15 shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--dash-neon)_55%,transparent)]">
                      <Icon icon="lucide:ship" width={22} height={22} className="text-dash-neon" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <h1 className="truncate text-lg font-bold tracking-tight text-dash-fg sm:text-xl">
                        {tr.title}
                        {stackingItinerarios.length > 0 && (
                          <span className="ml-2 text-sm font-bold text-dash-muted">
                            {sortedFiltered.length}/{stackingItinerarios.length}
                          </span>
                        )}
                      </h1>
                      <p className="mt-0.5 line-clamp-1 hidden text-xs text-dash-muted sm:block sm:text-sm">
                        {(tr as { subtitle?: string }).subtitle ?? "Horarios de recepción stacking"}
                      </p>
                    </div>
                  </div>
                  {stackingItinerarios.length > 0 && (
                    <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
                      <div className="min-w-[130px] flex-1 sm:flex-initial">
                        <FormSelect
                          variant="neon"
                          value={filterNaviera}
                          placeholder={tr.filterAll}
                          options={navieraOptions.map((n) => ({ value: n, label: n }))}
                          onChange={setFilterNaviera}
                        />
                      </div>
                      <div className="min-w-[100px] flex-1 sm:flex-initial">
                        <FormSelect
                          variant="neon"
                          value={filterPol}
                          placeholder={tr.filterAllPol}
                          options={polOptions.map((p) => ({ value: p, label: p }))}
                          onChange={setFilterPol}
                        />
                      </div>
                      {(filterNaviera || filterPol) && (
                        <button
                          type="button"
                          onClick={() => {
                            setFilterNaviera("");
                            setFilterPol("");
                          }}
                          className="dash-control shrink-0 rounded-lg p-2.5 text-dash-muted transition-colors hover:bg-dash-neon/15 hover:text-dash-fg"
                          aria-label="Limpiar filtros"
                        >
                          <Icon icon="lucide:x" width={16} height={16} aria-hidden />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {loading && (
                <div
                  className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4 px-3 py-10 sm:px-4 sm:py-16"
                  role="status"
                  aria-live="polite"
                >
                  <span
                    className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-dash-neon border-t-transparent"
                    aria-hidden
                  />
                  <p className="text-sm text-dash-muted">
                    {(tr as { loading?: string }).loading ??
                      t.itinerarioPage?.loadingItineraries ??
                      "Cargando itinerarios…"}
                  </p>
                </div>
              )}

              {error && (
                <div
                  className="relative z-10 flex flex-1 items-center justify-center px-3 py-8 sm:px-4 sm:py-12"
                  role="alert"
                >
                  <div className="flex max-w-md items-center gap-3 rounded-xl border border-red-400/35 bg-red-400/15 px-4 py-3 text-sm text-dash-fg sm:px-5 sm:py-4">
                    <Icon icon="lucide:alert-circle" width={20} height={20} className="shrink-0 text-red-400" aria-hidden />
                    {error}
                  </div>
                </div>
              )}

              {showEmptyState && (
                <div
                  className="relative z-10 mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-3 py-10 text-center sm:px-4 sm:py-16"
                  role="status"
                  aria-live="polite"
                >
                  <div className="dash-card rounded-xl p-6 sm:p-8">
                    <div className="mb-4 flex justify-center text-dash-muted">
                      <Icon icon="lucide:calendar-x" width={48} height={48} aria-hidden />
                    </div>
                    <p className="font-medium text-dash-fg">{tr.emptyTitle}</p>
                    <p className="mt-2 text-sm text-dash-muted">{tr.emptySubtitle}</p>
                    <p className="mt-4 text-xs text-dash-muted">{tr.noUpcomingStacking}</p>
                  </div>
                </div>
              )}

              {showNoResultsAfterFilter && (
                <div
                  className="relative z-10 mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-3 py-10 text-center sm:px-4 sm:py-16"
                  role="status"
                >
                  <div className="dash-card rounded-xl p-6 sm:p-8">
                    <div className="mb-4 flex justify-center text-dash-muted">
                      <Icon icon="lucide:filter-x" width={48} height={48} aria-hidden />
                    </div>
                    <p className="font-medium text-dash-fg">{tr.emptyTitle}</p>
                    <p className="mt-2 text-sm text-dash-muted">
                      {(tr as Record<string, string>).filterNoResults ??
                        "No hay resultados con los filtros seleccionados."}
                    </p>
                  </div>
                </div>
              )}

              {sortedFiltered.length > 0 &&
                (() => {
                  const countLabel =
                    sortedFiltered.length === 1
                      ? (
                          (tr as { itineraryCount?: string }).itineraryCount ?? "{{count}} itinerario"
                        ).replace("{{count}}", "1")
                      : (
                          (tr as { itineraryCount_other?: string }).itineraryCount_other ??
                          "{{count}} itinerarios"
                        ).replace("{{count}}", String(sortedFiltered.length));
                  return (
                    <section className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 lg:flex-row">
                      {/* ── Col 1: Lista de itinerarios ── */}
                      <div
                        className={`dash-card min-h-0 flex-col overflow-hidden lg:w-[32%] lg:flex-shrink-0 ${
                          mobileView === "detail" ? "hidden lg:flex" : "flex"
                        }`}
                      >
                        <div className="dash-section-head flex flex-shrink-0 items-center justify-between px-3 py-2.5">
                          <span className="text-sm font-bold uppercase tracking-widest text-dash-neon">
                            {(tr as { listTitle?: string }).listTitle ?? "Itinerarios"}
                          </span>
                          <span className="rounded-lg border border-dash-neon/35 bg-dash-neon/15 px-2.5 py-0.5 text-sm font-bold tabular-nums text-dash-fg">
                            {countLabel}
                          </span>
                        </div>
                        <div className="min-h-0 flex-1 scroll-smooth divide-y divide-dash-border overflow-y-auto">
                          {sortedFiltered.map((it) => {
                            const isActive = selected?.id === it.id;
                            const firstEta = getFirstEta(it.escalas);
                            const daysLeft = daysUntil(it.etd, 0);
                            const urgency =
                              daysLeft === null
                                ? null
                                : daysLeft <= 3
                                  ? "red"
                                  : daysLeft <= 7
                                    ? "amber"
                                    : "emerald";
                            return (
                              <button
                                key={it.id}
                                type="button"
                                onClick={() => {
                                  setSelectedId(it.id);
                                  setMobileView("detail");
                                }}
                                className={`w-full text-left transition-colors duration-150 ${
                                  isActive ? "bg-dash-neon/15" : "hover:bg-dash-neon/10"
                                }`}
                              >
                                <div
                                  className={`flex border-l-[3px] ${
                                    isActive ? "border-dash-neon" : "border-transparent"
                                  }`}
                                >
                                  <div className="min-w-0 flex-1 px-3 py-2.5">
                                    <div className="mb-1 flex items-center justify-between gap-2">
                                      <span
                                        className={`truncate text-[10px] font-bold uppercase tracking-widest ${
                                          isActive ? "text-dash-neon" : "text-dash-muted"
                                        }`}
                                      >
                                        {(it.operador || it.naviera || it.servicio || "").trim() || "—"}
                                      </span>
                                      {daysLeft !== null && (
                                        <span
                                          className={`inline-flex shrink-0 items-center rounded-lg border px-2 py-0.5 text-[10px] font-black tabular-nums ${
                                            urgency === "red"
                                              ? "border-red-400/35 bg-red-400/15 text-dash-fg"
                                              : urgency === "amber"
                                                ? "border-amber-400/35 bg-amber-400/15 text-dash-fg"
                                                : "border-emerald-400/35 bg-emerald-400/15 text-dash-fg"
                                          }`}
                                        >
                                          {isTodayEtd(it.etd) ? "HOY" : `${daysLeft}d`}
                                        </span>
                                      )}
                                    </div>
                                    <p
                                      className={`truncate text-xs font-bold leading-snug ${
                                        isActive ? "text-dash-neon" : "text-dash-fg"
                                      }`}
                                    >
                                      {it.nave || "—"}{" "}
                                      <span className="font-normal text-dash-muted">·</span>{" "}
                                      {it.viaje || "—"}
                                    </p>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-dash-muted">
                                      <span>
                                        POL{" "}
                                        <span className="font-mono font-semibold text-dash-fg">
                                          {it.pol || "—"}
                                        </span>
                                      </span>
                                      <span>
                                        ETD{" "}
                                        <span className="font-mono font-semibold text-dash-fg">
                                          {formatEtdDisplay(it.etd)}
                                        </span>
                                      </span>
                                      {firstEta && (
                                        <span>
                                          ETA{" "}
                                          <span className="font-mono font-semibold text-dash-fg">
                                            {formatEtdDisplay(firstEta)}
                                          </span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* ── Col 2: Detalle del itinerario ── */}
                      <div
                        className={`dash-card min-h-0 flex-1 flex-col overflow-hidden ${
                          mobileView === "list" ? "hidden lg:flex" : "flex"
                        }`}
                      >
                        {selected
                          ? (() => {
                              const daysToZarpe = daysUntil(selected.etd, 0);
                              const daysToClose = daysUntil(selected.etd, STACKING_CLOSE_OFFSET_DAYS);
                              const zarpeUrgency =
                                daysToZarpe === null
                                  ? null
                                  : daysToZarpe <= 3
                                    ? "red"
                                    : daysToZarpe <= 7
                                      ? "amber"
                                      : "emerald";
                              const closeUrgency =
                                daysToClose === null
                                  ? null
                                  : daysToClose <= 2
                                    ? "red"
                                    : daysToClose <= 5
                                      ? "amber"
                                      : "emerald";
                              const urgencyNumClass = (u: string | null) =>
                                u === "red"
                                  ? "text-red-400"
                                  : u === "amber"
                                    ? "text-amber-400"
                                    : "text-emerald-400";
                              const sp = tr as Record<string, string>;
                              const d = stackingDraft ?? getEmptyStackingDraft();
                              const placeholderFmt = sp.placeholderDateFormat ?? "DD/MM/AAAA HH:MM";
                              const setField = (key: keyof StackingDraft, v: string) => {
                                setStackingDraft((prev) => ({
                                  ...getEmptyStackingDraft(),
                                  ...(prev ?? {}),
                                  [key]: v,
                                }));
                              };
                              const blurSave = (key: keyof StackingDraft) => {
                                if (!selected) return;
                                setStackingDraft((prev) => {
                                  const next = {
                                    ...getEmptyStackingDraft(),
                                    ...(prev ?? {}),
                                  };
                                  saveDraftToStorage(selected.nave, { [key]: next[key] });
                                  return next;
                                });
                              };
                              return (
                                <>
                                  <div className="relative flex-shrink-0 overflow-hidden">
                                    <div className="h-[3px] bg-gradient-to-r from-dash-neon to-dash-neon-hot" />
                                    <div className="relative border-b border-dash-border px-3 py-3">
                                      <div className="flex flex-wrap items-start gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setMobileView("list")}
                                          className="mt-0.5 inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-dash-neon transition-colors hover:text-dash-fg lg:hidden"
                                        >
                                          <Icon icon="lucide:chevron-left" width={14} height={14} aria-hidden />
                                          Lista
                                        </button>
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dash-neon/40 bg-dash-neon/15 shadow-[0_0_20px_-8px_color-mix(in_srgb,var(--dash-neon)_50%,transparent)]">
                                          <Icon
                                            icon="lucide:ship"
                                            width={18}
                                            height={18}
                                            className="text-dash-neon"
                                            aria-hidden
                                          />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm font-black leading-tight tracking-tight text-dash-fg">
                                            <span className="text-dash-neon">{selected.nave || "—"}</span>
                                            <span className="mx-1.5 font-normal text-dash-muted">·</span>
                                            <span>{selected.viaje || "—"}</span>
                                          </p>
                                          <p className="mt-0.5 truncate text-[11px] text-dash-muted">
                                            {(
                                              selected.operador ||
                                              selected.naviera ||
                                              selected.servicio ||
                                              ""
                                            ).trim() || "—"}
                                          </p>
                                          <div className="mt-2 flex flex-wrap gap-2">
                                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-dash-control px-2.5 py-1 text-[11px]">
                                              <Icon
                                                icon="lucide:anchor"
                                                width={12}
                                                height={12}
                                                className="shrink-0 text-dash-neon"
                                                aria-hidden
                                              />
                                              <span className="text-[9px] font-bold uppercase text-dash-muted">
                                                {tr.polLabel}
                                              </span>
                                              <span className="font-mono font-bold text-dash-fg">
                                                {selected.pol || "—"}
                                              </span>
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-dash-control px-2.5 py-1 text-[11px] tabular-nums">
                                              <Icon
                                                icon="lucide:calendar-days"
                                                width={12}
                                                height={12}
                                                className="shrink-0 text-dash-neon"
                                                aria-hidden
                                              />
                                              <span className="text-[9px] font-bold uppercase text-dash-muted">
                                                {sp.etdBadge ?? "ETD"}
                                              </span>
                                              <span className="font-mono font-bold text-dash-fg">
                                                {formatEtdDisplay(selected.etd)}
                                              </span>
                                              {isTodayEtd(selected.etd) && (
                                                <span className="ml-0.5 inline-flex rounded bg-dash-neon/15 px-1 py-0.5 text-[8px] font-black uppercase text-dash-neon">
                                                  {sp.todayTag ?? "HOY"}
                                                </span>
                                              )}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="ml-auto flex shrink-0 flex-col items-end gap-2">
                                          {daysToZarpe !== null && (
                                            <div className="min-w-[4.5rem] rounded-xl border border-dash-border bg-dash-control px-3 py-1.5 text-right">
                                              <p
                                                className={`text-xl font-black tabular-nums leading-none ${urgencyNumClass(
                                                  zarpeUrgency
                                                )}`}
                                              >
                                                {daysToZarpe}
                                              </p>
                                              <p className="text-[8px] font-bold uppercase tracking-wide text-dash-muted">
                                                {sp.zarpeDaysLabel ?? "días al zarpe"}
                                              </p>
                                            </div>
                                          )}
                                          {daysToClose !== null && (
                                            <div className="min-w-[4.5rem] rounded-xl border border-dash-border bg-dash-control px-3 py-1.5 text-right">
                                              <p
                                                className={`text-xl font-black tabular-nums leading-none ${urgencyNumClass(
                                                  closeUrgency
                                                )}`}
                                              >
                                                {daysToClose}
                                              </p>
                                              <p className="text-[8px] font-bold uppercase tracking-wide text-dash-muted">
                                                {sp.stackingDaysLabel ?? "cierre est."}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex-shrink-0 border-b border-dash-border bg-dash-control/40 px-3 py-2">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                      <h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-dash-fg">
                                        <Icon
                                          icon="lucide:calendar-clock"
                                          width={14}
                                          height={14}
                                          className="text-dash-neon"
                                          aria-hidden
                                        />
                                        {sp.scheduleTitle ?? "Cronograma"}
                                      </h2>
                                    </div>
                                    <p className="mb-2 text-[10px] leading-snug text-dash-muted">
                                      {sp.scheduleHint ?? ""}
                                    </p>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                      <StackingScheduleCard
                                        title={sp.rowStackingDry ?? "Stacking"}
                                        icon="lucide:package"
                                        borderAccent="border-l-[3px] border-l-dash-neon"
                                      >
                                        <div className="grid grid-cols-2 gap-2">
                                          <StackingFieldRow
                                            label={sp.fieldInicio ?? "Inicio"}
                                            field="dryInicio"
                                            value={d.dryInicio}
                                            editable={isSuperadmin}
                                            placeholder={placeholderFmt}
                                            onChange={setField}
                                            onBlurSave={blurSave}
                                          />
                                          <StackingFieldRow
                                            label={sp.fieldFin ?? "Fin"}
                                            field="dryFin"
                                            value={d.dryFin}
                                            editable={isSuperadmin}
                                            placeholder={placeholderFmt}
                                            onChange={setField}
                                            onBlurSave={blurSave}
                                          />
                                        </div>
                                      </StackingScheduleCard>
                                      <StackingScheduleCard
                                        title={sp.rowCorteDocumental ?? "Corte documental"}
                                        icon="lucide:file-badge"
                                        borderAccent="border-l-[3px] border-l-amber-500"
                                      >
                                        <StackingFieldRow
                                          label={sp.rowCorteDocumental ?? "Corte documental"}
                                          field="cutoffDry"
                                          value={d.cutoffDry}
                                          editable={isSuperadmin}
                                          placeholder={placeholderFmt}
                                          onChange={setField}
                                          onBlurSave={blurSave}
                                        />
                                      </StackingScheduleCard>
                                      <StackingScheduleCard
                                        title={sp.rowLate ?? "Late"}
                                        icon="lucide:clock-alert"
                                        borderAccent="border-l-[3px] border-l-orange-500"
                                      >
                                        <div className="grid grid-cols-2 gap-2">
                                          <StackingFieldRow
                                            label={sp.fieldInicio ?? "Inicio"}
                                            field="lateInicio"
                                            value={d.lateInicio}
                                            editable={isSuperadmin}
                                            placeholder={placeholderFmt}
                                            onChange={setField}
                                            onBlurSave={blurSave}
                                          />
                                          <StackingFieldRow
                                            label={sp.fieldFin ?? "Fin"}
                                            field="lateFin"
                                            value={d.lateFin}
                                            editable={isSuperadmin}
                                            placeholder={placeholderFmt}
                                            onChange={setField}
                                            onBlurSave={blurSave}
                                          />
                                        </div>
                                      </StackingScheduleCard>
                                      <StackingScheduleCard
                                        title={sp.rowXlate ?? "X-Late"}
                                        icon="lucide:timer"
                                        borderAccent="border-l-[3px] border-l-violet-500"
                                      >
                                        <div className="grid grid-cols-2 gap-2">
                                          <StackingFieldRow
                                            label={sp.fieldInicio ?? "Inicio"}
                                            field="xlateInicio"
                                            value={d.xlateInicio}
                                            editable={isSuperadmin}
                                            placeholder={placeholderFmt}
                                            onChange={setField}
                                            onBlurSave={blurSave}
                                          />
                                          <StackingFieldRow
                                            label={sp.fieldFin ?? "Fin"}
                                            field="xlateFin"
                                            value={d.xlateFin}
                                            editable={isSuperadmin}
                                            placeholder={placeholderFmt}
                                            onChange={setField}
                                            onBlurSave={blurSave}
                                          />
                                        </div>
                                      </StackingScheduleCard>
                                      <StackingScheduleCard
                                        title={sp.rowReefer ?? "Reefer"}
                                        icon="lucide:snowflake"
                                        borderAccent="border-l-[3px] border-l-sky-500"
                                      >
                                        <div className="grid grid-cols-2 gap-2">
                                          <StackingFieldRow
                                            label={sp.fieldInicio ?? "Inicio"}
                                            field="reeferInicio"
                                            value={d.reeferInicio}
                                            editable={isSuperadmin}
                                            placeholder={placeholderFmt}
                                            onChange={setField}
                                            onBlurSave={blurSave}
                                          />
                                          <StackingFieldRow
                                            label={sp.fieldFin ?? "Fin"}
                                            field="reeferFin"
                                            value={d.reeferFin}
                                            editable={isSuperadmin}
                                            placeholder={placeholderFmt}
                                            onChange={setField}
                                            onBlurSave={blurSave}
                                          />
                                        </div>
                                      </StackingScheduleCard>
                                      <StackingScheduleCard
                                        title={sp.rowCutoffReefer ?? "Cut off Reefer"}
                                        icon="lucide:thermometer-snowflake"
                                        borderAccent="border-l-[3px] border-l-cyan-600"
                                      >
                                        <StackingFieldRow
                                          label={sp.rowCutoffReefer ?? "Cut off Reefer"}
                                          field="cutoffReefer"
                                          value={d.cutoffReefer}
                                          editable={isSuperadmin}
                                          placeholder={placeholderFmt}
                                          onChange={setField}
                                          onBlurSave={blurSave}
                                        />
                                      </StackingScheduleCard>
                                      <div className="sm:col-span-2 xl:col-span-3">
                                        <StackingScheduleCard
                                          title={sp.rowCutoffAnticipado ?? "Cut off anticipado"}
                                          icon="lucide:calendar-x-2"
                                          borderAccent="border-l-[3px] border-l-neutral-500"
                                        >
                                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            <StackingFieldRow
                                              label={sp.rowCutoffAnticipado ?? "Fecha / hora"}
                                              field="cutoffAnticipado"
                                              value={d.cutoffAnticipado}
                                              editable={isSuperadmin}
                                              placeholder={placeholderFmt}
                                              onChange={setField}
                                              onBlurSave={blurSave}
                                            />
                                            <div className="min-w-0 space-y-1 sm:col-span-2">
                                              <p className="text-[9px] font-bold uppercase tracking-wide text-dash-muted">
                                                {sp.cutoffAnticipadoDescLabel ?? "Descripción"}
                                              </p>
                                              {isSuperadmin ? (
                                                <input
                                                  type="text"
                                                  value={d.cutoffAnticipadoDescripcion}
                                                  onChange={(e) =>
                                                    setField(
                                                      "cutoffAnticipadoDescripcion",
                                                      e.target.value
                                                    )
                                                  }
                                                  onBlur={() => blurSave("cutoffAnticipadoDescripcion")}
                                                  className="dash-control w-full rounded-lg px-2 py-1.5 text-xs text-dash-fg focus:outline-none focus:ring-2 focus:ring-dash-neon/40"
                                                />
                                              ) : (
                                                <p className="min-h-[28px] text-xs text-dash-fg">
                                                  {d.cutoffAnticipadoDescripcion.trim() || "—"}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </StackingScheduleCard>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto border-t border-dash-border bg-dash-control/30 p-3">
                                    {selected.stacking_imagen_url ? (
                                      <img
                                        src={selected.stacking_imagen_url}
                                        alt="Stacking oficial"
                                        className="block h-auto w-full max-w-full rounded-xl object-contain object-top"
                                      />
                                    ) : (
                                      <div className="flex flex-col items-center gap-2.5 py-16 text-center text-dash-muted">
                                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dash-border bg-dash-control">
                                          <Icon icon="lucide:image-off" width={22} height={22} aria-hidden />
                                        </span>
                                        <p className="text-sm font-medium">
                                          {(tr as { noImageHint?: string }).noImageHint ??
                                            "Sin imagen de stacking"}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </>
                              );
                            })()
                          : (
                              <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-3 px-4 text-center text-dash-muted">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dash-border bg-dash-control">
                                  <Icon icon="lucide:mouse-pointer-click" width={24} height={24} aria-hidden />
                                </span>
                                <p className="text-sm font-medium">
                                  {(tr as { selectItinerary?: string }).selectItinerary ?? tr.emptyTitle}
                                </p>
                              </div>
                            )}
                      </div>
                    </section>
                  );
                })()}
            </>
          )}
        </div>
      </main>
    </div>
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
      <div className="dash-card overflow-hidden rounded-xl">
        <div className="h-[3px] bg-gradient-to-r from-dash-neon to-dash-neon-hot" />
        <dl className="grid grid-cols-2 gap-px bg-dash-border md:grid-cols-4">
          {[
            { label: tr.nave, value: embarque.nave },
            { label: tr.viaje, value: embarque.viaje },
            { label: tr.eta, value: embarque.eta },
            { label: tr.servicio, value: embarque.servicio },
          ].map(({ label, value }) => (
            <div key={label} className="bg-dash-surface px-4 py-4">
              <dt className="text-sm font-bold uppercase tracking-wide text-dash-neon">{label}</dt>
              <dd className="mt-1 text-base font-semibold text-dash-fg">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="dash-card overflow-hidden rounded-xl">
        <table className="w-full border-collapse text-base" role="table" aria-label={tr.title}>
          <thead>
            <tr className="dash-section-head border-b border-dash-border">
              <th className="px-4 py-3.5 text-left text-sm font-bold uppercase tracking-wide text-dash-neon">
                {tr.colTipoCarga}
              </th>
              <th className="px-4 py-3.5 text-left text-sm font-bold uppercase tracking-wide text-dash-neon">
                {tr.colFecha}
              </th>
              <th className="px-4 py-3.5 text-left text-sm font-bold uppercase tracking-wide text-dash-neon">
                {tr.colHorario}
              </th>
              <th className="px-4 py-3.5 text-left text-sm font-bold uppercase tracking-wide text-dash-neon">
                {tr.colObservaciones}
              </th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((linea, index) => (
              <tr
                key={index}
                className={`border-b border-dash-border transition-colors hover:bg-dash-neon/10 ${
                  index % 2 === 0 ? "" : "bg-dash-control/40"
                }`}
              >
                <td className="px-4 py-3 font-semibold text-dash-fg">{linea.tipoCarga}</td>
                <td className="px-4 py-3 font-mono text-sm text-dash-fg">{linea.fecha ?? "—"}</td>
                <td className="px-4 py-3 text-dash-fg">{linea.horario ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-dash-muted">{linea.nota ?? "—"}</td>
              </tr>
            ))}

            {lateArrivalVgmNote && (
              <tr className="border-b border-dash-border bg-red-400/15">
                <td colSpan={4} className="px-4 py-3 text-sm font-medium text-dash-fg">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
                    {lateArrivalVgmNote}
                  </span>
                </td>
              </tr>
            )}

            {contenedoresVaciosNote && (
              <tr className="bg-dash-control text-dash-fg">
                <td colSpan={4} className="px-4 py-3 text-sm font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-dash-muted" />
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
