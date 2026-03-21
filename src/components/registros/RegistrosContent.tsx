import { type Ref, forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import type { ColDef, ColGroupDef } from "ag-grid-community";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { columnWidths } from "@/lib/registros-table-config";
import { sileo } from "sileo";

ModuleRegistry.registerModules([AllCommunityModule]);

export type OperacionRow = {
  id: string;
  correlativo: number;
  ref_asli: string;
  ingreso: string;
  semana: number | null;
  ejecutivo: string;
  estado_operacion: string;
  tipo_operacion: string;
  cliente: string;
  consignatario: string;
  incoterm: string;
  forma_pago: string;
  especie: string;
  pais: string;
  temperatura: string;
  ventilacion: number | null;
  tratamiento_frio: string;
  tratamiento_frio_o2: number | null;
  tratamiento_frio_co2: number | null;
  tipo_atmosfera: string;
  pallets: number | null;
  peso_bruto: number | null;
  peso_neto: number | null;
  tipo_unidad: string;
  naviera: string;
  nave: string;
  pol: string;
  etd: string;
  pod: string;
  eta: string;
  tt: number | null;
  booking: string;
  aga: string;
  dus: string;
  sps: string;
  numero_guia_despacho: string;
  planta_presentacion: string;
  citacion: string;
  llegada_planta: string;
  salida_planta: string;
  inicio_stacking: string;
  fin_stacking: string;
  ingreso_stacking: string;
  corte_documental: string;
  inf_late: string;
  late_inicio: string;
  late_fin: string;
  xlate_inicio: string;
  xlate_fin: string;
  deposito: string;
  agendamiento_retiro: string;
  devolucion_unidad: string;
  transporte: string;
  chofer: string;
  rut_chofer: string;
  telefono_chofer: string;
  patente_camion: string;
  patente_remolque: string;
  contenedor: string;
  sello: string;
  tara: number | null;
  almacenamiento: number | null;
  tramo: string;
  valor_tramo: number | null;
  porteo: boolean;
  valor_porteo: number | null;
  falso_flete: boolean;
  valor_falso_flete: number | null;
  factura_transporte: string;
  monto_facturado: number | null;
  numero_factura_asli: string;
  concepto_facturado: string;
  moneda: string;
  tipo_cambio: number | null;
  margen_estimado: number | null;
  margen_real: number | null;
  fecha_confirmacion_booking: string;
  fecha_envio_documentacion: string;
  fecha_entrega_bl: string;
  fecha_entrega_factura: string;
  fecha_pago_cliente: string;
  fecha_pago_transporte: string;
  fecha_cierre: string;
  prioridad: string;
  operacion_critica: boolean;
  origen_registro: string;
  enviado_transporte: boolean;
  observaciones: string;
};

type DbOperacion = {
  id: string;
  correlativo: number;
  ref_asli: string | null;
  ingreso: string | null;
  semana: number | null;
  ejecutivo: string;
  estado_operacion: string;
  tipo_operacion: string;
  cliente: string;
  consignatario: string | null;
  incoterm: string | null;
  forma_pago: string | null;
  especie: string | null;
  pais: string | null;
  temperatura: string | null;
  ventilacion: number | null;
  tratamiento_frio: string | null;
  tratamiento_frio_o2: number | null;
  tratamiento_frio_co2: number | null;
  tipo_atmosfera: string | null;
  pallets: number | null;
  peso_bruto: number | null;
  peso_neto: number | null;
  tipo_unidad: string | null;
  naviera: string | null;
  nave: string | null;
  viaje: string | null;
  pol: string | null;
  etd: string | null;
  pod: string | null;
  eta: string | null;
  tt: number | null;
  booking: string | null;
  aga: string | null;
  dus: string | null;
  sps: string | null;
  numero_guia_despacho: string | null;
  planta_presentacion: string | null;
  citacion: string | null;
  llegada_planta: string | null;
  salida_planta: string | null;
  inicio_stacking: string | null;
  fin_stacking: string | null;
  ingreso_stacking: string | null;
  corte_documental: string | null;
  inf_late: string | null;
  late_inicio: string | null;
  late_fin: string | null;
  xlate_inicio: string | null;
  xlate_fin: string | null;
  deposito: string | null;
  agendamiento_retiro: string | null;
  devolucion_unidad: string | null;
  transporte: string | null;
  chofer: string | null;
  rut_chofer: string | null;
  telefono_chofer: string | null;
  patente_camion: string | null;
  patente_remolque: string | null;
  contenedor: string | null;
  sello: string | null;
  tara: number | null;
  almacenamiento: number | null;
  tramo: string | null;
  valor_tramo: number | null;
  porteo: boolean | null;
  valor_porteo: number | null;
  falso_flete: boolean | null;
  valor_falso_flete: number | null;
  factura_transporte: string | null;
  monto_facturado: number | null;
  numero_factura_asli: string | null;
  concepto_facturado: string | null;
  moneda: string | null;
  tipo_cambio: number | null;
  margen_estimado: number | null;
  margen_real: number | null;
  fecha_confirmacion_booking: string | null;
  fecha_envio_documentacion: string | null;
  fecha_entrega_bl: string | null;
  fecha_entrega_factura: string | null;
  fecha_pago_cliente: string | null;
  fecha_pago_transporte: string | null;
  fecha_cierre: string | null;
  prioridad: string | null;
  operacion_critica: boolean | null;
  origen_registro: string | null;
  enviado_transporte: boolean | null;
  observaciones: string | null;
};

function isoWeekFromDate(value: string | null): number | null {
  if (!value) return null;
  const d = new Date(Date.UTC(...(value.split("-").map(Number) as [number, number, number])));
  if (isNaN(d.getTime())) return null;
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function formatDate(value: string | null, _locale: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTime(value: string | null, _locale: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// ─── Helpers de parseo de fecha ───────────────────────────────────────────────
function parseDateInput(val: string): string | null {
  if (!val?.trim()) return null;
  const m1 = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2, "0")}-${m1[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.substring(0, 10);
  return null;
}

function parseDateTimeInput(val: string): string | null {
  if (!val?.trim()) return null;
  const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}T${m[4].padStart(2, "0")}:${m[5]}:00`;
  const d = parseDateInput(val);
  return d ? `${d}T00:00:00` : null;
}

const DATE_FIELDS = new Set(["etd", "eta"]);
const DATETIME_FIELDS = new Set([
  "citacion", "llegada_planta", "salida_planta", "inicio_stacking",
  "fin_stacking", "ingreso_stacking", "corte_documental",
  "inf_late", "late_inicio", "late_fin", "xlate_inicio", "xlate_fin",
  "agendamiento_retiro", "devolucion_unidad",
  "fecha_confirmacion_booking", "fecha_envio_documentacion",
  "fecha_entrega_bl", "fecha_entrega_factura",
  "fecha_pago_cliente", "fecha_pago_transporte", "fecha_cierre",
]);

// ─── Campos que permiten agregar valores nuevos a la BD ───────────────────────
const ADDABLE_FIELDS = {
  naviera:             { table: "navieras",       label: "Navieras",           catalogKey: "navieras"       },
  especie:             { table: "especies",        label: "Especies",           catalogKey: "especies"       },
  planta_presentacion: { table: "plantas",         label: "Plantas",            catalogKey: "plantas"        },
  deposito:            { table: "depositos",       label: "Depósitos",          catalogKey: "depositos"      },
  pol:                 { table: "puertos_origen",  label: "Puertos de Origen",  catalogKey: "puertos_origen" },
  cliente:             { table: "empresas",        label: "Empresas",           catalogKey: "empresas"       },
  pod:                 { table: "destinos",        label: "Destinos (POD)",     catalogKey: "destinos"       },
  consignatario:       { table: "consignatarios",  label: "Consignatarios",     catalogKey: "consignatarios" },
} as const;

// ─── Editor combinado: dropdown filtrable + texto libre ───────────────────────
interface ComboboxEditorProps {
  value: string;
  values: string[];
  stopEditing: (cancel?: boolean) => void;
}

const ComboboxCellEditor = forwardRef(function ComboboxCellEditor(
  props: ComboboxEditorProps,
  ref: Ref<{ getValue: () => string; isPopup: () => boolean }>
) {
  const [inputVal, setInputVal] = useState<string>(props.value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = inputVal.toLowerCase();
    if (!q) return props.values.slice(0, 100);
    return props.values.filter((v) => v.toLowerCase().includes(q)).slice(0, 100);
  }, [inputVal, props.values]);

  // isPopup:true → AG Grid renderiza el editor fuera de la celda,
  // evitando que el overflow:hidden de la grilla corte el desplegable.
  useImperativeHandle(ref, () => ({
    getValue: () => inputVal,
    isPopup: () => true,
  }));

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const choose = (v: string) => {
    setInputVal(v);
    setTimeout(() => props.stopEditing(), 0);
  };

  return (
    <div
      style={{
        background: "white",
        border: "2px solid #107C41",
        boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
        minWidth: 180,
        fontFamily: "'Calibri', 'Segoe UI', sans-serif",
        fontSize: 13,
      }}
    >
      <input
        ref={inputRef}
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { props.stopEditing(); e.preventDefault(); }
          if (e.key === "Escape") { props.stopEditing(true); }
          if (e.key === "Tab") { props.stopEditing(); }
        }}
        style={{
          width: "100%", padding: "4px 8px",
          border: "none", borderBottom: "1px solid #D5D5D5",
          outline: "none", fontSize: 13,
          fontFamily: "'Calibri', 'Segoe UI', sans-serif",
          boxSizing: "border-box", background: "#fff",
        }}
        placeholder="Buscar o escribir..."
      />
      {filtered.length > 0 && (
        <div style={{ maxHeight: 220, overflowY: "auto" }}>
          {filtered.map((v) => (
            <div
              key={v}
              onMouseDown={() => choose(v)}
              style={{
                padding: "4px 10px", cursor: "pointer",
                borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#BDD7EE")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
            >
              {v}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

function createToRow(locale: string) {
  return function toRow(db: DbOperacion): OperacionRow {
    return {
      id: db.id,
      correlativo: db.correlativo,
      ref_asli: db.ref_asli ?? `A${String(db.correlativo).padStart(5, "0")}`,
      ingreso: formatDateTime(db.ingreso, locale),
      semana: isoWeekFromDate(db.etd),
      ejecutivo: db.ejecutivo,
      estado_operacion: db.estado_operacion,
      tipo_operacion: db.tipo_operacion,
      cliente: db.cliente,
      consignatario: db.consignatario ?? "",
      incoterm: db.incoterm ?? "",
      forma_pago: db.forma_pago ?? "",
      especie: db.especie ?? "",
      pais: db.pais ?? "",
      temperatura: db.temperatura ?? "",
      ventilacion: db.ventilacion ?? null,
      tratamiento_frio: db.tratamiento_frio ?? "",
      tratamiento_frio_o2: db.tratamiento_frio_o2,
      tratamiento_frio_co2: db.tratamiento_frio_co2,
      tipo_atmosfera: db.tipo_atmosfera ?? "",
      pallets: db.pallets,
      peso_bruto: db.peso_bruto,
      peso_neto: db.peso_neto,
      tipo_unidad: db.tipo_unidad ?? "",
      naviera: db.naviera ?? "",
      nave: db.nave ?? "",
      viaje: db.viaje ?? "",
      pol: db.pol ?? "",
      etd: formatDate(db.etd, locale),
      pod: db.pod ?? "",
      eta: formatDate(db.eta, locale),
      tt: db.tt,
      booking: db.booking ?? "",
      aga: db.aga ?? "",
      dus: db.dus ?? "",
      sps: db.sps ?? "",
      numero_guia_despacho: db.numero_guia_despacho ?? "",
      planta_presentacion: db.planta_presentacion ?? "",
      citacion: formatDateTime(db.citacion, locale),
      llegada_planta: formatDateTime(db.llegada_planta, locale),
      salida_planta: formatDateTime(db.salida_planta, locale),
      inicio_stacking: formatDateTime(db.inicio_stacking, locale),
      fin_stacking: formatDateTime(db.fin_stacking, locale),
      ingreso_stacking: formatDateTime(db.ingreso_stacking, locale),
      corte_documental: formatDateTime(db.corte_documental, locale),
      inf_late: formatDateTime(db.inf_late, locale),
      late_inicio: formatDateTime(db.late_inicio, locale),
      late_fin: formatDateTime(db.late_fin, locale),
      xlate_inicio: formatDateTime(db.xlate_inicio, locale),
      xlate_fin: formatDateTime(db.xlate_fin, locale),
      deposito: db.deposito ?? "",
      agendamiento_retiro: formatDateTime(db.agendamiento_retiro, locale),
      devolucion_unidad: formatDateTime(db.devolucion_unidad, locale),
      transporte: db.transporte ?? "",
      chofer: db.chofer ?? "",
      rut_chofer: db.rut_chofer ?? "",
      telefono_chofer: db.telefono_chofer ?? "",
      patente_camion: db.patente_camion ?? "",
      patente_remolque: db.patente_remolque ?? "",
      contenedor: db.contenedor ?? "",
      sello: db.sello ?? "",
      tara: db.tara,
      almacenamiento: db.almacenamiento,
      tramo: db.tramo ?? "",
      valor_tramo: db.valor_tramo,
      porteo: db.porteo ?? false,
      valor_porteo: db.valor_porteo,
      falso_flete: db.falso_flete ?? false,
      valor_falso_flete: db.valor_falso_flete,
      factura_transporte: db.factura_transporte ?? "",
      monto_facturado: db.monto_facturado,
      numero_factura_asli: db.numero_factura_asli ?? "",
      concepto_facturado: db.concepto_facturado ?? "",
      moneda: db.moneda ?? "CLP",
      tipo_cambio: db.tipo_cambio,
      margen_estimado: db.margen_estimado,
      margen_real: db.margen_real,
      fecha_confirmacion_booking: formatDateTime(db.fecha_confirmacion_booking, locale),
      fecha_envio_documentacion: formatDateTime(db.fecha_envio_documentacion, locale),
      fecha_entrega_bl: formatDateTime(db.fecha_entrega_bl, locale),
      fecha_entrega_factura: formatDateTime(db.fecha_entrega_factura, locale),
      fecha_pago_cliente: formatDateTime(db.fecha_pago_cliente, locale),
      fecha_pago_transporte: formatDateTime(db.fecha_pago_transporte, locale),
      fecha_cierre: formatDateTime(db.fecha_cierre, locale),
      prioridad: db.prioridad ?? "",
      operacion_critica: db.operacion_critica ?? false,
      origen_registro: db.origen_registro ?? "manual",
      enviado_transporte: db.enviado_transporte ?? false,
      observaciones: db.observaciones ?? "",
    };
  };
}

type CatalogosState = {
  estado_operacion: string[];
  tipo_operacion: string[];
  incoterm: string[];
  forma_pago: string[];
  tipo_unidad: string[];
  moneda: string[];
  prioridad: string[];
  tratamiento_frio: string[];
  tipo_atmosfera: string[];
  navieras: string[];
  naves: { naviera: string; nombre: string }[];
  plantas: string[];
  depositos: string[];
  destinos: { nombre: string; pais: string }[];
  paises: string[];
  puertos_origen: string[];
  especies: string[];
  consignatarios: string[];
  ejecutivos: string[];
  empresas: string[];
};

const emptyCatalogos: CatalogosState = {
  estado_operacion: [],
  tipo_operacion: [],
  incoterm: [],
  forma_pago: [],
  tipo_unidad: [],
  moneda: [],
  prioridad: [],
  tratamiento_frio: [],
  tipo_atmosfera: [],
  navieras: [],
  naves: [],
  plantas: [],
  depositos: [],
  destinos: [],
  paises: [],
  puertos_origen: [],
  especies: [],
  consignatarios: [],
  ejecutivos: [],
  empresas: [],
};

// ─── Grupos de columnas para el panel de visibilidad ──────────────────────────
const COLUMN_GROUPS = [
  { label: "Identificación y Control",     fields: ["origen_registro", "prioridad", "operacion_critica", "estado_operacion", "tipo_operacion", "semana", "ingreso"] },
  { label: "Cliente y Condiciones",        fields: ["ejecutivo", "cliente", "consignatario", "incoterm", "forma_pago", "pais"] },
  { label: "Carga / Mercadería",           fields: ["especie", "temperatura", "ventilacion", "tratamiento_frio", "tratamiento_frio_o2", "tratamiento_frio_co2", "tipo_atmosfera", "pallets", "peso_bruto", "peso_neto"] },
  { label: "Unidad y Contenedor",          fields: ["tipo_unidad", "contenedor", "sello", "tara"] },
  { label: "Naviera y Viaje",              fields: ["naviera", "nave", "viaje", "pol", "etd", "pod", "eta", "tt", "booking"] },
  { label: "Documentación",               fields: ["aga", "dus", "sps", "numero_guia_despacho"] },
  { label: "Planta y Proceso",             fields: ["planta_presentacion", "citacion", "llegada_planta", "salida_planta"] },
  { label: "Stacking y Puerto",            fields: ["inicio_stacking", "fin_stacking", "ingreso_stacking", "corte_documental"] },
  { label: "Eventos Late / xLate",         fields: ["inf_late", "late_inicio", "late_fin", "xlate_inicio", "xlate_fin"] },
  { label: "Depósito y Movimientos",       fields: ["deposito", "agendamiento_retiro", "devolucion_unidad"] },
  { label: "Transporte",                   fields: ["transporte", "chofer", "rut_chofer", "telefono_chofer", "patente_camion", "patente_remolque"] },
  { label: "Costos y Logística",           fields: ["almacenamiento", "tramo", "valor_tramo", "porteo", "valor_porteo", "falso_flete", "valor_falso_flete"] },
  { label: "Facturación",                  fields: ["factura_transporte", "monto_facturado", "numero_factura_asli", "concepto_facturado", "moneda", "tipo_cambio"] },
  { label: "Márgenes",                     fields: ["margen_estimado", "margen_real"] },
  { label: "Hitos Administrativos",        fields: ["fecha_confirmacion_booking", "fecha_envio_documentacion", "fecha_entrega_bl", "fecha_entrega_factura", "fecha_pago_cliente", "fecha_pago_transporte", "fecha_cierre"] },
  { label: "Control y Auditoría",          fields: ["observaciones"] },
  { label: "Integraciones / Flujo",        fields: ["enviado_transporte"] },
];

export function RegistrosContent() {
  const { locale, t } = useLocale();
  const { isCliente, empresaNombres, isLoading: authLoading, user } = useAuth();
  const canEdit = !isCliente;
  const gridRef = useRef<AgGridReact<OperacionRow>>(null);
  const [selectionCount, setSelectionCount] = useState(0);
  const [rowData, setRowData] = useState<OperacionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalogos, setCatalogos] = useState<CatalogosState>(emptyCatalogos);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [addNewModal, setAddNewModal] = useState<{
    field: string;
    newValue: string;
    table: string;
    label: string;
  } | null>(null);
  const [showColumnPanel, setShowColumnPanel] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const hiddenColumnsRef = useRef<Set<string>>(new Set());

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const toRow = useMemo(() => createToRow(locale), [locale]);

  // ─── Aplicar columnas ocultas a la grilla ──────────────────────────────────
  const applyHiddenColumns = useCallback((hidden: Set<string>) => {
    const api = gridRef.current?.api;
    if (!api) return;
    const allCols = api.getColumns();
    if (!allCols) return;
    allCols.forEach((col) => {
      const field = col.getColDef().field;
      if (!field) return;
      api.setColumnsVisible([col.getColId()], !hidden.has(field));
    });
  }, []);

  const saveColumnOrder = useCallback(() => {
    if (!user?.id) return;
    const api = gridRef.current?.api;
    if (!api) return;
    try {
      const state = api.getColumnState();
      const order = state.map((s) => s.colId);
      localStorage.setItem(`registros_col_order_${user.id}`, JSON.stringify(order));
    } catch { /* ignore */ }
  }, [user?.id]);

  const applyColumnOrder = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api || !user?.id) return;
    try {
      const stored = localStorage.getItem(`registros_col_order_${user.id}`);
      if (!stored) return;
      const order = JSON.parse(stored) as string[];
      api.applyColumnState({
        state: order.map((colId) => ({ colId })),
        applyOrder: true,
      });
    } catch { /* ignore */ }
  }, [user?.id]);

  const onGridReady = useCallback(() => {
    applyHiddenColumns(hiddenColumnsRef.current);
    applyColumnOrder();
  }, [applyHiddenColumns, applyColumnOrder]);

  const toggleColumn = useCallback((field: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      hiddenColumnsRef.current = next;
      if (user?.id) {
        try {
          localStorage.setItem(`registros_hidden_cols_${user.id}`, JSON.stringify([...next]));
        } catch { /* ignore */ }
      }
      const api = gridRef.current?.api;
      if (api) api.setColumnsVisible([field], !next.has(field));
      return next;
    });
  }, [user?.id]);

  const toggleSection = useCallback((fields: string[]) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      const allHidden = fields.every((f) => next.has(f));
      if (allHidden) {
        fields.forEach((f) => next.delete(f));
      } else {
        fields.forEach((f) => next.add(f));
      }
      hiddenColumnsRef.current = next;
      if (user?.id) {
        try {
          localStorage.setItem(`registros_hidden_cols_${user.id}`, JSON.stringify([...next]));
        } catch { /* ignore */ }
      }
      const api = gridRef.current?.api;
      if (api) fields.forEach((f) => api.setColumnsVisible([f], !next.has(f)));
      return next;
    });
  }, [user?.id]);

  const showAllColumns = useCallback(() => {
    setHiddenColumns(new Set());
    hiddenColumnsRef.current = new Set();
    if (user?.id) {
      try { localStorage.removeItem(`registros_hidden_cols_${user.id}`); } catch { /* ignore */ }
    }
    applyHiddenColumns(new Set());
  }, [user?.id, applyHiddenColumns]);


  // onDragStopped: solo se dispara en drag manual del usuario, NUNCA en cambios programáticos
  // (onColumnMoved también se dispara cuando AG Grid procesa cambios de columnDefs, sobreescribiendo el orden guardado)
  const onDragStopped = useCallback(() => {
    saveColumnOrder();
  }, [saveColumnOrder]);

  // Cargar preferencias guardadas cuando el usuario está disponible
  useEffect(() => {
    if (!user?.id) return;
    try {
      const stored = localStorage.getItem(`registros_hidden_cols_${user.id}`);
      if (stored) {
        const fields = JSON.parse(stored) as string[];
        const newSet = new Set(fields);
        hiddenColumnsRef.current = newSet;
        setHiddenColumns(newSet);
        applyHiddenColumns(newSet);
      }
    } catch { /* ignore */ }
    // Restaurar orden guardado
    applyColumnOrder();
  }, [user?.id, applyHiddenColumns, applyColumnOrder]);

  const fetchCatalogos = useCallback(async () => {
    if (!supabase) return;

    const [
      catalogosRes,
      navierasRes,
      navesRes,
      plantasRes,
      depositosRes,
      destinosRes,
      puertosRes,
      especiesRes,
      consignatariosRes,
      usuariosRes,
      empresasRes,
    ] = await Promise.all([
      supabase.from("catalogos").select("categoria, valor").eq("activo", true).order("orden"),
      supabase.from("navieras").select("nombre").order("nombre"),
      supabase.from("navieras_naves").select("naves(nombre), navieras(nombre)"),
      supabase.from("plantas").select("nombre").eq("activo", true).order("nombre"),
      supabase.from("depositos").select("nombre").eq("activo", true).order("nombre"),
      supabase.from("destinos").select("nombre, pais").eq("activo", true).order("nombre"),
      supabase.from("puertos_origen").select("nombre").eq("activo", true).order("nombre"),
      supabase.from("especies").select("nombre").eq("activo", true).order("nombre"),
      supabase.from("consignatarios").select("nombre").eq("activo", true).order("nombre"),
      supabase.from("usuarios").select("nombre").in("rol", ["ejecutivo", "admin", "superadmin"]).eq("activo", true).order("nombre"),
      supabase.from("empresas").select("nombre").order("nombre"),
    ]);

    const catData = catalogosRes.data ?? [];
    const getByCategoria = (cat: string) => catData.filter((c) => c.categoria === cat).map((c) => c.valor);

    const destinosData = destinosRes.data ?? [];
    const paisesUnicos = [...new Set(destinosData.map((d) => d.pais).filter(Boolean))].sort();

    setCatalogos({
      estado_operacion: getByCategoria("estado_operacion"),
      tipo_operacion: getByCategoria("tipo_operacion"),
      incoterm: getByCategoria("incoterm"),
      forma_pago: getByCategoria("forma_pago"),
      tipo_unidad: getByCategoria("tipo_unidad"),
      moneda: getByCategoria("moneda"),
      prioridad: getByCategoria("prioridad"),
      tratamiento_frio: getByCategoria("tratamiento_frio"),
      tipo_atmosfera: getByCategoria("tipo_atmosfera"),
      navieras: (navierasRes.data ?? []).map((n) => n.nombre),
      naves: (navesRes.data ?? [])
        .map((n: Record<string, unknown>) => ({
          naviera: ((n.navieras as Record<string, string>)?.nombre) ?? "",
          nombre: ((n.naves as Record<string, string>)?.nombre) ?? "",
        }))
        .filter((n) => n.nombre)
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      plantas: (plantasRes.data ?? []).map((p) => p.nombre),
      depositos: (depositosRes.data ?? []).map((d) => d.nombre),
      destinos: destinosData.map((d) => ({ nombre: d.nombre, pais: d.pais ?? "" })),
      paises: paisesUnicos,
      puertos_origen: (puertosRes.data ?? []).map((p) => p.nombre),
      especies: (especiesRes.data ?? []).map((e) => e.nombre),
      consignatarios: (consignatariosRes.data ?? []).map((c) => c.nombre),
      ejecutivos: (usuariosRes.data ?? []).map((u) => u.nombre),
      empresas: (empresasRes.data ?? []).map((e) => e.nombre),
    });
  }, [supabase]);

  const fetchOperaciones = useCallback(async () => {
    if (!supabase) {
      setError(t.registros.supabaseError);
      setLoading(false);
      return;
    }
    if (authLoading) return;
    setLoading(true);
    setError(null);
    let q = supabase
      .from("operaciones")
      .select("*")
      .is("deleted_at", null);
    if (empresaNombres.length > 0) {
      q = q.in("cliente", empresaNombres);
    } else if (isCliente) {
      setRowData([]);
      setLoading(false);
      return;
    }
    const { data, error: err } = await q.order("correlativo", { ascending: false });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setRowData((data ?? []).map(toRow));
  }, [supabase, authLoading, isCliente, empresaNombres, t.registros.supabaseError, toRow]);

  useEffect(() => {
    void fetchCatalogos();
  }, [fetchCatalogos]);

  useEffect(() => {
    if (!authLoading) void fetchOperaciones();
    else setRowData([]);
  }, [authLoading, fetchOperaciones]);

  const booleanCellRenderer = useCallback(
    (p: { value: boolean }) => (p.value ? t.registros.yes : t.registros.no),
    [t.registros.yes, t.registros.no]
  );

  const leafCols = useMemo<ColDef<OperacionRow>[]>(
    () => [
      // ── 1. Identificación y Control ───────────────────────────────────────────
      { field: "ref_asli", headerName: t.registros.colRefAsli, sortable: true, width: columnWidths.refAsli, pinned: "left", lockPinned: true, suppressMovable: true },
      { field: "origen_registro", headerName: t.registros.colRecordOrigin, sortable: true, width: columnWidths.origenRegistro },
      {
        field: "prioridad", headerName: t.registros.colPriority, sortable: true, editable: canEdit, width: columnWidths.prioridad,
        cellEditor: "agSelectCellEditor", cellEditorPopup: true, cellEditorParams: { values: ["", ...catalogos.prioridad] },
      },
      {
        field: "operacion_critica", headerName: t.registros.colCriticalOp, sortable: true, editable: canEdit, width: columnWidths.operacionCritica,
        cellRenderer: booleanCellRenderer, cellEditor: "agSelectCellEditor", cellEditorPopup: true, cellEditorParams: { values: [true, false] },
      },
      {
        field: "estado_operacion", headerName: t.registros.colOperationStatus, sortable: true, editable: canEdit, width: columnWidths.estadoOperacion,
        cellEditor: "agSelectCellEditor", cellEditorPopup: true, cellEditorParams: { values: catalogos.estado_operacion },
      },
      {
        field: "tipo_operacion", headerName: t.registros.colOperationType, sortable: true, editable: canEdit, width: columnWidths.tipoOperacion,
        cellEditor: "agSelectCellEditor", cellEditorPopup: true, cellEditorParams: { values: catalogos.tipo_operacion },
      },
      { field: "semana", headerName: t.registros.colWeek, sortable: true, editable: false, width: columnWidths.semana },
      { field: "ingreso", headerName: t.registros.colEntryDate, sortable: true, width: columnWidths.ingreso },

      // ── 2. Cliente y Condiciones Comerciales ──────────────────────────────────
      {
        field: "ejecutivo", headerName: t.registros.colExecutive, sortable: true, editable: canEdit, width: columnWidths.ejecutivo,
        cellEditor: "agSelectCellEditor", cellEditorPopup: true, cellEditorParams: { values: ["", ...catalogos.ejecutivos] },
      },
      {
        field: "cliente", headerName: t.registros.colClient, sortable: true, editable: canEdit, width: columnWidths.cliente,
        cellEditor: ComboboxCellEditor, cellEditorPopup: true, cellEditorParams: { values: catalogos.empresas },
      },
      {
        field: "consignatario", headerName: t.registros.colConsignee, sortable: true, editable: canEdit, width: columnWidths.consignatario,
        cellEditor: ComboboxCellEditor, cellEditorPopup: true, cellEditorParams: { values: catalogos.consignatarios },
      },
      {
        field: "incoterm", headerName: t.registros.colIncoterm, sortable: true, editable: canEdit, width: columnWidths.incoterm,
        cellEditor: "agSelectCellEditor", cellEditorPopup: true, cellEditorParams: { values: ["", ...catalogos.incoterm] },
      },
      {
        field: "forma_pago", headerName: t.registros.colPaymentMethod, sortable: true, editable: canEdit, width: columnWidths.formaPago,
        cellEditor: "agSelectCellEditor", cellEditorPopup: true, cellEditorParams: { values: ["", ...catalogos.forma_pago] },
      },
      {
        field: "pais", headerName: t.registros.colDestCountry, sortable: true, editable: canEdit, width: columnWidths.pais,
        cellEditor: "agSelectCellEditor", cellEditorPopup: true, cellEditorParams: { values: ["", ...catalogos.paises] },
      },

      // ── 3. Carga / Mercadería ─────────────────────────────────────────────────
      {
        field: "especie", headerName: t.registros.colSpecies, sortable: true, editable: canEdit, width: columnWidths.especie,
        cellEditor: ComboboxCellEditor, cellEditorPopup: true, cellEditorParams: { values: catalogos.especies },
      },
      { field: "temperatura", headerName: t.registros.colTemperature, sortable: true, editable: canEdit, width: columnWidths.temperatura },
      {
        field: "ventilacion",
        headerName: t.registros.colVentilation,
        sortable: true,
        editable: canEdit,
        width: columnWidths.ventilacion,
        cellEditor: "agNumberCellEditor",
        cellEditorParams: { min: 0, precision: 0 },
        valueFormatter: (p) => (p.value != null && p.value !== "" ? String(p.value) : ""),
      },
      {
        field: "tratamiento_frio", headerName: t.registros.colColdTreatment, sortable: true, editable: canEdit, width: columnWidths.tratamientoFrio,
        cellEditor: "agSelectCellEditor", cellEditorPopup: true, cellEditorParams: { values: ["", ...catalogos.tratamiento_frio] },
      },
      {
        field: "tratamiento_frio_o2", headerName: t.registros.colO2, sortable: true, editable: canEdit, width: columnWidths.tratamientoFrioO2,
        valueFormatter: (p) => p.value != null ? `${p.value}%` : "",
      },
      {
        field: "tratamiento_frio_co2", headerName: t.registros.colCO2, sortable: true, editable: canEdit, width: columnWidths.tratamientoFrioCo2,
        valueFormatter: (p) => p.value != null ? `${p.value}%` : "",
      },
      {
        field: "tipo_atmosfera", headerName: t.registros.colAtmosphereType, sortable: true, editable: canEdit, width: columnWidths.tipoAtmosfera,
        cellEditor: "agSelectCellEditor", cellEditorPopup: true, cellEditorParams: { values: ["", ...catalogos.tipo_atmosfera] },
      },
      { field: "pallets", headerName: t.registros.colPallets, sortable: true, editable: canEdit, width: columnWidths.pallets },
      { field: "peso_bruto", headerName: t.registros.colGrossWeight, sortable: true, editable: canEdit, width: columnWidths.pesoBruto },
      { field: "peso_neto", headerName: t.registros.colNetWeight, sortable: true, editable: canEdit, width: columnWidths.pesoNeto },

      // ── 4. Unidad y Contenedor ────────────────────────────────────────────────
      {
        field: "tipo_unidad", headerName: t.registros.colUnitType, sortable: true, editable: canEdit, width: columnWidths.tipoUnidad,
        cellEditor: "agSelectCellEditor", cellEditorPopup: true, cellEditorParams: { values: ["", ...catalogos.tipo_unidad] },
      },
      { field: "contenedor", headerName: t.registros.colContainer, sortable: true, editable: canEdit, width: columnWidths.contenedor },
      { field: "sello", headerName: t.registros.colSeal, sortable: true, editable: canEdit, width: columnWidths.sello },
      { field: "tara", headerName: t.registros.colTare, sortable: true, editable: canEdit, width: columnWidths.tara },

      // ── 5. Naviera y Viaje ────────────────────────────────────────────────────
      {
        field: "naviera", headerName: t.registros.colCarrier, sortable: true, editable: canEdit, width: columnWidths.naviera,
        cellEditor: ComboboxCellEditor, cellEditorPopup: true, cellEditorParams: { values: catalogos.navieras },
      },
      {
        field: "nave", headerName: t.registros.colVessel, sortable: true, editable: canEdit, width: columnWidths.nave,
        cellEditor: ComboboxCellEditor,
        cellEditorPopup: true,
        cellEditorParams: (params: { data: OperacionRow }) => {
          const nav = params.data.naviera;
          const navesDisponibles = nav
            ? catalogos.naves.filter((n) => n.naviera === nav).map((n) => n.nombre)
            : catalogos.naves.map((n) => n.nombre);
          return { values: navesDisponibles };
        },
      },
      { field: "viaje", headerName: t.registros.colViaje, sortable: true, editable: canEdit, width: columnWidths.viaje },
      {
        field: "pol", headerName: t.registros.colPOL, sortable: true, editable: canEdit, width: columnWidths.pol,
        cellEditor: ComboboxCellEditor, cellEditorPopup: true, cellEditorParams: { values: catalogos.puertos_origen },
      },
      { field: "etd", headerName: t.registros.colETD, sortable: true, editable: canEdit, width: columnWidths.etd },
      {
        field: "pod", headerName: t.registros.colPOD, sortable: true, editable: canEdit, width: columnWidths.pod,
        cellEditor: ComboboxCellEditor, cellEditorPopup: true, cellEditorParams: { values: catalogos.destinos.map((d) => d.nombre) },
      },
      { field: "eta", headerName: t.registros.colETA, sortable: true, editable: canEdit, width: columnWidths.eta },
      { field: "tt", headerName: t.registros.colTransitDays, sortable: true, editable: canEdit, width: columnWidths.tt },
      { field: "booking", headerName: t.registros.colBooking, sortable: true, editable: canEdit, width: columnWidths.booking },

      // ── 6. Documentación ──────────────────────────────────────────────────────
      { field: "aga", headerName: t.registros.colAGA, sortable: true, editable: canEdit, width: columnWidths.aga },
      { field: "dus", headerName: t.registros.colDUS, sortable: true, editable: canEdit, width: columnWidths.dus },
      { field: "sps", headerName: t.registros.colSPS, sortable: true, editable: canEdit, width: columnWidths.sps },
      { field: "numero_guia_despacho", headerName: t.registros.colDispatchGuide, sortable: true, editable: canEdit, width: columnWidths.numeroGuiaDespacho },

      // ── 7. Planta y Proceso ───────────────────────────────────────────────────
      {
        field: "planta_presentacion", headerName: t.registros.colPresentationPlant, sortable: true, editable: canEdit, width: columnWidths.plantaPresentacion,
        cellEditor: ComboboxCellEditor, cellEditorPopup: true, cellEditorParams: { values: catalogos.plantas },
      },
      { field: "citacion", headerName: t.registros.colCitation, sortable: true, editable: canEdit, width: columnWidths.citacion },
      { field: "llegada_planta", headerName: t.registros.colPlantArrival, sortable: true, editable: canEdit, width: columnWidths.llegadaPlanta },
      { field: "salida_planta", headerName: t.registros.colPlantDeparture, sortable: true, editable: canEdit, width: columnWidths.salidaPlanta },

      // ── 8. Stacking y Puerto ──────────────────────────────────────────────────
      { field: "inicio_stacking", headerName: t.registros.colStackingStart, sortable: true, editable: canEdit, width: columnWidths.inicioStacking },
      { field: "fin_stacking", headerName: t.registros.colStackingEnd, sortable: true, editable: canEdit, width: columnWidths.finStacking },
      { field: "ingreso_stacking", headerName: t.registros.colStackingEntry, sortable: true, editable: canEdit, width: columnWidths.ingresoStacking },
      { field: "corte_documental", headerName: t.registros.colDocCutoff, sortable: true, editable: canEdit, width: columnWidths.corteDocumental },

      // ── 9. Eventos Late / xLate ───────────────────────────────────────────────
      { field: "inf_late", headerName: t.registros.colLateInfo, sortable: true, editable: canEdit, width: columnWidths.infLate },
      { field: "late_inicio", headerName: t.registros.colLateStart, sortable: true, editable: canEdit, width: columnWidths.lateInicio },
      { field: "late_fin", headerName: t.registros.colLateEnd, sortable: true, editable: canEdit, width: columnWidths.lateFin },
      { field: "xlate_inicio", headerName: t.registros.colXLateStart, sortable: true, editable: canEdit, width: columnWidths.xlateInicio },
      { field: "xlate_fin", headerName: t.registros.colXLateEnd, sortable: true, editable: canEdit, width: columnWidths.xlateFin },

      // ── 10. Depósito y Movimientos ────────────────────────────────────────────
      {
        field: "deposito", headerName: t.registros.colWarehouse, sortable: true, editable: canEdit, width: columnWidths.deposito,
        cellEditor: ComboboxCellEditor, cellEditorPopup: true, cellEditorParams: { values: catalogos.depositos },
      },
      { field: "agendamiento_retiro", headerName: t.registros.colPickupSchedule, sortable: true, editable: canEdit, width: columnWidths.agendamientoRetiro },
      { field: "devolucion_unidad", headerName: t.registros.colUnitReturn, sortable: true, editable: canEdit, width: columnWidths.devolucionUnidad },

      // ── 11. Transporte ────────────────────────────────────────────────────────
      { field: "transporte", headerName: t.registros.colTransportCompany, sortable: true, editable: canEdit, width: columnWidths.transporte },
      { field: "chofer", headerName: t.registros.colDriverName, sortable: true, editable: canEdit, width: columnWidths.chofer },
      { field: "rut_chofer", headerName: t.registros.colDriverRUT, sortable: true, editable: canEdit, width: columnWidths.rutChofer },
      { field: "telefono_chofer", headerName: t.registros.colDriverPhone, sortable: true, editable: canEdit, width: columnWidths.telefonoChofer },
      { field: "patente_camion", headerName: t.registros.colTruckPlate, sortable: true, editable: canEdit, width: columnWidths.patenteCamion },
      { field: "patente_remolque", headerName: t.registros.colTrailerPlate, sortable: true, editable: canEdit, width: columnWidths.patenteRemolque },

      // ── 12. Costos y Logística ────────────────────────────────────────────────
      { field: "almacenamiento", headerName: t.registros.colStorageDays, sortable: true, editable: canEdit, width: columnWidths.almacenamiento },
      { field: "tramo", headerName: t.registros.colSection, sortable: true, editable: canEdit, width: columnWidths.tramo },
      { field: "valor_tramo", headerName: t.registros.colSectionValue, sortable: true, editable: canEdit, width: columnWidths.valorTramo },
      {
        field: "porteo", headerName: t.registros.colPortage, sortable: true, editable: canEdit, width: columnWidths.porteo,
        cellRenderer: booleanCellRenderer, cellEditor: "agSelectCellEditor", cellEditorPopup: true, cellEditorParams: { values: [true, false] },
      },
      { field: "valor_porteo", headerName: t.registros.colPortageValue, sortable: true, editable: canEdit, width: columnWidths.valorPorteo },
      {
        field: "falso_flete", headerName: t.registros.colDeadFreight, sortable: true, editable: canEdit, width: columnWidths.falsoFlete,
        cellRenderer: booleanCellRenderer, cellEditor: "agSelectCellEditor", cellEditorPopup: true, cellEditorParams: { values: [true, false] },
      },
      { field: "valor_falso_flete", headerName: t.registros.colDeadFreightValue, sortable: true, editable: canEdit, width: columnWidths.valorFalsoFlete },

      // ── 13. Facturación ───────────────────────────────────────────────────────
      { field: "factura_transporte", headerName: t.registros.colTransportInvoice, sortable: true, editable: canEdit, width: columnWidths.facturaTransporte },
      { field: "monto_facturado", headerName: t.registros.colInvoicedAmount, sortable: true, editable: canEdit, width: columnWidths.montoFacturado },
      { field: "numero_factura_asli", headerName: t.registros.colASLIInvoice, sortable: true, editable: canEdit, width: columnWidths.numeroFacturaAsli },
      { field: "concepto_facturado", headerName: t.registros.colInvoicedConcept, sortable: true, editable: canEdit, width: columnWidths.conceptoFacturado },
      {
        field: "moneda", headerName: t.registros.colCurrency, sortable: true, editable: canEdit, width: columnWidths.moneda,
        cellEditor: "agSelectCellEditor", cellEditorPopup: true, cellEditorParams: { values: catalogos.moneda },
      },
      { field: "tipo_cambio", headerName: t.registros.colExchangeRate, sortable: true, editable: canEdit, width: columnWidths.tipoCambio },

      // ── 14. Márgenes ──────────────────────────────────────────────────────────
      { field: "margen_estimado", headerName: t.registros.colEstimatedMargin, sortable: true, editable: canEdit, width: columnWidths.margenEstimado },
      { field: "margen_real", headerName: t.registros.colRealMargin, sortable: true, editable: canEdit, width: columnWidths.margenReal },

      // ── 15. Hitos Administrativos ─────────────────────────────────────────────
      { field: "fecha_confirmacion_booking", headerName: t.registros.colBookingConfirmation, sortable: true, editable: canEdit, width: columnWidths.fechaConfirmacionBooking },
      { field: "fecha_envio_documentacion", headerName: t.registros.colDocSent, sortable: true, editable: canEdit, width: columnWidths.fechaEnvioDocumentacion },
      { field: "fecha_entrega_bl", headerName: t.registros.colBLDelivery, sortable: true, editable: canEdit, width: columnWidths.fechaEntregaBl },
      { field: "fecha_entrega_factura", headerName: t.registros.colInvoiceDelivery, sortable: true, editable: canEdit, width: columnWidths.fechaEntregaFactura },
      { field: "fecha_pago_cliente", headerName: t.registros.colClientPayment, sortable: true, editable: canEdit, width: columnWidths.fechaPagoCliente },
      { field: "fecha_pago_transporte", headerName: t.registros.colTransportPayment, sortable: true, editable: canEdit, width: columnWidths.fechaPagoTransporte },
      { field: "fecha_cierre", headerName: t.registros.colCloseDate, sortable: true, editable: canEdit, width: columnWidths.fechaCierre },

      // ── 16. Control y Auditoría ───────────────────────────────────────────────
      { field: "observaciones", headerName: t.registros.colObservations, sortable: true, editable: canEdit, width: columnWidths.observaciones },

      // ── 17. Integraciones / Flujo ─────────────────────────────────────────────
      {
        field: "enviado_transporte", headerName: "Enviado Transp.", sortable: true, width: 130,
        cellRenderer: booleanCellRenderer, cellEditor: "agSelectCellEditor", cellEditorPopup: true, cellEditorParams: { values: [true, false] },
      },
    ],
    [t.registros, booleanCellRenderer, catalogos, canEdit]
  );

  const columnDefs = useMemo<(ColDef<OperacionRow> | ColGroupDef<OperacionRow>)[]>(() => {
    const c = leafCols;
    return [
      { headerName: "Identificación y Control",       children: c.slice(0,  8)  },
      { headerName: "Cliente y Condiciones",           children: c.slice(8,  14) },
      { headerName: "Carga / Mercadería",              children: c.slice(14, 24) },
      { headerName: "Unidad y Contenedor",             children: c.slice(24, 28) },
      { headerName: "Naviera y Viaje",                 children: c.slice(28, 37) },
      { headerName: "Documentación",                   children: c.slice(37, 41) },
      { headerName: "Planta y Proceso",                children: c.slice(41, 45) },
      { headerName: "Stacking y Puerto",               children: c.slice(45, 49) },
      { headerName: "Eventos Late / xLate",            children: c.slice(49, 54) },
      { headerName: "Depósito y Movimientos",          children: c.slice(54, 57) },
      { headerName: "Transporte",                      children: c.slice(57, 63) },
      { headerName: "Costos y Logística",              children: c.slice(63, 70) },
      { headerName: "Facturación",                     children: c.slice(70, 76) },
      { headerName: "Márgenes",                        children: c.slice(76, 78) },
      { headerName: "Hitos Administrativos",           children: c.slice(78, 85) },
      { headerName: "Control y Auditoría",             children: c.slice(85, 86) },
      { headerName: "Integraciones / Flujo",           children: c.slice(86)     },
    ];
  }, [leafCols]);

  const fieldToHeader = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cd of leafCols) {
      if (cd.field && cd.headerName) map[cd.field] = String(cd.headerName);
    }
    return map;
  }, [leafCols]);

  const resetColumnOrder = useCallback(() => {
    if (user?.id) {
      try { localStorage.removeItem(`registros_col_order_${user.id}`); } catch { /* ignore */ }
    }
    const api = gridRef.current?.api;
    if (!api) return;
    const state = leafCols
      .filter((cd) => cd.field)
      .map((cd) => ({ colId: cd.field as string }));
    api.applyColumnState({ state, applyOrder: true });
  }, [user?.id, leafCols]);

  // Re-aplicar orden cuando columnDefs cambia (catalogos carga async y AG Grid resetea el orden)
  useEffect(() => {
    if (!user?.id) return;
    const timer = setTimeout(() => {
      applyColumnOrder();
    }, 0);
    return () => clearTimeout(timer);
  }, [columnDefs, user?.id, applyColumnOrder]);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      filter: false,
      cellStyle: {
        textAlign: "center",
        fontSize: "13px",
        fontFamily: "'Calibri', 'Segoe UI', system-ui, sans-serif",
        paddingLeft: "6px",
        paddingRight: "6px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
      headerClass: "ag-header-cell-centered",
    }),
    []
  );

  const handleAddRow = useCallback(async () => {
    if (!supabase) return;
    const { data, error: err } = await supabase
      .from("operaciones")
      .insert({
        ejecutivo: "",
        estado_operacion: "PENDIENTE",
        tipo_operacion: "EXPORTACIÓN",
        cliente: "NUEVO",
      })
      .select("*")
      .single();
    if (err) {
      setError(err.message);
      return;
    }
    if (data) {
      gridRef.current?.api?.applyTransaction({ add: [toRow(data as DbOperacion)], addIndex: 0 });
    }
  }, [supabase, toRow]);

  const handleRemoveSelected = useCallback(async () => {
    const selected = gridRef.current?.api?.getSelectedRows();
    if (!selected?.length || !supabase) return;
    const ids = selected.map((r) => r.id);
    const { error: err } = await supabase
      .from("operaciones")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", ids);
    if (err) {
      setError(err.message);
      return;
    }
    gridRef.current?.api?.applyTransaction({ remove: selected });
  }, [supabase]);

  const handleRefresh = useCallback(() => {
    void fetchOperaciones();
  }, [fetchOperaciones]);

  const getSelectedRows = useCallback(() => {
    return (gridRef.current?.api?.getSelectedRows() as OperacionRow[] | undefined) ?? [];
  }, []);

  const handleSendToAsli = useCallback(async () => {
    const selected = getSelectedRows();
    if (!selected.length || !supabase) return;
    setShowTransportModal(false);
    const ids = selected.map((r) => r.id);
    const { error: err } = await supabase
      .from("operaciones")
      .update({ enviado_transporte: true })
      .in("id", ids);
    if (err) {
      setError(err.message);
      return;
    }
    selected.forEach((row) => {
      const node = gridRef.current?.api?.getRowNode(row.id);
      if (node) {
        node.setDataValue("enviado_transporte", true);
      }
    });
    gridRef.current?.api?.deselectAll();
    const count = selected.length;
    sileo.success({ title: `${count} operación${count > 1 ? 'es' : ''} enviada${count > 1 ? 's' : ''} a Reserva ASLI` });
  }, [supabase, getSelectedRows]);

  const handleSendToExterna = useCallback(async () => {
    const selected = getSelectedRows();
    if (!selected.length || !supabase) return;
    setShowTransportModal(false);
    const rows = selected.map((r) => ({
      cliente: r.cliente || null,
      booking: r.booking || null,
      naviera: r.naviera || null,
      nave: r.nave || null,
      pod: r.pod || null,
      etd: r.etd || null,
      planta_presentacion: r.planta_presentacion || null,
    }));
    const { error: err } = await supabase
      .from("transportes_reservas_ext")
      .insert(rows);
    if (err) {
      setError(err.message);
      return;
    }
    gridRef.current?.api?.deselectAll();
    const count = selected.length;
    sileo.success({ title: `${count} operación${count > 1 ? 'es' : ''} enviada${count > 1 ? 's' : ''} a Reserva Externa` });
  }, [supabase, getSelectedRows]);

  const handleCellValueChanged = useCallback(
    async (e: { data: OperacionRow; colDef: { field?: string }; newValue: unknown; oldValue: unknown; node: { setDataValue: (field: string, value: unknown) => void } }) => {
      const field = e.colDef.field;
      if (!supabase || !field || e.newValue === e.oldValue) return;

      // Convertir fechas al formato ISO para guardar en BD
      let dbValue: unknown = e.newValue ?? null;
      if (DATE_FIELDS.has(field)) {
        dbValue = parseDateInput(String(e.newValue ?? "")) ?? null;
      } else if (DATETIME_FIELDS.has(field)) {
        dbValue = parseDateTimeInput(String(e.newValue ?? "")) ?? null;
      } else if (field === "ventilacion") {
        const v = e.newValue;
        if (v === "" || v === null || v === undefined) {
          dbValue = null;
        } else {
          const n = typeof v === "number" ? Math.trunc(v) : parseInt(String(v).trim(), 10);
          dbValue = Number.isFinite(n) ? n : null;
        }
        if (dbValue !== e.newValue) {
          e.node.setDataValue("ventilacion", dbValue as number | null);
        }
      }

      const updates: Record<string, unknown> = { [field]: dbValue };

      if (field === "pod" && e.newValue) {
        const destino = catalogos.destinos.find((d) => d.nombre === e.newValue);
        if (destino?.pais) {
          updates.pais = destino.pais;
          e.node.setDataValue("pais", destino.pais);
        }
      }

      const { error: err } = await supabase
        .from("operaciones")
        .update(updates)
        .eq("id", e.data.id);
      if (err) { setError(err.message); return; }

      // Ofrecer agregar valor nuevo al catálogo correspondiente
      if (field in ADDABLE_FIELDS && e.newValue) {
        const info = ADDABLE_FIELDS[field as keyof typeof ADDABLE_FIELDS];
        let existing: string[];
        if (field === "pod") {
          existing = catalogos.destinos.map((d) => d.nombre);
        } else {
          existing = (catalogos[info.catalogKey as keyof CatalogosState] as string[]) ?? [];
        }
        if (!existing.includes(String(e.newValue))) {
          setAddNewModal({ field, newValue: String(e.newValue), table: info.table, label: info.label });
        }
      }
    },
    [supabase, catalogos]
  );

  const handleConfirmAddNew = useCallback(async () => {
    if (!addNewModal || !supabase) return;
    const { table, newValue, label } = addNewModal;
    let insertData: Record<string, unknown>;
    if (table === "destinos") {
      insertData = { nombre: newValue, pais: "", activo: true };
    } else if (table === "navieras") {
      insertData = { nombre: newValue };
    } else {
      insertData = { nombre: newValue, activo: true };
    }
    const { error: err } = await supabase.from(table).insert(insertData);
    if (err) {
      setError(`Error al agregar a ${label}: ${err.message}`);
    } else {
      await fetchCatalogos();
      sileo.success({ title: `"${newValue}" agregado correctamente a ${label}` });
    }
    setAddNewModal(null);
  }, [addNewModal, supabase, fetchCatalogos]);

  if (loading && rowData.length === 0) {
    return (
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-neutral-100" role="main">
        <div className="flex-1 flex items-center justify-center text-neutral-500">
          <div className="flex items-center gap-2">
            <Icon icon="typcn:refresh" className="w-5 h-5 animate-spin" />
            <span className="text-sm">{t.registros.loading}</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-neutral-100" role="main">
      {error && (
        <div className="flex-shrink-0 px-3 sm:px-4 py-2 bg-red-100 text-red-700 text-xs sm:text-sm border-b border-red-200" role="alert">
          {error}
        </div>
      )}

      {/* Barra de herramientas */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-3 bg-white border-b border-neutral-200">
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <>
              {/* Botón Agregar Reserva */}
              <a
                href="/reservas/crear"
                className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-brand-blue text-white hover:bg-brand-blue/90 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
              >
                <Icon icon="typcn:plus" width={14} height={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{t.registros.newBooking}</span>
                <span className="sm:hidden">{t.registros.nuevoShort}</span>
              </a>
              {/* Botón Enviar a Transportes — solo visible con selección */}
              {selectionCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowTransportModal(true)}
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <Icon icon="lucide:truck" width={14} height={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t.registros.sendToTransport} ({selectionCount})</span>
                  <span className="sm:hidden">{t.registros.sendToTransportShort} ({selectionCount})</span>
                </button>
              )}
              {/* Botón Eliminar — solo visible con selección */}
              {selectionCount > 0 && (
                <button
                  type="button"
                  onClick={() => void handleRemoveSelected()}
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/30"
                >
                  <Icon icon="typcn:trash" width={14} height={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t.registros.deleteSelection} ({selectionCount})</span>
                  <span className="sm:hidden">Eliminar ({selectionCount})</span>
                </button>
              )}
            </>
          )}
          
          {/* Botón Actualizar */}
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          >
            <Icon icon="typcn:refresh" width={14} height={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{t.registros.refresh}</span>
          </button>

          {/* Botón Columnas */}
          <button
            type="button"
            onClick={() => setShowColumnPanel(true)}
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30 ${
              hiddenColumns.size > 0
                ? "text-brand-blue bg-brand-blue/10 hover:bg-brand-blue/20 ring-1 ring-brand-blue/30"
                : "text-neutral-700 bg-neutral-100 hover:bg-neutral-200"
            }`}
          >
            <Icon icon="lucide:columns" width={14} height={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Columnas{hiddenColumns.size > 0 ? ` (${hiddenColumns.size} oculta${hiddenColumns.size > 1 ? "s" : ""})` : ""}</span>
            <span className="sm:hidden">Cols{hiddenColumns.size > 0 ? ` (${hiddenColumns.size})` : ""}</span>
          </button>

          {/* Contador de registros */}
          <span className="ml-auto text-xs sm:text-sm text-neutral-500 whitespace-nowrap">
            <span className="font-medium text-neutral-700">{rowData.length}</span> {t.registros.records}
          </span>
        </div>
        
        {/* Indicador de scroll en móvil */}
        <p className="sm:hidden text-[10px] text-neutral-400 mt-1.5 flex items-center gap-1">
          <Icon icon="lucide:move-horizontal" width={12} height={12} />
          {t.registros.scrollHint}
        </p>
      </div>
      
      {/* Contenedor de la tabla */}
      <div className="flex-1 min-h-0 p-2 sm:p-4 overflow-hidden flex flex-col">
        <div className="ag-theme-balham flex-1 min-h-[250px] sm:min-h-[300px] w-full overflow-hidden" style={{ minHeight: 300 }}>
          <AgGridReact<OperacionRow>
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            localeText={t.agGrid}
            theme="legacy"
            selectionColumnDef={{
              width: 40,
              minWidth: 40,
              maxWidth: 40,
              pinned: "left",
              suppressMovable: true,
              resizable: false,
              suppressHeaderMenuButton: true,
              suppressHeaderFilterButton: true,
            }}
            rowSelection={{ mode: "multiRow", checkboxes: true, headerCheckbox: true, enableClickSelection: false }}
            singleClickEdit
            stopEditingWhenCellsLoseFocus
            animateRows
            domLayout="normal"
            getRowId={(params) => params.data.id}
            onCellValueChanged={handleCellValueChanged}
            onSelectionChanged={(e) => setSelectionCount(e.api.getSelectedRows().length)}
            onGridReady={onGridReady}
            onDragStopped={onDragStopped}
            rowHeight={30}
            headerHeight={34}
          />
        </div>
      </div>

      {/* Panel: visibilidad de columnas */}
      {showColumnPanel && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end bg-black/40 backdrop-blur-[2px]" onClick={() => setShowColumnPanel(false)}>
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl border border-neutral-200 w-full sm:w-80 sm:mr-4 flex flex-col"
            style={{ maxHeight: "85vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Icon icon="lucide:columns" width={16} height={16} className="text-brand-blue" />
                <span className="text-sm font-bold text-neutral-900">Columnas visibles</span>
                {hiddenColumns.size > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue font-medium">
                    {hiddenColumns.size} oculta{hiddenColumns.size > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hiddenColumns.size > 0 && (
                  <button
                    type="button"
                    onClick={showAllColumns}
                    className="text-xs text-brand-blue hover:underline font-medium"
                  >
                    Mostrar todas
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetColumnOrder}
                  className="text-xs text-neutral-400 hover:text-neutral-600 hover:underline font-medium"
                  title="Restablecer orden original de columnas"
                >
                  Resetear orden
                </button>
                <button
                  type="button"
                  onClick={() => setShowColumnPanel(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                >
                  <Icon icon="lucide:x" width={16} height={16} />
                </button>
              </div>
            </div>

            {/* Lista de grupos */}
            <div className="overflow-y-auto flex-1 px-3 py-2">
              {COLUMN_GROUPS.map((group) => {
                const allHidden = group.fields.every((f) => hiddenColumns.has(f));
                const someHidden = group.fields.some((f) => hiddenColumns.has(f));
                return (
                  <div key={group.label} className="mb-3">
                    {/* Título de sección con toggle */}
                    <button
                      type="button"
                      onClick={() => toggleSection(group.fields)}
                      className="w-full flex items-center gap-2 px-1 mb-1 group/sec"
                      title={allHidden ? "Mostrar sección" : "Ocultar sección"}
                    >
                      <span className={`flex-shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                        allHidden
                          ? "border-neutral-300 bg-white"
                          : someHidden
                            ? "border-amber-400 bg-amber-400"
                            : "border-brand-blue bg-brand-blue"
                      }`}>
                        {!allHidden && <Icon icon={someHidden ? "lucide:minus" : "lucide:check"} width={8} height={8} className="text-white" />}
                      </span>
                      <p className={`text-[10px] font-semibold uppercase tracking-wider flex-1 text-left transition-colors ${
                        allHidden ? "text-neutral-300" : "text-neutral-400 group-hover/sec:text-neutral-600"
                      }`}>
                        {group.label}
                      </p>
                    </button>
                    <div className="space-y-0.5">
                      {group.fields.map((field) => {
                        const hidden = hiddenColumns.has(field);
                        const label = fieldToHeader[field] ?? field;
                        return (
                          <button
                            key={field}
                            type="button"
                            onClick={() => toggleColumn(field)}
                            className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs transition-colors text-left ${
                              hidden
                                ? "text-neutral-400 hover:bg-neutral-50"
                                : "text-neutral-700 hover:bg-neutral-50"
                            }`}
                          >
                            <span className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              hidden
                                ? "border-neutral-300 bg-white"
                                : "border-brand-blue bg-brand-blue"
                            }`}>
                              {!hidden && <Icon icon="lucide:check" width={10} height={10} className="text-white" />}
                            </span>
                            <span className={hidden ? "line-through opacity-50" : ""}>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal: confirmar agregar nuevo valor al catálogo */}
      {addNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 p-6 w-full max-w-sm mx-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                <Icon icon="lucide:plus-circle" width={20} height={20} className="text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">{t.registros.newValueDetected}</h3>
                <p className="text-xs text-neutral-500">{addNewModal.label}</p>
              </div>
            </div>
            <p className="text-sm text-neutral-700 mb-1">{t.registros.confirmAddValue}</p>
            <div className="mt-2 mb-5 px-3 py-2 rounded-lg bg-neutral-100 border border-neutral-200 text-sm font-semibold text-neutral-800 truncate">
              "{addNewModal.newValue}"
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleConfirmAddNew()}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors"
              >
                {t.registros.yesAdd}
              </button>
              <button
                type="button"
                onClick={() => setAddNewModal(null)}
                className="flex-1 px-4 py-2 text-sm font-semibold text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-xl hover:bg-neutral-200 transition-colors"
              >
                {t.registros.noThisTime}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal selección tipo de transporte */}
      {showTransportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl shadow-mac-modal border border-neutral-200 p-6 w-full max-w-sm mx-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <Icon icon="lucide:truck" width={20} height={20} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">{t.registros.transportModalTitle}</h3>
                <p className="text-xs text-neutral-500">
                  {getSelectedRows().length} {getSelectedRows().length > 1 ? t.registros.transportModalOpsCount_many : t.registros.transportModalOpsCount_one}
                </p>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mb-4">{t.registros.transportModalSelectType}</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void handleSendToAsli()}
                className="flex items-center gap-3 w-full p-3 rounded-xl border border-neutral-200 hover:border-brand-blue hover:bg-brand-blue/5 transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-blue/20 transition-colors">
                  <Icon icon="lucide:building-2" width={18} height={18} className="text-brand-blue" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-800">{t.registros.reservaAsli}</p>
                  <p className="text-[11px] text-neutral-400">{t.registros.reservaAsliDesc}</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => void handleSendToExterna()}
                className="flex items-center gap-3 w-full p-3 rounded-xl border border-neutral-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
                  <Icon icon="lucide:globe" width={18} height={18} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-800">{t.registros.reservaExterna}</p>
                  <p className="text-[11px] text-neutral-400">{t.registros.reservaExternaDesc}</p>
                </div>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowTransportModal(false)}
              className="w-full mt-3 px-4 py-2 text-xs font-semibold text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-xl hover:bg-neutral-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
