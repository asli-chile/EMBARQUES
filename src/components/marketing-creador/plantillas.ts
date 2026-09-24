/**
 * Catálogo de plantillas del creador de publicidad.
 *
 * Todas comparten la identidad de ASLI (media flecha, logo, cintas rojas, pie).
 * Lo que cambia es la composición: dónde va la foto, dónde el panel y qué
 * elementos de contenido aparecen.
 *
 * Agregar una plantilla es agregar un objeto a PLANTILLAS: `campos` arma el
 * formulario y `maqueta` arma el lienzo. PiezaCanvas solo hay que tocarlo si
 * hace falta un tipo de fondo o un elemento que todavía no existe.
 */

/** No es una unión cerrada a propósito: con 50 plantillas la lista sería
 *  imposible de mantener sincronizada. getPlantilla valida contra el catálogo. */
export type PlantillaId = string;

export type CampoId =
  | "foto"
  | "eyebrow"
  | "l1"
  | "lm"
  | "l2"
  | "ribbon"
  | "ribbon2"
  | "support"
  | "chips"
  | "lista"
  | "checklist"
  | "pasos"
  | "dato"
  | "dona"
  | "metricas"
  | "barras"
  | "tarjetas"
  | "hitos"
  | "tabla"
  | "cita"
  | "columnas"
  | "logo2"
  | "evento";

export type Familia =
  | "comercial"
  | "informativa"
  | "datos"
  | "minimalista"
  | "noticias"
  | "redes"
  | "eventos";

export const FAMILIAS: { id: Familia; nombre: string; descripcion: string }[] = [
  { id: "comercial", nombre: "Comercial", descripcion: "Captación y venta" },
  { id: "informativa", nombre: "Informativa", descripcion: "Explicar y enumerar" },
  { id: "datos", nombre: "Datos y gráficos", descripcion: "Cifras, barras y tablas" },
  { id: "minimalista", nombre: "Minimalista", descripcion: "Mucho aire, poco texto" },
  { id: "noticias", nombre: "Noticias", descripcion: "Novedades, hitos y testimonios" },
  { id: "redes", nombre: "Redes y educativo", descripcion: "Serie, carrusel y preguntas" },
  { id: "eventos", nombre: "Ferias y visitas", descripcion: "Estamos en terreno, con el logo del evento" },
];

/** Cómo se arma el lienzo. Medidas en px reales de la pieza (1080×1350). */
export type Maqueta = {
  fondo:
    | "foto"
    | "foto-arriba"
    | "foto-abajo"
    | "foto-banda"
    | "foto-banda-baja"
    | "split"
    | "split-derecha"
    | "poster"
    | "medallon"
    | "marco"
    | "solido"
    | "claro";
  logoTop: number;
  logoAncho: number;
  /** Sin esto el logo va centrado. Con esto, anclado a esa izquierda. */
  logoIzq?: number;
  bloqueTop?: number;
  bloqueBottom?: number;
  bloqueIzq?: number;
  bloqueDer?: number;
  panelTop?: number;
  /** Altura del panel cuando va arriba en vez de abajo. */
  panelArriba?: number;
  velos?: ("top" | "bottom" | "full")[];
  /** La bajada se separa del bloque y se ancla abajo (sobre la foto). */
  soporteAbajo?: boolean;
  alinear?: "izquierda";
  /** Los dos logos juntos y centrados, separados por una linea. */
  dupla?: boolean;
  /* ---- Recursos de composicion ----
     Palancas para que dos piezas con la misma receta no se vean iguales. */
  /** Corte del panel: diagonal (por defecto), recto o al reves. */
  panelVariante?: "recto" | "invertida";
  /** Borde inferior curvo en la foto. */
  arco?: boolean;
  /** Franja de color con el rotulo en vertical. */
  bandaLateral?: boolean;
  /** Marco interior. */
  marcoInterior?: boolean;
  /** El bloque de texto sobre una caja solida. */
  cajaTexto?: "navy" | "roja" | "crema";
  /** Titular sin el contorno rojo: sobre caja solida el contorno ensucia. */
  titularPlano?: boolean;
  /** Filete rojo bajo el titular, para las que no llevan cinta. */
  filete?: boolean;

  /** Ubicacion suelta del logo invitado, cuando no va en dupla. */
  logo2Top?: number;
  logo2Ancho?: number;
  logo2Izq?: number;
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

const BLANCO = "#FFFFFF";
const AZUL = "#14294F";

/* ------------------------------------------------------------------ */
/* Maquetas base                                                        */
/* ------------------------------------------------------------------ */
/* Las plantillas se arman combinando una de estas con el elemento de
   contenido que toque. Es lo que permite tener 50 sin 50 maquetas. */

const M = {
  heroPleno: {
    fondo: "foto",
    logoTop: 64,
    logoAncho: 340,
    bloqueBottom: 118,
    velos: ["full", "bottom"],
  },
  heroAlto: {
    fondo: "foto",
    logoTop: 62,
    logoAncho: 320,
    bloqueBottom: 150,
    velos: ["full", "bottom"],
  },
  panelAbajo: {
    fondo: "foto-arriba",
    logoTop: 378,
    logoAncho: 402,
    bloqueTop: 672,
    panelTop: 560,
    velos: ["top"],
  },
  panelAbajoAlto: {
    fondo: "foto-arriba",
    logoTop: 258,
    logoAncho: 350,
    bloqueTop: 470,
    panelTop: 360,
    velos: ["top"],
  },
  panelArriba: {
    fondo: "foto-abajo",
    logoTop: 58,
    logoAncho: 340,
    bloqueTop: 250,
    panelArriba: 706,
    velos: ["bottom"],
    soporteAbajo: true,
  },
  banda: {
    fondo: "foto-banda",
    logoTop: 168,
    logoAncho: 380,
    bloqueTop: 462,
    panelTop: 330,
    velos: ["top"],
  },
  solido: { fondo: "solido", logoTop: 112, logoAncho: 340, bloqueTop: 320 },
  solidoAlto: { fondo: "solido", logoTop: 100, logoAncho: 330, bloqueTop: 280 },
  solidoCentro: { fondo: "solido", logoTop: 168, logoAncho: 360, bloqueTop: 500 },
  claro: { fondo: "claro", logoTop: 112, logoAncho: 340, bloqueTop: 320 },
  claroCentro: { fondo: "claro", logoTop: 168, logoAncho: 360, bloqueTop: 500 },
} satisfies Record<string, Maqueta>;

type Args = {
  id: string;
  familia: Familia;
  nombre: string;
  descripcion: string;
  campos: CampoId[];
  l2?: number;
  maqueta: Maqueta;
  flecha?: string;
};

const mk = ({ id, familia, nombre, descripcion, campos, l2 = 110, maqueta, flecha }: Args): Plantilla => ({
  id,
  familia,
  nombre,
  descripcion,
  campos,
  l2TamanoPorDefecto: l2,
  maqueta,
  ...(flecha ? { flechaPorDefecto: flecha } : {}),
});

export const PLANTILLAS: Plantilla[] = [
  /* =============== Comercial ===============
     Doce composiciones que no se pisan entre si. Las cuatro primeras son las
     clasicas de la marca; el resto usa un recurso distinto cada una (caja
     solida, banda lateral, arco, marco, corte recto) para que el feed no se
     vea repetido aunque el contenido sea parecido. */
  mk({ id: "hero", familia: "comercial", nombre: "Hero pleno", descripcion: "Foto a página completa y el texto abajo, centrado.", campos: ["foto", "eyebrow", "l1", "lm", "l2", "ribbon", "support"], l2: 116, maqueta: M.heroPleno }),
  mk({ id: "panel-inferior", familia: "comercial", nombre: "Panel abajo", descripcion: "Foto arriba y panel azul en diagonal. La más legible.", campos: ["foto", "eyebrow", "l1", "lm", "l2", "ribbon", "support"], l2: 132, maqueta: M.panelAbajo }),
  mk({ id: "panel-superior", familia: "comercial", nombre: "Panel arriba", descripcion: "Titular arriba sobre azul y foto abajo.", campos: ["foto", "eyebrow", "l1", "l2", "chips", "support"], l2: 104, maqueta: M.panelArriba }),
  mk({ id: "split-diagonal", familia: "comercial", nombre: "Split diagonal", descripcion: "Foto a la izquierda en diagonal, texto a la derecha.", campos: ["foto", "eyebrow", "l1", "l2", "ribbon", "support"], l2: 76, maqueta: { fondo: "split", logoTop: 92, logoAncho: 262, logoIzq: 528, bloqueTop: 306, bloqueIzq: 510, alinear: "izquierda" } }),
  mk({ id: "split-derecha", familia: "comercial", nombre: "Split invertido", descripcion: "Foto a la derecha en diagonal, texto a la izquierda.", campos: ["foto", "eyebrow", "l1", "l2", "ribbon", "support"], l2: 76, maqueta: { fondo: "split-derecha", logoTop: 92, logoAncho: 262, logoIzq: 56, bloqueTop: 306, bloqueIzq: 56, bloqueDer: 560, alinear: "izquierda" } }),
  mk({ id: "oferta", familia: "comercial", nombre: "Oferta / temporada", descripcion: "Una cifra enorme como gancho sobre la foto.", campos: ["foto", "eyebrow", "dato", "l1", "ribbon", "support"], maqueta: { ...M.heroPleno, bloqueBottom: 110 } }),
  mk({ id: "poster", familia: "comercial", nombre: "Póster sándwich", descripcion: "Franja sólida arriba, foto al medio y franja abajo.", campos: ["foto", "eyebrow", "l1", "l2", "ribbon"], l2: 98, maqueta: { fondo: "poster", logoTop: 62, logoAncho: 320, bloqueTop: 846 } }),

  /* Caja sólida: el texto deja de flotar sobre la foto y se alinea a la
     izquierda. Sin contorno rojo, que sobre un fondo liso ensucia. */
  mk({ id: "caja-titular", familia: "comercial", nombre: "Titular en caja", descripcion: "El texto en un bloque sólido, alineado a la izquierda. Más editorial.", campos: ["foto", "eyebrow", "l1", "l2", "chips", "ribbon"], l2: 88, maqueta: { fondo: "foto", logoTop: 64, logoAncho: 300, bloqueBottom: 150, bloqueIzq: 64, bloqueDer: 220, alinear: "izquierda", cajaTexto: "navy", titularPlano: true, velos: ["full"] } }),

  /* Banda lateral: rompe la simetría centrada que comparten casi todas. */
  mk({ id: "banda-lateral", familia: "comercial", nombre: "Banda lateral", descripcion: "Franja roja con el rótulo en vertical y la foto al costado.", campos: ["foto", "l1", "l2", "metricas"], l2: 96, maqueta: { fondo: "foto", logoTop: 64, logoAncho: 290, bloqueBottom: 130, bloqueIzq: 190, bloqueDer: 64, alinear: "izquierda", bandaLateral: true, titularPlano: true, velos: ["full", "bottom"] } }),

  /* Arco: el borde curvo cambia la silueta sin tocar nada más. */
  mk({ id: "arco", familia: "comercial", nombre: "Arco", descripcion: "Foto con el borde inferior curvo y el texto sobre crema.", campos: ["foto", "eyebrow", "l2", "tarjetas", "ribbon"], l2: 96, maqueta: { fondo: "foto-banda", logoTop: 520, logoAncho: 330, bloqueTop: 660, panelTop: 330, panelVariante: "recto", arco: true } }),

  /* Marco: encuadra la pieza entera, se siente de campaña. */
  mk({ id: "marco-campana", familia: "comercial", nombre: "Marco", descripcion: "Marco interior sobre la foto, con la cifra al centro.", campos: ["foto", "eyebrow", "dato", "l1", "ribbon"], maqueta: { fondo: "foto", logoTop: 92, logoAncho: 300, bloqueBottom: 190, bloqueIzq: 110, bloqueDer: 110, marcoInterior: true, velos: ["full", "bottom"] } }),

  /* Corte recto y mitades iguales: lo más sobrio de la familia. */
  mk({ id: "mitades", familia: "comercial", nombre: "Mitades", descripcion: "Foto y color en partes iguales, con corte recto y texto a la izquierda.", campos: ["foto", "eyebrow", "l1", "l2", "ribbon", "ribbon2"], l2: 100, maqueta: { fondo: "foto-arriba", logoTop: 500, logoAncho: 300, bloqueTop: 712, panelTop: 675, panelVariante: "recto", bloqueIzq: 64, bloqueDer: 64, alinear: "izquierda", velos: ["top"] } }),

  /* =============== Informativa =============== */
  mk({ id: "banda-lista", familia: "informativa", nombre: "Banda + lista", descripcion: "Franja de foto arriba y lista de viñetas.", campos: ["foto", "eyebrow", "l1", "l2", "lista", "ribbon"], l2: 112, maqueta: M.banda }),
  mk({ id: "glosario", familia: "informativa", nombre: "Glosario", descripcion: "Un término grande y su definición debajo.", campos: ["foto", "eyebrow", "l2", "support", "ribbon"], l2: 118, maqueta: { fondo: "foto-arriba", logoTop: 270, logoAncho: 340, bloqueTop: 560, panelTop: 448, velos: ["top"] } }),
  mk({ id: "glosario-claro", familia: "informativa", nombre: "Glosario claro", descripcion: "El mismo glosario en tono crema.", campos: ["eyebrow", "l2", "support", "ribbon"], l2: 124, maqueta: { ...M.claro, bloqueTop: 420 }, flecha: AZUL }),
  mk({ id: "pasos", familia: "informativa", nombre: "Paso a paso", descripcion: "Lista numerada sobre fondo azul.", campos: ["eyebrow", "l1", "l2", "pasos", "ribbon"], l2: 100, maqueta: { ...M.solido, logoTop: 118, logoAncho: 350, bloqueTop: 330 } }),
  mk({ id: "pasos-foto", familia: "informativa", nombre: "Paso a paso con foto", descripcion: "Los pasos sobre una banda fotográfica.", campos: ["foto", "eyebrow", "l2", "pasos"], l2: 96, maqueta: { ...M.banda, bloqueTop: 440 } }),
  mk({ id: "checklist", familia: "informativa", nombre: "Checklist", descripcion: "Lista con tildes: qué incluye el servicio.", campos: ["foto", "eyebrow", "l1", "l2", "checklist", "ribbon"], l2: 104, maqueta: { ...M.banda, bloqueTop: 450 } }),
  mk({ id: "checklist-claro", familia: "informativa", nombre: "Checklist claro", descripcion: "El checklist sin foto, en tono crema.", campos: ["eyebrow", "l1", "l2", "checklist", "ribbon"], l2: 104, maqueta: { ...M.claro, bloqueTop: 340 }, flecha: AZUL }),
  mk({ id: "comparativa", familia: "informativa", nombre: "Comparativa", descripcion: "Dos columnas enfrentadas.", campos: ["eyebrow", "l1", "l2", "columnas", "ribbon"], l2: 92, maqueta: M.solidoAlto }),
  mk({ id: "comparativa-claro", familia: "informativa", nombre: "Comparativa clara", descripcion: "La comparativa en tono crema.", campos: ["eyebrow", "l1", "l2", "columnas", "ribbon"], l2: 92, maqueta: { ...M.claro, bloqueTop: 280 }, flecha: AZUL }),
  mk({ id: "tarjetas-3", familia: "informativa", nombre: "Tres tarjetas", descripcion: "Tres bloques cortos, uno al lado del otro.", campos: ["eyebrow", "l1", "l2", "tarjetas", "ribbon"], l2: 96, maqueta: { ...M.solidoAlto, bloqueTop: 300 } }),
  mk({ id: "tarjetas-4", familia: "informativa", nombre: "Cuatro tarjetas", descripcion: "Cuadrícula de cuatro bloques cortos.", campos: ["eyebrow", "l2", "tarjetas", "ribbon"], l2: 96, maqueta: { ...M.solidoAlto, bloqueTop: 290 } }),
  mk({ id: "tarjetas-foto", familia: "informativa", nombre: "Tarjetas con foto", descripcion: "Banda de foto arriba y tarjetas debajo.", campos: ["foto", "eyebrow", "l2", "tarjetas"], l2: 92, maqueta: { ...M.banda, bloqueTop: 430 } }),
  mk({ id: "tabla", familia: "informativa", nombre: "Tabla simple", descripcion: "Filas de concepto y valor. Para tarifas y plazos.", campos: ["eyebrow", "l1", "l2", "tabla", "ribbon"], l2: 96, maqueta: { ...M.solidoAlto, bloqueTop: 300 } }),
  mk({ id: "tabla-claro", familia: "informativa", nombre: "Tabla clara", descripcion: "La tabla en tono crema, más de documento.", campos: ["eyebrow", "l1", "l2", "tabla", "ribbon"], l2: 96, maqueta: { ...M.claro, bloqueTop: 300 }, flecha: AZUL }),
  mk({ id: "faq", familia: "informativa", nombre: "Pregunta y respuesta", descripcion: "Una pregunta grande y su respuesta debajo.", campos: ["foto", "eyebrow", "l2", "support", "ribbon"], l2: 104, maqueta: { ...M.panelAbajo, bloqueTop: 640 } }),

  /* =============== Datos y gráficos =============== */
  mk({ id: "dato", familia: "datos", nombre: "Dato gigante", descripcion: "Una cifra que habla sola.", campos: ["eyebrow", "dato", "l1", "support"], maqueta: M.solido }),
  mk({ id: "dato-foto", familia: "datos", nombre: "Dato sobre foto", descripcion: "La cifra gigante sobre una imagen.", campos: ["foto", "eyebrow", "dato", "l1"], maqueta: { ...M.heroPleno, bloqueBottom: 170 } }),
  mk({ id: "dato-claro", familia: "datos", nombre: "Dato en claro", descripcion: "La cifra en tono crema, más sobria.", campos: ["eyebrow", "dato", "l1", "support"], maqueta: M.claro, flecha: AZUL }),
  mk({ id: "dona", familia: "datos", nombre: "Porcentaje en dona", descripcion: "Un anillo que muestra el porcentaje.", campos: ["eyebrow", "dona", "l1", "support"], maqueta: { ...M.solido, bloqueTop: 300 } }),
  mk({ id: "dona-foto", familia: "datos", nombre: "Dona sobre foto", descripcion: "El anillo de porcentaje sobre una imagen.", campos: ["foto", "eyebrow", "dona", "l1"], maqueta: { ...M.heroPleno, bloqueBottom: 200 } }),
  mk({ id: "barras", familia: "datos", nombre: "Gráfico de barras", descripcion: "Barras horizontales con su valor.", campos: ["eyebrow", "l1", "l2", "barras", "support"], l2: 92, maqueta: { ...M.solidoAlto, bloqueTop: 300 } }),
  mk({ id: "barras-foto", familia: "datos", nombre: "Barras con foto", descripcion: "Banda de foto arriba y barras debajo.", campos: ["foto", "eyebrow", "l2", "barras"], l2: 92, maqueta: { ...M.banda, bloqueTop: 430 } }),
  mk({ id: "barras-claro", familia: "datos", nombre: "Barras en claro", descripcion: "Las barras en tono crema.", campos: ["eyebrow", "l1", "l2", "barras", "support"], l2: 92, maqueta: { ...M.claro, bloqueTop: 300 }, flecha: AZUL }),
  mk({ id: "metricas", familia: "datos", nombre: "Tres cifras", descripcion: "Tres números en fila con su etiqueta.", campos: ["eyebrow", "l1", "l2", "metricas", "support"], l2: 100, maqueta: { ...M.solidoAlto, bloqueTop: 310 } }),
  mk({ id: "metricas-foto", familia: "datos", nombre: "Cifras sobre foto", descripcion: "Las tres cifras sobre una imagen.", campos: ["foto", "eyebrow", "l2", "metricas"], l2: 100, maqueta: { ...M.heroPleno, bloqueBottom: 140 } }),
  mk({ id: "hitos", familia: "datos", nombre: "Línea de tiempo", descripcion: "Hitos en orden, con su año o fecha.", campos: ["eyebrow", "l1", "l2", "hitos"], l2: 96, maqueta: { ...M.solidoAlto, bloqueTop: 300 } }),
  mk({ id: "hitos-foto", familia: "datos", nombre: "Línea de tiempo con foto", descripcion: "Los hitos bajo una banda fotográfica.", campos: ["foto", "eyebrow", "l2", "hitos"], l2: 92, maqueta: { ...M.banda, bloqueTop: 440 } }),

  /* =============== Minimalista =============== */
  mk({ id: "minimal-navy", familia: "minimalista", nombre: "Minimal azul", descripcion: "Sin foto: fondo azul y una sola idea.", campos: ["eyebrow", "l1", "l2", "support"], l2: 134, maqueta: M.solidoCentro }),
  mk({ id: "minimal-claro", familia: "minimalista", nombre: "Minimal claro", descripcion: "Sin foto, en tono crema.", campos: ["eyebrow", "l1", "l2", "support"], l2: 134, maqueta: M.claroCentro, flecha: AZUL }),
  mk({ id: "minimal-foto", familia: "minimalista", nombre: "Minimal con foto", descripcion: "Foto completa y una sola línea de texto.", campos: ["foto", "l2"], l2: 120, maqueta: { fondo: "foto", logoTop: 70, logoAncho: 300, bloqueBottom: 190, velos: ["full", "bottom"] } }),
  mk({ id: "minimal-banda", familia: "minimalista", nombre: "Minimal con banda", descripcion: "Banda de foto arriba y mucho aire abajo.", campos: ["foto", "eyebrow", "l2", "support"], l2: 116, maqueta: { fondo: "foto-banda", logoTop: 520, logoAncho: 340, bloqueTop: 700, panelTop: 330, velos: ["top"] } }),
  mk({ id: "minimal-medallon", familia: "minimalista", nombre: "Medallón", descripcion: "La foto en un círculo, centrada.", campos: ["foto", "eyebrow", "l2", "support"], l2: 104, maqueta: { fondo: "medallon", logoTop: 92, logoAncho: 300, bloqueTop: 780 } }),
  mk({ id: "minimal-marco", familia: "minimalista", nombre: "Foto enmarcada", descripcion: "La foto con un marco crema alrededor.", campos: ["foto", "eyebrow", "l2", "support"], l2: 104, maqueta: { fondo: "marco", logoTop: 92, logoAncho: 300, bloqueTop: 820 }, flecha: AZUL }),
  mk({ id: "minimal-banda-baja", familia: "minimalista", nombre: "Banda al pie", descripcion: "Texto arriba y una franja de foto al pie.", campos: ["foto", "eyebrow", "l1", "l2", "support"], l2: 116, maqueta: { fondo: "foto-banda-baja", logoTop: 150, logoAncho: 340, bloqueTop: 420 } }),
  mk({ id: "minimal-tipografico", familia: "minimalista", nombre: "Solo tipografía", descripcion: "Una frase enorme, sin nada más.", campos: ["l2"], l2: 150, maqueta: { ...M.solidoCentro, bloqueTop: 480 } }),
  mk({ id: "minimal-claim", familia: "minimalista", nombre: "Marca y claim", descripcion: "El logo grande y una línea de cierre.", campos: ["l2", "support"], l2: 92, maqueta: { fondo: "solido", logoTop: 430, logoAncho: 520, bloqueTop: 760 } }),
  mk({ id: "minimal-claro-foto", familia: "minimalista", nombre: "Claro con foto", descripcion: "Banda de foto sobre fondo crema.", campos: ["foto", "eyebrow", "l2", "support"], l2: 116, maqueta: { fondo: "foto-banda", logoTop: 500, logoAncho: 330, bloqueTop: 690, panelTop: 330, velos: ["top"] }, flecha: BLANCO }),

  /* =============== Noticias =============== */
  mk({ id: "noticia", familia: "noticias", nombre: "Noticia", descripcion: "Fecha, titular y bajada sobre la foto.", campos: ["foto", "eyebrow", "l1", "l2", "support"], l2: 98, maqueta: { ...M.heroPleno, logoTop: 60, logoAncho: 300, bloqueBottom: 138 } }),
  mk({ id: "noticia-panel", familia: "noticias", nombre: "Noticia con panel", descripcion: "La noticia sobre panel azul, más legible.", campos: ["foto", "eyebrow", "l1", "l2", "support"], l2: 104, maqueta: M.panelAbajo }),
  mk({ id: "cita", familia: "noticias", nombre: "Cita / testimonio", descripcion: "Una frase entre comillas y su firma.", campos: ["eyebrow", "cita"], maqueta: { ...M.solido, logoTop: 110, bloqueTop: 360 } }),
  mk({ id: "cita-foto", familia: "noticias", nombre: "Cita sobre foto", descripcion: "El testimonio sobre una imagen.", campos: ["foto", "eyebrow", "cita"], maqueta: { fondo: "foto", logoTop: 66, logoAncho: 300, bloqueTop: 420, velos: ["full", "bottom"] } }),
  mk({ id: "cita-claro", familia: "noticias", nombre: "Cita en claro", descripcion: "El testimonio en tono crema.", campos: ["eyebrow", "cita"], maqueta: { ...M.claro, bloqueTop: 360 }, flecha: AZUL }),
  mk({ id: "hito", familia: "noticias", nombre: "Hito / aniversario", descripcion: "Una cifra de celebración y su mensaje.", campos: ["foto", "eyebrow", "dato", "l1", "support"], maqueta: { ...M.heroPleno, bloqueBottom: 140 } }),
  mk({ id: "anuncio-fecha", familia: "noticias", nombre: "Anuncio con fecha", descripcion: "Para charlas, ferias y fechas que hay que fijar.", campos: ["foto", "eyebrow", "l1", "l2", "ribbon", "support"], l2: 104, maqueta: M.panelAbajo }),
  mk({ id: "bienvenida", familia: "noticias", nombre: "Bienvenida", descripcion: "Para dar la bienvenida a un cliente o al equipo.", campos: ["foto", "eyebrow", "l1", "l2", "support"], l2: 116, maqueta: M.panelAbajo }),
  mk({ id: "agradecimiento", familia: "noticias", nombre: "Agradecimiento", descripcion: "Cierre de temporada o de año.", campos: ["foto", "eyebrow", "l1", "l2", "support"], l2: 124, maqueta: M.heroPleno }),

  /* =============== Redes y educativo =============== */
  mk({ id: "sabias-que", familia: "redes", nombre: "¿Sabías qué?", descripcion: "El clásico dato curioso del feed.", campos: ["foto", "eyebrow", "l1", "dato", "l2"], l2: 88, maqueta: { ...M.heroPleno, bloqueBottom: 160 } }),
  mk({ id: "mito-realidad", familia: "redes", nombre: "Mito y realidad", descripcion: "Dos columnas: lo que se cree y lo que es.", campos: ["eyebrow", "l2", "columnas"], l2: 100, maqueta: { ...M.solidoAlto, bloqueTop: 320 } }),
  mk({ id: "pregunta", familia: "redes", nombre: "Pregunta abierta", descripcion: "Una pregunta grande para generar respuestas.", campos: ["foto", "eyebrow", "l2", "support"], l2: 116, maqueta: { ...M.heroPleno, bloqueBottom: 170 } }),
  mk({ id: "tip", familia: "redes", nombre: "Tip / consejo", descripcion: "Un consejo corto y accionable.", campos: ["foto", "eyebrow", "l1", "l2", "support"], l2: 104, maqueta: M.panelAbajo }),
  mk({ id: "carrusel-portada", familia: "redes", nombre: "Carrusel: portada", descripcion: "Primera lámina, con la promesa del carrusel.", campos: ["foto", "eyebrow", "l1", "l2", "ribbon"], l2: 124, maqueta: M.heroPleno }),
  mk({ id: "carrusel-interior", familia: "redes", nombre: "Carrusel: interior", descripcion: "Lámina intermedia, sobria y legible.", campos: ["eyebrow", "l2", "support"], l2: 104, maqueta: { ...M.solidoCentro, bloqueTop: 420 } }),
  mk({ id: "carrusel-lista", familia: "redes", nombre: "Carrusel: lista", descripcion: "Lámina intermedia con viñetas.", campos: ["eyebrow", "l2", "lista"], l2: 100, maqueta: { ...M.solidoAlto, bloqueTop: 330 } }),
  mk({ id: "carrusel-cierre", familia: "redes", nombre: "Carrusel: cierre", descripcion: "Última lámina, con el llamado a la acción.", campos: ["eyebrow", "l1", "l2", "ribbon", "support"], l2: 116, maqueta: { ...M.solidoCentro, bloqueTop: 440 } }),
  mk({ id: "serie-numero", familia: "redes", nombre: "Serie numerada", descripcion: "Para entregas de una serie: #1, #2, #3.", campos: ["foto", "eyebrow", "dato", "l2", "support"], l2: 96, maqueta: { ...M.panelAbajoAlto, bloqueTop: 450 } }),

  /* =============== Ferias y visitas =============== */
  /* Todas llevan el logo del evento o del cliente junto al de ASLI. La dupla
     los pone centrados y separados por una linea; cuando la composicion no
     deja, el invitado va suelto en su propia esquina. */
  mk({ id: "ev-estuvimos", familia: "eventos", nombre: "Estuvimos en", descripcion: "Los dos logos juntos sobre la foto del stand.", campos: ["foto", "logo2", "eyebrow", "l1", "l2", "support"], l2: 104, maqueta: { ...M.heroPleno, logoTop: 70, logoAncho: 300, dupla: true, bloqueBottom: 130 } }),
  mk({ id: "ev-estuvimos-panel", familia: "eventos", nombre: "Estuvimos en - panel", descripcion: "Foto arriba y los dos logos sobre el panel azul.", campos: ["foto", "logo2", "eyebrow", "l1", "l2", "support"], l2: 116, maqueta: { ...M.panelAbajo, logoTop: 372, logoAncho: 300, dupla: true } }),
  mk({ id: "ev-te-esperamos", familia: "eventos", nombre: "Te esperamos", descripcion: "Invitacion al stand, con fecha, lugar y numero.", campos: ["foto", "logo2", "eyebrow", "l1", "l2", "evento", "ribbon"], l2: 104, maqueta: { ...M.panelAbajo, logoTop: 372, logoAncho: 300, dupla: true, bloqueTop: 660 } }),
  mk({ id: "ev-invitacion", familia: "eventos", nombre: "Invitacion", descripcion: "Invitacion formal con los datos del evento destacados.", campos: ["foto", "logo2", "eyebrow", "l1", "l2", "evento", "support"], l2: 110, maqueta: { ...M.panelAbajoAlto, logoTop: 252, logoAncho: 280, dupla: true, bloqueTop: 470 } }),
  mk({ id: "ev-countdown", familia: "eventos", nombre: "Faltan X dias", descripcion: "Cuenta regresiva para el evento.", campos: ["foto", "logo2", "eyebrow", "dato", "l1", "evento"], maqueta: { ...M.heroPleno, logoTop: 66, logoAncho: 290, dupla: true, bloqueBottom: 130 } }),
  mk({ id: "ev-dia", familia: "eventos", nombre: "Dia 1, dia 2...", descripcion: "Para publicar cada jornada de la feria.", campos: ["foto", "logo2", "eyebrow", "dato", "l2", "support"], maqueta: { ...M.panelAbajoAlto, logoTop: 252, logoAncho: 280, dupla: true, bloqueTop: 470 } }),
  mk({ id: "ev-stand-numero", familia: "eventos", nombre: "Numero de stand", descripcion: "El numero de stand como protagonista.", campos: ["foto", "logo2", "eyebrow", "dato", "l1", "evento"], maqueta: { ...M.heroPleno, logoTop: 66, logoAncho: 290, dupla: true, bloqueBottom: 150 } }),
  mk({ id: "ev-nos-vemos", familia: "eventos", nombre: "Nos vemos en", descripcion: "Anuncio breve de que vamos a estar.", campos: ["foto", "logo2", "eyebrow", "l2", "evento"], l2: 112, maqueta: { ...M.heroPleno, logoTop: 70, logoAncho: 300, dupla: true, bloqueBottom: 150 } }),
  mk({ id: "ev-poster", familia: "eventos", nombre: "Poster de feria", descripcion: "Afiche con franjas y los dos logos arriba.", campos: ["foto", "logo2", "eyebrow", "l1", "l2", "ribbon"], l2: 96, maqueta: { fondo: "poster", logoTop: 56, logoAncho: 250, dupla: true, bloqueTop: 846 } }),
  mk({ id: "ev-medallon", familia: "eventos", nombre: "Medallon de feria", descripcion: "La foto del stand en circulo y los logos arriba.", campos: ["foto", "logo2", "eyebrow", "l2", "support"], l2: 100, maqueta: { fondo: "medallon", logoTop: 84, logoAncho: 260, dupla: true, bloqueTop: 780 } }),
  mk({ id: "ev-minimal", familia: "eventos", nombre: "Feria minimal", descripcion: "Solo los dos logos y una linea. Sin foto.", campos: ["logo2", "eyebrow", "l2", "evento"], l2: 118, maqueta: { fondo: "solido", logoTop: 300, logoAncho: 320, dupla: true, bloqueTop: 640 } }),
  mk({ id: "ev-claro", familia: "eventos", nombre: "Feria en claro", descripcion: "Version crema, util cuando el logo invitado es oscuro.", campos: ["logo2", "eyebrow", "l2", "evento"], l2: 118, maqueta: { fondo: "claro", logoTop: 300, logoAncho: 320, dupla: true, bloqueTop: 640 }, flecha: AZUL }),
  mk({ id: "ev-split", familia: "eventos", nombre: "Feria split", descripcion: "Foto del stand a un lado y los datos al otro.", campos: ["foto", "logo2", "eyebrow", "l2", "evento"], l2: 72, maqueta: { fondo: "split", logoTop: 92, logoAncho: 230, logoIzq: 528, bloqueTop: 340, bloqueIzq: 510, alinear: "izquierda", logo2Top: 196, logo2Ancho: 200, logo2Izq: 528 } }),
  mk({ id: "ev-gracias", familia: "eventos", nombre: "Gracias por visitarnos", descripcion: "Cierre de feria, agradeciendo a quienes pasaron.", campos: ["foto", "logo2", "eyebrow", "l1", "l2", "support"], l2: 112, maqueta: { ...M.panelAbajo, logoTop: 372, logoAncho: 300, dupla: true } }),
  mk({ id: "ev-resumen", familia: "eventos", nombre: "Resumen de feria", descripcion: "Como nos fue: tres cifras del evento.", campos: ["foto", "logo2", "eyebrow", "l2", "metricas"], l2: 96, maqueta: { ...M.panelAbajoAlto, logoTop: 252, logoAncho: 280, dupla: true, bloqueTop: 455 } }),
  mk({ id: "ev-highlights", familia: "eventos", nombre: "Lo destacado", descripcion: "Tres tarjetas con lo mejor del evento.", campos: ["foto", "logo2", "eyebrow", "l2", "tarjetas"], l2: 92, maqueta: { ...M.panelAbajoAlto, logoTop: 252, logoAncho: 280, dupla: true, bloqueTop: 450 } }),
  mk({ id: "ev-agenda", familia: "eventos", nombre: "Agenda del evento", descripcion: "Tabla con horarios o actividades.", campos: ["logo2", "eyebrow", "l2", "tabla", "evento"], l2: 92, maqueta: { fondo: "solido", logoTop: 110, logoAncho: 290, dupla: true, bloqueTop: 400 } }),
  mk({ id: "ev-cita", familia: "eventos", nombre: "Cita desde la feria", descripcion: "Una frase dicha en el evento.", campos: ["foto", "logo2", "eyebrow", "cita"], maqueta: { fondo: "foto", logoTop: 66, logoAncho: 280, dupla: true, bloqueTop: 450, velos: ["full", "bottom"] } }),
  mk({ id: "ev-bienvenida-stand", familia: "eventos", nombre: "Bienvenidos al stand", descripcion: "Para publicar apenas abre la feria.", campos: ["foto", "logo2", "eyebrow", "l1", "l2", "evento"], l2: 104, maqueta: { ...M.heroPleno, logoTop: 70, logoAncho: 290, dupla: true, bloqueBottom: 140 } }),
  mk({ id: "ev-equipo", familia: "eventos", nombre: "Equipo en terreno", descripcion: "La foto del equipo, con el logo del lugar.", campos: ["foto", "logo2", "eyebrow", "l1", "l2", "support"], l2: 108, maqueta: { ...M.panelAbajo, logoTop: 372, logoAncho: 300, dupla: true } }),
  mk({ id: "ev-visita", familia: "eventos", nombre: "Visita a cliente", descripcion: "Con el logo del cliente visitado junto al nuestro.", campos: ["foto", "logo2", "eyebrow", "l1", "l2", "support"], l2: 108, maqueta: { ...M.heroPleno, logoTop: 70, logoAncho: 300, dupla: true, bloqueBottom: 130 } }),
  mk({ id: "ev-visita-panel", familia: "eventos", nombre: "Visita - panel", descripcion: "La visita sobre panel azul, mas legible.", campos: ["foto", "logo2", "eyebrow", "l1", "l2", "support"], l2: 116, maqueta: { ...M.panelAbajo, logoTop: 372, logoAncho: 300, dupla: true } }),
  mk({ id: "ev-visita-banda", familia: "eventos", nombre: "Visita - banda al pie", descripcion: "Texto arriba y la foto de la visita al pie.", campos: ["foto", "logo2", "eyebrow", "l1", "l2", "support"], l2: 108, maqueta: { fondo: "foto-banda-baja", logoTop: 140, logoAncho: 290, dupla: true, bloqueTop: 430 } }),
  mk({ id: "ev-charla", familia: "eventos", nombre: "Charla o seminario", descripcion: "Para exposiciones y charlas, con fecha y lugar.", campos: ["foto", "logo2", "eyebrow", "l1", "l2", "evento", "support"], l2: 100, maqueta: { ...M.panelAbajo, logoTop: 372, logoAncho: 300, dupla: true, bloqueTop: 648 } }),
  mk({ id: "ev-reunion", familia: "eventos", nombre: "Reunion de trabajo", descripcion: "Para reuniones y mesas de trabajo con clientes.", campos: ["foto", "logo2", "eyebrow", "l1", "l2", "support"], l2: 104, maqueta: { ...M.panelAbajoAlto, logoTop: 252, logoAncho: 280, dupla: true, bloqueTop: 468 } }),
];

export function getPlantilla(id: PlantillaId): Plantilla {
  return PLANTILLAS.find((p) => p.id === id) ?? PLANTILLAS[0];
}

export function usaCampo(plantilla: PlantillaId, campo: CampoId): boolean {
  return getPlantilla(plantilla).campos.includes(campo);
}

/**
 * Posicion a mano de un elemento, en px del lienzo (1080x1350).
 *
 * Mientras un elemento no tenga ajuste se dibuja donde lo pone la plantilla,
 * apilado en el flujo. Cuando se entra al modo de ajuste se miden todos y se
 * congelan aca, asi pasar a posicion libre no mueve nada de lugar.
 */
/**
 * Formatos de salida.
 *
 * Las maquetas estan escritas para 1080x1350. Para los otros formatos se
 * multiplica toda coordenada vertical por `alto / 1350`, asi la composicion se
 * mantiene proporcional en vez de quedar con la mitad de la pieza vacia.
 */
export type FormatoId = "post" | "historia" | "cuadrada";

export const FORMATOS: { id: FormatoId; nombre: string; ancho: number; alto: number }[] = [
  { id: "post", nombre: "Publicación · 4:5", ancho: 1080, alto: 1350 },
  { id: "historia", nombre: "Historia · 9:16", ancho: 1080, alto: 1920 },
  { id: "cuadrada", nombre: "Cuadrada · 1:1", ancho: 1080, alto: 1080 },
];

export function getFormato(id: FormatoId) {
  return FORMATOS.find((f) => f.id === id) ?? FORMATOS[0];
}

/** Alineacion de los textos dentro del bloque. */
export type Alineacion = "izq" | "centro" | "der";

export const ALINEACIONES: { id: Alineacion; nombre: string; icono: string }[] = [
  { id: "izq", nombre: "Izquierda", icono: "mdi:format-align-left" },
  { id: "centro", nombre: "Centro", icono: "mdi:format-align-center" },
  { id: "der", nombre: "Derecha", icono: "mdi:format-align-right" },
];

export type Ajuste = {
  x: number;
  y: number;
  /** Ancho de la caja. El texto reacomoda solo dentro. */
  w: number;
  /** Multiplicador del tamano de letra, para agrandar sin reescribir el texto. */
  escala?: number;
};

/** Ajustes por id de elemento: "titular", "support", "foto", etc. */
export type Ajustes = Record<string, Ajuste>;

export type Pieza = {
  plantilla: PlantillaId;
  /** Relacion de aspecto de salida. */
  formato: FormatoId;
  /** Alineacion elegida a mano. null = la que trae la plantilla. */
  alineacion: Alineacion | null;
  eyebrow: string;
  l1: string;
  lm: string;
  l2: string;
  l2Tamano: number;
  ribbon: string;
  ribbon2: string;
  support: string;
  chips: string[];
  lista: string[];
  pasos: string[];
  /** Cada línea: "Título | texto". */
  tarjetas: string[];
  /** Cada línea: "Etiqueta | 70" (0 a 100). */
  barras: string[];
  /** Cada línea: "15+ | Años". */
  metricas: string[];
  /** Cada línea: "2019 | Abrimos en Curicó". */
  hitos: string[];
  /** Cada línea: "Concepto | Valor". */
  tabla: string[];
  dato: string;
  datoEtiqueta: string;
  cita: string;
  firma: string;
  colATitulo: string;
  colA: string[];
  colBTitulo: string;
  colB: string[];
  /** Logo del evento o del cliente visitado. */
  logo2: string;
  eventoFecha: string;
  eventoLugar: string;
  eventoStand: string;
  foto: string;
  fotoPosicion: number;
  fotoPosicionX: number;
  fotoZoom: number;
  flechaColor: string;
  /** Posiciones movidas a mano. Vacio = todo como lo pone la plantilla. */
  ajustes: Ajustes;
};

export const PIEZA_INICIAL: Pieza = {
  plantilla: "panel-inferior",
  formato: "post",
  alineacion: null,
  eyebrow: "Exportación marítima",
  l1: "Llevamos tu carga",
  lm: "",
  l2: "De Chile al mundo",
  l2Tamano: 132,
  ribbon: "Booking, estiba y zarpe",
  ribbon2: "Cotiza hoy",
  support:
    "Gestionamos tu reserva con las principales navieras y controlamos <b>cada hito hasta el zarpe</b>.",
  chips: ["Marítimo", "Terrestre", "Aéreo"],
  lista: [
    "Reservas con navieras y aerolíneas",
    "Documentación de exportación e importación",
    "Seguimiento en línea de cada embarque",
    "Un ejecutivo dedicado de punta a punta",
  ],
  pasos: [
    "Nos envías la carga y el destino",
    "Cotizamos y reservamos con la naviera",
    "Coordinamos retiro, estiba y documentos",
    "Te avisamos en cada hito hasta la entrega",
  ],
  tarjetas: [
    "Marítimo | Consolidado y contenedor completo",
    "Terrestre | Nacional e internacional",
    "Aéreo | Para carga que no puede esperar",
  ],
  barras: ["Marítimo | 72", "Terrestre | 46", "Aéreo | 28"],
  metricas: ["15+ | Años", "150+ | Clientes", "30+ | Países"],
  hitos: ["2009 | Partimos en Curicó", "2018 | Primera oficina propia", "2026 | Más de 30 destinos"],
  tabla: ["Tránsito a Asia | 28 días", "Tránsito a Europa | 24 días", "Corte documental | 72 horas"],
  dato: "90%",
  datoEtiqueta: "del comercio mundial se mueve por mar",
  cita: "La confianza que nos entregan es el mejor resultado del año.",
  firma: "Equipo ASLI",
  colATitulo: "Con ASLI",
  colA: ["Un ejecutivo dedicado", "Seguimiento en línea", "Documentos al día"],
  colBTitulo: "Sin operador",
  colB: ["Llamados a tres proveedores", "Sin visibilidad del embarque", "Multas por documentos tardíos"],
  logo2: "",
  eventoFecha: "14 al 16 de octubre",
  eventoLugar: "Espacio Riesco, Santiago",
  eventoStand: "Stand S50",
  foto: "",
  fotoPosicion: 50,
  fotoPosicionX: 50,
  fotoZoom: 100,
  flechaColor: BLANCO,
  ajustes: {},
};

/** Parte "Título | texto" en sus dos mitades. Sin barra, todo va al primero. */
export function partir(linea: string): [string, string] {
  const i = linea.indexOf("|");
  if (i < 0) return [linea.trim(), ""];
  return [linea.slice(0, i).trim(), linea.slice(i + 1).trim()];
}

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
