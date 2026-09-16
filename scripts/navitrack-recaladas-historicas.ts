#!/usr/bin/env node
/**
 * Reconstruye el recorrido de los embarques a partir de las lecturas AIS ya
 * guardadas.
 *
 * Cada lectura de `navitrack_ais_lecturas` trae en su JSON crudo el puerto del
 * que venía el buque (`lastPort`). Ese dato nunca se usó: el historial mostraba
 * los puertos que el buque **anuncia** y ninguno de los que ya tocó. Desde
 * ahora el chequeo diario los anota, pero eso sirve de hoy en adelante; lo que
 * ya pasó está únicamente acá.
 *
 * No gasta créditos: lee la base, no al proveedor.
 *
 * Va en TypeScript para poder importar `mismoPuerto` del propio ERP. Una copia
 * en JavaScript era lo natural y fue un error: la primera versión usaba su
 * propia regla de comparación y anotó "Buenaventura" y "Buenaventura anch"
 * como dos puertos distintos, que es exactamente el bug que esto viene a
 * arreglar en pantalla.
 *
 * Uso:
 *   npm run navitrack:recaladas            # simulacro, no escribe
 *   npm run navitrack:recaladas -- --aplicar
 */
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { enVentanaDeSeguimiento, mismoPuerto } from "../src/components/navitrack/navitrack-model";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });
dotenv.config({ path: join(__dirname, "..", ".env") });

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
const APLICAR = process.argv.includes("--aplicar");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Faltan PUBLIC_SUPABASE_URL y una clave de Supabase en .env.local o .env");
  process.exit(1);
}

async function rest(path: string, init: RequestInit = {}): Promise<any> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY as string,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  // Con `Prefer: return=minimal` el insert responde 201 sin cuerpo: pedirle
  // JSON revienta aunque la escritura haya salido bien.
  const texto = await r.text();
  return texto ? JSON.parse(texto) : null;
}

const claveNave = (v: unknown) =>
  String(v ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Z0-9]/g, "");

const iso = (v: unknown) => {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

type Op = {
  id: string;
  ref_asli: string;
  nave: string | null;
  pol: string | null;
  pod: string | null;
  etd: string | null;
  estado_operacion: string | null;
  arribo_confirmado: boolean | null;
};

const main = async () => {
  const ops: Op[] = await rest(
    "operaciones?select=id,ref_asli,nave,pol,pod,etd,estado_operacion,arribo_confirmado&deleted_at=is.null&nave=not.is.null&limit=2000",
  );
  const lecturas: { nave_nombre: string; crudo: Record<string, unknown>; consultado_at: string }[] =
    await rest(
      "navitrack_ais_lecturas?select=nave_nombre,crudo,consultado_at&tipo=eq.posicion&order=consultado_at.asc&limit=5000",
    );
  const anotadas: { operacion_id: string; puerto: string }[] = await rest(
    "navitrack_recaladas?select=operacion_id,puerto&limit=5000",
  );

  /*
   * Puertos vistos por nave, en el orden en que se leyeron.
   *
   * La fecha que se guarda es **cuándo se leyó**, no cuándo atracó: el AIS
   * informa de qué puerto viene, no a qué hora llegó. `atdUtc` no sirve para
   * fecharlo (ver la nota en `AisSnapshot`), así que no se copia.
   */
  const porNave = new Map<string, { puerto: string; visto_at: string | null }[]>();
  for (const l of lecturas) {
    const puerto = String(l.crudo?.lastPort ?? "").trim();
    const k = claveNave(l.nave_nombre);
    if (!puerto || !k) continue;
    const lista = porNave.get(k) ?? [];
    if (lista.some((x) => mismoPuerto(x.puerto, puerto))) continue;
    lista.push({ puerto, visto_at: iso(l.consultado_at) });
    porNave.set(k, lista);
  }

  const nuevas: Record<string, unknown>[] = [];
  const paraMostrar: string[] = [];

  for (const op of ops) {
    if (op.arribo_confirmado) continue;
    /*
     * Antes del zarpe, las lecturas son del viaje con que el buque viene a
     * buscar la carga. Copiar esos puertos como recorrido del embarque fue el
     * error de la primera corrida: anotó Buenaventura para un embarque que
     * zarpaba diez días después.
     */
    if (!enVentanaDeSeguimiento(op)) continue;
    const vistos = porNave.get(claveNave(op.nave));
    if (!vistos) continue;
    const suyas = anotadas.filter((r) => r.operacion_id === op.id).map((r) => r.puerto);

    for (const v of vistos) {
      // Los extremos del viaje ya tienen su propio hito en el historial.
      if (mismoPuerto(v.puerto, op.pol) || mismoPuerto(v.puerto, op.pod)) continue;
      if (suyas.some((p) => mismoPuerto(p, v.puerto))) continue;
      suyas.push(v.puerto);
      nuevas.push({
        operacion_id: op.id,
        puerto: v.puerto,
        nave: op.nave,
        estado: "recalada",
        recalado_at: v.visto_at,
      });
      paraMostrar.push(`  ${op.ref_asli.padEnd(8)} ${v.puerto}`);
    }
  }

  for (const linea of paraMostrar) console.log(linea);
  const embarques = new Set(nuevas.map((n) => n.operacion_id)).size;
  console.log(`\n${nuevas.length} recalada(s) para ${embarques} embarque(s).`);

  if (!APLICAR) {
    console.log("Simulacro: no se escribió nada. Repetir con --aplicar.");
    return;
  }
  if (!nuevas.length) return;

  await rest("navitrack_recaladas", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(nuevas),
  });
  console.log("Anotadas.");
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
