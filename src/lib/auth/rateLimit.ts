/**
 * Rate limit en memoria (ventana deslizante).
 *
 * Sirve para frenar fuerza bruta / spam en login y signup.
 * En Vercel cada instancia cálida tiene su propio mapa: no es un límite
 * global perfecto, pero reduce abuso real sin dependencias extra.
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

type Bucket = {
  hits: number[];
};

const store = new Map<string, Bucket>();

const MAX_KEYS = 5_000;

function pruneIfNeeded() {
  if (store.size <= MAX_KEYS) return;
  const overflow = store.size - MAX_KEYS;
  let removed = 0;
  for (const key of store.keys()) {
    store.delete(key);
    removed++;
    if (removed >= overflow) break;
  }
}

/**
 * @param key Identificador (ej. `login:ip:email`)
 * @param limit Máximo de intentos en la ventana
 * @param windowMs Duración de la ventana en ms
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  let bucket = store.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    store.set(key, bucket);
    pruneIfNeeded();
  }

  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  bucket.hits.push(now);
  return {
    allowed: true,
    remaining: Math.max(0, limit - bucket.hits.length),
    retryAfterSec: 0,
  };
}

/** Limpia el contador (p. ej. tras login exitoso). */
export function clearRateLimit(key: string): void {
  store.delete(key);
}

export function clientIp(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

export function rateLimitResponse(retryAfterSec: number, message: string): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    },
  );
}

/** Login: 10 intentos / 15 min por IP+correo */
export const LOGIN_RATE = { limit: 10, windowMs: 15 * 60 * 1000 } as const;

/** Signup: 5 solicitudes / hora por IP, y 3 / hora por correo */
export const SIGNUP_IP_RATE = { limit: 5, windowMs: 60 * 60 * 1000 } as const;
export const SIGNUP_EMAIL_RATE = { limit: 3, windowMs: 60 * 60 * 1000 } as const;
