import { jsonError, stackingEnv, storagePath } from '../../../src/lib/stacking'

async function supabaseReadText(url, key, bucket, path) {
  const downloadUrl = `${url}/storage/v1/object/${storagePath(bucket, path)}`
  const response = await fetch(downloadUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
  })
  if (!response.ok) return null
  return response.text()
}

async function createSignedUrl(url, key, bucket, path, expiresIn = 60 * 60) {
  const signUrl = `${url}/storage/v1/object/sign/${storagePath(bucket, path)}`
  const response = await fetch(signUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`No se pudo firmar URL: ${response.status} ${text}`)
  }

  const data = await response.json()
  const signed = data.signedURL || data.signedUrl || ''
  if (String(signed).startsWith('http')) return signed
  return `${url}/storage/v1${signed}`
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return jsonError(res, 405, 'Solo GET')
  }

  const { supabaseUrl, serviceRoleKey, bucket } = stackingEnv()
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(200).json({
      ok: false,
      code: 'NOT_CONFIGURED',
      message: 'Faltan PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (las mismas de Embarques).',
    })
  }

  try {
    const metadataText = await supabaseReadText(supabaseUrl, serviceRoleKey, bucket, 'pil/latest.json')
    if (!metadataText) {
      return res.status(200).json({
        ok: false,
        code: 'NOT_SYNCED',
        message: 'Aún no hay PDF de PIL. Ejecuta POST /api/stacking/sync para leer el último correo de Valentina.',
      })
    }

    const metadata = JSON.parse(metadataText)
    const pdfPath = metadata.latestPath || 'pil/latest.pdf'
    const pdfUrl = await createSignedUrl(supabaseUrl, serviceRoleKey, bucket, pdfPath, 60 * 60 * 6)

    return res.status(200).json({
      ok: true,
      data: {
        ...metadata,
        pdfUrl,
      },
    })
  } catch (error) {
    return jsonError(res, 500, 'Error al obtener el último stacking', {
      error: error instanceof Error ? error.message : 'Error desconocido',
    })
  }
}
