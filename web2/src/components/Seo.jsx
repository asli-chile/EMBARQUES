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
}) {
  const { locale } = useLocale()
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

/** Schema LocalBusiness + Organization para la home. */
export function buildHomeJsonLd({ inLanguage = SITE.language, description, websiteDescription } = {}) {
  const { address, geo } = SITE
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE.url}/#organization`,
        name: SITE.name,
        legalName: SITE.legalName,
        url: SITE.url,
        logo: `${SITE.url}/img/logoasli.webp`,
        image: SITE.ogImage,
        telephone: SITE.phone,
        email: SITE.email,
        sameAs: SITE.sameAs,
        address: {
          '@type': 'PostalAddress',
          streetAddress: address.street,
          addressLocality: address.city,
          addressRegion: address.region,
          postalCode: address.postalCode,
          addressCountry: address.country,
        },
      },
      {
        '@type': 'LocalBusiness',
        '@id': `${SITE.url}/#localbusiness`,
        name: SITE.legalName,
        image: SITE.ogImage,
        url: SITE.url,
        telephone: SITE.phone,
        email: SITE.email,
        priceRange: '$$',
        address: {
          '@type': 'PostalAddress',
          streetAddress: address.street,
          addressLocality: address.city,
          addressRegion: address.region,
          postalCode: address.postalCode,
          addressCountry: address.country,
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: geo.latitude,
          longitude: geo.longitude,
        },
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            opens: '09:00',
            closes: '18:00',
          },
        ],
        areaServed: [
          { '@type': 'AdministrativeArea', name: 'Región del Maule' },
          { '@type': 'Country', name: 'Chile' },
        ],
        description:
          description ||
          'Asesoría logística, exportación e importación, coordinación naviera y transporte especializado en fruta fresca y congelada. Curicó, Maule.',
        parentOrganization: { '@id': `${SITE.url}/#organization` },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE.url}/#website`,
        url: SITE.url,
        name: SITE.name,
        description: websiteDescription || SITE.tagline,
        publisher: { '@id': `${SITE.url}/#organization` },
        inLanguage,
      },
    ],
  }
}

/** Schema Service + FAQ + Breadcrumb para landings de servicio. */
export function buildServicePageJsonLd({
  path,
  name,
  description,
  faqs = [],
  serviceType,
  breadcrumbHome = 'Inicio',
  breadcrumbServices = 'Servicios',
}) {
  const url = absoluteUrl(path)
  const graph = [
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: breadcrumbHome,
          item: SITE.url,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: breadcrumbServices,
          item: absoluteUrl('/servicios'),
        },
        {
          '@type': 'ListItem',
          position: 3,
          name,
          item: url,
        },
      ],
    },
    {
      '@type': 'Service',
      '@id': `${url}#service`,
      name,
      description,
      serviceType: serviceType || name,
      url,
      provider: {
        '@type': 'Organization',
        '@id': `${SITE.url}/#organization`,
        name: SITE.name,
        url: SITE.url,
        telephone: SITE.phone,
        email: SITE.email,
      },
      areaServed: [
        { '@type': 'AdministrativeArea', name: 'Región del Maule' },
        { '@type': 'Country', name: 'Chile' },
      ],
    },
  ]

  if (faqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
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
