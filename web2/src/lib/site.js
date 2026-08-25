/** Datos canónicos del sitio público ASLI (SEO / Open Graph / Schema). */
export const SITE_URL = 'https://asli.cl'

export const SITE = {
  name: 'ASLI',
  legalName: 'ASLI — Asesorías y Servicios Logísticos Integrales Ltda.',
  tagline: 'Asesorías y Servicios Logísticos Integrales',
  url: SITE_URL,
  locale: 'es_CL',
  language: 'es',
  phone: '+56968394225',
  phoneDisplay: '+56 9 6839 4225',
  email: 'informaciones@asli.cl',
  contactName: 'Mario Basaez',
  address: {
    street: 'Longitudinal Sur Km. 186',
    city: 'Curicó',
    region: 'Maule',
    postalCode: '3340000',
    country: 'CL',
  },
  geo: {
    latitude: -34.9743702,
    longitude: -71.2034765,
  },
  mapsUrl: 'https://maps.app.goo.gl/cGrni677vZDk5pp26',
  /** Imagen social (PNG preferible a WebP para WhatsApp / LinkedIn). */
  ogImage: `${SITE_URL}/img/oficina.png`,
  ogImageAlt: 'Oficinas de ASLI en Curicó, Maule — logística y comercio exterior',
  sameAs: [
    // Añadir LinkedIn / Instagram cuando existan URLs públicas oficiales
  ],
}

export function absoluteUrl(path = '/') {
  if (!path || path === '/') return SITE_URL
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalized}`
}
