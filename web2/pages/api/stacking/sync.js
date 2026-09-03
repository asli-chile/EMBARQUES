import { jsonError, stackingEnv } from '../../../src/lib/stacking'

function firstHeader(req, name) {
  const value = req.headers[name]
  return Array.isArray(value) ? value[0] : value
}

export default async function handler(req, res) {
  const isGet = req.method === 'GET'
  const isPost = req.method === 'POST'
  if (!isGet && !isPost) {
    return jsonError(res, 405, 'Solo GET o POST')
  }

  const { supabaseUrl, serviceRoleKey, syncToken } = stackingEnv()
  const providedToken = String(firstHeader(req, 'x-stacking-token') || req.query?.token || '')
  const isVercelCron = String(firstHeader(req, 'x-vercel-cron') || '') === '1'
  const cronSecret = String(process.env.CRON_SECRET || '').trim()
  const authHeader = String(firstHeader(req, 'authorization') || '')
  const isCronSecret =
    Boolean(cronSecret) &&
    (authHeader === `Bearer ${cronSecret}` || providedToken === cronSecret)

  if (isGet && !isVercelCron && !isCronSecret && providedToken !== syncToken) {
    return jsonError(res, 405, 'Usa POST /api/stacking/sync')
  }

  if (syncToken && providedToken !== syncToken && !isVercelCron && !isCronSecret) {
    return jsonError(res, 401, 'Token inválido para sincronización')
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonError(res, 503, 'Faltan PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (las mismas de Embarques)')
  }

  let payload = {
    from: 'valentina.parra@chl.pilship.com',
    subjectIncludes: 'STACKING',
    recipient: 'rodrigo.caceres@asli.cl',
  }

  if (isPost) {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
      payload = {
        from: body.from || payload.from,
        subjectIncludes: body.subjectIncludes || payload.subjectIncludes,
        recipient: body.recipient || payload.recipient,
      }
    } catch {
      return jsonError(res, 400, 'Body JSON inválido')
    }
  }

  try {
    const headers = {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      'Content-Type': 'application/json',
    }
    if (syncToken) headers['x-stacking-token'] = syncToken

    const fnRes = await fetch(`${supabaseUrl}/functions/v1/stacking-pil-sync`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
    const text = await fnRes.text()
    let data = {}
    try {
      data = JSON.parse(text)
    } catch {
      return jsonError(res, 502, 'La Edge Function no devolvió JSON', { raw: text.slice(0, 400) })
    }

    if (!fnRes.ok || data.ok === false) {
      return jsonError(res, fnRes.status >= 400 ? fnRes.status : 502, data.error || 'Error al sincronizar stacking PIL', data)
    }

    return res.status(200).json(data)
  } catch (error) {
    return jsonError(res, 500, 'Error interno al sincronizar stacking', {
      error: error instanceof Error ? error.message : 'Error desconocido',
    })
  }
}
