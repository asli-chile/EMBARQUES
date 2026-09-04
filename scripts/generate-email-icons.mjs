import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../public/email/icons");
const BG = "#002d69";
const FG = "#ffffff";

function badge(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <circle cx="48" cy="48" r="48" fill="${BG}"/>
  ${inner}
</svg>`;
}

const icons = {
  ship: badge(`<g fill="${FG}">
    <path d="M18 58h60l-6 10c-2 3-5 4-8 4H32c-3 0-6-1-8-4l-6-10z"/>
    <path d="M28 58V36c0-2 1-3 3-3h8l4 10h18c2 0 3 1 3 3v12H28z"/>
    <rect x="34" y="28" width="4" height="8" rx="1"/>
    <path d="M36 28h22c1.5 0 2.5 1 2 2.5L56 38H38l-2-10z"/>
  </g>`),
  plane: badge(`<g fill="${FG}">
    <path d="M18 50c0-2 1.5-3 3.5-3H38l10-18c1-2 2.5-3 4.5-3h3c1.5 0 2.5 1.5 2 3l-6 18h12l6-8c1-1.2 2.2-1.5 3.5-.8l2 1.2c1.2.7 1.5 2 .8 3.2L72 50l6.3 7.4c.7 1.2.4 2.5-.8 3.2l-2 1.2c-1.3.7-2.5.4-3.5-.8l-6-8H52l6 18c.5 1.5-.5 3-2 3h-3c-2 0-3.5-1-4.5-3L38 53H21.5c-2 0-3.5-1-3.5-3z"/>
  </g>`),
  truck: badge(`<g fill="${FG}">
    <rect x="16" y="34" width="40" height="24" rx="3"/>
    <path d="M56 40h12l8 10v8H56V40z"/>
    <circle cx="30" cy="62" r="6"/>
    <circle cx="66" cy="62" r="6"/>
    <circle cx="30" cy="62" r="2.5" fill="${BG}"/>
    <circle cx="66" cy="62" r="2.5" fill="${BG}"/>
  </g>`),
  package: badge(`<g fill="${FG}">
    <path d="M48 20l26 14v28L48 76 22 62V34L48 20z"/>
    <path d="M48 48V76" stroke="${BG}" stroke-width="3" fill="none"/>
    <path d="M22 34l26 14 26-14" stroke="${BG}" stroke-width="3" fill="none"/>
    <path d="M48 20v14l14 8" stroke="${BG}" stroke-width="2.5" fill="none"/>
  </g>`),
  clock: badge(`<g fill="none" stroke="${FG}" stroke-width="4" stroke-linecap="round">
    <circle cx="48" cy="48" r="22"/>
    <path d="M48 34v16l10 6"/>
  </g>`),
  check: badge(`<g>
    <circle cx="48" cy="48" r="22" fill="${FG}"/>
    <path d="M34 48l8 8 20-20" fill="none" stroke="${BG}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`),
  alert: badge(`<g fill="${FG}">
    <path d="M48 22c2 0 3.8 1.2 4.6 3.1l18 42c.8 1.9-.1 4.1-2.1 4.9-.5.2-1 .3-1.5.3H29c-2.2 0-4-1.8-4-4 0-.5.1-1 .3-1.5l18-42C44.2 23.2 46 22 48 22z"/>
    <rect x="45.5" y="38" width="5" height="16" rx="2.5" fill="${BG}"/>
    <circle cx="48" cy="62" r="3" fill="${BG}"/>
  </g>`),
  mail: badge(`<g fill="${FG}">
    <rect x="20" y="30" width="56" height="38" rx="4"/>
    <path d="M22 34l26 18 26-18" stroke="${BG}" stroke-width="3.5" fill="none" stroke-linejoin="round"/>
  </g>`),
  phone: badge(`<g fill="${FG}">
    <path d="M34 24h28c3 0 5 2 5 5v38c0 3-2 5-5 5H34c-3 0-5-2-5-5V29c0-3 2-5 5-5z"/>
    <rect x="40" y="30" width="16" height="28" rx="1" fill="${BG}"/>
    <circle cx="48" cy="66" r="2.5" fill="${BG}"/>
  </g>`),
  leaf: badge(`<g fill="${FG}">
    <path d="M30 66c8-28 28-40 42-44-2 20-12 40-28 48-6 3-12 2-14-4z"/>
    <path d="M72 22c-18 4-34 18-42 44" stroke="${BG}" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>`),
  list: badge(`<g fill="${FG}">
    <circle cx="28" cy="32" r="4"/>
    <circle cx="28" cy="48" r="4"/>
    <circle cx="28" cy="64" r="4"/>
    <rect x="38" y="29" width="32" height="6" rx="3"/>
    <rect x="38" y="45" width="32" height="6" rx="3"/>
    <rect x="38" y="61" width="24" height="6" rx="3"/>
  </g>`),
  globe: badge(`<g fill="none" stroke="${FG}" stroke-width="3.5" stroke-linecap="round">
    <circle cx="48" cy="48" r="22"/>
    <ellipse cx="48" cy="48" rx="10" ry="22"/>
    <path d="M26 48h44M30 36h36M30 60h36"/>
  </g>`),
  people: badge(`<g fill="${FG}">
    <circle cx="48" cy="30" r="9"/>
    <path d="M28 62c0-10 9-16 20-16s20 6 20 16v4H28v-4z"/>
    <circle cx="26" cy="36" r="6.5"/>
    <path d="M12 64c0-7 5-11 11-12"/>
    <circle cx="70" cy="36" r="6.5"/>
    <path d="M84 64c0-7-5-11-11-12"/>
  </g>`),
  star: badge(`<g fill="${FG}">
    <path d="M48 22l6.5 16.5H72l-14 10.5 5.5 17L48 55l-15.5 11 5.5-17L24 38.5h17.5z"/>
  </g>`),
  anchor: badge(`<g fill="${FG}">
    <circle cx="48" cy="28" r="7"/>
    <circle cx="48" cy="28" r="3" fill="${BG}"/>
    <rect x="45.5" y="34" width="5" height="28" rx="2"/>
    <path d="M30 52c0 12 8 20 18 22 10-2 18-10 18-22h-6c0 8-5 13-12 15-7-2-12-7-12-15h-6z"/>
    <path d="M28 48h12M56 48h12"/>
  </g>`),
};

for (const [name, svg] of Object.entries(icons)) {
  const out = path.join(OUT, `${name}.png`);
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log("wrote", name);
}
