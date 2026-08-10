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
  ventilacion?: number | null;
  incoterm?: string | null;
  forma_pago?: string | null;
  observaciones?: string | null;
  transporte?: string | null;
  tramo?: string | null;
  deposito?: string | null;
  moneda?: string | null;
  viaje?: string | null;
  dus?: string | null;
  sps?: string | null;
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

/** Fila de consignatarios usada para enriquecer consignee / notify */
export type InstructivoConsignatario = {
  nombre: string;
  consignatario?: string | null;
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
  notify_uscc: string | null;
  notify_email: string | null;
  notify_mobile: string | null;
  notify_zip: string | null;
  destino: string | null;
};

/** Datos opcionales del exportador / cliente (cuando existan en catálogo) */
export type InstructivoClienteExtra = {
  nombre?: string | null;
  rut?: string | null;
  direccion?: string | null;
};

export type InstructivoTagExtras = {
  consignatario?: InstructivoConsignatario | null;
  cliente?: InstructivoClienteExtra | null;
};

/** Elige el consignatario que mejor coincide con la operación (cliente + nombre). */
export function pickConsignatarioForOperacion(
  rows: InstructivoConsignatario[] | null | undefined,
  op: Pick<InstructivoOpData, "consignatario">,
): InstructivoConsignatario | null {
  if (!rows?.length) return null;
  const want = (op.consignatario ?? "").trim().toLowerCase();
  if (!want) return rows[0] ?? null;

  const exact = rows.find(
    (r) =>
      r.nombre?.toLowerCase() === want ||
      (r.consignee_company && r.consignee_company.toLowerCase() === want),
  );
  if (exact) return exact;

  return (
    rows.find(
      (r) =>
        r.nombre?.toLowerCase().includes(want) ||
        (r.consignee_company && r.consignee_company.toLowerCase().includes(want)),
    ) ?? rows[0] ?? null
  );
}

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

export function buildInstructivoTagValues(
  op: InstructivoOpData,
  extras?: InstructivoTagExtras,
): Record<string, string> {
  const pesoNeto  = op.peso_neto   != null ? `${op.peso_neto.toLocaleString("es-CL")} kg`  : "";
  const pesoBruto = op.peso_bruto  != null ? `${op.peso_bruto.toLocaleString("es-CL")} kg` : "";
  const today     = format(new Date(), "dd/MM/yyyy");
  const cons = extras?.consignatario ?? null;
  const cli  = extras?.cliente ?? null;

  const consigneeName =
    cons?.consignee_company?.trim() ||
    cons?.nombre?.trim() ||
    op.consignatario?.trim() ||
    "";
  const consigneeAddress = cons?.consignee_address?.trim() || "";
  const destinoFinal =
    cons?.destino?.trim() ||
    op.pais?.trim() ||
    op.pod?.trim() ||
    "";

  return {
    // ── Referencia / documento ────────────────────────────────────────────────
    "{{ref_asli}}":                  fmtRef(op),
    "{{fecha}}":                     today,
    "{{fecha_emision}}":             today,
    "{{numero_documento}}":          "",
    "{{numero_embarque}}":           op.booking          ?? "",
    "{{csp}}":                       "",
    "{{csg}}":                       op.sps              ?? "",
    "{{dus}}":                       op.dus              ?? "",
    "{{reserva}}":                   "",
    "{{tipo_documento}}":            "",
    "{{tipo_bl}}":                   "",
    "{{leyenda_bl}}":                "",

    // ── Empresa exportadora ───────────────────────────────────────────────────
    "{{empresa_nombre}}":            "Asesorías y Servicios Logísticos Integrales Ltda.",
    "{{empresa_rut}}":               "76.XXX.XXX-X",
    "{{empresa_giro}}":              "Agencia de Aduana y Servicios Logísticos",
    "{{empresa_direccion}}":         "Valparaíso, Chile",
    "{{exportador}}":                (cli?.nombre?.trim() || op.cliente) ?? "",

    // ── Cliente ───────────────────────────────────────────────────────────────
    "{{cliente_nombre}}":            (cli?.nombre?.trim() || op.cliente) ?? "",
    "{{cliente_rut}}":               cli?.rut?.trim() || "",
    "{{cliente_direccion}}":         cli?.direccion?.trim() || "",

    // ── Operación / naviera ───────────────────────────────────────────────────
    "{{booking}}":                   op.booking          ?? "",
    "{{naviera}}":                   op.naviera          ?? "",
    "{{nave}}":                      op.nave             ?? "",
    "{{viaje}}":                     op.viaje            ?? "",
    "{{numero_viaje}}":              op.viaje            ?? "",
    "{{contenedor}}":                op.contenedor       ?? "",
    "{{contenedor_awb}}":            op.contenedor       ?? "",
    "{{sello}}":                     op.sello            ?? "",
    "{{tara}}":                      op.tara        != null ? `${op.tara} kg` : "",
    "{{tipo_contenedor}}":           op.tipo_unidad      ?? "",
    "{{incoterm}}":                  op.incoterm         ?? "",
    "{{modalidad_venta}}":           op.incoterm         ?? "",
    "{{clausula_venta}}":            op.incoterm         ?? "",
    "{{tipo_flete}}":                "",
    "{{forma_pago}}":                op.forma_pago       ?? "",
    "{{plazo_pago}}":                "",
    "{{consignatario}}":             consigneeName || (op.consignatario ?? ""),
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
    "{{destino_final}}":             destinoFinal,
    "{{pais_destino}}":              op.pais             ?? cons?.destino ?? "",
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
    "{{ventilacion}}":               op.ventilacion != null ? String(op.ventilacion) : "",
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
    "{{planta_despacho}}":           op.planta_presentacion || op.tramo || "",
    "{{planta_consolidacion}}":      op.planta_presentacion ?? "",
    "{{inspeccion_sag}}":            "",
    "{{transporte_terrestre}}":      op.transporte       ?? "",

    // ── Consignee ─────────────────────────────────────────────────────────────
    "{{consignee}}":                 consigneeName,
    "{{consignee_company}}":         consigneeName,
    "{{consignee_direccion}}":       consigneeAddress,
    "{{consignee_address}}":         consigneeAddress,
    "{{consignee_contacto}}":        cons?.consignee_attn?.trim() || "",
    "{{consignee_attn}}":            cons?.consignee_attn?.trim() || "",
    "{{consignee_email}}":           cons?.consignee_email?.trim() || "",
    "{{consignee_telefono}}":        cons?.consignee_mobile?.trim() || "",
    "{{consignee_mobile}}":          cons?.consignee_mobile?.trim() || "",
    "{{consignee_usci}}":            cons?.consignee_uscc?.trim() || "",
    "{{consignee_uscc}}":            cons?.consignee_uscc?.trim() || "",
    "{{consignee_zip}}":             cons?.consignee_zip?.trim() || "",
    "{{consignee_postal_code}}":     cons?.consignee_zip?.trim() || "",
    "{{consignee_pais}}":            op.pais ?? cons?.destino ?? "",
    "{{notify}}":                    cons?.notify_company?.trim() || "",
    "{{notify_company}}":            cons?.notify_company?.trim() || "",
    "{{notify_address}}":            cons?.notify_address?.trim() || "",
    "{{notify_attn}}":               cons?.notify_attn?.trim() || "",
    "{{notify_uscc}}":               cons?.notify_uscc?.trim() || "",
    "{{notify_mobile}}":             cons?.notify_mobile?.trim() || "",
    "{{notify_email}}":              cons?.notify_email?.trim() || "",
    "{{notify_zip}}":                cons?.notify_zip?.trim() || "",

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

// ─── Plain text email body ────────────────────────────────────────────────────

export function buildInstructivoPlainBody(op: InstructivoOpData): string {
  const ref = fmtRef(op);
  return [
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
    op.citacion        ? `Citación a planta: ${fmtDatetime(op.citacion)}` : "",
    op.inicio_stacking ? `Inicio stacking:   ${fmtDatetime(op.inicio_stacking)}` : "",
    op.fin_stacking    ? `Fin stacking:      ${fmtDatetime(op.fin_stacking)}` : "",
    ``,
    `Quedo atento.`,
  ].filter(Boolean).join("\n");
}

// kept for backwards compat — now unused internally
export function buildInstructivoGmailComposeUrl(_op: InstructivoOpData, _to: string): string {
  return "";
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
