import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../public/email/icons");
fs.mkdirSync(dir, { recursive: true });

const navy = "#002d69";

function circleIcon(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <circle cx="48" cy="48" r="48" fill="${navy}"/>
  ${inner}
</svg>`;
}

const icons = {
  calendar: circleIcon(`<g fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" transform="translate(24 24) scale(2)">
    <rect x="3.5" y="5" width="17" height="15" rx="2"/>
    <path d="M7 3v4M17 3v4M3.5 9h17M8 13h3M8 16h5"/>
    <circle cx="18" cy="16.5" r="2.2" fill="#fff" stroke="#fff"/>
  </g>`),
  pin: circleIcon(`<path fill="#fff" transform="translate(24 22) scale(2.1)" d="M12 2.8a7 7 0 0 0-7 7c0 5.25 7 11.4 7 11.4s7-6.15 7-11.4a7 7 0 0 0-7-7Zm0 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/>`),
  product: circleIcon(`<g fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" transform="translate(24 24) scale(2)">
    <circle cx="8" cy="15" r="4"/><circle cx="16" cy="15" r="4"/>
    <path d="M8 15 12 7l4 8M12 7h4.5l1.5 3"/>
  </g>`),
  document: circleIcon(`<g fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" transform="translate(24 24) scale(2)">
    <path d="M6 2.8h8l4 4V21H6z"/><path d="M14 2.8V7h4M9 11h6M9 14h6M9 17h4"/>
  </g>`),
  cold: circleIcon(`<g fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" transform="translate(24 24) scale(2)">
    <path d="M12 2v20M3.34 7l17.32 10M20.66 7 3.34 17M5.5 4.4l13 15.2M18.5 4.4l-13 15.2"/>
  </g>`),
};

for (const [name, svg] of Object.entries(icons)) {
  await sharp(Buffer.from(svg)).png().toFile(path.join(dir, `${name}.png`));
}
console.log("icons", fs.readdirSync(dir));
