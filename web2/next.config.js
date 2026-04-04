/** @type {import('next').NextConfig} */
/**
 * Sitio público (web2):  https://asli.cl
 * Sistema embarques en URL pública: https://asli.cl/embarques/...
 *
 * IMPORTANTE — dos formas de embarquesBase:
 *
 * • Vercel (Astro): URL del deployment SIN sufijo /embarques. Allí las rutas efectivas
 *   son /inicio, /auth/login, etc. El rewrite /embarques/:path* → embarquesBase/:path*
 *   añade solo el segmento (p. ej. inicio).
 *
 * • Local (astro dev con base:"/embarques"): las URLs reales son
 *   http://localhost:4321/embarques/inicio. Define entonces:
 *   NEXT_PUBLIC_EMBARQUES_BASE_URL=http://localhost:4321/embarques
 *   (en web2/.env.local). Sin esto, el proxy sigue apuntando a Vercel y no verás tus cambios.
 *
 * NUNCA poner https://embarques-teal.vercel.app/embarques en Vercel → doble ruta → 404.
 * NUNCA poner https://asli.cl → el proxy apuntaría a sí mismo → loop 404.
 */
const embarquesBase =
  process.env.NEXT_PUBLIC_EMBARQUES_BASE_URL ||
  "https://embarques-teal.vercel.app";

/**
 * En dev, Astro inyecta scripts/CSS de Vite con rutas en la raíz (/@vite/client, /src/...).
 * Si abres el ERP vía web2 (localhost:3000/embarques/...), el navegador pide eso en :3000 → 404.
 * Estos rewrites solo aplican cuando el backend es Astro local.
 */
function embarquesDevViteRewrites(baseUrl) {
  if (!baseUrl || !/localhost|127\.0\.0\.1/i.test(String(baseUrl))) return [];
  const origin = String(baseUrl).replace(/\/$/, "");
  return [
    { source: "/@vite/:path*", destination: `${origin}/@vite/:path*` },
    { source: "/@id/:path*", destination: `${origin}/@id/:path*` },
    { source: "/@fs/:path*", destination: `${origin}/@fs/:path*` },
    { source: "/node_modules/:path*", destination: `${origin}/node_modules/:path*` },
    { source: "/src/:path*", destination: `${origin}/src/:path*` },
  ];
}

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ["asli.cl", "www.asli.cl", "embarques-teal.vercel.app"],
  },
  /** Normaliza /embarques y /embarques/ hacia /embarques/inicio antes del proxy */
  async redirects() {
    return [
      {
        source: "/embarques",
        destination: "/embarques/inicio",
        permanent: false,
      },
      {
        source: "/embarques/",
        destination: "/embarques/inicio",
        permanent: false,
      },
    ];
  },
  /** Evita HTML viejo en CDN al publicar traducciones o textos nuevos */
  async headers() {
    const htmlNoCache = {
      key: "Cache-Control",
      value: "public, max-age=0, must-revalidate",
    };
    const paths = [
      "/",
      "/contacto",
      "/ejecutivos",
      "/nosotros",
      "/presentacion",
      "/servicios",
      "/tracking",
    ];
    return paths.map((source) => ({
      source,
      headers: [htmlNoCache],
    }));
  },
  async rewrites() {
    return [
      ...embarquesDevViteRewrites(embarquesBase),
      { source: "/logoasli.png", destination: `${embarquesBase}/logoasli.png` },
      // Astro usa logoasli.png como icono; no hay favicon.ico en public → evita 404 en consola
      { source: "/favicon.ico", destination: `${embarquesBase}/logoasli.png` },
      {
        source: "/embarques/favicon.ico",
        destination: `${embarquesBase}/logoasli.png`,
      },
      { source: "/fonts/:path*", destination: `${embarquesBase}/fonts/:path*` },
      { source: "/embarques/:path*", destination: `${embarquesBase}/:path*` },
      { source: "/api/:path*", destination: `${embarquesBase}/api/:path*` },
      { source: "/auth", destination: `${embarquesBase}/auth/login` },
      { source: "/indicadores", destination: `${embarquesBase}/indicadores` },
      { source: "/dashboard/:path*", destination: `${embarquesBase}/dashboard/:path*` },
      { source: "/documentos/:path*", destination: `${embarquesBase}/documentos/:path*` },
      { source: "/facturas/:path*", destination: `${embarquesBase}/facturas/:path*` },
      { source: "/facturar-preview/:path*", destination: `${embarquesBase}/facturar-preview/:path*` },
      { source: "/itinerario/:path*", destination: `${embarquesBase}/itinerario/:path*` },
      { source: "/itinerario-asli", destination: `${embarquesBase}/itinerario-asli` },
      { source: "/mantenimiento/:path*", destination: `${embarquesBase}/mantenimiento/:path*` },
      { source: "/profile/:path*", destination: `${embarquesBase}/profile/:path*` },
      { source: "/registros/:path*", destination: `${embarquesBase}/registros/:path*` },
      {
        source: "/tablas-personalizadas/:path*",
        destination: `${embarquesBase}/tablas-personalizadas/:path*`,
      },
      { source: "/transportes/:path*", destination: `${embarquesBase}/transportes/:path*` },
      { source: "/vessel-diagnose/:path*", destination: `${embarquesBase}/vessel-diagnose/:path*` },
    ];
  },
};

module.exports = nextConfig;
