import type { InformativoDestinatario } from "./types";

const TAG_NOMBRE = /\{\{\s*nombre\s*\}\}/gi;

/** Reemplaza `{{nombre}}` (y variantes con espacios) en un texto. */
export function mergeNombre(text: string, nombre: string): string {
  return text.replace(TAG_NOMBRE, nombre.trim() || "cliente");
}

export function mergeAllStrings(
  values: string[],
  nombre: string,
): string[] {
  return values.map((v) => mergeNombre(v, nombre));
}

/**
 * Parsea destinatarios desde texto pegado.
 * Formatos aceptados (una fila por línea):
 * - email,nombre
 * - nombre,email
 * - email;nombre
 * - solo email (nombre = parte local)
 */
export function parseDestinatarios(raw: string): {
  destinatarios: InformativoDestinatario[];
  errores: string[];
} {
  const destinatarios: InformativoDestinatario[] = [];
  const errores: string[] = [];
  const seen = new Set<string>();

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(/[,;\t]/).map((p) => p.trim()).filter(Boolean);

    let email = "";
    let nombre = "";

    if (parts.length === 1) {
      email = parts[0];
      nombre = email.includes("@") ? email.split("@")[0] : email;
    } else if (parts.length >= 2) {
      if (parts[0].includes("@")) {
        email = parts[0];
        nombre = parts.slice(1).join(" ");
      } else if (parts[1].includes("@")) {
        nombre = parts[0];
        email = parts[1];
      } else {
        errores.push(`Línea ${i + 1}: no se encontró un email válido.`);
        continue;
      }
    }

    const emailNorm = email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      errores.push(`Línea ${i + 1}: email inválido (${email}).`);
      continue;
    }
    if (seen.has(emailNorm)) continue;
    seen.add(emailNorm);
    destinatarios.push({ email: emailNorm, nombre: nombre || emailNorm.split("@")[0] });
  }

  return { destinatarios, errores };
}
