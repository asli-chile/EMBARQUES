/**
 * Genera public/geo/countries-by-region.geojson a partir de Natural Earth 110m.
 * Cada país tiene property "area": AMERICA | EUROPA | ASIA | MEDIO-ORIENTE | OCEANIA.
 * África → MEDIO-ORIENTE; Australia/Nueva Zelanda/Oceanía → OCEANIA.
 */
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NE_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";
const OUT_PATH = path.join(__dirname, "..", "public", "geo", "countries-by-region.geojson");

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

function getArea(properties) {
  const region = properties.REGION_UN || "";
  const sub = (properties.SUBREGION || "").toLowerCase();
  if (region === "Americas") return "AMERICA";
  if (region === "Europe") return "EUROPA";
  if (region === "Africa") return "MEDIO-ORIENTE";
  if (region === "Oceania") return "OCEANIA";
  if (region === "Asia") {
    if (sub.includes("southern asia") || sub.includes("western asia")) return "MEDIO-ORIENTE";
    return "ASIA";
  }
  return null;
}

async function main() {
  console.log("Fetching Natural Earth 110m countries...");
  const data = await fetchJson(NE_URL);
  const features = data.features
    .map((f) => {
      const area = getArea(f.properties);
      if (!area) return null;
      return {
        type: "Feature",
        properties: { area, name: f.properties.ADMIN || f.properties.NAME },
        geometry: f.geometry,
      };
    })
    .filter(Boolean);

  const out = {
    type: "FeatureCollection",
    features,
  };
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out), "utf8");
  console.log("Written", features.length, "features to", OUT_PATH);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
