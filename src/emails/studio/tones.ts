/**
 * Tonos de severidad para los bloques de seguimiento.
 *
 * Existen para que el color signifique algo. La tentación al avisar de un
 * problema es pintarlo todo de rojo, y entonces el rojo deja de avisar nada: si
 * un retraso de dos horas y una carga detenida en aduana se ven igual, el que
 * lee deja de mirar. Por eso hay cuatro niveles y el rojo se reserva.
 *
 * Los colores salen de la paleta corporativa (`ASLI_TAILWIND`), no son nuevos.
 */

export type StudioTone = "neutro" | "ok" | "atencion" | "critico";

export type ToneStyle = {
  /** Fondo suave de la caja. */
  bg: string;
  /** Borde y filete de acento. */
  border: string;
  /** Color del texto destacado sobre el fondo suave. */
  text: string;
  /** Etiqueta por defecto del tono, si el bloque no trae una. */
  kicker: string;
};

const TONOS: Record<StudioTone, ToneStyle> = {
  /** Informativo: un cambio que no compromete nada. */
  neutro: { bg: "#EEF3FA", border: "#11224E", text: "#11224E", kicker: "Información" },
  /** Se cumplió lo previsto. */
  ok: { bg: "#E8F6F2", border: "#007A7B", text: "#0B4F50", kicker: "Confirmado" },
  /** Hay una señal que alguien debe revisar. La mayoría de los avisos son esto. */
  atencion: { bg: "#FDF3E2", border: "#D97706", text: "#8A5200", kicker: "Requiere verificación" },
  /** Algo ya salió mal y tiene consecuencia para el cliente. */
  critico: { bg: "#FCECEE", border: "#C8102E", text: "#8E0B20", kicker: "Urgente" },
};

export const TONE_OPTIONS: { value: StudioTone; label: string }[] = [
  { value: "neutro", label: "Neutro — informativo" },
  { value: "ok", label: "Confirmado — todo en orden" },
  { value: "atencion", label: "Atención — hay que verificar" },
  { value: "critico", label: "Crítico — ya afecta al cliente" },
];

export function resolveTone(raw: string | undefined): StudioTone {
  const v = (raw || "").trim().toLowerCase();
  if (v === "ok" || v === "exito" || v === "success") return "ok";
  if (v === "atencion" || v === "warning" || v === "aviso") return "atencion";
  if (v === "critico" || v === "error" || v === "danger") return "critico";
  return "neutro";
}

export function toneStyle(raw: string | undefined): ToneStyle {
  return TONOS[resolveTone(raw)];
}
