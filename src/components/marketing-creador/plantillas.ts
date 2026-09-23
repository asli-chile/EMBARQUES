/**
 * Catálogo de plantillas del creador de publicidad.
 *
 * Todas comparten la identidad de ASLI (media flecha, logo, cintas rojas, pie).
 * Lo que cambia es la composición: dónde va la foto, dónde el panel y qué
 * campos de texto tienen sentido.
 *
 * Para agregar una plantilla basta con sumarla acá: `campos` arma el
 * formulario y `maqueta` arma el lienzo. PiezaCanvas no necesita cambios
 * salvo que haga falta un fondo que todavía no exista.
 */

export type PlantillaId =
  | "hero"
  | "panel-inferior"
  | "panel-superior"
  | "split-diagonal"
  | "oferta"
  | "poster"
  | "banda-lista"
  | "glosario"
  | "pasos"
  | "dato"
  | "comparativa"
  | "minimal-navy"
  | "minimal-claro"
  | "noticia"
  | "cita";

export type CampoId =
  | "foto"
  | "eyebrow"
  | "l1"
  | "lm"
  | "l2"
  | "ribbon"
  | "support"
  | "chips"
  | "lista"
  | "pasos"
  | "dato"
  | "cita"
  | "columnas";

export type Familia = "comercial" | "informativa" | "minimalista" | "noticias";

export const FAMILIAS: { id: Familia; nombre: string; descripcion: string }[] = [
  { id: "comercial", nombre: "Comercial", descripcion: "Captación y venta: foto fuerte y llamado a la acción." },
  { id: "informativa", nombre: "Informativa", descripcion: "Explicar algo: listas, pasos, cifras y comparaciones." },
  { id: "minimalista", nombre: "Minimalista", descripcion: "Sin foto. Solo tipografía, para mensajes de marca." },
  { id: "noticias", nombre: "Noticias", descripcion: "Novedades, hitos y testimonios." },
];

/** Cómo se arma el lienzo. Medidas en px reales de la pieza (1080×1350). */
export type Maqueta = {
  fondo: "foto" | "foto-arriba" | "foto-abajo" | "foto-banda" | "split" | "poster" | "solido" | "claro";
  logoTop: number;
  logoAncho: number;
  /** Sin esto el logo va centrado. Con esto, anclado a esa izquierda. */
  logoIzq?: number;
  bloqueTop?: number;
  bloqueBottom?: number;
  bloqueIzq?: number;
  panelTop?: number;
  /** Altura del panel cuando va arriba en vez de abajo. */
  panelArriba?: number;
  velos?: ("top" | "bottom" | "full")[];
  /** La bajada se separa del bloque y se ancla abajo (sobre la foto). */
  soporteAbajo?: boolean;
  alinear?: "izquierda";
};

export type Plantilla = {
  id: PlantillaId;
  familia: Familia;
  nombre: string;
  descripcion: string;
  campos: CampoId[];
  l2TamanoPorDefecto: number;
  maqueta: Maqueta;
  /** Color de flecha que mejor le calza al salir. */
  flechaPorDefecto?: string;
};

export const COLORES_FLECHA = [
  { id: "blanco", nombre: "Blanco", valor: "#FFFFFF" },
  { id: "rojo", nombre: "Rojo", valor: "#C8102E" },
  { id: "navy", nombre: "Azul", valor: "#14294F" },
  { id: "crema", nombre: "Crema", valor: "#F6EEE8" },
] as const;

export const PLANTILLAS: Plantilla[] = [
  /* ---------------- Comercial ---------------- */
  {
    id: "hero",
    familia: "comercial",
    nombre: "Hero pleno",
    descripcion: "Foto a página completa y el texto abajo. Para mensajes con una imagen fuerte.",
    campos: ["foto", "eyebrow", "l1", "lm", "l2", "ribbon", "support"],
    l2TamanoPorDefecto: 116,
    maqueta: { fondo: "foto", logoTop: 64, logoAncho: 340, bloqueBottom: 118, velos: ["full", "bottom"] },
  },
  {
    id: "panel-inferior",
    familia: "comercial",
    nombre: "Panel abajo",
    descripcion: "Foto arriba y panel azul abajo con el texto. La más legible de todas.",
    campos: ["foto", "eyebrow", "l1", "lm", "l2", "ribbon", "support"],
    l2TamanoPorDefecto: 132,
    maqueta: { fondo: "foto-arriba", logoTop: 378, logoAncho: 402, bloqueTop: 672, panelTop: 560, velos: ["top"] },
  },
  {
    id: "panel-superior",
    familia: "comercial",
    nombre: "Panel arriba",
    descripcion: "Titular arriba sobre azul y foto abajo. Admite fila de etiquetas.",
    campos: ["foto", "eyebrow", "l1", "l2", "chips", "support"],
    l2TamanoPorDefecto: 104,
    maqueta: {
      fondo: "foto-abajo",
      logoTop: 58,
      logoAncho: 340,
      bloqueTop: 250,
      panelArriba: 706,
      velos: ["bottom"],
      soporteAbajo: true,
    },
  },
  {
    id: "split-diagonal",
    familia: "comercial",
    nombre: "Split diagonal",
    descripcion: "Foto a la izquierda cortada en diagonal y texto a la derecha. Más editorial.",
    campos: ["foto", "eyebrow", "l1", "l2", "ribbon", "support"],
    l2TamanoPorDefecto: 76,
    maqueta: {
      fondo: "split",
      logoTop: 92,
      logoAncho: 262,
      logoIzq: 528,
      bloqueTop: 306,
      bloqueIzq: 510,
      alinear: "izquierda",
    },
  },
  {
    id: "oferta",
    familia: "comercial",
    nombre: "Oferta / temporada",
    descripcion: "Un número grande como gancho sobre la foto, con llamado a la acción.",
    campos: ["foto", "eyebrow", "dato", "l1", "ribbon", "support"],
    l2TamanoPorDefecto: 110,
    maqueta: { fondo: "foto", logoTop: 62, logoAncho: 330, bloqueBottom: 110, velos: ["full", "bottom"] },
  },
  {
    id: "poster",
    familia: "comercial",
    nombre: "Póster sándwich",
    descripcion: "Franja sólida arriba, foto al medio y franja abajo. Se siente como afiche.",
    campos: ["foto", "eyebrow", "l1", "l2", "ribbon"],
    l2TamanoPorDefecto: 98,
    maqueta: { fondo: "poster", logoTop: 62, logoAncho: 320, bloqueTop: 846 },
  },

  /* ---------------- Informativa ---------------- */
  {
    id: "banda-lista",
    familia: "informativa",
    nombre: "Banda + lista",
    descripcion: "Franja de foto arriba y lista de viñetas. Para enumerar servicios.",
    campos: ["foto", "eyebrow", "l1", "l2", "lista", "ribbon"],
    l2TamanoPorDefecto: 112,
    maqueta: { fondo: "foto-banda", logoTop: 168, logoAncho: 380, bloqueTop: 462, panelTop: 330, velos: ["top"] },
  },
  {
    id: "glosario",
    familia: "informativa",
    nombre: "Glosario",
    descripcion: "Un término grande y su definición debajo. Para la serie educativa.",
    campos: ["foto", "eyebrow", "l2", "support", "ribbon"],
    l2TamanoPorDefecto: 118,
    maqueta: { fondo: "foto-arriba", logoTop: 270, logoAncho: 340, bloqueTop: 560, panelTop: 448, velos: ["top"] },
  },
  {
    id: "pasos",
    familia: "informativa",
    nombre: "Paso a paso",
    descripcion: "Lista numerada sobre fondo azul. Para explicar un proceso.",
    campos: ["eyebrow", "l1", "l2", "pasos", "ribbon"],
    l2TamanoPorDefecto: 100,
    maqueta: { fondo: "solido", logoTop: 118, logoAncho: 350, bloqueTop: 330 },
  },
  {
    id: "dato",
    familia: "informativa",
    nombre: "Dato gigante",
    descripcion: "Una cifra que habla sola, con su etiqueta y una bajada.",
    campos: ["eyebrow", "dato", "l1", "support"],
    l2TamanoPorDefecto: 104,
    maqueta: { fondo: "solido", logoTop: 112, logoAncho: 340, bloqueTop: 320 },
  },
  {
    id: "comparativa",
    familia: "informativa",
    nombre: "Comparativa",
    descripcion: "Dos columnas enfrentadas: antes y después, o una opción contra otra.",
    campos: ["eyebrow", "l1", "l2", "columnas", "ribbon"],
    l2TamanoPorDefecto: 92,
    maqueta: { fondo: "solido", logoTop: 100, logoAncho: 330, bloqueTop: 292 },
  },

  /* ---------------- Minimalista ---------------- */
  {
    id: "minimal-navy",
    familia: "minimalista",
    nombre: "Minimal azul",
    descripcion: "Sin foto: fondo azul y una sola idea en grande.",
    campos: ["eyebrow", "l1", "l2", "support"],
    l2TamanoPorDefecto: 134,
    maqueta: { fondo: "solido", logoTop: 168, logoAncho: 360, bloqueTop: 500 },
  },
  {
    id: "minimal-claro",
    familia: "minimalista",
    nombre: "Minimal claro",
    descripcion: "Sin foto y en tono crema. La única clara de la familia.",
    campos: ["eyebrow", "l1", "l2", "support"],
    l2TamanoPorDefecto: 134,
    maqueta: { fondo: "claro", logoTop: 168, logoAncho: 360, bloqueTop: 500 },
    flechaPorDefecto: "#14294F",
  },

  /* ---------------- Noticias ---------------- */
  {
    id: "noticia",
    familia: "noticias",
    nombre: "Noticia",
    descripcion: "Etiqueta con la fecha, titular y bajada sobre la foto. Para novedades e hitos.",
    campos: ["foto", "eyebrow", "l1", "l2", "support"],
    l2TamanoPorDefecto: 98,
    maqueta: { fondo: "foto", logoTop: 60, logoAncho: 300, bloqueBottom: 138, velos: ["full", "bottom"] },
  },
  {
    id: "cita",
    familia: "noticias",
    nombre: "Cita / testimonio",
    descripcion: "Una frase entre comillas y su firma. Sin foto.",
    campos: ["eyebrow", "cita"],
    l2TamanoPorDefecto: 100,
    maqueta: { fondo: "solido", logoTop: 110, logoAncho: 330, bloqueTop: 360 },
  },
];

export function getPlantilla(id: PlantillaId): Plantilla {
  return PLANTILLAS.find((p) => p.id === id) ?? PLANTILLAS[0];
}

export function usaCampo(plantilla: PlantillaId, campo: CampoId): boolean {
  return getPlantilla(plantilla).campos.includes(campo);
}

export type Pieza = {
  plantilla: PlantillaId;
  /** Cinta roja chica de arriba. */
  eyebrow: string;
  /** Primera línea del titular, tamaño medio. */
  l1: string;
  /** Línea intermedia chica, opcional (el "de la" de la pieza de cereza). */
  lm: string;
  /** Línea grande del titular. */
  l2: string;
  /** Tamaño en px de la línea grande: se ajusta según el largo del texto. */
  l2Tamano: number;
  /** Cinta roja de llamado a la acción. */
  ribbon: string;
  /** Bajada en itálica. Admite <b> para destacar. */
  support: string;
  chips: string[];
  lista: string[];
  pasos: string[];
  /** La cifra protagonista y su etiqueta. */
  dato: string;
  datoEtiqueta: string;
  cita: string;
  firma: string;
  colATitulo: string;
  colA: string[];
  colBTitulo: string;
  colB: string[];
  /** URL pública de la foto de fondo. */
  foto: string;
  /** Encuadre vertical, 0 = arriba, 100 = abajo. */
  fotoPosicion: number;
  /** Encuadre horizontal, 0 = izquierda, 100 = derecha. Solo importa con zoom. */
  fotoPosicionX: number;
  /** Acercamiento, 100 = sin acercar. */
  fotoZoom: number;
  /** Color de la media flecha superior. */
  flechaColor: string;
};

export const PIEZA_INICIAL: Pieza = {
  plantilla: "panel-inferior",
  eyebrow: "Exportación marítima",
  l1: "Llevamos tu carga",
  lm: "",
  l2: "De Chile al mundo",
  l2Tamano: 132,
  ribbon: "Booking, estiba y zarpe",
  support:
    "Gestionamos tu reserva con las principales navieras y controlamos <b>cada hito hasta el zarpe</b>.",
  chips: ["Marítimo", "Terrestre", "Aéreo"],
  lista: [
    "Reservas con navieras y aerolíneas",
    "Documentación de exportación e importación",
    "Seguimiento en línea de cada embarque",
    "Un ejecutivo dedicado de punta a punta",
  ],
  pasos: ["Nos envías la carga y el destino", "Cotizamos y reservamos con la naviera", "Coordinamos retiro, estiba y documentos", "Te avisamos en cada hito hasta la entrega"],
  dato: "90%",
  datoEtiqueta: "del comercio mundial se mueve por mar",
  cita: "La confianza que nos entregan es el mejor resultado del año.",
  firma: "Equipo ASLI",
  colATitulo: "Con ASLI",
  colA: ["Un ejecutivo dedicado", "Seguimiento en línea", "Documentos al día"],
  colBTitulo: "Sin operador",
  colB: ["Llamados a tres proveedores", "Sin visibilidad del embarque", "Multas por documentos tardíos"],
  foto: "",
  fotoPosicion: 50,
  fotoPosicionX: 50,
  fotoZoom: 100,
  flechaColor: "#FFFFFF",
};

/** Categorías del banco de imágenes, en el orden en que conviene mostrarlas. */
export const CATEGORIAS = [
  { id: "todas", nombre: "Todas" },
  { id: "puerto", nombre: "Puerto y buque" },
  { id: "fruta", nombre: "Fruta" },
  { id: "camion", nombre: "Camión" },
  { id: "aereo", nombre: "Aéreo" },
  { id: "bodega", nombre: "Bodega" },
  { id: "otro", nombre: "Otras" },
] as const;

export type FotoBanco = {
  archivo: string;
  categoria: string;
  /** "ok" se puede usar; "revisar" tiene una marca dudosa; "vetada" tiene marca de un tercero. */
  estado: "ok" | "revisar" | "vetada";
  nota?: string;
};
