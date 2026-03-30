"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { sileo } from "sileo";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { withBase } from "@/lib/basePath";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoFormato =
  | "factura" | "proforma" | "instructivo"
  | "conocimiento_embarque" | "packing_list" | "certificado_origen" | "otro";

type TemplateType = "html" | "excel";

type FormatoDocumento = {
  id: string;
  nombre: string;
  tipo: TipoFormato;
  template_type: TemplateType;
  descripcion: string | null;
  contenido_html: string;
  excel_path: string | null;
  excel_nombre: string | null;
  cliente: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

// ─── Tipos de formato ─────────────────────────────────────────────────────────

const TIPOS: { value: TipoFormato; label: string; icon: string; color: string }[] = [
  { value: "factura",               label: "Factura",                 icon: "lucide:file-text",   color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "proforma",              label: "Proforma Invoice",        icon: "lucide:file-check",  color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { value: "instructivo",           label: "Instructivo",             icon: "lucide:file-list",   color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "conocimiento_embarque", label: "Conocimiento de Embarque",icon: "lucide:ship",        color: "bg-teal-100 text-teal-700 border-teal-200" },
  { value: "packing_list",          label: "Packing List",            icon: "lucide:package",     color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "certificado_origen",    label: "Certificado de Origen",   icon: "lucide:award",       color: "bg-green-100 text-green-700 border-green-200" },
  { value: "otro",                  label: "Otro",                    icon: "lucide:file",        color: "bg-neutral-100 text-neutral-600 border-neutral-200" },
];

// ─── Etiquetas ────────────────────────────────────────────────────────────────

type TagGroup = { group: string; icon: string; tags: { tag: string; label: string; sample: string }[] };

const TAG_GROUPS: TagGroup[] = [
  {
    group: "Empresa / Exportador", icon: "lucide:building-2",
    tags: [
      { tag: "{{empresa_nombre}}",     label: "Nombre empresa",       sample: "EMPRESA EXPORTADORA S.A." },
      { tag: "{{empresa_rut}}",        label: "RUT empresa",          sample: "76.123.456-7" },
      { tag: "{{empresa_giro}}",       label: "Giro comercial",       sample: "Exportación de fruta fresca" },
      { tag: "{{empresa_direccion}}", label: "Dirección empresa",     sample: "Av. Principal 1234, Santiago" },
    ],
  },
  {
    group: "Cliente", icon: "lucide:user",
    tags: [
      { tag: "{{cliente_nombre}}",     label: "Nombre cliente",       sample: "EMPRESA EJEMPLO LTDA." },
      { tag: "{{cliente_rut}}",        label: "RUT cliente",          sample: "12.345.678-9" },
      { tag: "{{cliente_direccion}}", label: "Dirección cliente",     sample: "Av. Providencia 1234, Santiago" },
    ],
  },
  {
    group: "Documento", icon: "lucide:file-text",
    tags: [
      { tag: "{{tipo_documento}}",     label: "Tipo de documento",    sample: "FACTURA COMERCIAL" },
      { tag: "{{numero_documento}}",   label: "N° documento",         sample: "FAC-2025-001" },
      { tag: "{{fecha}}",              label: "Fecha documento",      sample: "15/03/2025" },
      { tag: "{{fecha_emision}}",      label: "Fecha emisión",        sample: "15/03/2025" },
      { tag: "{{numero_embarque}}",    label: "N° embarque",          sample: "EMB-2025-042" },
      { tag: "{{ref_asli}}",           label: "Referencia ASLI",      sample: "ASLI-00123" },
      { tag: "{{csp}}",                label: "CSP",                  sample: "CSP-12345" },
      { tag: "{{csg}}",                label: "CSG",                  sample: "CSG-67890" },
      { tag: "{{reserva}}",            label: "N° reserva",           sample: "RSV-2025-001" },
      { tag: "{{tipo_bl}}",            label: "Tipo de BL",           sample: "ORIGINAL" },
      { tag: "{{leyenda_bl}}",         label: "Leyenda BL",           sample: "FREIGHT PREPAID" },
    ],
  },
  {
    group: "Operación", icon: "lucide:container",
    tags: [
      { tag: "{{booking}}",            label: "Booking",              sample: "BK-20250001" },
      { tag: "{{contenedor}}",         label: "Contenedor",           sample: "MSCU1234567" },
      { tag: "{{contenedor_awb}}",     label: "Contenedor / AWB",     sample: "MSCU1234567" },
      { tag: "{{sello}}",              label: "Sello",                sample: "ML-123456" },
      { tag: "{{tara}}",               label: "Tara (kg)",            sample: "3.900" },
      { tag: "{{tipo_contenedor}}",    label: "Tipo contenedor",      sample: "40' HC" },
      { tag: "{{naviera}}",            label: "Naviera",              sample: "MSC" },
      { tag: "{{nave}}",               label: "Nave",                 sample: "MSC BETTINA" },
      { tag: "{{viaje}}",              label: "Viaje / Voyage",       sample: "VY-2025-01" },
      { tag: "{{numero_viaje}}",       label: "Número de viaje",      sample: "VY-2025-01" },
      { tag: "{{incoterm}}",           label: "Incoterm",             sample: "FOB" },
      { tag: "{{modalidad_venta}}",    label: "Modalidad de venta",   sample: "FOB" },
      { tag: "{{clausula_venta}}",     label: "Cláusula de venta",    sample: "CIF" },
      { tag: "{{tipo_flete}}",         label: "Tipo de flete",        sample: "PREPAID" },
      { tag: "{{forma_pago}}",         label: "Forma de pago",        sample: "Prepaid" },
      { tag: "{{plazo_pago}}",         label: "Plazo de pago",        sample: "30 días" },
      { tag: "{{exportador}}",         label: "Exportador",           sample: "EMPRESA EXPORTADORA S.A." },
      { tag: "{{consignatario}}",      label: "Consignatario",        sample: "CONSIGNATARIO BEIJING" },
      { tag: "{{agente_aduana}}",      label: "Agente de aduana",     sample: "ADUANAS EXPRESS LTDA." },
      { tag: "{{agente_embarcador}}",  label: "Agente embarcador",    sample: "FREIGHT FORWARDER S.A." },
      { tag: "{{contacto_operador}}",  label: "Contacto operador",    sample: "operaciones@asli.cl" },
      { tag: "{{rut_operador}}",       label: "RUT operador",         sample: "76.XXX.XXX-X" },
      { tag: "{{observaciones}}",      label: "Observaciones",        sample: "Frío continuo requerido" },
      { tag: "{{instrucciones_especiales}}", label: "Instrucciones especiales", sample: "Mantener a temperatura constante" },
    ],
  },
  {
    group: "Puertos y Fechas", icon: "lucide:map-pin",
    tags: [
      { tag: "{{pais_origen}}",        label: "País de origen",       sample: "Chile" },
      { tag: "{{puerto_origen}}",      label: "Puerto origen (POL)",  sample: "San Antonio, Chile" },
      { tag: "{{puerto_embarque}}",    label: "Puerto de embarque",   sample: "San Antonio, Chile" },
      { tag: "{{puerto_descarga}}",    label: "Puerto de descarga",   sample: "Shanghai, China" },
      { tag: "{{puerto_destino}}",     label: "Puerto de destino (POD)", sample: "Shanghai, China" },
      { tag: "{{puerto_entrega}}",     label: "Puerto de entrega",    sample: "Guangzhou, China" },
      { tag: "{{destino_final}}",      label: "Destino final",        sample: "Beijing, China" },
      { tag: "{{pais_destino}}",       label: "País de destino",      sample: "China" },
      { tag: "{{puerto_descarga_bl}}",       label: "Puerto descarga (BL)",         sample: "Shanghai, China" },
      { tag: "{{puerto_descarga_certificado}}",label: "Puerto descarga (certificado)",sample: "Shanghai, China" },
      { tag: "{{puerto_ingreso_fito}}",      label: "Puerto ingreso fito",           sample: "Shanghai" },
      { tag: "{{fecha_embarque}}",     label: "Fecha de embarque",    sample: "15/03/2025" },
      { tag: "{{fecha_presentacion}}", label: "Fecha de presentación",sample: "10/03/2025" },
      { tag: "{{fecha_en_planta}}",    label: "Fecha en planta",      sample: "12/03/2025 08:00" },
      { tag: "{{fecha_en_puerto}}",    label: "Fecha en puerto",      sample: "14/03/2025 10:00" },
      { tag: "{{etd}}",                label: "ETD",                  sample: "15/03/2025" },
      { tag: "{{eta}}",                label: "ETA",                  sample: "12/04/2025" },
      { tag: "{{corte_documental}}",   label: "Corte documental",     sample: "10/03/2025 17:00" },
    ],
  },
  {
    group: "Carga", icon: "lucide:package",
    tags: [
      { tag: "{{especie}}",            label: "Especie / producto",   sample: "Uva de mesa" },
      { tag: "{{descripcion_carga}}", label: "Descripción carga",     sample: "Fruta fresca refrigerada" },
      { tag: "{{temperatura}}",        label: "Temperatura",          sample: "-0.5°C" },
      { tag: "{{ventilacion}}",        label: "Ventilación (CBM/h)",   sample: "25" },
      { tag: "{{peso_neto}}",          label: "Peso neto total",      sample: "20.000 kg" },
      { tag: "{{peso_bruto}}",         label: "Peso bruto total",     sample: "22.500 kg" },
      { tag: "{{peso_neto_total}}",    label: "Peso neto total",      sample: "20.000 kg" },
      { tag: "{{peso_bruto_total}}",   label: "Peso bruto total",     sample: "22.500 kg" },
      { tag: "{{cantidad_bultos}}",    label: "Cantidad bultos",      sample: "1.200" },
      { tag: "{{unidad_medida}}",      label: "Unidad de medida",     sample: "PALLETS" },
      { tag: "{{hs_code}}",            label: "HS Code",              sample: "0806.10" },
      { tag: "{{planta_despacho}}",    label: "Planta de despacho",   sample: "Frigorífico Del Monte" },
      { tag: "{{planta_consolidacion}}",label: "Planta consolidación",sample: "Consolidadora Sur" },
      { tag: "{{inspeccion_sag}}",     label: "Inspección SAG",       sample: "SAG-2025-1234" },
      { tag: "{{transporte_terrestre}}",label: "Transporte terrestre",sample: "Transportes ABC" },
    ],
  },
  {
    group: "Transporte", icon: "lucide:truck",
    tags: [
      { tag: "{{empresa_transporte}}",label: "Empresa transporte",    sample: "Transportes ABC" },
      { tag: "{{chofer}}",             label: "Chofer",               sample: "Juan Pérez" },
      { tag: "{{rut_chofer}}",         label: "RUT chofer",           sample: "12.345.678-9" },
      { tag: "{{telefono_chofer}}",    label: "Teléfono chofer",      sample: "+56 9 1234 5678" },
      { tag: "{{patente_camion}}",     label: "Patente camión",       sample: "ABCD12" },
      { tag: "{{patente_remolque}}",   label: "Patente remolque",     sample: "REMO34" },
      { tag: "{{tramo}}",              label: "Tramo",                sample: "San Antonio - Santiago" },
      { tag: "{{valor_tramo}}",        label: "Valor tramo",          sample: "USD 850" },
      { tag: "{{moneda_tramo}}",       label: "Moneda tramo",         sample: "USD" },
      { tag: "{{deposito}}",           label: "Depósito",             sample: "Depot Norte" },
    ],
  },
  {
    group: "Planta y Stacking", icon: "lucide:warehouse",
    tags: [
      { tag: "{{planta_presentacion}}",label: "Planta de citación",   sample: "Frigorífico El Monte" },
      { tag: "{{citacion}}",           label: "Fecha en planta / Citación", sample: "12/03/2025 08:00" },
      { tag: "{{llegada_planta}}",     label: "Llegada planta",       sample: "12/03/2025 09:15" },
      { tag: "{{salida_planta}}",      label: "Salida planta",        sample: "12/03/2025 12:30" },
      { tag: "{{agendamiento_retiro}}",label: "Agendamiento retiro",  sample: "10/03/2025 10:00" },
      { tag: "{{inicio_stacking}}",    label: "Inicio stacking",      sample: "13/03/2025 06:00" },
      { tag: "{{fin_stacking}}",       label: "Fin stacking",         sample: "14/03/2025 18:00" },
      { tag: "{{ingreso_stacking}}",   label: "Ingreso stacking",     sample: "13/03/2025 14:00" },
    ],
  },
  {
    group: "Consignee", icon: "lucide:user-check",
    tags: [
      { tag: "{{consignee}}",               label: "Consignee (nombre)",    sample: "BEIJING IMPORT CO., LTD." },
      { tag: "{{consignee_company}}",       label: "Empresa consignee",     sample: "BEIJING IMPORT CO., LTD." },
      { tag: "{{consignee_direccion}}",     label: "Dirección consignee",   sample: "No. 1 Wangfujing St., Beijing" },
      { tag: "{{consignee_address}}",       label: "Address consignee",     sample: "No. 1 Wangfujing St., Beijing 100006" },
      { tag: "{{consignee_contacto}}",      label: "Contacto consignee",    sample: "Mr. Li Wei" },
      { tag: "{{consignee_attn}}",          label: "Attn. consignee",       sample: "Mr. Li Wei" },
      { tag: "{{consignee_email}}",         label: "Email consignee",       sample: "import@beijing.cn" },
      { tag: "{{consignee_telefono}}",      label: "Teléfono consignee",    sample: "+86 10 1234 5678" },
      { tag: "{{consignee_mobile}}",        label: "Móvil consignee",       sample: "+86 10 1234 5678" },
      { tag: "{{consignee_usci}}",          label: "USCI consignee",        sample: "91110000100006795A" },
      { tag: "{{consignee_uscc}}",          label: "USCC consignee",        sample: "91110000100006795A" },
      { tag: "{{consignee_zip}}",           label: "ZIP consignee",         sample: "100006" },
      { tag: "{{consignee_postal_code}}",   label: "Postal code consignee", sample: "100006" },
      { tag: "{{consignee_pais}}",          label: "País consignee",        sample: "China" },
      { tag: "{{notify}}",                  label: "Notify (nombre)",       sample: "SAME AS CONSIGNEE" },
    ],
  },
  {
    group: "Notify Party", icon: "lucide:bell",
    tags: [
      { tag: "{{notify_company}}",     label: "Empresa notify",       sample: "SAME AS CONSIGNEE" },
      { tag: "{{notify_address}}",     label: "Dirección notify",     sample: "No. 1 Wangfujing St., Beijing 100006" },
      { tag: "{{notify_attn}}",        label: "Attn. notify",         sample: "Ms. Zhang Fang" },
      { tag: "{{notify_uscc}}",        label: "USCC notify",          sample: "91110000100006795B" },
      { tag: "{{notify_mobile}}",      label: "Móvil notify",         sample: "+86 10 9876 5432" },
      { tag: "{{notify_email}}",       label: "Email notify",         sample: "notify@beijing.cn" },
      { tag: "{{notify_zip}}",         label: "ZIP notify",           sample: "100006" },
    ],
  },
  {
    group: "Items (tabla)", icon: "lucide:list",
    tags: [
      { tag: "{{#items}}",             label: "Inicio bloque items",  sample: "(inicio de fila)" },
      { tag: "{{/items}}",             label: "Fin bloque items",     sample: "(fin de fila)" },
      { tag: "{{cantidad}}",           label: "Cantidad",             sample: "960" },
      { tag: "{{tipo_envase}}",        label: "Tipo envase",          sample: "CAJA" },
      { tag: "{{variedad}}",           label: "Variedad",             sample: "RED GLOBE" },
      { tag: "{{categoria}}",          label: "Categoría",            sample: "PRIMERA" },
      { tag: "{{etiqueta}}",           label: "Etiqueta",             sample: "PREMIUM" },
      { tag: "{{calibre}}",            label: "Calibre",              sample: "XL" },
      { tag: "{{kg_neto_unidad}}",     label: "Kg neto / unidad",     sample: "8,2" },
      { tag: "{{peso_neto}}",          label: "Peso neto línea",      sample: "7.872,0" },
      { tag: "{{peso_bruto}}",         label: "Peso bruto línea",     sample: "8.640,0" },
      { tag: "{{precio_caja}}",        label: "Precio por caja",      sample: "12,50" },
      { tag: "{{total_linea}}",        label: "Total línea",          sample: "12.000,00" },
    ],
  },
  {
    group: "Totales", icon: "lucide:sigma",
    tags: [
      { tag: "{{total_cantidad}}",     label: "Total cantidad",       sample: "2.400" },
      { tag: "{{total_pallets}}",      label: "Total pallets",        sample: "20" },
      { tag: "{{total_peso_neto}}",    label: "Total peso neto",      sample: "20.000 kg" },
      { tag: "{{total_peso_bruto}}",   label: "Total peso bruto",     sample: "22.500 kg" },
      { tag: "{{total_valor}}",        label: "Total valor",          sample: "USD 30.000,00" },
      { tag: "{{valor_total}}",        label: "Valor total",          sample: "USD 30.000,00" },
      { tag: "{{monto_total}}",        label: "Monto total",          sample: "USD 30.000,00" },
      { tag: "{{moneda}}",             label: "Moneda",               sample: "USD" },
      { tag: "{{precio_unitario}}",    label: "Precio unitario",      sample: "12,50" },
      { tag: "{{tipo_cambio}}",        label: "Tipo de cambio",       sample: "950" },
      { tag: "{{plazo_pago}}",         label: "Plazo de pago",        sample: "30 días" },
      { tag: "{{concepto}}",           label: "Concepto",             sample: "Flete + Handling" },
    ],
  },
  {
    group: "ASLI", icon: "lucide:building",
    tags: [
      { tag: "{{asli_nombre}}",        label: "Nombre empresa",       sample: "Asesorías y Servicios Logísticos Integrales Ltda." },
      { tag: "{{asli_rut}}",           label: "RUT ASLI",             sample: "76.XXX.XXX-X" },
      { tag: "{{asli_direccion}}",     label: "Dirección ASLI",       sample: "Valparaíso, Chile" },
      { tag: "{{asli_telefono}}",      label: "Teléfono ASLI",        sample: "+56 X XXXX XXXX" },
      { tag: "{{asli_email}}",         label: "Email ASLI",           sample: "contacto@asli.cl" },
    ],
  },
];

// Mapa plano de tag → sample
const TAG_SAMPLE_MAP: Record<string, string> = Object.fromEntries(
  TAG_GROUPS.flatMap((g) => g.tags.map(({ tag, sample }) => [tag, sample]))
);

// ─── HTML template base ────────────────────────────────────────────────────────

const TEMPLATE_BASE = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:12px;color:#111827;padding:32px 40px;background:#fff}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #11224E}
    .logo-area img{height:50px}
    .doc-title{font-size:18px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#11224E;text-align:right}
    .doc-ref{font-size:11px;color:#6b7280;text-align:right;margin-top:4px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}
    .card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px}
    .card-title{font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
    .field{display:flex;gap:6px;margin-bottom:3px}
    .field-label{color:#6b7280;min-width:90px}
    .field-value{font-weight:600;color:#111827}
    table{width:100%;border-collapse:collapse;margin:14px 0}
    thead th{background:#11224E;color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;padding:8px 6px;text-align:left}
    tbody tr:nth-child(even){background:#f9fafb}
    td{padding:7px 6px;border-bottom:1px solid #e5e7eb}
    .total-row{background:#eff6ff;font-weight:700;color:#1d4ed8}
    .footer{margin-top:24px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af}
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-area"><img src="${withBase("/LOGO ASLI SIN FONDO AZUL.png")}" alt="ASLI"></div>
    <div>
      <div class="doc-title">Documento</div>
      <div class="doc-ref">Ref: {{ref_asli}}</div>
      <div class="doc-ref">Fecha: {{fecha_emision}}</div>
    </div>
  </div>
  <div class="grid2">
    <div class="card">
      <div class="card-title">Cliente / Bill To</div>
      <div class="field"><span class="field-label">Empresa:</span><span class="field-value">{{cliente_nombre}}</span></div>
      <div class="field"><span class="field-label">RUT:</span><span class="field-value">{{cliente_rut}}</span></div>
    </div>
    <div class="card">
      <div class="card-title">Detalle de Operación</div>
      <div class="field"><span class="field-label">Booking:</span><span class="field-value">{{booking}}</span></div>
      <div class="field"><span class="field-label">Naviera:</span><span class="field-value">{{naviera}}</span></div>
      <div class="field"><span class="field-label">Nave:</span><span class="field-value">{{nave}}</span></div>
      <div class="field"><span class="field-label">Contenedor:</span><span class="field-value">{{contenedor}}</span></div>
      <div class="field"><span class="field-label">POD:</span><span class="field-value">{{puerto_destino}}</span></div>
      <div class="field"><span class="field-label">ETD:</span><span class="field-value">{{etd}}</span></div>
    </div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Descripción</th><th>Cantidad</th><th style="text-align:right">Precio Unit.</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>{{concepto}}</td><td>1</td><td style="text-align:right">{{monto_total}}</td><td style="text-align:right">{{monto_total}}</td></tr>
      <tr class="total-row"><td colspan="4" style="text-align:right">TOTAL</td><td style="text-align:right">{{moneda}} {{monto_total}}</td></tr>
    </tbody>
  </table>
  <div class="footer">{{asli_nombre}} — {{asli_direccion}}<br>Documento generado por ASLI el {{fecha_emision}}</div>
</body>
</html>`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTipoMeta(tipo: TipoFormato) {
  return TIPOS.find((t) => t.value === tipo) ?? TIPOS[TIPOS.length - 1];
}

function applyPreview(html: string): string {
  let result = html;
  for (const [tag, sample] of Object.entries(TAG_SAMPLE_MAP)) {
    result = result.replaceAll(tag, `<span style="background:#fef9c3;color:#92400e;border-radius:3px;padding:0 2px">${sample}</span>`);
  }
  return result;
}

function formatFecha(str: string) {
  try { return format(new Date(str), "dd/MM/yyyy", { locale: es }); }
  catch { return str; }
}

/** Extrae todas las etiquetas {{...}} únicas de un texto */
function extractTags(text: string): string[] {
  const matches = text.match(/\{\{[a-z_]+\}\}/g) ?? [];
  return [...new Set(matches)];
}

/** Escanea un workbook de XLSX y extrae todas las etiquetas {{...}} */
function scanXlsxTags(wb: XLSX.WorkBook): string[] {
  const allTags: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    for (const cellRef of Object.keys(ws)) {
      if (cellRef[0] === "!") continue;
      const cell = ws[cellRef];
      if (cell.t === "s" && typeof cell.v === "string") {
        const tags = cell.v.match(/\{\{[a-z_]+\}\}/g);
        if (tags) allTags.push(...tags);
      }
    }
  }
  return [...new Set(allTags)];
}

/** Genera HTML de vista previa para una hoja, resaltando etiquetas {{}} */
function generateSheetPreview(wb: XLSX.WorkBook, sheetName: string): string {
  const ws = wb.Sheets[sheetName];
  if (!ws) return "<p style='padding:16px;color:#6b7280'>Hoja vacía</p>";
  const tableHtml = XLSX.utils.sheet_to_html(ws, { id: "preview-table", editable: false });
  const highlighted = tableHtml.replace(/\{\{[a-z_]+\}\}/g, (m) =>
    `<mark style="background:#fef9c3;color:#92400e;border-radius:3px;padding:0 3px;font-weight:700">${m}</mark>`
  );
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:11px;color:#111827;padding:12px;background:#f9fafb}
    table{border-collapse:collapse;width:auto;min-width:100%;background:#fff;border:1px solid #d1d5db;border-radius:6px;overflow:hidden}
    td,th{border:1px solid #e5e7eb;padding:5px 10px;white-space:nowrap;min-width:60px;max-width:280px;overflow:hidden;text-overflow:ellipsis}
    tr:first-child td,tr:first-child th{background:#374151;color:#fff;font-weight:700;border-color:#374151}
    tr:nth-child(even) td{background:#f9fafb}
    tr:hover td{background:#eff6ff!important}
    mark{font-family:monospace}
  </style></head><body>${highlighted}</body></html>`;
}

/**
 * Reemplaza etiquetas {{tag}} directamente en el XML interno del .xlsx (via JSZip).
 * Preserva 100% del formato original: bordes, colores, fuentes, imágenes, logos.
 * Solo modifica el texto de las celdas que contienen etiquetas.
 */
async function applyTagsToXlsxBuffer(
  buffer: ArrayBuffer,
  values: Record<string, string>
): Promise<Blob> {
  const zip = await JSZip.loadAsync(buffer);

  // Archivos XML que pueden contener texto de celdas con etiquetas
  const targets = [
    "xl/sharedStrings.xml",   // strings compartidas (la mayoría de textos)
    ...Object.keys(zip.files).filter(
      (f) => f.startsWith("xl/worksheets/") && f.endsWith(".xml")
    ),
  ];

  for (const path of targets) {
    const file = zip.file(path);
    if (!file) continue;
    let content = await file.async("string");
    let changed = false;
    for (const [tag, replacement] of Object.entries(values)) {
      // Escapar caracteres XML especiales en el valor de reemplazo
      const safeVal = replacement
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      // El tag en el XML puede aparecer literalmente o con codificación XML
      const xmlTag = tag
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      if (content.includes(xmlTag)) {
        content = content.replaceAll(xmlTag, safeVal);
        changed = true;
      }
    }
    if (changed) zip.file(path, content);
  }

  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function FormatosDocumentosContent() {
  const { isCliente } = useAuth();

  const [formatos, setFormatos] = useState<FormatoDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<"list" | "editor">("list");

  // ── Editor state ──────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoFormato>("proforma");
  const [templateType, setTemplateType] = useState<TemplateType>("html");
  const [descripcion, setDescripcion] = useState("");
  const [contenidoHtml, setContenidoHtml] = useState(TEMPLATE_BASE);
  const [editorTab, setEditorTab] = useState<"code" | "preview">("code");
  // Excel
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelPath, setExcelPath] = useState<string | null>(null);
  const [excelNombre, setExcelNombre] = useState<string | null>(null);
  const [xlsxTags, setXlsxTags] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [xlsxPanel, setXlsxPanel] = useState<"upload" | "preview">("upload");
  const [xlsxPreviewHtml, setXlsxPreviewHtml] = useState<string | null>(null);
  const [xlsxSheetNames, setXlsxSheetNames] = useState<string[]>([]);
  const [xlsxActiveSheet, setXlsxActiveSheet] = useState<string>("");
  const [xlsxWb, setXlsxWb] = useState<XLSX.WorkBook | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // ── Cliente asignado al formato ───────────────────────────────────────────
  const [clienteFormato, setClienteFormato] = useState<string>("");
  const [empresas, setEmpresas] = useState<string[]>([]);

  const [tagSearch, setTagSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(TAG_GROUPS.map((g) => g.group)));
  const [saving, setSaving] = useState(false);
  const [mobileTagDrawer, setMobileTagDrawer] = useState(false);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nombre: string; excel_path: string | null } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Generar desde lista ────────────────────────────────────────────────────
  const [generarFormato, setGenerarFormato] = useState<FormatoDocumento | null>(null);
  const [tagValues, setTagValues] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchFormatos = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("formatos_documentos")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setFormatos((data ?? []) as FormatoDocumento[]);
  }, []);

  useEffect(() => {
    void fetchFormatos();
    // Cargar empresas disponibles
    supabase.from("empresas").select("nombre").order("nombre").then(({ data }) => {
      setEmpresas((data ?? []).map((e: { nombre: string }) => e.nombre));
    });
  }, [fetchFormatos]);


  // ── Procesar Excel al seleccionar ─────────────────────────────────────────
  const processExcelFile = (file: File) => {
    setExcelFile(file);
    setExcelNombre(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const tags = scanXlsxTags(wb);
        setXlsxTags(tags);
        setXlsxWb(wb);
        setXlsxSheetNames(wb.SheetNames);
        const first = wb.SheetNames[0] ?? "";
        setXlsxActiveSheet(first);
        setXlsxPreviewHtml(generateSheetPreview(wb, first));
        setXlsxPanel("preview");
      } catch {
        setXlsxTags([]);
        setXlsxPreviewHtml(null);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Cargar vista previa desde Storage (formato guardado) ──────────────────
  const handleCargarPreviewStorage = async () => {
    if (!excelPath) return;
    setLoadingPreview(true);
    const { data, error: dlErr } = await supabase.storage.from("formatos-templates").download(excelPath);
    if (dlErr || !data) { setError("Error al cargar vista previa."); setLoadingPreview(false); return; }
    const buf = await data.arrayBuffer();
    const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
    const tags = scanXlsxTags(wb);
    setXlsxTags(tags);
    setXlsxWb(wb);
    setXlsxSheetNames(wb.SheetNames);
    const first = wb.SheetNames[0] ?? "";
    setXlsxActiveSheet(first);
    setXlsxPreviewHtml(generateSheetPreview(wb, first));
    setXlsxPanel("preview");
    setLoadingPreview(false);
  };

  // ── Abrir editor ──────────────────────────────────────────────────────────
  const handleNuevo = () => {
    setEditingId(null);
    setNombre(""); setTipo("proforma"); setDescripcion(""); setClienteFormato("");
    setTemplateType("html"); setContenidoHtml(TEMPLATE_BASE);
    setExcelFile(null); setExcelPath(null); setExcelNombre(null);
    setXlsxTags([]); setXlsxPreviewHtml(null); setXlsxSheetNames([]); setXlsxActiveSheet(""); setXlsxWb(null); setXlsxPanel("upload");
    setEditorTab("code");
    setView("editor");
  };

  const handleEditar = (f: FormatoDocumento) => {
    setEditingId(f.id);
    setNombre(f.nombre); setTipo(f.tipo); setDescripcion(f.descripcion ?? ""); setClienteFormato(f.cliente ?? "");
    setTemplateType(f.template_type ?? "html");
    setContenidoHtml(f.contenido_html ?? TEMPLATE_BASE);
    setExcelFile(null);
    setExcelPath(f.excel_path ?? null);
    setExcelNombre(f.excel_nombre ?? null);
    setXlsxTags([]); setXlsxPreviewHtml(null); setXlsxSheetNames([]); setXlsxActiveSheet(""); setXlsxWb(null);
    // Si ya tiene archivo guardado, mostrar tab de upload con opción de cargar preview
    setXlsxPanel(f.excel_path ? "upload" : "upload");
    setEditorTab("code");
    setView("editor");
  };

  // ── Guardar ───────────────────────────────────────────────────────────────
  const handleGuardar = async () => {
    if (!nombre.trim()) { setError("El nombre del formato es requerido."); return; }
    if (templateType === "excel" && !excelFile && !excelPath) {
      setError("Debes subir un archivo Excel para este tipo de formato."); return;
    }
    setSaving(true); setError(null);

    let finalExcelPath = excelPath;
    let finalExcelNombre = excelNombre;

    // Subir archivo Excel si hay uno nuevo
    if (templateType === "excel" && excelFile) {
      const ext = excelFile.name.split(".").pop() ?? "xlsx";
      const storagePath = `formatos/${Date.now()}_${nombre.replace(/\s+/g, "_")}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("formatos-templates")
        .upload(storagePath, excelFile, { upsert: true, contentType: excelFile.type });
      if (uploadErr) { setSaving(false); setError(`Error al subir archivo: ${uploadErr.message}`); return; }
      // Borrar archivo anterior si existe
      if (excelPath && excelPath !== storagePath) {
        await supabase.storage.from("formatos-templates").remove([excelPath]);
      }
      finalExcelPath = storagePath;
      finalExcelNombre = excelFile.name;
    }

    const payload = {
      nombre: nombre.trim(),
      tipo,
      template_type: templateType,
      descripcion: descripcion.trim() || null,
      contenido_html: templateType === "html" ? contenidoHtml : "",
      excel_path: templateType === "excel" ? finalExcelPath : null,
      excel_nombre: templateType === "excel" ? finalExcelNombre : null,
      cliente: clienteFormato.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let err;
    if (editingId) {
      ({ error: err } = await supabase.from("formatos_documentos").update(payload).eq("id", editingId));
    } else {
      ({ error: err } = await supabase.from("formatos_documentos").insert({ ...payload, activo: true }));
    }
    setSaving(false);
    if (err) { setError(err.message); return; }
    sileo.success({ title: editingId ? "Formato actualizado." : "Formato creado." });
    setView("list");
    void fetchFormatos();
  };

  // ── Eliminar ──────────────────────────────────────────────────────────────
  const handleEliminar = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    if (confirmDelete.excel_path) {
      await supabase.storage.from("formatos-templates").remove([confirmDelete.excel_path]);
    }
    const { error: err } = await supabase.from("formatos_documentos").delete().eq("id", confirmDelete.id);
    setDeleting(false); setConfirmDelete(null);
    if (err) { setError(err.message); return; }
    sileo.success({ title: "Formato eliminado." });
    void fetchFormatos();
  };

  // ── Descargar plantilla Excel ──────────────────────────────────────────────
  const handleDescargarPlantilla = async (f: FormatoDocumento) => {
    if (!f.excel_path) return;
    const { data, error: err } = await supabase.storage
      .from("formatos-templates")
      .download(f.excel_path);
    if (err || !data) { setError("Error al descargar plantilla."); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url; a.download = f.excel_nombre ?? "plantilla.xlsx"; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Abrir modal Generar ────────────────────────────────────────────────────
  const handleAbrirGenerar = async (f: FormatoDocumento) => {
    setLoadingTags(true);
    setTagValues({});
    setGenerarFormato(f); // abre modal con loading

    let tags: string[] = [];

    const effectiveType = f.template_type ?? "html";

    if (effectiveType === "excel" && f.excel_path) {
      // Escanear etiquetas desde el archivo Excel guardado
      const { data } = await supabase.storage.from("formatos-templates").download(f.excel_path);
      if (data) {
        const buf = await data.arrayBuffer();
        const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
        tags = scanXlsxTags(wb);
      }
    } else {
      // Escanear etiquetas desde el HTML
      tags = extractTags(f.contenido_html ?? "");
    }

    // Si no se detectaron etiquetas en el template, usar TODAS las disponibles
    // para que el usuario pueda rellenarlas igualmente
    if (tags.length === 0) {
      tags = TAG_GROUPS.flatMap((g) => g.tags.map((t) => t.tag));
    }

    const initial: Record<string, string> = {};
    for (const tag of tags) { initial[tag] = TAG_SAMPLE_MAP[tag] ?? ""; }
    setTagValues(initial);
    setLoadingTags(false);
  };

  // ── Generar documento ─────────────────────────────────────────────────────
  const handleGenerar = async () => {
    if (!generarFormato) return;
    setGenerating(true);
    const f = generarFormato;

    if ((f.template_type ?? "html") === "excel" && f.excel_path) {
      // Descargar plantilla, reemplazar etiquetas preservando formato completo
      const { data, error: dlErr } = await supabase.storage.from("formatos-templates").download(f.excel_path);
      if (dlErr || !data) { setError("Error al cargar plantilla Excel."); setGenerating(false); return; }
      const buf = await data.arrayBuffer();
      // Usa JSZip para reemplazar directamente en el XML interno → preserva bordes, colores, imágenes
      const blob = await applyTagsToXlsxBuffer(buf, tagValues);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${f.nombre}_${format(new Date(), "yyyyMMdd")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // HTML: reemplazar y abrir ventana de impresión
      let html = f.contenido_html;
      for (const [tag, val] of Object.entries(tagValues)) { html = html.replaceAll(tag, val); }
      const win = window.open("", "_blank", "width=900,height=700");
      if (win) {
        win.document.write(html + `<script>window.onload=()=>{window.print()}<\/script>`);
        win.document.close();
      }
    }
    setGenerating(false);
    setGenerarFormato(null);
  };

  // ── Tag insertion HTML ─────────────────────────────────────────────────────
  const handleInsertTag = (tag: string) => {
    const ta = textareaRef.current;
    if (!ta) { setContenidoHtml((p) => p + tag); return; }
    const s = ta.selectionStart, e = ta.selectionEnd;
    const next = contenidoHtml.slice(0, s) + tag + contenidoHtml.slice(e);
    setContenidoHtml(next);
    requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + tag.length; ta.focus(); });
  };

  const toggleGroup = (g: string) =>
    setExpandedGroups((prev) => { const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n; });

  const filteredGroups = TAG_GROUPS.map((g) => ({
    ...g,
    tags: g.tags.filter((t) => !tagSearch ||
      t.label.toLowerCase().includes(tagSearch.toLowerCase()) ||
      t.tag.toLowerCase().includes(tagSearch.toLowerCase())),
  })).filter((g) => g.tags.length > 0);

  // ─── Estilos base ──────────────────────────────────────────────────────────
  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all text-sm";
  const labelCls = "block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1";

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: LISTA
  // ═══════════════════════════════════════════════════════════════════════════

  if (view === "list") return (
    <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto">

      {/* ── Hero header ── */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-blue/90 to-brand-teal/80 px-4 sm:px-6 py-5 sm:py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <Icon icon="lucide:file-code-2" width={22} height={22} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-white leading-tight">Formatos de Documentos</h1>
              <p className="text-xs text-white/60 mt-0.5 hidden sm:block">Plantillas HTML y Excel con etiquetas dinámicas</p>
              {formatos.length > 0 && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-white/90 border border-white/20">
                    <Icon icon="lucide:files" width={9} height={9} />
                    {formatos.length} formato{formatos.length !== 1 ? "s" : ""}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-white/90 border border-white/20">
                    <Icon icon="lucide:file-spreadsheet" width={9} height={9} />
                    {formatos.filter(f => f.template_type === "excel").length} Excel
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-white/90 border border-white/20">
                    <Icon icon="lucide:code" width={9} height={9} />
                    {formatos.filter(f => f.template_type !== "excel").length} HTML
                  </span>
                </div>
              )}
            </div>
          </div>
          {!isCliente && (
            <button
              onClick={handleNuevo}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-white text-brand-blue text-xs sm:text-sm font-bold hover:bg-white/90 transition-colors shadow-sm shrink-0"
            >
              <Icon icon="lucide:plus" width={15} height={15} />
              <span className="hidden sm:inline">Nuevo formato</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-3 sm:p-4 lg:p-6 max-w-5xl mx-auto">
        {error && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <Icon icon="lucide:alert-circle" width={16} height={16} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}><Icon icon="lucide:x" width={14} height={14} /></button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 px-5 py-4 bg-white rounded-2xl border border-neutral-200 shadow-sm text-neutral-500 text-sm">
              <Icon icon="typcn:refresh" className="w-5 h-5 animate-spin text-brand-blue" />
              Cargando formatos...
            </div>
          </div>
        ) : formatos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-3xl bg-brand-blue/10 flex items-center justify-center mb-5 shadow-inner">
              <Icon icon="lucide:file-code-2" width={32} height={32} className="text-brand-blue" />
            </div>
            <h3 className="text-base font-bold text-neutral-800 mb-2">Sin formatos creados</h3>
            <p className="text-sm text-neutral-500 mb-6 max-w-xs leading-relaxed">
              Crea tu primer formato HTML o sube una plantilla Excel con etiquetas como{" "}
              <code className="bg-neutral-100 px-1.5 py-0.5 rounded-lg text-xs font-mono text-brand-blue">{"{{booking}}"}</code>
            </p>
            {!isCliente && (
              <button onClick={handleNuevo} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-blue text-white text-sm font-bold hover:bg-brand-blue/90 transition-colors shadow-md shadow-brand-blue/20">
                <Icon icon="lucide:plus" width={16} height={16} />
                Crear primer formato
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {formatos.map((f) => {
              const meta = getTipoMeta(f.tipo);
              const isExcel = f.template_type === "excel";
              const accentGradient = isExcel
                ? "from-emerald-500 to-green-400"
                : "from-brand-blue to-brand-teal";
              return (
                <div key={f.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
                  {/* Top accent */}
                  <div className={`h-1.5 bg-gradient-to-r ${accentGradient}`} />

                  <div className="p-4 flex-1 flex flex-col gap-3">
                    {/* Header row */}
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isExcel ? "bg-emerald-50" : "bg-brand-blue/8"}`}>
                        <Icon icon={isExcel ? "lucide:file-spreadsheet" : meta.icon} width={18} height={18} className={isExcel ? "text-emerald-600" : "text-brand-blue"} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-neutral-900 leading-snug line-clamp-2">{f.nombre}</h3>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.color}`}>
                            {meta.label}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${isExcel ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-sky-50 text-sky-700 border-sky-200"}`}>
                            <Icon icon={isExcel ? "lucide:table" : "lucide:code"} width={9} height={9} />
                            {isExcel ? "Excel" : "HTML"}
                          </span>
                          {f.cliente ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-violet-50 text-violet-700 border-violet-200 max-w-[110px]">
                              <Icon icon="lucide:building-2" width={9} height={9} />
                              <span className="truncate">{f.cliente}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-neutral-100 text-neutral-500 border-neutral-200">
                              <Icon icon="lucide:globe" width={9} height={9} />
                              Global
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Descripción */}
                    {f.descripcion && (
                      <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2">{f.descripcion}</p>
                    )}

                    {/* Excel filename chip */}
                    {isExcel && f.excel_nombre && (
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                        <Icon icon="lucide:file-spreadsheet" width={11} height={11} className="text-emerald-600 shrink-0" />
                        <span className="text-[11px] text-emerald-700 font-medium truncate">{f.excel_nombre}</span>
                      </div>
                    )}

                    {/* Fecha */}
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 mt-auto">
                      <Icon icon="lucide:clock" width={10} height={10} />
                      {formatFecha(f.updated_at)}
                    </div>
                  </div>

                  {/* Actions row — separadas del contenido */}
                  <div className="px-3 pb-3 flex items-center gap-2">
                    {!isCliente && (
                      <button
                        onClick={() => handleAbrirGenerar(f)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white transition-colors ${isExcel ? "bg-emerald-600 hover:bg-emerald-700" : "bg-brand-blue hover:bg-brand-blue/90"}`}
                      >
                        <Icon icon="lucide:zap" width={13} height={13} />
                        Generar
                      </button>
                    )}
                    {!isCliente && (
                      <button
                        onClick={() => handleEditar(f)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-neutral-500 hover:text-brand-blue hover:bg-brand-blue/8 transition-all border border-neutral-200 hover:border-brand-blue/30"
                        title="Editar"
                      >
                        <Icon icon="lucide:pencil" width={14} height={14} />
                      </button>
                    )}
                    {isExcel && f.excel_path && (
                      <button
                        onClick={() => handleDescargarPlantilla(f)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-neutral-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-neutral-200 hover:border-emerald-200"
                        title="Descargar plantilla"
                      >
                        <Icon icon="lucide:download" width={14} height={14} />
                      </button>
                    )}
                    {!isCliente && (
                      <button
                        onClick={() => setConfirmDelete({ id: f.id, nombre: f.nombre, excel_path: f.excel_path })}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-all border border-neutral-200 hover:border-red-200"
                        title="Eliminar"
                      >
                        <Icon icon="lucide:trash-2" width={14} height={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal Eliminar (bottom sheet en mobile) ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="h-1.5 bg-red-500" />
            <div className="sm:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-neutral-200" /></div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                  <Icon icon="lucide:trash-2" width={20} height={20} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Eliminar formato</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">Esta acción no se puede deshacer.</p>
                </div>
              </div>
              <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
                ¿Confirmas eliminar <span className="font-semibold text-neutral-900">"{confirmDelete.nombre}"</span>?
              </p>
              <div className="flex gap-2.5">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-neutral-100 hover:bg-neutral-200 transition-colors text-neutral-700">Cancelar</button>
                <button onClick={handleEliminar} disabled={deleting} className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                  {deleting ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Generar Documento (bottom sheet) ── */}
      {generarFormato && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setGenerarFormato(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92dvh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Handle bar */}
            <div className="sm:hidden flex justify-center pt-3 pb-0 shrink-0"><div className="w-10 h-1 rounded-full bg-neutral-200" /></div>
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${generarFormato.template_type === "excel" ? "bg-emerald-100" : "bg-brand-blue/10"}`}>
                  <Icon icon={generarFormato.template_type === "excel" ? "lucide:file-spreadsheet" : "lucide:file-text"} width={18} height={18} className={generarFormato.template_type === "excel" ? "text-emerald-600" : "text-brand-blue"} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Generar documento</h3>
                  <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-[200px]">{generarFormato.nombre}</p>
                </div>
              </div>
              <button onClick={() => setGenerarFormato(null)} className="w-8 h-8 flex items-center justify-center rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                <Icon icon="lucide:x" width={16} height={16} />
              </button>
            </div>
            <div className="mx-5 border-t border-neutral-100" />
            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loadingTags ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Icon icon="typcn:refresh" className="w-7 h-7 animate-spin text-brand-blue" />
                  <p className="text-sm text-neutral-500">Detectando etiquetas del formato...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Completa los valores para reemplazar las etiquetas. Los campos vacíos quedarán en blanco.
                  </p>
                  {TAG_GROUPS.map((g) => {
                    const tagsInGroup = g.tags.filter((t) => t.tag in tagValues);
                    if (tagsInGroup.length === 0) return null;
                    return (
                      <div key={g.group}>
                        <div className="flex items-center gap-2 mb-2.5">
                          <div className="w-5 h-5 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                            <Icon icon={g.icon} width={11} height={11} className="text-brand-blue" />
                          </div>
                          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{g.group}</span>
                        </div>
                        <div className="space-y-2.5">
                          {tagsInGroup.map(({ tag, label, sample }) => (
                            <div key={tag}>
                              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-600 mb-1">
                                {label}
                                <code className="font-mono text-[9px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded-md">{tag}</code>
                              </label>
                              <input
                                value={tagValues[tag] ?? ""}
                                onChange={(e) => setTagValues((p) => ({ ...p, [tag]: e.target.value }))}
                                placeholder={sample}
                                className={inputCls}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Footer */}
            <div className="shrink-0 px-5 py-4 border-t border-neutral-100 flex gap-2.5">
              <button onClick={() => { setGenerarFormato(null); setLoadingTags(false); }} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-neutral-100 hover:bg-neutral-200 transition-colors text-neutral-700">
                Cancelar
              </button>
              <button
                onClick={handleGenerar}
                disabled={generating || loadingTags}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50 ${(generarFormato.template_type ?? "html") === "excel" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-brand-blue hover:bg-brand-blue/90"}`}
              >
                <Icon icon={generating ? "typcn:refresh" : (generarFormato.template_type ?? "html") === "excel" ? "lucide:file-spreadsheet" : "lucide:file-text"} width={15} height={15} className={generating ? "animate-spin" : ""} />
                {generating ? "Generando..." : (generarFormato.template_type ?? "html") === "excel" ? "Descargar Excel" : "Generar PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: EDITOR
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <main className="flex-1 min-h-0 flex flex-col bg-neutral-50 overflow-hidden">
      {/* Topbar editor */}
      <div className="bg-gradient-to-r from-brand-blue to-brand-blue/90 px-3 sm:px-5 py-3 flex items-center gap-2 shrink-0 min-w-0">
        <button onClick={() => setView("list")} className="flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-white transition-colors shrink-0 px-2 py-1.5 rounded-lg hover:bg-white/10">
          <Icon icon="lucide:arrow-left" width={14} height={14} />
          <span className="hidden sm:inline">Formatos</span>
        </button>
        <Icon icon="lucide:chevron-right" width={11} height={11} className="text-white/30 shrink-0" />
        <span className="text-xs font-semibold text-white truncate flex-1 min-w-0">
          {editingId ? nombre || "Sin nombre" : "Nuevo formato"}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setMobileTagDrawer(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors lg:hidden"
          >
            <Icon icon="lucide:tag" width={13} height={13} />
            <span className="hidden sm:inline">Etiquetas</span>
          </button>
          {templateType === "html" && (
            <button
              onClick={() => {
                const win = window.open("", "_blank", "width=900,height=700");
                if (win) { win.document.write(applyPreview(contenidoHtml)); win.document.close(); }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
              title="Vista previa"
            >
              <Icon icon="lucide:eye" width={13} height={13} />
              <span className="hidden sm:inline">Preview</span>
            </button>
          )}
          <button
            onClick={handleGuardar}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-brand-blue hover:bg-white/90 transition-colors shadow-sm disabled:opacity-50"
          >
            <Icon icon={saving ? "typcn:refresh" : "lucide:save"} width={13} height={13} className={saving ? "animate-spin" : ""} />
            {saving ? "..." : "Guardar"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-3 mt-2 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs shrink-0">
          <Icon icon="lucide:alert-circle" width={14} height={14} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><Icon icon="lucide:x" width={12} height={12} /></button>
        </div>
      )}

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Columna central */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

          {/* ── Metadatos ── */}
          <div className="bg-white border-b border-neutral-100 px-3 sm:px-4 pt-3 pb-4 shrink-0">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
              <Icon icon="lucide:settings-2" width={10} height={10} />
              Configuración del formato
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Nombre <span className="text-red-400">*</span></label>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Proforma estándar" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Tipo de documento</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoFormato)} className={inputCls}>
                  {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Descripción <span className="text-neutral-300 font-normal normal-case tracking-normal">— opcional</span></label>
                <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Uso o cliente de este formato" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>
                  <Icon icon="lucide:building-2" className="inline w-3 h-3 mr-1" />
                  Cliente asignado
                </label>
                <select value={clienteFormato} onChange={(e) => setClienteFormato(e.target.value)} className={inputCls}>
                  <option value="">— Global (todos los clientes) —</option>
                  {empresas.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── Toolbar tipo + tabs ── */}
          <div className="bg-neutral-50 border-b border-neutral-200 px-3 py-2 flex items-center gap-2 shrink-0">
            {/* Pill toggle HTML / Excel */}
            <div className="flex items-center gap-1 p-1 bg-neutral-200/60 rounded-xl shrink-0">
              {(["html", "excel"] as const).map((tt) => (
                <button
                  key={tt}
                  onClick={() => setTemplateType(tt)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    templateType === tt
                      ? "bg-white text-brand-blue shadow-sm border border-neutral-200/80"
                      : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  <Icon icon={tt === "html" ? "lucide:code" : "lucide:file-spreadsheet"} width={12} height={12} />
                  {tt === "html" ? "HTML" : "Excel"}
                </button>
              ))}
            </div>

            {/* Pill toggle Código / Preview (solo HTML) */}
            {templateType === "html" && (
              <div className="flex items-center gap-1 p-1 bg-neutral-200/60 rounded-xl">
                {(["code", "preview"] as const).map((tab) => (
                  <button key={tab} onClick={() => setEditorTab(tab)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                      editorTab === tab
                        ? "bg-white text-brand-blue shadow-sm border border-neutral-200/80"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    <Icon icon={tab === "code" ? "lucide:terminal" : "lucide:eye"} width={11} height={11} />
                    {tab === "code" ? "Código" : "Preview"}
                  </button>
                ))}
              </div>
            )}

            {/* Sub-tabs archivo/preview (solo Excel) */}
            {templateType === "excel" && (
              <div className="flex items-center gap-1 p-1 bg-neutral-200/60 rounded-xl">
                {(["upload", "preview"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      if (tab === "preview" && !xlsxPreviewHtml && excelPath) void handleCargarPreviewStorage();
                      else setXlsxPanel(tab);
                    }}
                    disabled={tab === "preview" && !xlsxPreviewHtml && !excelPath}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                      xlsxPanel === tab
                        ? "bg-white text-emerald-700 shadow-sm border border-neutral-200/80"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    <Icon icon={tab === "upload" ? "lucide:upload-cloud" : "lucide:eye"} width={11} height={11} />
                    {tab === "upload" ? "Archivo" : "Vista previa"}
                    {tab === "preview" && xlsxPreviewHtml && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  </button>
                ))}
              </div>
            )}

            {/* Sheet selector */}
            {templateType === "excel" && xlsxPanel === "preview" && xlsxSheetNames.length > 1 && (
              <div className="flex items-center gap-1 ml-1 overflow-x-auto">
                {xlsxSheetNames.map((sn) => (
                  <button key={sn}
                    onClick={() => { setXlsxActiveSheet(sn); if (xlsxWb) setXlsxPreviewHtml(generateSheetPreview(xlsxWb, sn)); }}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${xlsxActiveSheet === sn ? "bg-emerald-600 text-white" : "text-neutral-500 hover:bg-neutral-200"}`}
                  >{sn}</button>
                ))}
              </div>
            )}

            <div className="ml-auto lg:hidden shrink-0">
              <button onClick={() => setMobileTagDrawer(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-600 bg-white border border-neutral-200 hover:border-brand-blue/40 hover:text-brand-blue transition-colors shadow-sm"
              >
                <Icon icon="lucide:tag" width={12} height={12} />
                Tags
              </button>
            </div>
          </div>

          {/* ── Área principal ── */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {templateType === "html" ? (
              editorTab === "code" ? (
                <textarea
                  ref={textareaRef}
                  value={contenidoHtml}
                  onChange={(e) => setContenidoHtml(e.target.value)}
                  spellCheck={false}
                  className="w-full h-full resize-none p-4 font-mono text-xs text-emerald-300 bg-neutral-950 focus:outline-none leading-relaxed"
                  style={{ tabSize: 2 }}
                  placeholder="Escribe el HTML del documento aquí..."
                />
              ) : (
                <iframe srcDoc={applyPreview(contenidoHtml)} title="Preview" className="w-full h-full border-0 bg-white" sandbox="allow-same-origin" />
              )
            ) : (
              <div className="h-full flex flex-col overflow-hidden">
                {xlsxPanel === "upload" ? (
                  <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col gap-4">
                    {/* Drop zone */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processExcelFile(f); }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex flex-col items-center justify-center gap-3 px-6 py-8 sm:py-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                        dragOver ? "border-emerald-500 bg-emerald-50"
                          : excelFile || excelPath ? "border-emerald-400 bg-emerald-50/40"
                          : "border-neutral-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/30"
                      }`}
                    >
                      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) processExcelFile(f); }} />
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${excelFile || excelPath ? "bg-emerald-100" : "bg-neutral-100"}`}>
                        <Icon icon={excelFile || excelPath ? "lucide:file-check" : "lucide:upload-cloud"} width={22} height={22} className={excelFile || excelPath ? "text-emerald-600" : "text-neutral-400"} />
                      </div>
                      {excelFile ? (
                        <div className="text-center">
                          <p className="text-sm font-bold text-emerald-700">{excelFile.name}</p>
                          <p className="text-xs text-emerald-500 mt-0.5">Listo · toca para cambiar</p>
                        </div>
                      ) : excelNombre ? (
                        <div className="text-center">
                          <p className="text-sm font-bold text-emerald-700 flex items-center gap-1.5 justify-center">
                            <Icon icon="lucide:check-circle" width={14} height={14} />
                            {excelNombre}
                          </p>
                          <p className="text-[11px] text-emerald-500 mt-0.5">Guardado en servidor</p>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); void handleCargarPreviewStorage(); }}
                            disabled={loadingPreview}
                            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 mx-auto rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                          >
                            <Icon icon={loadingPreview ? "typcn:refresh" : "lucide:eye"} width={12} height={12} className={loadingPreview ? "animate-spin" : ""} />
                            {loadingPreview ? "Cargando..." : "Ver vista previa"}
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-sm font-semibold text-neutral-700">Sube tu plantilla Excel</p>
                          <p className="text-xs text-neutral-400 mt-0.5">Arrastra o toca para seleccionar · .xlsx, .xls</p>
                        </div>
                      )}
                    </div>

                    {/* Tags detectadas */}
                    {xlsxTags.length > 0 && (
                      <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm">
                        <h4 className="text-xs font-bold text-neutral-700 mb-3 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                            <Icon icon="lucide:tag" width={11} height={11} className="text-brand-blue" />
                          </span>
                          Etiquetas detectadas
                          <span className="ml-auto px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue text-[10px] font-bold">{xlsxTags.length}</span>
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {xlsxTags.map((tag) => {
                            const meta = TAG_GROUPS.flatMap((g) => g.tags).find((t) => t.tag === tag);
                            return (
                              <span key={tag} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-blue/8 border border-brand-blue/15 text-[10px] font-mono text-brand-blue">
                                <Icon icon="lucide:check" width={9} height={9} />
                                {tag}
                                {meta && <span className="font-sans text-neutral-400 ml-0.5">{meta.label}</span>}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Instrucciones */}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                      <h4 className="text-xs font-bold text-amber-800 mb-2.5 flex items-center gap-2">
                        <Icon icon="lucide:lightbulb" width={13} height={13} className="text-amber-500" />
                        Cómo usar etiquetas en Excel
                      </h4>
                      <div className="space-y-2">
                        {[
                          { n: "1", text: "Escribe etiquetas en celdas:", code: "{{cliente_nombre}}" },
                          { n: "2", text: "Combina con texto:", code: "Booking: {{booking}}" },
                          { n: "3", text: "Sube el archivo — el sistema detecta etiquetas automáticamente.", code: null },
                          { n: "4", text: "Al generar, ingresa valores y descarga.", code: null },
                        ].map(({ n, text, code }) => (
                          <div key={n} className="flex gap-2 text-xs text-amber-700">
                            <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{n}</span>
                            <span>{text} {code && <code className="bg-amber-100 px-1.5 py-0.5 rounded-md font-mono text-[10px]">{code}</code>}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Vista previa del Excel */
                  <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    {xlsxPreviewHtml ? (
                      <>
                        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 flex items-center gap-3 shrink-0">
                          <Icon icon="lucide:info" width={13} height={13} className="text-emerald-600 shrink-0" />
                          <p className="text-xs text-emerald-700 flex-1 leading-relaxed">
                            Las etiquetas <mark className="bg-yellow-200 text-yellow-800 px-1 rounded font-mono text-[10px]">{"{{etiqueta}}"}</mark> se reemplazarán al generar.
                          </p>
                          <button onClick={() => setXlsxPanel("upload")} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 shrink-0 font-semibold">
                            <Icon icon="lucide:upload-cloud" width={12} height={12} />
                            Cambiar
                          </button>
                        </div>
                        <div className="flex-1 min-h-0 overflow-hidden bg-neutral-100">
                          <iframe srcDoc={xlsxPreviewHtml} title="Vista previa Excel" className="w-full h-full border-0" sandbox="allow-same-origin" />
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="flex items-center gap-3 px-5 py-4 bg-white rounded-2xl border border-neutral-200 shadow-sm text-neutral-500 text-sm">
                          <Icon icon="typcn:refresh" className="w-5 h-5 animate-spin text-emerald-600" />
                          Cargando vista previa...
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Panel de etiquetas mobile — bottom sheet */}
        {mobileTagDrawer && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileTagDrawer(false)} />
            <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl flex flex-col max-h-[75dvh] lg:hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-neutral-100 shrink-0">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:tag" width={15} height={15} className="text-brand-blue" />
                  <h4 className="text-sm font-bold text-neutral-800">
                    {templateType === "html" ? "Insertar etiqueta" : "Etiquetas disponibles"}
                  </h4>
                </div>
                <button onClick={() => setMobileTagDrawer(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 transition-colors">
                  <Icon icon="lucide:x" width={15} height={15} />
                </button>
              </div>
              <div className="px-3 py-2.5 border-b border-neutral-100 shrink-0">
                <input
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  placeholder="Buscar etiqueta..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-700 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredGroups.map((g) => (
                  <div key={g.group} className="border-b border-neutral-100 last:border-0">
                    <button onClick={() => toggleGroup(g.group)} className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-neutral-50 transition-colors">
                      <Icon icon={g.icon} width={13} height={13} className="text-neutral-400 shrink-0" />
                      <span className="text-xs font-semibold text-neutral-600 flex-1">{g.group}</span>
                      <Icon icon={expandedGroups.has(g.group) ? "lucide:chevron-up" : "lucide:chevron-down"} width={12} height={12} className="text-neutral-400" />
                    </button>
                    {expandedGroups.has(g.group) && (
                      <div className="pb-1">
                        {g.tags.map(({ tag, label }) => (
                          <button
                            key={tag}
                            onClick={() => {
                              if (templateType === "html") handleInsertTag(tag);
                              else navigator.clipboard.writeText(tag);
                              setMobileTagDrawer(false);
                            }}
                            className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-brand-blue/5 active:bg-brand-blue/10 group transition-colors"
                          >
                            <Icon icon={templateType === "html" ? "lucide:plus-circle" : "lucide:copy"} width={13} height={13} className="text-brand-blue/50 group-hover:text-brand-blue mt-0.5 shrink-0" />
                            <div className="min-w-0 text-left">
                              <div className="text-xs font-medium text-neutral-700 group-hover:text-neutral-900">{label}</div>
                              <div className="text-[10px] font-mono text-neutral-400 group-hover:text-brand-blue truncate">{tag}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-neutral-100 bg-neutral-50 shrink-0">
                <p className="text-[11px] text-neutral-400 text-center">
                  {templateType === "html" ? "Toca una etiqueta para insertarla en el cursor." : "Toca para copiar al portapapeles."}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Panel de etiquetas (solo desktop) */}
        <div className="w-64 shrink-0 bg-white border-l border-neutral-200 hidden lg:flex flex-col overflow-hidden">
          <div className="px-3 py-3 border-b border-neutral-200 shrink-0">
            <h4 className="text-xs font-bold text-neutral-800 mb-2">
              {templateType === "html" ? "Insertar etiqueta" : "Etiquetas disponibles"}
            </h4>
            <input
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 text-xs text-neutral-700 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredGroups.map((g) => (
              <div key={g.group} className="border-b border-neutral-100 last:border-0">
                <button onClick={() => toggleGroup(g.group)} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-50 transition-colors">
                  <Icon icon={g.icon} width={12} height={12} className="text-neutral-400 shrink-0" />
                  <span className="text-[11px] font-semibold text-neutral-600 flex-1">{g.group}</span>
                  <Icon icon={expandedGroups.has(g.group) ? "lucide:chevron-up" : "lucide:chevron-down"} width={11} height={11} className="text-neutral-400" />
                </button>
                {expandedGroups.has(g.group) && (
                  <div className="pb-1">
                    {g.tags.map(({ tag, label }) => (
                      <button
                        key={tag}
                        onClick={() => templateType === "html" ? handleInsertTag(tag) : navigator.clipboard.writeText(tag)}
                        title={templateType === "html" ? `Insertar ${tag}` : `Copiar ${tag}`}
                        className="w-full flex items-start gap-2 px-3 py-1.5 hover:bg-brand-blue/5 group transition-colors"
                      >
                        <Icon
                          icon={templateType === "html" ? "lucide:plus-circle" : "lucide:copy"}
                          width={11} height={11}
                          className="text-brand-blue/50 group-hover:text-brand-blue mt-0.5 shrink-0"
                        />
                        <div className="min-w-0 text-left">
                          <div className="text-[10px] font-medium text-neutral-600 group-hover:text-neutral-900">{label}</div>
                          <div className="text-[9px] font-mono text-neutral-400 group-hover:text-brand-blue truncate">{tag}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="px-3 py-2.5 border-t border-neutral-200 bg-neutral-50 shrink-0">
            <p className="text-[10px] text-neutral-400 leading-relaxed">
              {templateType === "html"
                ? "Click → inserta en el cursor del editor."
                : "Click → copia al portapapeles para pegar en Excel."}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
