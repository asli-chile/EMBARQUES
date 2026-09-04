import { render } from "react-email";
import { ComposerEmail } from "@/emails/studio/ComposerEmail";
import type { StudioDocument } from "@/emails/studio/types";

export async function renderStudioHtml(
  doc: StudioDocument,
  nombre: string,
  opts?: { preferPublicAssets?: boolean },
): Promise<string> {
  return render(
    <ComposerEmail
      doc={doc}
      nombre={nombre}
      preferPublicAssets={opts?.preferPublicAssets ?? false}
    />,
  );
}

export type Destinatario = { email: string; nombre: string };

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
