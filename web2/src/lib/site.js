/** Datos canónicos del sitio público ASLI (SEO / Open Graph / Schema).
 * URL canónica = dominio primario en Vercel (`www.asli.cl`). El apex redirige allí.
 */
export const SITE_URL = 'https://www.asli.cl'

export const SITE = {
  name: 'ASLI',
  legalName: 'Asesorías y Servicios Logísticos Integrales Ltda.',
  /*
   * "ASLI" a secas choca con otras organizaciones (Asian Law Institute, All
   * Systems Logistics Inc.). Los nombres alternativos ayudan a buscadores e
   * IAs a separar la entidad. Usar exactamente el primero en LinkedIn,
   * Google Business y directorios.
   */
  alternateNames: ['ASLI Logística y Comercio Exterior', 'Asesorías y Servicios Logísticos Integrales'],
  tagline: 'Asesorías y Servicios Logísticos Integrales',
  slogan: 'Nuestro límite es tu destino',
  foundingDate: '2021',
  founder: { name: 'Mario Basaez', jobTitle: 'Fundador y Gerente General' },
  knowsAbout: [
    'Exportación de fruta fresca y congelada',
    'Contenedores reefer',
    'Transporte marítimo',
    'Carga aérea',
    'Importaciones a Chile',
    'Trámites aduaneros',
    'Certificación OEA',
  ],
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
  /*
   * Imagen social.
   *
   * JPEG y no WebP: los rastreadores de WhatsApp y LinkedIn son conservadores
   * y con WebP algunos no muestran vista previa.
   *
   * Recortada a 1200x630 de verdad. Antes se declaraba esa medida pero el
   * archivo era 1663x946, así que cada red recortaba por su cuenta y el
   * encuadre quedaba al azar.
   */
  ogImage: `${SITE_URL}/img/og-asli.jpg`,
  ogImageAlt: 'Oficinas de ASLI en Curicó, Maule — logística y comercio exterior',
  /** Dimensiones recomendadas para Open Graph (evita recortes en WhatsApp / LinkedIn). */
  ogImageWidth: 1200,
  ogImageHeight: 630,
  /*
   * Perfiles oficiales de la empresa (LinkedIn, Instagram, ficha de Google
   * Business, Wikidata). Es lo que más usan buscadores e IAs para confirmar
   * que el sitio y las redes son la misma empresa. Vacío = no se publica.
   */
  sameAs: [
    'https://www.linkedin.com/company/aslichile/',
    'https://www.instagram.com/asli_chile/',
    // Pendiente: ficha de Google Business cuando esté creada
  ],
  /**
   * Fecha de contenido editorial (YYYY-MM-DD).
   * Actualizar al publicar o editar landings / textos SEO de páginas públicas.
   * La usa el sitemap como lastmod estable (no “hoy” en cada request).
   */
  contentUpdatedAt: '2026-10-02',
}

/** Enlace de WhatsApp al número principal, con mensaje prellenado. */
export function whatsappUrl(text = '') {
  const number = SITE.phone.replace(/\D/g, '')
  return text ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : `https://wa.me/${number}`
}

/** Página de contacto; con `servicio` el formulario llega con el servicio indicado. */
export function contactUrl(servicio = '') {
  return servicio ? `/contacto?servicio=${encodeURIComponent(servicio)}` : '/contacto'
}

export function absoluteUrl(path = '/') {
  if (!path || path === '/') return SITE_URL
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalized}`
}
