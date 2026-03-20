import { format } from "date-fns";
import JSZip from "jszip";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FormatoInstructivo = {
  id: string;
  nombre: string;
  tipo: string;
  template_type: "html" | "excel" | null;
  descripcion: string | null;
  contenido_html: string | null;
  excel_path: string | null;
  excel_nombre: string | null;
  cliente: string | null;
};

export type EmailAttachment = {
  filename: string;
  mimeType: string;
  base64Data: string;
};

/** Datos mínimos necesarios para generar el instructivo + correo */
export type InstructivoOpData = {
  id: string;
  ref_asli?: string | null;
  correlativo: number;
  cliente?: string | null;
  consignatario?: string | null;
  naviera?: string | null;
  nave?: string | null;
  booking?: string | null;
  booking_doc_url?: string | null;
  pol?: string | null;
  pod?: string | null;
  etd?: string | null;
  eta?: string | null;
  especie?: string | null;
  pais?: string | null;
  pallets?: number | null;
  peso_bruto?: number | null;
  peso_neto?: number | null;
  tipo_unidad?: string | null;
  contenedor?: string | null;
  sello?: string | null;
  tara?: number | null;
  temperatura?: string | null;
  ventilacion?: string | null;
  incoterm?: string | null;
  forma_pago?: string | null;
  observaciones?: string | null;
  transporte?: string | null;
  tramo?: string | null;
  deposito?: string | null;
  moneda?: string | null;
  // Transporte-específicos
  chofer?: string | null;
  rut_chofer?: string | null;
  telefono_chofer?: string | null;
  patente_camion?: string | null;
  patente_remolque?: string | null;
  planta_presentacion?: string | null;
  inicio_stacking?: string | null;
  fin_stacking?: string | null;
  ingreso_stacking?: string | null;
  citacion?: string | null;
  llegada_planta?: string | null;
  salida_planta?: string | null;
  agendamiento_retiro?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtRef(op: InstructivoOpData): string {
  return op.ref_asli || `A${String(op.correlativo).padStart(5, "0")}`;
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return "";
  try { return format(new Date(s), "dd/MM/yyyy"); } catch { return s; }
}

function fmtDatetime(s: string | null | undefined): string {
  if (!s) return "—";
  try { return format(new Date(s), "dd/MM/yyyy HH:mm"); } catch { return s; }
}

// ─── Tag replacement ──────────────────────────────────────────────────────────

export function buildInstructivoTagValues(op: InstructivoOpData): Record<string, string> {
  const pesoNeto  = op.peso_neto   != null ? `${op.peso_neto.toLocaleString("es-CL")} kg`  : "";
  const pesoBruto = op.peso_bruto  != null ? `${op.peso_bruto.toLocaleString("es-CL")} kg` : "";
  const today     = format(new Date(), "dd/MM/yyyy");

  return {
    // ── Referencia / documento ────────────────────────────────────────────────
    "{{ref_asli}}":                  fmtRef(op),
    "{{fecha}}":                     today,
    "{{fecha_emision}}":             today,
    "{{numero_documento}}":          "",
    "{{numero_embarque}}":           op.booking          ?? "",
    "{{csp}}":                       "",
    "{{csg}}":                       "",
    "{{reserva}}":                   "",
    "{{tipo_documento}}":            "",
    "{{tipo_bl}}":                   "",
    "{{leyenda_bl}}":                "",

    // ── Empresa exportadora ───────────────────────────────────────────────────
    "{{empresa_nombre}}":            "Asesorías y Servicios Logísticos Integrales Ltda.",
    "{{empresa_rut}}":               "76.XXX.XXX-X",
    "{{empresa_giro}}":              "Agencia de Aduana y Servicios Logísticos",
    "{{empresa_direccion}}":         "Valparaíso, Chile",
    "{{exportador}}":                op.cliente          ?? "",

    // ── Cliente ───────────────────────────────────────────────────────────────
    "{{cliente_nombre}}":            op.cliente          ?? "",
    "{{cliente_rut}}":               "",
    "{{cliente_direccion}}":         "",

    // ── Operación / naviera ───────────────────────────────────────────────────
    "{{booking}}":                   op.booking          ?? "",
    "{{naviera}}":                   op.naviera          ?? "",
    "{{nave}}":                      op.nave             ?? "",
    "{{viaje}}":                     "",
    "{{numero_viaje}}":              "",
    "{{contenedor}}":                op.contenedor       ?? "",
    "{{contenedor_awb}}":            op.contenedor       ?? "",
    "{{sello}}":                     op.sello            ?? "",
    "{{tara}}":                      op.tara        != null ? `${op.tara} kg` : "",
    "{{tipo_contenedor}}":           "",
    "{{incoterm}}":                  op.incoterm         ?? "",
    "{{modalidad_venta}}":           op.incoterm         ?? "",
    "{{clausula_venta}}":            "",
    "{{tipo_flete}}":                "",
    "{{forma_pago}}":                op.forma_pago       ?? "",
    "{{plazo_pago}}":                "",
    "{{consignatario}}":             op.consignatario    ?? "",
    "{{agente_aduana}}":             "",
    "{{agente_embarcador}}":         "",
    "{{contacto_operador}}":         "",
    "{{rut_operador}}":              "",
    "{{observaciones}}":             op.observaciones    ?? "",
    "{{instrucciones_especiales}}":  "",

    // ── Puertos y fechas ──────────────────────────────────────────────────────
    "{{pais_origen}}":               "Chile",
    "{{puerto_origen}}":             op.pol              ?? "",
    "{{puerto_embarque}}":           op.pol              ?? "",
    "{{puerto_destino}}":            op.pod              ?? "",
    "{{puerto_descarga}}":           op.pod              ?? "",
    "{{puerto_entrega}}":            op.pod              ?? "",
    "{{destino_final}}":             op.pod              ?? "",
    "{{pais_destino}}":              op.pais             ?? "",
    "{{puerto_descarga_bl}}":        op.pod              ?? "",
    "{{puerto_descarga_certificado}}": op.pod            ?? "",
    "{{puerto_ingreso_fito}}":       "",
    "{{fecha_embarque}}":            fmtDate(op.etd),
    "{{fecha_presentacion}}":        "",
    "{{fecha_en_planta}}":           fmtDatetime(op.citacion),
    "{{fecha_en_puerto}}":           fmtDatetime(op.ingreso_stacking),
    "{{etd}}":                       fmtDate(op.etd),
    "{{eta}}":                       fmtDate(op.eta),
    "{{corte_documental}}":          "",

    // ── Carga ─────────────────────────────────────────────────────────────────
    "{{especie}}":                   op.especie          ?? "",
    "{{descripcion_carga}}":         op.especie          ?? "",
    "{{temperatura}}":               op.temperatura      ?? "",
    "{{ventilacion}}":               op.ventilacion      ?? "",
    "{{peso_neto}}":                 pesoNeto,
    "{{peso_bruto}}":                pesoBruto,
    "{{peso_neto_total}}":           pesoNeto,
    "{{peso_bruto_total}}":          pesoBruto,
    "{{total_peso_neto}}":           pesoNeto,
    "{{total_peso_bruto}}":          pesoBruto,
    "{{cantidad_bultos}}":           op.pallets     != null ? String(op.pallets) : "",
    "{{total_cantidad}}":            op.pallets     != null ? String(op.pallets) : "",
    "{{total_pallets}}":             op.pallets     != null ? String(op.pallets) : "",
    "{{unidad_medida}}":             op.tipo_unidad      ?? "",
    "{{hs_code}}":                   "",
    "{{planta_despacho}}":           op.tramo            ?? "",
    "{{planta_consolidacion}}":      "",
    "{{inspeccion_sag}}":            "",
    "{{transporte_terrestre}}":      op.transporte       ?? "",

    // ── Consignee ─────────────────────────────────────────────────────────────
    "{{consignee}}":                 op.consignatario    ?? "",
    "{{consignee_company}}":         op.consignatario    ?? "",
    "{{consignee_direccion}}":       "",
    "{{consignee_address}}":         "",
    "{{consignee_contacto}}":        "",
    "{{consignee_attn}}":            "",
    "{{consignee_email}}":           "",
    "{{consignee_telefono}}":        "",
    "{{consignee_mobile}}":          "",
    "{{consignee_usci}}":            "",
    "{{consignee_uscc}}":            "",
    "{{consignee_zip}}":             "",
    "{{consignee_postal_code}}":     "",
    "{{consignee_pais}}":            op.pais             ?? "",
    "{{notify}}":                    "",
    "{{notify_company}}":            "",
    "{{notify_address}}":            "",
    "{{notify_attn}}":               "",
    "{{notify_uscc}}":               "",
    "{{notify_mobile}}":             "",
    "{{notify_email}}":              "",
    "{{notify_zip}}":                "",

    // ── Transporte ────────────────────────────────────────────────────────────
    "{{empresa_transporte}}":        op.transporte       ?? "",
    "{{chofer}}":                    op.chofer           ?? "",
    "{{rut_chofer}}":                op.rut_chofer       ?? "",
    "{{telefono_chofer}}":           op.telefono_chofer  ?? "",
    "{{patente_camion}}":            op.patente_camion   ?? "",
    "{{patente_remolque}}":          op.patente_remolque ?? "",
    "{{tramo}}":                     op.tramo            ?? "",
    "{{deposito}}":                  op.deposito         ?? "",
    "{{moneda_tramo}}":              op.moneda           ?? "",

    // ── Planta y stacking ─────────────────────────────────────────────────────
    "{{planta_presentacion}}":       op.planta_presentacion ?? "",
    "{{citacion}}":                  fmtDatetime(op.citacion),
    "{{llegada_planta}}":            fmtDatetime(op.llegada_planta),
    "{{salida_planta}}":             fmtDatetime(op.salida_planta),
    "{{agendamiento_retiro}}":       fmtDatetime(op.agendamiento_retiro),
    "{{inicio_stacking}}":           fmtDatetime(op.inicio_stacking),
    "{{fin_stacking}}":              fmtDatetime(op.fin_stacking),
    "{{ingreso_stacking}}":          fmtDatetime(op.ingreso_stacking),

    // ── Totales / facturación ─────────────────────────────────────────────────
    "{{moneda}}":                    op.moneda           ?? "USD",
    "{{monto_total}}":               "",
    "{{total_valor}}":               "",
    "{{valor_total}}":               "",
    "{{precio_unitario}}":           "",
    "{{tipo_cambio}}":               "",
    "{{concepto}}":                  "",

    // ── ASLI ──────────────────────────────────────────────────────────────────
    "{{asli_nombre}}":               "Asesorías y Servicios Logísticos Integrales Ltda.",
    "{{asli_rut}}":                  "76.XXX.XXX-X",
    "{{asli_direccion}}":            "Valparaíso, Chile",
    "{{asli_telefono}}":             "+56 X XXXX XXXX",
    "{{asli_email}}":                "contacto@asli.cl",
  };
}

// ─── HTML generation ──────────────────────────────────────────────────────────

export function generateInstructivoHtml(
  formato: FormatoInstructivo,
  tagValues: Record<string, string>,
): string {
  if (formato.template_type === "excel" || !formato.contenido_html) {
    return ""; // Se maneja como adjunto; el body del correo solo lleva el resumen
  }
  let html = formato.contenido_html;
  for (const [tag, val] of Object.entries(tagValues)) {
    html = html.replaceAll(tag, val);
  }
  return html;
}

// ─── Excel generation (preserva estilos via ZIP/XML) ─────────────────────────

export async function applyTagsToExcelBuffer(
  buffer: ArrayBuffer,
  values: Record<string, string>,
): Promise<Blob> {
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
      const safe = replacement
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      const xmlTag = tag.replace(/&/g, "&amp;");
      if (content.includes(xmlTag)) { content = content.replaceAll(xmlTag, safe); changed = true; }
    }
    if (changed) zip.file(path, content);
  }
  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

// ─── Helpers base64 ──────────────────────────────────────────────────────────

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return arrayBufferToBase64(await blob.arrayBuffer());
}

// ─── Gmail compose URL builder ────────────────────────────────────────────────

export function buildInstructivoGmailComposeUrl(op: InstructivoOpData, to: string): string {
  const subject = buildInstructivoSubjectInner(op);
  const ref = fmtRef(op);
  const lines = [
    `Estimado equipo,`,
    ``,
    `Se adjunta el instructivo de embarque para la operación ${ref} — ${op.cliente ?? ""}.`,
    ``,
    `OPERACIÓN`,
    `  Ref ASLI:    ${op.ref_asli ?? "-"}`,
    `  Cliente:     ${op.cliente ?? "-"}`,
    `  Naviera:     ${op.naviera ?? "-"}`,
    `  Nave:        ${op.nave ?? "-"}`,
    `  Booking:     ${op.booking ?? "-"}`,
    `  POL:         ${op.pol ?? "-"}`,
    `  POD:         ${op.pod ?? "-"}`,
    `  ETD:         ${op.etd ? fmtDate(op.etd) : "-"}`,
    op.contenedor ? `  Contenedor:  ${op.contenedor}` : "",
    op.sello      ? `  Sello:       ${op.sello}` : "",
    ``,
    op.citacion ? `Citación a planta: ${fmtDatetime(op.citacion)}` : "",
    op.inicio_stacking ? `Inicio stacking:   ${fmtDatetime(op.inicio_stacking)}` : "",
    op.fin_stacking    ? `Fin stacking:      ${fmtDatetime(op.fin_stacking)}` : "",
    ``,
    `Quedo atento.`,
  ].filter((l) => l !== undefined).join("\n");

  return (
    "https://mail.google.com/mail/?view=cm&fs=1" +
    `&to=${encodeURIComponent(to)}` +
    `&su=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(lines)}`
  );
}

// helper interno para no duplicar lógica
function buildInstructivoSubjectInner(op: InstructivoOpData): string {
  return [
    "INSTRUCTIVO DE EMBARQUE",
    op.cliente,
    op.naviera,
    op.nave,
    op.especie,
    op.temperatura,
    op.pol,
    op.pod,
  ].filter(Boolean).join(" // ");
}

// ─── Subject builder ──────────────────────────────────────────────────────────

export function buildInstructivoSubject(op: InstructivoOpData): string {
  return buildInstructivoSubjectInner(op);
}

// ─── Email body builder ───────────────────────────────────────────────────────

const tdLabel = `style="padding:4px 10px;color:#6b7280;width:190px;font-size:12px;"`;
const tdValue = `style="padding:4px 10px;font-weight:600;font-size:12px;"`;
const h3Style = `style="color:#1d4ed8;margin:20px 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;font-family:Arial,sans-serif;"`;

export function buildInstructivoEmailBody(op: InstructivoOpData, instructivoHtml: string): string {
  const ref = fmtRef(op);

  const bookingSection = op.booking_doc_url
    ? `<p style="font-size:13px;margin:8px 0;"><strong>Booking:</strong> <a href="${op.booking_doc_url}" style="color:#1d4ed8;">${op.booking ?? "Ver documento"}</a></p>`
    : `<p style="font-size:13px;margin:8px 0;"><strong>Booking N°:</strong> ${op.booking ?? "—"}</p>`;

  const hasStacking = op.inicio_stacking || op.fin_stacking || op.ingreso_stacking;
  const stackingSection = hasStacking ? `
    <h3 ${h3Style}>Stacking</h3>
    <table style="border-collapse:collapse;width:100%;max-width:500px;">
      <tr><td ${tdLabel}>Inicio Stacking</td><td ${tdValue}>${fmtDatetime(op.inicio_stacking)}</td></tr>
      <tr><td ${tdLabel}>Fin Stacking</td><td ${tdValue}>${fmtDatetime(op.fin_stacking)}</td></tr>
      <tr><td ${tdLabel}>Ingreso Stacking</td><td ${tdValue}>${fmtDatetime(op.ingreso_stacking)}</td></tr>
    </table>` : "";

  const citacionSection = op.citacion ? `
    <h3 ${h3Style}>Citación a Planta</h3>
    <table style="border-collapse:collapse;width:100%;max-width:500px;">
      <tr><td ${tdLabel}>Fecha / Hora Citación</td><td ${tdValue}>${fmtDatetime(op.citacion)}</td></tr>
    </table>` : "";

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.6;max-width:960px;">
  <p style="font-size:13px;">Estimado equipo,</p>
  <p style="font-size:13px;">Se adjunta el instructivo de embarque para la operación <strong>${ref}</strong> — <strong>${op.cliente ?? ""}</strong>.</p>
  ${bookingSection}
  ${stackingSection}
  ${citacionSection}
  <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;" />
  <h3 ${h3Style}>Instructivo de Embarque</h3>
  <div style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-top:8px;">
    ${instructivoHtml}
  </div>
  <p style="margin-top:28px;font-size:13px;">Quedo atento.</p>
</div>`;
}

// ─── Gmail draft sender ───────────────────────────────────────────────────────

export async function sendInstructivoDraft(params: {
  to: string;
  subject: string;
  htmlBody: string;
  attachments?: EmailAttachment[];
}): Promise<{ success: boolean; draftUrl?: string; error?: string }> {
  const scriptUrl = (import.meta.env.PUBLIC_GMAIL_DRAFT_SCRIPT_URL ?? "") as string;
  if (!scriptUrl) {
    return { success: false, error: "No se ha configurado PUBLIC_GMAIL_DRAFT_SCRIPT_URL en el entorno." };
  }
  try {
    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(params),
    });
    if (!res.ok) return { success: false, error: `Error HTTP ${res.status} del servidor de correo.` };
    const data = await res.json() as { success?: boolean; draftUrl?: string; error?: string };
    if (!data.success) return { success: false, error: data.error ?? "Error desconocido del servidor de correo." };
    return { success: true, draftUrl: data.draftUrl };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error de red al contactar el servidor de correo." };
  }
}
