/**
 * La marca de arribo, al lado del estado.
 *
 * El arribo a destino **no es un estado del flujo** (FLUJO-DE-TRABAJO.md
 * §4.11): la operación se cierra con el fullset y los documentos físicos, y una
 * carga puede llegar a destino estando ya en "Documentación en revisión".
 * Escribirlo en `estado_operacion` la haría retroceder en el papeleo.
 *
 * Por eso son dos ejes y se muestran juntos pero separados: el badge de siempre
 * dice en qué va la operación, y este chip dice si la carga ya llegó. Lo
 * escribe la ventana de NaviTrack; acá solo se lee.
 *
 * Dos formas, porque son dos hechos distintos:
 *
 *   anunciado   la naviera dio fecha. Todavía no llegó: va en trazo tenue.
 *   confirmado  llegó. Va sólido, con el token de estado cumplido.
 */
import { Icon } from "@iconify/react";

export type ArriboInfo = {
  arribo_confirmado?: boolean | null;
  arribo_at?: string | null;
  arribo_anunciado_at?: string | null;
};

function fechaCorta(iso: string | null | undefined): string | null {
  const texto = String(iso ?? "").trim();
  if (!texto) return null;
  /* Una fecha sin hora se sitúa a mediodía: leída como medianoche UTC, en Chile
     —tres horas atrás— cae el día anterior. Mismo criterio que en NaviTrack. */
  const d = new Date(texto.includes("T") ? texto : `${texto}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
}

/**
 * Los cuatro textos del chip, ya resueltos.
 *
 * Se pasan armados en vez de recibir el diccionario entero porque este chip lo
 * usan pantallas que trabajan con secciones distintas de i18n —Mis Reservas,
 * Registros, NaviTrack— y atarlo a una sola obligaría a duplicar las claves en
 * las tres.
 */
export type ArriboLabels = {
  chip: string;
  chipAnunciado: string;
  /** Con {{fecha}}. */
  titulo: string;
  /** Con {{fecha}}. */
  tituloAnunciado: string;
};

/** Construye las etiquetas desde el bloque `navitrack` de i18n, que es donde viven. */
export function arriboLabelsDe(navitrack: Record<string, string>): ArriboLabels {
  return {
    chip: navitrack.arriboChip,
    chipAnunciado: navitrack.arriboChipAnunciado,
    titulo: navitrack.arriboChipTitulo,
    tituloAnunciado: navitrack.arriboChipAnunciadoTitulo,
  };
}

type Props = ArriboInfo & {
  labels: ArriboLabels;
  /** Compacto para la grilla, donde la celda tiene una sola línea. */
  dense?: boolean;
};

export function ArriboChip({
  arribo_confirmado,
  arribo_at,
  arribo_anunciado_at,
  labels,
  dense = false,
}: Props) {
  const confirmado = Boolean(arribo_confirmado);
  const fecha = fechaCorta(confirmado ? arribo_at : arribo_anunciado_at);

  // Sin arribo ni anuncio no hay nada que decir: el badge de estado se basta.
  if (!confirmado && !arribo_anunciado_at) return null;

  const etiqueta = confirmado ? labels.chip : labels.chipAnunciado;
  const titulo = (confirmado ? labels.titulo : labels.tituloAnunciado)?.replace(
    "{{fecha}}",
    fecha ?? "—",
  );

  return (
    <span
      title={titulo}
      className={`inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 font-bold uppercase tracking-wide ${
        dense ? "text-[9.5px]" : "text-[10px]"
      } ${
        confirmado
          ? /* El token de marca, no un verde de Tailwind: el arribo es un
               estado cumplido y así lo dice el resto del ERP. */
            "estado--ok estado-chip"
          : "border border-dash-border bg-dash-control/60 text-dash-muted"
      }`}
    >
      <Icon
        icon={confirmado ? "lucide:flag" : "lucide:clock-arrow-down"}
        width={dense ? 10 : 11}
        height={dense ? 10 : 11}
        className="shrink-0"
        aria-hidden
      />
      <span className="truncate">{etiqueta}</span>
      {fecha && <span className="shrink-0 tabular-nums font-semibold normal-case">{fecha}</span>}
    </span>
  );
}
