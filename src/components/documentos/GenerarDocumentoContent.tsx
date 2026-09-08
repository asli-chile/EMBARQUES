"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { aplicarFiltroTemporada } from "@/lib/temporadas";
import { useTemporadaActiva } from "@/lib/useTemporadaActiva";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { withBase } from "@/lib/basePath";
import { formatRefAsli } from "@/lib/refAsli";
import {
  buildInstructivoTagValues,
  pickConsignatarioForOperacion,
  type InstructivoConsignatario,
  type InstructivoOpData,
} from "@/lib/documentos/instructivo";
import { useNeonTheme } from "@/lib/ui/neonTheme";

// ─── Props ────────────────────────────────────────────────────────────────────

type TipoDoc = "proforma" | "instructivo";

interface Props {
  tipoDoc: TipoDoc;
}

// ─── Tipos de BD ──────────────────────────────────────────────────────────────

type Operacion = InstructivoOpData & {
  valor_tramo?: number | null;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtRef(op: Operacion) {
  return formatRefAsli(op.ref_asli, op.correlativo) ?? "";
}

function fmtDate(dateStr: string | null | undefined) {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "dd-MM-yyyy");
  } catch {
    return dateStr;
  }
}

const OP_SELECT = `id, ref_asli, correlativo, cliente, consignatario, naviera, nave, booking, booking_doc_url,
  pol, pod, etd, eta, especie, pais, pallets, peso_bruto, peso_neto, tipo_unidad,
  contenedor, sello, tara, temperatura, ventilacion, incoterm, forma_pago,
  observaciones, transporte, tramo, valor_tramo, deposito, moneda, viaje, dus, sps,
  chofer, rut_chofer, telefono_chofer, patente_camion, patente_remolque,
  planta_presentacion, inicio_stacking, fin_stacking, ingreso_stacking,
  citacion, llegada_planta, salida_planta`;

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

// ─── Estilos por tipo (sin texto) ─────────────────────────────────────────────

const TIPO_STYLES = {
  proforma: {
    icon: "lucide:file-check",
    color: "text-dash-neon",
    colorBg: "border border-dash-neon/35 bg-dash-neon/15",
  },
  instructivo: {
    icon: "lucide:file-list",
    color: "text-dash-neon-hot",
    colorBg: "border border-dash-neon-hot/35 bg-dash-neon-hot/15",
  },
};

// ─── Componente ───────────────────────────────────────────────────────────────

export function GenerarDocumentoContent({ tipoDoc }: Props) {
  const { t } = useLocale();
  const tr = t.generarDocumento;

  const cfg = useMemo(() => ({
    ...TIPO_STYLES[tipoDoc],
    titulo:    tipoDoc === "proforma" ? tr.proformaTitulo    : tr.instructivoTitulo,
    subtitulo: tipoDoc === "proforma" ? tr.proformaSubtitulo : tr.instructivoSubtitulo,
    emptyMsg:  tipoDoc === "proforma" ? tr.proformaEmptyMsg  : tr.instructivoEmptyMsg,
  }), [tipoDoc, tr]);

  const tagGroups = useMemo((): TagGroup[] => [
    {
      group: tr.groupCliente, icon: "lucide:building-2",
      tags: [
        { tag: "{{cliente_nombre}}",    label: tr.tagClienteNombre },
        { tag: "{{cliente_rut}}",       label: tr.tagClienteRut },
        { tag: "{{cliente_direccion}}", label: tr.tagClienteDireccion },
        { tag: "{{exportador}}",        label: "Exportador" },
        { tag: "{{consignatario}}",     label: tr.tagConsignatario },
      ],
    },
    {
      group: "Consignee / Notify", icon: "lucide:contact",
      tags: [
        { tag: "{{consignee_company}}", label: "Consignee company" },
        { tag: "{{consignee_address}}", label: "Consignee address" },
        { tag: "{{consignee_attn}}",    label: "Consignee ATTN" },
        { tag: "{{consignee_email}}",   label: "Consignee email" },
        { tag: "{{consignee_mobile}}",  label: "Consignee mobile" },
        { tag: "{{consignee_uscc}}",    label: "Consignee USCC" },
        { tag: "{{consignee_zip}}",     label: "Consignee ZIP" },
        { tag: "{{notify_company}}",    label: "Notify company" },
        { tag: "{{notify_address}}",    label: "Notify address" },
        { tag: "{{notify_attn}}",       label: "Notify ATTN" },
        { tag: "{{notify_email}}",      label: "Notify email" },
        { tag: "{{notify_mobile}}",     label: "Notify mobile" },
      ],
    },
    {
      group: tr.groupOperacion, icon: "lucide:container",
      tags: [
        { tag: "{{ref_asli}}",          label: tr.tagRefAsli },
        { tag: "{{booking}}",           label: tr.tagBooking },
        { tag: "{{contenedor}}",        label: tr.tagContenedor },
        { tag: "{{tipo_contenedor}}",   label: tr.tagTipoContenedor },
        { tag: "{{naviera}}",           label: tr.tagNaviera },
        { tag: "{{nave}}",              label: tr.tagNave },
        { tag: "{{viaje}}",             label: tr.tagViaje },
        { tag: "{{sello}}",             label: tr.tagSello },
        { tag: "{{incoterm}}",          label: tr.tagIncoterm },
        { tag: "{{forma_pago}}",        label: tr.tagFormaPago },
        { tag: "{{dus}}",               label: "DUS" },
        { tag: "{{csg}}",               label: "CSG / SPS" },
      ],
    },
    {
      group: tr.groupPuertosYFechas, icon: "lucide:map-pin",
      tags: [
        { tag: "{{puerto_origen}}",     label: tr.tagPuertoOrigen },
        { tag: "{{puerto_destino}}",    label: tr.tagPuertoDestino },
        { tag: "{{destino_final}}",     label: "Destino final" },
        { tag: "{{pais_destino}}",      label: tr.tagPaisDestino },
        { tag: "{{etd}}",               label: tr.tagEtd },
        { tag: "{{eta}}",               label: tr.tagEta },
        { tag: "{{fecha_emision}}",     label: tr.tagFechaEmision },
      ],
    },
    {
      group: tr.groupCarga, icon: "lucide:package",
      tags: [
        { tag: "{{descripcion_carga}}", label: tr.tagDescripcionCarga },
        { tag: "{{temperatura}}",       label: tr.tagTemperatura },
        { tag: "{{ventilacion}}",       label: tr.tagVentilacion },
        { tag: "{{peso_bruto}}",        label: tr.tagPesoBruto },
        { tag: "{{peso_neto}}",         label: tr.tagPesoNeto },
        { tag: "{{tara}}",              label: tr.tagTara },
        { tag: "{{cantidad_bultos}}",   label: tr.tagCantidadBultos },
        { tag: "{{unidad_medida}}",     label: tr.tagUnidadMedida },
        { tag: "{{hs_code}}",           label: tr.tagHsCode },
        { tag: "{{observaciones}}",     label: tr.tagObservaciones },
      ],
    },
    {
      group: "Transporte / Planta", icon: "lucide:truck",
      tags: [
        { tag: "{{empresa_transporte}}", label: "Empresa transporte" },
        { tag: "{{chofer}}",             label: "Chofer" },
        { tag: "{{patente_camion}}",     label: "Patente camión" },
        { tag: "{{patente_remolque}}",   label: "Patente remolque" },
        { tag: "{{deposito}}",           label: "Depósito" },
        { tag: "{{planta_presentacion}}",label: "Planta presentación" },
        { tag: "{{citacion}}",           label: "Citación" },
        { tag: "{{inicio_stacking}}",    label: "Inicio stacking" },
        { tag: "{{fin_stacking}}",       label: "Fin stacking" },
      ],
    },
    {
      group: tr.groupFinanciero, icon: "lucide:dollar-sign",
      tags: [
        { tag: "{{numero_documento}}",  label: tr.tagNumeroDocumento },
        { tag: "{{monto_total}}",       label: tr.tagMontoTotal },
        { tag: "{{moneda}}",            label: tr.tagMoneda },
        { tag: "{{precio_unitario}}",   label: tr.tagPrecioUnitario },
        { tag: "{{concepto}}",          label: tr.tagConcepto },
      ],
    },
    {
      group: tr.groupAsli, icon: "lucide:building",
      tags: [
        { tag: "{{asli_nombre}}",        label: tr.tagAsliNombre },
        { tag: "{{asli_rut}}",           label: tr.tagAsliRut },
        { tag: "{{asli_direccion}}",     label: tr.tagAsliDireccion },
        { tag: "{{asli_telefono}}",      label: tr.tagAsliTelefono },
        { tag: "{{asli_email}}",         label: tr.tagAsliEmail },
      ],
    },
  ], [tr]);

  const allTags = useMemo(() => tagGroups.flatMap((g) => g.tags), [tagGroups]);

  const { empresaNombres, isCliente, isLoading: authLoading } = useAuth();
  const { temporadaActiva, temporadaLoading } = useTemporadaActiva();
  const [theme] = useNeonTheme();

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
  const [autoTagValues, setAutoTagValues] = useState<Record<string, string>>({});
  const [linkingOp, setLinkingOp] = useState(false);
  const [enrichmentNote, setEnrichmentNote] = useState<string | null>(null);
  const [tagsDeDePlantilla, setTagsDePlantilla] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

  // ── Generar ───────────────────────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);

  // ── Mobile tabs ───────────────────────────────────────────────────────────
  const [mobileTab, setMobileTab] = useState<"operacion" | "formato" | "datos">("operacion");

  const supabase = useMemo(() => { try { return createClient(); } catch { return null; } }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!supabase || authLoading || temporadaLoading) return;
    setLoading(true);

    let q = supabase
      .from("operaciones")
      .select(OP_SELECT)
      .is("deleted_at", null)
      .order("correlativo", { ascending: false });
    if (isCliente && empresaNombres.length > 0) q = q.in("cliente", empresaNombres);
    q = aplicarFiltroTemporada(q, temporadaActiva);

    const [opsRes, fmtRes] = await Promise.all([
      q,
      supabase.from("formatos_documentos").select("id, nombre, tipo, template_type, descripcion, contenido_html, excel_path, excel_nombre")
        .eq("tipo", tipoDoc).eq("activo", true).order("nombre"),
    ]);

    setLoading(false);
    if (opsRes.error) { setError(opsRes.error.message); return; }
    setOperaciones((opsRes.data ?? []) as Operacion[]);
    setFormatos((fmtRes.data ?? []) as FormatoDocumento[]);
  }, [supabase, authLoading, temporadaLoading, temporadaActiva, empresaNombres, isCliente, tipoDoc]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // ── Seleccionar operación → enriquecer con consignatario + cliente ─────────
  const handleSelectOp = useCallback(async (opBrief: Operacion) => {
    if (!supabase) return;
    setSelectedOp(opBrief);
    setLinkingOp(true);
    setEnrichmentNote(null);
    setMobileTab("formato");

    let op: Operacion = opBrief;
    try {
      const { data: full } = await supabase
        .from("operaciones")
        .select(OP_SELECT)
        .eq("id", opBrief.id)
        .single();
      if (full) {
        op = full as Operacion;
        setSelectedOp(op);
      }
    } catch {
      /* usar brief */
    }

    let cons: InstructivoConsignatario | null = null;
    if (op.cliente?.trim()) {
      const { data: consList } = await supabase
        .from("consignatarios")
        .select(`nombre, consignee_company, consignee_address, consignee_uscc,
                 consignee_attn, consignee_email, consignee_mobile, consignee_zip,
                 notify_company, notify_address, notify_attn, notify_uscc,
                 notify_email, notify_mobile, notify_zip, destino`)
        .eq("activo", true)
        .eq("cliente", op.cliente.trim());
      cons = pickConsignatarioForOperacion(
        (consList ?? []) as InstructivoConsignatario[],
        op,
      );
    }

    // Cliente: hoy `empresas` solo tiene nombre (sin RUT/dirección en BD)
    const clienteExtra = op.cliente?.trim()
      ? { nombre: op.cliente.trim(), rut: null, direccion: null }
      : null;

    const values = buildInstructivoTagValues(op, {
      consignatario: cons,
      cliente: clienteExtra,
    });
    setTagValues(values);
    setAutoTagValues(values);

    const notes: string[] = [];
    if (cons) {
      notes.push(`Consignatario: ${cons.consignee_company || cons.nombre}`);
    } else if (op.consignatario) {
      notes.push("Consignatario de la operación (sin ficha en configuración)");
    } else {
      notes.push("Sin consignatario vinculado");
    }
    if (clienteExtra?.nombre) notes.push(`Cliente: ${clienteExtra.nombre}`);
    setEnrichmentNote(notes.join(" · "));
    setLinkingOp(false);
  }, [supabase]);

  // ── Seleccionar formato → detectar qué tags usa ───────────────────────────
  const handleSelectFormato = useCallback(async (fmt: FormatoDocumento) => {
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
    if (tags.length === 0) tags = allTags.map((t) => t.tag);

    setTagsDePlantilla(tags);
    setLoadingTags(false);
  }, [supabase, allTags]);

  // ── Generar documento ─────────────────────────────────────────────────────
  const handleGenerar = async () => {
    if (!selectedFormato || !selectedOp || !supabase) return;
    setGenerating(true);
    const ttype = selectedFormato.template_type ?? "html";
    const ref = fmtRef(selectedOp);
    const filename = `${tipoDoc}_${ref}_${format(new Date(), "yyyyMMdd")}`;

    if (ttype === "excel" && selectedFormato.excel_path) {
      const { data, error: dlErr } = await supabase.storage.from("formatos-templates").download(selectedFormato.excel_path);
      if (dlErr || !data) { setError(tr.errorDescarga); setGenerating(false); return; }
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
    if (tagsDeDePlantilla.length === 0) return tagGroups;
    return tagGroups.map((g) => ({
      ...g,
      tags: g.tags.filter((t) => tagsDeDePlantilla.includes(t.tag)),
    })).filter((g) => g.tags.length > 0);
  }, [tagsDeDePlantilla, tagGroups]);

  const inputCls =
    "dash-control w-full min-h-[2.6rem] px-3 py-2 text-sm font-semibold placeholder:text-dash-muted focus:outline-none focus:ring-2 focus:ring-dash-neon/40";
  const labelCls = "mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-dash-muted";

  const canGenerate = !!selectedOp && !!selectedFormato && !loadingTags && !isCliente;
  const isExcel = (selectedFormato?.template_type ?? "html") === "excel";

  return (
    <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
      <main className="dash-page relative flex min-h-0 flex-1 flex-col overflow-hidden" role="main">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -right-16 top-8 h-64 w-64 rounded-full bg-dash-neon/15 blur-3xl" />
          <div className="absolute bottom-24 left-1/4 h-56 w-56 rounded-full bg-dash-neon-hot/10 blur-3xl" />
        </div>

        <header className="dash-toolbar relative z-10 shrink-0">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dash-neon/40 bg-dash-neon/15 shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--dash-neon)_55%,transparent)]">
                <Icon icon={cfg.icon} width={22} height={22} className="text-dash-neon" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold tracking-tight text-dash-fg sm:text-xl">{cfg.titulo}</h1>
                <p className="mt-0.5 line-clamp-1 text-xs text-dash-muted sm:text-sm">{cfg.subtitulo}</p>
                {enrichmentNote && (
                  <p className="mt-0.5 truncate text-xs text-emerald-300/90">
                    {linkingOp ? "Cargando datos…" : `Auto: ${enrichmentNote}`}
                  </p>
                )}
              </div>
            </div>
            {canGenerate && (
              <button
                type="button"
                onClick={handleGenerar}
                disabled={generating}
                className="dash-cta hidden items-center gap-2 px-4 py-2.5 text-sm font-semibold sm:inline-flex disabled:opacity-50"
              >
                <Icon icon={generating ? "typcn:refresh" : isExcel ? "lucide:file-spreadsheet" : "lucide:printer"} width={15} height={15} className={generating ? "animate-spin" : ""} />
                {generating ? tr.generando : isExcel ? tr.descargarExcel : tr.generarPdf}
              </button>
            )}
          </div>
        </header>

        <div className="relative z-10 sm:hidden flex border-b border-dash-border bg-dash-control/40 shrink-0">
          {([
            { id: "operacion", label: tr.tabOperacion, icon: "lucide:list" },
            { id: "formato",   label: tr.tabFormato,   icon: "lucide:file" },
            { id: "datos",     label: tr.tabDatos,     icon: "lucide:edit-3" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMobileTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors relative ${
                mobileTab === tab.id ? "text-dash-neon" : "text-dash-muted"
              }`}
            >
              <Icon icon={tab.icon} width={15} height={15} />
              {tab.label}
              {tab.id === "operacion" && selectedOp && (
                <span className="absolute top-1.5 right-[calc(50%-14px)] w-2 h-2 rounded-full bg-emerald-400" />
              )}
              {tab.id === "formato" && selectedFormato && (
                <span className="absolute top-1.5 right-[calc(50%-14px)] w-2 h-2 rounded-full bg-emerald-400" />
              )}
              {mobileTab === tab.id && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-dash-neon rounded-full" />}
            </button>
          ))}
        </div>

        {error && (
          <div className="relative z-10 mx-4 mt-3 flex items-center gap-3 rounded-xl border border-red-400/35 bg-red-500/15 px-4 py-2.5 text-xs text-red-200 shrink-0">
            <Icon icon="lucide:alert-circle" width={14} height={14} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)}><Icon icon="lucide:x" width={12} height={12} /></button>
          </div>
        )}

        <div className="relative z-10 flex min-h-0 flex-1 overflow-hidden">
          <div className={`w-full sm:w-72 lg:w-80 shrink-0 border-r border-dash-border bg-dash-control/30 flex flex-col overflow-hidden ${mobileTab !== "operacion" ? "hidden sm:flex" : "flex"}`}>
            <div className="p-3 border-b border-dash-border shrink-0">
              <div className="relative">
                <Icon icon="lucide:search" width={14} height={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dash-muted" />
                <input
                  value={searchOp}
                  onChange={(e) => setSearchOp(e.target.value)}
                  placeholder={tr.buscarPlaceholder}
                  className="dash-control w-full pl-8 pr-3 py-2 text-xs text-dash-fg placeholder:text-dash-muted focus:outline-none focus:ring-2 focus:ring-dash-neon/40"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12 gap-2 text-dash-muted text-sm">
                  <Icon icon="typcn:refresh" className="w-4 h-4 animate-spin text-dash-neon" />
                  {tr.cargando}
                </div>
              ) : opsFiltradas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <Icon icon="lucide:inbox" width={28} height={28} className="text-dash-muted/50 mb-2" />
                  <p className="text-xs text-dash-muted">{searchOp ? tr.sinResultados : tr.noOperaciones}</p>
                </div>
              ) : (
                opsFiltradas.map((op) => {
                  const isActive = selectedOp?.id === op.id;
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => void handleSelectOp(op)}
                      className={`w-full flex items-start gap-3 px-3 py-3 text-left border-b border-dash-border transition-all ${
                        isActive
                          ? "bg-dash-neon/15 border-l-2 border-l-dash-neon"
                          : "hover:bg-dash-neon/10 border-l-2 border-l-transparent"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                        isActive
                          ? "bg-dash-neon/25 border-dash-neon/40 text-dash-neon"
                          : "bg-dash-control border-dash-border text-dash-muted"
                      }`}>
                        <Icon icon="lucide:container" width={14} height={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-bold truncate ${isActive ? "text-dash-fg" : "text-dash-fg/90"}`}>
                            {fmtRef(op)}
                          </span>
                          {isActive && <Icon icon="lucide:check" width={12} height={12} className="text-dash-neon shrink-0" />}
                        </div>
                        <p className="text-[11px] text-dash-muted truncate mt-0.5">{op.cliente || tr.sinCliente}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {op.booking && (
                            <span className="text-[10px] text-dash-muted font-mono truncate">{op.booking}</span>
                          )}
                          {op.etd && (
                            <span className="text-[10px] text-dash-muted">{fmtDate(op.etd)}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className={`flex-1 min-w-0 flex flex-col overflow-hidden ${mobileTab === "operacion" ? "hidden sm:flex" : "flex"}`}>
            {!selectedOp ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
                <div className={`w-16 h-16 rounded-xl ${cfg.colorBg} flex items-center justify-center`}>
                  <Icon icon="lucide:arrow-left" width={24} height={24} className={cfg.color} />
                </div>
                <h3 className="text-sm font-bold text-dash-fg">{tr.seleccionaOperacion}</h3>
                <p className="text-xs text-dash-muted max-w-xs">{tr.seleccionaOperacionHint}</p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
                <div className={`lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-dash-border bg-dash-control/20 flex flex-col overflow-hidden ${mobileTab === "datos" ? "hidden lg:flex" : "flex"}`}>
                  <div className="px-4 py-3 border-b border-dash-border bg-dash-control/40 shrink-0">
                    <h3 className="text-xs font-bold text-dash-fg flex items-center gap-2">
                      <Icon icon={cfg.icon} width={13} height={13} className={cfg.color} />
                      {tr.formatosDe} {tipoDoc}
                      <span className="ml-auto text-dash-muted font-normal">{formatos.length}</span>
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {formatos.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                        <Icon icon="lucide:file-x" width={24} height={24} className="text-dash-muted/50" />
                        <p className="text-xs text-dash-muted">{cfg.emptyMsg}</p>
                        <a href={withBase("/configuracion/formatos-documentos")} className="text-xs text-dash-neon hover:underline font-medium mt-1">
                          {tr.crearFormato}
                        </a>
                      </div>
                    ) : formatos.map((fmt) => {
                      const isActive = selectedFormato?.id === fmt.id;
                      const isExcelFmt = (fmt.template_type ?? "html") === "excel";
                      return (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={() => handleSelectFormato(fmt)}
                          className={`w-full text-left p-3 rounded-xl border transition-all ${
                            isActive
                              ? "bg-dash-neon/15 border-dash-neon/50 ring-1 ring-dash-neon/25"
                              : "bg-dash-control/60 border-dash-border hover:border-dash-neon/40"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                              isExcelFmt
                                ? "bg-emerald-500/15 border-emerald-400/35"
                                : "bg-dash-neon/15 border-dash-neon/35"
                            }`}>
                              <Icon
                                icon={isExcelFmt ? "lucide:file-spreadsheet" : "lucide:file-text"}
                                width={15}
                                height={15}
                                className={isExcelFmt ? "text-emerald-300" : "text-dash-neon"}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-bold truncate ${isActive ? "text-dash-fg" : "text-dash-fg/90"}`}>{fmt.nombre}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-sm border ${
                                  isExcelFmt
                                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/35"
                                    : "bg-sky-500/15 text-sky-300 border-sky-400/35"
                                }`}>
                                  {isExcelFmt ? "Excel" : "HTML/PDF"}
                                </span>
                              </div>
                              {fmt.descripcion && <p className="text-[10px] text-dash-muted mt-1 line-clamp-2">{fmt.descripcion}</p>}
                            </div>
                            {isActive && <Icon icon="lucide:check-circle" width={14} height={14} className="text-dash-neon shrink-0 mt-0.5" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={`flex-1 min-w-0 flex flex-col overflow-hidden ${mobileTab === "formato" && formatos.length > 0 ? "hidden lg:flex" : "flex"}`}>
                  {!selectedFormato ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
                      <div className="w-12 h-12 rounded-xl bg-dash-control border border-dash-border flex items-center justify-center">
                        <Icon icon="lucide:file" width={20} height={20} className="text-dash-muted" />
                      </div>
                      <p className="text-xs text-dash-muted">{tr.seleccionaFormato}</p>
                    </div>
                  ) : (
                    <>
                      <div className="border-b border-dash-border bg-dash-control/40 px-4 py-3 shrink-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-dash-fg">{fmtRef(selectedOp)}</span>
                              <span className="text-dash-muted">·</span>
                              <span className="text-xs text-dash-muted truncate">{selectedOp.cliente || "Sin cliente"}</span>
                              <span className="text-dash-muted">·</span>
                              <span className="text-xs font-semibold text-dash-neon truncate">{selectedFormato.nombre}</span>
                            </div>
                            <p className="text-[10px] text-dash-muted mt-0.5">{tr.datosAutoHint}</p>
                          </div>
                          {!isCliente && (
                            <button
                              type="button"
                              onClick={handleGenerar}
                              disabled={generating || !canGenerate}
                              className="dash-cta flex items-center gap-1.5 px-3 py-2 text-xs font-semibold disabled:opacity-50 shrink-0"
                            >
                              <Icon icon={generating ? "typcn:refresh" : isExcel ? "lucide:file-spreadsheet" : "lucide:printer"} width={13} height={13} className={generating ? "animate-spin" : ""} />
                              {generating ? "..." : isExcel ? tr.descargarExcel : tr.generarPdf}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4">
                        {loadingTags ? (
                          <div className="flex items-center justify-center py-16 gap-3 flex-col">
                            <Icon icon="typcn:refresh" className="w-7 h-7 animate-spin text-dash-neon" />
                            <p className="text-sm text-dash-muted">{tr.cargandoCampos}</p>
                          </div>
                        ) : (
                          <div className="space-y-6 max-w-3xl">
                            {tagGroupsActivos.map((g) => (
                              <div key={g.group}>
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-6 h-6 rounded-lg bg-dash-control border border-dash-border flex items-center justify-center shrink-0">
                                    <Icon icon={g.icon} width={12} height={12} className="text-dash-muted" />
                                  </div>
                                  <span className="text-xs font-bold text-dash-muted uppercase tracking-wider">{g.group}</span>
                                  <div className="flex-1 h-px bg-dash-border" />
                                </div>
                                <div className="grid sm:grid-cols-2 gap-3">
                                  {g.tags.map(({ tag, label }) => {
                                    const val = tagValues[tag] ?? "";
                                    const autoFilled = !!val && autoTagValues[tag] === val;
                                    return (
                                      <div key={tag}>
                                        <label className={labelCls}>
                                          {label}
                                          {autoFilled && (
                                            <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-300 normal-case tracking-normal">
                                              <Icon icon="lucide:check" width={9} height={9} />
                                              {tr.auto}
                                            </span>
                                          )}
                                        </label>
                                        <input
                                          value={val}
                                          onChange={(e) => setTagValues((p) => ({ ...p, [tag]: e.target.value }))}
                                          placeholder={`${tag}`}
                                          className={`${inputCls} ${autoFilled ? "border-emerald-400/40 bg-emerald-500/10" : ""}`}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}

                            <div className="pt-2 pb-6">
                              {isCliente ? (
                                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-500/15 border border-amber-400/35 text-amber-200 text-xs">
                                  <Icon icon="lucide:lock" width={14} height={14} className="shrink-0" />
                                  <span>{tr.sinPermisos}</span>
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={handleGenerar}
                                    disabled={generating || !canGenerate}
                                    className="dash-cta w-full flex items-center justify-center gap-2 py-3 text-sm font-bold disabled:opacity-50"
                                  >
                                    <Icon icon={generating ? "typcn:refresh" : isExcel ? "lucide:file-spreadsheet" : "lucide:printer"} width={16} height={16} className={generating ? "animate-spin" : ""} />
                                    {generating ? tr.generandoDoc : isExcel ? tr.descargarExcelDatos : tr.generarImprimirPdf}
                                  </button>
                                  <p className="text-[10px] text-dash-muted text-center mt-2">
                                    {isExcel ? tr.excelHint : tr.pdfHint}
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
    </div>
  );
}
