import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-balham.css";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, SELECTION_COLUMN_ID } from "ag-grid-community";
import type { ColDef, ColGroupDef, CellContextMenuEvent } from "ag-grid-community";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { columnWidths } from "@/lib/registros-table-config";
import { exportRegistrosSimpleExcel } from "@/lib/registros-export-simple-excel";
import { sileo } from "sileo";
import { withBase } from "@/lib/basePath";
import { saveDestinoToCatalog } from "@/lib/destinos-service";
import { modulePageBg } from "@/lib/ui/moduleStyles";
import { formatRefAsli } from "@/lib/refAsli";
import { EstadoOperacionCellRenderer } from "@/components/registros/EstadoOperacionCellRenderer";

ModuleRegistry.registerModules([AllCommunityModule]);

export type OperacionRow = {
  id: string;
  correlativo: number;
  ref_asli: string;
  referencia_externa: string;
  temporada: string;
  ingreso: string;
  semana: number | null;
  ejecutivo: string;
  estado_operacion: string;
  tipo_operacion: string;
  cliente: string;
  consignatario: string;
  contrato: string;
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
  segundas: string;
  tipo_unidad: string;
  naviera: string;
  nave: string;
  viaje: string;
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
  referencia_externa: string | null;
  temporada: string | null;
  ingreso: string | null;
  semana: number | null;
  ejecutivo: string;
  estado_operacion: string;
  tipo_operacion: string;
  cliente: string;
  consignatario: string | null;
  contrato: string | null;
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
  segundas: string | null;
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

function splitContenedores(value: string | null | undefined): string[] {
  if (!value) return [];
  return String(value)
    .split(/\s*\|\s*|\r?\n|[,;]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseViajeFromNave(value: string | null | undefined): string {
  if (!value) return "";
  const text = String(value).trim();
  if (!text) return "";
  const bracket = text.match(/\[([^\]]+)\]/);
  if (bracket?.[1]) return bracket[1].trim();
  return "";
}

function stripViajeFromNave(value: string | null | undefined): string {
  if (!value) return "";
  return String(value).replace(/\s*\[[^\]]+\]\s*/g, " ").trim();
}

function normalizeExportText(value: unknown): string {
  return String(value ?? "")
    .replace(/\r?\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
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
  contrato:            { table: "contratos",       label: "Contratos",          catalogKey: "contratos"      },
} as const;

const CONTRATOS_FALLBACK = ["COPEFRUT", "ASLI", "ALMACENES", "EXITO"];

// ─── Editor combinado: dropdown filtrable + texto libre (AG Grid v35 controlado) ─
interface ComboboxEditorProps {
  value: string | null | undefined;
  onValueChange: (value: string) => void;
  stopEditing: (suppressNavigateAfterEdit?: boolean) => void;
  values: string[];
  allowAddNew?: boolean;
}

function normalizeComboboxValue(value: string, allowAddNew?: boolean) {
  const trimmed = value.trim();
  return allowAddNew ? trimmed.toUpperCase() : trimmed;
}

function ComboboxCellEditor({
  value,
  onValueChange,
  stopEditing,
  values,
  allowAddNew,
}: ComboboxEditorProps) {
  const [inputVal, setInputVal] = useState<string>(String(value ?? ""));
  const [highlight, setHighlight] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = inputVal.toLowerCase();
    if (!q) return values.slice(0, 100);
    return values.filter((v) => v.toLowerCase().includes(q)).slice(0, 100);
  }, [inputVal, values]);

  const trimmedInput = inputVal.trim();
  const exactMatch = useMemo(
    () => values.some((v) => v.toUpperCase() === trimmedInput.toUpperCase()),
    [trimmedInput, values]
  );
  const hasAdd = !!allowAddNew && !!trimmedInput && !exactMatch;
  const totalItems = filtered.length + (hasAdd ? 1 : 0);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = useCallback(
    (raw: string) => {
      const finalValue = normalizeComboboxValue(raw, allowAddNew);
      if (!finalValue) {
        stopEditing(true);
        return;
      }
      onValueChange(finalValue);
      setInputVal(finalValue);
      stopEditing();
    },
    [allowAddNew, onValueChange, stopEditing]
  );

  const handlePick = (e: React.MouseEvent, picked: string) => {
    e.preventDefault();
    commit(picked);
  };

  const syncValue = (raw: string) => {
    const normalized = normalizeComboboxValue(raw, allowAddNew);
    onValueChange(normalized || raw);
    return normalized || raw;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      if (totalItems === 0) return;
      e.preventDefault();
      e.stopPropagation();
      setHighlight((h) => (h + 1) % totalItems);
      return;
    }
    if (e.key === "ArrowUp") {
      if (totalItems === 0) return;
      e.preventDefault();
      e.stopPropagation();
      setHighlight((h) => (h - 1 + totalItems) % totalItems);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (highlight >= 0 && highlight < filtered.length) {
        commit(filtered[highlight]);
      } else if (hasAdd && (highlight === filtered.length || highlight < 0)) {
        commit(trimmedInput);
      } else if (trimmedInput) {
        commit(trimmedInput);
      } else {
        stopEditing(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      stopEditing(true);
      return;
    }
    if (e.key === "Tab") {
      if (trimmedInput) commit(trimmedInput);
      else stopEditing();
    }
  };

  return (
    <div
      className="ag-custom-component-popup"
      onMouseDown={(e) => e.preventDefault()}
      style={{
        background: "white",
        border: "2px solid #107C41",
        boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
        minWidth: 220,
        fontFamily: "'Calibri', 'Segoe UI', sans-serif",
        fontSize: 13,
      }}
    >
      <input
        ref={inputRef}
        value={inputVal}
        onChange={(e) => {
          const next = allowAddNew ? e.target.value.toUpperCase() : e.target.value;
          setInputVal(next);
          setHighlight(-1);
          syncValue(next);
        }}
        onKeyDown={handleKeyDown}
        style={{
          width: "100%", padding: "4px 8px",
          border: "none", borderBottom: "1px solid #D5D5D5",
          outline: "none", fontSize: 13,
          fontFamily: "'Calibri', 'Segoe UI', sans-serif",
          boxSizing: "border-box", background: "#fff",
        }}
        placeholder="Buscar o escribir..."
      />
      {(filtered.length > 0 || hasAdd) && (
        <div style={{ maxHeight: 220, overflowY: "auto" }}>
          {filtered.map((v, idx) => (
            <div
              key={v}
              onMouseDown={(e) => handlePick(e, v)}
              style={{
                padding: "4px 10px", cursor: "pointer",
                borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap",
                background: highlight === idx ? "#BDD7EE" : "white",
              }}
            >
              {v}
            </div>
          ))}
          {hasAdd && (
            <div
              onMouseDown={(e) => handlePick(e, trimmedInput)}
              style={{
                padding: "5px 10px", cursor: "pointer",
                borderTop: "1px solid #e8e8e8",
                whiteSpace: "nowrap",
                fontWeight: 600,
                fontSize: 12,
                color: "#107C41",
                background: highlight === filtered.length ? "#E2F0D9" : "#F6FBF4",
              }}
            >
              + Agregar «{trimmedInput.toUpperCase()}» al catálogo
            </div>
          )}
        </div>
      )}
      {filtered.length === 0 && !hasAdd && !!trimmedInput && (
        <div style={{ padding: "6px 10px", fontSize: 12, color: "#888" }}>
          Sin coincidencias. Presiona Enter para usar el valor escrito.
        </div>
      )}
    </div>
  );
}

function createToRow(locale: string) {
  return function toRow(db: DbOperacion): OperacionRow {
    return {
      id: db.id,
      correlativo: db.correlativo,
      ref_asli: formatRefAsli(db.ref_asli, db.correlativo) ?? "",
      referencia_externa: db.referencia_externa ?? "",
      temporada: db.temporada ?? "",
      ingreso: formatDateTime(db.ingreso, locale),
      semana: isoWeekFromDate(db.etd),
      ejecutivo: db.ejecutivo,
      estado_operacion: db.estado_operacion,
      tipo_operacion: db.tipo_operacion,
      cliente: db.cliente,
      consignatario: db.consignatario ?? "",
      contrato: db.contrato ?? "",
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
      segundas: db.segundas ?? "",
      tipo_unidad: db.tipo_unidad ?? "",
      naviera: db.naviera ?? "",
      nave: stripViajeFromNave(db.nave),
      viaje: db.viaje ?? parseViajeFromNave(db.nave) ?? "",
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
  contratos: string[];
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
  contratos: [],
  ejecutivos: [],
  empresas: [],
};

// ─── Grupos de columnas para el panel de visibilidad ──────────────────────────
const COLUMN_GROUPS = [
  { label: "Identificación y Control",     fields: ["temporada", "estado_operacion", "tipo_operacion", "semana", "ingreso"] },
  { label: "Cliente y Condiciones",        fields: ["ejecutivo", "cliente", "consignatario", "contrato", "incoterm", "forma_pago", "pais"] },
  { label: "Carga / Mercadería",           fields: ["especie", "temperatura", "ventilacion", "tratamiento_frio", "tratamiento_frio_o2", "tratamiento_frio_co2", "tipo_atmosfera", "pallets", "peso_bruto", "peso_neto", "segundas"] },
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
  const { isCliente, isEjecutivo, empresaNombres, isLoading: authLoading, user } = useAuth();
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
  const [globalSearch, setGlobalSearch] = useState("");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    operacionId: string;
    refLabel: string;
  } | null>(null);

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
      const hasContrato = order.includes("contrato");
      const hasLegacyHiddenFields = ["origen_registro", "prioridad", "operacion_critica"].some((field) => order.includes(field));
      if (!hasContrato || hasLegacyHiddenFields) {
        localStorage.removeItem(`registros_col_order_${user.id}`);
        return;
      }
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

  const handleCellContextMenu = useCallback((params: CellContextMenuEvent<OperacionRow>) => {
    const nativeEvent = params.event;
    if (nativeEvent) {
      nativeEvent.preventDefault();
      nativeEvent.stopPropagation();
    }
    const data = params.node?.data;
    if (!data?.id) return;
    const mouse = nativeEvent as MouseEvent | undefined;
    const x = mouse?.clientX ?? 0;
    const y = mouse?.clientY ?? 0;
    const refLabel = formatRefAsli(data.ref_asli, data.correlativo) ?? "—";
    setCtxMenu({ x, y, operacionId: data.id, refLabel });
  }, []);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    // next tick so the opening right-click doesn't immediately close
    const t = window.setTimeout(() => {
      window.addEventListener("click", close);
      window.addEventListener("contextmenu", close);
      window.addEventListener("scroll", close, true);
      window.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [ctxMenu]);

  const handleCtxAddDocuments = useCallback(() => {
    if (!ctxMenu) return;
    const url = `${withBase("/documentos/mis-documentos")}?op=${encodeURIComponent(ctxMenu.operacionId)}`;
    setCtxMenu(null);
    window.location.assign(url);
  }, [ctxMenu]);

  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    api.setGridOption("quickFilterText", globalSearch);
  }, [globalSearch, rowData]);

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
      contratosRes,
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
      supabase.from("contratos").select("nombre").eq("activo", true).order("nombre"),
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
      contratos: (contratosRes.data ?? []).map((c) => c.nombre),
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
    } else if (isCliente || isEjecutivo) {
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
  }, [supabase, authLoading, isCliente, isEjecutivo, empresaNombres, t.registros.supabaseError, toRow]);

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

  const contenedorCellRenderer = useCallback((p: { value: string }) => {
    const items = splitContenedores(p.value);
    if (items.length <= 1) return p.value ?? "";
    return items.join(" | ");
  }, []);

  const leafCols = useMemo<ColDef<OperacionRow>[]>(
    () => [
      // ── 1. Identificación y Control ───────────────────────────────────────────
      { field: "ref_asli", headerName: t.registros.colRefAsli, sortable: true, width: columnWidths.refAsli, pinned: "left", lockPinned: true, suppressMovable: true },
      { field: "referencia_externa", headerName: t.registros.colRefExterna, sortable: true, editable: canEdit, width: columnWidths.refExterna, pinned: "left", lockPinned: true },
      { field: "temporada", headerName: "Temporada", sortable: true, editable: canEdit, width: 120 },
      {
        field: "estado_operacion",
        headerName: t.registros.colOperationStatus,
        sortable: true,
        editable: canEdit,
        width: Math.max(columnWidths.estadoOperacion, 140),
        cellRenderer: EstadoOperacionCellRenderer,
        cellEditor: "agSelectCellEditor",
        cellEditorPopup: true,
        cellEditorParams: { values: catalogos.estado_operacion },
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
        cellEditor: ComboboxCellEditor, cellEditorPopup: true, cellEditorParams: { values: catalogos.empresas, allowAddNew: true },
      },
      {
        field: "consignatario", headerName: t.registros.colConsignee, sortable: true, editable: canEdit, width: columnWidths.consignatario,
        cellEditor: ComboboxCellEditor, cellEditorPopup: true, cellEditorParams: { values: catalogos.consignatarios, allowAddNew: true },
      },
      {
        field: "contrato", headerName: "Contrato", sortable: true, editable: canEdit, width: columnWidths.contrato,
        cellEditor: "agSelectCellEditor", cellEditorPopup: true, cellEditorParams: { values: ["", ...(catalogos.contratos.length ? catalogos.contratos : CONTRATOS_FALLBACK)] },
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
        cellEditor: ComboboxCellEditor, cellEditorPopup: true, cellEditorParams: { values: catalogos.especies, allowAddNew: true },
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
      { field: "segundas", headerName: "Segundas", sortable: true, editable: canEdit, width: 110 },

      // ── 4. Unidad y Contenedor ────────────────────────────────────────────────
      {
        field: "tipo_unidad", headerName: t.registros.colUnitType, sortable: true, editable: canEdit, width: columnWidths.tipoUnidad,
        cellEditor: "agSelectCellEditor", cellEditorPopup: true, cellEditorParams: { values: ["", ...catalogos.tipo_unidad] },
      },
      {
        field: "contenedor",
        headerName: t.registros.colContainer,
        sortable: true,
        editable: canEdit,
        width: columnWidths.contenedor,
        cellRenderer: contenedorCellRenderer,
      },
      { field: "sello", headerName: t.registros.colSeal, sortable: true, editable: canEdit, width: columnWidths.sello },
      { field: "tara", headerName: t.registros.colTare, sortable: true, editable: canEdit, width: columnWidths.tara },

      // ── 5. Naviera y Viaje ────────────────────────────────────────────────────
      {
        field: "naviera", headerName: t.registros.colCarrier, sortable: true, editable: canEdit, width: columnWidths.naviera,
        cellEditor: ComboboxCellEditor, cellEditorPopup: true, cellEditorParams: { values: catalogos.navieras, allowAddNew: true },
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
        cellEditor: ComboboxCellEditor, cellEditorPopup: true, cellEditorParams: { values: catalogos.puertos_origen, allowAddNew: true },
      },
      { field: "etd", headerName: t.registros.colETD, sortable: true, editable: canEdit, width: columnWidths.etd },
      {
        field: "pod", headerName: t.registros.colPOD, sortable: true, editable: canEdit, width: columnWidths.pod,
        cellEditor: ComboboxCellEditor, cellEditorPopup: true, cellEditorParams: { values: catalogos.destinos.map((d) => d.nombre), allowAddNew: true },
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
        cellEditor: ComboboxCellEditor, cellEditorPopup: true, cellEditorParams: { values: catalogos.plantas, allowAddNew: true },
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
        cellEditor: ComboboxCellEditor, cellEditorPopup: true, cellEditorParams: { values: catalogos.depositos, allowAddNew: true },
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
    [t.registros, booleanCellRenderer, contenedorCellRenderer, catalogos, canEdit]
  );

  const columnDefs = useMemo<(ColDef<OperacionRow> | ColGroupDef<OperacionRow>)[]>(() => {
    const c = leafCols;
    return [
      { headerName: "Identificación y Control",       children: c.slice(0,  7)  },
      { headerName: "Cliente y Condiciones",          children: c.slice(7,  14) },
      { headerName: "Carga / Mercadería",             children: c.slice(14, 25) },
      { headerName: "Unidad y Contenedor",            children: c.slice(25, 29) },
      { headerName: "Naviera y Viaje",                children: c.slice(29, 38) },
      { headerName: "Documentación",                  children: c.slice(38, 42) },
      { headerName: "Planta y Proceso",               children: c.slice(42, 46) },
      { headerName: "Stacking y Puerto",              children: c.slice(46, 50) },
      { headerName: "Eventos Late / xLate",           children: c.slice(50, 55) },
      { headerName: "Depósito y Movimientos",         children: c.slice(55, 58) },
      { headerName: "Transporte",                     children: c.slice(58, 64) },
      { headerName: "Costos y Logística",             children: c.slice(64, 71) },
      { headerName: "Facturación",                    children: c.slice(71, 77) },
      { headerName: "Márgenes",                       children: c.slice(77, 79) },
      { headerName: "Hitos Administrativos",          children: c.slice(79, 86) },
      { headerName: "Control y Auditoría",            children: c.slice(86, 87) },
      { headerName: "Integraciones / Flujo",          children: c.slice(87)     },
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
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
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
        const podNombre = String(e.newValue).trim().toUpperCase();
        dbValue = podNombre;
        e.node.setDataValue("pod", podNombre);
        const destino = catalogos.destinos.find((d) => d.nombre.toUpperCase() === podNombre);
        if (destino?.pais) {
          updates.pais = destino.pais;
          e.node.setDataValue("pais", destino.pais);
        }
      } else if (field === "nave") {
        const viajeParseado = parseViajeFromNave(String(e.newValue ?? ""));
        if (viajeParseado && !String(e.data.viaje ?? "").trim()) {
          updates.viaje = viajeParseado;
          e.node.setDataValue("viaje", viajeParseado);
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
        const newValueNorm = String(e.newValue).trim();
        const exists = existing.some((v) => v.toUpperCase() === newValueNorm.toUpperCase());
        if (!exists) {
          const catalogValue = field === "pod" ? newValueNorm.toUpperCase() : newValueNorm;
          setAddNewModal({ field, newValue: catalogValue, table: info.table, label: info.label });
        }
      }
    },
    [supabase, catalogos]
  );

  const handleConfirmAddNew = useCallback(async () => {
    if (!addNewModal || !supabase) return;
    const { table, newValue, label } = addNewModal;
    try {
      if (table === "destinos") {
        const nombre = newValue.trim();
        if (!nombre) throw new Error("Nombre del destino requerido");
        await saveDestinoToCatalog({ nombre });
      } else {
        let insertData: Record<string, unknown>;
        if (table === "navieras") {
          insertData = { nombre: newValue };
        } else {
          insertData = { nombre: newValue, activo: true };
        }
        const { error: err } = await supabase.from(table).insert(insertData);
        if (err) throw new Error(err.message);
      }
      await fetchCatalogos();
      sileo.success({ title: `"${newValue}" agregado correctamente a ${label}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(`Error al agregar a ${label}: ${msg}`);
    }
    setAddNewModal(null);
  }, [addNewModal, supabase, fetchCatalogos]);

  const getDisplayedRows = useCallback((): Record<string, unknown>[] => {
    const api = gridRef.current?.api;
    if (!api) return [];
    const displayedRows: Record<string, unknown>[] = [];
    api.forEachNodeAfterFilterAndSort((node) => {
      if (node.data) displayedRows.push(node.data as Record<string, unknown>);
    });
    return displayedRows;
  }, []);

  const handleExportExcel = useCallback(async () => {
    if (rowData.length === 0) return;
    const api = gridRef.current?.api;
    if (!api) return;
    const displayedRows = getDisplayedRows();
    if (displayedRows.length === 0) return;

    const displayed = api.getAllDisplayedColumns();
    const exportColumns: { field: string; header: string }[] = [];
    for (const col of displayed) {
      if (col.getColId() === SELECTION_COLUMN_ID) continue;
      const def = col.getColDef();
      const field = def.field;
      if (!field || typeof field !== "string") continue;
      const header = def.headerName != null ? String(def.headerName) : field;
      exportColumns.push({ field, header });
    }
    if (!exportColumns.some((col) => col.field === "cliente")) {
      exportColumns.splice(0, 0, {
        field: "cliente",
        header: t.registros.colClient,
      });
    }
    if (exportColumns.length === 0) return;

    const tr = t.registros;
    const fecha = new Date().toLocaleDateString(locale === "en" ? "en-US" : "es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const colsWord = locale === "en" ? "columns" : "columnas";
    const subtitle = `${exportColumns.length} ${colsWord} · ${displayedRows.length} ${tr.records} · ${fecha}`;
    const fileStamp = new Date().toISOString().slice(0, 10);
    await exportRegistrosSimpleExcel(
      displayedRows.map((row) => {
        const normalized: Record<string, unknown> = { ...row };
        for (const col of exportColumns) {
          if (typeof normalized[col.field] === "string") {
            normalized[col.field] = normalizeExportText(normalized[col.field]);
          }
        }
        return normalized;
      }),
      exportColumns,
      {
        sheetTitle: tr.exportExcelClientTitle,
        sheetSubtitle: subtitle,
        fileName: `Registros_ASLI_tabla_${fileStamp}.xlsx`,
        sheetTabName: tr.exportExcelTabName,
        yesLabel: tr.yes,
        noLabel: tr.no,
      }
    );
  }, [rowData.length, t.registros, locale, getDisplayedRows]);

  const handleExportPdf = useCallback(async () => {
    if (rowData.length === 0 || isExportingPdf) return;
    const api = gridRef.current?.api;
    if (!api) return;

    setIsExportingPdf(true);
    try {
      const rowsToExport = getDisplayedRows();
      if (rowsToExport.length === 0) return;

      const head = [[
        "N°", "CLIENTE", "BOOKING", "NAVIERA", "NAVE", "ESPECIE", "T°", "CBM", "DEPOT",
        "POD", "POL", "ETD", "ETA", "TT", "CONTRATO",
      ]];
      const body = rowsToExport.map((row, idx) => ([
        String(idx + 1),
        normalizeExportText(row.cliente),
        normalizeExportText(row.booking),
        normalizeExportText(row.naviera),
        normalizeExportText([row.nave, row.viaje].filter(Boolean).join(" ")),
        normalizeExportText(row.especie),
        normalizeExportText(row.temperatura),
        normalizeExportText(row.ventilacion),
        normalizeExportText(row.deposito),
        normalizeExportText(row.pod),
        normalizeExportText(row.pol),
        normalizeExportText(row.etd),
        normalizeExportText(row.eta),
        normalizeExportText(row.tt),
        normalizeExportText(row.contrato),
      ]));

      const [{ default: jsPDF }, autoTableMod] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable = (autoTableMod as unknown as { default?: Function }).default ?? (autoTableMod as unknown as Function);
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();

      doc.setFillColor(241, 245, 249);
      doc.rect(20, 12, pageW - 40, 56, "F");
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(1);
      doc.line(20, 68, pageW - 20, 68);

      try {
        const logoRes = await fetch(withBase("/logoasli.png"));
        if (logoRes.ok) {
          const logoBlob = await logoRes.blob();
          const logoDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result ?? ""));
            reader.onerror = () => reject(new Error("No se pudo leer logoasli.png"));
            reader.readAsDataURL(logoBlob);
          });
          if (logoDataUrl) {
            const { width: naturalW, height: naturalH } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
              img.onerror = () => reject(new Error("No se pudo cargar dimensiones del logo"));
              img.src = logoDataUrl;
            });
            const maxW = 128;
            const maxH = 42;
            const ratio = naturalW > 0 && naturalH > 0 ? naturalW / naturalH : maxW / maxH;
            let drawW = maxW;
            let drawH = drawW / ratio;
            if (drawH > maxH) {
              drawH = maxH;
              drawW = drawH * ratio;
            }
            doc.addImage(logoDataUrl, "PNG", 26, 16 + (maxH - drawH) / 2, drawW, drawH);
          }
        }
      } catch {
        // continuar sin logo
      }

      doc.setTextColor(29, 78, 216);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.text("Reserva Confirmada", 170, 39);
      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text(`${rowsToExport.length} booking${rowsToExport.length === 1 ? "" : "s"}`, 170, 55);

      autoTable(doc, {
        head,
        body,
        startY: 84,
        theme: "grid",
        rowPageBreak: "avoid",
        styles: {
          fontSize: 8.2,
          cellPadding: 4,
          overflow: "linebreak",
          lineColor: [226, 232, 240],
          lineWidth: 0.4,
          textColor: [30, 41, 59],
          halign: "center",
          valign: "middle",
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: 255,
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
          lineColor: [37, 99, 235],
        },
        bodyStyles: { halign: "center", valign: "middle" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 20, right: 20 },
      });

      const stamp = new Date().toISOString().slice(0, 10);
      doc.save(`Reserva_confirmada_${stamp}.pdf`);
      sileo.success({ title: `PDF exportado (${rowsToExport.length} booking${rowsToExport.length === 1 ? "" : "s"})` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo exportar a PDF.";
      setError(msg);
      sileo.error({ title: "Error al exportar PDF", description: msg });
    } finally {
      setIsExportingPdf(false);
    }
  }, [rowData.length, isExportingPdf, getDisplayedRows]);

  if (loading && rowData.length === 0) {
    return (
      <main className={`relative flex-1 min-h-0 overflow-hidden flex flex-col ${modulePageBg}`} role="main" aria-busy="true">
        <div className="flex-shrink-0 bg-gradient-to-r from-brand-blue via-[#0d1c42] to-brand-dark-teal text-white px-4 sm:px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/12 border border-white/20 flex items-center justify-center shrink-0">
              <Icon icon="lucide:clipboard-list" width={18} height={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold leading-tight tracking-tight">{t.sidebar.registros}</h1>
              <p className="text-xs text-white/65 mt-0.5">{t.registros.loading}</p>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 bg-[#E8F0FA]/95 border-b border-brand-blue/15">
          <div className="px-3 sm:px-4 py-2 flex items-center gap-1.5">
            <div className="h-9 flex-1 rounded-lg bg-white border border-brand-blue/15 animate-pulse" />
            <div className="h-9 w-20 rounded-lg bg-white border border-brand-blue/15 animate-pulse shrink-0" />
            <div className="h-9 w-9 rounded-lg bg-white border border-brand-blue/15 animate-pulse shrink-0" />
            <div className="h-9 w-9 rounded-lg bg-white border border-brand-blue/15 animate-pulse shrink-0" />
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden p-2 sm:p-3">
          <div className="h-full min-h-[250px] rounded-xl border border-brand-blue/12 bg-white shadow-sm overflow-hidden">
            <div className="h-10 bg-[#E8EEF7] border-b border-brand-blue/15" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`flex gap-3 px-3 py-2.5 border-b border-brand-blue/8 ${i % 2 === 1 ? "bg-[#F7FAFD]" : ""}`}>
                <div className="h-4 w-16 rounded bg-brand-blue/10 animate-pulse" />
                <div className="h-4 flex-1 max-w-[8rem] rounded bg-brand-blue/10 animate-pulse" />
                <div className="h-4 flex-1 rounded bg-brand-blue/8 animate-pulse" />
                <div className="h-4 flex-1 rounded bg-brand-blue/8 animate-pulse" />
                <div className="h-4 w-20 rounded bg-brand-blue/10 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={`relative flex-1 min-h-0 overflow-hidden flex flex-col ${modulePageBg}`} role="main">
      {error && (
        <div className="flex-shrink-0 px-3 sm:px-4 py-2.5 bg-red-100 text-red-700 text-base border-b border-red-200" role="alert">
          {error}
        </div>
      )}

      {/* Hero */}
      <div className="flex-shrink-0 bg-gradient-to-r from-brand-blue via-[#0d1c42] to-brand-dark-teal text-white px-4 sm:px-5 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-white/12 border border-white/20 flex items-center justify-center shrink-0">
              <Icon icon="lucide:clipboard-list" width={18} height={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold leading-tight tracking-tight">{t.sidebar.registros}</h1>
              <p className="text-xs text-white/65 mt-0.5">
                <span className="font-semibold text-white tabular-nums">{rowData.length}</span> {t.registros.records}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={withBase("/reservas/papelera")}
              className="p-2 bg-white/12 border border-white/15 rounded-lg hover:bg-white/20 transition-colors text-white/70 hover:text-white"
              title="Papelera"
            >
              <Icon icon="lucide:trash-2" width={14} height={14} />
            </a>
            {canEdit && (
              <a
                href={withBase("/reservas/crear")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-white text-brand-blue hover:bg-white/90 transition-colors"
              >
                <Icon icon="lucide:plus" width={13} height={13} />
                <span className="hidden sm:inline">{t.registros.newBooking}</span>
                <span className="sm:hidden">{t.registros.nuevoShort}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="relative z-40 flex-shrink-0 bg-[#E8F0FA]/95 border-b border-brand-blue/15 backdrop-blur-md">
        <div className="px-3 sm:px-4 py-2 flex items-center gap-1.5">
          <div className="flex-1 min-w-0 relative">
            <Icon
              icon="lucide:search"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-blue/35 w-3.5 h-3.5 pointer-events-none"
            />
            <input
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Buscar: nave, booking, contenedor..."
              className="w-full pl-8 pr-8 py-2 border border-brand-blue/20 bg-white rounded-lg text-sm text-brand-blue placeholder:text-brand-blue/35 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 focus:border-brand-blue transition-all"
            />
            {globalSearch && (
              <button
                type="button"
                onClick={() => setGlobalSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-blue/35 hover:text-brand-blue transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <Icon icon="lucide:x" width={13} height={13} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowColumnPanel(true)}
            className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-2 border rounded-lg text-sm font-semibold transition-colors shrink-0 ${
              hiddenColumns.size > 0
                ? "border-brand-blue bg-brand-blue/8 text-brand-blue"
                : "border-brand-blue/20 bg-white hover:bg-[#F4F8FC] text-brand-blue/70"
            }`}
            title="Columnas"
          >
            <Icon icon="lucide:columns" width={13} height={13} />
            <span className="hidden sm:inline">Columnas</span>
            {hiddenColumns.size > 0 && (
              <span className="min-w-4 h-4 px-1 text-[10px] font-bold bg-brand-blue text-white rounded-full flex items-center justify-center">
                {hiddenColumns.size}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => void handleExportExcel()}
            disabled={rowData.length === 0}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-2 border border-brand-blue/20 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 rounded-lg text-sm font-semibold text-brand-blue/70 transition-colors shrink-0 disabled:opacity-40"
            title={locale === "en" ? "Download visible table as Excel (.xlsx)" : "Descargar tabla visible en Excel (.xlsx)"}
          >
            <Icon icon="lucide:table-2" width={13} height={13} />
            <span className="hidden sm:inline">Excel</span>
          </button>

          <button
            type="button"
            onClick={() => void handleExportPdf()}
            disabled={rowData.length === 0 || isExportingPdf}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-2 border border-brand-blue/20 bg-white hover:bg-red-50 hover:border-red-300 hover:text-red-700 rounded-lg text-sm font-semibold text-brand-blue/70 transition-colors shrink-0 disabled:opacity-40"
            title="Exportar Reserva Confirmada PDF"
          >
            <Icon
              icon={isExportingPdf ? "lucide:loader-2" : "lucide:file-text"}
              width={13}
              height={13}
              className={isExportingPdf ? "animate-spin" : ""}
            />
            <span className="hidden sm:inline">PDF</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            className="p-2 text-brand-blue/55 hover:text-brand-blue hover:bg-white rounded-lg transition-colors shrink-0"
            title={t.registros.refresh}
          >
            <Icon icon="lucide:refresh-cw" width={14} height={14} />
          </button>
        </div>

        {canEdit && selectionCount > 0 && (
          <div className="px-3 sm:px-4 py-2 border-t border-brand-blue/10 flex items-center gap-2 bg-brand-blue/5">
            <span className="text-sm font-semibold text-brand-blue flex-1">
              {selectionCount} seleccionada{selectionCount !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={() => setShowTransportModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
            >
              <Icon icon="lucide:truck" width={12} height={12} />
              <span className="hidden sm:inline">{t.registros.sendToTransport}</span>
              <span className="sm:hidden">{t.registros.sendToTransportShort}</span>
            </button>
            <button
              type="button"
              onClick={() => void handleRemoveSelected()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <Icon icon="lucide:trash-2" width={12} height={12} />
              <span className="hidden sm:inline">{t.registros.deleteSelection}</span>
              <span className="sm:hidden">Eliminar</span>
            </button>
            <button
              type="button"
              onClick={() => gridRef.current?.api?.deselectAll()}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              aria-label="Limpiar selección"
            >
              <Icon icon="lucide:x" width={13} height={13} />
            </button>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="flex-1 min-h-0 overflow-hidden p-2 sm:p-3 flex flex-col">
        <div
          className="ag-theme-balham flex-1 min-h-[250px] sm:min-h-[300px] w-full overflow-hidden rounded-xl border border-brand-blue/12 bg-white shadow-sm flex flex-col"
          style={{ minHeight: 300 }}
        >
          <div className="flex-1 min-h-0">
            <AgGridReact<OperacionRow>
              ref={gridRef}
              className="h-full w-full"
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
              rowSelection={{ mode: "multiRow", checkboxes: true, headerCheckbox: true, selectAll: "filtered", enableClickSelection: false }}
              singleClickEdit
              stopEditingWhenCellsLoseFocus
              animateRows
              domLayout="normal"
              getRowId={(params) => params.data.id}
              onCellValueChanged={handleCellValueChanged}
              onCellContextMenu={handleCellContextMenu}
              suppressContextMenu
              preventDefaultOnContextMenu
              onSelectionChanged={(e) => setSelectionCount(e.api.getSelectedRows().length)}
              onGridReady={onGridReady}
              onDragStopped={onDragStopped}
              headerHeight={40}
            />
          </div>
          {rowData.length > 0 && (
            <div className="px-3 py-2 border-t border-brand-blue/10 flex items-center justify-between bg-[#E8EEF7]/90 flex-shrink-0">
              <span className="text-xs text-brand-blue/60 font-medium tabular-nums">
                {rowData.length} {t.registros.records}
              </span>
              {selectionCount > 0 && (
                <span className="text-xs text-brand-blue font-semibold">
                  {selectionCount} seleccionado{selectionCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {ctxMenu && (() => {
        const menuW = 240;
        const menuH = 88;
        const left = Math.max(8, Math.min(ctxMenu.x, window.innerWidth - menuW - 8));
        const top = Math.max(8, Math.min(ctxMenu.y, window.innerHeight - menuH - 8));
        return (
          <div
            role="menu"
            className="fixed z-[80] min-w-[220px] rounded-lg border border-neutral-200 bg-white shadow-lg py-1"
            style={{ left, top }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <p className="px-3 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 truncate">
              {ctxMenu.refLabel}
            </p>
            <button
              type="button"
              role="menuitem"
              onClick={handleCtxAddDocuments}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm font-semibold text-neutral-800 hover:bg-brand-blue/8 hover:text-brand-blue transition-colors"
            >
              <Icon icon="lucide:folder-plus" width={16} height={16} className="shrink-0 text-brand-blue" />
              {t.registros.contextAddDocuments}
            </button>
          </div>
        );
      })()}

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
