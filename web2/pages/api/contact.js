const SCRIPT_URL = process.env.GMAIL_SCRIPT_URL

const TIPOS = { exportacion: 'Exportación', importacion: 'Importación', ambas: 'Ambas', otro: 'Otro' }
const CARGAS = {
  reefer: 'Contenedor reefer',
  dry: 'Contenedor seco (dry)',
  lcl: 'Carga consolidada (LCL)',
  aerea: 'Carga aérea',
  nose: 'Asesórame',
}
const UNIDADES = { contenedores: 'contenedores', m3: 'm³', kg: 'kg' }

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

  const body = req.body || {}
  const { nombre, empresa, email, telefono, producto, destino, mensaje, website } = body

  // Campo trampa del formulario de /contacto: solo un bot lo llena. Se responde
  // ok para que no reintente con otra estrategia.
  if (website) {
    return res.status(200).json({ ok: true })
  }

  // Producto y destino son lo mínimo para cotizar; mensaje queda como
  // alternativa para formularios que solo mandan texto libre.
  if (!nombre || !email || (!(producto && destino) && !mensaje)) {
    return res.status(400).json({ ok: false, error: 'Faltan campos requeridos' })
  }

  if (!SCRIPT_URL) {
    return res.status(500).json({ ok: false, error: 'Servidor de correo no configurado' })
  }

  const clip = (value, max = 200) => String(value ?? '').trim().slice(0, max)
  const tipo = TIPOS[body.tipo] || clip(body.tipo, 40)
  const carga = CARGAS[body.carga] || clip(body.carga, 40)
  const volumen = clip(body.volumen, 40)
  const unidad = UNIDADES[body.unidad] || ''
  const semana = clip(body.semana, 4)
  const anio = clip(body.anio, 4)

  // Filas del correo en el orden en que el equipo cotiza. Las vacías no se muestran.
  const cotizacion = [
    ['Operación', tipo],
    ['Producto', clip(producto)],
    ['Origen', clip(body.origen)],
    ['Destino', clip(destino)],
    ['Tipo de carga', carga],
    ['Volumen aprox.', volumen ? `${volumen} ${unidad}`.trim() : ''],
    ['Semana de embarque', semana ? `Semana ${semana}${anio ? ` de ${anio}` : ''}` : ''],
    ['Incoterm', clip(body.incoterm, 10) || 'Asesórame'],
    ['Tarifa objetivo', clip(body.tarifa, 80)],
  ]
  const contacto = [
    ['Nombre', clip(nombre, 120)],
    ['Empresa', clip(empresa, 120)],
    ['Email', clip(email, 160)],
    ['Teléfono', clip(telefono, 40)],
    ['Página', body.pagina ? `asli.cl/${clip(body.pagina, 80)}` : ''],
  ]

  const rows = (items) =>
    items
      .filter(([, value]) => value)
      .map(
        ([label, value]) =>
          `<tr><td style="padding:6px 12px 6px 0;color:#666;width:150px;vertical-align:top"><strong>${label}</strong></td><td style="padding:6px 0">${
            label === 'Email' ? `<a href="mailto:${escapeHtml(value)}">${escapeHtml(value)}</a>` : escapeHtml(value)
          }</td></tr>`
      )
      .join('')

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:600px;color:#222">
      <h2 style="color:#1a3c6e;border-bottom:2px solid #1a3c6e;padding-bottom:8px">
        Nueva solicitud de cotización desde asli.cl
      </h2>
      <h3 style="color:#1a3c6e;margin:18px 0 4px">Carga</h3>
      <table style="width:100%;border-collapse:collapse">${rows(cotizacion)}</table>
      <h3 style="color:#1a3c6e;margin:18px 0 4px">Contacto</h3>
      <table style="width:100%;border-collapse:collapse">${rows(contacto)}</table>
      ${
        mensaje
          ? `<div style="margin-top:20px">
        <p style="color:#666;margin-bottom:6px"><strong>Comentarios:</strong></p>
        <div style="background:#f4f7fb;border-left:4px solid #1a3c6e;padding:14px 16px;border-radius:4px;white-space:pre-wrap">${escapeHtml(clip(mensaje, 4000))}</div>
      </div>`
          : ''
      }
      <p style="margin-top:24px;font-size:12px;color:#999">Enviado desde el formulario de cotización de asli.cl</p>
    </div>
  `

  const resumen = [clip(producto, 60), clip(destino, 60)].filter(Boolean).join(' → ')
  const subject = `Cotización web${resumen ? ` — ${resumen}` : ''} — ${clip(nombre, 80)}${empresa ? ` (${clip(empresa, 80)})` : ''}`

  try {
    const scriptRes = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        to: 'informaciones@asli.cl',
        subject,
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
