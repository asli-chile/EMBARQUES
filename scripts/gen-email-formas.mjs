import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "../public/email");
fs.mkdirSync(out, { recursive: true });

/** Franja derecha del header: diagonales navy + acento rojo + cream. */
const formas = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="116" viewBox="0 0 320 116">
  <rect width="320" height="116" fill="#002d69"/>
  <polygon points="40,0 320,0 320,116 0,116" fill="#06356f" opacity="0.55"/>
  <polygon points="100,0 320,0 320,116 70,116" fill="#002452" opacity="0.75"/>
  <polygon points="200,0 320,0 320,90 230,0" fill="#C8102E"/>
  <polygon points="260,0 320,0 320,48" fill="#F6EEE8" opacity="0.9"/>
  <g fill="#ffffff" opacity="0.12">
    <polygon points="8,110 48,8 68,8 28,110"/>
    <polygon points="48,110 88,8 108,8 68,110"/>
  </g>
</svg>`;

/** Marcas diagonales suaves (recurso auxiliar). */
const marcas = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <g fill="#ffffff" opacity="0.14">
    <polygon points="20,180 70,20 95,20 45,180"/>
    <polygon points="80,180 130,20 155,20 105,180"/>
    <polygon points="140,180 175,60 190,60 155,180"/>
  </g>
</svg>`;

await sharp(Buffer.from(formas)).png().toFile(path.join(out, "formas-header.png"));
await sharp(Buffer.from(marcas)).png().toFile(path.join(out, "formas-marcas.png"));
console.log("generated", fs.readdirSync(out));
