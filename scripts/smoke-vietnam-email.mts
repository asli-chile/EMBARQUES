import { renderStudioHtml } from "../src/lib/email/informativos/render.tsx";
import { createExportacionesVietnamDocument } from "../src/emails/studio/presets.ts";

const h = await renderStudioHtml(createExportacionesVietnamDocument(), "Carmen", {
  preferPublicAssets: true,
});
console.log("len", h.length);
console.log("cdn", h.includes("cdn.tailwindcss"));
console.log("logo", h.includes("logoblanco"));
console.log("formas", h.includes("formas-header"));
const srcs = [...h.matchAll(/src="([^"]+)"/g)].map((m) => m[1]).slice(0, 8);
console.log(srcs);
