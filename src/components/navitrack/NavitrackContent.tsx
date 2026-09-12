"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { getApiOriginPrefix } from "@/lib/basePath";
import { useNeonTheme } from "@/lib/ui/neonTheme";
import { ModuleSoftFallback } from "@/components/ui/ModuleSoftFallback";
import "@/styles/tracking-brand.css";
import "@/styles/navitrack.css";
import {
  NavitrackFleet,
  type FleetFiltro,
  type FleetRow,
  type FleetVista,
} from "./NavitrackFleet";
import { NavitrackShipment, type Escala } from "./NavitrackShipment";
import { NavitrackRastreoPanel } from "./NavitrackRastreoPanel";
import {
  NAVITRACK_OP_SELECT,
  buildJourney,
  parseAisSnapshot,
  type AisSnapshot,
  type NaveIdent,
  type NavitrackOperacion,
} from "./navitrack-model";
import {
  construirAlertas,
  construirTimeline,
  estaArribado,
  resolverEstado,
  type TransbordoDecision,
} from "./navitrack-estado";

/** Ventana hacia atrás: un embarque arribado hace más de esto ya no es seguimiento. */
const VENTANA_DIAS = 21;

function isoHaceDias(dias: number): string {
  const d = new Date(Date.now() - dias * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** Nombre de buque comparable: sin acentos, sin viaje pegado y sin dobles espacios. */
function claveNave(raw: string | null | undefined): string {
  let s = String(raw ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  const bracket = s.match(/^(.*?)\s*\[[^\]]+\]\s*$/);
  if (bracket) s = bracket[1].trim();
  const sufijo = s.match(/^(.*?)\s+\d{2,5}[A-Z]?$/);
  if (sufijo) s = sufijo[1].trim();
  return s;
}

export function NavitrackContent() {
  const { t, locale } = useLocale();
  const tr = t.navitrack as unknown as Record<string, string>;
  const { user, profile, isSuperadmin, isLoading: authLoading } = useAuth();
  const [theme] = useNeonTheme();
  const apiPrefix = useMemo(() => getApiOriginPrefix(), []);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const [ops, setOps] = useState<NavitrackOperacion[]>([]);
  const [naves, setNaves] = useState<Map<string, NaveIdent>>(new Map());
  const [logosNaviera, setLogosNaviera] = useState<Map<string, string>>(new Map());
  const [decisiones, setDecisiones] = useState<Map<string, TransbordoDecision>>(new Map());
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FleetFiltro>(null);
  const [vista, setVista] = useState<FleetVista>("activos");
  const [panelRastreo, setPanelRastreo] = useState(false);
  /** Naves con rastreo habilitado; define si el botón de escalas puede consultar. */
  const [navesSeguidas, setNavesSeguidas] = useState<Set<string>>(new Set());

  const [ais, setAis] = useState<AisSnapshot | null>(null);
  const [aisCargando, setAisCargando] = useState(false);

  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [escalasCargando, setEscalasCargando] = useState(false);
  const [escalasEdadH, setEscalasEdadH] = useState<number | null>(null);

  const [transbordoGuardando, setTransbordoGuardando] = useState(false);
  const [transbordoError, setTransbordoError] = useState<string | null>(null);

  /** Reloj propio: sin esto las etapas y los "hace X minutos" se congelan. */
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  /* ------------------------------- Carga ---------------------------------- */

  const cargar = useCallback(async () => {
    if (!supabase || !isSuperadmin) return;
    setRefrescando(true);
    const desde = isoHaceDias(VENTANA_DIAS);

    const [opsRes, navesRes, navierasRes, decRes] = await Promise.all([
      supabase
        .from("operaciones")
        .select(NAVITRACK_OP_SELECT)
        .is("deleted_at", null)
        .not("nave", "is", null)
        .or("estado_operacion.is.null,estado_operacion.neq.CANCELADA")
        .or(`eta.gte.${desde},eta.is.null`)
        .order("eta", { ascending: true })
        .limit(500),
      supabase.from("naves").select("nombre, imo, mmsi, tracking_activo").eq("activo", true).limit(5000),
      supabase.from("navieras").select("nombre, logo_url"),
      supabase.from("navitrack_transbordos").select("operacion_id, estado, puerto, nave_siguiente"),
    ]);

    const filas = (opsRes.data ?? []) as unknown as NavitrackOperacion[];
    setOps(filas);

    const mapaNaves = new Map<string, NaveIdent>();
    const seguidas = new Set<string>();
    for (const n of (navesRes.data ?? []) as (NaveIdent & { tracking_activo?: boolean })[]) {
      const k = claveNave(n.nombre);
      if (!k) continue;
      mapaNaves.set(k, n);
      if (n.tracking_activo) seguidas.add(k);
    }
    setNaves(mapaNaves);
    setNavesSeguidas(seguidas);

    // `logo_url` llega con su propia migración; sin ella la marca cae al
    // monograma, que es el aspecto por defecto de todas las navieras hoy.
    const mapaLogos = new Map<string, string>();
    if (!navierasRes.error) {
      for (const n of (navierasRes.data ?? []) as { nombre: string; logo_url: string | null }[]) {
        const url = (n.logo_url ?? "").trim();
        if (url) mapaLogos.set(n.nombre.trim().toUpperCase(), url);
      }
    }
    setLogosNaviera(mapaLogos);

    // La tabla de decisiones puede no estar aplicada todavía: sin ella el módulo
    // funciona igual, solo que cada alerta de transbordo vuelve a aparecer.
    const mapaDec = new Map<string, TransbordoDecision>();
    if (!decRes.error) {
      for (const d of (decRes.data ?? []) as TransbordoDecision[]) {
        mapaDec.set(d.operacion_id, d);
      }
    }
    setDecisiones(mapaDec);

    setCargando(false);
    setRefrescando(false);
  }, [supabase, isSuperadmin]);

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperadmin) {
      setCargando(false);
      return;
    }
    void cargar();
  }, [authLoading, isSuperadmin, cargar]);

  /* --------------------------------- AIS ----------------------------------- */

  const seleccion = useMemo(
    () => ops.find((o) => o.id === seleccionId) ?? null,
    [ops, seleccionId],
  );

  const identSeleccion = useMemo(() => {
    if (!seleccion?.nave) return null;
    // Embarque cerrado: no se consulta al proveedor. El buque ya zarpó en otro
    // viaje y su posición actual no tiene nada que ver con esta carga.
    if (estaArribado(seleccion)) return null;
    return naves.get(claveNave(seleccion.nave)) ?? null;
  }, [seleccion, naves]);

  /**
   * El AIS se consulta solo para el embarque abierto.
   *
   * Cada lectura es una llamada al proveedor: pedirla para los 300 embarques de
   * la tabla gastaría el plan sin que nadie mire ese dato. En la flota basta la
   * posición estimada, que sale de la ruta y las fechas.
   */
  const consultarAis = useCallback(
    async (ident: NaveIdent, silencioso: boolean) => {
      const mmsi = (ident.mmsi ?? "").trim();
      const imo = (ident.imo ?? "").trim();
      if (!mmsi && !imo) {
        setAis(null);
        return;
      }
      // Data Docked acepta IMO o MMSI en el mismo parámetro; se prefiere el MMSI,
      // que es el identificador que viaja en la señal AIS.
      const id = mmsi || imo;
      if (!silencioso) setAisCargando(true);
      try {
        const r = await fetch(`${apiPrefix}/api/navitrack/vessel?id=${encodeURIComponent(id)}`, {
          credentials: "same-origin",
        });
        const json = (await r.json()) as { ok: boolean; data?: Record<string, unknown> };
        // Un fallo del proveedor no se le muestra al usuario: la vista cae a la
        // posición estimada, que ya explica su propia procedencia.
        setAis(json.ok ? parseAisSnapshot(json.data ?? null) : null);
      } catch {
        setAis(null);
      } finally {
        if (!silencioso) setAisCargando(false);
      }
    },
    [apiPrefix],
  );

  useEffect(() => {
    setAis(null);
    setTransbordoError(null);
    if (!seleccionId || !identSeleccion || !user) return;
    void consultarAis(identSeleccion, false);
  }, [seleccionId, identSeleccion, user, consultarAis]);

  /**
   * Escalas del buque.
   *
   * `solo_cache` es lo que se pide al abrir el embarque: lee lo guardado y no
   * gasta nada. Traerlas del proveedor es un botón explícito porque es la
   * consulta más cara del plan.
   */
  const cargarEscalas = useCallback(
    async (desdeProveedor: boolean) => {
      const ident = identSeleccion;
      const id = (ident?.mmsi ?? "").trim() || (ident?.imo ?? "").trim();
      if (!id) {
        setEscalas([]);
        setEscalasEdadH(null);
        return;
      }
      if (desdeProveedor) setEscalasCargando(true);
      try {
        const qs = desdeProveedor ? "forzar=1" : "solo_cache=1";
        const r = await fetch(`${apiPrefix}/api/navitrack/escalas?id=${encodeURIComponent(id)}&${qs}`, {
          credentials: "same-origin",
        });
        const j = (await r.json()) as { ok: boolean; escalas?: Escala[]; edadH?: number | null };
        setEscalas(Array.isArray(j.escalas) ? j.escalas : []);
        setEscalasEdadH(desdeProveedor ? null : (j.edadH ?? null));
      } catch {
        setEscalas([]);
      } finally {
        setEscalasCargando(false);
      }
    },
    [apiPrefix, identSeleccion],
  );

  useEffect(() => {
    if (!seleccionId || !identSeleccion || !user) {
      setEscalas([]);
      setEscalasEdadH(null);
      return;
    }
    void cargarEscalas(false);
  }, [seleccionId, identSeleccion, user, cargarEscalas]);

  /**
   * No hay sondeo automático a propósito.
   *
   * Cada lectura del proveedor cuesta un crédito, y refrescar cada 5 minutos un
   * embarque abierto agotaba el plan en menos de una hora. Ahora la posición se
   * pide al abrir el embarque y al pulsar Actualizar; el servidor decide si eso
   * se responde con la caché de la base o si toca gastar un crédito.
   */

  /* -------------------------------- Derivados ------------------------------ */

  /** Flota sin AIS: la posición y la etapa salen de ruta, fechas y coordenada cargada. */
  const filas = useMemo<FleetRow[]>(
    () =>
      ops.map((op) => {
        const journey = buildJourney(op, null, ahora);
        const estado = resolverEstado(op, null, journey, decisiones.get(op.id) ?? null, ahora);
        return { op, ais: null, journey, estado };
      }),
    [ops, decisiones, ahora],
  );

  const conteos = useMemo(() => {
    let transito = 0;
    let proximos = 0;
    let retrasos = 0;
    let transbordos = 0;
    let arribados = 0;
    for (const f of filas) {
      switch (f.estado.etapa) {
        case "EN_TRANSITO":
          transito += 1;
          break;
        case "PROXIMO_DESTINO":
          transito += 1;
          proximos += 1;
          break;
        case "POSIBLE_RETRASO":
          transito += 1;
          retrasos += 1;
          break;
        case "POSIBLE_TRANSBORDO":
          transito += 1;
          transbordos += 1;
          break;
        case "TRANSBORDO_CONFIRMADO":
          transito += 1;
          break;
        case "ARRIBADO":
          arribados += 1;
          break;
        default:
          break;
      }
    }
    return { transito, proximos, retrasos, transbordos, arribados };
  }, [filas]);

  /**
   * La vista parte la lista en dos (en curso / arribados); dentro, cada KPI
   * define un subconjunto y el buscador se aplica encima de todo.
   */
  const filasVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filas.filter((f) => {
      const etapa = f.estado.etapa;
      const arribado = etapa === "ARRIBADO";
      if (vista === "arribados" ? !arribado : arribado) return false;
      if (filtro === "transito" && etapa === "EN_ORIGEN") return false;
      if (filtro === "proximos" && etapa !== "PROXIMO_DESTINO") return false;
      if (filtro === "retrasos" && etapa !== "POSIBLE_RETRASO") return false;
      if (filtro === "transbordos" && etapa !== "POSIBLE_TRANSBORDO") return false;
      if (!q) return true;
      return [f.op.contenedor, f.op.booking, f.op.cliente, f.op.nave, f.op.ref_asli, f.op.pod]
        .some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [filas, busqueda, filtro, vista]);

  /** El embarque abierto sí usa el AIS: es el único que lo pidió. */
  const detalle = useMemo(() => {
    if (!seleccion) return null;
    const decision = decisiones.get(seleccion.id) ?? null;
    const journey = buildJourney(seleccion, ais, ahora);
    const estado = resolverEstado(seleccion, ais, journey, decision, ahora);
    return {
      journey,
      estado,
      decision,
      alertas: construirAlertas(seleccion, ais, journey, estado),
      eventos: construirTimeline(seleccion, ais, estado, decision, ahora),
    };
  }, [seleccion, ais, decisiones, ahora]);

  /*
   * Enlace profundo: `/navitrack?op=<referencia>`.
   *
   * Los avisos por correo apuntan a un embarque concreto, no al listado. Se
   * acepta el id, la referencia ASLI, el contenedor o el booking, porque el que
   * arma el enlace no siempre tiene el uuid a mano.
   *
   * Solo corre una vez, cuando las operaciones ya están cargadas: antes de eso
   * no hay con qué resolver la referencia.
   */
  const urlResuelta = useRef(false);
  useEffect(() => {
    if (urlResuelta.current || cargando || !ops.length) return;
    urlResuelta.current = true;
    let buscado = "";
    try {
      buscado = (new URLSearchParams(window.location.search).get("op") ?? "").trim();
    } catch {
      return;
    }
    if (!buscado) return;
    const clave = buscado.toLowerCase();
    const hallada = ops.find(
      (o) =>
        o.id === buscado ||
        (o.ref_asli ?? "").toLowerCase() === clave ||
        (o.contenedor ?? "").toLowerCase() === clave ||
        (o.booking ?? "").toLowerCase() === clave,
    );
    if (hallada) setSeleccionId(hallada.id);
  }, [cargando, ops]);

  /**
   * La URL sigue a la selección, así el enlace se puede copiar y el botón
   * «atrás» del navegador devuelve al listado en vez de salir del módulo.
   */
  useEffect(() => {
    if (!urlResuelta.current) return;
    try {
      const url = new URL(window.location.href);
      const actual = url.searchParams.get("op");
      const deseado = seleccionId
        ? (ops.find((o) => o.id === seleccionId)?.ref_asli ?? seleccionId)
        : null;
      if (actual === deseado) return;
      if (deseado) url.searchParams.set("op", deseado);
      else url.searchParams.delete("op");
      window.history.replaceState(null, "", url.toString());
    } catch {
      /* Sin URL utilizable no pasa nada: la pantalla funciona igual. */
    }
  }, [seleccionId, ops]);

  /** Orden en que el usuario ve la lista: es el que siguen las flechas. */
  const idsVisibles = useMemo(() => filasVisibles.map((f) => f.op.id), [filasVisibles]);
  const indiceEnLista = seleccionId ? idsVisibles.indexOf(seleccionId) : -1;

  const irAOtroEmbarque = useCallback(
    (delta: number) => {
      if (indiceEnLista < 0) return;
      const destino = idsVisibles[indiceEnLista + delta];
      if (destino) setSeleccionId(destino);
    },
    [idsVisibles, indiceEnLista],
  );

  /* ------------------------------- Transbordo ------------------------------ */

  const guardarDecision = useCallback(
    async (estado: "confirmado" | "descartado") => {
      if (!supabase || !seleccion) return;
      setTransbordoGuardando(true);
      setTransbordoError(null);
      const fila: TransbordoDecision = {
        operacion_id: seleccion.id,
        estado,
        puerto: ais?.destination ?? null,
        nave_siguiente: null,
      };
      const { error } = await supabase
        .from("navitrack_transbordos")
        .upsert(
          { ...fila, decidido_por: profile?.id ?? null },
          { onConflict: "operacion_id" },
        );
      if (error) {
        setTransbordoError(tr.transbordoError);
      } else {
        setDecisiones((prev) => new Map(prev).set(seleccion.id, fila));
      }
      setTransbordoGuardando(false);
    },
    [supabase, seleccion, ais, profile, tr],
  );

  /* --------------------------------- Render -------------------------------- */

  if (authLoading) return <ModuleSoftFallback chrome="dashboard" />;

  if (!profile || !isSuperadmin) {
    return (
      <div className="dash-neon tracking-brand navitrack flex min-h-0 flex-1 flex-col" data-theme={theme}>
        <main className="dash-page flex flex-1 items-center justify-center p-6" role="main">
          <p className="text-sm text-dash-muted">
            {user ? tr.superadminOnly : tr.loginRequired}
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="dash-neon tracking-brand navitrack flex min-h-0 flex-1 flex-col" data-theme={theme}>
      <main className="dash-page relative flex min-h-0 flex-1 flex-col overflow-hidden" role="main">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -right-20 top-0 h-80 w-80 rounded-full bg-dash-neon/15 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-dash-neon-hot/10 blur-3xl" />
        </div>

        <div className="dash-toolbar relative z-10 shrink-0">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dash-neon/40 bg-dash-neon/15 text-dash-neon shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--dash-neon)_55%,transparent)]">
                <Icon icon="lucide:compass" width={22} height={22} aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="dash-title truncate text-lg font-bold tracking-tight sm:text-xl">
                  {tr.title}
                </h1>
                <p className="dash-subtitle mt-0.5 line-clamp-1 text-xs sm:text-sm">{tr.subtitle}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPanelRastreo(true)}
              title={tr.rastreoTitulo}
              className="dash-control motion-interactive inline-flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs font-semibold"
            >
              <Icon icon="lucide:satellite-dish" width={14} height={14} aria-hidden />
              <span className="hidden sm:inline">{tr.rastreoTitulo}</span>
            </button>

            {/* En el detalle el botón vive en su barra, junto a la navegación:
                tenerlo también acá eran dos "Actualizar" en la misma pantalla. */}
            <button
              type="button"
              onClick={() => void cargar()}
              disabled={refrescando}
              className={`dash-control motion-interactive shrink-0 items-center gap-1.5 px-3 py-2 text-xs font-semibold disabled:opacity-60 ${
                seleccion ? "hidden" : "inline-flex"
              }`}
            >
              <Icon
                icon="lucide:refresh-cw"
                width={14}
                height={14}
                className={refrescando ? "animate-spin" : ""}
                aria-hidden
              />
              <span className="hidden sm:inline">{tr.refresh}</span>
            </button>
          </div>
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
          {seleccion && detalle ? (
            <NavitrackShipment
              op={seleccion}
              ais={ais}
              journey={detalle.journey}
              estado={detalle.estado}
              alertas={detalle.alertas}
              eventos={detalle.eventos}
              decision={detalle.decision}
              navieraLogoUrl={
                logosNaviera.get((seleccion.naviera ?? "").trim().toUpperCase()) ?? null
              }
              naveIdent={naves.get(claveNave(seleccion.nave)) ?? null}
              escalas={escalas}
              escalasCargando={escalasCargando}
              escalasEdadH={escalasEdadH}
              escalasPuedeConsultar={navesSeguidas.has(claveNave(seleccion.nave))}
              onTraerEscalas={() => void cargarEscalas(true)}
              locale={locale}
              theme={theme}
              tr={tr}
              onBack={() => setSeleccionId(null)}
              onRefresh={() => {
                if (identSeleccion) void consultarAis(identSeleccion, false);
                void cargar();
              }}
              refrescando={aisCargando || refrescando}
              indiceEnLista={indiceEnLista}
              totalEnLista={idsVisibles.length}
              onAnterior={() => irAOtroEmbarque(-1)}
              onSiguiente={() => irAOtroEmbarque(1)}
              transbordoGuardando={transbordoGuardando}
              transbordoError={transbordoError}
              onConfirmarTransbordo={() => void guardarDecision("confirmado")}
              onDescartarTransbordo={() => void guardarDecision("descartado")}
            />
          ) : (
            <NavitrackFleet
              rows={filasVisibles}
              total={vista === "arribados" ? conteos.arribados : filas.length - conteos.arribados}
              conteos={conteos}
              vista={vista}
              onVista={(v) => {
                setVista(v);
                // Los KPI no aplican sobre los arribados: cambiar de vista limpia el filtro.
                setFiltro(null);
              }}
              busqueda={busqueda}
              onBusqueda={setBusqueda}
              filtro={filtro}
              onFiltro={setFiltro}
              locale={locale}
              tr={tr}
              onSelect={setSeleccionId}
              cargando={cargando}
            />
          )}
        </div>

        {panelRastreo && (
          <NavitrackRastreoPanel
            tr={tr}
            onCerrar={() => {
              setPanelRastreo(false);
              // Activar o desactivar una nave cambia qué se puede consultar.
              void cargar();
            }}
          />
        )}
      </main>
    </div>
  );
}
