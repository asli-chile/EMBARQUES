import { newBlockId, type BlockKind, type StudioBlock, type StudioDocument } from "./types";
import {
  REACT_EMAIL_CATALOG_ITEMS,
} from "./catalogLibrary";

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
    defaults: { variant: "barra", kicker: "Informativo", color: "#C8102E" },
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
    kind: "listNumbered",
    label: "Lista numerada",
    description: "1. 2. 3. — un ítem por línea",
    defaults: {
      items: "Primer punto\nSegundo punto\nTercer punto",
      align: "left",
    },
  },
  {
    kind: "listBullet",
    label: "Lista con viñetas",
    description: "• Puntos — un ítem por línea",
    defaults: {
      items: "Primer punto\nSegundo punto\nTercer punto",
      align: "left",
    },
  },
  {
    kind: "listDash",
    label: "Lista con guiones",
    description: "– Guiones — un ítem por línea",
    defaults: {
      items: "Primer punto\nSegundo punto\nTercer punto",
      align: "left",
    },
  },
  {
    kind: "listCheck",
    label: "Lista con check",
    description: "✓ Checks — un ítem por línea",
    defaults: {
      items: "Requisito cumplido\nDocumento listo\nPendiente de firma",
      align: "left",
    },
  },
  {
    kind: "listSteps",
    label: "Lista con pasos",
    description: "Círculo numerado + título + descripción",
    defaults: {
      heading: "",
      items:
        "Documentación completa | Revisamos packing list, certificados y requisitos del destino.\nCoordinación de carga | Alineamos cut-off, booking y transporte hasta puerto.\nSeguimiento en ruta | Informamos hitos clave hasta la llegada a destino.\nSoporte operativo | Resolvemos desviaciones con respuesta rápida.",
      align: "left",
    },
  },
  {
    kind: "callout",
    label: "Destacado",
    description: "Caja de aviso (info / alerta / ok)",
    defaults: {
      variant: "info",
      text: "Mensaje destacado para el destinatario.",
      align: "left",
    },
  },
  {
    kind: "quote",
    label: "Cita",
    description: "Bloque de cita / nota lateral",
    defaults: {
      text: "“Texto de cita o nota importante.”",
      cite: "— Equipo ejemplo",
      align: "left",
      variant: "bar",
    },
  },
  {
    kind: "spacer",
    label: "Espacio",
    description: "Separación vertical (S / M / L)",
    defaults: { size: "md" },
  },
  {
    kind: "button",
    label: "Botón",
    description: "Button con estilo Tailwind ASLI",
    defaults: {
      label: "Ver más",
      href: "https://asli.cl",
      align: "center",
      variant: "solid",
      color: "#11224E",
    },
  },
  {
    kind: "divider",
    label: "Divisor",
    description: "Hr",
    defaults: { variant: "solid" },
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
      label: "ETIQUETA",
      value: "Valor de ejemplo",
      align: "left",
    },
  },
  {
    kind: "footerAsli",
    label: "Footer ASLI",
    description: "Pie de marca con logo",
    defaults: {
      variant: "split",
      logoUrl: "",
      tagline: "Logística y Comercio Exterior",
      address1: "Dirección de ejemplo 123,",
      address2: "Ciudad, País",
      color: "#C8102E",
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
  {
    kind: "grid",
    label: "Grid",
    description: "Row + Column (2–4 cols)",
    defaults: { cols: "2", title1: "Columna A", text1: "Texto", title2: "Columna B", text2: "Texto" },
  },
  {
    kind: "link",
    label: "Link",
    description: "Hipervínculo",
    defaults: { variant: "inline", label: "Ver más", href: "https://www.asli.cl", align: "left" },
  },
  {
    kind: "buttonsRow",
    label: "Botones (fila)",
    description: "Dos botones / download",
    defaults: {
      variant: "two",
      label1: "Primario",
      href1: "https://www.asli.cl",
      label2: "Secundario",
      href2: "https://www.asli.cl",
      align: "center",
    },
  },
  {
    kind: "avatar",
    label: "Avatars",
    description: "Avatares circulares / stacked",
    defaults: { variant: "circular" },
  },
  {
    kind: "gallery",
    label: "Gallery",
    description: "Grilla de imágenes",
    defaults: { variant: "four" },
  },
  {
    kind: "codeInline",
    label: "Code inline",
    description: "Código en línea",
    defaults: { prefix: "Usa", code: "npm i react-email" },
  },
  {
    kind: "codeBlock",
    label: "Code block",
    description: "Bloque de código",
    defaults: { theme: "dark", lineNumbers: "0", title: "email.tsx" },
  },
  {
    kind: "markdown",
    label: "Markdown",
    description: "Markdown → email",
    defaults: { variant: "simple" },
  },
  {
    kind: "article",
    label: "Article",
    description: "Artículo con imagen/autor",
    defaults: { variant: "imageLeft", title: "Título del artículo", body: "Resumen de ejemplo." },
  },
  {
    kind: "feature",
    label: "Features",
    description: "Beneficios / features",
    defaults: { variant: "list", heading: "Beneficios" },
  },
  {
    kind: "stats",
    label: "Stats",
    description: "Métricas",
    defaults: { variant: "simple" },
  },
  {
    kind: "testimonial",
    label: "Testimonial",
    description: "Cita de cliente",
    defaults: { variant: "centered" },
  },
  {
    kind: "feedback",
    label: "Feedback",
    description: "Encuesta / reseñas",
    defaults: { variant: "rating" },
  },
  {
    kind: "pricing",
    label: "Pricing",
    description: "Tabla de precios",
    defaults: { variant: "simple" },
  },
  {
    kind: "product",
    label: "Product",
    description: "Producto ecommerce",
    defaults: { variant: "stacked", title: "Producto", price: "USD 120" },
  },
  {
    kind: "checkout",
    label: "Checkout",
    description: "Resumen de compra",
    defaults: { heading: "Resumen", cta: "Confirmar" },
  },
  {
    kind: "containerBand",
    label: "Container",
    description: "Banda contenedora",
    defaults: { title: "Contenedor", text: "Mensaje", bg: "#F6EEE8", align: "center" },
  },
  {
    kind: "sectionLayout",
    label: "Section",
    description: "Sección simple o con filas",
    defaults: { variant: "simple", title: "Sección", text: "Contenido" },
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

/** Ítem de la librería “Agregar”: permite variantes del mismo kind. */
export type StudioLibraryItem = {
  id: string;
  kind: BlockKind;
  label: string;
  description: string;
  icon: string;
  props?: Record<string, string>;
};

export function createFromLibrary(item: StudioLibraryItem): StudioBlock {
  const base = createBlock(item.kind);
  return {
    ...base,
    props: { ...base.props, ...(item.props ?? {}) },
  };
}

const LIST_SAMPLE = "Primer punto\nSegundo punto\nTercer punto";

/** Catálogo visual del rail Agregar (componentes + variantes). */
export const STUDIO_LIBRARY: StudioLibraryItem[] = [
  {
    id: "header-barra",
    kind: "headerAsli",
    label: "Header barra",
    description: "Navy + franja roja",
    icon: "lucide:panel-top",
    props: { variant: "barra", kicker: "Informativo", color: "#C8102E" },
  },
  {
    id: "header-filete",
    kind: "headerAsli",
    label: "Header filete",
    description: "Claro + doble filete",
    icon: "lucide:separator-horizontal",
    props: { variant: "filete", kicker: "Informativo", color: "#C8102E" },
  },
  {
    id: "header-masthead",
    kind: "headerAsli",
    label: "Header masthead",
    description: "Editorial logo + título",
    icon: "lucide:layout-template",
    props: { variant: "masthead", kicker: "Informativo", color: "#C8102E" },
  },
  {
    id: "greeting",
    kind: "greeting",
    label: "Saludo",
    description: "Estimado/a + nombre",
    icon: "lucide:hand",
  },
  {
    id: "heading",
    kind: "heading",
    label: "Título",
    description: "Heading h1–h3",
    icon: "lucide:heading",
  },
  {
    id: "text",
    kind: "text",
    label: "Párrafo",
    description: "Texto con negrita",
    icon: "lucide:type",
  },
  {
    id: "list-num",
    kind: "listNumbered",
    label: "Lista 1.2.3",
    description: "Numerada",
    icon: "lucide:list-ordered",
    props: { items: LIST_SAMPLE },
  },
  {
    id: "list-bullet",
    kind: "listBullet",
    label: "Lista •",
    description: "Viñetas",
    icon: "lucide:list",
    props: { items: LIST_SAMPLE },
  },
  {
    id: "list-dash",
    kind: "listDash",
    label: "Lista –",
    description: "Guiones",
    icon: "lucide:list-minus",
    props: { items: LIST_SAMPLE },
  },
  {
    id: "list-check",
    kind: "listCheck",
    label: "Lista ✓",
    description: "Checks",
    icon: "lucide:list-checks",
    props: { items: "Documento OK\nInspección lista\nListo para despacho" },
  },
  {
    id: "list-steps",
    kind: "listSteps",
    label: "Lista pasos",
    description: "Número en círculo + título",
    icon: "lucide:list-ordered",
    props: {
      heading: "",
      items:
        "Documentación completa | Revisamos packing list, certificados y requisitos del destino.\nCoordinación de carga | Alineamos cut-off, booking y transporte hasta puerto.\nSeguimiento en ruta | Informamos hitos clave hasta la llegada a destino.\nSoporte operativo | Resolvemos desviaciones con respuesta rápida.",
    },
  },
  {
    id: "callout-info",
    kind: "callout",
    label: "Aviso info",
    description: "Destacado azul",
    icon: "lucide:info",
    props: {
      variant: "info",
      text: "Información importante para su operación.",
    },
  },
  {
    id: "callout-warn",
    kind: "callout",
    label: "Aviso alerta",
    description: "Destacado ámbar",
    icon: "lucide:triangle-alert",
    props: {
      variant: "warning",
      text: "Atención: revise fechas y documentación antes del CUT.",
    },
  },
  {
    id: "callout-ok",
    kind: "callout",
    label: "Aviso OK",
    description: "Destacado verde",
    icon: "lucide:circle-check",
    props: {
      variant: "success",
      text: "Proceso confirmado. No se requieren acciones adicionales.",
    },
  },
  {
    id: "quote-bar",
    kind: "quote",
    label: "Cita barra",
    description: "Nota con filete",
    icon: "lucide:quote",
    props: { variant: "bar" },
  },
  {
    id: "quote-card",
    kind: "quote",
    label: "Cita tarjeta",
    description: "Caja con borde",
    icon: "lucide:message-square-quote",
    props: {
      variant: "card",
      text: "“Nota destacada de ejemplo para el destinatario.”",
      cite: "— Equipo ejemplo",
    },
  },
  {
    id: "button-solid",
    kind: "button",
    label: "Botón sólido",
    description: "CTA navy",
    icon: "lucide:rectangle-horizontal",
    props: { variant: "solid", label: "Ver detalle", href: "https://asli.cl" },
  },
  {
    id: "button-outline",
    kind: "button",
    label: "Botón contorno",
    description: "CTA outline",
    icon: "lucide:square",
    props: { variant: "outline", label: "Más información", href: "https://asli.cl" },
  },
  {
    id: "button-pill",
    kind: "button",
    label: "Botón píldora",
    description: "CTA redondeado",
    icon: "lucide:pill",
    props: { variant: "pill", label: "Continuar", href: "https://asli.cl" },
  },
  {
    id: "button-soft",
    kind: "button",
    label: "Botón suave",
    description: "CTA fondo claro",
    icon: "lucide:app-window",
    props: { variant: "soft", label: "Abrir enlace", href: "https://asli.cl" },
  },
  {
    id: "dataRow",
    kind: "dataRow",
    label: "Fila dato",
    description: "Ícono + etiqueta + valor",
    icon: "lucide:rows-3",
  },
  {
    id: "dataRow-red",
    kind: "dataRow",
    label: "Fila acento rojo",
    description: "Etiqueta en rojo ASLI",
    icon: "lucide:rows-3",
    props: {
      icon: "calendar",
      label: "FECHA",
      value: "01 de enero de 2026",
      labelColor: "#C8102E",
      iconBg: "#11224E",
    },
  },
  {
    id: "dataRow-teal",
    kind: "dataRow",
    label: "Fila acento teal",
    description: "Etiqueta en teal",
    icon: "lucide:rows-3",
    props: {
      icon: "check",
      label: "ESTADO",
      value: "Confirmado (ejemplo)",
      labelColor: "#007A7B",
      iconBg: "#007A7B",
    },
  },
  {
    id: "image",
    kind: "image",
    label: "Imagen",
    description: "Cambia la URL en Propiedades",
    icon: "lucide:image",
    props: {
      src: "",
      alt: "Imagen",
      width: "520",
      variant: "full",
      caption: "",
    },
  },
  {
    id: "divider-solid",
    kind: "divider",
    label: "Divisor fino",
    description: "Línea 1px",
    icon: "lucide:minus",
    props: { variant: "solid" },
  },
  {
    id: "divider-thick",
    kind: "divider",
    label: "Divisor grueso",
    description: "Línea 3px",
    icon: "lucide:separator-horizontal",
    props: { variant: "thick", color: "#11224E" },
  },
  {
    id: "divider-dash",
    kind: "divider",
    label: "Divisor punteado",
    description: "Línea dashed",
    icon: "lucide:ellipsis",
    props: { variant: "dashed", color: "#94A3B8" },
  },
  {
    id: "spacer-sm",
    kind: "spacer",
    label: "Espacio S",
    description: "12px",
    icon: "lucide:unfold-vertical",
    props: { size: "sm" },
  },
  {
    id: "spacer-md",
    kind: "spacer",
    label: "Espacio M",
    description: "24px",
    icon: "lucide:unfold-vertical",
    props: { size: "md" },
  },
  {
    id: "spacer-lg",
    kind: "spacer",
    label: "Espacio L",
    description: "40px",
    icon: "lucide:unfold-vertical",
    props: { size: "lg" },
  },
  {
    id: "html",
    kind: "html",
    label: "HTML",
    description: "Tailwind libre",
    icon: "lucide:code-2",
  },
  {
    id: "html-banner",
    kind: "html",
    label: "Banner aviso",
    description: "Caja HTML de ejemplo",
    icon: "lucide:panel-top",
    props: {
      html: `<div class="rounded-lg px-4 py-3" style="background:#11224E">
  <p class="m-0 text-[13px] font-bold leading-5 text-white">AVISO DE EJEMPLO</p>
  <p class="m-0 mt-1 text-[12px] leading-4 text-white/90">Texto representativo para plantillas de prueba.</p>
</div>`,
    },
  },
  {
    id: "footer-split",
    kind: "footerAsli",
    label: "Footer dividido",
    description: "Logo | dirección",
    icon: "lucide:panel-bottom",
    props: { variant: "split" },
  },
  {
    id: "footer-centered",
    kind: "footerAsli",
    label: "Footer centrado",
    description: "Logo al centro",
    icon: "lucide:align-center",
    props: { variant: "centered" },
  },
  {
    id: "footer-compact",
    kind: "footerAsli",
    label: "Footer compacto",
    description: "Una línea + acento",
    icon: "lucide:minus",
    props: { variant: "compact" },
  },
  ...REACT_EMAIL_CATALOG_ITEMS,
];

export type StudioLibraryGroup = {
  id: string;
  label: string;
  icon: string;
  /** ids de STUDIO_LIBRARY */
  itemIds: string[];
};

/** Categorías del panel Agregar — estilo Canva: pocas, sin duplicados. */
export const STUDIO_LIBRARY_GROUPS: StudioLibraryGroup[] = [
  {
    id: "basicos",
    label: "Básicos",
    icon: "lucide:shapes",
    itemIds: [
      "header-barra",
      "greeting",
      "heading",
      "text",
      "button-solid",
      "image",
      "divider-solid",
      "spacer-md",
      "footer-split",
    ],
  },
  {
    id: "listas",
    label: "Listas",
    icon: "lucide:list",
    itemIds: ["list-bullet", "list-num", "list-check", "list-steps"],
  },
  {
    id: "destacados",
    label: "Destacados",
    icon: "lucide:sparkles",
    itemIds: [
      "callout-info",
      "quote-bar",
      "dataRow",
      "container-band",
      "section-simple",
    ],
  },
  {
    id: "diseno",
    label: "Diseño",
    icon: "lucide:layout-template",
    itemIds: [
      "grid-2",
      "gallery-three",
      "avatar-text",
      "image-full",
      "buttons-two",
      "link-inline",
    ],
  },
  {
    id: "bloques",
    label: "Bloques",
    icon: "lucide:panels-top-left",
    itemIds: [
      "article-left",
      "feature-list",
      "stats-simple",
      "testimonial-center",
      "feedback-rating",
      "pricing-simple",
      "product-left",
      "checkout",
    ],
  },
  {
    id: "avanzado",
    label: "Avanzado",
    icon: "lucide:code-2",
    itemIds: ["md-simple", "code-inline", "code-block", "html", "divider-label"],
  },
];

export function getStudioLibraryGrouped(): {
  group: StudioLibraryGroup;
  items: StudioLibraryItem[];
}[] {
  const byId = new Map(STUDIO_LIBRARY.map((i) => [i.id, i]));
  return STUDIO_LIBRARY_GROUPS.map((group) => ({
    group,
    items: group.itemIds
      .map((id) => byId.get(id))
      .filter((i): i is StudioLibraryItem => !!i),
  }));
}

/** Todos los ítems planos (para búsqueda Canva). */
export function getStudioLibraryFlat(): StudioLibraryItem[] {
  const seen = new Set<string>();
  const out: StudioLibraryItem[] = [];
  for (const { items } of getStudioLibraryGrouped()) {
    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

export const LIST_KINDS: BlockKind[] = [
  "listNumbered",
  "listBullet",
  "listDash",
  "listCheck",
];

export function isListKind(kind: BlockKind): boolean {
  return LIST_KINDS.includes(kind);
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

function withProps(kind: BlockKind, props: Record<string, string>): StudioBlock {
  const b = createBlock(kind);
  return { ...b, props: { ...b.props, ...props } };
}

/** 1) Boletín técnico de ejemplo (datos representativos). */
export function createExportacionesVietnamDocument(): StudioDocument {
  return {
    asunto: "Ejemplo · Boletín informativo ASLI",
    previewText: "Plantilla de prueba · datos representativos",
    blocks: [
      withProps("headerAsli", { variant: "barra", kicker: "Informativo" }),
      withProps("greeting", {
        template: "{{saludo}} {{nombre}},",
        saludoMode: "auto",
        align: "left",
      }),
      withProps("text", {
        text: "Este es un **boletín de ejemplo** para armar comunicados con filas de dato y texto.",
        align: "left",
      }),
      withProps("text", {
        text: "Reemplace estos párrafos por el mensaje real. Los valores de abajo son solo demostrativos.",
        align: "left",
      }),
      withProps("dataRow", {
        icon: "calendar",
        label: "FECHA",
        value: "01 de enero de 2026",
        align: "left",
      }),
      withProps("dataRow", {
        icon: "pin",
        label: "DESTINO",
        value: "Mercado de ejemplo",
        align: "left",
      }),
      withProps("dataRow", {
        icon: "product",
        label: "PRODUCTO",
        value: "Producto demostrativo",
        align: "left",
      }),
      withProps("dataRow", {
        icon: "document",
        label: "REFERENCIA",
        value: "Documento / protocolo de ejemplo",
        align: "left",
      }),
      withProps("text", {
        text: "Saludos cordiales,\n**Equipo ejemplo ASLI**",
        align: "left",
      }),
      withProps("footerAsli", { variant: "split" }),
    ],
  };
}

/** 2) Alerta operativa de ejemplo. */
export function createRetrasoNaveDocument(): StudioDocument {
  return {
    asunto: "Ejemplo · Aviso operativo",
    previewText: "Plantilla de alerta · datos ficticios",
    blocks: [
      withProps("headerAsli", { variant: "filete", kicker: "Aviso operativo" }),
      withProps("html", {
        html: `<div class="rounded-lg px-4 py-3" style="background:#C8102E">
  <p class="m-0 text-[13px] font-bold leading-5 text-white">AVISO DE EJEMPLO</p>
  <p class="m-0 mt-1 text-[12px] leading-4 text-white/90">Código DEMO-01 · impacto ilustrativo</p>
</div>`,
      }),
      withProps("heading", {
        text: "Actualización de ejemplo",
        as: "h2",
        align: "center",
      }),
      withProps("text", {
        text: "Resumen representativo del cambio. Ajuste fechas y rutas según el caso real.",
        align: "center",
      }),
      withProps("divider", { variant: "solid" }),
      withProps("dataRow", {
        icon: "calendar",
        label: "FECHA A",
        value: "08 ene 2026",
        align: "center",
      }),
      withProps("dataRow", {
        icon: "clock",
        label: "FECHA B",
        value: "12 ene 2026 · 14:00",
        align: "center",
      }),
      withProps("dataRow", {
        icon: "pin",
        label: "RUTA",
        value: "Puerto Origen → Puerto Destino",
        align: "center",
      }),
      withProps("divider", { variant: "solid" }),
      withProps("button", {
        variant: "solid",
        label: "Ver detalle (ejemplo)",
        href: "https://www.asli.cl",
        align: "center",
      }),
      withProps("text", {
        text: "**Operaciones (ejemplo)** · ejemplo@asli.cl",
        align: "center",
      }),
      withProps("footerAsli", { variant: "centered" }),
    ],
  };
}

/** 3) Campaña comercial de ejemplo. */
export function createTemporadaBerriesDocument(): StudioDocument {
  return {
    asunto: "Ejemplo · Campaña / anuncio",
    previewText: "Plantilla centrada · CTA de demostración",
    blocks: [
      withProps("headerAsli", { variant: "masthead", kicker: "Campaña" }),
      withProps("heading", {
        text: "Título de campaña de ejemplo",
        as: "h1",
        align: "center",
      }),
      withProps("greeting", {
        template: "{{saludo}} {{nombre}},",
        saludoMode: "auto",
        align: "center",
      }),
      withProps("text", {
        text: "Texto comercial de muestra. Use este bloque para highlights y llamados a la acción.",
        align: "center",
      }),
      withProps("button", {
        variant: "pill",
        label: "Acción de ejemplo",
        href: "https://www.asli.cl",
        align: "center",
      }),
      withProps("divider", { variant: "dashed", color: "#94A3B8" }),
      withProps("text", {
        text: "**Opción A** · detalle ilustrativo",
        align: "center",
      }),
      withProps("text", {
        text: "**Opción B** · detalle ilustrativo",
        align: "center",
      }),
      withProps("text", {
        text: "**Contacto** · Nombre Ejemplo · ejemplo@asli.cl",
        align: "center",
      }),
      withProps("html", {
        html: `<div class="rounded-lg bg-asli-cream px-4 py-3 text-center">
  <p class="m-0 text-[12px] leading-5 text-asli-navy">Nota de prueba · sin datos reales</p>
</div>`,
      }),
      withProps("footerAsli", { variant: "compact" }),
    ],
  };
}

/** 4) Comprobante de ejemplo. */
export function createConfirmacionBookingDocument(): StudioDocument {
  return {
    asunto: "Ejemplo · Confirmación REF-DEMO-0001",
    previewText: "Plantilla de comprobante · valores ficticios",
    blocks: [
      withProps("headerAsli", { variant: "barra", kicker: "Confirmación" }),
      withProps("html", {
        html: `<div class="rounded-lg bg-asli-navy px-4 py-4 text-center text-white">
  <p class="m-0 text-[11px] uppercase tracking-widest opacity-80">Referencia</p>
  <p class="m-0 mt-1 text-[18px] font-bold leading-6">REF-DEMO-0001</p>
  <p class="m-0 mt-1 text-[12px] opacity-90">2 × unidad ejemplo · Destino demo</p>
</div>`,
      }),
      withProps("greeting", {
        template: "{{saludo}} {{nombre}}, este es un comprobante de ejemplo.",
        saludoMode: "auto",
        align: "left",
      }),
      withProps("dataRow", {
        icon: "package",
        label: "EQUIPO",
        value: "2 × Unidad de ejemplo",
        align: "left",
      }),
      withProps("dataRow", {
        icon: "pin",
        label: "RUTA",
        value: "Origen DEMO → Destino DEMO",
        align: "left",
      }),
      withProps("dataRow", {
        icon: "ship",
        label: "SERVICIO",
        value: "Servicio ejemplo · ETD 18-ene-2026",
        align: "left",
      }),
      withProps("dataRow", {
        icon: "check",
        label: "ESTADO",
        value: "Confirmado (demo)",
        labelColor: "#007A7B",
        iconBg: "#007A7B",
        align: "left",
      }),
      withProps("divider", { variant: "thick", color: "#11224E" }),
      withProps("dataRow", {
        icon: "alert",
        label: "CORTE",
        value: "16-ene-2026 12:00 · documentos de ejemplo",
        align: "left",
      }),
      withProps("button", {
        variant: "outline",
        label: "Descargar (ejemplo)",
        href: "https://www.asli.cl",
        align: "left",
      }),
      withProps("footerAsli", { variant: "split" }),
    ],
  };
}

/** 5) Urgencia mínima de ejemplo. */
export function createAlertaDemurrageDocument(): StudioDocument {
  return {
    asunto: "Ejemplo · Alerta de plazo",
    previewText: "Plantilla urgente · datos ficticios",
    blocks: [
      withProps("headerAsli", { variant: "filete", kicker: "Urgente" }),
      withProps("html", {
        html: `<div class="rounded-lg px-4 py-3 text-center" style="background:#fff3cd;border:1px solid #f0d78c">
  <p class="m-0 text-[14px] font-bold leading-5" style="color:#856404">⚠ Alerta de ejemplo</p>
  <p class="m-0 mt-1 text-[12px] leading-4" style="color:#856404">Referencia DEMO-99 · 2 días restantes (ilustrativo)</p>
</div>`,
      }),
      withProps("heading", {
        text: "Acción de ejemplo",
        as: "h3",
        align: "right",
      }),
      withProps("dataRow", {
        icon: "anchor",
        label: "LUGAR",
        value: "Terminal de ejemplo",
        align: "right",
      }),
      withProps("dataRow", {
        icon: "calendar",
        label: "LÍMITE",
        value: "10 ene 2026 · 23:59",
        align: "right",
      }),
      withProps("button", {
        variant: "soft",
        label: "Coordinar (ejemplo)",
        href: "https://www.asli.cl",
        align: "right",
        color: "#C8102E",
      }),
      withProps("text", {
        text: "Monto de referencia **USD 0 (demo)**.\n**Customer Service (ejemplo)**",
        align: "right",
      }),
      withProps("footerAsli", { variant: "compact" }),
    ],
  };
}

/** Extra: invitación de ejemplo. */
export function createInvitacionWebinarDocument(): StudioDocument {
  return {
    asunto: "Ejemplo · Invitación a evento",
    previewText: "Plantilla de invitación · sin datos reales",
    blocks: [
      withProps("headerAsli", { variant: "masthead", kicker: "Evento" }),
      withProps("greeting", {
        template: "{{saludo}} {{nombre}},",
        saludoMode: "auto",
        align: "center",
      }),
      withProps("heading", {
        text: "Nombre del evento (ejemplo)",
        as: "h2",
        align: "center",
      }),
      withProps("text", {
        text: "Descripción breve de muestra para una convocatoria.",
        align: "center",
      }),
      withProps("button", {
        variant: "pill",
        label: "Confirmar (ejemplo)",
        href: "https://www.asli.cl",
        align: "center",
      }),
      withProps("footerAsli", { variant: "centered" }),
    ],
  };
}

export type StudioTemplateDef = {
  id: string;
  label: string;
  description: string;
  create: () => StudioDocument;
};

/** Catálogo de plantillas cargables en el estudio (datos solo representativos). */
export const STUDIO_DOCUMENT_TEMPLATES: StudioTemplateDef[] = [
  {
    id: "vietnam",
    label: "1 · Boletín técnico",
    description: "Párrafos + filas de dato · sin botón",
    create: createExportacionesVietnamDocument,
  },
  {
    id: "retraso-nave",
    label: "2 · Alerta operativa",
    description: "Banner HTML + título + CTA centrado",
    create: createRetrasoNaveDocument,
  },
  {
    id: "temporada-berries",
    label: "3 · Campaña / anuncio",
    description: "Hero centrado · CTA primero",
    create: createTemporadaBerriesDocument,
  },
  {
    id: "booking",
    label: "4 · Comprobante",
    description: "Badge + tabla + divisor · CTA",
    create: createConfirmacionBookingDocument,
  },
  {
    id: "demurrage",
    label: "5 · Urgencia / plazo",
    description: "Mínimo de bloques · alineado a la derecha",
    create: createAlertaDemurrageDocument,
  },
];
