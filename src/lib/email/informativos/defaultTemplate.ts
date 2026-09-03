import type { InformativoPayload, InformativoPlantillaDraft } from "./types";

export function createDefaultInformativoPayload(): InformativoPayload {
  return {
    saludo: "Estimada {{nombre}},",
    parrafos: [
      "Junto con saludar, informamos que a partir de la temporada 2026-2027, **Vietnam** permitirá el ingreso de **cerezas frescas chilenas** bajo el protocolo Systems Approach.",
      "Este sistema contempla medidas fitosanitarias equivalentes al tratamiento de frío tradicional, ofreciendo una alternativa más eficiente para el envío de fruta fresca.",
    ],
    filas: [
      {
        id: "f1",
        icon: "calendar",
        label: "ANUNCIO",
        value: "27 de agosto de 2026",
      },
      {
        id: "f2",
        icon: "pin",
        label: "DESTINO",
        value: "Vietnam",
      },
      {
        id: "f3",
        icon: "product",
        label: "PRODUCTO",
        value: "Cerezas frescas",
      },
      {
        id: "f4",
        icon: "document",
        label: "MEDIDA",
        value: "Systems Approach como alternativa al tratamiento de frío",
      },
      {
        id: "f5",
        icon: "cold",
        label: "TRATAMIENTO DE FRÍO",
        value:
          "aplicable a fruta proveniente de regiones distintas a las autorizadas bajo Systems Approach",
      },
    ],
    cierre:
      "Recomendamos revisar con anticipación los requisitos aplicables a cada origen y planificar los envíos conforme a esta nueva normativa.",
    firmaNombre: "Equipo ASLI",
    firmaCargo: "Logística & Comercio Exterior",
  };
}

export function createDefaultInformativoDraft(): InformativoPlantillaDraft {
  return {
    nombre: "Informativo base",
    asunto: "Informativo ASLI — Systems Approach Vietnam",
    payload: createDefaultInformativoPayload(),
  };
}

export function newFilaId(): string {
  return `f_${Math.random().toString(36).slice(2, 10)}`;
}
