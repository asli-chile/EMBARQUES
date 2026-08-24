/**
 * Proxy del dólar observado para asli.cl.
 * Evita CORS y tolera caídas de mindicador.cl con un fallback.
 *
 * Respuesta normalizada: { valor, fecha, fuente }
 */
const MINDICADOR_URL = 'https://mindicador.cl/api/dolar'
const FALLBACK_URL = 'https://open.er-api.com/v6/latest/USD'
const CACHE_TTL_MS = 30 * 60 * 1000

let cache = { at: 0, payload: null }

function withTimeout(ms) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, clear: () => clearTimeout(timer) }
}

async function fetchJson(url, ms = 7000) {
  const t = withTimeout(ms)
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: t.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    t.clear()
  }
}

function fromMindicator(data) {
  if (data?.serie?.length > 0) {
    const latest = data.serie[0]
    return {
      valor: latest.valor,
      fecha: latest.fecha,
      fuente: 'mindicador',
      serie: data.serie.slice(0, 5),
    }
  }
  if (typeof data?.valor === 'number') {
    return { valor: data.valor, fecha: data.fecha ?? new Date().toISOString(), fuente: 'mindicador' }
  }
  return null
}

function fromOpenErApi(data) {
  const clp = data?.rates?.CLP
  if (typeof clp !== 'number' || !Number.isFinite(clp)) return null
  return {
    valor: Math.round(clp * 100) / 100,
    fecha: data.time_last_update_utc || new Date().toISOString(),
    fuente: 'exchangerate',
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const now = Date.now()
  if (cache.payload && now - cache.at < CACHE_TTL_MS) {
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600')
    res.setHeader('X-Cache', 'HIT')
    return res.status(200).json(cache.payload)
  }

  // 1) mindicador (dólar observado Chile)
  try {
    const data = await fetchJson(MINDICADOR_URL, 6000)
    const payload = fromMindicator(data)
    if (payload) {
      cache = { at: now, payload }
      res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600')
      res.setHeader('X-Cache', 'MISS')
      res.setHeader('X-Fuente', 'mindicador')
      return res.status(200).json(payload)
    }
  } catch {
    // continuar a fallback
  }

  // 2) fallback USD→CLP (mercado)
  try {
    const data = await fetchJson(FALLBACK_URL, 7000)
    const payload = fromOpenErApi(data)
    if (payload) {
      cache = { at: now, payload }
      res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600')
      res.setHeader('X-Cache', 'MISS')
      res.setHeader('X-Fuente', 'exchangerate')
      return res.status(200).json(payload)
    }
  } catch {
    // continuar a stale
  }

  if (cache.payload) {
    res.setHeader('X-Cache', 'STALE')
    return res.status(200).json(cache.payload)
  }

  return res.status(503).json({
    error: 'dolar_unavailable',
    message: 'No se pudo obtener el tipo de cambio',
  })
}
