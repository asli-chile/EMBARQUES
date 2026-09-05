import { Icon } from "@iconify/react";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { sileo } from "sileo";
import { useAuth } from "@/lib/auth/AuthContext";
import { sendEmail } from "@/lib/email/sendEmail";
import {
  contactosToDestinatarios,
  importContactosToGrupo,
  listAgendaCompleta,
  listContactosDeGrupos,
  listGrupos,
  lookupContactosByEmails,
  setContactoActivo,
  upsertContacto,
  type DestinatarioAgenda,
  type InformacionesContacto,
  type InformacionesGrupo,
} from "@/lib/email/informativos/agenda";
import {
  createBlankStudioDocument,
  createDefaultStudioDocument,
  createFromLibrary,
  getStudioLibraryFlat,
  getStudioLibraryGrouped,
  isListKind,
  STUDIO_DOCUMENT_TEMPLATES,
  STUDIO_PRESETS,
  type StudioLibraryItem,
} from "@/emails/studio/presets";
import {
  newBlockId,
  type BlockKind,
  type StudioBlock,
  type StudioDocument,
} from "@/emails/studio/types";
import {
  nombreDesdeEmail,
  parseDestinatarios,
  PREVIEW_SELECT_MSG,
  primerNombre,
  renderStudioHtml,
} from "@/lib/email/informativos/render";
import { DATA_ROW_ICON_OPTIONS, dataRowIconSrc } from "@/lib/email/assets";
import { STUDIO_COLOR_OPTIONS, resolveStudioColor } from "@/emails/studio/colors";

/** Tokens UI — studio tipo Canva (claros, compactos). */
const input =
  "w-full rounded-lg border border-[#d5dde8] bg-white px-2.5 py-1.5 text-[12px] text-[#1a2744] placeholder:text-[#1a2744]/40 shadow-sm focus:border-[#11224E]/35 focus:outline-none focus:ring-2 focus:ring-[#11224E]/12";
const label =
  "mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5a6b85]";
const btn =
  "inline-flex items-center justify-center gap-1 rounded-lg border border-[#d5dde8] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#1a2744]/85 shadow-sm hover:bg-[#f3f6fb] disabled:opacity-40";
const btnPrimary =
  "inline-flex items-center justify-center gap-1 rounded-lg bg-[#11224E] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-[#0d1a3d] disabled:opacity-40";
const btnGhost =
  "inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-[#1a2744]/70 hover:bg-black/5 disabled:opacity-40";
const boardBg =
  "bg-[#d8e0ea] [background-image:radial-gradient(circle,_#b8c4d4_1px,_transparent_1px)] [background-size:16px_16px]";

const PRESET_ICONS: Record<BlockKind, string> = {
  headerAsli: "lucide:panel-top",
  greeting: "lucide:hand",
  heading: "lucide:heading",
  text: "lucide:type",
  listNumbered: "lucide:list-ordered",
  listBullet: "lucide:list",
  listDash: "lucide:list-minus",
  listCheck: "lucide:list-checks",
  listSteps: "lucide:circle-dot",
  callout: "lucide:info",
  quote: "lucide:quote",
  spacer: "lucide:unfold-vertical",
  button: "lucide:rectangle-horizontal",
  buttonsRow: "lucide:columns-2",
  divider: "lucide:minus",
  image: "lucide:image",
  dataRow: "lucide:rows-3",
  footerAsli: "lucide:panel-bottom",
  html: "lucide:code-2",
  grid: "lucide:layout-grid",
  link: "lucide:link",
  avatar: "lucide:circle-user",
  gallery: "lucide:images",
  codeInline: "lucide:code",
  codeBlock: "lucide:terminal",
  markdown: "lucide:file-text",
  article: "lucide:newspaper",
  feature: "lucide:sparkles",
  stats: "lucide:bar-chart-3",
  testimonial: "lucide:message-square-quote",
  feedback: "lucide:thumbs-up",
  pricing: "lucide:badge-dollar-sign",
  product: "lucide:shopping-bag",
  checkout: "lucide:credit-card",
  containerBand: "lucide:box",
  sectionLayout: "lucide:layout-template",
};

type Panel = "compose" | "send" | "agenda";

function DataRowIconPicker({
  value,
  onChange,
  labelText,
  valueText,
}: {
  value: string;
  onChange: (v: string) => void;
  labelText: string;
  valueText: string;
}) {
  const current = (value || "").trim().toLowerCase();
  const previewSrc = dataRowIconSrc(current, false);
  const previewLabel = (labelText || "DATO").replace(/:$/, "");
  const previewValue = valueText || "…";

  return (
    <div className="space-y-1.5">
      <div className="grid max-h-52 grid-cols-4 gap-1 overflow-y-auto pr-0.5">
        {DATA_ROW_ICON_OPTIONS.map((opt) => {
          const src = opt.value ? dataRowIconSrc(opt.value, false) : "";
          const active = current === opt.value;
          return (
            <button
              key={opt.value || "none"}
              type="button"
              title={opt.label}
              onClick={() => onChange(opt.value)}
              className={`group flex flex-col items-center gap-1 rounded-xl border px-1 py-1.5 text-center transition ${
                active
                  ? "border-[#11224E]/40 bg-[#eef2f8] ring-1 ring-[#11224E]/25"
                  : "border-[#e2e8f0] bg-white hover:border-[#11224E]/20 hover:bg-[#f8fafc]"
              }`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f0f4f9]">
                {src ? (
                  <img src={src} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
                ) : (
                  <span className="text-[10px] font-semibold text-[#5a6b85]/50">—</span>
                )}
              </span>
              <span className="text-[9px] font-semibold leading-tight text-[#1a2744]/75">
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-sm">
        <p className="border-b border-[#e8eef5] bg-[#f8fafc] px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-[#5a6b85]">
          Vista previa fila
        </p>
        <div className="flex items-stretch text-[11px]">
          {previewSrc ? (
            <div className="flex w-10 shrink-0 items-center justify-center border-r border-slate-200 px-1 py-1.5">
              <img
                src={previewSrc}
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
              />
            </div>
          ) : null}
          <div className="w-[88px] shrink-0 px-2 py-1.5 font-bold text-[#002d69]">
            {previewLabel}:
          </div>
          <div className="min-w-0 flex-1 truncate px-2 py-1.5 text-[#1a2744]/90">
            {previewValue}
          </div>
        </div>
      </div>
    </div>
  );
}

const ALIGN_FIELD: {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  control: "align";
} = {
  key: "align",
  label: "Alineación",
  options: [
    { value: "left", label: "Izquierda" },
    { value: "center", label: "Centro" },
    { value: "right", label: "Derecha" },
  ],
  control: "align",
};

const COLOR_FIELD: {
  key: string;
  label: string;
  control: "color";
  hint?: string;
} = {
  key: "color",
  label: "Color",
  control: "color",
  hint: "Acento del bloque (marca ASLI o hex).",
};

function propFields(
  block: StudioBlock,
): {
  key: string;
  label: string;
  multiline?: boolean;
  hint?: string;
  options?: { value: string; label: string }[];
  control?: "iconPicker" | "align" | "listStyle" | "color" | "listItems" | "listSteps";
  fallbackColor?: string;
}[] {
  switch (block.kind) {
    case "greeting":
      return [
        {
          key: "saludoMode",
          label: "Trato (Estimado / Estimada)",
          options: [
            { value: "auto", label: "Auto según el nombre del destinatario" },
            { value: "Estimado", label: "Forzar Estimado" },
            { value: "Estimada", label: "Forzar Estimada" },
          ],
          hint: "Con «Auto», {{saludo}} cambia por persona al enviar.",
        },
        {
          key: "template",
          label: "Plantilla del saludo",
          multiline: true,
          hint: "Ej: {{saludo}} {{nombre}},  —  o texto fijo: Estimados clientes,",
        },
        COLOR_FIELD,
        ALIGN_FIELD,
      ];
    case "heading":
      return [
        { key: "eyebrow", label: "Eyebrow / kicker (opcional)" },
        { key: "text", label: "Texto del título", multiline: true },
        { key: "as", label: "Nivel (h1 | h2 | h3)" },
        COLOR_FIELD,
        ALIGN_FIELD,
      ];
    case "text":
      return [
        {
          key: "variant",
          label: "Estilo",
          options: [
            { value: "body", label: "Normal" },
            { value: "lead", label: "Lead (destacado)" },
            { value: "muted", label: "Muted (secundario)" },
          ],
        },
        {
          key: "text",
          label: "Texto del párrafo",
          multiline: true,
          hint: "**negrita**, {{nombre}}, {{saludo}}. Saltos de línea OK.",
        },
        COLOR_FIELD,
        ALIGN_FIELD,
      ];
    case "listNumbered":
    case "listBullet":
    case "listDash":
    case "listCheck":
      return [
        {
          key: "_listStyle",
          label: "Estilo de lista",
          control: "listStyle",
          hint: "Cambia entre numerada, viñetas, guiones o check.",
        },
        {
          key: "items",
          label: "Ítems",
          control: "listItems",
          hint: "Un cuadro por ítem. Admite **negrita** y {{nombre}}.",
        },
        COLOR_FIELD,
        ALIGN_FIELD,
      ];
    case "listSteps":
      return [
        {
          key: "heading",
          label: "Título de sección (opcional)",
          hint: "Ej: Top 5 beneficios del servicio",
        },
        {
          key: "items",
          label: "Pasos",
          control: "listSteps",
          hint: "Cada paso tiene título y descripción.",
        },
        COLOR_FIELD,
        ALIGN_FIELD,
      ];
    case "callout":
      return [
        {
          key: "variant",
          label: "Variante",
          options: [
            { value: "info", label: "Info (azul)" },
            { value: "warning", label: "Alerta (ámbar)" },
            { value: "success", label: "OK (verde)" },
          ],
        },
        {
          key: "text",
          label: "Mensaje",
          multiline: true,
          hint: "**negrita**, {{nombre}}, {{saludo}}.",
        },
        { ...COLOR_FIELD, hint: "Si eliges color, reemplaza el borde de la variante." },
        ALIGN_FIELD,
      ];
    case "quote":
      return [
        {
          key: "variant",
          label: "Estilo de cita",
          options: [
            { value: "bar", label: "Barra lateral" },
            { value: "card", label: "Tarjeta con borde" },
          ],
        },
        { key: "text", label: "Cita", multiline: true },
        { key: "cite", label: "Firma / fuente" },
        COLOR_FIELD,
        ALIGN_FIELD,
      ];
    case "spacer":
      return [
        {
          key: "size",
          label: "Tamaño",
          options: [
            { value: "sm", label: "Pequeño (12px)" },
            { value: "md", label: "Mediano (24px)" },
            { value: "lg", label: "Grande (40px)" },
          ],
        },
      ];
    case "button":
      return [
        {
          key: "variant",
          label: "Estilo de botón",
          options: [
            { value: "solid", label: "Sólido" },
            { value: "outline", label: "Contorno" },
            { value: "pill", label: "Píldora" },
            { value: "soft", label: "Suave" },
          ],
        },
        { key: "label", label: "Texto del botón" },
        { key: "href", label: "URL del enlace" },
        COLOR_FIELD,
        ALIGN_FIELD,
      ];
    case "image":
      return [
        {
          key: "variant",
          label: "Estilo",
          options: [
            { value: "default", label: "Normal" },
            { value: "full", label: "Ancho completo" },
            { value: "rounded", label: "Redondeada" },
            { value: "caption", label: "Con pie de imagen" },
          ],
        },
        {
          key: "src",
          label: "URL de la imagen",
          hint: "Pega una URL pública (https://…). Vacío = imagen de ejemplo ASLI.",
        },
        { key: "alt", label: "Texto alternativo" },
        { key: "caption", label: "Pie de imagen" },
        { key: "width", label: "Ancho (px)" },
        ALIGN_FIELD,
      ];
    case "dataRow":
      return [
        {
          key: "icon",
          label: "Ícono",
          control: "iconPicker",
          hint: "Elige el ícono; abajo ves cómo queda la fila.",
        },
        { key: "label", label: "Etiqueta (ej. DESTINO)" },
        { key: "value", label: "Valor", multiline: true },
        {
          key: "labelColor",
          label: "Color etiqueta",
          control: "color",
          hint: "Color del texto inicial (ej. ANUNCIO:).",
          fallbackColor: "#11224E",
        },
        {
          key: "valueColor",
          label: "Color valor",
          control: "color",
          hint: "Color del texto después de la etiqueta.",
          fallbackColor: "#18181B",
        },
        {
          key: "iconBg",
          label: "Fondo del ícono",
          control: "color",
          hint: "Círculo detrás del ícono.",
          fallbackColor: "#11224E",
        },
        {
          key: "borderColor",
          label: "Color borde",
          control: "color",
          hint: "Bordes y línea separadora de la fila.",
          fallbackColor: "#E2E8F0",
        },
        ALIGN_FIELD,
      ];
    case "headerAsli":
      return [
        {
          key: "variant",
          label: "Estilo editorial",
          options: [
            { value: "barra", label: "Barra navy + franja roja" },
            { value: "filete", label: "Filete claro (doble línea)" },
            { value: "masthead", label: "Masthead editorial" },
            { value: "menuCenter", label: "Menú centrado" },
            { value: "menuSide", label: "Menú lateral" },
            { value: "social", label: "Con redes" },
          ],
          hint: "Misma paleta ASLI; distinta composición.",
        },
        {
          key: "kicker",
          label: "Línea editorial / menú",
          hint: "Ej: Informativo · o Inicio|Servicios|Contacto",
        },
        { key: "menu", label: "Menú (opcional, con | )" },
        { key: "logoUrl", label: "URL logo (vacío = logo ASLI)" },
        {
          ...COLOR_FIELD,
          label: "Color franja",
          hint: "Acento (rojo ASLI por defecto).",
          fallbackColor: "#C8102E",
        },
      ];
    case "footerAsli":
      return [
        {
          key: "variant",
          label: "Estilo de footer",
          options: [
            { value: "split", label: "Dividido (logo | dirección)" },
            { value: "centered", label: "Centrado" },
            { value: "compact", label: "Compacto" },
            { value: "oneCol", label: "Una columna (React Email)" },
            { value: "twoCol", label: "Dos columnas (React Email)" },
          ],
        },
        { key: "logoUrl", label: "URL logo (vacío = logo ASLI)" },
        { key: "tagline", label: "Línea bajo el logo" },
        { key: "address1", label: "Dirección línea 1" },
        { key: "address2", label: "Dirección línea 2" },
        { key: "menu", label: "Enlaces (twoCol, con | )" },
        {
          ...COLOR_FIELD,
          label: "Color acento",
          hint: "Barra o filete del pie.",
          fallbackColor: "#C8102E",
        },
      ];
    case "html":
      return [
        {
          key: "html",
          label: "HTML + class Tailwind",
          multiline: true,
          hint: "{{nombre}} y {{saludo}} disponibles",
        },
      ];
    case "divider":
      return [
        {
          key: "variant",
          label: "Estilo de línea",
          options: [
            { value: "solid", label: "Fina" },
            { value: "thick", label: "Gruesa" },
            { value: "dashed", label: "Punteada" },
            { value: "label", label: "Con etiqueta" },
          ],
        },
        { key: "label", label: "Etiqueta (si aplica)" },
        COLOR_FIELD,
      ];
    case "grid":
      return [
        { key: "cols", label: "Columnas (2–4)" },
        { key: "title1", label: "Título col. 1" },
        { key: "text1", label: "Texto col. 1", multiline: true },
        { key: "title2", label: "Título col. 2" },
        { key: "text2", label: "Texto col. 2", multiline: true },
        { key: "title3", label: "Título col. 3" },
        { key: "text3", label: "Texto col. 3", multiline: true },
        { key: "title4", label: "Título col. 4" },
        { key: "text4", label: "Texto col. 4", multiline: true },
        COLOR_FIELD,
        ALIGN_FIELD,
      ];
    case "link":
      return [
        {
          key: "variant",
          label: "Estilo",
          options: [
            { value: "inline", label: "Inline" },
            { value: "button", label: "Como botón" },
          ],
        },
        { key: "label", label: "Texto" },
        { key: "href", label: "URL" },
        COLOR_FIELD,
        ALIGN_FIELD,
      ];
    case "buttonsRow":
      return [
        {
          key: "variant",
          label: "Variante",
          options: [
            { value: "two", label: "Dos botones" },
            { value: "download", label: "Download" },
          ],
        },
        { key: "label1", label: "Botón 1" },
        { key: "href1", label: "URL 1" },
        { key: "label2", label: "Botón 2" },
        { key: "href2", label: "URL 2" },
        COLOR_FIELD,
        ALIGN_FIELD,
      ];
    case "gallery":
      return [
        {
          key: "variant",
          label: "Variante",
          options: [
            { value: "four", label: "4 imágenes" },
            { value: "three", label: "3 imágenes" },
            { value: "horizontal", label: "Horizontal" },
            { value: "vertical", label: "Vertical" },
          ],
        },
        {
          key: "urls",
          label: "URLs de imágenes",
          multiline: true,
          hint: "Una URL https por línea. Puedes reemplazar todas las de ejemplo.",
        },
      ];
    case "avatar":
      return [
        {
          key: "variant",
          label: "Variante",
          options: [
            { value: "circular", label: "Circular" },
            { value: "rounded", label: "Redondeado" },
            { value: "stacked", label: "Stacked" },
            { value: "text", label: "Con texto" },
          ],
        },
        {
          key: "urls",
          label: "URLs de avatares",
          multiline: true,
          hint: "Una URL por línea (opcional).",
        },
        { key: "names", label: "Nombres (uno por línea)", multiline: true },
        { key: "role", label: "Cargo (variante texto)" },
        ALIGN_FIELD,
      ];
    case "codeInline":
      return [
        { key: "prefix", label: "Texto antes" },
        { key: "code", label: "Código" },
        { key: "suffix", label: "Texto después" },
      ];
    case "codeBlock":
      return [
        {
          key: "theme",
          label: "Tema",
          options: [
            { value: "dark", label: "Oscuro" },
            { value: "light", label: "Claro" },
          ],
        },
        { key: "title", label: "Título" },
        { key: "code", label: "Código", multiline: true },
        { key: "lineNumbers", label: "Números de línea (1/0)" },
      ];
    case "markdown":
      return [
        {
          key: "variant",
          label: "Variante",
          options: [
            { value: "simple", label: "Simple" },
            { value: "container", label: "Contenedor" },
            { value: "custom", label: "Custom" },
          ],
        },
        { key: "content", label: "Markdown", multiline: true },
      ];
    case "product":
      return [
        {
          key: "variant",
          label: "Variante",
          options: [
            { value: "stacked", label: "Apilado" },
            { value: "imageLeft", label: "Imagen izq." },
            { value: "cards3", label: "3 cards" },
            { value: "cards4", label: "4 cards" },
          ],
        },
        { key: "heading", label: "Título sección" },
        { key: "title", label: "Producto" },
        { key: "price", label: "Precio" },
        { key: "description", label: "Descripción", multiline: true },
        {
          key: "imageUrl",
          label: "URL imagen",
          hint: "Reemplaza la imagen de ejemplo con tu URL https.",
        },
        {
          key: "items",
          label: "Cards (nombre|precio|detalle)",
          multiline: true,
        },
        COLOR_FIELD,
      ];
    case "article":
      return [
        {
          key: "variant",
          label: "Variante",
          options: [
            { value: "imageLeft", label: "Imagen izq." },
            { value: "imageRight", label: "Imagen der." },
            { value: "withBg", label: "Con fondo" },
            { value: "cards", label: "Cards" },
            { value: "author", label: "Con autor" },
            { value: "authors", label: "Varios autores" },
          ],
        },
        { key: "title", label: "Título" },
        { key: "body", label: "Cuerpo", multiline: true },
        { key: "author", label: "Autor" },
        {
          key: "imageUrl",
          label: "URL imagen",
          hint: "Reemplaza la imagen de ejemplo.",
        },
        COLOR_FIELD,
      ];
    case "feature":
      return [
        {
          key: "variant",
          label: "Variante",
          options: [
            { value: "list", label: "Lista" },
            { value: "grid", label: "Grid" },
            { value: "icons", label: "Con íconos" },
            { value: "header", label: "Con header" },
            { value: "numbered", label: "Numerado" },
          ],
        },
        { key: "heading", label: "Título" },
        {
          key: "items",
          label: "Ítems (título|texto por línea)",
          multiline: true,
        },
        COLOR_FIELD,
      ];
    case "stats":
      return [
        {
          key: "variant",
          label: "Variante",
          options: [
            { value: "simple", label: "Simple" },
            { value: "bordered", label: "Con borde" },
          ],
        },
        {
          key: "items",
          label: "Métricas (valor|etiqueta por línea)",
          multiline: true,
        },
        COLOR_FIELD,
      ];
    case "testimonial":
      return [
        {
          key: "variant",
          label: "Variante",
          options: [
            { value: "centered", label: "Centrado" },
            { value: "side", label: "Lateral" },
          ],
        },
        { key: "quote", label: "Cita", multiline: true },
        { key: "author", label: "Autor" },
        { key: "role", label: "Cargo" },
        COLOR_FIELD,
      ];
    case "feedback":
      return [
        {
          key: "variant",
          label: "Variante",
          options: [
            { value: "rating", label: "Rating" },
            { value: "survey", label: "Encuesta" },
            { value: "nps", label: "NPS" },
          ],
        },
        { key: "heading", label: "Título" },
        { key: "text", label: "Texto", multiline: true },
        COLOR_FIELD,
      ];
    case "pricing":
      return [
        {
          key: "variant",
          label: "Variante",
          options: [
            { value: "simple", label: "3 planes" },
            { value: "emphasized", label: "2 tiers (destacado)" },
          ],
        },
        {
          key: "items",
          label: "Planes (nombre|precio|detalle por línea)",
          multiline: true,
        },
        COLOR_FIELD,
      ];
    case "checkout":
      return [
        { key: "heading", label: "Título" },
        {
          key: "items",
          label: "Líneas (concepto|monto)",
          multiline: true,
        },
        { key: "cta", label: "Texto del botón" },
        { key: "href", label: "URL del botón" },
        COLOR_FIELD,
      ];
    case "containerBand":
      return [
        { key: "title", label: "Título" },
        { key: "text", label: "Texto", multiline: true },
        { key: "bg", label: "Color de fondo" },
        COLOR_FIELD,
        ALIGN_FIELD,
      ];
    case "sectionLayout":
      return [
        {
          key: "variant",
          label: "Variante",
          options: [
            { value: "simple", label: "Simple" },
            { value: "rows", label: "Filas" },
          ],
        },
        { key: "title", label: "Título" },
        { key: "text", label: "Texto", multiline: true },
        {
          key: "items",
          label: "Filas (título|texto)",
          multiline: true,
        },
        COLOR_FIELD,
      ];
    default:
      return [];
  }
}

function ColorPicker({
  value,
  onChange,
  fallback = "#11224E",
}: {
  value: string;
  onChange: (v: string) => void;
  fallback?: string;
}) {
  const current = resolveStudioColor(value || fallback, fallback);
  const selectedOpt = STUDIO_COLOR_OPTIONS.find(
    (c) => c.value.toUpperCase() === current.toUpperCase(),
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {STUDIO_COLOR_OPTIONS.map((c) => {
          const active = current.toUpperCase() === c.value.toUpperCase();
          return (
            <button
              key={c.id}
              type="button"
              title={c.label}
              className={`h-8 w-8 rounded-lg shadow-sm transition ${
                active
                  ? "scale-110 ring-2 ring-[#11224E] ring-offset-2"
                  : "ring-1 ring-black/10 hover:scale-105"
              }`}
              style={{ backgroundColor: c.value }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(c.value.toUpperCase());
              }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="h-9 w-11 cursor-pointer rounded border border-[#d5dde8] bg-white p-0.5"
          value={current}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          title="Color personalizado"
        />
        <input
          className={input + " font-mono uppercase"}
          value={current}
          onChange={(e) => {
            const next = e.target.value.trim();
            if (/^#?[0-9A-Fa-f]{0,6}$/.test(next)) {
              onChange(next.startsWith("#") || next === "" ? next : `#${next}`);
            }
          }}
          onBlur={() => onChange(resolveStudioColor(current, fallback))}
          placeholder={fallback}
          spellCheck={false}
        />
      </div>
      <p className="text-[10px] font-semibold text-[#11224E]">
        Activo:{" "}
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
            style={{ backgroundColor: current }}
          />
          {selectedOpt?.label ?? current}
        </span>
      </p>
    </div>
  );
}

function parseStepLines(raw: string): { title: string; description: string }[] {
  if (!raw?.trim()) return [{ title: "", description: "" }];
  const lines = raw.split(/\n/);
  return lines.map((line) => {
    const sep = line.indexOf("|");
    if (sep >= 0) {
      return {
        title: line.slice(0, sep).trim(),
        description: line.slice(sep + 1).trim(),
      };
    }
    return { title: line, description: "" };
  });
}

function ListItemsEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const rows =
    value === "" || value == null
      ? [""]
      : value.split(/\n/);

  const setAt = (idx: number, text: string) => {
    const next = [...rows];
    next[idx] = text;
    onChange(next.join("\n"));
  };

  const add = () => onChange([...rows, ""].join("\n"));

  const remove = (idx: number) => {
    const next = rows.filter((_, i) => i !== idx);
    onChange(next.length ? next.join("\n") : "");
  };

  return (
    <div className="space-y-2">
      {rows.map((item, idx) => (
        <div
          key={idx}
          className="flex gap-1.5 rounded-lg border border-[#e8eef5] bg-[#f8fafc] p-2"
        >
          <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#11224E]/10 text-[10px] font-bold text-[#11224E]">
            {idx + 1}
          </span>
          <input
            className={input}
            value={item}
            onChange={(e) => setAt(idx, e.target.value)}
            placeholder={`Ítem ${idx + 1}`}
          />
          <button
            type="button"
            className={btnGhost + " shrink-0 !px-1.5 text-[#C8102E]"}
            title="Quitar"
            onClick={() => remove(idx)}
            disabled={rows.length <= 1}
          >
            <Icon icon="lucide:x" width={14} />
          </button>
        </div>
      ))}
      <button type="button" className={btn + " w-full"} onClick={add}>
        <Icon icon="lucide:plus" width={13} />
        Agregar ítem
      </button>
    </div>
  );
}

function ListStepsEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const steps = parseStepLines(value);

  const commit = (next: { title: string; description: string }[]) => {
    onChange(
      next
        .map((s) =>
          s.description.trim()
            ? `${s.title} | ${s.description}`
            : s.title,
        )
        .join("\n"),
    );
  };

  const setStep = (idx: number, patch: Partial<{ title: string; description: string }>) => {
    commit(steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const add = () => commit([...steps, { title: "", description: "" }]);

  const remove = (idx: number) => {
    const next = steps.filter((_, i) => i !== idx);
    commit(next.length ? next : [{ title: "", description: "" }]);
  };

  return (
    <div className="space-y-2">
      {steps.map((step, idx) => (
        <div
          key={idx}
          className="space-y-1.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-2.5"
        >
          <div className="flex items-center gap-1.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#11224E] text-[10px] font-bold text-white">
              {idx + 1}
            </span>
            <p className="flex-1 text-[10px] font-bold uppercase tracking-wide text-[#5a6b85]">
              Paso {idx + 1}
            </p>
            <button
              type="button"
              className={btnGhost + " !px-1.5 text-[#C8102E]"}
              title="Quitar paso"
              onClick={() => remove(idx)}
              disabled={steps.length <= 1}
            >
              <Icon icon="lucide:trash-2" width={13} />
            </button>
          </div>
          <div>
            <label className="mb-0.5 block text-[9px] font-semibold uppercase tracking-wide text-[#5a6b85]">
              Título
            </label>
            <input
              className={input}
              value={step.title}
              onChange={(e) => setStep(idx, { title: e.target.value })}
              placeholder="Título del paso"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[9px] font-semibold uppercase tracking-wide text-[#5a6b85]">
              Descripción
            </label>
            <textarea
              className={input + " min-h-[64px] text-[11px] leading-4"}
              value={step.description}
              onChange={(e) => setStep(idx, { description: e.target.value })}
              placeholder="Descripción breve"
            />
          </div>
        </div>
      ))}
      <button type="button" className={btn + " w-full"} onClick={add}>
        <Icon icon="lucide:plus" width={13} />
        Agregar paso
      </button>
    </div>
  );
}

function AlignPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const current = (value || "left").toLowerCase();
  const opts = [
    { value: "left", label: "Izq.", title: "Izquierda" },
    { value: "center", label: "Centro", title: "Centrar" },
    { value: "right", label: "Der.", title: "Derecha" },
  ] as const;
  return (
    <div className="flex gap-1 rounded-xl bg-[#eef2f8] p-1">
      {opts.map((o) => {
        const active = current === o.value;
        return (
          <button
            key={o.value}
            type="button"
            title={o.title}
            className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${
              active
                ? "bg-[#11224E] text-white shadow-sm"
                : "text-[#1a2744]/75 hover:bg-white/80"
            }`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ListStylePicker({
  value,
  onChange,
}: {
  value: BlockKind;
  onChange: (kind: BlockKind) => void;
}) {
  const opts: { kind: BlockKind; label: string; sample: string }[] = [
    { kind: "listNumbered", label: "1. 2. 3.", sample: "1." },
    { kind: "listBullet", label: "Viñetas", sample: "•" },
    { kind: "listDash", label: "Guiones", sample: "–" },
    { kind: "listCheck", label: "Check", sample: "✓" },
  ];
  return (
    <div className="grid grid-cols-2 gap-1">
      {opts.map((o) => {
        const active = value === o.kind;
        return (
          <button
            key={o.kind}
            type="button"
            title={o.label}
            className={`rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold transition ${
              active
                ? "border-[#11224E] bg-[#11224E] text-white"
                : "border-[#e2e8f0] bg-white text-[#1a2744]/80 hover:bg-[#f8fafc]"
            }`}
            onClick={() => onChange(o.kind)}
          >
            <span className="mr-1 opacity-80">{o.sample}</span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

type StudioConfirm = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
};

function StudioConfirmModal({
  state,
  onClose,
}: {
  state: StudioConfirm | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, onClose]);

  if (!state) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#11224E]/35 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="studio-confirm-title"
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#c5d0e0] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-[#e8eef5] px-4 py-3.5">
          <span
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              state.danger
                ? "bg-[#C8102E]/10 text-[#C8102E]"
                : "bg-[#eef2f8] text-[#11224E]"
            }`}
          >
            <Icon
              icon={state.danger ? "lucide:triangle-alert" : "lucide:help-circle"}
              width={18}
            />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2
              id="studio-confirm-title"
              className="text-[14px] font-bold leading-snug text-[#11224E]"
            >
              {state.title}
            </h2>
            {state.description ? (
              <p className="mt-1 text-[12px] leading-5 text-[#5a6b85]">
                {state.description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 bg-[#f8fafc] px-4 py-3">
          <button type="button" className={btn} onClick={onClose} autoFocus>
            {state.cancelLabel ?? "Cancelar"}
          </button>
          <button
            type="button"
            className={
              state.danger
                ? "inline-flex items-center justify-center gap-1 rounded-lg bg-[#C8102E] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-[#a50d25]"
                : btnPrimary
            }
            onClick={() => {
              const run = state.onConfirm;
              onClose();
              run();
            }}
          >
            {state.confirmLabel ?? "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Rail oscuro tipo Supabase: iconos siempre; labels al hover.
 *  (ERP global usa AppIconRail; aquí solo tabs de estudio.)
 */
function StudioPanelTabs({
  panel,
  onPanel,
}: {
  panel: Panel;
  onPanel: (p: Panel) => void;
}) {
  const tabs: { id: Panel; label: string; icon: string }[] = [
    { id: "compose", label: "Componer", icon: "lucide:pen-tool" },
    { id: "agenda", label: "Agenda", icon: "lucide:book-user" },
  ];

  return (
    <div className="flex items-center gap-1 rounded-xl bg-[#0B1A3D]/[0.06] p-1 ring-1 ring-[#11224E]/10">
      {tabs.map((tab) => {
        const active = panel === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            title={tab.label}
            onClick={() => onPanel(tab.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
              active
                ? "bg-[#11224E] text-white shadow-sm"
                : "text-[#5a6b85] hover:bg-white hover:text-[#11224E]"
            }`}
          >
            <Icon icon={tab.icon} width={13} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function LibraryTilePreview({ kind }: { kind: BlockKind }) {
  switch (kind) {
    case "headerAsli":
      return (
        <div className="flex h-full w-full flex-col justify-end overflow-hidden rounded-md bg-[#002d69]">
          <div className="mx-2 mb-1.5 h-1.5 w-8 rounded-sm bg-white/80" />
          <div className="h-1 w-full bg-[#C8102E]" />
        </div>
      );
    case "footerAsli":
      return (
        <div className="flex h-full w-full items-center justify-between overflow-hidden rounded-md bg-[#0B1A3D] px-2">
          <div className="h-1.5 w-7 rounded-sm bg-white/70" />
          <div className="h-5 w-0.5 bg-[#C8102E]" />
          <div className="space-y-0.5">
            <div className="h-1 w-8 rounded-sm bg-white/40" />
            <div className="h-1 w-6 rounded-sm bg-white/30" />
          </div>
        </div>
      );
    case "greeting":
    case "text":
    case "markdown":
      return (
        <div className="flex h-full w-full flex-col justify-center gap-1 px-2">
          <div className="h-1 w-[88%] rounded-sm bg-[#11224E]/35" />
          <div className="h-1 w-[72%] rounded-sm bg-[#11224E]/20" />
          <div className="h-1 w-[60%] rounded-sm bg-[#11224E]/15" />
        </div>
      );
    case "heading":
      return (
        <div className="flex h-full w-full flex-col justify-center gap-1 px-2">
          <div className="h-1 w-8 rounded-sm bg-[#C8102E]/70" />
          <div className="h-2 w-[70%] rounded-sm bg-[#11224E]/55" />
        </div>
      );
    case "button":
    case "buttonsRow":
    case "link":
      return (
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-4 w-14 rounded-md bg-[#11224E]" />
        </div>
      );
    case "image":
    case "gallery":
    case "avatar":
    case "product":
      return (
        <div className="flex h-full w-full items-center justify-center p-1.5">
          <div className="flex h-full w-full items-center justify-center rounded-md bg-gradient-to-br from-[#dbe4f0] to-[#eef2f8] ring-1 ring-[#c5d0e0]/80">
            <Icon icon="lucide:image" width={14} className="text-[#5a6b85]/70" />
          </div>
        </div>
      );
    case "divider":
      return (
        <div className="flex h-full w-full items-center px-2">
          <div className="h-px w-full bg-[#94a3b8]/70" />
        </div>
      );
    case "spacer":
      return (
        <div className="flex h-full w-full items-center justify-center gap-0.5">
          <div className="h-3 w-px bg-[#94a3b8]/50" />
          <Icon icon="lucide:unfold-vertical" width={12} className="text-[#5a6b85]/60" />
          <div className="h-3 w-px bg-[#94a3b8]/50" />
        </div>
      );
    case "listNumbered":
    case "listBullet":
    case "listDash":
    case "listCheck":
    case "listSteps":
      return (
        <div className="flex h-full w-full flex-col justify-center gap-1 px-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-[#11224E]/50" />
              <div className="h-1 flex-1 rounded-sm bg-[#11224E]/20" />
            </div>
          ))}
        </div>
      );
    case "callout":
    case "quote":
    case "containerBand":
      return (
        <div className="flex h-full w-full items-center p-1.5">
          <div className="flex h-full w-full items-center gap-1 rounded-md border border-[#11224E]/15 bg-[#eef2f8] px-1.5">
            <div className="h-5 w-0.5 rounded-full bg-[#11224E]" />
            <div className="h-1 flex-1 rounded-sm bg-[#11224E]/25" />
          </div>
        </div>
      );
    case "grid":
    case "sectionLayout":
    case "pricing":
    case "stats":
    case "feature":
      return (
        <div className="grid h-full w-full grid-cols-3 gap-0.5 p-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-sm bg-[#eef2f8] ring-1 ring-[#d5dde8]" />
          ))}
        </div>
      );
    case "article":
    case "testimonial":
    case "feedback":
    case "checkout":
      return (
        <div className="flex h-full w-full gap-1 p-1.5">
          <div className="w-[38%] rounded-sm bg-[#dbe4f0]" />
          <div className="flex flex-1 flex-col justify-center gap-1">
            <div className="h-1.5 w-[80%] rounded-sm bg-[#11224E]/40" />
            <div className="h-1 w-full rounded-sm bg-[#11224E]/18" />
            <div className="h-1 w-[70%] rounded-sm bg-[#11224E]/12" />
          </div>
        </div>
      );
    case "dataRow":
      return (
        <div className="flex h-full w-full items-center gap-1 px-2">
          <div className="h-4 w-4 rounded-full bg-[#11224E]" />
          <div className="h-1.5 w-8 rounded-sm bg-[#11224E]/45" />
          <div className="h-1 flex-1 rounded-sm bg-[#11224E]/18" />
        </div>
      );
    case "codeInline":
    case "codeBlock":
    case "html":
      return (
        <div className="flex h-full w-full items-center justify-center">
          <div className="rounded bg-[#0B1A3D] px-2 py-1 font-mono text-[8px] text-[#7dd3fc]">
            {"</>"}
          </div>
        </div>
      );
    default:
      return (
        <div className="flex h-full w-full items-center justify-center">
          <Icon icon="lucide:box" width={14} className="text-[#5a6b85]/60" />
        </div>
      );
  }
}

function LibraryAddPanel({
  onAdd,
}: {
  onAdd: (item: StudioLibraryItem) => void;
}) {
  const groups = useMemo(() => getStudioLibraryGrouped(), []);
  const allItems = useMemo(() => getStudioLibraryFlat(), []);
  const [activeGroup, setActiveGroup] = useState<string>("basicos");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const visibleItems = useMemo(() => {
    if (q) {
      return allItems.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.kind.toLowerCase().includes(q),
      );
    }
    const group = groups.find((g) => g.group.id === activeGroup);
    return group?.items ?? allItems;
  }, [q, allItems, groups, activeGroup]);

  return (
    <div className="flex min-h-0 flex-col border-b border-[#e8eef5]">
      <div className="px-2.5 pb-1.5 pt-2">
        <div className="mb-2 flex items-center justify-between px-0.5">
          <p className={label + " mb-0"}>Elementos</p>
          <span className="text-[9px] font-semibold text-[#5a6b85]/80">
            {visibleItems.length}
          </span>
        </div>
        <div className="relative">
          <Icon
            icon="lucide:search"
            width={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5a6b85]/70"
          />
          <input
            className={input + " !py-1.5 !pl-8 !text-[11px]"}
            placeholder="Buscar elemento…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar elementos"
          />
        </div>
      </div>

      {!q ? (
        <div className="flex gap-1 overflow-x-auto px-2.5 pb-2 scrollbar-thin">
          {groups.map(({ group }) => {
            const active = activeGroup === group.id;
            return (
              <button
                key={group.id}
                type="button"
                title={group.label}
                onClick={() => setActiveGroup(group.id)}
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                  active
                    ? "bg-[#11224E] text-white shadow-sm"
                    : "bg-[#eef2f8] text-[#1a2744]/75 hover:bg-[#e2e8f0]"
                }`}
              >
                <Icon icon={group.icon} width={11} />
                {group.label}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="px-3 pb-1.5 text-[9px] font-semibold text-[#5a6b85]">
          Resultados de búsqueda
        </p>
      )}

      <div className="max-h-[340px] overflow-y-auto px-2 pb-2.5">
        {visibleItems.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#d5dde8] bg-[#f8fafc] px-3 py-6 text-center text-[11px] text-[#5a6b85]">
            Sin coincidencias. Prueba otra palabra.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                type="button"
                title={`${item.label} — ${item.description}`}
                onClick={() => onAdd(item)}
                className="group flex flex-col overflow-hidden rounded-xl border border-[#e2e8f0] bg-white text-left shadow-[0_1px_0_rgba(17,34,78,0.04)] transition hover:-translate-y-0.5 hover:border-[#11224E]/25 hover:shadow-[0_8px_18px_-12px_rgba(17,34,78,0.45)]"
              >
                <div className="relative h-[58px] bg-[#f3f6fb]">
                  <LibraryTilePreview kind={item.kind} />
                  <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-md bg-white/90 text-[#11224E] opacity-0 shadow-sm ring-1 ring-[#e2e8f0] transition group-hover:opacity-100">
                    <Icon icon="lucide:plus" width={12} />
                  </span>
                </div>
                <div className="border-t border-[#eef2f8] px-2 py-1.5">
                  <p className="truncate text-[10px] font-bold leading-tight text-[#11224E]">
                    {item.label}
                  </p>
                  <p className="mt-0.5 truncate text-[9px] leading-tight text-[#5a6b85]">
                    {item.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="border-t border-[#eef2f8] px-3 py-1.5 text-[9px] leading-4 text-[#5a6b85]/85">
        Un clic agrega. El estilo (variante, color, imagen) se cambia a la derecha en Propiedades.
      </p>
    </div>
  );
}

const ALIGNABLE_KINDS = new Set<BlockKind>([
  "greeting",
  "heading",
  "text",
  "listNumbered",
  "listBullet",
  "listDash",
  "listCheck",
  "listSteps",
  "callout",
  "quote",
  "button",
  "image",
  "dataRow",
]);

function cloneStudioDoc(d: StudioDocument): StudioDocument {
  return {
    asunto: d.asunto,
    previewText: d.previewText,
    blocks: d.blocks.map((b) => ({
      id: b.id,
      kind: b.kind,
      props: { ...b.props },
    })),
  };
}

function cloneBlocks(blocks: StudioBlock[]): StudioBlock[] {
  return blocks.map((b) => ({
    id: b.id,
    kind: b.kind,
    props: { ...b.props },
  }));
}

function isEditableHotkeyTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return !!target.closest("input, textarea, select, [contenteditable='true']");
}

export function InformativosContent() {
  const { user, profile, isLoading, isSuperadmin } = useAuth();
  const canSendInformativos = isSuperadmin;
  const [doc, setDoc] = useState<StudioDocument>(() => createDefaultStudioDocument());
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const d = createDefaultStudioDocument();
    return d.blocks[0]?.id ? [d.blocks[0].id] : [];
  });
  const [previewNombre, setPreviewNombre] = useState("Usuario");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>("compose");
  const [capasOpen, setCapasOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  const [destRaw, setDestRaw] = useState("");
  const [resolved, setResolved] = useState<DestinatarioAgenda[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [grupos, setGrupos] = useState<InformacionesGrupo[]>([]);
  const [gruposSeleccionados, setGruposSeleccionados] = useState<Set<string>>(
    new Set(),
  );
  const [grupoLoading, setGrupoLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [agenda, setAgenda] = useState<InformacionesContacto[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [agendaFiltroGrupo, setAgendaFiltroGrupo] = useState<string>("");
  const [importRaw, setImportRaw] = useState("");
  const [importGrupo, setImportGrupo] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newEmpresa, setNewEmpresa] = useState("");
  const [newGrupo, setNewGrupo] = useState("");
  const [agendaBusy, setAgendaBusy] = useState(false);
  const [confirmDlg, setConfirmDlg] = useState<StudioConfirm | null>(null);

  const closeConfirm = useCallback(() => setConfirmDlg(null), []);

  const historyPastRef = useRef<StudioDocument[]>([]);
  const historyFutureRef = useRef<StudioDocument[]>([]);
  const blockClipboardRef = useRef<StudioBlock[]>([]);
  const propsHistoryPendingRef = useRef(false);
  const propsHistoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const docRef = useRef(doc);
  docRef.current = doc;
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const panelRef = useRef(panel);
  panelRef.current = panel;

  const applyDoc = useCallback((updater: (d: StudioDocument) => StudioDocument) => {
    const prev = docRef.current;
    const next = updater(prev);
    if (next === prev) return;
    propsHistoryPendingRef.current = false;
    historyPastRef.current.push(cloneStudioDoc(prev));
    if (historyPastRef.current.length > 60) historyPastRef.current.shift();
    historyFutureRef.current = [];
    docRef.current = next;
    setDoc(next);
  }, []);

  const replaceDoc = useCallback((next: StudioDocument) => {
    const prev = docRef.current;
    propsHistoryPendingRef.current = false;
    historyPastRef.current.push(cloneStudioDoc(prev));
    if (historyPastRef.current.length > 60) historyPastRef.current.shift();
    historyFutureRef.current = [];
    docRef.current = next;
    setDoc(next);
  }, []);

  const undoDoc = useCallback(() => {
    const past = historyPastRef.current;
    if (!past.length) return;
    propsHistoryPendingRef.current = false;
    const prev = past.pop()!;
    historyFutureRef.current.push(cloneStudioDoc(docRef.current));
    docRef.current = prev;
    setDoc(prev);
    setSelectedIds((ids) =>
      ids.filter((id) => prev.blocks.some((b) => b.id === id)),
    );
  }, []);

  const redoDoc = useCallback(() => {
    const future = historyFutureRef.current;
    if (!future.length) return;
    propsHistoryPendingRef.current = false;
    const next = future.pop()!;
    historyPastRef.current.push(cloneStudioDoc(docRef.current));
    docRef.current = next;
    setDoc(next);
    setSelectedIds((ids) =>
      ids.filter((id) => next.blocks.some((b) => b.id === id)),
    );
  }, []);

  const selectedId = selectedIds[selectedIds.length - 1] ?? null;
  const selected = doc.blocks.find((b) => b.id === selectedId) ?? null;
  const multiSelected = selectedIds.length > 1;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const alignableSelected = useMemo(
    () => doc.blocks.filter((b) => selectedSet.has(b.id) && ALIGNABLE_KINDS.has(b.kind)),
    [doc.blocks, selectedSet],
  );

  const selectOnly = useCallback((id: string | null) => {
    setSelectedIds(id ? [id] : []);
  }, []);

  const askBlankTemplate = useCallback(() => {
    const applyBlank = () => {
      const next = createBlankStudioDocument();
      replaceDoc(next);
      selectOnly(null);
      setPanel("compose");
    };
    if (doc.blocks.length === 0) {
      applyBlank();
      return;
    }
    setConfirmDlg({
      title: "¿Dejar la plantilla en blanco?",
      description: "Se perderán el asunto, el preview y todos los bloques actuales.",
      confirmLabel: "Dejar en blanco",
      cancelLabel: "Cancelar",
      danger: true,
      onConfirm: applyBlank,
    });
  }, [doc.blocks.length, replaceDoc, selectOnly]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        return next;
      }
      return [...prev, id];
    });
  }, []);

  const selectRangeTo = useCallback(
    (id: string) => {
      const ids = doc.blocks.map((b) => b.id);
      const to = ids.indexOf(id);
      if (to < 0) {
        selectOnly(id);
        return;
      }
      const fromId = selectedIds[selectedIds.length - 1];
      const from = fromId ? ids.indexOf(fromId) : to;
      if (from < 0) {
        selectOnly(id);
        return;
      }
      const [a, b] = from <= to ? [from, to] : [to, from];
      setSelectedIds(ids.slice(a, b + 1));
    },
    [doc.blocks, selectedIds, selectOnly],
  );

  const onBlockNavClick = useCallback(
    (id: string, e: MouseEvent) => {
      if (e.shiftKey) {
        e.preventDefault();
        selectRangeTo(id);
        return;
      }
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        toggleSelect(id);
        return;
      }
      selectOnly(id);
    },
    [selectOnly, selectRangeTo, toggleSelect],
  );

  const parsed = useMemo(() => parseDestinatarios(destRaw), [destRaw]);
  const selectedList = resolved.filter((d) => picked.has(d.email));
  const agendaVisible = useMemo(() => {
    if (!agendaFiltroGrupo) return agenda;
    return agenda.filter((c) => c.grupos?.includes(agendaFiltroGrupo));
  }, [agenda, agendaFiltroGrupo]);

  const reloadGrupos = useCallback(async () => {
    try {
      const rows = await listGrupos();
      setGrupos(rows);
      setImportGrupo((cur) => cur || rows[0]?.nombre || "");
      setNewGrupo((cur) => cur || rows[0]?.nombre || "");
    } catch (e) {
      console.error(e);
    }
  }, []);

  const reloadAgenda = useCallback(async () => {
    setAgendaLoading(true);
    try {
      const rows = await listAgendaCompleta();
      setAgenda(rows);
    } catch (e) {
      console.error(e);
      sileo.error({
        title: "No se pudo cargar la agenda",
        description: e instanceof Error ? e.message : "Error",
      });
    } finally {
      setAgendaLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadGrupos();
  }, [reloadGrupos]);

  useEffect(() => {
    let dead = false;
    setPreviewError(null);
    void renderStudioHtml(doc, previewNombre, { interactive: true })
      .then((html) => {
        if (!dead) {
          setPreviewHtml(html);
          setPreviewKey((k) => k + 1);
        }
      })
      .catch((e) => {
        console.error(e);
        if (!dead) {
          setPreviewError(e instanceof Error ? e.message : "Error al renderizar");
        }
      });
    return () => {
      dead = true;
    };
  }, [doc, previewNombre]);

  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      const data = ev.data;
      if (!data || typeof data !== "object") return;
      if (data.type !== PREVIEW_SELECT_MSG || typeof data.id !== "string") return;
      selectOnly(data.id);
      setPanel("compose");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [selectOnly]);

  useEffect(() => {
    if (!selectedId) return;
    document
      .getElementById(`studio-block-nav-${selectedId}`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  const syncPreviewSelection = useCallback(() => {
    const root = previewIframeRef.current?.contentDocument;
    if (!root) return;
    root.querySelectorAll("[data-studio-block-id]").forEach((el) => {
      const id = el.getAttribute("data-studio-block-id");
      el.classList.toggle("is-selected", !!id && selectedSet.has(id));
    });
  }, [selectedSet]);

  useEffect(() => {
    syncPreviewSelection();
  }, [syncPreviewSelection, previewHtml]);

  useEffect(() => {
    if (panel === "agenda" || panel === "send") {
      void reloadGrupos();
      if (panel === "agenda") void reloadAgenda();
    }
  }, [panel, reloadAgenda, reloadGrupos]);

  /** Destinatarios: grupos marcados + pegado; nombres solo desde agenda. */
  useEffect(() => {
    let dead = false;
    void (async () => {
      try {
        const byEmail = new Map<string, DestinatarioAgenda>();
        const seleccion = [...gruposSeleccionados];

        if (seleccion.length) {
          setGrupoLoading(true);
          const contactos = await listContactosDeGrupos(seleccion);
          for (const d of contactosToDestinatarios(contactos)) {
            byEmail.set(d.email, d);
          }
        }

        if (parsed.destinatarios.length) {
          const map = await lookupContactosByEmails(
            parsed.destinatarios.map((d) => d.email),
          );
          for (const d of parsed.destinatarios) {
            const found = map.get(d.email);
            byEmail.set(d.email, {
              email: d.email,
              nombre: found
                ? primerNombre(found.nombre)
                : d.nombre || nombreDesdeEmail(d.email),
              empresa: found?.empresa ?? null,
              contactoId: found?.id,
            });
          }
        }

        if (dead) return;
        const next = [...byEmail.values()].sort((a, b) =>
          a.email.localeCompare(b.email),
        );
        setResolved(next);
        setPicked(new Set(next.map((d) => d.email)));
      } catch (e) {
        console.error(e);
        if (!dead) {
          const fallback = parsed.destinatarios.map((d) => ({
            email: d.email,
            nombre: d.nombre,
          }));
          setResolved(fallback);
          setPicked(new Set(fallback.map((d) => d.email)));
        }
      } finally {
        if (!dead) setGrupoLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, [destRaw, gruposSeleccionados]);

  const addLibraryItem = (item: StudioLibraryItem) => {
    const block = createFromLibrary(item);
    applyDoc((d) => {
      if (!selectedId) {
        return { ...d, blocks: [...d.blocks, block] };
      }
      const i = d.blocks.findIndex((b) => b.id === selectedId);
      if (i < 0) return { ...d, blocks: [...d.blocks, block] };
      const blocks = [...d.blocks];
      blocks.splice(i + 1, 0, block);
      return { ...d, blocks };
    });
    selectOnly(block.id);
  };

  const changeBlockKind = (id: string, kind: BlockKind) => {
    applyDoc((d) => ({
      ...d,
      blocks: d.blocks.map((b) => (b.id === id ? { ...b, kind } : b)),
    }));
  };

  const duplicateBlock = (id: string) => {
    const i = docRef.current.blocks.findIndex((b) => b.id === id);
    if (i < 0) return;
    const source = docRef.current.blocks[i];
    const copy = {
      id: newBlockId(),
      kind: source.kind,
      props: { ...source.props },
    };
    applyDoc((d) => {
      const idx = d.blocks.findIndex((b) => b.id === id);
      if (idx < 0) return d;
      const blocks = [...d.blocks];
      blocks.splice(idx + 1, 0, copy);
      return { ...d, blocks };
    });
    selectOnly(copy.id);
  };

  const updateProps = (id: string, key: string, value: string) => {
    const prev = docRef.current;
    if (!propsHistoryPendingRef.current) {
      historyPastRef.current.push(cloneStudioDoc(prev));
      if (historyPastRef.current.length > 60) historyPastRef.current.shift();
      historyFutureRef.current = [];
      propsHistoryPendingRef.current = true;
    }
    const next: StudioDocument = {
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === id ? { ...b, props: { ...b.props, [key]: value } } : b,
      ),
    };
    docRef.current = next;
    setDoc(next);
    if (propsHistoryTimerRef.current) clearTimeout(propsHistoryTimerRef.current);
    propsHistoryTimerRef.current = setTimeout(() => {
      propsHistoryPendingRef.current = false;
    }, 450);
  };

  const updateAlignMany = (ids: string[], align: string) => {
    const idSet = new Set(ids);
    applyDoc((d) => ({
      ...d,
      blocks: d.blocks.map((b) =>
        idSet.has(b.id) && ALIGNABLE_KINDS.has(b.kind)
          ? { ...b, props: { ...b.props, align } }
          : b,
      ),
    }));
  };

  const move = (id: string, dir: -1 | 1) => {
    applyDoc((d) => {
      const i = d.blocks.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.blocks.length) return d;
      const blocks = [...d.blocks];
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      return { ...d, blocks };
    });
  };

  const remove = useCallback(
    (id: string) => {
      applyDoc((d) => {
        const blocks = d.blocks.filter((b) => b.id !== id);
        if (blocks.length === d.blocks.length) return d;
        return { ...d, blocks };
      });
      setSelectedIds((cur) => cur.filter((x) => x !== id));
    },
    [applyDoc],
  );

  const removeSelected = useCallback(() => {
    const ids = selectedIdsRef.current;
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    applyDoc((d) => {
      const blocks = d.blocks.filter((b) => !idSet.has(b.id));
      if (blocks.length === d.blocks.length) return d;
      return { ...d, blocks };
    });
    setSelectedIds([]);
  }, [applyDoc]);

  const copySelectedBlocks = useCallback(() => {
    const ids = selectedIdsRef.current;
    if (!ids.length) return false;
    const idSet = new Set(ids);
    const blocks = docRef.current.blocks.filter((b) => idSet.has(b.id));
    if (!blocks.length) return false;
    blockClipboardRef.current = cloneBlocks(blocks);
    return true;
  }, []);

  const cutSelectedBlocks = useCallback(() => {
    if (!copySelectedBlocks()) return;
    removeSelected();
  }, [copySelectedBlocks, removeSelected]);

  const pasteClipboardBlocks = useCallback(() => {
    const clip = blockClipboardRef.current;
    if (!clip.length) return;
    const pasted = clip.map((b) => ({
      id: newBlockId(),
      kind: b.kind,
      props: { ...b.props },
    }));
    const afterId = selectedIdsRef.current.at(-1);
    applyDoc((d) => {
      const blocks = [...d.blocks];
      const i = afterId ? blocks.findIndex((b) => b.id === afterId) : -1;
      blocks.splice(i >= 0 ? i + 1 : blocks.length, 0, ...pasted);
      return { ...d, blocks };
    });
    setSelectedIds(pasted.map((b) => b.id));
  }, [applyDoc]);

  const handleStudioHotkey = useCallback(
    (e: KeyboardEvent) => {
      if (panelRef.current !== "compose") return;
      if (confirmDlg) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const inField = isEditableHotkeyTarget(e.target);

      if (mod && key === "z" && !e.shiftKey) {
        if (inField) return;
        e.preventDefault();
        undoDoc();
        return;
      }
      if (mod && (key === "y" || (key === "z" && e.shiftKey))) {
        if (inField) return;
        e.preventDefault();
        redoDoc();
        return;
      }
      if (mod && key === "c") {
        if (inField) return;
        if (!selectedIdsRef.current.length) return;
        e.preventDefault();
        copySelectedBlocks();
        return;
      }
      if (mod && key === "x") {
        if (inField) return;
        if (!selectedIdsRef.current.length) return;
        e.preventDefault();
        cutSelectedBlocks();
        return;
      }
      if (mod && key === "v") {
        if (inField) return;
        if (!blockClipboardRef.current.length) return;
        e.preventDefault();
        pasteClipboardBlocks();
        return;
      }
      if (
        !inField &&
        !mod &&
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedIdsRef.current.length > 0
      ) {
        e.preventDefault();
        removeSelected();
      }
    },
    [
      confirmDlg,
      copySelectedBlocks,
      cutSelectedBlocks,
      pasteClipboardBlocks,
      redoDoc,
      removeSelected,
      undoDoc,
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleStudioHotkey);
    return () => window.removeEventListener("keydown", handleStudioHotkey);
  }, [handleStudioHotkey]);

  useEffect(() => {
    const bindIframeHotkeys = () => {
      const iframeDoc = previewIframeRef.current?.contentDocument;
      if (!iframeDoc) return () => {};
      const onKey = (e: KeyboardEvent) => handleStudioHotkey(e);
      iframeDoc.addEventListener("keydown", onKey);
      return () => iframeDoc.removeEventListener("keydown", onKey);
    };
    let cleanup = bindIframeHotkeys();
    const iframe = previewIframeRef.current;
    const onLoad = () => {
      cleanup();
      cleanup = bindIframeHotkeys();
    };
    iframe?.addEventListener("load", onLoad);
    return () => {
      cleanup();
      iframe?.removeEventListener("load", onLoad);
    };
  }, [handleStudioHotkey, previewKey, previewHtml]);

  const sendList = async (list: DestinatarioAgenda[]) => {
    if (!canSendInformativos) {
      sileo.error({
        title: "Envío en desarrollo",
        description:
          "Por seguridad, solo Rodrigo Cáceres puede enviar estos correos. Puedes componer plantillas y usar la agenda con normalidad.",
      });
      return;
    }
    if (!doc.asunto.trim()) {
      sileo.error({ title: "Falta asunto" });
      return;
    }
    if (!list.length) {
      sileo.error({ title: "Sin destinatarios" });
      return;
    }
    setSending(true);
    let ok = 0;
    let fail = 0;
    let lastError = "";
    for (const dest of list) {
      try {
        const html = await renderStudioHtml(doc, dest.nombre, {
          preferPublicAssets: true,
        });
        const r = await sendEmail({
          to: dest.email,
          subject: doc.asunto,
          body: html,
          sendFrom: "informaciones",
          // Firma HTML del buzón informaciones@ (Gmail settings)
          skipSignature: false,
        });
        if (r.success) ok += 1;
        else {
          fail += 1;
          lastError = r.error ?? "";
        }
      } catch (e) {
        fail += 1;
        lastError = e instanceof Error ? e.message : "Error";
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    setSending(false);
    if (fail === 0) sileo.success({ title: `Enviado ×${ok}` });
    else sileo.error({ title: `Ok ${ok} / fallos ${fail}`, description: lastError });
  };

  const onImport = async () => {
    if (!importRaw.trim()) {
      sileo.error({ title: "Pega la lista primero" });
      return;
    }
    const grupo = importGrupo.trim() || grupos[0]?.nombre;
    if (!grupo) {
      sileo.error({ title: "Elige un grupo" });
      return;
    }
    setAgendaBusy(true);
    try {
      const r = await importContactosToGrupo(importRaw, grupo);
      await reloadGrupos();
      await reloadAgenda();
      setImportRaw("");
      if (r.errores.length) {
        sileo.error({
          title: `Importados ${r.ok}`,
          description: r.errores.slice(0, 4).join(" · "),
        });
      } else {
        sileo.success({ title: `Importados ${r.ok} contactos` });
      }
    } catch (e) {
      sileo.error({
        title: "Error al importar",
        description: e instanceof Error ? e.message : "Error",
      });
    } finally {
      setAgendaBusy(false);
    }
  };

  const onAddOne = async () => {
    const grupo = newGrupo.trim() || grupos[0]?.nombre;
    if (!grupo) {
      sileo.error({ title: "Elige un grupo" });
      return;
    }
    setAgendaBusy(true);
    try {
      await upsertContacto({
        nombre: newNombre,
        email: newEmail,
        empresa: newEmpresa || null,
        grupoNombre: grupo,
      });
      setNewNombre("");
      setNewEmail("");
      setNewEmpresa("");
      await reloadGrupos();
      await reloadAgenda();
      sileo.success({ title: "Contacto guardado" });
    } catch (e) {
      sileo.error({
        title: "No se pudo guardar",
        description: e instanceof Error ? e.message : "Error",
      });
    } finally {
      setAgendaBusy(false);
    }
  };

  if (isLoading) {
    return (
      <main className={`flex flex-1 ${boardBg} p-3 text-[12px] text-[#5a6b85]`}>
        Cargando estudio…
      </main>
    );
  }

  const inspectorBody = multiSelected ? (
    <div className="space-y-3">
      {alignableSelected.length > 0 ? (
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-3 shadow-sm">
          <label className={label}>
            Alinear {alignableSelected.length} bloque
            {alignableSelected.length === 1 ? "" : "s"}
          </label>
          <AlignPicker
            value={
              alignableSelected.every(
                (b) =>
                  (b.props.align || "left") ===
                  (alignableSelected[0].props.align || "left"),
              )
                ? alignableSelected[0].props.align || "left"
                : ""
            }
            onChange={(v) =>
              updateAlignMany(
                alignableSelected.map((b) => b.id),
                v,
              )
            }
          />
          <p className="mt-1.5 text-[10px] leading-4 text-[#5a6b85]">
            Aplica a saludo, título, párrafo, botón, imagen y fila dato.
          </p>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-[#d5dde8] bg-white/60 px-3 py-2 text-[11px] text-[#5a6b85]">
          Ningún bloque seleccionado admite alineación.
        </p>
      )}
      <ul className="max-h-40 space-y-1 overflow-auto rounded-xl border border-[#e2e8f0] bg-white p-2 shadow-sm text-[10px] text-[#5a6b85]">
        {doc.blocks
          .filter((b) => selectedSet.has(b.id))
          .map((b) => (
            <li
              key={b.id}
              className="flex items-center gap-1.5 rounded-lg bg-[#f8fafc] px-2 py-1.5"
            >
              <Icon
                icon={PRESET_ICONS[b.kind] ?? "lucide:box"}
                width={12}
                className="shrink-0 text-[#11224E]/60"
              />
              <span className="font-semibold text-[#1a2744]/80">
                {STUDIO_PRESETS.find((x) => x.kind === b.kind)?.label ?? b.kind}
              </span>
              {!ALIGNABLE_KINDS.has(b.kind) ? (
                <span className="ml-auto opacity-50">sin alinear</span>
              ) : null}
            </li>
          ))}
      </ul>
    </div>
  ) : !selected ? (
    <div className="relative overflow-hidden rounded-2xl border border-[#d5dde8]/80 bg-gradient-to-b from-white via-white to-[#f3f6fb] px-3 py-7 text-center shadow-[0_10px_28px_-18px_rgba(17,34,78,0.45)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[radial-gradient(circle_at_center,rgba(17,34,78,0.12),transparent_68%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-[radial-gradient(circle_at_center,rgba(200,16,46,0.08),transparent_70%)]"
      />
      <div className="relative mx-auto mb-3.5 flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 rounded-[1.15rem] bg-[#11224E]/[0.06] ring-1 ring-[#11224E]/10" />
        <span className="absolute inset-1.5 rounded-[0.95rem] border border-dashed border-[#11224E]/20" />
        <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#11224E] via-[#16305f] to-[#0d1a3d] text-white shadow-[0_8px_20px_-6px_rgba(17,34,78,0.55)]">
          <Icon icon="lucide:mouse-pointer-click" width={20} />
        </span>
        <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-md bg-white text-[#C8102E] shadow-sm ring-1 ring-[#e2e8f0]">
          <Icon icon="lucide:sparkles" width={11} />
        </span>
      </div>
      <p className="relative text-[12px] font-bold tracking-tight text-[#11224E]">
        Sin bloque activo
      </p>
      <p className="relative mx-auto mt-1.5 max-w-[200px] text-[11px] leading-5 text-[#5a6b85]">
        Elige un bloque en Capas o en el lienzo. Marca varios para alinearlos juntos.
      </p>
      <div className="relative mt-4 flex flex-wrap justify-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-lg bg-[#11224E]/[0.05] px-2 py-1 text-[9px] font-semibold text-[#11224E]/80 ring-1 ring-[#11224E]/10">
          <Icon icon="lucide:mouse-pointer-2" width={10} />
          Clic · seleccionar
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-[#11224E]/[0.05] px-2 py-1 text-[9px] font-semibold text-[#11224E]/80 ring-1 ring-[#11224E]/10">
          <Icon icon="lucide:command" width={10} />
          Ctrl · sumar
        </span>
      </div>
    </div>
  ) : (
    <div className="space-y-3">
      {propFields(selected).length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#d5dde8] bg-white/70 px-3 py-3 text-[11px] text-[#5a6b85]">
          Este bloque no tiene campos (solo estructura visual).
        </p>
      ) : (
        <div className="space-y-2.5">
          {propFields(selected).map((f) => (
            <div
              key={f.key}
              className="rounded-xl border border-[#e2e8f0] bg-white p-2.5 shadow-sm"
            >
              <label className={label}>{f.label}</label>
              {f.control === "iconPicker" ? (
                <DataRowIconPicker
                  value={selected.props.icon ?? ""}
                  labelText={selected.props.label ?? ""}
                  valueText={selected.props.value ?? ""}
                  onChange={(v) => updateProps(selected.id, "icon", v)}
                />
              ) : f.control === "listStyle" && isListKind(selected.kind) ? (
                <ListStylePicker
                  value={selected.kind}
                  onChange={(kind) => changeBlockKind(selected.id, kind)}
                />
              ) : f.control === "listItems" ? (
                <ListItemsEditor
                  value={selected.props.items ?? ""}
                  onChange={(v) => updateProps(selected.id, "items", v)}
                />
              ) : f.control === "listSteps" ? (
                <ListStepsEditor
                  value={selected.props.items ?? ""}
                  onChange={(v) => updateProps(selected.id, "items", v)}
                />
              ) : f.control === "color" ? (
                <ColorPicker
                  value={selected.props[f.key] ?? ""}
                  onChange={(v) => {
                    const fb =
                      f.fallbackColor ||
                      (selected.kind === "text" || selected.kind === "greeting"
                        ? "#18181B"
                        : selected.kind === "quote" ||
                            selected.kind === "headerAsli" ||
                            selected.kind === "footerAsli"
                          ? "#C8102E"
                          : selected.kind === "divider"
                            ? "#E5E7EB"
                            : "#11224E");
                    updateProps(
                      selected.id,
                      f.key,
                      resolveStudioColor(v || fb, fb),
                    );
                  }}
                  fallback={
                    f.fallbackColor ||
                    (selected.kind === "text" || selected.kind === "greeting"
                      ? "#18181B"
                      : selected.kind === "quote" ||
                          selected.kind === "headerAsli" ||
                          selected.kind === "footerAsli"
                        ? "#C8102E"
                        : selected.kind === "divider"
                          ? "#E5E7EB"
                          : "#11224E")
                  }
                />
              ) : f.control === "align" ? (
                <AlignPicker
                  value={selected.props.align ?? "left"}
                  onChange={(v) => updateProps(selected.id, "align", v)}
                />
              ) : f.options ? (
                <select
                  className={input}
                  value={selected.props[f.key] || f.options[0]?.value || ""}
                  onChange={(e) => updateProps(selected.id, f.key, e.target.value)}
                >
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.multiline ? (
                <textarea
                  className={input + " min-h-[120px] font-mono text-[11px] leading-4"}
                  value={selected.props[f.key] ?? ""}
                  onChange={(e) => updateProps(selected.id, f.key, e.target.value)}
                  spellCheck={selected.kind !== "html"}
                />
              ) : (
                <input
                  className={input}
                  value={selected.props[f.key] ?? ""}
                  onChange={(e) => updateProps(selected.id, f.key, e.target.value)}
                />
              )}
              {f.hint ? (
                <p className="mt-1.5 text-[10px] leading-4 text-[#5a6b85]">{f.hint}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <main className="relative flex h-full min-h-0 flex-1 flex-col bg-[#cfd8e6]">
      <div className="z-10 flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-[#c5d0e0] bg-white/95 px-3 py-1.5">
        <StudioPanelTabs panel={panel} onPanel={setPanel} />
        {panel === "compose" ? (
          <>
            <p className="hidden text-[11px] font-semibold text-[#5a6b85] sm:inline">
              Plantilla
            </p>
            <div className="flex min-w-0 items-center gap-1">
              <select
                className={input + " !w-[min(100%,180px)] cursor-pointer sm:!w-[200px]"}
                defaultValue=""
                title="Cargar plantilla de prueba"
                aria-label="Cargar plantilla"
                onChange={(e) => {
                  const id = e.target.value;
                  e.target.value = "";
                  const tpl = STUDIO_DOCUMENT_TEMPLATES.find((t) => t.id === id);
                  if (!tpl) return;
                  const next = tpl.create();
                  replaceDoc(next);
                  selectOnly(next.blocks[0]?.id ?? null);
                  setPanel("compose");
                  sileo.success({ title: `Plantilla: ${tpl.label}` });
                }}
              >
                <option value="" disabled>
                  Plantillas…
                </option>
                {STUDIO_DOCUMENT_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={btn}
                title="Vaciar asunto, preview y bloques"
                onClick={askBlankTemplate}
              >
                <Icon icon="lucide:file-plus" width={13} />
                <span className="hidden sm:inline">En blanco</span>
              </button>
            </div>

            <div className="mx-auto flex min-w-0 justify-center">
              {selected && !multiSelected ? (
                <div className="flex min-w-0 max-w-full items-center gap-2 rounded-xl border border-[#e2e8f0] bg-[#f7f9fc] py-1 pl-1.5 pr-1 shadow-sm">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#11224E] to-[#1a3a6e] text-white shadow-sm">
                    <Icon
                      icon={PRESET_ICONS[selected.kind] ?? "lucide:box"}
                      width={14}
                    />
                  </span>
                  <div className="min-w-0 max-w-[140px] flex-1 sm:max-w-[180px]">
                    <p className="truncate text-[11px] font-bold leading-tight text-[#11224E]">
                      {STUDIO_PRESETS.find((x) => x.kind === selected.kind)?.label}
                    </p>
                    <p className="truncate text-[9px] leading-tight text-[#5a6b85]">
                      {
                        STUDIO_PRESETS.find((x) => x.kind === selected.kind)
                          ?.description
                      }
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-white p-0.5 ring-1 ring-[#e2e8f0]">
                    <button
                      type="button"
                      className={btnGhost + " !px-1.5 !py-1.5"}
                      title="Duplicar"
                      onClick={() => duplicateBlock(selected.id)}
                    >
                      <Icon icon="lucide:copy" width={13} />
                    </button>
                    <button
                      type="button"
                      className={btnGhost + " !px-1.5 !py-1.5"}
                      title="Subir"
                      onClick={() => move(selected.id, -1)}
                    >
                      <Icon icon="lucide:arrow-up" width={13} />
                    </button>
                    <button
                      type="button"
                      className={btnGhost + " !px-1.5 !py-1.5"}
                      title="Bajar"
                      onClick={() => move(selected.id, 1)}
                    >
                      <Icon icon="lucide:arrow-down" width={13} />
                    </button>
                    <button
                      type="button"
                      className={
                        btnGhost +
                        " !px-1.5 !py-1.5 text-[#C8102E] hover:bg-[#C8102E]/10"
                      }
                      title="Eliminar (Delete)"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        remove(selected.id);
                      }}
                    >
                      <Icon icon="lucide:trash-2" width={13} />
                    </button>
                  </div>
                </div>
              ) : multiSelected ? (
                <div className="flex min-w-0 max-w-full items-center gap-2 rounded-xl bg-gradient-to-r from-[#11224E] to-[#0B1A3D] py-1 pl-1.5 pr-1 text-white shadow-md">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                    <Icon icon="lucide:layers" width={14} />
                  </span>
                  <div className="min-w-0 max-w-[120px] flex-1 sm:max-w-[140px]">
                    <p className="truncate text-[11px] font-bold leading-tight">
                      {selectedIds.length} bloques
                    </p>
                    <p className="truncate text-[9px] leading-tight text-white/55">
                      Selección múltiple
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      className="rounded-lg bg-white/12 px-2 py-1.5 text-[10px] font-semibold text-white ring-1 ring-white/15 hover:bg-white/20"
                      onClick={() => selectOnly(selectedId)}
                    >
                      Solo 1
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-white/12 px-2 py-1.5 text-[10px] font-semibold text-white ring-1 ring-white/15 hover:bg-white/20"
                      onClick={() => setSelectedIds([])}
                    >
                      Limpiar
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg bg-[#C8102E] px-2 py-1.5 text-[10px] font-semibold text-white hover:bg-[#a50d26]"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeSelected();
                      }}
                      title="Eliminar seleccionados (Delete)"
                    >
                      <Icon icon="lucide:trash-2" width={12} />
                      <span className="hidden sm:inline">Eliminar</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="ml-auto flex items-center">
              <button
                type="button"
                className={
                  btnPrimary +
                  " !rounded-xl !px-3.5 !py-2 shadow-[0_6px_16px_-6px_rgba(17,34,78,0.55)]"
                }
                title="Ir a enviar"
                onClick={() => setPanel("send")}
              >
                <Icon icon="lucide:send" width={14} />
                Enviar
              </button>
            </div>
          </>
        ) : panel === "agenda" ? (
          <div className="ml-auto flex items-center">
            <button
              type="button"
              className={
                btnPrimary +
                " !rounded-xl !px-3.5 !py-2 shadow-[0_6px_16px_-6px_rgba(17,34,78,0.55)]"
              }
              title="Ir a enviar"
              onClick={() => setPanel("send")}
            >
              <Icon icon="lucide:send" width={14} />
              Enviar
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {panel === "compose" ? (
      <>
      {/* Studio body: left | canvas | right */}
      <div className="flex min-h-0 flex-1 flex-col overflow-auto lg:flex-row lg:overflow-hidden">
        {/* Left rail */}
        <aside className="flex w-full flex-col border-b border-[#c5d0e0] bg-white lg:w-[248px] lg:shrink-0 lg:border-b-0 lg:border-r">
          <LibraryAddPanel onAdd={addLibraryItem} />

          <div
            className={`flex flex-col px-2 py-2 ${
              capasOpen ? "min-h-0 flex-1" : "shrink-0 border-t border-[#eef2f8]"
            }`}
          >
            <div className="mb-0 flex items-center gap-1 px-1">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-1 rounded-lg py-0.5 text-left hover:bg-[#f3f6fb]"
                title={capasOpen ? "Minimizar Capas" : "Expandir Capas"}
                aria-expanded={capasOpen}
                onClick={() => setCapasOpen((v) => !v)}
              >
                <Icon
                  icon={capasOpen ? "lucide:chevron-down" : "lucide:chevron-right"}
                  width={14}
                  className="shrink-0 text-[#5a6b85]"
                />
                <p className={`${label} mb-0`}>Capas</p>
                <span className="rounded-full bg-[#eef2f8] px-1.5 py-0.5 text-[9px] font-bold text-[#5a6b85]">
                  {doc.blocks.length}
                </span>
              </button>
              {capasOpen ? (
                <>
                  <button
                    type="button"
                    className={btnGhost + " !py-0.5 !text-[10px]"}
                    title="Seleccionar todos"
                    disabled={doc.blocks.length === 0}
                    onClick={() => setSelectedIds(doc.blocks.map((b) => b.id))}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    className={btnGhost + " !py-0.5 !text-[10px]"}
                    title="Vaciar plantilla"
                    onClick={askBlankTemplate}
                  >
                    Vaciar
                  </button>
                </>
              ) : null}
            </div>
            {capasOpen ? (
              <>
                <p className="mb-1.5 mt-1 px-1 text-[9px] leading-3 text-[#5a6b85]/80">
                  Clic · Ctrl/Cmd sumar · Shift rango · Del borrar · Ctrl Z/X/C/V
                </p>
                <ul className="min-h-0 flex-1 space-y-0.5 overflow-auto pr-0.5">
                  {doc.blocks.map((b, idx) => {
                    const meta = STUDIO_PRESETS.find((x) => x.kind === b.kind);
                    const active = selectedSet.has(b.id);
                    const isFocus = b.id === selectedId;
                    const summary =
                      b.props.label ||
                      b.props.text?.slice(0, 24) ||
                      b.props.template?.slice(0, 24) ||
                      "";
                    return (
                      <li key={b.id} id={`studio-block-nav-${b.id}`}>
                        <div
                          className={`flex items-stretch gap-0.5 rounded-lg transition ${
                            active
                              ? isFocus
                                ? "bg-[#11224E] text-white shadow-sm"
                                : "bg-[#11224E]/80 text-white"
                              : "text-[#1a2744]/80 hover:bg-[#eef2f8]"
                          }`}
                        >
                          <label
                            className="flex cursor-pointer items-center pl-1.5"
                            title="Marcar"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              className="accent-[#11224E]"
                              checked={active}
                              onChange={() => toggleSelect(b.id)}
                            />
                          </label>
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-start gap-1.5 px-1.5 py-1.5 text-left"
                            onClick={(e) => onBlockNavClick(b.id, e)}
                          >
                            <Icon
                              icon={PRESET_ICONS[b.kind] ?? "lucide:box"}
                              width={13}
                              className={`mt-0.5 shrink-0 ${active ? "opacity-80" : "opacity-50"}`}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[11px] font-semibold">
                                <span className="opacity-50">{idx + 1}. </span>
                                {meta?.label ?? b.kind}
                              </span>
                              {summary ? (
                                <span
                                  className={`mt-0.5 block truncate text-[9px] font-normal ${
                                    active ? "text-white/65" : "text-[#5a6b85]"
                                  }`}
                                >
                                  {summary}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                  {doc.blocks.length === 0 ? (
                    <li className="px-2 py-6 text-center text-[11px] text-[#5a6b85]">
                      Sin capas. Agrega un componente.
                    </li>
                  ) : null}
                </ul>
              </>
            ) : null}
          </div>
        </aside>

        {/* Center canvas */}
        <section className={`relative flex min-h-[420px] min-w-0 flex-1 flex-col lg:min-h-0 ${boardBg}`}>
          <div className="pointer-events-none absolute inset-x-0 top-3 z-[1] flex justify-center">
            <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/60 bg-white/90 px-3 py-1.5 shadow-md backdrop-blur">
              <Icon icon="lucide:user" width={13} className="text-[#5a6b85]" />
              <input
                className="w-[110px] border-0 bg-transparent text-[11px] font-semibold text-[#11224E] outline-none"
                value={previewNombre}
                onChange={(e) => setPreviewNombre(e.target.value)}
                aria-label="Nombre preview"
                title="Nombre para personalizar el preview"
              />
              <span className="hidden text-[9px] text-[#5a6b85] sm:inline">
                · clic en el correo para editar
              </span>
              {previewError ? (
                <span className="max-w-[160px] truncate text-[10px] text-red-600">
                  {previewError}
                </span>
              ) : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-4 pb-8 pt-14">
            <div className="mx-auto w-full max-w-[680px]">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a6b85]/80">
                  Artboard · email
                </span>
                <span className="text-[10px] text-[#5a6b85]/70">650px</span>
              </div>
              <div className="overflow-hidden rounded-xl bg-white shadow-[0_12px_40px_-12px_rgba(17,34,78,0.35)] ring-1 ring-black/5">
                {previewHtml ? (
                  <iframe
                    key={previewKey}
                    ref={previewIframeRef}
                    title="preview"
                    className="block h-[min(72vh,900px)] min-h-[480px] w-full border-0 bg-white"
                    srcDoc={previewHtml}
                    onLoad={syncPreviewSelection}
                  />
                ) : (
                  <p className="p-10 text-center text-[12px] text-[#5a6b85]">
                    Generando preview…
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Right inspector — minimizable a la derecha */}
        <aside
          className={`relative flex flex-col overflow-hidden border-t border-[#c5d0e0] bg-[#e8eef6] transition-[width] duration-200 ease-out lg:shrink-0 lg:border-l lg:border-t-0 ${
            inspectorOpen
              ? "w-full lg:w-[308px]"
              : "w-full lg:w-[48px]"
          }`}
        >
          {!inspectorOpen ? (
            <div className="flex h-full flex-col items-center gap-2 px-1 py-3">
              <button
                type="button"
                title="Expandir panel"
                aria-expanded={false}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#11224E] text-white shadow-sm hover:bg-[#0d1a3d]"
                onClick={() => setInspectorOpen(true)}
              >
                <Icon icon="lucide:panel-right-open" width={16} />
              </button>
              <button
                type="button"
                title="Documento"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#11224E] shadow-sm ring-1 ring-[#d5dde8] hover:bg-[#f3f6fb]"
                onClick={() => setInspectorOpen(true)}
              >
                <Icon icon="lucide:mail-open" width={15} />
              </button>
              <button
                type="button"
                title="Propiedades"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#11224E] shadow-sm ring-1 ring-[#d5dde8] hover:bg-[#f3f6fb]"
                onClick={() => setInspectorOpen(true)}
              >
                <Icon icon="lucide:sliders-horizontal" width={15} />
              </button>
              <p
                className="mt-2 hidden text-[9px] font-semibold uppercase tracking-[0.18em] text-[#5a6b85]/70 lg:block"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              >
                Inspector
              </p>
            </div>
          ) : (
            <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.85),transparent_70%)]"
          />
          <div className="relative shrink-0 border-b border-[#d0dae8]/90 px-3 pb-3.5 pt-3">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#11224E] to-[#1a3a6e] text-white shadow-[0_6px_14px_-4px_rgba(17,34,78,0.55)]">
                <Icon icon="lucide:mail-open" width={14} />
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#C8102E] ring-2 ring-[#e8eef6]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold leading-tight tracking-tight text-[#11224E]">
                  Documento
                </p>
                <p className="text-[9px] font-medium text-[#5a6b85]">
                  Cómo se verá en la bandeja
                </p>
              </div>
              <button
                type="button"
                title="Minimizar panel"
                aria-expanded={true}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#5a6b85] shadow-sm ring-1 ring-[#d5dde8] hover:bg-[#f3f6fb] hover:text-[#11224E]"
                onClick={() => setInspectorOpen(false)}
              >
                <Icon icon="lucide:panel-right-close" width={15} />
              </button>
            </div>

            {/* Mini preview estilo bandeja */}
            <div className="mb-2.5 overflow-hidden rounded-xl bg-[#11224E] p-[1px] shadow-[0_10px_24px_-12px_rgba(17,34,78,0.55)]">
              <div className="rounded-[11px] bg-gradient-to-b from-[#16305f] to-[#0f1d42] px-2.5 py-2">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#C8102E]" />
                  <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-white/45">
                    Inbox preview
                  </span>
                </div>
                <p className="truncate text-[11px] font-semibold leading-4 text-white">
                  {doc.asunto.trim() || "Asunto del correo"}
                </p>
                <p className="mt-0.5 truncate text-[10px] leading-4 text-white/55">
                  {doc.previewText.trim() || "Texto corto en bandeja…"}
                </p>
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border border-white/80 bg-white/90 p-2.5 shadow-[0_8px_20px_-14px_rgba(17,34,78,0.4)] backdrop-blur-sm">
              <div>
                <label className="mb-1 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.07em] text-[#5a6b85]">
                    <Icon icon="lucide:text-cursor-input" width={11} />
                    Asunto
                  </span>
                  <span className="tabular-nums text-[9px] font-medium text-[#5a6b85]/70">
                    {doc.asunto.length}
                  </span>
                </label>
                <input
                  className={
                    input +
                    " !rounded-xl !border-[#e2e8f0] !bg-[#f7f9fc] !py-2 focus:!bg-white"
                  }
                  value={doc.asunto}
                  onChange={(e) => setDoc({ ...doc, asunto: e.target.value })}
                  placeholder="Asunto del correo"
                />
              </div>
              <div className="rounded-xl bg-[#f4f7fb] p-2 ring-1 ring-[#e2e8f0]/80">
                <label className="mb-1 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.07em] text-[#5a6b85]">
                    <Icon icon="lucide:eye" width={11} />
                    Preview inbox
                  </span>
                  <span className="tabular-nums text-[9px] font-medium text-[#5a6b85]/70">
                    {doc.previewText.length}
                  </span>
                </label>
                <input
                  className={
                    input +
                    " !rounded-xl !border-[#dce3ee] !bg-white !py-2 !shadow-none"
                  }
                  value={doc.previewText}
                  onChange={(e) => setDoc({ ...doc, previewText: e.target.value })}
                  placeholder="Texto corto en bandeja"
                />
                <p className="mt-1.5 flex items-start gap-1 text-[9px] leading-4 text-[#5a6b85]/85">
                  <Icon
                    icon="lucide:info"
                    width={10}
                    className="mt-0.5 shrink-0 opacity-70"
                  />
                  Aparece junto al asunto en Gmail / Outlook.
                </p>
              </div>
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-auto px-3 pb-3 pt-3.5">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#11224E] shadow-[0_4px_10px_-6px_rgba(17,34,78,0.45)] ring-1 ring-[#d5dde8]/90">
                <Icon icon="lucide:sliders-horizontal" width={13} />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-bold tracking-tight text-[#11224E]">
                  Propiedades
                </p>
                <p className="text-[9px] font-medium text-[#5a6b85]">
                  Ajustes del bloque activo
                </p>
              </div>
              {selected && !multiSelected ? (
                <span className="ml-auto max-w-[96px] truncate rounded-lg bg-[#11224E] px-2 py-1 text-[9px] font-semibold text-white shadow-sm">
                  {STUDIO_PRESETS.find((x) => x.kind === selected.kind)?.label}
                </span>
              ) : multiSelected ? (
                <span className="ml-auto rounded-lg bg-[#C8102E] px-2 py-1 text-[9px] font-semibold text-white shadow-sm">
                  {selectedIds.length} sel.
                </span>
              ) : (
                <span className="ml-auto rounded-lg bg-white/80 px-2 py-1 text-[9px] font-semibold text-[#5a6b85] ring-1 ring-[#d5dde8]">
                  Ninguno
                </span>
              )}
            </div>
            {inspectorBody}
          </div>
            </>
          )}
        </aside>
      </div>
      </>
      ) : null}

      {panel === "send" ? (
          <div
            className="flex h-full min-h-0 w-full flex-col bg-white"
            role="region"
            aria-label="Enviar informativo"
          >
            <div className="flex items-center gap-2 border-b border-[#e8eef5] px-3 py-2.5">
              <button
                type="button"
                className={btnGhost + " !px-2"}
                title="Volver a componer"
                onClick={() => setPanel("compose")}
              >
                <Icon icon="lucide:arrow-left" width={14} />
              </button>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#11224E] text-white">
                <Icon icon="lucide:send" width={14} />
              </span>
              <p className="text-[13px] font-bold text-[#11224E]">Enviar</p>
            </div>
            <div className="mx-auto min-h-0 w-full max-w-xl flex-1 space-y-3 overflow-auto p-4">
              {!canSendInformativos ? (
                <div
                  className="rounded border border-amber-300/80 bg-amber-50 px-3 py-2.5 text-[12px] leading-5 text-amber-950"
                  role="status"
                >
                  <p className="font-bold">Envío en desarrollo</p>
                  <p className="mt-1 text-amber-900/90">
                    Por seguridad, solo <strong>Rodrigo Cáceres</strong> puede enviar
                    correos informativos por ahora. Puedes armar plantillas, revisar el
                    preview, gestionar la agenda y conocer el sistema; el botón de envío
                    se habilitará más adelante.
                  </p>
                </div>
              ) : null}
              <div className="space-y-1 rounded border border-brand-blue/15 bg-[#f7f9fc] p-2">
                <div className="flex items-center gap-2">
                  <p className={label + " mb-0"}>Grupos</p>
                  {grupoLoading ? (
                    <span className="text-[10px] text-brand-blue/50">…</span>
                  ) : null}
                </div>
                {grupos.length === 0 ? (
                  <p className="text-[11px] text-brand-blue/45">Sin grupos cargados.</p>
                ) : (
                  <ul className="space-y-1">
                    {grupos.map((g) => (
                      <li key={g.id}>
                        <label className="flex items-center gap-2 text-[12px] font-semibold text-brand-blue">
                          <input
                            type="checkbox"
                            className="accent-[#11224E]"
                            checked={gruposSeleccionados.has(g.nombre)}
                            onChange={() => {
                              setGruposSeleccionados((prev) => {
                                const n = new Set(prev);
                                if (n.has(g.nombre)) n.delete(g.nombre);
                                else n.add(g.nombre);
                                return n;
                              });
                            }}
                          />
                          {g.nombre}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-[11px] text-brand-blue/60">
                Opcional: pega emails extra (uno por línea). Nombre desde la agenda o del correo —
                no usa Usuarios ERP.
              </p>
              <textarea
                className={input + " min-h-[80px] font-mono"}
                value={destRaw}
                onChange={(e) => setDestRaw(e.target.value)}
                placeholder="persona@empresa.cl"
              />
              {parsed.errores.length > 0 ? (
                <p className="text-[10px] text-red-600">{parsed.errores.join(" · ")}</p>
              ) : null}
              {resolved.length > 0 ? (
                <ul className="max-h-72 overflow-auto rounded border border-brand-blue/15 text-[11px]">
                  {resolved.map((d) => (
                    <li
                      key={d.email}
                      className="flex items-center gap-2 border-b border-brand-blue/8 px-2 py-1.5 last:border-0"
                    >
                      <input
                        type="checkbox"
                        className="accent-[#11224E]"
                        checked={picked.has(d.email)}
                        onChange={() => {
                          setPicked((prev) => {
                            const n = new Set(prev);
                            if (n.has(d.email)) n.delete(d.email);
                            else n.add(d.email);
                            return n;
                          });
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-brand-blue/90">{d.email}</p>
                        {d.empresa ? (
                          <p className="truncate text-[10px] text-brand-blue/45">{d.empresa}</p>
                        ) : null}
                      </div>
                      <input
                        className={input + " w-28"}
                        value={d.nombre}
                        onChange={(e) => {
                          const nombre = e.target.value;
                          setResolved((prev) =>
                            prev.map((x) =>
                              x.email === d.email ? { ...x, nombre } : x,
                            ),
                          );
                        }}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-brand-blue/45">
                  Marca uno o más grupos, o pega emails.
                </p>
              )}
            </div>
            <div className="mx-auto flex w-full max-w-xl flex-shrink-0 gap-2 border-t border-brand-blue/10 p-4">
              <button
                type="button"
                className={btn}
                disabled={sending || !canSendInformativos}
                title={
                  canSendInformativos
                    ? undefined
                    : "Solo Rodrigo Cáceres puede enviar mientras está en desarrollo"
                }
                onClick={() => {
                  if (!canSendInformativos) {
                    sileo.error({
                      title: "Envío en desarrollo",
                      description:
                        "Por seguridad, solo Rodrigo Cáceres puede enviar estos correos.",
                    });
                    return;
                  }
                  const email = (profile?.email ?? user?.email ?? "").trim();
                  if (!email) {
                    sileo.error({ title: "Sin email de sesión" });
                    return;
                  }
                  void sendList([
                    {
                      email,
                      nombre:
                        previewNombre ||
                        primerNombre(profile?.nombre ?? "") ||
                        nombreDesdeEmail(email),
                    },
                  ]);
                }}
              >
                Prueba a mí
              </button>
              <button
                type="button"
                className={btnPrimary}
                disabled={sending || selectedList.length === 0 || !canSendInformativos}
                title={
                  canSendInformativos
                    ? undefined
                    : "Solo Rodrigo Cáceres puede enviar mientras está en desarrollo"
                }
                onClick={() => {
                  if (!canSendInformativos) {
                    sileo.error({
                      title: "Envío en desarrollo",
                      description:
                        "Por seguridad, solo Rodrigo Cáceres puede enviar estos correos.",
                    });
                    return;
                  }
                  const n = selectedList.length;
                  setConfirmDlg({
                    title: `¿Enviar ${n} correo${n === 1 ? "" : "s"}?`,
                    description:
                      "Se enviará el informativo actual a los destinatarios seleccionados desde informaciones@asli.cl.",
                    confirmLabel: n === 1 ? "Enviar" : `Enviar ${n}`,
                    cancelLabel: "Cancelar",
                    onConfirm: () => {
                      void sendList(selectedList);
                    },
                  });
                }}
              >
                {sending ? "…" : `Enviar (${selectedList.length})`}
              </button>
            </div>
          </div>
      ) : null}

      {panel === "agenda" ? (
          <div
            className="flex h-full min-h-0 w-full flex-col bg-white"
            role="region"
            aria-label="Agenda de informaciones"
          >
            <div className="flex items-center gap-2 border-b border-[#e8eef5] px-3 py-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#eef2f8] text-[#11224E]">
                <Icon icon="lucide:book-user" width={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-[#11224E]">Agenda</p>
                <p className="text-[10px] text-[#5a6b85]">
                  {grupos.length} grupos · contactos separados
                </p>
              </div>
            </div>
            <div className="mx-auto min-h-0 w-full max-w-2xl flex-1 space-y-3 overflow-auto p-4">
              <div className="space-y-1 rounded border border-brand-blue/12 p-2">
                <p className={label}>Alta rápida</p>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  <input
                    className={input}
                    placeholder="Nombre"
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                  />
                  <input
                    className={input}
                    placeholder="email@empresa.cl"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                  <input
                    className={input}
                    placeholder="Empresa"
                    value={newEmpresa}
                    onChange={(e) => setNewEmpresa(e.target.value)}
                  />
                  <select
                    className={input}
                    value={newGrupo}
                    onChange={(e) => setNewGrupo(e.target.value)}
                  >
                    {grupos.map((g) => (
                      <option key={g.id} value={g.nombre}>
                        {g.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={
                    agendaBusy || !newNombre.trim() || !newEmail.trim() || !newGrupo
                  }
                  onClick={() => void onAddOne()}
                >
                  Guardar en grupo
                </button>
              </div>

              <div className="space-y-1 rounded border border-brand-blue/12 p-2">
                <p className={label}>Pegar lista</p>
                <p className="text-[10px] text-brand-blue/50">
                  Una por línea: <code>nombre;email;empresa</code> o con 4to campo grupo
                </p>
                <select
                  className={input}
                  value={importGrupo}
                  onChange={(e) => setImportGrupo(e.target.value)}
                >
                  {grupos.map((g) => (
                    <option key={g.id} value={g.nombre}>
                      Importar a: {g.nombre}
                    </option>
                  ))}
                </select>
                <textarea
                  className={input + " min-h-[100px] font-mono text-[11px]"}
                  value={importRaw}
                  onChange={(e) => setImportRaw(e.target.value)}
                  placeholder={"Nombre Ejemplo;ejemplo@correo.cl;Empresa Demo"}
                />
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={agendaBusy || !importRaw.trim() || !importGrupo}
                  onClick={() => void onImport()}
                >
                  Importar
                </button>
              </div>

              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className={label + " mb-0"}>
                    Contactos ({agendaVisible.length}
                    {agendaFiltroGrupo ? ` · ${agendaFiltroGrupo}` : ""})
                  </p>
                  <select
                    className={input + " w-auto max-w-[220px]"}
                    value={agendaFiltroGrupo}
                    onChange={(e) => setAgendaFiltroGrupo(e.target.value)}
                  >
                    <option value="">Todos los grupos</option>
                    {grupos.map((g) => (
                      <option key={g.id} value={g.nombre}>
                        {g.nombre}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={btn}
                    disabled={agendaLoading}
                    onClick={() => void reloadAgenda()}
                  >
                    Recargar
                  </button>
                </div>
                {agendaLoading ? (
                  <p className="text-[11px] text-brand-blue/45">Cargando…</p>
                ) : agendaVisible.length === 0 ? (
                  <p className="text-[11px] text-brand-blue/45">Sin contactos en este filtro.</p>
                ) : (
                  <ul className="max-h-[50vh] overflow-auto rounded border border-brand-blue/15 text-[11px]">
                    {agendaVisible.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-start gap-2 border-b border-brand-blue/8 px-2 py-1.5 last:border-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-brand-blue">{c.nombre}</p>
                          <p className="truncate text-neutral-600">{c.email}</p>
                          {c.empresa ? (
                            <p className="truncate text-[10px] text-brand-blue/45">
                              {c.empresa}
                            </p>
                          ) : null}
                          {c.grupos?.length ? (
                            <p className="truncate text-[10px] text-brand-blue/55">
                              {c.grupos.join(" · ")}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className={btn}
                          title="Desactivar (no borra)"
                          onClick={() => {
                            void (async () => {
                              try {
                                await setContactoActivo(c.id, false);
                                await reloadAgenda();
                              } catch (e) {
                                sileo.error({
                                  title: "No se pudo desactivar",
                                  description:
                                    e instanceof Error ? e.message : "Error",
                                });
                              }
                            })();
                          }}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
      ) : null}
      </div>

      <StudioConfirmModal state={confirmDlg} onClose={closeConfirm} />
    </main>
  );
}
