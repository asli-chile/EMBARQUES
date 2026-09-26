#!/usr/bin/env node
/**
 * Corrige las recaladas cuya llegada quedó registrada después del zarpe.
 *
 * `registrarRecalada` fechaba la llegada con "cuándo el chequeo diario se
 * enteró", no con la llegada real: si el seguimiento de un embarque empezó
 * después de que el buque ya había zarpado de ese puerto, la llegada quedaba
 * después del zarpe. El MSC BRUNELLA zarpó de Colón el 13-sept a las 04:07 y
 * el sistema anotó su llegada el 17, porque recién ese día empezó a mirar ese
 * embarque. Se corrigió en `recaladas.ts`; este script repara lo que ya quedó
 * mal guardado, con la misma regla: busca en el historial ya pagado la
 * primera lectura que vio al buque detenido en ese puerto, antes del zarpe.
 *
 * No gasta créditos: lee la base, no al proveedor.
 *
 * Uso:
 *   npm run navitrack:llegadas            # simulacro, no escribe
 *   npm run navitrack:llegadas -- --aplicar
 */
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { mismoPuerto } from "../src/components/navitrack/navitrack-model";
import { claveAis } from "../src/lib/navitrack/ventana";

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
  const texto = await r.text();
  return texto ? JSON.parse(texto) : null;
}

const estaDetenido = (navStatus: string | null | undefined) =>
  /moor|anchor|berth/i.test(String(navStatus ?? ""));

type Lectura = {
  nave_nombre: string | null;
  destino: string | null;
  nav_status: string | null;
  posicion_recibida_at: string | null;
  consultado_at: string;
};

/** La primera lectura, entre las ya pagadas, que vio al buque detenido en ese puerto. */
function buscarLlegada(
  lecturas: Lectura[],
  nave: string | null,
  puerto: string,
  antesDe: string | null,
): string | null {
  const clave = claveAis(nave);
  if (!clave) return null;
  const tope = antesDe ? new Date(antesDe).getTime() : null;
  for (const l of lecturas) {
    if (claveAis(l.nave_nombre) !== clave) continue;
    if (!mismoPuerto(l.destino, puerto)) continue;
    if (!estaDetenido(l.nav_status)) continue;
    const cuando = l.posicion_recibida_at ?? l.consultado_at;
    if (tope != null && new Date(cuando).getTime() >= tope) continue;
    return cuando; // Ya vienen ordenadas ascendente: la primera que calza es la buena.
  }
  return null;
}

type Recalada = {
  id: number;
  operacion_id: string;
  puerto: string;
  nave: string | null;
  recalado_at: string | null;
  zarpe_at: string | null;
};

const main = async () => {
  const recaladas: Recalada[] = await rest(
    "navitrack_recaladas?select=id,operacion_id,puerto,nave,recalado_at,zarpe_at&recalado_at=not.is.null&zarpe_at=not.is.null&limit=5000",
  );
  const rotas = recaladas.filter((r) => r.zarpe_at! < r.recalado_at!);
  if (!rotas.length) {
    console.log("Ninguna llegada quedó después de su zarpe.");
    return;
  }

  const lecturas: Lectura[] = await rest(
    "navitrack_ais_lecturas?select=nave_nombre,destino,nav_status,posicion_recibida_at,consultado_at&tipo=eq.posicion&order=consultado_at.asc&limit=5000",
  );

  const ops: { id: string; ref_asli: string }[] = await rest(
    "operaciones?select=id,ref_asli&limit=5000",
  );
  const refDe = new Map(ops.map((o) => [o.id, o.ref_asli]));

  const cambios: { id: number; nuevaLlegada: string; origen: "historial" | "zarpe" }[] = [];
  for (const r of rotas) {
    const historica = buscarLlegada(lecturas, r.nave, r.puerto, r.zarpe_at);
    const nuevaLlegada = historica ?? r.zarpe_at!;
    cambios.push({ id: r.id, nuevaLlegada, origen: historica ? "historial" : "zarpe" });
    console.log(
      `  ${(refDe.get(r.operacion_id) ?? r.operacion_id).padEnd(8)} ${r.puerto.padEnd(28)} ` +
        `${r.recalado_at} -> ${nuevaLlegada} (${historica ? "lectura anterior" : "sin evidencia: se usa el zarpe"})`,
    );
  }

  console.log(`\n${cambios.length} recalada(s) por corregir.`);
  if (!APLICAR) {
    console.log("Simulacro: no se escribió nada. Repetir con --aplicar.");
    return;
  }

  for (const c of cambios) {
    await rest(`navitrack_recaladas?id=eq.${c.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ recalado_at: c.nuevaLlegada }),
    });
  }
  console.log("Corregidas.");
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
