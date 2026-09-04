import { createClient } from "@/lib/supabase/client";
import {
  nombreDesdeEmail,
  primerNombre,
  type Destinatario,
} from "@/lib/email/informativos/render";

export type InformacionesGrupo = {
  id: string;
  nombre: string;
};

export type InformacionesContacto = {
  id: string;
  nombre: string;
  email: string;
  empresa: string | null;
  activo: boolean;
  grupos?: string[];
};

export type DestinatarioAgenda = Destinatario & {
  empresa?: string | null;
  contactoId?: string;
};

function supabase() {
  return createClient();
}

export async function listGrupos(): Promise<InformacionesGrupo[]> {
  const { data, error } = await supabase()
    .from("informaciones_grupos")
    .select("id, nombre")
    .order("nombre", { ascending: true });
  if (error) throw error;
  return (data ?? []) as InformacionesGrupo[];
}

export async function getGrupoIdByNombre(nombre: string): Promise<string | null> {
  const { data, error } = await supabase()
    .from("informaciones_grupos")
    .select("id")
    .eq("nombre", nombre)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function listContactosGrupo(
  nombreGrupo: string,
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

/** Une contactos de varios grupos (sin duplicar email). */
export async function listContactosDeGrupos(
  nombresGrupos: string[],
): Promise<InformacionesContacto[]> {
  const byEmail = new Map<string, InformacionesContacto>();
  for (const nombre of nombresGrupos) {
    const rows = await listContactosGrupo(nombre);
    for (const c of rows) {
      const key = c.email.toLowerCase();
      const prev = byEmail.get(key);
      if (!prev) {
        byEmail.set(key, { ...c, grupos: [nombre] });
      } else {
        const grupos = new Set([...(prev.grupos ?? []), nombre]);
        byEmail.set(key, { ...prev, grupos: [...grupos] });
      }
    }
  }
  return [...byEmail.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es"),
  );
}

/** Todos los contactos activos, con nombres de grupos. */
export async function listAgendaCompleta(): Promise<InformacionesContacto[]> {
  const grupos = await listGrupos();
  return listContactosDeGrupos(grupos.map((g) => g.nombre));
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

export async function ensureGrupo(nombre: string): Promise<string> {
  const trimmed = nombre.trim().replace(/\s+/g, " ");
  if (!trimmed) throw new Error("Nombre de grupo vacío");
  const existing = await getGrupoIdByNombre(trimmed);
  if (existing) return existing;

  const { data, error } = await supabase()
    .from("informaciones_grupos")
    .insert({ nombre: trimmed })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function upsertContacto(input: {
  nombre: string;
  email: string;
  empresa?: string | null;
  grupoNombre: string;
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

  const grupoId = await ensureGrupo(input.grupoNombre);
  const { error: memErr } = await supabase()
    .from("informaciones_grupo_miembros")
    .upsert(
      { grupo_id: grupoId, contacto_id: data.id },
      { onConflict: "grupo_id,contacto_id" },
    );
  if (memErr) throw memErr;

  return data as InformacionesContacto;
}

export async function setContactoActivo(id: string, activo: boolean): Promise<void> {
  const { error } = await supabase()
    .from("informaciones_contactos")
    .update({ activo })
    .eq("id", id);
  if (error) throw error;
}

/** Líneas: nombre;email;empresa  |  nombre;email;empresa;grupo */
export function parseContactosImport(raw: string): {
  rows: { nombre: string; email: string; empresa: string | null; grupo?: string }[];
  errores: string[];
} {
  const rows: {
    nombre: string;
    email: string;
    empresa: string | null;
    grupo?: string;
  }[] = [];
  const errores: string[] = [];
  const seen = new Set<string>();

  for (const [i, line] of raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .entries()) {
    const parts = line.split(/[;\t]/).map((p) => p.trim()).filter(Boolean);
    let email = "";
    let nombre = "";
    let empresa: string | null = null;
    let grupo: string | undefined;

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
      grupo = rest[2];
    }

    const emailNorm = email.toLowerCase().replace(/^mailto:/i, "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      errores.push(`L${i + 1}: email inválido`);
      continue;
    }
    const key = `${emailNorm}|${(grupo ?? "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      nombre: nombre.trim() || nombreDesdeEmail(emailNorm),
      email: emailNorm,
      empresa,
      grupo,
    });
  }

  return { rows, errores };
}

export async function importContactosToGrupo(
  raw: string,
  grupoNombreDefault: string,
): Promise<{ ok: number; errores: string[] }> {
  const { rows, errores } = parseContactosImport(raw);
  let ok = 0;
  for (const row of rows) {
    try {
      await upsertContacto({
        nombre: row.nombre,
        email: row.email,
        empresa: row.empresa,
        grupoNombre: row.grupo?.trim() || grupoNombreDefault,
      });
      ok += 1;
    } catch (e) {
      errores.push(`${row.email}: ${e instanceof Error ? e.message : "error"}`);
    }
  }
  return { ok, errores };
}
