/** Schema editable de un informativo ASLI (plantilla HTML). */

export const INFORMATIVO_ICON_IDS = [
  "calendar",
  "pin",
  "product",
  "document",
  "cold",
  "custom",
] as const;

export type InformativoIconId = (typeof INFORMATIVO_ICON_IDS)[number];

export interface InformativoFila {
  id: string;
  icon: InformativoIconId;
  /** Solo si icon === "custom": URL absoluta de la imagen. */
  iconUrl?: string;
  label: string;
  value: string;
}

export interface InformativoPayload {
  /** Ej: `Estimada {{nombre}},` — se reemplaza por destinatario. */
  saludo: string;
  parrafos: string[];
  filas: InformativoFila[];
  cierre: string;
  firmaNombre: string;
  firmaCargo: string;
  /** URL absoluta opcional de banner superior. */
  imagenHero?: string;
}

export interface InformativoPlantillaDraft {
  nombre: string;
  asunto: string;
  payload: InformativoPayload;
}

export interface InformativoPlantillaRow {
  id: string;
  nombre: string;
  asunto: string;
  payload: InformativoPayload;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InformativoDestinatario {
  email: string;
  nombre: string;
}

export const INFORMATIVO_ICON_LABELS: Record<InformativoIconId, string> = {
  calendar: "Calendario",
  pin: "Ubicación",
  product: "Producto",
  document: "Documento",
  cold: "Frío",
  custom: "URL personalizada",
};
