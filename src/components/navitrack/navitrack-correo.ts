/**
 * Correos del chequeo diario de NaviTrack.
 *
 * Módulo puro: sin React, sin acceso a red, sin `import.meta.env`. Así el aviso
 * se puede previsualizar y probar sin gastar un crédito ni mandar un correo.
 *
 * Dos reglas mandan sobre el diseño:
 *
 * 1. **Lo lee un ejecutivo, no un técnico.** Nada de IDs internos, endpoints,
 *    créditos del proveedor ni nombres de tablas.
 * 2. **Es una señal, no un hecho.** El destino del AIS lo escribe la tripulación
 *    a mano. Por eso el aviso va en ámbar y pide verificar, no alarma en rojo.
 *
 * HTML a la antigua a propósito: tablas, anchos fijos y estilos en línea. Outlook
 * no entiende flexbox ni grid, y un correo que se desarma no se lee.
 */

/** Paleta corporativa. Los mismos valores que `tracking-brand` en la app. */
const NAVY = "#11224E";
const TEAL = "#007A7B";
const CREMA = "#F6EEE8";
const AMBAR = "#B26A00";
const AMBAR_FONDO = "#FDF3E2";
const TEXTO = "#22303F";
const SUAVE = "#5D7385";
const BORDE = "#E3E8EE";

export type AvisoDesvio = {
  /** Contenedor si lo hay; si no, la referencia. Es como el operador lo reconoce. */
  contenedor: string;
  referencia: string;
  cliente: string;
  nave: string;
  naviera?: string | null;
  pol?: string | null;
  /** Puerto de descarga comprometido con el cliente. */
  pod: string;
  /** ETA comprometida, ya formateada para mostrar. */
  eta: string;
  /** Destino que declara el buque por AIS. */
  destinoAis: string;
  /** Enlace a NaviTrack. Sin él, el correo va sin botón. */
  enlace?: string | null;
};

/**
 * Escapa texto antes de incrustarlo.
 *
 * No es paranoia: `destinoAis` y el nombre del buque vienen del proveedor AIS,
 * que a su vez los recibe tipeados a mano desde el puente. Un `&` o un `<`
 * sueltos rompen el correo.
 */
function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Celda de dato de la ficha. */
function fila(etiqueta: string, valor: string, fuerte = false): string {
  const v = valor.trim() ? esc(valor) : "—";
  const peso = fuerte ? `font-weight:700;color:${NAVY}` : `color:${TEXTO}`;
  return `
          <tr>
            <td style="padding:9px 0;border-bottom:1px solid ${BORDE};color:${SUAVE};font-size:13px;white-space:nowrap">${esc(etiqueta)}</td>
            <td style="padding:9px 0 9px 16px;border-bottom:1px solid ${BORDE};font-size:14px;text-align:right;${peso}">${v}</td>
          </tr>`;
}

/**
 * Aviso de posible cambio de ruta.
 *
 * Devuelve asunto y cuerpo listos para `send-email`. El asunto lleva el
 * contenedor primero porque es lo que se busca en la bandeja.
 */
export function correoDesvio(op: AvisoDesvio): { asunto: string; cuerpo: string } {
  const identifica = op.contenedor?.trim() || op.referencia?.trim() || "Embarque";
  const asunto = `Posible cambio de ruta · ${identifica} · ${op.nave}`;

  const boton = op.enlace
    ? `
            <tr>
              <td style="padding:26px 0 4px">
                <a href="${esc(op.enlace)}" style="display:inline-block;background:${TEAL};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 26px;border-radius:8px">Ver el embarque en NaviTrack</a>
              </td>
            </tr>`
    : "";

  const cuerpo = `
<div style="display:none;max-height:0;overflow:hidden;opacity:0">El buque declara ${esc(op.destinoAis)} y el destino comprometido es ${esc(op.pod)}.</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:${CREMA};padding:24px 12px;font-family:'Segoe UI',Arial,Helvetica,sans-serif">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ${BORDE}">

        <tr>
          <td style="background:${NAVY};padding:20px 28px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:.3px">NaviTrack</td>
                <td align="right" style="color:#8FD8D8;font-size:11px;letter-spacing:1.2px;text-transform:uppercase">Seguimiento marítimo</td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:28px 28px 0">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:${AMBAR_FONDO};border-left:4px solid ${AMBAR};border-radius:0 10px 10px 0">
              <tr>
                <td style="padding:16px 18px">
                  <div style="color:${AMBAR};font-size:11px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;padding-bottom:5px">Requiere verificación</div>
                  <div style="color:${NAVY};font-size:19px;font-weight:700;line-height:1.35">El buque declara un destino distinto al comprometido</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 28px 0">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="46%" valign="top" style="padding:14px 16px;background:#F4F7F9;border-radius:10px">
                  <div style="color:${SUAVE};font-size:11px;letter-spacing:.9px;text-transform:uppercase;padding-bottom:6px">Comprometido</div>
                  <div style="color:${NAVY};font-size:17px;font-weight:700">${esc(op.pod) || "—"}</div>
                </td>
                <td width="8%" align="center" valign="middle" style="color:${SUAVE};font-size:18px">→</td>
                <td width="46%" valign="top" style="padding:14px 16px;background:${AMBAR_FONDO};border-radius:10px">
                  <div style="color:${AMBAR};font-size:11px;letter-spacing:.9px;text-transform:uppercase;padding-bottom:6px">Declara el buque</div>
                  <div style="color:${NAVY};font-size:17px;font-weight:700">${esc(op.destinoAis)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:26px 28px 0">
            <table width="100%" cellpadding="0" cellspacing="0">
${fila("Embarque", identifica, true)}
${fila("Cliente", op.cliente, true)}
${fila("Buque", op.naviera ? `${op.nave} · ${op.naviera}` : op.nave)}
${fila("Ruta", op.pol ? `${op.pol} → ${op.pod}` : op.pod)}
${fila("Llegada estimada", op.eta)}
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:22px 28px 0;color:${TEXTO};font-size:14px;line-height:1.65">
            <p style="margin:0">Puede tratarse de un <strong>transbordo</strong>, de una escala intermedia, o
            simplemente de un destino mal escrito a bordo, que es frecuente.
            Conviene confirmarlo con la naviera antes de informar al cliente.</p>
          </td>
        </tr>

        <tr>
          <td style="padding:0 28px">
            <table cellpadding="0" cellspacing="0">${boton}</table>
          </td>
        </tr>

        <tr>
          <td style="padding:26px 28px 24px">
            <div style="border-top:1px solid ${BORDE};padding-top:14px;color:${SUAVE};font-size:12px;line-height:1.55">
              Aviso automático de seguimiento · ASLI<br>
              Se envía una sola vez por cada destino declarado; si el buque informa otro, recibirás un nuevo aviso.
            </div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>`.trim();

  return { asunto, cuerpo };
}
