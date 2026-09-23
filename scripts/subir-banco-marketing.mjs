/**
 * Sube el banco de imágenes del creador de publicidad a Supabase Storage.
 *
 * El bucket es público: las fotos son stock sin datos de nadie, y el creador
 * las exporta a PNG desde el navegador — con un bucket privado habría que
 * firmar cada URL y el exportador se cae por CORS.
 *
 * Uso:
 *   node --env-file=.env scripts/subir-banco-marketing.mjs --dir <carpeta>
 *   node --env-file=.env scripts/subir-banco-marketing.mjs --dir <carpeta> --dry-run
 *
 * La carpeta debe traer los .jpg ya optimizados y un banco.json al lado
 * (ver graficas/BANCO_DE_IMAGENES.md en el repo de gráficas).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const BUCKET = "marketing-banco";

const args = process.argv.slice(2);
const dirArg = args.indexOf("--dir");
const DIR = dirArg >= 0 ? args[dirArg + 1] : null;
const DRY = args.includes("--dry-run");

if (!DIR) {
  console.error("Falta --dir <carpeta con los .jpg y banco.json>");
  process.exit(1);
}

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (usa --env-file=.env)");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

/** Crea el bucket si no existe. Idempotente: correr el script dos veces no rompe nada. */
async function asegurarBucket() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  if (data.some((b) => b.name === BUCKET)) {
    console.log(`bucket "${BUCKET}": ya existe`);
    return;
  }
  if (DRY) {
    console.log(`bucket "${BUCKET}": se crearía (dry-run)`);
    return;
  }
  const { error: err } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: "10MB",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/json"],
  });
  if (err) throw err;
  console.log(`bucket "${BUCKET}": creado`);
}

async function subir(nombre, cuerpo, contentType) {
  if (DRY) return { skipped: true };
  const { error } = await supabase.storage.from(BUCKET).upload(nombre, cuerpo, {
    contentType,
    upsert: true,
    cacheControl: "31536000",
  });
  if (error) throw error;
  return { ok: true };
}

const fotos = readdirSync(DIR)
  .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
  .sort();

await asegurarBucket();

let hechas = 0;
let pesoTotal = 0;
for (const f of fotos) {
  const buf = readFileSync(path.join(DIR, f));
  await subir(`fotos/${f}`, buf, "image/jpeg");
  hechas += 1;
  pesoTotal += buf.length;
  if (hechas % 20 === 0) console.log(`  ${hechas}/${fotos.length}`);
}

// El manifiesto vive junto a las fotos: agregar una foto es subir el archivo
// y actualizar este JSON, sin tocar código ni desplegar.
const manifiesto = readFileSync(path.join(DIR, "..", "banco.json"));
await subir("banco.json", manifiesto, "application/json");

console.log(
  `${DRY ? "[dry-run] " : ""}fotos: ${hechas} · ${(pesoTotal / 1024 / 1024).toFixed(1)} MB · manifiesto subido`,
);
console.log(`base pública: ${url}/storage/v1/object/public/${BUCKET}/`);
