/**
 * Importa itinerarios desde iti.xlsx → public.itinerarios + public.itinerario_escalas.
 *
 * Reglas:
 * - `area` en escalas: solo regiones canónicas (AMERICA | ASIA | EUROPA | MEDIO-ORIENTE | OCEANIA),
 *   inferidas por destino (coordenadas de ports-coordinates.ts + caja geográfica de respaldo).
 * - Viaje: dígitos después de "V" / "v" en la celda Nave (ej. "MSC PARIS V946" → nave MSC PARIS, viaje 946).
 * - Por defecto NO se exige que la nave exista en public.naves (así entra todo el Excel).
 *   Con `--require-nave-en-bd` se omiten filas cuya nave no esté en `public.naves` (MAYÚSCULAS).
 * - Textos insertados en MAYÚSCULAS.
 * - Semana: si la columna Semana del Excel trae un número 1–53 se usa; si no, se calcula
 *   la semana ISO desde la fecha ETD (misma lógica que operaciones / Registros).
 *
 * Uso:
 *   node --env-file=.env scripts/import-itinerario-iti.mjs --dry-run
 *   node --env-file=.env scripts/import-itinerario-iti.mjs
 *   node --env-file=.env scripts/import-itinerario-iti.mjs --file iti.xlsx
 *   node --env-file=.env scripts/import-itinerario-iti.mjs --replace-bulk
 *     Borra antes los itinerarios con created_by NULL (import vía script) y sus escalas (CASCADE).
 *     No toca filas creadas manualmente en la app (created_by no nulo).
 *   node --env-file=.env scripts/import-itinerario-iti.mjs --require-nave-en-bd
 *     Solo inserta si el nombre de nave existe en public.naves.
 *
 * Si ya importaste antes y muchas filas quedaron con semana NULL, en Supabase SQL:
 *   UPDATE public.itinerarios
 *   SET semana = NULLIF(trim(to_char(etd, 'IW')), '')::int
 *   WHERE etd IS NOT NULL
 *     AND (semana IS NULL OR semana < 1 OR semana > 53);
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx-js-style";

const AREAS = new Set(["AMERICA", "ASIA", "EUROPA", "MEDIO-ORIENTE", "OCEANIA"]);

/** Alias Excel / español → clave en ports-coordinates (mayúsculas). */
const PORT_NAME_ALIASES = {
  AMBERES: "ANTWERP",
  "ST PETERSBURGO": "ST. PETESBURGO",
  "ST. PETERSBURGO": "ST. PETESBURGO",
  "AD DAMMAN": "DAMMAM",
  "AD DAMMAM": "DAMMAM",
};

const root = process.cwd();
if (existsSync(resolve(root, ".env.local"))) config({ path: resolve(root, ".env.local") });
if (existsSync(resolve(root, ".env"))) config({ path: resolve(root, ".env") });

function arg(name) {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  return process.argv[i + 1] ?? true;
}

function assertJwtEsServiceRole(key) {
  if (!key || typeof key !== "string") return;
  const parts = key.split(".");
  if (parts.length !== 3) return;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (payload.role !== "service_role") {
      console.error(
        "SUPABASE_SERVICE_ROLE_KEY no es service_role (role: " + String(payload.role) + ").",
      );
      process.exit(1);
    }
  } catch {
    // ignore
  }
}

/** Carga coordenadas desde src/lib/ports-coordinates.ts (misma fuente que el mapa). */
function loadPortCoordinatesFromRepo() {
  const path = resolve(root, "src/lib/ports-coordinates.ts");
  const text = readFileSync(path, "utf8");
  const map = new Map();
  const re = /^\s*"([^"]+)":\s*\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const key = m[1].trim().toUpperCase();
    const lng = Number(m[2]);
    const lat = Number(m[3]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    map.set(key, [lng, lat]);
  }
  return map;
}

/** Región canónica a partir de [lng, lat] (respaldo si no basta el catálogo de puertos). */
function regionFromLngLat(lng, lat) {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

  if (lng >= 110 && lng <= 180 && lat <= 5 && lat >= -55) return "OCEANIA";
  if (lng >= 155 && lat < 15 && lat >= -50) return "OCEANIA";

  if (lng >= -12 && lng < 42 && lat >= 36 && lat <= 72) return "EUROPA";
  if (lng >= 8 && lng < 35 && lat >= 54 && lat <= 72) return "EUROPA";

  if (lng >= 32 && lng <= 62 && lat >= 9 && lat <= 35) return "MEDIO-ORIENTE";

  if (lng >= 65 && lng <= 100 && lat >= 5 && lat <= 38) return "ASIA";

  if (lng > 95 && lng <= 155 && lat >= -12 && lat < 55) return "ASIA";

  if (lng < 35 && lng > -180 && lat > -60 && lat < 55) return "AMERICA";

  return null;
}

function resolvePortRegion(portName, portCoordsMap) {
  const base = String(portName || "")
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  if (!base) return null;

  const aliased = PORT_NAME_ALIASES[base] ?? base;

  let coords = portCoordsMap.get(aliased) ?? portCoordsMap.get(base);
  if (!coords) {
    const noAcc = base.normalize("NFD").replace(/\p{M}/gu, "");
    coords = portCoordsMap.get(noAcc) ?? portCoordsMap.get(aliased.normalize("NFD").replace(/\p{M}/gu, ""));
  }
  if (!coords) {
    const first = base.split(/[\s,/|-]+/)[0];
    if (first && first.length > 2) {
      const a1 = PORT_NAME_ALIASES[first] ?? first;
      coords = portCoordsMap.get(a1);
    }
  }
  if (coords) {
    const r = regionFromLngLat(coords[0], coords[1]);
    if (r && AREAS.has(r)) return r;
  }
  return null;
}

function inferEscalaArea(puertoNombre, portCoordsMap, sheetFallbackRegion) {
  const fromPort = resolvePortRegion(puertoNombre, portCoordsMap);
  if (fromPort && AREAS.has(fromPort)) return fromPort;
  if (sheetFallbackRegion && AREAS.has(sheetFallbackRegion)) return sheetFallbackRegion;
  return "ASIA";
}

/** Hoja Excel → región por defecto (solo canónicas). */
function sheetToFallbackRegion(sheetName) {
  const s = String(sheetName || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (s.includes("NORTE") && s.includes("EUROPA")) return "EUROPA";
  if (s === "AMERICA" || s.includes("AMERICA")) return "AMERICA";
  if (s.includes("FAR") && s.includes("EAST")) return "ASIA";
  if (s.includes("OCEANIA")) return "OCEANIA";
  if (s.includes("MEDIO") && s.includes("ORIENTE")) return "MEDIO-ORIENTE";
  return null;
}

function normText(v) {
  if (v == null) return "";
  return String(v).replace(/\s+/g, " ").trim();
}

function upper(s) {
  return normText(s).toUpperCase();
}

function isBlank(v) {
  return normText(v) === "";
}

function excelDateToIso(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    const d = XLSX.SSF.parse_date_code(value);
    if (d && d.y && d.m && d.d) {
      const mm = String(d.m).padStart(2, "0");
      const dd = String(d.d).padStart(2, "0");
      return `${d.y}-${mm}-${dd}`;
    }
  }
  const s = normText(value);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parsePuertoHeader(rawHeader) {
  const original = normText(rawHeader);
  if (!original) return null;
  const m = original.match(/^(.*?)\s*\((\d+)\)\s*$/);
  if (m) {
    return {
      puerto: upper(m[1]),
      puerto_nombre: upper(original),
      dias_transito_header: Number.parseInt(m[2], 10) || null,
    };
  }
  return { puerto: upper(original), puerto_nombre: upper(original), dias_transito_header: null };
}

/**
 * Viaje = número después de V/v en la fila nave (última ocurrencia tipo "... V946").
 * Nave = texto antes de ese sufijo.
 */
function splitNaveViaje(naveRaw) {
  const text = normText(naveRaw);
  if (!text) return { nave: "", viaje: "" };

  const m = text.match(/^(.*?)[\s_-]*[Vv]\.?(\d+)\s*$/i);
  if (m) {
    const nave = upper(m[1]);
    const viaje = String(m[2]).toUpperCase();
    if (nave && viaje) return { nave, viaje };
  }
  return { nave: "", viaje: "" };
}

function parseSemana(value) {
  const s = normText(value);
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

/** Semana ISO (1–53) desde fecha YYYY-MM-DD — alineado con `isoWeekFromDate` en RegistrosContent. */
function isoWeekFromIsoDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parts = value.split("-").map(Number);
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const w = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  if (!Number.isFinite(w) || w < 1 || w > 53) return null;
  return w;
}

/** Semana final: Excel si es 1–53; si no, ISO desde ETD. */
function resolveSemana(excelCell, etdIso) {
  const fromExcel = parseSemana(excelCell);
  if (fromExcel != null && fromExcel >= 1 && fromExcel <= 53) return fromExcel;
  return isoWeekFromIsoDate(etdIso);
}

function buildKey(it) {
  return [
    upper(it.servicio),
    upper(it.naviera),
    upper(it.nave),
    upper(it.viaje),
    upper(it.pol),
    normText(it.etd),
  ].join("|");
}

function extractFromSheet(sheetName, ws, portCoordsMap) {
  const rows = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: true,
    defval: null,
  });

  const sheetFallback = sheetToFallbackRegion(sheetName);
  const items = [];
  let currentNaviera = "";
  let currentServicio = "";
  let currentStacking = "";

  let i = 0;
  while (i < rows.length) {
    const row = rows[i] || [];
    const a = normText(row[0]);
    const b = normText(row[1]);

    if (a.toLowerCase() === "naviera") currentNaviera = upper(b);
    if (a.toLowerCase() === "servicio") currentServicio = upper(b);
    if (a.toLowerCase() === "stacking") currentStacking = upper(b);

    if (a.toLowerCase() === "semana" && normText(row[1]).toLowerCase() === "naves") {
      const headerRow = row;
      const portColumns = [];
      for (let c = 3; c < headerRow.length; c++) {
        const parsed = parsePuertoHeader(headerRow[c]);
        if (!parsed) continue;
        portColumns.push({ colIdx: c, ...parsed });
      }
      const pol = portColumns[0]?.puerto ? upper(portColumns[0].puerto) : "";
      const destinationColumns = portColumns.slice(1);

      let r = i + 1;
      while (r < rows.length) {
        const data = rows[r] || [];
        const dataA = normText(data[0]).toLowerCase();
        if (dataA === "naviera" || dataA === "servicio" || dataA === "stacking" || dataA === "semana") break;

        const naveCell = normText(data[1]);
        const hasAnyPortData = destinationColumns.some((p) => !isBlank(data[p.colIdx]));
        if (naveCell && hasAnyPortData) {
          const { nave, viaje } = splitNaveViaje(naveCell);
          const etd =
            excelDateToIso(data[3]) ??
            excelDateToIso(data[2]) ??
            excelDateToIso(portColumns.map((p) => data[p.colIdx]).find((v) => !isBlank(v)));

          const escalas = [];
          let orden = 1;
          for (const p of destinationColumns) {
            const cellValue = data[p.colIdx];
            if (isBlank(cellValue)) continue;
            const eta = excelDateToIso(cellValue);
            let dias_transito = p.dias_transito_header;
            if (!eta && typeof cellValue === "number" && Number.isFinite(cellValue)) {
              dias_transito = Math.trunc(cellValue);
            }
            const displayName = p.puerto_nombre || p.puerto;
            const area = inferEscalaArea(displayName, portCoordsMap, sheetFallback);
            escalas.push({
              puerto: p.puerto,
              puerto_nombre: p.puerto_nombre,
              eta,
              dias_transito,
              orden: orden++,
              area,
            });
          }

          if (nave && viaje && pol && etd && escalas.length > 0) {
            items.push({
              servicio: currentServicio || "SERVICIO",
              consorcio: null,
              naviera: currentNaviera || null,
              operador: currentNaviera || null,
              nave,
              viaje,
              semana: resolveSemana(data[0], etd),
              pol,
              etd,
              stacking: currentStacking || null,
              escalas,
            });
          }
        }
        r += 1;
      }
      i = r;
      continue;
    }

    i += 1;
  }

  return items;
}

async function fetchAllNaveNames(supabase) {
  const out = new Set();
  const page = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from("naves").select("nombre").range(from, from + page - 1);
    if (error) throw error;
    const chunk = data ?? [];
    for (const row of chunk) {
      if (row.nombre) out.add(String(row.nombre).trim().toUpperCase());
    }
    if (chunk.length < page) break;
    from += page;
  }
  return out;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const requireNaveEnBd = process.argv.includes("--require-nave-en-bd");
  const replaceBulk = process.argv.includes("--replace-bulk");
  const fileArg = typeof arg("--file") === "string" ? arg("--file") : "iti.xlsx";
  const xlsxPath = resolve(root, fileArg);
  if (!existsSync(xlsxPath)) {
    console.error("No existe el archivo:", xlsxPath);
    process.exit(1);
  }

  const url = process.env.PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Faltan PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
    process.exit(1);
  }
  assertJwtEsServiceRole(key);

  const portCoordsMap = loadPortCoordinatesFromRepo();
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (replaceBulk) {
    if (dryRun) {
      const { count, error: cErr } = await supabase
        .from("itinerarios")
        .select("id", { count: "exact", head: true })
        .is("created_by", null);
      if (cErr) {
        console.error("Error contando itinerarios a reemplazar:", cErr.message);
        process.exit(1);
      }
      console.log("[dry-run] --replace-bulk eliminaría itinerarios con created_by NULL:", count ?? 0);
    } else {
      const { error: delErr } = await supabase.from("itinerarios").delete().is("created_by", null);
      if (delErr) {
        console.error("Error borrando itinerarios importados:", delErr.message);
        process.exit(1);
      }
      console.log("Eliminados itinerarios previos sin created_by (import masivo). Escalas en cascada.");
    }
  }

  let naveSet = null;
  if (requireNaveEnBd) {
    try {
      naveSet = await fetchAllNaveNames(supabase);
    } catch (e) {
      console.error("No se pudieron cargar naves:", e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
  }

  const wb = XLSX.readFile(xlsxPath, { cellDates: true, raw: true });
  const extracted = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    extracted.push(...extractFromSheet(name, ws, portCoordsMap));
  }

  if (!extracted.length) {
    console.error("No se detectaron itinerarios válidos en el Excel.");
    process.exit(1);
  }

  const { data: existing, error: existingErr } = await supabase
    .from("itinerarios")
    .select("id, servicio, naviera, nave, viaje, pol, etd");
  if (existingErr) {
    console.error("Error leyendo itinerarios existentes:", existingErr.message);
    process.exit(1);
  }

  const existingKeys = new Set((existing ?? []).map((row) => buildKey(row)));
  const seenInFile = new Set();
  const toInsert = [];
  const skipped = {
    duplicatedDb: 0,
    duplicatedFile: 0,
    invalid: 0,
    naveNotInDb: 0,
  };

  for (const it of extracted) {
    if (requireNaveEnBd && naveSet && !naveSet.has(upper(it.nave))) {
      skipped.naveNotInDb += 1;
      continue;
    }
    const keyIt = buildKey(it);
    if (existingKeys.has(keyIt)) {
      skipped.duplicatedDb += 1;
      continue;
    }
    if (seenInFile.has(keyIt)) {
      skipped.duplicatedFile += 1;
      continue;
    }
    if (!it.nave || !it.viaje || !it.pol || !it.etd || !it.escalas?.length) {
      skipped.invalid += 1;
      continue;
    }
    seenInFile.add(keyIt);
    toInsert.push(it);
  }

  console.log("Archivo:", xlsxPath);
  console.log("Puertos en índice coordenadas:", portCoordsMap.size);
  console.log(
    "Filtro nave en BD:",
    requireNaveEnBd ? `activo (${naveSet?.size ?? 0} naves)` : "desactivado (todas las filas válidas del Excel)",
  );
  console.log("Hojas:", wb.SheetNames.length, wb.SheetNames.join(", "));
  console.log("Leídos (pre-filtro naves):", extracted.length);
  console.log("Para insertar:", toInsert.length);
  console.log("Omitidos (nave no existe en BD):", skipped.naveNotInDb);
  console.log("Omitidos (ya en BD):", skipped.duplicatedDb);
  console.log("Omitidos (duplicados en Excel):", skipped.duplicatedFile);
  console.log("Omitidos (inválidos):", skipped.invalid);

  if (dryRun) {
    console.log("Muestra:", JSON.stringify(toInsert.slice(0, 2), null, 2));
    return;
  }

  const rowPayload = (it) => ({
    servicio: upper(it.servicio),
    consorcio: it.consorcio,
    naviera: it.naviera ? upper(it.naviera) : null,
    operador: it.operador ? upper(it.operador) : null,
    nave: upper(it.nave),
    viaje: upper(it.viaje),
    semana: it.semana,
    pol: upper(it.pol),
    etd: it.etd,
  });

  async function insertOne(it) {
    const { data: ins, error: insErr } = await supabase.from("itinerarios").insert(rowPayload(it)).select("id").single();
    if (insErr || !ins?.id) {
      console.error("[itinerario]", it.nave, it.viaje, "->", insErr?.message ?? "sin id");
      return false;
    }
    const escalasRows = it.escalas.map((e) => ({
      itinerario_id: ins.id,
      puerto: upper(e.puerto),
      puerto_nombre: upper(e.puerto_nombre),
      eta: e.eta,
      dias_transito: e.dias_transito,
      orden: e.orden,
      area: upper(e.area),
    }));
    const { error: escErr } = await supabase.from("itinerario_escalas").insert(escalasRows);
    if (escErr) {
      await supabase.from("itinerarios").delete().eq("id", ins.id);
      console.error("[escalas]", it.nave, it.viaje, "->", escErr.message);
      return false;
    }
    return true;
  }

  const BATCH = 80;
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < toInsert.length; i += BATCH) {
    const slice = toInsert.slice(i, i + BATCH);
    const payload = slice.map(rowPayload);
    const { data: insertedRows, error: batchInsErr } = await supabase.from("itinerarios").insert(payload).select("id");

    if (batchInsErr || !insertedRows?.length || insertedRows.length !== slice.length) {
      for (const it of slice) {
        if (await insertOne(it)) ok += 1;
        else fail += 1;
      }
      console.log("Insertados:", ok, "/", toInsert.length, "(lote vía fila a fila)");
      continue;
    }

    const ids = insertedRows.map((r) => r.id);
    const allEscalas = [];
    for (let j = 0; j < slice.length; j++) {
      const it = slice[j];
      const itinerario_id = ids[j];
      for (const e of it.escalas) {
        allEscalas.push({
          itinerario_id,
          puerto: upper(e.puerto),
          puerto_nombre: upper(e.puerto_nombre),
          eta: e.eta,
          dias_transito: e.dias_transito,
          orden: e.orden,
          area: upper(e.area),
        });
      }
    }

    const { error: escBatchErr } = await supabase.from("itinerario_escalas").insert(allEscalas);
    if (escBatchErr) {
      await supabase.from("itinerarios").delete().in("id", ids);
      for (const it of slice) {
        if (await insertOne(it)) ok += 1;
        else fail += 1;
      }
      console.log("Insertados:", ok, "/", toInsert.length, "(escalas en lote falló → fila a fila)");
    } else {
      ok += slice.length;
      console.log("Insertados:", ok, "/", toInsert.length);
    }
  }

  console.log("Listo. OK:", ok, "Fallidos:", fail, "Total destino:", toInsert.length);
}

/** Reutilizable desde `sync-naves-from-iti.mjs` (no ejecutar `main` al importar). */
export { extractFromSheet, loadPortCoordinatesFromRepo };

const isCliEntry =
  process.argv[1] &&
  normalize(fileURLToPath(import.meta.url)).toLowerCase() === normalize(process.argv[1]).toLowerCase();
if (isCliEntry) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
