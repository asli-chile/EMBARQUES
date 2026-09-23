/**
 * Plantillas del creador de publicidad.
 *
 * Son las cuatro composiciones de la receta ASLI (ver src/styles/marketing-pieza.css).
 * Todas comparten los mismos elementos de identidad; lo que cambia es dónde va
 * la foto, dónde el panel navy y qué campos de texto tienen sentido.
 *
 * Agregar una quinta plantilla es: sumarla acá, y agregar su rama de maqueta en
 * PiezaCanvas. El formulario se arma solo a partir de `campos`.
 */

export type PlantillaId = "hero" | "panel-inferior" | "panel-superior" | "banda-lista";

export type CampoId =
  | "eyebrow"
  | "l1"
  | "lm"
  | "l2"
  | "ribbon"
  | "support"
  | "chips"
  | "lista";

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
  /** Tamaño en px de la línea grande: lo ajusta quien escribe, según el largo. */
  l2Tamano: number;
  /** Cinta roja de llamado a la acción. */
  ribbon: string;
  /** Bajada en itálica. */
  support: string;
  chips: string[];
  lista: string[];
  /** URL pública de la foto de fondo. */
  foto: string;
  /** Encuadre vertical de la foto, 0 = arriba, 100 = abajo. */
  fotoPosicion: number;
};

export type Plantilla = {
  id: PlantillaId;
  nombre: string;
  descripcion: string;
  campos: CampoId[];
  l2TamanoPorDefecto: number;
};

export const PLANTILLAS: Plantilla[] = [
  {
    id: "hero",
    nombre: "Hero pleno",
    descripcion: "Foto a página completa y el texto abajo. Para mensajes con una imagen fuerte.",
    campos: ["eyebrow", "l1", "lm", "l2", "ribbon", "support"],
    l2TamanoPorDefecto: 116,
  },
  {
    id: "panel-inferior",
    nombre: "Panel abajo",
    descripcion: "Foto arriba y panel navy abajo con el texto. La más legible de las cuatro.",
    campos: ["eyebrow", "l1", "lm", "l2", "ribbon", "support"],
    l2TamanoPorDefecto: 132,
  },
  {
    id: "panel-superior",
    nombre: "Panel arriba",
    descripcion: "Titular arriba sobre navy y foto abajo. Admite fila de etiquetas.",
    campos: ["eyebrow", "l1", "l2", "chips", "support"],
    l2TamanoPorDefecto: 104,
  },
  {
    id: "banda-lista",
    nombre: "Banda + lista",
    descripcion: "Franja de foto arriba y lista de viñetas. Para enumerar servicios.",
    campos: ["eyebrow", "l1", "l2", "lista", "ribbon"],
    l2TamanoPorDefecto: 112,
  },
];

export function getPlantilla(id: PlantillaId): Plantilla {
  return PLANTILLAS.find((p) => p.id === id) ?? PLANTILLAS[0];
}

export function usaCampo(plantilla: PlantillaId, campo: CampoId): boolean {
  return getPlantilla(plantilla).campos.includes(campo);
}

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
  foto: "",
  fotoPosicion: 50,
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
