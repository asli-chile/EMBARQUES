/**
 * Saldo real de créditos del proveedor AIS.
 *
 * Antes el panel mostraba `plan contratado − filas registradas`, y ese número
 * miente: solo ve las consultas que pasaron por los endpoints. Cualquier
 * llamada hecha por fuera —un script, una prueba— lo deja por encima del real,
 * que es la dirección peligrosa. Con 150 configurado y 2 filas registradas
 * mostraba 148 cuando el saldo verdadero era 216.
 *
 * `my-credits` lo responde el proveedor y **no cuesta nada**: comprobado
 * llamándolo dos veces seguidas sin que el saldo se moviera.
 *
 * Se cachea en memoria unos minutos porque el proveedor limita a 50 llamadas
 * por minuto y el panel se abre y cierra a menudo. El saldo no cambia solo:
 * únicamente cuando este sistema gasta, y esos momentos invalidan el caché.
 */

const URL_SALDO = "https://datadocked.com/api/vessels_operations/my-credits";
const CACHE_MS = 3 * 60_000;

export type Saldo = {
  /** Créditos disponibles según el proveedor. Null si no se pudo consultar. */
  creditos: number | null;
  /** Cuándo se leyó ese número. */
  at: string | null;
  /** El valor viene del caché en memoria, no de una llamada nueva. */
  cacheado: boolean;
};

let cache: { creditos: number; at: number } | null = null;

/** Descarta el caché: se llama después de gastar, para no mostrar el saldo viejo. */
export function invalidarSaldo(): void {
  cache = null;
}

export async function consultarSaldo(apiKey: string | undefined): Promise<Saldo> {
  if (!apiKey) return { creditos: null, at: null, cacheado: false };

  if (cache && Date.now() - cache.at < CACHE_MS) {
    return { creditos: cache.creditos, at: new Date(cache.at).toISOString(), cacheado: true };
  }

  try {
    const r = await fetch(URL_SALDO, {
      headers: { "x-api-key": apiKey, accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return { creditos: null, at: null, cacheado: false };

    const body = (await r.json()) as { detail?: { credits?: unknown }; credits?: unknown };
    const bruto = body?.detail?.credits ?? body?.credits;
    const n = typeof bruto === "number" ? bruto : Number(bruto);
    if (!Number.isFinite(n)) return { creditos: null, at: null, cacheado: false };

    cache = { creditos: n, at: Date.now() };
    return { creditos: n, at: new Date(cache.at).toISOString(), cacheado: false };
  } catch {
    // Sin saldo conocido la pantalla lo dice; nunca inventa un número.
    return { creditos: null, at: null, cacheado: false };
  }
}
