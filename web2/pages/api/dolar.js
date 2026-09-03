/**
 * Dólar observado desde la Base de Datos Estadísticos (BDE) del Banco Central de Chile.
 * Única fuente admitida. Si la BDE no responde, el endpoint falla en vez de
 * sustituir el valor por un tipo de cambio de mercado.
 *
 * Serie: F073.TCO.PRE.Z.D — "Tipo de cambio nominal (dólar observado $CLP/USD)".
 * Requiere BCCH_API_TOKEN (se obtiene gratis en https://si3.bcentral.cl/siete/ES/Siete/API).
 *
 * Respuesta normalizada: { valor, fecha, fuente: 'bcentral' }
 */
const BCCH_ENDPOINT = 'https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx'
const SERIE_DOLAR_OBSERVADO = 'F073.TCO.PRE.Z.D'
const CACHE_TTL_MS = 30 * 60 * 1000

// La BDE publica un valor por día hábil. La ventana cubre feriados largos.
const DIAS_VENTANA = 10

let cache = { at: 0, payload: null }

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

/** La BDE devuelve las fechas como DD-MM-YYYY. */
function parseFechaBde(indexDateString) {
  const [dia, mes, anio] = String(indexDateString).split('-')
  if (!dia || !mes || !anio) return null
  return `${anio}-${mes}-${dia}`
}

function buildUrl(token) {
  const hasta = new Date()
  const desde = new Date(hasta)
  desde.setDate(desde.getDate() - DIAS_VENTANA)

  const params = new URLSearchParams({
    token,
    function: 'GetSeries',
    timeseries: SERIE_DOLAR_OBSERVADO,
    firstdate: isoDate(desde),
    lastdate: isoDate(hasta),
  })
  return `${BCCH_ENDPOINT}?${params}`
}

async function fetchJson(url, ms) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Toma la última observación publicada. Los días sin publicación llegan como
 * value "NaN" con statusCode distinto de "OK" y deben descartarse.
 */
function fromBancoCentral(data) {
  if (data?.Codigo !== 0 && data?.Codigo !== undefined) {
    throw new Error(data?.Descripcion || `BDE Codigo ${data.Codigo}`)
  }

  const obs = data?.Series?.Obs
  if (!Array.isArray(obs)) return null

  for (let i = obs.length - 1; i >= 0; i -= 1) {
    const item = obs[i]
    if (item?.statusCode !== 'OK') continue
    const valor = Number(item.value)
    if (!Number.isFinite(valor)) continue

    const fecha = parseFechaBde(item.indexDateString)
    if (!fecha) continue

    return {
      valor: Math.round(valor * 100) / 100,
      fecha,
      fuente: 'bcentral',
    }
  }

  return null
}

function readBcchToken() {
  const fromEnv = String(process.env.BCCH_API_TOKEN || '').trim()
  if (fromEnv) return fromEnv

  // Next.js interpola `$` en .env.local. Si el token del Banco Central
  // lo contiene, process.env llega vacío; leemos la línea cruda en local.
  try {
    const fs = require('fs')
    const path = require('path')
    const file = path.join(process.cwd(), '.env.local')
    if (!fs.existsSync(file)) return ''
    const line = fs
      .readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .find((row) => /^\s*BCCH_API_TOKEN=/.test(row) && !row.trim().startsWith('#'))
    if (!line) return ''
    let value = line.replace(/^\s*BCCH_API_TOKEN=/, '').trim()
    const quote = value[0]
    if ((quote === "'" || quote === '"') && value.endsWith(quote) && value.length >= 2) {
      value = value.slice(1, -1)
    }
    return value.trim()
  } catch {
    return ''
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = readBcchToken()
  if (!token) {
    return res.status(200).json({
      error: 'bcch_token_missing',
      message: 'Falta BCCH_API_TOKEN para consultar la API del Banco Central',
    })
  }

  const now = Date.now()
  if (cache.payload && now - cache.at < CACHE_TTL_MS) {
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600')
    res.setHeader('X-Cache', 'HIT')
    res.setHeader('X-Fuente', 'bcentral')
    return res.status(200).json(cache.payload)
  }

  try {
    const data = await fetchJson(buildUrl(token), 8000)
    const payload = fromBancoCentral(data)
    if (payload) {
      cache = { at: now, payload }
      res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600')
      res.setHeader('X-Cache', 'MISS')
      res.setHeader('X-Fuente', 'bcentral')
      return res.status(200).json(payload)
    }
  } catch {
    // Cae al valor cacheado, que también proviene de la BDE.
  }

  if (cache.payload) {
    res.setHeader('X-Cache', 'STALE')
    res.setHeader('X-Fuente', 'bcentral')
    return res.status(200).json(cache.payload)
  }

  return res.status(200).json({
    error: 'dolar_unavailable',
    message: 'La API del Banco Central no devolvió el dólar observado',
  })
}
