import { SITE_URL } from '../src/lib/site'
import { landings } from '../src/data/landings'

const STATIC_PAGES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/servicios', changefreq: 'monthly', priority: '0.9' },
  { path: '/tracking', changefreq: 'monthly', priority: '0.7' },
  { path: '/presentacion', changefreq: 'monthly', priority: '0.6' },
]

const LANDING_PAGES = landings.map((l) => ({
  path: `/${l.slug}`,
  changefreq: 'monthly',
  priority: l.priority || '0.8',
}))

const PAGES = [...STATIC_PAGES, ...LANDING_PAGES]

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildSitemapXml(lastmod) {
  const urls = PAGES.map(
    ({ path, changefreq, priority }) => `  <url>
    <loc>${escapeXml(`${SITE_URL}${path === '/' ? '' : path}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  ).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}

export async function getServerSideProps({ res }) {
  const lastmod = new Date().toISOString().slice(0, 10)
  const xml = buildSitemapXml(lastmod)

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
  res.write(xml)
  res.end()

  return { props: {} }
}

export default function Sitemap() {
  return null
}
