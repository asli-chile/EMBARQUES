"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";
import JSZip from "jszip";

// ─── Props ────────────────────────────────────────────────────────────────────

type TipoDoc = "proforma" | "instructivo";

interface Props {
  tipoDoc: TipoDoc;
}

// ─── Tipos de BD ──────────────────────────────────────────────────────────────

type Operacion = {
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
  sello: string | null;
  tara: number | null;
  temperatura: string | null;
  ventilacion: string | null;
  incoterm: string | null;
  forma_pago: string | null;
  observaciones: string | null;
  transporte: string | null;
  tramo: string | null;
  valor_tramo: number | null;
  deposito: string | null;
  moneda: string | null;
};

type FormatoDocumento = {
  id: string;
  nombre: string;
  tipo: string;
  template_type: "html" | "excel" | null;
  descripcion: string | null;
  contenido_html: string | null;
  excel_path: string | null;
  excel_nombre: string | null;
};

// ─── Grupos de etiquetas ──────────────────────────────────────────────────────

type TagGroup = { group: string; icon: string; tags: { tag: string; label: string }[] };

const TAG_GROUPS: TagGroup[] = [
  {
    group: "Cliente / Exportador", icon: "lucide:building-2",
    tags: [
      { tag: "{{cliente_nombre}}",    label: "Nombre cliente" },
      { tag: "{{cliente_rut}}",       label: "RUT cliente" },
      { tag: "{{cliente_direccion}}", label: "Dirección cliente" },
      { tag: "{{consignatario}}",     label: "Consignatario" },
    ],
  },
  {
    group: "Operación", icon: "lucide:container",
    tags: [
      { tag: "{{ref_asli}}",          label: "Referencia ASLI" },
      { tag: "{{booking}}",           label: "Booking" },
      { tag: "{{contenedor}}",        label: "Contenedor" },
      { tag: "{{tipo_contenedor}}",   label: "Tipo contenedor" },
      { tag: "{{naviera}}",           label: "Naviera" },
      { tag: "{{nave}}",              label: "Nave" },
      { tag: "{{viaje}}",             label: "Viaje / Voyage" },
      { tag: "{{sello}}",             label: "Sello" },
      { tag: "{{incoterm}}",          label: "Incoterm" },
      { tag: "{{forma_pago}}",        label: "Forma de pago" },
    ],
  },
  {
    group: "Puertos y Fechas", icon: "lucide:map-pin",
    tags: [
      { tag: "{{puerto_origen}}",     label: "Puerto origen (POL)" },
      { tag: "{{puerto_destino}}",    label: "Puerto destino (POD)" },
      { tag: "{{pais_destino}}",      label: "País destino" },
      { tag: "{{etd}}",               label: "ETD" },
      { tag: "{{eta}}",               label: "ETA" },
      { tag: "{{fecha_emision}}",     label: "Fecha emisión" },
    ],
  },
  {
    group: "Carga", icon: "lucide:package",
    tags: [
      { tag: "{{descripcion_carga}}", label: "Descripción carga" },
      { tag: "{{temperatura}}",       label: "Temperatura" },
      { tag: "{{ventilacion}}",       label: "Ventilación" },
      { tag: "{{peso_bruto}}",        label: "Peso bruto" },
      { tag: "{{peso_neto}}",         label: "Peso neto" },
      { tag: "{{tara}}",              label: "Tara" },
      { tag: "{{cantidad_bultos}}",   label: "Pallets / Bultos" },
      { tag: "{{unidad_medida}}",     label: "Unidad de medida" },
      { tag: "{{hs_code}}",           label: "HS Code" },
      { tag: "{{observaciones}}",     label: "Observaciones" },
    ],
  },
  {
    group: "Financiero", icon: "lucide:dollar-sign",
    tags: [
      { tag: "{{numero_documento}}",  label: "N° documento" },
      { tag: "{{monto_total}}",       label: "Monto total" },
      { tag: "{{moneda}}",            label: "Moneda" },
      { tag: "{{precio_unitario}}",   label: "Precio unitario" },
      { tag: "{{concepto}}",          label: "Concepto" },
    ],
  },
  {
    group: "Transporte", icon: "lucide:truck",
    tags: [
      { tag: "{{empresa_transporte}}",label: "Empresa transporte" },
      { tag: "{{tramo}}",             label: "Tramo" },
      { tag: "{{valor_tramo}}",       label: "Valor tramo" },
      { tag: "{{deposito}}",          label: "Depósito" },
    ],
  },
  {
    group: "ASLI", icon: "lucide:building",
    tags: [
      { tag: "{{asli_nombre}}",       label: "Nombre ASLI" },
      { tag: "{{asli_rut}}",          label: "RUT ASLI" },
      { tag: "{{asli_direccion}}",    label: "Dirección ASLI" },
      { tag: "{{asli_telefono}}",     label: "Teléfono ASLI" },
      { tag: "{{asli_email}}",        label: "Email ASLI" },
    ],
  },
];

// Todos los tags conocidos en orden
const ALL_TAGS = TAG_GROUPS.flatMap((g) => g.tags);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s: string | null) {
  if (!s) return "";
  try { return format(new Date(s), "dd/MM/yyyy", { locale: es }); }
  catch { return s; }
}

function fmtRef(op: Operacion) {
  return op.ref_asli || `A${String(op.correlativo).padStart(5, "0")}`;
}

/** Construye el mapa de etiquetas → valor desde una operación */
function buildTagValues(op: Operacion): Record<string, string> {
  return {
    "{{ref_asli}}":          fmtRef(op),
    "{{cliente_nombre}}":    op.cliente         ?? "",
    "{{consignatario}}":     op.consignatario   ?? "",
    "{{booking}}":           op.booking         ?? "",
    "{{contenedor}}":        op.contenedor      ?? "",
    "{{naviera}}":           op.naviera         ?? "",
    "{{nave}}":              op.nave            ?? "",
    "{{sello}}":             op.sello           ?? "",
    "{{incoterm}}":          op.incoterm        ?? "",
    "{{forma_pago}}":        op.forma_pago      ?? "",
    "{{puerto_origen}}":     op.pol             ?? "",
    "{{puerto_destino}}":    op.pod             ?? "",
    "{{pais_destino}}":      op.pais            ?? "",
    "{{etd}}":               fmtDate(op.etd),
    "{{eta}}":               fmtDate(op.eta),
    "{{fecha_emision}}":     format(new Date(), "dd/MM/yyyy"),
    "{{descripcion_carga}}": op.especie         ?? "",
    "{{temperatura}}":       op.temperatura     ?? "",
    "{{ventilacion}}":       op.ventilacion     ?? "",
    "{{peso_bruto}}":        op.peso_bruto      != null ? `${op.peso_bruto.toLocaleString("es-CL")} kg` : "",
    "{{peso_neto}}":         op.peso_neto       != null ? `${op.peso_neto.toLocaleString("es-CL")} kg` : "",
    "{{tara}}":              op.tara            != null ? `${op.tara} kg` : "",
    "{{cantidad_bultos}}":   op.pallets         != null ? String(op.pallets) : "",
    "{{unidad_medida}}":     op.tipo_unidad     ?? "",
    "{{observaciones}}":     op.observaciones   ?? "",
    "{{moneda}}":            op.moneda          ?? "USD",
    "{{empresa_transporte}}":op.transporte      ?? "",
    "{{tramo}}":             op.tramo           ?? "",
    "{{valor_tramo}}":       op.valor_tramo     != null ? String(op.valor_tramo) : "",
    "{{deposito}}":          op.deposito        ?? "",
    // Fijos ASLI
    "{{asli_nombre}}":       "Asesorías y Servicios Logísticos Integrales Ltda.",
    "{{asli_rut}}":          "76.XXX.XXX-X",
    "{{asli_direccion}}":    "Valparaíso, Chile",
    "{{asli_telefono}}":     "+56 X XXXX XXXX",
    "{{asli_email}}":        "contacto@asli.cl",
    // Vacíos completables
    "{{cliente_rut}}":       "",
    "{{cliente_direccion}}": "",
    "{{tipo_contenedor}}":   "",
    "{{viaje}}":             "",
    "{{hs_code}}":           "",
    "{{numero_documento}}":  "",
    "{{monto_total}}":       "",
    "{{precio_unitario}}":   "",
    "{{concepto}}":          "",
  };
}

/** Extrae etiquetas {{...}} de un HTML */
function extractTags(html: string): string[] {
  return [...new Set(html.match(/\{\{[a-z_]+\}\}/g) ?? [])];
}

/** Escanea etiquetas en un workbook de XLSX */
function scanXlsxTags(wb: XLSX.WorkBook): string[] {
  const tags: string[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    for (const ref of Object.keys(ws)) {
      if (ref[0] === "!") continue;
      const c = ws[ref];
      if (c.t === "s" && typeof c.v === "string") {
        const m = c.v.match(/\{\{[a-z_]+\}\}/g);
        if (m) tags.push(...m);
      }
    }
  }
  return [...new Set(tags)];
}

/** Reemplaza etiquetas directamente en el ZIP/XML interno preservando todo el formato */
async function applyTagsToBuffer(buffer: ArrayBuffer, values: Record<string, string>): Promise<Blob> {
  const zip = await JSZip.loadAsync(buffer);
  const targets = [
    "xl/sharedStrings.xml",
    ...Object.keys(zip.files).filter((f) => f.startsWith("xl/worksheets/") && f.endsWith(".xml")),
  ];
  for (const path of targets) {
    const file = zip.file(path);
    if (!file) continue;
    let content = await file.async("string");
    let changed = false;
    for (const [tag, replacement] of Object.entries(values)) {
      const safe = replacement.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      const xmlTag = tag.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      if (content.includes(xmlTag)) { content = content.replaceAll(xmlTag, safe); changed = true; }
    }
    if (changed) zip.file(path, content);
  }
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

// ─── Config por tipo de documento ─────────────────────────────────────────────

const TIPO_CONFIG = {
  proforma: {
    titulo: "Crear Proforma Invoice",
    subtitulo: "Selecciona una operación y un formato de proforma para generar el documento.",
    icon: "lucide:file-check",
    color: "text-indigo-600",
    colorBg: "bg-indigo-100",
    colorBtn: "bg-indigo-600 hover:bg-indigo-700",
    colorBar: "from-indigo-500 to-purple-500",
    emptyMsg: "No hay formatos de proforma creados aún.",
  },
  instructivo: {
    titulo: "Crear Instructivo",
    subtitulo: "Selecciona una operación y un formato de instructivo para generar el documento.",
    icon: "lucide:file-list",
    color: "text-amber-600",
    colorBg: "bg-amber-100",
    colorBtn: "bg-amber-600 hover:bg-amber-700",
    colorBar: "from-amber-500 to-orange-400",
    emptyMsg: "No hay formatos de instructivo creados aún.",
  },
};

// ─── Componente ───────────────────────────────────────────────────────────────

export function GenerarDocumentoContent({ tipoDoc }: Props) {
  const cfg = TIPO_CONFIG[tipoDoc];
  const { empresaNombres, isCliente, isLoading: authLoading } = useAuth();

  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [formatos, setFormatos] = useState<FormatoDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Selección ──────────────────────────────────────────────────────────────
  const [selectedOp, setSelectedOp] = useState<Operacion | null>(null);
  const [selectedFormato, setSelectedFormato] = useState<FormatoDocumento | null>(null);
  const [searchOp, setSearchOp] = useState("");

  // ── Valores de etiquetas ──────────────────────────────────────────────────
  const [tagValues, setTagValues] = useState<Record<string, string>>({});
  const [tagsDeDePlantilla, setTagsDePlantilla] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

  // ── Generar ───────────────────────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);

  // ── Mobile tabs ───────────────────────────────────────────────────────────
  const [mobileTab, setMobileTab] = useState<"operacion" | "formato" | "datos">("operacion");

  const supabase = useMemo(() => { try { return createClient(); } catch { return null; } }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!supabase || authLoading) return;
    setLoading(true);

    let q = supabase
      .from("operaciones")
      .select(`id, ref_asli, correlativo, cliente, consignatario, naviera, nave, booking, pol, pod,
               etd, eta, especie, pais, pallets, peso_bruto, peso_neto, tipo_unidad,
               contenedor, sello, tara, temperatura, ventilacion, incoterm, forma_pago,
               observaciones, transporte, tramo, valor_tramo, deposito, moneda`)
      .is("deleted_at", null)
      .order("correlativo", { ascending: false });
    if (isCliente && empresaNombres.length > 0) q = q.in("cliente", empresaNombres);

    const [opsRes, fmtRes] = await Promise.all([
      q,
      supabase.from("formatos_documentos").select("id, nombre, tipo, template_type, descripcion, contenido_html, excel_path, excel_nombre")
        .eq("tipo", tipoDoc).eq("activo", true).order("nombre"),
    ]);

    setLoading(false);
    if (opsRes.error) { setError(opsRes.error.message); return; }
    setOperaciones((opsRes.data ?? []) as Operacion[]);
    setFormatos((fmtRes.data ?? []) as FormatoDocumento[]);
  }, [supabase, authLoading, empresaNombres, isCliente, tipoDoc]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // ── Seleccionar operación → llenar tags ───────────────────────────────────
  const handleSelectOp = (op: Operacion) => {
    setSelectedOp(op);
    setTagValues(buildTagValues(op));
    setMobileTab("formato");
  };

  // ── Seleccionar formato → detectar qué tags usa ───────────────────────────
  const handleSelectFormato = async (fmt: FormatoDocumento) => {
    setSelectedFormato(fmt);
    setLoadingTags(true);
    setMobileTab("datos");

    let tags: string[] = [];
    const ttype = fmt.template_type ?? "html";

    if (ttype === "excel" && fmt.excel_path && supabase) {
      const { data } = await supabase.storage.from("formatos-templates").download(fmt.excel_path);
      if (data) {
        const buf = await data.arrayBuffer();
        const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
        tags = scanXlsxTags(wb);
      }
    } else if (fmt.contenido_html) {
      tags = extractTags(fmt.contenido_html);
    }

    // Si no hay tags en el template, mostrar todos los disponibles
    if (tags.length === 0) tags = ALL_TAGS.map((t) => t.tag);

    setTagsDePlantilla(tags);
    setLoadingTags(false);
  };

  // ── Generar documento ─────────────────────────────────────────────────────
  const handleGenerar = async () => {
    if (!selectedFormato || !selectedOp || !supabase) return;
    setGenerating(true);
    const ttype = selectedFormato.template_type ?? "html";
    const ref = fmtRef(selectedOp);
    const filename = `${tipoDoc}_${ref}_${format(new Date(), "yyyyMMdd")}`;

    if (ttype === "excel" && selectedFormato.excel_path) {
      const { data, error: dlErr } = await supabase.storage.from("formatos-templates").download(selectedFormato.excel_path);
      if (dlErr || !data) { setError("Error al descargar plantilla Excel."); setGenerating(false); return; }
      const buf = await data.arrayBuffer();
      const blob = await applyTagsToBuffer(buf, tagValues);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${filename}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } else if (selectedFormato.contenido_html) {
      let html = selectedFormato.contenido_html;
      for (const [tag, val] of Object.entries(tagValues)) html = html.replaceAll(tag, val);
      const win = window.open("", "_blank", "width=960,height=720");
      if (win) {
        win.document.write(html + `<style>@media print{@page{margin:16mm 14mm;size:A4}}</style><script>window.onload=()=>{window.print()}<\/script>`);
        win.document.close();
      }
    }
    setGenerating(false);
  };

  // ── Filtro operaciones ────────────────────────────────────────────────────
  const opsFiltradas = useMemo(() => {
    const q = searchOp.toLowerCase();
    if (!q) return operaciones;
    return operaciones.filter((op) =>
      fmtRef(op).toLowerCase().includes(q) ||
      (op.cliente ?? "").toLowerCase().includes(q) ||
      (op.booking ?? "").toLowerCase().includes(q) ||
      (op.contenedor ?? "").toLowerCase().includes(q)
    );
  }, [operaciones, searchOp]);

  // ── Tags agrupados según plantilla seleccionada ────────────────────────────
  const tagGroupsActivos = useMemo(() => {
    if (tagsDeDePlantilla.length === 0) return TAG_GROUPS;
    return TAG_GROUPS.map((g) => ({
      ...g,
      tags: g.tags.filter((t) => tagsDeDePlantilla.includes(t.tag)),
    })).filter((g) => g.tags.length > 0);
  }, [tagsDeDePlantilla]);

  // ─── CSS ──────────────────────────────────────────────────────────────────
  const inputCls = "w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all text-sm";

  const canGenerate = !!selectedOp && !!selectedFormato && !loadingTags && !isCliente;
  const isExcel = (selectedFormato?.template_type ?? "html") === "excel";

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-neutral-50">
      {/* ── Topbar ── */}
      <div className="bg-white border-b border-neutral-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl ${cfg.colorBg} flex items-center justify-center shrink-0`}>
            <Icon icon={cfg.icon} width={18} height={18} className={cfg.color} />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900">{cfg.titulo}</h1>
            <p className="text-xs text-neutral-500 hidden sm:block">{cfg.subtitulo}</p>
          </div>
        </div>
        {/* Botón generar (desktop) */}
        {canGenerate && (
          <button
            onClick={handleGenerar}
            disabled={generating}
            className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50 ${cfg.colorBtn}`}
          >
            <Icon icon={generating ? "typcn:refresh" : isExcel ? "lucide:file-spreadsheet" : "lucide:printer"} width={15} height={15} className={generating ? "animate-spin" : ""} />
            {generating ? "Generando..." : isExcel ? "Descargar Excel" : "Generar PDF"}
          </button>
        )}
      </div>

      {/* ── Mobile tabs ── */}
      <div className="sm:hidden flex border-b border-neutral-200 bg-white shrink-0">
        {([
          { id: "operacion", label: "Operación",  icon: "lucide:list" },
          { id: "formato",   label: "Formato",    icon: "lucide:file" },
          { id: "datos",     label: "Datos",      icon: "lucide:edit-3" },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMobileTab(tab.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors relative ${
              mobileTab === tab.id ? "text-brand-blue" : "text-neutral-400"
            }`}
          >
            <Icon icon={tab.icon} width={15} height={15} />
            {tab.label}
            {tab.id === "operacion" && selectedOp && (
              <span className="absolute top-1.5 right-[calc(50%-14px)] w-2 h-2 rounded-full bg-green-500" />
            )}
            {tab.id === "formato" && selectedFormato && (
              <span className="absolute top-1.5 right-[calc(50%-14px)] w-2 h-2 rounded-full bg-green-500" />
            )}
            {mobileTab === tab.id && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-brand-blue rounded-full" />}
          </button>
        ))}
      </div>

      {/* Toast */}
      {error && (
        <div className="mx-4 mt-3 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs shrink-0">
          <Icon icon="lucide:alert-circle" width={14} height={14} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><Icon icon="lucide:x" width={12} height={12} /></button>
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* ════════════════════════════════════════
            PANEL 1: LISTA DE OPERACIONES
        ════════════════════════════════════════ */}
        <div className={`w-full sm:w-72 lg:w-80 shrink-0 border-r border-neutral-200 bg-white flex flex-col overflow-hidden ${mobileTab !== "operacion" ? "hidden sm:flex" : "flex"}`}>
          <div className="p-3 border-b border-neutral-100 shrink-0">
            <div className="relative">
              <Icon icon="lucide:search" width={14} height={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={searchOp}
                onChange={(e) => setSearchOp(e.target.value)}
                placeholder="Buscar por ref, cliente, booking..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-xs text-neutral-700 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-neutral-400 text-sm">
                <Icon icon="typcn:refresh" className="w-4 h-4 animate-spin" />
                Cargando...
              </div>
            ) : opsFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Icon icon="lucide:inbox" width={28} height={28} className="text-neutral-300 mb-2" />
                <p className="text-xs text-neutral-500">{searchOp ? "Sin resultados para tu búsqueda" : "No hay operaciones disponibles"}</p>
              </div>
            ) : (
              opsFiltradas.map((op) => {
                const isActive = selectedOp?.id === op.id;
                return (
                  <button
                    key={op.id}
                    onClick={() => handleSelectOp(op)}
                    className={`w-full flex items-start gap-3 px-3 py-3 text-left border-b border-neutral-100 transition-all ${
                      isActive ? "bg-brand-blue/5 border-l-2 border-l-brand-blue" : "hover:bg-neutral-50 border-l-2 border-l-transparent"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isActive ? "bg-brand-blue text-white" : "bg-neutral-100 text-neutral-400"}`}>
                      <Icon icon="lucide:container" width={14} height={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-bold truncate ${isActive ? "text-brand-blue" : "text-neutral-800"}`}>
                          {fmtRef(op)}
                        </span>
                        {isActive && <Icon icon="lucide:check" width={12} height={12} className="text-brand-blue shrink-0" />}
                      </div>
                      <p className="text-[11px] text-neutral-500 truncate mt-0.5">{op.cliente || "Sin cliente"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {op.booking && (
                          <span className="text-[10px] text-neutral-400 font-mono truncate">{op.booking}</span>
                        )}
                        {op.etd && (
                          <span className="text-[10px] text-neutral-400">{fmtDate(op.etd)}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════
            PANEL 2: SELECCIÓN DE FORMATO + DATOS
        ════════════════════════════════════════ */}
        <div className={`flex-1 min-w-0 flex flex-col overflow-hidden ${mobileTab === "operacion" ? "hidden sm:flex" : "flex"}`}>

          {!selectedOp ? (
            /* Empty state: no operation selected */
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <div className={`w-16 h-16 rounded-2xl ${cfg.colorBg} flex items-center justify-center`}>
                <Icon icon="lucide:arrow-left" width={24} height={24} className={cfg.color} />
              </div>
              <h3 className="text-sm font-bold text-neutral-700">Selecciona una operación</h3>
              <p className="text-xs text-neutral-500 max-w-xs">Elige una operación de la lista para comenzar a generar el documento.</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">

              {/* ─── Sub-panel: Formatos disponibles ─── */}
              <div className={`lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-neutral-200 bg-neutral-50 flex flex-col overflow-hidden ${mobileTab === "datos" ? "hidden lg:flex" : "flex"}`}>
                <div className="px-4 py-3 border-b border-neutral-200 bg-white shrink-0">
                  <h3 className="text-xs font-bold text-neutral-700 flex items-center gap-2">
                    <Icon icon={cfg.icon} width={13} height={13} className={cfg.color} />
                    Formatos de {tipoDoc}
                    <span className="ml-auto text-neutral-400 font-normal">{formatos.length}</span>
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {formatos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                      <Icon icon="lucide:file-x" width={24} height={24} className="text-neutral-300" />
                      <p className="text-xs text-neutral-500">{cfg.emptyMsg}</p>
                      <a href="/configuracion/formatos-documentos" className="text-xs text-brand-blue hover:underline font-medium mt-1">
                        Crear formato →
                      </a>
                    </div>
                  ) : formatos.map((fmt) => {
                    const isActive = selectedFormato?.id === fmt.id;
                    const isExcelFmt = (fmt.template_type ?? "html") === "excel";
                    return (
                      <button
                        key={fmt.id}
                        onClick={() => handleSelectFormato(fmt)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          isActive
                            ? "bg-white border-brand-blue shadow-sm ring-1 ring-brand-blue/20"
                            : "bg-white border-neutral-200 hover:border-neutral-300 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isExcelFmt ? "bg-green-100" : "bg-brand-blue/10"}`}>
                            <Icon icon={isExcelFmt ? "lucide:file-spreadsheet" : "lucide:file-text"} width={15} height={15} className={isExcelFmt ? "text-green-600" : "text-brand-blue"} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-bold truncate ${isActive ? "text-brand-blue" : "text-neutral-800"}`}>{fmt.nombre}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${isExcelFmt ? "bg-green-100 text-green-700 border-green-200" : "bg-sky-100 text-sky-700 border-sky-200"}`}>
                                {isExcelFmt ? "Excel" : "HTML/PDF"}
                              </span>
                            </div>
                            {fmt.descripcion && <p className="text-[10px] text-neutral-400 mt-1 line-clamp-2">{fmt.descripcion}</p>}
                          </div>
                          {isActive && <Icon icon="lucide:check-circle" width={14} height={14} className="text-brand-blue shrink-0 mt-0.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ─── Sub-panel: Datos / Tag values ─── */}
              <div className={`flex-1 min-w-0 flex flex-col overflow-hidden ${mobileTab === "formato" && formatos.length > 0 ? "hidden lg:flex" : "flex"}`}>
                {!selectedFormato ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center">
                      <Icon icon="lucide:file" width={20} height={20} className="text-neutral-400" />
                    </div>
                    <p className="text-xs text-neutral-500">Selecciona un formato para rellenar los datos</p>
                  </div>
                ) : (
                  <>
                    {/* Header con info de la operación seleccionada */}
                    <div className="bg-white border-b border-neutral-200 px-4 py-3 shrink-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-neutral-800">{fmtRef(selectedOp)}</span>
                            <span className="text-neutral-300">·</span>
                            <span className="text-xs text-neutral-500 truncate">{selectedOp.cliente || "Sin cliente"}</span>
                            <span className="text-neutral-300">·</span>
                            <span className="text-xs font-semibold text-brand-blue truncate">{selectedFormato.nombre}</span>
                          </div>
                          <p className="text-[10px] text-neutral-400 mt-0.5">
                            Los datos de la operación se cargaron automáticamente. Edita lo que necesites.
                          </p>
                        </div>
                        {/* Botón generar mobile */}
                        {!isCliente && (
                          <button
                            onClick={handleGenerar}
                            disabled={generating || !canGenerate}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-colors disabled:opacity-50 shrink-0 ${cfg.colorBtn}`}
                          >
                            <Icon icon={generating ? "typcn:refresh" : isExcel ? "lucide:file-spreadsheet" : "lucide:printer"} width={13} height={13} className={generating ? "animate-spin" : ""} />
                            {generating ? "..." : isExcel ? "Excel" : "PDF"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Formulario de etiquetas */}
                    <div className="flex-1 overflow-y-auto p-4">
                      {loadingTags ? (
                        <div className="flex items-center justify-center py-16 gap-3 flex-col">
                          <Icon icon="typcn:refresh" className="w-7 h-7 animate-spin text-brand-blue" />
                          <p className="text-sm text-neutral-500">Cargando campos del formato...</p>
                        </div>
                      ) : (
                        <div className="space-y-6 max-w-3xl">
                          {tagGroupsActivos.map((g) => (
                            <div key={g.group}>
                              {/* Group header */}
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-6 h-6 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                                  <Icon icon={g.icon} width={12} height={12} className="text-neutral-500" />
                                </div>
                                <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{g.group}</span>
                                <div className="flex-1 h-px bg-neutral-200" />
                              </div>
                              {/* Fields grid */}
                              <div className="grid sm:grid-cols-2 gap-3">
                                {g.tags.map(({ tag, label }) => {
                                  const val = tagValues[tag] ?? "";
                                  const autoFilled = !!val && buildTagValues(selectedOp)[tag] === val;
                                  return (
                                    <div key={tag}>
                                      <label className="flex items-center gap-2 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">
                                        {label}
                                        {autoFilled && (
                                          <span className="flex items-center gap-0.5 text-[10px] font-medium text-green-600 normal-case tracking-normal">
                                            <Icon icon="lucide:check" width={9} height={9} />
                                            auto
                                          </span>
                                        )}
                                      </label>
                                      <input
                                        value={val}
                                        onChange={(e) => setTagValues((p) => ({ ...p, [tag]: e.target.value }))}
                                        placeholder={`${tag}`}
                                        className={`${inputCls} ${autoFilled ? "border-green-200 bg-green-50/50 focus:border-brand-blue focus:bg-white" : ""}`}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}

                          {/* Botón generar al final del form */}
                          <div className="pt-2 pb-6">
                            {isCliente ? (
                              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                                <Icon icon="lucide:lock" width={14} height={14} className="shrink-0" />
                                <span>No tienes permisos para generar documentos. Contacta a tu ejecutivo.</span>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={handleGenerar}
                                  disabled={generating || !canGenerate}
                                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white shadow-sm transition-colors disabled:opacity-50 ${cfg.colorBtn}`}
                                >
                                  <Icon icon={generating ? "typcn:refresh" : isExcel ? "lucide:file-spreadsheet" : "lucide:printer"} width={16} height={16} className={generating ? "animate-spin" : ""} />
                                  {generating ? "Generando documento..." : isExcel ? "Descargar Excel con datos" : "Generar e imprimir PDF"}
                                </button>
                                <p className="text-[10px] text-neutral-400 text-center mt-2">
                                  {isExcel
                                    ? "Se descarga el archivo Excel con todos los datos reemplazados."
                                    : "Se abre el documento en una nueva ventana lista para imprimir o guardar como PDF."}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
