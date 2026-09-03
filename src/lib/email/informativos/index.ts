export type {
  InformativoDestinatario,
  InformativoFila,
  InformativoIconId,
  InformativoPayload,
  InformativoPlantillaDraft,
  InformativoPlantillaRow,
} from "./types";
export { INFORMATIVO_ICON_IDS, INFORMATIVO_ICON_LABELS } from "./types";
export {
  createDefaultInformativoDraft,
  createDefaultInformativoPayload,
  newFilaId,
} from "./defaultTemplate";
export { mergeNombre, parseDestinatarios } from "./merge";
export { renderInformativoHtml } from "./renderInformativoHtml";
export {
  absolutePublicUrl,
  EMAIL_PUBLIC_ORIGIN_FALLBACK,
  footerLogoUrl,
  getEmailAssetOrigin,
  iconAbsoluteUrl,
} from "./assets";
