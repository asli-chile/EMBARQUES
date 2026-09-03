import { footerLogoUrl, footerMarkUrl, iconAbsoluteUrl } from "./assets";
import { mergeNombre } from "./merge";
import type { InformativoFila, InformativoPayload } from "./types";

const NAVY = "#11224E";
const NAVY_FOOTER = "#0B1A3D";
const RED = "#C8102E";
const TEXT = "#1a1a1a";
const MUTED = "#4a4a4a";
const LINE = "#E5E7EB";
const BG = "#f1f1f1";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Convierte `**negrita**` a <strong> tras escapar HTML. */
function formatInline(text: string): string {
  const escaped = escapeHtml(text);
  return escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function renderFila(fila: InformativoFila, isLast: boolean, preferPublic: boolean): string {
  const iconSrc = iconAbsoluteUrl(fila.icon, fila.iconUrl, preferPublic);
  const border = isLast ? "" : `border-bottom:1px solid ${LINE};`;
  return `
    <tr>
      <td style="padding:14px 0;${border}">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="48" valign="top" style="width:48px;padding-right:12px;">
              <img src="${escapeHtml(iconSrc)}" width="36" height="36" alt="" style="display:block;border:0;width:36px;height:36px;" />
            </td>
            <td valign="top" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.45;color:${TEXT};">
              <span style="font-weight:700;color:${NAVY};text-transform:uppercase;letter-spacing:0.02em;">${escapeHtml(fila.label)}${fila.label.trim().endsWith(":") ? "" : ":"}</span>
              <span style="color:${MUTED};"> ${formatInline(fila.value)}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export type RenderInformativoOptions = {
  /** Nombre para preview / envío. Default: "Nombre". */
  nombre?: string;
  /**
   * Si true, fuerza URLs de assets en dominio público (Gmail).
   * En preview local dejar false para cargar íconos desde el origin actual.
   */
  preferPublicAssets?: boolean;
};

/**
 * HTML table-based compatible con Gmail/Outlook.
 * El resultado empieza con `<` para que send-email lo trate como HTML.
 */
export function renderInformativoHtml(
  payload: InformativoPayload,
  options: RenderInformativoOptions = {},
): string {
  const nombre = options.nombre?.trim() || "Nombre";
  const preferPublic = options.preferPublicAssets === true;
  const saludo = formatInline(mergeNombre(payload.saludo, nombre));
  const parrafos = payload.parrafos
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${TEXT};">${formatInline(mergeNombre(p, nombre))}</p>`,
    )
    .join("");

  const filasHtml = payload.filas
    .map((f, i) =>
      renderFila(
        {
          ...f,
          label: mergeNombre(f.label, nombre),
          value: mergeNombre(f.value, nombre),
        },
        i === payload.filas.length - 1,
        preferPublic,
      ),
    )
    .join("");

  const cierre = payload.cierre.trim()
    ? `<p style="margin:20px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${TEXT};">${formatInline(mergeNombre(payload.cierre, nombre))}</p>`
    : "";

  const hero = payload.imagenHero?.trim()
    ? `<tr><td style="padding:0;"><img src="${escapeHtml(payload.imagenHero.trim())}" width="600" alt="" style="display:block;width:100%;max-width:600px;height:auto;border:0;" /></td></tr>`
    : "";

  const logo = footerLogoUrl(preferPublic);
  const mark = footerMarkUrl(preferPublic);

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Informativo ASLI</title>
</head>
<body style="margin:0;padding:0;background-color:${BG};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BG};">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;background-color:#ffffff;">
        ${hero}
        <tr>
          <td style="padding:32px 36px 8px 36px;">
            <p style="margin:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${TEXT};">${saludo}</p>
            ${parrafos}
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 4px 0;">
              ${filasHtml}
            </table>
            ${cierre}
            <p style="margin:28px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:${TEXT};">
              Saludos cordiales,<br />
              <strong style="color:${NAVY};">${escapeHtml(payload.firmaNombre)}</strong>
              ${payload.firmaCargo.trim() ? `<span style="color:${MUTED};"> ${escapeHtml(payload.firmaCargo)}</span>` : ""}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0;background-color:${NAVY_FOOTER};">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding:22px 28px;vertical-align:middle;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td width="42%" valign="middle" style="padding-right:16px;">
                        <img src="${escapeHtml(logo)}" width="140" alt="ASLI" style="display:block;border:0;max-width:140px;height:auto;" />
                        <p style="margin:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:0.12em;color:#ffffff;text-transform:uppercase;">Logística y Comercio Exterior</p>
                      </td>
                      <td width="4" valign="middle" style="width:4px;background-color:${RED};">&nbsp;</td>
                      <td width="54%" valign="middle" style="padding-left:16px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td valign="middle" style="padding-right:10px;">
                              <img src="${escapeHtml(mark)}" width="22" height="22" alt="" style="display:block;border:0;width:22px;height:22px;" />
                            </td>
                            <td valign="middle" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.4;color:#ffffff;text-transform:uppercase;letter-spacing:0.04em;">
                              Longitudinal Sur Km 186,<br />Curicó, Chile
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
