/** Documento del estudio de informativos (bloques composables). */

export type BlockKind =
  | "headerAsli"
  | "greeting"
  | "heading"
  | "text"
  | "listNumbered"
  | "listBullet"
  | "listDash"
  | "listCheck"
  | "listSteps"
  | "callout"
  | "quote"
  | "spacer"
  | "button"
  | "buttonsRow"
  | "divider"
  | "image"
  | "dataRow"
  | "footerAsli"
  | "html"
  | "grid"
  | "link"
  | "avatar"
  | "gallery"
  | "codeInline"
  | "codeBlock"
  | "markdown"
  | "article"
  | "feature"
  | "stats"
  | "testimonial"
  | "feedback"
  | "pricing"
  | "product"
  | "checkout"
  | "containerBand"
  | "sectionLayout";

export type StudioBlock = {
  id: string;
  kind: BlockKind;
  /** Props según el tipo de bloque. */
  props: Record<string, string>;
};

export type StudioDocument = {
  asunto: string;
  previewText: string;
  blocks: StudioBlock[];
};

export function newBlockId(): string {
  return `b_${Math.random().toString(36).slice(2, 10)}`;
}

export const ASLI_TAILWIND = {
  theme: {
    extend: {
      colors: {
        asli: {
          navy: "#11224E",
          footer: "#0B1A3D",
          red: "#C8102E",
          teal: "#007A7B",
          cream: "#F6EEE8",
          muted: "#4a4a4a",
          brand: "#002d69",
          "brand-dark": "#002452",
        },
      },
    },
  },
} as const;
