"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { format } from "date-fns";
import JSZip from "jszip";

// ── Types ────────────────────────────────────────────────────────────────────

interface ProformaItem {
  id: string;
  especie: string;
  variedad: string;
  calibre: string;
  kg_neto_caja: string;
  kg_bruto_caja: string;
  cantidad_cajas: string;
  kg_neto_total: number;
  kg_bruto_total: number;
  valor_caja: string;
  valor_kilo: number;
  valor_total: number;
}

interface ProformaHeader {
  numero: string;
  operacion_id: string;
  ref_asli: string;
  fecha: string;
  exportador: string;
  exportador_rut: string;
  exportador_direccion: string;
  importador: string;
  importador_direccion: string;
  importador_pais: string;
  consignee_uscc: string;
  clausula_venta: string;
  moneda: string;
  puerto_origen: string;
  puerto_destino: string;
  destino: string;
  contenedor: string;
  etd: string;
  naviera: string;
  nave: string;
  booking: string;
  dus: string;
  csg: string;
  csp: string;
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

// ── Constants ────────────────────────────────────────────────────────────────

const CLAUSULAS = ["FOB", "CIF", "CFR", "EXW", "DAP", "DDP", "FCA"];
const MONEDAS = ["USD", "EUR", "CLP"];
const TABS = ["Mercadería", "Partes", "Embarque", "Documentos"] as const;
type Tab = typeof TABS[number];

function newItem(): ProformaItem {
  return {
    id: crypto.randomUUID(),
    especie: "", variedad: "", calibre: "",
    kg_neto_caja: "", kg_bruto_caja: "", cantidad_cajas: "",
    kg_neto_total: 0, kg_bruto_total: 0,
    valor_caja: "", valor_kilo: 0, valor_total: 0,
  };
}

function computeItem(item: ProformaItem): ProformaItem {
  const kgNeto = parseFloat(item.kg_neto_caja) || 0;
  const kgBruto = parseFloat(item.kg_bruto_caja) || 0;
  const cajas = parseInt(item.cantidad_cajas, 10) || 0;
  const vCaja = parseFloat(item.valor_caja) || 0;
  return {
    ...item,
    kg_neto_total: kgNeto * cajas,
    kg_bruto_total: kgBruto * cajas,
    valor_kilo: kgNeto > 0 ? vCaja / kgNeto : 0,
    valor_total: vCaja * cajas,
  };
}

const emptyHeader = (): ProformaHeader => ({
  numero: "", operacion_id: "", ref_asli: "",
  fecha: format(new Date(), "yyyy-MM-dd"),
  exportador: "", exportador_rut: "", exportador_direccion: "",
  importador: "", importador_direccion: "", importador_pais: "", consignee_uscc: "",
  clausula_venta: "FOB", moneda: "USD",
  puerto_origen: "", puerto_destino: "", destino: "", contenedor: "",
  etd: "", naviera: "", nave: "", booking: "",
  dus: "", csg: "", csp: "",
  observaciones: "",
});

// ── Formatting ────────────────────────────────────────────────────────────────

const fmt = (n: number, mon: string) => {
  const isCLP = mon.toUpperCase() === "CLP";
  return n.toLocaleString("es-CL", {
    minimumFractionDigits: isCLP ? 0 : 2,
    maximumFractionDigits: isCLP ? 0 : 2,
  });
};
const fmtKg = (n: number) =>
  n.toLocaleString("es-CL", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

// ── Template tag engine ───────────────────────────────────────────────────────

function buildTagMap(
  header: ProformaHeader,
  items: ProformaItem[],
  totals: { cajas: number; kg_neto: number; kg_bruto: number; valor: number }
): Record<string, string> {
  const mon = header.moneda;
  const map: Record<string, string> = {
    // Proforma identity
    "{{numero_proforma}}":   header.numero,
    "{{numero_documento}}":  header.numero,
    "{{ref_asli}}":          header.ref_asli,
    "{{fecha}}":             header.fecha,
    "{{fecha_emision}}":     header.fecha,
    // Exportador
    "{{exportador}}":          header.exportador,
    "{{empresa_nombre}}":      header.exportador,
    "{{empresa_rut}}":         header.exportador_rut,
    "{{empresa_direccion}}":   header.exportador_direccion,
    // Consignee / Importador
    "{{importador}}":              header.importador,
    "{{consignee}}":               header.importador,
    "{{consignee_company}}":       header.importador,
    "{{consignee_address}}":       header.importador_direccion,
    "{{consignee_direccion}}":     header.importador_direccion,
    "{{consignee_pais}}":          header.importador_pais,
    "{{consignee_uscc}}":          header.consignee_uscc,
    "{{consignee_usci}}":          header.consignee_uscc,
    "{{pais_destino}}":            header.importador_pais,
    // Embarque
    "{{clausula_venta}}":   header.clausula_venta,
    "{{incoterm}}":         header.clausula_venta,
    "{{modalidad_venta}}":  header.clausula_venta,
    "{{moneda}}":           mon,
    "{{puerto_origen}}":    header.puerto_origen,
    "{{puerto_embarque}}":  header.puerto_origen,
    "{{puerto_destino}}":   header.puerto_destino,
    "{{puerto_descarga}}":  header.puerto_destino,
    "{{destino_final}}":    header.destino,
    "{{contenedor}}":       header.contenedor,
    "{{etd}}":              header.etd,
    "{{fecha_embarque}}":   header.etd,
    "{{naviera}}":          header.naviera,
    "{{nave}}":             header.nave,
    "{{booking}}":          header.booking,
    // Documentos
    "{{dus}}":  header.dus,
    "{{csg}}":  header.csg,
    "{{csp}}":  header.csp,
    "{{observaciones}}": header.observaciones,
    // Totales
    "{{total_cantidad}}":    String(totals.cajas),
    "{{total_cajas}}":       String(totals.cajas),
    "{{total_peso_neto}}":   fmtKg(totals.kg_neto),
    "{{peso_neto_total}}":   fmtKg(totals.kg_neto),
    "{{total_peso_bruto}}":  fmtKg(totals.kg_bruto),
    "{{peso_bruto_total}}":  fmtKg(totals.kg_bruto),
    "{{total_valor}}":       `${mon} ${fmt(totals.valor, mon)}`,
    "{{valor_total}}":       `${mon} ${fmt(totals.valor, mon)}`,
    "{{monto_total}}":       `${mon} ${fmt(totals.valor, mon)}`,
    "{{total_valor_fob}}":   `${mon} ${fmt(totals.valor, mon)}`,
    "{{total_valor_numero}}": fmt(totals.valor, mon),
  };

  // Numbered item tags for Excel templates (up to 30 items)
  items.forEach((it, i) => {
    const n = i + 1;
    const prefix = `{{item_${n}_`;
    map[`${prefix}especie}}`]       = it.especie;
    map[`${prefix}variedad}}`]      = it.variedad;
    map[`${prefix}calibre}}`]       = it.calibre;
    map[`${prefix}kg_neto_caja}}`]  = it.kg_neto_caja;
    map[`${prefix}kg_bruto_caja}}`] = it.kg_bruto_caja;
    map[`${prefix}cajas}}`]         = it.cantidad_cajas;
    map[`${prefix}kg_neto_total}}`] = fmtKg(it.kg_neto_total);
    map[`${prefix}kg_bruto_total}}`]= fmtKg(it.kg_bruto_total);
    map[`${prefix}valor_caja}}`]    = fmt(parseFloat(it.valor_caja) || 0, mon);
    map[`${prefix}valor_kilo}}`]    = fmt(it.valor_kilo, mon);
    map[`${prefix}valor_total}}`]   = fmt(it.valor_total, mon);
  });

  return map;
}

/** Renders an HTML template: replaces {{tags}} and expands {{#items}}...{{/items}} blocks */
function renderHtmlTemplate(html: string, tagMap: Record<string, string>, items: ProformaItem[], moneda: string): string {
  let result = html;

  // Expand {{#items}}...{{/items}} block
  const itemBlockRe = /\{\{#items\}\}([\s\S]*?)\{\{\/items\}\}/g;
  result = result.replace(itemBlockRe, (_match, rowTemplate: string) => {
    return items.map((it, idx) => {
      let row = rowTemplate;
      const itemTags: Record<string, string> = {
        "{{especie}}":         it.especie,
        "{{variedad}}":        it.variedad,
        "{{calibre}}":         it.calibre,
        "{{cantidad}}":        it.cantidad_cajas,
        "{{kg_neto_unidad}}":  it.kg_neto_caja,
        "{{kg_bruto_unidad}}": it.kg_bruto_caja,
        "{{peso_neto}}":       fmtKg(it.kg_neto_total),
        "{{peso_bruto}}":      fmtKg(it.kg_bruto_total),
        "{{precio_caja}}":     fmt(parseFloat(it.valor_caja) || 0, moneda),
        "{{valor_caja}}":      fmt(parseFloat(it.valor_caja) || 0, moneda),
        "{{valor_kilo}}":      fmt(it.valor_kilo, moneda),
        "{{total_linea}}":     fmt(it.valor_total, moneda),
        "{{valor_total}}":     fmt(it.valor_total, moneda),
        "{{num}}":             String(idx + 1),
      };
      for (const [tag, val] of Object.entries(itemTags)) {
        row = row.replaceAll(tag, val);
      }
      return row;
    }).join("\n");
  });

  // Replace remaining flat tags
  for (const [tag, val] of Object.entries(tagMap)) {
    result = result.replaceAll(tag, val);
  }
  return result;
}

/** Replaces tags in the raw .xlsx XML using JSZip (preserves all formatting) */
async function applyTagsToXlsx(buffer: ArrayBuffer, tagMap: Record<string, string>): Promise<Blob> {
  const zip = await JSZip.loadAsync(buffer);
  const targets = [
    "xl/sharedStrings.xml",
    ...Object.keys(zip.files).filter(f => f.startsWith("xl/worksheets/sheet") && f.endsWith(".xml")),
  ];
  for (const path of targets) {
    const file = zip.file(path);
    if (!file) continue;
    let content = await file.async("string");
    for (const [tag, val] of Object.entries(tagMap)) {
      // Tags in XML may be split across <r> runs — replace plain version
      const plain = tag.replace("{{", "").replace("}}", "");
      content = content.replaceAll(tag, val);
      // Also handle XML-encoded braces if present
      content = content.replaceAll(`{{${plain}}}`, val);
    }
    zip.file(path, content);
  }
  return zip.generateAsync({ type: "blob" });
}

// ── Component ────────────────────────────────────────────────────────────────

export function CrearProformaContent() {
  const supabase = useMemo(() => { try { return createClient(); } catch { return null; } }, []);
  const { user } = useAuth();

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
  const opDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Proformas list
  const [proformas, setProformas] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [showList, setShowList] = useState(false);

  // ── Load templates ─────────────────────────────────────────────────────────
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

  // ── Auto-number ────────────────────────────────────────────────────────────
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

  // ── Operation search ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!opQuery.trim() || !supabase) { setOpResults([]); return; }
    if (opDebounceRef.current) clearTimeout(opDebounceRef.current);
    opDebounceRef.current = setTimeout(async () => {
      setOpLoading(true);
      const { data } = await supabase
        .from("operaciones")
        .select("id,ref_asli,correlativo,cliente,naviera,nave,booking,pod,etd,contenedor")
        .is("deleted_at", null)
        .or(`ref_asli.ilike.%${opQuery}%,cliente.ilike.%${opQuery}%,booking.ilike.%${opQuery}%`)
        .order("correlativo", { ascending: false }).limit(10);
      setOpResults(data ?? []);
      setOpLoading(false);
    }, 300);
  }, [opQuery, supabase]);

  const linkOperation = useCallback((op: OperacionOption) => {
    setOpLinked(op);
    setOpQuery("");
    setOpResults([]);
    setHeader(h => ({
      ...h,
      operacion_id: op.id, ref_asli: op.ref_asli,
      naviera: op.naviera ?? h.naviera,
      nave: op.nave ?? h.nave,
      booking: op.booking ?? h.booking,
      puerto_destino: op.pod ?? h.puerto_destino,
      etd: op.etd ?? h.etd,
      contenedor: op.contenedor ?? h.contenedor,
    }));
  }, []);

  // ── Items helpers ──────────────────────────────────────────────────────────
  const updateItem = useCallback((id: string, field: keyof ProformaItem, value: string) => {
    setItems(prev => prev.map(it => it.id === id ? computeItem({ ...it, [field]: value }) : it));
  }, []);

  const addItem = () => setItems(prev => [...prev, newItem()]);
  const removeItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totals = useMemo(() => ({
    cajas:    items.reduce((s, it) => s + (parseInt(it.cantidad_cajas, 10) || 0), 0),
    kg_neto:  items.reduce((s, it) => s + it.kg_neto_total, 0),
    kg_bruto: items.reduce((s, it) => s + it.kg_bruto_total, 0),
    valor:    items.reduce((s, it) => s + it.valor_total, 0),
  }), [items]);

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const tagMap = buildTagMap(header, items, totals);

      if (selectedTemplate?.template_type === "html") {
        // ── HTML → print window ──
        const rendered = renderHtmlTemplate(selectedTemplate.contenido_html, tagMap, items, header.moneda);
        const win = window.open("", "_blank", "width=900,height=700");
        if (win) {
          win.document.write(rendered);
          win.document.close();
          setTimeout(() => win.print(), 600);
        }

      } else if (selectedTemplate?.template_type === "excel" && selectedTemplate.excel_path && supabase) {
        // ── Excel → download .xlsx from storage, replace tags, save ──
        const { data: blob, error } = await supabase.storage
          .from("formatos-templates")
          .download(selectedTemplate.excel_path);
        if (error || !blob) throw error ?? new Error("No se pudo descargar la plantilla");

        const buffer = await blob.arrayBuffer();
        const resultBlob = await applyTagsToXlsx(buffer, tagMap);
        const url = URL.createObjectURL(resultBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Proforma_${header.numero || "borrador"}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);

      } else {
        // ── Fallback: jsPDF built-in ──
        await exportBuiltinPdf();
      }
    } catch (e: any) {
      setShowError(e?.message ?? "Error al exportar");
    } finally {
      setExporting(false);
    }
  };

  const exportBuiltinPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
    const W = doc.internal.pageSize.getWidth();
    const m = 12;
    const GREEN: [number, number, number] = [29, 111, 66];
    const GREEN_LIGHT: [number, number, number] = [242, 249, 245];

    doc.setFillColor(...GREEN);
    doc.rect(0, 0, W, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text("PROFORMA INVOICE", m, 9.5);
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal");
    doc.text(`N°  ${header.numero}`, W - m, 6, { align: "right" });
    doc.text(`Fecha: ${header.fecha}    ETD: ${header.etd || "—"}`, W - m, 11, { align: "right" });

    const r1Y = 18;
    const colMid = W / 2 + 2;
    const drawBox = (x: number, y: number, w: number, title: string, lines: string[]) => {
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(x, y, w, 28, 1.5, 1.5, "F");
      doc.setTextColor(29, 111, 66); doc.setFontSize(6.5); doc.setFont("helvetica", "bold");
      doc.text(title, x + 2, y + 4);
      doc.setTextColor(30, 30, 30);
      lines.forEach((ln, i) => {
        doc.setFont("helvetica", i === 0 ? "bold" : "normal");
        doc.setFontSize(i === 0 ? 8 : 7.5);
        doc.text(ln, x + 2, y + 9 + i * 4.5);
      });
    };
    drawBox(m, r1Y, colMid - m - 3, "EXPORTADOR", [
      header.exportador, header.exportador_rut ? `RUT: ${header.exportador_rut}` : "", header.exportador_direccion,
    ].filter(Boolean));
    drawBox(colMid, r1Y, W - colMid - m, "CONSIGNEE / IMPORTADOR", [
      header.importador, header.importador_direccion,
      [header.importador_pais, header.consignee_uscc ? `USCC: ${header.consignee_uscc}` : ""].filter(Boolean).join("   "),
    ].filter(Boolean));

    const r2Y = r1Y + 31;
    doc.setFillColor(...GREEN);
    doc.rect(m, r2Y, W - m * 2, 4.5, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(6); doc.setFont("helvetica", "bold");
    doc.text("DATOS DE EMBARQUE", m + 1, r2Y + 3);

    const embarqueFields = [
      ["Cláusula", header.clausula_venta], ["Pto. Embarque", header.puerto_origen],
      ["Pto. Descarga", header.puerto_destino], ["Destino", header.destino],
      ["Contenedor", header.contenedor], ["Nave", header.nave],
      ["Naviera", header.naviera], ["Booking", header.booking],
      ["DUS", header.dus], ["CSG", header.csg], ["CSP", header.csp],
    ];
    const r3Y = r2Y + 7;
    doc.setFillColor(240, 248, 244);
    doc.rect(m, r3Y - 1, W - m * 2, 10, "F");
    const fieldColW = (W - m * 2) / embarqueFields.length;
    embarqueFields.forEach(([label, val], i) => {
      const x = m + i * fieldColW + 1;
      doc.setFont("helvetica", "bold"); doc.setFontSize(5.5);
      doc.setTextColor(100, 120, 100); doc.text(label, x, r3Y + 2);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      doc.setTextColor(20, 20, 20); doc.text(val || "—", x, r3Y + 7);
    });

    autoTable(doc, {
      startY: r3Y + 12, margin: { left: m, right: m },
      head: [["Especie", "Variedad", "Calibre", "KG Neto/Caja", "KG Bruto/Caja", "Cajas",
        "KG Neto Total", "KG Bruto Total", `Val/Caja (${header.moneda})`,
        `Val/KG (${header.moneda})`, `Valor Total ${header.clausula_venta} (${header.moneda})`]],
      body: [
        ...items.map(it => [
          it.especie, it.variedad, it.calibre,
          fmtKg(parseFloat(it.kg_neto_caja) || 0), fmtKg(parseFloat(it.kg_bruto_caja) || 0),
          it.cantidad_cajas || "0",
          fmtKg(it.kg_neto_total), fmtKg(it.kg_bruto_total),
          fmt(parseFloat(it.valor_caja) || 0, header.moneda),
          fmt(it.valor_kilo, header.moneda), fmt(it.valor_total, header.moneda),
        ]),
        [
          { content: "TOTAL", colSpan: 5, styles: { fontStyle: "bold" as const, halign: "right" as const, fillColor: GREEN_LIGHT } },
          { content: String(totals.cajas), styles: { fontStyle: "bold" as const, halign: "center" as const, fillColor: GREEN_LIGHT } },
          { content: fmtKg(totals.kg_neto), styles: { fontStyle: "bold" as const, fillColor: GREEN_LIGHT } },
          { content: fmtKg(totals.kg_bruto), styles: { fontStyle: "bold" as const, fillColor: GREEN_LIGHT } },
          { content: "", styles: { fillColor: GREEN_LIGHT } },
          { content: "", styles: { fillColor: GREEN_LIGHT } },
          { content: `${header.clausula_venta} ${fmt(totals.valor, header.moneda)} ${header.moneda}`, styles: { fontStyle: "bold" as const, fillColor: GREEN_LIGHT, textColor: [29, 111, 66] as [number,number,number] } },
        ],
      ],
      headStyles: { fillColor: GREEN, textColor: [255,255,255], fontStyle: "bold", fontSize: 6.5, cellPadding: 1.5 },
      bodyStyles: { fontSize: 7, cellPadding: 1.5 },
      alternateRowStyles: { fillColor: [248, 252, 250] },
      columnStyles: {
        0:{cellWidth:22},1:{cellWidth:18},2:{cellWidth:13},
        3:{cellWidth:20,halign:"right"},4:{cellWidth:20,halign:"right"},
        5:{cellWidth:13,halign:"center"},
        6:{cellWidth:21,halign:"right"},7:{cellWidth:21,halign:"right"},
        8:{cellWidth:21,halign:"right"},9:{cellWidth:21,halign:"right"},
        10:{cellWidth:30,halign:"right"},
      },
    });

    if (header.observaciones) {
      const finalY = (doc as any).lastAutoTable.finalY + 3;
      doc.setFontSize(7); doc.setFont("helvetica", "italic"); doc.setTextColor(80, 80, 80);
      doc.text(`Observaciones: ${header.observaciones}`, m, finalY);
    }
    doc.save(`Proforma_${header.numero || "borrador"}.pdf`);
  };

  // ── Save ───────────────────────────────────────────────────────────────────
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
        nave: header.nave || null, booking: header.booking || null,
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
          especie: it.especie || null, variedad: it.variedad || null, calibre: it.calibre || null,
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

  // ── New ────────────────────────────────────────────────────────────────────
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

  // ── Load list ──────────────────────────────────────────────────────────────
  const loadProformas = useCallback(async () => {
    if (!supabase) return;
    setLoadingList(true);
    const { data } = await supabase.from("proformas")
      .select("id,numero,ref_asli,fecha,importador,total_valor,moneda")
      .is("deleted_at", null).order("created_at", { ascending: false }).limit(50);
    setProformas(data ?? []);
    setLoadingList(false);
  }, [supabase]);

  // ── Load single ────────────────────────────────────────────────────────────
  const loadProforma = useCallback(async (proformaId: string) => {
    if (!supabase) return;
    const [{ data: pf }, { data: its }] = await Promise.all([
      supabase.from("proformas").select("*").eq("id", proformaId).single(),
      supabase.from("proforma_items").select("*").eq("proforma_id", proformaId).order("orden"),
    ]);
    if (!pf) return;
    setHeader({
      numero: pf.numero ?? "", operacion_id: pf.operacion_id ?? "", ref_asli: pf.ref_asli ?? "",
      fecha: pf.fecha ?? format(new Date(), "yyyy-MM-dd"),
      exportador: pf.exportador ?? "", exportador_rut: pf.exportador_rut ?? "",
      exportador_direccion: pf.exportador_direccion ?? "",
      importador: pf.importador ?? "", importador_direccion: pf.importador_direccion ?? "",
      importador_pais: pf.importador_pais ?? "", consignee_uscc: pf.consignee_uscc ?? "",
      clausula_venta: pf.clausula_venta ?? "FOB", moneda: pf.moneda ?? "USD",
      puerto_origen: pf.puerto_origen ?? "", puerto_destino: pf.puerto_destino ?? "",
      destino: pf.destino ?? "", contenedor: pf.contenedor ?? "",
      etd: pf.etd ?? "", naviera: pf.naviera ?? "", nave: pf.nave ?? "", booking: pf.booking ?? "",
      dus: pf.dus ?? "", csg: pf.csg ?? "", csp: pf.csp ?? "",
      observaciones: pf.observaciones ?? "",
    });
    if (its?.length) {
      setItems(its.map((it: any) => computeItem({
        id: it.id, especie: it.especie ?? "", variedad: it.variedad ?? "", calibre: it.calibre ?? "",
        kg_neto_caja: String(it.kg_neto_caja ?? ""), kg_bruto_caja: String(it.kg_bruto_caja ?? ""),
        cantidad_cajas: String(it.cantidad_cajas ?? ""),
        kg_neto_total: it.kg_neto_total ?? 0, kg_bruto_total: it.kg_bruto_total ?? 0,
        valor_caja: String(it.valor_caja ?? ""), valor_kilo: it.valor_kilo ?? 0, valor_total: it.valor_total ?? 0,
      })));
    }
    setShowList(false);
  }, [supabase]);

  // ── Field helper ───────────────────────────────────────────────────────────
  const setH = (field: keyof ProformaHeader, value: string) =>
    setHeader(h => ({ ...h, [field]: value }));

  const inp = (label: string, field: keyof ProformaHeader, opts?: { type?: string; placeholder?: string }) => (
    <div className="flex flex-col gap-0.5">
      <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">{label}</label>
      <input
        type={opts?.type ?? "text"} placeholder={opts?.placeholder ?? ""}
        value={header[field] as string} onChange={e => setH(field, e.target.value)}
        className="border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
      />
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-neutral-50">

      {/* ── Top Bar ── */}
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

      {/* ── Operation link + Template selector ── */}
      <div className="px-4 py-2.5 bg-white border-b border-neutral-100 flex-shrink-0 flex flex-col gap-2">

        {/* Operation search */}
        <div className="relative flex items-center gap-2">
          {opLinked ? (
            <div className="flex items-center gap-2 text-xs bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 flex-1">
              <Icon icon="lucide:link" width={12} className="text-emerald-600 flex-shrink-0" />
              <span className="text-emerald-700 font-medium">{opLinked.ref_asli}</span>
              <span className="text-emerald-600">— {opLinked.cliente}</span>
              <button onClick={() => { setOpLinked(null); setHeader(h => ({ ...h, operacion_id: "", ref_asli: "" })); }} className="ml-auto text-emerald-500 hover:text-emerald-700">
                <Icon icon="lucide:x" width={12} />
              </button>
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
                    <button key={op.id} onClick={() => linkOperation(op)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs hover:bg-emerald-50 text-left border-b border-neutral-50 last:border-0">
                      <span className="font-mono font-semibold text-emerald-700">{op.ref_asli}</span>
                      <span className="text-neutral-500 flex-1 truncate">{op.cliente}</span>
                      {op.booking && <span className="text-neutral-400">{op.booking}</span>}
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
          <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide flex-shrink-0">Formato:</label>
          {availableTemplates.length === 0 ? (
            <span className="text-xs text-neutral-400 italic">Sin formatos personalizados — se usará PDF estándar</span>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <select
                value={selectedTemplateId}
                onChange={e => setSelectedTemplateId(e.target.value)}
                className="flex-1 min-w-0 border border-neutral-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white"
              >
                <option value="">— PDF estándar —</option>
                {availableTemplates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                    {t.cliente ? ` (${t.cliente})` : " (global)"}
                    {" — "}
                    {t.template_type === "excel" ? "Excel" : "HTML/PDF"}
                  </option>
                ))}
              </select>
              {selectedTemplate && (
                <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
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
            onClick={handleExport}
            disabled={exporting}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {exporting
              ? <><Icon icon="lucide:loader-2" width={13} className="animate-spin" /><span>Exportando...</span></>
              : <><Icon icon="lucide:download" width={13} /><span>Exportar</span></>
            }
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-neutral-200 bg-white px-4 flex-shrink-0">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              tab === t ? "border-emerald-600 text-emerald-700" : "border-transparent text-neutral-500 hover:text-neutral-700"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto">

        {/* ═══ Mercadería ═══ */}
        {tab === "Mercadería" && (
          <div className="p-4 flex flex-col gap-4">
            {/* Moneda + Cláusula */}
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">Moneda</label>
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
                <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">Cláusula de Venta</label>
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
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase">{s.label}</span>
                  <span className={`text-base font-bold font-mono tabular-nums ${s.hi ? "text-emerald-800" : "text-neutral-800"}`}>{s.val}</span>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block rounded-xl border border-neutral-200 bg-white overflow-x-auto">
              <table className="w-full text-xs min-w-[900px]">
                <thead>
                  <tr className="bg-emerald-700 text-white">
                    {["#","Especie","Variedad","Calibre","KG Neto/Caja","KG Bruto/Caja","Cajas",
                      "KG Neto Total","KG Bruto Total",`Val/Caja (${header.moneda})`,
                      `Val/KG (${header.moneda})`, `Valor Total (${header.moneda})`, ""].map((h,i) => (
                      <th key={i} className="px-2 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={it.id} className={idx % 2 === 0 ? "bg-white" : "bg-neutral-50"}>
                      <td className="px-2 py-1 text-neutral-400 text-center">{idx+1}</td>
                      {(["especie","variedad","calibre"] as const).map(f => (
                        <td key={f} className="px-1 py-1">
                          <input value={it[f]} onChange={e => updateItem(it.id, f, e.target.value)}
                            className="w-full min-w-[70px] border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-400 rounded px-1 py-0.5" />
                        </td>
                      ))}
                      {(["kg_neto_caja","kg_bruto_caja","cantidad_cajas"] as const).map(f => (
                        <td key={f} className="px-1 py-1">
                          <input type="number" value={it[f]} onChange={e => updateItem(it.id, f, e.target.value)}
                            className="w-full min-w-[60px] border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-400 rounded px-1 py-0.5 text-right" />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right font-mono tabular-nums text-neutral-700">{fmtKg(it.kg_neto_total)}</td>
                      <td className="px-2 py-1 text-right font-mono tabular-nums text-neutral-700">{fmtKg(it.kg_bruto_total)}</td>
                      <td className="px-1 py-1">
                        <input type="number" value={it.valor_caja} onChange={e => updateItem(it.id, "valor_caja", e.target.value)}
                          className="w-full min-w-[60px] border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-400 rounded px-1 py-0.5 text-right" />
                      </td>
                      <td className="px-2 py-1 text-right font-mono tabular-nums text-neutral-700">{fmt(it.valor_kilo, header.moneda)}</td>
                      <td className="px-2 py-1 text-right font-mono tabular-nums font-semibold text-neutral-800">{fmt(it.valor_total, header.moneda)}</td>
                      <td className="px-1 py-1 text-center">
                        {items.length > 1 && (
                          <button onClick={() => removeItem(it.id)} className="text-neutral-300 hover:text-red-500 transition-colors">
                            <Icon icon="lucide:trash-2" width={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                    <td colSpan={6} className="px-2 py-2 text-right text-xs font-bold text-neutral-600">TOTAL</td>
                    <td className="px-2 py-2 text-right text-xs font-bold font-mono text-emerald-900">{totals.cajas.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right text-xs font-bold font-mono text-emerald-900">{fmtKg(totals.kg_neto)}</td>
                    <td className="px-2 py-2 text-right text-xs font-bold font-mono text-emerald-900">{fmtKg(totals.kg_bruto)}</td>
                    <td colSpan={2} />
                    <td className="px-2 py-2 text-right text-sm font-bold font-mono text-emerald-900">{fmt(totals.valor, header.moneda)}</td>
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
                    <span className="text-[10px] font-bold text-neutral-400 uppercase">Ítem {idx+1}</span>
                    {items.length > 1 && <button onClick={() => removeItem(it.id)} className="text-neutral-300 hover:text-red-500"><Icon icon="lucide:trash-2" width={13} /></button>}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["especie","variedad","calibre"] as const).map(f => (
                      <div key={f} className="flex flex-col gap-0.5">
                        <label className="text-[9px] font-semibold text-neutral-400 uppercase">{f}</label>
                        <input value={it[f]} onChange={e => updateItem(it.id, f, e.target.value)}
                          className="border border-neutral-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {([["kg_neto_caja","KG Neto/Caja"],["kg_bruto_caja","KG Bruto/Caja"],["cantidad_cajas","Cajas"],["valor_caja","Val/Caja"]] as const).map(([f,lbl]) => (
                      <div key={f} className="flex flex-col gap-0.5">
                        <label className="text-[9px] font-semibold text-neutral-400 uppercase">{lbl}</label>
                        <input type="number" value={it[f]} onChange={e => updateItem(it.id, f, e.target.value)}
                          className="border border-neutral-200 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                      </div>
                    ))}
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

            <button onClick={addItem}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium border-2 border-dashed border-emerald-300 text-emerald-600 rounded-xl hover:bg-emerald-50 transition-colors self-start">
              <Icon icon="lucide:plus-circle" width={15} />Agregar especie
            </button>

            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">Observaciones</label>
              <textarea value={header.observaciones} onChange={e => setH("observaciones", e.target.value)}
                rows={2} placeholder="Notas o condiciones especiales..."
                className="border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white resize-none" />
            </div>
          </div>
        )}

        {/* ═══ Partes ═══ */}
        {tab === "Partes" && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>
          </div>
        )}

        {/* ═══ Embarque ═══ */}
        {tab === "Embarque" && (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {inp("Puerto de Embarque", "puerto_origen", { placeholder: "San Antonio" })}
            {inp("Puerto de Descarga", "puerto_destino", { placeholder: "Los Angeles" })}
            {inp("Destino Final", "destino", { placeholder: "Los Angeles, CA" })}
            {inp("ETD", "etd", { type: "date" })}
            {inp("Contenedor", "contenedor", { placeholder: "TCKU1234567" })}
            {inp("Naviera", "naviera", { placeholder: "Hapag-Lloyd" })}
            {inp("Nave / Buque", "nave", { placeholder: "SANTA ELENA" })}
            {inp("Booking", "booking", { placeholder: "HAP1234567" })}
            {inp("Ref. ASLI", "ref_asli", { placeholder: "ASLI-2026-001" })}
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">Cláusula de Venta</label>
              <select value={header.clausula_venta} onChange={e => setH("clausula_venta", e.target.value)}
                className="border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                {CLAUSULAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* ═══ Documentos ═══ */}
        {tab === "Documentos" && (
          <div className="p-4 flex flex-col gap-4 max-w-lg">
            <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-2">
              <Icon icon="lucide:file-check-2" width={14} className="text-emerald-600" />Documentos de Exportación
            </h3>
            {inp("DUS", "dus", { placeholder: "DUS-2026-0001" })}
            {inp("CSG", "csg", { placeholder: "CSG-456" })}
            {inp("CSP", "csp", { placeholder: "CSP-789" })}
          </div>
        )}
      </div>

      {/* ── Success Modal ── */}
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
              <button onClick={handleExport}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors">
                <Icon icon="lucide:download" width={14} />Exportar
              </button>
              <button onClick={() => setShowSuccess(false)}
                className="flex-1 px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Error Modal ── */}
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

      {/* ── Proformas List Modal ── */}
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
                          <th key={h} className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase text-[10px]">{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody>
                        {proformas.map(pf => (
                          <tr key={pf.id} className="border-t border-neutral-50 hover:bg-neutral-50">
                            <td className="px-4 py-2 font-mono font-semibold text-emerald-700">{pf.numero}</td>
                            <td className="px-4 py-2 text-neutral-600">{pf.ref_asli ?? "—"}</td>
                            <td className="px-4 py-2 text-neutral-700 max-w-[160px] truncate">{pf.importador ?? "—"}</td>
                            <td className="px-4 py-2 text-neutral-500">{pf.fecha}</td>
                            <td className="px-4 py-2 font-mono font-semibold">{fmt(pf.total_valor ?? 0, pf.moneda ?? "USD")} {pf.moneda}</td>
                            <td className="px-4 py-2">
                              <button onClick={() => loadProforma(pf.id)}
                                className="px-2 py-1 text-[10px] font-medium border border-emerald-200 text-emerald-700 rounded hover:bg-emerald-50 transition-colors">
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
