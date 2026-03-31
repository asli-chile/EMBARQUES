import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const { nombre, empresa, email, telefono, tipo, mensaje } = req.body

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({ ok: false, error: 'Faltan campos requeridos' })
  }

  const tipoLabel = { exportacion: 'Exportación', importacion: 'Importación', ambas: 'Ambas' }[tipo] || tipo || '-'

  try {
    await resend.emails.send({
      from: 'Web ASLI <noreply@asli.cl>',
      to: 'informaciones@asli.cl',
      replyTo: email,
      subject: `Solicitud web — ${nombre}${empresa ? ` (${empresa})` : ''}`,
      text: [
        `Nombre:   ${nombre}`,
        `Empresa:  ${empresa || '-'}`,
        `Email:    ${email}`,
        `Teléfono: ${telefono || '-'}`,
        `Tipo:     ${tipoLabel}`,
        '',
        'Mensaje:',
        mensaje,
      ].join('\n'),
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[contact] error:', err)
    return res.status(500).json({ ok: false, error: 'Error al enviar el correo' })
  }
}
