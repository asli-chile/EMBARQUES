"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { format } from "date-fns";
import { es as esLocale } from "date-fns/locale";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { parseProformaRows, sheetToRows, type ProformaNormalizada } from "@/lib/documentos/proforma-normalizer";

// -- Types --------------------------------------------------------------------

interface ProformaItem {
  id: string;
  especie: string;
  variedad: string;
  tipo_envase: string;
  categoria: string;
  etiqueta: string;
  calibre: string;
  kg_neto_caja: string;
  kg_bruto_caja: string;
  cantidad_cajas: string;
  kg_neto_total: number;
  kg_bruto_total: number;
  valor_caja: string;
  valor_kilo: number;
  valor_total: number;
  /** Último precio editado: define si al cambiar KG neto/caja se mantiene val/caja o val/kg */
  priceSource?: "caja" | "kilo";
}

interface ProformaHeader {
  numero: string;
  operacion_id: string;
  ref_asli: string;
  correlativo: string;
  fecha: string;
  // Exportador / Shipper
  exportador: string;
  exportador_rut: string;
  exportador_direccion: string;
  // Consignee
  importador: string;           // consignee company
  importador_direccion: string; // consignee address
  importador_pais: string;
  consignee_uscc: string;
  consignee_attn: string;
  consignee_email: string;
  consignee_mobile: string;
  consignee_zip: string;
  // Notify party
  notify_company: string;
  notify_address: string;
  notify_attn: string;
  notify_email: string;
  notify_mobile: string;
  notify_zip: string;
  // Embarque
  clausula_venta: string;
  moneda: string;
  forma_pago: string;
  puerto_origen: string;
  puerto_destino: string;
  destino: string;
  contenedor: string;
  sello: string;
  tara: string;
  tipo_contenedor: string;
  etd: string;
  eta: string;
  naviera: string;
  nave: string;
  viaje: string;
  booking: string;
  // Carga general
  especie_general: string;
  temperatura: string;
  ventilacion: string;
  pallets: string;
  // Documentos
  dus: string;
  csg: string;
  csp: string;
  numero_guia_despacho: string;
  corte_documental: string;
  observaciones: string;
}

interface OperacionOption {
  id: string;
  ref_asli: string;
  correlativo: number;
  cliente: string;
  naviera: string | null;
  nave: string | null;
  booking: string | null;
  pod: string | null;
  etd: string | null;
  contenedor: string | null;
}

interface FormatoTemplate {
  id: string;
  nombre: string;
  template_type: "html" | "excel";
  contenido_html: string;
  excel_path: string | null;
  excel_nombre: string | null;
  cliente: string | null;
}

// -- Constants ----------------------------------------------------------------

const CLAUSULAS = ["FOB", "CIF", "CFR", "EXW", "DAP", "DDP", "FCA"];
const MONEDAS = ["USD", "EUR", "CLP"];
const TABS = ["Mercadería", "Partes", "Embarque", "Documentos", "Etiquetas"] as const;

/**
 * LISTA DEFINITIVA DE ETIQUETAS - una sola fuente de verdad.
 * Todas garantizadas: existen en buildTagMap y renderHtmlTemplate.
 * Los alias están en el motor pero NO en este catálogo para evitar confusión.
 */
const PROFORMA_TAG_CATALOG: { group: string; icon: string; entries: { tag: string; label: string }[] }[] = [
  {
    group: "Identificación",
    icon: "lucide:hash",
    entries: [
      { tag: "{{numero_proforma}}", label: "Número de proforma (PRF0001)" },
      { tag: "{{ref_asli}}",        label: "Referencia operación ASLI" },
      { tag: "{{correlativo}}",     label: "Correlativo de la operación" },
      { tag: "{{fecha}}",           label: "Fecha de emisión" },
    ],
  },
  {
    group: "Exportador / Shipper",
    icon: "lucide:building-2",
    entries: [
      { tag: "{{exportador}}",           label: "Nombre empresa exportadora" },
      { tag: "{{exportador_rut}}",       label: "RUT exportador" },
      { tag: "{{exportador_direccion}}", label: "Dirección exportador" },
    ],
  },
  {
    group: "Consignee",
    icon: "lucide:user-check",
    entries: [
      { tag: "{{consignee}}",         label: "Empresa consignee" },
      { tag: "{{consignee_address}}", label: "Dirección consignee" },
      { tag: "{{consignee_pais}}",    label: "País consignee" },
      { tag: "{{consignee_uscc}}",    label: "USCC / USCI" },
      { tag: "{{consignee_attn}}",    label: "Atención - persona de contacto" },
      { tag: "{{consignee_email}}",   label: "Email consignee" },
      { tag: "{{consignee_mobile}}",  label: "Teléfono / mobile consignee" },
      { tag: "{{consignee_zip}}",     label: "ZIP / código postal consignee" },
    ],
  },
  {
    group: "Notify Party",
    icon: "lucide:bell",
    entries: [
      { tag: "{{notify_company}}", label: "Empresa notify party" },
      { tag: "{{notify_address}}", label: "Dirección notify party" },
      { tag: "{{notify_attn}}",    label: "Atención notify party" },
      { tag: "{{notify_email}}",   label: "Email notify party" },
      { tag: "{{notify_mobile}}",  label: "Teléfono notify party" },
      { tag: "{{notify_zip}}",     label: "ZIP notify party" },
    ],
  },
  {
    group: "Embarque",
    icon: "lucide:ship",
    entries: [
      { tag: "{{naviera}}",        label: "Naviera / Carrier" },
      { tag: "{{nave}}",           label: "Nave / Vessel" },
      { tag: "{{booking}}",        label: "Número de booking" },
      { tag: "{{pol}}",            label: "Puerto de embarque (POL)" },
      { tag: "{{pod}}",            label: "Puerto de descarga (POD)" },
      { tag: "{{destino_final}}",  label: "Destino final" },
      { tag: "{{etd}}",            label: "ETD - fecha de zarpe" },
      { tag: "{{eta}}",            label: "ETA - fecha de arribo" },
      { tag: "{{contenedor}}",     label: "N° contenedor" },
      { tag: "{{sello}}",          label: "N° sello" },
      { tag: "{{tara}}",           label: "Tara del contenedor" },
      { tag: "{{tipo_contenedor}}",label: "Tipo de contenedor (40RF, 20DV…)" },
    ],
  },
  {
    group: "Condiciones comerciales",
    icon: "lucide:handshake",
    entries: [
      { tag: "{{incoterm}}",    label: "Incoterm / Cláusula de venta" },
      { tag: "{{moneda}}",      label: "Moneda (USD / EUR / CLP)" },
      { tag: "{{forma_pago}}", label: "Forma de pago / Payment terms" },
      { tag: "{{pais_origen}}", label: "País de origen (Chile)" },
    ],
  },
  {
    group: "Carga y totales",
    icon: "lucide:package",
    entries: [
      { tag: "{{especie}}",           label: "Especie (primera línea / campo general)" },
      { tag: "{{descripcion_carga}}", label: "Descripción general de la carga" },
      { tag: "{{temperatura}}",       label: "Temperatura de transporte" },
      { tag: "{{ventilacion}}",       label: "Ventilación" },
      { tag: "{{pallets}}",           label: "Cantidad de pallets" },
      { tag: "{{total_cajas}}",       label: "Total cajas (suma de ítems)" },
      { tag: "{{total_peso_neto}}",   label: "KG neto total" },
      { tag: "{{total_peso_bruto}}",  label: "KG bruto total" },
      { tag: "{{total_valor}}",       label: "Total FOB con prefijo de moneda (ej: USD 12,500.00)" },
      { tag: "{{total_valor_numero}}",label: "Total FOB solo número (ej: 12,500.00)" },
    ],
  },
  {
    group: "Documentos de exportación",
    icon: "lucide:file-check-2",
    entries: [
      { tag: "{{dus}}",                  label: "DUS" },
      { tag: "{{csg}}",                  label: "CSG / SPS" },
      { tag: "{{csp}}",                  label: "CSP" },
      { tag: "{{numero_guia_despacho}}", label: "N° guía de despacho" },
      { tag: "{{corte_documental}}",     label: "Corte documental" },
      { tag: "{{observaciones}}",        label: "Observaciones / instrucciones especiales" },
    ],
  },
  {
    group: "ASLI (fijos)",
    icon: "lucide:landmark",
    entries: [
      { tag: "{{asli_nombre}}", label: "Razón social ASLI" },
      { tag: "{{asli_rut}}",    label: "RUT ASLI" },
      { tag: "{{asli_email}}",  label: "Email ASLI" },
    ],
  },
];

const PROFORMA_ITEM_ROW_HTML_TAGS: { tag: string; label: string }[] = [
  { tag: "{{#items}}…{{/items}}", label: "Envuelve el bloque que se repite por cada fila de mercadería" },
  { tag: "{{num}}",            label: "N° de línea" },
  { tag: "{{especie}}",        label: "Especie" },
  { tag: "{{variedad}}",       label: "Variedad" },
  { tag: "{{calibre}}",        label: "Calibre / tamaño" },
  { tag: "{{cantidad}}",       label: "Cantidad de cajas" },
  { tag: "{{kg_neto_caja}}",   label: "KG neto por caja" },
  { tag: "{{kg_bruto_caja}}",  label: "KG bruto por caja" },
  { tag: "{{kg_neto_total}}",  label: "KG neto total de la línea" },
  { tag: "{{kg_bruto_total}}", label: "KG bruto total de la línea" },
  { tag: "{{precio_caja}}",    label: "Precio por caja" },
  { tag: "{{precio_kilo}}",    label: "Precio por KG" },
  { tag: "{{total_linea}}",    label: "Valor total de la línea" },
];

const PROFORMA_ITEM_EXCEL_NOTE =
  "En Excel usa etiquetas numeradas por fila: {{item_1_especie}}, {{item_1_variedad}}, {{item_1_calibre}}, {{item_1_cantidad}}, {{item_1_kg_neto_caja}}, {{item_1_kg_bruto_caja}}, {{item_1_kg_neto_total}}, {{item_1_kg_bruto_total}}, {{item_1_precio_caja}}, {{item_1_precio_kilo}}, {{item_1_total_linea}}. Cambia 1 por 2, 3… hasta 30.";
type Tab = typeof TABS[number];

// -- Catálogos fijos de ítems -------------------------------------------------
const CALIBRES_CEREZA   = ["L","XL","J","2J","3J","4J","5J","6J"];
const VARIEDADES_CEREZA = ["SANTINA","LAPINS","REGINA","KORDIA","SWEETHEART","BING"];
const CATEGORIAS_CEREZA = ["CAT 1","CAT 2","CAT 3"];
const TIPOS_ENVASE_CEREZA = ["5 KG","2.5 KG","2 X 2.5 KG"];

function newItem(): ProformaItem {
  return {
    id: crypto.randomUUID(),
    especie: "", variedad: "", tipo_envase: "", categoria: "", etiqueta: "", calibre: "",
    kg_neto_caja: "", kg_bruto_caja: "", cantidad_cajas: "",
    kg_neto_total: 0, kg_bruto_total: 0,
    valor_caja: "", valor_kilo: 0, valor_total: 0,
    priceSource: undefined,
  };
}

/** Valor/caja derivado desde val/kg × kg neto (sin notación científica innecesaria) */
function formatDerivedValorCaja(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  return n.toFixed(6).replace(/\.?0+$/, "");
}

function valorKiloInputString(it: ProformaItem): string {
  const n = it.valor_kilo;
  if (!Number.isFinite(n)) return "";
  if (n === 0) return it.priceSource === "kilo" ? "0" : "";
  return String(Number(n.toFixed(6)));
}

function computeItem(item: ProformaItem): ProformaItem {
  const kgNeto = parseFloat(item.kg_neto_caja) || 0;
  const kgBruto = parseFloat(item.kg_bruto_caja) || 0;
  const cajas = parseInt(item.cantidad_cajas, 10) || 0;
  const src = item.priceSource;

  let valor_caja = item.valor_caja;
  let valor_kilo = item.valor_kilo;

  if (src === "kilo") {
    const vk = Number(item.valor_kilo) || 0;
    valor_kilo = vk;
    if (kgNeto > 0 && vk > 0) valor_caja = formatDerivedValorCaja(vk * kgNeto);
    else if (vk === 0) valor_caja = "";
  } else if (src === "caja") {
    const vc = parseFloat(item.valor_caja) || 0;
    valor_kilo = kgNeto > 0 ? vc / kgNeto : 0;
  } else {
    const vc = parseFloat(item.valor_caja) || 0;
    const vk = Number(item.valor_kilo) || 0;
    if (kgNeto > 0) {
      if (vc > 0) {
        valor_kilo = vc / kgNeto;
      } else if (vk > 0) {
        valor_kilo = vk;
        valor_caja = formatDerivedValorCaja(vk * kgNeto);
      } else {
        valor_kilo = 0;
      }
    } else if (vk > 0 && vc <= 0) {
      valor_kilo = vk;
      valor_caja = "";
    } else {
      valor_kilo = 0;
    }
  }

  const vCajaNum = parseFloat(valor_caja) || 0;
  return {
    ...item,
    valor_caja,
    valor_kilo,
    kg_neto_total: kgNeto * cajas,
    kg_bruto_total: kgBruto * cajas,
    valor_total: vCajaNum * cajas,
  };
}

const emptyHeader = (): ProformaHeader => ({
  numero: "", operacion_id: "", ref_asli: "", correlativo: "",
  fecha: format(new Date(), "yyyy-MM-dd"),
  exportador: "", exportador_rut: "", exportador_direccion: "",
  importador: "", importador_direccion: "", importador_pais: "",
  consignee_uscc: "", consignee_attn: "", consignee_email: "", consignee_mobile: "", consignee_zip: "",
  notify_company: "", notify_address: "", notify_attn: "", notify_email: "", notify_mobile: "", notify_zip: "",
  clausula_venta: "FOB", moneda: "USD", forma_pago: "",
  puerto_origen: "", puerto_destino: "", destino: "",
  contenedor: "", sello: "", tara: "", tipo_contenedor: "",
  etd: "", eta: "", naviera: "", nave: "", viaje: "", booking: "",
  especie_general: "", temperatura: "", ventilacion: "", pallets: "",
  dus: "", csg: "", csp: "", numero_guia_despacho: "", corte_documental: "",
  observaciones: "",
});

// -- Formatting ----------------------------------------------------------------

const fmt = (n: number, mon: string) => {
  const isCLP = mon.toUpperCase() === "CLP";
  return n.toLocaleString("es-CL", {
    minimumFractionDigits: isCLP ? 0 : 2,
    maximumFractionDigits: isCLP ? 0 : 2,
  });
};
const fmtKg = (n: number) =>
  n.toLocaleString("es-CL", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

/** Fecha para plantillas (alineado con instructivos / formatos del sistema) */
function fmtDateTag(s: string | null | undefined): string {
  if (!s || !String(s).trim()) return "";
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return String(s).trim();
    return format(d, "dd/MM/yyyy", { locale: esLocale });
  } catch {
    return String(s).trim();
  }
}

/** Clave interna para emparejar {{ ref_asli }}, {{Ref_ASLI}}, etc. */
function normalizeTagInner(inner: string): string {
  return inner.trim().replace(/\s+/g, "_").toLowerCase();
}

function toTagLookup(map: Record<string, string>): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const [k, v] of Object.entries(map)) {
    const m = k.match(/^\{\{([\s\S]*?)\}\}$/);
    if (!m) continue;
    const canon = normalizeTagInner(m[1]);
    if (!lookup.has(canon)) lookup.set(canon, v);
  }
  return lookup;
}

/** Reemplazo en HTML/XML: una sola pasada, etiquetas toleran espacios y mayúsculas */
function replaceFlatTemplateTags(text: string, lookup: Map<string, string>): string {
  return text.replace(/\{\{([\s\S]*?)\}\}/g, (full, inner: string) => {
    const t = inner.trim();
    if (t.startsWith("#") || t.startsWith("/")) return full;
    const key = normalizeTagInner(inner);
    if (lookup.has(key)) return lookup.get(key)!;
    return full;
  });
}

function descripcionCargaFromItems(items: ProformaItem[]): string {
  const parts = items
    .map(i => [i.especie, i.variedad].filter(Boolean).join(" ").trim())
    .filter(Boolean);
  return parts.length ? [...new Set(parts)].join("; ") : "";
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return format(d, "yyyy-MM-dd");
  } catch {
    return "";
  }
}

function normalizeIncoterm(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const u = raw.trim().toUpperCase();
  return CLAUSULAS.includes(u) ? u : null;
}

/** Extrae todas las {{…}} de HTML (incluye item_N_*, #items, etc.) */
function extractTemplateTags(html: string): string[] {
  const re = /\{\{[^{}]+\}\}/g;
  const m = html.match(re);
  return m ? [...new Set(m)] : [];
}

function scanXlsxTagsProforma(wb: XLSX.WorkBook): string[] {
  const found: string[] = [];
  const re = /\{\{[^{}]+\}\}/g;
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    for (const ref of Object.keys(ws)) {
      if (ref[0] === "!") continue;
      const c = ws[ref] as XLSX.CellObject | undefined;
      if (!c) continue;
      const raw = typeof c.v === "string" ? c.v : typeof c.w === "string" ? c.w : "";
      if (raw) {
        const mm = raw.match(re);
        if (mm) found.push(...mm);
      }
    }
  }
  return [...new Set(found)];
}

type OperacionSyncRow = {
  id: string;
  ref_asli: string | null;
  correlativo: number;
  cliente: string | null;
  consignatario: string | null;
  naviera: string | null;
  nave: string | null;
  booking: string | null;
  pol: string | null;
  pod: string | null;
  etd: string | null;
  eta: string | null;
  especie: string | null;
  pais: string | null;
  pallets: number | null;
  peso_bruto: number | null;
  peso_neto: number | null;
  tipo_unidad: string | null;
  contenedor: string | null;
  incoterm: string | null;
  observaciones: string | null;
  moneda: string | null;
  temperatura: string | null;
  ventilacion: number | null;
  dus: string | null;
  sps: string | null;
};

type ConsignatarioRow = {
  nombre: string;
  consignee_company: string | null;
  consignee_address: string | null;
  consignee_uscc: string | null;
  consignee_attn: string | null;
  consignee_email: string | null;
  consignee_mobile: string | null;
  consignee_zip: string | null;
  notify_company: string | null;
  notify_address: string | null;
  notify_attn: string | null;
  notify_email: string | null;
  notify_mobile: string | null;
  notify_zip: string | null;
  destino: string | null;
};

function pickConsignatario(rows: ConsignatarioRow[] | null, op: OperacionSyncRow): ConsignatarioRow | null {
  if (!rows?.length || !op.consignatario?.trim()) return null;
  const want = op.consignatario.trim().toLowerCase();
  const exact = rows.find(
    r =>
      r.nombre?.toLowerCase() === want ||
      (r.consignee_company && r.consignee_company.toLowerCase() === want)
  );
  if (exact) return exact;
  return (
    rows.find(
      r =>
        r.nombre?.toLowerCase().includes(want) ||
        (r.consignee_company && r.consignee_company.toLowerCase().includes(want))
    ) ?? null
  );
}

let proformaSupportedTagNormalsCache: Set<string> | null = null;
function getProformaSupportedTagNormals(): Set<string> {
  if (proformaSupportedTagNormalsCache) return proformaSupportedTagNormalsCache;
  const h = emptyHeader();
  h.fecha = "2020-01-15";
  h.etd = "2020-01-20";
  const row = newItem();
  row.especie = "X";
  const map = buildTagMap(h, [row, newItem()], { cajas: 10, kg_neto: 100, kg_bruto: 110, valor: 1000 });
  const s = new Set<string>();
  for (const k of Object.keys(map)) {
    const m = k.match(/^\{\{([\s\S]*?)\}\}$/);
    if (m) s.add(normalizeTagInner(m[1]));
  }
  proformaSupportedTagNormalsCache = s;
  return s;
}

function isProformaTagRecognized(tag: string): boolean {
  const trimmed = tag.trim();
  if (/^\{\{#items\}\}$/i.test(trimmed) || /^\{\{\/items\}\}$/i.test(trimmed)) return true;
  const m = tag.match(/^\{\{\s*([\s\S]*?)\s*\}\}$/);
  if (!m) return false;
  const inner = m[1].trim();
  if (inner.startsWith("#") || inner.startsWith("/")) return true;
  return getProformaSupportedTagNormals().has(normalizeTagInner(inner));
}

// Alias extendido: variantes comunes que la gente pone en sus plantillas → etiqueta canónica
const TAG_SUGGESTION_ALIASES: Record<string, string> = {
  // Identificación
  numero: "{{numero_proforma}}", nro: "{{numero_proforma}}", num: "{{numero_proforma}}",
  numero_factura: "{{numero_proforma}}", invoice_number: "{{numero_proforma}}", invoice_no: "{{numero_proforma}}",
  proforma_number: "{{numero_proforma}}", proforma_no: "{{numero_proforma}}",
  ref: "{{ref_asli}}", referencia: "{{ref_asli}}", reference: "{{ref_asli}}", op: "{{ref_asli}}",
  date: "{{fecha}}", issue_date: "{{fecha}}", fecha_documento: "{{fecha}}", document_date: "{{fecha}}",
  // Exportador
  exporter: "{{exportador}}", seller: "{{exportador}}", proveedor: "{{exportador}}", supplier: "{{exportador}}",
  exportadora: "{{exportador}}", empresa: "{{exportador}}", company: "{{exportador}}",
  rut: "{{exportador_rut}}", tax_id: "{{exportador_rut}}", rut_empresa: "{{exportador_rut}}",
  direccion: "{{exportador_direccion}}", address: "{{exportador_direccion}}", domicilio: "{{exportador_direccion}}",
  // Consignee
  consignatario: "{{consignee}}", buyer: "{{consignee}}", importador_nombre: "{{consignee}}",
  consignee_nombre: "{{consignee}}", consignee_name: "{{consignee}}",
  pais: "{{consignee_pais}}", country: "{{consignee_pais}}", destination_country: "{{consignee_pais}}",
  uscc: "{{consignee_uscc}}", usci: "{{consignee_uscc}}", fein: "{{consignee_uscc}}",
  attn: "{{consignee_attn}}", attention: "{{consignee_attn}}", contacto: "{{consignee_attn}}",
  email: "{{consignee_email}}", correo: "{{consignee_email}}",
  telefono: "{{consignee_mobile}}", phone: "{{consignee_mobile}}", mobile: "{{consignee_mobile}}",
  zip: "{{consignee_zip}}", postal_code: "{{consignee_zip}}", codigo_postal: "{{consignee_zip}}",
  // Notify
  notify: "{{notify_company}}", notify_party: "{{notify_company}}", notificado: "{{notify_company}}",
  notify_name: "{{notify_company}}", notify_nombre: "{{notify_company}}",
  // Embarque
  shipping_line: "{{naviera}}", linea: "{{naviera}}", carrier: "{{naviera}}", ocean_carrier: "{{naviera}}",
  vessel: "{{nave}}", ship: "{{nave}}", motonave: "{{nave}}", vsl: "{{nave}}",
  booking_number: "{{booking}}", booking_no: "{{booking}}", reserva: "{{booking}}",
  loading_port: "{{pol}}", port_of_loading: "{{pol}}", puerto_carga: "{{pol}}", origin_port: "{{pol}}",
  discharge_port: "{{pod}}", port_of_discharge: "{{pod}}", puerto_destino: "{{pod}}", destination_port: "{{pod}}",
  final_destination: "{{destino_final}}", destino: "{{destino_final}}",
  sailing_date: "{{etd}}", departure_date: "{{etd}}", fecha_zarpe: "{{etd}}", fecha_salida: "{{etd}}",
  arrival_date: "{{eta}}", fecha_llegada: "{{eta}}", fecha_arribo: "{{eta}}",
  container: "{{contenedor}}", container_number: "{{contenedor}}", container_no: "{{contenedor}}", cntr: "{{contenedor}}",
  seal: "{{sello}}", seal_number: "{{sello}}", seal_no: "{{sello}}", precinto: "{{sello}}",
  tare: "{{tara}}", container_tare: "{{tara}}",
  container_type: "{{tipo_contenedor}}", tipo: "{{tipo_contenedor}}", equipment_type: "{{tipo_contenedor}}",
  // Comerciales
  terms: "{{incoterm}}", trade_terms: "{{incoterm}}", delivery_terms: "{{incoterm}}", venta: "{{incoterm}}",
  currency: "{{moneda}}", usd: "{{moneda}}",
  payment_terms: "{{forma_pago}}", payment: "{{forma_pago}}", pago: "{{forma_pago}}",
  origin: "{{pais_origen}}", country_of_origin: "{{pais_origen}}", pais_de_origen: "{{pais_origen}}",
  // Carga
  product: "{{especie}}", commodity: "{{especie}}", goods: "{{especie}}", item: "{{especie}}", fruta: "{{especie}}",
  variety: "{{variedad}}", cultivar: "{{variedad}}",
  size: "{{calibre}}", grade: "{{calibre}}", caliber: "{{calibre}}",
  temp: "{{temperatura}}", temperature: "{{temperatura}}", setpoint: "{{temperatura}}",
  vent: "{{ventilacion}}", ventilation: "{{ventilacion}}", cma: "{{ventilacion}}",
  pallet: "{{pallets}}", pallets_total: "{{pallets}}", numero_pallets: "{{pallets}}",
  description: "{{descripcion_carga}}", cargo_description: "{{descripcion_carga}}", descripcion: "{{descripcion_carga}}",
  boxes: "{{total_cajas}}", cajas: "{{total_cajas}}", cases: "{{total_cajas}}", total_boxes: "{{total_cajas}}",
  net_weight: "{{total_peso_neto}}", neto: "{{total_peso_neto}}", peso_neto: "{{total_peso_neto}}", net_kg: "{{total_peso_neto}}",
  gross_weight: "{{total_peso_bruto}}", bruto: "{{total_peso_bruto}}", peso_bruto: "{{total_peso_bruto}}",
  total: "{{total_valor}}", grand_total: "{{total_valor}}", amount: "{{total_valor}}", valor_total: "{{total_valor}}",
  fob: "{{total_valor}}", fob_value: "{{total_valor}}", total_amount: "{{total_valor}}",
  // Documentos
  dus_number: "{{dus}}", numero_dus: "{{dus}}",
  csg_number: "{{csg}}", numero_csg: "{{csg}}",
  csp_number: "{{csp}}", numero_csp: "{{csp}}",
  guia: "{{numero_guia_despacho}}", guia_despacho: "{{numero_guia_despacho}}", dispatch_guide: "{{numero_guia_despacho}}",
  corte: "{{corte_documental}}", doc_cut: "{{corte_documental}}", documentary_cut: "{{corte_documental}}",
  remarks: "{{observaciones}}", notes: "{{observaciones}}", notas: "{{observaciones}}", comments: "{{observaciones}}",
};

function suggestCanonicalTag(tag: string): string | null {
  const m = tag.match(/^\{\{\s*([\s\S]*?)\s*\}\}$/);
  if (!m) return null;
  const norm = normalizeTagInner(m[1]);
  // Exact alias match
  if (TAG_SUGGESTION_ALIASES[norm]) return TAG_SUGGESTION_ALIASES[norm];
  // Partial: if any alias key is contained in norm or vice versa
  for (const [alias, canonical] of Object.entries(TAG_SUGGESTION_ALIASES)) {
    if (norm.includes(alias) || alias.includes(norm)) return canonical;
  }
  // Word overlap: find canonical tag whose name shares the most words with the input
  const inputWords = norm.split("_").filter(Boolean);
  let bestTag = "";
  let bestScore = 0;
  for (const k of getProformaSupportedTagNormals()) {
    const kWords = k.split("_").filter(Boolean);
    const shared = inputWords.filter(w => kWords.includes(w)).length;
    if (shared > bestScore) { bestScore = shared; bestTag = k; }
  }
  return bestScore > 0 ? `{{${bestTag}}}` : null;
}

// -- Template tag engine -------------------------------------------------------

function buildTagMap(
  header: ProformaHeader,
  items: ProformaItem[],
  totals: { cajas: number; kg_neto: number; kg_bruto: number; valor: number }
): Record<string, string> {
  const mon       = header.moneda;
  const fechaDoc  = fmtDateTag(header.fecha);
  const etdDoc    = fmtDateTag(header.etd);
  const etaDoc    = fmtDateTag(header.eta);
  const descCarga = descripcionCargaFromItems(items);
  const montoFmt  = `${mon} ${fmt(totals.valor, mon)}`;

  const map: Record<string, string> = {
    // -- Identificación ------------------------------------------------------
    "{{numero_proforma}}":  header.numero,
    "{{numero_documento}}": header.numero,          // alias
    "{{ref_asli}}":         header.ref_asli,
    "{{correlativo}}":      header.correlativo,
    "{{fecha}}":            fechaDoc,
    "{{fecha_emision}}":    fechaDoc,               // alias

    // -- Exportador / Shipper -------------------------------------------------
    "{{exportador}}":         header.exportador,
    "{{shipper}}":            header.exportador,    // alias
    "{{empresa_nombre}}":     header.exportador,    // alias
    "{{exportador_rut}}":     header.exportador_rut,
    "{{empresa_rut}}":        header.exportador_rut, // alias
    "{{exportador_direccion}}": header.exportador_direccion,
    "{{empresa_direccion}}":  header.exportador_direccion, // alias

    // -- Consignee ------------------------------------------------------------
    "{{consignee}}":          header.importador,
    "{{consignee_company}}":  header.importador,    // alias
    "{{importador}}":         header.importador,    // alias
    "{{consignee_address}}":  header.importador_direccion,
    "{{consignee_pais}}":     header.importador_pais,
    "{{pais_destino}}":       header.importador_pais, // alias
    "{{consignee_uscc}}":     header.consignee_uscc,
    "{{consignee_usci}}":     header.consignee_uscc, // alias
    "{{consignee_attn}}":     header.consignee_attn,
    "{{consignee_email}}":    header.consignee_email,
    "{{consignee_mobile}}":   header.consignee_mobile,
    "{{consignee_zip}}":      header.consignee_zip,

    // -- Notify Party ---------------------------------------------------------
    "{{notify_company}}":  header.notify_company,
    "{{notify}}":          header.notify_company,  // alias
    "{{notify_address}}":  header.notify_address,
    "{{notify_attn}}":     header.notify_attn,
    "{{notify_email}}":    header.notify_email,
    "{{notify_mobile}}":   header.notify_mobile,
    "{{notify_zip}}":      header.notify_zip,

    // -- Embarque -------------------------------------------------------------
    "{{naviera}}":         header.naviera,
    "{{nave}}":            header.nave,
    "{{vessel}}":          header.nave,            // alias
    "{{booking}}":         header.booking,
    "{{pol}}":             header.puerto_origen,
    "{{puerto_embarque}}": header.puerto_origen,   // alias
    "{{pod}}":             header.puerto_destino,
    "{{puerto_descarga}}": header.puerto_destino,  // alias
    "{{destino_final}}":   header.destino,
    "{{etd}}":             etdDoc,
    "{{fecha_embarque}}":  etdDoc,                 // alias
    "{{eta}}":             etaDoc,
    "{{contenedor}}":      header.contenedor,
    "{{sello}}":           header.sello,
    "{{tara}}":            header.tara,
    "{{tipo_contenedor}}": header.tipo_contenedor,

    // -- Condiciones comerciales -----------------------------------------------
    "{{incoterm}}":        header.clausula_venta,
    "{{clausula_venta}}":  header.clausula_venta,  // alias
    "{{moneda}}":          mon,
    "{{forma_pago}}":      header.forma_pago,
    "{{pais_origen}}":     "Chile",

    // -- Carga general --------------------------------------------------------
    "{{especie}}":          header.especie_general || items[0]?.especie || "",
    "{{variedad}}":         items[0]?.variedad ?? "",
    "{{calibre}}":          items[0]?.calibre ?? "",
    "{{temperatura}}":      header.temperatura,
    "{{ventilacion}}":      header.ventilacion,
    "{{pallets}}":          header.pallets,
    "{{descripcion_carga}}": descCarga,
    "{{total_cajas}}":      String(totals.cajas),
    "{{total_peso_neto}}":  fmtKg(totals.kg_neto),
    "{{peso_neto_total}}":  fmtKg(totals.kg_neto),  // alias
    "{{total_peso_bruto}}": fmtKg(totals.kg_bruto),
    "{{peso_bruto_total}}": fmtKg(totals.kg_bruto), // alias
    "{{total_valor}}":      montoFmt,
    "{{fob_total}}":        montoFmt,               // alias
    "{{total_valor_numero}}": fmt(totals.valor, mon),

    // -- Documentos -----------------------------------------------------------
    "{{dus}}":                  header.dus,
    "{{csg}}":                  header.csg,
    "{{csp}}":                  header.csp,
    "{{numero_guia_despacho}}": header.numero_guia_despacho,
    "{{corte_documental}}":     header.corte_documental,
    "{{observaciones}}":        header.observaciones,

    // -- ASLI -----------------------------------------------------------------
    "{{asli_nombre}}": "Asesorías y Servicios Logísticos Integrales Ltda.",
    "{{asli_rut}}":    "",
    "{{asli_email}}":  "",
  };

  // -- Item tags numerados para Excel (hasta 30 ítems) ----------------------
  items.forEach((it, i) => {
    const n = i + 1;
    const p = `{{item_${n}_`;
    const vc = parseFloat(it.valor_caja) || 0;
    map[`${p}especie}}`]        = it.especie;
    map[`${p}variedad}}`]       = it.variedad;
    map[`${p}calibre}}`]        = it.calibre;
    map[`${p}cajas}}`]          = it.cantidad_cajas;
    map[`${p}cantidad}}`]       = it.cantidad_cajas;  // alias
    map[`${p}kg_neto_caja}}`]   = it.kg_neto_caja;
    map[`${p}kg_bruto_caja}}`]  = it.kg_bruto_caja;
    map[`${p}kg_neto_total}}`]  = fmtKg(it.kg_neto_total);
    map[`${p}kg_bruto_total}}`] = fmtKg(it.kg_bruto_total);
    map[`${p}precio_caja}}`]    = fmt(vc, mon);
    map[`${p}valor_caja}}`]     = fmt(vc, mon);       // alias
    map[`${p}precio_kilo}}`]    = fmt(it.valor_kilo, mon);
    map[`${p}valor_kilo}}`]     = fmt(it.valor_kilo, mon); // alias
    map[`${p}total_linea}}`]    = fmt(it.valor_total, mon);
    map[`${p}valor_total}}`]    = fmt(it.valor_total, mon); // alias
  });

  return map;
}

/** Renders un HTML: expande {{#items}} y sustituye el resto con lookup normalizado (espacios / mayúsculas) */
function renderHtmlTemplate(html: string, lookup: Map<string, string>, items: ProformaItem[], moneda: string): string {
  let result = html;

  const itemBlockRe = /\{\{\s*#items\s*\}\}([\s\S]*?)\{\{\s*\/items\s*\}\}/gi;
  result = result.replace(itemBlockRe, (_match, rowTemplate: string) => {
    return items.map((it, idx) => {
      const vc = parseFloat(it.valor_caja) || 0;
      const itemTags: Record<string, string> = {
        "{{num}}":             String(idx + 1),
        "{{especie}}":         it.especie,
        "{{variedad}}":        it.variedad,
        "{{calibre}}":         it.calibre,
        "{{cantidad}}":        it.cantidad_cajas,
        "{{cajas}}":           it.cantidad_cajas,    // alias
        "{{kg_neto_caja}}":    it.kg_neto_caja,
        "{{kg_neto_unidad}}":  it.kg_neto_caja,      // alias
        "{{kg_bruto_caja}}":   it.kg_bruto_caja,
        "{{kg_bruto_unidad}}": it.kg_bruto_caja,     // alias
        "{{kg_neto_total}}":   fmtKg(it.kg_neto_total),
        "{{peso_neto}}":       fmtKg(it.kg_neto_total), // alias
        "{{kg_bruto_total}}":  fmtKg(it.kg_bruto_total),
        "{{peso_bruto}}":      fmtKg(it.kg_bruto_total), // alias
        "{{precio_caja}}":     fmt(vc, moneda),
        "{{valor_caja}}":      fmt(vc, moneda),      // alias
        "{{precio_kilo}}":     fmt(it.valor_kilo, moneda),
        "{{valor_kilo}}":      fmt(it.valor_kilo, moneda), // alias
        "{{total_linea}}":     fmt(it.valor_total, moneda),
        "{{valor_total}}":     fmt(it.valor_total, moneda), // alias
      };
      const rowLookup = toTagLookup(itemTags);
      return replaceFlatTemplateTags(rowTemplate, rowLookup);
    }).join("\n");
  });

  return replaceFlatTemplateTags(result, lookup);
}

/** Sustituye etiquetas en XML del .xlsx (misma lógica normalizada que HTML) */
async function applyTagsToXlsx(buffer: ArrayBuffer, lookup: Map<string, string>): Promise<Blob> {
  const zip = await JSZip.loadAsync(buffer);
  const targets = [
    "xl/sharedStrings.xml",
    ...Object.keys(zip.files).filter(f => f.startsWith("xl/worksheets/sheet") && f.endsWith(".xml")),
  ];
  for (const path of targets) {
    const file = zip.file(path);
    if (!file) continue;
    let content = await file.async("string");
    content = replaceFlatTemplateTags(content, lookup);
    zip.file(path, content);
  }
  return zip.generateAsync({ type: "blob" });
}

// -- Component ----------------------------------------------------------------

export function CrearProformaContent() {
  const supabase = useMemo(() => { try { return createClient(); } catch { return null; } }, []);
  const { user, isCliente, isEjecutivo, isAdmin, isSuperadmin, isLoading, empresaNombres } = useAuth();

  const [tab, setTab] = useState<Tab>("Mercadería");
  const [header, setHeader] = useState<ProformaHeader>(emptyHeader());
  const [items, setItems] = useState<ProformaItem[]>([newItem()]);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState<string | null>(null);

  // Templates
  const [templates, setTemplates] = useState<FormatoTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [exporting, setExporting] = useState(false);

  // Operation search
  const [opQuery, setOpQuery] = useState("");
  const [opResults, setOpResults] = useState<OperacionOption[]>([]);
  const [opLoading, setOpLoading] = useState(false);
  const [opLinked, setOpLinked] = useState<OperacionOption | null>(null);
  const [linkingOpId, setLinkingOpId] = useState<string | null>(null);
  const opDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [templateTagsDetected, setTemplateTagsDetected] = useState<string[]>([]);
  const [loadingTemplateTags, setLoadingTemplateTags] = useState(false);

  // Proformas list
  const [proformas, setProformas] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [showList, setShowList] = useState(false);

  // Catálogo de especies desde BD
  const [especiesCatalog, setEspeciesCatalog] = useState<string[]>([]);

  // Import from external Excel
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  // -- Load templates ---------------------------------------------------------
  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("formatos_documentos")
      .select("id,nombre,template_type,contenido_html,excel_path,excel_nombre,cliente")
      .eq("tipo", "proforma")
      .eq("activo", true)
      .order("nombre")
      .then(({ data }) => setTemplates(data ?? []));
  }, [supabase]);

  // Filter templates: prefer client-specific, then global
  const availableTemplates = useMemo(() => {
    const cliente = opLinked?.cliente ?? null;
    const clientSpecific = templates.filter(t => t.cliente === cliente && cliente !== null);
    const global = templates.filter(t => t.cliente === null);
    return clientSpecific.length > 0 ? [...clientSpecific, ...global] : global;
  }, [templates, opLinked]);

  const selectedTemplate = useMemo(
    () => availableTemplates.find(t => t.id === selectedTemplateId) ?? null,
    [availableTemplates, selectedTemplateId]
  );

  // Auto-select first template when list changes
  useEffect(() => {
    if (availableTemplates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(availableTemplates[0].id);
    }
  }, [availableTemplates, selectedTemplateId]);

  // -- Auto-number ------------------------------------------------------------
  const generateNumero = useCallback(async () => {
    if (!supabase || header.numero) return;
    const { data } = await supabase
      .from("proformas").select("numero")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    let next = 1;
    if (data?.numero) { const m = data.numero.match(/\d+$/); if (m) next = parseInt(m[0], 10) + 1; }
    setHeader(h => ({ ...h, numero: `PRF${String(next).padStart(4, "0")}` }));
  }, [supabase, header.numero]);

  useEffect(() => { generateNumero(); }, [generateNumero]);

  // -- Cargar catálogo de especies --------------------------------------------
  useEffect(() => {
    if (!supabase) return;
    supabase.from("especies").select("nombre").eq("activo", true).order("nombre")
      .then(({ data }) => { if (data) setEspeciesCatalog(data.map((r: any) => r.nombre)); });
  }, [supabase]);

  // -- Escanear etiquetas usadas en la plantilla seleccionada -----------------
  useEffect(() => {
    if (!selectedTemplate || !supabase) {
      setTemplateTagsDetected([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingTemplateTags(true);
      try {
        if (selectedTemplate.template_type === "html" && selectedTemplate.contenido_html) {
          const tags = extractTemplateTags(selectedTemplate.contenido_html);
          if (!cancelled) setTemplateTagsDetected(tags);
        } else if (selectedTemplate.template_type === "excel" && selectedTemplate.excel_path) {
          const { data, error } = await supabase.storage
            .from("formatos-templates")
            .download(selectedTemplate.excel_path);
          if (cancelled) return;
          if (error || !data) {
            setTemplateTagsDetected([]);
            return;
          }
          const buf = await data.arrayBuffer();
          const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
          setTemplateTagsDetected(scanXlsxTagsProforma(wb));
        } else {
          setTemplateTagsDetected([]);
        }
      } catch {
        if (!cancelled) setTemplateTagsDetected([]);
      } finally {
        if (!cancelled) setLoadingTemplateTags(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedTemplate, supabase]);

  // -- Operation search -------------------------------------------------------
  useEffect(() => {
    if (!opQuery.trim() || !supabase) { setOpResults([]); return; }
    if (opDebounceRef.current) clearTimeout(opDebounceRef.current);
    opDebounceRef.current = setTimeout(async () => {
      setOpLoading(true);
      let q = supabase
        .from("operaciones")
        .select("id,ref_asli,correlativo,cliente,naviera,nave,booking,pod,etd,contenedor")
        .is("deleted_at", null)
        .or(`ref_asli.ilike.%${opQuery}%,cliente.ilike.%${opQuery}%,booking.ilike.%${opQuery}%`)
        .order("correlativo", { ascending: false })
        .limit(10);
      if (isCliente && empresaNombres.length > 0) {
        q = q.in("cliente", empresaNombres);
      }
      const { data } = await q;
      setOpResults(data ?? []);
      setOpLoading(false);
    }, 300);
  }, [opQuery, supabase, isCliente, empresaNombres]);

  const linkOperation = useCallback(async (opBrief: OperacionOption) => {
    if (!supabase) return;
    setLinkingOpId(opBrief.id);
    setOpLinked(opBrief);
    setOpQuery("");
    setOpResults([]);
    try {
      const { data: op, error } = await supabase
        .from("operaciones")
        .select(
          `id, ref_asli, correlativo, cliente, consignatario, naviera, nave, booking, pol, pod,
           etd, eta, especie, pais, pallets, peso_bruto, peso_neto, tipo_unidad, contenedor,
           incoterm, observaciones, moneda, temperatura, ventilacion, dus, sps`
        )
        .eq("id", opBrief.id)
        .single();
      if (error || !op) {
        setHeader(h => ({
          ...h,
          operacion_id: opBrief.id,
          ref_asli: opBrief.ref_asli,
          naviera: opBrief.naviera ?? h.naviera,
          nave: opBrief.nave ?? h.nave,
          booking: opBrief.booking ?? h.booking,
          puerto_destino: opBrief.pod ?? h.puerto_destino,
          etd: toDateInputValue(opBrief.etd) || h.etd,
          contenedor: opBrief.contenedor ?? h.contenedor,
        }));
        return;
      }
      const row = op as OperacionSyncRow;

      let cons: ConsignatarioRow | null = null;
      if (row.cliente?.trim()) {
        const { data: consList } = await supabase
          .from("consignatarios")
          .select(`nombre, consignee_company, consignee_address, consignee_uscc,
                   consignee_attn, consignee_email, consignee_mobile, consignee_zip,
                   notify_company, notify_address, notify_attn, notify_email, notify_mobile, notify_zip,
                   destino`)
          .eq("activo", true)
          .eq("cliente", row.cliente.trim());
        cons = pickConsignatario((consList ?? []) as ConsignatarioRow[], row);
      }

      const inc = normalizeIncoterm(row.incoterm);
      const mon = row.moneda?.trim().toUpperCase();
      const monedaOk = mon && MONEDAS.includes(mon) ? mon : null;

      setHeader(h => ({
        ...h,
        operacion_id: row.id,
        ref_asli: row.ref_asli ?? opBrief.ref_asli,
        correlativo: row.correlativo ? String(row.correlativo) : h.correlativo,
        exportador: row.cliente?.trim() || h.exportador,
        // Consignee
        importador:
          cons?.consignee_company?.trim() ||
          cons?.nombre?.trim() ||
          row.consignatario?.trim() ||
          h.importador,
        importador_direccion: cons?.consignee_address?.trim() || h.importador_direccion,
        importador_pais:      row.pais?.trim() || h.importador_pais,
        consignee_uscc:       cons?.consignee_uscc?.trim()  || h.consignee_uscc,
        consignee_attn:       cons?.consignee_attn?.trim()  || h.consignee_attn,
        consignee_email:      cons?.consignee_email?.trim() || h.consignee_email,
        consignee_mobile:     cons?.consignee_mobile?.trim()|| h.consignee_mobile,
        consignee_zip:        cons?.consignee_zip?.trim()   || h.consignee_zip,
        // Notify
        notify_company:  cons?.notify_company?.trim()  || h.notify_company,
        notify_address:  cons?.notify_address?.trim()  || h.notify_address,
        notify_attn:     cons?.notify_attn?.trim()     || h.notify_attn,
        notify_email:    cons?.notify_email?.trim()    || h.notify_email,
        notify_mobile:   cons?.notify_mobile?.trim()   || h.notify_mobile,
        notify_zip:      cons?.notify_zip?.trim()      || h.notify_zip,
        // Destino
        destino: cons?.destino?.trim() || row.pais?.trim() || h.destino,
        // Embarque
        puerto_origen:  row.pol ?? h.puerto_origen,
        puerto_destino: row.pod ?? h.puerto_destino,
        etd:            toDateInputValue(row.etd) || h.etd,
        eta:            toDateInputValue(row.eta) || h.eta,
        contenedor:     row.contenedor ?? h.contenedor,
        naviera:        row.naviera ?? h.naviera,
        nave:           row.nave ?? h.nave,
        booking:        row.booking ?? h.booking,
        clausula_venta: inc ?? h.clausula_venta,
        moneda:         monedaOk ?? h.moneda,
        // Carga
        especie_general: row.especie?.trim() || h.especie_general,
        temperatura:     row.temperatura?.trim() || h.temperatura,
        ventilacion:     row.ventilacion != null ? String(row.ventilacion) : h.ventilacion,
        pallets:         row.pallets != null ? String(row.pallets) : h.pallets,
        // Documentos
        observaciones: row.observaciones?.trim() ? row.observaciones : h.observaciones,
        dus: row.dus?.trim() ? row.dus : h.dus,
        csg: row.sps?.trim() ? row.sps : h.csg,
      }));

      const hasCargo =
        !!(row.especie?.trim() || row.pallets != null || row.peso_neto != null || row.peso_bruto != null);
      if (hasCargo) {
        const cajas = row.pallets != null ? Math.max(0, Math.floor(Number(row.pallets))) : 0;
        const kgNetoTot = row.peso_neto != null ? Number(row.peso_neto) : 0;
        const kgBrutoTot = row.peso_bruto != null ? Number(row.peso_bruto) : 0;
        const kgNetoCaja = cajas > 0 && kgNetoTot > 0 ? String(kgNetoTot / cajas) : "";
        const kgBrutoCaja = cajas > 0 && kgBrutoTot > 0 ? String(kgBrutoTot / cajas) : "";
        setItems([
          computeItem({
            id: crypto.randomUUID(),
            especie: row.especie?.trim() ?? "",
            variedad: "",
            calibre: "",
            kg_neto_caja: kgNetoCaja,
            kg_bruto_caja: kgBrutoCaja,
            cantidad_cajas: cajas > 0 ? String(cajas) : "",
            kg_neto_total: 0,
            kg_bruto_total: 0,
            valor_caja: "",
            valor_kilo: 0,
            valor_total: 0,
          }),
        ]);
      }
    } finally {
      setLinkingOpId(null);
    }
  }, [supabase]);

  // -- Items helpers ----------------------------------------------------------
  const updateItem = useCallback((id: string, field: keyof ProformaItem, value: string) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id !== id) return it;
        if (field === "valor_kilo") {
          const vk = parseFloat(value.replace(",", ".")) || 0;
          return computeItem({ ...it, valor_kilo: vk, priceSource: "kilo" });
        }
        if (field === "valor_caja") {
          return computeItem({ ...it, valor_caja: value, priceSource: "caja" });
        }
        return computeItem({ ...it, [field]: value } as ProformaItem);
      })
    );
  }, []);

  const addItem = () => setItems(prev => [...prev, newItem()]);
  const removeItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));
  const duplicateItem = (id: string) =>
    setItems(prev => {
      const idx = prev.findIndex(it => it.id === id);
      if (idx < 0) return prev;
      const copy = { ...prev[idx], id: crypto.randomUUID() };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });

  // -- Totals -----------------------------------------------------------------
  const totals = useMemo(() => ({
    cajas:    items.reduce((s, it) => s + (parseInt(it.cantidad_cajas, 10) || 0), 0),
    kg_neto:  items.reduce((s, it) => s + it.kg_neto_total, 0),
    kg_bruto: items.reduce((s, it) => s + it.kg_bruto_total, 0),
    valor:    items.reduce((s, it) => s + it.valor_total, 0),
  }), [items]);

  const previewLookup = useMemo(
    () => toTagLookup(buildTagMap(header, items, totals)),
    [header, items, totals]
  );

  const copyTag = useCallback(async (tag: string) => {
    try {
      await navigator.clipboard.writeText(tag);
    } catch {
      setShowError("No se pudo copiar al portapapeles");
    }
  }, []);

  // -- Test data --------------------------------------------------------------
  const loadDatosDePrueba = useCallback(() => {
    setHeader({
      numero: "PRF0099",
      operacion_id: "",
      ref_asli: "ASLI-2026-099",
      correlativo: "99",
      fecha: format(new Date(), "yyyy-MM-dd"),
      exportador: "Frutas del Sur SpA",
      exportador_rut: "76.543.210-9",
      exportador_direccion: "Los Aromos 1234, Rancagua, Chile",
      importador: "Pacific Fresh Imports LLC",
      importador_direccion: "800 Ocean Drive, Los Angeles, CA 90001",
      importador_pais: "United States",
      consignee_uscc: "US-1234567890",
      consignee_attn: "John Smith",
      consignee_email: "jsmith@pacificfresh.com",
      consignee_mobile: "+1 310 555 0199",
      consignee_zip: "90001",
      notify_company: "Bank of America Trade Finance",
      notify_address: "555 S Flower St, Los Angeles, CA",
      notify_attn: "Trade Desk",
      notify_email: "trade@bofa.com",
      notify_mobile: "+1 213 555 0100",
      notify_zip: "90071",
      clausula_venta: "FOB",
      moneda: "USD",
      forma_pago: "Crédito 60 días",
      puerto_origen: "San Antonio, Chile",
      puerto_destino: "Los Angeles, USA",
      destino: "Los Angeles",
      contenedor: "TCKU3456789",
      sello: "CL1234567",
      tara: "3.900",
      tipo_contenedor: "40RF",
      etd: format(new Date(Date.now() + 14 * 86400000), "yyyy-MM-dd"),
      eta: format(new Date(Date.now() + 30 * 86400000), "yyyy-MM-dd"),
      naviera: "Hapag-Lloyd",
      nave: "Cape Charles",
      viaje: "023W",
      booking: "HLCU123456789",
      especie_general: "Uva de Mesa",
      temperatura: "-0.5°C",
      ventilacion: "25",
      pallets: "20",
      dus: "DUS-2026-001234",
      csg: "CSG-001",
      csp: "CSP-001",
      numero_guia_despacho: "GD-987654",
      corte_documental: format(new Date(Date.now() + 10 * 86400000), "yyyy-MM-dd"),
      observaciones: "Datos de prueba — no usar en producción.",
    });
    setItems([
      { id: crypto.randomUUID(), especie: "Uva de Mesa", variedad: "Red Globe", calibre: "XL",
        kg_neto_caja: "8.2", kg_bruto_caja: "9.0", cantidad_cajas: "1200",
        kg_neto_total: 9840, kg_bruto_total: 10800,
        valor_caja: "12.50", valor_kilo: 1.5244, valor_total: 15000, priceSource: "caja" },
      { id: crypto.randomUUID(), especie: "Uva de Mesa", variedad: "Crimson Seedless", calibre: "L",
        kg_neto_caja: "8.0", kg_bruto_caja: "8.8", cantidad_cajas: "800",
        kg_neto_total: 6400, kg_bruto_total: 7040,
        valor_caja: "11.00", valor_kilo: 1.375, valor_total: 8800, priceSource: "caja" },
    ]);
  }, []);

  // -- Export -----------------------------------------------------------------
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      // Excel: usar plantilla Almafruit (o plantilla custom si está seleccionada)
      if (selectedTemplate?.template_type === "excel" && selectedTemplate.excel_path && supabase) {
        const lookup = toTagLookup(buildTagMap(header, items, totals));
        const { data: blob, error } = await supabase.storage
          .from("formatos-templates")
          .download(selectedTemplate.excel_path);
        if (error || !blob) throw error ?? new Error("No se pudo descargar la plantilla");
        const buffer = await blob.arrayBuffer();
        const resultBlob = await applyTagsToXlsx(buffer, lookup);
        const url = URL.createObjectURL(resultBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Proforma_${header.numero || "borrador"}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await exportBuiltinXlsx();
      }

      // PDF: abrir ventana de impresión con el mismo formato
      await handleExportPdf();
    } catch (e: any) {
      setShowError(e?.message ?? "Error al exportar");
    } finally {
      setExporting(false);
    }
  };

  // Rellena el zip de Almafruit con los datos actuales (compartido entre xlsx y PDF)
  const fillAlmafruitZip = async (zip: typeof JSZip.prototype) => {
    const ex = (s: string) => String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const mon = header.moneda || "USD";
    const tagMap: Record<string, string> = {
      "{{EXPORTADOR_RUT}}":    header.exportador_rut || "",
      "{{INVOICE_NUMBER}}":    header.numero || "",
      "{{CONSIGNEE_COMPANY}}": header.importador || "",
      "{{CONSIGNEE_ADDRESS}}": header.importador_direccion || "",
      "{{CONSIGNEE_EMAIL}}":   (header.consignee_email || "").replace(/\t/g, ""),
      "{{CONSIGNEE_MOBILE}}":  header.consignee_mobile || "",
      "{{FECHA_EMBARQUE}}":    header.fecha || "",
      "{{CONSIGNEE_ATTN}}":    header.consignee_attn || "",
      "{{NOTIFY_USCC}}":       header.consignee_uscc || "",
      "{{CONSIGNEE_PAIS}}":    header.importador_pais || "",
      "{{REF_CLIENTE}}":       header.numero || "",
      "{{CSP}}":               header.csp || "",
      "{{CSG}}":               header.csg || "",
      "{{MOTONAVE}}":          header.nave || "",
      "{{VIAJE}}":             header.viaje || "",
      "{{MODALIDAD_VENTA}}":   header.clausula_venta || "",
      "{{CLAUSULA_VENTA}}":    header.clausula_venta || "",
      "{{FORMA_PAGO}}":        header.forma_pago || "",
      "{{PAIS_DESTINO}}":      header.destino || "",
      "{{PUERTO_DESTINO}}":    header.puerto_destino || "",
      "{{PUERTO_EMBARQUE}}":   header.puerto_origen || "",
      "{{PAIS_ORIGEN}}":       "Chile",
      "{{PESO_NETO_TOTAL}}":   `${fmtKg(totals.kg_neto)} KG`,
      "{{PESO_BRUTO_TOTAL}}":  `${fmtKg(totals.kg_bruto)} KG`,
      "{{CONTENEDOR}}":        header.contenedor || "",
      "{{PRODUCTO_ESPECIE}}":  header.especie_general || items[0]?.especie || "",
      "{{PRODUCTO_TOTAL}}":    String(totals.cajas),
      "{{TOTAL_FOB}}":         `${mon} ${fmt(totals.valor, mon)}`,
      "{{VALOR_TOTAL}}":       fmt(totals.valor, mon),
    };
    let sharedStr = await zip.files["xl/sharedStrings.xml"].async("string");
    for (const [tag, val] of Object.entries(tagMap)) {
      sharedStr = sharedStr.replaceAll(tag, ex(val));
    }
    zip.file("xl/sharedStrings.xml", sharedStr);

    let sheet = await zip.files["xl/worksheets/sheet1.xml"].async("string");
    const buildItemRow = (rowNum: number, it: ProformaItem | null): string => {
      const s = "41";
      const str = (col: string, val: string) =>
        val ? `<c r="${col}${rowNum}" s="${s}" t="inlineStr"><is><t>${ex(val)}</t></is></c>`
            : `<c r="${col}${rowNum}" s="${s}"/>`;
      const num = (col: string, val: number) =>
        val ? `<c r="${col}${rowNum}" s="${s}"><v>${val}</v></c>`
            : `<c r="${col}${rowNum}" s="${s}"/>`;
      if (!it) {
        return `<row r="${rowNum}" spans="1:20" ht="21">`
          + "ABCDEFGHIJKLMNOPQRST".split("").map(c => `<c r="${c}${rowNum}" s="${s}"/>`).join("")
          + `</row>`;
      }
      return `<row r="${rowNum}" spans="1:20" ht="21">`
        + str("A", it.cantidad_cajas) + `<c r="B${rowNum}" s="${s}"/>`
        + str("C", it.tipo_envase)    + `<c r="D${rowNum}" s="${s}"/>`
        + str("E", it.variedad)       + `<c r="F${rowNum}" s="${s}"/>`
        + str("G", it.categoria)      + `<c r="H${rowNum}" s="${s}"/>`
        + str("I", it.etiqueta)       + `<c r="J${rowNum}" s="${s}"/>`
        + str("K", it.calibre)        + `<c r="L${rowNum}" s="${s}"/>`
        + num("M", parseFloat(it.kg_neto_caja) || 0) + `<c r="N${rowNum}" s="${s}"/>`
        + num("O", it.valor_kilo || 0)               + `<c r="P${rowNum}" s="${s}"/>`
        + num("Q", parseFloat(it.valor_caja) || 0)   + `<c r="R${rowNum}" s="${s}"/>`
        + num("S", it.valor_total || 0)              + `<c r="T${rowNum}" s="${s}"/>`
        + `</row>`;
    };
    for (let i = 0; i < 20; i++) {
      const rowNum = 43 + i;
      sheet = sheet.replace(
        new RegExp(`<row[^>]*r="${rowNum}"[^>]*>[\\s\\S]*?<\\/row>`),
        buildItemRow(rowNum, items[i] ?? null)
      );
    }
    const totalVal = `${mon} ${fmt(totals.valor, mon)}`;
    const pagoVal  = header.forma_pago || "";
    const fillCell = (col: string, row: number, style: string, val: string) =>
      sheet.replace(
        new RegExp(`<c r="${col}${row}"[^/]*/>`),
        `<c r="${col}${row}" s="${style}" t="inlineStr"><is><t>${ex(val)}</t></is></c>`
      );
    sheet = fillCell("S", 66, "45", totalVal);
    sheet = fillCell("S", 67, "49", totalVal);
    sheet = fillCell("S", 68, "49", pagoVal);
    sheet = fillCell("S", 69, "49", pagoVal);
    zip.file("xl/worksheets/sheet1.xml", sheet);
  };

  // Genera y abre la ventana PDF — replica FORMATO ALMAFRUIT
  const openPdfWindow = async () => {
    const mon = header.moneda || "USD";
    const escH = (v: any) => String(v ?? "")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const totalFob = `${mon} ${fmt(totals.valor, mon)}`;

    const activeItems = items.filter(it => (it.cantidad_cajas || "") !== "" || (it.variedad || "") !== "");
    const blankCount = Math.max(0, 8 - activeItems.length);
    const B = "border:1px solid #888";
    const filledItemRows = activeItems.map(it => `<tr>
        <td>${escH(it.cantidad_cajas)}</td>
        <td>${escH(it.tipo_envase)}</td>
        <td>${escH(it.variedad)}</td>
        <td>${escH(it.categoria)}</td>
        <td>${escH(it.etiqueta)}</td>
        <td>${escH(it.calibre)}</td>
        <td>${fmtKg(parseFloat(it.kg_neto_caja)||0)}</td>
        <td>${fmt(parseFloat(it.valor_caja)||0, mon)}</td>
        <td style="font-weight:bold">${fmt(it.valor_total||0, mon)}</td>
      </tr>`).join("");
    const blankRows = Array.from({ length: blankCount },
      () => `<tr>${`<td style="${B};height:16px"></td>`.repeat(9)}</tr>`).join("");

    const SH = "font-weight:bold;font-size:7px";          // section header text style
    const SHB = `background:#1e3a5f;color:#fff;${SH}`;    // section header with bg
    const SUB = "font-size:6px;color:#555;font-style:italic"; // sub-label
    const LBL = "font-weight:bold";                        // field label

    const htmlDoc = `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"/>
<title>Proforma ${escH(header.numero || "borrador")}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;font-size:7.5px;margin:0;padding:6px;color:#000}
  @page{size:A4 landscape;margin:8mm}
  table{border-collapse:collapse;width:100%;margin-bottom:2px;table-layout:fixed}
  td,th{border:1px solid #888;padding:3px 5px;vertical-align:middle;text-align:center;word-break:break-word}
  .print-btn{position:fixed;top:8px;right:8px;padding:5px 14px;background:#059669;color:#fff;border:none;border-radius:5px;font-size:11px;cursor:pointer;z-index:9}
  @media print{.print-btn{display:none}}
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">⎙ Imprimir / PDF</button>

<!-- ① Logo + exportador + RUT/INVOICE  (3 cols: 14% | 58% | 28%) -->
<table>
  <colgroup><col style="width:14%"/><col style="width:58%"/><col style="width:28%"/></colgroup>
  <tr>
    <td rowspan="3" style="vertical-align:middle;padding:4px">
      <img src="/almafruit-logo.png" style="height:54px;width:auto"/>
    </td>
    <td style="font-weight:bold;font-size:8.5px">${escH(header.exportador || "EXPORTADORA ALMA FRUIT SPA")}</td>
    <td style="font-weight:bold">RUT: ${escH(header.exportador_rut)}</td>
  </tr>
  <tr>
    <td style="font-size:7px">GIRO: EXPORTADORA DE FRUTAS Y VERDURAS</td>
    <td style="font-weight:bold">INVOICE: ${escH(header.numero)}</td>
  </tr>
  <tr>
    <td style="font-size:7px">${escH(header.exportador_direccion || "ARTURO PEREZ CANTO 1011 CURICO")}</td>
    <td style="border:none"></td>
  </tr>
</table>

<!-- ② Consignee (2 mitades: 70% izq | 30% der)  -->
<table style="text-align:left">
  <colgroup><col style="width:14%"/><col style="width:56%"/><col style="width:14%"/><col style="width:16%"/></colgroup>
  <tr>
    <td style="${LBL}">CONSIGNEE:</td>
    <td>${escH(header.importador)}</td>
    <td style="${LBL}">FECHA:</td>
    <td>${escH(header.fecha)}</td>
  </tr>
  <tr>
    <td style="${LBL}">ADDRESS:</td>
    <td colspan="3">${escH(header.importador_direccion)}</td>
  </tr>
  <tr>
    <td style="${LBL}">EMAIL:</td>
    <td>${escH(header.consignee_email)}</td>
    <td style="${LBL}">TEL:</td>
    <td>${escH(header.consignee_mobile)}</td>
  </tr>
  <tr>
    <td style="${LBL}">ATTN:</td>
    <td>${escH(header.consignee_attn)}</td>
    <td style="${LBL}">EMBARQUE N°:</td>
    <td style="font-weight:bold">${escH(header.numero)}</td>
  </tr>
  <tr>
    <td style="${LBL}">USCI:</td>
    <td colspan="3">${escH(header.consignee_uscc)}</td>
  </tr>
  <tr>
    <td style="${LBL}">PAIS:</td>
    <td colspan="3">${escH(header.importador_pais)}</td>
  </tr>
  <tr>
    <td style="${LBL}">CSP:</td>
    <td colspan="3">${escH(header.csp)}</td>
  </tr>
  <tr>
    <td style="${LBL}">CSG:</td>
    <td colspan="3">${escH(header.csg)}</td>
  </tr>
</table>

<!-- ③ Embarque — 5 columnas iguales (20% c/u) -->
<table>
  <colgroup><col style="width:20%"/><col style="width:20%"/><col style="width:20%"/><col style="width:20%"/><col style="width:20%"/></colgroup>
  <tr>
    <td style="${SHB}">FECHA DE EMBARQUE</td>
    <td style="${SHB}">MOTONAVE</td>
    <td style="${SHB}">N° DE VIAJE</td>
    <td style="${SHB}">MODALIDAD DE VENTA</td>
    <td style="${SHB}">CLAUSULA DE VENTA</td>
  </tr>
  <tr>
    <td style="${SUB}">Depurate Date</td>
    <td style="${SUB}">Vassel</td>
    <td style="${SUB}">Travel Number</td>
    <td style="${SUB}">Terms of Sale</td>
    <td style="${SUB}">Clause of Sale</td>
  </tr>
  <tr>
    <td>${escH(header.fecha)}</td>
    <td>${escH(header.nave)}</td>
    <td>${escH(header.viaje)}</td>
    <td>${escH(header.clausula_venta)}</td>
    <td>${escH(header.clausula_venta)}</td>
  </tr>
</table>

<!-- ④ Puertos — 5 columnas iguales -->
<table>
  <colgroup><col style="width:20%"/><col style="width:20%"/><col style="width:20%"/><col style="width:20%"/><col style="width:20%"/></colgroup>
  <tr>
    <td style="${SHB}">PAIS ORIGEN</td>
    <td style="${SHB}">PUERTO EMBARQUE</td>
    <td style="${SHB}">PUERTO DESTINO</td>
    <td style="${SHB}">PAIS DESTINO FINAL</td>
    <td style="${SHB}">FORMA DE PAGO</td>
  </tr>
  <tr>
    <td style="${SUB}">Country of Origin</td>
    <td style="${SUB}">Loading Port</td>
    <td style="${SUB}">Destination Port</td>
    <td style="${SUB}">Country of Destination</td>
    <td style="${SUB}">Payment Terms</td>
  </tr>
  <tr>
    <td>Chile</td>
    <td>${escH(header.puerto_origen)}</td>
    <td>${escH(header.puerto_destino)}</td>
    <td>${escH(header.destino)}</td>
    <td>${escH(header.forma_pago)}</td>
  </tr>
</table>

<!-- ⑤ Pesos + contenedor — 3 columnas iguales -->
<table>
  <colgroup><col style="width:33.3%"/><col style="width:33.3%"/><col style="width:33.4%"/></colgroup>
  <tr>
    <td style="${SHB}">PESO NETO TOTAL</td>
    <td style="${SHB}">PESO BRUTO TOTAL</td>
    <td style="${SHB}">CONTENEDOR / AWB</td>
  </tr>
  <tr>
    <td style="${SUB}">Net Weight</td>
    <td style="${SUB}">Gross Weight</td>
    <td style="${SUB}">Container / awb</td>
  </tr>
  <tr>
    <td>${fmtKg(totals.kg_neto)} KG</td>
    <td>${fmtKg(totals.kg_bruto)} KG</td>
    <td>${escH(header.contenedor)}</td>
  </tr>
</table>

<!-- ⑥ Especie -->
<table>
  <colgroup><col style="width:14%"/><col style="width:12%"/><col style="width:74%"/></colgroup>
  <tr>
    <td style="${SHB}">ESPECIE</td>
    <td style="${SUB}">Specie</td>
    <td>${escH(header.especie_general || items[0]?.especie || "")}</td>
  </tr>
</table>

<!-- ⑦ Tabla de productos — 9 columnas -->
<table>
  <colgroup>
    <col style="width:8%"/><col style="width:12%"/><col style="width:12%"/>
    <col style="width:9%"/><col style="width:11%"/><col style="width:8%"/>
    <col style="width:12%"/><col style="width:14%"/><col style="width:14%"/>
  </colgroup>
  <thead>
    <tr>
      <th style="${SHB}">CANTIDAD<br/><span style="${SUB}">Quantity</span></th>
      <th style="${SHB}">TIPO DE ENVASE<br/><span style="${SUB}">Type of Package</span></th>
      <th style="${SHB}">VARIEDAD<br/><span style="${SUB}">Variety</span></th>
      <th style="${SHB}">CATEGORIA<br/><span style="${SUB}">Category</span></th>
      <th style="${SHB}">ETIQUETA<br/><span style="${SUB}">Label</span></th>
      <th style="${SHB}">CALIBRE<br/><span style="${SUB}">Size</span></th>
      <th style="${SHB}">KG NETO UNIDAD<br/><span style="${SUB}">Net Weight Per Unit</span></th>
      <th style="${SHB}">PRECIO POR CAJA<br/><span style="${SUB}">Price Per Box</span></th>
      <th style="${SHB}">TOTAL<br/><span style="${SUB}">Total Value</span></th>
    </tr>
  </thead>
  <tbody>
    ${filledItemRows}
    ${blankRows}
  </tbody>
  <tfoot>
    <tr>
      <td style="font-weight:bold">${totals.cajas}</td>
      <td colspan="7" style="font-weight:bold">TOTALES</td>
      <td style="font-weight:bold">${totalFob}</td>
    </tr>
  </tfoot>
</table>

<!-- ⑧ Footer -->
<table>
  <colgroup><col style="width:25%"/><col style="width:25%"/><col style="width:50%"/></colgroup>
  <tr>
    <td style="font-weight:bold">VALOR TOTAL A PAGAR:</td>
    <td style="${SUB}">TOTAL VALUE:</td>
    <td style="font-weight:bold">${totalFob}</td>
  </tr>
  <tr>
    <td style="font-weight:bold">PLAZO DE PAGO:</td>
    <td style="${SUB}">PAYMENT TERMS:</td>
    <td>${escH(header.forma_pago)}</td>
  </tr>
  <tr>
    <td colspan="3" style="font-weight:bold;border-top:2px solid #888">
      ${escH(header.exportador || "EXPORTADORA ALMA FRUIT SPA")}
    </td>
  </tr>
</table>

</body></html>`;

    const win = window.open("", "_blank", "width=1200,height=900");
    if (!win) throw new Error("El navegador bloqueó la ventana de impresión.");
    win.document.open();
    win.document.write(`${htmlDoc}<script>window.onload=()=>window.print()<\/script>`);
    win.document.close();
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      await openPdfWindow();
    } catch (e: any) {
      setShowError(e?.message ?? "Error al exportar PDF");
    } finally {
      setExporting(false);
    }
  };

  const exportBuiltinXlsx = async () => {
    // ── Cargar template Almafruit desde /public ───────────────────────────────
    // Usamos JSZip para modificar el XML directamente — esto preserva la imagen/logo.
    // xlsx-js-style strip images al hacer write(), por eso se abandonó ese approach.
    const resp = await fetch("/FORMATO ALMAFRUIT.xlsx");
    if (!resp.ok) throw new Error("No se pudo cargar el formato Almafruit");
    const buffer = await resp.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);

    // Helper: escapar caracteres especiales XML
    const ex = (s: string) => String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    // ── 1. Reemplazar etiquetas de cabecera en sharedStrings.xml ─────────────
    // La plantilla tiene tags {{XXX}} en celdas individuales.
    // Reemplazamos el texto del sharedStrings (no tocamos el sheet XML de cabecera).
    const mon = header.moneda || "USD";
    const tagMap: Record<string, string> = {
      "{{EXPORTADOR_RUT}}":    header.exportador_rut || "",
      "{{INVOICE_NUMBER}}":    header.numero || "",
      "{{CONSIGNEE_COMPANY}}": header.importador || "",
      "{{CONSIGNEE_ADDRESS}}": header.importador_direccion || "",
      "{{CONSIGNEE_EMAIL}}":   (header.consignee_email || "").replace(/\t/g, ""),
      "{{CONSIGNEE_MOBILE}}":  header.consignee_mobile || "",
      "{{FECHA_EMBARQUE}}":    header.fecha || "",
      "{{CONSIGNEE_ATTN}}":    header.consignee_attn || "",
      "{{NOTIFY_USCC}}":       header.consignee_uscc || "",
      "{{CONSIGNEE_PAIS}}":    header.importador_pais || "",
      "{{REF_CLIENTE}}":       header.numero || "",
      "{{CSP}}":               header.csp || "",
      "{{CSG}}":               header.csg || "",
      "{{MOTONAVE}}":          header.nave || "",
      "{{VIAJE}}":             header.viaje || "",
      "{{MODALIDAD_VENTA}}":   header.clausula_venta || "",
      "{{CLAUSULA_VENTA}}":    header.clausula_venta || "",
      "{{FORMA_PAGO}}":        header.forma_pago || "",
      "{{PAIS_DESTINO}}":      header.destino || "",
      "{{PUERTO_DESTINO}}":    header.puerto_destino || "",
      "{{PUERTO_EMBARQUE}}":   header.puerto_origen || "",
      "{{PAIS_ORIGEN}}":       "Chile",
      "{{PESO_NETO_TOTAL}}":   `${fmtKg(totals.kg_neto)} KG`,
      "{{PESO_BRUTO_TOTAL}}":  `${fmtKg(totals.kg_bruto)} KG`,
      "{{CONTENEDOR}}":        header.contenedor || "",
      "{{PRODUCTO_ESPECIE}}":  header.especie_general || items[0]?.especie || "",
      "{{PRODUCTO_TOTAL}}":    String(totals.cajas),
      "{{TOTAL_FOB}}":         `${mon} ${fmt(totals.valor, mon)}`,
      "{{VALOR_TOTAL}}":       fmt(totals.valor, mon),
    };

    let sharedStr = await zip.files["xl/sharedStrings.xml"].async("string");
    for (const [tag, val] of Object.entries(tagMap)) {
      sharedStr = sharedStr.replaceAll(tag, ex(val));
    }
    zip.file("xl/sharedStrings.xml", sharedStr);

    // ── 2. Reemplazar filas de productos en sheet1.xml ────────────────────────
    // Fila 43: fila template con etiquetas {{PRODUCTO_X}} como shared strings.
    // Filas 44–62: filas vacías con estilos, sin datos.
    // Reemplazamos el XML de cada fila con valores inline para preservar estilos.
    let sheet = await zip.files["xl/worksheets/sheet1.xml"].async("string");

    const buildItemRow = (rowNum: number, it: ProformaItem | null): string => {
      const s = "41"; // mismo estilo que la fila template
      const str = (col: string, val: string) =>
        val
          ? `<c r="${col}${rowNum}" s="${s}" t="inlineStr"><is><t>${ex(val)}</t></is></c>`
          : `<c r="${col}${rowNum}" s="${s}"/>`;
      const num = (col: string, val: number) =>
        val
          ? `<c r="${col}${rowNum}" s="${s}"><v>${val}</v></c>`
          : `<c r="${col}${rowNum}" s="${s}"/>`;
      if (!it) {
        return `<row r="${rowNum}" spans="1:20" ht="21">`
          + "ABCDEFGHIJKLMNOPQRST".split("").map(c => `<c r="${c}${rowNum}" s="${s}"/>`).join("")
          + `</row>`;
      }
      return `<row r="${rowNum}" spans="1:20" ht="21">`
        + str("A", it.cantidad_cajas)
        + `<c r="B${rowNum}" s="${s}"/>`
        + str("C", it.tipo_envase)
        + `<c r="D${rowNum}" s="${s}"/>`
        + str("E", it.variedad)
        + `<c r="F${rowNum}" s="${s}"/>`
        + str("G", it.categoria)
        + `<c r="H${rowNum}" s="${s}"/>`
        + str("I", it.etiqueta)
        + `<c r="J${rowNum}" s="${s}"/>`
        + str("K", it.calibre)
        + `<c r="L${rowNum}" s="${s}"/>`
        + num("M", parseFloat(it.kg_neto_caja) || 0)
        + `<c r="N${rowNum}" s="${s}"/>`
        + num("O", it.valor_kilo || 0)
        + `<c r="P${rowNum}" s="${s}"/>`
        + num("Q", parseFloat(it.valor_caja) || 0)
        + `<c r="R${rowNum}" s="${s}"/>`
        + num("S", it.valor_total || 0)
        + `<c r="T${rowNum}" s="${s}"/>`
        + `</row>`;
    };

    for (let i = 0; i < 20; i++) {
      const rowNum = 43 + i;
      sheet = sheet.replace(
        new RegExp(`<row[^>]*r="${rowNum}"[^>]*>[\\s\\S]*?<\\/row>`),
        buildItemRow(rowNum, items[i] ?? null)
      );
    }

    // ── 3. Añadir valores en celdas S del footer ─────────────────────────────
    // S66/S67 = total FOB, S68/S69 = forma de pago
    const totalVal = `${mon} ${fmt(totals.valor, mon)}`;
    const pagoVal  = header.forma_pago || "";
    const fillCell = (col: string, row: number, style: string, val: string) =>
      sheet.replace(
        new RegExp(`<c r="${col}${row}"[^/]*/>`),
        `<c r="${col}${row}" s="${style}" t="inlineStr"><is><t>${ex(val)}</t></is></c>`
      );
    sheet = fillCell("S", 66, "45", totalVal);
    sheet = fillCell("S", 67, "49", totalVal);
    sheet = fillCell("S", 68, "49", pagoVal);
    sheet = fillCell("S", 69, "49", pagoVal);

    zip.file("xl/worksheets/sheet1.xml", sheet);

    // ── 4. Descargar ──────────────────────────────────────────────────────────
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Proforma_${header.numero || "borrador"}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // -- Save -------------------------------------------------------------------
  const handleSave = async () => {
    if (!supabase) return;
    setSaving(true);
    try {
      const row = {
        numero: header.numero || undefined,
        operacion_id: header.operacion_id || null, ref_asli: header.ref_asli || null,
        fecha: header.fecha || null, exportador: header.exportador || null,
        exportador_rut: header.exportador_rut || null, exportador_direccion: header.exportador_direccion || null,
        importador: header.importador || null, importador_direccion: header.importador_direccion || null,
        importador_pais: header.importador_pais || null, consignee_uscc: header.consignee_uscc || null,
        clausula_venta: header.clausula_venta || null, moneda: header.moneda || "USD",
        puerto_origen: header.puerto_origen || null, puerto_destino: header.puerto_destino || null,
        destino: header.destino || null, contenedor: header.contenedor || null,
        etd: header.etd || null, naviera: header.naviera || null,
        nave: header.nave || null, viaje: header.viaje || null, booking: header.booking || null,
        dus: header.dus || null, csg: header.csg || null, csp: header.csp || null,
        observaciones: header.observaciones || null,
        total_cajas: totals.cajas, total_kg_neto: totals.kg_neto,
        total_kg_bruto: totals.kg_bruto, total_valor: totals.valor,
        created_by: user?.id ?? null, updated_at: new Date().toISOString(),
      };
      const { data: saved, error: pfErr } = await supabase
        .from("proformas").upsert(row, { onConflict: "numero" }).select("id").single();
      if (pfErr || !saved) throw pfErr ?? new Error("No se pudo guardar");

      await supabase.from("proforma_items").delete().eq("proforma_id", saved.id);
      const { error: itemErr } = await supabase.from("proforma_items").insert(
        items.map((it, idx) => ({
          proforma_id: saved.id, orden: idx,
          especie: it.especie || null, variedad: it.variedad || null,
          tipo_envase: it.tipo_envase || null, categoria: it.categoria || null, etiqueta: it.etiqueta || null,
          calibre: it.calibre || null,
          kg_neto_caja: parseFloat(it.kg_neto_caja) || null,
          kg_bruto_caja: parseFloat(it.kg_bruto_caja) || null,
          cantidad_cajas: parseInt(it.cantidad_cajas, 10) || null,
          kg_neto_total: it.kg_neto_total || null, kg_bruto_total: it.kg_bruto_total || null,
          valor_caja: parseFloat(it.valor_caja) || null,
          valor_kilo: it.valor_kilo || null, valor_total: it.valor_total || null,
        }))
      );
      if (itemErr) throw itemErr;
      setShowSuccess(true);
    } catch (e: any) { setShowError(e?.message ?? "Error al guardar"); }
    finally { setSaving(false); }
  };

  // -- New --------------------------------------------------------------------
  const handleNew = () => {
    setHeader(emptyHeader()); setItems([newItem()]); setOpLinked(null); setShowSuccess(false);
    setTimeout(async () => {
      if (!supabase) return;
      const { data } = await supabase.from("proformas").select("numero")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      let next = 1;
      if (data?.numero) { const m = data.numero.match(/\d+$/); if (m) next = parseInt(m[0], 10) + 1; }
      setHeader(h => ({ ...h, numero: `PRF${String(next).padStart(4, "0")}` }));
    }, 100);
  };

  // -- Load list --------------------------------------------------------------
  const loadProformas = useCallback(async () => {
    if (!supabase) return;
    setLoadingList(true);
    const { data } = await supabase.from("proformas")
      .select("id,numero,ref_asli,fecha,importador,total_valor,moneda")
      .is("deleted_at", null).order("created_at", { ascending: false }).limit(50);
    setProformas(data ?? []);
    setLoadingList(false);
  }, [supabase]);

  // -- Load single ------------------------------------------------------------
  const loadProforma = useCallback(async (proformaId: string) => {
    if (!supabase) return;
    const [{ data: pf }, { data: its }] = await Promise.all([
      supabase.from("proformas").select("*").eq("id", proformaId).single(),
      supabase.from("proforma_items").select("*").eq("proforma_id", proformaId).order("orden"),
    ]);
    if (!pf) return;
    setHeader({
      numero: pf.numero ?? "", operacion_id: pf.operacion_id ?? "", ref_asli: pf.ref_asli ?? "",
      correlativo: pf.correlativo ?? "",
      fecha: pf.fecha ?? format(new Date(), "yyyy-MM-dd"),
      exportador: pf.exportador ?? "", exportador_rut: pf.exportador_rut ?? "",
      exportador_direccion: pf.exportador_direccion ?? "",
      importador: pf.importador ?? "", importador_direccion: pf.importador_direccion ?? "",
      importador_pais: pf.importador_pais ?? "",
      consignee_uscc: pf.consignee_uscc ?? "",
      consignee_attn: pf.consignee_attn ?? "",
      consignee_email: pf.consignee_email ?? "",
      consignee_mobile: pf.consignee_mobile ?? "",
      consignee_zip: pf.consignee_zip ?? "",
      notify_company: pf.notify_company ?? "",
      notify_address: pf.notify_address ?? "",
      notify_attn: pf.notify_attn ?? "",
      notify_email: pf.notify_email ?? "",
      notify_mobile: pf.notify_mobile ?? "",
      notify_zip: pf.notify_zip ?? "",
      clausula_venta: pf.clausula_venta ?? "FOB", moneda: pf.moneda ?? "USD",
      forma_pago: pf.forma_pago ?? "",
      puerto_origen: pf.puerto_origen ?? "", puerto_destino: pf.puerto_destino ?? "",
      destino: pf.destino ?? "", contenedor: pf.contenedor ?? "",
      sello: pf.sello ?? "", tara: pf.tara ?? "", tipo_contenedor: pf.tipo_contenedor ?? "",
      etd: pf.etd ?? "", eta: pf.eta ?? "",
      naviera: pf.naviera ?? "", nave: pf.nave ?? "", viaje: pf.viaje ?? "", booking: pf.booking ?? "",
      especie_general: pf.especie_general ?? "",
      temperatura: pf.temperatura ?? "", ventilacion: pf.ventilacion ?? "",
      pallets: pf.pallets ?? "",
      dus: pf.dus ?? "", csg: pf.csg ?? "", csp: pf.csp ?? "",
      numero_guia_despacho: pf.numero_guia_despacho ?? "",
      corte_documental: pf.corte_documental ?? "",
      observaciones: pf.observaciones ?? "",
    });
    if (its?.length) {
      setItems(its.map((it: any) => computeItem({
        id: it.id, especie: it.especie ?? "", variedad: it.variedad ?? "",
        tipo_envase: it.tipo_envase ?? "", categoria: it.categoria ?? "", etiqueta: it.etiqueta ?? "",
        calibre: it.calibre ?? "",
        kg_neto_caja: String(it.kg_neto_caja ?? ""), kg_bruto_caja: String(it.kg_bruto_caja ?? ""),
        cantidad_cajas: String(it.cantidad_cajas ?? ""),
        kg_neto_total: it.kg_neto_total ?? 0, kg_bruto_total: it.kg_bruto_total ?? 0,
        valor_caja: String(it.valor_caja ?? ""), valor_kilo: it.valor_kilo ?? 0, valor_total: it.valor_total ?? 0,
        priceSource: "caja",
      })));
    }
    setShowList(false);
  }, [supabase]);

  // -- Importar desde Excel externo (normalizador) ---------------------------
  const handleImportExcel = async (file: File) => {
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buf), { type: "array", cellDates: true });
      // Usar la primera hoja
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) throw new Error("El archivo no contiene hojas.");
      const rows = sheetToRows(ws as any);
      const norm: ProformaNormalizada = parseProformaRows(rows);

      const incNorm = normalizeIncoterm(norm.incoterm);
      const monNorm = norm.moneda?.trim().toUpperCase();
      const monedaOk = monNorm && MONEDAS.includes(monNorm) ? monNorm : null;

      setHeader(h => ({
        ...h,
        exportador:          norm.cliente       || h.exportador,
        importador:          norm.consignatario  || h.importador,
        naviera:             norm.naviera        || h.naviera,
        nave:                norm.nave           || h.nave,
        booking:             norm.booking        || h.booking,
        puerto_origen:       norm.pol            || h.puerto_origen,
        puerto_destino:      norm.pod            || h.puerto_destino,
        etd:                 toDateInputValue(norm.etd) || norm.etd || h.etd,
        contenedor:          norm.contenedor     || h.contenedor,
        consignee_uscc:      h.consignee_uscc,
        clausula_venta:      incNorm             ?? h.clausula_venta,
        moneda:              monedaOk            ?? h.moneda,
        importador_pais:     norm.pais           || h.importador_pais,
      }));

      if (norm.items.length > 0) {
        const parsed = norm.items.map(ni => computeItem({
          id: crypto.randomUUID(),
          especie:       ni.especie        || "",
          variedad:      ni.variedad       || "",
          calibre:       ni.calibre        || "",
          kg_neto_caja:  ni.peso_neto      || "",
          kg_bruto_caja: "",
          cantidad_cajas: ni.cantidad      || "",
          kg_neto_total:  0,
          kg_bruto_total: 0,
          valor_caja:    ni.precio_unitario || "",
          valor_kilo:    0,
          valor_total:   0,
          priceSource:   "caja" as const,
        }));
        setItems(parsed);
      }

      if (norm._sin_mapear && Object.keys(norm._sin_mapear).length > 0) {
        console.info("[proforma-normalizer] Campos sin mapear:", norm._sin_mapear);
      }
    } catch (e: any) {
      setShowError(e?.message ?? "Error al leer el archivo Excel.");
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  // -- Field helper -----------------------------------------------------------
  const setH = (field: keyof ProformaHeader, value: string) =>
    setHeader(h => ({ ...h, [field]: value }));

  const inp = (label: string, field: keyof ProformaHeader, opts?: { type?: string; placeholder?: string }) => (
    <div className="flex flex-col gap-0.5">
      <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{label}</label>
      <input
        type={opts?.type ?? "text"} placeholder={opts?.placeholder ?? ""}
        value={header[field] as string} onChange={e => setH(field, e.target.value)}
        className="border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
      />
    </div>
  );

  // -- Access guard -----------------------------------------------------------
  if (!isLoading && !isSuperadmin && !isAdmin && !isEjecutivo) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 text-neutral-500 p-8">
        <span className="text-4xl">🔒</span>
        <p className="text-lg font-medium">Acceso restringido</p>
        <p className="text-sm">Esta sección está disponible solo para ejecutivos, administradores y superadmin.</p>
      </div>
    );
  }

  // -- Render -----------------------------------------------------------------
  return (
    <div className="flex flex-col h-full bg-neutral-50">

      {/* Datalists globales */}
      <datalist id="variedades-cereza-list">
        {VARIEDADES_CEREZA.map(v => <option key={v} value={v} />)}
      </datalist>

      {/* -- Top Bar -- */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-neutral-200 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
            <Icon icon="lucide:file-text" width={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-neutral-800 leading-tight">Crear Proforma</h1>
            {header.numero && <p className="text-xs text-emerald-600 font-mono font-semibold">{header.numero}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          <button onClick={() => { setShowList(true); loadProformas(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors">
            <Icon icon="lucide:list" width={14} /><span className="hidden sm:inline">Mis Proformas</span>
          </button>
          {/* Importar Excel externo */}
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) void handleImportExcel(f); }}
          />
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            title="Importar proforma desde Excel externo (normalización automática)"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors">
            {importing
              ? <Icon icon="lucide:loader-2" width={14} className="animate-spin" />
              : <Icon icon="lucide:upload" width={14} />}
            <span className="hidden sm:inline">Importar</span>
          </button>
          {isSuperadmin && (
            <button
              type="button"
              onClick={loadDatosDePrueba}
              title="Rellenar con datos de prueba"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 transition-colors">
              <Icon icon="typcn:flash" width={14} />
              <span className="hidden sm:inline">Prueba</span>
            </button>
          )}
          <button onClick={handleNew}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors">
            <Icon icon="lucide:plus" width={14} /><span className="hidden sm:inline">Nueva</span>
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {saving
              ? <><Icon icon="lucide:loader-2" width={14} className="animate-spin" /><span>Guardando...</span></>
              : <><Icon icon="lucide:save" width={14} /><span>Guardar</span></>}
          </button>
        </div>
      </div>

      {/* -- Operation link + Template selector -- */}
      <div className="px-4 py-2.5 bg-white border-b border-neutral-100 flex-shrink-0 flex flex-col gap-2">

        {/* Operation search */}
        <div className="relative flex items-center gap-2">
          {opLinked ? (
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                <Icon icon="lucide:link" width={12} className="text-emerald-600 flex-shrink-0" />
                <span className="text-emerald-700 font-medium">{opLinked.ref_asli}</span>
                <span className="text-emerald-600 truncate">- {opLinked.cliente}</span>
                {linkingOpId && <Icon icon="lucide:loader-2" width={14} className="animate-spin text-emerald-600 flex-shrink-0" />}
                <button type="button" onClick={() => { setOpLinked(null); setHeader(h => ({ ...h, operacion_id: "", ref_asli: "" })); }} className="ml-auto text-emerald-500 hover:text-emerald-700 flex-shrink-0">
                  <Icon icon="lucide:x" width={12} />
                </button>
              </div>
              <p className="text-xs text-neutral-500 leading-snug px-0.5">
                Al vincular se cargan datos de la operación, consignatario (si coincide en configuración) y una línea de mercadería cuando hay especie o pesos/cajas.
              </p>
            </div>
          ) : (
            <div className="relative flex-1">
              <Icon icon="lucide:search" width={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input value={opQuery} onChange={e => setOpQuery(e.target.value)}
                placeholder="Buscar operación (ref, cliente, booking)..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white" />
              {opLoading && <Icon icon="lucide:loader-2" width={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 animate-spin" />}
              {opResults.length > 0 && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-xl shadow-xl overflow-hidden">
                  {opResults.map(op => (
                    <button key={op.id} type="button" disabled={!!linkingOpId} onClick={() => void linkOperation(op)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs hover:bg-emerald-50 text-left border-b border-neutral-50 last:border-0 disabled:opacity-50">
                      <span className="font-mono font-semibold text-emerald-700">{op.ref_asli}</span>
                      <span className="text-neutral-500 flex-1 truncate">{op.cliente}</span>
                      {op.booking && <span className="text-neutral-400">{op.booking}</span>}
                      {linkingOpId === op.id && <Icon icon="lucide:loader-2" width={14} className="animate-spin text-emerald-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <input type="date" value={header.fecha} onChange={e => setH("fecha", e.target.value)}
            className="border border-neutral-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white flex-shrink-0" />
        </div>

        {/* Template selector */}
        <div className="flex items-center gap-2">
          <Icon icon="lucide:layout-template" width={14} className="text-neutral-400 flex-shrink-0" />
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide flex-shrink-0">Formato:</label>
          {availableTemplates.length === 0 ? (
            <span className="text-xs text-neutral-400 italic">Sin formatos personalizados - se usará PDF estándar</span>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <select
                value={selectedTemplateId}
                onChange={e => setSelectedTemplateId(e.target.value)}
                className="flex-1 min-w-0 border border-neutral-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white"
              >
                <option value="">- PDF estándar -</option>
                {availableTemplates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                    {t.cliente ? ` (${t.cliente})` : " (global)"}
                    {" - "}
                    {t.template_type === "excel" ? "Excel" : "HTML/PDF"}
                  </option>
                ))}
              </select>
              {selectedTemplate && (
                <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                  selectedTemplate.template_type === "excel"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}>
                  <Icon icon={selectedTemplate.template_type === "excel" ? "lucide:table" : "lucide:file-text"} width={10} />
                  {selectedTemplate.template_type === "excel" ? "Excel" : "HTML"}
                </span>
              )}
            </div>
          )}
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {exporting
              ? <><Icon icon="lucide:loader-2" width={14} className="animate-spin" /><span>Generando...</span></>
              : <><Icon icon="lucide:file-spreadsheet" width={14} /><span>Generar Proforma</span></>
            }
          </button>
        </div>
      </div>

      {/* -- Tabs -- */}
      <div className="flex border-b border-neutral-200 bg-white px-4 flex-shrink-0">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              tab === t ? "border-emerald-600 text-emerald-700" : "border-transparent text-neutral-500 hover:text-neutral-700"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* -- Tab Content -- */}
      <div className="flex-1 overflow-y-auto">

        {/* --- Mercadería --- */}
        {tab === "Mercadería" && (
          <div className="p-5 flex flex-col gap-4 w-full">
            {/* Moneda + Cláusula */}
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Moneda</label>
                <div className="flex gap-1">
                  {MONEDAS.map(mn => (
                    <button key={mn} onClick={() => setH("moneda", mn)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${header.moneda === mn ? "bg-emerald-600 text-white border-emerald-600" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>
                      {mn}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Cláusula de Venta</label>
                <div className="flex gap-1 flex-wrap">
                  {CLAUSULAS.map(c => (
                    <button key={c} onClick={() => setH("clausula_venta", c)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${header.clausula_venta === c ? "bg-blue-600 text-white border-blue-600" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Totals summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Cajas",    val: totals.cajas.toLocaleString() },
                { label: "KG Neto Total",  val: fmtKg(totals.kg_neto) },
                { label: "KG Bruto Total", val: fmtKg(totals.kg_bruto) },
                { label: `FOB Total (${header.moneda})`, val: fmt(totals.valor, header.moneda), hi: true },
              ].map(s => (
                <div key={s.label} className={`rounded-xl border px-4 py-3 flex flex-col gap-0.5 ${s.hi ? "bg-emerald-50 border-emerald-200" : "bg-white border-neutral-200"}`}>
                  <span className="text-xs font-semibold text-neutral-500 uppercase">{s.label}</span>
                  <span className={`text-base font-bold font-mono tabular-nums ${s.hi ? "text-emerald-800" : "text-neutral-800"}`}>{s.val}</span>
                </div>
              ))}
            </div>

            {/* Botón agregar fila — prominente, antes de la tabla */}
            <button onClick={addItem}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-2 border-dashed border-emerald-400 text-emerald-700 rounded-xl hover:bg-emerald-50 hover:border-emerald-500 transition-colors self-start">
              <Icon icon="lucide:plus-circle" width={18} />Agregar fila
            </button>

            {/* Desktop table */}
            <div className="hidden md:block rounded-xl border border-neutral-200 bg-white overflow-x-auto">
              <table className="w-full text-sm min-w-[960px]">
                <thead>
                  <tr className="bg-emerald-700 text-white">
                    {["","#","Especie","Variedad","Tipo Envase","Categoría","Etiqueta","Calibre","KG Neto/Caja","KG Bruto/Caja","Cajas",
                      "KG Neto Total","KG Bruto Total",`Val/Caja (${header.moneda})`,
                      `Val/KG (${header.moneda})`, `Valor Total (${header.moneda})`, ""].map((h,i) => (
                      <th key={i} className="px-2 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={it.id} className={idx % 2 === 0 ? "bg-white" : "bg-neutral-50"}>
                      <td className="px-2 py-1 text-center">
                        <button onClick={() => duplicateItem(it.id)} title="Copiar fila"
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors whitespace-nowrap">
                          <Icon icon="lucide:copy-plus" width={14} />Copiar
                        </button>
                      </td>
                      <td className="px-2 py-1 text-neutral-400 text-center">{idx+1}</td>
                      {/* Especie — select desde tabla especies */}
                      <td className="px-1 py-1">
                        <select value={it.especie} onChange={e => updateItem(it.id, "especie", e.target.value)}
                          className="w-full min-w-[90px] border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-400 rounded px-1 py-0.5 text-sm">
                          <option value="">—</option>
                          {especiesCatalog.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      {/* Variedad — datalist cereza + libre en mayúscula */}
                      <td className="px-1 py-1">
                        <input list="variedades-cereza-list" value={it.variedad}
                          onChange={e => updateItem(it.id, "variedad", e.target.value.toUpperCase())}
                          className="w-full min-w-[90px] border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-400 rounded px-1 py-0.5 uppercase" />
                      </td>
                      {/* Tipo Envase — select fijo */}
                      <td className="px-1 py-1">
                        <select value={it.tipo_envase} onChange={e => updateItem(it.id, "tipo_envase", e.target.value)}
                          className="w-full min-w-[90px] border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-400 rounded px-1 py-0.5 text-sm">
                          <option value="">—</option>
                          {TIPOS_ENVASE_CEREZA.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      {/* Categoría — select fijo */}
                      <td className="px-1 py-1">
                        <select value={it.categoria} onChange={e => updateItem(it.id, "categoria", e.target.value)}
                          className="w-full min-w-[75px] border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-400 rounded px-1 py-0.5 text-sm">
                          <option value="">—</option>
                          {CATEGORIAS_CEREZA.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      {/* Etiqueta — texto libre */}
                      <td className="px-1 py-1">
                        <input value={it.etiqueta} onChange={e => updateItem(it.id, "etiqueta", e.target.value)}
                          className="w-full min-w-[70px] border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-400 rounded px-1 py-0.5" />
                      </td>
                      {/* Calibre — select fijo */}
                      <td className="px-1 py-1">
                        <select value={it.calibre} onChange={e => updateItem(it.id, "calibre", e.target.value)}
                          className="w-full min-w-[60px] border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-400 rounded px-1 py-0.5 text-sm">
                          <option value="">—</option>
                          {CALIBRES_CEREZA.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      {(["kg_neto_caja","kg_bruto_caja","cantidad_cajas"] as const).map(f => (
                        <td key={f} className="px-1 py-1">
                          <input type="number" value={it[f]} onChange={e => updateItem(it.id, f, e.target.value)}
                            className="w-full min-w-[60px] border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-400 rounded px-1 py-0.5 text-right" />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right font-mono tabular-nums text-neutral-700">{fmtKg(it.kg_neto_total)}</td>
                      <td className="px-2 py-1 text-right font-mono tabular-nums text-neutral-700">{fmtKg(it.kg_bruto_total)}</td>
                      <td className="px-1 py-1">
                        <input type="number" step="any" value={it.valor_caja} onChange={e => updateItem(it.id, "valor_caja", e.target.value)}
                          className="w-full min-w-[60px] border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-400 rounded px-1 py-0.5 text-right" />
                      </td>
                      <td className="px-1 py-1">
                        <input type="number" step="any" value={valorKiloInputString(it)} onChange={e => updateItem(it.id, "valor_kilo", e.target.value)}
                          className="w-full min-w-[56px] border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-400 rounded px-1 py-0.5 text-right font-mono tabular-nums" />
                      </td>
                      <td className="px-2 py-1 text-right font-mono tabular-nums font-semibold text-neutral-800">{fmt(it.valor_total, header.moneda)}</td>
                      <td className="px-1 py-1 text-center">
                        {items.length > 1 && (
                          <button onClick={() => removeItem(it.id)} title="Eliminar fila"
                            className="text-neutral-300 hover:text-red-500 transition-colors">
                            <Icon icon="lucide:trash-2" width={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* Totals — colSpan debe cuadrar exactamente con las 16 columnas */}
                  <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                    {/* cols 0-9: Copiar, #, Especie, Variedad, Tipo Envase, Categoría, Etiqueta, Calibre, KG Neto/Caja, KG Bruto/Caja */}
                    <td colSpan={10} className="px-2 py-2 text-right text-xs font-bold text-neutral-600">TOTAL</td>
                    {/* col 10: Cajas */}
                    <td className="px-2 py-2 text-right text-xs font-bold font-mono text-emerald-900">{totals.cajas.toLocaleString()}</td>
                    {/* col 11: KG Neto Total */}
                    <td className="px-2 py-2 text-right text-xs font-bold font-mono text-emerald-900">{fmtKg(totals.kg_neto)}</td>
                    {/* col 12: KG Bruto Total */}
                    <td className="px-2 py-2 text-right text-xs font-bold font-mono text-emerald-900">{fmtKg(totals.kg_bruto)}</td>
                    {/* cols 13-14: Val/Caja + Val/KG — vacíos */}
                    <td colSpan={2} />
                    {/* col 15: Valor Total */}
                    <td className="px-2 py-2 text-right text-sm font-bold font-mono text-emerald-900">{fmt(totals.valor, header.moneda)}</td>
                    {/* col 16: trash — vacío */}
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-3">
              {items.map((it, idx) => (
                <div key={it.id} className="bg-white rounded-xl border border-neutral-200 p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-400 uppercase">Ítem {idx+1}</span>
                    {items.length > 1 && <button onClick={() => removeItem(it.id)} className="text-neutral-300 hover:text-red-500"><Icon icon="lucide:trash-2" width={13} /></button>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-semibold text-neutral-400 uppercase">Especie</label>
                      <select value={it.especie} onChange={e => updateItem(it.id, "especie", e.target.value)}
                        className="border border-neutral-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400">
                        <option value="">—</option>
                        {especiesCatalog.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-semibold text-neutral-400 uppercase">Variedad</label>
                      <input list="variedades-cereza-list" value={it.variedad}
                        onChange={e => updateItem(it.id, "variedad", e.target.value.toUpperCase())}
                        className="border border-neutral-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 uppercase" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-semibold text-neutral-400 uppercase">Tipo Envase</label>
                      <select value={it.tipo_envase} onChange={e => updateItem(it.id, "tipo_envase", e.target.value)}
                        className="border border-neutral-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400">
                        <option value="">—</option>
                        {TIPOS_ENVASE_CEREZA.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-semibold text-neutral-400 uppercase">Categoría</label>
                      <select value={it.categoria} onChange={e => updateItem(it.id, "categoria", e.target.value)}
                        className="border border-neutral-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400">
                        <option value="">—</option>
                        {CATEGORIAS_CEREZA.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-semibold text-neutral-400 uppercase">Etiqueta</label>
                      <input value={it.etiqueta} onChange={e => updateItem(it.id, "etiqueta", e.target.value)}
                        className="border border-neutral-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-semibold text-neutral-400 uppercase">Calibre</label>
                      <select value={it.calibre} onChange={e => updateItem(it.id, "calibre", e.target.value)}
                        className="border border-neutral-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400">
                        <option value="">—</option>
                        {CALIBRES_CEREZA.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {([["kg_neto_caja","KG Neto/Caja"],["kg_bruto_caja","KG Bruto/Caja"],["cantidad_cajas","Cajas"],["valor_caja",`Val/Caja (${header.moneda})`]] as const).map(([f,lbl]) => (
                      <div key={f} className="flex flex-col gap-0.5">
                        <label className="text-[9px] font-semibold text-neutral-400 uppercase">{lbl}</label>
                        <input type="number" step="any" value={it[f]} onChange={e => updateItem(it.id, f, e.target.value)}
                          className="border border-neutral-200 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                      </div>
                    ))}
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-semibold text-neutral-400 uppercase">{`Val/KG (${header.moneda})`}</label>
                      <input type="number" step="any" value={valorKiloInputString(it)} onChange={e => updateItem(it.id, "valor_kilo", e.target.value)}
                        className="border border-neutral-200 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-emerald-400 font-mono" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-semibold text-neutral-400 uppercase">KG Neto Total</label>
                      <p className="border border-neutral-100 rounded px-2 py-1 text-xs text-right bg-neutral-50 font-mono">{fmtKg(it.kg_neto_total)}</p>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-semibold text-neutral-400 uppercase">KG Bruto Total</label>
                      <p className="border border-neutral-100 rounded px-2 py-1 text-xs text-right bg-neutral-50 font-mono">{fmtKg(it.kg_bruto_total)}</p>
                    </div>
                    <div className="flex flex-col gap-0.5 col-span-2">
                      <label className="text-[9px] font-semibold text-neutral-400 uppercase">Valor Total ({header.moneda})</label>
                      <p className="border border-emerald-200 rounded px-2 py-1 text-xs text-right bg-emerald-50 font-mono font-bold text-emerald-800">{fmt(it.valor_total, header.moneda)}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-neutral-500">Cajas:</span> <span className="font-bold text-emerald-900">{totals.cajas.toLocaleString()}</span></div>
                <div><span className="text-neutral-500">KG Neto:</span> <span className="font-bold text-emerald-900">{fmtKg(totals.kg_neto)}</span></div>
                <div><span className="text-neutral-500">KG Bruto:</span> <span className="font-bold text-emerald-900">{fmtKg(totals.kg_bruto)}</span></div>
                <div><span className="text-neutral-500">FOB Total:</span> <span className="font-bold text-emerald-900">{fmt(totals.valor, header.moneda)} {header.moneda}</span></div>
              </div>
            </div>

            <div className="flex flex-col gap-0.5">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Observaciones</label>
              <textarea value={header.observaciones} onChange={e => setH("observaciones", e.target.value)}
                rows={2} placeholder="Notas o condiciones especiales..."
                className="border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white resize-none" />
            </div>
          </div>
        )}

        {/* --- Partes --- */}
        {tab === "Partes" && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-2">
                <Icon icon="lucide:building-2" width={14} className="text-emerald-600" />Exportador
              </h3>
              {inp("Nombre / Razón Social", "exportador", { placeholder: "Ej: Agrícola Las Nieves SpA" })}
              {inp("RUT", "exportador_rut", { placeholder: "76.123.456-7" })}
              {inp("Dirección", "exportador_direccion", { placeholder: "Av. Los Leones 123, Santiago" })}
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-2">
                <Icon icon="lucide:globe" width={14} className="text-blue-600" />Consignee / Importador
              </h3>
              {inp("Nombre / Razón Social", "importador", { placeholder: "Ej: Fresh Imports Inc." })}
              {inp("Consignee Address", "importador_direccion", { placeholder: "123 Commerce St, Los Angeles, CA" })}
              {inp("País", "importador_pais", { placeholder: "USA" })}
              {inp("USCC / USCI", "consignee_uscc", { placeholder: "91110000100006795A" })}
              {inp("ATTN (Contacto)", "consignee_attn", { placeholder: "John Smith" })}
              {inp("Email", "consignee_email", { placeholder: "jsmith@company.com" })}
              {inp("Teléfono / Mobile", "consignee_mobile", { placeholder: "+1 310 555 0199" })}
            </div>
          </div>
        )}

        {/* --- Embarque --- */}
        {tab === "Embarque" && (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
            {inp("Puerto de Embarque", "puerto_origen", { placeholder: "San Antonio" })}
            {inp("Puerto de Descarga", "puerto_destino", { placeholder: "Los Angeles" })}
            {inp("Destino Final", "destino", { placeholder: "Los Angeles, CA" })}
            {inp("ETD", "etd", { type: "date" })}
            {inp("ETA", "eta", { type: "date" })}
            {inp("Forma de Pago", "forma_pago", { placeholder: "Crédito 60 días" })}
            {inp("Contenedor", "contenedor", { placeholder: "TCKU1234567" })}
            {inp("Naviera", "naviera", { placeholder: "Hapag-Lloyd" })}
            {inp("Nave / Buque", "nave", { placeholder: "SANTA ELENA" })}
            {inp("N° de Viaje", "viaje", { placeholder: "001A" })}
            {inp("Booking", "booking", { placeholder: "HAP1234567" })}
            {inp("Ref. ASLI", "ref_asli", { placeholder: "ASLI-2026-001" })}
            <div className="flex flex-col gap-0.5">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Cláusula de Venta</label>
              <select value={header.clausula_venta} onChange={e => setH("clausula_venta", e.target.value)}
                className="border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                {CLAUSULAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* --- Documentos --- */}
        {tab === "Documentos" && (
          <div className="p-5 flex flex-col gap-4 w-full">
            <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-2">
              <Icon icon="lucide:file-check-2" width={15} className="text-emerald-600" />Documentos de Exportación
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {inp("DUS", "dus", { placeholder: "DUS-2026-0001" })}
              {inp("CSG", "csg", { placeholder: "CSG-456" })}
              {inp("CSP", "csp", { placeholder: "CSP-789" })}
            </div>
          </div>
        )}

        {/* --- Etiquetas (plantilla) --- */}
        {tab === "Etiquetas" && (
          <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-start">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-5">
              <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                <Icon icon="lucide:scan-search" width={16} className="text-indigo-700" />
                Detectadas en tu formato
              </h3>
              <p className="text-sm text-indigo-900/70 mt-1.5">
                Coinciden con el motor de reemplazo al exportar (verde). Ámbar: la plantilla pide una etiqueta que el sistema aún no sustituye; revísala o pide soporte.
              </p>
              {loadingTemplateTags ? (
                <div className="flex items-center gap-2 text-sm text-indigo-800 mt-3">
                  <Icon icon="lucide:loader-2" width={16} className="animate-spin" />
                  Analizando plantilla…
                </div>
              ) : !selectedTemplate ? (
                <p className="text-sm text-indigo-900/75 mt-3">
                  Sin formato personalizado seleccionado (PDF estándar). Elige un HTML o Excel arriba para listar solo las etiquetas que usa ese archivo.
                </p>
              ) : templateTagsDetected.length === 0 ? (
                <p className="text-sm text-indigo-900/75 mt-3">
                  No aparecen celdas o textos con <code className="font-mono text-xs bg-white/80 px-1 rounded border border-indigo-100">{"{{etiqueta}}"}</code>
                  . Usa la referencia de abajo al diseñar el formato.
                </p>
              ) : (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {[...templateTagsDetected].sort().map(tag => {
                    const recognized = isProformaTagRecognized(tag);
                    const innerM = tag.match(/^\{\{\s*([\s\S]*?)\s*\}\}$/);
                    const preview = innerM ? previewLookup.get(normalizeTagInner(innerM[1])) : undefined;
                    const suggestion = !recognized ? suggestCanonicalTag(tag) : null;
                    return (
                      <li
                        key={tag}
                        className={`inline-flex flex-col gap-1 rounded-lg border px-3 py-2 text-left max-w-[300px] ${
                          recognized ? "border-emerald-200 bg-white" : "border-amber-300 bg-amber-50"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono break-all">{tag}</span>
                          <button
                            type="button"
                            onClick={() => void copyTag(tag)}
                            className="flex-shrink-0 text-indigo-600 hover:text-indigo-800 p-0.5 rounded transition-colors"
                            title="Copiar"
                          >
                            <Icon icon="lucide:copy" width={14} />
                          </button>
                        </div>
                        {recognized && innerM && previewLookup.has(normalizeTagInner(innerM[1])) && (
                          <span className="text-xs text-neutral-500 truncate" title={preview ?? ""}>
                            → {preview === "" || preview === undefined ? "-" : preview}
                          </span>
                        )}
                        {!recognized && suggestion && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-xs text-amber-800">Usa:</span>
                            <button
                              type="button"
                              onClick={() => void copyTag(suggestion)}
                              className="inline-flex items-center gap-1 font-mono text-xs bg-white border border-emerald-300 text-emerald-800 rounded px-1.5 py-0.5 hover:bg-emerald-50 transition-colors"
                              title="Copiar etiqueta sugerida"
                            >
                              {suggestion}
                              <Icon icon="lucide:copy" width={12} />
                            </button>
                          </div>
                        )}
                        {!recognized && !suggestion && (
                          <span className="text-xs text-amber-800 font-medium">Sin equivalente conocido</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-2">
                <Icon icon="lucide:tags" width={16} className="text-emerald-600" />
                Referencia: etiquetas disponibles
              </h3>
              <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
                {PROFORMA_ITEM_EXCEL_NOTE} En HTML, envuelve filas repetibles entre{" "}
                <code className="font-mono text-xs bg-neutral-100 px-1 rounded">{"{{#items}}"}</code> y{" "}
                <code className="font-mono text-xs bg-neutral-100 px-1 rounded">{"{{/items}}"}</code> y usa las etiquetas de fila indicadas abajo.
              </p>
              <div className="mt-4 flex flex-col gap-4">
                {PROFORMA_TAG_CATALOG.map(grp => (
                  <div key={grp.group} className="border border-neutral-100 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-neutral-50 border-b border-neutral-100">
                      <Icon icon={grp.icon} width={15} className="text-neutral-500" />
                      <span className="text-sm font-bold text-neutral-700 uppercase tracking-wide">{grp.group}</span>
                    </div>
                    <ul className="divide-y divide-neutral-50">
                      {grp.entries.map(e => (
                        <li key={e.tag} className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50/80">
                          <code className="font-mono text-xs text-emerald-800 flex-shrink-0 break-all">{e.tag}</code>
                          <span className="text-sm text-neutral-600 flex-1 min-w-0">{e.label}</span>
                          <button
                            type="button"
                            onClick={() => void copyTag(e.tag)}
                            className="flex-shrink-0 text-indigo-600 hover:text-indigo-800 p-1 rounded transition-colors"
                            title="Copiar etiqueta"
                          >
                            <Icon icon="lucide:copy" width={15} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <div className="border border-neutral-100 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-neutral-50 border-b border-neutral-100">
                    <Icon icon="lucide:list" width={15} className="text-neutral-500" />
                    <span className="text-sm font-bold text-neutral-700 uppercase tracking-wide">Dentro de {"{{#items}}"} (HTML)</span>
                  </div>
                  <ul className="divide-y divide-neutral-50">
                    {PROFORMA_ITEM_ROW_HTML_TAGS.map(e => (
                      <li key={e.tag} className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50/80">
                        <code className="font-mono text-xs text-blue-800 flex-shrink-0 break-all">{e.tag}</code>
                        <span className="text-sm text-neutral-600 flex-1 min-w-0">{e.label}</span>
                        {!e.tag.includes("…") && (
                          <button
                            type="button"
                            onClick={() => void copyTag(e.tag)}
                            className="flex-shrink-0 text-indigo-600 hover:text-indigo-800 p-1 rounded transition-colors"
                            title="Copiar"
                          >
                            <Icon icon="lucide:copy" width={15} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* -- Success Modal -- */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full flex flex-col gap-4 items-center text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <Icon icon="lucide:check-circle-2" width={28} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-800 text-base">¡Proforma guardada!</h3>
              <p className="text-sm text-neutral-500 mt-1">{header.numero} registrada correctamente.</p>
            </div>
            <div className="flex gap-2 w-full">
              <button onClick={handleExportExcel}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                <Icon icon="lucide:file-spreadsheet" width={14} />Generar Proforma
              </button>
              <button onClick={() => setShowSuccess(false)}
                className="flex-1 px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -- Error Modal -- */}
      {showError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full flex flex-col gap-4 items-center text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <Icon icon="lucide:alert-circle" width={28} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-800 text-base">Error</h3>
              <p className="text-sm text-neutral-500 mt-1">{showError}</p>
            </div>
            <button onClick={() => setShowError(null)}
              className="w-full px-4 py-2 text-sm font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* -- Proformas List Modal -- */}
      {showList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
              <h3 className="font-bold text-neutral-800">Proformas emitidas</h3>
              <button onClick={() => setShowList(false)} className="text-neutral-400 hover:text-neutral-600"><Icon icon="lucide:x" width={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingList
                ? <div className="flex justify-center py-8"><Icon icon="lucide:loader-2" width={20} className="animate-spin text-neutral-400" /></div>
                : proformas.length === 0
                  ? <p className="text-center text-sm text-neutral-400 py-8">No hay proformas registradas.</p>
                  : (
                    <table className="w-full text-xs">
                      <thead className="bg-neutral-50 sticky top-0">
                        <tr>{["N°","Ref. ASLI","Importador","Fecha","Total FOB",""].map(h => (
                          <th key={h} className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase text-xs">{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody>
                        {proformas.map(pf => (
                          <tr key={pf.id} className="border-t border-neutral-50 hover:bg-neutral-50">
                            <td className="px-4 py-2 font-mono font-semibold text-emerald-700">{pf.numero}</td>
                            <td className="px-4 py-2 text-neutral-600">{pf.ref_asli ?? "-"}</td>
                            <td className="px-4 py-2 text-neutral-700 max-w-[160px] truncate">{pf.importador ?? "-"}</td>
                            <td className="px-4 py-2 text-neutral-500">{pf.fecha}</td>
                            <td className="px-4 py-2 font-mono font-semibold">{fmt(pf.total_valor ?? 0, pf.moneda ?? "USD")} {pf.moneda}</td>
                            <td className="px-4 py-2">
                              <button onClick={() => loadProforma(pf.id)}
                                className="px-2 py-1 text-xs font-medium border border-emerald-200 text-emerald-700 rounded hover:bg-emerald-50 transition-colors">
                                Abrir
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
