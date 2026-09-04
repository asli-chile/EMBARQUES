import { newBlockId, type BlockKind, type StudioBlock, type StudioDocument } from "./types";

export type PresetDef = {
  kind: BlockKind;
  label: string;
  description: string;
  hint?: string;
  defaults: Record<string, string>;
};

/** Presets basados en componentes de React Email + marca ASLI. */
export const STUDIO_PRESETS: PresetDef[] = [
  {
    kind: "headerAsli",
    label: "Header ASLI",
    description: "Barra marca: logo + acento rojo",
    defaults: {},
  },
  {
    kind: "greeting",
    label: "Saludo {{saludo}}",
    description: "Estimado/Estimada según el nombre + {{nombre}}",
    defaults: { template: "{{saludo}} {{nombre}}," },
  },
  {
    kind: "heading",
    label: "Heading",
    description: "Título (Heading)",
    defaults: { text: "Informativo ASLI", as: "h2" },
  },
  {
    kind: "text",
    label: "Párrafo",
    description: "Text — admite **negrita**",
    defaults: {
      text: "Escribe el mensaje. Puedes usar **negrita**.",
    },
  },
  {
    kind: "button",
    label: "Botón",
    description: "Button con estilo Tailwind ASLI",
    defaults: {
      label: "Ver más",
      href: "https://asli.cl",
    },
  },
  {
    kind: "divider",
    label: "Divisor",
    description: "Hr",
    defaults: {},
  },
  {
    kind: "image",
    label: "Imagen",
    description: "Img con URL pública",
    defaults: {
      src: "",
      alt: "ASLI",
      width: "160",
    },
  },
  {
    kind: "dataRow",
    label: "Fila dato",
    description: "Etiqueta + valor (estilo informativo)",
    defaults: { label: "DESTINO", value: "Vietnam" },
  },
  {
    kind: "footerAsli",
    label: "Footer ASLI",
    description: "Pie de marca con logo",
    defaults: {},
  },
  {
    kind: "html",
    label: "HTML + Tailwind",
    description: "Escribe HTML con class de Tailwind (se procesa con <Tailwind>)",
    hint: `<div class="rounded-lg bg-asli-navy px-4 py-3 text-white">
  <p class="m-0 text-[15px] leading-6">Hola <strong>{{nombre}}</strong>, bloque custom.</p>
</div>`,
    defaults: {
      html: `<div class="rounded-lg bg-asli-navy px-4 py-3 text-white">
  <p class="m-0 text-[15px] leading-6">Hola <strong>{{nombre}}</strong>, bloque custom.</p>
</div>`,
    },
  },
];

export function createBlock(kind: BlockKind): StudioBlock {
  const preset = STUDIO_PRESETS.find((p) => p.kind === kind);
  return {
    id: newBlockId(),
    kind,
    props: { ...(preset?.defaults ?? {}) },
  };
}

export function createDefaultStudioDocument(): StudioDocument {
  return createExportacionesVietnamDocument();
}

/** Plantilla: Actualización exportaciones (Vietnam / Systems Approach). */
export function createExportacionesVietnamDocument(): StudioDocument {
  return {
    asunto: "Actualización exportaciones — ASLI",
    previewText: "Systems Approach para cerezas frescas a Vietnam · temporada 2026/27",
    blocks: [
      createBlock("headerAsli"),
      {
        ...createBlock("greeting"),
        props: { template: "{{saludo}} {{nombre}}," },
      },
      {
        ...createBlock("text"),
        props: {
          text: "Compartimos la siguiente actualización de interés para las exportaciones de **cerezas frescas chilenas** con destino a Vietnam:",
        },
      },
      {
        ...createBlock("text"),
        props: {
          text: "A partir de la temporada 2026/27, se incorpora el Systems Approach como alternativa al tratamiento de frío, permitiendo nuevas opciones para embarques marítimos y aéreos.",
        },
      },
      {
        ...createBlock("html"),
        props: {
          html: VIETNAM_DATOS_HTML,
        },
      },
      {
        ...createBlock("text"),
        props: {
          text: "Recomendamos verificar las instrucciones operativas definitivas del SAG previo al embarque.",
        },
      },
      {
        ...createBlock("text"),
        props: {
          text: "Saludos cordiales,",
        },
      },
      {
        ...createBlock("html"),
        props: {
          html: `<p style="margin:4px 0 0 0;font-size:14px;line-height:20px;"><strong>Equipo ASLI</strong><br/>Logística &amp; Comercio Exterior</p>`,
        },
      },
      createBlock("footerAsli"),
    ],
  };
}

const VIETNAM_DATOS_HTML = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;border-collapse:collapse;width:100%;">
  <tr>
    <td width="40" valign="middle" style="width:40px;padding:8px 10px 8px 0;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;vertical-align:middle;">
      <img src="{{asset:/email/icons/calendar.png}}" width="32" height="32" alt="" style="display:block;border:0;outline:none;width:32px;height:32px;margin:0 auto;" />
    </td>
    <td width="118" valign="middle" style="width:118px;padding:8px 8px 8px 12px;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;vertical-align:middle;font-size:13px;line-height:18px;font-weight:700;color:#002d69;white-space:nowrap;">ANUNCIO:</td>
    <td valign="middle" style="padding:8px 0;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;vertical-align:middle;font-size:13px;line-height:18px;color:#18181b;">27 de agosto de 2026</td>
  </tr>
  <tr>
    <td width="40" valign="middle" style="width:40px;padding:8px 10px 8px 0;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;vertical-align:middle;">
      <img src="{{asset:/email/icons/pin.png}}" width="32" height="32" alt="" style="display:block;border:0;outline:none;width:32px;height:32px;margin:0 auto;" />
    </td>
    <td width="118" valign="middle" style="width:118px;padding:8px 8px 8px 12px;border-bottom:1px solid #e2e8f0;vertical-align:middle;font-size:13px;line-height:18px;font-weight:700;color:#002d69;white-space:nowrap;">DESTINO:</td>
    <td valign="middle" style="padding:8px 0;border-bottom:1px solid #e2e8f0;vertical-align:middle;font-size:13px;line-height:18px;color:#18181b;">Vietnam</td>
  </tr>
  <tr>
    <td width="40" valign="middle" style="width:40px;padding:8px 10px 8px 0;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;vertical-align:middle;">
      <img src="{{asset:/email/icons/product.png}}" width="32" height="32" alt="" style="display:block;border:0;outline:none;width:32px;height:32px;margin:0 auto;" />
    </td>
    <td width="118" valign="middle" style="width:118px;padding:8px 8px 8px 12px;border-bottom:1px solid #e2e8f0;vertical-align:middle;font-size:13px;line-height:18px;font-weight:700;color:#002d69;white-space:nowrap;">PRODUCTO:</td>
    <td valign="middle" style="padding:8px 0;border-bottom:1px solid #e2e8f0;vertical-align:middle;font-size:13px;line-height:18px;color:#18181b;">Cerezas frescas</td>
  </tr>
  <tr>
    <td width="40" valign="middle" style="width:40px;padding:8px 10px 8px 0;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;vertical-align:middle;">
      <img src="{{asset:/email/icons/document.png}}" width="32" height="32" alt="" style="display:block;border:0;outline:none;width:32px;height:32px;margin:0 auto;" />
    </td>
    <td width="118" valign="middle" style="width:118px;padding:8px 8px 8px 12px;border-bottom:1px solid #e2e8f0;vertical-align:middle;font-size:13px;line-height:18px;font-weight:700;color:#002d69;white-space:nowrap;">MEDIDA:</td>
    <td valign="middle" style="padding:8px 0;border-bottom:1px solid #e2e8f0;vertical-align:middle;font-size:13px;line-height:18px;color:#18181b;">Systems Approach como alternativa al tratamiento de fr&iacute;o</td>
  </tr>
  <tr>
    <td width="40" valign="middle" style="width:40px;padding:8px 10px 8px 0;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;vertical-align:middle;">
      <img src="{{asset:/email/icons/cold.png}}" width="32" height="32" alt="" style="display:block;border:0;outline:none;width:32px;height:32px;margin:0 auto;" />
    </td>
    <td width="118" valign="middle" style="width:118px;padding:8px 8px 8px 12px;border-bottom:1px solid #e2e8f0;vertical-align:middle;font-size:12px;line-height:16px;font-weight:700;color:#002d69;">TRATAMIENTO DE FR&Iacute;O:</td>
    <td valign="middle" style="padding:8px 0;border-bottom:1px solid #e2e8f0;vertical-align:middle;font-size:13px;line-height:18px;color:#18181b;">aplicable a fruta proveniente de zonas con presencia de mosca de la fruta, seg&uacute;n las condiciones establecidas en el protocolo.</td>
  </tr>
</table>`;
