"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import type { Locale } from "@/lib/i18n/translations";
import type { NeonTheme } from "@/lib/ui/neonTheme";
import { NavitrackLeyenda, NavitrackMap } from "./NavitrackMap";
import { NavitrackJsonCrudo } from "./NavitrackJsonCrudo";
import { NavieraLogo } from "./NavieraLogo";
import { NavitrackCadena, NavitrackTimelineHorizontal, NavitrackTransbordo } from "./NavitrackJourney";
import { isoDePais, isoDePuerto } from "./navitrack-banderas";
import type { ModoViaje, Recalada } from "./NavitrackItinerario";
import { desvioEta, estadoDesvio, formatoDesvio, sentidoDesvio } from "@/lib/operaciones/desvioEta";
import { etiquetaEstado } from "@/lib/operaciones/estados";
import { fmtFecha, fmtFechaHora, fmtNm, fmtRelativo, interpolar } from "./navitrack-format";
import { formatearDistancia, useUnidadDistancia } from "./navitrack-distancia";
import { formatearVelocidad, useUnidadVelocidad } from "./navitrack-velocidad";
import {
  parseOpDate,
  desvioAnuncio,
  mismoPuerto,
  type AisSnapshot,
  type Journey,
  type NaveIdent,
  type NavitrackOperacion,
  type Tramo,
} from "./navitrack-model";
import {
  ETAPA_META,
  formatearDelta,
  type Alerta,
  type EstadoEmbarque,
  type EventoViaje,
  type NavitrackEtapa,
  type TransbordoDecision,
} from "./navitrack-estado";

type Textos = Record<string, string>;

export const ETAPA_LABEL_KEY: Record<NavitrackEtapa, string> = {
  EN_ORIGEN: "etapaEnOrigen",
  EN_TRANSITO: "etapaEnTransito",
  PROXIMO_DESTINO: "etapaProximo",
  POSIBLE_TRANSBORDO: "etapaPosibleTransbordo",
  TRANSBORDO_CONFIRMADO: "etapaTransbordoConfirmado",
  POSIBLE_RETRASO: "etapaPosibleRetraso",
  ARRIBADO: "etapaArribado",
};

/** Frase corta bajo la etapa: dice qué está pasando, no solo cómo se llama. */
const ETAPA_SUB_KEY: Record<NavitrackEtapa, string> = {
  EN_ORIGEN: "subEnOrigen",
  EN_TRANSITO: "subEnTransito",
  PROXIMO_DESTINO: "subProximo",
  POSIBLE_TRANSBORDO: "subPosibleTransbordo",
  TRANSBORDO_CONFIRMADO: "subTransbordoConfirmado",
  POSIBLE_RETRASO: "subPosibleRetraso",
  ARRIBADO: "subArribado",
};

const ALERTA_TITULO: Record<string, string> = {
  RETRASO: "alertaRetraso",
  TRANSBORDO: "alertaTransbordo",
  POSICION_ANTIGUA: "alertaPosicionAntigua",
  SIN_POSICION: "alertaSinPosicion",
  SIN_RUTA: "alertaSinRuta",
};

const ALERTA_ICON: Record<string, string> = {
  RETRASO: "lucide:clock-alert",
  TRANSBORDO: "lucide:git-branch",
  POSICION_ANTIGUA: "lucide:satellite",
  SIN_POSICION: "lucide:radar",
  SIN_RUTA: "lucide:map-pin-off",
};

/** Cada severidad toma un acento del sistema; el rojo se reserva para lo crítico. */
const ALERTA_TONO: Record<string, string> = {
  info: "teal",
  atencion: "amber",
  critica: "rose",
};

/* --------------------------------- Piezas ---------------------------------- */

function Stat({
  icon,
  label,
  valor,
  sub,
  extra,
  pie,
  className,
}: {
  icon: string;
  label: string;
  valor: React.ReactNode;
  sub?: string | null;
  extra?: React.ReactNode;
  /** Algo bajo el valor: un botón o una barra. */
  pie?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`nt-stat ${className ?? ""}`}>
      <span className="nt-stat-icon">
        <Icon icon={icon} width={15} height={15} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="nt-stat-label block">{label}</span>
        <span className="nt-stat-value mt-0.5 block truncate tabular-nums">{valor}</span>
        {sub && <span className="nt-stat-sub mt-0.5 block truncate">{sub}</span>}
        {pie}
      </span>
      {extra}
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11.5px] font-bold uppercase tracking-wider text-dash-muted sm:text-[10px]">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-semibold text-dash-fg tabular-nums">
        {valor || "—"}
      </p>
    </div>
  );
}

/**
 * La velocidad, que cambia de unidad al hacer clic.
 *
 * El AIS habla en nudos y el ejecutivo también; el cliente que sigue su carga,
 * casi nunca. Es el mismo dato en otra escala, así que en vez de mostrar las dos
 * —y gastar el doble de ancho en una tarjeta que ya va apretada— se alterna.
 *
 * Es un `button` de verdad y no un `span` con `onClick`: así se alcanza con el
 * teclado y el lector de pantalla anuncia que hay algo que hacer acá.
 */
function Velocidad({ nudos, tr }: { nudos: number | null | undefined; tr: Textos }) {
  const { unidad, alternar } = useUnidadVelocidad();
  const texto = formatearVelocidad(nudos, unidad);
  if (texto == null) return <>—</>;
  return (
    <button
      type="button"
      onClick={alternar}
      title={tr.velocidadCambiarUnidad}
      aria-label={`${tr.velocidad} ${texto} — ${tr.velocidadCambiarUnidad}`}
      className="cursor-pointer rounded px-0.5 underline decoration-dotted decoration-dash-muted/60 underline-offset-[3px] transition-colors hover:text-dash-neon focus:outline-none focus-visible:ring-2 focus-visible:ring-dash-neon/60"
    >
      {texto}
    </button>
  );
}

/**
 * Distancia restante: en km por defecto; un clic la pasa a millas náuticas.
 * La unidad es compartida, así que cabecera y tarjeta cambian juntas.
 */
function Distancia({ mn, tr, locale, plantilla }: { mn: number | null | undefined; tr: Textos; locale: string; plantilla?: string }) {
  const { unidad, alternar } = useUnidadDistancia();
  const texto = formatearDistancia(mn, unidad, { km: tr.unidadKm, mn: tr.unidadMillas }, locale);
  if (texto == null) return <>—</>;
  const visible = plantilla ? interpolar(plantilla, { d: texto }) : texto;
  return (
    <button
      type="button"
      onClick={alternar}
      title={tr.distanciaCambiarUnidad}
      aria-label={`${visible} — ${tr.distanciaCambiarUnidad}`}
      className="cursor-pointer rounded px-0.5 underline decoration-dotted decoration-dash-muted/60 underline-offset-[3px] transition-colors hover:text-dash-neon focus:outline-none focus-visible:ring-2 focus-visible:ring-dash-neon/60"
    >
      {visible}
    </button>
  );
}

/** Copia el identificador del embarque, que es lo que se pega en un correo. */
function BotonCopiar({ texto, tr }: { texto: string; tr: Textos }) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const id = window.setTimeout(() => setCopiado(false), 1800);
    return () => window.clearTimeout(id);
  }, [copiado]);

  const copiar = useCallback(() => {
    navigator.clipboard
      ?.writeText(texto)
      .then(() => setCopiado(true))
      .catch(() => {
        /* Sin permiso de portapapeles no se avisa nada: no es una acción crítica. */
      });
  }, [texto]);

  return (
    <button
      type="button"
      onClick={copiar}
      title={copiado ? tr.copiado : tr.copiar}
      aria-label={copiado ? tr.copiado : tr.copiar}
      className="motion-interactive shrink-0 rounded-md p-1 text-dash-muted transition-colors hover:text-dash-neon"
    >
      <Icon icon={copiado ? "lucide:check" : "lucide:copy"} width={15} height={15} aria-hidden />
    </button>
  );
}

/* --------------------------------- Vista ----------------------------------- */

type Pestana = "ruta" | "datos" | "buque" | "escalas" | "transbordo";

export type Escala = {
  puerto: string | null;
  locode: string | null;
  arribo: string | null;
  zarpe: string | null;
};

type ShipmentProps = {
  /**
   * Vista del cliente: sigue su carga y no decide sobre ella.
   *
   * Apaga lo que resuelve o gasta —decidir una recalada, el flujo de
   * transbordo, traer escalas del proveedor— y deja la pizarra completa: dónde
   * va, cuándo llega y qué ha pasado hasta ahora.
   */
  soloLectura?: boolean;
  /**
   * Puede consultar al proveedor AIS, o sea gastar créditos. Solo el superadmin.
   *
   * Es un eje distinto de `soloLectura`: un ejecutivo decide sobre el viaje pero
   * no gasta, así que ve la pizarra completa sin la pestaña de escalas.
   */
  puedeGastar?: boolean;
  /** Tramos del viaje. Vacío = viaje directo. */
  tramos: Tramo[];
  /** Puertos por donde pasa o pasará la carga, con lo que consta de cada uno. */
  recaladas: Recalada[];
  /** Itinerario cargado: directo o con transbordo. Null si nadie lo indicó. */
  modoViaje: ModoViaje | null;
  /**
   * Abre la ventana del itinerario. `foco` resalta un transbordo, cuando se
   * abre porque la carga llegó a él sin que se sepa a qué nave pasa.
   * Ausente para quien no decide.
   */
  onEditarItinerario?: (foco?: string | null) => void;
  /** Documentos cargados de este embarque. Null mientras no se sabe. */
  documentosCount: number | null;
  /** Enlace a Documentos, ya abierto en este embarque. */
  documentosHref: string;
  /** Resultado de la última decisión, para confirmarla en pantalla. */
  avisoRecalada: string | null;
  op: NavitrackOperacion;
  ais: AisSnapshot | null;
  /** La lectura del proveedor sin traducir, para el botón "Ver JSON". */
  aisCrudo: { crudo: Record<string, unknown> | null; consultadoAt: string | null } | null;
  journey: Journey;
  estado: EstadoEmbarque;
  alertas: Alerta[];
  eventos: EventoViaje[];
  decision: TransbordoDecision | null;
  navieraLogoUrl: string | null;
  /** IMO/MMSI del catálogo, para la ficha del buque. */
  naveIdent: NaveIdent | null;
  /** Escalas guardadas del buque; se piden al proveedor con un botón aparte. */
  escalas: Escala[];
  escalasCargando: boolean;
  escalasEdadH: number | null;
  escalasPuedeConsultar: boolean;
  onTraerEscalas: () => void;
  locale: Locale;
  theme: NeonTheme;
  tr: Textos;
  onBack: () => void;
  onRefresh: () => void;
  refrescando: boolean;
  /** Posición dentro de la lista visible, para moverse sin volver atrás. */
  indiceEnLista: number;
  totalEnLista: number;
  onAnterior: () => void;
  onSiguiente: () => void;
  transbordoGuardando: boolean;
  transbordoError: string | null;
  onConfirmarTransbordo: () => void;
  onDescartarTransbordo: () => void;
};

/**
 * Pizarra del embarque: todo en una pantalla, sin scroll de página.
 *
 * El alto se reparte con flex y `min-h-0`: encabezado, historia del viaje (una
 * línea horizontal) y franja de indicadores son fijos, y el bloque central
 * (mapa + columna derecha) se queda con lo que sobra. Lo único que se desplaza
 * por dentro son los datos de la operación, que es la lista de largo variable.
 * Bajo `lg` la pizarra no cabe y la vista vuelve a ser una columna con scroll,
 * que es lo honesto en un teléfono.
 */
export function NavitrackShipment({
  soloLectura = false,
  puedeGastar = false,
  op,
  ais,
  aisCrudo,
  journey,
  estado,
  alertas,
  tramos,
  recaladas,
  modoViaje,
  onEditarItinerario,
  documentosCount,
  documentosHref,
  avisoRecalada,
  eventos,
  decision,
  navieraLogoUrl,
  naveIdent,
  escalas,
  escalasCargando,
  escalasEdadH,
  escalasPuedeConsultar,
  onTraerEscalas,
  locale,
  theme,
  tr,
  onBack,
  onRefresh,
  refrescando,
  indiceEnLista,
  totalEnLista,
  onAnterior,
  onSiguiente,
  transbordoGuardando,
  transbordoError,
  onConfirmarTransbordo,
  onDescartarTransbordo,
}: ShipmentProps) {
  const meta = ETAPA_META[estado.etapa];
  const enCurso = estado.etapa !== "ARRIBADO" && estado.etapa !== "EN_ORIGEN";
  /*
   * La pestaña de transbordo es el lugar donde se decide, así que no existe
   * para el cliente. Que la carga cambió de buque sí lo ve: la cadena de
   * tramos en "Información del buque" y la historia del viaje lo cuentan.
   */
  const mostrarTransbordo =
    !soloLectura && (estado.transbordoSospechado || decision?.estado === "confirmado");

  const [pestana, setPestana] = useState<Pestana>("ruta");
  const [jsonAbierto, setJsonAbierto] = useState(false);
  /*
   * Menú "Opciones": dónde abrirlo, o null si está cerrado.
   *
   * Se monta en `body` con posición fija bajo el botón, no dentro de la
   * cabecera. Adentro quedaba tapado por el historial del viaje: cada tarjeta
   * forma su propia capa (la animación de entrada deja un `transform`), y la
   * que viene después en la página se pinta encima sin importar el z-index del
   * menú. Es el mismo arreglo que la ventana de "Ver JSON".
   */
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const menuAbierto = menuPos != null;
  const setMenuAbierto = (abrir: boolean) => {
    if (!abrir) return setMenuPos(null);
    const r = menuRef.current?.getBoundingClientRect();
    if (r) setMenuPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
  };
  /** Se incrementa para pedirle al mapa que se acerque al buque. */
  const [enfocarSolicitud, setEnfocarSolicitud] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  /*
   * Se cierra al hacer clic afuera, con Escape, o si la página se desplaza o
   * cambia de tamaño: con posición fija, el menú quedaría flotando lejos del
   * botón que lo abrió.
   */
  useEffect(() => {
    if (!menuAbierto) return;
    const cerrar = () => setMenuPos(null);
    const alClic = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !menuPanelRef.current?.contains(t)) cerrar();
    };
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    document.addEventListener("mousedown", alClic);
    document.addEventListener("keydown", alTeclear);
    window.addEventListener("resize", cerrar);
    window.addEventListener("scroll", cerrar, true);
    return () => {
      document.removeEventListener("mousedown", alClic);
      document.removeEventListener("keydown", alTeclear);
      window.removeEventListener("resize", cerrar);
      window.removeEventListener("scroll", cerrar, true);
    };
  }, [menuAbierto]);

  const relativos = {
    haceMenosDeUnMinuto: tr.haceMenosDeUnMinuto,
    haceMinutos: tr.haceMinutos,
    haceHoras: tr.haceHoras,
    haceDias: tr.haceDias,
    haceUnMinuto: tr.haceUnMinuto,
    haceUnaHora: tr.haceUnaHora,
    haceUnDia: tr.haceUnDia,
  };
  const actualizado = fmtRelativo(journey.position?.at ?? null, relativos);
  const actualizadoExacto = fmtFechaHora(journey.position?.at ?? null, locale);
  // Si la sospecha se resuelve estando en esa pestaña, no dejar una vista vacía.
  useEffect(() => {
    if (pestana === "transbordo" && !mostrarTransbordo) setPestana("ruta");
  }, [pestana, mostrarTransbordo]);

  const etaErp = fmtFecha(estado.eta.erp, locale);
  const etaAis = fmtFechaHora(estado.eta.ais, locale);
  const delta = estado.eta.deltaHoras != null ? formatearDelta(estado.eta.deltaHoras) : null;
  const etaTono =
    estado.eta.severidad === "alta" ? "rose" : estado.eta.severidad === "leve" ? "amber" : "teal";

  const titulo = op.contenedor || op.booking || op.ref_asli || tr.embarque;
  /*
   * Sin avance calculado no se muestra un cero.
   *
   * `progress` viene en null mientras la primera lectura AIS está en vuelo, y
   * un 0 % ahí afirma que la carga no se ha movido, que es tan falso como el
   * 105 % que se mostraba antes. La barra queda vacía y el número, en guion.
   */
  const pct = journey.progress?.pct ?? null;
  const restantes = fmtNm(journey.remainingNm, locale);
  /*
   * Tramo en curso: el primero cuya llegada todavía no pasó.
   *
   * De él salen el último y el próximo puerto que se muestran arriba. En un
   * viaje directo no hay tramos y todo cae en los datos de la operación.
   */
  const tramoEnCurso = (() => {
    if (!tramos.length) return null;
    const hoy = new Date().toISOString().slice(0, 10);
    const ordenados = [...tramos].sort((a, b) => a.orden - b.orden);
    return ordenados.find((t) => !(t.eta && t.eta < hoy)) ?? ordenados[ordenados.length - 1];
  })();

  /*
   * Tramo inicial, y solo cuando hay cadena.
   *
   * En un viaje directo la nave inicial **es** la actual, y repetirla sería una
   * tarjeta que ocupa lugar sin decir nada. La tarjeta aparece justo cuando la
   * pregunta "¿en qué barco salió?" deja de tener la misma respuesta que "¿en
   * cuál va?".
   */
  /*
   * Cuánto se desvió un tramo respecto de lo anunciado.
   *
   * La naviera anuncia en UTC y casi nunca acierta: el atraque depende del
   * clima y de que haya sitio en el puerto. Lo anunciado no se pisa nunca —es
   * la promesa contra la que se mide—, y la llegada real la deja el AIS solo,
   * sin gastar créditos ni pedirle nada a nadie.
   *
   * Sin hora anunciada se dice en días: "+13 h" contra un anuncio que solo dijo
   * "el 20" sería inventar una precisión que el dato no tiene.
   */
  const desvioDe = (t: { pod: string | null; eta: string | null; eta_hora: string | null }): string | null => {
    const llegada = recaladas.find((r) => mismoPuerto(r.puerto, t.pod) && r.recalado_at)?.recalado_at;
    const d = desvioAnuncio(t.eta, t.eta_hora, llegada ?? null);
    if (!d) return null;
    if (d.soloDias) {
      const dias = Math.round(d.horas / 24);
      return dias === 0 ? tr.recaladaEnFecha : `${dias > 0 ? "+" : ""}${dias} d`;
    }
    const h = Math.round(d.horas);
    return h === 0 ? tr.recaladaEnFecha : `${h > 0 ? "+" : ""}${h} h`;
  };

  const hayCadena = tramos.length > 1;
  const tramoInicial = hayCadena
    ? [...tramos].sort((a, b) => a.orden - b.orden)[0]
    : null;

  /*
   * Próximo puerto: lo que el buque declara ahora mismo.
   *
   * Se prefiere la lectura del AIS porque es la más reciente; si no la hay, el
   * primer puerto anotado donde el buque todavía no estuvo, que es el mismo
   * dato guardado.
   */
  const proximoPuerto = (() => {
    const pendiente = recaladas.find((r) => !r.recalado_at);
    const nombre = (ais?.destination ?? pendiente?.puerto ?? "").trim();
    if (!nombre) return null;
    const eta = ais?.destination && ais?.eta
      ? ais.eta
      : pendiente?.eta_anunciada
        ? new Date(pendiente.eta_anunciada)
        : null;
    return { nombre, eta };
  })();

  /*
   * Los transbordos del itinerario, con lo anunciado y lo real de cada uno.
   *
   * Cada transbordo es el punto donde termina un tramo y empieza el siguiente:
   * del que termina sale la llegada anunciada; del que empieza, la nave que
   * recibe la carga. Lo real —cuándo llegó y cuándo zarpó el buque— lo deja el
   * AIS en las recaladas, sin gastar nada.
   */
  const hoyISO = new Date().toISOString().slice(0, 10);
  const transbordosDelViaje = (() => {
    const t = [...tramos].sort((a, b) => a.orden - b.orden);
    const salida: {
      puerto: string;
      nave: string | null;
      naveAnterior: string | null;
      llegada: string | null;
      llegadaHora: string | null;
      real: Recalada | null;
      llego: boolean;
    }[] = [];
    for (let i = 1; i < t.length; i += 1) {
      const puerto = (t[i].pol ?? t[i - 1].pod ?? "").trim();
      if (!puerto) continue;
      const real = recaladas.find((r) => mismoPuerto(r.puerto, puerto)) ?? null;
      salida.push({
        puerto,
        nave: t[i].nave,
        naveAnterior: t[i - 1].nave,
        llegada: t[i - 1].eta,
        llegadaHora: t[i - 1].eta_hora,
        real,
        // Llegó si el AIS lo vio ahí, o si ya pasó la fecha que anunció la naviera.
        llego: Boolean(real?.recalado_at) || Boolean(t[i - 1].eta && t[i - 1].eta! <= hoyISO),
      });
    }
    return salida;
  })();

  /*
   * Transbordo de la tarjeta: el próximo al que todavía no llega la carga; si
   * ya pasó por todos, el último. Es el que responde "¿dónde cambia de barco
   * y a cuál?".
   */
  const transbordoTarjeta = (() => {
    if (!transbordosDelViaje.length) return null;
    const i = transbordosDelViaje.findIndex((x) => !x.llego);
    const indice = i < 0 ? transbordosDelViaje.length - 1 : i;
    return { ...transbordosDelViaje[indice], n: indice + 1, total: transbordosDelViaje.length };
  })();

  /** El primer transbordo al que llegó la carga sin que se sepa a qué nave pasa. */
  const faltaNaveEn = transbordosDelViaje.find((x) => !x.nave && x.llego) ?? null;

  /*
   * Lo que la ficha le pide a quien decide. Es una sola cosa a la vez, y la
   * más urgente primero: una carga en el transbordo sin nave no tiene a quién
   * seguirse; un embarque sin itinerario, solo no sabe todavía qué preguntar.
   */
  const pendienteItinerario =
    !soloLectura && onEditarItinerario && estado.etapa !== "ARRIBADO"
      ? faltaNaveEn
        ? { texto: interpolar(tr.itPendienteNave, { puerto: faltaNaveEn.puerto }), foco: faltaNaveEn.puerto }
        : modoViaje == null
          ? { texto: tr.itSinDefinir, foco: null }
          : null
      : null;

  const banderaPol = isoDePuerto(op.pol);
  const etdFmt = fmtFecha(parseOpDate(op.etd), locale);
  const banderaPod = isoDePais(op.pais) ?? isoDePuerto(op.pod);
  const esReal = journey.position?.source === "AIS";

  /*
   * Datos de la operación, agrupados por la pregunta que responden.
   *
   * Un dato vacío no se muestra: esta columna reemplaza a la historia del
   * viaje, y una grilla de guiones ocuparía el lugar sin decir nada. Si un
   * grupo queda sin nada, desaparece entero.
   */
  const numero = (v: string | number | null, unidad: string) => {
    if (v == null || String(v).trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? `${n.toLocaleString(locale === "en" ? "en-US" : "es-CL")} ${unidad}`.trim() : String(v);
  };
  const zarpeReal = op.zarpe_real_at ? fmtFechaHora(new Date(op.zarpe_real_at), locale) : null;
  type GrupoDatos = { titulo: string; datos: [string, React.ReactNode][] };
  const todosLosDatos: GrupoDatos[] = [
    {
      titulo: tr.datosGrupoEmbarque,
      datos: [
        [tr.datosRefAsli, op.ref_asli],
        [tr.booking, op.booking],
        [tr.datosContenedor, op.contenedor],
        [tr.datosSello, op.sello],
        [tr.cliente, op.cliente],
        [tr.datosConsignatario, op.consignatario],
        [tr.datosEjecutivo, op.ejecutivo],
        [tr.datosIncoterm, op.incoterm],
        [tr.datosEstado, op.estado_operacion ? etiquetaEstado(op.estado_operacion) : null],
      ],
    },
    {
      titulo: tr.datosGrupoCarga,
      datos: [
        [tr.datosEspecie, op.especie],
        [tr.datosTipoUnidad, op.tipo_unidad],
        [tr.datosTemperatura, numero(op.temperatura, "°C")],
        [tr.datosVentilacion, numero(op.ventilacion, "")],
        [tr.datosPallets, numero(op.pallets, "")],
        [tr.datosPesoBruto, numero(op.peso_bruto, "kg")],
        [tr.datosPesoNeto, numero(op.peso_neto, "kg")],
        [tr.datosDeposito, op.deposito],
      ],
    },
    {
      titulo: tr.datosGrupoFechas,
      datos: [
        [tr.evStacking, fmtFecha(parseOpDate(op.ingreso_stacking), locale)],
        [tr.evCorte, fmtFecha(parseOpDate(op.corte_documental), locale)],
        [tr.evFinStacking, fmtFecha(parseOpDate(op.fin_stacking), locale)],
        [tr.datosEtd, etdFmt],
        [tr.datosZarpeReal, zarpeReal],
        [tr.colEta, etaErp],
        [tr.datosTransito, op.tt != null ? interpolar(tr.datosDias, { n: String(op.tt) }) : null],
      ],
    },
  ];
  const gruposDatos = todosLosDatos
    .map((g) => ({ ...g, datos: g.datos.filter(([, v]) => v != null && v !== "") }))
    .filter((g) => g.datos.length > 0);

  /*
   * Fecha bajo cada puerto del mapa: lo ocurrido si consta, si no lo anunciado.
   *
   * El origen lleva el zarpe real o el ETD; el destino, la ETA comprometida; una
   * escala, su llegada real o la anunciada por el buque; un transbordo sin
   * recalada, la llegada que anunció la naviera para ese tramo.
   */
  const fechaDePuerto = (nombre: string): string | null => {
    if (!nombre) return null;
    if (mismoPuerto(nombre, journey.origen.nombre)) {
      return fmtFecha(op.zarpe_real_at ? new Date(op.zarpe_real_at) : parseOpDate(op.etd), locale);
    }
    if (mismoPuerto(nombre, journey.destino.nombre)) return etaErp;
    const r = recaladas.find((x) => mismoPuerto(x.puerto, nombre));
    if (r?.recalado_at) return fmtFecha(new Date(r.recalado_at), locale);
    if (r?.eta_anunciada) return fmtFecha(new Date(r.eta_anunciada), locale);
    const t = tramos.find((x) => mismoPuerto(x.pod, nombre));
    return t?.eta ? fmtFecha(parseOpDate(t.eta), locale) : null;
  };

  const mapLabels = {
    origen: tr.origen,
    destino: tr.destino,
    posicionReal: tr.posicionReal,
    posicionEstimada: tr.posicionEstimada,
    recorrido: tr.legendaRecorrido,
    restante: tr.legendaRestante,
    puerto: tr.legendaPuerto,
    cargando: tr.mapaCargando,
    sinWebgl: tr.mapaSinWebgl,
    sinRuta: tr.mapaSinRuta,
    pantallaCompleta: tr.pantallaCompleta,
    salirPantallaCompleta: tr.salirPantallaCompleta,
    acercarBuque: tr.mapaAcercarBuque,
    verRuta: tr.mapaVerRuta,
  };

  const pestanas: { id: Pestana; label: string; icon: string }[] = [
    { id: "ruta", label: tr.tabRuta, icon: "lucide:map" },
    ...(gruposDatos.length || transbordosDelViaje.length
      ? [{ id: "datos" as const, label: tr.datosOperacion, icon: "lucide:clipboard-list" }]
      : []),
    { id: "buque", label: tr.tabBuque, icon: "lucide:ship" },
    // Escalas le pide al proveedor el historial del buque: es la consulta más
    // cara del plan, así que la ve quien puede gastarla.
    ...(puedeGastar
      ? [{ id: "escalas" as const, label: tr.tabEscalas, icon: "lucide:anchor" }]
      : []),
    ...(mostrarTransbordo
      ? [{ id: "transbordo" as const, label: tr.evTransbordo, icon: "lucide:git-branch" }]
      : []),
  ];

  return (
    <div className="motion-view-section flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-3 pb-5 sm:p-2.5 lg:overflow-hidden">
      {/* Barra superior: salir del detalle y recorrer la lista sin volver a ella. */}
      <div className="flex shrink-0 items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="motion-interactive inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[12.5px] font-semibold text-dash-muted transition-colors hover:text-dash-fg"
        >
          <Icon icon="lucide:arrow-left" width={16} height={16} aria-hidden />
          <span className="max-sm:sr-only">{tr.volverEmbarques}</span>
        </button>
        {indiceEnLista >= 0 && totalEnLista > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onAnterior}
              disabled={indiceEnLista <= 0}
              title={tr.anteriorEmbarque}
              aria-label={tr.anteriorEmbarque}
              className="dash-control motion-interactive inline-flex h-9 w-9 items-center justify-center disabled:opacity-35 sm:h-7 sm:w-7"
            >
              <Icon icon="lucide:chevron-left" width={15} height={15} aria-hidden />
            </button>
            <span className="min-w-[3.5rem] text-center text-[12.5px] font-semibold text-dash-muted tabular-nums sm:min-w-[4.5rem] sm:text-[11px]">
              {interpolar(tr.posicionLista, {
                i: String(indiceEnLista + 1),
                n: String(totalEnLista),
              })}
            </span>
            <button
              type="button"
              onClick={onSiguiente}
              disabled={indiceEnLista >= totalEnLista - 1}
              title={tr.siguienteEmbarque}
              aria-label={tr.siguienteEmbarque}
              className="dash-control motion-interactive inline-flex h-9 w-9 items-center justify-center disabled:opacity-35 sm:h-7 sm:w-7"
            >
              <Icon icon="lucide:chevron-right" width={15} height={15} aria-hidden />
            </button>
          </div>
        )}
      </div>

      {/*
        * Cabecera: identidad, etapa y avance en una sola fila.
        *
        * La ruta, la nave y la ETA bajaron a "Información del embarque": acá
        * queda lo que responde "¿cuál es y cómo va?" de un vistazo.
        */}
      <header className={`dash-card dash-card-static nt-tone--${meta.tono} shrink-0 px-4 py-3`}>
        <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
          <div className="flex min-w-0 items-center gap-3.5 max-sm:w-full">
            <NavieraLogo nombre={op.naviera} logoUrl={navieraLogoUrl} size={52} />
            <div className="min-w-0">
              <p className="nt-eyebrow">{tr.embarque}</p>
              <div className="flex items-center gap-1.5">
                <h1 className="dash-title truncate text-xl font-extrabold tracking-tight sm:text-[1.6rem] sm:leading-tight">
                  {titulo}
                </h1>
                <BotonCopiar texto={titulo} tr={tr} />
              </div>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[13px]">
                {op.booking && (
                  <span className="inline-flex min-w-0 items-baseline gap-1.5">
                    <span className="nt-eyebrow">{tr.booking}</span>
                    <span className="truncate font-bold text-dash-fg tabular-nums">{op.booking}</span>
                  </span>
                )}
                {op.booking && op.cliente && <span className="text-dash-muted" aria-hidden>|</span>}
                {op.cliente && (
                  <span className="inline-flex min-w-0 items-baseline gap-1.5">
                    <span className="nt-eyebrow">{tr.cliente}</span>
                    <span className="truncate font-bold text-dash-fg">{op.cliente}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0 max-sm:w-full">
            {/*
              * Cuando falta algo del itinerario, el propio estado es el botón
              * para resolverlo: es donde el operador ya está mirando.
              */}
            {pendienteItinerario ? (
              <button
                type="button"
                onClick={() => onEditarItinerario?.(pendienteItinerario.foco)}
                className="motion-interactive block cursor-pointer"
                title={tr.itDefinir}
              >
                <span className="nt-stage">
                  <span className="nt-stage-icon !h-6 !w-6">
                    <Icon icon={meta.icon} width={13} height={13} aria-hidden />
                  </span>
                  {tr[ETAPA_LABEL_KEY[estado.etapa]]}
                  <Icon icon="lucide:pencil" width={12} height={12} className="opacity-70" aria-hidden />
                </span>
                <span className="mt-1 block max-w-[220px] truncate text-center text-[11px] font-semibold text-amber-400">
                  {pendienteItinerario.texto}
                </span>
              </button>
            ) : (
              <>
                <span className="nt-stage">
                  {enCurso ? (
                    <span className="nt-live-dot" aria-hidden />
                  ) : (
                    <span className="nt-stage-icon !h-6 !w-6">
                      <Icon icon={meta.icon} width={13} height={13} aria-hidden />
                    </span>
                  )}
                  {tr[ETAPA_LABEL_KEY[estado.etapa]]}
                </span>
                <p className="mt-1 text-center text-[11.5px] text-dash-muted">{tr[ETAPA_SUB_KEY[estado.etapa]]}</p>
              </>
            )}
          </div>

          <div className="min-w-[min(100%,240px)] flex-1">
            <p className="text-[13px] text-dash-muted">
              <span className="nt-accent-fg text-lg font-extrabold tabular-nums">{pct == null ? "—" : `${pct}%`}</span>{" "}
              {tr.delTrayecto}
            </p>
            <div className="nt-head-rail mt-1.5">
              <div className="nt-head-rail-fill" style={{ width: `${pct ?? 0}%` }} />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4 max-sm:w-full max-sm:justify-between">
            <div className="text-right max-sm:text-left">
              {restantes && (
                <p className="text-[14px] font-bold text-dash-fg tabular-nums">
                  <Distancia mn={journey.remainingNm} tr={tr} locale={locale} plantilla={tr.restan} />
                </p>
              )}
              {actualizado && (
                <p className="mt-0.5 flex items-center justify-end gap-1.5 text-[11.5px] text-dash-muted max-sm:justify-start">
                  <Icon icon="lucide:refresh-cw" width={12} height={12} aria-hidden />
                  {tr.ultimaActualizacion}:{" "}
                  <span className="nt-tip" data-tip={actualizadoExacto ?? ""}>
                    {actualizado}
                  </span>
                </p>
              )}
            </div>

            {/*
              * Las acciones de la ficha, juntas en un menú.
              *
              * Ninguna es la razón por la que alguien abre el embarque: se usan
              * a veces, y sueltas en la cabecera le quitaban lugar a lo que sí
              * se mira siempre.
              */}
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuAbierto(!menuAbierto)}
                aria-haspopup="menu"
                aria-expanded={menuAbierto}
                className="dash-control motion-interactive inline-flex h-11 items-center gap-2 px-3.5 text-[13px] font-bold"
              >
                <Icon icon="lucide:more-vertical" width={16} height={16} aria-hidden />
                {tr.opciones}
              </button>
              {menuPos &&
                typeof document !== "undefined" &&
                createPortal(
                  /* Fuera de la ficha se pierde el tema: el envoltorio lo trae consigo. */
                  <div
                    className="dash-neon tracking-brand navitrack"
                    data-theme={theme}
                    style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 300, background: "none", minHeight: 0 }}
                  >
                    <div ref={menuPanelRef} role="menu" className="nt-menu" style={{ position: "static" }}>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={refrescando}
                        onClick={() => {
                          setMenuAbierto(false);
                          onRefresh();
                        }}
                        className="nt-menu-item"
                      >
                        <Icon
                          icon="lucide:refresh-cw"
                          width={14}
                          height={14}
                          className={refrescando ? "animate-spin" : ""}
                          aria-hidden
                        />
                        {tr.refresh}
                      </button>
                      {onEditarItinerario && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMenuAbierto(false);
                            onEditarItinerario();
                          }}
                          className="nt-menu-item"
                        >
                          <Icon icon="lucide:route" width={14} height={14} aria-hidden />
                          {tr.itEditar}
                        </button>
                      )}
                      {/* La respuesta cruda del proveedor es para personal interno. */}
                      {!soloLectura && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMenuAbierto(false);
                            setJsonAbierto(true);
                          }}
                          className="nt-menu-item"
                        >
                          <Icon icon="lucide:code-2" width={14} height={14} aria-hidden />
                          {tr.jsonBoton}
                        </button>
                      )}
                    </div>
                  </div>,
                  document.body,
                )}
            </div>
          </div>
        </div>
      </header>

      {/*
        * Historial del viaje, de lado a lado sobre el mapa.
        *
        * Se lee en el mismo sentido que la ruta: lo cumplido a la izquierda, lo
        * que falta a la derecha.
        */}
      <section className="dash-card dash-card-static shrink-0 overflow-hidden">
        <div className="flex items-center gap-2 px-4 pt-3">
          <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-dash-fg">{tr.historiaViaje}</h2>
          {/* Confirmación de la última decisión: dice a qué nave pasó la carga. */}
          {avisoRecalada && (
            <p className="min-w-0 truncate rounded-md border border-dash-neon/35 bg-dash-neon/10 px-2 py-0.5 text-[11px] text-dash-fg">
              {avisoRecalada}
            </p>
          )}
        </div>
        <div className="px-2 pb-3 pt-1.5">
          <NavitrackTimelineHorizontal eventos={eventos} locale={locale} tr={tr} />
        </div>
      </section>

      {/*
        * Bloque central: mapa a la izquierda, información a la derecha.
        *
        * `flex-1 min-h-0` es lo que sostiene la pizarra de escritorio, donde no
        * hay scroll de página y este bloque absorbe el alto sobrante. En el
        * teléfono la vista es una columna con scroll y cada tarjeta toma su alto
        * natural.
        */}
      <div className="grid grid-cols-1 gap-2.5 sm:min-h-0 sm:flex-1 lg:grid-cols-[1.22fr_1fr]">
        <section className="dash-card dash-card-static flex flex-col overflow-hidden sm:min-h-0">
          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5">
            <div role="tablist" className="flex items-center gap-1.5 overflow-x-auto">
              {pestanas.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={pestana === p.id}
                  onClick={() => setPestana(p.id)}
                  className="nt-tab"
                >
                  <Icon icon={p.icon} width={15} height={15} aria-hidden />
                  {p.label}
                </button>
              ))}
            </div>
            {/* La leyenda va en la barra y no sobre el mapa: no tapa la ruta. */}
            {pestana === "ruta" && (
              <NavitrackLeyenda esReal={esReal} labels={mapLabels} className="ml-auto max-xl:hidden" />
            )}
          </div>

          {pestana === "ruta" && (
            <div className="relative h-[52dvh] min-h-[300px] w-full shrink-0 border-t border-dash-border lg:h-auto lg:min-h-0 lg:flex-1">
              <NavitrackMap
                journey={journey}
                vesselName={journey.naveActual ?? op.nave ?? ""}
                vesselSpeed={ais?.speed ?? null}
                theme={theme}
                labels={mapLabels}
                fechaDePuerto={fechaDePuerto}
                mostrarLeyenda={false}
                enfocarSolicitud={enfocarSolicitud}
              />
            </div>
          )}

          {pestana === "datos" && (
            <div className="min-h-0 flex-1 overflow-y-auto border-t border-dash-border px-4 py-3.5">
              {gruposDatos.map((g, gi) => (
                <section key={g.titulo} className={gi > 0 ? "mt-3.5 border-t border-dash-border pt-3" : ""}>
                  <p className="nt-eyebrow pb-2">{g.titulo}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
                    {g.datos.map(([label, valor]) => (
                      <Dato key={label} label={label} valor={valor} />
                    ))}
                  </div>
                </section>
              ))}

              {/*
                * Los transbordos, con lo prometido y lo ocurrido.
                *
                * El historial ya cuenta que hubo un cambio de nave; esta lista
                * dice lo que él no alcanza: qué anunció la naviera para cada
                * transbordo y qué hizo de verdad el buque según el AIS.
                */}
              {transbordosDelViaje.length > 0 && (
                <section className="mt-4">
                  <p className="pb-1.5 text-[11.5px] font-bold uppercase tracking-wider text-dash-muted sm:text-[10px]">
                    {tr.itTransbordosTitulo}
                  </p>
                  <ul className="divide-y divide-dash-border rounded-lg border border-dash-border">
                    {transbordosDelViaje.map((x) => {
                      const faltaNave = !x.nave && x.llego;
                      const d = desvioDe({ pod: x.puerto, eta: x.llegada, eta_hora: x.llegadaHora });
                      return (
                        <li key={x.puerto} className="px-2.5 py-2">
                          <div className="flex items-center gap-2">
                            <Icon
                              icon="lucide:git-branch"
                              width={13}
                              height={13}
                              className={faltaNave ? "shrink-0 text-amber-400" : "shrink-0 text-dash-muted"}
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12.5px] font-bold text-dash-fg">{x.puerto}</span>
                              <span className="block truncate text-[10.5px] text-dash-muted">
                                {(x.naveAnterior ?? "—") + " → "}
                                {x.nave ?? <em>{tr.itNavePorConfirmar}</em>}
                              </span>
                            </span>
                            {faltaNave && onEditarItinerario ? (
                              <button
                                type="button"
                                onClick={() => onEditarItinerario(x.puerto)}
                                className="dash-control motion-interactive shrink-0 px-2 py-1 text-[11px] font-bold"
                              >
                                {tr.itIndicarNave}
                              </button>
                            ) : null}
                          </div>
                          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 pl-5 text-[10.5px] text-dash-muted tabular-nums">
                            <span>
                              {tr.recaladaAnunciado}:{" "}
                              {x.llegada
                                ? `${fmtFecha(parseOpDate(x.llegada), locale) ?? "—"}${
                                    x.llegadaHora ? ` ${x.llegadaHora.slice(0, 5)} UTC` : ""
                                  }`
                                : "—"}
                            </span>
                            <span>
                              {tr.itLlego}:{" "}
                              {x.real?.recalado_at ? (fmtFechaHora(new Date(x.real.recalado_at), locale) ?? "—") : "—"}
                            </span>
                            {x.real?.zarpe_at && (
                              <span>
                                {tr.itZarpo}: {fmtFechaHora(new Date(x.real.zarpe_at), locale) ?? "—"}
                              </span>
                            )}
                            {d && <span className="font-bold text-dash-fg">{d}</span>}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </div>
          )}

          {pestana === "buque" && (
            <div className="min-h-0 flex-1 overflow-y-auto border-t border-dash-border px-4 py-3.5">
              <div className="flex items-center gap-3">
                <NavieraLogo nombre={op.naviera} logoUrl={navieraLogoUrl} size={40} />
                <div className="min-w-0">
                  {/* La nave que lleva la carga ahora, que con transbordo no es `op.nave`. */}
                  <p className="truncate text-lg font-extrabold tracking-tight text-dash-fg">
                    {journey.naveActual || op.nave || "—"}
                  </p>
                  <p className="truncate text-[12px] text-dash-muted">
                    {op.naviera || "—"}
                    {journey.viajeActual ? ` · ${journey.viajeActual}` : ""}
                  </p>
                </div>
              </div>

              <NavitrackCadena escalas={journey.escalas} tramoActual={journey.tramoActual} tr={tr} />

              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5 border-t border-dash-border pt-3.5 sm:grid-cols-3">
                <Dato label="IMO" valor={naveIdent?.imo ?? null} />
                <Dato label="MMSI" valor={naveIdent?.mmsi ?? null} />
                <Dato label={tr.viaje} valor={op.viaje} />
                <Dato label={tr.velocidad} valor={<Velocidad nudos={ais?.speed} tr={tr} />} />
                <Dato
                  label={tr.rumbo}
                  valor={ais?.course != null ? `${Math.round(ais.course)}°` : null}
                />
                <Dato label={tr.destinoAis} valor={ais?.destination ?? null} />
                <Dato label={tr.ultimoPuerto} valor={ais?.lastPort ?? null} />
                <Dato label={tr.booking} valor={op.booking} />
                <Dato label={tr.naviera} valor={op.naviera} />
              </div>

              {!ais && (
                <p className="mt-3.5 border-t border-dash-border pt-3.5 text-[11.5px] leading-snug text-dash-muted">
                  {/* Cerrado el viaje no se consulta al proveedor: el buque ya anda en otro. */}
                  {estado.etapa === "ARRIBADO" ? tr.buqueViajeCerrado : tr.buqueSinAis}
                </p>
              )}
            </div>
          )}

          {pestana === "escalas" && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-dash-border px-4 py-2.5">
                <p className="text-[12.5px] text-dash-muted sm:text-[11.5px]">
                  {escalas.length === 0
                    ? tr.escalasVacio
                    : escalasEdadH == null
                      ? tr.escalasRecien
                      : interpolar(tr.escalasGuardadas, { h: String(escalasEdadH) })}
                </p>
                {escalasPuedeConsultar ? (
                  <button
                    type="button"
                    onClick={onTraerEscalas}
                    disabled={escalasCargando}
                    className="dash-cta motion-interactive inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-[11.5px] disabled:opacity-60"
                  >
                    <Icon
                      icon={escalasCargando ? "lucide:loader-2" : "lucide:download"}
                      width={13}
                      height={13}
                      className={escalasCargando ? "animate-spin" : ""}
                      aria-hidden
                    />
                    {escalasCargando
                      ? tr.escalasConsultando
                      : escalas.length === 0
                        ? tr.escalasTraer
                        : tr.escalasActualizar}
                  </button>
                ) : (
                  <p className="text-[12.5px] text-dash-muted sm:text-[11px]">{tr.escalasNoSeguida}</p>
                )}
              </div>

              {/* El endpoint del proveedor es de historial: no trae escalas futuras. */}
              <p className="shrink-0 px-4 pt-2.5 text-[11px] leading-snug text-dash-muted">
                {tr.escalasLeyenda}
              </p>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                {escalas.length === 0 ? (
                  <p className="py-8 text-center text-[12.5px] text-dash-muted">{tr.escalasSinDatos}</p>
                ) : (
                  <ol className="space-y-0">
                    {escalas.map((e, i) => {
                      const arribo = fmtFechaHora(e.arribo ? new Date(e.arribo) : null, locale);
                      const zarpe = fmtFechaHora(e.zarpe ? new Date(e.zarpe) : null, locale);
                      const enPuerto = Boolean(e.arribo && !e.zarpe);
                      return (
                        <li key={`${e.locode ?? ""}-${e.arribo ?? i}`} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span className={`nt-tl-dot ${enPuerto ? "nt-tl-dot--now" : "nt-tl-dot--done"}`}>
                              <Icon icon="lucide:anchor" width={11} height={11} aria-hidden />
                            </span>
                            {i < escalas.length - 1 && <span className="nt-tl-line nt-tl-line--done" />}
                          </div>
                          <div className={`min-w-0 flex-1 ${i < escalas.length - 1 ? "pb-3.5" : ""}`}>
                            <div className="flex flex-wrap items-center gap-x-2">
                              <p className="truncate text-[13px] font-bold text-dash-fg">
                                {e.puerto || e.locode || "—"}
                              </p>
                              {e.locode && (
                                <span className="nt-certainty nt-certainty--real">{e.locode}</span>
                              )}
                              {enPuerto && <span className="nt-certainty">{tr.escalasEnPuerto}</span>}
                            </div>
                            <p className="mt-0.5 text-[12.5px] text-dash-muted sm:text-[11.5px] tabular-nums">
                              {[
                                arribo ? `${tr.escalasArribo} ${arribo}` : null,
                                zarpe ? `${tr.escalasZarpe} ${zarpe}` : null,
                              ]
                                .filter(Boolean)
                                .join("  ·  ") || "—"}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </div>
          )}

          {pestana === "transbordo" && (
            <div className="min-h-0 flex-1 overflow-y-auto border-t border-dash-border px-4 py-3.5">
              <NavitrackTransbordo
                naveActual={op.nave ?? ""}
                puerto={ais?.destination ?? decision?.puerto ?? ""}
                naveSiguiente={decision?.nave_siguiente ?? null}
                decision={decision}
                guardando={transbordoGuardando}
                error={transbordoError}
                onConfirmar={onConfirmarTransbordo}
                onDescartar={onDescartarTransbordo}
                onVerificar={() => onEditarItinerario?.(ais?.destination ?? null)}
                tr={tr}
              />
            </div>
          )}
        </section>

        {/*
          * Información del embarque: todo lo que se pregunta por teléfono, en
          * una tarjeta. Es la columna de largo variable, así que es la que se
          * desplaza por dentro si la pantalla es baja.
          */}
        <section className={`dash-card dash-card-static flex min-h-0 flex-col overflow-hidden nt-tone--${etaTono}`}>
          <div className="flex shrink-0 items-center gap-2.5 px-4 py-2.5">
            <Icon icon="lucide:ship" width={18} height={18} className="text-dash-neon" aria-hidden />
            <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-dash-fg">{tr.infoEmbarque}</h2>
            <a
              href={documentosHref}
              className="dash-control motion-interactive ml-auto inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold"
            >
              <Icon icon="lucide:folder-open" width={14} height={14} aria-hidden />
              {tr.verDocumentos}
              {documentosCount != null && <span className="tabular-nums">({documentosCount})</span>}
            </a>
          </div>

          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto border-t border-dash-border p-3">
            <div className="nt-info-bloque grid grid-cols-1 sm:grid-cols-3">
              <div className="nt-info-col space-y-2.5 px-3.5 py-3">
                {/* Booking y contenedor, en ese orden y cada uno con su copiar:
                    son los dos códigos que se pegan en correos y portales. */}
                <div className="min-w-0">
                  <p className="nt-eyebrow">{tr.booking}</p>
                  <div className="flex items-center gap-1">
                    <p className="truncate text-[15px] font-extrabold text-dash-fg tabular-nums">{op.booking || "—"}</p>
                    {op.booking && <BotonCopiar texto={op.booking} tr={tr} />}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="nt-eyebrow">{tr.nContenedor}</p>
                  <div className="flex items-center gap-1">
                    <p className="truncate font-mono text-[15px] font-extrabold tracking-tight text-dash-fg">{op.contenedor || "—"}</p>
                    {op.contenedor && <BotonCopiar texto={op.contenedor} tr={tr} />}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="nt-eyebrow">{tr.cliente}</p>
                  <p className="truncate text-[15px] font-extrabold text-dash-fg">{op.cliente || "—"}</p>
                </div>
              </div>

              <div className="nt-info-col space-y-2.5 px-3.5 py-3">
                <div className="min-w-0">
                  <p className="nt-eyebrow">{tr.fichaRuta}</p>
                  <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[13px] font-extrabold text-dash-fg">
                    {/* SVG, no emoji: en Windows el emoji de bandera se ve como "CL". */}
                    {banderaPol && (
                      <Icon icon={`circle-flags:${banderaPol.toLowerCase()}`} width={16} height={16} aria-hidden />
                    )}
                    <span className="truncate">{journey.origen.nombre || "—"}</span>
                    <Icon icon="lucide:arrow-right" width={14} height={14} className="shrink-0 text-dash-muted" aria-hidden />
                    {banderaPod && (
                      <Icon icon={`circle-flags:${banderaPod.toLowerCase()}`} width={16} height={16} aria-hidden />
                    )}
                    <span className="truncate">{journey.destino.nombre || "—"}</span>
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="nt-eyebrow">{tr.fichaNave}</p>
                  {/* La nave que lleva la carga ahora, que con transbordo no es `op.nave`. */}
                  <p className="truncate text-[15px] font-extrabold text-dash-fg">{journey.naveActual || op.nave || "—"}</p>
                </div>
                <div className="min-w-0">
                  <p className="nt-eyebrow">{tr.viaje}</p>
                  <p className="truncate text-[15px] font-extrabold text-dash-fg">{journey.viajeActual || op.viaje || "—"}</p>
                </div>
              </div>

              <div className="nt-info-col space-y-3 px-3.5 py-3">
                <div className="flex gap-2.5">
                  <span className="nt-stat-icon !h-9 !w-9">
                    <Icon icon="lucide:calendar-days" width={16} height={16} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="nt-eyebrow">{tr.etaDestino}</p>
                    <p className="text-[16px] font-extrabold leading-tight text-dash-fg tabular-nums">{etaErp ?? "—"}</p>
                    <p className="truncate text-[11.5px] uppercase text-dash-muted">
                      {[journey.destino.nombre, op.pais].filter(Boolean).join(", ") || "—"}
                    </p>
                  </div>
                </div>
                {/*
                  * La llegada que anuncia el buque, con el puerto al que se
                  * refiere: mientras declara Callao, esa hora es la de Callao,
                  * no la del destino. Sin el puerto al lado, el dato engaña.
                  */}
                {etaAis && (
                  <div className="flex gap-2.5">
                    <span className="nt-stat-icon !h-9 !w-9">
                      <Icon icon="lucide:calendar-clock" width={16} height={16} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="nt-eyebrow truncate">
                        {proximoPuerto && estado.eta.deltaHoras == null
                          ? `${tr.etaAisA} ${proximoPuerto.nombre}`
                          : tr.etaAis}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-[14px] font-extrabold text-dash-fg tabular-nums">{etaAis}</p>
                        {delta && (
                          <span className="nt-accent-fg rounded-md border border-[color-mix(in_srgb,var(--nt-accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--nt-accent)_14%,transparent)] px-1.5 py-0.5 text-[11px] font-extrabold tabular-nums">
                            {delta}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Prometido contra real, e incidencias: solo aparecen cuando hay algo que decir. */}
            <div className="nt-info-bloque overflow-hidden empty:hidden [&>*:first-child]:border-t-0">
              {/*
                * Prometido contra real.
                *
                * Solo aparece cuando el embarque arribó con fecha: antes no hay
                * nada que comparar, y un cero mientras navega se leería como que
                * va en hora. Las dos referencias van juntas a propósito —la
                * promesa de la reserva y el ETA vigente— porque el segundo suele
                * haberse movido detrás del primero, y esa distancia es la que
                * explica por qué un atraso grande no se vio venir.
                */}
              {(() => {
                const d = desvioEta(op);
                if (!d) return null;
                const sentido = sentidoDesvio(d.dias);
                /* `parseOpDate` sitúa a mediodía: una columna `date` no se corre
                   de día por zona horaria, y `arribo_at` ya viene a mediodía. */
                const fecha = (v: string | null) => fmtFecha(parseOpDate(v), locale) ?? "—";
                const fila = (etiqueta: string, valor: string, extra?: string) => (
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-dash-muted">
                      {etiqueta}
                    </span>
                    <span className="min-w-0 text-right">
                      <span className="text-[13px] font-bold text-dash-fg tabular-nums">{valor}</span>
                      {extra && (
                        <span className="ml-1.5 text-[11.5px] text-dash-muted tabular-nums">{extra}</span>
                      )}
                    </span>
                  </div>
                );

                return (
                  <div className="border-t border-dash-border px-3.5 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-dash-muted">
                      {tr.desvioTitulo}
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {fila(tr.desvioEtaReserva, fecha(op.eta_original))}
                      {fila(
                        tr.desvioEtaVigente,
                        fecha(op.eta),
                        d.diasReprogramado != null && d.diasReprogramado !== 0
                          ? tr.desvioReprogramado.replace("{{dias}}", formatoDesvio(d.diasReprogramado))
                          : tr.desvioSinReprogramar,
                      )}
                      {fila(tr.desvioArriboReal, fecha(op.arribo_at))}
                    </div>

                    <div
                      className={`estado--${estadoDesvio(d.dias)} mt-2.5 flex items-center gap-2 rounded-lg px-2.5 py-2`}
                      style={{
                        border: "1px solid color-mix(in srgb, var(--estado) 38%, transparent)",
                        background: "color-mix(in srgb, var(--estado) 12%, transparent)",
                      }}
                    >
                      <span className="estado-chip shrink-0 rounded-md border px-1.5 py-0.5 text-[12px] font-extrabold tabular-nums">
                        {formatoDesvio(d.dias)}
                      </span>
                      <span className="min-w-0 text-[12px] leading-snug text-dash-fg">
                        {sentido === "en_fecha"
                          ? tr.desvioEnFecha
                          : (sentido === "adelanto" ? tr.desvioAdelanto : tr.desvioAtraso).replace(
                              "{{dias}}",
                              String(Math.abs(d.dias)),
                            )}
                      </span>
                    </div>

                    {/* Una promesa reconstruida no puede presentarse como promesa. */}
                    {d.heredada && (
                      <p className="mt-2 text-[11.5px] leading-snug text-dash-muted">
                        <Icon icon="lucide:info" width={12} height={12} className="mr-1 inline align-[-2px]" aria-hidden />
                        {tr.desvioHeredado}
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Incidencias en línea: visibles sin robarle alto al resto. */}
              {alertas.length > 0 && (
                <div className="space-y-1 border-t border-dash-border px-2.5 py-2">
                  {alertas.map((a) => (
                    <div
                      key={a.codigo}
                      className={`nt-tone--${ALERTA_TONO[a.severidad]} flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--nt-accent)_38%,transparent)] bg-[color-mix(in_srgb,var(--nt-accent)_10%,transparent)] px-2.5 py-1.5`}
                    >
                      <Icon
                        icon={ALERTA_ICON[a.codigo]}
                        width={14}
                        height={14}
                        className="nt-accent-fg shrink-0"
                        aria-hidden
                      />
                      <p className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-dash-fg">
                        {tr[ALERTA_TITULO[a.codigo]]}
                      </p>
                      {a.accionable && (
                        <button
                          type="button"
                          onClick={() => setPestana("transbordo")}
                          className="shrink-0 text-[11px] font-bold nt-accent-fg underline-offset-2 hover:underline"
                        >
                          {tr.verDetalle}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Indicadores: lo que un operador mira de reojo. */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              <Stat
                icon="lucide:anchor"
                label={tr.cadenaInicial}
                valor={(tramoInicial?.nave ?? op.nave) || "—"}
                sub={
                  [
                    tramoInicial?.pol ?? op.pol,
                    fmtFecha(parseOpDate(tramoInicial?.etd ?? op.etd), locale),
                    // Cuánto se corrió la entrega respecto de lo que anunció la naviera.
                    tramoInicial ? desvioDe(tramoInicial) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || null
                }
              />
              {/*
                * Buque actual: el del tramo en curso, no el de `operaciones.nave`.
                * Con transbordo esa columna guarda el primer barco, que soltó la
                * carga hace semanas.
                */}
              <Stat
                icon="lucide:ship"
                label={tr.buqueActual}
                valor={journey.naveActual || op.nave || "—"}
                sub={
                  [op.naviera, journey.viajeActual, naveIdent?.imo ? `IMO ${naveIdent.imo}` : null]
                    .filter(Boolean)
                    .join(" · ") || null
                }
              />
              <Stat
                icon="lucide:gauge"
                label={tr.velocidad}
                valor={<Velocidad nudos={ais?.speed} tr={tr} />}
                sub={ais?.course != null ? `${tr.rumbo} ${Math.round(ais.course)}°` : null}
              />
              {/*
                * Último y próximo puerto son los del tramo en curso: lo que el
                * AIS declare manda, porque es el dato del propio barco. Cuando el
                * puerto lo pone el AIS va sin fecha: su `atdUtc` no acompaña a
                * `lastPort` y no hay fecha honesta que decir.
                */}
              <Stat
                icon="lucide:anchor"
                label={tr.ultimoPuerto}
                valor={ais?.lastPort || tramoEnCurso?.pol || journey.origen.nombre || "—"}
                sub={
                  ais?.lastPort
                    ? null
                    : tramoEnCurso?.etd
                      ? `${tr.evZarpe}: ${fmtFecha(parseOpDate(tramoEnCurso.etd), locale) ?? "—"}`
                      : etdFmt
                        ? `${tr.evZarpe}: ${etdFmt}`
                        : null
                }
              />
              {/* El próximo es el que declara el buque; el destino, el comprometido con el cliente. */}
              {/*
                * Solo lo que el buque anuncia por AIS en la lectura vigente. Sin
                * anuncio, "Por confirmar": no se rellena con un puerto guardado
                * de antes, que podría ser un destino que el buque ya cambió.
                */}
              <Stat
                icon="lucide:navigation"
                label={tr.proximoPuerto}
                valor={ais?.destination?.trim() || tr.porConfirmar}
                sub={
                  ais?.destination?.trim()
                    ? ais.eta
                      ? `${tr.colEta}: ${fmtFechaHora(ais.eta, locale) ?? "—"}`
                      : tr.proximoPuertoAis
                    : null
                }
              />
              {/*
                * Dónde cambia de barco la carga, cuándo y a cuál. Sin tramos no
                * se inventa un transbordo: se dice que es directo, o que nadie
                * indicó el itinerario todavía.
                */}
              <Stat
                icon="lucide:git-branch"
                label={
                  transbordoTarjeta && transbordoTarjeta.total > 1
                    ? `${tr.puertoTransbordo} · ${interpolar(tr.transbordoDeN, {
                        n: String(transbordoTarjeta.n),
                        total: String(transbordoTarjeta.total),
                      })}`
                    : tr.puertoTransbordo
                }
                valor={
                  transbordoTarjeta?.puerto ??
                  (modoViaje === "directo" ? tr.viajeDirecto : tr.porConfirmar)
                }
                sub={
                  transbordoTarjeta
                    ? [
                        transbordoTarjeta.real?.recalado_at
                          ? `${tr.transbordoLlego}: ${fmtFecha(new Date(transbordoTarjeta.real.recalado_at), locale) ?? "—"}`
                          : transbordoTarjeta.llegada
                            ? `${tr.transbordoLlegada}: ${fmtFecha(parseOpDate(transbordoTarjeta.llegada), locale) ?? "—"}`
                            : null,
                        `${tr.transbordoRecibe}: ${transbordoTarjeta.nave || tr.porConfirmar}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : modoViaje === "directo"
                      ? null
                      : tr.transbordoSinIndicar
                }
              />
              <Stat
                icon="lucide:map-pin"
                label={tr.puertoDestino}
                valor={journey.destino.nombre || "—"}
                sub={
                  tramoEnCurso?.eta
                    ? `${tr.colEta}: ${fmtFecha(parseOpDate(tramoEnCurso.eta), locale) ?? "—"}`
                    : etaErp
                      ? `${tr.colEta}: ${etaErp}`
                      : null
                }
              />
              <Stat
                icon="lucide:crosshair"
                label={tr.posicionActual}
                valor={
                  journey.position
                    ? `${journey.position.lat.toFixed(3)}, ${journey.position.lng.toFixed(3)}`
                    : "—"
                }
                pie={
                  journey.position ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPestana("ruta");
                        setEnfocarSolicitud((n) => n + 1);
                      }}
                      className="dash-control motion-interactive mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold"
                    >
                      {tr.verEnMapa}
                    </button>
                  ) : null
                }
              />
              <Stat
                icon="lucide:route"
                label={tr.distanciaRestante}
                valor={<Distancia mn={journey.remainingNm} tr={tr} locale={locale} />}
                sub={pct != null ? interpolar(tr.pctTrayecto, { pct: String(pct) }) : null}
                pie={
                  pct != null ? (
                    <span className="nt-mini-rail mt-1.5 block">
                      <span style={{ width: `${pct}%` }} />
                    </span>
                  ) : null
                }
              />
            </div>
          </div>
        </section>
      </div>

      {jsonAbierto && (
        <NavitrackJsonCrudo datos={aisCrudo} tr={tr} onCerrar={() => setJsonAbierto(false)} />
      )}
    </div>
  );
}
