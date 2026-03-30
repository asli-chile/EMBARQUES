import { brand } from "@/lib/brand";

/** Enlaces oficiales ASLI (misma fuente que Footer web). */
export const ASLI_SOCIAL = {
  instagram: "https://www.instagram.com/asli_chile",
  linkedin: "https://www.linkedin.com/company/aslichile",
  whatsapp: "https://api.whatsapp.com/send/?phone=56968394225",
} as const;

/**
 * Origen público para `<img src=".../img/email-social/...">`.
 * `PUBLIC_SITE_URL` en producción; en el navegador cae a `window.location.origin`.
 */
export function getEmailPublicOrigin(): string {
  if (typeof import.meta !== "undefined" && import.meta.env?.PUBLIC_SITE_URL) {
    return String(import.meta.env.PUBLIC_SITE_URL).replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Convierte párrafos separados por líneas en blanco a bloques HTML simples. */
export function plainMessageToHtml(message: string): string {
  const blocks = message.trim().split(/\n\s*\n/).filter(Boolean);
  if (blocks.length === 0) return "";
  return blocks
    .map((block) => {
      const lines = block.split("\n").map((l) => esc(l.trimEnd())).join("<br>\r\n");
      return `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#333;">${lines}</p>`;
    })
    .join("");
}

export function buildSocialBlockHtml(origin: string): string {
  const base = origin.replace(/\/$/, "");
  const igIcon = base ? `${base}/img/email-social/instagram.png` : "";
  const liIcon = base ? `${base}/img/email-social/linkedin.png` : "";
  const waIcon = base ? `${base}/img/email-social/whatsapp.png` : "";

  const btn = (
    href: string,
    bg: string,
    label: string,
    iconUrl: string,
  ) => {
    const imgPart = iconUrl
      ? `<img src="${esc(iconUrl)}" width="22" height="22" alt="" style="vertical-align:middle;border:0;display:inline-block;margin-right:8px;">`
      : "";
    return `<td style="padding:0 8px 10px 0;vertical-align:middle;">
<a href="${esc(href)}" style="text-decoration:none;display:inline-block;background:${bg};border-radius:8px;padding:10px 14px;font-size:14px;font-weight:bold;color:#fff;">
${imgPart}<span style="vertical-align:middle;color:#fff;">${esc(label)}</span>
</a></td>`;
  };

  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
  <tr>
    <td style="padding:0 0 8px;font-size:13px;color:#555;">Síguenos o escríbenos:</td>
  </tr>
  <tr>
    <td>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          ${btn(ASLI_SOCIAL.instagram, "#E4405F", "Instagram", igIcon)}
          ${btn(ASLI_SOCIAL.linkedin, "#0A66C2", "LinkedIn", liIcon)}
          ${btn(ASLI_SOCIAL.whatsapp, "#25D366", "WhatsApp", waIcon)}
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding-top:6px;font-size:12px;color:#888;">${esc(brand.emailFooterLine)}</td>
  </tr>
</table>`.trim();
}

export function buildInformativeEmailHtml(params: {
  messageHtml: string;
  includeSocial: boolean;
  origin: string;
}): string {
  const main = `<div style="font-family:Arial,Helvetica,sans-serif;">${params.messageHtml}</div>`;
  const social = params.includeSocial ? buildSocialBlockHtml(params.origin) : "";
  return `${main}${social}`;
}
