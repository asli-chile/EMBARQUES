import { createClient } from "@/lib/supabase/client";
import {
  nombreDesdeEmail,
  primerNombre,
  type Destinatario,
} from "@/lib/email/informativos/render";

export const GRUPO_INFORMACIONES_ASLI = "Informaciones ASLI";

export type InformacionesContacto = {
  id: string;
  nombre: string;
  email: string;
  empresa: string | null;
  activo: boolean;
};

export type DestinatarioAgenda = Destinatario & {
  empresa?: string | null;
  contactoId?: string;
};

function supabase() {
  return createClient();
}

export async function getGrupoIdByNombre(
  nombre = GRUPO_INFORMACIONES_ASLI,
): Promise<string | null> {
  const { data, error } = await supabase()
    .from("informaciones_grupos")
    .select("id")
    .eq("nombre", nombre)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function listContactosGrupo(
  nombreGrupo = GRUPO_INFORMACIONES_ASLI,
): Promise<InformacionesContacto[]> {
  const grupoId = await getGrupoIdByNombre(nombreGrupo);
  if (!grupoId) return [];

  const { data, error } = await supabase()
    .from("informaciones_grupo_miembros")
    .select("contacto:informaciones_contactos(id, nombre, email, empresa, activo)")
    .eq("grupo_id", grupoId);

  if (error) throw error;

  const rows = (data ?? [])
    .map((row) => {
      const c = row.contacto as unknown as InformacionesContacto | InformacionesContacto[] | null;
      if (!c) return null;
      return Array.isArray(c) ? c[0] ?? null : c;
    })
    .filter((c): c is InformacionesContacto => !!c && c.activo !== false);

  rows.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return rows;
}

export function contactosToDestinatarios(
  contactos: InformacionesContacto[],
): DestinatarioAgenda[] {
  return contactos.map((c) => ({
    email: c.email.toLowerCase(),
    nombre: primerNombre(c.nombre) || nombreDesdeEmail(c.email),
    empresa: c.empresa,
    contactoId: c.id,
  }));
}

/** Busca contactos de la agenda por email (sin tocar usuarios). */
export async function lookupContactosByEmails(
  emails: string[],
): Promise<Map<string, InformacionesContacto>> {
  const map = new Map<string, InformacionesContacto>();
  const normalized = [...new Set(emails.map((e) => e.toLowerCase().trim()).filter(Boolean))];
  if (!normalized.length) return map;

  const { data, error } = await supabase()
    .from("informaciones_contactos")
    .select("id, nombre, email, empresa, activo")
    .in("email", normalized)
    .eq("activo", true);

  if (error) throw error;
  for (const row of data ?? []) {
    map.set(String(row.email).toLowerCase(), row as InformacionesContacto);
  }
  return map;
}

export async function upsertContacto(input: {
  nombre: string;
  email: string;
  empresa?: string | null;
  grupoNombre?: string;
}): Promise<InformacionesContacto> {
  const email = input.email.toLowerCase().trim();
  const nombre = input.nombre.trim();
  const empresa = input.empresa?.trim() || null;
  if (!email || !nombre) throw new Error("Nombre y email son obligatorios");

  const { data, error } = await supabase()
    .from("informaciones_contactos")
    .upsert(
      { nombre, email, empresa, activo: true },
      { onConflict: "email" },
    )
    .select("id, nombre, email, empresa, activo")
    .single();

  if (error) throw error;

  const grupoId = await getGrupoIdByNombre(input.grupoNombre ?? GRUPO_INFORMACIONES_ASLI);
  if (grupoId) {
    const { error: memErr } = await supabase()
      .from("informaciones_grupo_miembros")
      .upsert(
        { grupo_id: grupoId, contacto_id: data.id },
        { onConflict: "grupo_id,contacto_id" },
      );
    if (memErr) throw memErr;
  }

  return data as InformacionesContacto;
}

export async function setContactoActivo(id: string, activo: boolean): Promise<void> {
  const { error } = await supabase()
    .from("informaciones_contactos")
    .update({ activo })
    .eq("id", id);
  if (error) throw error;
}

export async function updateContacto(
  id: string,
  patch: { nombre?: string; email?: string; empresa?: string | null },
): Promise<void> {
  const payload: Record<string, string | null> = {};
  if (patch.nombre != null) payload.nombre = patch.nombre.trim();
  if (patch.email != null) payload.email = patch.email.toLowerCase().trim();
  if (patch.empresa !== undefined) payload.empresa = patch.empresa?.trim() || null;
  const { error } = await supabase()
    .from("informaciones_contactos")
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

/** Líneas: nombre;email;empresa  |  nombre,email,empresa  |  email solo */
export function parseContactosImport(raw: string): {
  rows: { nombre: string; email: string; empresa: string | null }[];
  errores: string[];
} {
  const rows: { nombre: string; email: string; empresa: string | null }[] = [];
  const errores: string[] = [];
  const seen = new Set<string>();

  for (const [i, line] of raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .entries()) {
    const parts = line.split(/[;\t,]/).map((p) => p.trim()).filter(Boolean);
    let email = "";
    let nombre = "";
    let empresa: string | null = null;

    if (parts.length === 1) {
      email = parts[0];
      nombre = nombreDesdeEmail(email);
    } else {
      const emailIdx = parts.findIndex((p) => p.includes("@"));
      if (emailIdx < 0) {
        errores.push(`L${i + 1}: sin email`);
        continue;
      }
      email = parts[emailIdx];
      const rest = parts.filter((_, j) => j !== emailIdx);
      nombre = rest[0] ?? nombreDesdeEmail(email);
      empresa = rest[1] ?? null;
    }

    const emailNorm = email.toLowerCase().replace(/^mailto:/i, "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      errores.push(`L${i + 1}: email inválido`);
      continue;
    }
    if (seen.has(emailNorm)) continue;
    seen.add(emailNorm);
    rows.push({
      nombre: nombre.trim() || nombreDesdeEmail(emailNorm),
      email: emailNorm,
      empresa,
    });
  }

  return { rows, errores };
}

export async function importContactosToGrupo(
  raw: string,
  grupoNombre = GRUPO_INFORMACIONES_ASLI,
): Promise<{ ok: number; errores: string[] }> {
  const { rows, errores } = parseContactosImport(raw);
  let ok = 0;
  for (const row of rows) {
    try {
      await upsertContacto({ ...row, grupoNombre });
      ok += 1;
    } catch (e) {
      errores.push(
        `${row.email}: ${e instanceof Error ? e.message : "error"}`,
      );
    }
  }
  return { ok, errores };
}
