/**
 * Alta de naves en public.naves y vínculos en public.navieras_naves a partir de iti.xlsx
 * (misma extracción que import-itinerario-iti.mjs) o desde un .txt (una nave por línea).
 *
 * - Nombre de nave en MAYÚSCULAS (coherente con el resto del proyecto).
 * - Si la naviera del Excel no existe en public.navieras, se inserta la nave igualmente
 *   y se omite el vínculo (aviso en consola).
 *
 * Uso:
 *   node --env-file=.env scripts/sync-naves-from-iti.mjs --dry-run
 *   node --env-file=.env scripts/sync-naves-from-iti.mjs
 *   node --env-file=.env scripts/sync-naves-from-iti.mjs --file iti.xlsx
 *   node --env-file=.env scripts/sync-naves-from-iti.mjs --from-list mis-naves.txt
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import XLSX from "xlsx-js-style";
import { extractFromSheet, loadPortCoordinatesFromRepo } from "./import-itinerario-iti.mjs";

const root = process.cwd();
if (existsSync(resolve(root, ".env.local"))) config({ path: resolve(root, ".env.local") });
if (existsSync(resolve(root, ".env"))) config({ path: resolve(root, ".env") });

function arg(name) {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  return process.argv[i + 1] ?? true;
}

function upper(s) {
  return String(s ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

async function fetchAllNavieras(supabase) {
  const map = new Map();
  const page = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from("navieras").select("id, nombre").range(from, from + page - 1);
    if (error) throw error;
    const chunk = data ?? [];
    for (const row of chunk) {
      if (row.nombre) map.set(String(row.nombre).trim().toUpperCase(), row.id);
    }
    if (chunk.length < page) break;
    from += page;
  }
  return map;
}

async function fetchAllNaves(supabase) {
  const map = new Map();
  const page = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from("naves").select("id, nombre").range(from, from + page - 1);
    if (error) throw error;
    const chunk = data ?? [];
    for (const row of chunk) {
      if (row.nombre) map.set(String(row.nombre).trim().toUpperCase(), row.id);
    }
    if (chunk.length < page) break;
    from += page;
  }
  return map;
}

async function fetchExistingLinks(supabase) {
  const set = new Set();
  const page = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from("navieras_naves").select("nave_id, naviera_id").range(from, from + page - 1);
    if (error) throw error;
    const chunk = data ?? [];
    for (const row of chunk) {
      set.add(`${row.nave_id}|${row.naviera_id}`);
    }
    if (chunk.length < page) break;
    from += page;
  }
  return set;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const listPathArg = typeof arg("--from-list") === "string" ? arg("--from-list") : null;
  const fileArg = typeof arg("--file") === "string" ? arg("--file") : "iti.xlsx";

  const url = process.env.PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Faltan PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  /** @type {Map<string, Set<string>>} nave -> navieras (mayúsculas) */
  const naveToNavieras = new Map();

  if (listPathArg) {
    const listPath = resolve(root, listPathArg);
    if (!existsSync(listPath)) {
      console.error("No existe el archivo de lista:", listPath);
      process.exit(1);
    }
    const text = readFileSync(listPath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const n = upper(line);
      if (!n) continue;
      if (!naveToNavieras.has(n)) naveToNavieras.set(n, new Set());
    }
    console.log("Modo: lista", listPath, "| naves únicas:", naveToNavieras.size);
  } else {
    const xlsxPath = resolve(root, fileArg);
    if (!existsSync(xlsxPath)) {
      console.error("No existe el archivo:", xlsxPath);
      process.exit(1);
    }
    const portCoordsMap = loadPortCoordinatesFromRepo();
    const wb = XLSX.readFile(xlsxPath, { cellDates: true, raw: true });
    const items = [];
    for (const name of wb.SheetNames) {
      const ws = wb.Sheets[name];
      items.push(...extractFromSheet(name, ws, portCoordsMap));
    }
    for (const it of items) {
      const nave = upper(it.nave);
      if (!nave) continue;
      if (!naveToNavieras.has(nave)) naveToNavieras.set(nave, new Set());
      const nav = it.naviera ? upper(it.naviera) : "";
      if (nav) naveToNavieras.get(nave).add(nav);
    }
    console.log("Modo: Excel", xlsxPath, "| filas itinerario:", items.length, "| naves únicas:", naveToNavieras.size);
  }

  const navieraByName = await fetchAllNavieras(supabase);
  let naveByName = await fetchAllNaves(supabase);
  let linkKeys = await fetchExistingLinks(supabase);

  let insertedNaves = 0;
  let insertedLinks = 0;
  let skippedNavieraUnknown = 0;

  for (const naveNombre of [...naveToNavieras.keys()].sort()) {
    if (!naveByName.has(naveNombre)) {
      if (dryRun) {
        console.log("[dry-run] INSERT nave:", naveNombre);
        insertedNaves += 1;
      } else {
        const { data, error } = await supabase.from("naves").insert({ nombre: naveNombre }).select("id").single();
        if (error) {
          const dup = error.code === "23505" || String(error.message).toLowerCase().includes("unique");
          if (dup) {
            const { data: row } = await supabase.from("naves").select("id").eq("nombre", naveNombre).maybeSingle();
            if (row?.id) naveByName.set(naveNombre, row.id);
          } else {
            console.error("Error insertando nave", naveNombre, error.message);
          }
        } else if (data?.id) {
          naveByName.set(naveNombre, data.id);
          insertedNaves += 1;
        }
      }
    }

    const naveId = dryRun && !naveByName.has(naveNombre) ? null : naveByName.get(naveNombre);
    if (!naveId && !dryRun) continue;

    const navierasForNave = naveToNavieras.get(naveNombre) ?? new Set();
    if (navierasForNave.size === 0 && listPathArg) continue;

    for (const navieraNombre of [...navierasForNave].sort()) {
      const navieraId = navieraByName.get(navieraNombre);
      if (!navieraId) {
        skippedNavieraUnknown += 1;
        if (process.argv.includes("--verbose")) {
          console.warn("Naviera no en BD, sin vínculo:", navieraNombre, "→ nave", naveNombre);
        }
        continue;
      }
      if (naveId && linkKeys.has(`${naveId}|${navieraId}`)) continue;
      if (dryRun) {
        console.log("[dry-run] LINK", naveNombre, "→", navieraNombre);
        insertedLinks += 1;
        continue;
      }
      const { error: linkErr } = await supabase.from("navieras_naves").insert({ nave_id: naveId, naviera_id: navieraId });
      if (linkErr) {
        const dup =
          linkErr.code === "23505" ||
          String(linkErr.message).toLowerCase().includes("duplicate") ||
          String(linkErr.message).toLowerCase().includes("unique");
        if (!dup) console.error("Error vínculo", naveNombre, navieraNombre, linkErr.message);
      } else {
        linkKeys.add(`${naveId}|${navieraId}`);
        insertedLinks += 1;
      }
    }
  }

  console.log(
    dryRun ? "[dry-run] Simulación terminada." : "Listo.",
    "Naves nuevas:",
    insertedNaves,
    "| Vínculos naviera_nave nuevos:",
    insertedLinks,
    "| Pares sin naviera en BD (omitidos):",
    skippedNavieraUnknown,
  );
  if (!listPathArg && skippedNavieraUnknown > 0 && !process.argv.includes("--verbose")) {
    console.log("Tip: ejecuta con --verbose para listar navieras del Excel que no coinciden con public.navieras.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
