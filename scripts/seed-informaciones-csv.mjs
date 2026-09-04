import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(__dirname, "../contacts_corregidos.csv");
const outPath = path.join(
  __dirname,
  "../supabase/migrations/20260904120100_informaciones_agenda_seed.sql",
);

const raw = fs.readFileSync(csvPath, "utf8");
const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const [, ...rows] = lines;

function esc(s) {
  return String(s ?? "")
    .replace(/'/g, "''")
    .replace(/\u00a0/g, " ")
    .trim();
}

const values = [];
const seen = new Set();

for (const line of rows) {
  const parts = line.split(";").map((p) => p.trim());
  while (parts.length < 4) parts.push("");
  const [first, last, org, emailRaw] = parts;
  const email = esc(emailRaw).toLowerCase();
  if (!email || !email.includes("@") || seen.has(email)) continue;
  seen.add(email);
  const nombre = esc([first, last].filter(Boolean).join(" "));
  const empresa = esc(org) || null;
  if (!nombre) continue;
  values.push(
    `  ('${nombre}', '${email}', ${empresa ? `'${empresa}'` : "NULL"})`,
  );
}

const sql = `-- Seed agenda Informaciones ASLI desde contacts_corregidos.csv
-- ${values.length} contactos

WITH grupo AS (
  SELECT id FROM public.informaciones_grupos WHERE nombre = 'Informaciones ASLI' LIMIT 1
),
ins AS (
  INSERT INTO public.informaciones_contactos (nombre, email, empresa)
  VALUES
${values.join(",\n")}
  ON CONFLICT (email) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    empresa = COALESCE(EXCLUDED.empresa, public.informaciones_contactos.empresa),
    activo = true
  RETURNING id
)
INSERT INTO public.informaciones_grupo_miembros (grupo_id, contacto_id)
SELECT g.id, i.id
FROM grupo g
CROSS JOIN ins i
ON CONFLICT DO NOTHING;
`;

fs.writeFileSync(outPath, sql, "utf8");
console.log(`wrote ${values.length} contacts -> ${path.basename(outPath)}`);
