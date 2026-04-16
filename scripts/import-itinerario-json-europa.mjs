import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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
      console.error("SUPABASE_SERVICE_ROLE_KEY no es service_role.");
      process.exit(1);
    }
  } catch {
    // ignore
  }
}

function norm(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function upper(s) {
  return norm(s).toUpperCase();
}

const MONTHS = {
  ene: 1,
  feb: 2,
  mar: 3,
  abr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dic: 12,
};

function parseDdMon(value, year) {
  const s = norm(value).toLowerCase();
  const m = s.match(/^(\d{1,2})-([a-z]{3})$/);
  if (!m) return null;
  const day = Number.parseInt(m[1], 10);
  const month = MONTHS[m[2]];
  if (!month || !day || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function splitNaveViaje(raw) {
  const text = norm(raw);
  if (/^blank sailing$/i.test(text)) {
    return { nave: upper(text), viaje: "" };
  }
  // Acepta viaje numérico (V.601) y alfanumérico (V.0LI14N1MA).
  const m = text.match(/^(.*?)[\s_-]*[Vv]\.?([A-Za-z0-9]+)\s*$/);
  if (m) return { nave: upper(m[1]), viaje: upper(m[2]) };

  // Fallback para formatos sin V, ej: "CMA CGM XYZ 0MH1KW1MA"
  const token = text.match(/^(.*?)[\s_-]+([A-Za-z0-9]{3,})\s*$/);
  if (token) return { nave: upper(token[1]), viaje: upper(token[2]) };

  return { nave: upper(text), viaje: "" };
}

function isMetadataPuertoKey(key) {
  const k = norm(key).toLowerCase();
  return k === "fecha declaracion" || k === "fecha declaración";
}

function asServiceList(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") return [raw];
  return [];
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const replaceService = process.argv.includes("--replace-service");
  const year = Number.parseInt(String(arg("--year") || "2026"), 10);
  const areaArg = upper(String(arg("--area") || "EUROPA"));
  const area = areaArg || "EUROPA";
  const fileArg = typeof arg("--file") === "string" ? arg("--file") : "itinerario-europa.json";
  const jsonPath = resolve(root, fileArg);

  if (!existsSync(jsonPath)) {
    console.error("No existe el archivo:", jsonPath);
    process.exit(1);
  }
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    console.error("Año inválido. Usa --year 2026 (ejemplo).");
    process.exit(1);
  }

  const url = process.env.PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Faltan PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  assertJwtEsServiceRole(key);

  const raw = JSON.parse(readFileSync(jsonPath, "utf8"));
  const services = asServiceList(raw).filter((s) => s && typeof s === "object");
  if (services.length === 0) {
    console.error("JSON inválido: debe ser objeto o array de servicios.");
    process.exit(1);
  }

  const rows = [];
  const servicesSummary = [];
  for (const service of services) {
    const naviera = upper(service.naviera);
    const servicio = upper(service.servicio);
    const itinerarios = Array.isArray(service.itinerarios) ? service.itinerarios : [];
    if (!servicio || itinerarios.length === 0) continue;

    let validForService = 0;
    for (const row of itinerarios) {
      const puertos = row.puertos ?? {};
      const orderedPorts = Object.entries(puertos).filter(([k]) => !isMetadataPuertoKey(k));
      const firstPortName = orderedPorts[0]?.[0] ?? "";
      const firstPortDate = orderedPorts[0]?.[1] ?? "";
      const etd = parseDdMon(firstPortDate, year);
      const { nave, viaje } = splitNaveViaje(row.nave);
      if (!etd || !nave || !viaje) continue;

      const escalas = [];
      let orden = 1;
      for (const [k, v] of orderedPorts) {
        const puertoNombre = upper(k);
        if (puertoNombre === upper(firstPortName)) continue;
        const eta = parseDdMon(v, year);
        if (!eta) continue;
        escalas.push({
          puerto: puertoNombre,
          puerto_nombre: puertoNombre,
          eta,
          dias_transito: null,
          orden: orden++,
          area,
        });
      }
      if (escalas.length === 0) continue;

      rows.push({
        servicio,
        naviera,
        nave,
        viaje,
        semana: Number.isFinite(Number(row.semana)) ? Number(row.semana) : null,
        pol: upper(firstPortName),
        etd,
        escalas,
      });
      validForService += 1;
    }

    servicesSummary.push({ servicio, naviera, valid: validForService });
  }

  if (rows.length === 0) {
    console.error("No hay filas válidas para importar.");
    process.exit(1);
  }

  console.log("Archivo:", jsonPath);
  console.log("Servicios detectados:", servicesSummary.length);
  for (const s of servicesSummary) {
    console.log(" -", s.servicio, "|", s.naviera, "| válidas:", s.valid);
  }
  console.log("Año:", year, "| Filas válidas totales:", rows.length);
  if (dryRun) return;

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (replaceService) {
    const uniqueServices = [...new Set(rows.map((r) => r.servicio))];
    for (const servicio of uniqueServices) {
      const { error: delErr } = await supabase
        .from("itinerarios")
        .delete()
        .eq("servicio", servicio)
        .is("created_by", null);
      if (delErr) {
        console.error("Error borrando servicio previo:", servicio, delErr.message);
        process.exit(1);
      }
    }
  }

  let ok = 0;
  let fail = 0;
  for (const it of rows) {
    const { data: ins, error: insErr } = await supabase
      .from("itinerarios")
      .insert({
        servicio: it.servicio,
        consorcio: null,
        naviera: it.naviera,
        operador: it.naviera,
        nave: it.nave,
        viaje: it.viaje,
        semana: it.semana,
        pol: it.pol,
        etd: it.etd,
      })
      .select("id")
      .single();
    if (insErr || !ins?.id) {
      fail += 1;
      continue;
    }
    const escalasRows = it.escalas.map((e) => ({ ...e, itinerario_id: ins.id }));
    const { error: escErr } = await supabase.from("itinerario_escalas").insert(escalasRows);
    if (escErr) {
      await supabase.from("itinerarios").delete().eq("id", ins.id);
      fail += 1;
      continue;
    }
    ok += 1;
  }

  console.log("Listo. OK:", ok, "Fallidos:", fail);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

