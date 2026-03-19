import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FormatoInstructivo = {
  id: string;
  nombre: string;
  tipo: string;
  template_type: "html" | "excel" | null;
  descripcion: string | null;
  contenido_html: string | null;
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
  inicio_stacking?: string | null;
  fin_stacking?: string | null;
  ingreso_stacking?: string | null;
  citacion?: string | null;
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
  return {
    "{{ref_asli}}":            fmtRef(op),
    "{{cliente_nombre}}":      op.cliente          ?? "",
    "{{consignatario}}":       op.consignatario    ?? "",
    "{{booking}}":             op.booking          ?? "",
    "{{contenedor}}":          op.contenedor       ?? "",
    "{{naviera}}":             op.naviera          ?? "",
    "{{nave}}":                op.nave             ?? "",
    "{{sello}}":               op.sello            ?? "",
    "{{incoterm}}":            op.incoterm         ?? "",
    "{{forma_pago}}":          op.forma_pago       ?? "",
    "{{puerto_origen}}":       op.pol              ?? "",
    "{{puerto_destino}}":      op.pod              ?? "",
    "{{pais_destino}}":        op.pais             ?? "",
    "{{etd}}":                 fmtDate(op.etd),
    "{{eta}}":                 fmtDate(op.eta),
    "{{fecha_emision}}":       format(new Date(), "dd/MM/yyyy"),
    "{{descripcion_carga}}":   op.especie          ?? "",
    "{{temperatura}}":         op.temperatura      ?? "",
    "{{ventilacion}}":         op.ventilacion      ?? "",
    "{{peso_bruto}}":          op.peso_bruto  != null ? `${op.peso_bruto.toLocaleString("es-CL")} kg` : "",
    "{{peso_neto}}":           op.peso_neto   != null ? `${op.peso_neto.toLocaleString("es-CL")} kg` : "",
    "{{tara}}":                op.tara        != null ? `${op.tara} kg` : "",
    "{{cantidad_bultos}}":     op.pallets     != null ? String(op.pallets) : "",
    "{{unidad_medida}}":       op.tipo_unidad      ?? "",
    "{{observaciones}}":       op.observaciones    ?? "",
    "{{moneda}}":              op.moneda           ?? "USD",
    "{{empresa_transporte}}":  op.transporte       ?? "",
    "{{tramo}}":               op.tramo            ?? "",
    "{{deposito}}":            op.deposito         ?? "",
    "{{citacion}}":            fmtDatetime(op.citacion),
    "{{inicio_stacking}}":     fmtDatetime(op.inicio_stacking),
    "{{fin_stacking}}":        fmtDatetime(op.fin_stacking),
    "{{ingreso_stacking}}":    fmtDatetime(op.ingreso_stacking),
    // ASLI datos estáticos
    "{{asli_nombre}}":         "Asesorías y Servicios Logísticos Integrales Ltda.",
    "{{asli_rut}}":            "76.XXX.XXX-X",
    "{{asli_direccion}}":      "Valparaíso, Chile",
    "{{asli_telefono}}":       "+56 X XXXX XXXX",
    "{{asli_email}}":          "contacto@asli.cl",
    // Campos vacíos fillable
    "{{cliente_rut}}":         "",
    "{{cliente_direccion}}":   "",
    "{{tipo_contenedor}}":     "",
    "{{viaje}}":               "",
    "{{hs_code}}":             "",
    "{{numero_documento}}":    "",
    "{{monto_total}}":         "",
    "{{precio_unitario}}":     "",
    "{{concepto}}":            "",
  };
}

// ─── HTML generation ──────────────────────────────────────────────────────────

export function generateInstructivoHtml(
  formato: FormatoInstructivo,
  tagValues: Record<string, string>,
): string {
  if (formato.template_type === "excel") {
    throw new Error("Formato Excel no soportado para envío automático. Configure un formato HTML en Formatos de Documentos.");
  }
  if (!formato.contenido_html) {
    throw new Error("El formato seleccionado no tiene contenido HTML.");
  }
  let html = formato.contenido_html;
  for (const [tag, val] of Object.entries(tagValues)) {
    html = html.replaceAll(tag, val);
  }
  return html;
}

// ─── Subject builder ──────────────────────────────────────────────────────────

export function buildInstructivoSubject(op: InstructivoOpData): string {
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
