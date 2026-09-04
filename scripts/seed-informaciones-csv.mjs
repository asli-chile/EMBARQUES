import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(__dirname, "../contacts_1_corregidos.csv");
const outPath = path.join(
  __dirname,
  "../supabase/migrations/20260904130000_informaciones_agenda_grupos_seed.sql",
);

const raw = fs.readFileSync(csvPath, "utf8");
const lines = raw
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean);
const [, ...rows] = lines;

function esc(s) {
  return String(s ?? "")
    .replace(/'/g, "''")
    .replace(/\u00a0/g, " ")
    .trim();
}

function normGroup(s) {
  return esc(s).replace(/\s+/g, " ").trim();
}

/** @type {Map<string, {nombre:string,email:string,empresa:string|null,grupos:Set<string>}>} */
const byEmail = new Map();

for (const line of rows) {
  const parts = line.split(";").map((p) => p.trim());
  while (parts.length < 5) parts.push("");
  const [first, last, org, labelRaw, emailRaw] = parts;
  const email = esc(emailRaw).toLowerCase();
  const grupo = normGroup(labelRaw);
  if (!email.includes("@") || !grupo) continue;

  const nombre = esc([first, last].filter(Boolean).join(" "));
  if (!nombre) continue;
  const empresa = esc(org) || null;

  const cur = byEmail.get(email);
  if (!cur) {
    byEmail.set(email, {
      nombre,
      email,
      empresa,
      grupos: new Set([grupo]),
    });
  } else {
    cur.grupos.add(grupo);
    if (!cur.empresa && empresa) cur.empresa = empresa;
  }
}

const grupos = [...new Set([...byEmail.values()].flatMap((c) => [...c.grupos]))].sort(
  (a, b) => a.localeCompare(b, "es"),
);

const contactValues = [...byEmail.values()].map(
  (c) =>
    `  ('${c.nombre}', '${c.email}', ${c.empresa ? `'${c.empresa}'` : "NULL"})`,
);

const memberSelects = [];
for (const c of byEmail.values()) {
  for (const g of c.grupos) {
    memberSelects.push(
      `SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = '${esc(g)}' AND c.email = '${c.email}'`,
    );
  }
}

const grupoValues = grupos.map((g) => `  ('${esc(g)}')`).join(",\n");

const sql = `-- Reemplazo agenda: contactos separados por Labels del CSV contacts_1_corregidos.csv
-- Grupos: ${grupos.join(" | ")}
-- Contactos únicos: ${byEmail.size}

-- Quitar grupo legacy monolítico
DELETE FROM public.informaciones_grupo_miembros
WHERE grupo_id IN (
  SELECT id FROM public.informaciones_grupos WHERE nombre = 'Informaciones ASLI'
);
DELETE FROM public.informaciones_grupos WHERE nombre = 'Informaciones ASLI';

INSERT INTO public.informaciones_grupos (nombre)
VALUES
${grupoValues}
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.informaciones_contactos (nombre, email, empresa)
VALUES
${contactValues.join(",\n")}
ON CONFLICT (email) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  empresa = COALESCE(EXCLUDED.empresa, public.informaciones_contactos.empresa),
  activo = true;

-- Reasignar membresías solo según este CSV
DELETE FROM public.informaciones_grupo_miembros;

INSERT INTO public.informaciones_grupo_miembros (grupo_id, contacto_id)
${memberSelects.join("\nUNION ALL\n")}
ON CONFLICT DO NOTHING;
`;

fs.writeFileSync(outPath, sql, "utf8");
console.log(
  JSON.stringify(
    {
      grupos: Object.fromEntries(
        grupos.map((g) => [
          g,
          [...byEmail.values()].filter((c) => c.grupos.has(g)).length,
        ]),
      ),
      contactos: byEmail.size,
      out: path.basename(outPath),
    },
    null,
    2,
  ),
);
