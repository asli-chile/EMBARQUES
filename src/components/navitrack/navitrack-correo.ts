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

/**
 * Aviso de que alguien actualizó las posiciones a mano.
 *
 * El valor de este correo no es informar, es dejar rastro: gastar créditos a
 * mano es una decisión con costo, y toda decisión con costo tiene que quedar
 * registrada en algún lado que no sea la base de datos. Por eso lleva quién,
 * cuándo, cuánto costó y cuánto queda.
 *
 * Tono neutro a propósito: no es una alerta ni un reproche, es un registro.
 */
export function correoActualizacionManual(datos: {
  usuario: string;
  email?: string | null;
  naves: string[];
  creditos: number;
  errores: number;
  /** Saldo del proveedor. Null si no se pudo consultar; no se inventa. */
  saldoAntes: number | null;
  saldoDespues: number | null;
  /** Actualización anterior a esta. Null si es la primera de todas. */
  ultima?: { at: string; origen: string } | null;
}): { asunto: string; cuerpo: string } {
  const asunto = `Actualización manual de posiciones · ${datos.creditos} ${
    datos.creditos === 1 ? "consulta" : "consultas"
  }`;

  /** Todo en hora de Chile: quien lee el correo está acá, no en UTC. */
  const enChile = (d: Date) =>
    d.toLocaleString("es-CL", {
      timeZone: "America/Santiago",
      dateStyle: "long",
      timeStyle: "short",
    });

  const cuando = enChile(new Date());

  const COMO: Record<string, string> = {
    cron: "revisión automática",
    manual: "actualización manual",
    pantalla: "al abrir un embarque",
  };

  let anterior = "Es la primera actualización registrada";
  if (datos.ultima?.at) {
    const d = new Date(datos.ultima.at);
    if (!Number.isNaN(d.getTime())) {
      const horas = (Date.now() - d.getTime()) / 3_600_000;
      const hace =
        horas < 1
          ? "hace menos de una hora"
          : horas < 24
            ? `hace ${Math.round(horas)} h`
            : `hace ${Math.round(horas / 24)} días`;
      anterior = `${enChile(d)} · ${COMO[datos.ultima.origen] ?? datos.ultima.origen} · ${hace}`;
    }
  }

  const lista = datos.naves.length
    ? datos.naves.map((n) => `<li style="padding:2px 0">${esc(n)}</li>`).join("")
    : `<li style="padding:2px 0;color:${SUAVE}">Ninguna</li>`;

  const saldoTexto = (v: number | null | undefined) => (v == null ? "sin dato" : String(v));

  /*
   * Aviso de saldo bajo.
   *
   * Sin plan contratado conocido no hay porcentaje que mostrar, así que se usa
   * un umbral absoluto: por debajo de 30 consultas conviene reponer antes de
   * que el chequeo diario se quede sin con qué correr.
   */
  const saldoBajo = datos.saldoDespues != null && datos.saldoDespues < 30;

  const cuerpo = `
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(datos.usuario)} gastó ${datos.creditos} consultas. Quedan ${datos.saldoDespues}.</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:${CREMA};padding:24px 12px;font-family:'Segoe UI',Arial,Helvetica,sans-serif">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ${BORDE}">

        <tr>
          <td style="background:${NAVY};padding:20px 28px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:.3px">NaviTrack</td>
                <td align="right" style="color:#8FD8D8;font-size:11px;letter-spacing:1.2px;text-transform:uppercase">Registro de consumo</td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:26px 28px 0">
            <div style="color:${NAVY};font-size:19px;font-weight:700;line-height:1.35">
              Se actualizaron las posiciones manualmente
            </div>
            <p style="margin:8px 0 0;color:${TEXTO};font-size:14px;line-height:1.6">
              <strong>${esc(datos.usuario)}</strong>${datos.email ? ` (${esc(datos.email)})` : ""}
              ejecutó una actualización desde el panel de Rastreo.
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:22px 28px 0">
            <table width="100%" cellpadding="0" cellspacing="0">
${fila("Esta actualización", cuando, true)}
${fila("Actualización anterior", anterior)}
${fila("Consultas usadas", String(datos.creditos), true)}
${fila("Saldo antes", saldoTexto(datos.saldoAntes))}
${fila("Saldo después", saldoTexto(datos.saldoDespues), true)}
${datos.errores > 0 ? fila("Naves sin respuesta", String(datos.errores)) : ""}
            </table>
          </td>
        </tr>

${
  saldoBajo
    ? `        <tr>
          <td style="padding:18px 28px 0">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:${AMBAR_FONDO};border-left:4px solid ${AMBAR};border-radius:0 10px 10px 0">
              <tr>
                <td style="padding:13px 16px;color:${TEXTO};font-size:13px;line-height:1.5">
                  <strong style="color:${AMBAR}">Saldo bajo.</strong> Quedan ${datos.saldoDespues} consultas.
                  Conviene reponer antes de que la revisión diaria se quede sin con qué correr.
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    : ""
}

        <tr>
          <td style="padding:22px 28px 0">
            <div style="color:${SUAVE};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding-bottom:6px">Naves consultadas</div>
            <ul style="margin:0;padding-left:18px;color:${TEXTO};font-size:13.5px;line-height:1.55">${lista}</ul>
          </td>
        </tr>

        <tr>
          <td style="padding:26px 28px 24px">
            <div style="border-top:1px solid ${BORDE};padding-top:14px;color:${SUAVE};font-size:12px;line-height:1.55">
              Registro automático · ASLI<br>
              Las posiciones se actualizan solas una vez al día. Esta consulta fue adicional y a pedido.
            </div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>`.trim();

  return { asunto, cuerpo };
}

/**
 * Aviso de cambio de nave por transbordo.
 *
 * Lo importante de este correo no es la buena noticia sino la mala: **qué carga
 * quedó sin seguir**. Cuando el buque siguiente no aparece en el proveedor, esa
 * caja deja de tener posición, y si nadie lo dice el sistema se ve exactamente
 * igual que cuando todo funciona. Un hueco silencioso es el peor resultado
 * posible en una herramienta de seguimiento.
 *
 * Por eso lo que no se pudo resolver va primero, en ámbar, y lo que sí se
 * resolvió va después como confirmación.
 */
export function correoSeguimiento(datos: {
  traspasos: { desde: string; hacia: string; referencia: string }[];
  resueltas: { nombre: string; imo: string | null }[];
  sinSeguimiento: { nombre: string; motivo: string | null; reemplazaA: string | null }[];
}): { asunto: string; cuerpo: string } | null {
  if (!datos.traspasos.length && !datos.sinSeguimiento.length) return null;

  const hayProblema = datos.sinSeguimiento.length > 0;
  const asunto = hayProblema
    ? `Carga sin seguimiento tras un transbordo · ${datos.sinSeguimiento.length} ${
        datos.sinSeguimiento.length === 1 ? "nave" : "naves"
      }`
    : `Cambio de nave por transbordo · ${datos.traspasos.length}`;

  const aviso = hayProblema
    ? `
        <tr>
          <td style="padding:26px 28px 0">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:${AMBAR_FONDO};border-left:4px solid ${AMBAR};border-radius:0 10px 10px 0">
              <tr>
                <td style="padding:16px 18px">
                  <div style="color:${AMBAR};font-size:11px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;padding-bottom:5px">No se está siguiendo</div>
                  <div style="color:${NAVY};font-size:17px;font-weight:700;line-height:1.4">
                    ${datos.sinSeguimiento
                      .map(
                        (n) =>
                          `${esc(n.nombre)}${n.reemplazaA ? `, que reemplazó a ${esc(n.reemplazaA)}` : ""}`,
                      )
                      .join("<br>")}
                  </div>
                  <div style="color:${TEXTO};font-size:13px;line-height:1.55;padding-top:8px">
                    ${datos.sinSeguimiento
                      .map((n) => `${esc(n.nombre)}: ${esc(n.motivo ?? "no se pudo identificar")}`)
                      .join("<br>")}
                  </div>
                  <div style="color:${TEXTO};font-size:13px;line-height:1.55;padding-top:10px">
                    Esa carga <strong>queda sin posición</strong> hasta que la nave tenga IMO.
                    Se puede cargar a mano en Configuración › Naves.
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    : "";

  const cambios = datos.traspasos.length
    ? `
        <tr>
          <td style="padding:24px 28px 0">
            <div style="color:${SUAVE};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding-bottom:8px">Cambios de nave</div>
            <table width="100%" cellpadding="0" cellspacing="0">
${datos.traspasos
  .map(
    (t) => `              <tr>
                <td style="padding:8px 0;border-bottom:1px solid ${BORDE};font-size:13.5px;color:${TEXTO}">
                  <strong style="color:${NAVY}">${esc(t.referencia)}</strong><br>
                  <span style="color:${SUAVE}">${esc(t.desde)}</span>
                  <span style="color:${SUAVE}"> → </span>
                  <strong style="color:${NAVY}">${esc(t.hacia)}</strong>
                </td>
              </tr>`,
  )
  .join("\n")}
            </table>
            <p style="margin:10px 0 0;color:${SUAVE};font-size:12px;line-height:1.5">
              Se dejó de consultar la nave anterior: ya no lleva esa carga y su posición
              no dice nada del embarque.
            </p>
          </td>
        </tr>`
    : "";

  const ok = datos.resueltas.length
    ? `
        <tr>
          <td style="padding:20px 28px 0">
            <div style="color:${SUAVE};font-size:12px;line-height:1.55">
              Se identificaron y ya se están siguiendo:
              ${datos.resueltas
                .map((n) => `<strong style="color:${NAVY}">${esc(n.nombre)}</strong>${n.imo ? ` (IMO ${esc(n.imo)})` : ""}`)
                .join(", ")}.
            </div>
          </td>
        </tr>`
    : "";

  const cuerpo = `
<table width="100%" cellpadding="0" cellspacing="0" style="background:${CREMA};padding:24px 12px;font-family:'Segoe UI',Arial,Helvetica,sans-serif">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ${BORDE}">
        <tr>
          <td style="background:${NAVY};padding:20px 28px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:.3px">NaviTrack</td>
                <td align="right" style="color:#8FD8D8;font-size:11px;letter-spacing:1.2px;text-transform:uppercase">Transbordo</td>
              </tr>
            </table>
          </td>
        </tr>
${aviso}
${cambios}
${ok}
        <tr>
          <td style="padding:26px 28px 24px">
            <div style="border-top:1px solid ${BORDE};padding-top:14px;color:${SUAVE};font-size:12px;line-height:1.55">
              Aviso automático de seguimiento · ASLI<br>
              El seguimiento sigue a la carga: al transbordar, se deja de consultar el buque anterior.
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();

  return { asunto, cuerpo };
}
