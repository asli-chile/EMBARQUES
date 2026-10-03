import { track } from '@vercel/analytics'

/**
 * ID de Google Analytics 4 de la propiedad "asli.cl". No es secreto (queda
 * visible en el HTML). La variable NEXT_PUBLIC_GA_ID de Vercel, si existe,
 * tiene prioridad.
 */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-QNX2JF32VF'

/**
 * Registra un contacto: el clic que importa para saber qué página trae clientes.
 *
 * Va a Vercel Analytics y, si está configurado, a GA4. En Vercel los eventos
 * personalizados solo se ven en planes pagados; en el plan gratis cuentan las
 * visitas por página y los eventos quedan en GA4.
 *
 * @param {'whatsapp' | 'email' | 'phone' | 'form'} channel
 * @param {string} [source] dónde se hizo clic: slug de landing, 'home', 'contacto'…
 */
export function trackLead(channel, source = '') {
  const props = { channel, source: source || pathSource() }
  try {
    track('lead', props)
  } catch {
    /* ignore */
  }
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'generate_lead', props)
    }
  } catch {
    /* ignore */
  }
}

function pathSource() {
  if (typeof window === 'undefined') return ''
  return window.location.pathname.replace(/^\//, '') || 'home'
}
