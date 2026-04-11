const MYSHIP_BASE = 'https://api.myshiptracking.com/api/v2'

function jsonError(res, status, payload) {
  return res.status(status).json({ ok: false, ...payload })
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return jsonError(res, 405, { code: 'METHOD_NOT_ALLOWED', message: 'Solo GET' })
  }

  const apiKey = process.env.MYSHIPTRACKING_API_KEY
  if (!apiKey) {
    return jsonError(res, 503, {
      code: 'NO_CONFIG',
      message: 'Seguimiento AIS no configurado',
    })
  }

  const raw = typeof req.query.name === 'string' ? req.query.name.trim() : ''
  if (raw.length < 3) {
    return jsonError(res, 400, {
      code: 'VALIDATION',
      message: 'El nombre debe tener al menos 3 caracteres',
    })
  }
  if (raw.length > 120) {
    return jsonError(res, 400, {
      code: 'VALIDATION',
      message: 'El nombre es demasiado largo',
    })
  }

  const url = `${MYSHIP_BASE}/vessel/search?name=${encodeURIComponent(raw)}`

  try {
    const upstream = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    const body = await upstream.json()

    if (body.status === 'error') {
      if (body.code === 'ERR_VESSEL_NOT_FOUND') {
        return res.status(200).json({ ok: true, data: [] })
      }
      const status =
        body.code === 'ERR_RATE_LIMIT'
          ? 429
          : body.code === 'ERR_NO_CREDITS'
            ? 402
            : upstream.status >= 400
              ? upstream.status
              : 502
      return jsonError(res, status, {
        code: body.code || 'UPSTREAM_ERROR',
        message: body.message || 'Error del proveedor AIS',
      })
    }

    if (!Array.isArray(body.data)) {
      return jsonError(res, 502, { code: 'BAD_RESPONSE', message: 'Respuesta inválida' })
    }

    return res.status(200).json({ ok: true, data: body.data })
  } catch {
    return jsonError(res, 502, { code: 'NETWORK', message: 'Error de conexión con el servicio AIS' })
  }
}
