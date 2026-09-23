/**
 * Baja los subconjuntos latinos de las tipografías del creador de publicidad
 * y genera el CSS local.
 *
 * Van auto-hospedadas a propósito: el exportador a PNG (html-to-image) incrusta
 * las fuentes leyendo la hoja de estilo, y una hoja de otro dominio no siempre
 * se puede leer. Con las woff2 en /public el resultado es el mismo siempre.
 *
 * Uso:  node scripts/bajar-fuentes-marketing.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const CSS_URL =
  "https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@1,600;1,700;1,800;1,900&family=Barlow+Condensed:ital,wght@1,600;1,700&display=swap";

const OUT_DIR = path.resolve("public/fonts/marketing");
const CSS_OUT = path.resolve("src/styles/marketing-fuentes.css");

const css = await fetch(CSS_URL, { headers: { "User-Agent": UA } }).then((r) => r.text());

// Solo latin y latin-ext: el resto (cirílico, vietnamita) no se usa y pesa.
const bloques = css.split("/*").filter((b) => /^\s*(latin|latin-ext)\s*\*\//.test(b));

mkdirSync(OUT_DIR, { recursive: true });

let salida = "/* Generado por scripts/bajar-fuentes-marketing.mjs — no editar a mano. */\n";
let bajadas = 0;

for (const bloque of bloques) {
  const familia = /font-family:\s*'([^']+)'/.exec(bloque)?.[1];
  const peso = /font-weight:\s*(\d+)/.exec(bloque)?.[1];
  const url = /src:\s*url\(([^)]+)\)/.exec(bloque)?.[1];
  const rango = /unicode-range:\s*([^;]+);/.exec(bloque)?.[1];
  const subset = /^\s*(latin-ext|latin)\s*\*\//.exec(bloque)?.[1];
  if (!familia || !peso || !url) continue;

  const nombre = `${familia.toLowerCase().replace(/\s+/g, "-")}-italic-${peso}-${subset}.woff2`;
  const buf = Buffer.from(await fetch(url, { headers: { "User-Agent": UA } }).then((r) => r.arrayBuffer()));
  writeFileSync(path.join(OUT_DIR, nombre), buf);
  bajadas += 1;

  salida +=
    `\n@font-face{font-family:'${familia}';font-style:italic;font-weight:${peso};font-display:block;` +
    `src:url('/embarques/fonts/marketing/${nombre}') format('woff2');` +
    (rango ? `unicode-range:${rango.trim()};` : "") +
    "}\n";
}

writeFileSync(CSS_OUT, salida, "utf8");
console.log(`woff2 bajadas: ${bajadas}\nCSS: ${CSS_OUT}`);
