"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { sileo } from "sileo";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { esEstadoCerrado } from "@/lib/operaciones/estados";
import { getApiOriginPrefix } from "@/lib/basePath";
import { useNeonTheme } from "@/lib/ui/neonTheme";

type OpRow = {
  id: string;
  nave: string | null;
  viaje: string | null;
  naviera: string | null;
  pol: string | null;
  pod: string | null;
  etd: string | null;
  eta: string | null;
  estado_operacion: string | null;
  tracking_manual_lat: number | null;
  tracking_manual_lng: number | null;
  tracking_manual_updated_at: string | null;
};

type NaveCatalog = {
  id: string;
  nombre: string;
  imo: string | null;
  mmsi: string | null;
};

type VesselDraft = {
  key: string;
  /** Nombre limpio sin viaje (para catálogo y UI). */
  catalogNombre: string;
  /** Viajes distintos detectados (campo viaje o sufijo en el nombre). */
  viajes: string[];
  /** Pares nave cruda + viaje para sincronizar coords en operaciones. */
  syncTargets: { nave: string; viaje: string }[];
  naviera: string;
  pol: string;
  pod: string;
  etd: string;
  eta: string;
  opsCount: number;
  naveId: string | null;
  imo: string;
  mmsi: string;
  lat: string;
  lng: string;
  savedImo: string;
  savedMmsi: string;
  savedLat: string;
  savedLng: string;
};

const neonInput =
  "dash-control w-full px-2.5 py-2 border border-dash-border rounded-lg text-sm text-dash-fg placeholder:text-dash-muted focus:outline-none focus:ring-2 focus:ring-dash-neon/40 focus:border-dash-neon/50 tabular-nums";
const neonBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-dash-neon/40 bg-dash-neon/15 px-3 py-2 text-sm font-semibold text-dash-neon transition-colors hover:bg-dash-neon/25 disabled:opacity-50";
const neonBtnSecondary =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-dash-border bg-dash-control px-3 py-2 text-sm font-semibold text-dash-fg transition-colors hover:bg-dash-neon/15 disabled:opacity-50";

function todayDateISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalizeField(s: string | null | undefined): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Separa nombre de buque y viaje.
 * Ej: "MSC BRUNELLA 635R" → nombre MSC BRUNELLA, viaje 635R
 *     "HMM BLESSING [2538W]" → nombre HMM BLESSING, viaje 2538W
 */
function splitNaveYViaje(
  naveRaw: string,
  viajeField: string | null | undefined,
): { nombre: string; viaje: string } {
  let nombre = naveRaw.trim().replace(/\s+/g, " ");
  let viaje = String(viajeField ?? "").trim();

  const bracket = nombre.match(/^(.*?)\s*\[([^\]]+)\]\s*$/);
  if (bracket) {
    nombre = bracket[1].trim();
    if (!viaje) viaje = bracket[2].trim();
  }

  // Sufijo de viaje suelto: 635R, 2538W, 546N, 2539w
  const suffix = nombre.match(/^(.*?)\s+(\d{2,5}[A-Za-z]?)\s*$/);
  if (suffix) {
    nombre = suffix[1].trim();
    if (!viaje) viaje = suffix[2].trim();
  }

  return { nombre, viaje };
}

function normalizeCatalogKey(nombre: string): string {
  return normalizeField(nombre)
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function parseCoord(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function coordToStr(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(Number(v))) return "";
  return String(v);
}

function bestManualCoords(ops: OpRow[]): { lat: number; lng: number } | null {
  let best: { lat: number; lng: number; ts: number } | null = null;
  for (const op of ops) {
    const lat = op.tracking_manual_lat != null ? Number(op.tracking_manual_lat) : NaN;
    const lng = op.tracking_manual_lng != null ? Number(op.tracking_manual_lng) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat === 0 && lng === 0) continue;
    const ts = op.tracking_manual_updated_at ? Date.parse(op.tracking_manual_updated_at) : 0;
    if (!best || (Number.isFinite(ts) ? ts : 0) >= best.ts) {
      best = { lat, lng, ts: Number.isFinite(ts) ? ts : 0 };
    }
  }
  return best;
}

function groupOps(ops: OpRow[], catalogByKey: Map<string, NaveCatalog>): VesselDraft[] {
  const groups = new Map<string, OpRow[]>();
  for (const op of ops) {
    const nave = (op.nave ?? "").trim();
    if (!nave) continue;
    const { nombre } = splitNaveYViaje(nave, op.viaje);
    if (!nombre) continue;
    const key = normalizeCatalogKey(nombre);
    const list = groups.get(key) ?? [];
    list.push(op);
    groups.set(key, list);
  }

  const rows: VesselDraft[] = [];
  for (const [key, list] of groups) {
    const sorted = [...list].sort((a, b) => String(a.eta ?? "").localeCompare(String(b.eta ?? "")));
    const primary = sorted[0]!;
    const primarySplit = splitNaveYViaje((primary.nave ?? "").trim(), primary.viaje);
    const catalogNombre = primarySplit.nombre;
    const cat = catalogByKey.get(key) ?? catalogByKey.get(normalizeCatalogKey(catalogNombre)) ?? null;

    const viajesSet = new Set<string>();
    const syncKey = new Set<string>();
    const syncTargets: { nave: string; viaje: string }[] = [];
    for (const op of list) {
      const raw = (op.nave ?? "").trim();
      if (!raw) continue;
      const split = splitNaveYViaje(raw, op.viaje);
      if (split.viaje) viajesSet.add(split.viaje);
      const sk = `${normalizeField(raw)}|${normalizeField(op.viaje)}`;
      if (syncKey.has(sk)) continue;
      syncKey.add(sk);
      // RPC compara el texto crudo de operaciones.nave / .viaje
      syncTargets.push({ nave: raw, viaje: (op.viaje ?? "").trim() });
    }

    const coords = bestManualCoords(list);
    const imo = cat?.imo?.trim() ?? "";
    const mmsi = cat?.mmsi?.trim() ?? "";
    const lat = coordToStr(coords?.lat);
    const lng = coordToStr(coords?.lng);

    rows.push({
      key,
      catalogNombre,
      viajes: [...viajesSet].sort((a, b) => a.localeCompare(b)),
      syncTargets,
      naviera: (primary.naviera ?? "").trim(),
      pol: (primary.pol ?? "").trim(),
      pod: (primary.pod ?? "").trim(),
      etd: (primary.etd ?? "").trim(),
      eta: (primary.eta ?? "").trim(),
      opsCount: list.length,
      naveId: cat?.id ?? null,
      imo,
      mmsi,
      lat,
      lng,
      savedImo: imo,
      savedMmsi: mmsi,
      savedLat: lat,
      savedLng: lng,
    });
  }

  return rows.sort(
    (a, b) => a.eta.localeCompare(b.eta) || a.catalogNombre.localeCompare(b.catalogNombre),
  );
}

function isDirty(row: VesselDraft): boolean {
  return (
    row.imo.trim() !== row.savedImo.trim() ||
    row.mmsi.trim() !== row.savedMmsi.trim() ||
    row.lat.trim() !== row.savedLat.trim() ||
    row.lng.trim() !== row.savedLng.trim()
  );
}

function isIncomplete(row: VesselDraft): boolean {
  return !row.imo.trim() || !row.mmsi.trim() || !row.lat.trim() || !row.lng.trim();
}

export function NavesTrackingContent() {
  const { t } = useLocale();
  const tr = t.navesTracking;
  const { isSuperadmin, profile, isLoading: authLoading } = useAuth();
  const [theme] = useNeonTheme();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<VesselDraft[]>([]);
  const [search, setSearch] = useState("");
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const today = todayDateISO();

    const [opsRes, navesRes] = await Promise.all([
      supabase
        .from("operaciones")
        .select(
          "id, nave, viaje, naviera, pol, pod, etd, eta, estado_operacion, tracking_manual_lat, tracking_manual_lng, tracking_manual_updated_at",
        )
        .is("deleted_at", null)
        .not("nave", "is", null)
        .not("eta", "is", null)
        .gte("eta", today)
        .limit(4000),
      supabase.from("naves").select("id, nombre, imo, mmsi").eq("activo", true).limit(5000),
    ]);

    if (opsRes.error) {
      sileo.error({ title: opsRes.error.message });
      setRows([]);
      setLoading(false);
      return;
    }

    const catalogByKey = new Map<string, NaveCatalog>();
    for (const n of (navesRes.data ?? []) as NaveCatalog[]) {
      const k = normalizeCatalogKey(n.nombre);
      if (k) catalogByKey.set(k, n);
    }

    const activas = ((opsRes.data ?? []) as OpRow[]).filter(
      (op) => !esEstadoCerrado(op.estado_operacion) && Boolean((op.nave ?? "").trim()) && Boolean((op.eta ?? "").trim()),
    );

    setRows(groupOps(activas, catalogByKey));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperadmin) {
      setLoading(false);
      return;
    }
    void load();
  }, [authLoading, isSuperadmin, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyIncomplete && !isIncomplete(r)) return false;
      if (!q) return true;
      return (
        r.catalogNombre.toLowerCase().includes(q) ||
        r.viajes.some((v) => v.toLowerCase().includes(q)) ||
        r.naviera.toLowerCase().includes(q) ||
        r.pol.toLowerCase().includes(q) ||
        r.pod.toLowerCase().includes(q) ||
        r.imo.includes(q) ||
        r.mmsi.includes(q)
      );
    });
  }, [rows, search, onlyIncomplete]);

  const updateRow = useCallback((key: string, patch: Partial<VesselDraft>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }, []);

  const handleSave = useCallback(
    async (row: VesselDraft) => {
      if (!supabase) return;
      const imo = row.imo.trim();
      const mmsi = row.mmsi.trim();
      if (imo && !/^\d{7}$/.test(imo)) {
        sileo.error({ title: tr.invalidImo });
        return;
      }
      if (mmsi && !/^\d{9}$/.test(mmsi)) {
        sileo.error({ title: tr.invalidMmsi });
        return;
      }

      const latRaw = row.lat.trim();
      const lngRaw = row.lng.trim();
      const hasAnyCoord = Boolean(latRaw || lngRaw);
      const lat = parseCoord(latRaw);
      const lng = parseCoord(lngRaw);
      if (hasAnyCoord) {
        if (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          sileo.error({ title: tr.invalidCoords });
          return;
        }
      }

      setSavingKey(row.key);
      try {
        const idsChanged = imo !== row.savedImo.trim() || mmsi !== row.savedMmsi.trim();
        let naveId = row.naveId;
        const shouldUpsertCatalog = idsChanged || (!naveId && Boolean(imo || mmsi));

        if (shouldUpsertCatalog) {
          const res = await fetch(`${getApiOriginPrefix()}/api/admin/naves`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: naveId || undefined,
              nombre: row.catalogNombre,
              imo,
              mmsi,
            }),
          });
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            nave?: NaveCatalog;
          };
          if (!res.ok || !data.nave) {
            sileo.error({ title: data.error ?? tr.saveError });
            return;
          }
          naveId = data.nave.id;
          updateRow(row.key, {
            naveId,
            imo: data.nave.imo ?? "",
            mmsi: data.nave.mmsi ?? "",
            savedImo: data.nave.imo ?? "",
            savedMmsi: data.nave.mmsi ?? "",
          });
        }

        const coordsChanged = latRaw !== row.savedLat.trim() || lngRaw !== row.savedLng.trim();
        if (coordsChanged) {
          for (const target of row.syncTargets) {
            const { error } = await supabase.rpc("sync_operaciones_tracking_manual", {
              p_nave: target.nave,
              p_viaje: target.viaje,
              p_lat: hasAnyCoord ? lat : 0,
              p_lng: hasAnyCoord ? lng : 0,
              p_clear: !hasAnyCoord,
            });
            if (error) {
              sileo.error({ title: error.message || tr.saveError });
              return;
            }
          }
          if (!hasAnyCoord) {
            updateRow(row.key, { lat: "", lng: "", savedLat: "", savedLng: "" });
          } else {
            updateRow(row.key, {
              lat: String(lat),
              lng: String(lng),
              savedLat: String(lat),
              savedLng: String(lng),
            });
          }
        }

        sileo.success({ title: tr.saved });
      } finally {
        setSavingKey(null);
      }
    },
    [supabase, tr, updateRow],
  );

  const handleClearCoords = useCallback(
    async (row: VesselDraft) => {
      if (!supabase) return;
      setSavingKey(row.key);
      try {
        for (const target of row.syncTargets) {
          const { error } = await supabase.rpc("sync_operaciones_tracking_manual", {
            p_nave: target.nave,
            p_viaje: target.viaje,
            p_lat: 0,
            p_lng: 0,
            p_clear: true,
          });
          if (error) {
            sileo.error({ title: error.message || tr.saveError });
            return;
          }
        }
        updateRow(row.key, { lat: "", lng: "", savedLat: "", savedLng: "" });
        sileo.success({ title: tr.coordsCleared });
      } finally {
        setSavingKey(null);
      }
    },
    [supabase, tr, updateRow],
  );

  if (authLoading || loading) {
    return (
      <main className="dash-neon flex-1 min-h-0 overflow-auto p-4 sm:p-6" data-theme={theme} role="main">
        <p className="text-dash-muted">{tr.loading}</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="dash-neon flex-1 min-h-0 overflow-auto p-4 sm:p-6" data-theme={theme} role="main">
        <p className="text-dash-muted">{tr.loginRequired}</p>
      </main>
    );
  }

  if (!isSuperadmin) {
    return (
      <main className="dash-neon flex-1 min-h-0 overflow-auto p-4 sm:p-6" data-theme={theme} role="main">
        <p className="text-dash-muted">{tr.superadminOnly}</p>
      </main>
    );
  }

  return (
    <main className="dash-neon flex-1 min-h-0 overflow-auto p-4 sm:p-6" data-theme={theme} role="main">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dash-fg flex items-center gap-2">
              <Icon icon="lucide:radar" width={22} height={22} className="text-dash-neon" />
              {tr.title}
            </h1>
            <p className="mt-1 text-sm text-dash-muted max-w-2xl">{tr.subtitle}</p>
          </div>
          <button type="button" onClick={() => void load()} className={neonBtnSecondary}>
            <Icon icon="lucide:refresh-cw" width={14} height={14} />
            {tr.refresh}
          </button>
        </header>

        <div className="dash-card rounded-xl p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Icon
              icon="lucide:search"
              width={16}
              height={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-dash-muted"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tr.searchPlaceholder}
              className={`${neonInput} pl-9`}
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-dash-fg shrink-0">
            <input
              type="checkbox"
              checked={onlyIncomplete}
              onChange={(e) => setOnlyIncomplete(e.target.checked)}
              className="rounded border-dash-border"
            />
            {tr.onlyIncomplete}
          </label>
          <p className="text-xs text-dash-muted tabular-nums shrink-0">
            {filtered.length}/{rows.length}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="dash-card rounded-xl p-8 text-center text-dash-muted">
            {rows.length === 0 ? tr.empty : tr.emptyFilter}
          </div>
        ) : (
          <>
            {/* Cards móvil */}
            <div className="md:hidden space-y-3">
              {filtered.map((row) => {
                const busy = savingKey === row.key;
                const dirty = isDirty(row);
                return (
                  <article key={row.key} className="dash-card rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-dash-fg">{row.catalogNombre}</p>
                        <p className="text-xs text-dash-muted mt-0.5">
                          {[row.viajes.length ? `${tr.viaje}: ${row.viajes.join(", ")}` : null, row.naviera]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </p>
                        <p className="text-xs text-dash-muted mt-1">
                          {row.pol || "—"} → {row.pod || "—"} · ETA {row.eta || "—"} · {row.opsCount}{" "}
                          {tr.ops.toLowerCase()}
                        </p>
                      </div>
                      <StatusBadges row={row} tr={tr} />
                    </div>
                    {!row.naveId && <p className="text-xs text-amber-300">{tr.noCatalog}</p>}
                    <div className="grid grid-cols-2 gap-2">
                      <Field label={tr.imo} value={row.imo} onChange={(v) => updateRow(row.key, { imo: v })} inputMode="numeric" />
                      <Field label={tr.mmsi} value={row.mmsi} onChange={(v) => updateRow(row.key, { mmsi: v })} inputMode="numeric" />
                      <Field label={tr.lat} value={row.lat} onChange={(v) => updateRow(row.key, { lat: v })} inputMode="decimal" />
                      <Field label={tr.lng} value={row.lng} onChange={(v) => updateRow(row.key, { lng: v })} inputMode="decimal" />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy || !dirty}
                        onClick={() => void handleSave(row)}
                        className={`${neonBtn} flex-1`}
                      >
                        {busy ? tr.saving : tr.save}
                      </button>
                      {(row.savedLat || row.savedLng) && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleClearCoords(row)}
                          className={neonBtnSecondary}
                        >
                          {tr.clearCoords}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Tabla desktop */}
            <div className="hidden md:block dash-card rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-dash-border bg-dash-control/60 text-dash-muted">
                      <th className="px-3 py-2.5 font-semibold">{tr.nave}</th>
                      <th className="px-3 py-2.5 font-semibold">{tr.viaje}</th>
                      <th className="px-3 py-2.5 font-semibold">{tr.ruta}</th>
                      <th className="px-3 py-2.5 font-semibold">{tr.eta}</th>
                      <th className="px-3 py-2.5 font-semibold w-28">{tr.imo}</th>
                      <th className="px-3 py-2.5 font-semibold w-32">{tr.mmsi}</th>
                      <th className="px-3 py-2.5 font-semibold w-28">{tr.lat}</th>
                      <th className="px-3 py-2.5 font-semibold w-28">{tr.lng}</th>
                      <th className="px-3 py-2.5 font-semibold w-40">{tr.ops}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dash-border/70">
                    {filtered.map((row) => {
                      const busy = savingKey === row.key;
                      const dirty = isDirty(row);
                      return (
                        <tr key={row.key} className="align-top hover:bg-dash-control/30">
                          <td className="px-3 py-2.5">
                            <p className="font-semibold text-dash-fg">{row.catalogNombre}</p>
                            <p className="text-xs text-dash-muted">{row.naviera || "—"}</p>
                            {!row.naveId && <p className="text-[11px] text-amber-300 mt-0.5">{tr.noCatalog}</p>}
                            <div className="mt-1">
                              <StatusBadges row={row} tr={tr} />
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-dash-fg tabular-nums">
                            {row.viajes.length > 0 ? row.viajes.join(", ") : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-dash-fg">
                            <span className="text-dash-muted">{row.pol || "—"}</span>
                            <span className="mx-1 text-dash-muted">→</span>
                            <span>{row.pod || "—"}</span>
                            <p className="text-xs text-dash-muted mt-0.5">
                              ETD {row.etd || "—"} · {row.opsCount} ops
                            </p>
                          </td>
                          <td className="px-3 py-2.5 text-dash-fg tabular-nums whitespace-nowrap">{row.eta || "—"}</td>
                          <td className="px-3 py-2.5">
                            <input
                              value={row.imo}
                              onChange={(e) => updateRow(row.key, { imo: e.target.value })}
                              className={neonInput}
                              inputMode="numeric"
                              placeholder="1234567"
                              maxLength={7}
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              value={row.mmsi}
                              onChange={(e) => updateRow(row.key, { mmsi: e.target.value })}
                              className={neonInput}
                              inputMode="numeric"
                              placeholder="123456789"
                              maxLength={9}
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              value={row.lat}
                              onChange={(e) => updateRow(row.key, { lat: e.target.value })}
                              className={neonInput}
                              inputMode="decimal"
                              placeholder="-33.04"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              value={row.lng}
                              onChange={(e) => updateRow(row.key, { lng: e.target.value })}
                              className={neonInput}
                              inputMode="decimal"
                              placeholder="-71.62"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col gap-1.5">
                              <button
                                type="button"
                                disabled={busy || !dirty}
                                onClick={() => void handleSave(row)}
                                className={neonBtn}
                              >
                                {busy ? tr.saving : tr.save}
                              </button>
                              {(row.savedLat || row.savedLng) && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleClearCoords(row)}
                                  className={neonBtnSecondary}
                                >
                                  {tr.clearCoords}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "numeric" | "decimal";
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-dash-muted mb-1">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={neonInput}
        inputMode={inputMode}
      />
    </label>
  );
}

function StatusBadges({
  row,
  tr,
}: {
  row: VesselDraft;
  tr: {
    missingIds: string;
    missingCoords: string;
    complete: string;
  };
}) {
  const missingIds = !row.imo.trim() || !row.mmsi.trim();
  const missingCoords = !row.lat.trim() || !row.lng.trim();
  if (!missingIds && !missingCoords) {
    return (
      <span className="inline-flex items-center rounded-md border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
        {tr.complete}
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {missingIds && (
        <span className="inline-flex items-center rounded-md border border-amber-400/35 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
          {tr.missingIds}
        </span>
      )}
      {missingCoords && (
        <span className="inline-flex items-center rounded-md border border-sky-400/35 bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold text-sky-300">
          {tr.missingCoords}
        </span>
      )}
    </div>
  );
}
