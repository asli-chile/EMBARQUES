import type { BlockKind } from "./types";
import { ASLI_FOOTER_PROPS } from "./asliFooter";

export type CatalogLibraryItem = {
  id: string;
  kind: BlockKind;
  label: string;
  description: string;
  icon: string;
  props?: Record<string, string>;
};

export type CatalogLibraryGroup = {
  id: string;
  label: string;
  icon: string;
  itemIds: string[];
};

/**
 * Librería alineada al catálogo de https://react.email/components
 * (Headers, Footers, Grid, Gallery, Features, etc.)
 */
export const REACT_EMAIL_CATALOG_ITEMS: CatalogLibraryItem[] = [
  // Headers (además de barra/filete/masthead existentes)
  {
    id: "header-menu-center",
    kind: "headerAsli",
    label: "Header menú centrado",
    description: "Logo + menú al centro",
    icon: "lucide:panel-top",
    props: { variant: "menuCenter", kicker: "Inicio · Servicios · Contacto" },
  },
  {
    id: "header-menu-side",
    kind: "headerAsli",
    label: "Header menú lateral",
    description: "Logo izq. + links der.",
    icon: "lucide:panel-top",
    props: { variant: "menuSide", kicker: "Servicios · Tracking · Contacto" },
  },
  {
    id: "header-social",
    kind: "headerAsli",
    label: "Header con redes",
    description: "Marca + iconos sociales",
    icon: "lucide:share-2",
    props: { variant: "social", kicker: "Síguenos" },
  },

  // Footers
  {
    id: "footer-one-col",
    kind: "footerAsli",
    label: "Footer una columna",
    description: "Dirección + contacto centrados",
    icon: "lucide:panel-bottom",
    props: { variant: "oneCol", ...ASLI_FOOTER_PROPS },
  },
  {
    id: "footer-two-col",
    kind: "footerAsli",
    label: "Footer dos columnas",
    description: "Marca + dirección/contacto",
    icon: "lucide:columns-2",
    props: { variant: "twoCol", ...ASLI_FOOTER_PROPS },
  },

  // Container / Section
  {
    id: "container-band",
    kind: "containerBand",
    label: "Container",
    description: "Banda contenedora centrada",
    icon: "lucide:box",
    props: {
      title: "Contenedor",
      text: "Mensaje destacado dentro de un contenedor.",
      bg: "#F6EEE8",
      align: "center",
    },
  },
  {
    id: "section-simple",
    kind: "sectionLayout",
    label: "Section simple",
    description: "Título + cuerpo",
    icon: "lucide:square",
    props: { variant: "simple", title: "Sección", text: "Contenido de la sección.", align: "left" },
  },
  {
    id: "section-rows",
    kind: "sectionLayout",
    label: "Section con filas",
    description: "Rows + columns",
    icon: "lucide:layout-grid",
    props: { variant: "rows" },
  },

  // Grid
  {
    id: "grid-2",
    kind: "grid",
    label: "Grid 2 columnas",
    description: "One row, two columns",
    icon: "lucide:columns-2",
    props: {
      cols: "2",
      title1: "Columna A",
      text1: "Contenido de la primera columna.",
      title2: "Columna B",
      text2: "Contenido de la segunda columna.",
    },
  },
  {
    id: "grid-3",
    kind: "grid",
    label: "Grid 3 columnas",
    description: "One row, three columns",
    icon: "lucide:columns-3",
    props: {
      cols: "3",
      title1: "Uno",
      text1: "Detalle.",
      title2: "Dos",
      text2: "Detalle.",
      title3: "Tres",
      text3: "Detalle.",
    },
  },

  // Divider extras
  {
    id: "divider-label",
    kind: "divider",
    label: "Divisor con etiqueta",
    description: "Línea + texto central",
    icon: "lucide:minus",
    props: { variant: "label", label: "Continúa" },
  },

  // Heading / Text extras
  {
    id: "heading-center",
    kind: "heading",
    label: "Heading centrado",
    description: "Título al centro",
    icon: "lucide:heading",
    props: { text: "Título centrado", as: "h2", align: "center" },
  },
  {
    id: "heading-eyebrow",
    kind: "heading",
    label: "Heading con eyebrow",
    description: "Kicker + título",
    icon: "lucide:heading",
    props: { text: "Informativo ASLI", as: "h2", eyebrow: "Actualización", align: "left" },
  },
  {
    id: "text-lead",
    kind: "text",
    label: "Text lead",
    description: "Párrafo destacado",
    icon: "lucide:type",
    props: {
      text: "Párrafo lead de mayor jerarquía para abrir el mensaje.",
      align: "left",
      variant: "lead",
    },
  },
  {
    id: "text-muted",
    kind: "text",
    label: "Text muted",
    description: "Texto secundario",
    icon: "lucide:type",
    props: {
      text: "Nota secundaria o pie de contexto.",
      align: "left",
      variant: "muted",
    },
  },

  // Link
  {
    id: "link-inline",
    kind: "link",
    label: "Link inline",
    description: "Hipervínculo de texto",
    icon: "lucide:link",
    props: { variant: "inline", label: "Ver en asli.cl", href: "https://www.asli.cl", align: "left" },
  },
  {
    id: "link-button",
    kind: "link",
    label: "Link como botón",
    description: "CTA con aspecto de botón",
    icon: "lucide:external-link",
    props: { variant: "button", label: "Abrir enlace", href: "https://www.asli.cl", align: "center" },
  },

  // Buttons
  {
    id: "button-single",
    kind: "button",
    label: "Single button",
    description: "Un CTA",
    icon: "lucide:rectangle-horizontal",
    props: { label: "Continuar", href: "https://www.asli.cl", variant: "solid", align: "center" },
  },
  {
    id: "buttons-two",
    kind: "buttonsRow",
    label: "Two buttons",
    description: "Primario + secundario",
    icon: "lucide:columns-2",
    props: {
      variant: "two",
      label1: "Aceptar",
      href1: "https://www.asli.cl",
      label2: "Más info",
      href2: "https://www.asli.cl",
      align: "center",
    },
  },
  {
    id: "buttons-download",
    kind: "buttonsRow",
    label: "Download buttons",
    description: "Dos CTAs de descarga",
    icon: "lucide:download",
    props: {
      variant: "download",
      label1: "Descargar PDF",
      href1: "https://www.asli.cl",
      label2: "Descargar Excel",
      href2: "https://www.asli.cl",
      align: "center",
    },
  },

  // Image
  {
    id: "image-full",
    kind: "image",
    label: "Imagen ancha",
    description: "URL editable en Propiedades",
    icon: "lucide:image",
    props: { variant: "full", src: "", alt: "Banner", width: "560", align: "center", caption: "" },
  },
  {
    id: "image-rounded",
    kind: "image",
    label: "Image rounded",
    description: "Imagen con bordes redondeados",
    icon: "lucide:image",
    props: { variant: "rounded", alt: "ASLI", width: "280", align: "center" },
  },
  {
    id: "image-caption",
    kind: "image",
    label: "Image + caption",
    description: "Imagen con pie de foto",
    icon: "lucide:image",
    props: {
      variant: "caption",
      alt: "ASLI",
      caption: "Pie de imagen de ejemplo",
      width: "320",
      align: "center",
    },
  },

  // Avatars
  {
    id: "avatar-stacked",
    kind: "avatar",
    label: "Avatars stacked",
    description: "Grupo apilado",
    icon: "lucide:users",
    props: { variant: "stacked" },
  },
  {
    id: "avatar-text",
    kind: "avatar",
    label: "Avatar + texto",
    description: "Foto + nombre + cargo",
    icon: "lucide:user-round",
    props: { variant: "withText", names: "Nombre Ejemplo", role: "Ejecutivo ASLI" },
  },
  {
    id: "avatar-circular",
    kind: "avatar",
    label: "Avatars circular",
    description: "Fila circular",
    icon: "lucide:circle-user",
    props: { variant: "circular" },
  },
  {
    id: "avatar-rounded",
    kind: "avatar",
    label: "Avatars rounded",
    description: "Fila redondeada",
    icon: "lucide:square-user",
    props: { variant: "rounded" },
  },

  // Gallery
  {
    id: "gallery-four",
    kind: "gallery",
    label: "Gallery 2×2",
    description: "Four images in a grid",
    icon: "lucide:layout-grid",
    props: { variant: "four" },
  },
  {
    id: "gallery-three",
    kind: "gallery",
    label: "Gallery 3 columnas",
    description: "Three columns with images",
    icon: "lucide:columns-3",
    props: { variant: "three" },
  },
  {
    id: "gallery-horizontal",
    kind: "gallery",
    label: "Gallery horizontal",
    description: "Images on horizontal grid",
    icon: "lucide:gallery-horizontal",
    props: { variant: "horizontal" },
  },
  {
    id: "gallery-vertical",
    kind: "gallery",
    label: "Gallery vertical",
    description: "Images on vertical grid",
    icon: "lucide:gallery-vertical",
    props: { variant: "vertical" },
  },

  // Code
  {
    id: "code-inline",
    kind: "codeInline",
    label: "Code inline",
    description: "Snippet en línea",
    icon: "lucide:code",
    props: { prefix: "Usa", code: "npm i react-email" },
  },
  {
    id: "code-inline-copy",
    kind: "codeInline",
    label: "Code inline (comando)",
    description: "Comando destacado",
    icon: "lucide:terminal",
    props: { prefix: "Ejecuta", code: "npx email dev" },
  },
  {
    id: "code-block",
    kind: "codeBlock",
    label: "Code block",
    description: "Sin tema especial",
    icon: "lucide:file-code",
    props: { theme: "dark", lineNumbers: "0", title: "email.tsx" },
  },
  {
    id: "code-block-theme",
    kind: "codeBlock",
    label: "Code block tema",
    description: "Predefined theme",
    icon: "lucide:file-code-2",
    props: { theme: "dark", title: "theme" },
  },
  {
    id: "code-block-light",
    kind: "codeBlock",
    label: "Code block custom",
    description: "Tema claro",
    icon: "lucide:file-code",
    props: { theme: "light", title: "custom" },
  },
  {
    id: "code-block-lines",
    kind: "codeBlock",
    label: "Code + line numbers",
    description: "Con numeración",
    icon: "lucide:list-ordered",
    props: { theme: "dark", lineNumbers: "1", title: "lines" },
  },

  // Markdown
  {
    id: "md-simple",
    kind: "markdown",
    label: "Markdown simple",
    description: "Títulos, listas, negrita",
    icon: "lucide:file-text",
    props: { variant: "simple" },
  },
  {
    id: "md-container",
    kind: "markdown",
    label: "Markdown + container",
    description: "Con caja",
    icon: "lucide:file-text",
    props: { variant: "container" },
  },
  {
    id: "md-custom",
    kind: "markdown",
    label: "Markdown custom",
    description: "Estilo con acento",
    icon: "lucide:file-text",
    props: { variant: "custom", color: "#11224E" },
  },

  // Articles
  {
    id: "article-left",
    kind: "article",
    label: "Article + imagen",
    description: "Imagen a la izquierda",
    icon: "lucide:newspaper",
    props: { variant: "imageLeft" },
  },
  {
    id: "article-right",
    kind: "article",
    label: "Article imagen derecha",
    description: "Imagen a la derecha",
    icon: "lucide:newspaper",
    props: { variant: "imageRight" },
  },
  {
    id: "article-bg",
    kind: "article",
    label: "Article background",
    description: "Imagen/fondo destacado",
    icon: "lucide:panel-top",
    props: { variant: "background" },
  },
  {
    id: "article-cards",
    kind: "article",
    label: "Article two cards",
    description: "Dos tarjetas",
    icon: "lucide:layout-template",
    props: { variant: "cards" },
  },
  {
    id: "article-author",
    kind: "article",
    label: "Article + autor",
    description: "Con autor único",
    icon: "lucide:user",
    props: { variant: "author" },
  },
  {
    id: "article-authors",
    kind: "article",
    label: "Article autores",
    description: "Con autor(es)",
    icon: "lucide:users",
    props: { variant: "authors" },
  },

  // Features
  {
    id: "feature-list",
    kind: "feature",
    label: "Features lista",
    description: "Header + list items",
    icon: "lucide:list",
    props: { variant: "list" },
  },
  {
    id: "feature-numbered",
    kind: "feature",
    label: "Features numeradas",
    description: "Header + numbered list",
    icon: "lucide:list-ordered",
    props: { variant: "numbered" },
  },
  {
    id: "feature-four",
    kind: "feature",
    label: "Features 4 párrafos",
    description: "Cuatro columnas",
    icon: "lucide:layout-grid",
    props: { variant: "four" },
  },
  {
    id: "feature-twocols",
    kind: "feature",
    label: "Features 2×2",
    description: "Cuatro en dos columnas",
    icon: "lucide:columns-2",
    props: { variant: "twoCols" },
  },
  {
    id: "feature-centered",
    kind: "feature",
    label: "Features centradas",
    description: "Tres/cuatro centradas",
    icon: "lucide:align-center",
    props: { variant: "centered" },
  },

  // Stats
  {
    id: "stats-simple",
    kind: "stats",
    label: "Stats simple",
    description: "Tres métricas",
    icon: "lucide:chart-bar",
    props: { variant: "simple" },
  },
  {
    id: "stats-stepped",
    kind: "stats",
    label: "Stats stepped",
    description: "Métricas en escalera",
    icon: "lucide:chart-line",
    props: { variant: "stepped" },
  },

  // Testimonials
  {
    id: "testimonial-center",
    kind: "testimonial",
    label: "Testimonial centrado",
    description: "Cita simple",
    icon: "lucide:quote",
    props: { variant: "centered" },
  },
  {
    id: "testimonial-large",
    kind: "testimonial",
    label: "Testimonial + avatar",
    description: "Con avatar grande",
    icon: "lucide:message-circle-quote",
    props: { variant: "large" },
  },

  // Feedback
  {
    id: "feedback-rating",
    kind: "feedback",
    label: "Feedback sí/no",
    description: "Simple rating survey",
    icon: "lucide:thumbs-up",
    props: { variant: "rating" },
  },
  {
    id: "feedback-survey",
    kind: "feedback",
    label: "Survey 1–5",
    description: "Survey section",
    icon: "lucide:meh",
    props: { variant: "survey" },
  },
  {
    id: "feedback-reviews",
    kind: "feedback",
    label: "Customer reviews",
    description: "Lista de reseñas",
    icon: "lucide:star",
    props: { variant: "reviews" },
  },

  // Pricing
  {
    id: "pricing-simple",
    kind: "pricing",
    label: "Pricing table",
    description: "Tres planes",
    icon: "lucide:badge-dollar-sign",
    props: { variant: "simple" },
  },
  {
    id: "pricing-emphasized",
    kind: "pricing",
    label: "Pricing 2 tiers",
    description: "Con plan destacado",
    icon: "lucide:gem",
    props: { variant: "emphasized" },
  },

  // Ecommerce
  {
    id: "product-one",
    kind: "product",
    label: "One product",
    description: "Producto apilado",
    icon: "lucide:shopping-bag",
    props: { variant: "stacked" },
  },
  {
    id: "product-left",
    kind: "product",
    label: "Product imagen izq.",
    description: "Imagen a la izquierda",
    icon: "lucide:shopping-bag",
    props: { variant: "imageLeft" },
  },
  {
    id: "product-cards3",
    kind: "product",
    label: "Title + 3 cards",
    description: "Tres productos",
    icon: "lucide:layout-grid",
    props: { variant: "cards3", heading: "Servicios" },
  },
  {
    id: "product-cards4",
    kind: "product",
    label: "Title + 4 cards",
    description: "Cuatro productos",
    icon: "lucide:layout-grid",
    props: { variant: "cards4", heading: "Catálogo" },
  },
  {
    id: "checkout",
    kind: "checkout",
    label: "Checkout",
    description: "Resumen + CTA",
    icon: "lucide:credit-card",
    props: {},
  },
];

/** Grupos del catálogo React Email para el panel Agregar. */
export const REACT_EMAIL_CATALOG_GROUPS: CatalogLibraryGroup[] = [
  {
    id: "re-headers",
    label: "Headers (React Email)",
    icon: "lucide:panel-top",
    itemIds: ["header-menu-center", "header-menu-side", "header-social"],
  },
  {
    id: "re-footers",
    label: "Footers (React Email)",
    icon: "lucide:panel-bottom",
    itemIds: ["footer-one-col", "footer-two-col"],
  },
  {
    id: "re-layout",
    label: "Container · Section · Grid",
    icon: "lucide:layout-template",
    itemIds: ["container-band", "section-simple", "section-rows", "grid-2", "grid-3"],
  },
  {
    id: "re-type",
    label: "Heading · Text · Link · Markdown",
    icon: "lucide:type",
    itemIds: [
      "heading-center",
      "heading-eyebrow",
      "text-lead",
      "text-muted",
      "link-inline",
      "link-button",
      "md-simple",
      "md-container",
      "md-custom",
    ],
  },
  {
    id: "re-buttons",
    label: "Buttons",
    icon: "lucide:rectangle-horizontal",
    itemIds: ["button-single", "buttons-two", "buttons-download"],
  },
  {
    id: "re-media",
    label: "Image · Avatars · Gallery",
    icon: "lucide:images",
    itemIds: [
      "image-full",
      "image-rounded",
      "image-caption",
      "avatar-stacked",
      "avatar-text",
      "avatar-circular",
      "avatar-rounded",
      "gallery-four",
      "gallery-three",
      "gallery-horizontal",
      "gallery-vertical",
    ],
  },
  {
    id: "re-code",
    label: "Code",
    icon: "lucide:code-2",
    itemIds: [
      "code-inline",
      "code-inline-copy",
      "code-block",
      "code-block-theme",
      "code-block-light",
      "code-block-lines",
    ],
  },
  {
    id: "re-articles",
    label: "Articles",
    icon: "lucide:newspaper",
    itemIds: [
      "article-left",
      "article-right",
      "article-bg",
      "article-cards",
      "article-author",
      "article-authors",
    ],
  },
  {
    id: "re-features",
    label: "Features · Stats",
    icon: "lucide:sparkles",
    itemIds: [
      "feature-list",
      "feature-numbered",
      "feature-four",
      "feature-twocols",
      "feature-centered",
      "stats-simple",
      "stats-stepped",
    ],
  },
  {
    id: "re-social",
    label: "Testimonials · Feedback",
    icon: "lucide:message-square-quote",
    itemIds: [
      "testimonial-center",
      "testimonial-large",
      "feedback-rating",
      "feedback-survey",
      "feedback-reviews",
    ],
  },
  {
    id: "re-commerce",
    label: "Pricing · Ecommerce",
    icon: "lucide:shopping-cart",
    itemIds: [
      "pricing-simple",
      "pricing-emphasized",
      "product-one",
      "product-left",
      "product-cards3",
      "product-cards4",
      "checkout",
    ],
  },
  {
    id: "re-divider",
    label: "Divider extra",
    icon: "lucide:minus",
    itemIds: ["divider-label"],
  },
];
