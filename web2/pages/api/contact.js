const SCRIPT_URL = process.env.GMAIL_SCRIPT_URL

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const { nombre, empresa, email, telefono, tipo, mensaje } = req.body

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({ ok: false, error: 'Faltan campos requeridos' })
  }

  if (!SCRIPT_URL) {
    return res.status(500).json({ ok: false, error: 'Servidor de correo no configurado' })
  }

  const tipoRaw = { exportacion: 'Exportación', importacion: 'Importación', ambas: 'Ambas' }[tipo] || tipo || '-'
  const safe = {
    nombre: escapeHtml(nombre),
    empresa: escapeHtml(empresa || '-'),
    email: escapeHtml(email),
    telefono: escapeHtml(telefono || '-'),
    tipo: escapeHtml(tipoRaw),
    mensaje: escapeHtml(mensaje),
  }

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:600px;color:#222">
      <h2 style="color:#1a3c6e;border-bottom:2px solid #1a3c6e;padding-bottom:8px">
        Nueva solicitud desde asli.cl
      </h2>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <tr><td style="padding:8px 0;color:#666;width:120px"><strong>Nombre</strong></td><td style="padding:8px 0">${safe.nombre}</td></tr>
        <tr><td style="padding:8px 0;color:#666"><strong>Empresa</strong></td><td style="padding:8px 0">${safe.empresa}</td></tr>
        <tr><td style="padding:8px 0;color:#666"><strong>Email</strong></td><td style="padding:8px 0"><a href="mailto:${safe.email}">${safe.email}</a></td></tr>
        <tr><td style="padding:8px 0;color:#666"><strong>Teléfono</strong></td><td style="padding:8px 0">${safe.telefono}</td></tr>
        <tr><td style="padding:8px 0;color:#666"><strong>Tipo</strong></td><td style="padding:8px 0">${safe.tipo}</td></tr>
      </table>
      <div style="margin-top:20px">
        <p style="color:#666;margin-bottom:6px"><strong>Mensaje:</strong></p>
        <div style="background:#f4f7fb;border-left:4px solid #1a3c6e;padding:14px 16px;border-radius:4px;white-space:pre-wrap">${safe.mensaje}</div>
      </div>
      <p style="margin-top:24px;font-size:12px;color:#999">Enviado desde el formulario de contacto de asli.cl</p>
    </div>
  `

  try {
    const scriptRes = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        to: 'informaciones@asli.cl',
        subject: `Solicitud web — ${String(nombre).slice(0, 120)}${empresa ? ` (${String(empresa).slice(0, 120)})` : ''}`,
        htmlBody,
        sendNow: true,
      }),
      redirect: 'follow',
    })

    const rawText = await scriptRes.text()
    if (process.env.NODE_ENV === 'development') {
      console.log('[contact] script status:', scriptRes.status, '| body:', rawText)
    }

    let data
    try {
      data = JSON.parse(rawText)
    } catch {
      data = {}
    }

    if (!scriptRes.ok || data.success === false) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[contact] script error:', data.error ?? rawText)
      }
      return res.status(500).json({ ok: false, error: 'Error al enviar el correo' })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[contact] error:', err)
    }
    return res.status(500).json({ ok: false, error: 'Error de red' })
  }
}
