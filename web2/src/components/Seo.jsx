import Head from 'next/head'
import { SITE, absoluteUrl } from '../lib/site'
import { useLocale } from '../hooks/useLocale'
import { htmlLang, ogLocale } from '../lib/i18n/locale'

/**
 * Meta SEO + Open Graph + Twitter + opcional JSON-LD.
 * Usar una sola instancia por página.
 *
 * NO lleva hreflang, y es deliberado.
 *
 * El idioma acá se resuelve en el navegador: `?lang=` solo fija la preferencia
 * en localStorage (ver src/lib/i18n/locale.js) y React vuelve a renderizar con
 * el diccionario. El servidor devuelve **el mismo HTML en español** para
 * cualquier valor de `?lang`, y quien ya eligió chino ve chino en la URL limpia,
 * sin parámetro. Es decir: no hay una URL por idioma, hay una URL y tres
 * lecturas de ella.
 *
 * Hubo un bloque de `rel="alternate"` apuntando a `?lang=zh` / `?lang=en`.
 * Se quitó porque se contradecía con el canonical de esas mismas URLs, que
 * apunta a la versión sin parámetro: un alternate de hreflang tiene que ser
 * auto-canónico. Google descartaba el grupo entero —no publicaba nada en
 * chino— y de paso archivaba `?lang=zh` como duplicado de la página española.
 * Lo único que enlazaba esas URLs era este bloque.
 *
 * Si algún día se quiere posicionar de verdad en chino, el camino no es volver
 * a poner hreflang: es servir el idioma desde el servidor con URLs propias
 * (/zh/...), y recién ahí las anotaciones significan algo.
 */
export default function Seo({
  title,
  description,
  path = '/',
  image,
  imageAlt,
  type = 'website',
  noindex = false,
  jsonLd = null,
  // Para páginas que existen en un solo idioma (las guías, solo en español):
  // fija el idioma declarado aunque el visitante tenga elegido otro.
  contentLang = null,
}) {
  const { locale: uiLocale } = useLocale()
  const locale = contentLang || uiLocale
  const fullTitle = title.includes('ASLI') ? title : `${title} — ASLI`
  const canonical = absoluteUrl(path)
  const ogImage = image || SITE.ogImage
  // El tipo tiene que coincidir con el archivo: si no, algunas redes descartan
  // la vista previa sin decir por qué.
  const ogImageType = ogImage.endsWith('.jpg') || ogImage.endsWith('.jpeg')
    ? 'image/jpeg'
    : ogImage.endsWith('.webp')
      ? 'image/webp'
      : 'image/png'
  const ogAlt = imageAlt || SITE.ogImageAlt
  const robots = noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'
  const localeTag = ogLocale(locale)
  const langAttr = htmlLang(locale)

  const graph = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : null
  const payload = graph
    ? graph.length === 1 && graph[0]['@context']
      ? graph[0]
      : { '@context': 'https://schema.org', '@graph': graph }
    : null

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <meta name="googlebot" content={robots} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      <meta httpEquiv="content-language" content={langAttr} />
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content={type} />
      <meta property="og:locale" content={localeTag} />
      <meta property="og:locale:alternate" content="es_CL" />
      <meta property="og:locale:alternate" content="zh_CN" />
      <meta property="og:locale:alternate" content="en_US" />
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={ogAlt} />
      <meta property="og:image:type" content={ogImageType} />
      <meta property="og:image:width" content={String(SITE.ogImageWidth)} />
      <meta property="og:image:height" content={String(SITE.ogImageHeight)} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={ogAlt} />

      {payload ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
        />
      ) : null}
    </Head>
  )
}

const ORG_ID = `${SITE.url}/#organization`
const WEBSITE_ID = `${SITE.url}/#website`

/*
 * Una sola entidad para la empresa. Antes había un Organization y un
 * LocalBusiness unidos por parentOrganization, que Google lee como matriz y
 * sucursal: dos empresas. ProfessionalService es subtipo de LocalBusiness, así
 * que conserva la ficha local (dirección, horario, mapa).
 *
 * areaServed: ASLI opera hacia y desde cualquier parte del mundo. Antes decía
 * solo "Región del Maule, Chile", que restaba alcance.
 */
const AREA_SERVED = [
  { '@type': 'Country', name: 'Chile' },
  { '@type': 'Place', name: 'Cualquier parte del mundo' },
]

function postalAddress() {
  const { address } = SITE
  return {
    '@type': 'PostalAddress',
    streetAddress: address.street,
    addressLocality: address.city,
    addressRegion: address.region,
    postalCode: address.postalCode,
    addressCountry: address.country,
  }
}

/** Referencia corta a la empresa para usar dentro de otros nodos. */
function orgRef() {
  return { '@type': 'ProfessionalService', '@id': ORG_ID, name: SITE.name, url: SITE.url }
}

function breadcrumbNode(url, items) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

function webPageNode({ type = 'WebPage', url, name, description, inLanguage, extra = {} }) {
  return {
    '@type': type,
    '@id': `${url}#webpage`,
    url,
    name,
    description,
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': ORG_ID },
    breadcrumb: { '@id': `${url}#breadcrumb` },
    inLanguage,
    dateModified: SITE.contentUpdatedAt,
    ...extra,
  }
}

/** Schema de la empresa + WebSite para la home. */
export function buildHomeJsonLd({ inLanguage = SITE.language, description, websiteDescription } = {}) {
  const { geo } = SITE
  const organization = {
    '@type': 'ProfessionalService',
    '@id': ORG_ID,
    name: SITE.name,
    alternateName: SITE.alternateNames,
    legalName: SITE.legalName,
    slogan: SITE.slogan,
    description:
      description ||
      'Empresa chilena de logística y comercio exterior fundada en 2021 en Curicó, Región del Maule. Coordina exportaciones e importaciones marítimas, aéreas y terrestres, con especialidad en fruta fresca y congelada, hacia y desde cualquier parte del mundo.',
    url: SITE.url,
    logo: `${SITE.url}/img/logoasli.webp`,
    image: SITE.ogImage,
    telephone: SITE.phone,
    email: SITE.email,
    foundingDate: SITE.foundingDate,
    founder: { '@type': 'Person', name: SITE.founder.name, jobTitle: SITE.founder.jobTitle },
    address: postalAddress(),
    geo: {
      '@type': 'GeoCoordinates',
      latitude: geo.latitude,
      longitude: geo.longitude,
    },
    hasMap: SITE.mapsUrl,
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '18:00',
      },
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: SITE.phone,
      email: SITE.email,
    },
    knowsAbout: SITE.knowsAbout,
    areaServed: AREA_SERVED,
    ...(SITE.sameAs.length ? { sameAs: SITE.sameAs } : {}),
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        url: SITE.url,
        name: SITE.name,
        alternateName: SITE.alternateNames[0],
        description: websiteDescription || SITE.tagline,
        publisher: { '@id': ORG_ID },
        inLanguage,
      },
    ],
  }
}

/**
 * Schema genérico de página: WebPage (o subtipo) + BreadcrumbList.
 * @param {{ type?: string, path: string, name: string, description: string,
 *   breadcrumb: { name: string, path: string }[], inLanguage?: string, extra?: object }} opts
 */
export function buildPageJsonLd({ type, path, name, description, breadcrumb, inLanguage = SITE.language, extra }) {
  const url = absoluteUrl(path)
  return {
    '@context': 'https://schema.org',
    '@graph': [
      webPageNode({ type, url, name, description, inLanguage, extra }),
      breadcrumbNode(url, breadcrumb),
    ],
  }
}

/** Schema Service + FAQ + Breadcrumb + WebPage para landings de servicio. */
export function buildServicePageJsonLd({
  path,
  name,
  description,
  faqs = [],
  serviceType,
  breadcrumbHome = 'Inicio',
  breadcrumbServices = 'Servicios',
  breadcrumbLabel,
  inLanguage = SITE.language,
}) {
  const url = absoluteUrl(path)
  const graph = [
    webPageNode({
      url,
      name,
      description,
      inLanguage,
      extra: {
        mainEntity: { '@id': `${url}#service` },
        ...(faqs.length > 0 ? { hasPart: { '@id': `${url}#faq` } } : {}),
      },
    }),
    // El último paso usa el mismo texto que la miga de pan visible (landing.label).
    breadcrumbNode(url, [
      { name: breadcrumbHome, path: '/' },
      { name: breadcrumbServices, path: '/servicios' },
      { name: breadcrumbLabel || name, path },
    ]),
    {
      '@type': 'Service',
      '@id': `${url}#service`,
      name,
      description,
      serviceType: serviceType || name,
      url,
      mainEntityOfPage: { '@id': `${url}#webpage` },
      provider: orgRef(),
      areaServed: AREA_SERVED,
      inLanguage,
    },
  ]

  // FAQPage ya no da resultado enriquecido en Google para sitios comerciales
  // (desde 2023), pero se mantiene: las IAs y Bing sí lo leen.
  if (faqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    })
  }

  return { '@context': 'https://schema.org', '@graph': graph }
}

/**
 * Schema de una guía: Article + WebPage + BreadcrumbList + FAQPage.
 * Autor y editor son la empresa (#organization), igual que en el resto del sitio.
 */
export function buildGuideJsonLd({
  path,
  headline,
  description,
  image,
  datePublished,
  dateModified,
  faqs = [],
  breadcrumb,
  inLanguage = SITE.language,
}) {
  const url = absoluteUrl(path)
  const graph = [
    webPageNode({
      url,
      name: headline,
      description,
      inLanguage,
      extra: {
        mainEntity: { '@id': `${url}#article` },
        ...(faqs.length > 0 ? { hasPart: { '@id': `${url}#faq` } } : {}),
      },
    }),
    breadcrumbNode(url, breadcrumb),
    {
      '@type': 'Article',
      '@id': `${url}#article`,
      headline,
      description,
      image,
      inLanguage,
      datePublished,
      dateModified: dateModified || datePublished,
      author: orgRef(),
      publisher: orgRef(),
      mainEntityOfPage: { '@id': `${url}#webpage` },
    },
  ]

  if (faqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    })
  }

  return { '@context': 'https://schema.org', '@graph': graph }
}

/** Nodo FAQPage suelto, para sumarlo al schema de una página existente. */
export function buildFaqNode(path, faqs) {
  return {
    '@type': 'FAQPage',
    '@id': `${absoluteUrl(path)}#faq`,
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
}
