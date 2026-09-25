import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { PanelBajoFila } from "@/components/ui/FilaDesplegable";
import { Icon } from "@iconify/react";
import { format } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { displayRefAsli } from "@/lib/refAsli";
import { etiquetaEstado } from "@/lib/operaciones/estados";
import { getEstadoOperacionStyle } from "@/lib/ui/estadoOperacion";
import { staggerStyle } from "@/lib/ui/motion";
import { isoDePuerto } from "@/components/navitrack/navitrack-banderas";
import { withBase } from "@/lib/basePath";
import { motivoFueraDeNavitrack } from "@/lib/navitrack/alcance";
import { ComboboxInput, type ComboboxOption } from "@/components/ui/ComboboxInput";

/**
 * Detalle de una reserva, desplegado bajo su fila en Mis Reservas.
 *
 * La lista trae solo las columnas que la tabla pinta; el detalle pide la
 * operación completa al abrirse, una sola fila, así la lista no carga setenta
 * columnas por reserva para mostrar trece.
 *
 * Los campos se agrupan en el orden del viaje —qué es, de quién, qué lleva,
 * cómo sale, cuándo— y no en el orden de las columnas de la base.
 */

type Fila = Record<string, unknown>;

type Formato = "texto" | "fecha" | "numero" | "monto" | "bool" | "ventana";

type Campo = {
  key: string;
  /** Clave en `t.registros` (o en `t.misReservas` si no está ahí). */
  labelKey: string;
  formato?: Formato;
  sufijo?: string;
  /** Monospace: códigos que se dictan carácter a carácter. */
  mono?: boolean;
  /** No se edita desde la ficha: lo fija el alta o lo decide otro módulo. */
  fijo?: boolean;
  /** Columna `integer`: la edición no acepta decimales. */
  entero?: boolean;
  /** Se guarda en mayúsculas: contenedores, sellos y patentes. */
  mayus?: boolean;
  /** Se muestra como número pero la columna es `text` (temperatura). */
  columnaTexto?: boolean;
};

type Grupo = {
  id: string;
  tituloKey: string;
  icono: string;
  campos: Campo[];
  /** Costos, márgenes y facturación: el cliente no los ve. */
  interno?: boolean;
  /** Ningún campo se edita desde la ficha. */
  fijo?: boolean;
};

const GRUPOS: Grupo[] = [
  {
    id: "general",
    tituloKey: "detalleGeneral",
    icono: "lucide:hash",
    campos: [
      { key: "referencia_externa", labelKey: "colRefExterna" },
      { key: "temporada", labelKey: "colTemporada", fijo: true },
      { key: "ingreso", labelKey: "colEntryDate", formato: "fecha", fijo: true },
      { key: "semana", labelKey: "colWeek", entero: true },
      { key: "ejecutivo", labelKey: "colExecutive" },
      { key: "tipo_operacion", labelKey: "colOperationType" },
      { key: "solicitud_ventana", labelKey: "colVentana", formato: "ventana" },
    ],
  },
  {
    id: "comercial",
    tituloKey: "detalleComercial",
    icono: "lucide:briefcase",
    campos: [
      { key: "cliente", labelKey: "colClient", fijo: true },
      { key: "consignatario", labelKey: "colConsignee" },
      { key: "contrato", labelKey: "colContrato" },
      { key: "incoterm", labelKey: "colIncoterm" },
      { key: "forma_pago", labelKey: "colPaymentMethod" },
      { key: "pais", labelKey: "colDestCountry" },
    ],
  },
  {
    id: "carga",
    tituloKey: "detalleCarga",
    icono: "lucide:package",
    campos: [
      { key: "especie", labelKey: "colSpecies" },
      { key: "tipo_unidad", labelKey: "colUnitType" },
      { key: "temperatura", labelKey: "colTemperature", formato: "numero", sufijo: " °C", columnaTexto: true },
      { key: "ventilacion", labelKey: "colVentilation", formato: "numero", entero: true },
      { key: "tratamiento_frio", labelKey: "colColdTreatment" },
      { key: "tipo_atmosfera", labelKey: "colAtmosphereType" },
      { key: "tratamiento_frio_o2", labelKey: "colO2", formato: "numero", entero: true },
      { key: "tratamiento_frio_co2", labelKey: "colCO2", formato: "numero", entero: true },
      { key: "pallets", labelKey: "colPallets", formato: "numero", entero: true },
      { key: "peso_bruto", labelKey: "colGrossWeight", formato: "numero" },
      { key: "peso_neto", labelKey: "colNetWeight", formato: "numero" },
    ],
  },
  {
    id: "viaje",
    tituloKey: "detalleViaje",
    icono: "lucide:ship",
    campos: [
      { key: "naviera", labelKey: "colCarrier" },
      { key: "nave", labelKey: "colVessel" },
      { key: "viaje", labelKey: "colViaje" },
      { key: "booking", labelKey: "colBooking", mono: true },
      { key: "pol", labelKey: "colPOL" },
      { key: "etd", labelKey: "colETD", formato: "fecha" },
      { key: "pod", labelKey: "colPOD" },
      { key: "eta", labelKey: "colETA", formato: "fecha" },
      { key: "tt", labelKey: "colTransitDays", formato: "numero", entero: true },
    ],
  },
  {
    id: "contenedor",
    tituloKey: "detalleContenedor",
    icono: "lucide:container",
    campos: [
      { key: "contenedor", labelKey: "colContainer", mono: true, mayus: true },
      { key: "sello", labelKey: "colSeal", mono: true, mayus: true },
      { key: "sello_planta", labelKey: "colPlantSeal", mono: true, mayus: true },
      { key: "tara", labelKey: "colTare", formato: "numero" },
      { key: "deposito", labelKey: "colWarehouse" },
      { key: "agendamiento_retiro", labelKey: "colPickupSchedule", formato: "fecha" },
      { key: "devolucion_unidad", labelKey: "colUnitReturn", formato: "fecha" },
    ],
  },
  {
    id: "planta",
    tituloKey: "detallePlanta",
    icono: "lucide:factory",
    campos: [
      { key: "planta_presentacion", labelKey: "colPresentationPlant" },
      { key: "citacion", labelKey: "colCitation", formato: "fecha" },
      { key: "llegada_planta", labelKey: "colPlantArrival", formato: "fecha" },
      { key: "salida_planta", labelKey: "colPlantDeparture", formato: "fecha" },
      { key: "inicio_stacking", labelKey: "colStackingStart", formato: "fecha" },
      { key: "fin_stacking", labelKey: "colStackingEnd", formato: "fecha" },
      { key: "ingreso_stacking", labelKey: "colStackingEntry", formato: "fecha" },
      { key: "corte_documental", labelKey: "colDocCutoff", formato: "fecha" },
      { key: "late_inicio", labelKey: "colLateStart", formato: "fecha" },
      { key: "late_fin", labelKey: "colLateEnd", formato: "fecha" },
      { key: "xlate_inicio", labelKey: "colXLateStart", formato: "fecha" },
      { key: "xlate_fin", labelKey: "colXLateEnd", formato: "fecha" },
    ],
  },
  {
    id: "transporte",
    tituloKey: "detalleTransporte",
    icono: "lucide:truck",
    campos: [
      { key: "transporte", labelKey: "colTransportCompany" },
      { key: "chofer", labelKey: "colDriverName" },
      { key: "rut_chofer", labelKey: "colDriverRUT", mono: true },
      { key: "telefono_chofer", labelKey: "colDriverPhone" },
      { key: "patente_camion", labelKey: "colTruckPlate", mono: true, mayus: true },
      { key: "patente_remolque", labelKey: "colTrailerPlate", mono: true, mayus: true },
      { key: "tramo", labelKey: "colSection" },
    ],
  },
  {
    id: "documentos",
    tituloKey: "detalleDocumentos",
    icono: "lucide:file-text",
    campos: [
      { key: "aga", labelKey: "colAGA" },
      { key: "dus", labelKey: "colDUS", mono: true },
      { key: "sps", labelKey: "colSPS", mono: true },
      { key: "numero_guia_despacho", labelKey: "colDispatchGuide", mono: true },
      { key: "swb", labelKey: "colSWB", mono: true },
      { key: "fob_invoice", labelKey: "colFobInvoice", formato: "numero" },
      { key: "fecha_confirmacion_booking", labelKey: "colBookingConfirmation", formato: "fecha" },
      { key: "fecha_envio_documentacion", labelKey: "colDocSent", formato: "fecha" },
      { key: "fecha_entrega_bl", labelKey: "colBLDelivery", formato: "fecha" },
    ],
  },
  {
    id: "facturacion",
    tituloKey: "detalleFacturacion",
    icono: "lucide:receipt",
    interno: true,
    /* Lo escribe Facturación, que reserva el correlativo TRA y suma la
       proforma; editarlo suelto acá descuadraría esa cuenta. */
    fijo: true,
    campos: [
      { key: "numero_factura_asli", labelKey: "colASLIInvoice", mono: true },
      { key: "factura_transporte", labelKey: "colTransportInvoice", mono: true },
      { key: "concepto_facturado", labelKey: "colInvoicedConcept" },
      { key: "moneda", labelKey: "colCurrency" },
      { key: "valor_tramo", labelKey: "colSectionValue", formato: "monto" },
      { key: "porteo", labelKey: "colPortage", formato: "bool" },
      { key: "valor_porteo", labelKey: "colPortageValue", formato: "monto" },
      { key: "falso_flete", labelKey: "colDeadFreight", formato: "bool" },
      { key: "valor_falso_flete", labelKey: "colDeadFreightValue", formato: "monto" },
      { key: "monto_facturado", labelKey: "colInvoicedAmount", formato: "monto" },
      { key: "tipo_cambio", labelKey: "colExchangeRate", formato: "numero" },
      { key: "margen_estimado", labelKey: "colEstimatedMargin", formato: "monto" },
      { key: "margen_real", labelKey: "colRealMargin", formato: "monto" },
      { key: "fecha_entrega_factura", labelKey: "colInvoiceDelivery", formato: "fecha" },
      { key: "fecha_pago_cliente", labelKey: "colClientPayment", formato: "fecha" },
      { key: "fecha_pago_transporte", labelKey: "colTransportPayment", formato: "fecha" },
      { key: "fecha_cierre", labelKey: "colCloseDate", formato: "fecha" },
    ],
  },
];

function vacio(v: unknown): boolean {
  return v == null || (typeof v === "string" && v.trim() === "");
}

function texto(v: unknown): string | null {
  return vacio(v) ? null : String(v);
}

/**
 * Fecha para mostrar. Una columna `date` llega como `2026-09-24` y se muestra
 * sin hora: inventarla sería decir algo que el dato no dice. Un `timestamptz`
 * trae zona y se pasa a la hora local; uno sin zona se muestra tal cual viene.
 */
export function fmtFecha(raw: string): string {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}-${m}-${y}`;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(s);
  if (!m) return s;
  if (/(Z|[+-]\d{2}(:?\d{2})?)$/.test(s)) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      const hm = format(d, "HH:mm");
      return hm === "00:00" ? format(d, "dd-MM-yyyy") : format(d, "dd-MM-yyyy HH:mm");
    }
  }
  const [, y, mo, d, hh, mi] = m;
  return hh === "00" && mi === "00" ? `${d}-${mo}-${y}` : `${d}-${mo}-${y} ${hh}:${mi}`;
}

function fmtValor(campo: Campo, v: unknown, fila: Fila, si: string, no: string): string {
  if (vacio(v)) return "—";
  switch (campo.formato) {
    case "fecha":
      return fmtFecha(String(v));
    case "bool":
      if (typeof v === "boolean") return v ? si : no;
      return String(v);
    case "ventana":
      if (v === "LATE") return "Late";
      if (v === "EXTRA_LATE") return "Extra late";
      if (v === "NORMAL") return "Normal";
      return String(v);
    case "numero": {
      const n = Number(v);
      if (!Number.isFinite(n)) return String(v);
      return `${n.toLocaleString("es-CL", { maximumFractionDigits: 2 })}${campo.sufijo ?? ""}`;
    }
    case "monto": {
      const n = Number(v);
      if (!Number.isFinite(n)) return String(v);
      const mon = String(fila.moneda ?? "CLP").toUpperCase();
      const dec = mon === "CLP" ? 0 : 2;
      return `${mon} ${n.toLocaleString("es-CL", { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
    }
    default:
      return typeof v === "object" ? JSON.stringify(v) : String(v);
  }
}

/**
 * De dónde salen las opciones de cada campo al editarlo: las mismas tablas y
 * categorías de `catalogos` que usa Crear Reserva, para que la ficha no invente
 * una naviera o un puerto escritos de otra forma.
 */
const TABLAS_OPCIONES: Record<string, string> = {
  naviera: "navieras",
  nave: "naves",
  pol: "puertos_origen",
  pod: "destinos",
  especie: "especies",
  deposito: "depositos",
  planta_presentacion: "plantas",
  consignatario: "consignatarios",
  transporte: "transportes_empresas",
};

const CATEGORIAS_OPCIONES: Record<string, string> = {
  tipo_operacion: "tipo_operacion",
  incoterm: "incoterm",
  forma_pago: "forma_pago",
  tipo_unidad: "tipo_unidad",
  tratamiento_frio: "tratamiento_frio",
  tipo_atmosfera: "tipo_atmosfera",
};

type Opcion = ComboboxOption & { cliente?: string | null };
type Opciones = Record<string, Opcion[]>;

/**
 * Carga las listas una vez, al habilitarse la edición. Una tabla que falle
 * (por permisos, por ejemplo) deja ese campo como texto libre, no la ficha
 * sin editar.
 */
function useOpcionesCampos(supabase: SupabaseClient | null, activo: boolean): Opciones {
  const [opciones, setOpciones] = useState<Opciones>({});
  useEffect(() => {
    if (!activo || !supabase) return;
    let vivo = true;
    const tablas = Object.entries(TABLAS_OPCIONES).map(async ([key, tabla]) => {
      const cols = tabla === "consignatarios" ? "id, nombre, cliente" : "id, nombre";
      const { data, error } = await supabase.from(tabla).select(cols).order("nombre");
      return [key, error ? [] : ((data ?? []) as unknown as Opcion[])] as const;
    });
    const catalogo = supabase
      .from("catalogos")
      .select("id, categoria, valor")
      .eq("activo", true)
      .order("orden")
      .then(({ data }) => {
        const porCampo: [string, Opcion[]][] = [];
        for (const [key, categoria] of Object.entries(CATEGORIAS_OPCIONES)) {
          const items = (data ?? [])
            .filter((row) => row.categoria === categoria)
            .map((row) => ({ id: String(row.id), nombre: String(row.valor) }));
          porCampo.push([key, items]);
        }
        return porCampo;
      });
    /* Los ejecutivos viven en `usuarios`, que el navegador no lee: los da el
       mismo endpoint que Crear Reserva. Se guarda el nombre, como allá. */
    const ejecutivos = fetch(withBase("/api/reservas/ejecutivos"), { credentials: "include" })
      .then(async (res) => (res.ok ? ((await res.json()) as { ejecutivos?: Opcion[] }).ejecutivos ?? [] : []))
      .catch(() => [] as Opcion[]);
    void Promise.all([Promise.all(tablas), catalogo, ejecutivos]).then(([deTablas, deCatalogo, ejec]) => {
      if (!vivo) return;
      const limpiar = (lista: Opcion[]) => {
        /* Nombres repetidos o vacíos ensucian la lista sin agregar opción. */
        const vistos = new Set<string>();
        return lista.filter((o) => {
          const n = (o.nombre ?? "").trim().toUpperCase();
          if (!n || vistos.has(n)) return false;
          vistos.add(n);
          return true;
        });
      };
      const todo: Opciones = {};
      for (const [key, lista] of [...deTablas, ...deCatalogo]) todo[key] = limpiar(lista);
      todo.ejecutivo = limpiar(ejec.map((e) => ({ id: String(e.id), nombre: e.nombre })));
      setOpciones(todo);
    });
    return () => {
      vivo = false;
    };
  }, [supabase, activo]);
  return opciones;
}

/** Las opciones de un campo para esta fila. Los consignatarios se acotan al
    cliente de la reserva; si el cliente no tiene ninguno, se muestran todos. */
function opcionesDe(opciones: Opciones, key: string, fila: Fila): ComboboxOption[] | undefined {
  const lista = opciones[key];
  if (!lista || lista.length === 0) return undefined;
  if (key !== "consignatario") return lista;
  const cliente = texto(fila.cliente)?.toUpperCase();
  const delCliente = lista.filter((o) => (o.cliente ?? "").toUpperCase() === cliente);
  return delCliente.length > 0 ? delCliente : lista;
}

/** `etd` y `eta` son columnas `date`; el resto de las fechas, `timestamptz`. */
const SOLO_FECHA = new Set(["etd", "eta"]);

/** Valor que se guarda en la base; `undefined` si lo escrito no es válido. */
export type ValorCampo = string | number | null;

/**
 * Guarda un campo de la operación. Lo resuelve quien monta la ficha (escribe
 * en la base, deja la auditoría y actualiza su lista) y devuelve si quedó.
 */
export type GuardarCampo = (key: string, valor: ValorCampo) => Promise<boolean>;

function editable(g: Grupo, c: Campo): boolean {
  return !g.fijo && !c.fijo && c.formato !== "monto" && c.formato !== "bool";
}

function valorParaInput(campo: Campo, v: unknown): string {
  if (vacio(v)) return "";
  const s = String(v).trim();
  if (campo.formato !== "fecha") return s;
  if (SOLO_FECHA.has(campo.key)) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd'T'HH:mm");
}

function valorParaGuardar(campo: Campo, raw: string): ValorCampo | undefined {
  const s = raw.trim();
  if (s === "") return null;
  if (campo.formato === "fecha") {
    if (SOLO_FECHA.has(campo.key)) return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined;
    /* `datetime-local` viene sin zona: se interpreta en la hora local, que es
       como se mostró, y se guarda en UTC. */
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  if (campo.formato === "numero" && !campo.columnaTexto) {
    const n = Number(s.replace(",", "."));
    if (!Number.isFinite(n)) return undefined;
    if (campo.entero && !Number.isInteger(n)) return undefined;
    return n;
  }
  return campo.mayus ? s.toUpperCase() : s;
}

function iguales(a: unknown, b: ValorCampo): boolean {
  if (vacio(a) && b == null) return true;
  if (vacio(a) || b == null) return false;
  if (typeof b === "number") return Number(a) === b;
  return String(a).trim() === b;
}

/**
 * Un valor de la ficha que se edita en el lugar: clic para escribir, Enter o
 * salir del campo guarda, Escape descarta. No se abre un formulario aparte
 * porque lo que se corrige casi siempre es un dato suelto.
 */
function ValorEditable({
  campo,
  valor,
  fila,
  guardar,
  opciones,
  si,
  no,
  labels,
}: {
  campo: Campo;
  valor: unknown;
  fila: Fila;
  guardar: GuardarCampo;
  /** Si viene, el campo se elige de la lista (y admite escribir otro valor). */
  opciones?: ComboboxOption[];
  si: string;
  no: string;
  labels: { editar: string; invalido: string };
}) {
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(false);
  const sinDato = vacio(valor);

  const abrir = () => {
    setBorrador(valorParaInput(campo, valor));
    setError(false);
    setEditando(true);
  };

  const confirmar = async (raw = borrador) => {
    if (guardando) return;
    const nuevo = valorParaGuardar(campo, raw);
    if (nuevo === undefined) {
      setError(true);
      return;
    }
    if (iguales(valor, nuevo)) {
      setEditando(false);
      return;
    }
    setGuardando(true);
    const ok = await guardar(campo.key, nuevo);
    setGuardando(false);
    if (ok) setEditando(false);
    else setError(true);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void confirmar();
    } else if (e.key === "Escape") {
      setEditando(false);
    }
  };

  if (editando) {
    const clase = `mt-0.5 w-full rounded-md border bg-dash-bg px-1.5 py-1 text-[13px] font-semibold text-dash-fg outline-none focus:ring-2 focus:ring-[var(--estado-curso)] ${
      error ? "border-[var(--estado-error)]" : "border-dash-border"
    } ${campo.mono ? "font-mono tracking-tight" : ""}`;
    if (campo.formato === "ventana") {
      return (
        <select
          autoFocus
          value={borrador || "NORMAL"}
          disabled={guardando}
          onChange={(e) => setBorrador(e.target.value)}
          onBlur={() => void confirmar()}
          onKeyDown={onKeyDown}
          className={clase}
        >
          <option value="NORMAL">Normal</option>
          <option value="LATE">Late</option>
          <option value="EXTRA_LATE">Extra late</option>
        </select>
      );
    }
    if (opciones) {
      return (
        <ComboboxInput
          neon
          autoFocus
          value={borrador}
          options={opciones}
          disabled={guardando}
          maxSuggestions={50}
          onChange={(v) => {
            setBorrador(v);
            setError(false);
          }}
          onSelect={(opt) => {
            setBorrador(opt.nombre);
            void confirmar(opt.nombre);
          }}
          onBlurExtra={() => void confirmar()}
          onKeyDownExtra={onKeyDown}
          inputClass={clase}
        />
      );
    }
    const esFecha = campo.formato === "fecha";
    const esNumero = campo.formato === "numero" && !campo.columnaTexto;
    return (
      <input
        autoFocus
        type={esFecha ? (SOLO_FECHA.has(campo.key) ? "date" : "datetime-local") : esNumero ? "number" : "text"}
        step={esNumero ? (campo.entero ? 1 : "any") : undefined}
        inputMode={esNumero ? (campo.entero ? "numeric" : "decimal") : undefined}
        value={borrador}
        disabled={guardando}
        aria-invalid={error || undefined}
        title={error ? labels.invalido : undefined}
        onChange={(e) => {
          setBorrador(e.target.value);
          setError(false);
        }}
        onBlur={() => void confirmar()}
        onKeyDown={onKeyDown}
        className={`${clase} ${campo.mayus ? "uppercase" : ""}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={abrir}
      title={labels.editar}
      className={`group/editar -mx-1 mt-0.5 flex w-[calc(100%+0.5rem)] items-start gap-1 rounded-md px-1 text-left text-[13px] leading-snug outline-none hover:bg-dash-control focus-visible:ring-2 focus-visible:ring-[var(--estado-curso)] ${
        sinDato ? "text-dash-muted/45" : "font-semibold text-dash-fg"
      } ${campo.mono && !sinDato ? "font-mono tracking-tight" : ""}`}
    >
      <span className="min-w-0 flex-1 break-words">{fmtValor(campo, valor, fila, si, no)}</span>
      <Icon
        icon="lucide:pencil"
        width={11}
        height={11}
        className="mt-1 shrink-0 text-dash-muted opacity-0 transition-opacity group-hover/editar:opacity-100 group-focus-visible/editar:opacity-100"
        aria-hidden
      />
    </button>
  );
}

export function Bandera({ puerto }: { puerto: string | null }) {
  const iso = isoDePuerto(puerto);
  if (!iso) return null;
  return <Icon icon={`circle-flags:${iso.toLowerCase()}`} width={20} height={20} className="shrink-0" aria-hidden />;
}

export type ReservaDetalleLabels = {
  /** `t.misReservas`: títulos de grupo y mensajes del panel. */
  tr: Record<string, string>;
  /** `t.registros`: etiquetas de campo, las mismas que en Registros. */
  campos: Record<string, string>;
};

/**
 * Carga la operación completa (todas las columnas). La lista trae solo lo que
 * pinta; el detalle y la ficha de Documentos piden el resto al abrirse.
 */
export function useOperacionCompleta(supabase: SupabaseClient | null, id: string | null) {
  const [completa, setCompleta] = useState<Fila | null>(null);
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
  useEffect(() => {
    let vivo = true;
    setCompleta(null);
    setEstado("cargando");
    if (!id) return;
    if (!supabase) {
      setEstado("error");
      return;
    }
    void supabase
      .from("operaciones")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!vivo) return;
        if (error || !data) {
          setEstado("error");
          return;
        }
        setCompleta(data as Fila);
        setEstado("listo");
      });
    return () => {
      vivo = false;
    };
  }, [supabase, id]);
  return { completa, estado };
}

/** Grupos de campos que ve un rol, sin los que se pidan excluir. */
export function gruposOperacion(isCliente: boolean, excluir: readonly string[] = []): Grupo[] {
  return GRUPOS.filter((g) => !(g.interno && isCliente) && !excluir.includes(g.id));
}

/** Las secciones de datos de una operación, en tarjetas por grupo. */
export function SeccionesOperacion({
  fila,
  grupos,
  soloConDatos,
  labels,
  guardar,
  opciones = {},
}: {
  fila: Fila;
  grupos: Grupo[];
  soloConDatos: boolean;
  labels: ReservaDetalleLabels;
  /** Si viene, los campos editables se corrigen en el lugar. */
  guardar?: GuardarCampo;
  /** Listas de valores por campo, para elegir en vez de escribir. */
  opciones?: Opciones;
}) {
  const { tr, campos } = labels;
  const labelsEdicion = { editar: tr.detalleEditarCampo, invalido: tr.detalleValorInvalido };
  const si = campos.yes ?? "Sí";
  const no = campos.no ?? "No";
  const etiqueta = (key: string) => campos[key] ?? tr[key] ?? key;
  return (
    <div className="columns-1 gap-3 md:columns-2 xl:columns-3 2xl:columns-4">
      {grupos.map((g, i) => {
        const llenos = g.campos.filter((c) => !vacio(fila[c.key]));
        const visibles = soloConDatos ? llenos : g.campos;
        const frac = llenos.length / g.campos.length;
        /* El avance usa los estados de marca: completo en oliva, a
           medias en teal, sin nada en gris. */
        const tono = frac === 1 ? "estado--ok" : frac > 0 ? "estado--curso" : "estado--espera";
        return (
          <section
            key={g.id}
            data-seccion={g.id}
            style={staggerStyle(i)}
            className="rd-card motion-view-section mb-3 break-inside-avoid overflow-hidden rounded-2xl"
          >
            <header className="flex items-center gap-3 px-4 pb-2.5 pt-3.5">
              <span className="rd-icono flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                <Icon icon={g.icono} width={17} height={17} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-dash-fg">{tr[g.tituloKey]}</p>
                <p className="text-[11px] tabular-nums text-dash-muted">
                  {llenos.length} {tr.detalleDe} {g.campos.length} {tr.detalleCampos}
                </p>
              </div>
              <Avance frac={frac} tono={tono} />
            </header>
            {visibles.length === 0 ? (
              <p className="mx-4 mb-4 rounded-lg border border-dashed border-dash-border px-3 py-2.5 text-center text-[11px] text-dash-muted">
                {tr.detalleSinDatos}
              </p>
            ) : (
              <dl className="mx-2 mb-2 grid grid-cols-2 gap-1">
                {visibles.map((c) => {
                  const v = fila[c.key];
                  const sinDato = vacio(v);
                  return (
                    <div
                      key={c.key}
                      className={`min-w-0 rounded-lg px-2.5 py-2 ${sinDato ? "" : "bg-dash-control/50"}`}
                    >
                      <dt className="truncate text-[10px] font-semibold uppercase tracking-wide text-dash-muted">
                        {etiqueta(c.labelKey)}
                      </dt>
                      {guardar && editable(g, c) ? (
                        <dd>
                          <ValorEditable
                            campo={c}
                            valor={v}
                            fila={fila}
                            guardar={guardar}
                            opciones={opcionesDe(opciones, c.key, fila)}
                            si={si}
                            no={no}
                            labels={labelsEdicion}
                          />
                        </dd>
                      ) : (
                        <dd
                          className={`mt-0.5 break-words text-[13px] leading-snug ${
                            sinDato ? "text-dash-muted/45" : "font-semibold text-dash-fg"
                          } ${c.mono && !sinDato ? "font-mono tracking-tight" : ""}`}
                        >
                          {fmtValor(c, v, fila, si, no)}
                        </dd>
                      )}
                    </div>
                  );
                })}
              </dl>
            )}
          </section>
        );
      })}
    </div>
  );
}

type Props = {
  /** La fila de la lista. Manda sobre lo que traiga la consulta: si se editó
      en línea después de abrir, el detalle muestra lo recién guardado. */
  op: Fila & { id: string };
  isCliente: boolean;
  supabase: SupabaseClient | null;
  labels: ReservaDetalleLabels;
  /** Guarda un campo. Sin él la ficha es de solo lectura (cliente, operador). */
  onGuardarCampo?: (id: string, key: string, valor: ValorCampo, anterior: unknown) => Promise<boolean>;
  /** El padre lo pone en `true` al replegar y desmonta al terminar la salida. */
  cerrando: boolean;
  onClose: () => void;
};

export function ReservaDetalle({ op, isCliente, supabase, labels, onGuardarCampo, cerrando, onClose }: Props) {
  const { completa, estado } = useOperacionCompleta(supabase, op.id);
  const [soloConDatos, setSoloConDatos] = useState(false);
  /* Lo guardado desde la ficha. La lista solo trae sus columnas: sin esto, un
     campo que la tabla no pinta volvería a mostrar el valor viejo. */
  const [editados, setEditados] = useState<Fila>({});
  const cuerpoRef = useRef<HTMLDivElement>(null);
  const { tr, campos } = labels;

  const fila: Fila = { ...(completa ?? {}), ...op, ...editados };
  const opciones = useOpcionesCampos(supabase, !!onGuardarCampo);
  const guardar: GuardarCampo | undefined = onGuardarCampo
    ? async (key, valor) => {
        const ok = await onGuardarCampo(op.id, key, valor, fila[key]);
        if (ok) setEditados((prev) => ({ ...prev, [key]: valor }));
        return ok;
      }
    : undefined;
  const grupos = GRUPOS.filter((g) => !(g.interno && isCliente));
  const observaciones = texto(fila.observaciones);
  const bookingDoc = texto(fila.booking_doc_url);
  const fueraDeNavitrack = motivoFueraDeNavitrack(fila);
  const cfg = getEstadoOperacionStyle(texto(fila.estado_operacion));
  const estadoTxt = etiquetaEstado(texto(fila.estado_operacion));
  const pol = texto(fila.pol);
  const pod = texto(fila.pod);
  const tt = texto(fila.tt);
  const si = campos.yes ?? "Sí";
  const no = campos.no ?? "No";
  const etiqueta = (key: string) => campos[key] ?? tr[key] ?? key;

  const resumen: { label: string; valor: string | null; icono: string; mono?: boolean }[] = [
    { label: etiqueta("colBooking"), valor: texto(fila.booking), icono: "lucide:bookmark", mono: true },
    { label: etiqueta("colContainer"), valor: texto(fila.contenedor), icono: "lucide:container", mono: true },
    { label: etiqueta("colVessel"), valor: [texto(fila.nave), texto(fila.viaje)].filter(Boolean).join(" · ") || null, icono: "lucide:ship" },
    { label: etiqueta("colSpecies"), valor: texto(fila.especie), icono: "lucide:cherry" },
    { label: etiqueta("colPallets"), valor: texto(fila.pallets), icono: "lucide:layers" },
    { label: etiqueta("colTemperature"), valor: vacio(fila.temperatura) ? null : `${String(fila.temperatura)} °C`, icono: "lucide:thermometer-snowflake" },
  ];

  /* Salto a una sección dentro del panel. Se desplaza el cuerpo y no la
     página: `scrollIntoView` movería también la tabla bloqueada de atrás. */
  const irASeccion = (id: string) => {
    const cuerpo = cuerpoRef.current;
    const el = cuerpo?.querySelector<HTMLElement>(`[data-seccion="${id}"]`);
    if (!cuerpo || !el) return;
    const top = el.getBoundingClientRect().top - cuerpo.getBoundingClientRect().top + cuerpo.scrollTop;
    cuerpo.scrollTo({ top: top - 56, behavior: "smooth" });
  };

  return (
    <PanelBajoFila cerrando={cerrando}>
        {/* ── Cabecera de marca: qué reserva es y de dónde a dónde va ── */}
        <div className="rd-hero shrink-0 px-5 pb-5 pt-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="rd-muted text-[10px] font-bold uppercase tracking-[0.18em]">{tr.detalleReserva}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2.5">
                <h3 className="text-2xl font-extrabold tabular-nums tracking-tight">
                  {displayRefAsli(texto(fila.ref_asli), (fila.correlativo as number | null) ?? null, "-")}
                </h3>
                {estadoTxt && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                      cfg ? `${cfg.bg} ${cfg.text} ${cfg.border}` : "rd-btn"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${cfg?.dot ?? "bg-current"}`} aria-hidden />
                    {estadoTxt}
                  </span>
                )}
                {estado === "cargando" && (
                  <Icon icon="lucide:loader-2" width={15} height={15} className="rd-muted animate-spin" aria-label={tr.detalleCargando} />
                )}
                {estado === "error" && <span className="rd-muted text-xs">{tr.detalleError}</span>}
              </div>
              <p className="rd-muted mt-0.5 truncate text-sm font-medium">
                {[texto(fila.cliente), texto(fila.naviera)].filter(Boolean).join("  ·  ") || "—"}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {/* Documentos en la misma pestaña, como el menú contextual: es
                  seguir trabajando la operación. NaviTrack en una nueva, para
                  mirar el viaje sin perder la lista. */}
              <a
                href={`${withBase("/documentos/mis-documentos")}?op=${encodeURIComponent(op.id)}`}
                className="rd-btn motion-interactive inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold"
              >
                <Icon icon="lucide:folder-open" width={13} height={13} aria-hidden />
                {tr.detalleIrDocumentos}
              </a>
              {fueraDeNavitrack ? (
                <span
                  className="rd-btn inline-flex cursor-not-allowed items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold opacity-50"
                  title={tr[`detalleNavitrack_${fueraDeNavitrack}`]}
                  aria-disabled="true"
                >
                  <Icon icon="lucide:radar" width={13} height={13} aria-hidden />
                  {tr.detalleNavitrack}
                </span>
              ) : (
                <a
                  href={`${withBase("/navitrack")}?op=${encodeURIComponent(op.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rd-btn motion-interactive inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold"
                >
                  <Icon icon="lucide:radar" width={13} height={13} className="rd-acento" aria-hidden />
                  {tr.detalleNavitrack}
                  <Icon icon="lucide:arrow-up-right" width={12} height={12} className="rd-muted" aria-hidden />
                </a>
              )}
              {bookingDoc && (
                <a
                  href={bookingDoc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rd-btn motion-interactive inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold"
                >
                  <Icon icon="lucide:paperclip" width={13} height={13} aria-hidden />
                  {tr.cardViewDoc}
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rd-btn-primario motion-interactive inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold"
                title={`${tr.detalleReplegar} (Esc)`}
              >
                <Icon icon="lucide:chevrons-up" width={14} height={14} aria-hidden />
                {tr.detalleReplegar}
              </button>
            </div>
          </div>

          {/* Ruta: se lee de izquierda a derecha, como el viaje. */}
          <div className="mt-5 grid grid-cols-[minmax(0,1fr)_minmax(5rem,1.4fr)_minmax(0,1fr)] items-center gap-4">
            <div className="min-w-0">
              <p className="rd-muted text-[10px] font-bold uppercase tracking-[0.16em]">{tr.cardOrigin}</p>
              <p className="mt-0.5 flex items-center gap-2 text-lg font-extrabold leading-tight">
                <Bandera puerto={pol} />
                <span className="truncate">{pol ?? "—"}</span>
              </p>
              <p className="rd-muted mt-1 text-[11px] tabular-nums">
                ETD <span className="font-bold text-white">{vacio(fila.etd) ? "—" : fmtFecha(String(fila.etd))}</span>
              </p>
            </div>
            <div className="flex items-center" aria-hidden>
              <span className="h-2 w-2 shrink-0 rounded-full border-2 border-white/60" />
              <span className="rd-ruta flex-1" />
              <span className="rd-nave mx-2 inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold tabular-nums">
                <Icon icon="lucide:ship" width={13} height={13} />
                {tt ? `${tt} ${tr.detalleDias}` : "—"}
              </span>
              <span className="rd-ruta rd-ruta--destino flex-1" />
              <Icon icon="lucide:map-pin" width={14} height={14} className="rd-acento shrink-0" />
            </div>
            <div className="min-w-0 text-right">
              <p className="rd-muted text-[10px] font-bold uppercase tracking-[0.16em]">{tr.cardDestino}</p>
              <p className="mt-0.5 flex items-center justify-end gap-2 text-lg font-extrabold leading-tight">
                <span className="truncate">{pod ?? "—"}</span>
                <Bandera puerto={pod} />
              </p>
              <p className="rd-muted mt-1 text-[11px] tabular-nums">
                ETA <span className="font-bold text-white">{vacio(fila.eta) ? "—" : fmtFecha(String(fila.eta))}</span>
              </p>
            </div>
          </div>

          {/* Lo que más se busca, a la vista sin entrar a las secciones. */}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {resumen.map((r) => (
              <div key={r.label} className="rd-vidrio min-w-0 rounded-xl px-3 py-2">
                <p className="rd-muted flex items-center gap-1.5 truncate text-[10px] font-bold uppercase tracking-wider">
                  <Icon icon={r.icono} width={12} height={12} className="rd-acento shrink-0" aria-hidden />
                  {r.label}
                </p>
                <p
                  className={`mt-0.5 truncate text-[14px] ${r.valor ? "font-bold" : "rd-muted"} ${
                    r.mono && r.valor ? "font-mono tracking-tight" : ""
                  }`}
                >
                  {r.valor ?? "—"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Cuerpo: índice de secciones fijo arriba y las secciones debajo ── */}
        <div ref={cuerpoRef} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="sticky top-0 z-10 flex items-center gap-2 overflow-x-auto border-b border-dash-border bg-[color-mix(in_srgb,var(--dash-bg)_88%,transparent)] px-4 py-2.5 backdrop-blur-md">
            {grupos.map((g) => {
              const llenos = g.campos.filter((c) => !vacio(fila[c.key])).length;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => irASeccion(g.id)}
                  className="rd-chip motion-interactive inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
                >
                  <Icon icon={g.icono} width={12} height={12} aria-hidden />
                  {tr[g.tituloKey]}
                  <span className="tabular-nums opacity-70">{llenos}</span>
                </button>
              );
            })}
            <span className="ml-auto" />
            <button
              type="button"
              onClick={() => setSoloConDatos((v) => !v)}
              aria-pressed={soloConDatos}
              className={`motion-interactive inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                soloConDatos ? "estado--curso estado-chip" : "rd-chip"
              }`}
            >
              <Icon icon={soloConDatos ? "lucide:eye-off" : "lucide:eye"} width={12} height={12} aria-hidden />
              {tr.detalleSoloConDatos}
            </button>
          </div>

          <div className="px-4 py-4">
            <SeccionesOperacion
              fila={fila}
              grupos={grupos}
              soloConDatos={soloConDatos}
              labels={labels}
              guardar={estado === "listo" ? guardar : undefined}
              opciones={opciones}
            />

            {(observaciones || (guardar && estado === "listo")) && (
              <section
                style={staggerStyle(grupos.length)}
                className="rd-card motion-view-section flex gap-3 rounded-2xl px-4 py-3.5"
              >
                <span className="rd-icono flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                  <Icon icon="lucide:message-square-text" width={17} height={17} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-dash-fg">{etiqueta("colObservations")}</p>
                  {guardar && estado === "listo" ? (
                    <ObservacionesEditables
                      valor={observaciones}
                      guardar={guardar}
                      placeholder={tr.detalleObservacionesVacias}
                      guardarLabel={tr.detalleGuardar}
                      cancelarLabel={tr.detalleCancelar}
                    />
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-dash-fg/90">{observaciones}</p>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
    </PanelBajoFila>
  );
}

/**
 * Las observaciones son texto largo: Enter es salto de línea, así que se
 * guardan con botón (o Ctrl+Enter) y no al salir del campo, para que un clic
 * fuera no publique una nota a medio escribir.
 */
function ObservacionesEditables({
  valor,
  guardar,
  placeholder,
  guardarLabel,
  cancelarLabel,
}: {
  valor: string | null;
  guardar: GuardarCampo;
  placeholder: string;
  guardarLabel: string;
  cancelarLabel: string;
}) {
  const [borrador, setBorrador] = useState(valor ?? "");
  const [guardando, setGuardando] = useState(false);
  const cambiado = borrador.trim() !== (valor ?? "").trim();

  const confirmar = async () => {
    if (!cambiado || guardando) return;
    setGuardando(true);
    await guardar("observaciones", borrador.trim() || null);
    setGuardando(false);
  };

  return (
    <div className="mt-1.5">
      <textarea
        value={borrador}
        rows={Math.min(8, Math.max(2, borrador.split("\n").length))}
        placeholder={placeholder}
        disabled={guardando}
        onChange={(e) => setBorrador(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            void confirmar();
          }
        }}
        className="w-full resize-y rounded-lg border border-dash-border bg-dash-bg px-2.5 py-2 text-[13px] leading-relaxed text-dash-fg outline-none placeholder:text-dash-muted/60 focus:ring-2 focus:ring-[var(--estado-curso)]"
      />
      {cambiado && (
        <div className="mt-1.5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setBorrador(valor ?? "")}
            disabled={guardando}
            className="rd-chip motion-interactive rounded-full px-3 py-1 text-[11px] font-semibold"
          >
            {cancelarLabel}
          </button>
          <button
            type="button"
            onClick={() => void confirmar()}
            disabled={guardando}
            className="estado--curso estado-chip motion-interactive inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold"
          >
            {guardando && <Icon icon="lucide:loader-2" width={12} height={12} className="animate-spin" aria-hidden />}
            {guardarLabel}
          </button>
        </div>
      )}
    </div>
  );
}

/** Anillo de avance de una sección: cuánto de lo que pide está cargado. */
export function Avance({ frac, tono }: { frac: number; tono: string }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  return (
    <span className={`${tono} relative inline-flex h-9 w-9 shrink-0 items-center justify-center`} aria-hidden>
      <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3" className="stroke-dash-border" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          stroke="var(--estado)"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
        />
      </svg>
      <span className="absolute text-[9px] font-extrabold tabular-nums" style={{ color: "var(--estado)" }}>
        {Math.round(frac * 100)}
      </span>
    </span>
  );
}
