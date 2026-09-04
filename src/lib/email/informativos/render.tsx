import { render } from "react-email";
import { ComposerEmail } from "@/emails/studio/ComposerEmail";
import type { StudioDocument } from "@/emails/studio/types";

const PREVIEW_SELECT_MSG = "studio-select-block";

export function injectStudioPreviewInteractivity(html: string): string {
  const css = `<style id="studio-preview-css">
[data-studio-block-id]{cursor:pointer;transition:outline .12s ease,box-shadow .12s ease;border-radius:2px}
[data-studio-block-id]:hover{outline:2px dashed rgba(17,34,78,.4);outline-offset:3px}
[data-studio-block-id].is-selected{outline:2px solid #11224E;outline-offset:3px;box-shadow:0 0 0 4px rgba(17,34,78,.14)}
</style>`;
  const script = `<script id="studio-preview-js">
(function(){
  function bind(){
    document.querySelectorAll("[data-studio-block-id]").forEach(function(el){
      if(el.getAttribute("data-studio-bound")==="1") return;
      el.setAttribute("data-studio-bound","1");
      el.addEventListener("click",function(e){
        e.preventDefault();
        e.stopPropagation();
        var id=el.getAttribute("data-studio-block-id");
        if(id && window.parent){
          window.parent.postMessage({type:${JSON.stringify(PREVIEW_SELECT_MSG)},id:id},"*");
        }
      });
    });
  }
  bind();
  document.addEventListener("DOMContentLoaded",bind);
})();
</script>`;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${css}${script}</body>`);
  }
  return `${html}${css}${script}`;
}

export async function renderStudioHtml(
  doc: StudioDocument,
  nombre: string,
  opts?: {
    preferPublicAssets?: boolean;
    /** Preview del estudio: clic selecciona bloque. */
    interactive?: boolean;
  },
): Promise<string> {
  const html = await render(
    <ComposerEmail
      doc={doc}
      nombre={nombre}
      preferPublicAssets={opts?.preferPublicAssets ?? false}
      interactive={opts?.interactive ?? false}
    />,
  );
  if (opts?.interactive) return injectStudioPreviewInteractivity(html);
  return html;
}

export { PREVIEW_SELECT_MSG };

export type Destinatario = {
  email: string;
  nombre: string;
  empresa?: string | null;
};

export function nombreDesdeEmail(email: string): string {
  const local = (email.split("@")[0] ?? "").trim();
  if (!local) return "cliente";
  return (
    local
      .replace(/[._+\-]+/g, " ")
      .replace(/\d+/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ") || local
  );
}

export function primerNombre(nombre: string): string {
  const t = nombre.trim();
  return t.split(/\s+/)[0] || t;
}

export function parseDestinatarios(raw: string): {
  destinatarios: Destinatario[];
  errores: string[];
} {
  const destinatarios: Destinatario[] = [];
  const errores: string[] = [];
  const seen = new Set<string>();

  for (const [i, line] of raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .entries()) {
    const angle = line.match(/^(.+?)\s*<([^>]+)>$/);
    const parts = angle
      ? [angle[2].trim(), angle[1].trim()]
      : line.split(/[,;\t]/).map((p) => p.trim()).filter(Boolean);

    let email = "";
    let nombre = "";
    if (parts.length === 1) email = parts[0];
    else if (parts[0].includes("@")) {
      email = parts[0];
      nombre = parts.slice(1).join(" ");
    } else {
      const idx = parts.findIndex((p) => p.includes("@"));
      if (idx < 0) {
        errores.push(`L${i + 1}: sin email`);
        continue;
      }
      email = parts[idx];
      nombre = parts.filter((_, j) => j !== idx).join(" ");
    }

    const emailNorm = email.toLowerCase().replace(/^mailto:/i, "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      errores.push(`L${i + 1}: inválido`);
      continue;
    }
    if (seen.has(emailNorm)) continue;
    seen.add(emailNorm);
    destinatarios.push({
      email: emailNorm,
      nombre: nombre ? primerNombre(nombre) : nombreDesdeEmail(emailNorm),
    });
  }

  return { destinatarios, errores };
}
