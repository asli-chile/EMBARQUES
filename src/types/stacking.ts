/**
 * Tipos para la sección Stacking: horario y fecha de recepción de embarque.
 */

export type StackingEmbarqueInfo = {
  nave: string;
  viaje: string;
  eta: string;
  servicio: string;
};

export type StackingLine = {
  /** Etiqueta del tipo de carga (ej. Carga Dry, IMO con restricción). */
  tipoCarga: string;
  /** Fecha o rango de fechas (ej. "Lunes 4 de Septiembre"). */
  fecha?: string | null;
  /** Rango horario (ej. "08:30 - 21:00"). */
  horario?: string | null;
  /** Nota o contacto (ej. "Coordinar con el terminal +569 32289290"). */
  nota?: string | null;
};

export type StackingData = {
  embarque: StackingEmbarqueInfo;
  lineas: StackingLine[];
  /** Nota destacada para late arrival (ej. peso VGM). */
  lateArrivalVgmNote?: string | null;
  /** Nota para recepción de contenedores vacíos. */
  contenedoresVaciosNote?: string | null;
};
