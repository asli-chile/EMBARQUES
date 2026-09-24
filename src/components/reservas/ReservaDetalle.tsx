import { useEffect, useRef, useState } from "react";
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
};

type Grupo = {
  id: string;
  tituloKey: string;
  icono: string;
  campos: Campo[];
  /** Costos, márgenes y facturación: el cliente no los ve. */
  interno?: boolean;
};

const GRUPOS: Grupo[] = [
  {
    id: "general",
    tituloKey: "detalleGeneral",
    icono: "lucide:hash",
    campos: [
      { key: "referencia_externa", labelKey: "colRefExterna" },
      { key: "temporada", labelKey: "colTemporada" },
      { key: "ingreso", labelKey: "colEntryDate", formato: "fecha" },
      { key: "semana", labelKey: "colWeek" },
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
      { key: "cliente", labelKey: "colClient" },
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
      { key: "temperatura", labelKey: "colTemperature", formato: "numero", sufijo: " °C" },
      { key: "ventilacion", labelKey: "colVentilation", formato: "numero" },
      { key: "tratamiento_frio", labelKey: "colColdTreatment" },
      { key: "tipo_atmosfera", labelKey: "colAtmosphereType" },
      { key: "tratamiento_frio_o2", labelKey: "colO2", formato: "numero" },
      { key: "tratamiento_frio_co2", labelKey: "colCO2", formato: "numero" },
      { key: "pallets", labelKey: "colPallets", formato: "numero" },
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
      { key: "tt", labelKey: "colTransitDays", formato: "numero" },
    ],
  },
  {
    id: "contenedor",
    tituloKey: "detalleContenedor",
    icono: "lucide:container",
    campos: [
      { key: "contenedor", labelKey: "colContainer", mono: true },
      { key: "sello", labelKey: "colSeal", mono: true },
      { key: "sello_planta", labelKey: "colPlantSeal", mono: true },
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
      { key: "patente_camion", labelKey: "colTruckPlate", mono: true },
      { key: "patente_remolque", labelKey: "colTrailerPlate", mono: true },
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
      { key: "fob_invoice", labelKey: "colFobInvoice", mono: true },
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
}: {
  fila: Fila;
  grupos: Grupo[];
  soloConDatos: boolean;
  labels: ReservaDetalleLabels;
}) {
  const { tr, campos } = labels;
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
                      <dd
                        className={`mt-0.5 break-words text-[13px] leading-snug ${
                          sinDato ? "text-dash-muted/45" : "font-semibold text-dash-fg"
                        } ${c.mono && !sinDato ? "font-mono tracking-tight" : ""}`}
                      >
                        {fmtValor(c, v, fila, si, no)}
                      </dd>
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
  /** El padre lo pone en `true` al replegar y desmonta al terminar la salida. */
  cerrando: boolean;
  onClose: () => void;
};

export function ReservaDetalle({ op, isCliente, supabase, labels, cerrando, onClose }: Props) {
  const { completa, estado } = useOperacionCompleta(supabase, op.id);
  const [soloConDatos, setSoloConDatos] = useState(false);
  const cuerpoRef = useRef<HTMLDivElement>(null);
  const { tr, campos } = labels;

  const fila: Fila = { ...(completa ?? {}), ...op };
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
            <SeccionesOperacion fila={fila} grupos={grupos} soloConDatos={soloConDatos} labels={labels} />

            {observaciones && (
              <section
                style={staggerStyle(grupos.length)}
                className="rd-card motion-view-section flex gap-3 rounded-2xl px-4 py-3.5"
              >
                <span className="rd-icono flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                  <Icon icon="lucide:message-square-text" width={17} height={17} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-dash-fg">{etiqueta("colObservations")}</p>
                  <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-dash-fg/90">{observaciones}</p>
                </div>
              </section>
            )}
          </div>
        </div>
    </PanelBajoFila>
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
