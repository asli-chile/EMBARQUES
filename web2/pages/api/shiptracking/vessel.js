const MYSHIP_BASE = 'https://api.myshiptracking.com/api/v2'

function jsonError(res, status, payload) {
  return res.status(status).json({ ok: false, ...payload })
}

function isValidMmsi(s) {
  if (!/^\d{1,9}$/.test(s)) return false
  const n = Number(s, 10)
  return n >= 1 && n <= 999999999
}

function isValidImo(s) {
  if (!/^\d{7}$/.test(s)) return false
  return true
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

  const mmsiRaw = typeof req.query.mmsi === 'string' ? req.query.mmsi.trim() : ''
  const imoRaw = typeof req.query.imo === 'string' ? req.query.imo.trim() : ''

  if ((mmsiRaw && imoRaw) || (!mmsiRaw && !imoRaw)) {
    return jsonError(res, 400, {
      code: 'VALIDATION',
      message: 'Indica MMSI o IMO (solo uno)',
    })
  }

  let query = ''
  if (mmsiRaw) {
    if (!isValidMmsi(mmsiRaw)) {
      return jsonError(res, 400, { code: 'VALIDATION', message: 'MMSI inválido' })
    }
    query = `mmsi=${encodeURIComponent(mmsiRaw)}`
  } else if (!isValidImo(imoRaw)) {
    return jsonError(res, 400, { code: 'VALIDATION', message: 'IMO inválido' })
  } else {
    query = `imo=${encodeURIComponent(imoRaw)}`
  }

  const responseType =
    typeof req.query.response === 'string' && req.query.response === 'extended'
      ? 'extended'
      : 'simple'

  const url = `${MYSHIP_BASE}/vessel?${query}&response=${responseType}`

  try {
    const upstream = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    const body = await upstream.json()

    if (body.status === 'error') {
      if (body.code === 'ERR_VESSEL_NOT_FOUND') {
        return jsonError(res, 404, {
          code: body.code,
          message: body.message || 'Buque no encontrado o fuera de cobertura',
        })
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

    if (!body.data || typeof body.data !== 'object') {
      return jsonError(res, 502, { code: 'BAD_RESPONSE', message: 'Respuesta inválida' })
    }

    return res.status(200).json({ ok: true, data: body.data })
  } catch {
    return jsonError(res, 502, { code: 'NETWORK', message: 'Error de conexión con el servicio AIS' })
  }
}
