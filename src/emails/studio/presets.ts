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
    defaults: { template: "{{saludo}} {{nombre}},", saludoMode: "auto", align: "left" },
  },
  {
    kind: "heading",
    label: "Heading",
    description: "Título (Heading)",
    defaults: { text: "Informativo ASLI", as: "h2", align: "left" },
  },
  {
    kind: "text",
    label: "Párrafo",
    description: "Text — admite **negrita**",
    defaults: {
      text: "Escribe el mensaje. Puedes usar **negrita**.",
      align: "left",
    },
  },
  {
    kind: "button",
    label: "Botón",
    description: "Button con estilo Tailwind ASLI",
    defaults: {
      label: "Ver más",
      href: "https://asli.cl",
      align: "center",
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
      align: "center",
    },
  },
  {
    kind: "dataRow",
    label: "Fila dato",
    description: "Ícono + etiqueta + valor (editable)",
    defaults: {
      icon: "pin",
      label: "DESTINO",
      value: "Vietnam",
    },
  },
  {
    kind: "footerAsli",
    label: "Footer ASLI",
    description: "Pie de marca con logo",
    defaults: {
      logoUrl: "",
      tagline: "Logística y Comercio Exterior",
      address1: "Longitudinal Sur Km 186,",
      address2: "Curicó, Chile",
    },
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

/** Documento vacío para empezar desde cero. */
export function createBlankStudioDocument(): StudioDocument {
  return {
    asunto: "",
    previewText: "",
    blocks: [],
  };
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
        ...createBlock("dataRow"),
        props: {
          icon: "calendar",
          label: "ANUNCIO",
          value: "27 de agosto de 2026",
        },
      },
      {
        ...createBlock("dataRow"),
        props: { icon: "pin", label: "DESTINO", value: "Vietnam" },
      },
      {
        ...createBlock("dataRow"),
        props: { icon: "product", label: "PRODUCTO", value: "Cerezas frescas" },
      },
      {
        ...createBlock("dataRow"),
        props: {
          icon: "document",
          label: "MEDIDA",
          value: "Systems Approach como alternativa al tratamiento de frío",
        },
      },
      {
        ...createBlock("dataRow"),
        props: {
          icon: "cold",
          label: "TRATAMIENTO DE FRÍO",
          value:
            "aplicable a fruta proveniente de zonas con presencia de mosca de la fruta, según las condiciones establecidas en el protocolo.",
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
        props: { text: "Saludos cordiales," },
      },
      {
        ...createBlock("text"),
        props: {
          text: "**Equipo ASLI**\nLogística & Comercio Exterior",
        },
      },
      createBlock("footerAsli"),
    ],
  };
}
