import { ComposerEmail } from "./studio/ComposerEmail";
import { createDefaultStudioDocument } from "./studio/presets";

/** Entrada para `npm run email:dev` (preview oficial React Email). */
export default function InformativoAsliEmail() {
  return <ComposerEmail doc={createDefaultStudioDocument()} nombre="Usuario" />;
}
