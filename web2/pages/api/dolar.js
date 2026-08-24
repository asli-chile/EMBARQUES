/**
 * Proxy server-side a mindicador.cl para evitar CORS en el navegador.
 * GET /api/dolar
 */
const MINDICADOR_URL = 'https://mindicador.cl/api/dolar'
const CACHE_TTL_MS = 30 * 60 * 1000

let cache = { at: 0, payload: null }

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

  try {
    const upstream = await fetch(MINDICADOR_URL, {
      headers: { Accept: 'application/json' },
      // mindicador a veces falla; timeout razonable vía AbortSignal
      signal: AbortSignal.timeout(8000),
    })

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: 'mindicador_upstream_error',
        status: upstream.status,
      })
    }

    const data = await upstream.json()
    cache = { at: now, payload: data }
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600')
    res.setHeader('X-Cache', 'MISS')
    return res.status(200).json(data)
  } catch (err) {
    if (cache.payload) {
      res.setHeader('X-Cache', 'STALE')
      return res.status(200).json(cache.payload)
    }
    return res.status(502).json({
      error: 'mindicador_fetch_failed',
      message: err instanceof Error ? err.message : 'unknown',
    })
  }
}
