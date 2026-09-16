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
import {
  NavitrackRecalada,
  type NaveCatalogo,
  type PuertoCatalogo,
  type Recalada,
} from "./NavitrackRecalada";
import { NavitrackRastreoPanel } from "./NavitrackRastreoPanel";
import { NavitrackCoordsManual } from "./NavitrackCoordsManual";
import {
  yaZarpo,
  NAVITRACK_OP_SELECT,
  buildJourney,
  mismoPuerto,
  parseAisSnapshot,
  NAVITRACK_TRAMO_SELECT,
  type Tramo,
  type AisSnapshot,
  type NaveIdent,
  type NavitrackOperacion,
} from "./navitrack-model";
import {
  construirAlertas,
  construirTimeline,
  estaArribado,
  resolverEstado,
  type NavitrackVista,
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
    // El proveedor usa guión bajo en los nombres ("CALLAO_EXPRESS").
    .replace(/[_]+/g, " ")
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
  const {
    user,
    profile,
    isSuperadmin,
    isAdmin,
    isEjecutivo,
    isCliente,
    isStaff,
    empresaNombres,
    isLoading: authLoading,
  } = useAuth();

  /*
   * Quién entra, y con cuánto poder.
   *
   * NaviTrack reemplazó al módulo de seguimiento, así que ya no lo mira solo
   * el superadmin: lo usa toda la empresa y también el cliente. Tres permisos
   * independientes, porque no son el mismo eje:
   *
   * - `puedeVer`     cualquier cuenta con rol activo. QUÉ embarques ve no lo
   *                  decide esta pantalla sino RLS: el ejecutivo y el cliente
   *                  solo alcanzan los de sus empresas.
   * - `puedeDecidir` resolver una recalada o confirmar un transbordo. Es una
   *                  afirmación de ASLI sobre el viaje y sale en un correo a su
   *                  nombre, así que la firman superadmin, admin y ejecutivo
   *                  —este último solo sobre lo suyo, por RLS—. El operador
   *                  mira; el cliente, menos todavía.
   * - `puedeGastar`  consultar al proveedor AIS. Cada llamada es un crédito y
   *                  el plan es uno solo para toda la empresa: quién lo gasta
   *                  es una decisión, no un permiso más. Se queda en superadmin.
   *
   * `modo` es otra cosa: no es permiso sino criterio de qué mostrar, y viaja
   * hasta la lógica pura para que etapa, alerta y color no se contradigan.
   *
   * Nada de esto es una barrera: las de verdad son RLS y los endpoints.
   */
  const modo: NavitrackVista = isCliente ? "cliente" : "interna";

  /*
   * Empresas a las que hay que acotar la consulta, o null si no hay que acotar.
   *
   * Para un cliente o un ejecutivo de verdad esto es redundante: RLS ya les
   * devuelve solo lo suyo. Hace falta por "ver como": esa función cambia el
   * perfil efectivo en el navegador, pero la sesión contra Supabase sigue
   * siendo la del superadmin, así que la base responde con TODO y la pantalla,
   * creyéndose cliente, mostraba embarques de otros. El filtro va en la
   * consulta y no en el render para que ni siquiera lleguen.
   *
   * Lista vacía es lista vacía: un cliente sin empresas asignadas no ve nada.
   * Mostrarle todo sería exactamente el error que esto viene a corregir.
   */
  const empresasAcotadas = isCliente || isEjecutivo ? empresaNombres : null;
  const puedeVer = isStaff || isCliente;
  const puedeDecidir = isSuperadmin || isAdmin || isEjecutivo;
  const puedeGastar = isSuperadmin;
  const soloLectura = !puedeDecidir;
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

  /*
   * Recaladas del embarque abierto.
   *
   * Se cargan al abrirlo y no para toda la flota: son el detalle de un viaje,
   * y traerlas de los 300 embarques sería pedir una tabla entera para mostrar
   * una línea de tiempo.
   */
  /*
   * Los datos del embarque abierto van etiquetados con **cuál** es.
   *
   * Al pasar de un embarque a otro, esto seguía teniendo lo del anterior hasta
   * que llegaba la consulta nueva, así que durante un momento el mapa dibujaba
   * el recorrido de otro viaje y después se corregía solo. Guardar el id junto
   * a las filas lo resuelve de raíz: la pantalla no puede usar lo que no le
   * corresponde, aunque la respuesta llegue tarde. Limpiar con un efecto no
   * bastaba —siempre queda un cuadro pintado de por medio— y además no cubre
   * dos clics seguidos, donde la respuesta del primer embarque puede aterrizar
   * después de la del segundo y pisarla.
   */
  const [recaladasDe, setRecaladasDe] = useState<{ opId: string | null; filas: Recalada[] }>({
    opId: null,
    filas: [],
  });
  const [catalogoNaves, setCatalogoNaves] = useState<NaveCatalogo[]>([]);
  /** Catálogo de puertos para el alta a mano; llega junto al de naves. */
  const [catalogoPuertos, setCatalogoPuertos] = useState<PuertoCatalogo[]>([]);
  const [recaladaAbierta, setRecaladaAbierta] = useState<Recalada | null>(null);
  /* El alta a mano usa el mismo diálogo, con el puerto en blanco y editable. */
  const [recaladaManual, setRecaladaManual] = useState(false);
  const [avisoRecalada, setAvisoRecalada] = useState<string | null>(null);

  /** Recaladas de cada embarque, para que la tabla y la ficha coincidan. */
  const [recaladasPorOp, setRecaladasPorOp] = useState<Map<string, { puerto: string; estado: string }[]>>(
    new Map(),
  );

  /** Tramos por operación. Vacío = viaje directo. */
  const [tramos, setTramos] = useState<Map<string, Tramo[]>>(new Map());

  /** Últimas posiciones guardadas por identificador, para toda la flota. */
  const [aisCache, setAisCache] = useState<Map<string, AisSnapshot>>(new Map());

  const [ais, setAis] = useState<AisSnapshot | null>(null);
  const [aisCargando, setAisCargando] = useState(false);

  const [escalasDe, setEscalasDe] = useState<{ opId: string | null; filas: Escala[] }>({
    opId: null,
    filas: [],
  });
  const [escalasCargando, setEscalasCargando] = useState(false);
  const [escalasEdadH, setEscalasEdadH] = useState<number | null>(null);

  /** Ventana de posición manual del buque, para cuando no hay AIS. */
  const [coordsAbiertas, setCoordsAbiertas] = useState(false);

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
    if (!supabase || !puedeVer) return;
    setRefrescando(true);
    const desde = isoHaceDias(VENTANA_DIAS);

    const [opsRes, navesRes, navierasRes, decRes, tramosRes, recRes, lecturasRes] = await Promise.all([
      (() => {
        let q = supabase
          .from("operaciones")
          .select(NAVITRACK_OP_SELECT)
          .is("deleted_at", null)
          .not("nave", "is", null)
          .or("estado_operacion.is.null,estado_operacion.neq.CANCELADA")
          .or(`eta.gte.${desde},eta.is.null`);
        if (empresasAcotadas) q = q.in("cliente", empresasAcotadas);
        return q.order("eta", { ascending: true }).limit(500);
      })(),
      supabase.from("naves").select("nombre, imo, mmsi, tracking_activo").eq("activo", true).limit(5000),
      supabase.from("navieras").select("nombre, logo_url"),
      supabase.from("navitrack_transbordos").select("operacion_id, estado, puerto, nave_siguiente"),
      /*
       * Tramos de los viajes con transbordo.
       *
       * Sin filas para una operación, su viaje es directo. Con filas, la ruta
       * son esos tramos: es la regla de lectura de `navitrack_tramos`.
       */
      supabase.from("navitrack_tramos").select(NAVITRACK_TRAMO_SELECT).order("orden"),
      /*
       * Recaladas de todos los embarques, no solo del abierto.
       *
       * El estado de la tabla depende de ellas: sin esto, una recalada resuelta
       * dejaba de marcar el embarque abierto pero el listado seguía mostrando
       * "posible transbordo", que es la misma contradicción vista desde otra
       * pantalla.
       *
       * Se traen **todas**, sin filtrar por estado. Antes había una lista de
       * cuatro que había que recordar actualizar, y al agregar
       * `transbordo_anunciado` nadie la actualizó: la ficha daba el transbordo
       * por resuelto y la tabla seguía pidiendo verificarlo, otra vez la misma
       * contradicción. Quién resuelve y quién no lo decide `resolverEstado`,
       * que es donde vive esa regla; acá solo se le entregan los datos.
       */
      supabase.from("navitrack_recaladas").select("operacion_id, puerto, estado").limit(2000),
      /*
       * Últimas posiciones guardadas. Es una lectura de base de datos: no gasta
       * créditos y no llama al proveedor.
       *
       * Sin esto la flota solo conocía la coordenada pegada a mano, así que la
       * columna "última actualización" quedaba vacía justamente en las naves que
       * sí se están rastreando, que es lo contrario de lo que debería mostrar.
       */
      supabase
        .from("navitrack_ais_lecturas")
        .select("identificador, lat, lng, speed, course, destino, nav_status, eta, posicion_recibida_at, consultado_at, nave_nombre, crudo")
        .eq("tipo", "posicion")
        .order("consultado_at", { ascending: false })
        .limit(600),
    ]);

    const filas = (opsRes.data ?? []) as unknown as NavitrackOperacion[];
    setOps(filas);

    const porOperacion = new Map<string, Tramo[]>();
    for (const t of (tramosRes.data ?? []) as (Tramo & { operacion_id: string })[]) {
      const lista = porOperacion.get(t.operacion_id) ?? [];
      lista.push(t);
      porOperacion.set(t.operacion_id, lista);
    }
    setTramos(porOperacion);

    const recPorOperacion = new Map<string, { puerto: string; estado: string }[]>();
    for (const r of (recRes.data ?? []) as { operacion_id: string; puerto: string; estado: string }[]) {
      const lista = recPorOperacion.get(r.operacion_id) ?? [];
      lista.push({ puerto: r.puerto, estado: r.estado });
      recPorOperacion.set(r.operacion_id, lista);
    }
    setRecaladasPorOp(recPorOperacion);

    // La consulta viene ordenada de más nueva a más vieja: la primera manda.
    const porIdent = new Map<string, AisSnapshot>();
    for (const l of (lecturasRes.data ?? []) as Record<string, unknown>[]) {
      const ident = String(l.identificador ?? "").trim();
      if (!ident || porIdent.has(ident)) continue;
      const snap = parseAisSnapshot({
        latitude: l.lat,
        longitude: l.lng,
        speed: l.speed,
        course: l.course,
        destination: l.destino,
        navigationalStatus: l.nav_status,
        etaUtc: l.eta,
        positionReceived: l.posicion_recibida_at ?? l.consultado_at,
        name: l.nave_nombre,
        // Sin columna propia: el puerto de procedencia solo está en el crudo.
        lastPort: (l.crudo as Record<string, unknown> | null)?.lastPort,
        atdUtc: (l.crudo as Record<string, unknown> | null)?.atdUtc,
      });
      if (snap) porIdent.set(ident, snap);
    }
    setAisCache(porIdent);

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
  }, [supabase, puedeVer, empresasAcotadas]);

  useEffect(() => {
    if (authLoading) return;
    if (!puedeVer) {
      setCargando(false);
      return;
    }
    void cargar();
  }, [authLoading, puedeVer, cargar]);

  /* --------------------------------- AIS ----------------------------------- */

  const seleccion = useMemo(
    () => ops.find((o) => o.id === seleccionId) ?? null,
    [ops, seleccionId],
  );

  /**
   * Nave que lleva la carga ahora.
   *
   * Con transbordo no es `operaciones.nave`: esa columna guarda el primer buque,
   * que ya soltó la carga en el puerto de conexión y navega otro viaje. Lo que
   * se sigue es la carga, así que la nave del tramo en curso es la que manda.
   */
  const naveDeLaCarga = useCallback(
    (op: NavitrackOperacion): string | null => {
      const lista = tramos.get(op.id) ?? [];
      if (!lista.length) return op.nave;
      const hoy = new Date().toISOString().slice(0, 10);
      const enCurso = [...lista]
        .sort((a, b) => a.orden - b.orden)
        .find((t) => !(t.eta && t.eta < hoy));
      return enCurso?.nave ?? lista[lista.length - 1]?.nave ?? op.nave;
    },
    [tramos],
  );

  const identSeleccion = useMemo(() => {
    if (!seleccion) return null;
    // Embarque cerrado: no se consulta al proveedor. El buque ya zarpó en otro
    // viaje y su posición actual no tiene nada que ver con esta carga.
    if (estaArribado(seleccion)) return null;
    /*
     * Tampoco antes de zarpar, por la misma razón vista del otro lado: el buque
     * que vendrá a buscar la carga está haciendo un viaje ajeno, así que su
     * posición no dice nada de este embarque y pagarla es gastar un crédito en
     * un dato que no se puede mostrar.
     */
    if (!yaZarpo(seleccion, ahora)) return null;
    const nave = naveDeLaCarga(seleccion);
    if (!nave) return null;
    return naves.get(claveNave(nave)) ?? null;
  }, [seleccion, naves, naveDeLaCarga, ahora]);

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
    /*
     * El cliente no dispara consultas al proveedor.
     *
     * Cada una es un crédito, y quién y cuándo se gasta es una decisión de
     * ASLI. Su posición sale de la última lectura guardada —la misma que
     * alimenta la tabla de flota—, que el chequeo diario refresca sin que
     * nadie tenga que abrir la pantalla.
     */
    if (!puedeGastar) {
      const clave = (identSeleccion.mmsi ?? "").trim() || (identSeleccion.imo ?? "").trim();
      setAis(clave ? (aisCache.get(clave) ?? null) : null);
      return;
    }
    void consultarAis(identSeleccion, false);
  }, [seleccionId, identSeleccion, user, consultarAis, puedeGastar, aisCache]);

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
        setEscalasDe({ opId: seleccionId, filas: [] });
        setEscalasEdadH(null);
        return;
      }
      if (desdeProveedor) setEscalasCargando(true);
      // El id se captura ahora, no al volver: si mientras tanto se abrió otro
      // embarque, esta respuesta queda etiquetada con el suyo y se descarta.
      const pedidoPara = seleccionId;
      try {
        const qs = desdeProveedor ? "forzar=1" : "solo_cache=1";
        const r = await fetch(`${apiPrefix}/api/navitrack/escalas?id=${encodeURIComponent(id)}&${qs}`, {
          credentials: "same-origin",
        });
        const j = (await r.json()) as { ok: boolean; escalas?: Escala[]; edadH?: number | null };
        setEscalasDe({ opId: pedidoPara, filas: Array.isArray(j.escalas) ? j.escalas : [] });
        setEscalasEdadH(desdeProveedor ? null : (j.edadH ?? null));
      } catch {
        setEscalasDe({ opId: pedidoPara, filas: [] });
      } finally {
        setEscalasCargando(false);
      }
    },
    [apiPrefix, identSeleccion, seleccionId],
  );

  useEffect(() => {
    // El historial de port calls es la consulta más cara del plan y su endpoint
    // exige superadmin: para el cliente la pestaña no existe.
    if (!seleccionId || !identSeleccion || !user || !puedeGastar) {
      setEscalasDe({ opId: seleccionId, filas: [] });
      setEscalasEdadH(null);
      return;
    }
    void cargarEscalas(false);
  }, [seleccionId, identSeleccion, user, cargarEscalas, puedeGastar]);

  /**
   * Recaladas del embarque abierto y catálogo de naves para el selector.
   *
   * Consulta a la base, no al proveedor: no gasta créditos. Se recarga tras
   * cada decisión para que el historial refleje lo recién guardado.
   */
  const cargarRecaladas = useCallback(async () => {
    if (!seleccionId) {
      setRecaladasDe({ opId: null, filas: [] });
      return;
    }
    // Igual que con las escalas: el id se fija al pedir, no al recibir.
    const pedidoPara = seleccionId;
    /*
     * Quien no decide las lee directo de la base.
     *
     * El endpoint sirve además el catálogo de naves del formulario de decisión,
     * que a esta altura no le sirve a nadie más. La diferencia está en cuáles:
     * el operador ve el viaje completo, pendientes incluidas, porque trabaja
     * acá; el cliente solo las que alguien ya respondió, porque un puerto
     * anunciado sin revisar todavía no es parte del viaje sino la pregunta que
     * ASLI tiene abierta.
     */
    if (!puedeDecidir) {
      if (!supabase) return;
      let q = supabase
        .from("navitrack_recaladas")
        .select("id, puerto, nave, anunciado_at, eta_anunciada, visto_at, estado, decidido_at, notas, recalado_at, zarpe_at")
        .eq("operacion_id", seleccionId);
      /*
       * Al cliente se le muestra lo que consta, no lo que se está averiguando.
       *
       * `anunciada` y `por_verificar` son preguntas internas abiertas —¿cambió
       * la carga de barco aquí?— y mostrárselas solo genera una llamada. Una
       * `recalada` es distinta: es un puerto donde el buque efectivamente paró,
       * y es justamente lo que el cliente quiere saber de su embarque.
       */
      if (modo === "cliente") {
        q = q.in("estado", ["parada_programada", "transbordo", "recalada"]);
      }
      const { data } = await q.order("anunciado_at");
      setRecaladasDe({ opId: pedidoPara, filas: (data ?? []) as Recalada[] });
      setCatalogoNaves([]);
      return;
    }
    try {
      const r = await fetch(`${apiPrefix}/api/navitrack/recalada?op=${encodeURIComponent(seleccionId)}`, {
        credentials: "same-origin",
      });
      const j = (await r.json()) as {
        ok: boolean;
        recaladas?: Recalada[];
        naves?: NaveCatalogo[];
        puertos?: PuertoCatalogo[];
      };
      setRecaladasDe({
        opId: pedidoPara,
        filas: j.ok && Array.isArray(j.recaladas) ? j.recaladas : [],
      });
      if (j.ok && Array.isArray(j.naves)) setCatalogoNaves(j.naves);
      if (j.ok && Array.isArray(j.puertos)) setCatalogoPuertos(j.puertos);
    } catch {
      setRecaladasDe({ opId: pedidoPara, filas: [] });
    }
  }, [apiPrefix, seleccionId, puedeDecidir, modo, supabase]);

  useEffect(() => {
    if (!user) return;
    void cargarRecaladas();
  }, [user, cargarRecaladas]);

  /**
   * No hay sondeo automático a propósito.
   *
   * Cada lectura del proveedor cuesta un crédito, y refrescar cada 5 minutos un
   * embarque abierto agotaba el plan en menos de una hora. Ahora la posición se
   * pide al abrir el embarque y al pulsar Actualizar; el servidor decide si eso
   * se responde con la caché de la base o si toca gastar un crédito.
   */

  /* -------------------------------- Derivados ------------------------------ */

  /*
   * Flota: cada embarque usa la última posición **guardada** de su nave.
   *
   * No se consulta al proveedor desde aquí —eso sigue siendo cosa del embarque
   * abierto y del chequeo diario—, pero sí se aprovecha lo que ya se pagó. Si
   * una nave no tiene lectura, la posición y la etapa se estiman con la ruta y
   * las fechas, como antes.
   *
   * Un embarque arribado se deja sin AIS a propósito: el buque ya va en otro
   * viaje y su posición actual no dice nada de esa carga.
   */
  const filas = useMemo<FleetRow[]>(
    () =>
      ops.map((op) => {
        const ident = naves.get(claveNave(naveDeLaCarga(op) ?? ""));
        const clave = (ident?.mmsi ?? "").trim() || (ident?.imo ?? "").trim();
        const guardada = !estaArribado(op) && clave ? (aisCache.get(clave) ?? null) : null;
        const journey = buildJourney(op, guardada, ahora, tramos.get(op.id) ?? []);
        const estado = resolverEstado(
          op,
          guardada,
          journey,
          decisiones.get(op.id) ?? null,
          ahora,
          recaladasPorOp.get(op.id) ?? [],
          modo,
        );
        return { op, ais: guardada, journey, estado };
      }),
    [ops, decisiones, ahora, naves, aisCache, tramos, naveDeLaCarga, recaladasPorOp, modo],
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
    /*
     * `transito` cuenta los que navegan; `activos`, los que no han arribado.
     *
     * No son lo mismo y confundirlos se veía en pantalla: la pestaña "En
     * seguimiento" mostraba los navegando, así que un embarque todavía en
     * origen desaparecía de la cuenta aunque estuviera en la lista, y el número
     * de la pestaña no calzaba con el de la línea de abajo.
     */
    return {
      transito,
      proximos,
      retrasos,
      transbordos,
      arribados,
      activos: filas.length - arribados,
      todos: filas.length,
    };
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
      // "todos" no filtra por arribo: es la vista para buscar sin pensar en
      // qué pestaña vive el embarque.
      if (vista !== "todos" && (vista === "arribados" ? !arribado : arribado)) return false;
      if (filtro === "transito" && etapa === "EN_ORIGEN") return false;
      if (filtro === "proximos" && etapa !== "PROXIMO_DESTINO") return false;
      if (filtro === "retrasos" && etapa !== "POSIBLE_RETRASO") return false;
      if (filtro === "transbordos" && etapa !== "POSIBLE_TRANSBORDO") return false;
      if (!q) return true;
      return [f.op.contenedor, f.op.booking, f.op.cliente, f.op.nave, f.op.ref_asli, f.op.pod]
        .some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [filas, busqueda, filtro, vista]);

  /*
   * Lo guardado solo cuenta si es de este embarque. Si es del anterior —porque
   * su consulta todavía no vuelve— la pantalla ve una lista vacía, que es la
   * verdad disponible en ese instante, y no el viaje de otra carga.
   */
  const recaladas = useMemo(
    () => (recaladasDe.opId === seleccionId ? recaladasDe.filas : []),
    [recaladasDe, seleccionId],
  );
  const escalas = useMemo(
    () => (escalasDe.opId === seleccionId ? escalasDe.filas : []),
    [escalasDe, seleccionId],
  );

  /*
   * Una fila por puerto, aunque el buque lo haya nombrado de dos maneras.
   *
   * El registro ya evita anotarlo dos veces, pero lo anotado antes de esa
   * corrección sigue en la base: sin colapsarlo acá, el historial muestra el
   * mismo Rotterdam dos veces y el mapa clava dos marcadores en el mismo punto.
   * Gana la fila vista más recientemente, que es la que lleva el rótulo actual
   * del buque y la ETA más nueva; si una ya fue decidida, gana esa, porque
   * tiene detrás el criterio de una persona.
   */
  const recaladasUnicas = useMemo(() => {
    const salida: Recalada[] = [];
    for (const r of recaladas) {
      const i = salida.findIndex((x) => mismoPuerto(x.puerto, r.puerto));
      if (i < 0) {
        salida.push(r);
        continue;
      }
      const previa = salida[i];
      const decidida = (x: Recalada) => Boolean(x.decidido_at);
      if (decidida(previa) && !decidida(r)) continue;
      if (!decidida(previa) && decidida(r)) {
        salida[i] = r;
        continue;
      }
      const cuando = (x: Recalada) => new Date(x.visto_at ?? x.anunciado_at ?? 0).getTime();
      if (cuando(r) >= cuando(previa)) salida[i] = r;
    }
    return salida;
  }, [recaladas]);

  /** El embarque abierto sí usa el AIS: es el único que lo pidió. */
  const detalle = useMemo(() => {
    if (!seleccion) return null;
    const decision = decisiones.get(seleccion.id) ?? null;
    /*
     * Puertos anunciados que aún no se alcanzan, en el orden en que el buque
     * los fue declarando. Son los que curvan la ruta estimada.
     */
    /*
     * Puertos donde el buque todavía no llega. Los dibuja el mapa y doblan la
     * ruta pendiente.
     *
     * Lo que manda es `recalado_at` —si ya pasó o no—, no el estado. El estado
     * responde otra pregunta: qué se decidió sobre **la carga**. Marcar el
     * viaje como directo mueve los puertos a `parada_programada`, y al filtrar
     * por estado desaparecían del mapa: la ficha decía "puerto anunciado:
     * Rotterdam" mientras el mapa no mostraba al buque yendo hacia allá.
     *
     * Directo significa que la carga no cambia de barco, no que el barco no
     * pare. La parada programada es, de hecho, la más segura de todas: alguien
     * la confirmó.
     *
     * Se excluye `transbordo` porque ese puerto ya entra por los tramos, con su
     * nave y su fecha, y dibujarlo dos veces lo contaría como dos escalas.
     */
    const previstos = recaladasUnicas
      .filter((r) => !r.recalado_at && r.estado !== "transbordo")
      .map((r) => r.puerto);

    /*
     * Los puertos donde el buque ya paró, en orden de recorrido.
     *
     * Se separan de los previstos por `recalado_at`, no por estado: un puerto
     * puede estar recalado y con el transbordo todavía sin verificar, y
     * dibujarlo por delante del buque sería decir que aún no llegó.
     */
    const recalados = recaladasUnicas
      .filter((r) => Boolean(r.recalado_at))
      .sort((a, b) => (a.recalado_at ?? "").localeCompare(b.recalado_at ?? ""))
      .map((r) => r.puerto);

    const calculado = buildJourney(
      seleccion,
      ais,
      ahora,
      tramos.get(seleccion.id) ?? [],
      previstos,
      recalados,
    );

    /*
     * Mientras la primera lectura AIS está en vuelo, la pantalla no afirma una
     * posición.
     *
     * Sin AIS todavía, la posición sale del respaldo: la coordenada cargada a
     * mano o la estimada. El A00042 tenía una cargada el 11-SEP en Amberes
     * —fuera de la ruta a Génova— y al abrirlo mostraba "105 % del trayecto",
     * "0 MN restantes" y el buque donde no estaba, hasta que llegaba el AIS y
     * todo se corregía solo. El respaldo existe para cuando el AIS **no está**,
     * no para rellenar el segundo que tarda en llegar.
     *
     * Se apagan **las dos líneas**, no solo la recorrida: el tramo pendiente
     * también se calcula desde la posición, así que dejarlo dibujaba una
     * punteada saliendo de un buque que ya no se muestra. Quedaban trozos de
     * ruta flotando hasta que llegaba el AIS.
     *
     * Los puertos, las fechas y el resto de la ficha se quedan: no dependen del
     * AIS y no hay razón para dejar el mapa en blanco.
     */
    const journey =
      aisCargando && !ais
        ? {
            ...calculado,
            position: null,
            progress: null,
            traveled: [],
            remaining: [],
            remainingNm: null,
          }
        : calculado;

    const estado = resolverEstado(seleccion, ais, journey, decision, ahora, recaladasUnicas, modo);
    return {
      journey,
      estado,
      decision,
      alertas: construirAlertas(seleccion, ais, journey, estado, modo),
      eventos: construirTimeline(
        seleccion,
        ais,
        estado,
        decision,
        ahora,
        tramos.get(seleccion.id) ?? [],
        recaladasUnicas,
      ),
    };
  }, [seleccion, ais, aisCargando, decisiones, ahora, tramos, recaladasUnicas, modo]);

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

  /* ---------------------------- Posición manual ---------------------------- */

  /*
   * Cuando el buque no emite AIS, alguien pone la posición a mano.
   *
   * Viene del módulo de seguimiento anterior y se conserva tal cual, RPC
   * incluida: `sync_operaciones_tracking_manual` propaga la coordenada a las
   * demás operaciones del mismo buque y viaje, que es lo correcto —una posición
   * es del barco, no del contenedor— y ahorra cargarla embarque por embarque.
   * Si la RPC falla o la operación no tiene nave, se escribe solo esta fila.
   */
  const guardarCoords = useCallback(
    async (lat: number, lng: number) => {
      if (!supabase || !seleccion) return { ok: false as const, message: tr.manualSaveError };
      if (String(seleccion.nave ?? "").trim()) {
        const { error } = await supabase.rpc("sync_operaciones_tracking_manual", {
          p_nave: seleccion.nave ?? "",
          p_viaje: seleccion.viaje ?? "",
          p_lat: lat,
          p_lng: lng,
          p_clear: false,
        });
        if (!error) {
          await cargar();
          return { ok: true as const };
        }
      }
      const { error } = await supabase
        .from("operaciones")
        .update({
          tracking_manual_lat: lat,
          tracking_manual_lng: lng,
          tracking_manual_updated_at: new Date().toISOString(),
        })
        .eq("id", seleccion.id);
      if (error) return { ok: false as const, message: tr.manualSaveError };
      await cargar();
      return { ok: true as const };
    },
    [supabase, seleccion, cargar, tr],
  );

  const borrarCoords = useCallback(async () => {
    if (!supabase || !seleccion) return { ok: false as const, message: tr.manualSaveError };
    if (String(seleccion.nave ?? "").trim()) {
      const { error } = await supabase.rpc("sync_operaciones_tracking_manual", {
        p_nave: seleccion.nave ?? "",
        p_viaje: seleccion.viaje ?? "",
        p_lat: 0,
        p_lng: 0,
        p_clear: true,
      });
      if (!error) {
        await cargar();
        return { ok: true as const };
      }
    }
    const { error } = await supabase
      .from("operaciones")
      .update({
        tracking_manual_lat: null,
        tracking_manual_lng: null,
        tracking_manual_updated_at: null,
      })
      .eq("id", seleccion.id);
    if (error) return { ok: false as const, message: tr.manualSaveError };
    await cargar();
    return { ok: true as const };
  }, [supabase, seleccion, cargar, tr]);

  /* --------------------------------- Render -------------------------------- */

  if (authLoading) return <ModuleSoftFallback chrome="dashboard" />;

  if (!profile || !puedeVer) {
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
        {/*
          * Halos de fondo: ambiente para una pantalla grande.
          *
          * En un teléfono la vista es una pila de tarjetas, así que el fondo
          * sólo se ve por las separaciones — y ahí estas manchas de color
          * aparecen a trozos, como si se transparentara otra pantalla detrás.
          * El ambiente necesita superficie para leerse como ambiente.
          */}
        <div className="pointer-events-none absolute inset-0 hidden overflow-hidden sm:block" aria-hidden>
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

            {/* Panel de Rastreo: créditos, gasto y lista blanca de naves. Es
                administración del proveedor, no seguimiento de una carga. */}
            {puedeGastar && (
            <button
              type="button"
              onClick={() => setPanelRastreo(true)}
              title={tr.rastreoTitulo}
              className="dash-control motion-interactive inline-flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs font-semibold"
            >
              <Icon icon="lucide:satellite-dish" width={14} height={14} aria-hidden />
              <span className="hidden sm:inline">{tr.rastreoTitulo}</span>
            </button>
            )}

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
              soloLectura={soloLectura}
              puedeGastar={puedeGastar}
              tramos={tramos.get(seleccion.id) ?? []}
              recaladas={recaladasUnicas}
              onVerificarRecalada={
                soloLectura
                  ? undefined
                  : (r: Recalada) => {
                      setRecaladaManual(false);
                      setRecaladaAbierta(r);
                    }
              }
              /*
               * Alta a mano. Solo para quien decide: crea tramos y puede
               * encender el seguimiento de otra nave, que es gasto.
               */
              onAgregarRecalada={
                soloLectura || !puedeDecidir || !seleccion
                  ? undefined
                  : () => {
                      setRecaladaManual(true);
                      setRecaladaAbierta({
                        id: 0,
                        puerto: "",
                        nave: detalle?.journey.naveActual ?? seleccion.nave ?? null,
                        anunciado_at: new Date().toISOString(),
                        eta_anunciada: null,
                        visto_at: new Date().toISOString(),
                        estado: "por_verificar",
                        decidido_at: null,
                        notas: null,
                      });
                    }
              }
              onCargarCoords={soloLectura ? undefined : () => setCoordsAbiertas(true)}
              avisoRecalada={avisoRecalada}
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
              naveIdent={naves.get(claveNave(naveDeLaCarga(seleccion) ?? "")) ?? null}
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
                // Para el cliente, Actualizar vuelve a leer la base: trae lo que
                // el chequeo diario y el trabajo interno hayan guardado, gratis.
                if (identSeleccion && puedeGastar) void consultarAis(identSeleccion, false);
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
              logosNaviera={logosNaviera}
              rows={filasVisibles}
              total={
                vista === "todos"
                  ? filas.length
                  : vista === "arribados"
                    ? conteos.arribados
                    : filas.length - conteos.arribados
              }
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

        {/* Posición del buque cargada a mano, para cuando no hay AIS. */}
        {seleccion && (
          <NavitrackCoordsManual
            open={coordsAbiertas}
            onClose={() => setCoordsAbiertas(false)}
            initialLat={seleccion.tracking_manual_lat ?? null}
            initialLng={seleccion.tracking_manual_lng ?? null}
            vesselLabel={[seleccion.nave, seleccion.viaje, seleccion.contenedor]
              .filter(Boolean)
              .join(" · ")}
            groupHint={
              String(seleccion.nave ?? "").trim() ? tr.manualSyncGroup : tr.manualSyncSingle
            }
            tr={tr as unknown as Parameters<typeof NavitrackCoordsManual>[0]["tr"]}
            onSave={guardarCoords}
            onClear={borrarCoords}
          />
        )}

        {/* Decisión sobre una recalada: qué pasó en el puerto anunciado. */}
      {recaladaAbierta && (
        <NavitrackRecalada
          recalada={recaladaAbierta}
          naves={catalogoNaves}
          puertos={catalogoPuertos}
          operacionId={seleccionId ?? ""}
          naveActual={detalle?.journey.naveActual ?? seleccion?.nave ?? null}
          puedeGastar={puedeGastar}
          manual={recaladaManual}
          tr={tr}
          apiPrefix={apiPrefix}
          onCerrar={() => {
            setRecaladaAbierta(null);
            setRecaladaManual(false);
          }}
          onGuardado={(mensaje) => {
            setRecaladaAbierta(null);
            setRecaladaManual(false);
            setAvisoRecalada(mensaje);
            // El cambio toca tramos, naves y el propio historial: se recarga todo.
            void cargarRecaladas();
            void cargar();
          }}
        />
      )}

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
