const SCRIPT_URL = process.env.GMAIL_SCRIPT_URL

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

  const tipoLabel = { exportacion: 'Exportación', importacion: 'Importación', ambas: 'Ambas' }[tipo] || tipo || '-'

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:600px;color:#222">
      <h2 style="color:#1a3c6e;border-bottom:2px solid #1a3c6e;padding-bottom:8px">
        Nueva solicitud desde asli.cl
      </h2>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <tr><td style="padding:8px 0;color:#666;width:120px"><strong>Nombre</strong></td><td style="padding:8px 0">${nombre}</td></tr>
        <tr><td style="padding:8px 0;color:#666"><strong>Empresa</strong></td><td style="padding:8px 0">${empresa || '-'}</td></tr>
        <tr><td style="padding:8px 0;color:#666"><strong>Email</strong></td><td style="padding:8px 0"><a href="mailto:${email}">${email}</a></td></tr>
        <tr><td style="padding:8px 0;color:#666"><strong>Teléfono</strong></td><td style="padding:8px 0">${telefono || '-'}</td></tr>
        <tr><td style="padding:8px 0;color:#666"><strong>Tipo</strong></td><td style="padding:8px 0">${tipoLabel}</td></tr>
      </table>
      <div style="margin-top:20px">
        <p style="color:#666;margin-bottom:6px"><strong>Mensaje:</strong></p>
        <div style="background:#f4f7fb;border-left:4px solid #1a3c6e;padding:14px 16px;border-radius:4px;white-space:pre-wrap">${mensaje}</div>
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
        subject: `Solicitud web — ${nombre}${empresa ? ` (${empresa})` : ''}`,
        htmlBody,
        sendNow: true,
      }),
      redirect: 'follow',
    })

    const rawText = await scriptRes.text()
    console.log('[contact] script status:', scriptRes.status, '| body:', rawText)

    let data
    try { data = JSON.parse(rawText) } catch { data = {} }

    if (!scriptRes.ok || data.success === false) {
      console.error('[contact] script error:', data.error ?? rawText)
      return res.status(500).json({ ok: false, error: 'Error al enviar el correo' })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[contact] error:', err)
    return res.status(500).json({ ok: false, error: 'Error de red' })
  }
}
