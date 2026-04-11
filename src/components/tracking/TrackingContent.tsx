import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthContext";
import { useState, useCallback, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { AnimatedNetworkBackground } from "@/components/ui/AnimatedNetworkBackground";
import {
  TrackingMapView,
  type MapFleetManualVessel,
  type MapMarkerPort,
  type MapVesselPosition,
} from "@/components/tracking/TrackingMapView";
import { ManualTrackingCoordsModal } from "@/components/tracking/ManualTrackingCoordsModal";
import { getApiOriginPrefix } from "@/lib/basePath";
import { getPortCoordinates } from "@/lib/ports-coordinates";

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
  viaje?: string | null;
  pol: string | null;
  etd: string | null;
  pod: string | null;
  eta: string | null;
  tt: number | null;
  tracking_manual_lat?: number | null;
  tracking_manual_lng?: number | null;
  tracking_manual_updated_at?: string | null;
};

type FleetManualRpcRow = {
  nave: string;
  viaje: string | null;
  lat: number;
  lng: number;
  ref_asli: string | null;
};

type AisSearchRow = {
  mmsi: number;
  imo: number | null;
  vessel_name: string;
  vessel_type?: string | null;
  area?: string | null;
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

function normalizeShipName(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function namesMatchForAis(naveOp: string | null | undefined, aisName: string): boolean {
  const a = normalizeShipName(naveOp);
  const b = normalizeShipName(aisName);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

function parseNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Con nave informada se puede sincronizar el grupo (viaje vacío en algunas filas incluido). */
function hasNaveForManualGroupSync(op: Pick<TrackingResult, "nave"> | null): boolean {
  return Boolean(String(op?.nave ?? "").trim());
}

function isOperacionActivaEnMapa(estado: string | null): boolean {
  const e = (estado ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, "_");
  return !["COMPLETADO", "CANCELADO", "ARRIBADO"].includes(e);
}

/** Alineado con la RPC: trim, minúsculas y espacios internos colapsados. */
function normalizeTrackingField(s: string | null | undefined): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Igual que la RPC sync_operaciones_tracking_manual (nave + reglas de viaje). */
function mismoGrupoTrackingManual(
  a: Pick<TrackingResult, "nave" | "viaje">,
  b: Pick<TrackingResult, "nave" | "viaje">,
): boolean {
  const na = normalizeTrackingField(a.nave);
  const nb = normalizeTrackingField(b.nave);
  if (!na || na !== nb) return false;
  const va = normalizeTrackingField(a.viaje);
  const vb = normalizeTrackingField(b.viaje);
  if (va.length > 0 && vb.length > 0) return va === vb;
  if (va.length > 0 && vb.length === 0) return true;
  if (va.length === 0 && vb.length > 0) return false;
  return true;
}

function opTieneCoordsManualesValidas(op: TrackingResult): boolean {
  const lat = parseNum(op.tracking_manual_lat);
  const lng = parseNum(op.tracking_manual_lng);
  return lat != null && lng != null && !(lat === 0 && lng === 0);
}

function manualCoordsUpdatedMs(op: TrackingResult): number {
  if (!op.tracking_manual_updated_at) return 0;
  const t = Date.parse(op.tracking_manual_updated_at);
  return Number.isNaN(t) ? 0 : t;
}

function mejorCoordsManualesDelGrupo(
  results: TrackingResult[],
  op: TrackingResult,
): { lat: number; lng: number } | null {
  let best: { lat: number; lng: number; ts: number } | null = null;
  for (const p of results) {
    if (!mismoGrupoTrackingManual(op, p)) continue;
    if (!opTieneCoordsManualesValidas(p)) continue;
    const lat = parseNum(p.tracking_manual_lat)!;
    const lng = parseNum(p.tracking_manual_lng)!;
    const ts = manualCoordsUpdatedMs(p);
    if (!best || ts >= best.ts) {
      best = { lat, lng, ts };
    }
  }
  return best ? { lat: best.lat, lng: best.lng } : null;
}

function opTienePosicionManualVisible(results: TrackingResult[], op: TrackingResult): boolean {
  if (opTieneCoordsManualesValidas(op)) return true;
  return mejorCoordsManualesDelGrupo(results, op) != null;
}

const FLEET_POS_EPS = 1.5e-4;

function fleetCoordsClose(a: MapFleetManualVessel, b: MapFleetManualVessel, eps = FLEET_POS_EPS): boolean {
  return Math.abs(a.lat - b.lat) < eps && Math.abs(a.lng - b.lng) < eps;
}

function clusterManualFleetFromResults(results: TrackingResult[]): MapFleetManualVessel[] {
  const withCoords = results.filter(
    (o) => isOperacionActivaEnMapa(o.estado_operacion) && opTieneCoordsManualesValidas(o),
  );
  const used = new Set<string>();
  const out: MapFleetManualVessel[] = [];
  for (const start of withCoords) {
    if (used.has(start.id)) continue;
    const stack = [start];
    const comp: TrackingResult[] = [];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      if (used.has(cur.id)) continue;
      used.add(cur.id);
      comp.push(cur);
      for (const o of withCoords) {
        if (!used.has(o.id) && mismoGrupoTrackingManual(cur, o)) {
          stack.push(o);
        }
      }
    }
    let best = comp[0]!;
    let bestTs = manualCoordsUpdatedMs(best);
    for (const c of comp) {
      const ts = manualCoordsUpdatedMs(c);
      if (ts >= bestTs) {
        best = c;
        bestTs = ts;
      }
    }
    const lat = parseNum(best.tracking_manual_lat)!;
    const lng = parseNum(best.tracking_manual_lng)!;
    const naveT = String(best.nave ?? "").trim();
    const viajT = String(best.viaje ?? "").trim();
    const name =
      [naveT, viajT || null].filter(Boolean).join(" · ") || best.ref_asli || best.contenedor || "—";
    const markerKey = `grp:${comp
      .map((c) => c.id)
      .sort()
      .join("|")}`;
    out.push({ markerKey, lat, lng, name });
  }
  return out;
}

const POLL_MS = 45_000;

export function TrackingContent() {
  const { t, locale } = useLocale();
  const tr = t.trackingPage;
  const { user, profile, isCliente } = useAuth();

  const [termino, setTermino] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TrackingResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);

  const [aisName, setAisName] = useState("");
  const [aisLoading, setAisLoading] = useState(false);
  const [aisResults, setAisResults] = useState<AisSearchRow[]>([]);
  const [aisError, setAisError] = useState<string | null>(null);
  const [aisSearched, setAisSearched] = useState(false);
  const [selectedAis, setSelectedAis] = useState<AisSearchRow | null>(null);
  const [extendedAis, setExtendedAis] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [vesselSnap, setVesselSnap] = useState<Record<string, unknown> | null>(null);
  const [vesselLoading, setVesselLoading] = useState(false);
  const [vesselError, setVesselError] = useState<string | null>(null);
  const [lastAisAt, setLastAisAt] = useState<Date | null>(null);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [fleetManualVessels, setFleetManualVessels] = useState<MapFleetManualVessel[]>([]);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const apiPrefix = useMemo(() => getApiOriginPrefix(), []);

  const canSetManualCoords = Boolean(
    user &&
      profile &&
      !isCliente &&
      ["superadmin", "admin", "ejecutivo", "operador", "usuario"].includes(profile.rol),
  );

  const selectedOp = useMemo(
    () => results.find((r) => r.id === selectedOpId) ?? null,
    [results, selectedOpId],
  );

  const linkedOps = useMemo(() => {
    if (!selectedAis) return [];
    return results.filter((op) => namesMatchForAis(op.nave, selectedAis.vessel_name));
  }, [results, selectedAis]);

  const polMarker: MapMarkerPort | null = useMemo(() => {
    const pod = selectedOp?.pol;
    if (!pod?.trim()) return null;
    const c = getPortCoordinates(pod);
    if (!c) return null;
    return { lng: c[0], lat: c[1], label: `POL · ${pod}`, variant: "pol" };
  }, [selectedOp?.pol]);

  const podMarker: MapMarkerPort | null = useMemo(() => {
    const pod = selectedOp?.pod;
    if (!pod?.trim()) return null;
    const c = getPortCoordinates(pod);
    if (!c) return null;
    return { lng: c[0], lat: c[1], label: `POD · ${pod}`, variant: "pod" };
  }, [selectedOp?.pod]);

  const vesselFromAis: MapVesselPosition | null = useMemo(() => {
    if (!vesselSnap) return null;
    const lat = parseNum(vesselSnap.lat);
    const lng = parseNum(vesselSnap.lng);
    if (lat == null || lng == null) return null;
    if (lat === 0 && lng === 0) return null;
    const name = typeof vesselSnap.vessel_name === "string" ? vesselSnap.vessel_name : "—";
    const course = parseNum(vesselSnap.course);
    return { lat, lng, course, name };
  }, [vesselSnap]);

  const vesselFromManual: MapVesselPosition | null = useMemo(() => {
    if (vesselFromAis) return null;
    if (!selectedOp) return null;
    const ownLat = parseNum(selectedOp.tracking_manual_lat);
    const ownLng = parseNum(selectedOp.tracking_manual_lng);
    const ownOk =
      ownLat != null &&
      ownLng != null &&
      !(ownLat === 0 && ownLng === 0);
    const inherited = mejorCoordsManualesDelGrupo(results, selectedOp);
    const lat = ownOk ? ownLat! : inherited?.lat ?? null;
    const lng = ownOk ? ownLng! : inherited?.lng ?? null;
    if (lat == null || lng == null) return null;
    if (lat === 0 && lng === 0) return null;
    const name =
      [selectedOp.nave, selectedOp.ref_asli].filter(Boolean).join(" · ") || selectedOp.contenedor || "—";
    return { lat, lng, course: null, name, isManual: true };
  }, [vesselFromAis, selectedOp, results]);

  const vesselOnMap: MapVesselPosition | null = vesselFromAis ?? vesselFromManual;

  const fetchVesselForAis = useCallback(
    async (row: AisSearchRow, silent: boolean) => {
      if (!user) return;
      const mmsi = row.mmsi != null ? String(row.mmsi) : "";
      const imo = row.imo != null ? String(row.imo) : "";
      if (!mmsi && !imo) {
        setVesselError(tr.aisNoIdentifier);
        return;
      }
      const qp = mmsi ? `mmsi=${encodeURIComponent(mmsi)}` : `imo=${encodeURIComponent(imo)}`;
      const ext = extendedAis ? "&response=extended" : "";
      if (!silent) {
        setVesselLoading(true);
        setVesselError(null);
      }
      try {
        const r = await fetch(`${apiPrefix}/api/shiptracking/vessel?${qp}${ext}`, {
          credentials: "same-origin",
        });
        const json = (await r.json()) as { ok: boolean; code?: string; message?: string; data?: Record<string, unknown> };
        if (!json.ok) {
          if (json.code === "UNAUTHORIZED") setVesselError(tr.aisLoginRequired);
          else if (json.code === "NO_CONFIG") setVesselError(tr.aisNotConfigured);
          else if (json.code === "ERR_VESSEL_NOT_FOUND") setVesselError(tr.aisNoPosition);
          else if (json.code === "ERR_RATE_LIMIT") setVesselError(tr.aisRateLimit);
          else if (json.code === "ERR_NO_CREDITS") setVesselError(tr.aisNoCredits);
          else setVesselError(json.message ?? tr.aisError);
          if (!silent) setVesselSnap(null);
          return;
        }
        setVesselSnap(json.data ?? null);
        setLastAisAt(new Date());
        setVesselError(null);
      } catch {
        if (!silent) {
          setVesselError(tr.aisError);
          setVesselSnap(null);
        }
      } finally {
        if (!silent) setVesselLoading(false);
      }
    },
    [apiPrefix, extendedAis, tr, user],
  );

  useEffect(() => {
    if (!selectedAis || !user || !autoRefresh) return;
    const tmr = window.setInterval(() => {
      void fetchVesselForAis(selectedAis, true);
    }, POLL_MS);
    return () => window.clearInterval(tmr);
  }, [selectedAis, user, autoRefresh, fetchVesselForAis]);

  useEffect(() => {
    if (!selectedAis || !user) return;
    void fetchVesselForAis(selectedAis, false);
  }, [extendedAis, selectedAis, user, fetchVesselForAis]);

  const handleSearch = useCallback(async () => {
    const value = termino.trim();
    if (!value) return;

    setLoading(true);
    setError(null);
    setSearched(true);
    setSelectedOpId(null);

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

  const refetchTrackingResults = useCallback(async () => {
    const value = termino.trim();
    if (!value || !supabase) return;
    const { data, error: rpcError } = await supabase.rpc("buscar_tracking", { termino: value });
    if (rpcError) return;
    const list = (data ?? []) as TrackingResult[];
    setResults(list);
    setSelectedOpId((prev) => (prev && list.some((r) => r.id === prev) ? prev : null));
  }, [termino, supabase]);

  const loadFleetManualVessels = useCallback(async () => {
    if (!supabase || !user) {
      setFleetManualVessels([]);
      return;
    }
    const { data, error: rpcError } = await supabase.rpc("listar_tracking_naves_manuales_activas");
    if (rpcError) return;
    const rows = (data ?? []) as FleetManualRpcRow[];
    const next: MapFleetManualVessel[] = [];
    for (const r of rows) {
      const lat = parseNum(r.lat);
      const lng = parseNum(r.lng);
      if (lat == null || lng == null) continue;
      if (lat === 0 && lng === 0) continue;
      const naveT = String(r.nave ?? "").trim();
      if (!naveT) continue;
      const viajT = r.viaje != null ? String(r.viaje).trim() : "";
      const name =
        [naveT, viajT || null].filter(Boolean).join(" · ") || String(r.ref_asli ?? "").trim() || "—";
      next.push({
        markerKey: `${naveT.toLowerCase()}|${viajT.toLowerCase()}`,
        lat,
        lng,
        name,
      });
    }
    setFleetManualVessels(next);
  }, [supabase, user]);

  useEffect(() => {
    void loadFleetManualVessels();
  }, [loadFleetManualVessels]);

  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => {
      void loadFleetManualVessels();
    }, 120_000);
    return () => window.clearInterval(id);
  }, [user, loadFleetManualVessels]);

  const fleetManualMerged = useMemo(() => {
    const fromSearch = clusterManualFleetFromResults(results);
    const merged: MapFleetManualVessel[] = [...fleetManualVessels];
    for (const s of fromSearch) {
      if (!merged.some((m) => fleetCoordsClose(m, s))) {
        merged.push(s);
      }
    }
    return merged;
  }, [fleetManualVessels, results]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") void handleSearch();
    },
    [handleSearch],
  );

  const handlePickAis = useCallback((row: AisSearchRow) => {
    setSelectedAis(row);
    setVesselSnap(null);
    setVesselError(null);
  }, []);

  const runAisSearchByName = useCallback(
    async (rawName: string) => {
      const q = rawName.trim();
      setAisName(q);
      setAisError(null);
      setAisResults([]);
      setAisSearched(false);
      setSelectedAis(null);
      setVesselSnap(null);
      setVesselError(null);

      if (!user) {
        setAisError(tr.aisLoginRequired);
        return;
      }
      if (q.length < 3) {
        setAisError(tr.aisMinChars);
        return;
      }

      setAisLoading(true);
      try {
        const r = await fetch(`${apiPrefix}/api/shiptracking/search?name=${encodeURIComponent(q)}`, {
          credentials: "same-origin",
        });
        const json = (await r.json()) as { ok: boolean; code?: string; message?: string; data?: AisSearchRow[] };
        if (!json.ok) {
          if (json.code === "UNAUTHORIZED") setAisError(tr.aisLoginRequired);
          else if (json.code === "NO_CONFIG") setAisError(tr.aisNotConfigured);
          else if (json.code === "ERR_RATE_LIMIT") setAisError(tr.aisRateLimit);
          else if (json.code === "ERR_NO_CREDITS") setAisError(tr.aisNoCredits);
          else setAisError(json.message ?? tr.aisError);
          return;
        }
        setAisSearched(true);
        const list = Array.isArray(json.data) ? json.data : [];
        setAisResults(list);
        if (list.length === 1) {
          setSelectedAis(list[0]);
          setVesselSnap(null);
          setVesselError(null);
        }
      } catch {
        setAisError(tr.aisError);
      } finally {
        setAisLoading(false);
      }
    },
    [apiPrefix, tr, user],
  );

  const handleAisSearch = useCallback(() => {
    void runAisSearchByName(aisName);
  }, [aisName, runAisSearchByName]);

  const handleQuickAisFromOp = useCallback(
    (nave: string | null) => {
      const n = (nave ?? "").trim();
      if (!n) return;
      void runAisSearchByName(n);
    },
    [runAisSearchByName],
  );

  const saveManualCoords = useCallback(
    async (lat: number, lng: number) => {
      if (!supabase || !selectedOp) return { ok: false as const, message: tr.manualSaveError };
      const ts = new Date().toISOString();
      const naveOk = String(selectedOp.nave ?? "").trim();

      if (naveOk) {
        const { error: rpcErr } = await supabase.rpc("sync_operaciones_tracking_manual", {
          p_nave: selectedOp.nave ?? "",
          p_viaje: selectedOp.viaje ?? "",
          p_lat: lat,
          p_lng: lng,
          p_clear: false,
        });
        if (!rpcErr) {
          await refetchTrackingResults();
          await loadFleetManualVessels();
          return { ok: true as const };
        }
      }

      const { error: upErr } = await supabase
        .from("operaciones")
        .update({
          tracking_manual_lat: lat,
          tracking_manual_lng: lng,
          tracking_manual_updated_at: ts,
        })
        .eq("id", selectedOp.id);
      if (upErr) return { ok: false as const, message: upErr.message };
      await refetchTrackingResults();
      await loadFleetManualVessels();
      return { ok: true as const };
    },
    [selectedOp, supabase, tr.manualSaveError, refetchTrackingResults, loadFleetManualVessels],
  );

  const clearManualCoords = useCallback(async () => {
    if (!supabase || !selectedOp) return { ok: false as const, message: tr.manualSaveError };
    const naveOk = String(selectedOp.nave ?? "").trim();

    if (naveOk) {
      const { error: rpcErr } = await supabase.rpc("sync_operaciones_tracking_manual", {
        p_nave: selectedOp.nave ?? "",
        p_viaje: selectedOp.viaje ?? "",
        p_lat: 0,
        p_lng: 0,
        p_clear: true,
      });
      if (!rpcErr) {
        await refetchTrackingResults();
        await loadFleetManualVessels();
        return { ok: true as const };
      }
    }

    const { error: upErr } = await supabase
      .from("operaciones")
      .update({
        tracking_manual_lat: null,
        tracking_manual_lng: null,
        tracking_manual_updated_at: null,
      })
      .eq("id", selectedOp.id);
    if (upErr) return { ok: false as const, message: upErr.message };
    await refetchTrackingResults();
    await loadFleetManualVessels();
    return { ok: true as const };
  }, [selectedOp, supabase, tr.manualSaveError, refetchTrackingResults, loadFleetManualVessels]);

  const manualModalLabel = selectedOp
    ? [selectedOp.contenedor, selectedOp.ref_asli, selectedOp.nave, selectedOp.viaje].filter(Boolean).join(" · ") ||
      selectedOp.id
    : "";

  const manualGroupHint = useMemo(() => {
    if (!selectedOp) return null;
    return hasNaveForManualGroupSync(selectedOp) ? tr.manualSyncGroup : tr.manualSyncSingle;
  }, [selectedOp, tr.manualSyncGroup, tr.manualSyncSingle]);

  const manualModalInitialCoords = useMemo(() => {
    if (!selectedOp) return { lat: null as number | null, lng: null as number | null };
    const ownLat = parseNum(selectedOp.tracking_manual_lat);
    const ownLng = parseNum(selectedOp.tracking_manual_lng);
    const ownOk =
      ownLat != null && ownLng != null && !(ownLat === 0 && ownLng === 0);
    if (ownOk) return { lat: ownLat, lng: ownLng };
    const inh = mejorCoordsManualesDelGrupo(results, selectedOp);
    return { lat: inh?.lat ?? null, lng: inh?.lng ?? null };
  }, [selectedOp, results]);

  return (
    <main className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative isolate" role="main">
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

      <aside className="relative z-10 flex flex-col w-full lg:w-[min(100%,420px)] lg:max-w-[440px] shrink-0 border-b lg:border-b-0 lg:border-r border-white/10 bg-slate-900/75 backdrop-blur-md min-h-0 max-h-[52dvh] lg:max-h-none">
        <div className="overflow-y-auto flex-1 min-h-0 p-4 sm:p-5 space-y-5">
          <header>
            <h1
              className="text-lg sm:text-xl font-bold text-white tracking-tight"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 2px 12px rgba(0,0,0,0.8)" }}
            >
              {tr.title}
            </h1>
            <p
              className="text-white/85 text-xs sm:text-sm mt-2 leading-relaxed"
              style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 1px 8px rgba(0,0,0,0.7)" }}
            >
              {tr.subtitle}
            </p>
          </header>

          <section className="rounded-2xl border border-white/10 bg-white shadow-mac-modal p-4 space-y-3">
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">{tr.searchLabel}</p>
            <label htmlFor="tracking-search" className="sr-only">
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
                className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-brand-blue text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              />
              <button
                type="button"
                onClick={() => void handleSearch()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-brand-blue text-white text-sm font-medium hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 transition-colors disabled:opacity-60 shrink-0"
              >
                {loading ? (
                  <Icon icon="lucide:loader-2" width={18} height={18} className="animate-spin" aria-hidden />
                ) : (
                  <Icon icon="lucide:search" width={18} height={18} aria-hidden />
                )}
                <span className="hidden sm:inline">{tr.searchButton}</span>
              </button>
            </div>
            <ul className="text-[11px] text-neutral-600 space-y-1">
              <li className="flex gap-2">
                <Icon icon="typcn:media-record" className="text-brand-teal shrink-0 mt-0.5" width={6} height={6} />
                {tr.feature1}
              </li>
              <li className="flex gap-2">
                <Icon icon="typcn:media-record" className="text-brand-teal shrink-0 mt-0.5" width={6} height={6} />
                {tr.feature2}
              </li>
              <li className="flex gap-2">
                <Icon icon="typcn:media-record" className="text-brand-teal shrink-0 mt-0.5" width={6} height={6} />
                {tr.feature3}
              </li>
            </ul>
          </section>

          {error && (
            <div className="p-3 rounded-lg bg-red-950/80 text-red-200 text-sm border border-red-500/30" role="alert">
              {error}
            </div>
          )}

          {searched && !loading && (
            <section className="space-y-2">
              {results.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/95 p-4 text-center text-neutral-600 text-sm">
                  <p className="font-medium">{tr.noResults}</p>
                  <p className="text-xs mt-1">{tr.noResultsHint}</p>
                </div>
              ) : (
                <>
                  <p className="text-white text-xs font-medium" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}>
                    {tr.resultsCount.replace("{{count}}", String(results.length))}
                  </p>
                  <div className="space-y-2 max-h-[40vh] lg:max-h-[min(38vh,320px)] overflow-y-auto pr-1">
                    {results.map((op) => {
                      const active = op.id === selectedOpId;
                      return (
                        <article
                          key={op.id}
                          className={`rounded-xl border overflow-hidden transition-colors cursor-pointer ${
                            active
                              ? "border-brand-blue bg-white ring-2 ring-brand-blue/40"
                              : "border-white/10 bg-white/95 hover:border-neutral-300"
                          }`}
                          onClick={() => setSelectedOpId(op.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedOpId(op.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="p-3 sm:p-3.5">
                            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                                {op.contenedor && <span className="font-semibold text-brand-blue">{op.contenedor}</span>}
                                {op.ref_asli && (
                                  <span className="text-neutral-500 text-xs">
                                    {tr.refAsli}: {op.ref_asli}
                                  </span>
                                )}
                                {opTienePosicionManualVisible(results, op) && (
                                    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border border-violet-300 bg-violet-50 text-violet-800">
                                      {tr.manualCoordsBadge}
                                    </span>
                                  )}
                              </div>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium ${getEstadoStyle(op.estado_operacion)}`}
                              >
                                {op.estado_operacion ?? "—"}
                              </span>
                            </div>
                            <div className="text-xs text-neutral-600 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <Icon icon="lucide:ship" width={14} height={14} className="text-brand-blue shrink-0" />
                                <span>
                                  {op.naviera ?? "—"}
                                  {op.nave ? ` · ${op.nave}` : ""}
                                </span>
                              </div>
                              {op.viaje?.trim() ? (
                                <div className="flex items-center gap-1.5 text-neutral-500">
                                  <Icon icon="lucide:compass" width={14} height={14} className="text-brand-blue shrink-0" />
                                  <span>
                                    {tr.colViaje}: {op.viaje}
                                  </span>
                                </div>
                              ) : null}
                              <div className="flex items-center gap-1.5">
                                <Icon icon="lucide:map-pin" width={14} height={14} className="text-brand-blue shrink-0" />
                                <span>
                                  {op.pol ?? "—"} → {op.pod ?? "—"}
                                </span>
                              </div>
                            </div>
                            {user && op.nave?.trim() && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickAisFromOp(op.nave);
                                }}
                                className="mt-2 text-[11px] font-semibold text-brand-blue hover:underline"
                              >
                                {tr.aisFromOperation}
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          )}

          {canSetManualCoords && selectedOp && results.length > 0 && (
            <section
              className="rounded-xl border border-violet-500/40 bg-violet-950/35 p-3 space-y-2"
              aria-label={tr.manualCoordsBtn}
            >
              <p className="text-[11px] text-violet-100/90 leading-snug">{tr.manualSidebarHint}</p>
              <button
                type="button"
                onClick={() => setManualModalOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400/50"
              >
                <Icon icon="lucide:crosshair" width={16} height={16} aria-hidden />
                {tr.manualCoordsBtn}
              </button>
            </section>
          )}

          <section className="rounded-2xl border border-cyan-500/25 bg-slate-950/40 p-4 space-y-3">
            <div className="flex items-center gap-2 text-white">
              <Icon icon="lucide:radar" width={20} height={20} className="text-cyan-300" aria-hidden />
              <h2 className="text-sm font-bold">{tr.aisSectionTitle}</h2>
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed">{tr.aisSectionHint}</p>

            {!user ? (
              <p className="text-xs text-amber-200/90">{tr.aisLoginRequired}</p>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aisName}
                      onChange={(e) => setAisName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void handleAisSearch()}
                      placeholder={tr.aisVesselPlaceholder}
                      className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-white/15 bg-white/10 text-white text-sm placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                    />
                    <button
                      type="button"
                      onClick={() => void handleAisSearch()}
                      disabled={aisLoading}
                      className="px-3 py-2 rounded-lg bg-cyan-600 text-white text-sm font-semibold hover:bg-cyan-500 disabled:opacity-50 shrink-0"
                    >
                      {aisLoading ? "…" : tr.aisSearchBtn}
                    </button>
                  </div>
                  <label className="flex items-center gap-2 text-[11px] text-white/55 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={extendedAis}
                      onChange={(e) => setExtendedAis(e.target.checked)}
                      className="rounded border-white/30"
                    />
                    {tr.aisExtended}
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-white/55 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="rounded border-white/30"
                    />
                    {tr.aisAutoRefresh.replace("{{seconds}}", String(POLL_MS / 1000))}
                  </label>
                </div>

                {aisError && (
                  <p className="text-xs text-amber-200" role="alert">
                    {aisError}
                  </p>
                )}

                {aisSearched && aisResults.length > 0 && (
                  <div className="max-h-36 overflow-y-auto rounded-lg border border-white/10 divide-y divide-white/10">
                    {aisResults.map((row) => {
                      const on = selectedAis?.mmsi === row.mmsi && String(selectedAis?.imo ?? "") === String(row.imo ?? "");
                      return (
                        <button
                          key={`${row.mmsi}-${row.imo ?? "x"}`}
                          type="button"
                          onClick={() => handlePickAis(row)}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                            on ? "bg-cyan-500/20 text-white" : "text-white/80 hover:bg-white/5"
                          }`}
                        >
                          <span className="font-semibold block">{row.vessel_name}</span>
                          <span className="text-white/45">
                            MMSI {row.mmsi}
                            {row.imo != null ? ` · IMO ${row.imo}` : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {aisSearched && aisResults.length === 0 && !aisError && (
                  <p className="text-xs text-white/40">{tr.aisNoVessels}</p>
                )}

                {selectedAis && (
                  <div className="rounded-lg bg-black/25 border border-white/10 p-3 text-xs text-white/85 space-y-1">
                    <p className="font-semibold text-white flex items-center gap-2">
                      <Icon icon="lucide:ship" width={16} height={16} />
                      {selectedAis.vessel_name}
                    </p>
                    {vesselLoading && <p className="text-white/50">{tr.aisLoadingPosition}</p>}
                    {vesselError && <p className="text-amber-200">{vesselError}</p>}
                    {!vesselLoading && vesselSnap && !vesselError && (
                      <>
                        <p>
                          {tr.aisSpeed}: {parseNum(vesselSnap.speed) ?? "—"} kn · {tr.aisCourse}:{" "}
                          {parseNum(vesselSnap.course) ?? "—"}°
                        </p>
                        <p className="text-white/60">
                          {tr.aisSignal}: {typeof vesselSnap.received === "string" ? vesselSnap.received : "—"}
                        </p>
                        {typeof vesselSnap.destination === "string" && vesselSnap.destination && (
                          <p>
                            {tr.aisDestination}: {vesselSnap.destination}
                          </p>
                        )}
                        {lastAisAt && (
                          <p className="text-[10px] text-white/40">
                            {tr.aisLastPoll}: {lastAisAt.toLocaleTimeString(locale === "es" ? "es-CL" : "en-US")}
                          </p>
                        )}
                      </>
                    )}
                    {linkedOps.length > 0 && (
                      <p className="text-cyan-200/90 pt-1 border-t border-white/10 mt-2">
                        {tr.aisLinkedOps.replace("{{count}}", String(linkedOps.length))}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </aside>

      <div className="relative z-10 flex-1 min-h-[min(420px,55dvh)] lg:min-h-0 flex flex-col border-t lg:border-t-0 border-white/10 bg-neutral-100">
        <div className="absolute top-2 left-2 z-[5] pointer-events-none max-w-[min(100%,320px)]">
          <p className="text-[10px] font-medium text-neutral-600 bg-white/90 px-2 py-1 rounded border border-neutral-200 shadow-sm leading-snug">
            {tr.mapLegendPolPod}
          </p>
        </div>
        {canSetManualCoords && selectedOp && (
          <div className="absolute top-2 right-2 z-[5]">
            <button
              type="button"
              onClick={() => setManualModalOpen(true)}
              className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/95 border border-neutral-200 shadow-sm text-xs font-semibold text-violet-800 hover:bg-violet-50 transition-colors"
            >
              <Icon icon="lucide:crosshair" width={16} height={16} aria-hidden />
              {tr.manualCoordsBtn}
            </button>
          </div>
        )}
        <ManualTrackingCoordsModal
          open={manualModalOpen}
          onClose={() => setManualModalOpen(false)}
          initialLat={manualModalInitialCoords.lat}
          initialLng={manualModalInitialCoords.lng}
          vesselLabel={manualModalLabel}
          groupHint={manualGroupHint}
          tr={tr}
          onSave={(lat, lng) => saveManualCoords(lat, lng)}
          onClear={() => clearManualCoords()}
        />
        <TrackingMapView
          vessel={vesselOnMap}
          fleetManualVessels={fleetManualMerged}
          pol={polMarker}
          pod={podMarker}
          emptyHint={tr.mapLoading}
          webglFallback={tr.mapWebGLFallback}
        />
      </div>
    </main>
  );
}
