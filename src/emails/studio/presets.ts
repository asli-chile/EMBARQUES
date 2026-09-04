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
      align: "left",
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

function withProps(kind: BlockKind, props: Record<string, string>): StudioBlock {
  const b = createBlock(kind);
  return { ...b, props: { ...b.props, ...props } };
}

/** 1) Boletín técnico: saludo + párrafos + muchas filas de dato (sin CTA). */
export function createExportacionesVietnamDocument(): StudioDocument {
  return {
    asunto: "Actualización exportaciones — ASLI",
    previewText: "Systems Approach para cerezas frescas a Vietnam · temporada 2026/27",
    blocks: [
      createBlock("headerAsli"),
      withProps("greeting", {
        template: "{{saludo}} {{nombre}},",
        saludoMode: "auto",
        align: "left",
      }),
      withProps("text", {
        text: "Compartimos la siguiente actualización de interés para las exportaciones de **cerezas frescas chilenas** con destino a Vietnam:",
        align: "left",
      }),
      withProps("text", {
        text: "A partir de la temporada 2026/27, se incorpora el Systems Approach como alternativa al tratamiento de frío, permitiendo nuevas opciones para embarques marítimos y aéreos.",
        align: "left",
      }),
      withProps("dataRow", {
        icon: "calendar",
        label: "ANUNCIO",
        value: "27 de agosto de 2026",
        align: "left",
      }),
      withProps("dataRow", {
        icon: "pin",
        label: "DESTINO",
        value: "Vietnam",
        align: "left",
      }),
      withProps("dataRow", {
        icon: "product",
        label: "PRODUCTO",
        value: "Cerezas frescas",
        align: "left",
      }),
      withProps("dataRow", {
        icon: "document",
        label: "MEDIDA",
        value: "Systems Approach como alternativa al tratamiento de frío",
        align: "left",
      }),
      withProps("dataRow", {
        icon: "cold",
        label: "TRATAMIENTO DE FRÍO",
        value:
          "aplicable a fruta proveniente de zonas con presencia de mosca de la fruta, según protocolo.",
        align: "left",
      }),
      withProps("text", {
        text: "Recomendamos verificar las instrucciones operativas definitivas del SAG previo al embarque.",
        align: "left",
      }),
      withProps("text", {
        text: "Saludos cordiales,\n**Equipo ASLI**\nLogística & Comercio Exterior",
        align: "left",
      }),
      createBlock("footerAsli"),
    ],
  };
}

/** 2) Alerta operativa: banner HTML + título + timeline corta + CTA (sin saludo largo). */
export function createRetrasoNaveDocument(): StudioDocument {
  return {
    asunto: "Aviso de retraso — Nave MSC ORIANA / ASLI",
    previewText: "Nuevo ETA San Antonio · 12 de septiembre 2026",
    blocks: [
      createBlock("headerAsli"),
      withProps("html", {
        html: `<div class="rounded-lg px-4 py-3" style="background:#C8102E">
  <p class="m-0 text-[13px] font-bold leading-5 text-white">AVISO OPERATIVO · RETRASO DE NAVE</p>
  <p class="m-0 mt-1 text-[12px] leading-4 text-white/90">MSC ORIANA · viaje 26W36 · impacto en stacking</p>
</div>`,
      }),
      withProps("heading", {
        text: "Nuevo ETA confirmado",
        as: "h2",
        align: "center",
      }),
      withProps("text", {
        text: "El servicio presenta un ajuste por condiciones en puerto de origen. Resumen:",
        align: "center",
      }),
      createBlock("divider"),
      withProps("dataRow", {
        icon: "calendar",
        label: "ETA ANTERIOR",
        value: "08 sep 2026",
        align: "center",
      }),
      withProps("dataRow", {
        icon: "clock",
        label: "NUEVO ETA",
        value: "12 sep 2026 · 14:00",
        align: "center",
      }),
      withProps("dataRow", {
        icon: "pin",
        label: "RUTA",
        value: "Valparaíso → San Antonio",
        align: "center",
      }),
      createBlock("divider"),
      withProps("button", {
        label: "Abrir tracking",
        href: "https://www.asli.cl/embarques",
        align: "center",
      }),
      withProps("text", {
        text: "**Operaciones ASLI** · operaciones@asli.cl",
        align: "center",
      }),
      createBlock("footerAsli"),
    ],
  };
}

/** 3) Campaña comercial: todo centrado, hero + CTA primero, datos al final. */
export function createTemporadaBerriesDocument(): StudioDocument {
  return {
    asunto: "Apertura temporada berries 2026/27 — ASLI",
    previewText: "Cupos aéreos y marítimos para arándanos y berries",
    blocks: [
      createBlock("headerAsli"),
      withProps("heading", {
        text: "Temporada berries 2026/27",
        as: "h1",
        align: "center",
      }),
      withProps("greeting", {
        template: "{{saludo}} {{nombre}},",
        saludoMode: "auto",
        align: "center",
      }),
      withProps("text", {
        text: "Ya están abiertos los **cupos semanales** de arándanos y berries desde Zona Central hacia EE.UU. y Europa.",
        align: "center",
      }),
      withProps("button", {
        label: "Reservar cupo ahora",
        href: "https://www.asli.cl",
        align: "center",
      }),
      createBlock("divider"),
      withProps("text", {
        text: "**Aéreo** · SCL → MIA / JFK · salidas diarias desde octubre",
        align: "center",
      }),
      withProps("text", {
        text: "**Marítimo** · 40' reefer · cut-off martes y viernes",
        align: "center",
      }),
      withProps("text", {
        text: "**Contacto** · Carmen Núñez · berries@asli.cl",
        align: "center",
      }),
      withProps("html", {
        html: `<div class="rounded-lg bg-asli-cream px-4 py-3 text-center">
  <p class="m-0 text-[12px] leading-5 text-asli-navy">Cupos de prueba · respuesta en &lt; 4 hrs hábiles</p>
</div>`,
      }),
      createBlock("footerAsli"),
    ],
  };
}

/** 4) Comprobante: badge + tabla de datos + divisor + CTA (sin párrafos largos). */
export function createConfirmacionBookingDocument(): StudioDocument {
  return {
    asunto: "Booking confirmado BK-ASLI-2026-1847",
    previewText: "Reserva confirmada · 2×40'RF · Callao",
    blocks: [
      createBlock("headerAsli"),
      withProps("html", {
        html: `<div class="rounded-lg bg-asli-navy px-4 py-4 text-center text-white">
  <p class="m-0 text-[11px] uppercase tracking-widest opacity-80">Confirmación</p>
  <p class="m-0 mt-1 text-[18px] font-bold leading-6">BK-ASLI-2026-1847</p>
  <p class="m-0 mt-1 text-[12px] opacity-90">2 × 40'HC Reefer · Callao</p>
</div>`,
      }),
      withProps("greeting", {
        template: "{{saludo}} {{nombre}}, su booking quedó registrado.",
        saludoMode: "auto",
        align: "left",
      }),
      withProps("dataRow", {
        icon: "package",
        label: "EQUIPO",
        value: "2 × 40' High Cube Reefer",
        align: "left",
      }),
      withProps("dataRow", {
        icon: "pin",
        label: "RUTA",
        value: "San Antonio (CLSAI) → Callao (PECLL)",
        align: "left",
      }),
      withProps("dataRow", {
        icon: "ship",
        label: "SERVICIO",
        value: "Hapag-Lloyd · AL5 · ETD 18-sep-2026",
        align: "left",
      }),
      withProps("dataRow", {
        icon: "check",
        label: "ESTADO",
        value: "Confirmado",
        align: "left",
      }),
      createBlock("divider"),
      withProps("dataRow", {
        icon: "alert",
        label: "CUT DOC",
        value: "16-sep-2026 12:00 · instructivo + VGM",
        align: "left",
      }),
      withProps("button", {
        label: "Descargar booking",
        href: "https://www.asli.cl/embarques",
        align: "left",
      }),
      createBlock("footerAsli"),
    ],
  };
}

/** 5) Urgencia mínima: aviso HTML + 2 datos + botón a la derecha (pocos bloques). */
export function createAlertaDemurrageDocument(): StudioDocument {
  return {
    asunto: "Alerta free time — contenedor HLCU1234567",
    previewText: "Quedan 2 días de free time en destino",
    blocks: [
      createBlock("headerAsli"),
      withProps("html", {
        html: `<div class="rounded-lg px-4 py-3 text-center" style="background:#fff3cd;border:1px solid #f0d78c">
  <p class="m-0 text-[14px] font-bold leading-5" style="color:#856404">⚠ Free time por vencer</p>
  <p class="m-0 mt-1 text-[12px] leading-4" style="color:#856404">Contenedor HLCU1234567 · 2 días restantes</p>
</div>`,
      }),
      withProps("heading", {
        text: "Acción requerida",
        as: "h3",
        align: "right",
      }),
      withProps("dataRow", {
        icon: "anchor",
        label: "TERMINAL",
        value: "DP World Callao",
        align: "right",
      }),
      withProps("dataRow", {
        icon: "calendar",
        label: "LÍMITE",
        value: "10 sep 2026 · 23:59",
        align: "right",
      }),
      withProps("button", {
        label: "Coordinar retiro",
        href: "https://www.asli.cl",
        align: "right",
      }),
      withProps("text", {
        text: "Demurrage ref. **USD 185/día** (dato de prueba).\n**Customer Service ASLI**",
        align: "right",
      }),
      createBlock("footerAsli"),
    ],
  };
}

/** Extra (no listada): webinar centrado — disponible si se agrega al catálogo. */
export function createInvitacionWebinarDocument(): StudioDocument {
  return {
    asunto: "Invitación: Markets Brief ASLI — Septiembre 2026",
    previewText: "Webinar · nuevos corredores Asia y Latam · cupos limitados",
    blocks: [
      createBlock("headerAsli"),
      withProps("greeting", {
        template: "{{saludo}} {{nombre}},",
        saludoMode: "auto",
        align: "center",
      }),
      withProps("heading", {
        text: "Markets Brief ASLI",
        as: "h2",
        align: "center",
      }),
      withProps("text", {
        text: "Encuentro mensual: rutas, tarifas referenciales y novedades fitosanitarias.",
        align: "center",
      }),
      withProps("button", {
        label: "Confirmar asistencia",
        href: "https://www.asli.cl",
        align: "center",
      }),
      createBlock("footerAsli"),
    ],
  };
}

export type StudioTemplateDef = {
  id: string;
  label: string;
  description: string;
  create: () => StudioDocument;
};

/** Catálogo de plantillas cargables en el estudio (5 estructuras distintas). */
export const STUDIO_DOCUMENT_TEMPLATES: StudioTemplateDef[] = [
  {
    id: "vietnam",
    label: "1 · Boletín técnico",
    description: "Párrafos + filas de dato · sin botón",
    create: createExportacionesVietnamDocument,
  },
  {
    id: "retraso-nave",
    label: "2 · Alerta de nave",
    description: "Banner HTML + título + CTA centrado",
    create: createRetrasoNaveDocument,
  },
  {
    id: "temporada-berries",
    label: "3 · Campaña berries",
    description: "Hero centrado · CTA primero · sin filas",
    create: createTemporadaBerriesDocument,
  },
  {
    id: "booking",
    label: "4 · Comprobante booking",
    description: "Badge + tabla + divisor · CTA izquierda",
    create: createConfirmacionBookingDocument,
  },
  {
    id: "demurrage",
    label: "5 · Urgencia demurrage",
    description: "Mínimo de bloques · alineado a la derecha",
    create: createAlertaDemurrageDocument,
  },
];

