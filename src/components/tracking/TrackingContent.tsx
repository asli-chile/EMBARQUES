import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthContext";
import { useState, useCallback, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  TrackingMapView,
  type MapFleetManualVessel,
  type MapMarkerPort,
  type MapVesselPosition,
} from "@/components/tracking/TrackingMapView";
import { ManualTrackingCoordsModal } from "@/components/tracking/ManualTrackingCoordsModal";
import { getApiOriginPrefix } from "@/lib/basePath";
import { getPortCoordinates } from "@/lib/ports-coordinates";
import { useNeonTheme } from "@/lib/ui/neonTheme";
import {
  applyOperacionesClienteFilter,
  shouldSkipOperacionesForCliente,
} from "@/lib/auth/operacionesClienteScope";
import {
  ESTADO_META,
  esEstadoCerrado,
  etiquetaEstado,
  normalizarEstado,
  type GrupoEstado,
} from "@/lib/operaciones/estados";

const TRACKING_OP_SELECT =
  "id, correlativo, estado_operacion, cliente, contenedor, booking, ref_asli, tipo_unidad, especie, naviera, nave, viaje, pol, etd, pod, eta, tt, tracking_manual_lat, tracking_manual_lng, tracking_manual_updated_at";

function sanitizeTrackingTerm(raw: string): string {
  return raw.replace(/[%_,.()]/g, " ").replace(/\s+/g, " ").trim();
}

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

const estadoColors: Record<GrupoEstado, string> = {
  COMERCIAL: "bg-amber-400/15 text-dash-fg border-amber-400/35",
  COORDINACION: "bg-sky-400/15 text-dash-fg border-sky-400/35",
  TRANSITO: "bg-violet-400/15 text-dash-fg border-violet-400/35",
  DOCUMENTAL: "bg-emerald-400/15 text-dash-fg border-emerald-400/35",
  CIERRE: "bg-dash-control text-dash-muted border-dash-border",
  EXCEPCION: "bg-red-400/15 text-dash-fg border-red-400/35",
};

function getEstadoStyle(estado: string | null): string {
  const codigo = normalizarEstado(estado);
  if (!codigo) return "bg-dash-control text-dash-muted border-dash-border";
  return estadoColors[ESTADO_META[codigo].grupo];
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
  return !esEstadoCerrado(estado);
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
    out.push({
      markerKey,
      lat,
      lng,
      name,
      nave: naveT,
      viaje: viajT || null,
    });
  }
  return out;
}

const POLL_MS = 45_000;

export function TrackingContent() {
  const { t, locale } = useLocale();
  const tr = t.trackingPage;
  const { user, profile, isStaff, isCliente, isEjecutivo, empresaNombres, viewAs } = useAuth();
  const [theme] = useNeonTheme();

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const apiPrefix = useMemo(() => getApiOriginPrefix(), []);

  /** Cliente/ejecutivo (incl. «Ver como»): solo ops de sus empresas. RLS no alcanza porque el JWT sigue siendo superadmin. */
  const scopeToAssignedEmpresas = isCliente || isEjecutivo;
  const canFreeAisSearch = Boolean(user && isStaff && !isCliente);
  const empresasKey = useMemo(() => empresaNombres.join("\0"), [empresaNombres]);
  const viewAsKey = viewAs ? `${viewAs.rol}:${viewAs.usuarioId}` : "";

  const filterScopedResults = useCallback(
    (list: TrackingResult[]) => {
      if (!scopeToAssignedEmpresas) return list;
      if (!empresaNombres.length) return [];
      const allowed = new Set(empresaNombres.map((n) => n.trim().toUpperCase()));
      return list.filter((r) => {
        const c = (r.cliente ?? "").trim().toUpperCase();
        return c !== "" && allowed.has(c);
      });
    },
    [scopeToAssignedEmpresas, empresaNombres],
  );

  /** Búsqueda acotada por empresas (view-as / cliente / ejecutivo). */
  const searchScopedOperaciones = useCallback(
    async (value: string): Promise<{ list: TrackingResult[]; error: string | null }> => {
      if (!supabase) return { list: [], error: tr.supabaseError };
      if (
        shouldSkipOperacionesForCliente({
          isCliente,
          isEjecutivo,
          empresaNombres,
        })
      ) {
        return { list: [], error: null };
      }

      const safe = sanitizeTrackingTerm(value);
      if (!safe) return { list: [], error: null };

      let q = supabase
        .from("operaciones")
        .select(TRACKING_OP_SELECT)
        .is("deleted_at", null)
        .order("etd", { ascending: false, nullsFirst: false })
        .limit(40);

      q = applyOperacionesClienteFilter(q, {
        isCliente,
        isEjecutivo,
        empresaNombres,
      });

      const orParts = [
        `contenedor.ilike.%${safe}%`,
        `booking.ilike.%${safe}%`,
        `ref_asli.ilike.%${safe}%`,
        `nave.ilike.%${safe}%`,
      ];
      if (/^\d+$/.test(safe)) orParts.push(`correlativo.eq.${safe}`);
      q = q.or(orParts.join(","));

      const { data, error: qErr } = await q;
      if (qErr) return { list: [], error: qErr.message };
      return { list: filterScopedResults((data ?? []) as TrackingResult[]), error: null };
    },
    [
      supabase,
      tr.supabaseError,
      isCliente,
      isEjecutivo,
      empresaNombres,
      filterScopedResults,
    ],
  );

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
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [cargoVessel, setCargoVessel] = useState<MapFleetManualVessel | null>(null);
  const [cargoOps, setCargoOps] = useState<TrackingResult[]>([]);
  const [cargoLoading, setCargoLoading] = useState(false);
  const [cargoError, setCargoError] = useState<string | null>(null);

  const canSetManualCoords = Boolean(user && profile && isStaff);

  const selectedOp = useMemo(
    () => results.find((r) => r.id === selectedOpId) ?? null,
    [results, selectedOpId],
  );

  /** Op para POL/POD: la seleccionada, o la única del resultado si aún no hay click. */
  const portSourceOp = useMemo(() => {
    if (selectedOp) return selectedOp;
    if (results.length === 1) return results[0];
    return null;
  }, [selectedOp, results]);

  const linkedOps = useMemo(() => {
    if (!selectedAis) return [];
    return results.filter((op) => namesMatchForAis(op.nave, selectedAis.vessel_name));
  }, [results, selectedAis]);

  const polMarker: MapMarkerPort | null = useMemo(() => {
    const name = portSourceOp?.pol;
    if (!name?.trim()) return null;
    const c = getPortCoordinates(name);
    if (!c) return null;
    return { lng: c[0], lat: c[1], label: `POL · ${name}`, variant: "pol" };
  }, [portSourceOp?.pol]);

  const podMarker: MapMarkerPort | null = useMemo(() => {
    const name = portSourceOp?.pod;
    if (!name?.trim()) return null;
    const c = getPortCoordinates(name);
    if (!c) return null;
    return { lng: c[0], lat: c[1], label: `POD · ${name}`, variant: "pod" };
  }, [portSourceOp?.pod]);

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

    if (scopeToAssignedEmpresas) {
      const { list, error: scopedErr } = await searchScopedOperaciones(value);
      setLoading(false);
      if (scopedErr) {
        setError(scopedErr);
        setResults([]);
        return;
      }
      setResults(list);
      if (list.length === 1) setSelectedOpId(list[0].id);
      return;
    }

    const { data, error: rpcError } = await supabase.rpc("buscar_tracking", { termino: value });
    setLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      setResults([]);
      return;
    }

    const list = filterScopedResults((data ?? []) as TrackingResult[]);
    setResults(list);
    if (list.length === 1) setSelectedOpId(list[0].id);
  }, [
    termino,
    supabase,
    tr.supabaseError,
    filterScopedResults,
    scopeToAssignedEmpresas,
    searchScopedOperaciones,
  ]);

  const refetchTrackingResults = useCallback(async () => {
    const value = termino.trim();
    if (!value || !supabase) return;

    if (scopeToAssignedEmpresas) {
      const { list } = await searchScopedOperaciones(value);
      setResults(list);
      setSelectedOpId((prev) => (prev && list.some((r) => r.id === prev) ? prev : null));
      return;
    }

    const { data, error: rpcError } = await supabase.rpc("buscar_tracking", { termino: value });
    if (rpcError) return;
    const list = filterScopedResults((data ?? []) as TrackingResult[]);
    setResults(list);
    setSelectedOpId((prev) => (prev && list.some((r) => r.id === prev) ? prev : null));
  }, [termino, supabase, filterScopedResults, scopeToAssignedEmpresas, searchScopedOperaciones]);

  const loadFleetManualVessels = useCallback(async () => {
    if (!supabase || !user) {
      setFleetManualVessels([]);
      return;
    }

    // «Ver como» cliente/ejecutivo: el JWT sigue siendo superadmin → la RPC devolvería toda la flota.
    if (scopeToAssignedEmpresas) {
      if (
        shouldSkipOperacionesForCliente({
          isCliente,
          isEjecutivo,
          empresaNombres,
        })
      ) {
        setFleetManualVessels([]);
        return;
      }

      let q = supabase
        .from("operaciones")
        .select(TRACKING_OP_SELECT)
        .is("deleted_at", null)
        .not("tracking_manual_lat", "is", null)
        .not("tracking_manual_lng", "is", null)
        .limit(400);

      q = applyOperacionesClienteFilter(q, {
        isCliente,
        isEjecutivo,
        empresaNombres,
      });

      const { data, error: qErr } = await q;
      if (qErr) return;
      const ops = filterScopedResults((data ?? []) as TrackingResult[]);
      setFleetManualVessels(clusterManualFleetFromResults(ops));
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
        nave: naveT,
        viaje: viajT || null,
      });
    }
    setFleetManualVessels(next);
  }, [
    supabase,
    user,
    scopeToAssignedEmpresas,
    isCliente,
    isEjecutivo,
    empresaNombres,
    filterScopedResults,
  ]);

  useEffect(() => {
    setResults([]);
    setSelectedOpId(null);
    setSelectedAis(null);
    setVesselSnap(null);
    setTermino("");
    setSearched(false);
    setError(null);
    setCargoVessel(null);
    setCargoOps([]);
    setCargoError(null);
  }, [viewAsKey, empresasKey]);

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

  const handleFleetVesselClick = useCallback(
    async (fv: MapFleetManualVessel) => {
      setCargoVessel(fv);
      setCargoError(null);
      setCargoOps([]);
      setMobileView((v) => (v === "list" ? "map" : v));

      if (!user) {
        setCargoError(tr.vesselCargoLogin);
        return;
      }
      if (!supabase) {
        setCargoError(tr.supabaseError);
        return;
      }
      if (
        scopeToAssignedEmpresas &&
        shouldSkipOperacionesForCliente({ isCliente, isEjecutivo, empresaNombres })
      ) {
        setCargoError(tr.vesselCargoEmpty);
        return;
      }

      setCargoLoading(true);
      try {
        const naveNeedle = sanitizeTrackingTerm(fv.nave);
        if (!naveNeedle) {
          setCargoError(tr.vesselCargoEmpty);
          return;
        }

        let q = supabase
          .from("operaciones")
          .select(TRACKING_OP_SELECT)
          .is("deleted_at", null)
          .ilike("nave", `%${naveNeedle}%`)
          .order("eta", { ascending: true, nullsFirst: false })
          .limit(80);

        if (scopeToAssignedEmpresas) {
          q = applyOperacionesClienteFilter(q, {
            isCliente,
            isEjecutivo,
            empresaNombres,
          });
        }

        const { data, error: qErr } = await q;
        if (qErr) {
          setCargoError(qErr.message);
          return;
        }

        const seed: Pick<TrackingResult, "nave" | "viaje"> = {
          nave: fv.nave,
          viaje: fv.viaje,
        };
        const matched = filterScopedResults((data ?? []) as TrackingResult[]).filter(
          (op) =>
            isOperacionActivaEnMapa(op.estado_operacion) &&
            mismoGrupoTrackingManual(seed, op),
        );

        setCargoOps(matched);
        setResults(matched);
        setSearched(true);
        setSelectedOpId(matched[0]?.id ?? null);
        if (matched.length === 0) setCargoError(tr.vesselCargoEmpty);
      } finally {
        setCargoLoading(false);
      }
    },
    [
      user,
      supabase,
      tr.vesselCargoLogin,
      tr.supabaseError,
      tr.vesselCargoEmpty,
      scopeToAssignedEmpresas,
      isCliente,
      isEjecutivo,
      empresaNombres,
      filterScopedResults,
    ],
  );

  const closeCargoPanel = useCallback(() => {
    setCargoVessel(null);
    setCargoOps([]);
    setCargoError(null);
  }, []);

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

  const hasMapFocus = Boolean(selectedOpId || vesselOnMap || fleetManualMerged.length > 0);

  return (
    <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
      <main className="dash-page relative flex min-h-0 flex-1 flex-col overflow-hidden" role="main">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -right-16 top-10 h-72 w-72 rounded-full bg-dash-neon/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-dash-neon-hot/15 blur-3xl" />
        </div>

        <div className="dash-toolbar relative z-10 shrink-0">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dash-neon/40 bg-dash-neon/15 shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--dash-neon)_55%,transparent)]">
                <Icon icon="lucide:satellite-dish" width={22} height={22} className="text-dash-neon" aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold tracking-tight text-dash-fg sm:text-xl">{tr.title}</h1>
                <p className="mt-0.5 line-clamp-1 text-xs text-dash-muted sm:text-sm">{tr.subtitle}</p>
              </div>
            </div>
            <div className="flex shrink-0 rounded-xl border border-dash-border bg-dash-control/80 p-0.5 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileView("list")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold motion-interactive focus:outline-none focus:ring-2 focus:ring-dash-neon/40 ${
                  mobileView === "list"
                    ? "bg-dash-neon/25 text-dash-fg border border-dash-neon/40"
                    : "border border-transparent text-dash-muted hover:text-dash-fg"
                }`}
              >
                Lista
              </button>
              <button
                type="button"
                onClick={() => setMobileView("map")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold motion-interactive focus:outline-none focus:ring-2 focus:ring-dash-neon/40 ${
                  mobileView === "map"
                    ? "bg-dash-neon/25 text-dash-fg border border-dash-neon/40"
                    : "border border-transparent text-dash-muted hover:text-dash-fg"
                }`}
              >
                Mapa
              </button>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-2.5">
          <div className="flex h-full min-h-0 w-full flex-col gap-2 lg:flex-row">
            <div
              className={`dash-card flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl transition-all duration-300 ease-out ${
                mobileView === "map" ? "hidden lg:flex" : "flex"
              } lg:w-[min(100%,400px)] lg:shrink-0 xl:w-[420px]`}
            >
              <div className="dash-section-head shrink-0 space-y-3 px-3 py-3">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:search" width={18} height={18} className="shrink-0 text-dash-neon" aria-hidden />
                  <p className="text-sm font-bold text-dash-fg">{tr.searchLabel}</p>
                </div>
                <div className="flex gap-2">
                  <label htmlFor="tracking-search" className="sr-only">
                    {tr.searchLabel}
                  </label>
                  <input
                    id="tracking-search"
                    type="text"
                    value={termino}
                    onChange={(e) => setTermino(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={tr.searchPlaceholder}
                    className="dash-control min-w-0 flex-1 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dash-neon/40"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSearch()}
                    disabled={loading}
                    className="dash-cta inline-flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-sm disabled:opacity-60"
                  >
                    {loading ? (
                      <Icon icon="lucide:loader-2" width={18} height={18} className="animate-spin" aria-hidden />
                    ) : (
                      <Icon icon="lucide:search" width={18} height={18} aria-hidden />
                    )}
                    <span className="hidden sm:inline">{tr.searchButton}</span>
                  </button>
                </div>
                <ul className="grid gap-1.5">
                  {[tr.feature1, tr.feature2, tr.feature3].map((feat) => (
                    <li key={feat} className="flex gap-2 text-[11px] leading-snug text-dash-muted">
                      <Icon icon="lucide:check" width={14} height={14} className="mt-0.5 shrink-0 text-dash-neon" aria-hidden />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {error && (
                  <div
                    className="mx-3 mt-3 flex items-start gap-2 rounded-lg border border-red-400/35 bg-red-500/15 p-3 text-sm text-dash-fg"
                    role="alert"
                  >
                    <Icon icon="lucide:alert-circle" width={16} height={16} className="mt-0.5 shrink-0 text-red-300" aria-hidden />
                    {error}
                  </div>
                )}

                {searched && !loading && (
                  <section className="space-y-2 p-3">
                    {results.length === 0 ? (
                      <div className="rounded-xl border border-dash-border bg-dash-control/60 p-5 text-center">
                        <Icon
                          icon="lucide:package-search"
                          width={28}
                          height={28}
                          className="mx-auto mb-2 text-dash-neon/50"
                          aria-hidden
                        />
                        <p className="text-sm font-semibold text-dash-fg">{tr.noResults}</p>
                        <p className="mt-1 text-xs text-dash-muted">{tr.noResultsHint}</p>
                      </div>
                    ) : (
                      <>
                        <p className="px-0.5 text-xs font-bold uppercase tracking-wide text-dash-neon">
                          {tr.resultsCount.replace("{{count}}", String(results.length))}
                        </p>
                        <div className="space-y-2">
                          {results.map((op) => {
                            const active = op.id === selectedOpId;
                            return (
                              <article
                                key={op.id}
                                className={`cursor-pointer overflow-hidden rounded-xl border transition-all motion-interactive ${
                                  active
                                    ? "border-dash-neon/55 bg-dash-neon/10 ring-2 ring-dash-neon/25"
                                    : "border-dash-border bg-dash-control/50 hover:border-dash-neon/35 hover:bg-dash-control"
                                }`}
                                onClick={() => {
                                  setSelectedOpId(op.id);
                                  setMobileView("map");
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setSelectedOpId(op.id);
                                    setMobileView("map");
                                  }
                                }}
                                role="button"
                                tabIndex={0}
                              >
                                <div className="p-3">
                                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                                    <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
                                      {op.contenedor && (
                                        <span className="font-bold text-dash-neon">{op.contenedor}</span>
                                      )}
                                      {op.ref_asli && (
                                        <span className="truncate text-xs text-dash-muted">
                                          {tr.refAsli}: {op.ref_asli}
                                        </span>
                                      )}
                                      {opTienePosicionManualVisible(results, op) && (
                                        <span className="rounded border border-violet-400/40 bg-violet-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-dash-fg">
                                          {tr.manualCoordsBadge}
                                        </span>
                                      )}
                                    </div>
                                    <span
                                      className={`inline-flex shrink-0 items-center rounded border px-2 py-0.5 text-[10px] font-semibold ${getEstadoStyle(op.estado_operacion)}`}
                                    >
                                      {etiquetaEstado(op.estado_operacion) || "—"}
                                    </span>
                                  </div>
                                  <div className="space-y-1.5 text-xs text-dash-muted">
                                    <div className="flex items-center gap-1.5">
                                      <Icon icon="lucide:ship" width={14} height={14} className="shrink-0 text-dash-neon" aria-hidden />
                                      <span className="truncate text-dash-fg/90">
                                        {op.naviera ?? "—"}
                                        {op.nave ? ` · ${op.nave}` : ""}
                                      </span>
                                    </div>
                                    {op.viaje?.trim() ? (
                                      <div className="flex items-center gap-1.5">
                                        <Icon
                                          icon="lucide:compass"
                                          width={14}
                                          height={14}
                                          className="shrink-0 text-dash-neon"
                                          aria-hidden
                                        />
                                        <span>
                                          {tr.colViaje}: {op.viaje}
                                        </span>
                                      </div>
                                    ) : null}
                                    <div className="flex items-center gap-1.5">
                                      <Icon icon="lucide:map-pin" width={14} height={14} className="shrink-0 text-dash-neon" aria-hidden />
                                      <span className="truncate">
                                        {op.pol ?? "—"} → {op.pod ?? "—"}
                                      </span>
                                    </div>
                                    {(op.etd || op.eta) && (
                                      <div className="flex flex-wrap gap-2 pt-0.5">
                                        {op.etd && (
                                          <span className="inline-flex items-center gap-1 rounded-md border border-dash-border bg-dash-control px-2 py-0.5 font-mono text-[10px] text-dash-fg">
                                            ETD {formatDate(op.etd, locale)}
                                          </span>
                                        )}
                                        {op.eta && (
                                          <span className="inline-flex items-center gap-1 rounded-md border border-dash-border bg-dash-control px-2 py-0.5 font-mono text-[10px] text-dash-fg">
                                            ETA {formatDate(op.eta, locale)}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  {user && op.nave?.trim() && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuickAisFromOp(op.nave);
                                      }}
                                      className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-dash-neon hover:underline"
                                    >
                                      <Icon icon="lucide:radar" width={12} height={12} aria-hidden />
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
                    className="mx-3 mb-3 space-y-2 rounded-xl border border-violet-400/35 bg-violet-500/10 p-3"
                    aria-label={tr.manualCoordsBtn}
                  >
                    <p className="flex items-start gap-1.5 text-[11px] leading-snug text-dash-muted">
                      <Icon icon="lucide:crosshair" width={14} height={14} className="mt-0.5 shrink-0 text-violet-300" aria-hidden />
                      {tr.manualSidebarHint}
                    </p>
                    <button
                      type="button"
                      onClick={() => setManualModalOpen(true)}
                      className="dash-cta inline-flex w-full items-center justify-center gap-2 px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-dash-neon/40"
                    >
                      <Icon icon="lucide:crosshair" width={16} height={16} aria-hidden />
                      {tr.manualCoordsBtn}
                    </button>
                  </section>
                )}

                <section className="border-t border-dash-border">
                  <div className="dash-section-head flex items-center gap-2 px-3 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-dash-neon/35 bg-dash-neon/15">
                      <Icon icon="lucide:radar" width={16} height={16} className="text-dash-neon" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold text-dash-fg">{tr.aisSectionTitle}</h2>
                      <p className="line-clamp-2 text-[10px] leading-snug text-dash-muted">{tr.aisSectionHint}</p>
                    </div>
                  </div>

                  <div className="space-y-3 p-3">
                    {!user ? (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-400/35 bg-amber-500/15 px-3 py-2.5 text-xs text-dash-fg">
                        <Icon icon="lucide:lock" width={14} height={14} className="mt-0.5 shrink-0 text-amber-300" aria-hidden />
                        {tr.aisLoginRequired}
                      </div>
                    ) : !canFreeAisSearch ? (
                      <div className="flex items-start gap-2 rounded-lg border border-dash-border bg-dash-control/60 px-3 py-2.5 text-xs text-dash-muted">
                        <Icon icon="lucide:ship" width={14} height={14} className="mt-0.5 shrink-0 text-dash-neon" aria-hidden />
                        {tr.aisClientOnlyOwnHint}
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={aisName}
                            onChange={(e) => setAisName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && void handleAisSearch()}
                            placeholder={tr.aisVesselPlaceholder}
                            className="dash-control min-w-0 flex-1 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dash-neon/40"
                          />
                          <button
                            type="button"
                            onClick={() => void handleAisSearch()}
                            disabled={aisLoading}
                            className="dash-cta shrink-0 px-3 py-2 text-sm disabled:opacity-50"
                          >
                            {aisLoading ? "…" : tr.aisSearchBtn}
                          </button>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="flex cursor-pointer select-none items-center gap-2 text-[11px] text-dash-muted">
                            <input
                              type="checkbox"
                              checked={extendedAis}
                              onChange={(e) => setExtendedAis(e.target.checked)}
                              className="rounded border-dash-border text-dash-neon focus:ring-dash-neon/30"
                            />
                            {tr.aisExtended}
                          </label>
                          <label className="flex cursor-pointer select-none items-center gap-2 text-[11px] text-dash-muted">
                            <input
                              type="checkbox"
                              checked={autoRefresh}
                              onChange={(e) => setAutoRefresh(e.target.checked)}
                              className="rounded border-dash-border text-dash-neon focus:ring-dash-neon/30"
                            />
                            {tr.aisAutoRefresh.replace("{{seconds}}", String(POLL_MS / 1000))}
                          </label>
                        </div>

                        {aisError && (
                          <p className="flex items-start gap-1.5 text-xs text-red-300" role="alert">
                            <Icon icon="lucide:alert-circle" width={14} height={14} className="shrink-0" aria-hidden />
                            {aisError}
                          </p>
                        )}

                        {aisSearched && aisResults.length > 0 && (
                          <div className="max-h-36 divide-y divide-dash-border overflow-y-auto rounded-lg border border-dash-border">
                            {aisResults.map((row) => {
                              const on =
                                selectedAis?.mmsi === row.mmsi &&
                                String(selectedAis?.imo ?? "") === String(row.imo ?? "");
                              return (
                                <button
                                  key={`${row.mmsi}-${row.imo ?? "x"}`}
                                  type="button"
                                  onClick={() => handlePickAis(row)}
                                  className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                                    on
                                      ? "bg-dash-neon/20 font-semibold text-dash-fg"
                                      : "text-dash-muted hover:bg-dash-control hover:text-dash-fg"
                                  }`}
                                >
                                  <span className="block truncate">{row.vessel_name}</span>
                                  <span className="font-normal text-dash-muted/80">
                                    MMSI {row.mmsi}
                                    {row.imo != null ? ` · IMO ${row.imo}` : ""}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {aisSearched && aisResults.length === 0 && !aisError && (
                          <p className="text-xs text-dash-muted">{tr.aisNoVessels}</p>
                        )}
                      </>
                    )}

                    {user && selectedAis && (
                          <div className="space-y-1.5 rounded-xl border border-dash-border bg-dash-control/70 p-3 text-xs text-dash-muted">
                            <p className="flex items-center gap-2 font-bold text-dash-fg">
                              <Icon icon="lucide:ship" width={16} height={16} className="text-dash-neon" aria-hidden />
                              <span className="truncate">{selectedAis.vessel_name}</span>
                            </p>
                            {vesselLoading && <p>{tr.aisLoadingPosition}</p>}
                            {vesselError && (
                              <p className="flex items-start gap-1.5 text-red-300">
                                <Icon icon="lucide:alert-circle" width={14} height={14} className="shrink-0" aria-hidden />
                                {vesselError}
                              </p>
                            )}
                            {!vesselLoading && vesselSnap && !vesselError && (
                              <>
                                <p className="text-dash-fg/90">
                                  {tr.aisSpeed}: {parseNum(vesselSnap.speed) ?? "—"} kn · {tr.aisCourse}:{" "}
                                  {parseNum(vesselSnap.course) ?? "—"}°
                                </p>
                                <p>
                                  {tr.aisSignal}:{" "}
                                  {typeof vesselSnap.received === "string" ? vesselSnap.received : "—"}
                                </p>
                                {typeof vesselSnap.destination === "string" && vesselSnap.destination && (
                                  <p>
                                    {tr.aisDestination}: {vesselSnap.destination}
                                  </p>
                                )}
                                {lastAisAt && (
                                  <p className="text-[10px] text-dash-muted/80">
                                    {tr.aisLastPoll}:{" "}
                                    {lastAisAt.toLocaleTimeString(locale === "es" ? "es-CL" : "en-US")}
                                  </p>
                                )}
                              </>
                            )}
                            {linkedOps.length > 0 && (
                              <p className="mt-2 border-t border-dash-border pt-1.5 font-medium text-dash-neon">
                                {tr.aisLinkedOps.replace("{{count}}", String(linkedOps.length))}
                              </p>
                            )}
                          </div>
                        )}
                  </div>
                </section>
              </div>
            </div>

            <div
              className={`dash-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl ${
                mobileView === "list" ? "hidden lg:flex" : "flex"
              }`}
            >
              <div className="dash-section-head flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setMobileView("list")}
                  className="inline-flex items-center gap-0.5 text-xs font-semibold text-dash-neon transition-colors hover:text-dash-fg lg:hidden"
                >
                  <Icon icon="lucide:chevron-left" width={14} height={14} aria-hidden />
                  Lista
                </button>

                {selectedOp ? (
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-dash-control px-2.5 py-1 text-[11px]">
                      <Icon icon="lucide:container" width={12} height={12} className="shrink-0 text-dash-neon" aria-hidden />
                      <span className="font-bold text-dash-fg">
                        {selectedOp.contenedor || selectedOp.ref_asli || "—"}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1 text-[11px] text-dash-fg">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
                      POL {selectedOp.pol ?? "—"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/35 bg-amber-500/15 px-2.5 py-1 text-[11px] text-dash-fg">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden />
                      POD {selectedOp.pod ?? "—"}
                    </span>
                    {selectedOp.nave && (
                      <span className="hidden truncate text-[11px] text-dash-muted sm:inline">
                        {selectedOp.nave}
                        {selectedOp.viaje ? ` · ${selectedOp.viaje}` : ""}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="min-w-0 flex-1 text-[11px] leading-snug text-dash-muted">
                    {hasMapFocus ? tr.mapLegendPolPod : tr.searchLabel}
                  </p>
                )}

                {canSetManualCoords && selectedOp && (
                  <button
                    type="button"
                    onClick={() => setManualModalOpen(true)}
                    className="dash-control inline-flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs font-semibold"
                  >
                    <Icon icon="lucide:crosshair" width={14} height={14} aria-hidden />
                    {tr.manualCoordsBtn}
                  </button>
                )}
              </div>

              <div className="relative min-h-[min(420px,55dvh)] flex-1 overflow-hidden lg:min-h-0">
                <div className="pointer-events-none absolute bottom-3 left-3 z-[5] hidden max-w-[min(100%,280px)] sm:block">
                  <p className="rounded-lg border border-dash-border bg-dash-control/95 px-2.5 py-1.5 text-[10px] font-medium leading-snug text-dash-muted shadow-sm backdrop-blur-sm">
                    {fleetManualMerged.length > 0 ? tr.vesselCargoClickHint : tr.mapLegendPolPod}
                  </p>
                </div>

                {cargoVessel && (
                  <div className="absolute inset-x-2 bottom-2 top-auto z-[8] max-h-[min(48%,360px)] overflow-hidden rounded-xl border border-violet-400/40 bg-dash-panel/95 shadow-lg backdrop-blur-md sm:inset-x-auto sm:left-3 sm:right-auto sm:w-[min(100%,380px)]">
                    <div className="flex items-start justify-between gap-2 border-b border-dash-border px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-dash-fg">
                          {tr.vesselCargoTitle.replace("{{nave}}", cargoVessel.name)}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-snug text-dash-muted">{tr.vesselCargoHint}</p>
                      </div>
                      <button
                        type="button"
                        onClick={closeCargoPanel}
                        className="dash-control shrink-0 px-2 py-1 text-[11px] font-semibold"
                        aria-label={tr.vesselCargoClose}
                      >
                        {tr.vesselCargoClose}
                      </button>
                    </div>
                    <div className="max-h-[min(40vh,280px)] overflow-y-auto p-2.5">
                      {cargoLoading ? (
                        <p className="flex items-center gap-2 px-1 py-3 text-xs text-dash-muted">
                          <Icon icon="lucide:loader-2" width={14} height={14} className="animate-spin" aria-hidden />
                          {tr.vesselCargoLoading}
                        </p>
                      ) : cargoError && cargoOps.length === 0 ? (
                        <p className="px-1 py-3 text-xs text-amber-200/90" role="status">
                          {cargoError}
                        </p>
                      ) : (
                        <>
                          <p className="mb-2 px-1 text-[11px] font-semibold text-dash-neon">
                            {tr.vesselCargoCount.replace("{{count}}", String(cargoOps.length))}
                          </p>
                          <ul className="space-y-2">
                            {cargoOps.map((op) => (
                              <li key={op.id}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedOpId(op.id)}
                                  className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                                    selectedOpId === op.id
                                      ? "border-violet-400/50 bg-violet-500/15"
                                      : "border-dash-border bg-dash-control/50 hover:border-dash-neon/35"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate text-xs font-bold text-dash-fg">
                                      {op.contenedor?.trim() || "—"}
                                    </span>
                                    <span className="shrink-0 text-[10px] font-semibold text-dash-muted">
                                      {op.ref_asli || "—"}
                                    </span>
                                  </div>
                                  <dl className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-dash-muted">
                                    <div>
                                      <dt className="font-semibold text-dash-muted/80">{tr.vesselCargoSpecies}</dt>
                                      <dd className="truncate text-dash-fg/90">{op.especie?.trim() || "—"}</dd>
                                    </div>
                                    <div>
                                      <dt className="font-semibold text-dash-muted/80">{tr.vesselCargoPod}</dt>
                                      <dd className="truncate text-dash-fg/90">{op.pod?.trim() || "—"}</dd>
                                    </div>
                                    <div>
                                      <dt className="font-semibold text-dash-muted/80">{tr.vesselCargoEta}</dt>
                                      <dd className="text-dash-fg/90">{formatDate(op.eta, locale)}</dd>
                                    </div>
                                    <div>
                                      <dt className="font-semibold text-dash-muted/80">{tr.vesselCargoEtd}</dt>
                                      <dd className="text-dash-fg/90">{formatDate(op.etd, locale)}</dd>
                                    </div>
                                    <div className="col-span-2">
                                      <dt className="font-semibold text-dash-muted/80">{tr.vesselCargoBooking}</dt>
                                      <dd className="truncate text-dash-fg/90">{op.booking?.trim() || "—"}</dd>
                                    </div>
                                    <div className="col-span-2">
                                      <dt className="font-semibold text-dash-muted/80">{tr.vesselCargoPol}</dt>
                                      <dd className="truncate text-dash-fg/90">{op.pol?.trim() || "—"}</dd>
                                    </div>
                                  </dl>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
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
                  theme={theme}
                  onFleetVesselClick={(fv) => void handleFleetVesselClick(fv)}
                  selectedFleetKey={cargoVessel?.markerKey ?? null}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
