/**
 * Arma el HTML del correo a partir de la pieza.
 *
 * La pieza viaja como IMAGEN, no como HTML replicado. No es una decision de
 * comodidad: la identidad depende de clip-path (la media flecha), de ocho
 * sombras superpuestas (el contorno rojo del titular), de transform y de
 * tipografias web. Outlook de escritorio renderiza con el motor de Word e
 * ignora todo eso, asi que una replica en HTML llegaria descuadrada, sin
 * flecha y con el titular en la tipografia por defecto. Como imagen llega
 * identica en todos los clientes.
 *
 * Lo que si va como texto real es el titular, la bajada y el boton: si el
 * cliente bloquea imagenes —Gmail y Outlook lo hacen por defecto— el mensaje
 * se entiende igual y el enlace sigue siendo clickeable.
 */

const SITIO = "https://www.asli.cl";
const CORREO_CONTACTO = "informaciones@asli.cl";
const TELEFONO = "+56 9 6839 4225";

export type DatosCorreo = {
  /** URL publica de la pieza ya subida. */
  imagen: string;
  /** Texto alternativo: lo que se lee si las imagenes estan bloqueadas. */
  alt: string;
  titulo: string;
  parrafo: string;
  boton: string;
  /** Sufijo para las UTM, para poder separar esta pieza en analitica. */
  campana: string;
};

function escapar(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Igual que en la pieza: solo <b> sobrevive, el resto se escapa. */
function conNegritas(t: string): string {
  return escapar(t).replace(/&lt;b&gt;/g, "<strong>").replace(/&lt;\/b&gt;/g, "</strong>");
}

export function slugCampana(t: string): string {
  return (
    t
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "pieza"
  );
}

export function construirCorreo(d: DatosCorreo): string {
  const enlace = `${SITIO}/servicios?utm_source=email&utm_medium=correo&utm_campaign=${d.campana}`;
  const titulo = escapar(d.titulo);
  const alt = escapar(d.alt);
  const parrafo = conNegritas(d.parrafo);
  const boton = escapar(d.boton);

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="es">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<title>${titulo}</title>
<style type="text/css">
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;}
  @media only screen and (max-width:620px){
    .wrap{width:100% !important;}
    .px{padding-left:22px !important;padding-right:22px !important;}
    .h1{font-size:20px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#EEF1F6;">

<!-- Vista previa: se lee en la bandeja de entrada, no dentro del correo -->
<div style="display:none;font-size:1px;color:#EEF1F6;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${titulo}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#EEF1F6;">
  <tr>
    <td align="center" style="padding:26px 12px;">

      <table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:6px;overflow:hidden;">

        <!-- La pieza -->
        <tr>
          <td>
            <a href="${enlace}" target="_blank">
              <img src="${d.imagen}" width="600" alt="${alt}"
                   style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
            </a>
          </td>
        </tr>

        <!-- Texto real: si el cliente bloquea imagenes, el mensaje igual se entiende -->
        <tr>
          <td class="px" style="padding:30px 40px 0;font-family:Arial,Helvetica,sans-serif;">
            <h1 class="h1" style="margin:0 0 14px;font-size:23px;line-height:1.3;color:#14294F;font-weight:bold;">${titulo}</h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#44506B;">${parrafo}</p>
          </td>
        </tr>

        <!-- Boton a prueba de balas: VML para Outlook, <a> para el resto -->
        <tr>
          <td align="center" style="padding:0 40px 26px;">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${enlace}" style="height:52px;v-text-anchor:middle;width:300px;" arcsize="10%" strokecolor="#C8102E" fillcolor="#C8102E">
              <w:anchorlock/>
              <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${boton}</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-- -->
            <a href="${enlace}" target="_blank"
               style="display:inline-block;background-color:#C8102E;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;line-height:1;text-decoration:none;padding:17px 38px;border-radius:5px;">${boton}</a>
            <!--<![endif]-->
          </td>
        </tr>

        <tr>
          <td class="px" align="center" style="padding:0 40px 30px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#7A8499;">
            &iquest;Prefieres escribirnos? <a href="mailto:${CORREO_CONTACTO}" style="color:#C8102E;text-decoration:underline;">${CORREO_CONTACTO}</a>
          </td>
        </tr>

        <!-- Pie -->
        <tr>
          <td align="center" style="background-color:#14294F;padding:22px 40px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#B9C4DA;">
            <strong style="color:#FFFFFF;">ASLI &mdash; Log&iacute;stica y Comercio Exterior</strong><br />
            Longitudinal Sur KM 186, Curic&oacute;, Chile &middot; ${TELEFONO}<br />
            <a href="${SITIO}" target="_blank" style="color:#FFFFFF;text-decoration:underline;">www.asli.cl</a>
          </td>
        </tr>

      </table>

      <!-- En envios masivos, la plataforma agrega aqui el enlace de baja. -->

    </td>
  </tr>
</table>

</body>
</html>`;
}
